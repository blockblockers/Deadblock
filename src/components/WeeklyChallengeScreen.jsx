// Weekly Challenge Screen - Timed puzzle gameplay for weekly challenges
// v7.26: Title/subtitle moved to vertical side labels flanking board to save vertical space
// v7.25: Shrunk countdown timer (text-xl→text-sm, smaller padding/icons) for better title centering
// v7.24: Removed panel box around game board for visual consistency; floating background shows through
// v7.23: iOS scroll fix — removed WebkitOverflowScrolling, touchAction, changed overscrollBehavior to none
// v7.22: overflow-y-scroll (was auto) + removed overflow-hidden from outer shell
// v7.20: Fixed scroll — two-layer shell + WebkitOverflowScrolling + overscrollBehavior
//   - gameOverHandledRef guard prevents game-over effect re-firing when deps change mid-win/loss
//   - accumulatedMsRef mirrors accumulatedMs state so timer callbacks never have stale closures
//   - stopTimer/pauseTimer guard against double-calls (sessionTime grows if startTimeRef not reset)
//   - Attempt display: removed off-by-one (+1) since count is already incremented before overlay renders
// v7.18: Added confirmFlashCells for immediate cell-flash feedback on confirm tap
// v7.17: Persistent timer - saves elapsed time on reset/close, restores when returning
// UPDATED: Added full drag and drop support from piece tray and board
// UPDATED: Controls moved above piece tray, dynamic timer colors, removed duplicate home button
import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, Trophy, ArrowLeft, RotateCcw, CheckCircle, X, FlipHorizontal, Home, Move } from 'lucide-react';
import GameBoard from './GameBoard';
import PieceTray from './PieceTray';
import DPad from './DPad';
import DragOverlay from './DragOverlay';
import NeonTitle from './NeonTitle';
import { useGameState } from '../hooks/useGameState';
import { soundManager } from '../utils/soundManager';
import { weeklyChallengeService } from '../services/weeklyChallengeService';
import { streakService } from '../services/streakService';
import { streakTracker } from '../utils/streakTracker';
import { useAuth } from '../contexts/AuthContext';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { getSeededPuzzle } from '../utils/puzzleGenerator';
import { PUZZLE_DIFFICULTY } from '../utils/puzzleGenerator';
import { getPieceCoords, canPlacePiece, BOARD_SIZE } from '../utils/gameLogic';

// =========================================================================
// v7.17: PERSISTENT TIMER HELPERS
// Saves/restores elapsed time so users don't lose progress on reset or close
// =========================================================================
const TIMER_STORAGE_PREFIX = 'deadblock_weekly_timer_';

const getTimerStorageKey = (challengeId) => `${TIMER_STORAGE_PREFIX}${challengeId}`;

const saveTimerState = (challengeId, elapsedMs, attemptCount) => {
  if (!challengeId) return;
  try {
    const key = getTimerStorageKey(challengeId);
    const data = {
      elapsedMs,
      attemptCount,
      savedAt: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    // console.warn('[WeeklyChallenge] Failed to save timer state:', e);
  }
};

const loadTimerState = (challengeId) => {
  if (!challengeId) return null;
  try {
    const key = getTimerStorageKey(challengeId);
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    
    // Validate data structure
    if (typeof data.elapsedMs !== 'number' || data.elapsedMs < 0) return null;
    
    // Check if saved within the last 7 days (challenge week)
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - data.savedAt > sevenDaysMs) {
      clearTimerState(challengeId);
      return null;
    }
    
    return data;
  } catch (e) {
    // console.warn('[WeeklyChallenge] Failed to load timer state:', e);
    return null;
  }
};

const clearTimerState = (challengeId) => {
  if (!challengeId) return;
  try {
    const key = getTimerStorageKey(challengeId);
    localStorage.removeItem(key);
  } catch (e) {
    // console.warn('[WeeklyChallenge] Failed to clear timer state:', e);
  }
};

// Timer display component - RED THEME
const TimerDisplay = ({ elapsedMs, isPaused }) => {
  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hundredths = Math.floor((ms % 1000) / 10);
    
    return (
      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-mono font-black text-red-300">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
        <span className="text-xl font-mono text-red-400/70">
          .{hundredths.toString().padStart(2, '0')}
        </span>
      </div>
    );
  };
  
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-2 mb-1">
        <Clock size={20} className={`${isPaused ? 'text-amber-400' : 'text-red-400'}`} />
        <span className="text-slate-400 text-sm uppercase tracking-wider">
          {isPaused ? 'Paused' : 'Time'}
        </span>
      </div>
      {formatTime(elapsedMs)}
    </div>
  );
};

// Success overlay when puzzle is completed - RED THEME
const SuccessOverlay = ({ completionTime, firstAttemptTime, bestTime, wasFirstAttempt, rank, onViewLeaderboard, onPlayAgain, onMenu }) => {
  const isNewBest = !bestTime || completionTime < bestTime;
  const formatTime = weeklyChallengeService.formatTime;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" 
         style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
      <div className="bg-gradient-to-br from-slate-900 via-red-950/50 to-slate-900 rounded-2xl p-6 max-w-sm w-full border border-red-500/50 shadow-[0_0_60px_rgba(239,68,68,0.4)]">
        {/* Success Icon */}
        <div className="text-center mb-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-3 animate-pulse">
            <CheckCircle size={40} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-black text-red-300">CHALLENGE COMPLETE!</h2>
        </div>
        
        {/* Times */}
        <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-red-500/20">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-slate-500 text-xs uppercase mb-1">This Run</div>
              <div className={`text-xl font-black ${isNewBest ? 'text-amber-400' : 'text-white'}`}>
                {formatTime(completionTime)}
              </div>
              {isNewBest && <div className="text-amber-400 text-xs mt-1">NEW BEST!</div>}
            </div>
            <div className="text-center">
              <div className="text-slate-500 text-xs uppercase mb-1">Best Time</div>
              <div className="text-xl font-black text-slate-300">
                {formatTime(isNewBest ? completionTime : bestTime)}
              </div>
            </div>
          </div>
        </div>
        
        {/* First attempt info */}
        {wasFirstAttempt && (
          <div className="bg-gradient-to-r from-amber-900/30 to-red-900/30 rounded-xl p-3 mb-4 border border-amber-500/30 text-center">
            <div className="text-amber-300 font-bold text-sm">⭐ First Attempt Recorded!</div>
            <div className="text-amber-500/70 text-xs mt-1">
              Your first completion time counts for the leaderboard.
            </div>
          </div>
        )}
        
        {/* Rank */}
        {rank && (
          <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-xl p-3 mb-4 border border-amber-500/30 text-center">
            <div className="flex items-center justify-center gap-2">
              <Trophy size={18} className="text-amber-400" />
              <span className="text-amber-300 font-bold">
                Current Rank: #{rank}
              </span>
            </div>
            <div className="text-amber-500/70 text-xs mt-1">Based on first attempt time</div>
          </div>
        )}
        
        {/* Buttons */}
        <div className="space-y-2">
          <button
            onClick={onViewLeaderboard}
            className="w-full p-3 rounded-xl font-bold bg-gradient-to-r from-red-500 to-rose-600 text-white hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Trophy size={18} />
            VIEW LEADERBOARD
          </button>
          
          <button
            onClick={onPlayAgain}
            className="w-full p-3 rounded-xl font-bold bg-slate-800 text-red-300 border border-red-500/30 hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw size={18} />
            {wasFirstAttempt ? 'PRACTICE RUN' : 'TRY AGAIN'}
          </button>
          
          <button
            onClick={onMenu}
            className="w-full p-3 rounded-xl font-bold bg-slate-800/50 text-slate-400 hover:text-slate-300 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} />
            BACK TO MENU
          </button>
        </div>
      </div>
    </div>
  );
};

