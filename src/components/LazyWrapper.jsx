/**
 * Lazy Loading Helpers
 * Utilities for code-splitting and lazy loading components
 * v7.2: REVERT — restored transform:translateY for nice slide-in effect. The scroll
 *       issue blamed on this was actually the global touchmove preventDefault in index.html.
 * v7.x: Added screenFadeIn animation to LazyWrapper
 */

import React, { Suspense, lazy, ComponentType } from 'react';
import LoadingScreen, { LoadingSpinner } from './LoadingScreen';

// Inject screen-fade keyframes once at module level (same pattern as PlacementAnimation)
let fadeStyleInjected = false;
const injectFadeStyle = () => {
  if (fadeStyleInjected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes screenFadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0);   }
    }
    .screen-fade-in {
      animation: screenFadeIn 0.15s ease-out;
    }
  `;
  document.head.appendChild(style);
  fadeStyleInjected = true;
};

/**
 * Wrapper component for lazy-loaded components with Suspense
 * Provides consistent loading UI across the app
 * v7.x: Wraps output in .screen-fade-in div — covers all lazy screen transitions at once
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
  injectFadeStyle();
  const defaultFallback = <LoadingScreen variant={variant} message={message} />;
  
  return (
    <div className="screen-fade-in">
      <Suspense fallback={fallback || defaultFallback}>
        {children}
      </Suspense>
    </div>
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
 */
export function lazyWithPreload(factory) {
  const Component = lazy(factory);
  Component.preload = factory;
  return Component;
}

/**
 * Retry lazy load with exponential backoff
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
