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

  // Show game over modal when game ends
  useEffect(() => {
    if (gameOver) {
      const timer = setTimeout(() => {
        setShowGameOverModal(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setShowGameOverModal(false);
    }
  }, [gameOver]);

  // Check if pending move can be confirmed
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

  const handleCloseModal = () => {
    setShowGameOverModal(false);
  };

  // Determine if player won
  const playerWon = winner === 1;
  const isPuzzle = gameMode === 'puzzle';

  return (
    <div 
      className="min-h-screen bg-slate-950 overflow-x-hidden"
      style={{ 
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
      }}
    >
      {/* Grid background - fixed */}
      <div className="fixed inset-0 opacity-20 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(34,211,238,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.4) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />
      
      {/* Content wrapper */}
      <div className="relative min-h-screen p-2 sm:p-4 pb-16">
        <div className="max-w-lg mx-auto">
          {/* Header - CENTERED */}
          <div className="flex items-center justify-center mb-2 sm:mb-4 relative">
            <NeonTitle className="text-xl sm:text-3xl md:text-4xl text-center">DEADBLOCK</NeonTitle>
            <button 
              onClick={handleMenuClick}
              className="absolute right-0 px-3 py-1.5 bg-slate-800 text-cyan-300 rounded-lg text-xs sm:text-sm border border-cyan-500/30 hover:bg-slate-700 shadow-[0_0_10px_rgba(34,211,238,0.3)]"
            >
              MENU
            </button>
          </div>

          {/* AI Difficulty Badge */}
          {gameMode === 'ai' && aiDifficulty && (
            <div className={`text-center mb-2 ${
              aiDifficulty === AI_DIFFICULTY.RANDOM 
                ? 'text-green-400' 
                : aiDifficulty === AI_DIFFICULTY.AVERAGE 
                  ? 'text-amber-400' 
                  : 'text-purple-400'
            }`}>
              <span className="text-xs tracking-widest opacity-70">
                {aiDifficulty === AI_DIFFICULTY.RANDOM && '🎲 BEGINNER MODE'}
                {aiDifficulty === AI_DIFFICULTY.AVERAGE && '🧠 INTERMEDIATE MODE'}
                {aiDifficulty === AI_DIFFICULTY.PROFESSIONAL && '✨ EXPERT MODE (Claude AI)'}
              </span>
            </div>
          )}

          {/* Puzzle Info */}
          {gameMode === 'puzzle' && currentPuzzle && !isGeneratingPuzzle && (
            <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-2 mb-2 text-center shadow-[0_0_15px_rgba(74,222,128,0.3)]">
              <span className="font-bold text-green-300 text-sm">{currentPuzzle.name}</span>
              <span className="text-green-400/70 text-xs ml-2">- {currentPuzzle.description}</span>
            </div>
          )}

          {/* Generating Puzzle Message */}
          {isGeneratingPuzzle && (
            <div className="bg-cyan-900/30 border border-cyan-500/50 rounded-lg p-3 mb-2 text-center shadow-[0_0_15px_rgba(34,211,238,0.3)]">
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="font-bold text-cyan-300 text-sm">Generating New Puzzle...</span>
              </div>
              <span className="text-cyan-400/70 text-xs">Claude AI is creating a challenge for you</span>
            </div>
          )}

          {/* Main Game Panel */}
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-xl p-2 sm:p-4 mb-2 border border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
            {/* Player Indicator */}
            <PlayerIndicator currentPlayer={currentPlayer} gameMode={gameMode} />

            {/* Game Status Messages */}
            <GameStatus 
              isAIThinking={isAIThinking}
              gameOver={gameOver}
              winner={winner}
              gameMode={gameMode}
              aiDifficulty={aiDifficulty}
            />

            {/* Game Board - CENTERED */}
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

            {/* D-Pad for moving pieces */}
            {pendingMove && !isGeneratingPuzzle && <DPad onMove={onMovePiece} />}

            {/* Control Buttons */}
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
          
          {/* Bottom safe area padding */}
          <div className="h-12" />
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
