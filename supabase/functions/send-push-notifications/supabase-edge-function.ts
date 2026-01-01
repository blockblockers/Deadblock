// Supabase Edge Function: send-push-notifications
// Deploy to: supabase/functions/send-push-notifications/index.ts
//
// This function processes the notification queue and sends push notifications
// using the Web Push protocol.
//
// SETUP:
// 1. Generate VAPID keys: npx web-push generate-vapid-keys
// 2. Set secrets in Supabase:
//    supabase secrets set VAPID_PUBLIC_KEY=your_public_key
//    supabase secrets set VAPID_PRIVATE_KEY=your_private_key
//    supabase secrets set VAPID_SUBJECT=mailto:your@email.com
// 3. Deploy: supabase functions deploy send-push-notifications

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Web Push implementation for Deno
// Based on RFC 8291 (Message Encryption) and RFC 8292 (VAPID)

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:hello@deadblock.app'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Create Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

interface NotificationPayload {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  data: Record<string, any>
}

// Base64 URL encoding/decoding
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  const binary = atob(str)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// Generate VAPID JWT token
async function generateVapidJWT(audience: string): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: VAPID_SUBJECT
  }

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)))
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)))
  const unsignedToken = `${headerB64}.${payloadB64}`

  // Import private key
  const privateKeyBytes = base64UrlDecode(VAPID_PRIVATE_KEY)
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )

  // Sign the token
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  )

  const signatureB64 = base64UrlEncode(signature)
  return `${unsignedToken}.${signatureB64}`
}

// Encrypt payload using Web Push encryption
async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authSecret: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  // Generate local key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  )

  // Export local public key
  const localPublicKeyRaw = await crypto.subtle.exportKey('raw', localKeyPair.publicKey)
  const localPublicKey = new Uint8Array(localPublicKeyRaw)

  // Import subscriber's public key
  const subscriberPublicKeyBytes = base64UrlDecode(p256dhKey)
  const subscriberPublicKey = await crypto.subtle.importKey(
    'raw',
    subscriberPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )

  // Derive shared secret using ECDH
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: subscriberPublicKey },
    localKeyPair.privateKey,
    256
  )
  const sharedSecret = new Uint8Array(sharedSecretBits)

  // Generate random salt
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // Decode auth secret
  const authSecretBytes = base64UrlDecode(authSecret)

  // Derive keys using HKDF
  const authInfo = new TextEncoder().encode('Content-Encoding: auth\0')
  const keyInfo = concatArrays(
    new TextEncoder().encode('Content-Encoding: aes128gcm\0'),
    new Uint8Array([0]),
    new Uint8Array([localPublicKey.length]),
    localPublicKey,
    new Uint8Array([subscriberPublicKeyBytes.length]),
    subscriberPublicKeyBytes
  )

  // PRK = HKDF-Extract(auth_secret, shared_secret)
  const prk = await hkdfExtract(authSecretBytes, sharedSecret)
  
  // IKM = HKDF-Expand(PRK, "Content-Encoding: auth\0", 32)
  const ikm = await hkdfExpand(prk, authInfo, 32)
  
  // PRK2 = HKDF-Extract(salt, IKM)
  const prk2 = await hkdfExtract(salt, ikm)
  
  // CEK = HKDF-Expand(PRK2, cek_info, 16)
  const cekInfo = concatArrays(
    new TextEncoder().encode('Content-Encoding: aes128gcm\0'),
    new Uint8Array([0]),
    new Uint8Array([65]),
    localPublicKey,
    new Uint8Array([65]),
    subscriberPublicKeyBytes
  )
  const cek = await hkdfExpand(prk2, cekInfo, 16)
  
  // Nonce = HKDF-Expand(PRK2, nonce_info, 12)
  const nonceInfo = concatArrays(
    new TextEncoder().encode('Content-Encoding: nonce\0'),
    new Uint8Array([0]),
    new Uint8Array([65]),
    localPublicKey,
    new Uint8Array([65]),
    subscriberPublicKeyBytes
  )
  const nonce = await hkdfExpand(prk2, nonceInfo, 12)

  // Add padding and record delimiter
  const paddingLength = 0
  const paddedPayload = concatArrays(
    new Uint8Array([2]), // Padding delimiter
    new Uint8Array(paddingLength),
    new TextEncoder().encode(payload)
  )

  // Encrypt with AES-128-GCM
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 },
    key,
    paddedPayload
  )

  return {
    encrypted: new Uint8Array(encrypted),
    salt,
    localPublicKey
  }
}

