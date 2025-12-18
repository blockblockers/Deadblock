import { useState, useEffect, useCallback, forwardRef } from 'react';
import PropTypes from 'prop-types';
import { pieceColors } from '../utils/pieces';
import { getPieceCoords, canPlacePiece, BOARD_SIZE } from '../utils/gameLogic';
import { GamePropTypes, CallbackPropTypes } from '../utils/propTypes';

// Animation types for ambient effects
const AMBIENT_EFFECTS = ['shimmer', 'edgeGlow', 'trace', 'breathe'];

/**
 * GameBoard Component - Enhanced with cyberpunk styling and visible ghost pieces
 */
const GameBoard = forwardRef(({ 
  board, 
  boardPieces = {}, 
  pendingMove, 
  rotation = 0, 
  flipped = false,
  gameOver = false,
  gameMode,
  currentPlayer = 1,
  onCellClick,
  onStartDragFromBoard,
  aiAnimatingMove,
  playerAnimatingMove,
  selectedPiece,
  customColors,
}, ref) => {
  // Track active ambient animations per cell
  const [activeEffects, setActiveEffects] = useState({});
  
  // Get list of placed piece cells
  const getPlacedCells = useCallback(() => {
    const cells = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const pieceName = Array.isArray(boardPieces) 
          ? boardPieces[row]?.[col] 
          : boardPieces[`${row},${col}`];
        if (board[row]?.[col] !== null && pieceName) {
          cells.push(`${row},${col}`);
        }
      }
    }
    return cells;
  }, [board, boardPieces]);
  
  // Randomly trigger ambient effects on placed pieces
  useEffect(() => {
    const triggerRandomEffect = () => {
      const placedCells = getPlacedCells();
      if (placedCells.length === 0) return;
      
      if (Math.random() < 0.25) {
        const randomCell = placedCells[Math.floor(Math.random() * placedCells.length)];
        const randomEffect = AMBIENT_EFFECTS[Math.floor(Math.random() * AMBIENT_EFFECTS.length)];
        
        setActiveEffects(prev => ({ ...prev, [randomCell]: randomEffect }));
        
        const duration = randomEffect === 'trace' ? 2000 : randomEffect === 'breathe' ? 1500 : 800;
        setTimeout(() => {
          setActiveEffects(prev => {
            const next = { ...prev };
            if (next[randomCell] === randomEffect) {
              delete next[randomCell];
            }
            return next;
          });
        }, duration);
      }
    };
    
    const interval = setInterval(triggerRandomEffect, 2000);
    const initialTimeout = setTimeout(triggerRandomEffect, 1000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, [getPlacedCells]);
  
  // Ensure board is valid
  const safeBoard = Array.isArray(board) && board.length === BOARD_SIZE 
    ? board.map(row => Array.isArray(row) ? row : Array(BOARD_SIZE).fill(null))
    : Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  
  const safeBoardPieces = boardPieces || {};
  
  // Helper to get piece name
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

  // Calculate pending piece cells
  let pendingCells = [];
  let outOfBoundsCells = [];
  let overlappingCells = [];
  let isPendingValid = false;
  
  const pendingPieceName = pendingMove?.piece || selectedPiece;
  const pendingPieceColor = pendingPieceName ? pieceColors[pendingPieceName] : null;
  
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

  // AI animating cells
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

  // Player animating cells
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

  // Cell dimensions
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const cellSize = isMobile ? 36 : 48;
  const gapSize = isMobile ? 2 : 4;
  const padding = 8;

  return (
    <div className="relative inline-block mx-auto touch-none" ref={ref}>
      {/* Main board with cyberpunk frame */}
      <div className="relative inline-grid gap-0.5 sm:gap-1 bg-slate-950 p-2 rounded-xl shadow-[0_0_40px_rgba(34,211,238,0.25),0_0_80px_rgba(34,211,238,0.1),inset_0_0_40px_rgba(0,0,0,0.6)] border border-cyan-500/40">
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400/60 rounded-tl-xl" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400/60 rounded-tr-xl" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400/60 rounded-bl-xl" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400/60 rounded-br-xl" />
        
        {/* Subtle background grid pattern */}
        <div className="absolute inset-2 opacity-5 pointer-events-none bg-[repeating-linear-gradient(0deg,rgba(34,211,238,0.3),rgba(34,211,238,0.3)_1px,transparent_1px,transparent_8px),repeating-linear-gradient(90deg,rgba(34,211,238,0.3),rgba(34,211,238,0.3)_1px,transparent_1px,transparent_8px)]" />
        
        {safeBoard.map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-0.5 sm:gap-1">
            {(row || []).map((cell, colIdx) => {
              const pieceName = getPieceName(rowIdx, colIdx);
              const isInBoundsPendingCell = pendingCells.some(c => c.row === rowIdx && c.col === colIdx);
              const isOverlappingCell = overlappingCells.some(c => c.row === rowIdx && c.col === colIdx);
              const hasOutOfBounds = outOfBoundsCells.length > 0;
              const isAiAnimatingCell = aiAnimatingCells.some(c => c.row === rowIdx && c.col === colIdx);
              const isPlayerAnimatingCell = playerAnimatingCells.some(c => c.row === rowIdx && c.col === colIdx);
              
              // Determine background color
              let bgClass;
              let extraClass = '';
              
              if (isAiAnimatingCell) {
                bgClass = pieceColors[aiAnimatingMove.piece];
                extraClass = 'animate-ai-place';
              } else if (isPlayerAnimatingCell) {
                bgClass = pieceColors[playerAnimatingMove.piece];
                extraClass = 'animate-player-place';
              } else if (isOverlappingCell) {
                // Overlapping - show existing piece with striped overlay
                bgClass = pieceColors[pieceName];
              } else if (isInBoundsPendingCell) {
                if (hasOutOfBounds || !isPendingValid) {
                  // Invalid placement - show piece color but dimmed
                  bgClass = `${pendingPieceColor} opacity-70`;
                } else {
                  // Valid placement - show piece color with glow
                  bgClass = pendingPieceColor;
                }
              } else if (cell !== null && pieceName) {
                bgClass = pieceColors[pieceName];
              } else {
                bgClass = 'bg-slate-800/80 hover:bg-slate-700/80 border border-cyan-500/30 shadow-[inset_0_0_15px_rgba(0,0,0,0.6),inset_0_0_2px_rgba(34,211,238,0.1)]';
              }
              
              // Determine ring/glow style
              let ringClass = '';
              if (isAiAnimatingCell) {
                ringClass = 'ring-2 ring-purple-300 shadow-[0_0_30px_rgba(168,85,247,1),0_0_60px_rgba(168,85,247,0.6)]';
              } else if (isPlayerAnimatingCell) {
                ringClass = 'ring-2 ring-cyan-300 shadow-[0_0_30px_rgba(34,211,238,1),0_0_60px_rgba(34,211,238,0.6)]';
              } else if (isOverlappingCell) {
                // EXTREMELY VISIBLE overlap indicator - bright red with thick dashed border
                ringClass = 'ring-4 ring-red-500 shadow-[0_0_40px_rgba(239,68,68,1),0_0_60px_rgba(239,68,68,0.8)]';
              } else if (isInBoundsPendingCell) {
                if (hasOutOfBounds || !isPendingValid) {
                  // Invalid - orange warning
                  ringClass = 'ring-3 ring-orange-400 shadow-[0_0_25px_rgba(251,146,60,0.8)]';
                } else {
                  // VALID - bright green pulse animation
                  ringClass = 'ring-3 ring-green-400 shadow-[0_0_30px_rgba(74,222,128,1),0_0_50px_rgba(74,222,128,0.6)] animate-valid-pulse';
                }
              }
              
              const isPlacedPiece = cell !== null && pieceName && !isInBoundsPendingCell && !isAiAnimatingCell && !isPlayerAnimatingCell && !isOverlappingCell;
              const cellKey = `${rowIdx},${colIdx}`;
              const activeEffect = isPlacedPiece ? activeEffects[cellKey] : null;
              
              // Create touch/mouse handlers for pending cells (to allow drag repositioning)
              const pendingDragHandlers = (isInBoundsPendingCell && onStartDragFromBoard && pendingMove) ? {
                onTouchStart: (e) => {
                  const touch = e.touches[0];
                  const rect = e.currentTarget.getBoundingClientRect();
                  onStartDragFromBoard(pendingMove.piece, touch.clientX, touch.clientY, rect);
                },
                onMouseDown: (e) => {
                  if (e.button !== 0) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  onStartDragFromBoard(pendingMove.piece, e.clientX, e.clientY, rect);
                },
              } : {};
              
              return (
                <button
                  key={colIdx}
                  onClick={() => !isInBoundsPendingCell && onCellClick(rowIdx, colIdx)}
                  {...pendingDragHandlers}
                  className={`w-9 h-9 sm:w-12 sm:h-12 rounded-lg transition-all relative overflow-hidden ${bgClass} ${ringClass} ${extraClass} ${activeEffect === 'breathe' ? 'animate-random-breathe' : ''} ${isInBoundsPendingCell ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  disabled={isDisabled}
                >
                  {/* AI placing effect */}
                  {isAiAnimatingCell && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-0 animate-ai-burst bg-gradient-radial from-white/60 via-purple-400/30 to-transparent" />
                      <div className="absolute inset-0 opacity-40 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(168,85,247,0.3)_2px,rgba(168,85,247,0.3)_4px)] animate-ai-scan" />
                      <div className="absolute top-0 left-0 w-2 h-2 bg-white rounded-full animate-ai-spark" style={{ animationDelay: '0ms' }} />
                      <div className="absolute top-0 right-0 w-2 h-2 bg-white rounded-full animate-ai-spark" style={{ animationDelay: '100ms' }} />
                      <div className="absolute bottom-0 left-0 w-2 h-2 bg-white rounded-full animate-ai-spark" style={{ animationDelay: '200ms' }} />
                      <div className="absolute bottom-0 right-0 w-2 h-2 bg-white rounded-full animate-ai-spark" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                  
                  {/* Player placing effect */}
                  {isPlayerAnimatingCell && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-0 animate-player-ripple-1 rounded-lg border-2 border-cyan-400/80" />
                      <div className="absolute inset-0 animate-player-ripple-2 rounded-lg border-2 border-green-400/60" />
                      <div className="absolute inset-0 animate-player-glow bg-gradient-radial from-cyan-400/40 via-green-400/20 to-transparent" />
                    </div>
                  )}
                  
                  {/* OVERLAP INDICATOR - Very visible striped pattern */}
                  {isOverlappingCell && (
                    <div className="absolute inset-0 pointer-events-none z-20">
                      <div 
                        className="absolute inset-0 animate-overlap-flash"
                        style={{
                          background: 'repeating-linear-gradient(45deg, rgba(239,68,68,0.7), rgba(239,68,68,0.7) 4px, rgba(0,0,0,0.8) 4px, rgba(0,0,0,0.8) 8px)',
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-6 h-6 text-white drop-shadow-[0_0_8px_rgba(239,68,68,1)] animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    </div>
                  )}
                  
                  {/* Valid placement glow overlay */}
                  {isInBoundsPendingCell && isPendingValid && !isOverlappingCell && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-0 animate-valid-glow rounded-lg" 
                        style={{ boxShadow: 'inset 0 0 15px rgba(74,222,128,0.5)' }} 
                      />
                    </div>
                  )}
                  
                  {/* Invalid placement warning overlay (but in bounds) */}
                  {isInBoundsPendingCell && !isPendingValid && !isOverlappingCell && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-0 bg-orange-500/20 animate-pulse rounded-lg" />
                    </div>
                  )}
                  
                  {/* Ambient effects for placed pieces */}
                  {isPlacedPiece && activeEffect && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-md">
                      {activeEffect === 'shimmer' && (
                        <div 
                          className="absolute inset-0 animate-random-shimmer"
                          style={{
                            background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%)',
                            backgroundSize: '300% 300%',
                          }}
                        />
                      )}
                      {activeEffect === 'edgeGlow' && (
                        <div 
                          className="absolute inset-0 rounded-md animate-random-edge-glow"
                          style={{ boxShadow: 'inset 0 0 12px rgba(255,255,255,0.3), inset 0 0 4px rgba(34,211,238,0.2)' }}
                        />
                      )}
                      {activeEffect === 'trace' && (
                        <div className="absolute inset-0">
                          <div 
                            className="absolute animate-random-trace"
                            style={{
                              width: '4px',
                              height: '4px',
                              background: 'radial-gradient(circle, rgba(34,211,238,0.9) 0%, rgba(255,255,255,0.6) 40%, transparent 70%)',
                              boxShadow: '0 0 6px rgba(34,211,238,0.8)',
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Out-of-bounds ghost cells - VERY VISIBLE */}
      {outOfBoundsCells.map(({ row, col }, idx) => {
        const left = padding + col * (cellSize + gapSize);
        const top = padding + row * (cellSize + gapSize);
        
        return (
          <div
            key={`ghost-${idx}`}
            className="absolute pointer-events-none z-30"
            style={{
              left: `${left}px`,
              top: `${top}px`,
              width: `${cellSize}px`,
              height: `${cellSize}px`,
            }}
          >
            <div className="w-full h-full rounded-lg bg-red-500/50 border-3 border-dashed border-red-400 shadow-[0_0_25px_rgba(239,68,68,0.9),0_0_50px_rgba(239,68,68,0.5)] animate-out-of-bounds flex items-center justify-center backdrop-blur-sm">
              <svg 
                className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-[0_0_6px_rgba(239,68,68,1)]" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        );
      })}

      {/* Warning message removed - error now shows in GameScreen via errorMessage prop */}

      {/* Animation styles */}
      <style>{`
        /* Valid piece pulse */
        @keyframes valid-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(74,222,128,0.8), 0 0 40px rgba(74,222,128,0.4); }
          50% { box-shadow: 0 0 35px rgba(74,222,128,1), 0 0 60px rgba(74,222,128,0.6); }
        }
        .animate-valid-pulse { animation: valid-pulse 0.8s ease-in-out infinite; }
        
        @keyframes valid-glow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .animate-valid-glow { animation: valid-glow 0.6s ease-in-out infinite; }
        
        /* Overlap flash */
        @keyframes overlap-flash {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        .animate-overlap-flash { animation: overlap-flash 0.3s ease-in-out infinite; }
        
        /* Out of bounds animation */
        @keyframes out-of-bounds {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        .animate-out-of-bounds { animation: out-of-bounds 0.5s ease-in-out infinite; }
        
        /* AI animations */
        @keyframes ai-place {
          0% { transform: scale(0) rotate(-15deg); opacity: 0; filter: brightness(3); }
          15% { transform: scale(1.3) rotate(8deg); opacity: 1; filter: brightness(2.5); }
          30% { transform: scale(0.85) rotate(-5deg); filter: brightness(2); }
          45% { transform: scale(1.15) rotate(3deg); filter: brightness(1.5); }
          60% { transform: scale(0.95) rotate(-2deg); filter: brightness(1.3); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; filter: brightness(1); }
        }
        .animate-ai-place { animation: ai-place 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        
        @keyframes ai-burst {
          0% { transform: scale(0); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.6; }
          100% { transform: scale(2); opacity: 0; }
        }
        .animate-ai-burst { animation: ai-burst 0.5s ease-out forwards; }
        
        @keyframes ai-scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .animate-ai-scan { animation: ai-scan 0.4s linear; }
        
        @keyframes ai-spark {
          0% { transform: scale(0); opacity: 1; }
          50% { transform: scale(1.5); opacity: 1; }
          100% { transform: scale(0); opacity: 0; }
        }
        .animate-ai-spark { animation: ai-spark 0.4s ease-out forwards; }
        
        /* Player animations */
        @keyframes player-place {
          0% { transform: scale(1.2); opacity: 0; }
          50% { transform: scale(0.95); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-player-place { animation: player-place 0.4s ease-out forwards; }
        
        @keyframes player-ripple-1 {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(1.3); opacity: 0; }
        }
        .animate-player-ripple-1 { animation: player-ripple-1 0.6s ease-out forwards; }
        
        @keyframes player-ripple-2 {
          0% { transform: scale(0.9); opacity: 0.8; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        .animate-player-ripple-2 { animation: player-ripple-2 0.7s ease-out forwards; }
        
        @keyframes player-glow {
          0% { opacity: 0.8; }
          100% { opacity: 0; }
        }
        .animate-player-glow { animation: player-glow 0.5s ease-out forwards; }
        
        /* Ambient effects */
        @keyframes random-shimmer {
          0% { opacity: 0; background-position: 150% 150%; }
          20%, 80% { opacity: 1; }
          100% { opacity: 0; background-position: -50% -50%; }
        }
        .animate-random-shimmer { animation: random-shimmer 0.8s ease-in-out forwards; }
        
        @keyframes random-edge-glow {
          0%, 100% { opacity: 0; }
          30%, 70% { opacity: 1; }
        }
        .animate-random-edge-glow { animation: random-edge-glow 0.8s ease-in-out forwards; }
        
        @keyframes random-trace {
          0% { opacity: 0; top: 0; left: 0; }
          5%, 95% { opacity: 1; }
          25% { top: 0; left: calc(100% - 4px); }
          50% { top: calc(100% - 4px); left: calc(100% - 4px); }
          75% { top: calc(100% - 4px); left: 0; }
          100% { opacity: 0; top: 0; left: 0; }
        }
        .animate-random-trace { animation: random-trace 2s linear forwards; }
        
        @keyframes random-breathe {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.02); filter: brightness(1.15); }
        }
        .animate-random-breathe { animation: random-breathe 1.5s ease-in-out; }
        
        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-from), var(--tw-gradient-via), var(--tw-gradient-to));
        }
      `}</style>
    </div>
  );
});

GameBoard.displayName = 'GameBoard';

GameBoard.propTypes = {
  board: GamePropTypes.board.isRequired,
  boardPieces: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  pendingMove: GamePropTypes.pendingMove,
  rotation: PropTypes.number,
  flipped: PropTypes.bool,
  gameOver: PropTypes.bool,
  gameMode: PropTypes.string,
  currentPlayer: PropTypes.number,
  onCellClick: CallbackPropTypes.onCellClick,
  aiAnimatingMove: PropTypes.object,
  playerAnimatingMove: PropTypes.object,
  selectedPiece: PropTypes.string,
  customColors: PropTypes.object,
};

export default GameBoard;
