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
}, ref) => {
  // Ensure board is properly formatted
  const safeBoard = Array.isArray(board) 
    ? board.map(row => Array.isArray(row) ? row : Array(BOARD_SIZE).fill(null))
    : Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  
  const safeBoardPieces = boardPieces || {};
  
  // Random ambient effects for placed pieces - very slow, elegant animations
  const [ambientEffects, setAmbientEffects] = useState({});
  
  useEffect(() => {
    // Generate random ambient effects for placed pieces
    const effects = {};
    // More effect variety with weighted chances
    const effectTypes = [
      'orbiting-highlight',  // Rotating highlight around edges
      'breathing',           // Gentle brightness pulse
      'corner-glow',         // Glowing corners
      'edge-shimmer',        // Shimmer along edges
      'none',                // Some pieces stay static for contrast
    ];
    
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (safeBoard[row]?.[col]) {
          const rand = Math.random();
          const typeIndex = Math.floor(rand * effectTypes.length);
          effects[`${row},${col}`] = {
            type: effectTypes[typeIndex],
            delay: -Math.random() * 10, // Negative delay = start mid-animation
            duration: 8 + Math.random() * 7, // 8-15 second cycles (very slow)
            direction: Math.random() > 0.5 ? 1 : -1, // Randomize direction
          };
        }
      }
    }
    setAmbientEffects(effects);
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
            
            // Get piece-specific color or player color
            const pieceColor = pieceName ? pieceColors[pieceName] : null;
            const colorClass = isOccupied 
              ? (pieceColor || getPlayerColorClass(cellValue))
              : '';
            
            // Ambient effect for this cell
            const ambient = ambientEffects[`${rowIdx},${colIdx}`];
            
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
                
                {/* Elegant ambient effects for placed pieces - very slow animations */}
                {isOccupied && ambient?.type === 'orbiting-highlight' && (
                  <div 
                    className="absolute inset-0 orbiting-highlight pointer-events-none"
                    style={{ 
                      animationDelay: `${ambient.delay}s`,
                      animationDuration: `${ambient.duration}s`,
                      animationDirection: ambient.direction > 0 ? 'normal' : 'reverse'
                    }}
                  />
                )}
                {isOccupied && ambient?.type === 'breathing' && (
                  <div 
                    className="absolute inset-0 breathing-effect pointer-events-none"
                    style={{ 
                      animationDelay: `${ambient.delay}s`,
                      animationDuration: `${ambient.duration}s`
                    }}
                  />
                )}
                {isOccupied && ambient?.type === 'corner-glow' && (
                  <>
                    <div 
                      className="absolute corner-glow-tl pointer-events-none"
                      style={{ 
                        animationDelay: `${ambient.delay}s`,
                        animationDuration: `${ambient.duration}s`
                      }}
                    />
                    <div 
                      className="absolute corner-glow-br pointer-events-none"
                      style={{ 
                        animationDelay: `${ambient.delay - ambient.duration / 2}s`,
                        animationDuration: `${ambient.duration}s`
                      }}
                    />
                  </>
                )}
                {isOccupied && ambient?.type === 'edge-shimmer' && (
                  <div 
                    className="absolute inset-0 edge-shimmer pointer-events-none"
                    style={{ 
                      animationDelay: `${ambient.delay}s`,
                      animationDuration: `${ambient.duration}s`
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
           PLACED PIECE AMBIENT EFFECTS
           Very slow, elegant, interesting animations
           ============================================ */
        
        /* Orbiting highlight - light travels around the edges */
        .orbiting-highlight {
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            transparent 315deg,
            rgba(255, 255, 255, 0.4) 340deg,
            rgba(255, 255, 255, 0.6) 355deg,
            rgba(255, 255, 255, 0.4) 360deg
          );
          animation: orbit-rotate 12s linear infinite;
          opacity: 0.7;
        }
        
        @keyframes orbit-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Breathing effect - gentle brightness pulse */
        .breathing-effect {
          background: radial-gradient(
            ellipse at center,
            rgba(255, 255, 255, 0.15) 0%,
            transparent 60%
          );
          animation: breathe 10s ease-in-out infinite;
        }
        
        @keyframes breathe {
          0%, 100% { 
            opacity: 0.3;
            transform: scale(0.8);
            filter: brightness(1);
          }
          50% { 
            opacity: 0.8;
            transform: scale(1.1);
            filter: brightness(1.1);
          }
        }
        
        /* Corner glow - alternating corner highlights */
        .corner-glow-tl {
          width: 50%;
          height: 50%;
          top: 0;
          left: 0;
          background: radial-gradient(
            circle at top left,
            rgba(255, 255, 255, 0.5) 0%,
            transparent 70%
          );
          animation: corner-pulse 10s ease-in-out infinite;
        }
        
        .corner-glow-br {
          width: 50%;
          height: 50%;
          bottom: 0;
          right: 0;
          background: radial-gradient(
            circle at bottom right,
            rgba(255, 255, 255, 0.5) 0%,
            transparent 70%
          );
          animation: corner-pulse 10s ease-in-out infinite;
        }
        
        @keyframes corner-pulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.7; }
        }
        
        /* Edge shimmer - light travels along all edges */
        .edge-shimmer {
          background: 
            linear-gradient(to right, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%),
            linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%);
          background-size: 200% 2px, 2px 200%;
          background-position: -100% 0, 0 -100%;
          background-repeat: no-repeat;
          animation: edge-travel 12s ease-in-out infinite;
        }
        
        @keyframes edge-travel {
          0% { 
            background-position: -100% 0, 0 -100%;
          }
          25% {
            background-position: 200% 0, 0 -100%;
          }
          50% {
            background-position: 200% 100%, 0 200%;
          }
          75% {
            background-position: -100% 100%, 100% 200%;
          }
          100% {
            background-position: -100% 0, 100% -100%;
          }
        }
      `}</style>
    </div>
  );
});

GameBoard.displayName = 'GameBoard';

export default GameBoard;
