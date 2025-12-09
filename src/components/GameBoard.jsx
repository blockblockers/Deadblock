import { pieceColors } from '../utils/pieces';
import { getPieceCoords, canPlacePiece, BOARD_SIZE } from '../utils/gameLogic';

const GameBoard = ({ 
  board, 
  boardPieces = {}, 
  pendingMove, 
  rotation, 
  flipped,
  gameOver,
  gameMode,
  currentPlayer,
  onCellClick 
}) => {
  // Ensure board is valid before rendering
  const safeBoard = Array.isArray(board) && board.length === BOARD_SIZE 
    ? board.map(row => Array.isArray(row) ? row : Array(BOARD_SIZE).fill(null))
    : Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  
  const safeBoardPieces = boardPieces || {};
  
  const isDisabled = gameOver || ((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2);

  // Calculate pending piece cells (both in-bounds and out-of-bounds)
  let pendingCells = [];
  let outOfBoundsCells = [];
  let isPendingValid = false;
  
  if (pendingMove) {
    const pieceCoords = getPieceCoords(pendingMove.piece, rotation, flipped);
    
    pieceCoords.forEach(([dx, dy]) => {
      const cellRow = pendingMove.row + dy;
      const cellCol = pendingMove.col + dx;
      
      if (cellRow >= 0 && cellRow < BOARD_SIZE && cellCol >= 0 && cellCol < BOARD_SIZE) {
        pendingCells.push({ row: cellRow, col: cellCol });
      } else {
        outOfBoundsCells.push({ row: cellRow, col: cellCol });
      }
    });
    
    // Valid only if all cells in bounds AND no overlaps
    isPendingValid = outOfBoundsCells.length === 0 && 
      canPlacePiece(board, pendingMove.row, pendingMove.col, pieceCoords);
  }

  // Cell dimensions for positioning ghost cells
  // Mobile: 36px (w-9) + 2px gap, Desktop: 48px (sm:w-12) + 4px gap
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const cellSize = isMobile ? 36 : 48;
  const gapSize = isMobile ? 2 : 4;
  const padding = 8; // p-2

  return (
    <div className="relative inline-block mx-auto touch-none">
      {/* Main board */}
      <div className="inline-grid gap-0.5 sm:gap-1 bg-slate-950 p-2 rounded-xl shadow-[0_0_30px_rgba(34,211,238,0.3),inset_0_0_30px_rgba(0,0,0,0.5)] border border-cyan-500/30">
        {safeBoard.map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-0.5 sm:gap-1">
            {(row || []).map((cell, colIdx) => {
              const pieceName = safeBoardPieces[rowIdx]?.[colIdx];
              const isInBoundsPendingCell = pendingCells.some(c => c.row === rowIdx && c.col === colIdx);
              const hasOverlap = isInBoundsPendingCell && cell !== null;
              const hasOutOfBounds = outOfBoundsCells.length > 0;
              
              // Determine background color
              let bgClass;
              if (isInBoundsPendingCell) {
                if (hasOverlap) {
                  bgClass = pieceColors[pieceName];
                } else if (hasOutOfBounds) {
                  // Part of piece is out of bounds - dim the in-bounds cells
                  bgClass = `${pieceColors[pendingMove.piece]} opacity-60`;
                } else {
                  bgClass = pieceColors[pendingMove.piece];
                }
              } else if (cell !== null && pieceName) {
                bgClass = pieceColors[pieceName];
              } else {
                bgClass = 'bg-slate-800/80 hover:bg-slate-700/80 border border-cyan-500/20 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]';
              }
              
              // Determine ring style
              let ringClass = '';
              if (isInBoundsPendingCell) {
                if (hasOverlap) {
                  ringClass = 'ring-2 ring-red-500 shadow-[0_0_25px_rgba(239,68,68,0.8)] animate-pulse';
                } else if (hasOutOfBounds) {
                  // Orange warning ring when piece extends out of bounds
                  ringClass = 'ring-2 ring-orange-400 shadow-[0_0_20px_rgba(251,146,60,0.6)]';
                } else {
                  ringClass = 'ring-2 ring-green-400 shadow-[0_0_25px_rgba(74,222,128,0.8)]';
                }
              }
              
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

      {/* Out-of-bounds ghost cells - positioned absolutely outside the grid */}
      {outOfBoundsCells.map(({ row, col }, idx) => {
        // Calculate position relative to the board container
        const left = padding + col * (cellSize + gapSize);
        const top = padding + row * (cellSize + gapSize);
        
        return (
          <div
            key={`ghost-${idx}`}
            className="absolute pointer-events-none z-10"
            style={{
              left: `${left}px`,
              top: `${top}px`,
              width: `${cellSize}px`,
              height: `${cellSize}px`,
            }}
          >
            <div className="w-full h-full rounded-lg bg-red-500/40 border-2 border-dashed border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.7)] animate-pulse flex items-center justify-center backdrop-blur-sm">
              <svg 
                className="w-4 h-4 sm:w-5 sm:h-5 text-red-300 drop-shadow-[0_0_4px_rgba(239,68,68,0.8)]" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        );
      })}

      {/* Warning message when piece extends out of bounds */}
      {outOfBoundsCells.length > 0 && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap z-20">
          <span className="text-xs text-orange-400 font-semibold tracking-wide bg-slate-900/90 px-3 py-1 rounded-full border border-orange-500/30 shadow-[0_0_10px_rgba(251,146,60,0.4)]">
            ⚠️ ROTATE or FLIP to fit
          </span>
        </div>
      )}
    </div>
  );
};

export default GameBoard;
