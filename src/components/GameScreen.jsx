import { useState, useEffect } from 'react';
import NeonTitle from './NeonTitle';
import GameBoard from './GameBoard';
import PieceTray from './PieceTray';
import ControlButtons from './ControlButtons';
import DPad from './DPad';
import PlayerIndicator from './PlayerIndicator';
import GameStatus from './GameStatus';
import GameOverModal from './GameOverModal';
import { getPieceCoords, canPlacePiece } from '../utils/gameLogic';
import { soundManager } from '../utils/soundManager';
import { AI_DIFFICULTY } from '../utils/aiLogic';
import { PUZZLE_DIFFICULTY } from '../utils/puzzleGenerator';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

// Theme configurations for each difficulty
const difficultyThemes = {
  // Beginner / Easy - Green forest theme
  beginner: {
    gridColor: 'rgba(34,197,94,0.3)',
    glow1: 'bg-green-500/20',
    glow2: 'bg-emerald-500/15',
    panelBorder: 'border-green-500/30',
    panelShadow: 'shadow-[0_0_30px_rgba(34,197,94,0.2)]',
    accentColor: 'text-green-400',
    badgeBg: 'bg-gradient-to-r from-green-900/80 to-emerald-900/80',
    badgeBorder: 'border-green-500/50',
    badgeGlow: 'shadow-[0_0_20px_rgba(34,197,94,0.4)]',
    icon: '🌱',
    label: 'BEGINNER',
  },
  // Intermediate / Medium - Amber fire theme
  intermediate: {
    gridColor: 'rgba(251,191,36,0.3)',
    glow1: 'bg-amber-500/20',
    glow2: 'bg-orange-500/15',
    panelBorder: 'border-amber-500/30',
    panelShadow: 'shadow-[0_0_30px_rgba(251,191,36,0.2)]',
    accentColor: 'text-amber-400',
    badgeBg: 'bg-gradient-to-r from-amber-900/80 to-orange-900/80',
    badgeBorder: 'border-amber-500/50',
    badgeGlow: 'shadow-[0_0_20px_rgba(251,191,36,0.4)]',
    icon: '🔥',
    label: 'INTERMEDIATE',
  },
  // Expert / Hard - Purple cosmic theme
  expert: {
    gridColor: 'rgba(168,85,247,0.3)',
    glow1: 'bg-purple-500/20',
    glow2: 'bg-pink-500/15',
    panelBorder: 'border-purple-500/30',
    panelShadow: 'shadow-[0_0_30px_rgba(168,85,247,0.2)]',
    accentColor: 'text-purple-400',
    badgeBg: 'bg-gradient-to-r from-purple-900/80 to-pink-900/80',
    badgeBorder: 'border-purple-500/50',
    badgeGlow: 'shadow-[0_0_20px_rgba(168,85,247,0.4)]',
    icon: '✨',
    label: 'EXPERT',
  },
  // Default - Cyan theme (for 2-player or fallback)
  default: {
    gridColor: 'rgba(34,211,238,0.3)',
    glow1: 'bg-cyan-500/20',
    glow2: 'bg-pink-500/15',
    panelBorder: 'border-cyan-500/20',
    panelShadow: '',
    accentColor: 'text-cyan-400',
    badgeBg: '',
    badgeBorder: '',
    badgeGlow: '',
    icon: '',
    label: '',
  },
};

// Get theme based on difficulty
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

