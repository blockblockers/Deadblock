import { useEffect, useRef, useCallback } from 'react';

/**
 * Cross-platform scroll styles for different container types
 * Use these style objects on container elements that need scrolling
 */

// Full screen scrollable container (MenuScreen, EntryAuthScreen, etc.)
export const fullScreenScrollStyles = {
  position: 'fixed',
  inset: 0,
  overflow: 'auto',
  overflowX: 'hidden',
  WebkitOverflowScrolling: 'touch',
  overscrollBehavior: 'contain',
  touchAction: 'pan-y pinch-zoom',
};

// Modal/popup scrollable content
export const modalScrollStyles = {
  overflow: 'auto',
  overflowX: 'hidden',
  WebkitOverflowScrolling: 'touch',
  overscrollBehavior: 'contain',
  touchAction: 'pan-y',
  maxHeight: '70vh',
};

// Horizontal scrollable container (piece tray, etc.)
export const horizontalScrollStyles = {
  overflowX: 'auto',
  overflowY: 'hidden',
  WebkitOverflowScrolling: 'touch',
  overscrollBehaviorX: 'contain',
  touchAction: 'pan-x',
};

// Non-scrollable game board
export const noScrollStyles = {
  overflow: 'hidden',
  touchAction: 'none',
};

/**
 * Hook to apply scroll container behavior with cross-platform fixes
 * @param {Object} options - Configuration options
 * @param {boolean} options.preventPullToRefresh - Prevent pull-to-refresh gesture
 * @param {boolean} options.lockBodyScroll - Prevent body scroll when this container is active
 * @returns {Object} - Ref and style props to spread on container
 */
export const useScrollContainer = (options = {}) => {
  const { 
    preventPullToRefresh = true,
    lockBodyScroll = false,
    type = 'fullScreen' // 'fullScreen' | 'modal' | 'horizontal' | 'none'
  } = options;
  
  const containerRef = useRef(null);
  const touchStartY = useRef(0);
  
  // Handle touch start
  const handleTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);
  
  // Handle touch move - prevent pull-to-refresh when at top
  const handleTouchMove = useCallback((e) => {
    if (!preventPullToRefresh) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    const touchY = e.touches[0].clientY;
    const deltaY = touchY - touchStartY.current;
    
    // At top of scroll and pulling down - prevent refresh
    if (container.scrollTop <= 0 && deltaY > 0) {
      e.preventDefault();
    }
    
    // At bottom of scroll and pulling up - prevent overscroll
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 1;
    if (isAtBottom && deltaY < 0) {
      e.preventDefault();
    }
  }, [preventPullToRefresh]);
  
  // Set up event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    if (preventPullToRefresh) {
      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
    }
    
    // Lock body scroll if requested
    if (lockBodyScroll) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalOverflow;
        if (preventPullToRefresh && container) {
          container.removeEventListener('touchstart', handleTouchStart);
          container.removeEventListener('touchmove', handleTouchMove);
        }
      };
    }
    
    return () => {
      if (preventPullToRefresh && container) {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
      }
    };
  }, [handleTouchStart, handleTouchMove, preventPullToRefresh, lockBodyScroll]);
  
  // Get styles based on type
  const getStyles = () => {
    switch (type) {
      case 'fullScreen':
        return fullScreenScrollStyles;
      case 'modal':
        return modalScrollStyles;
      case 'horizontal':
        return horizontalScrollStyles;
      case 'none':
        return noScrollStyles;
      default:
        return fullScreenScrollStyles;
    }
  };
  
  return {
    ref: containerRef,
    style: getStyles(),
    className: type === 'fullScreen' ? 'full-screen-scroll' : 
               type === 'modal' ? 'modal-scroll scrollable-container' :
               type === 'horizontal' ? 'piece-tray-scroll' :
               type === 'none' ? 'game-board-container' : ''
  };
};

/**
 * Utility to check if device needs special scroll handling
 */
export const getDeviceScrollInfo = () => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isMobile = isIOS || isAndroid || 'ontouchstart' in window;
  const isIPad = /iPad/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  return {
    isIOS,
    isAndroid,
    isMobile,
    isIPad,
    isDesktop: !isMobile,
    needsScrollFix: isIOS || isIPad, // iOS/iPad need extra scroll handling
  };
};

/**
 * Hook to detect if content needs scrolling based on viewport
 * @param {number} minHeight - Minimum height before scroll needed
 */
export const useNeedsScroll = (minHeight = 700) => {
  const checkNeedsScroll = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.innerHeight < minHeight;
  }, [minHeight]);
  
  return checkNeedsScroll();
};

export default useScrollContainer;
