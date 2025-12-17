import PropTypes from 'prop-types';
import { getPieceCoords, canPlacePiece, BOARD_SIZE } from '../utils/gameLogic';
import { pieceColors } from '../utils/pieces';
import { GamePropTypes, CallbackPropTypes } from '../utils/propTypes';

/**
 * GameBoard Component
 * 
 * Renders the 8x8 game grid with placed pieces and pending move preview.
 * Handles cell clicks and displays game state including valid/invalid move indicators.
 * 
 * UPDATED: 
 * - Ghost outline for pieces overlapping existing pieces (same as off-grid)
 * - Red highlight for entire domino when placement is invalid
 * - Themed color outline for active valid piece
 * - Enhanced animations for visual feedback
 */
const GameBoard = ({
  board,
  boardPieces,
  pendingMove,
  rotation = 0,
  flipped = false,
  gameOver = false,
  gameMode,
  currentPlayer = 1,
  onCellClick,
  aiAnimatingMove,
  playerAnimatingMove,
  selectedPiece,
  customColors,
}) => {
  // Ensure board is properly formatted
  const safeBoard = Array.isArray(board) 
    ? board.map(row => Array.isArray(row) ? row : Array(BOARD_SIZE).fill(null))
    : Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  
  const safeBoardPieces = boardPieces || {};
  
  // Helper to get piece name - handles both 2D array and object formats
  const getPieceName = (rowIdx, colIdx) => {
    // Check if it's a 2D array format (offline games)
    if (Array.isArray(safeBoardPieces) && safeBoardPieces[rowIdx]) {
      return safeBoardPieces[rowIdx][colIdx];
    }
    // Check if it's an object format with "row,col" keys (online games)
    if (typeof safeBoardPieces === 'object') {
      return safeBoardPieces[`${rowIdx},${colIdx}`];
    }
    return null;
  };
  
  const isDisabled = gameOver || ((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2);

  // Calculate pending piece cells (both in-bounds and out-of-bounds)
  let pendingCells = [];
  let outOfBoundsCells = [];
  let overlappingCells = [];
  let isPendingValid = false;
  
  if (pendingMove) {
    const pieceCoords = getPieceCoords(pendingMove.piece, rotation, flipped);
    
    pieceCoords.forEach(([dx, dy]) => {
      const cellRow = pendingMove.row + dy;
      const cellCol = pendingMove.col + dx;
      
      if (cellRow >= 0 && cellRow < BOARD_SIZE && cellCol >= 0 && cellCol < BOARD_SIZE) {
        // Check if this cell overlaps with an existing piece
        const existingCell = safeBoard[cellRow]?.[cellCol];
        if (existingCell !== null && existingCell !== 0 && existingCell !== undefined) {
          overlappingCells.push({ row: cellRow, col: cellCol });
        } else {
          pendingCells.push({ row: cellRow, col: cellCol });
        }
      } else {
        outOfBoundsCells.push({ row: cellRow, col: cellCol });
      }
    });
    
    // Valid only if all cells in bounds AND no overlaps
    isPendingValid = outOfBoundsCells.length === 0 && overlappingCells.length === 0 &&
      canPlacePiece(safeBoard, pendingMove.row, pendingMove.col, pieceCoords);
  }

  // Calculate AI animating piece cells
  let aiAnimatingCells = [];
  if (aiAnimatingMove) {
    const pieceCoords = getPieceCoords(aiAnimatingMove.piece, aiAnimatingMove.rot, aiAnimatingMove.flip);
    pieceCoords.forEach(([dx, dy]) => {
      const cellRow = aiAnimatingMove.row + dy;
      const cellCol = aiAnimatingMove.col + dx;
      if (cellRow >= 0 && cellRow < BOARD_SIZE && cellCol >= 0 && cellCol < BOARD_SIZE) {
        aiAnimatingCells.push({ row: cellRow, col: cellCol });
      }
    });
  }

  // Calculate player animating piece cells
  let playerAnimatingCells = [];
  if (playerAnimatingMove) {
    const pieceCoords = getPieceCoords(playerAnimatingMove.piece, playerAnimatingMove.rot, playerAnimatingMove.flip);
    pieceCoords.forEach(([dx, dy]) => {
      const cellRow = playerAnimatingMove.row + dy;
      const cellCol = playerAnimatingMove.col + dx;
      if (cellRow >= 0 && cellRow < BOARD_SIZE && cellCol >= 0 && cellCol < BOARD_SIZE) {
        playerAnimatingCells.push({ row: cellRow, col: cellCol });
      }
    });
  }

  // Cell dimensions for positioning ghost cells
  // Mobile: 36px (w-9) + 2px gap, Desktop: 48px (sm:w-12) + 4px gap
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const cellSize = isMobile ? 36 : 48;
  const gapSize = isMobile ? 2 : 4;

  // UPDATED: Determine if the entire pending piece is invalid
  const isEntirePieceInvalid = pendingMove && !isPendingValid;
  const hasOverlap = overlappingCells.length > 0;
  const hasOutOfBounds = outOfBoundsCells.length > 0;

  // Get cell colors based on player and custom colors
  const getPlayerColor = (player) => {
    if (customColors && customColors[player]) {
      return customColors[player];
    }
    return player === 1 
      ? 'bg-gradient-to-br from-cyan-400 to-blue-500' 
      : 'bg-gradient-to-br from-pink-400 to-rose-500';
  };

  return (
    <div className="relative">
      {/* Main grid */}
      <div className="grid grid-cols-8 gap-0.5 sm:gap-1 bg-slate-800/50 p-1 sm:p-1.5 rounded-lg border border-cyan-500/20">
        {safeBoard.map((row, rowIdx) =>
          row.map((cell, colIdx) => {
            const isPending = pendingCells.some(p => p.row === rowIdx && p.col === colIdx);
            const isOverlapping = overlappingCells.some(p => p.row === rowIdx && p.col === colIdx);
            const isAiAnimating = aiAnimatingCells.some(c => c.row === rowIdx && c.col === colIdx);
            const isPlayerAnimating = playerAnimatingCells.some(c => c.row === rowIdx && c.col === colIdx);
            const pieceName = getPieceName(rowIdx, colIdx);
            const pieceColor = pieceName ? pieceColors[pieceName] : null;
            
            return (
              <button
                key={`${rowIdx}-${colIdx}`}
                className={`
                  w-9 h-9 sm:w-12 sm:h-12 rounded-md sm:rounded-lg relative
                  transition-all duration-150 overflow-hidden
                  ${cell 
                    ? `${pieceColor || getPlayerColor(cell)} shadow-lg` 
                    : 'bg-slate-700/50 hover:bg-slate-600/50'
                  }
                  ${isPending && isPendingValid ? 'pending-valid-cell ring-2 ring-cyan-400 bg-cyan-500/30' : ''}
                  ${isPending && !isPendingValid ? 'pending-invalid-cell ring-2 ring-red-500 bg-red-500/30' : ''}
                  ${isOverlapping ? 'overlap-cell ring-2 ring-red-500 bg-red-500/40' : ''}
                  ${isAiAnimating ? 'ai-placing-cell ring-2 ring-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.7)]' : ''}
                  ${isPlayerAnimating ? 'player-placing-cell ring-2 ring-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.7)]' : ''}
                  ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                `}
                onClick={() => !isDisabled && onCellClick(rowIdx, colIdx)}
                disabled={isDisabled}
              >
                {/* Scan line effect for placed pieces */}
                {cell && (
                  <div className="absolute inset-0 opacity-30 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.1)_2px,rgba(255,255,255,0.1)_4px)]" />
                )}
                
                {/* AI placing animation */}
                {isAiAnimating && (
                  <div className="absolute inset-0 bg-purple-400/50 animate-pulse" />
                )}
                
                {/* Player placing animation */}
                {isPlayerAnimating && (
                  <div className="absolute inset-0 bg-cyan-400/50 animate-pulse" />
                )}
                
                {/* Pending valid indicator */}
                {isPending && isPendingValid && (
                  <div className="absolute inset-0 bg-cyan-400/40 valid-piece-glow" />
                )}
                
                {/* Pending invalid indicator */}
                {isPending && !isPendingValid && (
                  <div className="absolute inset-0 bg-red-500/40 invalid-piece-pulse" />
                )}
                
                {/* UPDATED: Overlap indicator - same style as ghost for out of bounds */}
                {isOverlapping && (
                  <div className="absolute inset-0 bg-red-500/50 invalid-piece-pulse border-2 border-red-400/80 border-dashed" />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* UPDATED: Ghost cells for out-of-bounds pieces */}
      {outOfBoundsCells.length > 0 && pendingMove && (
        <div className="absolute inset-0 pointer-events-none">
          {outOfBoundsCells.map((cell, idx) => {
            // Calculate position relative to the grid
            const offsetRow = cell.row - pendingMove.row;
            const offsetCol = cell.col - pendingMove.col;
            
            // Find a reference cell that IS on the board to calculate position
            const refCell = pendingCells[0] || { row: pendingMove.row, col: pendingMove.col };
            
            const top = (refCell.row + offsetRow - refCell.row + pendingMove.row) * (cellSize + gapSize) + (isMobile ? 4 : 6);
            const left = (refCell.col + offsetCol - refCell.col + pendingMove.col) * (cellSize + gapSize) + (isMobile ? 4 : 6);
            
            return (
              <div
                key={`ghost-${idx}`}
                className="absolute rounded-md sm:rounded-lg border-2 border-dashed border-red-500/80 bg-red-500/20 ghost-cell-pulse"
                style={{
                  width: cellSize,
                  height: cellSize,
                  top: `${top}px`,
                  left: `${left}px`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* UPDATED: Full piece outline when piece is active - different color for valid vs invalid */}
      {pendingMove && (
        <div 
          className={`absolute inset-0 pointer-events-none rounded-lg ${
            isPendingValid 
              ? 'ring-2 ring-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.3)] active-piece-valid'
              : 'ring-2 ring-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.4)] active-piece-invalid'
          }`}
          style={{ margin: '-2px' }}
        />
      )}

      {/* Animation styles */}
      <style>{`
        /* Valid piece glow animation */
        .valid-piece-glow {
          animation: valid-glow 1.5s ease-in-out infinite;
        }
        @keyframes valid-glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.6; }
        }
        
        /* Invalid piece pulse animation */
        .invalid-piece-pulse {
          animation: invalid-pulse 0.5s ease-in-out infinite;
        }
        @keyframes invalid-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        
        /* Ghost cell out-of-bounds pulse */
        .ghost-cell-pulse {
          animation: ghost-pulse 0.8s ease-in-out infinite;
        }
        @keyframes ghost-pulse {
          0%, 100% { 
            border-color: rgba(239, 68, 68, 0.8);
            background-color: rgba(239, 68, 68, 0.2);
          }
          50% { 
            border-color: rgba(239, 68, 68, 1);
            background-color: rgba(239, 68, 68, 0.35);
          }
        }
        
        /* Active valid piece outline animation */
        .active-piece-valid {
          animation: active-valid-pulse 2s ease-in-out infinite;
        }
        @keyframes active-valid-pulse {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(34, 211, 238, 0.3);
          }
          50% { 
            box-shadow: 0 0 35px rgba(34, 211, 238, 0.5);
          }
        }
        
        /* Active invalid piece outline animation */
        .active-piece-invalid {
          animation: active-invalid-shake 0.3s ease-in-out, active-invalid-pulse 1s ease-in-out infinite;
        }
        @keyframes active-invalid-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
        @keyframes active-invalid-pulse {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
          }
          50% { 
            box-shadow: 0 0 35px rgba(239, 68, 68, 0.6);
          }
        }
        
        /* AI placing cell animation */
        .ai-placing-cell {
          animation: ai-place 0.5s ease-out;
        }
        @keyframes ai-place {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        
        /* Player placing cell animation */
        .player-placing-cell {
          animation: player-place 0.3s ease-out;
        }
        @keyframes player-place {
          0% { transform: scale(0.9); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

/**
 * GameBoard PropTypes
 */
GameBoard.propTypes = {
  /** Current board state - 8x8 grid of player numbers or null */
  board: GamePropTypes.board.isRequired,
  /** Map of piece positions to piece names */
  boardPieces: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.arrayOf(PropTypes.array),
  ]),
  /** Currently pending move awaiting confirmation */
  pendingMove: GamePropTypes.pendingMove,
  /** Current piece rotation (0, 90, 180, 270) */
  rotation: PropTypes.number,
  /** Whether current piece is flipped */
  flipped: PropTypes.bool,
  /** Whether the game has ended */
  gameOver: PropTypes.bool,
  /** Current game mode */
  gameMode: GamePropTypes.gameMode,
  /** Current player's turn (1 or 2) */
  currentPlayer: GamePropTypes.player,
  /** Callback when a cell is clicked */
  onCellClick: CallbackPropTypes.onClick,
  /** AI animating move data */
  aiAnimatingMove: PropTypes.object,
  /** Player animating move data */
  playerAnimatingMove: PropTypes.object,
  /** Currently selected piece */
  selectedPiece: PropTypes.string,
  /** Custom colors for players */
  customColors: PropTypes.object,
};

GameBoard.defaultProps = {
  boardPieces: {},
  pendingMove: null,
  rotation: 0,
  flipped: false,
  gameOver: false,
  gameMode: null,
  currentPlayer: 1,
  onCellClick: () => {},
  aiAnimatingMove: null,
  playerAnimatingMove: null,
  selectedPiece: null,
  customColors: null,
};

export default GameBoard;
