// Weekly Challenge Screen - Timed puzzle gameplay for weekly challenges
// UPDATED: Added full drag and drop support from piece tray and board
// UPDATED: Controls moved above piece tray, dynamic timer colors, removed duplicate home button
import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, Trophy, ArrowLeft, RotateCcw, Play, CheckCircle, X, FlipHorizontal } from 'lucide-react';
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
  // DRAG AND DROP HANDLERS - FIXED WITH DIAGNOSTIC LOGGING
  // =========================================================================
  
  const DRAG_THRESHOLD = 8;
  const SCROLL_ANGLE_THRESHOLD = 60;

  // Helper function to start drag (consistent with OnlineGameScreen)
  const startDrag = useCallback((piece, clientX, clientY, elementRect) => {
    console.log('[WeeklyChallenge] startDrag called:', { piece, gameStarted, gameOver, usedPieces: usedPieces.includes(piece) });
    
    if (gameOver || usedPieces.includes(piece) || !gameStarted) {
      console.log('[WeeklyChallenge] startDrag blocked');
      return;
    }
    
    if (boardRef.current) {
      boardBoundsRef.current = boardRef.current.getBoundingClientRect();
      console.log('[WeeklyChallenge] Board bounds updated:', boardBoundsRef.current);
    }
    
    const offsetX = elementRect ? clientX - (elementRect.left + elementRect.width / 2) : 0;
    const offsetY = elementRect ? clientY - (elementRect.top + elementRect.height / 2) : 0;
    
    // Set state in correct order
    setDraggedPiece(piece);
    setDragPosition({ x: clientX, y: clientY });
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
    hasDragStartedRef.current = true;
    
    selectPiece(piece);
    if (setPendingMove) setPendingMove(null);
    
    soundManager.playPieceSelect();
    
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    
    console.log('[WeeklyChallenge] Drag started successfully for:', piece);
  }, [gameOver, usedPieces, gameStarted, selectPiece, setPendingMove]);
  
  // v7.9 FIX: Allow positions outside the grid for overflow placement
  const OVERFLOW_AMOUNT = 4; // Max pentomino extent from origin
  const MIN_POSITION = -OVERFLOW_AMOUNT;
  const MAX_POSITION = BOARD_SIZE - 1 + OVERFLOW_AMOUNT;
  
  // Calculate which board cell the drag position is over
  const calculateBoardCell = useCallback((clientX, clientY) => {
    if (!boardBoundsRef.current) return null;
    
    const { left, top, width, height } = boardBoundsRef.current;
    const cellWidth = width / BOARD_SIZE;
    const cellHeight = height / BOARD_SIZE;
    
    const relX = clientX - left;
    const relY = clientY - top;
    
    const col = Math.floor(relX / cellWidth);
    const row = Math.floor(relY / cellHeight);
    
    // Allow positions outside the grid bounds for overflow placement
    if (row >= MIN_POSITION && row <= MAX_POSITION && col >= MIN_POSITION && col <= MAX_POSITION) {
      return { row, col };
    }
    return null;
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

  // Keep current piece in ref to avoid stale closures
  const draggedPieceRef = useRef(null);
  
  useEffect(() => {
    draggedPieceRef.current = draggedPiece;
  }, [draggedPiece]);

  // End drag - either place piece or cancel
  const endDrag = useCallback(() => {
    const currentPiece = draggedPieceRef.current;
    console.log('[WeeklyChallenge] endDrag called:', { isDragging, draggedPiece: currentPiece });
    
    // Recompute validity based on current drag position
    if (currentPiece && dragPosition && boardBoundsRef.current) {
      const cell = calculateBoardCell(dragPosition.x, dragPosition.y);
      if (cell) {
        const coords = getPieceCoords(currentPiece, rotation, flipped);
        const valid = canPlacePiece(board, cell.row, cell.col, coords);
        
        console.log('[WeeklyChallenge] endDrag computed:', { cell, valid, piece: currentPiece });
        
        if (valid) {
          // Select piece first, then set pending move
          selectPiece(currentPiece);
          
          // Set pending move after piece is selected
          setTimeout(() => {
            setPendingMove({
              piece: currentPiece,
              row: cell.row,
              col: cell.col,
              coords
            });
            console.log('[WeeklyChallenge] Valid drop, pending move set for:', currentPiece);
          }, 10);
          
          soundManager.playPieceSelect();
        } else {
          // Invalid drop - clear
          setPendingMove(null);
          console.log('[WeeklyChallenge] Invalid drop position');
        }
      } else {
        // Outside board - clear
        setPendingMove(null);
        console.log('[WeeklyChallenge] Drop outside board');
      }
    }
    
    setIsDragging(false);
    setDraggedPiece(null);
    setIsValidDrop(false);
    hasDragStartedRef.current = false;
    
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  }, [dragPosition, rotation, flipped, board, calculateBoardCell, selectPiece, setPendingMove]);

  // Create drag handlers for piece tray - FIXED WITH LOGGING
  const createDragHandlers = useCallback((piece) => {
    console.log('[WeeklyChallenge] createDragHandlers called for:', piece, { 
      gameOver, 
      isUsed: usedPieces.includes(piece), 
      gameStarted 
    });
    
    if (gameOver || usedPieces.includes(piece) || !gameStarted) {
      console.log('[WeeklyChallenge] Returning empty handlers for:', piece);
      return {};
    }

    let startX = 0, startY = 0, elementRect = null, isDragGesture = false;
    let touchStartTime = 0;

    // Touch start - capture initial position
    const handleTouchStart = (e) => {
      console.log('[WeeklyChallenge] handleTouchStart for:', piece);
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      elementRect = e.currentTarget.getBoundingClientRect();
      isDragGesture = false;
      touchStartTime = Date.now();
      hasDragStartedRef.current = false;
      dragStartRef.current = { x: startX, y: startY };
      
      if (boardRef.current) {
        boardBoundsRef.current = boardRef.current.getBoundingClientRect();
      }
    };

    // Touch move - detect gesture type and start drag if appropriate
    const handleTouchMove = (e) => {
      const touch = e.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const elapsed = Date.now() - touchStartTime;
      
      // Determine if this is a drag gesture
      if (!isDragGesture && distance > DRAG_THRESHOLD) {
        const isHorizontalish = Math.abs(deltaX) > Math.abs(deltaY) * 0.5;
        
        if (isHorizontalish || elapsed < 150) {
          isDragGesture = true;
          console.log('[WeeklyChallenge] Recognized drag gesture');
        } else {
          console.log('[WeeklyChallenge] Detected vertical scroll, ignoring');
          return;
        }
      }
      
      // Start drag if gesture detected and threshold met
      if (isDragGesture && distance > DRAG_THRESHOLD && !hasDragStartedRef.current) {
        e.preventDefault();
        startDrag(piece, touch.clientX, touch.clientY, elementRect);
      }
      
      // Continue updating drag position
      if (hasDragStartedRef.current) {
        e.preventDefault();
        updateDrag(touch.clientX, touch.clientY);
      }
    };

    // Touch end
    const handleTouchEnd = () => {
      console.log('[WeeklyChallenge] handleTouchEnd, dragStarted:', hasDragStartedRef.current);
      if (hasDragStartedRef.current) {
        endDrag();
      }
      isDragGesture = false;
    };

    // Mouse down - immediate drag for desktop
    const handleMouseDown = (e) => {
      if (e.button !== 0) return;
      console.log('[WeeklyChallenge] handleMouseDown for:', piece);
      
      const rect = e.currentTarget.getBoundingClientRect();
      startDrag(piece, e.clientX, e.clientY, rect);
    };

    console.log('[WeeklyChallenge] Returning handlers for:', piece);
    return {
      onMouseDown: handleMouseDown,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    };
  }, [gameOver, usedPieces, gameStarted, startDrag, updateDrag, endDrag]);

  // Handle dragging from board (moving pending piece)
  const handleBoardDragStart = useCallback((piece, clientX, clientY, elementRect) => {
    console.log('[WeeklyChallenge] handleBoardDragStart:', piece);
    if (gameOver || !gameStarted) return;
    if (!pendingMove || pendingMove.piece !== piece) return;
    
    if (setPendingMove) {
      setPendingMove(null);
    }
    
    startDrag(piece, clientX, clientY, elementRect);
  }, [gameOver, gameStarted, pendingMove, setPendingMove, startDrag]);

  // Global move/end handlers for drag
  useEffect(() => {
    if (!isDragging) return;
    
    console.log('[WeeklyChallenge] Setting up global drag listeners');
    
    const handleGlobalMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      updateDrag(clientX, clientY);
      
      if (e.cancelable) {
        e.preventDefault();
      }
    };
    
    const handleGlobalEnd = () => {
      console.log('[WeeklyChallenge] Global drag end');
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
      className="bg-slate-950"
      style={{ 
        minHeight: '100vh',
        minHeight: '100dvh', // Dynamic viewport height for mobile
        overflowY: 'auto', 
        overflowX: 'hidden', 
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
        touchAction: isDragging ? 'none' : 'pan-y pinch-zoom'
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
          
          {/* Header with Title and Timer - styled like other game boards */}
          <div className="flex items-center justify-between mb-2 px-2">
            {/* Spacer for symmetry (home button moved to controls) */}
            <div className="w-16" />
            
            <div className="text-center flex-1 mx-2">
              <NeonTitle text="DEADBLOCK" size="medium" color="red" />
              <div className="text-red-400/80 text-[10px] font-bold tracking-[0.3em] uppercase mt-0">
                WEEKLY CHALLENGE
              </div>
            </div>
            
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
                  className={`relative px-4 py-2 bg-gradient-to-br ${bgGradient} rounded-xl border ${borderColor} overflow-hidden transition-all duration-500`}
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
                  <div className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 transition-colors duration-500" style={{ borderColor: timerColor + '99' }} />
                  <div className="absolute top-0 right-0 w-2 h-2 border-r-2 border-t-2 transition-colors duration-500" style={{ borderColor: timerColor + '99' }} />
                  <div className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 transition-colors duration-500" style={{ borderColor: timerColor + '99' }} />
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 transition-colors duration-500" style={{ borderColor: timerColor + '99' }} />
                  
                  <div className="relative flex items-center gap-2.5">
                    {/* Animated clock icon with dynamic color */}
                    <div className="relative">
                      <div 
                        className="absolute inset-0 rounded-full blur-md animate-pulse transition-colors duration-500" 
                        style={{ backgroundColor: timerGlow.replace('0.9', '0.3') }}
                      />
                      <Clock size={18} className={`relative ${iconColor} transition-colors duration-500`} />
                      {elapsedMs > 0 && (
                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.8)]" />
                      )}
                    </div>
                    
                    {/* Time display with dynamic glowing digits */}
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
            />
          </div>
          
          {/* D-Pad for moving pieces */}
          {pendingMove && !isDragging && (
            <div className="flex justify-center mb-3">
              <DPad onMove={movePendingPiece} />
            </div>
          )}
          
          {/* Control Buttons - Above Piece Tray with Menu button */}
          <div className="flex gap-1 justify-between mb-2 flex-wrap">
            {/* Menu Button - Goes to main game menu */}
            <button
              onClick={() => { soundManager.playButtonClick(); (onMainMenu || onMenu)(); }}
              className="flex-1 px-1.5 py-1.5 bg-red-600/70 hover:bg-red-500/70 text-white rounded-lg text-xs flex items-center justify-center gap-1 border border-red-400/30 shadow-[0_0_10px_rgba(239,68,68,0.4)]"
            >
              <ArrowLeft size={12} />MENU
            </button>
            
            {/* Rotate Button */}
            <button
              onClick={rotatePiece}
              className="flex-1 px-1.5 py-1.5 bg-purple-600/70 hover:bg-purple-500/70 text-white rounded-lg text-xs flex items-center justify-center gap-1 disabled:opacity-30 border border-purple-400/30 shadow-[0_0_10px_rgba(168,85,247,0.4)]"
              disabled={!selectedPiece && !pendingMove}
            >
              <RotateCcw size={12} />ROTATE
            </button>

            {/* Flip Button */}
            <button
              onClick={flipPiece}
              className="flex-1 px-1.5 py-1.5 bg-indigo-600/70 hover:bg-indigo-500/70 text-white rounded-lg text-xs flex items-center justify-center gap-1 disabled:opacity-30 border border-indigo-400/30 shadow-[0_0_10px_rgba(99,102,241,0.4)]"
              disabled={!selectedPiece && !pendingMove}
            >
              <FlipHorizontal size={12} />FLIP
            </button>
            
            {/* Retry Button */}
            <button
              onClick={handleRestart}
              className="flex-1 px-1.5 py-1.5 bg-red-600/70 hover:bg-red-500/70 text-white rounded-lg text-xs flex items-center justify-center gap-1 border border-red-400/30 shadow-[0_0_10px_rgba(239,68,68,0.4)]"
            >
              <RotateCcw size={12} />RETRY
            </button>
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
              <button
                onClick={confirmMove}
                disabled={!pendingMove || !(() => {
                  const coords = getPieceCoords(pendingMove.piece, rotation, flipped);
                  return canPlacePiece(board, pendingMove.row, pendingMove.col, coords);
                })()}
                className="flex-1 max-w-32 px-3 py-2 bg-green-600/70 hover:bg-green-500/70 text-white rounded-lg text-sm flex items-center justify-center gap-1 font-bold border border-green-400/30 shadow-[0_0_15px_rgba(74,222,128,0.5)] disabled:opacity-30 disabled:shadow-none"
              >
                <CheckCircle size={14} />CONFIRM
              </button>
              <button
                onClick={cancelMove}
                className="flex-1 max-w-32 px-3 py-2 bg-red-600/70 hover:bg-red-500/70 text-white rounded-lg text-sm flex items-center justify-center gap-1 border border-red-400/30 shadow-[0_0_10px_rgba(239,68,68,0.4)]"
              >
                <X size={14} />CANCEL
              </button>
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
      
      {/* v7.8: Scroll styles for small screens */}
      <style>{`
        /* Allow scroll pass-through on interactive elements */
        button, [role="button"], input, textarea, select, a {
          touch-action: manipulation;
        }
      `}</style>
    </div>
  );
};

export default WeeklyChallengeScreen;
