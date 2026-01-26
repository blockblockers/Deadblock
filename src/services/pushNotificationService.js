// pushNotificationService.js - Push Notification Service
// v7.14: Added init() alias for backwards compatibility with SettingsModal
// v7.14: Fixed unsubscribe functionality, uses existing service worker
// Place in src/services/pushNotificationService.js

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const AUTH_KEY = 'sb-oyeibyrednwlolmsjlwk-auth-token';

// VAPID public key from environment variable
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

class PushNotificationService {
  constructor() {
    this.swRegistration = null;
    this.subscription = null;
    this.initialized = false;
  }

  // Check if push notifications are supported
  isSupported() {
    return 'serviceWorker' in navigator && 
           'PushManager' in window && 
           'Notification' in window;
  }

  // Get current notification permission status
  getPermissionStatus() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission; // 'default', 'granted', or 'denied'
  }

  // Check if currently subscribed
  isSubscribed() {
    return this.subscription !== null;
  }

  // Alias for initialize() - for backwards compatibility with SettingsModal
  async init() {
    return this.initialize();
  }

  // Initialize the service
  async initialize() {
    if (this.initialized) return true;
    
    if (!this.isSupported()) {
      console.log('[PushService] Push notifications not supported');
      return false;
    }

    try {
      // FIXED: Use existing service worker registration instead of registering new one
      // The app already has a service worker at /service-worker.js
      console.log('[PushService] Waiting for existing service worker...');
      this.swRegistration = await navigator.serviceWorker.ready;
      console.log('[PushService] Service worker ready:', this.swRegistration);

      // Check for existing subscription
      this.subscription = await this.swRegistration.pushManager.getSubscription();
      
      if (this.subscription) {
        console.log('[PushService] Found existing subscription');
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('[PushService] Initialization failed:', error);
      return false;
    }
  }

  // Subscribe to push notifications
  async subscribe(userId) {
    console.log('[PushService] Subscribing for user:', userId);
    
    if (!await this.initialize()) {
      return { success: false, reason: 'initialization_failed' };
    }

    // Check VAPID key is configured
    if (!VAPID_PUBLIC_KEY) {
      console.error('[PushService] VAPID_PUBLIC_KEY not configured in environment');
      return { success: false, reason: 'vapid_not_configured' };
    }

    // Request permission if not granted
    if (Notification.permission === 'default') {
      console.log('[PushService] Requesting notification permission...');
      const permission = await Notification.requestPermission();
      console.log('[PushService] Permission result:', permission);
      
      if (permission !== 'granted') {
        return { success: false, reason: 'permission_denied' };
      }
    } else if (Notification.permission === 'denied') {
      return { success: false, reason: 'permission_denied' };
    }

    try {
      // Subscribe to push
      console.log('[PushService] Creating push subscription...');
      this.subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      console.log('[PushService] Subscription created:', this.subscription.endpoint);

      // Store subscription in database
      const stored = await this.storeSubscription(userId, this.subscription);
      
      if (!stored) {
        console.warn('[PushService] Failed to store subscription in database');
        // Don't fail - local subscription still works
      }

      return { success: true };
    } catch (error) {
      console.error('[PushService] Subscribe failed:', error);
      return { success: false, reason: error.message };
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(userId) {
    console.log('[PushService] Unsubscribing for user:', userId);
    
    if (!await this.initialize()) {
      return { success: false, reason: 'initialization_failed' };
    }

    try {
      // Get current subscription if we don't have it
      if (!this.subscription) {
        this.subscription = await this.swRegistration.pushManager.getSubscription();
      }

      if (this.subscription) {
        // Unsubscribe from push manager
        const success = await this.subscription.unsubscribe();
        console.log('[PushService] Push unsubscribe result:', success);
        
        if (success) {
          // Remove from database
          await this.removeSubscription(userId);
          this.subscription = null;
          return { success: true };
        }
      } else {
        // No subscription found - consider this success
        console.log('[PushService] No subscription to unsubscribe from');
        await this.removeSubscription(userId);
        return { success: true };
      }

      return { success: false, reason: 'unsubscribe_failed' };
    } catch (error) {
      console.error('[PushService] Unsubscribe failed:', error);
      return { success: false, reason: error.message };
    }
  }

  // Store subscription in Supabase
  async storeSubscription(userId, subscription) {
    if (!SUPABASE_URL || !ANON_KEY) return false;

    const authData = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
    if (!authData?.access_token) return false;

    const headers = {
      'Authorization': `Bearer ${authData.access_token}`,
      'apikey': ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    };

    try {
      const deviceInfo = this.getDeviceInfo();
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')))),
          device_info: deviceInfo,
          created_at: new Date().toISOString()
        })
      });

      return response.ok;
    } catch (error) {
      console.error('[PushService] Error storing subscription:', error);
      return false;
    }
  }

  // Remove subscription from Supabase
  async removeSubscription(userId) {
    if (!SUPABASE_URL || !ANON_KEY) return false;

    const authData = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
    if (!authData?.access_token) return false;

    const headers = {
      'Authorization': `Bearer ${authData.access_token}`,
      'apikey': ANON_KEY,
      'Content-Type': 'application/json'
    };

    try {
      // Delete all subscriptions for this user on this device
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${userId}`,
        {
          method: 'DELETE',
          headers
        }
      );

      console.log('[PushService] Remove subscription response:', response.status);
      return response.ok || response.status === 204;
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
      return;
    }

    try {
      await this.swRegistration.showNotification('Test Notification', {
        body: 'Push notifications are working!',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: 'test-notification',
        renotify: true
      });
    } catch (error) {
      console.error('[PushService] Test notification failed:', error);
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
