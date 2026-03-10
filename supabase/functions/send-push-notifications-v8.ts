// Supabase Edge Function: send-push-notifications (v8 - INVITE ID FIX)
// Deploy to: supabase/functions/send-push-notifications/index.ts
//
// v8 FIXES:
// - Added data column support to pass inviteId/rematchId to service worker
// - Now Accept action on push notifications will work correctly
//
// v7 FIXES:
// - Changed badge URLs from relative to absolute (https://deadblock.app)
// - Changed badge format from SVG to PNG (better Android compatibility)
// - Changed icon URL to absolute
//
// v6 FIXES:
// - CRITICAL: Changed from 'notification_queue' to 'push_notification_queue'
// - CRITICAL: Changed status filter from 'status=pending' to 'processed_at IS NULL'
// - CRITICAL: Changed column mappings (notification_type, processed_at, error)
// - Kept all v5 features: pentomino badges, vibration patterns, no image property

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:hello@deadblock.app'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ============================================================================
// BADGE AND VIBRATION CONFIGURATION
// v7: Use absolute URLs and PNG format for Android compatibility
// ============================================================================

const APP_URL = 'https://deadblock.app'

const BADGES: Record<string, string> = {
  'your_turn': `${APP_URL}/badges/badge-turn.png`,
  'game_start': `${APP_URL}/badges/badge-turn.png`,
  'game_invite': `${APP_URL}/badges/badge-invite.png`,
  'invite_accepted': `${APP_URL}/badges/badge-invite.png`,
  'friend_request': `${APP_URL}/badges/badge-friend.png`,
  'rematch_request': `${APP_URL}/badges/badge-rematch.png`,
  'rematch_accepted': `${APP_URL}/badges/badge-rematch.png`,
  'chat_message': `${APP_URL}/badges/badge-chat.png`,
  'chat': `${APP_URL}/badges/badge-chat.png`,
  'victory': `${APP_URL}/badges/badge-victory.png`,
  'defeat': `${APP_URL}/badges/badge-defeat.png`,
  'weekly_challenge': `${APP_URL}/badges/badge-weekly.png`,
  'default': `${APP_URL}/badges/badge-default.png`
}

const VIBRATIONS: Record<string, number[]> = {
  'your_turn': [100, 50, 100],
  'game_start': [200, 100, 200],
  'game_invite': [200, 100, 200, 100, 200],
  'friend_request': [150, 75, 150],
  'rematch_request': [150, 75, 150],
  'chat_message': [50],
  'chat': [50],
  'victory': [100, 50, 100, 50, 300],
  'defeat': [200, 200, 200],
  'weekly_challenge': [100, 50, 100, 50, 100, 50, 200],
  'default': [100, 50, 100]
}

const REQUIRE_INTERACTION = ['game_invite', 'rematch_request', 'victory', 'defeat', 'weekly_challenge']

// ============================================================================
// WEB-PUSH LIBRARY LOADING
// ============================================================================

let webpush: any = null
let useWebPush = false

try {
  const webPushModule = await import('npm:web-push@3.6.7')
  webpush = webPushModule.default || webPushModule
  
  if (webpush && webpush.setVapidDetails) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
    useWebPush = true
    console.log('[Push] web-push library loaded successfully')
  }
} catch (e) {
  console.log('[Push] web-push import failed, using manual implementation:', e.message)
}

// ============================================================================
// BASE64 URL ENCODING/DECODING
// ============================================================================

function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
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

// ============================================================================
// MANUAL WEB PUSH IMPLEMENTATION (FALLBACK)
// ============================================================================

