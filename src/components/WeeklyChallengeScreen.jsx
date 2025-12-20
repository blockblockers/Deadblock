// Weekly Challenge Screen - Timed puzzle gameplay for weekly challenges
// UPDATED: Added full drag and drop support from piece tray and board
import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, Trophy, ArrowLeft, RotateCcw, Play, CheckCircle, X } from 'lucide-react';
import GameBoard from './GameBoard';
import PieceTray from './PieceTray';
import ControlButtons from './ControlButtons';
import DPad from './DPad';
import DragOverlay from './DragOverlay';
import { useGameState } from '../hooks/useGameState';
import { soundManager } from '../utils/soundManager';
import { weeklyChallengeService } from '../services/weeklyChallengeService';
import { useAuth } from '../contexts/AuthContext';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { getSeededPuzzle } from '../utils/puzzleGenerator';
import { PUZZLE_DIFFICULTY } from '../utils/puzzleGenerator';
import { getPieceCoords, canPlacePiece, BOARD_SIZE } from '../utils/gameLogic';

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

const WeeklyChallengeScreen = ({ challenge, onMenu, onLeaderboard }) => {
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
  
  // Refs
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const boardRef = useRef(null);
  const boardBoundsRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const hasDragStartedRef = useRef(false);
  
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
      
      if (valid && setPendingMove) {
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
  }, [draggedPiece, rotation, flipped, board, calculateBoardCell, setPendingMove]);

  // End drag - either place piece or cancel
  const endDrag = useCallback(() => {
    if (isValidDrop && pendingMove) {
      // Keep pending move for confirmation
      selectPiece(pendingMove.piece);
    } else {
      // Cancel if invalid drop
      if (setPendingMove) setPendingMove(null);
    }
    
    setIsDragging(false);
    setDraggedPiece(null);
    setIsValidDrop(false);
    hasDragStartedRef.current = false;
    
    // Re-enable scroll
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  }, [isValidDrop, pendingMove, selectPiece, setPendingMove]);

  // Create drag handlers for piece tray
  const createDragHandlers = useCallback((piece) => {
    if (gameOver || usedPieces.includes(piece) || !gameStarted) return {};

    const getClientPos = (e) => {
      if (e.touches && e.touches[0]) {
        return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
      }
      return { clientX: e.clientX, clientY: e.clientY };
    };

    const handleStart = (e) => {
      const { clientX, clientY } = getClientPos(e);
      dragStartRef.current = { x: clientX, y: clientY };
      hasDragStartedRef.current = false;
      
      // Update board bounds
      if (boardRef.current) {
        boardBoundsRef.current = boardRef.current.getBoundingClientRect();
      }
    };

    const handleMove = (e) => {
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
        selectPiece(piece);
        if (setPendingMove) setPendingMove(null);
        setDragOffset({ x: 0, y: 0 });
        
        // Prevent scroll while dragging
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';
        
        if (e.cancelable) {
          e.preventDefault();
        }
        
        soundManager.playPieceSelect();
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
  }, [gameOver, usedPieces, gameStarted, rotation, flipped, selectPiece, setPendingMove, updateDrag, endDrag]);

  // Handle dragging from board (moving pending piece)
  const handleBoardDragStart = useCallback((piece, clientX, clientY, elementRect) => {
    if (gameOver || !gameStarted) return;
    if (!pendingMove || pendingMove.piece !== piece) return;
    
    // Clear the pending move (piece is being "picked up")
    if (setPendingMove) {
      setPendingMove(null);
    }
    
    // Update board bounds
    if (boardRef.current) {
      boardBoundsRef.current = boardRef.current.getBoundingClientRect();
    }
    
    // Calculate offset from center of element
    const offsetX = clientX - (elementRect.left + elementRect.width / 2);
    const offsetY = clientY - (elementRect.top + elementRect.height / 2);
    
    setIsDragging(true);
    setDraggedPiece(piece);
    setDragPosition({ x: clientX, y: clientY });
    setDragOffset({ x: offsetX, y: offsetY });
    hasDragStartedRef.current = true;
    
    // Prevent scroll while dragging
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    
    soundManager.playPieceSelect();
  }, [gameOver, gameStarted, pendingMove, setPendingMove]);

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
        console.log('[WeeklyChallengeScreen] Loading puzzle with seed:', seed);
        
        const puzzleData = await getSeededPuzzle(seed, PUZZLE_DIFFICULTY.HARD);
        
        if (puzzleData) {
          console.log('[WeeklyChallengeScreen] Puzzle loaded successfully');
          setPuzzle(puzzleData);
        } else {
          console.error('[WeeklyChallengeScreen] Puzzle generation returned null');
          setLoadError('Failed to generate puzzle. Please try again.');
        }
        
        const { data: existingResult } = await weeklyChallengeService.getUserResult(challenge.id);
        if (existingResult) {
          setFirstAttemptTime(existingResult.first_attempt_time_ms);
          setBestTime(existingResult.best_time_ms || existingResult.completion_time_ms);
          setIsFirstAttempt(false);
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
      setElapsedMs(accumulatedMs + (Date.now() - startTimeRef.current));
    }, 10);
  }, [accumulatedMs]);
  
  // Stop the timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const sessionTime = Date.now() - startTimeRef.current;
    return accumulatedMs + sessionTime;
  }, [accumulatedMs]);
  
  // Pause the timer
  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const sessionTime = Date.now() - startTimeRef.current;
    setAccumulatedMs(prev => prev + sessionTime);
    return accumulatedMs + sessionTime;
  }, [accumulatedMs]);
  
  // Start the game
  const handleStartGame = useCallback(() => {
    if (!puzzle) {
      console.error('[WeeklyChallengeScreen] Cannot start game - puzzle is null');
      setLoadError('Puzzle not loaded. Please go back and try again.');
      return;
    }
    
    console.log('[WeeklyChallengeScreen] Starting game with puzzle');
    loadPuzzle(puzzle);
    setGameStarted(true);
    startTimer();
    soundManager.playClickSound('success');
  }, [puzzle, loadPuzzle, startTimer]);
  
  // Check for puzzle completion
  useEffect(() => {
    if (gameStarted && gameOver) {
      if (winner === 1) {
        const finalTime = stopTimer();
        setCompletionTime(finalTime);
        setWasFirstAttempt(isFirstAttempt);
        setGameComplete(true);
        soundManager.playPuzzleSolvedSound();
        submitResult(finalTime);
      } else if (winner === 2) {
        pauseTimer();
        setGameLost(true);
        setAttemptCount(prev => prev + 1);
        soundManager.playGameOver();
      }
    }
  }, [gameOver, winner, gameStarted, stopTimer, pauseTimer, isFirstAttempt]);
  
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
    resetCurrentPuzzle();
    setGameLost(false);
    startTimer();
    soundManager.playClickSound('success');
  }, [resetCurrentPuzzle, startTimer]);
  
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
        <div className="bg-slate-900 rounded-xl p-6 max-w-sm w-full border border-red-500/30 text-center">
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
            <ArrowLeft size={18} />
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
          piece={draggedPiece}
          rotation={rotation}
          flipped={flipped}
          position={dragPosition}
          offset={dragOffset}
          isValidDrop={isValidDrop}
        />
      )}
      
      {/* Content */}
      <div className="relative min-h-screen flex flex-col items-center px-2 py-4">
        <div className="w-full max-w-lg">
          
          {/* Header with Timer */}
          <div className="flex items-center justify-between mb-4 px-2">
            <button
              onClick={() => { soundManager.playButtonClick(); onMenu(); }}
              className="p-2 text-slate-400 hover:text-slate-300 transition-colors"
            >
              <X size={24} />
            </button>
            
            <TimerDisplay elapsedMs={elapsedMs} isPaused={false} />
            
            <button
              onClick={handleRestart}
              className="p-2 text-slate-400 hover:text-red-300 transition-colors"
            >
              <RotateCcw size={20} />
            </button>
          </div>
          
          {/* Game Board */}
          <div className="flex justify-center mb-3">
            <div ref={boardRef}>
              <GameBoard
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
              />
            </div>
          </div>
          
          {/* D-Pad for moving pieces */}
          {pendingMove && !isDragging && (
            <div className="flex justify-center mb-3">
              <DPad onMove={movePendingPiece} />
            </div>
          )}
          
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
          
          {/* Controls */}
          <ControlButtons
            selectedPiece={selectedPiece}
            pendingMove={pendingMove}
            canConfirm={!!pendingMove}
            gameOver={gameOver}
            gameMode="puzzle"
            currentPlayer={currentPlayer}
            isGeneratingPuzzle={false}
            onRotate={rotatePiece}
            onFlip={flipPiece}
            onConfirm={confirmMove}
            onCancel={cancelMove}
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
    </div>
  );
};

export default WeeklyChallengeScreen;
