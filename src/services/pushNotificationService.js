// pushNotificationService.js - Client-side push notification management
// v7.21: Two related fixes for multi-user-per-device push:
//        1. saveSubscription / _saveNativeToken: onConflict changed from
//           'user_id,endpoint' to 'endpoint' to match the actual DB constraint
//           (push_subscriptions_endpoint_key — UNIQUE on endpoint column alone).
//           Previously when user B tried to enable push on a device where user A
//           had subscribed without unsubscribing, the upsert would fail with
//           duplicate-key because PostgREST searched for (user_id=B, endpoint=X)
//           and didn't find a match, then INSERTed and hit the single-column UNIQUE.
//           Now the row's user_id is updated in place, transferring ownership.
//        2. New hasActiveSubscription(userId) — cross-platform subscription check
//           that returns true on native if either the in-memory FCM token exists
//           OR a DB row with 'fcm:' endpoint exists for the user (handles app
//           restart case where the in-memory token is null but DB row persists).
//           On web, uses the existing pushManager.getSubscription() flow.
//           Used by OnlineMenu to decide whether to show the NotificationPrompt
//           banner on native (the previous Web-Push-only check always returned
//           false on native, and on a fresh Capacitor WebView visit pushManager
//           wasn't reliably populated).
// v7.20: Migrated native path from @capacitor/push-notifications to
//        @capacitor-firebase/messaging. The official plugin's getPermissionStates
//        NPE'd on Android 16 (Samsung S24); the community Firebase plugin uses
//        a different code path (Firebase APIs directly, no annotation reflection)
//        and avoids the bug. Web Push path completely unchanged. FCM token
//        storage format unchanged ('fcm:' prefix on endpoint).
// v7.19: Native resubscribeIfNeeded is now a no-op. Auto-subscribing on native
//        triggered PushNotifications.register() unprompted, which native-crashed
//        the app on fresh installs when Firebase/Proguard wasn't perfectly
//        configured (Java-side faults bypass JS try/catch). Users opt in
//        explicitly via the NotificationPrompt banner or Settings.
// v7.18: Added Capacitor native push support via @capacitor/push-notifications (FCM).
//        Web Push path unchanged. Native FCM tokens saved with 'fcm:' prefix on endpoint.
//        TODO: Supabase edge function needs FCM HTTP v1 API path for 'fcm:' endpoints.
// v7.17: Added resubscribeIfNeeded(userId) — silently re-subscribes when permission is
//        granted but browser subscription was lost (e.g., cache cleared without sign-out).
//        Prevents "zombie state" where DB has stale endpoint and pushes silently fail.
// v7.16: Fixed test notification icon/badge to use monochrome-192x192.png (matches all other notifications)
// v7.15: FIXED - Handles service worker conflicts, proper timeouts, state persistence
// Place in src/services/pushNotificationService.js
//
// CRITICAL FIXES:
// - Unregisters conflicting service workers (service-worker.js vs sw.js)
// - 10 second timeout on ALL async operations
// - No more infinite spinning
// - Better error recovery
// - NEW: checkSubscription() async method for accurate state on modal reopen

import { supabase } from '../utils/supabase';
import { isNativePlatform } from '../utils/platformUtils';

// VAPID public key - Replace with your own
const VAPID_PUBLIC_KEY = 'BEz7oIWn2ESc7ahvq894zbJNKV9dDYRIRNuAvCpuvTMh4NOAFT-U5UeU4H2Y93JK3NN_IXG03VibeeO3Z4ZXmmY';

// The correct service worker file
const SW_FILE = '/service-worker.js';

