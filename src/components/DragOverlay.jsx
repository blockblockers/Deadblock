// DragOverlay.jsx - Floating piece preview during drag operations
// v7.22: Position touched cell under finger for smart alignment
// This applies to all game boards (VS AI, Puzzle, Online, Weekly Challenge, Speed Puzzle)

import { memo } from 'react';
import { getPieceCoords } from '../utils/gameLogic';
import { pieceColors } from '../utils/pieces';

/**
 * DragOverlay - Renders ONLY the floating piece that follows the drag position
 * 
 * v7.22: The piece is positioned so the touched cell is under the finger,
 * with a slight vertical offset so the user's finger doesn't cover it.
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
  hasValidCell = true,
  cellOffset = { row: 0, col: 0 }, // v7.22: Which cell of the piece is under finger
}) => {
  // Support both prop names for compatibility
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
  
  // Glow colors
  const glowColor = showAsValid 
    ? 'rgba(34, 211, 238, 0.8)'
    : 'rgba(239, 68, 68, 0.8)';
  
  const outerGlow = showAsValid
    ? '0 0 25px rgba(34,211,238,0.5), 0 0 50px rgba(34,211,238,0.3)'
    : '0 0 15px rgba(239,68,68,0.4), 0 0 30px rgba(239,68,68,0.2)';

  // v7.22: No vertical offset - piece should be exactly where finger points
  // This ensures the preview matches where the piece will land
  const fingerOffset = 0;
  
  // v7.22: Calculate position so the touched cell is under the finger
  // cellOffset tells us which cell of the piece (relative to anchor) is being dragged
  // We need to find where that cell is in the rendered grid
  const touchedCellCol = cellOffset.col - minX; // Column in the rendered grid (0-indexed)
  const touchedCellRow = cellOffset.row - minY; // Row in the rendered grid (0-indexed)
  
  // Calculate the center of the touched cell within the piece
  const touchedCellCenterX = touchedCellCol * (cellSize + gap) + cellSize / 2;
  const touchedCellCenterY = touchedCellRow * (cellSize + gap) + cellSize / 2;
  
  // Position piece so touched cell center is at finger position
  const pieceLeft = position.x - touchedCellCenterX;
  const pieceTop = position.y - touchedCellCenterY - fingerOffset;

  return (
    <>
      <div
        className="fixed pointer-events-none z-[9999]"
        style={{
          left: pieceLeft,
          top: pieceTop,
          transform: 'translate3d(0, 0, 0)',
          willChange: 'left, top',
        }}
      >
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
                <div className="absolute inset-0 bg-gradient-to-br from-white/35 via-transparent to-black/20" />
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
    </>
  );
});

DragOverlay.displayName = 'DragOverlay';

export default DragOverlay;
