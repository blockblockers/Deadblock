// DragOverlay.jsx - Floating piece preview during drag operations
// v7.7 FIX: Fully transparent background, no board preview, only shows the dragged piece
// This applies to all game boards (VS AI, Puzzle, Online, Weekly Challenge, Speed Puzzle)

import { memo } from 'react';
import { getPieceCoords } from '../utils/gameLogic';
import { pieceColors } from '../utils/pieces';

/**
 * DragOverlay - Renders ONLY the floating piece that follows the drag position
 * 
 * v7.7 FIXES:
 * - Fully transparent background (no box around pieces)
 * - Single floating piece only (no mirror preview on board)
 * - Works with conflict drops (shows cyan glow even if partial overlap)
 */
const DragOverlay = memo(({ 
  piece, 
  position, 
  offset = { x: 0, y: 0 },
  rotation = 0, 
  flipped = false,
  isValid = false,
  isValidDrop,
  isDragging = true,
  // v7.7: New prop - true if at least one cell can be placed
  hasValidCell = true,
}) => {
  // Support both prop names for compatibility
  // v7.7: Use hasValidCell if provided, otherwise fall back to isValidDrop/isValid
  const showAsValid = hasValidCell || isValidDrop || isValid;
  
  // Detect mobile for matching grid size
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  
  // Match the game board cell sizes exactly
  const cellSize = isMobile ? 36 : 48;
  const gap = isMobile ? 2 : 4;
  
  if (!piece || !position || !isDragging) return null;

  // Get piece coordinates with current rotation/flip
  const coords = getPieceCoords(piece, rotation, flipped);
  if (!coords || coords.length === 0) return null;

  // Calculate bounds
  const minX = Math.min(...coords.map(([x]) => x));
  const maxX = Math.max(...coords.map(([x]) => x));
  const minY = Math.min(...coords.map(([, y]) => y));
  const maxY = Math.max(...coords.map(([, y]) => y));
  
  // Calculate total dimensions
  const pieceWidth = (maxX - minX + 1) * (cellSize + gap) - gap;
  const pieceHeight = (maxY - minY + 1) * (cellSize + gap) - gap;

  // Get original piece color
  const colorClass = pieceColors[piece] || 'bg-gradient-to-br from-cyan-400 to-blue-500';
  
  // Glow colors - cyan when valid (or has at least one valid cell), red only when completely invalid
  const glowColor = showAsValid 
    ? 'rgba(34, 211, 238, 0.8)' // Cyan for valid/partial
    : 'rgba(239, 68, 68, 0.8)'; // Red for completely invalid
  
  const outerGlow = showAsValid
    ? '0 0 25px rgba(34,211,238,0.5), 0 0 50px rgba(34,211,238,0.3)'
    : '0 0 15px rgba(239,68,68,0.4), 0 0 30px rgba(239,68,68,0.2)';

  return (
    <>
      {/* Main floating piece - NO background container, just the blocks */}
      <div
        className="fixed pointer-events-none z-[9999]"
        style={{
          left: position.x - pieceWidth / 2,
          top: position.y - pieceHeight / 2 - 40, // Offset up so finger doesn't cover piece
          transform: 'translate3d(0, 0, 0)',
          willChange: 'left, top',
        }}
      >
        {/* Piece grid - transparent container, only blocks visible */}
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${maxX - minX + 1}, ${cellSize}px)`,
            gap: `${gap}px`,
            filter: `drop-shadow(${outerGlow.split(',')[0]})`,
          }}
        >
          {coords.map(([x, y], idx) => {
            const gridX = x - minX;
            const gridY = y - minY;
            
            return (
              <div
                key={idx}
                className={`rounded-md sm:rounded-lg relative overflow-hidden ${colorClass}`}
                style={{
                  width: cellSize,
                  height: cellSize,
                  gridColumn: gridX + 1,
                  gridRow: gridY + 1,
                  boxShadow: `0 0 12px ${glowColor}, inset 0 0 8px rgba(255,255,255,0.2)`,
                }}
              >
                {/* Inner gradient shine */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/35 via-transparent to-black/20" />
                
                {/* Subtle border glow */}
                <div 
                  className="absolute inset-0 rounded-md sm:rounded-lg"
                  style={{
                    border: `2px solid ${glowColor}`,
                    opacity: 0.8,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Minimal keyframes for subtle effects */}
      <style>{`
        /* No animations needed - keep it clean and responsive */
      `}</style>
    </>
  );
});

DragOverlay.displayName = 'DragOverlay';

export default DragOverlay;
