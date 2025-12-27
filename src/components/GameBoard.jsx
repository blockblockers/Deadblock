// GameBoard.jsx - Main game board component
// UPDATED: Enhanced selected piece visibility with stronger glow
// UPDATED: Allow pieces to overflow on ALL sides (top, left, bottom, right)
// UPDATED: Ghost cells can now appear outside the grid in any direction
import { forwardRef, useMemo, useState, useEffect } from 'react';
import { getPieceCoords, canPlacePiece, BOARD_SIZE } from '../utils/gameLogic';
import { pieceColors } from '../utils/pieces';

/**
 * GameBoard Component
 * 
 * Renders the 8x8 game grid with placed pieces and pending move preview.
 * Handles cell clicks and displays game state including valid/invalid move indicators.
 * 
 * UPDATED: 
 * - Enhanced selected piece glow effect on the board
 * - Ghost cells can now overflow on ALL sides (top, left, bottom, right)
 * - Board container uses overflow-visible to show out-of-bounds pieces
 * - Ghost cells have high z-index to overlay any text
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
  onPendingPieceDragStart, // Optional: for drag from board
}, ref) => {
  // Ensure board is properly formatted
  const safeBoard = Array.isArray(board) 
    ? board.map(row => Array.isArray(row) ? row : Array(BOARD_SIZE).fill(null))
    : Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  
  const safeBoardPieces = boardPieces || {};
  
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
        // Track all out-of-bounds cells, including negative positions (top/left)
        outOfBoundsCells.push({ row: cellRow, col: cellCol });
      }
    });
    
    isPendingValid = outOfBoundsCells.length === 0 && overlappingCells.length === 0 &&
      canPlacePiece(safeBoard, pendingMove.row, pendingMove.col, pieceCoords);
  }

  // Calculate AI animating piece cells
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

  // Calculate player animating piece cells
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
    // UPDATED: Added overflow-visible and higher z-index for ghost cells
    <div 
      ref={ref}
      className="relative"
      style={{ 
        overflow: 'visible', // Allow ghost cells to render outside container
        zIndex: 1, // Base z-index for board
      }}
    >
      {/* Main grid */}
      <div 
        className="grid grid-cols-8 gap-0.5 sm:gap-1 bg-slate-800/50 p-1 sm:p-1.5 rounded-lg border border-cyan-500/20"
        style={{ overflow: 'visible' }} // Grid also allows overflow
      >
        {safeBoard.map((row, rowIdx) =>
          row.map((cell, colIdx) => {
            const isPending = pendingCells.some(p => p.row === rowIdx && p.col === colIdx);
            const isOverlapping = overlappingCells.some(p => p.row === rowIdx && p.col === colIdx);
            const isAiAnimating = aiAnimatingCells.some(c => c.row === rowIdx && c.col === colIdx);
            const isPlayerAnimating = playerAnimatingCells.some(c => c.row === rowIdx && c.col === colIdx);
            const pieceName = getPieceName(rowIdx, colIdx);
            const pieceColor = pieceName ? pieceColors[pieceName] : null;
            
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
                  ${isPending && isPendingValid ? 'pending-valid-cell ring-2 ring-cyan-400 bg-cyan-500/30' : ''}
                  ${isPending && !isPendingValid ? 'pending-invalid-cell ring-2 ring-red-500 bg-red-500/30' : ''}
                  ${isOverlapping ? 'overlap-cell ring-2 ring-red-500 bg-red-500/40' : ''}
                  ${isAiAnimating ? 'ai-placing-cell ring-2 ring-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.7)]' : ''}
                  ${isPlayerAnimating ? 'player-placing-cell ring-2 ring-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.7)]' : ''}
                  ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                `}
                onClick={() => !isDisabled && onCellClick(rowIdx, colIdx)}
                disabled={isDisabled}
              >
                {/* Scan line effect for placed pieces */}
                {cell && (
                  <div className="absolute inset-0 opacity-30 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.1)_2px,rgba(255,255,255,0.1)_4px)]" />
                )}
                
                {/* AI placing animation */}
                {isAiAnimating && (
                  <div className="absolute inset-0 bg-purple-400/50 animate-pulse" />
                )}
                
                {/* Player placing animation */}
                {isPlayerAnimating && (
                  <div className="absolute inset-0 bg-cyan-400/50 animate-pulse" />
                )}
                
                {/* ENHANCED: Pending valid indicator with stronger glow */}
                {isPending && isPendingValid && (
                  <div className="absolute inset-0 bg-cyan-400/50 valid-piece-glow shadow-[inset_0_0_15px_rgba(34,211,238,0.6)]" />
                )}
                
                {/* Pending invalid indicator */}
                {isPending && !isPendingValid && (
                  <div className="absolute inset-0 bg-red-500/40 invalid-piece-pulse" />
                )}
                
                {/* Overlap indicator */}
                {isOverlapping && (
                  <div className="absolute inset-0 bg-red-500/50 invalid-piece-pulse border-2 border-red-400/80 border-dashed" />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* UPDATED: Out-of-bounds ghost cells - now positioned for ALL sides including top/left */}
      {outOfBoundsCells.length > 0 && pendingMove && (
        <>
          {outOfBoundsCells.map(({ row, col }, idx) => {
            // Calculate position relative to board origin (0,0)
            // Negative rows/cols will have negative positions, showing above/left of grid
            const left = padding + col * (cellSize + gapSize);
            const top = padding + row * (cellSize + gapSize);
            
            return (
              <div
                key={`ghost-${idx}`}
                className="absolute pointer-events-none"
                style={{
                  left: `${left}px`,
                  top: `${top}px`,
                  width: `${cellSize}px`,
                  height: `${cellSize}px`,
                  zIndex: 100, // High z-index to overlay text above/left of board
                }}
              >
                <div className="w-full h-full rounded-lg bg-red-500/40 border-2 border-dashed border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.7)] ghost-cell-pulse flex items-center justify-center backdrop-blur-sm">
                  <svg 
                    className="w-4 h-4 sm:w-5 sm:h-5 text-red-300 drop-shadow-[0_0_4px_rgba(239,68,68,0.8)]" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ENHANCED: Full piece outline when piece is active - stronger glow */}
      {pendingMove && (
        <div 
          className={`absolute inset-0 pointer-events-none rounded-lg ${
            isPendingValid 
              ? 'ring-2 ring-cyan-400/70 shadow-[0_0_30px_rgba(34,211,238,0.5),0_0_60px_rgba(34,211,238,0.2)]'
              : 'ring-2 ring-red-500/70 shadow-[0_0_30px_rgba(239,68,68,0.5),0_0_60px_rgba(239,68,68,0.2)]'
          }`}
          style={{ margin: '-2px' }}
        />
      )}

      {/* Animation styles */}
      <style>{`
        /* ENHANCED: Valid piece glow animation - stronger effect */
        .valid-piece-glow {
          animation: valid-glow 1s ease-in-out infinite;
        }
        @keyframes valid-glow {
          0%, 100% { 
            opacity: 0.5; 
            box-shadow: inset 0 0 15px rgba(34,211,238,0.6), 0 0 10px rgba(34,211,238,0.4);
          }
          50% { 
            opacity: 0.8; 
            box-shadow: inset 0 0 25px rgba(34,211,238,0.8), 0 0 20px rgba(34,211,238,0.6);
          }
        }
        
        /* Invalid piece pulse animation */
        .invalid-piece-pulse {
          animation: invalid-pulse 0.5s ease-in-out infinite;
        }
        @keyframes invalid-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        
        /* Ghost cell out-of-bounds pulse */
        .ghost-cell-pulse {
          animation: ghost-pulse 0.8s ease-in-out infinite;
        }
        @keyframes ghost-pulse {
          0%, 100% { 
            border-color: rgba(239, 68, 68, 0.8);
            background-color: rgba(239, 68, 68, 0.3);
          }
          50% { 
            border-color: rgba(239, 68, 68, 1);
            background-color: rgba(239, 68, 68, 0.5);
          }
        }
        
        /* AI placing animation */
        @keyframes ai-place {
          0% {
            transform: scale(0.8);
            opacity: 0;
            filter: brightness(1.5) saturate(1.5);
          }
          50% {
            transform: scale(1.1);
            filter: brightness(1.3) saturate(1.3);
          }
          100% {
            transform: scale(1);
            opacity: 1;
            filter: brightness(1) saturate(1);
          }
        }
        .animate-ai-place {
          animation: ai-place 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        
        /* Player placing animation */
        @keyframes player-place {
          0% {
            transform: scale(0.8);
            opacity: 0;
            filter: brightness(1.5) saturate(1.5);
          }
          50% {
            transform: scale(1.1);
            filter: brightness(1.3) saturate(1.3);
          }
          100% {
            transform: scale(1);
            opacity: 1;
            filter: brightness(1) saturate(1);
          }
        }
        .animate-player-place {
          animation: player-place 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
    </div>
  );
});

GameBoard.displayName = 'GameBoard';

export default GameBoard;
