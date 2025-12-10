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
  onCellClick,
  aiAnimatingMove
}) => {
  // Ensure board is valid before rendering
  const safeBoard = Array.isArray(board) && board.length === BOARD_SIZE 
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

  // Cell dimensions for positioning ghost cells
  // Mobile: 36px (w-9) + 2px gap, Desktop: 48px (sm:w-12) + 4px gap
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const cellSize = isMobile ? 36 : 48;
  const gapSize = isMobile ? 2 : 4;
  const padding = 8; // p-2

  return (
    <div className="relative inline-block mx-auto touch-none">
      {/* Main board with cyberpunk frame */}
      <div className="relative inline-grid gap-0.5 sm:gap-1 bg-slate-950 p-2 rounded-xl shadow-[0_0_40px_rgba(34,211,238,0.25),0_0_80px_rgba(34,211,238,0.1),inset_0_0_40px_rgba(0,0,0,0.6)] border border-cyan-500/40">
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400/60 rounded-tl-xl" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400/60 rounded-tr-xl" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400/60 rounded-bl-xl" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400/60 rounded-br-xl" />
        
        {/* Subtle background grid pattern */}
        <div className="absolute inset-2 opacity-5 pointer-events-none bg-[repeating-linear-gradient(0deg,rgba(34,211,238,0.3),rgba(34,211,238,0.3)_1px,transparent_1px,transparent_8px),repeating-linear-gradient(90deg,rgba(34,211,238,0.3),rgba(34,211,238,0.3)_1px,transparent_1px,transparent_8px)]" />
        
        {safeBoard.map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-0.5 sm:gap-1">
            {(row || []).map((cell, colIdx) => {
              const pieceName = getPieceName(rowIdx, colIdx);
              const isInBoundsPendingCell = pendingCells.some(c => c.row === rowIdx && c.col === colIdx);
              const hasOverlap = isInBoundsPendingCell && cell !== null;
              const hasOutOfBounds = outOfBoundsCells.length > 0;
              const isAiAnimatingCell = aiAnimatingCells.some(c => c.row === rowIdx && c.col === colIdx);
              
              // Determine background color
              let bgClass;
              let extraClass = '';
              
              if (isAiAnimatingCell) {
                // AI is placing this piece - show with animation
                bgClass = pieceColors[aiAnimatingMove.piece];
                extraClass = 'animate-ai-place';
              } else if (isInBoundsPendingCell) {
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
                bgClass = 'bg-slate-800/80 hover:bg-slate-700/80 border border-cyan-500/30 shadow-[inset_0_0_15px_rgba(0,0,0,0.6),inset_0_0_2px_rgba(34,211,238,0.1)]';
              }
              
              // Determine ring style
              let ringClass = '';
              if (isAiAnimatingCell) {
                // Enhanced purple glow for AI placing - more dramatic
                ringClass = 'ring-2 ring-purple-300 shadow-[0_0_30px_rgba(168,85,247,1),0_0_60px_rgba(168,85,247,0.6),0_0_90px_rgba(168,85,247,0.3)]';
              } else if (isInBoundsPendingCell) {
                if (hasOverlap) {
                  ringClass = 'ring-2 ring-red-500 shadow-[0_0_25px_rgba(239,68,68,0.8)] animate-pulse';
                } else if (hasOutOfBounds) {
                  // Orange warning ring when piece extends out of bounds
                  ringClass = 'ring-2 ring-orange-400 shadow-[0_0_20px_rgba(251,146,60,0.6)]';
                } else {
                  ringClass = 'ring-2 ring-green-400 shadow-[0_0_25px_rgba(74,222,128,0.8)]';
                }
              }
              
              // Determine if this is a placed piece (for shimmer effect)
              const isPlacedPiece = cell !== null && pieceName && !isInBoundsPendingCell && !isAiAnimatingCell;
              
              return (
                <button
                  key={colIdx}
                  onClick={() => onCellClick(rowIdx, colIdx)}
                  className={`w-9 h-9 sm:w-12 sm:h-12 rounded-lg transition-all relative overflow-hidden ${bgClass} ${ringClass} ${extraClass}`}
                  disabled={isDisabled}
                >
                  {/* AI placing effect - energy burst overlay */}
                  {isAiAnimatingCell && (
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Radial energy burst */}
                      <div className="absolute inset-0 animate-ai-burst bg-gradient-radial from-white/60 via-purple-400/30 to-transparent" />
                      {/* Scan lines */}
                      <div className="absolute inset-0 opacity-40 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(168,85,247,0.3)_2px,rgba(168,85,247,0.3)_4px)] animate-ai-scan" />
                      {/* Corner sparks */}
                      <div className="absolute top-0 left-0 w-2 h-2 bg-white rounded-full animate-ai-spark" style={{ animationDelay: '0ms' }} />
                      <div className="absolute top-0 right-0 w-2 h-2 bg-white rounded-full animate-ai-spark" style={{ animationDelay: '100ms' }} />
                      <div className="absolute bottom-0 left-0 w-2 h-2 bg-white rounded-full animate-ai-spark" style={{ animationDelay: '200ms' }} />
                      <div className="absolute bottom-0 right-0 w-2 h-2 bg-white rounded-full animate-ai-spark" style={{ animationDelay: '300ms' }} />
                      {/* Center flash */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-4 h-4 bg-white rounded-full animate-ai-flash" />
                      </div>
                    </div>
                  )}
                  
                  {/* Slow shimmer overlay for placed pieces */}
                  {isPlacedPiece && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      {/* Slow shimmer effect */}
                      <div className="absolute inset-0 animate-shimmer opacity-30" 
                        style={{
                          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                          backgroundSize: '200% 100%'
                        }}
                      />
                      {/* Subtle top highlight */}
                      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                    </div>
                  )}
                </button>
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

      {/* AI placing animation styles - Cyberpunk materialize effect */}
      <style>{`
        @keyframes ai-place {
          0% {
            transform: scale(0) rotate(-15deg);
            opacity: 0;
            filter: brightness(3) saturate(2) hue-rotate(30deg);
          }
          15% {
            transform: scale(1.3) rotate(8deg);
            opacity: 1;
            filter: brightness(2.5) saturate(1.5) hue-rotate(20deg);
          }
          30% {
            transform: scale(0.85) rotate(-5deg);
            filter: brightness(2) saturate(1.3) hue-rotate(10deg);
          }
          45% {
            transform: scale(1.15) rotate(3deg);
            filter: brightness(1.5) saturate(1.2) hue-rotate(5deg);
          }
          60% {
            transform: scale(0.95) rotate(-2deg);
            filter: brightness(1.3) saturate(1.1);
          }
          75% {
            transform: scale(1.05) rotate(1deg);
            filter: brightness(1.15);
          }
          90% {
            transform: scale(0.98);
            filter: brightness(1.05);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
            filter: brightness(1) saturate(1) hue-rotate(0deg);
          }
        }
        .animate-ai-place {
          animation: ai-place 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        
        @keyframes ai-burst {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          50% {
            transform: scale(1.5);
            opacity: 0.6;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        .animate-ai-burst {
          animation: ai-burst 0.5s ease-out forwards;
        }
        
        @keyframes ai-scan {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100%);
          }
        }
        .animate-ai-scan {
          animation: ai-scan 0.4s linear;
        }
        
        @keyframes ai-spark {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          50% {
            transform: scale(1.5);
            opacity: 1;
          }
          100% {
            transform: scale(0);
            opacity: 0;
          }
        }
        .animate-ai-spark {
          animation: ai-spark 0.4s ease-out forwards;
        }
        
        @keyframes ai-flash {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          30% {
            transform: scale(2);
            opacity: 0.8;
          }
          100% {
            transform: scale(4);
            opacity: 0;
          }
        }
        .animate-ai-flash {
          animation: ai-flash 0.5s ease-out forwards;
        }
        
        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-from), var(--tw-gradient-via), var(--tw-gradient-to));
        }
        
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
        .animate-shimmer {
          animation: shimmer 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default GameBoard;
