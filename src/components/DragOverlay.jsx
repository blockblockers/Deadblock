// DragOverlay.jsx - Floating piece preview during drag operations
// Shows the dragged piece following the cursor/finger with rotation/flip applied
import { memo } from 'react';
import { getPieceCoords } from '../utils/gameLogic';
import { pieceColors } from '../utils/pieces';

/**
 * DragOverlay - Renders a floating piece that follows the drag position
 * 
 * @param {Object} props
 * @param {boolean} props.isDragging - Whether a drag is in progress
 * @param {string} props.piece - Name of the piece being dragged
 * @param {Object} props.position - Current {x, y} position
 * @param {Object} props.offset - Offset from touch point {x, y}
 * @param {number} props.rotation - Current rotation (0, 1, 2, 3)
 * @param {boolean} props.flipped - Whether piece is flipped
 * @param {boolean} props.isValid - Whether current drop position is valid
 */
const DragOverlay = memo(({ 
  isDragging, 
  piece, 
  position, 
  offset = { x: 0, y: 0 },
  rotation = 0, 
  flipped = false,
  isValid = false 
}) => {
  if (!isDragging || !piece) return null;

  // Get piece coordinates with current rotation/flip
  const coords = getPieceCoords(piece, rotation, flipped);
  if (!coords || coords.length === 0) return null;

  // Calculate bounding box
  const minX = Math.min(...coords.map(([x]) => x));
  const maxX = Math.max(...coords.map(([x]) => x));
  const minY = Math.min(...coords.map(([, y]) => y));
  const maxY = Math.max(...coords.map(([, y]) => y));
  
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  
  // Cell size for the overlay (slightly smaller than board cells)
  const cellSize = 32;
  const gap = 2;
  
  // Calculate total piece dimensions
  const pieceWidth = width * cellSize + (width - 1) * gap;
  const pieceHeight = height * cellSize + (height - 1) * gap;
  
  // Get piece color
  const color = pieceColors[piece] || 'bg-cyan-500';
  
  // Position centered under finger/cursor, accounting for offset
  const left = position.x - pieceWidth / 2 - offset.x;
  const top = position.y - pieceHeight / 2 - offset.y;

  return (
    <div 
      className="fixed pointer-events-none z-[9999]"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${pieceWidth}px`,
        height: `${pieceHeight}px`,
        transform: 'translate(0, -20px)', // Lift slightly above finger
      }}
    >
      {/* Piece grid */}
      <div 
        className="relative"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${width}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${height}, ${cellSize}px)`,
          gap: `${gap}px`,
        }}
      >
        {Array(height).fill(null).map((_, row) =>
          Array(width).fill(null).map((_, col) => {
            const isFilled = coords.some(([x, y]) => x === col + minX && y === row + minY);
            
            if (!isFilled) {
              return <div key={`${row}-${col}`} className="w-full h-full" />;
            }
            
            return (
              <div
                key={`${row}-${col}`}
                className={`
                  w-full h-full rounded-md relative overflow-hidden
                  ${color}
                  ${isValid 
                    ? 'ring-2 ring-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.6)]' 
                    : 'ring-2 ring-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                  }
                `}
                style={{
                  opacity: 0.9,
                }}
              >
                {/* Scan line effect */}
                <div className="absolute inset-0 opacity-30 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.15)_2px,rgba(255,255,255,0.15)_4px)]" />
              </div>
            );
          })
        )}
      </div>
      
      {/* Drop indicator */}
      <div 
        className={`
          absolute -bottom-6 left-1/2 -translate-x-1/2 
          text-xs font-bold px-2 py-0.5 rounded
          ${isValid 
            ? 'bg-cyan-500/80 text-white' 
            : 'bg-red-500/80 text-white'
          }
        `}
      >
        {isValid ? 'DROP' : 'INVALID'}
      </div>
      
      {/* Glow effect */}
      <div 
        className={`
          absolute inset-0 -m-2 rounded-xl pointer-events-none
          ${isValid 
            ? 'bg-cyan-400/20 shadow-[0_0_30px_rgba(34,211,238,0.4)]' 
            : 'bg-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.3)]'
          }
        `}
        style={{ filter: 'blur(8px)' }}
      />
    </div>
  );
});

DragOverlay.displayName = 'DragOverlay';

export default DragOverlay;
