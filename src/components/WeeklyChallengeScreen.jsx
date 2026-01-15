// Weekly Challenge Screen - Timed puzzle gameplay for weekly challenges
// UPDATED: Added full drag and drop support from piece tray and board
// UPDATED: Controls moved above piece tray, dynamic timer colors, removed duplicate home button
// v7.13: Updated to use consistent GlowOrbButton styling
import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, Trophy, Play, CheckCircle, X, Home, RotateCw, FlipHorizontal } from 'lucide-react';
import GameBoard from './GameBoard';
import PieceTray from './PieceTray';
import DPad from './DPad';
import DragOverlay from './DragOverlay';
import NeonTitle from './NeonTitle';
import { useGameState } from '../hooks/useGameState';
import { soundManager } from '../utils/soundManager';
import { weeklyChallengeService } from '../services/weeklyChallengeService';
import { useAuth } from '../contexts/AuthContext';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { getSeededPuzzle } from '../utils/puzzleGenerator';
import { PUZZLE_DIFFICULTY } from '../utils/puzzleGenerator';
import { getPieceCoords, canPlacePiece, BOARD_SIZE } from '../utils/gameLogic';

// Glow Orb Button Component - consistent styling across ALL game screens
const GlowOrbButton = ({ onClick, disabled, children, color = 'cyan', className = '', title = '' }) => {
  const colorClasses = {
    cyan: 'from-cyan-500 to-blue-600 shadow-[0_0_15px_rgba(34,211,238,0.4)] hover:shadow-[0_0_25px_rgba(34,211,238,0.6)]',
    amber: 'from-amber-500 to-orange-600 shadow-[0_0_15px_rgba(251,191,36,0.4)] hover:shadow-[0_0_25px_rgba(251,191,36,0.6)]',
    orange: 'from-orange-500 to-amber-600 shadow-[0_0_15px_rgba(249,115,22,0.4)] hover:shadow-[0_0_25px_rgba(249,115,22,0.6)]',
    green: 'from-green-500 to-emerald-600 shadow-[0_0_15px_rgba(34,197,94,0.4)] hover:shadow-[0_0_25px_rgba(34,197,94,0.6)]',
    red: 'from-red-500 to-rose-600 shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:shadow-[0_0_25px_rgba(239,68,68,0.6)]',
    rose: 'from-rose-500 to-red-600 shadow-[0_0_15px_rgba(244,63,94,0.4)] hover:shadow-[0_0_25px_rgba(244,63,94,0.6)]',
    purple: 'from-purple-500 to-violet-600 shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)]',
    indigo: 'from-indigo-500 to-blue-600 shadow-[0_0_15px_rgba(99,102,241,0.4)] hover:shadow-[0_0_25px_rgba(99,102,241,0.6)]',
    blue: 'from-blue-500 to-indigo-600 shadow-[0_0_15px_rgba(59,130,246,0.4)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)]',
    yellow: 'from-yellow-400 to-amber-500 shadow-[0_0_15px_rgba(250,204,21,0.4)] hover:shadow-[0_0_25px_rgba(250,204,21,0.6)]',
    slate: 'from-slate-600 to-slate-700 shadow-[0_0_10px_rgba(100,116,139,0.3)] hover:shadow-[0_0_15px_rgba(100,116,139,0.5)]',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
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
            {wasFirstAttempt ? 'PRACTICE RUN' : 'TRY AGAIN'}
          </button>
          
          <button
            onClick={onMenu}
            className="w-full p-3 rounded-xl font-bold bg-slate-800/50 text-slate-400 hover:text-slate-300 transition-all flex items-center justify-center gap-2"
          >
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
              <div className="text-slate-500 text-xs mt-1">Attempt #{attemptCount + 1}</div>
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
            RETRY (TIMER CONTINUES)
          </button>
          
          <button
            onClick={onMenu}
            className="w-full p-3 rounded-xl font-bold bg-slate-800/50 text-slate-400 hover:text-slate-300 transition-all flex items-center justify-center gap-2"
          >
            GIVE UP
          </button>
        </div>
      </div>
    </div>
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
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isValidDrop, setIsValidDrop] = useState(false);
  const [dragPreviewCell, setDragPreviewCell] = useState(null);
  const [pieceCellOffset, setPieceCellOffset] = useState({ row: 0, col: 0 });
  
  // Refs
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
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
  } = useGameState();
  
  // =========================================================================
  // DRAG AND DROP HANDLERS
  // =========================================================================
  
  const DRAG_THRESHOLD = 8;
  const SCROLL_ANGLE_THRESHOLD = 60;
  
  // Track which cell of the piece is under the finger
  const pieceCellOffsetRef = useRef({ row: 0, col: 0 });
  
  // Refs for global touch handlers
  const globalTouchHandlersRef = useRef({ move: null, end: null, cancel: null });
  
  // Refs to store latest callback functions
  const updateDragRef = useRef(null);
  const endDragRef = useRef(null);
  
  // CRITICAL: Use ref for isDragging to avoid stale closure issues
  const isDraggingRef = useRef(false);
  const draggedPieceRef = useRef(null);
  const dragCellRef = useRef(null);
  
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
  const calculateBoardCell = useCallback((clientX, clientY) => {
    if (!boardBoundsRef.current) return null;
    
    const { left, top, width, height } = boardBoundsRef.current;
    const cellWidth = width / BOARD_SIZE;
    const cellHeight = height / BOARD_SIZE;
    
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const fingerOffset = isMobile ? 40 : 20;
    
    const relX = clientX - left;
    const relY = (clientY - fingerOffset) - top;
    
    const fingerCol = Math.floor(relX / cellWidth);
    const fingerRow = Math.floor(relY / cellHeight);
    
    const col = fingerCol - pieceCellOffsetRef.current.col;
    const row = fingerRow - pieceCellOffsetRef.current.row;
    
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
    if (move) window.removeEventListener('touchmove', move, { capture: true });
    if (end) window.removeEventListener('touchend', end, { capture: true });
    if (cancel) window.removeEventListener('touchcancel', cancel, { capture: true });
    globalTouchHandlersRef.current = { move: null, end: null, cancel: null };
  }, []);

  // Attach global touch handlers SYNCHRONOUSLY
  const attachGlobalTouchHandlers = useCallback(() => {
    detachGlobalTouchHandlers();
    
    const handleTouchMove = (e) => {
      if (e.touches && e.touches[0]) {
        updateDragRef.current?.(e.touches[0].clientX, e.touches[0].clientY);
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {
      endDragRef.current?.();
    };
    
    const handleTouchCancel = () => {
      endDragRef.current?.();
    };

    globalTouchHandlersRef.current = { move: handleTouchMove, end: handleTouchEnd, cancel: handleTouchCancel };
    window.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    window.addEventListener('touchend', handleTouchEnd, { capture: true });
    window.addEventListener('touchcancel', handleTouchCancel, { capture: true });
  }, [detachGlobalTouchHandlers]);
  
  // Update drag position
  const updateDrag = useCallback((clientX, clientY) => {
    if (!isDraggingRef.current || !draggedPieceRef.current) return;
    
    setDragPosition({ x: clientX, y: clientY });
    
    if (boardRef.current) {
      boardBoundsRef.current = boardRef.current.getBoundingClientRect();
    }
    
    const cell = calculateBoardCell(clientX, clientY);
    dragCellRef.current = cell;
    
    if (cell) {
      setDragPreviewCell(cell);
      const coords = getPieceCoords(draggedPieceRef.current, rotation, flipped);
      const valid = canPlacePiece(board, cell.row, cell.col, coords);
      setIsValidDrop(valid);
    } else {
      setDragPreviewCell(null);
      setIsValidDrop(false);
    }
  }, [rotation, flipped, board, calculateBoardCell]);
  
  // End drag
  // End drag - FIXED: Always cleanup state even if drag ended off-board
  const endDrag = useCallback(() => {
    // Track if we were actually dragging (for piece placement)
    const wasDragging = isDraggingRef.current || hasDragStartedRef.current;
    
    // Always detach handlers
    detachGlobalTouchHandlers();
    
    // Only try to place piece if we were actually dragging
    if (wasDragging) {
      const cell = dragCellRef.current;
      const piece = draggedPieceRef.current;
      
      if (cell && piece) {
        const coords = getPieceCoords(piece, rotation, flipped);
        const valid = canPlacePiece(board, cell.row, cell.col, coords);
        
        if (valid || (cell.row >= 0 && cell.col >= 0)) {
          setPendingMove({ piece, row: cell.row, col: cell.col });
          if (valid) {
            soundManager.playSound('place');
          }
        }
      }
    }
    
    // CRITICAL: Always reset ALL drag state to prevent stuck drags
    isDraggingRef.current = false;
    draggedPieceRef.current = null;
    dragCellRef.current = null;
    hasDragStartedRef.current = false;
    pieceCellOffsetRef.current = { row: 0, col: 0 };
    
    setIsDragging(false);
    setDraggedPiece(null);
    setDragPosition({ x: 0, y: 0 });
    setDragOffset({ x: 0, y: 0 });
    setIsValidDrop(false);
    setDragPreviewCell(null);
    setPieceCellOffset({ row: 0, col: 0 });
    
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  }, [rotation, flipped, board, detachGlobalTouchHandlers, setPendingMove]);
  
  // Keep refs updated
  useEffect(() => {
    updateDragRef.current = updateDrag;
    endDragRef.current = endDrag;
  }, [updateDrag, endDrag]);
  
  // Create drag handlers for piece tray
  const createDragHandlers = useCallback((piece) => {
    if (gameOver || !gameStarted) return {};
    if (usedPieces.includes(piece)) return {};
    
    const handleTouchStart = (e) => {
      if (hasDragStartedRef.current) return;
      if (!e.touches || e.touches.length === 0) return;
      
      const touch = e.touches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      
      hasDragStartedRef.current = true;
      isDraggingRef.current = true;
      draggedPieceRef.current = piece;
      
      attachGlobalTouchHandlers();
      
      const touchedCell = calculateTouchedPieceCell(piece, touch.clientX, touch.clientY, rect, rotation, flipped);
      pieceCellOffsetRef.current = touchedCell;
      setPieceCellOffset(touchedCell);
      
      if (boardRef.current) {
        boardBoundsRef.current = boardRef.current.getBoundingClientRect();
      }
      
      const offsetX = rect ? touch.clientX - (rect.left + rect.width / 2) : 0;
      const offsetY = rect ? touch.clientY - (rect.top + rect.height / 2) : 0;
      
      setDraggedPiece(piece);
      setDragPosition({ x: touch.clientX, y: touch.clientY });
      setDragOffset({ x: offsetX, y: offsetY });
      setIsDragging(true);
      
      selectPiece(piece);
      
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    };
    
    const handleMouseDown = (e) => {
      if (hasDragStartedRef.current) return;
      
      const rect = e.currentTarget.getBoundingClientRect();
      
      hasDragStartedRef.current = true;
      isDraggingRef.current = true;
      draggedPieceRef.current = piece;
      
      const touchedCell = calculateTouchedPieceCell(piece, e.clientX, e.clientY, rect, rotation, flipped);
      pieceCellOffsetRef.current = touchedCell;
      setPieceCellOffset(touchedCell);
      
      if (boardRef.current) {
        boardBoundsRef.current = boardRef.current.getBoundingClientRect();
      }
      
      const offsetX = rect ? e.clientX - (rect.left + rect.width / 2) : 0;
      const offsetY = rect ? e.clientY - (rect.top + rect.height / 2) : 0;
      
      setDraggedPiece(piece);
      setDragPosition({ x: e.clientX, y: e.clientY });
      setDragOffset({ x: offsetX, y: offsetY });
      setIsDragging(true);
      
      selectPiece(piece);
      
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    };
    
    return {
      onTouchStart: handleTouchStart,
      onMouseDown: handleMouseDown,
    };
  }, [gameOver, gameStarted, usedPieces, rotation, flipped, selectPiece, calculateTouchedPieceCell, attachGlobalTouchHandlers]);
  
  // Handle drag from board
  const handleBoardDragStart = useCallback((piece, clientX, clientY, elementRect) => {
    if (hasDragStartedRef.current) return;
    if (gameOver || !gameStarted) return;
    if (!pendingMove || pendingMove.piece !== piece) return;
    
    hasDragStartedRef.current = true;
    isDraggingRef.current = true;
    draggedPieceRef.current = piece;
    
    attachGlobalTouchHandlers();
    
    if (boardRef.current) {
      boardBoundsRef.current = boardRef.current.getBoundingClientRect();
    }
    
    if (pendingMove && boardBoundsRef.current) {
      const { left, top, width, height } = boardBoundsRef.current;
      const cellWidth = width / BOARD_SIZE;
      const cellHeight = height / BOARD_SIZE;
      
      const fingerCol = Math.floor((clientX - left) / cellWidth);
      const fingerRow = Math.floor((clientY - top) / cellHeight);
      
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
    
    const offsetX = elementRect ? clientX - (elementRect.left + elementRect.width / 2) : 0;
    const offsetY = elementRect ? clientY - (elementRect.top + elementRect.height / 2) : 0;
    
    setDraggedPiece(piece);
    setDragPosition({ x: clientX, y: clientY });
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
    
    selectPiece(piece);
    
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }, [gameOver, gameStarted, pendingMove, selectPiece, attachGlobalTouchHandlers]);
  
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
      
      try {
        // Generate deterministic puzzle from challenge seed
        const seed = challenge.puzzle_seed || challenge.id;
        const difficulty = challenge.difficulty || PUZZLE_DIFFICULTY.MEDIUM;
        const puzzleData = getSeededPuzzle(seed, difficulty);
        
        if (!puzzleData) {
          throw new Error('Failed to generate puzzle');
        }
        
        setPuzzle(puzzleData);
        
        // Load puzzle into game state
        loadPuzzle(puzzleData);
        
        // Check user's existing result
        if (profile?.id) {
          try {
            const result = await weeklyChallengeService.getUserResult(challenge.id, profile.id);
            if (result) {
              setFirstAttemptTime(result.first_attempt_time_ms);
              setBestTime(result.best_time_ms);
              setIsFirstAttempt(false);
            }
          } catch (err) {
            console.log('[WeeklyChallengeScreen] No existing result found');
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('[WeeklyChallengeScreen] Error loading puzzle:', err);
        setLoadError('Failed to load weekly challenge. Please try again.');
        setLoading(false);
      }
    };
    
    loadWeeklyPuzzle();
  }, [challenge, profile?.id, loadPuzzle]);
  
  // Timer logic
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    startTimeRef.current = Date.now();
    
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setElapsedMs(accumulatedMs + elapsed);
    }, 10);
  }, [accumulatedMs]);
  
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return elapsedMs;
  }, [elapsedMs]);
  
  // Handle game completion
  useEffect(() => {
    if (!gameStarted || gameComplete || gameLost) return;
    
    if (gameOver && winner === 1) {
      // Player won
      const finalTime = stopTimer();
      setCompletionTime(finalTime);
      setWasFirstAttempt(isFirstAttempt);
      
      // Submit result
      if (profile?.id && challenge?.id) {
        weeklyChallengeService.submitResult(challenge.id, profile.id, finalTime, isFirstAttempt)
          .then(result => {
            if (result && result.rank) {
              setCurrentRank(result.rank);
            }
            if (isFirstAttempt) {
              setFirstAttemptTime(finalTime);
            }
            if (!bestTime || finalTime < bestTime) {
              setBestTime(finalTime);
            }
          })
          .catch(err => console.error('[WeeklyChallengeScreen] Error submitting result:', err));
      }
      
      setIsFirstAttempt(false);
      setGameComplete(true);
      soundManager.playSound('win');
    } else if (gameOver && winner === 2) {
      // AI won (player lost)
      setGameLost(true);
      soundManager.playSound('lose');
    }
  }, [gameOver, winner, gameStarted, gameComplete, gameLost, stopTimer, isFirstAttempt, profile?.id, challenge?.id, bestTime]);
  
  // Handle start game
  const handleStartGame = () => {
    soundManager.playButtonClick();
    setGameStarted(true);
    startTimer();
  };
  
  // Handle retry after loss
  const handleRetryAfterLoss = useCallback(() => {
    soundManager.playButtonClick();
    setAccumulatedMs(elapsedMs);
    setAttemptCount(prev => prev + 1);
    resetCurrentPuzzle();
    setGameLost(false);
    startTimer();
  }, [elapsedMs, resetCurrentPuzzle, startTimer]);
  
  // Full restart
  const handleRestart = useCallback(() => {
    resetCurrentPuzzle();
    setGameComplete(false);
    setGameLost(false);
    setCompletionTime(null);
    setWasFirstAttempt(false);
    setElapsedMs(0);
    setAccumulatedMs(0);
    setAttemptCount(0);
    setGameStarted(false);
  }, [resetCurrentPuzzle]);
  
  // View leaderboard
  const handleViewLeaderboard = () => {
    soundManager.playButtonClick();
    onLeaderboard(challenge);
  };
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  // =========================================================================
  // RENDER
  // =========================================================================
  
  // Calculate canConfirm for the control buttons
  const canConfirm = pendingMove ? canPlacePiece(board, pendingMove.row, pendingMove.col, getPieceCoords(pendingMove.piece, rotation, flipped)) : false;
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="fixed inset-0 opacity-20 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(239,68,68,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-red-300">Loading weekly challenge...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="fixed inset-0 opacity-20 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(239,68,68,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        <div className="bg-slate-900 rounded-2xl p-6 max-w-sm w-full border border-red-500/30 text-center">
          <X size={48} className="text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-red-300 mb-2">Error</h2>
          <p className="text-slate-400 mb-4">{loadError}</p>
          <button
            onClick={() => { soundManager.playButtonClick(); onMenu(); }}
            className="px-6 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-all"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }
  
  // Pre-game screen
  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="fixed inset-0 opacity-20 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(239,68,68,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        
        <div className="bg-slate-900 rounded-2xl p-6 max-w-sm w-full border border-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.2)]">
          <div className="text-center mb-6">
            <Trophy size={48} className="text-red-400 mx-auto mb-3" />
            <h2 className="text-2xl font-black text-red-300">WEEK {challenge?.week_number || '?'}</h2>
            <p className="text-slate-400 mt-2">Weekly Challenge</p>
          </div>
          
          {/* Stats */}
          {(firstAttemptTime || bestTime) && (
            <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-slate-500 text-xs uppercase mb-1">First Time</div>
                  <div className="text-lg font-bold text-white">
                    {weeklyChallengeService.formatTime(firstAttemptTime)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs uppercase mb-1">Best Time</div>
                  <div className="text-lg font-bold text-amber-400">
                    {weeklyChallengeService.formatTime(bestTime)}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {isFirstAttempt ? (
            <p className="text-amber-400 text-sm text-center mb-4">
              ⭐ Your first completion time counts for the leaderboard!
            </p>
          ) : (
            <p className="text-slate-500 text-xs text-center mb-4">
              Practice mode - try to beat your best time!
            </p>
          )}
          
          <button
            onClick={handleStartGame}
            className="w-full p-4 rounded-xl font-black text-lg bg-gradient-to-r from-red-500 to-rose-600 text-white hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(239,68,68,0.5)]"
          >
            <Play size={24} />
            {isFirstAttempt ? 'START CHALLENGE' : 'PRACTICE RUN'}
          </button>
          
          <button
            onClick={() => { soundManager.playButtonClick(); onMenu(); }}
            className="w-full mt-3 p-3 rounded-xl font-bold text-slate-400 hover:text-slate-300 transition-all flex items-center justify-center gap-2"
          >
            Back
          </button>
        </div>
      </div>
    );
  }
  
  // Game in progress
  return (
    <div 
      className="min-h-screen bg-slate-950"
      style={{ 
        overflowY: 'auto', 
        overflowX: 'hidden', 
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
        touchAction: isDragging ? 'none' : 'pan-y'
      }}
    >
      {/* Background */}
      <div className="fixed inset-0 opacity-20 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(239,68,68,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.3) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />
      
      {/* Drag Overlay */}
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
      
      {/* Content */}
      <div className="relative min-h-screen flex flex-col items-center px-2 py-4">
        <div className="w-full max-w-md">
          
          {/* Header with Title and Timer */}
          <div className="flex items-center justify-between mb-2 px-2">
            {/* Spacer for symmetry */}
            <div className="w-16" />
            
            <div className="text-center flex-1 mx-2">
              <NeonTitle text="DEADBLOCK" size="medium" color="red" />
              <div className="text-red-400/80 text-[10px] font-bold tracking-[0.3em] uppercase mt-0">
                WEEKLY CHALLENGE
              </div>
            </div>
            
            {/* Compact Timer Display with Dynamic Colors */}
            {(() => {
              const totalSeconds = Math.floor(elapsedMs / 1000);
              let timerColor, timerGlow, borderColor, bgGradient, iconColor;
              
              if (totalSeconds < 30) {
                timerColor = '#67e8f9';
                timerGlow = 'rgba(34,211,238,0.9)';
                borderColor = 'border-cyan-500/50';
                bgGradient = 'from-slate-900/95 to-cyan-950/40';
                iconColor = 'text-cyan-400';
              } else if (totalSeconds < 60) {
                timerColor = '#86efac';
                timerGlow = 'rgba(74,222,128,0.9)';
                borderColor = 'border-green-500/50';
                bgGradient = 'from-slate-900/95 to-green-950/40';
                iconColor = 'text-green-400';
              } else if (totalSeconds < 120) {
                timerColor = '#fde047';
                timerGlow = 'rgba(250,204,21,0.9)';
                borderColor = 'border-yellow-500/50';
                bgGradient = 'from-slate-900/95 to-yellow-950/40';
                iconColor = 'text-yellow-400';
              } else if (totalSeconds < 180) {
                timerColor = '#fdba74';
                timerGlow = 'rgba(251,146,60,0.9)';
                borderColor = 'border-orange-500/50';
                bgGradient = 'from-slate-900/95 to-orange-950/40';
                iconColor = 'text-orange-400';
              } else {
                timerColor = '#fca5a5';
                timerGlow = 'rgba(239,68,68,0.9)';
                borderColor = 'border-red-500/50';
                bgGradient = 'from-slate-900/95 to-red-950/40';
                iconColor = 'text-red-400';
              }
              
              return (
                <div 
                  className={`relative px-3 py-1.5 rounded-xl border ${borderColor} bg-gradient-to-br ${bgGradient} shadow-lg transition-all duration-500`}
                  style={{ 
                    boxShadow: `0 0 20px ${timerGlow.replace('0.9', '0.3')}, inset 0 0 15px ${timerGlow.replace('0.9', '0.1')}`
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div 
                        className="absolute inset-0 rounded-full blur-sm transition-all duration-500"
                        style={{ background: timerGlow.replace('0.9', '0.4') }}
                      />
                      <Clock size={18} className={`relative ${iconColor} transition-colors duration-500`} />
                      {elapsedMs > 0 && (
                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.8)]" />
                      )}
                    </div>
                    
                    <div className="flex items-baseline gap-0.5">
                      <span 
                        className="text-xl font-mono font-black tracking-tight tabular-nums transition-all duration-500"
                        style={{ 
                          color: timerColor,
                          textShadow: `0 0 12px ${timerGlow}, 0 0 25px ${timerGlow.replace('0.9', '0.5')}, 0 0 40px ${timerGlow.replace('0.9', '0.3')}`
                        }}
                      >
                        {Math.floor(elapsedMs / 60000)}
                      </span>
                      <span 
                        className="text-xl font-mono font-black animate-pulse transition-colors duration-500"
                        style={{ 
                          color: timerColor,
                          textShadow: `0 0 8px ${timerGlow.replace('0.9', '0.8')}`
                        }}
                      >
                        :
                      </span>
                      <span 
                        className="text-xl font-mono font-black tracking-tight tabular-nums transition-all duration-500"
                        style={{ 
                          color: timerColor,
                          textShadow: `0 0 12px ${timerGlow}, 0 0 25px ${timerGlow.replace('0.9', '0.5')}, 0 0 40px ${timerGlow.replace('0.9', '0.3')}`
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
          
          {/* Game Board */}
          <div className="flex justify-center mb-3">
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
            />
          </div>
          
          {/* D-Pad for moving pieces */}
          {pendingMove && !isDragging && (
            <div className="flex justify-center mb-3">
              <DPad onMove={movePendingPiece} />
            </div>
          )}
          
          {/* Control Buttons - Consistent GlowOrbButton styling */}
          <div className="flex gap-2 justify-between mb-2 flex-wrap">
            {/* Menu Button - Orange with Home icon only */}
            <GlowOrbButton
              onClick={() => { soundManager.playButtonClick(); (onMainMenu || onMenu)(); }}
              color="orange"
              title="Back to menu"
            >
              <Home size={16} />
            </GlowOrbButton>
            
            {/* Rotate Button - Cyan */}
            <GlowOrbButton
              onClick={rotatePiece}
              disabled={!selectedPiece && !pendingMove}
              color="cyan"
              className="flex-1"
            >
              <RotateCw size={14} />ROTATE
            </GlowOrbButton>

            {/* Flip Button - Purple */}
            <GlowOrbButton
              onClick={flipPiece}
              disabled={!selectedPiece && !pendingMove}
              color="purple"
              className="flex-1"
            >
              <FlipHorizontal size={14} />FLIP
            </GlowOrbButton>
            
            {/* Retry Button - Yellow, no icon */}
            <GlowOrbButton
              onClick={handleRestart}
              color="yellow"
            >
              RETRY
            </GlowOrbButton>
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
          
          {/* Confirm/Cancel Controls - Only show when there's a pending move */}
          {pendingMove && (
            <div className="flex gap-2 justify-center mt-2">
              {/* Cancel - Rose, no icon */}
              <GlowOrbButton
                onClick={cancelMove}
                color="rose"
                className="flex-1 max-w-32"
              >
                CANCEL
              </GlowOrbButton>
              {/* Confirm - Green, no icon */}
              <GlowOrbButton
                onClick={confirmMove}
                disabled={!canConfirm}
                color="green"
                className="flex-1 max-w-32"
              >
                CONFIRM
              </GlowOrbButton>
            </div>
          )}
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
    </div>
  );
};

export default WeeklyChallengeScreen;
