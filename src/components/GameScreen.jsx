import { useState, useEffect } from 'react';
import NeonTitle from './NeonTitle';
import NeonSubtitle from './NeonSubtitle';
import GameBoard from './GameBoard';
import PieceTray from './PieceTray';
import ControlButtons from './ControlButtons';
import DPad from './DPad';
import GameStatus from './GameStatus';
import GameOverModal from './GameOverModal';
import { getPieceCoords, canPlacePiece } from '../utils/gameLogic';
import { soundManager } from '../utils/soundManager';
import { AI_DIFFICULTY } from '../utils/aiLogic';
import { PUZZLE_DIFFICULTY } from '../utils/puzzleGenerator';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

// Theme configurations for each difficulty
const difficultyThemes = {
  beginner: {
    gridColor: 'rgba(34,197,94,0.4)',
    glow1: 'bg-green-500/30',
    glow2: 'bg-emerald-400/20',
    panelBorder: 'border-green-500/40',
    panelShadow: 'shadow-[0_0_40px_rgba(34,197,94,0.3)]',
    label: 'BEGINNER',
    labelBg: 'from-green-600 via-emerald-500 to-green-600',
    labelGlow: 'shadow-[0_0_30px_rgba(34,197,94,0.8)]',
    labelBorder: 'border-green-400/50',
  },
  intermediate: {
    gridColor: 'rgba(251,191,36,0.4)',
    glow1: 'bg-amber-500/30',
    glow2: 'bg-orange-400/20',
    panelBorder: 'border-amber-500/40',
    panelShadow: 'shadow-[0_0_40px_rgba(251,191,36,0.3)]',
    label: 'INTERMEDIATE',
    labelBg: 'from-amber-600 via-orange-500 to-amber-600',
    labelGlow: 'shadow-[0_0_30px_rgba(251,191,36,0.8)]',
    labelBorder: 'border-amber-400/50',
  },
  expert: {
    gridColor: 'rgba(168,85,247,0.4)',
    glow1: 'bg-purple-500/30',
    glow2: 'bg-pink-400/20',
    panelBorder: 'border-purple-500/40',
    panelShadow: 'shadow-[0_0_40px_rgba(168,85,247,0.3)]',
    label: 'EXPERT',
    labelBg: 'from-purple-600 via-pink-500 to-purple-600',
    labelGlow: 'shadow-[0_0_30px_rgba(168,85,247,0.8)]',
    labelBorder: 'border-purple-400/50',
  },
  default: {
    gridColor: 'rgba(34,211,238,0.3)',
    glow1: 'bg-cyan-500/20',
    glow2: 'bg-pink-500/15',
    panelBorder: 'border-cyan-500/20',
    panelShadow: '',
    label: '',
    labelBg: '',
    labelGlow: '',
    labelBorder: '',
  },
};

const getTheme = (gameMode, aiDifficulty, puzzleDifficulty) => {
  if (gameMode === 'ai') {
    if (aiDifficulty === AI_DIFFICULTY.RANDOM) return difficultyThemes.beginner;
    if (aiDifficulty === AI_DIFFICULTY.AVERAGE) return difficultyThemes.intermediate;
    if (aiDifficulty === AI_DIFFICULTY.PROFESSIONAL) return difficultyThemes.expert;
  }
  if (gameMode === 'puzzle') {
    if (puzzleDifficulty === PUZZLE_DIFFICULTY.EASY) return difficultyThemes.beginner;
    if (puzzleDifficulty === PUZZLE_DIFFICULTY.MEDIUM) return difficultyThemes.intermediate;
    if (puzzleDifficulty === PUZZLE_DIFFICULTY.HARD) return difficultyThemes.expert;
  }
  return difficultyThemes.default;
};

