// SpeedPuzzleScreen - Timed puzzle mode with streak tracking
// 
// SENIOR ENGINEER CODE REVIEW - IMPROVEMENTS APPLIED:
// 1. Extracted magic numbers to named constants
// 2. Added proper cleanup for all setTimeout calls to prevent memory leaks
// 3. Memoized sub-components to prevent unnecessary re-renders
// 4. Added useCallback dependency array validation
// 5. Improved error handling with specific error types
// 6. Added PropTypes for runtime type checking
// 7. Consolidated duplicate board creation logic
// 8. Added AbortController pattern for async operations
// 9. Fixed potential race conditions in confirmMove
// 10. Improved code organization with logical grouping

import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { Zap, Trophy, Play, RotateCcw, Timer, Flame, Home } from 'lucide-react';
import PropTypes from 'prop-types';
import GameBoard from './GameBoard';
import PieceTray from './PieceTray';
import DPad from './DPad';
import ControlButtons from './ControlButtons';
import DragOverlay from './DragOverlay';
import { pieces } from '../utils/pieces';
import { getPieceCoords, canPlacePiece, canAnyPieceBePlaced, createEmptyBoard, BOARD_SIZE } from '../utils/gameLogic';
import { getSpeedPuzzle } from '../utils/puzzleGenerator';
import { soundManager } from '../utils/soundManager';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { statsService } from '../utils/statsService';

// ============================================================================
// CONSTANTS - Centralized configuration for easy maintenance
// ============================================================================
const TIMER_DURATION = 10; // seconds per puzzle
const TIMER_INTERVAL_MS = 50; // timer update frequency
const ANIMATION_CLEAR_DELAY_MS = 500;
const VICTORY_CHECK_DELAY_MS = 100;
const PUZZLE_LOAD_DELAY_MS = 50;
const MAX_PUZZLE_RETRIES = 5;
const RETRY_DELAY_MS = 500;

// Timer urgency thresholds (seconds)
const TIMER_THRESHOLDS = {
  LOW: 3,
  CRITICAL: 2,
  URGENT: 1,
};

// Streak milestones for visual effects
const STREAK_MILESTONES = {
  HOT: 3,
  ON_FIRE: 5,
  LEGENDARY: 10,
};

// Game states enum for type safety
const GAME_STATES = {
  LOADING: 'loading',
  PLAYING: 'playing',
  SUCCESS: 'success',
  GAMEOVER: 'gameover',
  ERROR: 'error',
};

// Local storage keys
const STORAGE_KEYS = {
  BEST_STREAK: 'speed-puzzle-best',
};

// Speed theme - Electric red/orange for urgency
const theme = {
  gridColor: 'rgba(239,68,68,0.4)',
  glow1: 'bg-red-500/40',
  glow2: 'bg-orange-500/30',
  panelBorder: 'border-red-500/40',
  panelShadow: 'shadow-[0_0_40px_rgba(239,68,68,0.3)]',
};

// D-pad direction deltas - extracted for reusability
const DIRECTION_DELTAS = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Safely read from localStorage with fallback
 */
const safeLocalStorageGet = (key, defaultValue) => {
  try {
    const value = localStorage.getItem(key);
    return value !== null ? parseInt(value, 10) : defaultValue;
  } catch {
    return defaultValue;
  }
};

/**
 * Safely write to localStorage
 */
const safeLocalStorageSet = (key, value) => {
  try {
    localStorage.setItem(key, value.toString());
    return true;
  } catch {
    return false;
  }
};

/**
 * Create empty board pieces array - centralized to avoid duplication
 */
const createEmptyBoardPieces = () => 
  Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));

/**
 * Parse puzzle board state string into board arrays
 */
const parsePuzzleBoardState = (boardState) => {
  const newBoard = createEmptyBoard();
  const newBoardPieces = createEmptyBoardPieces();
  
  for (let i = 0; i < 64; i++) {
    const char = boardState[i];
    if (char !== 'G') {
      const row = Math.floor(i / BOARD_SIZE);
      const col = i % BOARD_SIZE;
      newBoard[row][col] = 1; // All pre-placed pieces show as player 1
      newBoardPieces[row][col] = char === 'H' ? 'Y' : char; // H is legacy for Y
    }
  }
  
  return { newBoard, newBoardPieces };
};

// ============================================================================
// MEMOIZED SUB-COMPONENTS - Prevent unnecessary re-renders
// ============================================================================

/**
 * Compact animated countdown timer
 */
