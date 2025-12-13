import { soundManager } from '../utils/soundManager';
import { useCallback, useRef } from 'react';

const DPad = ({ onMove }) => {
  // Track if touch event was used to prevent click from double-firing
  const touchUsedRef = useRef(false);
  // Track last move time for debouncing
  const lastMoveTime = useRef(0);
  
  const buttonClass = "w-10 h-10 sm:w-12 sm:h-12 bg-cyan-600/80 hover:bg-cyan-500 active:bg-cyan-400 text-white rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.5)] flex items-center justify-center border border-cyan-400/50 active:scale-90 transition-all duration-100 touch-manipulation select-none";
  
  const executeMove = useCallback((direction) => {
    // Debounce - ignore if less than 80ms since last move
    const now = Date.now();
    if (now - lastMoveTime.current < 80) {
      console.log('[DPad] Debounced:', direction);
      return false;
    }
    lastMoveTime.current = now;
    
    console.log('[DPad] Executing move:', direction);
    onMove(direction);
    return true;
  }, [onMove]);
  
  const handleTouchStart = useCallback((direction, e) => {
    e.preventDefault();
    e.stopPropagation();
    touchUsedRef.current = true;
    executeMove(direction);
    
    // Reset touch flag after a short delay
    setTimeout(() => {
      touchUsedRef.current = false;
    }, 300);
  }, [executeMove]);
  
  const handleClick = useCallback((direction, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // If touch was used recently, skip click to prevent double-fire
    if (touchUsedRef.current) {
      console.log('[DPad] Click ignored (touch was used)');
      return;
    }
    
    executeMove(direction);
  }, [executeMove]);
  
  const getButtonHandlers = (direction) => ({
    onTouchStart: (e) => handleTouchStart(direction, e),
    onClick: (e) => handleClick(direction, e),
    onTouchEnd: (e) => e.preventDefault(), // Prevent ghost clicks
  });
  
  return (
    <div className="flex justify-center mt-3 mb-2">
      <div className="relative w-28 h-28 sm:w-32 sm:h-32">
        {/* Up */}
        <button
          type="button"
          {...getButtonHandlers('up')}
          className={`absolute top-0 left-1/2 -translate-x-1/2 ${buttonClass}`}
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
          </svg>
        </button>

        {/* Down */}
        <button
          type="button"
          {...getButtonHandlers('down')}
          className={`absolute bottom-0 left-1/2 -translate-x-1/2 ${buttonClass}`}
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Left */}
        <button
          type="button"
          {...getButtonHandlers('left')}
          className={`absolute left-0 top-1/2 -translate-y-1/2 ${buttonClass}`}
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Right */}
        <button
          type="button"
          {...getButtonHandlers('right')}
          className={`absolute right-0 top-1/2 -translate-y-1/2 ${buttonClass}`}
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-slate-800 rounded-full border border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.3)]" />
      </div>
    </div>
  );
};

export default DPad;
