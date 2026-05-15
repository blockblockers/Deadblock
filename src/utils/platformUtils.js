// platformUtils.js - Detect whether running as PWA or native Capacitor app
// v1.1: Removed module-load memoization (caused false-negative when the
//       Capacitor bridge wasn't fully populated at module evaluation time —
//       the cached `false` then persisted forever). Added userAgent fallback
//       to match the detection used in index.html.
// v1.0: Shared utility for platform branching

export const isNativePlatform = () => {
  try {
    // Primary: Capacitor bridge (most reliable when present)
    if (window.Capacitor?.isNativePlatform?.()) return true;
    if (window.Capacitor?.isNative) return true;
    // Fallback: appendUserAgent set in capacitor.config.ts (works even if
    // the bridge object isn't fully populated at module-load time)
    const ua = navigator.userAgent || '';
    if (ua.includes('DEADBLOCK-Android')) return true;
    if (ua.includes('DEADBLOCK-iOS')) return true;
    return false;
  } catch {
    return false;
  }
};

export const isWeb = () => !isNativePlatform();
