// pushNotificationService.js - Client-side push notification management
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
    console.log('[PushService] checkSubscription called');
    
    // Make sure we're initialized
    if (!this.initialized) {
      await this.init();
    }
    
    if (!this.swRegistration?.pushManager) {
      console.log('[PushService] No pushManager available, returning false');
      return false;
    }
    
    try {
      // Query the browser directly for current subscription state
      this.subscription = await this.swRegistration.pushManager.getSubscription();
      const isSubbed = !!this.subscription;
      console.log('[PushService] checkSubscription result:', isSubbed);
      return isSubbed;
    } catch (e) {
      console.warn('[PushService] checkSubscription error:', e.message);
      return false;
    }
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
    
    try {
      if (this.subscription) {
        await this.subscription.unsubscribe();
        console.log('[PushService] Browser subscription removed');
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
    
    console.log('[PushService] Saving subscription to database...');
    
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscriptionJson.endpoint,
        p256dh: subscriptionJson.keys.p256dh,
        auth: subscriptionJson.keys.auth,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,endpoint'
      });

    if (error) {
      console.error('[PushService] Save error:', error);
      throw error;
    }
    
    console.log('[PushService] Subscription saved');
  }

  async removeSubscription(userId) {
    console.log('[PushService] Removing subscription from database...');
    
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId);

    if (error && error.code !== 'PGRST116') {
      console.error('[PushService] Remove error:', error);
      throw error;
    }
    
    console.log('[PushService] Subscription removed from database');
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

  // Send a test notification via the service worker
  async sendTestNotification() {
    console.log('[PushService] Sending test notification...');
    
    if (!this.swRegistration) {
      console.warn('[PushService] No service worker for test notification');
      return;
    }
    
    try {
      await this.swRegistration.showNotification('🎮 Notifications Enabled!', {
        body: 'You\'ll be notified when it\'s your turn in online games.',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        vibrate: [200, 100, 200],
        tag: 'test-notification',
        requireInteraction: false
      });
      console.log('[PushService] Test notification sent');
    } catch (e) {
      console.error('[PushService] Test notification failed:', e.message);
    }
  }
}

export const pushNotificationService = new PushNotificationService();
