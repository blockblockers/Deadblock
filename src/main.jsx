import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Check if running in Capacitor native app
const isNativeApp = window.Capacitor !== undefined;

// Register service worker for PWA functionality (web only)
if ('serviceWorker' in navigator && !isNativeApp) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('ServiceWorker registered:', registration);
      })
      .catch((error) => {
        console.log('ServiceWorker registration failed:', error);
      });
  });
}

// Define SplashScreen handling for Capacitor
const initializeApp = async () => {
  if (isNativeApp) {
    try {
      // Dynamically import Capacitor plugins
      const { SplashScreen } = await import('@capacitor/splash-screen');
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      
      // Configure status bar
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#020617' });
      } catch (e) {
        console.log('StatusBar not available');
      }
      
      // Hide splash screen after a short delay
      setTimeout(async () => {
        await SplashScreen.hide();
      }, 1000);
    } catch (e) {
      console.log('Capacitor plugins not available:', e);
    }
  }
};

// Initialize native features
initializeApp();

// Mount the React application
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
