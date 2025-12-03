import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';

/**
 * Capacitor Native Bridge
 * 
 * This hook handles Capacitor-specific native integrations.
 * Import and call this in your main App component.
 */
export const useCapacitorNative = () => {
  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const initializeNative = async () => {
      try {
        // Hide splash screen after app is ready
        await SplashScreen.hide();

        // Configure status bar
        if (Capacitor.getPlatform() === 'ios' || Capacitor.getPlatform() === 'android') {
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: '#020617' });
        }
      } catch (error) {
        console.log('Native initialization error:', error);
      }
    };

    initializeNative();

    // Handle app state changes (foreground/background)
    const handleAppStateChange = CapApp.addListener('appStateChange', ({ isActive }) => {
      console.log('App state changed. Is active:', isActive);
      // You can pause/resume audio here if needed
    });

    // Handle back button on Android
    const handleBackButton = CapApp.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) {
        // Show exit confirmation or exit app
        CapApp.exitApp();
      } else {
        window.history.back();
      }
    });

    // Handle deep links
    const handleAppUrlOpen = CapApp.addListener('appUrlOpen', (event) => {
      console.log('App opened with URL:', event.url);
      // Handle deep linking here
      // Example: deadblock://puzzle/123
      const slug = event.url.split('deadblock://').pop();
      if (slug) {
        // Navigate to the appropriate screen
        console.log('Deep link slug:', slug);
      }
    });

    // Cleanup listeners
    return () => {
      handleAppStateChange.remove();
      handleBackButton.remove();
      handleAppUrlOpen.remove();
    };
  }, []);
};

/**
 * Check if running as native app
 */
export const isNativeApp = () => {
  return Capacitor.isNativePlatform();
};

/**
 * Get current platform
 */
export const getPlatform = () => {
  return Capacitor.getPlatform(); // 'ios', 'android', or 'web'
};

/**
 * Example usage in your main App.jsx:
 * 
 * import { useCapacitorNative } from './capacitor-native';
 * 
 * function App() {
 *   useCapacitorNative();
 *   
 *   // ... rest of your app
 * }
 */
