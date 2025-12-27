// GameBoard.jsx - Main game board component
// ENHANCED: Much more visible piece placement with strong glow and pulsing
// ENHANCED: Overlapping pieces now have very obvious warning indicators
// ENHANCED: Placed pieces have ambient glow and animation effects
// ENHANCED: Ghost cells (out of bounds) are more visible
import { forwardRef, useMemo, useState, useEffect } from 'react';
import { getPieceCoords, canPlacePiece, BOARD_SIZE } from '../utils/gameLogic';
import { pieceColors } from '../utils/pieces';

/**
 * GameBoard Component
 * 
 * Renders the 8x8 game grid with placed pieces and pending move preview.
 * Handles cell clicks and displays game state including valid/invalid move indicators.
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
  
  // Random ambient effects for placed pieces
  const [ambientEffects, setAmbientEffects] = useState({});
  
  useEffect(() => {
    // Generate random ambient effects for placed pieces
    const effects = {};
    const effectTypes = ['shimmer', 'pulse', 'glow', 'none', 'none']; // 40% chance of effect
    
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (safeBoard[row]?.[col]) {
          const rand = Math.random();
          effects[`${row},${col}`] = effectTypes[Math.floor(rand * effectTypes.length)];
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

  // Calculate AI animating piece cells
  let aiAnimatingCells = [];
  if (aiAnimatingMove) {
    const pieceCoords = getPieceCoords(aiAnimatingMove.piece, aiAnimatingMove.rotation || aiAnimatingMove.rot, aiAnimatingMove.flipped || aiAnimatingMove.flip);
    pieceCoords.forEach(([dx, dy]) => {
      const cellRow = aiAnimatingMove.row + dy;
      const cellCol = aiAnimatingMove.col + dx;
      if (cellRow >= 0 && cellRow < BOARD_SIZE && cellCol >= 0 && cellCol < BOARD_SIZE) {
        aiAnimatingCells.push({ row: cellRow, col: cellCol });
      }
    });
  }

  // Calculate player animating piece cells
  let playerAnimatingCells = [];
  if (playerAnimatingMove) {
    const pieceCoords = getPieceCoords(playerAnimatingMove.piece, playerAnimatingMove.rotation || playerAnimatingMove.rot, playerAnimatingMove.flipped || playerAnimatingMove.flip);
    pieceCoords.forEach(([dx, dy]) => {
      const cellRow = playerAnimatingMove.row + dy;
      const cellCol = playerAnimatingMove.col + dx;
      if (cellRow >= 0 && cellRow < BOARD_SIZE && cellCol >= 0 && cellCol < BOARD_SIZE) {
        playerAnimatingCells.push({ row: cellRow, col: cellCol });
      }
    });
  }

  // Cell dimensions for positioning ghost cells
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const cellSize = isMobile ? 36 : 48;
  const gapSize = isMobile ? 2 : 4;
  const padding = isMobile ? 4 : 6;

  // Get cell colors based on player and custom colors
  const getPlayerColor = (player) => {
    if (customColors && customColors[player]) {
      return customColors[player];
    }
    return player === 1 
      ? 'bg-gradient-to-br from-cyan-400 to-blue-500' 
      : 'bg-gradient-to-br from-pink-400 to-rose-500';
  };

  return (
    <div 
      ref={ref}
      className="relative"
      style={{ 
        overflow: 'visible',
        zIndex: 1,
      }}
    >
      {/* Main grid */}
      <div 
        className="grid grid-cols-8 gap-0.5 sm:gap-1 bg-slate-800/50 p-1 sm:p-1.5 rounded-lg border border-cyan-500/20"
        style={{ overflow: 'visible' }}
      >
        {safeBoard.map((row, rowIdx) =>
          row.map((cell, colIdx) => {
            const isPending = pendingCells.some(p => p.row === rowIdx && p.col === colIdx);
            const isOverlapping = overlappingCells.some(p => p.row === rowIdx && p.col === colIdx);
            const isAiAnimating = aiAnimatingCells.some(c => c.row === rowIdx && c.col === colIdx);
            const isPlayerAnimating = playerAnimatingCells.some(c => c.row === rowIdx && c.col === colIdx);
            const pieceName = getPieceName(rowIdx, colIdx);
            const pieceColor = pieceName ? pieceColors[pieceName] : null;
            const ambientEffect = ambientEffects[`${rowIdx},${colIdx}`];
            const isPlacedPiece = cell !== null && cell !== 0 && cell !== undefined;
            
            return (
              <button
                key={`${rowIdx}-${colIdx}`}
                className={`
                  w-9 h-9 sm:w-12 sm:h-12 rounded-md sm:rounded-lg relative
                  transition-all duration-150 overflow-hidden
                  ${cell 
                    ? `${pieceColor || getPlayerColor(cell)} shadow-lg` 
                    : 'bg-slate-700/50 hover:bg-slate-600/50'
                  }
                  ${isPending && isPendingValid ? 'pending-valid-cell' : ''}
                  ${isPending && !isPendingValid ? 'pending-invalid-cell' : ''}
                  ${isOverlapping ? 'overlap-cell' : ''}
                  ${isAiAnimating ? 'ai-placing-cell' : ''}
                  ${isPlayerAnimating ? 'player-placing-cell' : ''}
                  ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                `}
                onClick={() => !isDisabled && onCellClick(rowIdx, colIdx)}
                disabled={isDisabled}
              >
                {/* ENHANCED: Placed piece glow effect */}
                {isPlacedPiece && (
                  <>
                    {/* Base glow */}
                    <div className="absolute inset-0 opacity-60 bg-gradient-to-br from-white/20 via-transparent to-black/20" />
                    {/* Scan line effect */}
                    <div className="absolute inset-0 opacity-30 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.1)_2px,rgba(255,255,255,0.1)_4px)]" />
                    {/* Ambient shimmer effect */}
                    {ambientEffect === 'shimmer' && (
                      <div className="absolute inset-0 ambient-shimmer" />
                    )}
                    {/* Ambient pulse effect */}
                    {ambientEffect === 'pulse' && (
                      <div className="absolute inset-0 ambient-pulse" />
                    )}
                    {/* Ambient glow effect */}
                    {ambientEffect === 'glow' && (
                      <div className="absolute inset-0 ambient-glow" />
                    )}
                  </>
                )}
                
                {/* AI placing animation - ENHANCED */}
                {isAiAnimating && (
                  <div className="absolute inset-0 bg-purple-400/60 animate-pulse">
                    <div className="absolute inset-0 ai-drop-effect" />
                  </div>
                )}
                
                {/* Player placing animation - ENHANCED */}
                {isPlayerAnimating && (
                  <div className="absolute inset-0 bg-cyan-400/60 animate-pulse">
                    <div className="absolute inset-0 player-drop-effect" />
                  </div>
                )}
                
                {/* ENHANCED: Pending valid indicator with STRONG glow */}
                {isPending && isPendingValid && (
                  <div className="absolute inset-0 pending-valid-glow" />
                )}
                
                {/* ENHANCED: Pending invalid indicator */}
                {isPending && !isPendingValid && (
                  <div className="absolute inset-0 pending-invalid-glow" />
                )}
                
                {/* ENHANCED: Overlap indicator - very obvious */}
                {isOverlapping && (
                  <div className="absolute inset-0 overlap-warning">
                    {/* X pattern */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-white font-black text-lg drop-shadow-lg">✕</div>
                    </div>
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* ENHANCED: Ghost cells for out-of-bounds positions */}
      {outOfBoundsCells.length > 0 && pendingMove && (
        <div className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible', zIndex: 100 }}>
          {outOfBoundsCells.map((cell, idx) => {
            const refCell = pendingCells[0] || { row: pendingMove.row, col: pendingMove.col };
            const offsetRow = cell.row - refCell.row;
            const offsetCol = cell.col - refCell.col;
            
            const top = (refCell.row + offsetRow) * (cellSize + gapSize) + padding;
            const left = (refCell.col + offsetCol) * (cellSize + gapSize) + padding;
            
            return (
              <div
                key={`ghost-${idx}`}
                className="absolute rounded-md sm:rounded-lg ghost-cell-warning"
                style={{
                  width: cellSize,
                  height: cellSize,
                  top: `${top}px`,
                  left: `${left}px`,
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-red-400 font-black text-xs">OUT</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full board outline when piece is active */}
      {pendingMove && (
        <div 
          className={`absolute inset-0 pointer-events-none rounded-lg transition-all ${
            isPendingValid 
              ? 'ring-2 ring-cyan-400/60 shadow-[0_0_30px_rgba(34,211,238,0.4)]'
              : 'ring-2 ring-red-500/60 shadow-[0_0_30px_rgba(239,68,68,0.5)]'
          }`}
          style={{ margin: '-2px' }}
        />
      )}

      {/* ENHANCED Animation styles */}
      <style>{`
        /* ============================================
           PENDING PIECE - VALID PLACEMENT
           Very obvious green/cyan glow
           ============================================ */
        .pending-valid-cell {
          box-shadow: 
            0 0 20px rgba(34, 211, 238, 0.8),
            0 0 40px rgba(34, 211, 238, 0.4),
            inset 0 0 15px rgba(34, 211, 238, 0.5) !important;
          border: 3px solid rgba(34, 211, 238, 0.9) !important;
        }
        
        .pending-valid-glow {
          background: linear-gradient(135deg, rgba(34, 211, 238, 0.6) 0%, rgba(74, 222, 128, 0.4) 100%);
          animation: valid-pulse 0.8s ease-in-out infinite;
        }
        
        @keyframes valid-pulse {
          0%, 100% { 
            opacity: 0.5;
            box-shadow: inset 0 0 20px rgba(34, 211, 238, 0.6);
          }
          50% { 
            opacity: 0.8;
            box-shadow: inset 0 0 30px rgba(34, 211, 238, 0.9);
          }
        }
        
        /* ============================================
           PENDING PIECE - INVALID PLACEMENT
           Obvious red warning
           ============================================ */
        .pending-invalid-cell {
          box-shadow: 
            0 0 15px rgba(239, 68, 68, 0.7),
            0 0 30px rgba(239, 68, 68, 0.3),
            inset 0 0 10px rgba(239, 68, 68, 0.4) !important;
          border: 3px solid rgba(239, 68, 68, 0.8) !important;
        }
        
        .pending-invalid-glow {
          background: rgba(239, 68, 68, 0.4);
          animation: invalid-pulse 0.4s ease-in-out infinite;
        }
        
        @keyframes invalid-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        
        /* ============================================
           OVERLAPPING CELLS - VERY OBVIOUS WARNING
           ============================================ */
        .overlap-cell {
          box-shadow: 
            0 0 20px rgba(239, 68, 68, 1),
            0 0 40px rgba(239, 68, 68, 0.6),
            inset 0 0 20px rgba(239, 68, 68, 0.8) !important;
          border: 4px solid rgba(255, 100, 100, 1) !important;
        }
        
        .overlap-warning {
          background: repeating-linear-gradient(
            45deg,
            rgba(239, 68, 68, 0.7),
            rgba(239, 68, 68, 0.7) 4px,
            rgba(255, 150, 150, 0.7) 4px,
            rgba(255, 150, 150, 0.7) 8px
          );
          animation: overlap-flash 0.3s ease-in-out infinite;
        }
        
        @keyframes overlap-flash {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        
        /* ============================================
           GHOST CELLS (OUT OF BOUNDS)
           ============================================ */
        .ghost-cell-warning {
          background: rgba(239, 68, 68, 0.3);
          border: 3px dashed rgba(239, 68, 68, 0.9);
          animation: ghost-pulse 0.6s ease-in-out infinite;
        }
        
        @keyframes ghost-pulse {
          0%, 100% { 
            border-color: rgba(239, 68, 68, 0.9);
            background: rgba(239, 68, 68, 0.3);
          }
          50% { 
            border-color: rgba(255, 100, 100, 1);
            background: rgba(239, 68, 68, 0.5);
          }
        }
        
        /* ============================================
           AI PLACING ANIMATION
           ============================================ */
        .ai-placing-cell {
          box-shadow: 
            0 0 25px rgba(168, 85, 247, 0.9),
            0 0 50px rgba(168, 85, 247, 0.5) !important;
          border: 3px solid rgba(168, 85, 247, 0.9) !important;
        }
        
        .ai-drop-effect {
          background: radial-gradient(circle, rgba(168, 85, 247, 0.8) 0%, transparent 70%);
          animation: ai-drop 0.4s ease-out;
        }
        
        @keyframes ai-drop {
          0% { transform: scale(2); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        /* ============================================
           PLAYER PLACING ANIMATION
           ============================================ */
        .player-placing-cell {
          box-shadow: 
            0 0 25px rgba(34, 211, 238, 0.9),
            0 0 50px rgba(34, 211, 238, 0.5) !important;
          border: 3px solid rgba(34, 211, 238, 0.9) !important;
        }
        
        .player-drop-effect {
          background: radial-gradient(circle, rgba(34, 211, 238, 0.8) 0%, transparent 70%);
          animation: player-drop 0.4s ease-out;
        }
        
        @keyframes player-drop {
          0% { transform: scale(2); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        /* ============================================
           PLACED PIECE AMBIENT EFFECTS
           ============================================ */
        .ambient-shimmer {
          background: linear-gradient(
            115deg,
            transparent 20%,
            rgba(255, 255, 255, 0.3) 40%,
            rgba(255, 255, 255, 0.3) 60%,
            transparent 80%
          );
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }
        
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        
        .ambient-pulse {
          background: radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, transparent 70%);
          animation: ambient-pulse-anim 2s ease-in-out infinite;
        }
        
        @keyframes ambient-pulse-anim {
          0%, 100% { opacity: 0.3; transform: scale(0.9); }
          50% { opacity: 0.6; transform: scale(1); }
        }
        
        .ambient-glow {
          box-shadow: inset 0 0 15px rgba(255, 255, 255, 0.3);
          animation: ambient-glow-anim 2.5s ease-in-out infinite;
        }
        
        @keyframes ambient-glow-anim {
          0%, 100% { box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.2); }
          50% { box-shadow: inset 0 0 20px rgba(255, 255, 255, 0.4); }
        }
      `}</style>
    </div>
  );
});

GameBoard.displayName = 'GameBoard';

export default GameBoard;
