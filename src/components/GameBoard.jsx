// GameBoard.jsx - Main game board component
// v7.8: Breathing glow animation - pieces glow up/down at random intervals
// v7.9: Added lastMoveCells for highlighting opponent's previous move
// v7.23: FIXED - Out-of-bounds ghost cells are now draggable
// This applies to all game boards (VS AI, Puzzle, Online, Weekly Challenge, Speed Puzzle)

import { forwardRef, useState, useEffect } from 'react';
import { getPieceCoords, canPlacePiece, BOARD_SIZE } from '../utils/gameLogic';
import { pieceColors } from '../utils/pieces';

/**
 * GameBoard Component
 * 
 * Renders the 8x8 game grid with placed pieces and pending move preview.
 * v7.8: Breathing glow effect - pieces slowly pulse in intensity at random intervals
 * v7.9: Added lastMoveCells prop for highlighting opponent's previous move
 * v7.7 ENHANCED: Shows drag preview highlighting on board during drag
 * v7.23: Out-of-bounds ghost cells can now be dragged to reposition pieces
 */
const GameBoard = forwardRef(({
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
  onPendingPieceDragStart,
  // v7.7: Drag preview props for highlighting during drag
  isDragging = false,
  dragPreviewCell = null,
  draggedPiece = null,
  dragRotation = 0,
  dragFlipped = false,
  // v7.9: Last move highlighting for online play
  lastMoveCells = null,
}, ref) => {
  // Ensure board is properly formatted
  const safeBoard = Array.isArray(board) 
    ? board.map(row => Array.isArray(row) ? row : Array(BOARD_SIZE).fill(null))
    : Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  
  const safeBoardPieces = boardPieces || {};
  
  // Breathing glow effect with random timing per cell
  const [glowTimings, setGlowTimings] = useState({});
  
  useEffect(() => {
    const timings = {};
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (safeBoard[row]?.[col]) {
          timings[`${row},${col}`] = {
            delay: Math.random() * 20,
            duration: 10 + Math.random() * 8,
          };
        }
      }
    }
    setGlowTimings(timings);
  }, [safeBoard]);

  // Helper to get piece name from boardPieces
  const getPieceName = (rowIdx, colIdx) => {
    if (Array.isArray(safeBoardPieces) && safeBoardPieces[rowIdx]) {
      return safeBoardPieces[rowIdx][colIdx];
    }
    if (typeof safeBoardPieces === 'object') {
      return safeBoardPieces[`${rowIdx},${colIdx}`];
    }
    return null;
  };

  // Get player color class
  const getPlayerColorClass = (player) => {
    if (customColors && customColors[player]) {
      return customColors[player];
    }
    return player === 1 
      ? 'bg-gradient-to-br from-cyan-400 to-blue-500' 
      : 'bg-gradient-to-br from-pink-400 to-rose-500';
  };

  // Calculate pending piece cells
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
    
    isPendingValid = outOfBoundsCells.length === 0 && overlappingCells.length === 0 &&
      canPlacePiece(safeBoard, pendingMove.row, pendingMove.col, pieceCoords);
  }

  // Calculate drag preview cells
  let dragPreviewCells = [];
  let isDragPreviewValid = false;
  
  if (isDragging && dragPreviewCell && draggedPiece) {
    const pieceCoords = getPieceCoords(draggedPiece, dragRotation, dragFlipped);
    isDragPreviewValid = canPlacePiece(safeBoard, dragPreviewCell.row, dragPreviewCell.col, pieceCoords);
    
    pieceCoords.forEach(([dx, dy]) => {
      const cellRow = dragPreviewCell.row + dy;
      const cellCol = dragPreviewCell.col + dx;
      if (cellRow >= 0 && cellRow < BOARD_SIZE && cellCol >= 0 && cellCol < BOARD_SIZE) {
        dragPreviewCells.push({ row: cellRow, col: cellCol });
      }
    });
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

  // Last move cells for highlighting
  const lastMoveCellSet = new Set(
    (lastMoveCells || []).map(c => `${c.row},${c.col}`)
  );

  // Cell dimensions
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const cellSize = isMobile ? 36 : 48;
  const gapSize = isMobile ? 2 : 4;
  const padding = isMobile ? 4 : 6;

  // Pending piece color
  const pendingPieceColor = pendingMove && pieceColors[pendingMove.piece] 
    ? pieceColors[pendingMove.piece]
    : getPlayerColorClass(currentPlayer);

  // Handle click
  const handleCellClick = (rowIdx, colIdx) => {
    if (gameOver || ((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2)) return;
    onCellClick?.(rowIdx, colIdx);
  };

  // v7.23: Handle touch/mouse on ghost cells to initiate drag
  const handleGhostCellTouchStart = (e) => {
    if (!pendingMove || !onPendingPieceDragStart) return;
    
    e.stopPropagation();
    
    const touch = e.touches?.[0];
    if (!touch) return;
    
    const rect = e.currentTarget?.getBoundingClientRect() || null;
    onPendingPieceDragStart(pendingMove.piece, touch.clientX, touch.clientY, rect);
  };

  const handleGhostCellMouseDown = (e) => {
    if (!pendingMove || !onPendingPieceDragStart) return;
    if (e.button !== 0) return;
    
    e.stopPropagation();
    
    const rect = e.currentTarget?.getBoundingClientRect() || null;
    onPendingPieceDragStart(pendingMove.piece, e.clientX, e.clientY, rect);
  };

  return (
    <div ref={ref} className="relative inline-block">
      {/* Main grid */}
      <div className="grid grid-cols-8 gap-0.5 sm:gap-1 bg-slate-800/50 p-1 sm:p-1.5 rounded-lg border border-cyan-500/20">
        {safeBoard.map((row, rowIdx) =>
          row.map((cellValue, colIdx) => {
            const isOccupied = cellValue !== null && cellValue !== 0;
            const pieceName = getPieceName(rowIdx, colIdx);
            const isPending = pendingCells.some(p => p.row === rowIdx && p.col === colIdx);
            const isOverlapping = overlappingCells.some(p => p.row === rowIdx && p.col === colIdx);
            const isAiAnimating = aiAnimatingCells.some(c => c.row === rowIdx && c.col === colIdx);
            const isPlayerAnimating = playerAnimatingCells.some(c => c.row === rowIdx && c.col === colIdx);
            const isDragPreview = dragPreviewCells.some(c => c.row === rowIdx && c.col === colIdx);
            const isLastMove = lastMoveCellSet.has(`${rowIdx},${colIdx}`);
            
            const pieceColor = pieceName ? pieceColors[pieceName] : null;
            const colorClass = isOccupied ? (pieceColor || getPlayerColorClass(cellValue)) : '';
            const glowTiming = glowTimings[`${rowIdx},${colIdx}`];
            const pendingIndex = isPending ? pendingCells.findIndex(p => p.row === rowIdx && p.col === colIdx) : -1;

            // Touch handlers for pending cells
            const handlePendingTouchStart = (e) => {
              if (!isPending || !onPendingPieceDragStart || !pendingMove) return;
              e.stopPropagation();
              const touch = e.touches?.[0];
              if (!touch) return;
              const rect = e.currentTarget?.getBoundingClientRect() || null;
              onPendingPieceDragStart(pendingMove.piece, touch.clientX, touch.clientY, rect);
            };

            const handlePendingMouseDown = (e) => {
              if (!isPending || !onPendingPieceDragStart || !pendingMove) return;
              if (e.button !== 0) return;
              e.stopPropagation();
              const rect = e.currentTarget?.getBoundingClientRect() || null;
              onPendingPieceDragStart(pendingMove.piece, e.clientX, e.clientY, rect);
            };

            return (
              <div
                key={`${rowIdx}-${colIdx}`}
                onClick={() => handleCellClick(rowIdx, colIdx)}
                onTouchStart={isPending ? handlePendingTouchStart : undefined}
                onMouseDown={isPending ? handlePendingMouseDown : undefined}
                className={`
                  game-cell w-9 h-9 sm:w-12 sm:h-12 rounded-md relative overflow-hidden
                  transition-all duration-300 cursor-pointer
                  ${isOccupied ? colorClass : 'bg-slate-700/40 hover:bg-slate-600/50'}
                  ${isOccupied ? 'shadow-lg' : ''}
                  ${isOverlapping ? 'overlap-cell' : ''}
                  ${isAiAnimating ? 'ai-placing-cell' : ''}
                  ${isPlayerAnimating ? 'player-placing-cell' : ''}
                  ${isPending ? 'pending cursor-grab active:cursor-grabbing' : ''}
                  ${isLastMove && !isPending && !isAiAnimating && !isPlayerAnimating ? 'last-move-cell' : ''}
                `}
                style={isPending ? {
                  animationDelay: `${pendingIndex * 0.15}s`,
                  touchAction: 'none',
                  userSelect: 'none',
                } : undefined}
              >
                {/* Base shine for occupied cells */}
                {isOccupied && (
                  <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/15 pointer-events-none" />
                )}
                
                {/* Breathing glow effect */}
                {isOccupied && glowTiming && (
                  <div 
                    className={`absolute inset-0 pointer-events-none rounded-md ${
                      cellValue === 1 ? 'breathing-glow-cyan' : 
                      gameMode === '2player' ? 'breathing-glow-pink' : 'breathing-glow-orange'
                    }`}
                    style={{ 
                      animationDelay: `-${glowTiming.delay}s`,
                      animationDuration: `${glowTiming.duration}s`,
                    }}
                  />
                )}

                {/* Pending piece display - hide during drag */}
                {isPending && (
                  <div 
                    className="absolute inset-0 pointer-events-none transition-opacity duration-75"
                    style={{ opacity: isDragging ? 0 : 1 }}
                  >
                    <div className={`absolute inset-0 ${pendingPieceColor} rounded-md`} />
                    <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/15 rounded-md" />
                    <div className={`absolute inset-0 pending-glow ${isPendingValid ? 'valid' : 'invalid'} rounded-md`} />
                  </div>
                )}
                
                {/* Validity border */}
                {isPending && (
                  <div 
                    className="absolute inset-0 rounded-md pointer-events-none transition-opacity duration-75"
                    style={{
                      opacity: isDragging ? 0 : 1,
                      border: isPendingValid ? '2px solid rgba(34, 211, 238, 0.7)' : '2px solid rgba(239, 68, 68, 0.7)',
                      boxShadow: isPendingValid 
                        ? '0 0 12px rgba(34, 211, 238, 0.5), inset 0 0 8px rgba(34, 211, 238, 0.3)'
                        : '0 0 12px rgba(239, 68, 68, 0.5), inset 0 0 8px rgba(239, 68, 68, 0.3)'
                    }}
                  />
                )}

                {/* Drag preview highlight */}
                {isDragPreview && !isOccupied && (
                  <div 
                    className="absolute inset-0 rounded-md pointer-events-none drag-preview-pulse"
                    style={{
                      border: isDragPreviewValid 
                        ? '2px solid rgba(34, 211, 238, 0.8)' 
                        : '2px solid rgba(239, 68, 68, 0.8)',
                      boxShadow: isDragPreviewValid 
                        ? '0 0 12px rgba(34, 211, 238, 0.5), inset 0 0 8px rgba(34, 211, 238, 0.3)'
                        : '0 0 12px rgba(239, 68, 68, 0.5), inset 0 0 8px rgba(239, 68, 68, 0.3)'
                    }}
                  />
                )}

                {/* Drag preview on occupied cell (invalid) */}
                {isDragPreview && isOccupied && (
                  <div 
                    className="absolute inset-0 rounded-md pointer-events-none"
                    style={{
                      border: '2px solid rgba(239, 68, 68, 0.9)',
                      boxShadow: '0 0 15px rgba(239, 68, 68, 0.6), inset 0 0 10px rgba(239, 68, 68, 0.4)',
                      background: 'rgba(239, 68, 68, 0.2)'
                    }}
                  />
                )}

                {/* Last move indicator */}
                {isLastMove && !isPending && !isAiAnimating && !isPlayerAnimating && (
                  <div 
                    className="absolute inset-0 rounded-md pointer-events-none last-move-indicator"
                    style={{
                      border: '2px solid rgba(251, 191, 36, 0.8)',
                      boxShadow: '0 0 12px rgba(251, 191, 36, 0.5), inset 0 0 6px rgba(251, 191, 36, 0.3)'
                    }}
                  />
                )}

                {/* Overlap indicator */}
                {isOverlapping && (
                  <div className="absolute inset-0 bg-red-500/50 invalid-piece-pulse border-2 border-red-400/80 border-dashed rounded-md" />
                )}

                {/* AI/Player animation effects */}
                {isAiAnimating && (
                  <div className="absolute inset-0 bg-purple-400/50 animate-pulse rounded-md" />
                )}
                {isPlayerAnimating && (
                  <div className="absolute inset-0 bg-cyan-400/50 animate-pulse rounded-md" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* v7.23: Ghost cells for out-of-bounds - NOW DRAGGABLE */}
      {outOfBoundsCells.length > 0 && pendingMove && (
        <div 
          className="absolute" 
          style={{ 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0,
            // Don't block interactions on the main board
            pointerEvents: 'none'
          }}
        >
          {outOfBoundsCells.map((cell, idx) => {
            const top = padding + cell.row * (cellSize + gapSize);
            const left = padding + cell.col * (cellSize + gapSize);
            
            return (
              <div
                key={`ghost-${idx}`}
                onTouchStart={handleGhostCellTouchStart}
                onMouseDown={handleGhostCellMouseDown}
                className="absolute rounded-md border-2 border-dashed border-red-500/80 bg-red-500/20 ghost-cell-pulse cursor-grab active:cursor-grabbing"
                style={{
                  width: cellSize,
                  height: cellSize,
                  top: `${top}px`,
                  left: `${left}px`,
                  touchAction: 'none',
                  userSelect: 'none',
                  // Enable pointer events on ghost cells
                  pointerEvents: 'auto',
                  opacity: isDragging ? 0 : 1,
                  transition: 'opacity 75ms',
                }}
              />
            );
          })}
        </div>
      )}

      {/* Active piece outline */}
      {pendingMove && !isDragging && (
        <div 
          className={`absolute inset-0 pointer-events-none rounded-lg ${
            isPendingValid 
              ? 'ring-2 ring-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.3)]'
              : 'ring-2 ring-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
          }`}
          style={{ margin: '-2px' }}
        />
      )}

      {/* Animation styles */}
      <style>{`
        .pending-glow.valid {
          animation: valid-glow 1.5s ease-in-out infinite;
        }
        .pending-glow.invalid {
          animation: invalid-pulse 0.5s ease-in-out infinite;
        }
        @keyframes valid-glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.6; }
        }
        @keyframes invalid-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
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
        .drag-preview-pulse {
          animation: drag-preview-glow 0.8s ease-in-out infinite;
        }
        @keyframes drag-preview-glow {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        .last-move-indicator {
          animation: last-move-pulse 2s ease-in-out infinite;
        }
        @keyframes last-move-pulse {
          0%, 100% { 
            border-color: rgba(251, 191, 36, 0.6);
            box-shadow: 0 0 8px rgba(251, 191, 36, 0.4), inset 0 0 4px rgba(251, 191, 36, 0.2);
          }
          50% { 
            border-color: rgba(251, 191, 36, 1);
            box-shadow: 0 0 15px rgba(251, 191, 36, 0.7), inset 0 0 8px rgba(251, 191, 36, 0.4);
          }
        }
        .breathing-glow-cyan {
          animation: breathing-cyan ease-in-out infinite alternate;
        }
        @keyframes breathing-cyan {
          0% { box-shadow: 0 0 3px rgba(34, 211, 238, 0.2), 0 0 6px rgba(34, 211, 238, 0.1); }
          100% { box-shadow: 0 0 8px rgba(34, 211, 238, 0.5), 0 0 16px rgba(34, 211, 238, 0.3), 0 0 24px rgba(34, 211, 238, 0.15); }
        }
        .breathing-glow-orange {
          animation: breathing-orange ease-in-out infinite alternate;
        }
        @keyframes breathing-orange {
          0% { box-shadow: 0 0 3px rgba(251, 146, 60, 0.2), 0 0 6px rgba(251, 146, 60, 0.1); }
          100% { box-shadow: 0 0 8px rgba(251, 146, 60, 0.5), 0 0 16px rgba(251, 146, 60, 0.3), 0 0 24px rgba(251, 146, 60, 0.15); }
        }
        .breathing-glow-pink {
          animation: breathing-pink ease-in-out infinite alternate;
        }
        @keyframes breathing-pink {
          0% { box-shadow: 0 0 3px rgba(236, 72, 153, 0.2), 0 0 6px rgba(236, 72, 153, 0.1); }
          100% { box-shadow: 0 0 8px rgba(236, 72, 153, 0.5), 0 0 16px rgba(236, 72, 153, 0.3), 0 0 24px rgba(236, 72, 153, 0.15); }
        }
        .game-cell { touch-action: manipulation; }
        .game-cell.pending { touch-action: none; cursor: grab; }
        .game-cell.pending:active { cursor: grabbing; }
      `}</style>
    </div>
  );
});

GameBoard.displayName = 'GameBoard';

export default GameBoard;
