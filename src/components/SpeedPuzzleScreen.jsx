// SpeedPuzzleScreen - Timed puzzle mode with streak tracking
import { useState, useEffect, useCallback, useRef } from 'react';
import { Zap, Trophy, Play, Home, RotateCcw, Timer, Flame } from 'lucide-react';
import NeonTitle from './NeonTitle';
import GameBoard from './GameBoard';
import PieceTray from './PieceTray';
import DPad from './DPad';
import { pieces } from '../utils/pieces';
import { getPieceCoords, canPlacePiece, canAnyPieceBePlaced, createEmptyBoard, BOARD_SIZE } from '../utils/gameLogic';
import { getSpeedPuzzle } from '../utils/puzzleGenerator';
import { soundManager } from '../utils/soundManager';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

const TIMER_DURATION = 7; // 7 seconds per puzzle

// Speed theme - Electric red/orange for urgency
const theme = {
  gridColor: 'rgba(239,68,68,0.4)',
  glow1: 'bg-red-500/40',
  glow2: 'bg-orange-500/30',
  panelBorder: 'border-red-500/40',
  panelShadow: 'shadow-[0_0_40px_rgba(239,68,68,0.3)]',
};

// Animated countdown timer with dramatic effects
const SpeedTimer = ({ timeLeft, maxTime, isActive }) => {
  const percentage = (timeLeft / maxTime) * 100;
  const isLow = timeLeft <= 3;
  const isCritical = timeLeft <= 2;
  const isUrgent = timeLeft <= 1;
  
  // Calculate color transition
  const getTimerColor = () => {
    if (isUrgent) return '#ef4444'; // red-500
    if (isCritical) return '#f97316'; // orange-500
    if (isLow) return '#fbbf24'; // amber-400
    return '#22d3ee'; // cyan-400
  };
  
  return (
    <div className="relative w-full max-w-xs mx-auto">
      {/* Background glow that intensifies */}
      <div 
        className="absolute inset-0 rounded-2xl blur-xl transition-all duration-200"
        style={{
          background: `radial-gradient(circle, ${getTimerColor()}40 0%, transparent 70%)`,
          transform: isUrgent ? 'scale(1.3)' : isCritical ? 'scale(1.2)' : 'scale(1)',
        }}
      />
      
      {/* Main container */}
      <div 
        className={`
          relative rounded-2xl p-1 transition-all duration-200
          ${isUrgent ? 'animate-timer-shake' : isCritical ? 'animate-timer-critical' : isLow ? 'animate-timer-pulse' : ''}
        `}
        style={{
          background: `linear-gradient(135deg, ${getTimerColor()}60, ${getTimerColor()}30)`,
          boxShadow: `0 0 ${isUrgent ? '50' : isCritical ? '35' : '20'}px ${getTimerColor()}${isUrgent ? 'cc' : '80'}`,
        }}
      >
        <div className="bg-slate-950/95 rounded-xl p-4">
          {/* Circular progress ring */}
          <div className="relative w-32 h-32 mx-auto mb-3">
            {/* Background ring */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="rgba(100,116,139,0.2)"
                strokeWidth="8"
              />
              {/* Progress ring */}
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke={getTimerColor()}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 56}`}
                strokeDashoffset={`${2 * Math.PI * 56 * (1 - percentage / 100)}`}
                className="transition-all duration-100"
                style={{
                  filter: `drop-shadow(0 0 ${isUrgent ? '15' : '8'}px ${getTimerColor()})`,
                }}
              />
            </svg>
            
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div 
                className={`
                  font-black tabular-nums tracking-tight transition-all duration-100
                  ${isUrgent ? 'text-5xl animate-pulse' : isCritical ? 'text-5xl' : 'text-4xl'}
                `}
                style={{ color: getTimerColor() }}
              >
                {timeLeft.toFixed(1)}
              </div>
              <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">SEC</div>
            </div>
            
            {/* Pulsing center glow for critical */}
            {isCritical && (
              <div 
                className="absolute inset-4 rounded-full animate-ping"
                style={{ background: `radial-gradient(circle, ${getTimerColor()}30 0%, transparent 70%)` }}
              />
            )}
          </div>
          
          {/* Urgency indicator bars */}
          <div className="flex justify-center gap-1">
            {[7, 6, 5, 4, 3, 2, 1].map((n) => (
              <div
                key={n}
                className={`
                  w-6 h-2 rounded-full transition-all duration-200
                  ${timeLeft >= n 
                    ? n <= 2 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' 
                      : n <= 3 ? 'bg-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.6)]' 
                      : 'bg-cyan-500 shadow-[0_0_6px_rgba(34,211,238,0.5)]'
                    : 'bg-slate-700/50'
                  }
                `}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Outer ring pulses */}
      {isUrgent && (
        <>
          <div className="absolute inset-0 rounded-2xl border-2 border-red-500 animate-ping opacity-50" />
          <div className="absolute inset-[-4px] rounded-2xl border border-red-400/50 animate-pulse" />
          <div className="absolute inset-[-8px] rounded-2xl border border-red-300/30 animate-ping" style={{ animationDuration: '0.8s' }} />
        </>
      )}
    </div>
  );
};

// Enhanced streak display with fire effects
const StreakDisplay = ({ streak, isNewRecord }) => {
  const isHot = streak >= 3;
  const isOnFire = streak >= 5;
  const isLegendary = streak >= 10;
  
  const getStreakColor = () => {
    if (isLegendary) return '#fbbf24'; // amber-400
    if (isOnFire) return '#f97316'; // orange-500
    if (isHot) return '#fb923c'; // orange-400
    return '#94a3b8'; // slate-400
  };
  
  return (
    <div className="relative">
      {/* Background glow for high streaks */}
      {isHot && (
        <div 
          className="absolute inset-0 rounded-2xl blur-lg animate-pulse"
          style={{ 
            background: `radial-gradient(circle, ${getStreakColor()}40 0%, transparent 70%)`,
          }}
        />
      )}
      
      <div 
        className={`
          relative flex items-center gap-4 px-5 py-3 rounded-2xl bg-slate-900/90 border-2 transition-all duration-300
          ${isLegendary ? 'border-amber-400/70' : isOnFire ? 'border-orange-500/60' : isHot ? 'border-orange-400/50' : 'border-slate-700/50'}
        `}
        style={{
          boxShadow: isHot ? `0 0 ${isLegendary ? '40' : isOnFire ? '30' : '20'}px ${getStreakColor()}50` : 'none',
        }}
      >
        {/* Flame icon with animation */}
        <div className="relative">
          <Flame 
            size={32} 
            className={`transition-all duration-300 ${isHot ? 'animate-bounce' : ''}`}
            style={{ 
              color: getStreakColor(),
              filter: isHot ? `drop-shadow(0 0 8px ${getStreakColor()})` : 'none',
            }}
          />
          {/* Extra flames for high streaks */}
          {isOnFire && (
            <>
              <Flame 
                size={20} 
                className="absolute -top-2 -left-1 text-amber-400 animate-pulse" 
                style={{ filter: 'drop-shadow(0 0 4px #fbbf24)' }}
              />
              <Flame 
                size={16} 
                className="absolute -top-1 -right-1 text-orange-400 animate-pulse" 
                style={{ animationDelay: '0.2s', filter: 'drop-shadow(0 0 4px #fb923c)' }}
              />
            </>
          )}
        </div>
        
        {/* Streak number */}
        <div className="text-center">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Streak</div>
          <div 
            className={`
              font-black tabular-nums transition-all duration-300
              ${isLegendary ? 'text-4xl' : isOnFire ? 'text-3xl' : 'text-2xl'}
            `}
            style={{ 
              color: getStreakColor(),
              textShadow: isHot ? `0 0 20px ${getStreakColor()}` : 'none',
            }}
          >
            {streak}
          </div>
        </div>
        
        {/* New record badge */}
        {isNewRecord && streak > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-400/50 animate-bounce">
            <Trophy size={18} className="text-amber-400" />
            <span className="text-amber-300 text-xs font-bold uppercase tracking-wider">Best!</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Success overlay
const SuccessOverlay = ({ streak, onContinue }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
    <div className="bg-slate-900 rounded-2xl p-8 max-w-sm w-full mx-4 border border-green-500/50 shadow-[0_0_60px_rgba(34,197,94,0.4)] animate-scale-in">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center animate-pulse">
          <Zap size={40} className="text-white" />
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
const GameOverOverlay = ({ streak, bestStreak, onPlayAgain, onMenu }) => (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
    <div className="bg-slate-900 rounded-2xl p-8 max-w-sm w-full mx-4 border border-red-500/50 shadow-[0_0_60px_rgba(239,68,68,0.3)] animate-scale-in">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
          <Timer size={40} className="text-white" />
        </div>
        <h2 className="text-2xl font-black text-red-400 mb-2">TIME'S UP!</h2>
        
        <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Final Streak</div>
              <div className="text-3xl font-black text-white">{streak}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Best Ever</div>
              <div className={`text-3xl font-black ${streak >= bestStreak ? 'text-amber-400' : 'text-slate-400'}`}>
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

const SpeedPuzzleScreen = ({ onMenu }) => {
  const { needsScroll } = useResponsiveLayout(750);
  
  // Game state
  const [gameState, setGameState] = useState('loading'); // loading, playing, success, gameover
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(() => {
    try {
      return parseInt(localStorage.getItem('speed-puzzle-best') || '0', 10);
    } catch {
      return 0;
    }
  });
  
  // Timer
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const timerRef = useRef(null);
  const lastTickRef = useRef(Date.now());
  
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
    setGameState('loading');
    
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
        setGameState('playing');
      } else {
        console.error('[SpeedPuzzle] Invalid puzzle data:', puzzle);
        retryCountRef.current++;
        if (retryCountRef.current < maxRetries) {
          setTimeout(() => loadNewPuzzle(), 300);
        } else {
          console.error('[SpeedPuzzle] Max retries reached');
          retryCountRef.current = 0;
          // Still try once more after a longer delay
          setTimeout(() => loadNewPuzzle(), 1000);
        }
      }
    } catch (err) {
      console.error('[SpeedPuzzle] Failed to load puzzle:', err);
      retryCountRef.current++;
      if (retryCountRef.current < maxRetries) {
        setTimeout(() => loadNewPuzzle(), 300);
      } else {
        console.error('[SpeedPuzzle] Max retries reached after error');
        retryCountRef.current = 0;
        setTimeout(() => loadNewPuzzle(), 1000);
      }
    }
  }, []);

  // Start timer when playing
  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const delta = (now - lastTickRef.current) / 1000;
        lastTickRef.current = now;
        
        setTimeLeft(prev => {
          const newTime = prev - delta;
          if (newTime <= 0) {
            clearInterval(timerRef.current);
            soundManager.playGameOver();
            setGameState('gameover');
            return 0;
          }
          // Play tick sound when low
          if (newTime <= 3 && prev > 3) {
            // soundManager.playTick?.();
          }
          return newTime;
        });
      }, 50);
      
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [gameState]);

  // Initial load
  useEffect(() => {
    loadNewPuzzle();
  }, []);

  // Handle piece selection
  const selectPiece = (pieceType) => {
    if (gameState !== 'playing') return;
    soundManager.playClickSound('select');
    setSelectedPiece(pieceType);
    setRotation(0);
    setFlipped(false);
    setPendingMove(null);
  };

  // Handle rotation
  const rotatePiece = () => {
    if (!selectedPiece || gameState !== 'playing') return;
    soundManager.playClickSound('rotate');
    setRotation((r) => (r + 1) % 4);
    
    if (pendingMove) {
      const newRotation = (rotation + 1) % 4;
      const newCoords = getPieceCoords(selectedPiece, newRotation, flipped);
      if (canPlacePiece(board, pendingMove.row, pendingMove.col, newCoords)) {
        setPendingMove({ ...pendingMove, coords: newCoords });
      }
    }
  };

  // Handle flip
  const flipPiece = () => {
    if (!selectedPiece || gameState !== 'playing') return;
    soundManager.playClickSound('flip');
    setFlipped((f) => !f);
    
    if (pendingMove) {
      const newFlipped = !flipped;
      const newCoords = getPieceCoords(selectedPiece, rotation, newFlipped);
      if (canPlacePiece(board, pendingMove.row, pendingMove.col, newCoords)) {
        setPendingMove({ ...pendingMove, coords: newCoords });
      }
    }
  };

  // Handle cell click
  const handleCellClick = (row, col) => {
    if (!selectedPiece || gameState !== 'playing') return;
    
    const coords = getPieceCoords(selectedPiece, rotation, flipped);
    if (canPlacePiece(board, row, col, coords)) {
      soundManager.playClickSound('place');
      setPendingMove({ row, col, coords });
    } else {
      soundManager.playInvalidMove();
    }
  };

  // Handle move with D-pad
  const movePendingPiece = (direction) => {
    if (!pendingMove || gameState !== 'playing') return;
    
    const deltas = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
    const [dr, dc] = deltas[direction];
    const newRow = pendingMove.row + dr;
    const newCol = pendingMove.col + dc;
    
    if (canPlacePiece(board, newRow, newCol, pendingMove.coords)) {
      soundManager.playClickSound('move');
      setPendingMove({ ...pendingMove, row: newRow, col: newCol });
    }
  };

  // Confirm move
  const confirmMove = () => {
    if (!pendingMove || !selectedPiece || gameState !== 'playing') return;
    
    // Set animation state
    setPlayerAnimatingMove({ ...pendingMove, pieceType: selectedPiece });
    
    // Place the piece
    const newBoard = board.map(row => [...row]);
    const newBoardPieces = boardPieces.map(row => [...row]);
    
    for (const [dr, dc] of pendingMove.coords) {
      const r = pendingMove.row + dr;
      const c = pendingMove.col + dc;
      newBoard[r][c] = 1; // Player is always 1
      newBoardPieces[r][c] = selectedPiece;
    }
    
    setBoard(newBoard);
    setBoardPieces(newBoardPieces);
    setUsedPieces([...usedPieces, selectedPiece]);
    setSelectedPiece(null);
    setPendingMove(null);
    
    soundManager.playPiecePlaced();
    
    // Clear animation after delay
    setTimeout(() => setPlayerAnimatingMove(null), 500);
    
    // Check if puzzle is solved (player wins = correct answer)
    // In easy puzzles with 1 move, if we placed a piece and AI can't play, we win
    setTimeout(() => {
      const aiPieces = Object.keys(pieces).filter(p => ![...usedPieces, selectedPiece].includes(p));
      const aiCanPlay = canAnyPieceBePlaced(newBoard, aiPieces);
      
      if (!aiCanPlay) {
        // Success! Puzzle solved
        soundManager.playWin();
        clearInterval(timerRef.current);
        
        const newStreak = streak + 1;
        setStreak(newStreak);
        
        // Update best streak
        if (newStreak > bestStreak) {
          setBestStreak(newStreak);
          try {
            localStorage.setItem('speed-puzzle-best', newStreak.toString());
          } catch {}
        }
        
        setGameState('success');
      } else {
        // Wrong move - time penalty or instant fail?
        // For now, just continue - they wasted a move
        soundManager.playInvalidMove();
      }
    }, 100);
  };

  // Cancel move
  const cancelMove = () => {
    if (gameState !== 'playing') return;
    soundManager.playClickSound('cancel');
    setPendingMove(null);
  };

  // Continue to next puzzle
  const handleContinue = () => {
    soundManager.playButtonClick();
    loadNewPuzzle();
  };

  // Play again
  const handlePlayAgain = () => {
    soundManager.playButtonClick();
    setStreak(0);
    loadNewPuzzle();
  };

  // Back to menu
  const handleMenu = () => {
    soundManager.playButtonClick();
    if (timerRef.current) clearInterval(timerRef.current);
    onMenu();
  };

  const isNewRecord = streak > 0 && streak >= bestStreak;

  return (
    <div className={needsScroll ? 'min-h-screen bg-slate-950' : 'h-screen bg-slate-950 overflow-hidden'}>
      {/* Grid background */}
      <div className="fixed inset-0 opacity-30 pointer-events-none" style={{
        backgroundImage: `linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />
      
      {/* Glow orbs */}
      <div className={`fixed top-10 left-20 w-80 h-80 ${theme.glow1} rounded-full blur-3xl pointer-events-none`} />
      <div className={`fixed bottom-20 right-10 w-72 h-72 ${theme.glow2} rounded-full blur-3xl pointer-events-none`} />
      
      {/* Content */}
      <div className={`relative ${needsScroll ? 'min-h-screen' : 'h-full'} flex flex-col items-center px-2 py-3`}>
        {/* Header */}
        <div className="w-full max-w-md mb-2">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={handleMenu}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <Home size={24} />
            </button>
            
            <div className="text-center">
              <NeonTitle size="small" />
              <div className="speed-subtitle font-black tracking-[0.2em] text-xs mt-1">
                SPEED MODE
              </div>
            </div>
            
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
          
          {/* Timer - Always visible during play */}
          {gameState === 'playing' && (
            <div className="flex justify-center mb-3">
              <SpeedTimer timeLeft={timeLeft} maxTime={TIMER_DURATION} isActive={true} />
            </div>
          )}
          
          {/* Streak display */}
          <div className="flex justify-center mb-3">
            <StreakDisplay streak={streak} isNewRecord={isNewRecord} />
          </div>
        </div>
        
        {/* Game board */}
        <div className={`${theme.panelBorder} border rounded-2xl p-3 bg-slate-900/60 backdrop-blur ${theme.panelShadow}`}>
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
          <div className="mt-3 w-full max-w-md">
            <PieceTray
              usedPieces={usedPieces}
              selectedPiece={selectedPiece}
              onSelectPiece={selectPiece}
              currentPlayer={1}
              disabled={false}
            />
          </div>
        )}
        
        {/* Controls */}
        {gameState === 'playing' && pendingMove && (
          <div className="mt-3 w-full max-w-md">
            <DPad
              onMove={movePendingPiece}
              onRotate={rotatePiece}
              onFlip={flipPiece}
              onConfirm={confirmMove}
              onCancel={cancelMove}
              canConfirm={true}
              canCancel={true}
            />
          </div>
        )}
        
        {needsScroll && <div className="h-8 flex-shrink-0" />}
      </div>
      
      {/* Success overlay */}
      {gameState === 'success' && (
        <SuccessOverlay streak={streak} onContinue={handleContinue} />
      )}
      
      {/* Game over overlay */}
      {gameState === 'gameover' && (
        <GameOverOverlay
          streak={streak}
          bestStreak={bestStreak}
          onPlayAgain={handlePlayAgain}
          onMenu={handleMenu}
        />
      )}
      
      {/* Styles */}
      <style>{`
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