// Animated player indicator with difficulty in center
const PlayerBar = ({ currentPlayer, gameMode, theme, isAIThinking }) => {
  const is2Player = gameMode === '2player';
  const isPuzzle = gameMode === 'puzzle';
  
  const player1Active = currentPlayer === 1;
  const player2Active = currentPlayer === 2;
  
  return (
    <div className="flex items-center justify-between mb-3">
      {/* Player 1 */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${
        player1Active 
          ? 'bg-cyan-500/20 border border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.4)]' 
          : 'bg-slate-800/50 border border-slate-700/50'
      }`}>
        <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
          player1Active ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] animate-pulse' : 'bg-slate-600'
        }`} />
        <span className={`text-sm font-bold tracking-wide ${player1Active ? 'text-cyan-300' : 'text-slate-500'}`}>
          {isPuzzle ? 'YOU' : 'P1'}
        </span>
      </div>
      
      {/* Center - Difficulty Badge (animated) */}
      {theme.label && (
        <div className={`relative px-4 py-1.5 rounded-full bg-gradient-to-r ${theme.labelBg} ${theme.labelGlow} border ${theme.labelBorder}`}>
          {/* Animated shimmer effect */}
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </div>
          <span className="relative text-xs font-black tracking-widest text-white drop-shadow-lg">
            {theme.label}
          </span>
        </div>
      )}
      
      {/* Player 2 / A.I. */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${
        player2Active 
          ? is2Player
            ? 'bg-pink-500/20 border border-pink-400/50 shadow-[0_0_15px_rgba(236,72,153,0.4)]'
            : isAIThinking
              ? 'bg-purple-500/30 border border-purple-400/70 shadow-[0_0_25px_rgba(168,85,247,0.6)]'
              : 'bg-purple-500/20 border border-purple-400/50 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
          : 'bg-slate-800/50 border border-slate-700/50'
      }`}>
        <span className={`text-sm font-bold tracking-wide ${
          player2Active 
            ? is2Player ? 'text-pink-300' : 'text-purple-300'
            : 'text-slate-500'
        }`}>
          {is2Player ? 'P2' : 'A.I.'}
        </span>
        <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
          player2Active 
            ? is2Player 
              ? 'bg-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.8)] animate-pulse'
              : isAIThinking
                ? 'bg-purple-300 shadow-[0_0_15px_rgba(168,85,247,1)]'
                : 'bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.8)] animate-pulse'
            : 'bg-slate-600'
        }`} />
        {isAIThinking && player2Active && (
          <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin ml-1" />
        )}
      </div>
      
      {/* Shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

const GameScreen = ({
  board,
  boardPieces,
  currentPlayer,
  selectedPiece,
  rotation,
  flipped,
  gameOver,
  winner,
  usedPieces,
  moveHistory,
  gameMode,
  isAIThinking,
  pendingMove,
  currentPuzzle,
  aiDifficulty,
  isMobile,
  isGeneratingPuzzle,
  aiAnimatingMove,
  playerAnimatingMove,
  onCellClick,
  onSelectPiece,
  onRotate,
  onFlip,
  onConfirm,
  onCancel,
  onMovePiece,
  onReset,
  onRetryPuzzle,
  onMenu,
  onDifficultySelect
}) => {
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const { needsScroll } = useResponsiveLayout(750);

  const puzzleDifficulty = currentPuzzle?.difficulty;
  const theme = getTheme(gameMode, aiDifficulty, puzzleDifficulty);

  useEffect(() => {
    if (gameOver) {
      const timer = setTimeout(() => setShowGameOverModal(true), 500);
      return () => clearTimeout(timer);
    } else {
      setShowGameOverModal(false);
    }
  }, [gameOver]);

  // Check if pending move is valid
  const isPendingValid = pendingMove && canPlacePiece(
    board, 
    pendingMove.row, 
    pendingMove.col, 
    getPieceCoords(pendingMove.piece, rotation, flipped)
  );
  
  const canConfirm = isPendingValid;

  // UPDATED: Handle error messages for invalid placement
  useEffect(() => {
    if (pendingMove && !isPendingValid) {
      // Check why it's invalid
      const coords = getPieceCoords(pendingMove.piece, rotation, flipped);
      let isOutOfBounds = false;
      let isOverlapping = false;
      
      for (const [dx, dy] of coords) {
        const newRow = pendingMove.row + dy;
        const newCol = pendingMove.col + dx;
        if (newRow < 0 || newRow >= 8 || newCol < 0 || newCol >= 8) {
          isOutOfBounds = true;
        } else if (board[newRow]?.[newCol] !== null && board[newRow]?.[newCol] !== 0) {
          isOverlapping = true;
        }
      }
      
      if (isOutOfBounds) {
        setErrorMessage('Piece extends off the board!');
      } else if (isOverlapping) {
        setErrorMessage('Cannot place on existing pieces!');
      } else {
        setErrorMessage('Invalid placement');
      }
    } else {
      setErrorMessage(null);
    }
  }, [pendingMove, isPendingValid, board, rotation, flipped]);

  const handleMenuClick = () => {
    soundManager.playButtonClick();
    onMenu();
  };

  const handleCloseModal = () => setShowGameOverModal(false);

  const playerWon = winner === 1;
  const isPuzzle = gameMode === 'puzzle';

  return (
    <div 
      className={needsScroll ? 'min-h-screen bg-slate-950' : 'h-screen bg-slate-950 overflow-hidden'}
      style={needsScroll ? {
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
      } : {}}
    >
      {/* Themed Grid background */}
      <div className="fixed inset-0 opacity-25 pointer-events-none transition-all duration-500" style={{
        backgroundImage: `linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />
      
      {/* Themed glow effects */}
      <div className={`fixed top-1/4 left-1/4 w-80 h-80 ${theme.glow1} rounded-full blur-3xl pointer-events-none transition-all duration-500`} />
      <div className={`fixed bottom-1/4 right-1/4 w-80 h-80 ${theme.glow2} rounded-full blur-3xl pointer-events-none transition-all duration-500`} />
      
      {/* Content */}
      <div className={`relative ${needsScroll ? 'min-h-screen' : 'h-full flex flex-col'} p-2 sm:p-4`}>
        <div className={`max-w-lg mx-auto w-full ${needsScroll ? '' : 'flex-1 flex flex-col'}`}>
          {/* Header */}
          <div className="flex items-center justify-center mb-2 sm:mb-3 relative flex-shrink-0">
            <div className="text-center">
              {/* UPDATED: Consistent title size across all game modes */}
              <NeonTitle size="small" />
              {/* UPDATED: Consistent subtitle sizing - slightly larger for 2 player */}
              {gameMode === 'ai' && (
                <div className="mt-1">
                  <NeonSubtitle text="VS A.I." size="small" color="purple" />
                </div>
              )}
              {gameMode === '2player' && (
                <div className="mt-1">
                  {/* UPDATED: Larger subtitle for 2 player mode */}
                  <NeonSubtitle text="2 PLAYER" size="default" color="cyan" />
                </div>
              )}
              {gameMode === 'puzzle' && (
                <div className="mt-1">
                  <NeonSubtitle text="PUZZLE" size="small" color="green" />
                </div>
              )}
            </div>
            <button 
              onClick={handleMenuClick}
              className="absolute right-0 px-3 py-1.5 bg-slate-800 text-cyan-300 rounded-lg text-xs sm:text-sm border border-cyan-500/30 hover:bg-slate-700 shadow-[0_0_10px_rgba(34,211,238,0.3)]"
            >
              MENU
            </button>
          </div>

          {/* UPDATED: Removed puzzle "moves remaining" info box */}
          {/* The difficulty was already shown in the menu, no need to repeat */}

          {/* Generating Puzzle */}
          {isGeneratingPuzzle && (
            <div className={`bg-slate-800/60 border ${theme.panelBorder} rounded-lg p-3 mb-2 text-center flex-shrink-0`}>
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span className="font-bold text-cyan-300 text-sm">Generating Puzzle...</span>
              </div>
            </div>
          )}

          {/* Main Game Panel */}
          <div className={`bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-xl p-2 sm:p-4 mb-2 border ${theme.panelBorder} ${theme.panelShadow} ${needsScroll ? '' : 'flex-shrink-0'}`}>
            
            {/* Player Bar with centered difficulty */}
            <PlayerBar 
              currentPlayer={currentPlayer} 
              gameMode={gameMode} 
              theme={theme}
              isAIThinking={isAIThinking}
            />
            
            <GameStatus isAIThinking={isAIThinking} gameOver={gameOver} winner={winner} gameMode={gameMode} aiDifficulty={aiDifficulty} />

            {/* Game Board */}
            <div className="flex justify-center pb-4">
              <GameBoard
                board={board}
                boardPieces={boardPieces}
                pendingMove={pendingMove}
                rotation={rotation}
                flipped={flipped}
                gameOver={gameOver}
                gameMode={gameMode}
                currentPlayer={currentPlayer}
                onCellClick={onCellClick}
                aiAnimatingMove={aiAnimatingMove}
                playerAnimatingMove={playerAnimatingMove}
                selectedPiece={selectedPiece}
              />
            </div>

            {/* UPDATED: D-Pad and Error Message Layout */}
            {pendingMove && !isGeneratingPuzzle && (
              <div className="flex items-start justify-center gap-3 mb-2">
                {/* Error message box - left of d-pad */}
                <div className="flex-shrink-0 w-24">
                  {errorMessage && (
                    <div className="error-message-box bg-red-900/80 border border-red-500/60 rounded-lg p-2 text-center shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                      <span className="text-red-300 text-xs font-bold leading-tight block">
                        {errorMessage}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* D-Pad */}
                <DPad onMove={onMovePiece} />
                
                {/* Spacer for symmetry */}
                <div className="flex-shrink-0 w-24" />
              </div>
            )}

            <ControlButtons
              selectedPiece={selectedPiece}
              pendingMove={pendingMove}
              canConfirm={canConfirm}
              gameOver={gameOver}
              gameMode={gameMode}
              currentPlayer={currentPlayer}
              isGeneratingPuzzle={isGeneratingPuzzle}
              onRotate={onRotate}
              onFlip={onFlip}
              onConfirm={onConfirm}
              onCancel={onCancel}
              onReset={onReset}
              onRetryPuzzle={onRetryPuzzle}
            />
          </div>

          {/* Piece Tray */}
          <div className={needsScroll ? '' : 'flex-1 min-h-0 overflow-auto'}>
            <PieceTray
              usedPieces={usedPieces}
              selectedPiece={selectedPiece}
              pendingMove={pendingMove}
              gameOver={gameOver}
              gameMode={gameMode}
              currentPlayer={currentPlayer}
              isMobile={isMobile}
              isGeneratingPuzzle={isGeneratingPuzzle}
              onSelectPiece={onSelectPiece}
            />
          </div>
          
          {needsScroll && <div className="h-8" />}
        </div>
      </div>

      {/* Game Over Modal */}
      {showGameOverModal && (
        <GameOverModal
          isWin={playerWon}
          isPuzzle={isPuzzle}
          gameMode={gameMode}
          winner={winner}
          onClose={handleCloseModal}
          onRetry={isPuzzle ? onRetryPuzzle : onReset}
          onNewGame={onReset}
          onMenu={onMenu}
          onDifficultySelect={onDifficultySelect}
        />
      )}
      
      {/* UPDATED: Error message animation styles */}
      <style>{`
        .error-message-box {
          animation: error-shake 0.5s ease-in-out, error-pulse 1.5s ease-in-out infinite;
        }
        @keyframes error-shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
        @keyframes error-pulse {
          0%, 100% { box-shadow: 0 0 15px rgba(239,68,68,0.4); }
          50% { box-shadow: 0 0 25px rgba(239,68,68,0.6); }
        }
      `}</style>
    </div>
  );
};

export default GameScreen;
