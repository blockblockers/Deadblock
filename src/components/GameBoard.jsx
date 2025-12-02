import { pieceColors } from '../utils/pieces';
import { getPieceCoords, canPlacePiece } from '../utils/gameLogic';

const GameBoard = ({ 
  board, 
  boardPieces, 
  pendingMove, 
  rotation, 
  flipped,
  gameOver,
  gameMode,
  currentPlayer,
  onCellClick 
}) => {
  const isDisabled = gameOver || ((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2);

  return (
    <div className="inline-grid gap-0.5 sm:gap-1 bg-slate-950 p-2 rounded-xl mx-auto touch-none shadow-[0_0_30px_rgba(34,211,238,0.3),inset_0_0_30px_rgba(0,0,0,0.5)] border border-cyan-500/30">
      {board.map((row, rowIdx) => (
        <div key={rowIdx} className="flex gap-0.5 sm:gap-1">
          {row.map((cell, colIdx) => {
            const pieceName = boardPieces[rowIdx][colIdx];
            const isPendingCell = pendingMove && getPieceCoords(pendingMove.piece, rotation, flipped)
              .some(([dx, dy]) => rowIdx === pendingMove.row + dy && colIdx === pendingMove.col + dx);
            const isPendingValid = pendingMove && canPlacePiece(
              board, pendingMove.row, pendingMove.col, getPieceCoords(pendingMove.piece, rotation, flipped)
            );
            
            // Determine background color
            let bgClass;
            if (isPendingCell) {
              if (cell !== null && pieceName) {
                bgClass = pieceColors[pieceName];
              } else {
                bgClass = pieceColors[pendingMove.piece];
              }
            } else if (cell !== null && pieceName) {
              bgClass = pieceColors[pieceName];
            } else {
              bgClass = 'bg-slate-800/80 hover:bg-slate-700/80 border border-cyan-500/20 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]';
            }
            
            // Determine ring style for pending cells
            const ringClass = isPendingCell
              ? isPendingValid 
                ? 'ring-2 ring-green-400 shadow-[0_0_25px_rgba(74,222,128,0.8)]'
                : 'ring-2 ring-red-500 shadow-[0_0_25px_rgba(239,68,68,0.8)] animate-pulse'
              : '';
            
            return (
              <button
                key={colIdx}
                onClick={() => onCellClick(rowIdx, colIdx)}
                className={`w-9 h-9 sm:w-12 sm:h-12 rounded-lg transition-all relative ${bgClass} ${ringClass}`}
                disabled={isDisabled}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default GameBoard;