// HKDF helper functions
async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const prk = await crypto.subtle.sign('HMAC', key, ikm)
  return new Uint8Array(prk)
}

async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const infoWithCounter = concatArrays(info, new Uint8Array([1]))
  const okm = await crypto.subtle.sign('HMAC', key, infoWithCounter)
  return new Uint8Array(okm).slice(0, length)
}

function concatArrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}

// Send push notification to a subscription
async function sendPushNotification(
  subscription: PushSubscription,
  payload: NotificationPayload
): Promise<{ success: boolean; error?: string; statusCode?: number }> {
  try {
    const url = new URL(subscription.endpoint)
    const audience = `${url.protocol}//${url.host}`

    // Create notification payload
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: `deadblock-${payload.type}-${payload.id}`,
      renotify: true,
      requireInteraction: payload.type === 'game_invite' || payload.type === 'rematch',
      type: payload.type,
      ...payload.data
    })

    // Encrypt payload
    const { encrypted, salt, localPublicKey } = await encryptPayload(
      notificationPayload,
      subscription.p256dh,
      subscription.auth
    )

    // Build encrypted body with headers
    const recordSize = 4096
    const body = concatArrays(
      salt,
      new Uint8Array([0, 0, 16, 0]), // Record size (4096)
      new Uint8Array([localPublicKey.length]),
      localPublicKey,
      encrypted
    )

    // Generate VAPID JWT
    const vapidJwt = await generateVapidJWT(audience)

    // Send push request
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Content-Length': body.length.toString(),
        'TTL': '86400', // 24 hours
        'Urgency': 'high',
        'Authorization': `vapid t=${vapidJwt}, k=${VAPID_PUBLIC_KEY}`
      },
      body: body
    })

    if (response.status === 201 || response.status === 200) {
      return { success: true, statusCode: response.status }
    } else if (response.status === 410 || response.status === 404) {
      // Subscription expired or invalid - should be removed
      return { success: false, error: 'Subscription expired', statusCode: response.status }
    } else {
      const errorText = await response.text()
      return { success: false, error: errorText, statusCode: response.status }
    }
  } catch (error) {
    console.error('Push notification error:', error)
    return { success: false, error: error.message }
  }
}

// Main handler
serve(async (req) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // Get pending notifications
    const { data: notifications, error: fetchError } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', 3)
      .order('created_at', { ascending: true })
      .limit(100)

    if (fetchError) {
      throw new Error(`Failed to fetch notifications: ${fetchError.message}`)
    }

    if (!notifications || notifications.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`Processing ${notifications.length} notifications`)

    let processed = 0
    let failed = 0
    let expiredSubscriptions: string[] = []

    for (const notification of notifications) {
      // Get user's push subscriptions
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', notification.user_id)

      if (!subscriptions || subscriptions.length === 0) {
        // No subscriptions, mark as failed
        await supabase
          .from('notification_queue')
          .update({
            status: 'failed',
            error_message: 'No push subscriptions found',
            attempts: notification.attempts + 1
          })
          .eq('id', notification.id)
        failed++
        continue
      }

      // Send to all user's devices
      let anySuccess = false
      for (const subscription of subscriptions) {
        const result = await sendPushNotification(subscription, notification)
        
        if (result.success) {
          anySuccess = true
        } else if (result.statusCode === 410 || result.statusCode === 404) {
          // Subscription expired, queue for deletion
          expiredSubscriptions.push(subscription.id)
        }
      }

      // Update notification status
      if (anySuccess) {
        await supabase
          .from('notification_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            attempts: notification.attempts + 1
          })
          .eq('id', notification.id)
        processed++
      } else {
        await supabase
          .from('notification_queue')
          .update({
            status: notification.attempts >= 2 ? 'failed' : 'pending',
            error_message: 'All push attempts failed',
            attempts: notification.attempts + 1
          })
          .eq('id', notification.id)
        failed++
      }
    }

    // Clean up expired subscriptions
    if (expiredSubscriptions.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('id', expiredSubscriptions)
      console.log(`Removed ${expiredSubscriptions.length} expired subscriptions`)
    }

    // Clean up old notifications
    await supabase.rpc('cleanup_old_notifications')

    return new Response(JSON.stringify({
      processed,
      failed,
      expiredSubscriptionsRemoved: expiredSubscriptions.length
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
