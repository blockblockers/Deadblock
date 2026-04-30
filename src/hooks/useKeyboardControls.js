// useKeyboardControls.js - WASD + R/F keyboard controls for desktop game screens
// v1.0: WASD for D-Pad movement, R for rotate, F for flip
import { useEffect } from 'react';

const useKeyboardControls = ({ onMove, onRotate, onFlip, enabled = true }) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      // Don't capture if user is typing in an input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          e.preventDefault();
          onMove?.('up');
          break;
        case 'a':
        case 'arrowleft':
          e.preventDefault();
          onMove?.('left');
          break;
        case 's':
        case 'arrowdown':
          e.preventDefault();
          onMove?.('down');
          break;
        case 'd':
        case 'arrowright':
          e.preventDefault();
          onMove?.('right');
          break;
        case 'r':
          e.preventDefault();
          onRotate?.();
          break;
        case 'f':
          e.preventDefault();
          onFlip?.();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onMove, onRotate, onFlip, enabled]);
};

export default useKeyboardControls;
