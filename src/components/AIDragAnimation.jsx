// AIDragAnimation.jsx - Visual drag animation showing AI piece moving from tray to board
// This component creates the illusion of the AI "dragging" a piece like a human player would
// 
// USAGE: Render this component when AI is making a move, before the piece is placed on the board
// The animation shows:
// 1. Piece "lifting" from the piece tray with a glow effect
// 2. Piece flying in an arc to the target position on the board
// 3. Piece "dropping" onto the board with impact effect
//
// Props:
// - piece: The piece name (e.g., 'T', 'L', 'I')
// - targetRow/targetCol: Where on the board the piece will be placed
// - rotation: Piece rotation (0, 1, 2, 3)
// - flipped: Whether piece is flipped
// - boardRef: Ref to the GameBoard element for position calculations
// - trayRef: Ref to the PieceTray element for position calculations
// - onAnimationStart: Called when animation begins
// - onAnimationComplete: Called when animation finishes (time to place piece)
// - duration: Animation duration in ms (default: 800)

import { useState, useEffect, useRef, memo } from 'react';
import { getPieceCoords } from '../utils/gameLogic';
import { pieceColors } from '../utils/pieces';

const AIDragAnimation = memo(({
  piece,
  targetRow,
  targetCol,
  rotation = 0,
  flipped = false,
  boardRef,
  trayRef,
  onAnimationStart,
  onAnimationComplete,
  duration = 800,
}) => {
  const [phase, setPhase] = useState('idle'); // 'idle' | 'lifting' | 'flying' | 'dropping' | 'complete'
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [endPos, setEndPos] = useState({ x: 0, y: 0 });
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);

  // Get piece coordinates
  const coords = getPieceCoords(piece, rotation, flipped);
  const colorClass = pieceColors[piece] || 'bg-gradient-to-br from-purple-400 to-violet-500';

  // Calculate piece bounds for rendering
  const minX = Math.min(...coords.map(([x]) => x));
  const maxX = Math.max(...coords.map(([x]) => x));
  const minY = Math.min(...coords.map(([, y]) => y));
  const maxY = Math.max(...coords.map(([, y]) => y));
  
  const cellSize = 28; // Size of each cell in the floating piece
  const gap = 2;

  // Calculate positions when component mounts or props change
  useEffect(() => {
    if (!piece) return;

    // Calculate start position (center of piece tray area)
    let startX = window.innerWidth / 2;
    let startY = window.innerHeight - 150; // Bottom area where tray typically is
    
    if (trayRef?.current) {
      const trayRect = trayRef.current.getBoundingClientRect();
      startX = trayRect.left + trayRect.width / 2;
      startY = trayRect.top + trayRect.height / 2;
    }

    // Calculate end position (target cell on board)
    let endX = window.innerWidth / 2;
    let endY = window.innerHeight / 2;
    
    if (boardRef?.current) {
      const boardRect = boardRef.current.getBoundingClientRect();
      const isMobile = window.innerWidth < 640;
      const boardCellSize = isMobile ? 36 : 48;
      const boardGap = isMobile ? 2 : 4;
      const boardPadding = isMobile ? 4 : 6;
      
      // Calculate center of the target cell area
      const pieceWidth = (maxX - minX + 1) * boardCellSize + (maxX - minX) * boardGap;
      const pieceHeight = (maxY - minY + 1) * boardCellSize + (maxY - minY) * boardGap;
      
      endX = boardRect.left + boardPadding + targetCol * (boardCellSize + boardGap) + pieceWidth / 2;
      endY = boardRect.top + boardPadding + targetRow * (boardCellSize + boardGap) + pieceHeight / 2;
    }

    setStartPos({ x: startX, y: startY });
    setEndPos({ x: endX, y: endY });
    setPosition({ x: startX, y: startY });
    
    // Start animation after a brief delay
    const timer = setTimeout(() => {
      setPhase('lifting');
      onAnimationStart?.();
    }, 100);

    return () => clearTimeout(timer);
  }, [piece, targetRow, targetCol, boardRef, trayRef, maxX, minX, maxY, minY, onAnimationStart]);

  // Handle animation phases
  useEffect(() => {
    if (phase === 'lifting') {
      // Brief lift animation
      const timer = setTimeout(() => {
        setPhase('flying');
        startTimeRef.current = performance.now();
      }, 150);
      return () => clearTimeout(timer);
    }
    
    if (phase === 'flying') {
      // Animate from start to end position
      const animate = (timestamp) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp;
        const elapsed = timestamp - startTimeRef.current;
        const progress = Math.min(elapsed / (duration - 300), 1); // Reserve time for drop
        
        // Easing function - ease out cubic for natural deceleration
        const eased = 1 - Math.pow(1 - progress, 3);
        
        // Calculate arc - piece lifts up in the middle of the flight
        const arcHeight = Math.sin(progress * Math.PI) * 80; // Max 80px lift
        
        const x = startPos.x + (endPos.x - startPos.x) * eased;
        const y = startPos.y + (endPos.y - startPos.y) * eased - arcHeight;
        
        setPosition({ x, y });
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setPhase('dropping');
        }
      };
      
      animationRef.current = requestAnimationFrame(animate);
      
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
    
    if (phase === 'dropping') {
      // Brief drop/impact animation
      const timer = setTimeout(() => {
        setPhase('complete');
        onAnimationComplete?.();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [phase, startPos, endPos, duration, onAnimationComplete]);

  // Don't render if no piece or animation complete
  if (!piece || phase === 'idle' || phase === 'complete') {
    return null;
  }

  // Calculate piece dimensions for rendering
  const pieceWidth = (maxX - minX + 1) * (cellSize + gap) - gap;
  const pieceHeight = (maxY - minY + 1) * (cellSize + gap) - gap;

  return (
    <>
      {/* Backdrop dim effect */}
      <div 
        className="fixed inset-0 pointer-events-none z-[9990]"
        style={{
          background: 'radial-gradient(circle at center, transparent 20%, rgba(0,0,0,0.3) 100%)',
          opacity: phase === 'flying' ? 1 : 0,
          transition: 'opacity 200ms',
        }}
      />

      {/* Trail effect during flight */}
      {phase === 'flying' && (
        <div 
          className="fixed pointer-events-none z-[9991]"
          style={{
            left: position.x,
            top: position.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {[0.7, 0.5, 0.3].map((opacity, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: -(endPos.x - startPos.x) * 0.05 * (i + 1),
                top: -(endPos.y - startPos.y) * 0.05 * (i + 1),
                opacity,
                transform: `scale(${1 - i * 0.15})`,
                filter: 'blur(4px)',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${maxX - minX + 1}, ${cellSize}px)`,
                  gap: `${gap}px`,
                }}
              >
                {coords.map(([x, y], idx) => (
                  <div
                    key={idx}
                    className={`rounded-md ${colorClass}`}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      gridColumn: x - minX + 1,
                      gridRow: y - minY + 1,
                      opacity: 0.5,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main floating piece - NO background container, just the blocks */}
      <div
        className="fixed pointer-events-none z-[9999]"
        style={{
          left: position.x,
          top: position.y,
          transform: `translate(-50%, -50%) ${
            phase === 'lifting' ? 'scale(1.15)' : 
            phase === 'dropping' ? 'scale(0.95)' : 
            'scale(1.05)'
          }`,
          transition: phase === 'flying' ? 'none' : 'transform 150ms ease-out',
        }}
      >
        {/* Piece grid - transparent, only blocks visible with glow */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${maxX - minX + 1}, ${cellSize}px)`,
            gap: `${gap}px`,
            filter: 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.6)) drop-shadow(0 0 40px rgba(168, 85, 247, 0.3))',
          }}
        >
          {coords.map(([x, y], idx) => (
            <div
              key={idx}
              className={`rounded-md sm:rounded-lg relative overflow-hidden ${colorClass}`}
              style={{
                width: cellSize,
                height: cellSize,
                gridColumn: x - minX + 1,
                gridRow: y - minY + 1,
                boxShadow: '0 0 15px rgba(168, 85, 247, 0.5), inset 0 0 8px rgba(255,255,255,0.2)',
                border: '2px solid rgba(168, 85, 247, 0.6)',
              }}
            >
              {/* Cell shine */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/35 via-transparent to-black/20" />
            </div>
          ))}
        </div>
      </div>

      {/* Impact effect at drop location */}
      {phase === 'dropping' && (
        <div 
          className="fixed pointer-events-none z-[9998]"
          style={{
            left: endPos.x,
            top: endPos.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div 
            className="w-32 h-32 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(168, 85, 247, 0.6) 0%, transparent 70%)',
              animation: 'ai-impact 300ms ease-out forwards',
            }}
          />
        </div>
      )}

      {/* Animation keyframes */}
      <style>{`
        @keyframes ai-glow-pulse {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        
        @keyframes ai-impact {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        }
      `}</style>
    </>
  );
});

AIDragAnimation.displayName = 'AIDragAnimation';

export default AIDragAnimation;
