import { soundManager } from '../utils/soundManager';
import { useCallback, useRef } from 'react';

const DPad = ({ onMove }) => {
  // Track if we're currently processing a move to prevent double-fires
  const processingRef = useRef(false);
  
  const buttonClass = "w-8 h-8 sm:w-10 sm:h-10 bg-cyan-600/80 hover:bg-cyan-500 text-white rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.5)] flex items-center justify-center border border-cyan-400/50 active:scale-95 transition-transform touch-manipulation select-none";
  
  const handleMove = useCallback((direction, e) => {
    // Prevent default to avoid any scrolling or double-tap zoom
    e?.preventDefault();
    e?.stopPropagation();
    
    // Debounce rapid taps
    if (processingRef.current) return;
    processingRef.current = true;
    
    console.log('[DPad] Move:', direction);
    onMove(direction);
    
    // Reset after a short delay
    setTimeout(() => {
      processingRef.current = false;
    }, 50);
  }, [onMove]);
  
  // Create button props with both click and touch handlers
  const getButtonProps = (direction) => ({
    onClick: (e) => handleMove(direction, e),
    onTouchStart: (e) => {
      // Only handle touch on mobile to avoid double-firing with click
      if (e.touches.length === 1) {
        handleMove(direction, e);
      }
    },
    onTouchEnd: (e) => e.preventDefault(), // Prevent click from also firing
  });
  
  return (
    <div className="flex justify-center mt-3 mb-2">
      <div className="relative w-24 h-24 sm:w-28 sm:h-28">
        {/* Up */}
        <button
          {...getButtonProps('up')}
          className={`absolute top-0 left-1/2 -translate-x-1/2 ${buttonClass}`}
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
          </svg>
        </button>

        {/* Down */}
        <button
          {...getButtonProps('down')}
          className={`absolute bottom-0 left-1/2 -translate-x-1/2 ${buttonClass}`}
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Left */}
        <button
          {...getButtonProps('left')}
          className={`absolute left-0 top-1/2 -translate-y-1/2 ${buttonClass}`}
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Right */}
        <button
          {...getButtonProps('right')}
          className={`absolute right-0 top-1/2 -translate-y-1/2 ${buttonClass}`}
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 sm:w-8 sm:h-8 bg-slate-800 rounded-full border border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.3)]" />
      </div>
    </div>
  );
};

export default DPad;
