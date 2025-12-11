/**
 * LoadingScreen Component
 * Used as fallback for React.lazy loaded components
 * Matches the cyberpunk theme of the app
 * 
 * @component
 * @example
 * <LoadingScreen variant="fullscreen" message="Loading game..." />
 */

import React from 'react';
import PropTypes from 'prop-types';

// Loading variants for different contexts
const VARIANTS = {
  fullscreen: 'min-h-screen',
  container: 'min-h-[400px]',
  inline: 'min-h-[200px]',
  small: 'min-h-[100px]',
};

const LoadingScreen = ({ 
  variant = 'fullscreen',
  message = 'Loading...',
  showLogo = true,
  transparent = false,
}) => {
  const heightClass = VARIANTS[variant] || VARIANTS.fullscreen;
  const bgClass = transparent 
    ? 'bg-transparent' 
    : 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950';

  return (
    <div className={`${heightClass} ${bgClass} flex flex-col items-center justify-center relative overflow-hidden`}>
      {/* Background grid */}
      {!transparent && (
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(34, 211, 238, 0.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(34, 211, 238, 0.15) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
      )}

      {/* Glow orbs */}
      {!transparent && (
        <>
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-cyan-500/20 rounded-full blur-[60px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-purple-500/15 rounded-full blur-[50px] animate-pulse" 
               style={{ animationDelay: '0.5s' }} />
        </>
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo/Spinner */}
        {showLogo && variant === 'fullscreen' ? (
          <div className="mb-6">
            <h1 className="text-4xl font-black font-['Orbitron'] tracking-wider bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-pulse">
              DEADBLOCK
            </h1>
          </div>
        ) : (
          <LoadingSpinner size={variant === 'small' ? 'sm' : 'md'} />
        )}

        {/* Loading bar */}
        {variant !== 'small' && (
          <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden mt-4">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500 rounded-full animate-loading-bar"
              style={{
                backgroundSize: '200% 100%',
              }}
            />
          </div>
        )}

        {/* Message */}
        <p className="mt-4 text-sm text-cyan-400/80 font-['Orbitron'] tracking-widest animate-pulse">
          {message}
        </p>
      </div>

      {/* Inline styles for animations */}
      <style>{`
        @keyframes loading-bar {
          0% { 
            transform: translateX(-100%);
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% { 
            transform: translateX(100%);
            background-position: 0% 50%;
          }
        }
        .animate-loading-bar {
          animation: loading-bar 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

/**
 * Simple loading spinner component
 */
export const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4',
  };

  return (
    <div 
      className={`
        ${sizeClasses[size] || sizeClasses.md}
        ${className}
        rounded-full 
        border-cyan-500/30 
        border-t-cyan-400 
        animate-spin
      `}
    />
  );
};

/**
 * Skeleton loading placeholder
 */
export const Skeleton = ({ 
  width = '100%', 
  height = '1rem', 
  rounded = 'md',
  className = '' 
}) => {
  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  return (
    <div 
      className={`
        bg-slate-700/50 
        animate-pulse 
        ${roundedClasses[rounded] || roundedClasses.md}
        ${className}
      `}
      style={{ width, height }}
    />
  );
};

/**
 * Card skeleton for profile cards, game cards, etc.
 */
export const CardSkeleton = ({ className = '' }) => (
  <div className={`bg-slate-800/50 rounded-xl p-4 ${className}`}>
    <div className="flex items-center gap-3 mb-4">
      <Skeleton width="48px" height="48px" rounded="full" />
      <div className="flex-1">
        <Skeleton width="60%" height="1rem" className="mb-2" />
        <Skeleton width="40%" height="0.75rem" />
      </div>
    </div>
    <Skeleton width="100%" height="0.75rem" className="mb-2" />
    <Skeleton width="80%" height="0.75rem" />
  </div>
);

/**
 * List skeleton for leaderboards, game lists, etc.
 */
export const ListSkeleton = ({ count = 5, className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg">
        <Skeleton width="32px" height="32px" rounded="full" />
        <div className="flex-1">
          <Skeleton width={`${60 + Math.random() * 30}%`} height="0.875rem" />
        </div>
        <Skeleton width="60px" height="1.5rem" rounded="lg" />
      </div>
    ))}
  </div>
);

// PropTypes definitions
LoadingScreen.propTypes = {
  /** Size variant of the loading screen */
  variant: PropTypes.oneOf(['fullscreen', 'container', 'inline', 'small']),
  /** Loading message to display */
  message: PropTypes.string,
  /** Whether to show the logo */
  showLogo: PropTypes.bool,
  /** Whether background should be transparent */
  transparent: PropTypes.bool,
};

LoadingScreen.defaultProps = {
  variant: 'fullscreen',
  message: 'Loading...',
  showLogo: true,
  transparent: false,
};

LoadingSpinner.propTypes = {
  /** Spinner size */
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  /** Additional CSS classes */
  className: PropTypes.string,
};

LoadingSpinner.defaultProps = {
  size: 'md',
  className: '',
};

Skeleton.propTypes = {
  /** Width of skeleton (CSS value) */
  width: PropTypes.string,
  /** Height of skeleton (CSS value) */
  height: PropTypes.string,
  /** Border radius variant */
  rounded: PropTypes.oneOf(['none', 'sm', 'md', 'lg', 'full']),
  /** Additional CSS classes */
  className: PropTypes.string,
};

Skeleton.defaultProps = {
  width: '100%',
  height: '1rem',
  rounded: 'md',
  className: '',
};

CardSkeleton.propTypes = {
  /** Additional CSS classes */
  className: PropTypes.string,
};

CardSkeleton.defaultProps = {
  className: '',
};

ListSkeleton.propTypes = {
  /** Number of skeleton items to show */
  count: PropTypes.number,
  /** Additional CSS classes */
  className: PropTypes.string,
};

ListSkeleton.defaultProps = {
  count: 5,
  className: '',
};

export default LoadingScreen;