// Lose overlay when AI wins
const LoseOverlay = ({ elapsedMs, attemptCount, isFirstAttempt, onRetry, onMenu }) => {
  const formatTime = weeklyChallengeService.formatTime;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" 
         style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 max-w-sm w-full border border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.3)]">
        {/* Icon */}
        <div className="text-center mb-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-900/30 flex items-center justify-center mb-3">
            <X size={40} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-black text-red-300">BLOCKED!</h2>
          <p className="text-slate-400 text-sm mt-2">AI found a winning move</p>
        </div>
        
        {/* Current time */}
        <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700">
          <div className="text-center">
            <div className="text-slate-500 text-xs uppercase mb-1">Time (continues on retry)</div>
            <div className="text-2xl font-black text-white">{formatTime(elapsedMs)}</div>
            {attemptCount > 0 && (
              <div className="text-slate-500 text-xs mt-1">Attempt #{attemptCount}</div>
            )}
          </div>
        </div>
        
        {/* First attempt notice */}
        {isFirstAttempt && (
          <div className="bg-amber-900/20 rounded-xl p-3 mb-4 border border-amber-500/30 text-center">
            <p className="text-amber-400 text-sm">
              Your first completion time counts for the leaderboard.
            </p>
          </div>
        )}
        
        {/* Buttons */}
        <div className="space-y-2">
          <button
            onClick={onRetry}
            className="w-full p-3 rounded-xl font-bold bg-gradient-to-r from-red-500 to-rose-600 text-white hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
          >
            <RotateCcw size={18} />
            RETRY (TIMER CONTINUES)
          </button>
          
          <button
            onClick={onMenu}
            className="w-full p-3 rounded-xl font-bold bg-slate-800/50 text-slate-400 hover:text-slate-300 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} />
            GIVE UP
          </button>
        </div>
      </div>
    </div>
  );
};

