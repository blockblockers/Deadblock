// pushNotificationService.js - Client-side push notification management
// v7.12 - FIXES:
// - Registers /service-worker.js (consolidated file)
// - Better error handling during init
// - Waits for service worker to be active before checking subscription
// - More detailed logging for debugging
// Place in src/services/pushNotificationService.js

import { supabase } from '../utils/supabase';

// VAPID public key - YOU MUST GENERATE YOUR OWN
// Generate with: npx web-push generate-vapid-keys
// Store the private key securely (in Supabase secrets/environment variables)
const VAPID_PUBLIC_KEY = 'BEz7oIWn2ESc7ahvq894zbJNKV9dDYRIRNuAvCpuvTMh4NOAFT-U5UeU4H2Y93JK3NN_IXG03VibeeO3Z4ZXmmY';

class PushNotificationService {
  constructor() {
    this.swRegistration = null;
    this.subscription = null;
    this.initialized = false;
    this.supported = false;
    this.initPromise = null;
  }

  // Check if push notifications are supported
  isSupported() {
    const hasServiceWorker = 'serviceWorker' in navigator;
    const hasPushManager = 'PushManager' in window;
    const hasNotification = 'Notification' in window;
    
    console.log('[PushService] Support check:', { hasServiceWorker, hasPushManager, hasNotification });
    
    return hasServiceWorker && hasPushManager && hasNotification;
  }

  // Initialize the service - returns a promise that resolves when ready
  async init() {
    // Return existing promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }
    
    // Return cached result if already initialized
    if (this.initialized) {
      return this.supported;
    }

    this.initPromise = this._doInit();
    return this.initPromise;
  }
  
  async _doInit() {
    this.supported = this.isSupported();
    
    if (!this.supported) {
      console.log('[PushService] Push notifications not supported on this browser/device');
      this.initialized = true;
      return false;
    }

    try {
      console.log('[PushService] Registering service worker...');
      
      // v7.12: Register the consolidated service-worker.js
      this.swRegistration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });
      
      console.log('[PushService] Service worker registered:', this.swRegistration.scope);

      // Wait for the service worker to be ready and active
      const registration = await navigator.serviceWorker.ready;
      console.log('[PushService] Service worker ready:', registration.active?.state);
      
      // If service worker is not yet active, wait for it
      if (registration.active?.state !== 'activated') {
        await new Promise((resolve) => {
          if (registration.active) {
            registration.active.addEventListener('statechange', function onStateChange() {
              if (this.state === 'activated') {
                this.removeEventListener('statechange', onStateChange);
                resolve();
              }
            });
          } else if (registration.installing || registration.waiting) {
            const sw = registration.installing || registration.waiting;
            sw.addEventListener('statechange', function onStateChange() {
              if (this.state === 'activated') {
                this.removeEventListener('statechange', onStateChange);
                resolve();
              }
            });
          } else {
            resolve(); // Already active or unknown state
          }
          // Timeout after 5 seconds
          setTimeout(resolve, 5000);
        });
      }
      
      // Check for existing subscription
      try {
        this.subscription = await this.swRegistration.pushManager.getSubscription();
        console.log('[PushService] Existing subscription:', this.subscription ? 'found' : 'none');
      } catch (subError) {
        console.warn('[PushService] Error checking subscription:', subError);
        this.subscription = null;
      }