async function createVapidJwt(endpoint: string): Promise<string> {
  const audience = new URL(endpoint).origin
  
  const header = { typ: 'JWT', alg: 'ES256' }
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60),
    sub: VAPID_SUBJECT
  }
  
  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)))
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)))
  const unsignedToken = `${headerB64}.${payloadB64}`
  
  const privateKeyBytes = base64UrlDecode(VAPID_PRIVATE_KEY)
  const publicKeyBytes = base64UrlDecode(VAPID_PUBLIC_KEY)
  
  const x = publicKeyBytes.slice(1, 33)
  const y = publicKeyBytes.slice(33, 65)
  
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: base64UrlEncode(x),
    y: base64UrlEncode(y),
    d: base64UrlEncode(privateKeyBytes)
  }
  
  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsignedToken)
  )
  
  const sigArray = new Uint8Array(signature)
  let rawSig: Uint8Array
  
  if (sigArray[0] === 0x30) {
    const rLen = sigArray[3]
    let rStart = 4
    let r = sigArray.slice(rStart, rStart + rLen)
    
    const sStart = rStart + rLen + 2
    const sLen = sigArray[sStart - 1]
    let s = sigArray.slice(sStart, sStart + sLen)
    
    while (r.length > 32 && r[0] === 0) r = r.slice(1)
    while (s.length > 32 && s[0] === 0) s = s.slice(1)
    while (r.length < 32) r = new Uint8Array([0, ...r])
    while (s.length < 32) s = new Uint8Array([0, ...s])
    
    rawSig = new Uint8Array([...r, ...s])
  } else {
    rawSig = sigArray
  }
  
  return `${unsignedToken}.${base64UrlEncode(rawSig)}`
}

async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  )
  
  const serverPublicKeyRaw = await crypto.subtle.exportKey('raw', serverKeyPair.publicKey)
  const serverPublicKey = new Uint8Array(serverPublicKeyRaw)
  
  const clientPublicKeyBytes = base64UrlDecode(p256dh)
  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )
  
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPublicKey },
    serverKeyPair.privateKey,
    256
  )
  const sharedSecret = new Uint8Array(sharedSecretBits)
  
  const authSecret = base64UrlDecode(auth)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  
  const encoder = new TextEncoder()
  
  const ikm = await crypto.subtle.importKey(
    'raw',
    sharedSecret,
    'HKDF',
    false,
    ['deriveBits']
  )
  
  const authInfo = encoder.encode('Content-Encoding: auth\0')
  const prkBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: authSecret, info: authInfo },
    ikm,
    256
  )
  
  const prk = await crypto.subtle.importKey(
    'raw',
    prkBits,
    'HKDF',
    false,
    ['deriveBits']
  )
  
  const keyInfoBuf = new Uint8Array([
    ...encoder.encode('Content-Encoding: aes128gcm\0'),
  ])
  
  const nonceInfoBuf = new Uint8Array([
    ...encoder.encode('Content-Encoding: nonce\0'),
  ])
  
  const cekBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: salt, info: keyInfoBuf },
    prk,
    128
  )
  const cek = await crypto.subtle.importKey(
    'raw',
    cekBits,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  )
  
  const nonceBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: salt, info: nonceInfoBuf },
    prk,
    96
  )
  const nonce = new Uint8Array(nonceBits)
  
  const payloadBytes = encoder.encode(payload)
  const paddingLength = Math.max(0, 3052 - payloadBytes.length)
  const paddedPayload = new Uint8Array(payloadBytes.length + 1 + paddingLength)
  paddedPayload[0] = 2
  paddedPayload.set(payloadBytes, 1)
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    cek,
    paddedPayload
  )
  
  return {
    ciphertext: new Uint8Array(ciphertext),
    salt,
    serverPublicKey
  }
}

