// SpeedPuzzleScreen - Timed puzzle mode with streak tracking
import { useState, useEffect, useCallback, useRef } from 'react';
import { Zap, Trophy, Play, RotateCcw, Timer, Flame } from 'lucide-react';
import GameBoard from './GameBoard';
import PieceTray from './PieceTray';
import DPad from './DPad';
import ControlButtons from './ControlButtons';
import { pieces } from '../utils/pieces';
import { getPieceCoords, canPlacePiece, canAnyPieceBePlaced, createEmptyBoard, BOARD_SIZE } from '../utils/gameLogic';
import { getSpeedPuzzle } from '../utils/puzzleGenerator';
import { soundManager } from '../utils/soundManager';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { statsService } from '../utils/statsService';

const TIMER_DURATION = 10; // 10 seconds per puzzle

// Speed theme - Electric red/orange for urgency
const theme = {
  gridColor: 'rgba(239,68,68,0.4)',
  glow1: 'bg-red-500/40',
  glow2: 'bg-orange-500/30',
  panelBorder: 'border-red-500/40',
  panelShadow: 'shadow-[0_0_40px_rgba(239,68,68,0.3)]',
};

// Compact animated countdown timer
const SpeedTimer = ({ timeLeft, maxTime }) => {
  const percentage = (timeLeft / maxTime) * 100;
  const isLow = timeLeft <= 3;
  const isCritical = timeLeft <= 2;
  const isUrgent = timeLeft <= 1;
  
  const getTimerColor = () => {
    if (isUrgent) return '#ef4444';
    if (isCritical) return '#f97316';
    if (isLow) return '#fbbf24';
    return '#22d3ee';
  };
  
  const color = getTimerColor();
  
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
            strokeDasharray={`${2 * Math.PI * 12}`}
            strokeDashoffset={`${2 * Math.PI * 12 * (1 - percentage / 100)}`}
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
};

// Compact streak display with fire effects
const StreakDisplay = ({ streak, isNewRecord, bestStreak = 0 }) => {
  const isHot = streak >= 3;
  const isOnFire = streak >= 5;
  const isLegendary = streak >= 10;
  
  const getStreakColor = () => {
    if (isLegendary) return '#fbbf24';
    if (isOnFire) return '#f97316';
    if (isHot) return '#fb923c';
    return '#94a3b8';
  };
  
  const color = getStreakColor();
  
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
};

// Success overlay
const SuccessOverlay = ({ streak, onContinue }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
    <div className="bg-slate-900 rounded-2xl p-6 max-w-sm w-full mx-4 border border-green-500/50 shadow-[0_0_60px_rgba(34,197,94,0.4)]">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center animate-pulse">
          <Zap size={32} className="text-white" />
        </div>
        <h2 className="text-2xl font-black text-green-400 mb-2">CORRECT!</h2>
        <p className="text-slate-400 mb-4">Streak: <span className="text-white font-bold text-xl">{streak}</span></p>
        
        <button
          onClick={onContinue}
          className="w-full py-4 rounded-xl font-black tracking-wider text-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-400 hover:to-emerald-500 transition-all shadow-[0_0_30px_rgba(34,197,94,0.5)] active:scale-[0.98]"
        >
          <div className="flex items-center justify-center gap-2">
            <Play size={24} />
            NEXT PUZZLE
          </div>
        </button>
        
        <p className="text-xs text-slate-500 mt-3">Press quickly! Timer starts immediately</p>
      </div>
    </div>
  </div>
);

