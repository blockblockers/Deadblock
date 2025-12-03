import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // App identification
  appId: 'com.deadblock.game',
  appName: 'DEADBLOCK',
  webDir: 'dist',
  
  // Server configuration
  server: {
    // Use HTTPS scheme for Android (required for modern APIs)
    androidScheme: 'https',
    // iOS scheme
    iosScheme: 'https',
    // Allow navigation to your web domain (for links)
    allowNavigation: ['*.netlify.app', 'deadblock.com']
  },

  // Android-specific configuration
  android: {
    // Use dark splash screen to match app theme
    backgroundColor: '#020617',
    // Allow mixed content (http in https)
    allowMixedContent: true,
    // Capture all links in the app
    captureInput: true,
    // Web View settings
    webContentsDebuggingEnabled: false, // Set to true for debugging
    // Build options
    buildOptions: {
      keystorePath: undefined, // Set when signing for release
      keystoreAlias: undefined,
      keystorePassword: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'AAB' // Android App Bundle for Play Store
    }
  },

  // iOS-specific configuration  
  ios: {
    // Background color for iOS
    backgroundColor: '#020617',
    // Content inset behavior
    contentInset: 'automatic',
    // Allow scroll
    allowsLinkPreview: false,
    // Scheme for deep links
    scheme: 'deadblock'
  },

  // Plugins configuration
  plugins: {
    // Splash Screen settings
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#020617',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    
    // Status Bar settings
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#020617'
    },
    
    // Keyboard settings
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    },

    // Haptics (vibration) - already used in your app
    Haptics: {
      // Uses system defaults
    }
  },

  // Logging (disable in production)
  loggingBehavior: 'none'
};

export default config;
