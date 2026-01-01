// pushNotificationService.js - Client-side push notification management
// Place in src/services/pushNotificationService.js
//
// This service handles:
// - Service worker registration
// - Push subscription management
// - Storing subscriptions in Supabase
// - Permission requests

import { supabase } from '../utils/supabase';

// VAPID public key - YOU MUST GENERATE YOUR OWN
// Generate with: npx web-push generate-vapid-keys
// Store the private key securely (in Supabase secrets/environment variables)
// Replace this with your actual public key
const VAPID_PUBLIC_KEY = BEz7oIWn2ESc7ahvq894zbJNKV9dDYRIRNuAvCpuvTMh4NOAFT-U5UeU4H2Y93JK3NN_IXG03VibeeO3Z4ZXmmY;

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

  // Initialize the service
  async init() {
    if (this.initialized) return this.supported;

    this.supported = this.isSupported();
    
    if (!this.supported) {
      console.log('[PushService] Push notifications not supported');
      this.initialized = true;
      return false;
    }

    try {
      // Register service worker
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('[PushService] Service worker registered:', this.swRegistration);

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      
      // Check for existing subscription
      this.subscription = await this.swRegistration.pushManager.getSubscription();
      
      if (this.subscription) {
        console.log('[PushService] Existing subscription found');
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
    if (!this.supported || !this.swRegistration) {
      throw new Error('Push notifications not supported or not initialized');
    }

    if (!userId) {
      throw new Error('User ID required for subscription');
    }

    try {
      // Request notification permission if not granted
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        console.log('[PushService] Notification permission denied');
        return { success: false, reason: 'permission_denied' };
      }

      // Convert VAPID key to Uint8Array
      const applicationServerKey = this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

      // Subscribe to push manager
      this.subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      console.log('[PushService] Push subscription created:', this.subscription);

      // Save subscription to Supabase
      const saved = await this.saveSubscription(userId, this.subscription);
      
      if (!saved) {
        throw new Error('Failed to save subscription to server');
      }

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
    try {
      const subscriptionJson = subscription.toJSON();
      
      // Get device info for identification
      const deviceInfo = this.getDeviceInfo();
      
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
      userAgent: ua.substring(0, 200), // Truncate for storage
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
      badge: '/pwa-192x192.png',
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