// Reusable styled button for consistent control styling across game screens
const GlowOrbButton = ({ onClick, disabled, children, color = 'cyan', className = '' }) => {
  const colorClasses = {
    cyan: 'from-cyan-500 to-blue-600 shadow-[0_0_15px_rgba(34,211,238,0.4)] hover:shadow-[0_0_25px_rgba(34,211,238,0.6)]',
    orange: 'from-orange-500 to-amber-600 shadow-[0_0_15px_rgba(249,115,22,0.4)] hover:shadow-[0_0_25px_rgba(249,115,22,0.6)]',
    green: 'from-green-500 to-emerald-600 shadow-[0_0_15px_rgba(34,197,94,0.4)] hover:shadow-[0_0_25px_rgba(34,197,94,0.6)]',
    red: 'from-red-500 to-rose-600 shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:shadow-[0_0_25px_rgba(239,68,68,0.6)]',
    purple: 'from-purple-500 to-violet-600 shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)]',
    slate: 'from-slate-600 to-slate-700 shadow-[0_0_10px_rgba(100,116,139,0.3)] hover:shadow-[0_0_15px_rgba(100,116,139,0.5)]',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        bg-gradient-to-r ${colorClasses[color]}
        text-white font-bold rounded-xl px-3 py-2 text-xs
        transition-all duration-200
        hover:scale-105 active:scale-95
        disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none
        flex items-center justify-center gap-1
        ${className}
      `}
    >
      {children}
    </button>
  );
};

const WeeklyChallengeScreen = ({ challenge, onMenu, onMainMenu, onLeaderboard }) => {
  const { profile } = useAuth();
  const { needsScroll, isMobile } = useResponsiveLayout(650);
  
  // Game state
  const [puzzle, setPuzzle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [gameLost, setGameLost] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [accumulatedMs, setAccumulatedMs] = useState(0);
  const [completionTime, setCompletionTime] = useState(null);
  const [firstAttemptTime, setFirstAttemptTime] = useState(null);
  const [bestTime, setBestTime] = useState(null);
  const [isFirstAttempt, setIsFirstAttempt] = useState(true);
  const [wasFirstAttempt, setWasFirstAttempt] = useState(false);
  const [currentRank, setCurrentRank] = useState(null);
  const [attemptCount, setAttemptCount] = useState(0);
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const [confirmFlashCells, setConfirmFlashCells] = useState(null); // v7.18: Immediate flash on confirm tap
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isValidDrop, setIsValidDrop] = useState(false);
  const [dragPreviewCell, setDragPreviewCell] = useState(null); // v7.22: For board preview during drag
  const [pieceCellOffset, setPieceCellOffset] = useState({ row: 0, col: 0 }); // Which cell of piece is under finger
  
  // Refs
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const accumulatedMsRef = useRef(0);      // Always-current mirror of accumulatedMs; prevents stale closures in timer intervals
  const gameOverHandledRef = useRef(false); // Prevents game-over effect re-firing when deps change (e.g. attemptCount increment)
  const boardRef = useRef(null);
  const boardBoundsRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const hasDragStartedRef = useRef(false);
  
  // CRITICAL: Cleanup body scroll on unmount to prevent scroll issues
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, []);
  
  // v7.17: Save timer state on browser/tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (challenge?.id && gameStarted && !gameComplete && startTimeRef.current) {
        const currentTime = accumulatedMsRef.current + (Date.now() - startTimeRef.current);
        saveTimerState(challenge.id, currentTime, attemptCount);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [challenge, gameStarted, gameComplete, attemptCount]);
  
  // Game state from hook
  const {
    board,
    boardPieces,
    currentPlayer,
    selectedPiece,
    rotation,
    flipped,
    gameOver,
    winner,
    usedPieces,
    pendingMove,
    handleCellClick,
    confirmMove,
    cancelMove,
    movePendingPiece,
    selectPiece,
    rotatePiece,
    flipPiece,
    loadPuzzle,
    resetCurrentPuzzle,
    setPendingMove,
    setFastAIMode,
  } = useGameState();
  
  // Enable fast AI mode for weekly challenge (instant AI moves)
  useEffect(() => {
    setFastAIMode(true);
    return () => setFastAIMode(false); // Reset on unmount
  }, [setFastAIMode]);
  
  // Helper to check if pending piece has cells off the grid
  const isPieceOffGrid = pendingMove ? (() => {
    const coords = getPieceCoords(pendingMove.piece, rotation, flipped);
    return coords.some(([dx, dy]) => {
      const cellRow = pendingMove.row + dy;
      const cellCol = pendingMove.col + dx;
      return cellRow < 0 || cellRow >= BOARD_SIZE || cellCol < 0 || cellCol >= BOARD_SIZE;
    });
  })() : false;
  
  // =========================================================================
  // DRAG AND DROP HANDLERS - FIXED WITH DIAGNOSTIC LOGGING
  // =========================================================================
  
  const DRAG_THRESHOLD = 8;
  const SCROLL_ANGLE_THRESHOLD = 60;
  
  // Track which cell of the piece is under the finger
  const pieceCellOffsetRef = useRef({ row: 0, col: 0 });
  
  // Refs for global touch handlers - allows immediate attachment/detachment
  const globalTouchHandlersRef = useRef({ move: null, end: null, cancel: null });
  
  // Refs to store latest callback functions (avoids stale closure issues)
  const updateDragRef = useRef(null);
  const endDragRef = useRef(null);
  
  // CRITICAL: Use ref for isDragging to avoid stale closure issues
  // State updates are async, but refs update synchronously
  const isDraggingRef = useRef(false);
  const draggedPieceRef = useRef(null);
  const dragCellRef = useRef(null); // v7.22: Store current cell during drag
  
  // Calculate which cell of the piece was touched
  const calculateTouchedPieceCell = useCallback((piece, touchX, touchY, elementRect, currentRotation, currentFlipped) => {
    if (!elementRect || !piece) return { row: 0, col: 0 };
    
    const coords = getPieceCoords(piece, currentRotation, currentFlipped);
    if (!coords || coords.length === 0) return { row: 0, col: 0 };
    
    const minX = Math.min(...coords.map(([x]) => x));
    const maxX = Math.max(...coords.map(([x]) => x));
    const minY = Math.min(...coords.map(([, y]) => y));
    const maxY = Math.max(...coords.map(([, y]) => y));
    
    const pieceCols = maxX - minX + 1;
    const pieceRows = maxY - minY + 1;
    
    const relX = (touchX - elementRect.left) / elementRect.width;
    const relY = (touchY - elementRect.top) / elementRect.height;
    
    const cellCol = Math.floor(relX * pieceCols) + minX;
    const cellRow = Math.floor(relY * pieceRows) + minY;
    
    let closestCell = { row: 0, col: 0 };
    let minDist = Infinity;
    
    for (const [x, y] of coords) {
      const dist = Math.abs(x - cellCol) + Math.abs(y - cellRow);
      if (dist < minDist) {
        minDist = dist;
        closestCell = { row: y, col: x };
      }
    }
    
    return closestCell;
  }, []);

  // Calculate which board cell the drag position is over
  // Allow positions outside the board for pieces that extend beyond their anchor
  const calculateBoardCell = useCallback((clientX, clientY) => {
    if (!boardBoundsRef.current) return null;
    
    const { left, top, width, height } = boardBoundsRef.current;
    const cellWidth = width / BOARD_SIZE;
    const cellHeight = height / BOARD_SIZE;
    
    // Match DragOverlay fingerOffset - piece is shown above finger
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const fingerOffset = isMobile ? 40 : 20;
    
    const relX = clientX - left;
    const relY = (clientY - fingerOffset) - top;
    
    // Raw cell under finger (adjusted for fingerOffset only)
    // Note: Do NOT adjust by pieceCellOffsetRef here - updateDrag handles centering
    const col = Math.floor(relX / cellWidth);
    const row = Math.floor(relY / cellHeight);
    
    // Allow anchor position up to 4 cells outside board for piece extension
    const EXTENSION_MARGIN = 4;
    if (row >= -EXTENSION_MARGIN && row < BOARD_SIZE + EXTENSION_MARGIN && 
        col >= -EXTENSION_MARGIN && col < BOARD_SIZE + EXTENSION_MARGIN) {
      return { row, col };
    }
    
    return null;
  }, []);

  // Detach global touch handlers
  const detachGlobalTouchHandlers = useCallback(() => {
    const { move, end, cancel } = globalTouchHandlersRef.current;
    if (move) window.removeEventListener('touchmove', move);
    if (end) window.removeEventListener('touchend', end);
    if (cancel) window.removeEventListener('touchcancel', cancel);
    globalTouchHandlersRef.current = { move: null, end: null, cancel: null };
  }, []);

  // Attach global touch handlers SYNCHRONOUSLY (must be called during touch event)
  const attachGlobalTouchHandlers = useCallback(() => {
    // Detach any existing handlers first
    detachGlobalTouchHandlers();
    
    const handleTouchMove = (e) => {
      if (!isDraggingRef.current) return;
      
      const touch = e.touches?.[0];
      if (!touch) return;
      
      // Update drag position
      setDragPosition({ x: touch.clientX, y: touch.clientY });
      
      // Update board bounds
      if (boardRef.current) {
        boardBoundsRef.current = boardRef.current.getBoundingClientRect();
      }
      
      // Calculate board cell and preview INLINE (like GameScreen)
      if (boardBoundsRef.current && draggedPieceRef.current) {
        const { left, top, width, height } = boardBoundsRef.current;
        const cellWidth = width / BOARD_SIZE;
        const cellHeight = height / BOARD_SIZE;
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
        const fingerOffset = isMobile ? 40 : 20;
        
        const relX = touch.clientX - left;
        const relY = (touch.clientY - fingerOffset) - top;
        
        const col = Math.floor(relX / cellWidth);
        const row = Math.floor(relY / cellHeight);
        
        const EXTENSION_MARGIN = 4;
        if (row >= -EXTENSION_MARGIN && row < BOARD_SIZE + EXTENSION_MARGIN && 
            col >= -EXTENSION_MARGIN && col < BOARD_SIZE + EXTENSION_MARGIN) {
          // Get piece coordinates to calculate center offset
          const coords = getPieceCoords(draggedPieceRef.current, rotation, flipped);
          
          const minX = Math.min(...coords.map(([x]) => x));
          const maxX = Math.max(...coords.map(([x]) => x));
          const minY = Math.min(...coords.map(([, y]) => y));
          const maxY = Math.max(...coords.map(([, y]) => y));
          
          const centerOffsetCol = Math.floor((maxX + minX) / 2);
          const centerOffsetRow = Math.floor((maxY + minY) / 2);
          
          const adjustedRow = row - centerOffsetRow;
          const adjustedCol = col - centerOffsetCol;
          
          // Store in ref for endDrag to access synchronously
          dragCellRef.current = { row: adjustedRow, col: adjustedCol };
          setDragPreviewCell({ row: adjustedRow, col: adjustedCol });
          
          const valid = canPlacePiece(board, adjustedRow, adjustedCol, coords);
          setIsValidDrop(valid);
        } else {
          dragCellRef.current = null;
          setDragPreviewCell(null);
          setIsValidDrop(false);
        }
      }
      
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      if (!isDraggingRef.current) return;
      
      // Call endDrag via ref to properly set pendingMove
      endDragRef.current?.();
      
      // Clean up listeners
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
      globalTouchHandlersRef.current = { move: null, end: null, cancel: null };
    };
    
    const handleTouchCancel = () => {
      if (!isDraggingRef.current) return;
      
      endDragRef.current?.();
      
      // Clean up listeners
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
      globalTouchHandlersRef.current = { move: null, end: null, cancel: null };
    };

    globalTouchHandlersRef.current = { move: handleTouchMove, end: handleTouchEnd, cancel: handleTouchCancel };
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchCancel);
  }, [rotation, flipped, board, detachGlobalTouchHandlers]);

  // Update drag position and check validity
  const updateDrag = useCallback((clientX, clientY) => {
    // Use state OR refs for guards - support both patterns
    if (!isDragging && !isDraggingRef.current) return;
    if (!draggedPiece && !draggedPieceRef.current) return;
    
    const piece = draggedPiece || draggedPieceRef.current;
    
    setDragPosition({ x: clientX, y: clientY });
    
    // Update board bounds
    if (boardRef.current) {
      boardBoundsRef.current = boardRef.current.getBoundingClientRect();
    }
    
    const cell = calculateBoardCell(clientX, clientY);
    if (cell && piece) {
      // Get piece coordinates to calculate center offset
      const coords = getPieceCoords(piece, rotation, flipped);
      
      // Calculate piece bounds
      const minX = Math.min(...coords.map(([x]) => x));
      const maxX = Math.max(...coords.map(([x]) => x));
      const minY = Math.min(...coords.map(([, y]) => y));
      const maxY = Math.max(...coords.map(([, y]) => y));
      
      // Calculate center offset (piece anchor is at 0,0, we want center under finger)
      const centerOffsetCol = Math.floor((maxX + minX) / 2);
      const centerOffsetRow = Math.floor((maxY + minY) / 2);
      
      // Offset the cell so piece CENTER is under finger, not anchor
      const adjustedRow = cell.row - centerOffsetRow;
      const adjustedCol = cell.col - centerOffsetCol;
      
      dragCellRef.current = { row: adjustedRow, col: adjustedCol };
      
      // v7.22: Update dragPreviewCell for live board preview
      setDragPreviewCell({ row: adjustedRow, col: adjustedCol });
      
      const valid = canPlacePiece(board, adjustedRow, adjustedCol, coords);
      setIsValidDrop(valid);
    } else {
      dragCellRef.current = null;
      setDragPreviewCell(null);
      setIsValidDrop(false);
    }
  }, [isDragging, draggedPiece, rotation, flipped, board, calculateBoardCell]);

  // End drag - keep pending move for confirmation
  const endDrag = useCallback(() => {
    // Check if we were actually dragging
    const wasDragging = isDragging || isDraggingRef.current || hasDragStartedRef.current;
    if (!wasDragging) return;
    
    // Set pendingMove from dragCellRef (sync) or dragPreviewCell (state)
    // dragCellRef is more reliable as it's updated synchronously in global handlers
    const piece = draggedPiece || draggedPieceRef.current;
    const cell = dragCellRef.current || dragPreviewCell;
    
    if (cell && piece) {
      const coords = getPieceCoords(piece, rotation, flipped);
      setPendingMove({
        piece,
        row: cell.row,
        col: cell.col,
        coords
      });
    }
    
    // Clear refs
    isDraggingRef.current = false;
    draggedPieceRef.current = null;
    hasDragStartedRef.current = false;
    pieceCellOffsetRef.current = { row: 0, col: 0 };
    dragCellRef.current = null;
    
    // Clear state
    setIsDragging(false);
    setDraggedPiece(null);
    setDragPosition({ x: 0, y: 0 });
    setDragOffset({ x: 0, y: 0 });
    setIsValidDrop(false);
    setDragPreviewCell(null);
    setPieceCellOffset({ row: 0, col: 0 });
    
    // Re-enable scroll
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  }, [isDragging, dragPreviewCell, draggedPiece, rotation, flipped]);

  // CRITICAL: Update refs SYNCHRONOUSLY (not in useEffect) to avoid race conditions
  // This ensures refs are always current when touch handlers fire
  updateDragRef.current = updateDrag;
  endDragRef.current = endDrag;

  // Helper function to start drag
  const startDrag = useCallback((piece, clientX, clientY, elementRect) => {
    // Guard against duplicate calls
    if (hasDragStartedRef.current) return;
    if (gameOver || usedPieces.includes(piece) || !gameStarted) return;
    if (currentPlayer === 2) return; // Don't allow drag during AI turn
    
    // Set refs FIRST (synchronous) - these are checked by handlers
    hasDragStartedRef.current = true;
    isDraggingRef.current = true;
    draggedPieceRef.current = piece;
    
    // CRITICAL: Attach global touch handlers SYNCHRONOUSLY
    attachGlobalTouchHandlers();
    
    // Set pieceCellOffset to 0,0 for tray drags (updateDrag handles centering)
    pieceCellOffsetRef.current = { row: 0, col: 0 };
    setPieceCellOffset({ row: 0, col: 0 });
    
    if (boardRef.current) {
      boardBoundsRef.current = boardRef.current.getBoundingClientRect();
    }
    
    const offsetX = elementRect ? clientX - (elementRect.left + elementRect.width / 2) : 0;
    const offsetY = elementRect ? clientY - (elementRect.top + elementRect.height / 2) : 0;
    
    // Update state (async, triggers re-render)
    setDraggedPiece(piece);
    setDragPosition({ x: clientX, y: clientY });
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
    
    // Select piece - this plays sound, don't play again
    selectPiece(piece);
    if (setPendingMove) setPendingMove(null);
    
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }, [gameOver, usedPieces, gameStarted, currentPlayer, selectPiece, setPendingMove, attachGlobalTouchHandlers]);

  // Create drag handlers for piece tray
  const createDragHandlers = useCallback((piece) => {
    if (gameOver || usedPieces.includes(piece) || !gameStarted) {
      return {};
    }
    if (currentPlayer === 2) return {}; // Don't allow drag during AI turn

    let elementRect = null;

    // Touch start - start drag immediately (touch-action: none prevents scrolling)
    const handleTouchStart = (e) => {
      if (hasDragStartedRef.current) return; // Guard against double-start
      
      const touch = e.touches?.[0];
      if (!touch) return;
      
      // Capture element rect
      elementRect = e.currentTarget?.getBoundingClientRect() || null;
      
      // Update board bounds for drop detection
      if (boardRef?.current) {
        boardBoundsRef.current = boardRef.current.getBoundingClientRect();
      }
      
      // Start drag immediately
      startDrag(piece, touch.clientX, touch.clientY, elementRect);
    };

    // Touch move - call updateDrag directly (matching GameScreen pattern)
    const handleTouchMove = (e) => {
      if (hasDragStartedRef.current && e.touches?.[0]) {
        e.preventDefault();
        updateDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    // Touch end - call endDrag directly (matching GameScreen pattern)
    const handleTouchEnd = (e) => {
      if (hasDragStartedRef.current) {
        e.preventDefault();
        endDrag();
      }
    };

    // Mouse handlers for desktop
    const handleMouseDown = (e) => {
      if (e.button !== 0) return;
      if (hasDragStartedRef.current) return;
      
      elementRect = e.currentTarget?.getBoundingClientRect() || null;
      
      if (boardRef?.current) {
        boardBoundsRef.current = boardRef.current.getBoundingClientRect();
      }
      
      startDrag(piece, e.clientX, e.clientY, elementRect);
    };

    return {
      onMouseDown: handleMouseDown,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    };
  }, [gameOver, usedPieces, gameStarted, currentPlayer, startDrag, updateDrag, endDrag]);

  // Handle dragging from board (moving pending piece)
  const handleBoardDragStart = useCallback((piece, clientX, clientY, elementRect) => {
    // Guard against duplicate calls
    if (hasDragStartedRef.current) return;
    if (gameOver || !gameStarted) return;
    if (currentPlayer === 2) return; // Don't allow drag during AI turn
    if (!pendingMove || pendingMove.piece !== piece) return;
    
    // v7.22: Set ALL refs FIRST (synchronous) - these are checked by handlers
    hasDragStartedRef.current = true;
    isDraggingRef.current = true;
    draggedPieceRef.current = piece;
    
    // v7.22: CRITICAL - Attach global touch handlers IMMEDIATELY
    attachGlobalTouchHandlers();
    
    // Update board bounds
    if (boardRef.current) {
      boardBoundsRef.current = boardRef.current.getBoundingClientRect();
    }
    
    // v7.22: Calculate which cell of the piece was touched using touch position
    if (pendingMove && boardBoundsRef.current) {
      const { left, top, width, height } = boardBoundsRef.current;
      const cellWidth = width / BOARD_SIZE;
      const cellHeight = height / BOARD_SIZE;
      
      // Get the board cell directly under the finger
      const fingerCol = Math.floor((clientX - left) / cellWidth);
      const fingerRow = Math.floor((clientY - top) / cellHeight);
      
      // Calculate offset from piece anchor to touched cell
      const offset = {
        row: fingerRow - pendingMove.row,
        col: fingerCol - pendingMove.col
      };
      pieceCellOffsetRef.current = offset;
      setPieceCellOffset(offset);
    } else {
      pieceCellOffsetRef.current = { row: 0, col: 0 };
      setPieceCellOffset({ row: 0, col: 0 });
    }
    
    // v7.22: DON'T clear pending move - keep it in DOM to prevent touch cancel
    
    const offsetX = elementRect ? clientX - (elementRect.left + elementRect.width / 2) : 0;
    const offsetY = elementRect ? clientY - (elementRect.top + elementRect.height / 2) : 0;
    
    // Update React state (async, triggers re-render)
    setDraggedPiece(piece);
    setDragPosition({ x: clientX, y: clientY });
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
    
    // Select piece - plays sound
    selectPiece(piece);
    
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }, [gameOver, gameStarted, currentPlayer, pendingMove, selectPiece, attachGlobalTouchHandlers]);

  // v7.18: Wrapper around hook's confirmMove to fire immediate cell-flash feedback
  const handleConfirmMove = useCallback(() => {
    if (pendingMove) {
      const coords = getPieceCoords(pendingMove.piece, rotation, flipped);
      const flashCells = coords.map(([dx, dy]) => ({
        row: pendingMove.row + dy,
        col: pendingMove.col + dx,
      })).filter(c => c.row >= 0 && c.row < 8 && c.col >= 0 && c.col < 8);
      setConfirmFlashCells(flashCells);
      setTimeout(() => setConfirmFlashCells(null), 400);
    }
    confirmMove();
  }, [pendingMove, rotation, flipped, confirmMove]);

  // Global mouse handlers for desktop drag
  useEffect(() => {
    if (!isDragging) return;
    
    const handleGlobalMove = (e) => {
      updateDrag(e.clientX, e.clientY);
    };
    
    const handleGlobalEnd = () => {
      endDrag();
    };
    
    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalEnd);
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalEnd);
    };
  }, [isDragging, updateDrag, endDrag]);

  // Global touch handlers (backup for synchronous handlers)
  useEffect(() => {
    if (!isDragging) return;
    
    const handleTouchMove = (e) => {
      if (e.touches?.[0]) {
        updateDrag(e.touches[0].clientX, e.touches[0].clientY);
        if (e.cancelable) e.preventDefault();
      }
    };
    
    const handleTouchEnd = () => endDrag();
    const handleTouchCancel = () => endDrag();
    
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchCancel);
    
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [isDragging, updateDrag, endDrag]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      detachGlobalTouchHandlers();
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [detachGlobalTouchHandlers]);
  
  // =========================================================================
  // TIMER AND GAME LOGIC
  // =========================================================================
  
  // Load the puzzle
  useEffect(() => {
    const loadWeeklyPuzzle = async () => {
      if (!challenge || !challenge.id) {
        console.error('[WeeklyChallengeScreen] No challenge provided');
        setLoadError('Challenge data not available. Please go back and try again.');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setLoadError(null);
      
      try {
        const seed = weeklyChallengeService.generatePuzzleSeed(challenge);
        
        const puzzleData = await getSeededPuzzle(seed, PUZZLE_DIFFICULTY.HARD);
        
        if (puzzleData) {
          setPuzzle(puzzleData);
        } else {
          setLoadError('Failed to generate puzzle. Please try again.');
        }
        
        const { data: existingResult } = await weeklyChallengeService.getUserResult(challenge.id);
        if (existingResult) {
          setFirstAttemptTime(existingResult.first_attempt_time_ms);
          setBestTime(existingResult.best_time_ms || existingResult.completion_time_ms);
          setIsFirstAttempt(false);
        }
        
        // v7.17: Restore saved timer state if user previously left mid-challenge
        const savedTimer = loadTimerState(challenge.id);
        if (savedTimer) {
          accumulatedMsRef.current = savedTimer.elapsedMs; // keep ref in sync
          setAccumulatedMs(savedTimer.elapsedMs);
          setElapsedMs(savedTimer.elapsedMs);
          setAttemptCount(savedTimer.attemptCount || 0);
          // console.log('[WeeklyChallenge] Restored timer:', savedTimer.elapsedMs, 'ms');
        }
      } catch (err) {
        console.error('Error loading weekly puzzle:', err);
        setLoadError('Failed to load puzzle: ' + (err.message || 'Unknown error'));
      }
      
      setLoading(false);
    };
    
    loadWeeklyPuzzle();
  }, [challenge]);
  
  // Start the timer
  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedMs(accumulatedMsRef.current + (Date.now() - startTimeRef.current));
    }, 10);
  }, []); // no dep — reads ref which is always current
  
  // Stop the timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // Guard: if timer was already stopped, startTimeRef is stale — return cached accumulated value
    if (!startTimeRef.current) return accumulatedMsRef.current;
    const sessionTime = Date.now() - startTimeRef.current;
    startTimeRef.current = null; // prevent double-counting on re-call
    return accumulatedMsRef.current + sessionTime;
  }, []); // no dep — reads ref which is always current
  
  // Pause the timer
  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // Guard: if timer was already stopped, startTimeRef is stale — return cached accumulated value
    if (!startTimeRef.current) return accumulatedMsRef.current;
    const sessionTime = Date.now() - startTimeRef.current;
    startTimeRef.current = null; // prevent double-counting on re-call
    const newAccumulated = accumulatedMsRef.current + sessionTime;
    accumulatedMsRef.current = newAccumulated; // write ref immediately so startTimer sees it on retry
    setAccumulatedMs(newAccumulated);
    return newAccumulated;
  }, []); // no dep — reads/writes ref which is always current
  
  // Auto-start the game when puzzle is loaded
  useEffect(() => {
    if (puzzle && !loading && !loadError && !gameStarted && loadPuzzle) {
      loadPuzzle(puzzle);
      setGameStarted(true);
      startTimer();
      soundManager.playClickSound('success');
    }
  }, [puzzle, loading, loadError, gameStarted, loadPuzzle, startTimer]);
  
  // Check for puzzle completion
  useEffect(() => {
    // Reset guard when game is not over so next game-over is handled
    if (!gameOver) {
      gameOverHandledRef.current = false;
      return;
    }
    if (!gameStarted) return;
    // Guard: prevent re-firing when deps change mid-win/loss (stopTimer/pauseTimer recreation,
    // attemptCount increment, etc. would all cause this effect to re-run without this guard)
    if (gameOverHandledRef.current) return;
    gameOverHandledRef.current = true;

    if (winner === 1) {
        const finalTime = stopTimer();
        setCompletionTime(finalTime);
        setWasFirstAttempt(isFirstAttempt);
        setGameComplete(true);
        soundManager.playPuzzleSolvedSound();
        submitResult(finalTime);
        
        // v7.17: Clear saved timer state on successful completion
        if (challenge?.id) {
          clearTimerState(challenge.id);
        }
        
        // v7.15.2: Record daily play for streak tracking
        streakTracker.recordPlay();
        
        // v7.12: Update play streak
        try {
          const cachedProfile = localStorage.getItem('deadblock_profile_cache');
          if (cachedProfile) {
            const { profile } = JSON.parse(cachedProfile);
            if (profile?.id) {
              streakService.updateStreak(profile.id).then(({ data }) => {
                if (data?.new_achievements?.length > 0) {
                  // console.log('[WeeklyChallenge] New streak achievements:', data.new_achievements);
                }
              });
            }
          }
        } catch (err) {
          // console.warn('[WeeklyChallenge] Failed to update streak:', err);
        }
      } else if (winner === 2) {
        const pausedTime = pauseTimer();
        setGameLost(true);
        soundManager.playGameOver();
        // Use functional updater so saveTimerState receives the correct post-increment count
        setAttemptCount(prev => {
          const next = prev + 1;
          if (challenge?.id) {
            saveTimerState(challenge.id, pausedTime, next);
          }
          return next;
        });
      }
  // stopTimer/pauseTimer are now stable (no deps) so omitting them is safe.
  // attemptCount removed — its increment was the original cause of the re-fire loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver, winner, gameStarted, isFirstAttempt, challenge]);
  
  // Submit result
  const submitResult = async (timeMs) => {
    try {
      const { data } = await weeklyChallengeService.submitResult(challenge.id, timeMs, isFirstAttempt);
      
      if (data) {
        if (isFirstAttempt) {
          setFirstAttemptTime(timeMs);
          setIsFirstAttempt(false);
        }
        
        if (!bestTime || timeMs < bestTime) {
          setBestTime(timeMs);
        }
        
        const { rank } = await weeklyChallengeService.getUserRank(challenge.id);
        setCurrentRank(rank);
      }
    } catch (err) {
      console.error('Error submitting result:', err);
    }
  };
  
  // Retry after loss
  const handleRetryAfterLoss = useCallback(() => {
    gameOverHandledRef.current = false; // allow next game-over to be processed
    resetCurrentPuzzle();
    setGameLost(false);
    startTimer();
    soundManager.playClickSound('success');
  }, [resetCurrentPuzzle, startTimer]);
  
  // Full restart - v7.17: Timer continues, saves state
  const handleRestart = useCallback(() => {
    const currentTime = timerRef.current 
      ? accumulatedMsRef.current + (Date.now() - startTimeRef.current)
      : accumulatedMsRef.current;
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startTimeRef.current = null;
    
    if (challenge?.id) {
      saveTimerState(challenge.id, currentTime, attemptCount);
    }
    
    resetCurrentPuzzle();
    setGameComplete(false);
    setGameLost(false);
    setCompletionTime(null);
    setWasFirstAttempt(false);
    
    accumulatedMsRef.current = currentTime; // keep ref in sync
    setAccumulatedMs(currentTime);
    setElapsedMs(currentTime);
    gameOverHandledRef.current = false; // allow next game-over to be processed
    
    setGameStarted(false);
  }, [resetCurrentPuzzle, attemptCount, challenge]);
  
  // View leaderboard
  const handleViewLeaderboard = () => {
    soundManager.playButtonClick();
    onLeaderboard(challenge);
  };
  
  // v7.17: Go to menu - saves timer state before navigating away
  const handleGoToMenu = useCallback(() => {
    soundManager.playButtonClick();
    
    if (challenge?.id && !gameComplete) {
      const currentTime = timerRef.current 
        ? accumulatedMsRef.current + (Date.now() - startTimeRef.current)
        : accumulatedMsRef.current;
      saveTimerState(challenge.id, currentTime, attemptCount);
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    (onMainMenu || onMenu)();
  }, [challenge, gameComplete, attemptCount, onMainMenu, onMenu]);
  
  // Cleanup - v7.17: Save timer state on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        
        if (challenge?.id && startTimeRef.current && !gameComplete) {
          const currentTime = accumulatedMsRef.current + (Date.now() - startTimeRef.current);
          saveTimerState(challenge.id, currentTime, attemptCount);
        }
      }
    };
  }, [challenge, attemptCount, gameComplete]);
  
  // =========================================================================
  // RENDER
  // =========================================================================
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center relative z-20">
        <div className="fixed inset-0 opacity-20 pointer-events-none z-0" style={{
          backgroundImage: 'linear-gradient(rgba(239,68,68,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        <div className="relative z-10 text-center">
          <div className="w-12 h-12 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-red-300">Loading weekly challenge...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative z-20">
        <div className="fixed inset-0 opacity-20 pointer-events-none z-0" style={{
          backgroundImage: 'linear-gradient(rgba(239,68,68,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        <div className="relative z-10 bg-slate-900 rounded-xl p-6 max-w-sm w-full border border-red-500/30 text-center">
          <X size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-300 mb-2">Error</h2>
          <p className="text-slate-400 mb-4">{loadError}</p>
          <button
            onClick={() => { soundManager.playButtonClick(); onMenu(); }}
            className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }
  
  // Waiting for game to start (puzzle loaded, auto-start effect running)
  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center relative z-20">
        <div className="fixed inset-0 opacity-20 pointer-events-none z-0" style={{
          backgroundImage: 'linear-gradient(rgba(239,68,68,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        <div className="relative z-10 text-center">
          <div className="w-12 h-12 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-red-300">Starting challenge...</p>
        </div>
      </div>
    );
  }
  
  // Game in progress
  return (
    <div className="fixed inset-0 bg-slate-950 relative z-20">
      {/* Red Background Grid */}
      <div className="fixed inset-0 opacity-30 pointer-events-none z-0" style={{
        backgroundImage: 'linear-gradient(rgba(239,68,68,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.4) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        background: 'radial-gradient(ellipse at center, rgba(239,68,68,0.15) 0%, transparent 70%)'
      }} />
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        boxShadow: 'inset 0 0 150px rgba(239,68,68,0.2)'
      }} />

      {/* Drag Overlay — outside scroll child so it covers full screen */}
      {isDragging && draggedPiece && (
        <DragOverlay
          isDragging={isDragging}
          piece={draggedPiece}
          rotation={rotation}
          flipped={flipped}
          position={dragPosition}
          offset={dragOffset}
          isValidDrop={isValidDrop}
          cellOffset={pieceCellOffset}
        />
      )}

      {/* Inner scroll child — absolute inset-0 gives iOS explicit pixel bounds */}
      <div
        className="absolute inset-0 overflow-y-scroll overflow-x-hidden relative z-10"
        style={{ overscrollBehavior: 'none' }}
      >
      {/* Content */}
      <div className="min-h-full flex flex-col items-center px-2 py-1" style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}>
        <div className="w-full max-w-lg">
          
          {/* Header with Timer (title moved to board sides) */}
          <div className="flex items-center justify-end mb-1 px-2">
            
            {/* Enhanced Compact Timer Display - Cyberpunk Stopwatch with Dynamic Colors */}
            {(() => {
              // Color ranges based on time (cool to hot)
              const totalSeconds = Math.floor(elapsedMs / 1000);
              let timerColor, timerGlow, borderColor, bgGradient, iconColor;
              
              if (totalSeconds < 30) {
                // 0-30s: Cyan (cool - great pace)
                timerColor = '#67e8f9';
                timerGlow = 'rgba(34,211,238,0.9)';
                borderColor = 'border-cyan-500/50';
                bgGradient = 'from-slate-900/95 to-cyan-950/40';
                iconColor = 'text-cyan-400';
              } else if (totalSeconds < 60) {
                // 30s-1min: Green (good pace)
                timerColor = '#86efac';
                timerGlow = 'rgba(74,222,128,0.9)';
                borderColor = 'border-green-500/50';
                bgGradient = 'from-slate-900/95 to-green-950/40';
                iconColor = 'text-green-400';
              } else if (totalSeconds < 120) {
                // 1-2min: Yellow (moderate)
                timerColor = '#fde047';
                timerGlow = 'rgba(250,204,21,0.9)';
                borderColor = 'border-yellow-500/50';
                bgGradient = 'from-slate-900/95 to-yellow-950/40';
                iconColor = 'text-yellow-400';
              } else if (totalSeconds < 180) {
                // 2-3min: Orange (getting slow)
                timerColor = '#fdba74';
                timerGlow = 'rgba(251,146,60,0.9)';
                borderColor = 'border-orange-500/50';
                bgGradient = 'from-slate-900/95 to-orange-950/40';
                iconColor = 'text-orange-400';
              } else {
                // 3min+: Red (hot - taking long)
                timerColor = '#fca5a5';
                timerGlow = 'rgba(239,68,68,0.9)';
                borderColor = 'border-red-500/50';
                bgGradient = 'from-slate-900/95 to-red-950/40';
                iconColor = 'text-red-400';
              }
              
              return (
                <div 
                  className={`relative px-2.5 py-1.5 bg-gradient-to-br ${bgGradient} rounded-xl border ${borderColor} overflow-hidden transition-all duration-500`}
                  style={{ 
                    boxShadow: `0 0 25px ${timerGlow.replace('0.9', '0.35')}, inset 0 0 20px ${timerGlow.replace('0.9', '0.15')}, 0 4px 15px rgba(0,0,0,0.4)` 
                  }}
                >
                  {/* Animated scan line effect */}
                  <div 
                    className="absolute inset-0 pointer-events-none opacity-30"
                    style={{
                      background: `linear-gradient(0deg, transparent 50%, ${timerGlow.replace('0.9', '0.1')} 50%)`,
                      backgroundSize: '100% 4px',
                      animation: 'scanline 8s linear infinite'
                    }}
                  />
                  
                  {/* Corner accents with dynamic color */}
                  <div className="absolute top-0 left-0 w-1.5 h-1.5 border-l-2 border-t-2 transition-colors duration-500" style={{ borderColor: timerColor + '99' }} />
                  <div className="absolute top-0 right-0 w-1.5 h-1.5 border-r-2 border-t-2 transition-colors duration-500" style={{ borderColor: timerColor + '99' }} />
                  <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-l-2 border-b-2 transition-colors duration-500" style={{ borderColor: timerColor + '99' }} />
                  <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-r-2 border-b-2 transition-colors duration-500" style={{ borderColor: timerColor + '99' }} />
                  
                  <div className="relative flex items-center gap-1.5">
                    {/* Animated clock icon with dynamic color */}
                    <div className="relative">
                      <div 
                        className="absolute inset-0 rounded-full blur-md animate-pulse transition-colors duration-500" 
                        style={{ backgroundColor: timerGlow.replace('0.9', '0.3') }}
                      />
                      <Clock size={14} className={`relative ${iconColor} transition-colors duration-500`} />
                      {elapsedMs > 0 && (
                        <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.8)]" />
                      )}
                    </div>
                    
                    {/* Time display with dynamic glowing digits */}
                    <div className="flex items-baseline gap-0.5">
                      <span 
                        className="text-sm font-mono font-black tracking-tight tabular-nums transition-all duration-500"
                        style={{ 
                          color: timerColor,
                          textShadow: `0 0 12px ${timerGlow}, 0 0 25px ${timerGlow.replace('0.9', '0.5')}`
                        }}
                      >
                        {Math.floor(elapsedMs / 60000)}
                      </span>
                      <span 
                        className="text-sm font-mono font-black animate-pulse transition-colors duration-500"
                        style={{ 
                          color: timerColor,
                          textShadow: `0 0 8px ${timerGlow.replace('0.9', '0.8')}`
                        }}
                      >
                        :
                      </span>
                      <span 
                        className="text-sm font-mono font-black tracking-tight tabular-nums transition-all duration-500"
                        style={{ 
                          color: timerColor,
                          textShadow: `0 0 12px ${timerGlow}, 0 0 25px ${timerGlow.replace('0.9', '0.5')}`
                        }}
                      >
                        {String(Math.floor((elapsedMs % 60000) / 1000)).padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
          
          {/* Main Game Panel - RED THEME */}
          <div className="mb-2">
            
            {/* Game Board with side titles */}
            <div className="flex items-center justify-center pb-2 gap-1">
              <div className="flex-shrink-0 select-none" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                <span className="text-lg font-black tracking-wider" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#fff', textShadow: '0 0 4px #fff, 0 0 8px #fff, 0 0 16px #22d3ee, 0 0 32px #22d3ee, 0 0 48px #22d3ee' }}>DEA</span>
                <span className="text-lg font-black tracking-wider" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#fff', textShadow: '0 0 4px #fff, 0 0 8px #fff, 0 0 16px #a855f7, 0 0 32px #a855f7, 0 0 48px #a855f7' }}>DBL</span>
                <span className="text-lg font-black tracking-wider" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#fff', textShadow: '0 0 4px #fff, 0 0 8px #fff, 0 0 16px #ec4899, 0 0 32px #ec4899, 0 0 48px #ec4899' }}>OCK</span>
              </div>
              <GameBoard
                ref={boardRef}
                board={board}
                boardPieces={boardPieces}
                selectedPiece={selectedPiece}
                pendingMove={pendingMove}
                rotation={rotation}
                flipped={flipped}
                onCellClick={handleCellClick}
                currentPlayer={currentPlayer}
                gameOver={gameOver}
                gameMode="puzzle"
                onPendingPieceDragStart={handleBoardDragStart}
                isDragging={isDragging}
                dragPreviewCell={dragPreviewCell}
                draggedPiece={draggedPiece}
                dragRotation={rotation}
                dragFlipped={flipped}
                customColors={{
                  1: 'bg-gradient-to-br from-red-400 to-rose-500',
                  2: 'bg-gradient-to-br from-rose-400 to-pink-500',
                }}
                confirmFlashCells={confirmFlashCells}
              />
              <div className="text-lg font-black tracking-wider select-none flex-shrink-0" style={{
                writingMode: 'vertical-rl',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                color: '#fff',
                textShadow: '0 0 4px #fff, 0 0 8px #fff, 0 0 16px #ef4444, 0 0 32px #ef4444, 0 0 48px #ef4444'
              }}>WEEKLY CHALLENGE</div>
            </div>
            
            {/* Off-grid indicator - shows when piece extends beyond board */}
            {isPieceOffGrid && pendingMove && !isDragging && (
              <div className="flex justify-center mb-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-900/60 border border-amber-500/50 rounded-lg">
                  <Move size={14} className="text-amber-400" />
                  <span className="text-amber-300 text-xs font-bold">Use D-Pad to reposition</span>
                </div>
              </div>
            )}
            
            {/* D-Pad for moving pieces */}
            {pendingMove && !isDragging && (
              <div className="flex justify-center mb-3">
                <DPad onMove={movePendingPiece} />
              </div>
            )}
            
            {/* Control Buttons - Above Piece Tray */}
            <div className="flex gap-1 mb-2">
              <GlowOrbButton onClick={handleGoToMenu} color="orange" className="flex-1">
                <Home size={14} />
              </GlowOrbButton>
              <GlowOrbButton onClick={rotatePiece} disabled={!selectedPiece && !pendingMove} color="cyan" className="flex-1">
                Rotate
              </GlowOrbButton>
              <GlowOrbButton onClick={flipPiece} disabled={!selectedPiece && !pendingMove} color="purple" className="flex-1">
                Flip
              </GlowOrbButton>
              <GlowOrbButton onClick={handleRestart} color="slate" className="flex-1">
                Reset
              </GlowOrbButton>
            </div>
            
            {/* Confirm/Cancel Controls */}
            {pendingMove && (
              <div className="flex gap-2 justify-center mb-2">
                <GlowOrbButton onClick={cancelMove} color="red" className="flex-1">
                  Cancel
                </GlowOrbButton>
                <GlowOrbButton
                  onClick={handleConfirmMove}
                  disabled={!pendingMove || !(() => {
                    const coords = getPieceCoords(pendingMove.piece, rotation, flipped);
                    return canPlacePiece(board, pendingMove.row, pendingMove.col, coords);
                  })()}
                  color="green"
                  className="flex-1"
                >
                  Confirm
                </GlowOrbButton>
              </div>
            )}
          </div>
          
          {/* Piece Tray */}
          <PieceTray
            usedPieces={usedPieces}
            selectedPiece={selectedPiece}
            pendingMove={pendingMove}
            gameOver={gameOver}
            gameMode="puzzle"
            currentPlayer={currentPlayer}
            onSelectPiece={selectPiece}
            createDragHandlers={createDragHandlers}
            isDragging={isDragging}
            draggedPiece={draggedPiece}
          />
        </div>
        
        {/* Bottom padding for scroll */}
        <div className="h-8 flex-shrink-0" />
      </div>
      
      {/* Success Overlay */}
      {gameComplete && (
        <SuccessOverlay
          completionTime={completionTime}
          firstAttemptTime={firstAttemptTime}
          bestTime={bestTime}
          wasFirstAttempt={wasFirstAttempt}
          rank={currentRank}
          onViewLeaderboard={handleViewLeaderboard}
          onPlayAgain={handleRestart}
          onMenu={onMenu}
        />
      )}
      
      {/* Lose Overlay */}
      {gameLost && (
        <LoseOverlay
          elapsedMs={elapsedMs}
          attemptCount={attemptCount}
          isFirstAttempt={isFirstAttempt}
          onRetry={handleRetryAfterLoss}
          onMenu={onMenu}
        />
      )}
      </div>{/* end inner scroll child */}
    </div>
  );
};

export default WeeklyChallengeScreen;
