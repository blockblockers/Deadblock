// SpeedPuzzleScreen - Timed puzzle mode with streak tracking
import { useState, useEffect, useCallback, useRef } from 'react';
import { Zap, Trophy, Play, Home, RotateCcw, Timer, Flame } from 'lucide-react';
import NeonTitle from './NeonTitle';
import GameBoard from './GameBoard';
import PieceTray from './PieceTray';
import DPad from './DPad';
import { pieces } from '../utils/pieces';
import { getPieceCoords, canPlacePiece, canAnyPieceBePlaced, createEmptyBoard, BOARD_SIZE } from '../utils/gameLogic';
import { getRandomPuzzle, PUZZLE_DIFFICULTY } from '../utils/puzzleGenerator';
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

// Animated countdown timer
const SpeedTimer = ({ timeLeft, maxTime, isActive }) => {
  const percentage = (timeLeft / maxTime) * 100;
  const isLow = timeLeft <= 3;
  const isCritical = timeLeft <= 2;
  
  return (
    <div className="relative">
      {/* Outer glow container */}
      <div className={`
        relative p-1 rounded-2xl transition-all duration-300
        ${isCritical ? 'animate-timer-critical' : isLow ? 'animate-timer-pulse' : ''}
      `}
      style={{
        background: isCritical 
          ? 'linear-gradient(135deg, rgba(239,68,68,0.6), rgba(249,115,22,0.6))'
          : isLow 
            ? 'linear-gradient(135deg, rgba(251,191,36,0.4), rgba(249,115,22,0.4))'
            : 'linear-gradient(135deg, rgba(34,211,238,0.3), rgba(168,85,247,0.3))',
        boxShadow: isCritical 
          ? '0 0 30px rgba(239,68,68,0.8), 0 0 60px rgba(239,68,68,0.4)'
          : isLow
            ? '0 0 20px rgba(251,191,36,0.6), 0 0 40px rgba(249,115,22,0.3)'
            : '0 0 15px rgba(34,211,238,0.4)',
      }}>
        <div className="bg-slate-900/90 rounded-xl px-6 py-3 flex items-center gap-4">
          {/* Timer icon */}
          <div className={`relative ${isCritical ? 'animate-bounce' : ''}`}>
            <Timer 
              size={28} 
              className={`transition-colors duration-200 ${
                isCritical ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-cyan-400'
              }`} 
            />
            {isCritical && (
              <div className="absolute inset-0 animate-ping">
                <Timer size={28} className="text-red-400 opacity-50" />
              </div>
            )}
          </div>
          
          {/* Time display */}
          <div className="flex flex-col items-center">
            <div className={`
              text-4xl font-black tabular-nums tracking-wider transition-all duration-200
              ${isCritical ? 'text-red-400 scale-110' : isLow ? 'text-amber-400' : 'text-white'}
            `}>
              {timeLeft.toFixed(1)}
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">seconds</div>
          </div>
          
          {/* Progress bar */}
          <div className="w-24 h-3 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-100 rounded-full ${
                isCritical ? 'bg-gradient-to-r from-red-500 to-orange-500' 
                : isLow ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                : 'bg-gradient-to-r from-cyan-500 to-purple-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Animated rings when critical */}
      {isCritical && (
        <>
          <div className="absolute inset-0 rounded-2xl border-2 border-red-500/50 animate-ping" />
          <div className="absolute inset-0 rounded-2xl border border-red-400/30 animate-pulse" />
        </>
      )}
    </div>
  );
};

// Streak display
const StreakDisplay = ({ streak, isNewRecord }) => (
  <div className="flex items-center gap-3">
    <div className={`
      flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 border
      ${streak >= 5 ? 'border-amber-500/50' : streak >= 3 ? 'border-orange-500/50' : 'border-slate-600/50'}
    `}
    style={{
      boxShadow: streak >= 5 
        ? '0 0 20px rgba(251,191,36,0.4)'
        : streak >= 3 
          ? '0 0 15px rgba(249,115,22,0.3)'
          : 'none'
    }}>
      <Flame 
        size={22} 
        className={`${
          streak >= 5 ? 'text-amber-400' : streak >= 3 ? 'text-orange-400' : 'text-slate-500'
        } ${streak >= 3 ? 'animate-pulse' : ''}`} 
      />
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-wider">Streak</div>
        <div className={`text-2xl font-black ${
          streak >= 5 ? 'text-amber-400' : streak >= 3 ? 'text-orange-400' : 'text-white'
        }`}>
          {streak}
        </div>
      </div>
    </div>
    
    {isNewRecord && (
      <div className="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/50 animate-bounce">
        <Trophy size={16} className="text-amber-400" />
        <span className="text-amber-400 text-xs font-bold">NEW BEST!</span>
      </div>
    )}
  </div>
);

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
  const loadNewPuzzle = useCallback(async () => {
    setGameState('loading');
    
    try {
      const puzzle = await getRandomPuzzle(PUZZLE_DIFFICULTY.EASY, false);
      
      if (puzzle) {
        // Set up board state from puzzle
        const newBoard = createEmptyBoard();
        const newBoardPieces = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
        
        // Place pre-placed pieces
        for (const placement of puzzle.placements) {
          const coords = getPieceCoords(placement.pieceType, placement.rotation, placement.flipped);
          const playerNum = placement.player;
          
          for (const [dr, dc] of coords) {
            const r = placement.row + dr;
            const c = placement.col + dc;
            if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
              newBoard[r][c] = playerNum;
              newBoardPieces[r][c] = placement.pieceType;
            }
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
        
        // Start playing
        setTimeLeft(TIMER_DURATION);
        lastTickRef.current = Date.now();
        setGameState('playing');
      }
    } catch (err) {
      console.error('Failed to load puzzle:', err);
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