// Themed difficulty badge component
const DifficultyBadge = ({ theme }) => {
  if (!theme.label) return null;
  
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${theme.badgeBg} ${theme.badgeBorder} border ${theme.badgeGlow} backdrop-blur-sm`}>
      <span className="text-lg">{theme.icon}</span>
      <span className={`font-bold tracking-widest text-xs ${theme.accentColor}`}>
        {theme.label}
      </span>
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
  onCellClick,
  onSelectPiece,
  onRotate,
  onFlip,
  onConfirm,
  onCancel,
  onMovePiece,
  onUndo,
  onReset,
  onRetryPuzzle,
  onMenu
}) => {
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const { needsScroll } = useResponsiveLayout(750);

  // Get puzzle difficulty from current puzzle
  const puzzleDifficulty = currentPuzzle?.difficulty;
  
  // Get theme for current game
  const theme = getTheme(gameMode, aiDifficulty, puzzleDifficulty);

  useEffect(() => {
    if (gameOver) {
      const timer = setTimeout(() => setShowGameOverModal(true), 500);
      return () => clearTimeout(timer);
    } else {
      setShowGameOverModal(false);
    }
  }, [gameOver]);

  const canConfirm = pendingMove && canPlacePiece(
    board, 
    pendingMove.row, 
    pendingMove.col, 
    getPieceCoords(pendingMove.piece, rotation, flipped)
  );

  const handleMenuClick = () => {
    soundManager.playButtonClick();
    onMenu();
  };

  const handleCloseModal = () => setShowGameOverModal(false);

  const playerWon = winner === 1;
  const isPuzzle = gameMode === 'puzzle';
  const showDifficultyBadge = gameMode === 'ai' || gameMode === 'puzzle';

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
      <div className="fixed inset-0 opacity-20 pointer-events-none" style={{
        backgroundImage: `linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />
      
      {/* Themed glow effects */}
      <div className={`fixed top-1/4 left-1/4 w-72 h-72 ${theme.glow1} rounded-full blur-3xl pointer-events-none`} />
      <div className={`fixed bottom-1/4 right-1/4 w-72 h-72 ${theme.glow2} rounded-full blur-3xl pointer-events-none`} />
      
      {/* Content */}
      <div className={`relative ${needsScroll ? 'min-h-screen' : 'h-full flex flex-col'} p-2 sm:p-4`}>
        <div className={`max-w-lg mx-auto w-full ${needsScroll ? '' : 'flex-1 flex flex-col'}`}>
          {/* Header */}
          <div className="flex items-center justify-center mb-2 sm:mb-3 relative flex-shrink-0">
            <NeonTitle className="text-xl sm:text-2xl" />
            <button 
              onClick={handleMenuClick}
              className="absolute right-0 px-3 py-1.5 bg-slate-800 text-cyan-300 rounded-lg text-xs sm:text-sm border border-cyan-500/30 hover:bg-slate-700 shadow-[0_0_10px_rgba(34,211,238,0.3)]"
            >
              MENU
            </button>
          </div>

          {/* Themed Difficulty Badge */}
          {showDifficultyBadge && theme.label && (
            <div className="flex justify-center mb-3 flex-shrink-0">
              <DifficultyBadge theme={theme} />
            </div>
          )}

          {/* Puzzle Info */}
          {gameMode === 'puzzle' && currentPuzzle && !isGeneratingPuzzle && (
            <div className={`${theme.badgeBg} ${theme.badgeBorder} border rounded-lg p-2 mb-2 text-center flex-shrink-0`}>
              <span className={`font-bold ${theme.accentColor} text-sm`}>{currentPuzzle.name}</span>
              <span className={`${theme.accentColor} opacity-70 text-xs ml-2`}>- {currentPuzzle.description}</span>
            </div>
          )}

          {/* Generating Puzzle */}
          {isGeneratingPuzzle && (
            <div className={`${theme.badgeBg} ${theme.badgeBorder} border rounded-lg p-3 mb-2 text-center flex-shrink-0`}>
              <div className="flex items-center justify-center gap-2">
                <div className={`w-4 h-4 border-2 ${theme.accentColor.replace('text', 'border')} border-t-transparent rounded-full animate-spin`} />
                <span className={`font-bold ${theme.accentColor} text-sm`}>Generating Puzzle...</span>
              </div>
            </div>
          )}

          {/* Main Game Panel */}
          <div className={`bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-xl p-2 sm:p-4 mb-2 border ${theme.panelBorder} ${theme.panelShadow} ${needsScroll ? '' : 'flex-shrink-0'}`}>
            <PlayerIndicator currentPlayer={currentPlayer} gameMode={gameMode} />
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
              />
            </div>

            {pendingMove && !isGeneratingPuzzle && <DPad onMove={onMovePiece} />}

            <ControlButtons
              selectedPiece={selectedPiece}
              pendingMove={pendingMove}
              canConfirm={canConfirm}
              gameOver={gameOver}
              gameMode={gameMode}
              currentPlayer={currentPlayer}
              moveHistoryLength={moveHistory.length}
              isGeneratingPuzzle={isGeneratingPuzzle}
              onRotate={onRotate}
              onFlip={onFlip}
              onConfirm={onConfirm}
              onCancel={onCancel}
              onUndo={onUndo}
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
          
          {/* Bottom padding */}
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
        />
      )}
    </div>
  );
};

export default GameScreen;
