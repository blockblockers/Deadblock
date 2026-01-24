// pushNotificationService.js - Client-side push notification management
// v7.14: Fixed to use existing service worker instead of registering a new one
// Place in src/services/pushNotificationService.js

import { supabase, isSupabaseConfigured } from '../utils/supabase';

// VAPID public key from environment variables
// Set VITE_VAPID_PUBLIC_KEY in your .env file
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

class PushNotificationService {
  constructor() {
    this.swRegistration = null;
    this.subscription = null;
    this.initialized = false;
    this.supported = false;
  }

  // Check if push notifications are supported
  isSupported() {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  // Initialize the service - uses EXISTING service worker
  async init() {
    if (this.initialized) return this.supported;

    this.supported = this.isSupported();
    
    if (!this.supported) {
      console.log('[PushService] Push notifications not supported');
      this.initialized = true;
      return false;
    }

    try {
      // Wait for any existing service worker to be ready
      // This uses the ALREADY REGISTERED service worker instead of registering a new one
      this.swRegistration = await navigator.serviceWorker.ready;
      
      console.log('[PushService] Using existing service worker:', this.swRegistration);

      // Check for existing subscription
      this.subscription = await this.swRegistration.pushManager.getSubscription();
      
      if (this.subscription) {
        console.log('[PushService] Existing subscription found:', this.subscription.endpoint.substring(0, 50) + '...');
      } else {
        console.log('[PushService] No existing subscription');
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('[PushService] Initialization failed:', error);
      this.initialized = true;
      return false;
    }
  }

  // Get current permission status
  getPermissionStatus() {
    if (!this.supported) return 'unsupported';
    return Notification.permission;
  }

  // Check if currently subscribed
  isSubscribed() {
    return !!this.subscription;
  }

  // Subscribe to push notifications
  async subscribe(userId) {
    if (!this.supported) {
      console.error('[PushService] Push not supported');
      return { success: false, reason: 'not_supported' };
    }
    
    if (!this.swRegistration) {
      // Try to initialize if not done
      await this.init();
      if (!this.swRegistration) {
        console.error('[PushService] Service worker not available');
        return { success: false, reason: 'no_service_worker' };
      }
    }

    if (!userId) {
      console.error('[PushService] User ID required');
      return { success: false, reason: 'no_user_id' };
    }

    try {
      // Request notification permission if not granted
      console.log('[PushService] Current permission:', Notification.permission);
      
      if (Notification.permission === 'denied') {
        console.log('[PushService] Notifications blocked by user');
        return { success: false, reason: 'permission_denied' };
      }
      
      if (Notification.permission !== 'granted') {
        console.log('[PushService] Requesting notification permission...');
        const permission = await Notification.requestPermission();
        console.log('[PushService] Permission result:', permission);
        
        if (permission !== 'granted') {
          return { success: false, reason: 'permission_denied' };
        }
      }

      // Validate VAPID key is configured
      if (!VAPID_PUBLIC_KEY) {
        console.error('[PushService] VAPID_PUBLIC_KEY not configured. Set VITE_VAPID_PUBLIC_KEY in .env');
        return { success: false, reason: 'vapid_not_configured' };
      }

      // Convert VAPID key to Uint8Array
      const applicationServerKey = this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      console.log('[PushService] VAPID key converted, subscribing to push manager...');

      // Subscribe to push manager
      this.subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      console.log('[PushService] Push subscription created');

      // Save subscription to Supabase
      const saved = await this.saveSubscription(userId, this.subscription);
      
      if (!saved) {
        console.error('[PushService] Failed to save subscription to database');
        // Still return success since we have the subscription, just couldn't save it
        // User can retry saving later
      }

      return { success: true, subscription: this.subscription };
    } catch (error) {
      console.error('[PushService] Subscription failed:', error);
      
      // Provide more specific error messages
      if (error.message?.includes('permission')) {
        return { success: false, reason: 'permission_denied' };
      }
      if (error.message?.includes('applicationServerKey')) {
        return { success: false, reason: 'invalid_vapid_key' };
      }
      
      return { success: false, reason: 'subscription_failed', error: error.message };
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
      return { success: false, error: error.message };
    }
  }

  // Save subscription to Supabase
  async saveSubscription(userId, subscription) {
    if (!isSupabaseConfigured()) {
      console.warn('[PushService] Supabase not configured');
      return false;
    }
    
    try {
      const subscriptionJson = subscription.toJSON();
      
      // Get device info for identification
      const deviceInfo = this.getDeviceInfo();
      
      console.log('[PushService] Saving subscription to database...');
      
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          endpoint: subscriptionJson.endpoint,
          p256dh: subscriptionJson.keys?.p256dh,
          auth: subscriptionJson.keys?.auth,
          device_info: deviceInfo,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,endpoint'
        });

      if (error) {
        console.error('[PushService] Failed to save subscription:', error);
        return false;
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
    if (!isSupabaseConfigured()) {
      return false;
    }
    
    try {
      const endpoint = this.subscription?.endpoint;
      
      if (endpoint) {
        // Remove specific subscription
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId)
          .eq('endpoint', endpoint);
      } else {
        // Remove all subscriptions for user (fallback)
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId);
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
      console.error('[PushService] Service worker not registered');
      return false;
    }

    try {
      await this.swRegistration.showNotification('Deadblock Notifications Enabled! 🎮', {
        body: 'You\'ll now receive alerts when it\'s your turn.',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: 'test-notification',
        renotify: true,
        vibrate: [100, 50, 100]
      });
      console.log('[PushService] Test notification sent');
      return true;
    } catch (error) {
      console.error('[PushService] Failed to send test notification:', error);
      return false;
    }
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