      this.initialized = true;
      this.supported = true;
      console.log('[PushService] Initialization complete');
      return true;
    } catch (error) {
      console.error('[PushService] Initialization failed:', error);
      this.initialized = true;
      this.supported = false;
      return false;
    }
  }

  // Get current permission status
  getPermissionStatus() {
    if (!this.supported) return 'unsupported';
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  }

  // Check if currently subscribed
  isSubscribed() {
    return !!this.subscription;
  }

  // Subscribe to push notifications
  async subscribe(userId) {
    console.log('[PushService] Subscribe called for user:', userId);
    
    if (!userId) {
      throw new Error('User ID required for subscription');
    }
    
    // Ensure initialized
    if (!this.initialized) {
      await this.init();
    }
    
    if (!this.supported || !this.swRegistration) {
      console.error('[PushService] Not supported or not initialized');
      throw new Error('Push notifications not supported or not initialized');
    }

    try {
      // Request notification permission if not granted
      console.log('[PushService] Current permission:', Notification.permission);
      
      if (Notification.permission === 'denied') {
        console.log('[PushService] Permission already denied');
        return { success: false, reason: 'permission_denied' };
      }
      
      const permission = await Notification.requestPermission();
      console.log('[PushService] Permission result:', permission);
      
      if (permission !== 'granted') {
        console.log('[PushService] Permission not granted');
        return { success: false, reason: 'permission_denied' };
      }

      // Convert VAPID key to Uint8Array
      const applicationServerKey = this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

      // Subscribe to push manager
      console.log('[PushService] Creating push subscription...');
      this.subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      console.log('[PushService] Push subscription created successfully');

      // Save subscription to Supabase
      const saved = await this.saveSubscription(userId, this.subscription);
      
      if (!saved) {
        console.error('[PushService] Failed to save subscription to database');
        throw new Error('Failed to save subscription to server');
      }

      console.log('[PushService] Subscription saved to database');
      return { success: true, subscription: this.subscription };
    } catch (error) {
      console.error('[PushService] Subscription failed:', error);
      throw error;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(userId) {
    if (!this.subscription) {
      console.log('[PushService] No subscription to unsubscribe');
      return { success: true };
    }

    try {
      // Unsubscribe from push manager
      await this.subscription.unsubscribe();
      
      // Remove from Supabase
      if (userId) {
        await this.removeSubscription(userId);
      }

      this.subscription = null;
      console.log('[PushService] Unsubscribed successfully');
      
      return { success: true };
    } catch (error) {
      console.error('[PushService] Unsubscribe failed:', error);
      throw error;
    }
  }

  // Save subscription to Supabase
  async saveSubscription(userId, subscription) {
    if (!supabase) {
      console.error('[PushService] Supabase not configured');
      return false;
    }

    try {
      const subscriptionJSON = subscription.toJSON();
      
      console.log('[PushService] Saving subscription to database...');
      
      const subscriptionData = {
        user_id: userId,
        endpoint: subscriptionJSON.endpoint,
        p256dh: subscriptionJSON.keys?.p256dh || null,
        auth: subscriptionJSON.keys?.auth || null,
        device_info: this.getDeviceInfo(),
        updated_at: new Date().toISOString()
      };
      
      // Try upsert first
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(subscriptionData, {
          onConflict: 'endpoint'
        });

      if (error) {
        console.warn('[PushService] Upsert failed:', error.message);
        
        // Fallback: delete existing and insert new
        console.log('[PushService] Trying delete + insert fallback...');
        
        // Delete any existing subscription with this endpoint
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscriptionJSON.endpoint);
        
        // Insert fresh
        const { error: insertError } = await supabase
          .from('push_subscriptions')
          .insert(subscriptionData);
        
        if (insertError) {
          console.error('[PushService] Insert fallback failed:', insertError);
          return false;
        }
        
        console.log('[PushService] Subscription saved via fallback');
        return true;
      }

      console.log('[PushService] Subscription saved to Supabase');
      return true;
    } catch (error) {
      console.error('[PushService] Error saving subscription:', error);
      return false;
    }
  }

  // Remove subscription from Supabase
  async removeSubscription(userId) {
    if (!supabase || !this.subscription) {
      return false;
    }

    try {
      const endpoint = this.subscription.endpoint;
      
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', endpoint);

      if (error) {
        console.error('[PushService] Error removing subscription:', error);
        return false;
      }

      console.log('[PushService] Subscription removed from Supabase');
      return true;
    } catch (error) {
      console.error('[PushService] Error removing subscription:', error);
      return false;
    }
  }

  // Get device info for subscription identification
  getDeviceInfo() {
    const ua = navigator.userAgent;
    let device = 'Unknown';
    let browser = 'Unknown';
    
    // Detect device
    if (/iPhone|iPad|iPod/.test(ua)) {
      device = 'iOS';
    } else if (/Android/.test(ua)) {
      device = 'Android';
    } else if (/Windows/.test(ua)) {
      device = 'Windows';
    } else if (/Mac/.test(ua)) {
      device = 'Mac';
    } else if (/Linux/.test(ua)) {
      device = 'Linux';
    }
    
    // Detect browser
    if (/Chrome/.test(ua) && !/Chromium|Edge/.test(ua)) {
      browser = 'Chrome';
    } else if (/Firefox/.test(ua)) {
      browser = 'Firefox';
    } else if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
      browser = 'Safari';
    } else if (/Edge/.test(ua)) {
      browser = 'Edge';
    }
    
    return {
      device,
      browser,
      userAgent: ua.substring(0, 200),
      timestamp: new Date().toISOString()
    };
  }

  // Convert VAPID key from base64 URL format to Uint8Array
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

  // Send a test notification (for debugging)
  async sendTestNotification() {
    if (!this.swRegistration) {
      throw new Error('Service worker not registered');
    }

    await this.swRegistration.showNotification('Test Notification', {
      body: 'Push notifications are working!',
      icon: '/pwa-192x192.png',
      badge: '/badges/badge-default.svg',
      tag: 'test-notification',
      renotify: true
    });
  }

  // Listen for messages from service worker
  setupMessageListener(callback) {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('[PushService] Message from SW:', event.data);
      
      if (callback) {
        callback(event.data);
      }
    });
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();

export default pushNotificationService;
