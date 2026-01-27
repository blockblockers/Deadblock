// pushNotificationService.js - Client-side push notification management
// v7.15: FIXED - Handles service worker conflicts, proper timeouts
// Place in src/services/pushNotificationService.js
//
// CRITICAL FIXES:
// - Unregisters conflicting service workers (service-worker.js vs sw.js)
// - 10 second timeout on ALL async operations
// - No more infinite spinning
// - Better error recovery

import { supabase } from '../utils/supabase';

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
  }

  isSupported() {
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

  async _doInit() {
    console.log('[PushService] Initializing...');
    
    this.supported = this.isSupported();
    if (!this.supported) {
      console.log('[PushService] Push not supported');
      this.initialized = true;
      return false;
    }

    try {
      // Step 1: Clean up conflicting service workers
      console.log('[PushService] Checking for conflicting service workers...');
      await this._cleanupConflictingWorkers();
      
      // Step 2: Get or register the correct service worker
      console.log('[PushService] Getting service worker registration...');
      this.swRegistration = await withTimeout(
        this._getOrRegisterServiceWorker(),
        15000,
        'Service worker registration timed out'
      );
      
      if (!this.swRegistration) {
        throw new Error('Failed to get service worker registration');
      }
      
      console.log('[PushService] Service worker ready:', this.swRegistration.scope);
      
      // Step 3: Check for existing subscription
      if (this.swRegistration.pushManager) {
        try {
          this.subscription = await withTimeout(
            this.swRegistration.pushManager.getSubscription(),
            5000,
            'Get subscription timed out'
          );
          if (this.subscription) {
            console.log('[PushService] Existing subscription found');
          }
        } catch (e) {
          console.warn('[PushService] Could not check subscription:', e.message);
        }
      }
      
      this.initialized = true;
      console.log('[PushService] Initialization complete');
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
      console.log('[PushService] Found', registrations.length, 'service worker registrations');
      
      for (const reg of registrations) {
        // Check if this is the old sw.js (not our service-worker.js)
        const swUrl = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || '';
        
        // Remove any sw.js registrations (we use service-worker.js now)
        if (swUrl.includes('/sw.js') && !swUrl.includes('service-worker.js')) {
          console.log('[PushService] Unregistering old sw.js');
          try {
            await reg.unregister();
            console.log('[PushService] Old sw.js unregistered');
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
        console.log('[PushService] Using existing controller');
        return reg;
      }
    }
    
    // Check all registrations for one we can use
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      const swUrl = reg.active?.scriptURL || '';
      if (swUrl.includes('service-worker.js') && reg.active) {
        console.log('[PushService] Using existing service-worker.js registration');
        return reg;
      }
    }
    
    // Need to register a new service worker
    console.log('[PushService] Registering new service worker...');
    const registration = await navigator.serviceWorker.register(SW_FILE, { scope: '/' });
    
    // Wait for it to activate
    if (!registration.active) {
      console.log('[PushService] Waiting for activation...');
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
            if (worker.state === 'activated') {
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
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  }

  isSubscribed() {
    return !!this.subscription;
  }

  async subscribe(userId) {
    console.log('[PushService] Subscribe called for user:', userId);
    
    if (!userId) {
      throw new Error('User ID required');
    }

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
      console.log('[PushService] Requesting permission...');
      const permission = await withTimeout(
        Notification.requestPermission(),
        30000,
        'Permission request timed out'
      );
      
      console.log('[PushService] Permission:', permission);
      
      if (permission !== 'granted') {
        return { success: false, reason: 'permission_denied' };
      }

      // Subscribe
      console.log('[PushService] Creating subscription...');
      const applicationServerKey = this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      
      this.subscription = await withTimeout(
        this.swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        }),
        15000,
        'Subscription timed out'
      );

      console.log('[PushService] Subscription created');

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
    console.log('[PushService] Unsubscribe called');
    
    if (!this.subscription) {
      return { success: true };
    }

    try {
      await withTimeout(this.subscription.unsubscribe(), 10000, 'Unsubscribe timed out');
      
      if (userId) {
        try {
          await this.removeSubscription(userId);
        } catch (e) {
          console.warn('[PushService] Remove from DB failed:', e.message);
        }
      }

      this.subscription = null;
      console.log('[PushService] Unsubscribed');
      return { success: true };
    } catch (error) {
      console.error('[PushService] Unsubscribe failed:', error.message);
      throw error;
    }
  }

  async saveSubscription(userId, subscription) {
    const json = subscription.toJSON();
    const deviceInfo = this.getDeviceInfo();
    
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
        device_info: deviceInfo,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,endpoint' });

    if (error) throw error;
    console.log('[PushService] Saved to database');
    return true;
  }

  async removeSubscription(userId) {
    const endpoint = this.subscription?.endpoint;
    const query = supabase.from('push_subscriptions').delete().eq('user_id', userId);
    if (endpoint) query.eq('endpoint', endpoint);
    await query;
    console.log('[PushService] Removed from database');
  }

  getDeviceInfo() {
    const ua = navigator.userAgent;
    let device = 'Unknown', browser = 'Unknown';
    
    if (/iPhone|iPad|iPod/.test(ua)) device = 'iOS';
    else if (/Android/.test(ua)) device = 'Android';
    else if (/Windows/.test(ua)) device = 'Windows';
    else if (/Mac/.test(ua)) device = 'Mac';
    else if (/Linux/.test(ua)) device = 'Linux';
    
    if (/Chrome/.test(ua) && !/Edge/.test(ua)) browser = 'Chrome';
    else if (/Firefox/.test(ua)) browser = 'Firefox';
    else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
    else if (/Edge/.test(ua)) browser = 'Edge';
    
    return { device, browser, userAgent: ua.substring(0, 200), timestamp: new Date().toISOString() };
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from(rawData, char => char.charCodeAt(0));
  }

  async sendTestNotification() {
    if (!this.swRegistration) {
      console.warn('[PushService] No service worker for test');
      return;
    }
    try {
      await this.swRegistration.showNotification('Deadblock', {
        body: 'Push notifications are working! 🎮',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: 'test',
        vibrate: [100, 50, 100]
      });
    } catch (e) {
      console.error('[PushService] Test notification failed:', e.message);
    }
  }

  setupMessageListener(callback) {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (callback) callback(event.data);
    });
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