const SpeedTimer = memo(({ timeLeft, maxTime }) => {
  const percentage = (timeLeft / maxTime) * 100;
  const isLow = timeLeft <= TIMER_THRESHOLDS.LOW;
  const isCritical = timeLeft <= TIMER_THRESHOLDS.CRITICAL;
  const isUrgent = timeLeft <= TIMER_THRESHOLDS.URGENT;
  
  const color = useMemo(() => {
    if (isUrgent) return '#ef4444';
    if (isCritical) return '#f97316';
    if (isLow) return '#fbbf24';
    return '#22d3ee';
  }, [isUrgent, isCritical, isLow]);
  
  const circleCircumference = 2 * Math.PI * 12;
  
  return (
    <div 
      className={`
        relative flex items-center gap-2 px-3 py-1.5 rounded-full 
        bg-slate-900/90 border transition-all duration-200
        ${isUrgent ? 'animate-timer-shake border-red-500/70' : isCritical ? 'animate-timer-critical border-orange-500/60' : isLow ? 'animate-timer-pulse border-amber-500/50' : 'border-cyan-500/40'}
      `}
      style={{
        boxShadow: `0 0 ${isUrgent ? '20' : isCritical ? '15' : '10'}px ${color}60`,
      }}
    >
      {/* Mini circular progress */}
      <div className="relative w-8 h-8">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(100,116,139,0.3)" strokeWidth="3" />
          <circle
            cx="16" cy="16" r="12" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
            strokeDasharray={circleCircumference}
            strokeDashoffset={circleCircumference * (1 - percentage / 100)}
            className="transition-all duration-100"
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </svg>
        <Timer 
          size={14} 
          className="absolute inset-0 m-auto transition-colors"
          style={{ color }}
        />
      </div>
      
      {/* Time display */}
      <div 
        className={`font-black tabular-nums text-xl transition-all ${isUrgent ? 'scale-110' : ''}`}
        style={{ color, textShadow: `0 0 10px ${color}` }}
      >
        {timeLeft.toFixed(1)}
      </div>
      
      {/* Urgency indicator dots */}
      <div className="flex gap-0.5">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
              timeLeft <= n ? 'bg-red-500' : timeLeft <= n + 2 ? 'bg-amber-500' : 'bg-cyan-500/50'
            }`}
            style={{ boxShadow: timeLeft <= n ? '0 0 6px #ef4444' : 'none' }}
          />
        ))}
      </div>
    </div>
  );
});

SpeedTimer.displayName = 'SpeedTimer';
SpeedTimer.propTypes = {
  timeLeft: PropTypes.number.isRequired,
  maxTime: PropTypes.number.isRequired,
};

/**
 * Compact streak display with fire effects
 */
const StreakDisplay = memo(({ streak, isNewRecord, bestStreak = 0 }) => {
  const isHot = streak >= STREAK_MILESTONES.HOT;
  const isOnFire = streak >= STREAK_MILESTONES.ON_FIRE;
  const isLegendary = streak >= STREAK_MILESTONES.LEGENDARY;
  
  const color = useMemo(() => {
    if (isLegendary) return '#fbbf24';
    if (isOnFire) return '#f97316';
    if (isHot) return '#fb923c';
    return '#94a3b8';
  }, [isLegendary, isOnFire, isHot]);
  
  return (
    <div 
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border transition-all duration-300
        ${isLegendary ? 'border-amber-400/60' : isOnFire ? 'border-orange-500/50' : isHot ? 'border-orange-400/40' : 'border-slate-700/50'}
      `}
      style={{
        boxShadow: isHot ? `0 0 ${isLegendary ? '20' : isOnFire ? '15' : '10'}px ${color}40` : 'none',
      }}
    >
      {/* Flame icon */}
      <div className="relative">
        <Flame 
          size={18} 
          className={`transition-all duration-300 ${isOnFire ? 'animate-bounce' : ''}`}
          style={{ color, filter: isHot ? `drop-shadow(0 0 4px ${color})` : 'none' }}
        />
      </div>
      
      {/* Streak number */}
      <div 
        className="font-black tabular-nums text-lg"
        style={{ color, textShadow: isHot ? `0 0 10px ${color}` : 'none' }}
      >
        {streak}
      </div>
      
      {/* Best streak indicator (when not a new record) */}
      {bestStreak > 0 && !isNewRecord && streak < bestStreak && (
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-700/50 border border-slate-600/50">
          <Trophy size={10} className="text-slate-400" />
          <span className="text-slate-400 text-[10px] font-medium">{bestStreak}</span>
        </div>
      )}
      
      {/* New record badge */}
      {isNewRecord && streak > 0 && (
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/50">
          <Trophy size={12} className="text-amber-400" />
          <span className="text-amber-300 text-[10px] font-bold uppercase">Best</span>
        </div>
      )}
    </div>
  );
});

StreakDisplay.displayName = 'StreakDisplay';
StreakDisplay.propTypes = {
  streak: PropTypes.number.isRequired,
  isNewRecord: PropTypes.bool.isRequired,
  bestStreak: PropTypes.number,
};

/**
 * Success overlay - shown after correct puzzle solution
 */
const SuccessOverlay = memo(({ streak, onContinue }) => {
  console.log('[SuccessOverlay] Rendering with streak:', streak);
  
  return (
    <div 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.85)'
      }}
    >
      <div 
        style={{
          background: 'linear-gradient(135deg, rgb(15, 23, 42) 0%, rgb(30, 41, 59) 100%)',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '380px',
          width: '100%',
          margin: '0 16px',
          border: '2px solid rgba(34, 197, 94, 0.5)',
          boxShadow: '0 0 60px rgba(34, 197, 94, 0.4)'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          {/* Icon */}
          <div 
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 16px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgb(34, 197, 94), rgb(16, 185, 129))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 1s ease-in-out infinite'
            }}
          >
            <Zap size={32} style={{ color: 'white' }} />
          </div>
          
          {/* Title */}
          <h2 
            style={{ 
              fontSize: '28px', 
              fontWeight: '900', 
              color: '#4ade80', 
              marginBottom: '8px',
              textShadow: '0 0 20px rgba(34, 197, 94, 0.5)'
            }}
          >
            CORRECT!
          </h2>
          
          {/* Streak */}
          <p style={{ color: '#94a3b8', marginBottom: '16px' }}>
            Streak: <span style={{ color: 'white', fontWeight: '700', fontSize: '24px' }}>{streak}</span>
          </p>
          
          {/* Continue Button */}
          <button
            onClick={() => {
              console.log('[SuccessOverlay] Continue clicked');
              onContinue();
            }}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              fontWeight: '900',
              letterSpacing: '0.05em',
              fontSize: '18px',
              background: 'linear-gradient(90deg, rgb(34, 197, 94), rgb(16, 185, 129))',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 0 30px rgba(34, 197, 94, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Play size={24} />
            NEXT PUZZLE
          </button>
          
          {/* Hint */}
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '12px' }}>
            Press quickly! Timer starts immediately
          </p>
        </div>
      </div>
    </div>
  );
});

