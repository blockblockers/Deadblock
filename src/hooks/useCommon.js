/**
 * Custom Hooks for Common Patterns
 * Provides reusable hooks for async operations, debouncing, local storage, etc.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { STORAGE_KEYS, TIMING } from '../utils/constants';
import { logger } from '../utils/logger';

// =============================================================================
// useAsyncOperation - Safe async operations with loading/error states
// =============================================================================

/**
 * Hook for managing async operations with automatic cleanup
 * Prevents state updates on unmounted components
 * 
 * @param {Function} asyncFn - The async function to execute
 * @param {Object} options - Configuration options
 * @returns {Object} { execute, loading, error, data, reset }
 */
export function useAsyncOperation(asyncFn, options = {}) {
  const {
    immediate = false,
    onSuccess,
    onError,
    initialData = null,
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(initialData);
  
  const mountedRef = useRef(true);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const execute = useCallback(async (...args) => {
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    setLoading(true);
    setError(null);

    try {
      const result = await asyncFn(...args, { signal });
      
      if (mountedRef.current && !signal.aborted) {
        setData(result);
        setLoading(false);
        onSuccess?.(result);
      }
      
      return result;
    } catch (err) {
      if (err.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }
      
      if (mountedRef.current) {
        setError(err);
        setLoading(false);
        onError?.(err);
      }
      
      throw err;
    }
  }, [asyncFn, onSuccess, onError]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(initialData);
  }, [initialData]);

  // Execute immediately if configured
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return { execute, loading, error, data, reset };
}

// =============================================================================
// useDebounce - Debounced value
// =============================================================================

/**
 * Hook for debouncing a value
 * 
 * @param {any} value - The value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {any} The debounced value
 */
export function useDebounce(value, delay = TIMING.DEBOUNCE.INPUT) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// =============================================================================
// useDebouncedCallback - Debounced function
// =============================================================================

/**
 * Hook for creating a debounced callback
 * 
 * @param {Function} callback - The function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} The debounced function
 */
export function useDebouncedCallback(callback, delay = TIMING.DEBOUNCE.INPUT) {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef(null);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]);
}

// =============================================================================
// useLocalStorage - Persistent state in localStorage
// =============================================================================

/**
 * Hook for persisting state in localStorage
 * 
 * @param {string} key - Storage key
 * @param {any} initialValue - Initial value if nothing stored
 * @returns {[any, Function]} [value, setValue]
 */
export function useLocalStorage(key, initialValue) {
  // Initialize state with stored value or initial value
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      logger.app.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Update localStorage when value changes
  const setValue = useCallback((value) => {
    try {
      // Allow value to be a function for same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      logger.app.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Remove the item
  const removeValue = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      logger.app.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

// =============================================================================
// useInterval - Safe interval hook
// =============================================================================

/**
 * Hook for running intervals that clean up properly
 * 
 * @param {Function} callback - Function to call
 * @param {number|null} delay - Delay in ms (null to pause)
 */
export function useInterval(callback, delay) {
  const savedCallback = useRef(callback);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    if (delay === null) return;
    
    const tick = () => savedCallback.current();
    const id = setInterval(tick, delay);
    
    return () => clearInterval(id);
  }, [delay]);
}

// =============================================================================
// useTimeout - Safe timeout hook
// =============================================================================

/**
 * Hook for running timeouts that clean up properly
 * 
 * @param {Function} callback - Function to call
 * @param {number|null} delay - Delay in ms (null to cancel)
 */
export function useTimeout(callback, delay) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;
    
    const id = setTimeout(() => savedCallback.current(), delay);
    
    return () => clearTimeout(id);
  }, [delay]);
}

// =============================================================================
// usePrevious - Track previous value
// =============================================================================

/**
 * Hook to get the previous value of a variable
 * 
 * @param {any} value - The value to track
 * @returns {any} The previous value
 */
export function usePrevious(value) {
  const ref = useRef();
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref.current;
}

// =============================================================================
// useIsMounted - Check if component is mounted
// =============================================================================

/**
 * Hook to check if component is still mounted
 * Useful for async operations
 * 
 * @returns {Function} Function that returns true if mounted
 */
export function useIsMounted() {
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return useCallback(() => mountedRef.current, []);
}

// =============================================================================
// useOnClickOutside - Detect clicks outside element
// =============================================================================

/**
 * Hook to detect clicks outside of a referenced element
 * 
 * @param {React.RefObject} ref - Reference to the element
 * @param {Function} handler - Handler for outside clicks
 */
export function useOnClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

// =============================================================================
// useKeyPress - Detect specific key presses
// =============================================================================

/**
 * Hook to detect when a specific key is pressed
 * 
 * @param {string} targetKey - The key to detect
 * @param {Function} handler - Handler function
 * @param {Object} options - Options (enabled, preventDefault)
 */
export function useKeyPress(targetKey, handler, options = {}) {
  const { enabled = true, preventDefault = false } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event) => {
      if (event.key === targetKey) {
        if (preventDefault) {
          event.preventDefault();
        }
        handler(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [targetKey, handler, enabled, preventDefault]);
}

// =============================================================================
// useMediaQuery - Responsive design hook
// =============================================================================

/**
 * Hook to match media queries
 * 
 * @param {string} query - The media query to match
 * @returns {boolean} Whether the query matches
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    
    const handler = (event) => setMatches(event.matches);
    
    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
    // Fallback for older browsers
    mediaQuery.addListener(handler);
    return () => mediaQuery.removeListener(handler);
  }, [query]);

  return matches;
}

// =============================================================================
// useNetworkStatus - Track online/offline status
// =============================================================================

/**
 * Hook to track network connectivity
 * 
 * @returns {boolean} Whether the browser is online
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// =============================================================================
// useThrottle - Throttled value
// =============================================================================

/**
 * Hook for throttling a value
 * 
 * @param {any} value - The value to throttle
 * @param {number} limit - Minimum time between updates in ms
 * @returns {any} The throttled value
 */
export function useThrottle(value, limit = 100) {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => clearTimeout(handler);
  }, [value, limit]);

  return throttledValue;
}

export default {
  useAsyncOperation,
  useDebounce,
  useDebouncedCallback,
  useLocalStorage,
  useInterval,
  useTimeout,
  usePrevious,
  useIsMounted,
  useOnClickOutside,
  useKeyPress,
  useMediaQuery,
  useNetworkStatus,
  useThrottle,
};