// Timeout wrapper
function withTimeout(promise, ms, errorMessage = 'Operation timed out') {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

class PushNotificationService {
  constructor() {
    this.swRegistration = null;
    this.subscription = null;
    this.initialized = false;
    this.supported = false;
    this.initPromise = null;
    this._isNative = isNativePlatform();
    this._nativeFcmToken = null;
    this._nativeListenersAdded = false;
  }

  isSupported() {
    if (this._isNative) return true; // Native always supports push via FCM
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  async init() {
    if (this.initPromise) return this.initPromise;
    if (this.initialized) return this.supported;
    
    this.initPromise = this._doInit();
    try {
      return await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  // Alias for init() - some code calls initialize() instead
  async initialize() {
    return this.init();
  }

  async _doInit() {
    // console.log('[PushService] Initializing...');
    
    // Native Capacitor: use @capacitor-firebase/messaging (FCM)
    if (this._isNative) {
      try {
        const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
        
        if (!this._nativeListenersAdded) {
          // Listen for FCM token refresh — fires on initial token + every refresh
          FirebaseMessaging.addListener('tokenReceived', (event) => {
            this._nativeFcmToken = event.token;
            // console.log('[PushService] FCM token received:', event.token.substring(0, 20) + '...');
          });
          
          // Listen for push received (foreground)
          FirebaseMessaging.addListener('notificationReceived', (event) => {
            // console.log('[PushService] Native push received:', event.notification?.title);
          });
          
          // Listen for push action (user tapped notification)
          FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
            // console.log('[PushService] Native push action:', event.notification?.data);
            // TODO: Navigate to the relevant game screen based on event.notification.data
          });
          
          this._nativeListenersAdded = true;
        }
        
        this.supported = true;
        this.initialized = true;
        return true;
      } catch (e) {
        console.warn('[PushService] Native push init failed:', e.message);
        this.supported = false;
        this.initialized = true;
        return false;
      }
    }
    
    // Web: existing Web Push initialization
    this.supported = this.isSupported();
    if (!this.supported) {
      // console.log('[PushService] Push not supported');
      this.initialized = true;
      return false;
    }

    try {
      // Step 1: Clean up conflicting service workers
      // console.log('[PushService] Checking for conflicting service workers...');
      await this._cleanupConflictingWorkers();
      
      // Step 2: Get or register the correct service worker
      // console.log('[PushService] Getting service worker registration...');
      this.swRegistration = await withTimeout(
        this._getOrRegisterServiceWorker(),
        15000,
        'Service worker registration timed out'
      );
      
      if (!this.swRegistration) {
        throw new Error('Failed to get service worker registration');
      }
      
      // console.log('[PushService] Service worker ready:', this.swRegistration.scope);
      
      // Step 3: Check for existing subscription
      if (this.swRegistration.pushManager) {
        try {
          this.subscription = await withTimeout(
            this.swRegistration.pushManager.getSubscription(),
            5000,
            'Get subscription timed out'
          );
          if (this.subscription) {
            // console.log('[PushService] Existing subscription found');
          }
        } catch (e) {
          console.warn('[PushService] Could not check subscription:', e.message);
        }
      }
      
      this.initialized = true;
      // console.log('[PushService] Initialization complete');
      return true;
      
    } catch (error) {
      console.error('[PushService] Initialization failed:', error.message);
      this.initialized = true;
      this.supported = false;
      return false;
    }
  }

  // Clean up old/conflicting service workers
  async _cleanupConflictingWorkers() {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      // console.log('[PushService] Found', registrations.length, 'service worker registrations');
      
      for (const reg of registrations) {
        // Check if this is the old sw.js (not our service-worker.js)
        const swUrl = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || '';
        
        // Remove any sw.js registrations (we use service-worker.js now)
        if (swUrl.includes('/sw.js') && !swUrl.includes('service-worker.js')) {
          // console.log('[PushService] Unregistering old sw.js');
          try {
            await reg.unregister();
            // console.log('[PushService] Old sw.js unregistered');
          } catch (e) {
            console.warn('[PushService] Failed to unregister old worker:', e.message);
          }
        }
      }
    } catch (e) {
      console.warn('[PushService] Could not clean up workers:', e.message);
    }
  }

  // Get existing registration or create new one
  async _getOrRegisterServiceWorker() {
    // First, check if there's already a controlling service worker
    if (navigator.serviceWorker.controller) {
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (reg && reg.active) {
        // console.log('[PushService] Using existing controller');
        return reg;
      }
    }
    
    // Check all registrations for one we can use
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      const swUrl = reg.active?.scriptURL || '';
      if (swUrl.includes('service-worker.js') && reg.active) {
        // console.log('[PushService] Using existing service-worker.js registration');
        return reg;
      }
    }
    
    // Need to register a new service worker
    // console.log('[PushService] Registering new service worker...');
    const registration = await navigator.serviceWorker.register(SW_FILE, { scope: '/' });
    
    // Wait for it to activate
    if (!registration.active) {
      // console.log('[PushService] Waiting for activation...');
      await this._waitForActivation(registration);
    }
    
    return registration;
  }

  // Wait for service worker to activate
  async _waitForActivation(registration) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Service worker activation timed out'));
      }, 10000);
      
      const checkActive = () => {
        if (registration.active) {
          clearTimeout(timeout);
          resolve();
          return;
        }
        
        const worker = registration.installing || registration.waiting;
        if (worker) {
          worker.addEventListener('statechange', () => {
            if (registration.active) {
              clearTimeout(timeout);
              resolve();
            }
          });
        }
      };
      
      checkActive();
      
      // Also poll in case events don't fire
      const pollInterval = setInterval(() => {
        if (registration.active) {
          clearInterval(pollInterval);
          clearTimeout(timeout);
          resolve();
        }
      }, 200);
    });
  }

  getPermissionStatus() {
    if (this._isNative) {
      // On native, permission is checked via the plugin — return 'default' as a safe fallback
      // Actual permission check happens in subscribe()
      return this._nativeFcmToken ? 'granted' : 'default';
    }
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  }

  // Synchronous check based on cached value - fast but may be stale
  isSubscribed() {
    return !!this.subscription;
  }

  // v7.15: Async check that queries the browser directly
  // Use this when opening settings modal to get accurate state
  async checkSubscription() {
    // console.log('[PushService] checkSubscription called');
    
    // Native: check if we have an FCM token
    if (this._isNative) {
      return !!this._nativeFcmToken;
    }
    
    // Make sure we're initialized
    if (!this.initialized) {
      await this.init();
    }
    
    if (!this.swRegistration?.pushManager) {
      // console.log('[PushService] No pushManager available, returning false');
      return false;
    }
    
    try {
      // Query the browser directly for current subscription state
      this.subscription = await this.swRegistration.pushManager.getSubscription();
      const isSubbed = !!this.subscription;
      // console.log('[PushService] checkSubscription result:', isSubbed);
      return isSubbed;
    } catch (e) {
      console.warn('[PushService] checkSubscription error:', e.message);
      return false;
    }
  }

  // v7.21: Cross-platform subscription check used by OnlineMenu to decide
  // whether to show the NotificationPrompt banner. Returns true if the user
  // has an active push subscription on EITHER platform path:
  //   - Native: in-memory FCM token (current session) OR a 'fcm:%' DB row
  //     for this user (handles app restart — in-memory token is null but
  //     the row persists from the prior session).
  //   - Web: existing pushManager.getSubscription() flow.
  // Pre-v7.21 the OnlineMenu only checked pushManager, which is meaningless
  // on native (no Web Push subscription is ever created there), so the banner
  // would either always show or always hide depending on incidental WebView
  // behavior. This method centralizes the platform decision.
  async hasActiveSubscription(userId) {
    if (!userId) return false;

    // Native: in-memory token first, then DB lookup
    if (this._isNative) {
      if (this._nativeFcmToken) return true;
      try {
        const { data, error } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_id', userId)
          .like('endpoint', 'fcm:%')
          .limit(1);
        if (error) return false;
        return !!(data && data.length > 0);
      } catch (e) {
        console.warn('[PushService] hasActiveSubscription DB lookup failed:', e.message);
        return false;
      }
    }

    // Web: query SW pushManager (with timeout for fresh PWA visits where SW
    // may not yet be activated)
    try {
      if (!('serviceWorker' in navigator)) return false;
      const swReady = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) => setTimeout(() => reject(new Error('SW timeout')), 3000))
      ]);
      if (!swReady?.pushManager) return false;
      const subscription = await swReady.pushManager.getSubscription();
      return subscription !== null;
    } catch {
      return false;
    }
  }

  async subscribe(userId) {
    // console.log('[PushService] Subscribe called for user:', userId);
    
    if (!userId) {
      throw new Error('User ID required');
    }

    // Native Capacitor: use FCM via @capacitor-firebase/messaging
    if (this._isNative) {
      try {
        const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
        
        // Request permission (Android 13+ shows system dialog; iOS shows on first call)
        const permResult = await FirebaseMessaging.requestPermissions();
        if (permResult.receive !== 'granted') {
          return { success: false, reason: 'permission_denied' };
        }
        
        // Get FCM token directly — no more register+wait dance.
        // The 'tokenReceived' listener also fires here on Android, but we don't
        // need to depend on it because getToken() returns the token synchronously.
        const tokenResult = await FirebaseMessaging.getToken();
        
        if (!tokenResult?.token) {
          throw new Error('FCM token not received');
        }
        
        this._nativeFcmToken = tokenResult.token;
        
        // Save FCM token to DB with 'fcm:' prefix so edge function routes via FCM
        await this._saveNativeToken(userId, this._nativeFcmToken);
        
        return { success: true, subscription: { type: 'fcm', token: this._nativeFcmToken } };
      } catch (error) {
        console.error('[PushService] Native subscribe failed:', error.message);
        throw error;
      }
    }

    // Web: existing Web Push flow
    // Ensure initialized
    if (!this.initialized) {
      const initResult = await withTimeout(this.init(), 20000, 'Init timed out');
      if (!initResult) {
        throw new Error('Push notifications not supported');
      }
    }

    if (!this.supported || !this.swRegistration) {
      throw new Error('Push not available');
    }

    try {
      // Request permission
      // console.log('[PushService] Requesting permission...');
      const permission = await withTimeout(
        Notification.requestPermission(),
        30000,
        'Permission request timed out'
      );
      
      // console.log('[PushService] Permission:', permission);
      
      if (permission !== 'granted') {
        return { success: false, reason: 'permission_denied' };
      }

      // Subscribe
      // console.log('[PushService] Creating subscription...');
      const applicationServerKey = this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      
      this.subscription = await withTimeout(
        this.swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        }),
        15000,
        'Subscription timed out'
      );

      // console.log('[PushService] Subscription created');

      // Save to database
      try {
        await this.saveSubscription(userId, this.subscription);
      } catch (saveError) {
        console.warn('[PushService] Save failed:', saveError.message);
      }

      return { success: true, subscription: this.subscription };
      
    } catch (error) {
      console.error('[PushService] Subscribe failed:', error.message);
      throw error;
    }
  }

  async unsubscribe(userId) {
    // console.log('[PushService] Unsubscribe called');
    
    // Native: remove FCM registration
    if (this._isNative) {
      try {
        const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
        // deleteToken() explicitly invalidates the FCM registration on the Firebase side
        try { await FirebaseMessaging.deleteToken(); } catch (_) { /* token may already be gone */ }
        await FirebaseMessaging.removeAllListeners();
        this._nativeListenersAdded = false;
        this._nativeFcmToken = null;
        if (userId) await this.removeSubscription(userId);
        return { success: true };
      } catch (e) {
        console.warn('[PushService] Native unsubscribe failed:', e.message);
        return { success: false, error: e.message };
      }
    }
    
    // Web: existing unsubscribe
    try {
      if (this.subscription) {
        await this.subscription.unsubscribe();
        // console.log('[PushService] Browser subscription removed');
      }
      
      // Remove from database
      if (userId) {
        try {
          await this.removeSubscription(userId);
        } catch (e) {
          console.warn('[PushService] DB removal failed:', e.message);
        }
      }
      
      this.subscription = null;
      return { success: true };
      
    } catch (error) {
      console.error('[PushService] Unsubscribe failed:', error.message);
      this.subscription = null;
      return { success: false, error: error.message };
    }
  }

  async saveSubscription(userId, subscription) {
    const subscriptionJson = subscription.toJSON();
    
    // console.log('[PushService] Saving subscription to database...');
    
    // v7.21: onConflict is the actual DB constraint name target — must match
    // the single-column UNIQUE(endpoint). Was 'user_id,endpoint' which caused
    // duplicate-key errors when a different user re-subscribed with the same
    // endpoint (same device, same FCM token, different account).
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscriptionJson.endpoint,
        p256dh: subscriptionJson.keys.p256dh,
        auth: subscriptionJson.keys.auth,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'endpoint'
      });

    if (error) {
      console.error('[PushService] Save error:', error);
      throw error;
    }
    
    // console.log('[PushService] Subscription saved');
  }

  async removeSubscription(userId) {
    // console.log('[PushService] Removing subscription from database...');
    
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId);

    if (error && error.code !== 'PGRST116') {
      console.error('[PushService] Remove error:', error);
      throw error;
    }
    
    // console.log('[PushService] Subscription removed from database');
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // v7.17: Silently re-subscribe if permission was previously granted but browser
  // subscription was lost (e.g., cache cleared without signing out). This prevents
  // the "zombie state" where DB has a stale endpoint and pushes silently fail.
  // v7.19: Native is a no-op — see file header. Re-introduce a guarded native path
  // only after Proguard keep rules are verified and FCM registration is proven safe.
  async resubscribeIfNeeded(userId) {
    if (!userId) return;
    
    // Native: never auto-subscribe (see v7.19 note in file header).
    if (this._isNative) return;
    
    // Web: existing resubscribe logic
    if (!this.isSupported()) return;
    if (Notification.permission !== 'granted') return;
    
    try {
      // Ensure initialized
      if (!this.initialized) {
        const ok = await withTimeout(this.init(), 15000, 'Init timed out');
        if (!ok) return;
      }
      
      if (!this.swRegistration?.pushManager) return;
      
      // Check if browser subscription still exists
      const existing = await withTimeout(
        this.swRegistration.pushManager.getSubscription(),
        5000,
        'Get subscription timed out'
      );
      
      if (existing) {
        // Subscription is alive — nothing to do
        this.subscription = existing;
        return;
      }
      
      // Permission granted but no subscription — re-subscribe silently
      // console.log('[PushService] Re-subscribing (permission granted, subscription lost)...');
      const applicationServerKey = this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      
      this.subscription = await withTimeout(
        this.swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        }),
        15000,
        'Re-subscription timed out'
      );
      
      // Upsert to DB (replaces any stale endpoint)
      await this.saveSubscription(userId, this.subscription);
      // console.log('[PushService] Re-subscribed successfully');
      
    } catch (e) {
      console.warn('[PushService] resubscribeIfNeeded failed:', e.message);
      // Non-fatal — user can still re-subscribe via NotificationPrompt or Settings
    }
  }

  // Send a test notification — in-app toast on native, service worker notification on web
  async sendTestNotification() {
    // Native: dispatch custom event for in-app toast (system notification feels wrong for a test)
    if (this._isNative) {
      window.dispatchEvent(new CustomEvent('deadblock:test-notification', {
        detail: { title: 'Notifications Enabled!', body: 'Push notifications are configured and working.' }
      }));
      return;
    }
    
    if (!this.swRegistration) {
      console.warn('[PushService] No service worker for test notification');
      return;
    }
    
    try {
      await this.swRegistration.showNotification('Notifications Enabled!', {
        body: 'If you received this test, then notifications are configured!',
        icon: '/icons/monochrome-192x192.png',
        badge: '/icons/monochrome-192x192.png',
        vibrate: [200, 100, 200],
        tag: 'test-notification',
        requireInteraction: false
      });
      // console.log('[PushService] Test notification sent');
    } catch (e) {
      console.error('[PushService] Test notification failed:', e.message);
    }
  }

  // Save native FCM token to push_subscriptions table
  // Uses 'fcm:' prefix on endpoint so edge function can distinguish FCM from Web Push
  // v7.21: onConflict changed from 'user_id,endpoint' to 'endpoint' — see header.
  async _saveNativeToken(userId, token) {
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: `fcm:${token}`,
        p256dh: null,
        auth: null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'endpoint'
      });

    if (error) {
      console.error('[PushService] FCM token save error:', error);
      throw error;
    }
  }
}

export const pushNotificationService = new PushNotificationService();
