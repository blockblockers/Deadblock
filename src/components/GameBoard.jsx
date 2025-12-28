// GameBoard.jsx - Main game board component
// v7.7: Elegant ambient animations - orbiting highlights, breathing effects, corner glows, edge shimmers
// CHANGED: Allow dropping pieces even with conflicts (for rotation adjustment)
// This applies to all game boards (VS AI, Puzzle, Online, Weekly Challenge, Speed Puzzle)

import { forwardRef, useState, useEffect } from 'react';
import { getPieceCoords, canPlacePiece, BOARD_SIZE } from '../utils/gameLogic';
import { pieceColors } from '../utils/pieces';

/**
 * GameBoard Component
 * 
 * Renders the 8x8 game grid with placed pieces and pending move preview.
 * v7.7: Very slow ambient animations (8-15s cycles), interesting visual effects
 * v7.7 ENHANCED: Shows drag preview highlighting on board during drag
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
}, ref) => {
  // Ensure board is properly formatted
  const safeBoard = Array.isArray(board) 
    ? board.map(row => Array.isArray(row) ? row : Array(BOARD_SIZE).fill(null))
    : Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  
  const safeBoardPieces = boardPieces || {};
  
  // Simple rolling glow effect with random timing per cell
  const [glowTimings, setGlowTimings] = useState({});
  
  useEffect(() => {
    // Generate random timing for rolling glow effect on each cell
    const timings = {};
    
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (safeBoard[row]?.[col]) {
          timings[`${row},${col}`] = {
            // Random delay so cells don't all glow at the same time (0-15 seconds)
            delay: Math.random() * 15,
            // Slow duration (8-14 seconds per cycle)
            duration: 8 + Math.random() * 6,
          };
        }
      }
    }
    setGlowTimings(timings);
  }, [safeBoard]);
  
  // Helper to get piece name - handles both 2D array and object formats
  const getPieceName = (rowIdx, colIdx) => {
    if (Array.isArray(safeBoardPieces) && safeBoardPieces[rowIdx]) {
      return safeBoardPieces[rowIdx][colIdx];
    }
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
  let pendingPieceColor = null;
  
  if (pendingMove) {
    const pieceCoords = getPieceCoords(pendingMove.piece, rotation, flipped);
    pendingPieceColor = pieceColors[pendingMove.piece] || 'bg-gradient-to-br from-cyan-400 to-blue-500';
    
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

  // Calculate AI animating cells (for drag animation)
  let aiAnimatingCells = [];
  if (aiAnimatingMove) {
    const aiCoords = getPieceCoords(aiAnimatingMove.piece, aiAnimatingMove.rotation || 0, aiAnimatingMove.flipped || false);
    aiCoords.forEach(([dx, dy]) => {
      const cellRow = aiAnimatingMove.row + dy;
      const cellCol = aiAnimatingMove.col + dx;
      if (cellRow >= 0 && cellRow < BOARD_SIZE && cellCol >= 0 && cellCol < BOARD_SIZE) {
        aiAnimatingCells.push({ row: cellRow, col: cellCol });
      }
    });
  }

  // Calculate player animating cells (after confirm)
  let playerAnimatingCells = [];
  if (playerAnimatingMove) {
    const playerCoords = getPieceCoords(playerAnimatingMove.piece, playerAnimatingMove.rotation || 0, playerAnimatingMove.flipped || false);
    playerCoords.forEach(([dx, dy]) => {
      const cellRow = playerAnimatingMove.row + dy;
      const cellCol = playerAnimatingMove.col + dx;
      if (cellRow >= 0 && cellRow < BOARD_SIZE && cellCol >= 0 && cellCol < BOARD_SIZE) {
        playerAnimatingCells.push({ row: cellRow, col: cellCol });
      }
    });
  }

  // v7.7: Calculate drag preview cells (highlighting during drag)
  let dragPreviewCells = [];
  let dragPreviewValid = false;
  let dragPreviewPieceColor = null;
  if (isDragging && dragPreviewCell && draggedPiece) {
    const dragCoords = getPieceCoords(draggedPiece, dragRotation, dragFlipped);
    dragPreviewPieceColor = pieceColors[draggedPiece] || 'bg-gradient-to-br from-cyan-400 to-blue-500';
    
    let validCells = 0;
    let totalCells = dragCoords.length;
    
    dragCoords.forEach(([dx, dy]) => {
      const cellRow = dragPreviewCell.row + dy;
      const cellCol = dragPreviewCell.col + dx;
      if (cellRow >= 0 && cellRow < BOARD_SIZE && cellCol >= 0 && cellCol < BOARD_SIZE) {
        const existingCell = safeBoard[cellRow]?.[cellCol];
        const isValid = existingCell === null || existingCell === 0 || existingCell === undefined;
        if (isValid) validCells++;
        dragPreviewCells.push({ row: cellRow, col: cellCol, isValid });
      }
    });
    
    // Valid if all cells can be placed
    dragPreviewValid = validCells === totalCells && canPlacePiece(safeBoard, dragPreviewCell.row, dragPreviewCell.col, dragCoords);
  }

  // Get color classes based on game mode and player
  const getPlayerColorClass = (cellValue) => {
    if (customColors) {
      if (cellValue === 1) return customColors.player1 || 'bg-gradient-to-br from-cyan-400 to-blue-500';
      if (cellValue === 2) return customColors.player2 || 'bg-gradient-to-br from-orange-400 to-red-500';
    }
    
    if (cellValue === 1) {
      return 'bg-gradient-to-br from-cyan-400 via-cyan-500 to-blue-600';
    }
    if (cellValue === 2) {
      if (gameMode === '2player') {
        return 'bg-gradient-to-br from-pink-400 via-pink-500 to-rose-600';
      }
      return 'bg-gradient-to-br from-orange-400 via-orange-500 to-red-600';
    }
    return '';
  };

  // Handle cell click
  const handleCellClick = (rowIdx, colIdx) => {
    if (isDisabled) return;
    if (onCellClick) {
      onCellClick(rowIdx, colIdx);
    }
  };

  return (
    <div className="relative" ref={ref}>
      {/* Main board grid */}
      <div 
        className="grid grid-cols-8 gap-0.5 sm:gap-1 p-1.5 sm:p-2 rounded-lg bg-slate-800/60 backdrop-blur-sm border border-slate-700/50"
        style={{
          boxShadow: '0 0 30px rgba(0,0,0,0.3), inset 0 0 20px rgba(0,0,0,0.2)'
        }}
      >
        {safeBoard.map((row, rowIdx) =>
          row.map((cellValue, colIdx) => {
            const isPending = pendingCells.some(p => p.row === rowIdx && p.col === colIdx);
            const isOverlapping = overlappingCells.some(p => p.row === rowIdx && p.col === colIdx);
            const isAiAnimating = aiAnimatingCells.some(p => p.row === rowIdx && p.col === colIdx);
            const isPlayerAnimating = playerAnimatingCells.some(p => p.row === rowIdx && p.col === colIdx);
            const isOccupied = cellValue !== null && cellValue !== 0 && cellValue !== undefined;
            const pieceName = getPieceName(rowIdx, colIdx);
            
            // v7.7: Check if this cell is part of drag preview
            const dragPreviewInfo = dragPreviewCells.find(p => p.row === rowIdx && p.col === colIdx);
            const isDragPreview = !!dragPreviewInfo;
            const isDragPreviewValid = dragPreviewInfo?.isValid !== false;
            
            // Get piece-specific color or player color
            const pieceColor = pieceName ? pieceColors[pieceName] : null;
            const colorClass = isOccupied 
              ? (pieceColor || getPlayerColorClass(cellValue))
              : '';
            
            // Rolling glow timing for this cell
            const glowTiming = glowTimings[`${rowIdx},${colIdx}`];
            
            // Calculate pending index for stagger effect
            const pendingIndex = isPending ? pendingCells.findIndex(p => p.row === rowIdx && p.col === colIdx) : -1;
            
            return (
              <div
                key={`${rowIdx}-${colIdx}`}
                onClick={() => handleCellClick(rowIdx, colIdx)}
                className={`
                  w-9 h-9 sm:w-12 sm:h-12 rounded-md relative overflow-hidden
                  transition-all duration-300 cursor-pointer
                  ${isOccupied ? colorClass : 'bg-slate-700/40 hover:bg-slate-600/50'}
                  ${isOccupied ? 'shadow-lg' : ''}
                  ${isOverlapping ? 'overlap-cell' : ''}
                  ${isAiAnimating ? 'ai-placing-cell' : ''}
                  ${isPlayerAnimating ? 'player-placing-cell' : ''}
                `}
                style={isPending ? {
                  animationDelay: `${pendingIndex * 0.15}s`
                } : undefined}
              >
                {/* Base shine layer for occupied cells - always visible */}
                {isOccupied && (
                  <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-black/20 pointer-events-none" />
                )}
                
                {/* Simple rolling glow effect - slow diagonal shine that moves across the piece */}
                {isOccupied && glowTiming && (
                  <div 
                    className="absolute inset-0 rolling-glow pointer-events-none"
                    style={{ 
                      animationDelay: `-${glowTiming.delay}s`,
                      animationDuration: `${glowTiming.duration}s`
                    }}
                  />
                )}

                {/* Pending piece display - original color with subtle glow */}
                {isPending && (
                  <>
                    {/* Base color */}
                    <div className={`absolute inset-0 ${pendingPieceColor} rounded-md`} />
                    
                    {/* Shine overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-black/20 rounded-md" />
                    
                    {/* Subtle pulse glow */}
                    <div className={`absolute inset-0 pending-glow ${isPendingValid ? 'valid' : 'invalid'} rounded-md`} />
                    
                    {/* Rolling shine effect - slow and elegant */}
                    <div className="absolute inset-0 pending-shine rounded-md overflow-hidden" />
                  </>
                )}
                
                {/* Validity border indicator */}
                {isPending && (
                  <div 
                    className="absolute inset-0 rounded-md pointer-events-none"
                    style={{
                      border: isPendingValid ? '2px solid rgba(34, 211, 238, 0.7)' : '2px solid rgba(239, 68, 68, 0.7)',
                      boxShadow: isPendingValid 
                        ? '0 0 10px rgba(34, 211, 238, 0.4), inset 0 0 8px rgba(34, 211, 238, 0.2)'
                        : '0 0 10px rgba(239, 68, 68, 0.4), inset 0 0 8px rgba(239, 68, 68, 0.2)'
                    }}
                  />
                )}

                {/* Overlapping cell warning - more visible */}
                {isOverlapping && (
                  <div className="absolute inset-0 overlap-warning rounded-md" />
                )}

                {/* AI drop effect */}
                {isAiAnimating && (
                  <div className="absolute inset-0 ai-drop-effect rounded-md" />
                )}

                {/* Player drop effect */}
                {isPlayerAnimating && (
                  <div className="absolute inset-0 player-drop-effect rounded-md" />
                )}

                {/* v7.7: Drag preview highlighting - shows where piece will land during drag */}
                {isDragPreview && !isOccupied && (
                  <>
                    {/* Preview background with piece color */}
                    <div 
                      className={`absolute inset-0 ${dragPreviewPieceColor} rounded-md opacity-60`}
                    />
                    
                    {/* Shine overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-black/15 rounded-md" />
                    
                    {/* Validity border */}
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
                  </>
                )}
                
                {/* v7.7: Drag preview on occupied cell (invalid) */}
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
              </div>
            );
          })
        )}
      </div>

      {/* Ghost cells for out-of-bounds preview */}
      {outOfBoundsCells.length > 0 && (
        <div className="absolute pointer-events-none" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
          {outOfBoundsCells.map((cell, idx) => {
            const cellSize = window.innerWidth < 640 ? 36 : 48;
            const gap = window.innerWidth < 640 ? 2 : 4;
            const padding = window.innerWidth < 640 ? 6 : 8;
            
            const left = padding + cell.col * (cellSize + gap);
            const top = padding + cell.row * (cellSize + gap);
            
            return (
              <div
                key={idx}
                className="absolute ghost-cell-warning rounded-md"
                style={{
                  width: cellSize,
                  height: cellSize,
                  left,
                  top,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Full board outline when piece is active */}
      {pendingMove && (
        <div 
          className={`absolute inset-0 pointer-events-none rounded-lg transition-all duration-500 ${
            isPendingValid 
              ? 'ring-2 ring-cyan-400/40 shadow-[0_0_20px_rgba(34,211,238,0.2)]'
              : 'ring-2 ring-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
          }`}
          style={{ margin: '-2px' }}
        />
      )}

      {/* Animation styles - SLOWER and more elegant */}
      <style>{`
        /* ============================================
           PENDING PIECE - SUBTLE GLOW & SHINE
           Slower, more elegant animations
           ============================================ */
        
        .pending-glow {
          animation: pending-glow-pulse 3s ease-in-out infinite;
        }
        
        .pending-glow.valid {
          background: radial-gradient(circle at center, rgba(34, 211, 238, 0.15) 0%, transparent 70%);
        }
        
        .pending-glow.invalid {
          background: radial-gradient(circle at center, rgba(239, 68, 68, 0.15) 0%, transparent 70%);
        }
        
        @keyframes pending-glow-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        
        .pending-shine {
          background: linear-gradient(
            120deg,
            transparent 0%,
            transparent 40%,
            rgba(255, 255, 255, 0.3) 50%,
            transparent 60%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: pending-shine-roll 4s ease-in-out infinite;
        }
        
        @keyframes pending-shine-roll {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        
        /* ============================================
           OVERLAPPING CELLS - CLEAR WARNING
           ============================================ */
        .overlap-cell {
          box-shadow: 
            0 0 15px rgba(239, 68, 68, 0.8),
            0 0 30px rgba(239, 68, 68, 0.4),
            inset 0 0 15px rgba(239, 68, 68, 0.6) !important;
          border: 3px solid rgba(255, 100, 100, 1) !important;
        }
        
        .overlap-warning {
          background: repeating-linear-gradient(
            45deg,
            rgba(239, 68, 68, 0.6),
            rgba(239, 68, 68, 0.6) 4px,
            rgba(255, 150, 150, 0.6) 4px,
            rgba(255, 150, 150, 0.6) 8px
          );
          animation: overlap-pulse 1.5s ease-in-out infinite;
        }
        
        @keyframes overlap-pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        
        /* ============================================
           GHOST CELLS (OUT OF BOUNDS)
           ============================================ */
        .ghost-cell-warning {
          background: rgba(239, 68, 68, 0.25);
          border: 2px dashed rgba(239, 68, 68, 0.8);
          animation: ghost-pulse 2s ease-in-out infinite;
        }
        
        @keyframes ghost-pulse {
          0%, 100% { 
            border-color: rgba(239, 68, 68, 0.8);
            background: rgba(239, 68, 68, 0.25);
          }
          50% { 
            border-color: rgba(255, 100, 100, 1);
            background: rgba(239, 68, 68, 0.4);
          }
        }
        
        /* ============================================
           AI PLACING ANIMATION
           ============================================ */
        .ai-placing-cell {
          box-shadow: 
            0 0 20px rgba(168, 85, 247, 0.8),
            0 0 40px rgba(168, 85, 247, 0.4) !important;
          border: 2px solid rgba(168, 85, 247, 0.8) !important;
        }
        
        .ai-drop-effect {
          background: radial-gradient(circle, rgba(168, 85, 247, 0.6) 0%, transparent 70%);
          animation: ai-drop 0.5s ease-out;
        }
        
        @keyframes ai-drop {
          0% { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        /* ============================================
           PLAYER PLACING ANIMATION
           ============================================ */
        .player-placing-cell {
          box-shadow: 
            0 0 20px rgba(34, 211, 238, 0.8),
            0 0 40px rgba(34, 211, 238, 0.4) !important;
          border: 2px solid rgba(34, 211, 238, 0.8) !important;
        }
        
        .player-drop-effect {
          background: radial-gradient(circle, rgba(34, 211, 238, 0.6) 0%, transparent 70%);
          animation: player-drop 0.5s ease-out;
        }
        
        @keyframes player-drop {
          0% { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        /* ============================================
           v7.7: DRAG PREVIEW HIGHLIGHTING
           Shows where piece will land during drag
           ============================================ */
        .drag-preview-pulse {
          animation: drag-preview-glow 0.8s ease-in-out infinite;
        }
        
        @keyframes drag-preview-glow {
          0%, 100% { 
            opacity: 0.7;
            transform: scale(1);
          }
          50% { 
            opacity: 1;
            transform: scale(1.02);
          }
        }
        
        /* ============================================
           PLACED PIECE AMBIENT EFFECTS
           Simple rolling glow - slow diagonal shine
           ============================================ */
        
        /* Rolling glow - subtle diagonal light sweep across the cell */
        .rolling-glow {
          background: linear-gradient(
            135deg,
            transparent 0%,
            transparent 40%,
            rgba(255, 255, 255, 0.2) 48%,
            rgba(255, 255, 255, 0.3) 50%,
            rgba(255, 255, 255, 0.2) 52%,
            transparent 60%,
            transparent 100%
          );
          background-size: 400% 400%;
          animation: rolling-glow-sweep linear infinite;
        }
        
        @keyframes rolling-glow-sweep {
          0% { 
            background-position: 150% 150%;
          }
          100% { 
            background-position: -50% -50%;
          }
        }
      `}</style>
    </div>
  );
});

GameBoard.displayName = 'GameBoard';

export default GameBoard;
