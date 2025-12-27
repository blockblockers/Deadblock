// DragOverlay.jsx - Floating piece preview during drag operations
// REDESIGNED: Single piece follows cursor (no mirrored preview on board)
// ENHANCED: Strong glow effects, smooth animations, validity indicator
import { memo } from 'react';
import { getPieceCoords } from '../utils/gameLogic';
import { pieceColors } from '../utils/pieces';

/**
 * DragOverlay - Renders a single floating piece that follows the drag position
 * 
 * REDESIGNED: Shows only ONE piece following the cursor/finger
 * - No more confusing mirrored preview
 * - Large, obvious piece with strong glow
 * - Clear valid/invalid state indication
 * - Smooth follow animation
 * 
 * @param {Object} props
 * @param {string} props.piece - Name of the piece being dragged
 * @param {Object} props.position - Current {x, y} screen position
 * @param {Object} props.offset - Offset from touch/click point {x, y}
 * @param {number} props.rotation - Current rotation (0, 1, 2, 3)
 * @param {boolean} props.flipped - Whether piece is flipped
 * @param {boolean} props.isValid - Whether current drop position is valid
 * @param {boolean} props.isValidDrop - Alias for isValid (compatibility)
 * @param {boolean} props.isOverBoard - Whether cursor is over the game board
 */
const DragOverlay = memo(({ 
  piece, 
  position, 
  offset = { x: 0, y: 0 },
  rotation = 0, 
  flipped = false,
  isValid = false,
  isValidDrop,
  isOverBoard = false,
}) => {
  // Support both prop names for compatibility
  const validDrop = isValidDrop !== undefined ? isValidDrop : isValid;
  
  if (!piece || !position) return null;

  // Get piece coordinates with current rotation/flip
  const coords = getPieceCoords(piece, rotation, flipped);
  if (!coords || coords.length === 0) return null;

  // Calculate bounds
  const minX = Math.min(...coords.map(([x]) => x));
  const maxX = Math.max(...coords.map(([x]) => x));
  const minY = Math.min(...coords.map(([, y]) => y));
  const maxY = Math.max(...coords.map(([, y]) => y));
  
  // Cell size for the floating preview (larger for visibility)
  const cellSize = 32;
  const gap = 3;
  
  // Calculate total dimensions
  const width = (maxX - minX + 1) * (cellSize + gap) - gap;
  const height = (maxY - minY + 1) * (cellSize + gap) - gap;

  // Get piece color
  const colorClass = pieceColors[piece] || 'bg-gradient-to-br from-cyan-400 to-blue-500';

  return (
    <>
      {/* Backdrop blur when dragging */}
      <div 
        className="fixed inset-0 pointer-events-none z-[9998]"
        style={{
          background: 'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.2) 100%)',
        }}
      />
      
      {/* Main floating piece */}
      <div
        className="fixed pointer-events-none z-[9999]"
        style={{
          left: position.x - offset.x - width / 2,
          top: position.y - offset.y - height / 2 - 20, // Offset up so finger doesn't cover piece
          width: width + 20, // Padding for glow
          height: height + 40, // Extra for label
          transform: 'translate3d(0, 0, 0)', // GPU acceleration
          willChange: 'left, top',
        }}
      >
        {/* Outer glow effect */}
        <div 
          className={`
            absolute rounded-2xl transition-all duration-150
            ${validDrop 
              ? 'bg-cyan-400/30 shadow-[0_0_60px_rgba(34,211,238,0.6),0_0_100px_rgba(34,211,238,0.3)]' 
              : 'bg-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.4),0_0_80px_rgba(239,68,68,0.2)]'
            }
          `}
          style={{
            left: -10,
            top: -10,
            right: -10,
            bottom: 20,
            filter: 'blur(8px)',
          }}
        />
        
        {/* Piece container */}
        <div 
          className={`
            relative rounded-xl p-2 transition-all duration-150
            ${validDrop 
              ? 'bg-slate-900/95 border-2 border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.5)]' 
              : 'bg-slate-900/95 border-2 border-red-500/70 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
            }
          `}
          style={{
            marginLeft: 10,
            marginTop: 10,
          }}
        >
          {/* Piece grid */}
          <div 
            className="relative"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${maxX - minX + 1}, ${cellSize}px)`,
              gap: `${gap}px`,
            }}
          >
            {coords.map(([x, y], idx) => {
              const gridX = x - minX;
              const gridY = y - minY;
              
              return (
                <div
                  key={idx}
                  className={`
                    rounded-md relative overflow-hidden
                    ${colorClass}
                    ${validDrop 
                      ? 'shadow-[0_0_15px_rgba(34,211,238,0.5)]' 
                      : 'shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                    }
                  `}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    gridColumn: gridX + 1,
                    gridRow: gridY + 1,
                  }}
                >
                  {/* Inner shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-black/20" />
                  
                  {/* Scan line effect */}
                  <div className="absolute inset-0 opacity-40 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.15)_2px,rgba(255,255,255,0.15)_4px)]" />
                  
                  {/* Pulsing glow for valid */}
                  {validDrop && (
                    <div className="absolute inset-0 animate-pulse bg-cyan-400/20" />
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Corner accents */}
          <div className={`absolute top-0 left-0 w-3 h-3 border-l-2 border-t-2 rounded-tl-lg ${validDrop ? 'border-cyan-400' : 'border-red-500'}`} />
          <div className={`absolute top-0 right-0 w-3 h-3 border-r-2 border-t-2 rounded-tr-lg ${validDrop ? 'border-cyan-400' : 'border-red-500'}`} />
          <div className={`absolute bottom-0 left-0 w-3 h-3 border-l-2 border-b-2 rounded-bl-lg ${validDrop ? 'border-cyan-400' : 'border-red-500'}`} />
          <div className={`absolute bottom-0 right-0 w-3 h-3 border-r-2 border-b-2 rounded-br-lg ${validDrop ? 'border-cyan-400' : 'border-red-500'}`} />
        </div>
        
        {/* Status indicator label */}
        <div 
          className={`
            absolute left-1/2 -translate-x-1/2 bottom-0
            px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider
            transition-all duration-150
            ${validDrop 
              ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-[0_0_20px_rgba(34,211,238,0.6)]' 
              : 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]'
            }
          `}
        >
          {validDrop ? '✓ DROP HERE' : '✕ INVALID'}
        </div>
      </div>
      
      {/* Ripple effect at cursor position */}
      <div 
        className="fixed pointer-events-none z-[9997]"
        style={{
          left: position.x,
          top: position.y,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div 
          className={`
            w-12 h-12 rounded-full opacity-50
            ${validDrop ? 'bg-cyan-400' : 'bg-red-500'}
          `}
          style={{
            animation: 'ripple 1s ease-out infinite',
          }}
        />
      </div>
      
      {/* Animation keyframes */}
      <style>{`
        @keyframes ripple {
          0% {
            transform: scale(0.5);
            opacity: 0.5;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
});

DragOverlay.displayName = 'DragOverlay';

export default DragOverlay;
