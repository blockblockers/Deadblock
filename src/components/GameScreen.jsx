import { useMemo } from 'react';
import Board from './Board';
import PieceTray from './PieceTray';
import ControlButtons from './ControlButtons';
import DPad from './DPad';
import GameHeader from './GameHeader';
import { getPieceCoords, canPlacePiece } from '../utils/gameLogic';

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
  // Calculate if pending move can be confirmed
  const canConfirm = useMemo(() => {
    if (!pendingMove) return false;
    const pieceCoords = getPieceCoords(pendingMove.piece, rotation, flipped);
    return canPlacePiece(board, pendingMove.row, pendingMove.col, pieceCoords);
  }, [pendingMove, board, rotation, flipped]);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-2 sm:p-4 relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)',
        backgroundSize: '30px 30px'
      }} />

      {/* Game Container */}
      <div className="relative max-w-md mx-auto flex flex-col" style={{ minHeight: 'calc(100vh - 1rem)' }}>
        {/* Header */}
        <GameHeader
          gameMode={gameMode}
          currentPlayer={currentPlayer}
          gameOver={gameOver}
          winner={winner}
          isAIThinking={isAIThinking}
          currentPuzzle={currentPuzzle}
          aiDifficulty={aiDifficulty}
          onMenu={onMenu}
        />

        {/* Main Game Area */}
        <div className="flex-shrink-0">
          {/* Board */}
          <div className="flex justify-center mb-2">
            <Board
              board={board}
              boardPieces={boardPieces}
              selectedPiece={selectedPiece}
              rotation={rotation}
              flipped={flipped}
              pendingMove={pendingMove}
              gameOver={gameOver}
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
      </div>
    </div>
  );
};

export default GameScreen;
