// platformUtils.js - Detect whether running as PWA or native Capacitor app
// v1.0: Shared utility for platform branching

let _isNative = null;

export const isNativePlatform = () => {
  if (_isNative !== null) return _isNative;
  try {
    // Dynamic import check — Capacitor sets window.Capacitor when native
    _isNative = !!(window.Capacitor?.isNativePlatform?.() ?? window.Capacitor?.isNative);
  } catch {
    _isNative = false;
  }
  return _isNative;
};

export const isWeb = () => !isNativePlatform();
