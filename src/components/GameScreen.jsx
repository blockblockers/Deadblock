import NeonTitle from './NeonTitle';
import GameBoard from './GameBoard';
import PieceTray from './PieceTray';
import ControlButtons from './ControlButtons';
import DPad from './DPad';
import PlayerIndicator from './PlayerIndicator';
import GameStatus from './GameStatus';
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
  onMenu
}) => {
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

  return (
    <div 
      className="game-board-container bg-slate-950"
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        touchAction: 'none', // Prevent any touch scrolling on game screen
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      {/* Grid background - fixed, no pointer events */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none" 
        style={{
          backgroundImage: 'linear-gradient(rgba(34,211,238,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.4) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} 
      />
      
      {/* Main content container - flex column to distribute space */}
      <div 
        className="relative h-full w-full flex flex-col max-w-6xl mx-auto"
        style={{
          paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0))',
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0))',
          paddingLeft: 'max(0.5rem, env(safe-area-inset-left, 0))',
          paddingRight: 'max(0.5rem, env(safe-area-inset-right, 0))',
        }}
      >
        {/* Header - fixed height */}
        <div className="flex items-center justify-between mb-2 px-2 flex-shrink-0">
          <NeonTitle className="text-xl sm:text-3xl md:text-4xl">DEADBLOCK</NeonTitle>
          <button 
            onClick={handleMenuClick}
            className="px-3 py-1.5 bg-slate-800 text-cyan-300 rounded-lg text-xs sm:text-sm border border-cyan-500/30 hover:bg-slate-700 shadow-[0_0_10px_rgba(34,211,238,0.3)] touch-manipulation active:scale-95 transition-transform"
          >
            MENU
          </button>
        </div>

        {/* AI Difficulty Badge - fixed height */}
        {gameMode === 'ai' && aiDifficulty && (
          <div className={`text-center mb-2 flex-shrink-0 ${
            aiDifficulty === AI_DIFFICULTY.RANDOM 
              ? 'text-green-400' 
              : aiDifficulty === AI_DIFFICULTY.AVERAGE 
                ? 'text-yellow-400' 
                : 'text-red-400'
          }`}>
            <span className="text-xs sm:text-sm px-2 py-0.5 bg-slate-800/50 rounded-full border border-current/30">
              {aiDifficulty.toUpperCase()} AI
            </span>
          </div>
        )}

        {/* Puzzle Mode Label - fixed height */}
        {gameMode === 'puzzle' && currentPuzzle && (
          <div className="text-center mb-2 flex-shrink-0">
            <span className="text-emerald-400 text-xs sm:text-sm px-2 py-0.5 bg-slate-800/50 rounded-full border border-emerald-500/30">
              PUZZLE {currentPuzzle.id}
            </span>
          </div>
        )}

        {/* Player Indicator / Game Status - fixed height */}
        <div className="flex-shrink-0">
          {!gameOver ? (
            <PlayerIndicator 
              currentPlayer={currentPlayer} 
              gameMode={gameMode}
              isAIThinking={isAIThinking}
              isGeneratingPuzzle={isGeneratingPuzzle}
            />
          ) : (
            <GameStatus 
              winner={winner} 
              gameMode={gameMode}
              currentPuzzle={currentPuzzle}
            />
          )}
        </div>

        {/* Game Board Area - flexible, takes remaining space */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 py-2">
          <div className="relative">
            <GameBoard 
              board={board}
              boardPieces={boardPieces}
              selectedPiece={selectedPiece}
              rotation={rotation}
              flipped={flipped}
              pendingMove={pendingMove}
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
          />
        </div>

        {/* Piece Tray - fixed at bottom, horizontal scroll */}
        <div className="flex-shrink-0">
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
      </div>
    </div>
  );
};

export default GameScreen;
