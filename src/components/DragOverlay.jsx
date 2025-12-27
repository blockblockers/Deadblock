// DragOverlay.jsx - Floating piece preview during drag operations
// IMPROVED: Piece matches grid cell size, original colors with radiate/sparkle effect
// This applies to all game boards (VS AI, Puzzle, Online, Weekly Challenge, Speed Puzzle)

import { memo } from 'react';
import { getPieceCoords } from '../utils/gameLogic';
import { pieceColors } from '../utils/pieces';

/**
 * DragOverlay - Renders a floating piece that follows the drag position
 * 
 * IMPROVED:
 * - Piece cells match the game board grid size (36px mobile, 48px desktop)
 * - Keeps original piece color with radiate/sparkle effect
 * - Single piece follows cursor (no mirrored preview)
 * - Clear valid/invalid state with glow color change
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
}) => {
  // Support both prop names for compatibility
  const validDrop = isValidDrop !== undefined ? isValidDrop : isValid;
  
  // Detect mobile for matching grid size
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  
  // Match the game board cell sizes exactly
  const cellSize = isMobile ? 36 : 48; // Same as GameBoard: w-9 (36px) / w-12 (48px)
  const gap = isMobile ? 2 : 4; // Same as GameBoard gap
  
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
  
  // Glow colors based on validity
  const glowColor = validDrop 
    ? 'rgba(34, 211, 238, 0.8)' // Cyan for valid
    : 'rgba(239, 68, 68, 0.8)'; // Red for invalid
  
  const outerGlow = validDrop
    ? '0 0 30px rgba(34,211,238,0.6), 0 0 60px rgba(34,211,238,0.4), 0 0 90px rgba(34,211,238,0.2)'
    : '0 0 20px rgba(239,68,68,0.5), 0 0 40px rgba(239,68,68,0.3)';

  return (
    <>
      {/* Subtle backdrop dim */}
      <div 
        className="fixed inset-0 pointer-events-none z-[9998]"
        style={{
          background: 'radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.15) 100%)',
        }}
      />
      
      {/* Main floating piece */}
      <div
        className="fixed pointer-events-none z-[9999]"
        style={{
          left: position.x - pieceWidth / 2,
          top: position.y - pieceHeight / 2 - 30, // Offset up so finger doesn't cover piece
          transform: 'translate3d(0, 0, 0)', // GPU acceleration
          willChange: 'left, top',
        }}
      >
        {/* Outer radiate glow */}
        <div 
          className="absolute rounded-xl"
          style={{
            left: -15,
            top: -15,
            right: -15,
            bottom: -15,
            boxShadow: outerGlow,
            animation: 'drag-radiate-glow 1.5s ease-in-out infinite',
          }}
        />
        
        {/* Piece grid - matches board cell size */}
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
                  rounded-md sm:rounded-lg relative overflow-hidden
                  ${colorClass}
                `}
                style={{
                  width: cellSize,
                  height: cellSize,
                  gridColumn: gridX + 1,
                  gridRow: gridY + 1,
                  boxShadow: `0 0 15px ${glowColor}, inset 0 0 10px rgba(255,255,255,0.2)`,
                  animation: 'drag-cell-sparkle 0.8s ease-in-out infinite',
                  animationDelay: `${idx * 0.1}s`,
                }}
              >
                {/* Inner gradient shine */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-black/20" />
                
                {/* Sparkle overlay */}
                <div 
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.5) 0%, transparent 50%)`,
                    animation: 'drag-sparkle-move 1.2s ease-in-out infinite',
                    animationDelay: `${idx * 0.15}s`,
                  }}
                />
                
                {/* Shimmer sweep */}
                <div 
                  className="absolute inset-0 overflow-hidden"
                >
                  <div 
                    className="absolute w-full h-full"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                      animation: 'drag-shimmer-sweep 1.5s ease-in-out infinite',
                      animationDelay: `${idx * 0.1}s`,
                    }}
                  />
                </div>
                
                {/* Scan lines for cyberpunk effect */}
                <div 
                  className="absolute inset-0 opacity-30"
                  style={{
                    background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
                  }}
                />
                
                {/* Pulsing border glow */}
                <div 
                  className="absolute inset-0 rounded-md sm:rounded-lg"
                  style={{
                    border: `2px solid ${glowColor}`,
                    animation: 'drag-border-pulse 0.8s ease-in-out infinite',
                    animationDelay: `${idx * 0.1}s`,
                  }}
                />
              </div>
            );
          })}
        </div>
        
        {/* Status label */}
        <div 
          className={`
            absolute left-1/2 -translate-x-1/2 -bottom-8
            px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider
            whitespace-nowrap
            ${validDrop 
              ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-[0_0_20px_rgba(34,211,238,0.6)]' 
              : 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]'
            }
          `}
        >
          {validDrop ? '✓ DROP HERE' : '✕ INVALID'}
        </div>
      </div>
      
      {/* Animation keyframes */}
      <style>{`
        @keyframes drag-radiate-glow {
          0%, 100% {
            opacity: 0.8;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
        }
        
        @keyframes drag-cell-sparkle {
          0%, 100% {
            filter: brightness(1);
          }
          50% {
            filter: brightness(1.3);
          }
        }
        
        @keyframes drag-sparkle-move {
          0% {
            transform: translate(-20%, -20%) rotate(0deg);
            opacity: 0.3;
          }
          50% {
            transform: translate(20%, 20%) rotate(180deg);
            opacity: 0.6;
          }
          100% {
            transform: translate(-20%, -20%) rotate(360deg);
            opacity: 0.3;
          }
        }
        
        @keyframes drag-shimmer-sweep {
          0% {
            transform: translateX(-100%);
          }
          50%, 100% {
            transform: translateX(100%);
          }
        }
        
        @keyframes drag-border-pulse {
          0%, 100% {
            opacity: 0.6;
            box-shadow: inset 0 0 5px currentColor;
          }
          50% {
            opacity: 1;
            box-shadow: inset 0 0 15px currentColor;
          }
        }
      `}</style>
    </>
  );
});

DragOverlay.displayName = 'DragOverlay';

export default DragOverlay;