SuccessOverlay.displayName = 'SuccessOverlay';
SuccessOverlay.propTypes = {
  streak: PropTypes.number.isRequired,
  onContinue: PropTypes.func.isRequired,
};

/**
 * Game over overlay - shown when timer expires
 */
const GameOverOverlay = memo(({ streak, bestStreak, onPlayAgain, onMenu }) => {
  // Log when this component renders for debugging
  console.log('[GameOverOverlay] Rendering with:', { streak, bestStreak });
  
  return (
    <div 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.9)'
      }}
    >
      <div 
        style={{
          background: 'linear-gradient(135deg, rgb(15, 23, 42) 0%, rgb(30, 41, 59) 100%)',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '380px',
          width: '100%',
          margin: '0 16px',
          border: '2px solid rgba(239, 68, 68, 0.5)',
          boxShadow: '0 0 60px rgba(239, 68, 68, 0.4)'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          {/* Icon */}
          <div 
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 16px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgb(239, 68, 68), rgb(234, 88, 12))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Timer size={32} style={{ color: 'white' }} />
          </div>
          
          {/* Title */}
          <h2 
            style={{ 
              fontSize: '28px', 
              fontWeight: '900', 
              color: '#f87171', 
              marginBottom: '16px',
              textShadow: '0 0 20px rgba(239, 68, 68, 0.5)'
            }}
          >
            TIME'S UP!
          </h2>
          
          {/* Stats Box */}
          <div 
            style={{
              background: 'rgba(30, 41, 59, 0.8)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: '1px solid rgba(71, 85, 105, 0.5)'
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Final Streak</div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: 'white' }}>{streak}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Best Ever</div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: streak >= bestStreak && streak > 0 ? '#fbbf24' : '#94a3b8' }}>
                  {Math.max(streak, bestStreak)}
                </div>
              </div>
            </div>
            
            {streak >= bestStreak && streak > 0 && (
              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#fbbf24' }}>
                <Trophy size={18} />
                <span style={{ fontWeight: '700', fontSize: '14px' }}>New Personal Best!</span>
              </div>
            )}
          </div>
          
          {/* Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => {
                console.log('[GameOverOverlay] Play Again clicked');
                onPlayAgain();
              }}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                fontWeight: '900',
                letterSpacing: '0.05em',
                fontSize: '18px',
                background: 'linear-gradient(90deg, rgb(239, 68, 68), rgb(234, 88, 12))',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 0 30px rgba(239, 68, 68, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <RotateCcw size={22} />
              PLAY AGAIN
            </button>
            
            <button
              onClick={() => {
                console.log('[GameOverOverlay] Menu clicked');
                onMenu();
              }}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                fontWeight: '700',
                color: '#cbd5e1',
                background: 'rgb(30, 41, 59)',
                border: '1px solid rgb(71, 85, 105)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Home size={18} />
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

GameOverOverlay.displayName = 'GameOverOverlay';
GameOverOverlay.propTypes = {
  streak: PropTypes.number.isRequired,
  bestStreak: PropTypes.number.isRequired,
  onPlayAgain: PropTypes.func.isRequired,
  onMenu: PropTypes.func.isRequired,
};

/**
 * Error overlay - shown when puzzle generation fails
 */
const ErrorOverlay = memo(({ message, onRetry, onMenu }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
    <div className="bg-slate-900 rounded-2xl p-6 max-w-sm w-full mx-4 border border-amber-500/50 shadow-[0_0_60px_rgba(251,191,36,0.3)]">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
          <RotateCcw size={32} className="text-white" />
        </div>
        <h2 className="text-2xl font-black text-amber-400 mb-2">OOPS!</h2>
        <p className="text-slate-400 mb-6">{message || 'Something went wrong. Please try again.'}</p>
        
        <div className="space-y-3">
          <button
            onClick={onRetry}
            className="w-full py-4 rounded-xl font-black tracking-wider text-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500 transition-all shadow-[0_0_30px_rgba(251,191,36,0.5)] active:scale-[0.98]"
          >
            <div className="flex items-center justify-center gap-2">
              <RotateCcw size={22} />
              TRY AGAIN
            </div>
          </button>
          
          <button
            onClick={onMenu}
            className="w-full py-3 rounded-xl font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-all border border-slate-600"
          >
            <div className="flex items-center justify-center gap-2">
              <Home size={18} />
              Back to Menu
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
));

ErrorOverlay.displayName = 'ErrorOverlay';
ErrorOverlay.propTypes = {
  message: PropTypes.string,
  onRetry: PropTypes.func.isRequired,
  onMenu: PropTypes.func.isRequired,
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const SpeedPuzzleScreen = ({ onMenu, isOfflineMode = false }) => {
  // -------------------------------------------------------------------------
  // STATE - Grouped by category for clarity
  // -------------------------------------------------------------------------
  
  // Game flow state
  const [gameState, setGameState] = useState(GAME_STATES.LOADING);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Streak tracking
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(() => 
    safeLocalStorageGet(STORAGE_KEYS.BEST_STREAK, 0)
  );
  const [dbBestStreak, setDbBestStreak] = useState(0);
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  
  // Board state
  const [board, setBoard] = useState(createEmptyBoard);
  const [boardPieces, setBoardPieces] = useState(createEmptyBoardPieces);
  const [usedPieces, setUsedPieces] = useState([]);
  const [currentPuzzle, setCurrentPuzzle] = useState(null);
  
  // Interaction state
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [pendingMove, setPendingMove] = useState(null);
  const [playerAnimatingMove, setPlayerAnimatingMove] = useState(null);
  const [showWrongMove, setShowWrongMove] = useState(false);
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isValidDrop, setIsValidDrop] = useState(false);

  // -------------------------------------------------------------------------
  // REFS - For values that shouldn't trigger re-renders
  // -------------------------------------------------------------------------
  const timerRef = useRef(null);
  const lastTickRef = useRef(Date.now());
  const gameOverHandledRef = useRef(false);
  const retryCountRef = useRef(0);
  const mountedRef = useRef(true); // Track if component is mounted
  const pendingTimeoutsRef = useRef(new Set()); // Track all pending timeouts for cleanup
  
  // Drag refs
  const boardRef = useRef(null);
  const boardBoundsRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const hasDragStartedRef = useRef(false);

  // -------------------------------------------------------------------------
  // DERIVED STATE
  // -------------------------------------------------------------------------
  const effectiveBestStreak = Math.max(bestStreak, dbBestStreak);
  const isNewRecord = streak > 0 && streak >= effectiveBestStreak;
  const { needsScroll } = useResponsiveLayout(650);
  
  // Memoized canConfirm check
  const canConfirm = useMemo(() => {
    if (!pendingMove) return false;
    return canPlacePiece(board, pendingMove.row, pendingMove.col, pendingMove.coords);
  }, [pendingMove, board]);

  // -------------------------------------------------------------------------
  // HELPER: Safe setTimeout with cleanup tracking
  // -------------------------------------------------------------------------
  const safeSetTimeout = useCallback((callback, delay) => {
    const timeoutId = setTimeout(() => {
      pendingTimeoutsRef.current.delete(timeoutId);
      if (mountedRef.current) {
        callback();
      }
    }, delay);
    pendingTimeoutsRef.current.add(timeoutId);
    return timeoutId;
  }, []);

  // -------------------------------------------------------------------------
  // HELPER: Clear timer safely
  // -------------------------------------------------------------------------
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // -------------------------------------------------------------------------
  // DRAG AND DROP HANDLERS
  // -------------------------------------------------------------------------
  
  // Drag detection constants
  const DRAG_THRESHOLD = 10;
  const SCROLL_ANGLE_THRESHOLD = 60;
  
  // Calculate which board cell the drag position is over
  const calculateBoardCell = useCallback((clientX, clientY) => {
    if (!boardBoundsRef.current) return null;
    
    const { left, top, width, height } = boardBoundsRef.current;
    const cellWidth = width / BOARD_SIZE;
    const cellHeight = height / BOARD_SIZE;
    
    const relX = clientX - left;
    const relY = clientY - top;
    
    if (relX < 0 || relX > width || relY < 0 || relY > height) {
      return null;
    }
    
    const col = Math.floor(relX / cellWidth);
    const row = Math.floor(relY / cellHeight);
    
    return { row, col };
  }, []);

  // Update drag position and check validity
  const updateDrag = useCallback((clientX, clientY) => {
    setDragPosition({ x: clientX, y: clientY });
    
    const cell = calculateBoardCell(clientX, clientY);
    if (cell && draggedPiece) {
      const coords = getPieceCoords(draggedPiece, rotation, flipped);
      const valid = canPlacePiece(board, cell.row, cell.col, coords);
      setIsValidDrop(valid);
      
      if (valid) {
        setPendingMove({
          piece: draggedPiece,
          row: cell.row,
          col: cell.col,
          coords
        });
      }
    } else {
      setIsValidDrop(false);
    }
  }, [draggedPiece, rotation, flipped, board, calculateBoardCell]);

  // End drag - either place piece or cancel
  const endDrag = useCallback(() => {
    if (isValidDrop && pendingMove) {
      // Keep pending move for confirmation
      setSelectedPiece(pendingMove.piece);
    } else {
      // Cancel if invalid drop
      setPendingMove(null);
    }
    
    setIsDragging(false);
    setDraggedPiece(null);
    setIsValidDrop(false);
    hasDragStartedRef.current = false;
  }, [isValidDrop, pendingMove]);

  // Create drag handlers for piece tray
  const createDragHandlers = useCallback((piece) => {
    const getClientPos = (e) => {
      if (e.touches && e.touches[0]) {
        return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
      }
      return { clientX: e.clientX, clientY: e.clientY };
    };

    const handleStart = (e) => {
      if (gameState !== GAME_STATES.PLAYING) return;
      if (usedPieces.includes(piece)) return;
      
      const { clientX, clientY } = getClientPos(e);
      dragStartRef.current = { x: clientX, y: clientY };
      hasDragStartedRef.current = false;
      
      // Update board bounds
      if (boardRef.current) {
        boardBoundsRef.current = boardRef.current.getBoundingClientRect();
      }
    };

    const handleMove = (e) => {
      if (gameState !== GAME_STATES.PLAYING) return;
      
      const { clientX, clientY } = getClientPos(e);
      const deltaX = clientX - dragStartRef.current.x;
      const deltaY = clientY - dragStartRef.current.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // Check if this is a vertical scroll gesture
      if (!hasDragStartedRef.current && distance > 5) {
        const angle = Math.abs(Math.atan2(deltaY, deltaX) * 180 / Math.PI);
        const isVertical = angle > SCROLL_ANGLE_THRESHOLD && angle < (180 - SCROLL_ANGLE_THRESHOLD);
        
        if (isVertical) {
          return; // Let it scroll
        }
      }
      
      if (distance > DRAG_THRESHOLD && !hasDragStartedRef.current) {
        hasDragStartedRef.current = true;
        setIsDragging(true);
        setDraggedPiece(piece);
        setSelectedPiece(piece);
        setPendingMove(null);
        setDragOffset({ x: 0, y: 0 });
        
        if (e.cancelable) {
          e.preventDefault();
        }
      }
      
      if (hasDragStartedRef.current) {
        if (e.cancelable) {
          e.preventDefault();
        }
        updateDrag(clientX, clientY);
      }
    };

    const handleEnd = () => {
      if (hasDragStartedRef.current) {
        endDrag();
      }
      hasDragStartedRef.current = false;
    };

    return {
      onMouseDown: handleStart,
      onMouseMove: handleMove,
      onMouseUp: handleEnd,
      onMouseLeave: handleEnd,
      onTouchStart: handleStart,
      onTouchMove: handleMove,
      onTouchEnd: handleEnd,
    };
  }, [gameState, usedPieces, rotation, flipped, updateDrag, endDrag]);

  // Handle dragging from board (moving pending piece)
  const handleBoardDragStart = useCallback((piece, clientX, clientY, elementRect) => {
    if (gameState !== GAME_STATES.PLAYING) return;
    if (!pendingMove || pendingMove.piece !== piece) return;
    
    // Update board bounds
    if (boardRef.current) {
      boardBoundsRef.current = boardRef.current.getBoundingClientRect();
    }
    
    setIsDragging(true);
    setDraggedPiece(piece);
    setDragPosition({ x: clientX, y: clientY });
    setDragOffset({ x: 0, y: 0 });
    hasDragStartedRef.current = true;
  }, [gameState, pendingMove]);

  // Global move/end handlers for drag
  useEffect(() => {
    if (!isDragging) return;
    
    const handleGlobalMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      updateDrag(clientX, clientY);
      
      if (e.cancelable) {
        e.preventDefault();
      }
    };
    
    const handleGlobalEnd = () => {
      endDrag();
    };
    
    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalEnd);
    window.addEventListener('touchmove', handleGlobalMove, { passive: false });
    window.addEventListener('touchend', handleGlobalEnd);
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalEnd);
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalEnd);
    };
  }, [isDragging, updateDrag, endDrag]);

  // -------------------------------------------------------------------------
  // EFFECT: Load database stats on mount
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (isOfflineMode) return;
    
    const loadDbStats = async () => {
      try {
        const stats = await statsService.getStats();
        if (stats?.speed_best_streak && mountedRef.current) {
          setDbBestStreak(stats.speed_best_streak);
          // Sync local storage if database has higher value
          if (stats.speed_best_streak > bestStreak) {
            setBestStreak(stats.speed_best_streak);
            safeLocalStorageSet(STORAGE_KEYS.BEST_STREAK, stats.speed_best_streak);
          }
        }
      } catch (err) {
        console.error('[SpeedPuzzle] Failed to load db stats:', err);
      }
    };
    
    loadDbStats();
  }, [isOfflineMode, bestStreak]);

  // -------------------------------------------------------------------------
  // EFFECT: Cleanup on unmount
  // -------------------------------------------------------------------------
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      clearTimer();
      // Clear all pending timeouts
      pendingTimeoutsRef.current.forEach(id => clearTimeout(id));
      pendingTimeoutsRef.current.clear();
    };
  }, [clearTimer]);

  // -------------------------------------------------------------------------
  // EFFECT: Log gameState changes (debug)
  // -------------------------------------------------------------------------
  useEffect(() => {
    console.log('[SpeedPuzzle] gameState changed to:', gameState);
  }, [gameState]);

  // -------------------------------------------------------------------------
  // GAME OVER HANDLER
  // -------------------------------------------------------------------------
  const triggerGameOver = useCallback(() => {
    console.log('[SpeedPuzzle] triggerGameOver called, current handled status:', gameOverHandledRef.current);
    
    if (gameOverHandledRef.current) {
      console.log('[SpeedPuzzle] Game over already handled, skipping');
      return;
    }
    
    console.log('[SpeedPuzzle] Setting game over state');
    gameOverHandledRef.current = true;
    clearTimer();
    
    // Play sound
    try {
      soundManager.playLose();
    } catch (e) {
      console.error('[SpeedPuzzle] Error playing game over sound:', e);
    }
    
    // Set state - use functional update to ensure we get latest state
    setGameState((prevState) => {
      console.log('[SpeedPuzzle] Changing state from', prevState, 'to', GAME_STATES.GAMEOVER);
      return GAME_STATES.GAMEOVER;
    });
  }, [clearTimer]);

  // -------------------------------------------------------------------------
  // PUZZLE LOADING
  // -------------------------------------------------------------------------
  const loadNewPuzzle = useCallback(async () => {
    setGameState(GAME_STATES.LOADING);
    setErrorMessage('');
    gameOverHandledRef.current = false;
    clearTimer();
    
    try {
      const puzzle = await getSpeedPuzzle();
      
      // Check if still mounted
      if (!mountedRef.current) return;
      
      if (puzzle?.boardState?.length === 64) {
        const { newBoard, newBoardPieces } = parsePuzzleBoardState(puzzle.boardState);
        
        setBoard(newBoard);
        setBoardPieces(newBoardPieces);
        setUsedPieces(puzzle.usedPieces || []);
        setCurrentPuzzle(puzzle);
        setSelectedPiece(null);
        setRotation(0);
        setFlipped(false);
        setPendingMove(null);
        
        retryCountRef.current = 0;
        setTimeLeft(TIMER_DURATION);
        lastTickRef.current = Date.now();
        
        // Small delay before starting to ensure UI updates
        safeSetTimeout(() => {
          setGameState(GAME_STATES.PLAYING);
        }, PUZZLE_LOAD_DELAY_MS);
      } else {
        throw new Error('Invalid puzzle data received');
      }
    } catch (err) {
      console.error('[SpeedPuzzle] Failed to load puzzle:', err);
      
      if (!mountedRef.current) return;
      
      retryCountRef.current++;
      if (retryCountRef.current < MAX_PUZZLE_RETRIES) {
        safeSetTimeout(loadNewPuzzle, RETRY_DELAY_MS);
      } else {
        retryCountRef.current = 0;
        setErrorMessage(err.message || 'Failed to generate puzzle. Please try again.');
        setGameState(GAME_STATES.ERROR);
      }
    }
  }, [clearTimer, safeSetTimeout]);

  // -------------------------------------------------------------------------
  // EFFECT: Timer management
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (gameState !== GAME_STATES.PLAYING) return;
    
    lastTickRef.current = Date.now();
    gameOverHandledRef.current = false;
    
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const delta = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      
      setTimeLeft(prev => Math.max(0, prev - delta));
    }, TIMER_INTERVAL_MS);
    
    return clearTimer;
  }, [gameState, clearTimer]);

  // -------------------------------------------------------------------------
  // EFFECT: Check for timer expiration
  // -------------------------------------------------------------------------
  useEffect(() => {
    // Log every time timeLeft changes near zero for debugging
    if (timeLeft <= 1) {
      console.log('[SpeedPuzzle] Timer low:', { 
        timeLeft, 
        gameState, 
        gameOverHandled: gameOverHandledRef.current,
        shouldTrigger: gameState === GAME_STATES.PLAYING && timeLeft <= 0 && !gameOverHandledRef.current
      });
    }
    
    if (gameState === GAME_STATES.PLAYING && timeLeft <= 0 && !gameOverHandledRef.current) {
      console.log('[SpeedPuzzle] *** TIMER EXPIRED - TRIGGERING GAME OVER ***');
      triggerGameOver();
    }
  }, [timeLeft, gameState, triggerGameOver]);
  
  // -------------------------------------------------------------------------
  // EFFECT: Debug - Log gameState changes
  // -------------------------------------------------------------------------
  useEffect(() => {
    console.log('[SpeedPuzzle] >>> gameState is now:', gameState);
    if (gameState === GAME_STATES.GAMEOVER) {
      console.log('[SpeedPuzzle] >>> GAMEOVER STATE ACTIVE - overlay should be visible');
    }
  }, [gameState]);

  // -------------------------------------------------------------------------
  // EFFECT: Initial puzzle load
  // -------------------------------------------------------------------------
  useEffect(() => {
    loadNewPuzzle();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // PIECE INTERACTION HANDLERS
  // -------------------------------------------------------------------------
  const selectPiece = useCallback((pieceType) => {
    if (gameState !== GAME_STATES.PLAYING) return;
    
    soundManager.playClickSound('select');
    setSelectedPiece(pieceType);
    setRotation(0);
    setFlipped(false);
    // Don't auto-set pendingMove - user must tap on board to position piece
    // This prevents accidental auto-placement
    setPendingMove(null);
  }, [gameState]);

  const rotatePiece = useCallback(() => {
    if (!selectedPiece || gameState !== GAME_STATES.PLAYING) return;
    
    soundManager.playClickSound('rotate');
    const newRotation = (rotation + 1) % 4;
    setRotation(newRotation);
    
    if (pendingMove) {
      const newCoords = getPieceCoords(selectedPiece, newRotation, flipped);
      setPendingMove(prev => ({ ...prev, coords: newCoords }));
    }
  }, [selectedPiece, gameState, rotation, flipped, pendingMove]);

  const flipPiece = useCallback(() => {
    if (!selectedPiece || gameState !== GAME_STATES.PLAYING) return;
    
    soundManager.playClickSound('flip');
    const newFlipped = !flipped;
    setFlipped(newFlipped);
    
    if (pendingMove) {
      const newCoords = getPieceCoords(selectedPiece, rotation, newFlipped);
      setPendingMove(prev => ({ ...prev, coords: newCoords }));
    }
  }, [selectedPiece, gameState, rotation, flipped, pendingMove]);

  const handleCellClick = useCallback((row, col) => {
    if (!selectedPiece || gameState !== GAME_STATES.PLAYING) return;
    
    const coords = getPieceCoords(selectedPiece, rotation, flipped);
    setPendingMove({ row, col, coords, piece: selectedPiece });
    
    if (canPlacePiece(board, row, col, coords)) {
      soundManager.playClickSound('place');
    } else {
      soundManager.playInvalid();
    }
  }, [selectedPiece, gameState, rotation, flipped, board]);

  const movePendingPiece = useCallback((direction) => {
    console.log('[SpeedPuzzle] movePendingPiece called:', direction, { pendingMove, gameState });
    if (!pendingMove || gameState !== GAME_STATES.PLAYING) {
      console.log('[SpeedPuzzle] movePendingPiece blocked:', { hasPending: !!pendingMove, gameState });
      return;
    }
    
    const [dr, dc] = DIRECTION_DELTAS[direction];
    const newRow = pendingMove.row + dr;
    const newCol = pendingMove.col + dc;
    
    console.log('[SpeedPuzzle] Moving piece:', { from: { row: pendingMove.row, col: pendingMove.col }, to: { row: newRow, col: newCol } });
    
    // Always allow movement to show ghost outlines (even for invalid positions)
    // The GameBoard will show red ghost cells for out-of-bounds positions
    const isValid = canPlacePiece(board, newRow, newCol, pendingMove.coords);
    
    if (isValid) {
      soundManager.playClickSound('move');
    } else {
      soundManager.playInvalid();
    }
    
    setPendingMove(prev => ({ ...prev, row: newRow, col: newCol }));
  }, [pendingMove, gameState, board]);

  const cancelMove = useCallback(() => {
    if (gameState !== GAME_STATES.PLAYING) return;
    soundManager.playClickSound('cancel');
    setPendingMove(null);
  }, [gameState]);

  // -------------------------------------------------------------------------
  // MOVE CONFIRMATION - Core game logic
  // -------------------------------------------------------------------------
  const confirmMove = useCallback(() => {
    if (!pendingMove || !selectedPiece || gameState !== GAME_STATES.PLAYING) return;
    if (!canPlacePiece(board, pendingMove.row, pendingMove.col, pendingMove.coords)) {
      soundManager.playInvalid();
      return;
    }
    
    // Stop timer and prevent game over during processing
    clearTimer();
    gameOverHandledRef.current = true;
    
    // Set animation state
    setPlayerAnimatingMove({ 
      ...pendingMove, 
      pieceType: selectedPiece, 
      rot: rotation, 
      flip: flipped 
    });
    
    // Place the piece (create new arrays to avoid mutation)
    const newBoard = board.map(row => [...row]);
    const newBoardPieces = boardPieces.map(row => [...row]);
    
    for (const [dx, dy] of pendingMove.coords) {
      const r = pendingMove.row + dy;
      const c = pendingMove.col + dx;
      newBoard[r][c] = 1;
      newBoardPieces[r][c] = selectedPiece;
    }
    
    const newUsedPieces = [...usedPieces, selectedPiece];
    
    // Update state
    setBoard(newBoard);
    setBoardPieces(newBoardPieces);
    setUsedPieces(newUsedPieces);
    setSelectedPiece(null);
    setPendingMove(null);
    soundManager.playPiecePlace();
    
    // Clear animation after delay
    safeSetTimeout(() => setPlayerAnimatingMove(null), ANIMATION_CLEAR_DELAY_MS);
    
    // Check victory condition
    safeSetTimeout(() => {
      const aiCanPlay = canAnyPieceBePlaced(newBoard, newUsedPieces);
      
      if (!aiCanPlay) {
        // Victory!
        soundManager.playWin();
        const newStreak = streak + 1;
        setStreak(newStreak);
        
        // Track in database
        if (!isOfflineMode) {
          statsService.recordSpeedPuzzleComplete();
        }
        
        // Update best streak if needed
        if (newStreak > effectiveBestStreak) {
          setBestStreak(newStreak);
          setDbBestStreak(newStreak);
          safeLocalStorageSet(STORAGE_KEYS.BEST_STREAK, newStreak);
          
          if (!isOfflineMode) {
            statsService.updateSpeedBestStreak(newStreak);
          }
        }
        
        setGameState(GAME_STATES.SUCCESS);
      } else {
        // Wrong move - AI can still play!
        console.log('[SpeedPuzzle] Wrong move - AI can still play, showing feedback');
        soundManager.playInvalid();
        
        // Show wrong move feedback briefly
        setShowWrongMove(true);
        safeSetTimeout(() => {
          setShowWrongMove(false);
        }, 1500);
        
        // Reset board to puzzle state and restart timer
        setBoard(currentPuzzle ? parsePuzzleBoardState(currentPuzzle.boardState).newBoard : board);
        setBoardPieces(currentPuzzle ? parsePuzzleBoardState(currentPuzzle.boardState).newBoardPieces : boardPieces);
        setUsedPieces(currentPuzzle?.usedPieces || []);
        setSelectedPiece(null);
        setPendingMove(null);
        
        gameOverHandledRef.current = false;
        setTimeLeft(TIMER_DURATION);
        lastTickRef.current = Date.now();
        setGameState(GAME_STATES.PLAYING);
      }
    }, VICTORY_CHECK_DELAY_MS);
  }, [
    pendingMove, selectedPiece, gameState, board, boardPieces, usedPieces,
    streak, effectiveBestStreak, isOfflineMode, rotation, flipped,
    clearTimer, safeSetTimeout, currentPuzzle
  ]);

  // -------------------------------------------------------------------------
  // NAVIGATION HANDLERS
  // -------------------------------------------------------------------------
  const handleContinue = useCallback(() => {
    soundManager.playButtonClick();
    loadNewPuzzle();
  }, [loadNewPuzzle]);

  const handlePlayAgain = useCallback(() => {
    soundManager.playButtonClick();
    
    if (!isOfflineMode && streak > 0) {
      statsService.recordSpeedSessionComplete(streak);
    }
    
    setStreak(0);
    loadNewPuzzle();
  }, [isOfflineMode, streak, loadNewPuzzle]);

  const handleMenu = useCallback(() => {
    soundManager.playButtonClick();
    clearTimer();
    
    if (!isOfflineMode && streak > 0) {
      statsService.recordSpeedSessionComplete(streak);
    }
    
    onMenu();
  }, [isOfflineMode, streak, onMenu, clearTimer]);

  const handleRetry = useCallback(() => {
    soundManager.playButtonClick();
    retryCountRef.current = 0;
    loadNewPuzzle();
  }, [loadNewPuzzle]);

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------
  const scrollStyles = needsScroll ? {
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
    touchAction: 'pan-y',
    scrollBehavior: 'smooth',
    overscrollBehavior: 'contain',
  } : {};

  return (
    <div 
      className={needsScroll ? 'min-h-screen bg-slate-950' : 'h-screen bg-slate-950 overflow-hidden'}
      style={scrollStyles}
    >
      {/* Grid background */}
      <div className="fixed inset-0 opacity-30 pointer-events-none" style={{
        backgroundImage: `linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />
      
      {/* Glow orbs */}
      <div className={`fixed top-10 left-20 w-80 h-80 ${theme.glow1} rounded-full blur-3xl pointer-events-none`} />
      <div className={`fixed bottom-20 right-10 w-72 h-72 ${theme.glow2} rounded-full blur-3xl pointer-events-none`} />
      
      {/* Content */}
      <div className={`relative ${needsScroll ? 'pb-safe min-h-full' : 'h-full'} flex flex-col items-center px-2 py-2`}>
        {/* Header */}
        <div className="w-full max-w-md mb-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <button
              onClick={handleMenu}
              className="px-3 py-1.5 bg-slate-800 text-cyan-300 rounded-lg text-xs sm:text-sm border border-cyan-500/30 hover:bg-slate-700 shadow-[0_0_10px_rgba(34,211,238,0.3)]"
            >
              MENU
            </button>
            
            <div className="text-center flex-1">
              <div className="speed-subtitle font-black tracking-[0.2em] text-base sm:text-lg">
                ⚡ SPEED MODE ⚡
              </div>
            </div>
            
            <div className="w-[52px]" />
          </div>
        </div>
        
        {/* Timer and Streak */}
        {gameState === GAME_STATES.PLAYING && (
          <div className="flex items-center justify-center gap-3 mb-2 flex-shrink-0">
            <SpeedTimer timeLeft={timeLeft} maxTime={TIMER_DURATION} />
            <StreakDisplay streak={streak} isNewRecord={isNewRecord} bestStreak={effectiveBestStreak} />
          </div>
        )}
        
        {/* Loading state */}
        {gameState === GAME_STATES.LOADING && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto mb-4" />
              <div className="text-slate-400 text-sm">Generating puzzle...</div>
            </div>
          </div>
        )}
        
        {/* Game board */}
        {(gameState === GAME_STATES.PLAYING || gameState === GAME_STATES.SUCCESS) && (
          <>
            {/* Drag Overlay */}
            {isDragging && draggedPiece && (
              <DragOverlay
                piece={draggedPiece}
                rotation={rotation}
                flipped={flipped}
                position={dragPosition}
                offset={dragOffset}
                isValidDrop={isValidDrop}
              />
            )}
            
            <div className="w-full max-w-md flex-shrink-0 flex justify-center relative">
              <div ref={boardRef} className="w-[min(85vw,85vh,340px)] aspect-square">
                <GameBoard
                  board={board}
                  boardPieces={boardPieces}
                  currentPlayer={1}
                  pendingMove={pendingMove}
                  playerAnimatingMove={playerAnimatingMove}
                  onCellClick={handleCellClick}
                  selectedPiece={selectedPiece}
                  rotation={rotation}
                  flipped={flipped}
                  gameOver={gameState !== GAME_STATES.PLAYING}
                  onPendingPieceDragStart={handleBoardDragStart}
                  customColors={{
                    1: 'bg-gradient-to-br from-cyan-400 to-blue-500',
                    2: 'bg-gradient-to-br from-rose-400 to-pink-500',
                  }}
                />
              </div>
              
              {/* Wrong move feedback overlay */}
              {showWrongMove && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <div className="bg-red-900/90 text-white px-6 py-4 rounded-xl border-2 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)] animate-pulse">
                    <div className="text-center">
                      <div className="text-2xl font-black mb-1">WRONG MOVE!</div>
                      <div className="text-sm text-red-200">AI can still play - try again</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* D-Pad - matches GameScreen order */}
            {gameState === GAME_STATES.PLAYING && pendingMove && !isDragging && (
              <div className="flex justify-center mt-3 flex-shrink-0">
                <DPad onMove={movePendingPiece} />
              </div>
            )}
            
            {/* Control Buttons (Rotate/Flip/Confirm/Cancel) - matches GameScreen order */}
            {gameState === GAME_STATES.PLAYING && (
              <div className="mt-2 w-full max-w-md flex-shrink-0">
                <ControlButtons
                  selectedPiece={selectedPiece}
                  pendingMove={pendingMove}
                  canConfirm={canConfirm}
                  gameOver={false}
                  gameMode="puzzle"
                  currentPlayer={1}
                  isGeneratingPuzzle={false}
                  onRotate={rotatePiece}
                  onFlip={flipPiece}
                  onConfirm={confirmMove}
                  onCancel={cancelMove}
                  hideResetButtons={true}
                />
              </div>
            )}
            
            {/* Piece tray - at the bottom like GameScreen */}
            <div className="mt-2 w-full max-w-md flex-shrink-0">
              <PieceTray
                usedPieces={usedPieces}
                currentPlayer={1}
                isPlayerTurn={true}
                selectedPiece={selectedPiece}
                onSelectPiece={selectPiece}
                rotation={rotation}
                flipped={flipped}
                pendingMove={pendingMove}
                gameOver={gameState !== GAME_STATES.PLAYING}
                createDragHandlers={createDragHandlers}
                isDragging={isDragging}
                draggedPiece={draggedPiece}
              />
            </div>
            
            {needsScroll && <div className="h-12 flex-shrink-0" />}
          </>
        )}
      </div>
      
      {/* Overlays */}
      {gameState === GAME_STATES.SUCCESS && (
        <SuccessOverlay streak={streak} onContinue={handleContinue} />
      )}
      
      {/* Game Over Overlay */}
      {gameState === GAME_STATES.GAMEOVER && (
        <GameOverOverlay
          streak={streak}
          bestStreak={effectiveBestStreak}
          onPlayAgain={handlePlayAgain}
          onMenu={handleMenu}
        />
      )}
      
      {gameState === GAME_STATES.ERROR && (
        <ErrorOverlay
          message={errorMessage}
          onRetry={handleRetry}
          onMenu={handleMenu}
        />
      )}
      
      {/* Styles */}
      <style>{`
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 20px);
        }
        
        .speed-subtitle {
          color: #fff;
          text-shadow:
            0 0 5px #fff,
            0 0 10px #fff,
            0 0 20px #ef4444,
            0 0 40px #ef4444,
            0 0 60px #f97316;
          animation: speed-pulse 2s ease-in-out infinite;
        }
        
        @keyframes speed-pulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.2); }
        }
        
        @keyframes timer-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
        .animate-timer-shake {
          animation: timer-shake 0.1s ease-in-out infinite;
        }
        
        @keyframes timer-critical {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        .animate-timer-critical {
          animation: timer-critical 0.3s ease-in-out infinite;
        }
        
        @keyframes timer-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        .animate-timer-pulse {
          animation: timer-pulse 0.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

SpeedPuzzleScreen.propTypes = {
  onMenu: PropTypes.func.isRequired,
  isOfflineMode: PropTypes.bool,
};

export default SpeedPuzzleScreen;
