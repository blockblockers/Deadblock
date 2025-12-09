// GameBoard component with safe null checks
import { memo, useMemo } from 'react';
import { getPieceCoords, canPlacePiece, BOARD_SIZE } from '../utils/gameLogic';

// Default empty board for safety
const createEmptyBoard = () => Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));

// Player colors
const PLAYER_COLORS = {
  1: {
    filled: 'bg-cyan-500',
    border: 'border-cyan-400',
    shadow: 'shadow-[0_0_8px_rgba(34,211,238,0.6)]',
    pending: 'bg-cyan-500/50',
  },
  2: {
    filled: 'bg-pink-500',
    border: 'border-pink-400', 
    shadow: 'shadow-[0_0_8px_rgba(236,72,153,0.6)]',
    pending: 'bg-pink-500/50',
  },
};

const GameBoard = ({
  board,
  boardPieces = {},
  pendingMove,
  rotation = 0,
  flipped = false,
  gameOver = false,
  gameMode = 'ai',
  currentPlayer = 1,
  onCellClick,
}) => {
  // Ensure board is always valid
  const safeBoard = useMemo(() => {
    if (!Array.isArray(board) || board.length !== BOARD_SIZE) {
      console.warn('GameBoard: Invalid board data, using empty board');
      return createEmptyBoard();
    }
    // Ensure each row is valid
    return board.map((row, i) => {
      if (!Array.isArray(row) || row.length !== BOARD_SIZE) {
        console.warn(`GameBoard: Invalid row ${i}, using empty row`);
        return Array(BOARD_SIZE).fill(0);
      }
      return row;
    });
  }, [board]);

  // Calculate pending piece cells
  const pendingCells = useMemo(() => {
    if (!pendingMove?.piece) return new Set();
    
    try {
      const coords = getPieceCoords(pendingMove.piece, rotation, flipped);
      const cells = new Set();
      coords.forEach(([dr, dc]) => {
        const r = pendingMove.row + dr;
        const c = pendingMove.col + dc;
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
          cells.add(`${r},${c}`);
        }
      });
      return cells;
    } catch (e) {
      console.error('Error calculating pending cells:', e);
      return new Set();
    }
  }, [pendingMove, rotation, flipped]);

  // Get cell style
  const getCellStyle = (row, col, value) => {
    const isPending = pendingCells.has(`${row},${col}`);
    const pieceKey = `${row},${col}`;
    const pieceInfo = boardPieces?.[pieceKey];
    
    // Pending move preview
    if (isPending) {
      const colors = PLAYER_COLORS[currentPlayer] || PLAYER_COLORS[1];
      return `${colors.pending} border-2 ${colors.border} rounded-sm animate-pulse`;
    }
    
    // Filled cell
    if (value > 0) {
      const player = pieceInfo?.player || value;
      const colors = PLAYER_COLORS[player] || PLAYER_COLORS[1];
      return `${colors.filled} ${colors.shadow} border ${colors.border} rounded-sm`;
    }
    
    // Empty cell
    return 'bg-slate-800/80 border border-slate-700/50 hover:bg-slate-700/50 rounded-sm';
  };

  // Handle cell click
  const handleClick = (row, col) => {
    if (gameOver) return;
    onCellClick?.(row, col);
  };

  // Calculate cell size based on board
  const cellSize = 'w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10';

  return (
    <div className="inline-block p-2 bg-slate-900/90 rounded-xl border border-slate-700/50">
      <div 
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}
      >
        {safeBoard.map((row, rowIndex) => (
          row.map((cell, colIndex) => (
            <button
              key={`${rowIndex}-${colIndex}`}
              onClick={() => handleClick(rowIndex, colIndex)}
              disabled={gameOver}
              className={`
                ${cellSize}
                ${getCellStyle(rowIndex, colIndex, cell)}
                transition-all duration-150
                disabled:cursor-not-allowed
              `}
              aria-label={`Cell ${rowIndex},${colIndex}`}
            />
          ))
        ))}
      </div>
    </div>
  );
};

export default memo(GameBoard);
