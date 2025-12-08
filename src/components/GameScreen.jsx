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
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

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
      {/* Grid background */}
      <div className="fixed inset-0 opacity-20 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(34,211,238,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.4) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />
      
      {/* Content */}
      <div className={`relative ${needsScroll ? 'min-h-screen' : 'h-full flex flex-col'} p-2 sm:p-4`}>
        <div className={`max-w-lg mx-auto w-full ${needsScroll ? '' : 'flex-1 flex flex-col'}`}>
          {/* Header */}
          <div className="flex items-center justify-center mb-2 sm:mb-3 relative flex-shrink-0">
            <NeonTitle className="text-xl sm:text-3xl text-center">DEADBLOCK</NeonTitle>
            <button 
              onClick={handleMenuClick}
              className="absolute right-0 px-3 py-1.5 bg-slate-800 text-cyan-300 rounded-lg text-xs sm:text-sm border border-cyan-500/30 hover:bg-slate-700 shadow-[0_0_10px_rgba(34,211,238,0.3)]"
            >
              MENU
            </button>
          </div>

          {/* AI Difficulty Badge */}
          {gameMode === 'ai' && aiDifficulty && (
            <div className={`text-center mb-2 flex-shrink-0 ${
              aiDifficulty === AI_DIFFICULTY.RANDOM ? 'text-green-400' : 
              aiDifficulty === AI_DIFFICULTY.AVERAGE ? 'text-amber-400' : 'text-purple-400'
            }`}>
              <span className="text-xs tracking-widest opacity-70">
                {aiDifficulty === AI_DIFFICULTY.RANDOM && '🎲 BEGINNER'}
                {aiDifficulty === AI_DIFFICULTY.AVERAGE && '🧠 INTERMEDIATE'}
                {aiDifficulty === AI_DIFFICULTY.PROFESSIONAL && '✨ EXPERT (Claude AI)'}
              </span>
            </div>
          )}

          {/* Puzzle Info */}
          {gameMode === 'puzzle' && currentPuzzle && !isGeneratingPuzzle && (
            <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-2 mb-2 text-center flex-shrink-0">
              <span className="font-bold text-green-300 text-sm">{currentPuzzle.name}</span>
              <span className="text-green-400/70 text-xs ml-2">- {currentPuzzle.description}</span>
            </div>
          )}

          {/* Generating Puzzle */}
          {isGeneratingPuzzle && (
            <div className="bg-cyan-900/30 border border-cyan-500/50 rounded-lg p-3 mb-2 text-center flex-shrink-0">
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span className="font-bold text-cyan-300 text-sm">Generating Puzzle...</span>
              </div>
            </div>
          )}

          {/* Main Game Panel */}
          <div className={`bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-xl p-2 sm:p-4 mb-2 border border-cyan-500/20 ${needsScroll ? '' : 'flex-shrink-0'}`}>
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