async function sendPushManual(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: string
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    console.log('[Push Manual] Encrypting payload...')
    const { ciphertext, salt, serverPublicKey } = await encryptPayload(payload, p256dh, auth)
    
    console.log('[Push Manual] Creating VAPID JWT...')
    const jwt = await createVapidJwt(endpoint)
    
    const rs = 4096
    const body = new Uint8Array(16 + 4 + 1 + 65 + ciphertext.length)
    body.set(salt, 0)
    body[16] = (rs >> 24) & 0xff
    body[17] = (rs >> 16) & 0xff
    body[18] = (rs >> 8) & 0xff
    body[19] = rs & 0xff
    body[20] = 65
    body.set(serverPublicKey, 21)
    body.set(ciphertext, 86)
    
    console.log(`[Push Manual] Sending to ${endpoint.substring(0, 60)}...`)
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Urgency': 'high',
        'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`
      },
      body: body
    })
    
    console.log(`[Push Manual] Response: ${response.status} ${response.statusText}`)
    
    if (response.ok) {
      return { success: true, status: response.status }
    }
    
    const errorText = await response.text()
    console.error(`[Push Manual] Error response: ${errorText}`)
    
    return { success: false, status: response.status, error: errorText }
  } catch (e: any) {
    console.error('[Push Manual] Exception:', e)
    return { success: false, error: e.message }
  }
}

// ============================================================================
// UNIFIED SEND FUNCTION
// ============================================================================

interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

interface QueueRow {
  id: string
  user_id: string
  notification_type: string
  title: string
  body: string
  game_id: string | null
  data: Record<string, any> | null  // v8: Added for inviteId, rematchId, etc.
  created_at: string
  processed_at: string | null
  error: string | null
}

