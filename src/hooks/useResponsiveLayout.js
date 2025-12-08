import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to detect if the current device/viewport needs scrolling
 * and provide responsive layout information
 */
export const useResponsiveLayout = (contentHeight = 700) => {
  const [layout, setLayout] = useState({
    needsScroll: false,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 800,
    viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 400,
    isMobile: false,
    isSmallScreen: false,
    safeAreaBottom: 0,
  });

  const updateLayout = useCallback(() => {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    
    // Detect if we're on a mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Small screen = less than 700px height (typical phone in portrait)
    const isSmallScreen = vh < contentHeight;
    
    // Check for safe area (notched phones)
    const safeAreaBottom = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--sab') || '0'
    ) || (isMobile ? 20 : 0);
    
    // Needs scroll if content would overflow
    const needsScroll = isSmallScreen;
    
    setLayout({
      needsScroll,
      viewportHeight: vh,
      viewportWidth: vw,
      isMobile,
      isSmallScreen,
      safeAreaBottom,
    });
  }, [contentHeight]);

  useEffect(() => {
    updateLayout();
    
    window.addEventListener('resize', updateLayout);
    window.addEventListener('orientationchange', updateLayout);
    
    // Also check after a short delay (for dynamic content)
    const timer = setTimeout(updateLayout, 100);
    
    return () => {
      window.removeEventListener('resize', updateLayout);
      window.removeEventListener('orientationchange', updateLayout);
      clearTimeout(timer);
    };
  }, [updateLayout]);

  return layout;
};

/**
 * Scroll container component styles based on layout needs
 */
export const getScrollContainerStyles = (needsScroll) => {
  if (needsScroll) {
    return {
      className: 'min-h-screen bg-slate-950',
      style: {
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
        scrollBehavior: 'smooth',
      }
    };
  }
  
  // Fixed layout for larger screens
  return {
    className: 'h-screen bg-slate-950 overflow-hidden',
    style: {
      display: 'flex',
      flexDirection: 'column',
    }
  };
};

export default useResponsiveLayout;