// Game over overlay
const GameOverOverlay = ({ streak, bestStreak, onPlayAgain, onMenu }) => {
  // Log when rendered
  console.log('[SpeedPuzzle] Rendering GameOverOverlay, streak:', streak, 'bestStreak:', bestStreak);
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
      <div className="bg-slate-900 rounded-2xl p-6 max-w-sm w-full mx-4 border border-red-500/50 shadow-[0_0_60px_rgba(239,68,68,0.3)]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
            <Timer size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-red-400 mb-4">TIME'S UP!</h2>
          
          <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Final Streak</div>
                <div className="text-3xl font-black text-white">{streak}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Best Ever</div>
                <div className={`text-3xl font-black ${streak >= bestStreak && streak > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                  {Math.max(streak, bestStreak)}
                </div>
              </div>
            </div>
            
            {streak >= bestStreak && streak > 0 && (
              <div className="mt-3 flex items-center justify-center gap-2 text-amber-400">
                <Trophy size={18} />
                <span className="font-bold text-sm">New Personal Best!</span>
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            <button
              onClick={onPlayAgain}
              className="w-full py-4 rounded-xl font-black tracking-wider text-lg bg-gradient-to-r from-red-500 to-orange-600 text-white hover:from-red-400 hover:to-orange-500 transition-all shadow-[0_0_30px_rgba(239,68,68,0.5)] active:scale-[0.98]"
            >
              <div className="flex items-center justify-center gap-2">
                <RotateCcw size={22} />
                PLAY AGAIN
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
  );
};

// Error overlay
const ErrorOverlay = ({ message, onRetry, onMenu }) => (
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
);

const SpeedPuzzleScreen = ({ onMenu, isOfflineMode = false }) => {
  // Game state
  const [gameState, setGameState] = useState('loading'); // loading, playing, success, gameover, error
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(() => {
    try {
      return parseInt(localStorage.getItem('speed-puzzle-best') || '0', 10);
    } catch {
      return 0;
    }
  });
  const [dbBestStreak, setDbBestStreak] = useState(0); // Best streak from database
  const [errorMessage, setErrorMessage] = useState('');
  
  // Load database best streak on mount (if logged in)
  useEffect(() => {
    if (!isOfflineMode) {
      const loadDbStats = async () => {
        try {
          const stats = await statsService.getStats();
          if (stats?.speed_best_streak) {
            setDbBestStreak(stats.speed_best_streak);
            // If database has higher streak, update local
            if (stats.speed_best_streak > bestStreak) {
              setBestStreak(stats.speed_best_streak);
              try {
                localStorage.setItem('speed-puzzle-best', stats.speed_best_streak.toString());
              } catch {}
            }
          }
        } catch (err) {
          console.error('[SpeedPuzzle] Failed to load db stats:', err);
        }
      };
      loadDbStats();
    }
  }, [isOfflineMode]);
  
  // Get the effective best streak (max of local and db)
  const effectiveBestStreak = Math.max(bestStreak, dbBestStreak);
  
  // Log state changes
  useEffect(() => {
    console.log('[SpeedPuzzle] Game state changed to:', gameState);
  }, [gameState]);
  
  // Timer
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const timerRef = useRef(null);
  const lastTickRef = useRef(Date.now());
  const gameStateRef = useRef(gameState); // Track gameState in ref for timer callback
  
  // Keep ref in sync with state
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);
  
  // Puzzle state
  const [board, setBoard] = useState(() => createEmptyBoard());
  const [boardPieces, setBoardPieces] = useState(() => 
    Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null))
  );
  const [usedPieces, setUsedPieces] = useState([]);
  const [currentPuzzle, setCurrentPuzzle] = useState(null);
  
  // Interaction state
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [pendingMove, setPendingMove] = useState(null);
  const [playerAnimatingMove, setPlayerAnimatingMove] = useState(null);

  // Load a new puzzle
  const retryCountRef = useRef(0);
  const maxRetries = 5;
  
  const loadNewPuzzle = useCallback(async () => {
    console.log('[SpeedPuzzle] loadNewPuzzle called');
    setGameState('loading');
    setErrorMessage('');
    
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    try {
      console.log('[SpeedPuzzle] Generating puzzle, attempt:', retryCountRef.current + 1);
      const puzzle = await getSpeedPuzzle();
      
      console.log('[SpeedPuzzle] Puzzle result:', puzzle ? 'success' : 'null');
      
      if (puzzle && puzzle.boardState && puzzle.boardState.length === 64) {
        // Parse boardState string (64 chars representing 8x8 grid)
        const newBoard = createEmptyBoard();
        const newBoardPieces = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
        
        for (let i = 0; i < 64; i++) {
          const char = puzzle.boardState[i];
          if (char !== 'G') {
            const row = Math.floor(i / BOARD_SIZE);
            const col = i % BOARD_SIZE;
            newBoard[row][col] = 1; // All pre-placed pieces show as player 1
            newBoardPieces[row][col] = char === 'H' ? 'Y' : char; // H is legacy for Y
          }
        }
        
        setBoard(newBoard);
        setBoardPieces(newBoardPieces);
        setUsedPieces(puzzle.usedPieces || []);
        setCurrentPuzzle(puzzle);
        setSelectedPiece(null);
        setRotation(0);
        setFlipped(false);
        setPendingMove(null);
        
        // Reset retry counter on success
        retryCountRef.current = 0;
        
        // Start playing
        setTimeLeft(TIMER_DURATION);
        lastTickRef.current = Date.now();
        
        // Small delay before setting playing state to ensure UI updates
        setTimeout(() => {
          setGameState('playing');
        }, 50);
      } else {
        console.error('[SpeedPuzzle] Invalid puzzle data:', puzzle);
        retryCountRef.current++;
        if (retryCountRef.current < maxRetries) {
          setTimeout(() => loadNewPuzzle(), 500);
        } else {
          console.error('[SpeedPuzzle] Max retries reached');
          retryCountRef.current = 0;
          setErrorMessage('Failed to generate puzzle. Please try again.');
          setGameState('error');
        }
      }
    } catch (err) {
      console.error('[SpeedPuzzle] Failed to load puzzle:', err);
      retryCountRef.current++;
      if (retryCountRef.current < maxRetries) {
        setTimeout(() => loadNewPuzzle(), 500);
      } else {
        console.error('[SpeedPuzzle] Max retries reached after error');
        retryCountRef.current = 0;
        setErrorMessage('Failed to load puzzle: ' + err.message);
        setGameState('error');
      }
    }
  }, []);

  // Handle game over from timer
  const handleTimerExpired = useCallback(() => {
    console.log('[SpeedPuzzle] handleTimerExpired called, current state:', gameStateRef.current);
    
    // Only trigger game over if we're still playing
    if (gameStateRef.current === 'playing') {
      console.log('[SpeedPuzzle] Setting game state to gameover');
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      soundManager.playGameOver();
      
      // Force state update
      setGameState(prev => {
        console.log('[SpeedPuzzle] State transition from', prev, 'to gameover');
        return 'gameover';
      });
    } else {
      console.log('[SpeedPuzzle] Timer expired but not in playing state, ignoring');
    }
  }, []);

  // Start timer when playing
  useEffect(() => {
    if (gameState === 'playing') {
      console.log('[SpeedPuzzle] Starting timer');
      lastTickRef.current = Date.now();
      
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const delta = (now - lastTickRef.current) / 1000;
        lastTickRef.current = now;
        
        setTimeLeft(prev => {
          const newTime = Math.max(0, prev - delta);
          
          if (newTime <= 0 && prev > 0) {
            console.log('[SpeedPuzzle] Timer reached zero');
            // Call handleTimerExpired on next tick to avoid state updates during render
            setTimeout(() => handleTimerExpired(), 0);
            return 0;
          }
          return newTime;
        });
      }, 50);
      
      return () => {
        console.log('[SpeedPuzzle] Cleaning up timer');
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }
  }, [gameState, handleTimerExpired]);

  // Initial load
  useEffect(() => {
    loadNewPuzzle();
    
    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Handle piece selection - automatically find a valid placement
  const selectPiece = useCallback((pieceType) => {
    if (gameState !== 'playing') return;
    
    soundManager.playClickSound('select');
    setSelectedPiece(pieceType);
    setRotation(0);
    setFlipped(false);
    
    // Try to auto-place the piece at a valid position
    const coords = getPieceCoords(pieceType, 0, false);
    
    // Find the first valid position for this piece
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (canPlacePiece(board, row, col, coords)) {
          setPendingMove({ row, col, coords, piece: pieceType });
          return;
        }
      }
    }
    
    // No valid position found with default orientation, just select the piece
    setPendingMove(null);
  }, [gameState, board]);

  // Handle rotation
  const rotatePiece = useCallback(() => {
    if (!selectedPiece || gameState !== 'playing') return;
    soundManager.playClickSound('rotate');
    
    const newRotation = (rotation + 1) % 4;
    setRotation(newRotation);
    
    const newCoords = getPieceCoords(selectedPiece, newRotation, flipped);
    
    if (pendingMove) {
      // Check if current position is still valid
      if (canPlacePiece(board, pendingMove.row, pendingMove.col, newCoords)) {
        setPendingMove({ ...pendingMove, coords: newCoords });
      } else {
        // Find a new valid position
        for (let row = 0; row < BOARD_SIZE; row++) {
          for (let col = 0; col < BOARD_SIZE; col++) {
            if (canPlacePiece(board, row, col, newCoords)) {
              setPendingMove({ row, col, coords: newCoords, piece: selectedPiece });
              return;
            }
          }
        }
        setPendingMove(null);
      }
    } else {
      // Try to find a valid position with new rotation
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          if (canPlacePiece(board, row, col, newCoords)) {
            setPendingMove({ row, col, coords: newCoords, piece: selectedPiece });
            return;
          }
        }
      }
    }
  }, [selectedPiece, gameState, rotation, flipped, pendingMove, board]);

  // Handle flip
  const flipPiece = useCallback(() => {
    if (!selectedPiece || gameState !== 'playing') return;
    soundManager.playClickSound('flip');
    
    const newFlipped = !flipped;
    setFlipped(newFlipped);
    
    const newCoords = getPieceCoords(selectedPiece, rotation, newFlipped);
    
    if (pendingMove) {
      if (canPlacePiece(board, pendingMove.row, pendingMove.col, newCoords)) {
        setPendingMove({ ...pendingMove, coords: newCoords });
      } else {
        // Find a new valid position
        for (let row = 0; row < BOARD_SIZE; row++) {
          for (let col = 0; col < BOARD_SIZE; col++) {
            if (canPlacePiece(board, row, col, newCoords)) {
              setPendingMove({ row, col, coords: newCoords, piece: selectedPiece });
              return;
            }
          }
        }
        setPendingMove(null);
      }
    } else {
      // Try to find a valid position with new flip
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          if (canPlacePiece(board, row, col, newCoords)) {
            setPendingMove({ row, col, coords: newCoords, piece: selectedPiece });
            return;
          }
        }
      }
    }
  }, [selectedPiece, gameState, rotation, flipped, pendingMove, board]);

  // Handle cell click
  const handleCellClick = useCallback((row, col) => {
    if (!selectedPiece || gameState !== 'playing') return;
    
    const coords = getPieceCoords(selectedPiece, rotation, flipped);
    
    // Always set pending move to show ghost piece (so player can rotate/flip)
    setPendingMove({ row, col, coords, piece: selectedPiece });
    
    if (canPlacePiece(board, row, col, coords)) {
      soundManager.playClickSound('place');
    } else {
      soundManager.playInvalidMove();
    }
  }, [selectedPiece, gameState, rotation, flipped, board]);

  // Handle move with D-pad
  const movePendingPiece = useCallback((direction) => {
    if (!pendingMove || gameState !== 'playing') return;
    
    const deltas = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
    const [dr, dc] = deltas[direction];
    const newRow = pendingMove.row + dr;
    const newCol = pendingMove.col + dc;
    
    if (canPlacePiece(board, newRow, newCol, pendingMove.coords)) {
      soundManager.playClickSound('move');
      setPendingMove({ ...pendingMove, row: newRow, col: newCol });
    }
  }, [pendingMove, gameState, board]);

  // Confirm move
  const confirmMove = useCallback(() => {
    if (!pendingMove || !selectedPiece || gameState !== 'playing') return;
    
    // Stop timer immediately
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Set animation state
    setPlayerAnimatingMove({ ...pendingMove, pieceType: selectedPiece });
    
    // Place the piece
    const newBoard = board.map(row => [...row]);
    const newBoardPieces = boardPieces.map(row => [...row]);
    
    // Coords are in [dx, dy] format where dx=col offset, dy=row offset
    for (const [dx, dy] of pendingMove.coords) {
      const r = pendingMove.row + dy;
      const c = pendingMove.col + dx;
      newBoard[r][c] = 1; // Player is always 1
      newBoardPieces[r][c] = selectedPiece;
    }
    
    const newUsedPieces = [...usedPieces, selectedPiece];
    
    setBoard(newBoard);
    setBoardPieces(newBoardPieces);
    setUsedPieces(newUsedPieces);
    setSelectedPiece(null);
    setPendingMove(null);
    
    soundManager.playPiecePlaced();
    
    // Clear animation after delay
    setTimeout(() => setPlayerAnimatingMove(null), 500);
    
    // Check if puzzle is solved (player wins = correct answer)
    // In easy puzzles with 1 move, if we placed a piece and AI can't play, we win
    setTimeout(() => {
      const aiPieces = Object.keys(pieces).filter(p => !newUsedPieces.includes(p));
      const aiCanPlay = canAnyPieceBePlaced(newBoard, aiPieces);
      
      if (!aiCanPlay) {
        // Success! Puzzle solved
        soundManager.playWin();
        
        const newStreak = streak + 1;
        setStreak(newStreak);
        
        // Track puzzle completion in database
        if (!isOfflineMode) {
          statsService.recordSpeedPuzzleComplete();
        }
        
        // Update best streak
        if (newStreak > effectiveBestStreak) {
          setBestStreak(newStreak);
          setDbBestStreak(newStreak);
          try {
            localStorage.setItem('speed-puzzle-best', newStreak.toString());
          } catch {}
          
          // Update database with new best streak
          if (!isOfflineMode) {
            statsService.updateSpeedBestStreak(newStreak);
          }
        }
        
        setGameState('success');
      } else {
        // Wrong move - restart timer and continue
        soundManager.playInvalidMove();
        setTimeLeft(TIMER_DURATION);
        lastTickRef.current = Date.now();
        setGameState('playing'); // This will restart the timer via useEffect
      }
    }, 100);
  }, [pendingMove, selectedPiece, gameState, board, boardPieces, usedPieces, streak, effectiveBestStreak, isOfflineMode]);

  // Cancel move
  const cancelMove = useCallback(() => {
    if (gameState !== 'playing') return;
    soundManager.playClickSound('cancel');
    setPendingMove(null);
  }, [gameState]);

  // Continue to next puzzle
  const handleContinue = useCallback(() => {
    soundManager.playButtonClick();
    loadNewPuzzle();
  }, [loadNewPuzzle]);

  // Play again
  const handlePlayAgain = useCallback(() => {
    soundManager.playButtonClick();
    
    // Record session completion with final streak
    if (!isOfflineMode && streak > 0) {
      statsService.recordSpeedSessionComplete(streak);
    }
    
    setStreak(0);
    loadNewPuzzle();
  }, [isOfflineMode, streak, loadNewPuzzle]);

  // Back to menu
  const handleMenu = useCallback(() => {
    soundManager.playButtonClick();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Record session completion with final streak if any
    if (!isOfflineMode && streak > 0) {
      statsService.recordSpeedSessionComplete(streak);
    }
    
    onMenu();
  }, [isOfflineMode, streak, onMenu]);

  // Retry after error
  const handleRetry = useCallback(() => {
    soundManager.playButtonClick();
    retryCountRef.current = 0;
    loadNewPuzzle();
  }, [loadNewPuzzle]);

  const isNewRecord = streak > 0 && streak >= effectiveBestStreak;

  // Use lower threshold for speed puzzle (650px) since it has compact layout
  const { needsScroll, viewportHeight, isMobile } = useResponsiveLayout(650);

  // Scroll container styles - enhanced for mobile
  const scrollStyles = needsScroll ? {
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
    touchAction: 'pan-y',
    scrollBehavior: 'smooth',
    // Prevent pull-to-refresh on mobile
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
        {/* Compact Header with back button, title, and reset */}
        <div className="w-full max-w-md mb-1 flex-shrink-0">
          <div className="flex items-center justify-between">
            <button
              onClick={handleMenu}
              className="px-3 py-1.5 bg-slate-800 text-cyan-300 rounded-lg text-xs sm:text-sm border border-cyan-500/30 hover:bg-slate-700 shadow-[0_0_10px_rgba(34,211,238,0.3)]"
            >
              MENU
            </button>
            
            <div className="text-center flex-1">
              <div className="speed-subtitle font-black tracking-[0.15em] text-xs">
                SPEED MODE
              </div>
            </div>
            
            {/* Spacer to balance layout */}
            <div className="w-[52px]"></div>
          </div>
        </div>
        
        {/* Timer and Streak row - always visible */}
        <div className="w-full max-w-md flex items-center justify-center gap-3 mb-2 flex-shrink-0">
          {gameState === 'playing' ? (
            <SpeedTimer timeLeft={timeLeft} maxTime={TIMER_DURATION} />
          ) : (
            <div className="px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/50 text-slate-500 text-sm">
              {gameState === 'loading' ? 'Loading...' : 'Ready'}
            </div>
          )}
          <StreakDisplay streak={streak} isNewRecord={isNewRecord} bestStreak={effectiveBestStreak} />
        </div>
        
        {/* Game board */}
        <div className={`${theme.panelBorder} border rounded-2xl p-3 bg-slate-900/60 backdrop-blur ${theme.panelShadow} flex-shrink-0`}>
          {gameState === 'loading' ? (
            <div className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Loading puzzle...</p>
              </div>
            </div>
          ) : (
            <GameBoard
              board={board}
              boardPieces={boardPieces}
              currentPlayer={1}
              selectedPiece={selectedPiece}
              rotation={rotation}
              flipped={flipped}
              pendingMove={pendingMove}
              onCellClick={handleCellClick}
              gameMode="puzzle"
              playerAnimatingMove={playerAnimatingMove}
            />
          )}
        </div>
        
        {/* Piece tray */}
        {gameState === 'playing' && (
          <div className="mt-3 w-full max-w-md flex-shrink-0">
            <PieceTray
              usedPieces={usedPieces}
              selectedPiece={selectedPiece}
              pendingMove={pendingMove}
              gameOver={false}
              gameMode="puzzle"
              currentPlayer={1}
              onSelectPiece={selectPiece}
            />
          </div>
        )}
        
        {/* D-Pad for moving pieces */}
        {gameState === 'playing' && pendingMove && (
          <div className="flex justify-center mt-2 flex-shrink-0">
            <DPad onMove={movePendingPiece} />
          </div>
        )}
        
        {/* Control Buttons */}
        {gameState === 'playing' && (
          <div className="mt-2 w-full max-w-md flex-shrink-0">
            <ControlButtons
              selectedPiece={selectedPiece}
              pendingMove={pendingMove}
              canConfirm={!!pendingMove}
              gameOver={false}
              gameMode="puzzle"
              currentPlayer={1}
              isGeneratingPuzzle={false}
              onRotate={rotatePiece}
              onFlip={flipPiece}
              onConfirm={confirmMove}
              onCancel={cancelMove}
            />
          </div>
        )}
        
        {/* Bottom safe area spacer */}
        {needsScroll && <div className="h-12 flex-shrink-0" />}
      </div>
      
      {/* Success overlay */}
      {gameState === 'success' && (
        <SuccessOverlay streak={streak} onContinue={handleContinue} />
      )}
      
      {/* Game over overlay */}
      {gameState === 'gameover' && (
        <GameOverOverlay
          streak={streak}
          bestStreak={effectiveBestStreak}
          onPlayAgain={handlePlayAgain}
          onMenu={handleMenu}
        />
      )}
      
      {/* Error overlay */}
      {gameState === 'error' && (
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
        
        @keyframes timer-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        
        @keyframes timer-critical {
          0%, 100% { transform: scale(1); }
          25% { transform: scale(1.03); }
          75% { transform: scale(0.98); }
        }
        
        .animate-timer-pulse {
          animation: timer-pulse 0.5s ease-in-out infinite;
        }
        
        .animate-timer-critical {
          animation: timer-critical 0.3s ease-in-out infinite;
        }
        
        @keyframes timer-shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
          20%, 40%, 60%, 80% { transform: translateX(3px); }
        }
        
        .animate-timer-shake {
          animation: timer-shake 0.4s ease-in-out infinite, timer-critical 0.3s ease-in-out infinite;
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scale-in {
          from { 
            opacity: 0;
            transform: scale(0.9);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default SpeedPuzzleScreen;