async function sendPushNotification(
  subscription: PushSubscription,
  notification: QueueRow
): Promise<{ success: boolean; expired?: boolean; error?: string }> {
  const notificationType = notification.notification_type || 'default'
  
  // v8: Extract inviteId and rematchId from data column
  const notificationData = notification.data || {}
  const inviteId = notificationData.inviteId || null
  const rematchId = notificationData.rematchId || null
  
  // v7: Use absolute URLs for icon and badge
  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    type: notificationType,
    icon: `${APP_URL}/pwa-192x192.png`,
    badge: BADGES[notificationType] || BADGES['default'],
    vibrate: VIBRATIONS[notificationType] || VIBRATIONS['default'],
    tag: `deadblock-${notificationType}-${Date.now()}`,
    renotify: true,
    requireInteraction: REQUIRE_INTERACTION.includes(notificationType),
    data: {
      type: notificationType,
      gameId: notification.game_id,
      inviteId: inviteId,      // v8: Pass inviteId for game_invite notifications
      rematchId: rematchId,    // v8: Pass rematchId for rematch notifications
      timestamp: Date.now()
    }
  })
  
  console.log(`[Push] Type: ${notificationType}`)
  console.log(`[Push] Badge: ${BADGES[notificationType] || BADGES['default']}`)
  console.log(`[Push] Endpoint: ${subscription.endpoint.substring(0, 50)}...`)
  
  try {
    if (useWebPush && webpush) {
      console.log('[Push] Using web-push library')
      
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth
        }
      }
      
      await webpush.sendNotification(pushSubscription, payload, {
        TTL: 86400,
        urgency: 'high'
      })
      
      console.log('[Push] web-push: Success')
      return { success: true }
    } else {
      console.log('[Push] Using manual implementation')
      
      const result = await sendPushManual(
        subscription.endpoint,
        subscription.p256dh,
        subscription.auth,
        payload
      )
      
      if (result.success) {
        return { success: true }
      }
      
      if (result.status === 410 || result.status === 404) {
        console.log('[Push] Subscription expired, removing...')
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('id', subscription.id)
        return { success: false, expired: true }
      }
      
      return { success: false, error: result.error }
    }
  } catch (error: any) {
    console.error('[Push] Error:', error)
    
    if (error.statusCode === 410 || error.statusCode === 404) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('id', subscription.id)
      return { success: false, expired: true }
    }
    
    return { success: false, error: error.message }
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  const url = new URL(req.url)
  
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })
  }
  
  // Diagnostic endpoint (GET request)
  if (req.method === 'GET') {
    const diagnostics: Record<string, any> = {
      version: 'v8-invite-id-fix',
      fixes: [
        'v5: Removed image property (fixes D circle)',
        'v5: Added pentomino badges per notification type',
        'v5: Added vibration patterns',
        'v6: Changed from notification_queue to push_notification_queue',
        'v6: Changed status filter to processed_at IS NULL',
        'v6: Fixed column mappings (notification_type, processed_at, error)',
        'v7: Changed badge URLs from relative to absolute (https://deadblock.app)',
        'v7: Changed badge format from SVG to PNG for Android compatibility',
        'v8: Added data column support for inviteId/rematchId passthrough'
      ],
      app_url: APP_URL,
      sample_badge_url: BADGES['your_turn'],
      webpush_available: useWebPush,
      vapid_public_key_length: VAPID_PUBLIC_KEY?.length || 0,
      vapid_private_key_length: VAPID_PRIVATE_KEY?.length || 0,
      vapid_subject: VAPID_SUBJECT,
      badge_types: Object.keys(BADGES),
      timestamp: new Date().toISOString()
    }
    
    const { count: subCount } = await supabase
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true })
    
    diagnostics.subscription_count = subCount
    
    const { count: pending } = await supabase
      .from('push_notification_queue')
      .select('*', { count: 'exact', head: true })
      .is('processed_at', null)
    
    diagnostics.pending_notifications = pending
    
    return new Response(JSON.stringify(diagnostics, null, 2), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
  
  // Process notifications (POST request)
  try {
    console.log('[Push] ========== PROCESSING START (v8) ==========')
    console.log('[Push] web-push available:', useWebPush)
    
    const { data: notifications, error } = await supabase
      .from('push_notification_queue')
      .select('*')
      .is('processed_at', null)
      .order('created_at')
      .limit(50)
    
    if (error) {
      console.error('[Push] Fetch error:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
    
    if (!notifications?.length) {
      console.log('[Push] No pending notifications')
      return new Response(JSON.stringify({ message: 'No pending notifications', version: 'v8' }))
    }
    
    console.log(`[Push] Processing ${notifications.length} notifications`)
    
    let processed = 0, failed = 0, expired = 0
    
    for (const notification of notifications) {
      console.log(`[Push] --- Notification ${notification.id} ---`)
      console.log(`[Push] Type: ${notification.notification_type}, User: ${notification.user_id}`)
      console.log(`[Push] Title: ${notification.title}`)
      console.log(`[Push] Body: ${notification.body}`)
      console.log(`[Push] Game ID: ${notification.game_id}`)
      console.log(`[Push] Data: ${JSON.stringify(notification.data)}`)
      
      // Get push subscriptions for this user
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', notification.user_id)
      
      if (!subscriptions?.length) {
        console.log('[Push] No subscriptions for user')
        await supabase
          .from('push_notification_queue')
          .update({ 
            processed_at: new Date().toISOString(), 
            error: 'No push subscriptions for user' 
          })
          .eq('id', notification.id)
        failed++
        continue
      }
      
      console.log(`[Push] Found ${subscriptions.length} subscription(s)`)
      
      let sentToAny = false
      let lastError = ''
      
      for (const sub of subscriptions) {
        const result = await sendPushNotification(sub, notification)
        if (result.success) {
          sentToAny = true
        } else {
          if (result.expired) expired++
          lastError = result.error || 'Unknown error'
        }
      }
      
      if (sentToAny) {
        await supabase
          .from('push_notification_queue')
          .update({ processed_at: new Date().toISOString() })
          .eq('id', notification.id)
        processed++
        console.log('[Push] ✓ Notification sent successfully')
      } else {
        await supabase
          .from('push_notification_queue')
          .update({ 
            processed_at: new Date().toISOString(),
            error: lastError || 'All delivery attempts failed'
          })
          .eq('id', notification.id)
        failed++
        console.log(`[Push] ✗ Notification failed: ${lastError}`)
      }
    }
    
    console.log(`[Push] ========== COMPLETE ==========`)
    console.log(`[Push] Processed: ${processed}, Failed: ${failed}, Expired subs cleaned: ${expired}`)
    
    return new Response(JSON.stringify({ 
      version: 'v8',
      processed, 
      failed,
      expired_cleaned: expired
    }))
  } catch (e: any) {
    console.error('[Push] Fatal error:', e)
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
})