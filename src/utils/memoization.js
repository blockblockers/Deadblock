/**
 * Memoization Utilities
 * Patterns and helpers for optimizing React component re-renders
 */

import React, { memo, useMemo, useCallback, useRef } from 'react';

// =============================================================================
// MEMO HELPERS
// =============================================================================

/**
 * Deep equality comparison for memo
 * Use this when props contain objects that should be compared by value
 * 
 * @example
 * const MyComponent = memo(({ config }) => { ... }, deepEqual);
 */
export function deepEqual(prevProps, nextProps) {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);
  
  if (prevKeys.length !== nextKeys.length) return false;
  
  for (const key of prevKeys) {
    const prevVal = prevProps[key];
    const nextVal = nextProps[key];
    
    // Function comparison (by reference is fine for callbacks)
    if (typeof prevVal === 'function' && typeof nextVal === 'function') {
      continue; // Assume stable callbacks
    }
    
    // Deep compare objects
    if (typeof prevVal === 'object' && typeof nextVal === 'object') {
      if (prevVal === null && nextVal === null) continue;
      if (prevVal === null || nextVal === null) return false;
      if (JSON.stringify(prevVal) !== JSON.stringify(nextVal)) return false;
      continue;
    }
    
    // Primitive comparison
    if (prevVal !== nextVal) return false;
  }
  
  return true;
}

/**
 * Shallow equality with specific keys to check
 * Useful when you only care about certain props changing
 * 
 * @example
 * const MyComponent = memo(({ id, name, onClick }) => { ... }, compareKeys(['id', 'name']));
 */
export function compareKeys(keys) {
  return (prevProps, nextProps) => {
    for (const key of keys) {
      if (prevProps[key] !== nextProps[key]) {
        return false;
      }
    }
    return true;
  };
}

/**
 * Create a memoized component with display name
 * 
 * @example
 * const MyComponent = memoWithName('MyComponent', ({ prop }) => <div>{prop}</div>);
 */
export function memoWithName(name, Component, propsAreEqual) {
  const MemoizedComponent = memo(Component, propsAreEqual);
  MemoizedComponent.displayName = name;
  return MemoizedComponent;
}

// =============================================================================
// CALLBACK HELPERS
// =============================================================================

/**
 * Create a stable callback that always calls the latest version
 * Useful when you need a stable reference but the callback logic changes
 * 
 * @example
 * const handleClick = useEventCallback((e) => {
 *   console.log(latestState); // Always has latest state
 * });
 */
export function useEventCallback(callback) {
  const ref = useRef(callback);
  ref.current = callback;
  
  return useCallback((...args) => {
    return ref.current(...args);
  }, []);
}

/**
 * Create a debounced callback
 * 
 * @example
 * const debouncedSearch = useDebouncedCallback((query) => {
 *   searchAPI(query);
 * }, 300);
 */
export function useDebouncedCallback(callback, delay) {
  const timeoutRef = useRef(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  
  return useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]);
}

/**
 * Create a throttled callback
 * 
 * @example
 * const throttledScroll = useThrottledCallback((e) => {
 *   handleScroll(e);
 * }, 100);
 */
export function useThrottledCallback(callback, limit) {
  const lastRun = useRef(0);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  
  return useCallback((...args) => {
    const now = Date.now();
    if (now - lastRun.current >= limit) {
      lastRun.current = now;
      callbackRef.current(...args);
    }
  }, [limit]);
}

// =============================================================================
// MEMO HELPERS
// =============================================================================

/**
 * Memoize a value with deep comparison
 * 
 * @example
 * const config = useDeepMemo(() => ({ a: 1, b: { c: 2 } }), [dep]);
 */
export function useDeepMemo(factory, deps) {
  const ref = useRef({ deps: null, value: null });
  
  const depsChanged = !ref.current.deps || 
    deps.some((dep, i) => {
      const prevDep = ref.current.deps[i];
      if (typeof dep === 'object' && typeof prevDep === 'object') {
        return JSON.stringify(dep) !== JSON.stringify(prevDep);
      }
      return dep !== prevDep;
    });
  
  if (depsChanged) {
    ref.current.deps = deps;
    ref.current.value = factory();
  }
  
  return ref.current.value;
}

/**
 * Only recompute when the value actually changes (not reference)
 * 
 * @example
 * const stableValue = useStableValue(possiblyNewObject);
 */
export function useStableValue(value) {
  const ref = useRef(value);
  
  if (JSON.stringify(ref.current) !== JSON.stringify(value)) {
    ref.current = value;
  }
  
  return ref.current;
}

// =============================================================================
// COMMON MEMOIZED PATTERNS
// =============================================================================

/**
 * Create stable style objects
 * Prevents re-renders from inline style objects
 * 
 * @example
 * const style = useStableStyle({ color: 'red', fontSize: size });
 */
export function useStableStyle(styleObj) {
  return useMemo(() => styleObj, [JSON.stringify(styleObj)]);
}

/**
 * Create stable className strings
 * 
 * @example
 * const className = useStableClassName(isActive ? 'active' : '', 'base-class');
 */
export function useStableClassName(...classes) {
  return useMemo(() => classes.filter(Boolean).join(' '), classes);
}

// =============================================================================
// RENDER OPTIMIZATION COMPONENTS
// =============================================================================

/**
 * Only re-render children when specified dependencies change
 * 
 * @example
 * <RenderWhen deps={[userId, name]}>
 *   <ExpensiveComponent userId={userId} name={name} />
 * </RenderWhen>
 */
export const RenderWhen = memo(({ deps, children }) => {
  return children;
}, (prev, next) => {
  return prev.deps.every((dep, i) => dep === next.deps[i]);
});

/**
 * Prevent any re-renders of children
 * Useful for truly static content
 * 
 * @example
 * <Static>
 *   <ComplexStaticUI />
 * </Static>
 */
export const Static = memo(({ children }) => children, () => true);

// =============================================================================
// DEBUG HELPERS
// =============================================================================

/**
 * Log when a component re-renders and why
 * Only active in development
 * 
 * @example
 * useRenderLog('MyComponent', { prop1, prop2 });
 */
export function useRenderLog(componentName, props) {
  const prevProps = useRef(props);
  const renderCount = useRef(0);
  
  if (import.meta.env.DEV) {
    renderCount.current++;
    
    const changedProps = Object.keys(props).filter(
      key => prevProps.current[key] !== props[key]
    );
    
    if (changedProps.length > 0 || renderCount.current === 1) {
      console.log(
        `[Render] ${componentName} #${renderCount.current}`,
        changedProps.length > 0 ? `Changed: ${changedProps.join(', ')}` : 'Initial render'
      );
    }
    
    prevProps.current = props;
  }
}

/**
 * Track render count for a component
 * 
 * @example
 * const renderCount = useRenderCount();
 * console.log(`Rendered ${renderCount} times`);
 */
export function useRenderCount() {
  const count = useRef(0);
  count.current++;
  return count.current;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  deepEqual,
  compareKeys,
  memoWithName,
  useEventCallback,
  useDebouncedCallback,
  useThrottledCallback,
  useDeepMemo,
  useStableValue,
  useStableStyle,
  useStableClassName,
  RenderWhen,
  Static,
  useRenderLog,
  useRenderCount,
};
