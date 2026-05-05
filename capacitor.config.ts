import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // App identification
  appId: 'com.deadblock.game',
  appName: 'DEADBLOCK',
  webDir: 'dist',
  
  // Server configuration
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    allowNavigation: ['deadblock.app', '*.deadblock.app', '*.supabase.co'],
    // NOTE: hostname removed — it caused ERR_NAME_NOT_RESOLVED for Supabase
    // and prevented Capacitor bridge injection (isNativePlatform() returned false)
  },

  // Android-specific configuration
  android: {
    backgroundColor: '#020617',
    allowMixedContent: false,
    captureInput: true,
    // TEMPORARY: Enable for debugging — set to false before Play Store release
    webContentsDebuggingEnabled: true,
    appendUserAgent: 'DEADBLOCK-Android',
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
      keystorePassword: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'AAB'
    }
  },

  // iOS-specific configuration  
  ios: {
    backgroundColor: '#020617',
    contentInset: 'automatic',
    allowsLinkPreview: false,
    scheme: 'deadblock',
    appendUserAgent: 'DEADBLOCK-iOS',
    preferredContentMode: 'mobile'
  },

  // Plugins configuration
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#020617',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#020617',
      overlaysWebView: false
    },
    
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    },

    Haptics: {},
    
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  },

  loggingBehavior: 'none'
};

export default config;
