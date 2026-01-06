// GameBoard.jsx - Main game board component
// v7.8: Breathing glow animation - pieces glow up/down at random intervals
// v7.9: Added lastMoveCells for highlighting opponent's previous move
// CHANGED: Allow dropping pieces even with conflicts (for rotation adjustment)
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
  lastMoveCells = null, // Array of { row, col } for opponent's last placed piece
}, ref) => {
  // Ensure board is properly formatted
  const safeBoard = Array.isArray(board) 
    ? board.map(row => Array.isArray(row) ? row : Array(BOARD_SIZE).fill(null))
    : Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  
  const safeBoardPieces = boardPieces || {};
  
  // Breathing glow effect with random timing per cell
  // v7.9: Edge-only glow using piece colors (no white flash inside)
  const [glowTimings, setGlowTimings] = useState({});
  
  useEffect(() => {
    // Generate random timing for breathing glow effect on each cell
    // v7.9: Each piece glows up and down at its own rhythm
    // - Random delay ensures pieces don't pulse in sync
    // - Duration controls how long each breath takes (one direction)
    // - With 'alternate', a 12s duration = 12s up + 12s down = 24s full cycle
    const timings = {};
    
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (safeBoard[row]?.[col]) {
          timings[`${row},${col}`] = {
            // Wide random delay so pieces glow at different times (0-30 seconds)
            delay: Math.random() * 30,
            // Duration for one direction of breathing (8-14 seconds for slower effect)
            // Full cycle will be 16-28 seconds (up + down)
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
  const isAiWinningMove = aiAnimatingMove?.isWinning || false;
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
  const isPlayerWinningMove = playerAnimatingMove?.isWinning || false;
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
            
            // v7.9: Check if this cell is part of opponent's last move
            const isLastMove = lastMoveCells?.some(p => p.row === rowIdx && p.col === colIdx) || false;
            
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
            
            // v7.8: Handle touch start for re-dragging pending pieces
            // v7.17: Fixed - use touch-action: none instead of preventDefault
            const handlePendingTouchStart = (e) => {
              if (!isPending || !onPendingPieceDragStart || !pendingMove) {
                return;
              }
              
              // Don't call preventDefault - it fails on passive listeners
              // touch-action: none on the element handles scroll prevention
              e.stopPropagation();
              
              // Get touch position
              const touch = e.touches?.[0];
              if (!touch) return;
              
              const rect = e.currentTarget?.getBoundingClientRect() || null;
              
              // Start drag of the pending piece
              onPendingPieceDragStart(pendingMove.piece, touch.clientX, touch.clientY, rect);
            };
            
            // v7.8: Handle mouse down for re-dragging pending pieces (desktop)
            const handlePendingMouseDown = (e) => {
              if (!isPending || !onPendingPieceDragStart || !pendingMove) return;
              if (e.button !== 0) return; // Left click only
              
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
                  ${isAiAnimating ? (isAiWinningMove ? 'ai-winning-cell' : 'ai-placing-cell') : ''}
                  ${isPlayerAnimating ? (isPlayerWinningMove ? 'player-winning-cell' : 'player-placing-cell') : ''}
                  ${isPending && !isDragging ? 'pending cursor-grab active:cursor-grabbing' : ''}
                  ${isLastMove && !isPending && !isAiAnimating && !isPlayerAnimating ? 'last-move-cell' : ''}
                `}
                style={isPending ? {
                  animationDelay: `${pendingIndex * 0.15}s`,
                  touchAction: 'none',
                  userSelect: 'none',
                  // v7.22: Make pending cells invisible during drag (opacity preserves touch target)
                  opacity: isDragging ? 0 : 1,
                } : undefined}
              >
                {/* Base shine layer for occupied cells - subtle highlight */}
                {isOccupied && (
                  <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/15 pointer-events-none" />
                )}
                
                {/* v7.9: Breathing edge glow effect - slow pulse on edges using piece's own color */}
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

                {/* Pending piece display - original color with subtle glow */}
                {/* v7.22: Hide pending visuals during drag - DragOverlay shows the piece */}
                {isPending && !isDragging && (
                  <>
                    {/* Base color */}
                    <div className={`absolute inset-0 ${pendingPieceColor} rounded-md`} />
                    
                    {/* Subtle highlight overlay - reduced white */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/15 rounded-md" />
                    
                    {/* Subtle pulse glow */}
                    <div className={`absolute inset-0 pending-glow ${isPendingValid ? 'valid' : 'invalid'} rounded-md`} />
                    
                    {/* Rolling edge glow effect - slow and elegant */}
                    <div className="absolute inset-0 pending-shine rounded-md overflow-hidden" />
                  </>
                )}
                
                {/* Validity border indicator */}
                {/* v7.22: Hide during drag */}
                {isPending && !isDragging && (
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
                    
                    {/* Subtle highlight overlay - reduced */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10 rounded-md" />
                    
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
                
                {/* v7.9: Last move highlight - shows opponent's most recent move */}
                {isLastMove && !isPending && !isAiAnimating && !isPlayerAnimating && (
                  <div 
                    className="absolute inset-0 rounded-md pointer-events-none last-move-indicator"
                    style={{
                      border: '2px solid rgba(251, 191, 36, 0.8)',
                      boxShadow: '0 0 12px rgba(251, 191, 36, 0.5), inset 0 0 6px rgba(251, 191, 36, 0.3)'
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
          /* v7.9: Subtle edge glow sweep instead of white flash */
          background: linear-gradient(
            120deg,
            transparent 0%,
            transparent 40%,
            rgba(34, 211, 238, 0.2) 50%,
            transparent 60%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: pending-shine-roll 5s ease-in-out infinite;
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
        
        /* v7.8: AI WINNING MOVE ANIMATION - Golden pulsing glow */
        .ai-winning-cell {
          animation: winning-pulse 0.5s ease-in-out infinite alternate;
          border: 3px solid rgba(251, 191, 36, 1) !important;
        }
        
        .ai-drop-effect {
          /* v7.9: Edge glow animation instead of radial flash */
          animation: ai-drop-glow 0.6s ease-out;
        }
        
        @keyframes ai-drop-glow {
          0% { 
            opacity: 0;
            box-shadow: 
              0 0 20px rgba(168, 85, 247, 0.9),
              0 0 40px rgba(168, 85, 247, 0.6),
              0 0 60px rgba(168, 85, 247, 0.3);
          }
          50% {
            opacity: 1;
            box-shadow: 
              0 0 25px rgba(168, 85, 247, 0.8),
              0 0 50px rgba(168, 85, 247, 0.5),
              0 0 75px rgba(168, 85, 247, 0.25);
          }
          100% { 
            opacity: 1;
            box-shadow: 
              0 0 6px rgba(168, 85, 247, 0.3),
              0 0 12px rgba(168, 85, 247, 0.15);
          }
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
        
        /* v7.8: PLAYER WINNING MOVE ANIMATION - Golden pulsing glow */
        .player-winning-cell {
          animation: winning-pulse 0.5s ease-in-out infinite alternate;
          border: 3px solid rgba(251, 191, 36, 1) !important;
        }
        
        /* v7.8: Winning move pulse animation - shared by both AI and player */
        @keyframes winning-pulse {
          0% { 
            box-shadow: 
              0 0 20px rgba(251, 191, 36, 0.9),
              0 0 40px rgba(251, 191, 36, 0.6),
              0 0 60px rgba(251, 191, 36, 0.3),
              inset 0 0 15px rgba(251, 191, 36, 0.4);
            transform: scale(1);
          }
          100% { 
            box-shadow: 
              0 0 30px rgba(251, 191, 36, 1),
              0 0 60px rgba(251, 191, 36, 0.8),
              0 0 90px rgba(251, 191, 36, 0.4),
              inset 0 0 25px rgba(251, 191, 36, 0.6);
            transform: scale(1.05);
          }
        }
        
        .player-drop-effect {
          /* v7.9: Edge glow animation instead of radial flash */
          animation: player-drop-glow 0.6s ease-out;
        }
        
        @keyframes player-drop-glow {
          0% { 
            opacity: 0;
            box-shadow: 
              0 0 20px rgba(34, 211, 238, 0.9),
              0 0 40px rgba(34, 211, 238, 0.6),
              0 0 60px rgba(34, 211, 238, 0.3);
          }
          50% {
            opacity: 1;
            box-shadow: 
              0 0 25px rgba(34, 211, 238, 0.8),
              0 0 50px rgba(34, 211, 238, 0.5),
              0 0 75px rgba(34, 211, 238, 0.25);
          }
          100% { 
            opacity: 1;
            box-shadow: 
              0 0 6px rgba(34, 211, 238, 0.3),
              0 0 12px rgba(34, 211, 238, 0.15);
          }
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
           v7.9: LAST MOVE HIGHLIGHTING
           Shows opponent's most recent move with amber glow
           ============================================ */
        .last-move-cell {
          position: relative;
          z-index: 2;
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
        
        /* ============================================
           PLACED PIECE AMBIENT EFFECTS
           v7.9: Breathing edge glow - similar to NeonTitle effect
           - Edge-only glow using box-shadow (no white flash inside)
           - Uses piece's own color (cyan/orange/pink)
           - Slow, random timing so pieces don't glow in sync
           ============================================ */
        
        /* Cyan breathing glow (Player 1) */
        .breathing-glow-cyan {
          animation: breathing-cyan ease-in-out infinite alternate;
        }
        
        @keyframes breathing-cyan {
          0% { 
            box-shadow: 
              0 0 3px rgba(34, 211, 238, 0.2),
              0 0 6px rgba(34, 211, 238, 0.1);
          }
          100% { 
            box-shadow: 
              0 0 8px rgba(34, 211, 238, 0.5),
              0 0 16px rgba(34, 211, 238, 0.3),
              0 0 24px rgba(34, 211, 238, 0.15);
          }
        }
        
        /* Orange breathing glow (AI / Player 2 in AI mode) */
        .breathing-glow-orange {
          animation: breathing-orange ease-in-out infinite alternate;
        }
        
        @keyframes breathing-orange {
          0% { 
            box-shadow: 
              0 0 3px rgba(251, 146, 60, 0.2),
              0 0 6px rgba(251, 146, 60, 0.1);
          }
          100% { 
            box-shadow: 
              0 0 8px rgba(251, 146, 60, 0.5),
              0 0 16px rgba(251, 146, 60, 0.3),
              0 0 24px rgba(251, 146, 60, 0.15);
          }
        }
        
        /* Pink breathing glow (Player 2 in 2-player mode) */
        .breathing-glow-pink {
          animation: breathing-pink ease-in-out infinite alternate;
        }
        
        @keyframes breathing-pink {
          0% { 
            box-shadow: 
              0 0 3px rgba(236, 72, 153, 0.2),
              0 0 6px rgba(236, 72, 153, 0.1);
          }
          100% { 
            box-shadow: 
              0 0 8px rgba(236, 72, 153, 0.5),
              0 0 16px rgba(236, 72, 153, 0.3),
              0 0 24px rgba(236, 72, 153, 0.15);
          }
        }
        
        /* v7.8: Allow scroll pass-through on board cells */
        /* Cells without pending pieces allow scroll */
        .game-cell {
          touch-action: manipulation;
        }
        
        /* Pending piece cells can be dragged */
        .game-cell.pending {
          touch-action: none;
          cursor: grab;
        }
        
        .game-cell.pending:active {
          cursor: grabbing;
        }
      `}</style>
    </div>
  );
});

GameBoard.displayName = 'GameBoard';

export default GameBoard;
