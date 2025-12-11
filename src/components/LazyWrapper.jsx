/**
 * Lazy Loading Helpers
 * Utilities for code-splitting and lazy loading components
 */

import React, { Suspense, lazy, ComponentType } from 'react';
import LoadingScreen, { LoadingSpinner } from './LoadingScreen';

/**
 * Wrapper component for lazy-loaded components with Suspense
 * Provides consistent loading UI across the app
 * 
 * @example
 * <LazyWrapper>
 *   <SomeLazyComponent {...props} />
 * </LazyWrapper>
 */
export const LazyWrapper = ({ 
  children, 
  fallback = null,
  variant = 'fullscreen',
  message = 'Loading...',
}) => {
  const defaultFallback = <LoadingScreen variant={variant} message={message} />;
  
  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
};

/**
 * Inline wrapper for smaller lazy components (modals, panels)
 */
export const LazyInline = ({ children, fallback = null }) => {
  const defaultFallback = (
    <div className="flex items-center justify-center p-8">
      <LoadingSpinner size="md" />
    </div>
  );
  
  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
};

/**
 * Create a lazy-loadable component with preload capability
 * 
 * @example
 * const MyComponent = lazyWithPreload(() => import('./MyComponent'));
 * 
 * // Preload on hover
 * onMouseEnter={() => MyComponent.preload()}
 */
export function lazyWithPreload(factory) {
  const Component = lazy(factory);
  Component.preload = factory;
  return Component;
}

/**
 * Retry lazy load with exponential backoff
 * Useful for components that might fail to load due to network issues
 * 
 * @example
 * const MyComponent = lazyWithRetry(() => import('./MyComponent'));
 */
export function lazyWithRetry(factory, retriesLeft = 3, delay = 1000) {
  return lazy(() => 
    factory().catch((error) => {
      if (retriesLeft === 0) {
        throw error;
      }
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(lazyWithRetry(factory, retriesLeft - 1, delay * 2)._payload._result);
        }, delay);
      });
    })
  );
}

/**
 * Named exports for the components with preload support
 * These are the actual lazy-loaded components with preload capability
 */

// Puzzle components
export const LazyPuzzleSelect = lazyWithPreload(() => import('./PuzzleSelect'));
export const LazySpeedPuzzleScreen = lazyWithPreload(() => import('./SpeedPuzzleScreen'));
export const LazyDifficultySelector = lazyWithPreload(() => import('./DifficultySelector'));

// Weekly Challenge components  
export const LazyWeeklyChallengeMenu = lazyWithPreload(() => import('./WeeklyChallengeMenu'));
export const LazyWeeklyChallengeScreen = lazyWithPreload(() => import('./WeeklyChallengeScreen'));
export const LazyWeeklyLeaderboard = lazyWithPreload(() => import('./WeeklyLeaderboard'));

// Profile/Stats
export const LazyPlayerStatsModal = lazyWithPreload(() => import('./PlayerStatsModal'));

// Online components
export const LazyAuthScreen = lazyWithPreload(() => import('./AuthScreen'));
export const LazyOnlineMenu = lazyWithPreload(() => import('./OnlineMenu'));
export const LazyMatchmakingScreen = lazyWithPreload(() => import('./MatchmakingScreen'));
export const LazyOnlineGameScreen = lazyWithPreload(() => import('./OnlineGameScreen'));
export const LazyUserProfile = lazyWithPreload(() => import('./UserProfile'));
export const LazyLeaderboard = lazyWithPreload(() => import('./Leaderboard'));
export const LazySpectatorView = lazyWithPreload(() => import('./SpectatorView'));
export const LazyGameReplay = lazyWithPreload(() => import('./GameReplay'));

/**
 * Preload a group of related components
 * Call this when user shows intent to navigate to a section
 * 
 * @example
 * // When user hovers over "Online" button
 * onMouseEnter={() => preloadOnlineComponents()}
 */
export const preloadOnlineComponents = () => {
  LazyAuthScreen.preload();
  LazyOnlineMenu.preload();
  LazyMatchmakingScreen.preload();
};

export const preloadPuzzleComponents = () => {
  LazyPuzzleSelect.preload();
  LazySpeedPuzzleScreen.preload();
  LazyDifficultySelector.preload();
};

export const preloadWeeklyComponents = () => {
  LazyWeeklyChallengeMenu.preload();
  LazyWeeklyChallengeScreen.preload();
  LazyWeeklyLeaderboard.preload();
};

export default LazyWrapper;
