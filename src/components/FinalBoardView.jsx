import React, { useMemo } from 'react';
import { X, Trophy } from 'lucide-react';
import { PIECES, pieceColors } from '../utils/pieces';

/**
 * FinalBoardView - Shows the final state of a completed game
 * 
 * Features:
 * - Displays the final board with actual piece shapes
 * - Highlights the last move with a glowing border
 * - Shows winner/loser info
 * - Compact modal design
 */
const FinalBoardView = ({
  isOpen,
  onClose,
  board,              // 8x8 board array
  boardPieces = {},   // { 'r,c': { player, piece, rotation, flipped, moveNumber } }
  winner = null,      // 'player1' | 'player2' | null (draw)
  player1Name = 'Player 1',
  player2Name = 'Player 2',
  viewerIsPlayer1 = true,
  usedPieces = [],    // Array of { piece, row, col, player, moveNumber }
}) => {
  if (!isOpen) return null;

  const CELL_SIZE = 36;
  const BOARD_SIZE = 8;

  // Find the last move by looking at the highest move number in boardPieces
  const lastMove = useMemo(() => {
    let maxMoveNumber = -1;
    let lastPieceCells = [];
    
    // Check usedPieces first (preferred method)
    if (usedPieces && usedPieces.length > 0) {
      const lastPiece = usedPieces[usedPieces.length - 1];
      if (lastPiece) {
        const pieceShape = PIECES[lastPiece.piece];
        if (pieceShape) {
          // Apply rotation and flip to get actual cells
          let shape = pieceShape.map(([r, c]) => [r, c]);
          const rotation = lastPiece.rotation || 0;
          const flipped = lastPiece.flipped || false;
          
          // Apply rotation
          for (let i = 0; i < rotation; i++) {
            shape = shape.map(([r, c]) => [c, -r]);
          }
          
          // Apply flip
          if (flipped) {
            shape = shape.map(([r, c]) => [r, -c]);
          }
          
          // Normalize to start from 0,0
          const minR = Math.min(...shape.map(([r]) => r));
          const minC = Math.min(...shape.map(([, c]) => c));
          shape = shape.map(([r, c]) => [r - minR, c - minC]);
          
          // Calculate actual board positions
          lastPieceCells = shape.map(([r, c]) => ({
            row: lastPiece.row + r,
            col: lastPiece.col + c
          }));
        }
      }
    } else {
      // Fallback: look at boardPieces for highest move number
      Object.entries(boardPieces).forEach(([key, info]) => {
        if (info.moveNumber !== undefined && info.moveNumber > maxMoveNumber) {
          maxMoveNumber = info.moveNumber;
        }
      });
      
      if (maxMoveNumber >= 0) {
        Object.entries(boardPieces).forEach(([key, info]) => {
          if (info.moveNumber === maxMoveNumber) {
            const [row, col] = key.split(',').map(Number);
            lastPieceCells.push({ row, col });
          }
        });
      }
    }
    
    return lastPieceCells;
  }, [boardPieces, usedPieces]);

  // Check if a cell is part of the last move
  const isLastMoveCell = (row, col) => {
    return lastMove.some(cell => cell.row === row && cell.col === col);
  };

  // Get piece info for a cell
  const getPieceInfo = (row, col) => {
    const key = `${row},${col}`;
    return boardPieces[key] || null;
  };

  // Determine cell color and styling
  const getCellStyle = (row, col) => {
    const cellValue = board?.[row]?.[col];
    const pieceInfo = getPieceInfo(row, col);
    const isLastMove = isLastMoveCell(row, col);
    
    let bgColor = '';
    let borderColor = '';
    let boxShadow = '';
    
    if (cellValue === 1) {
      bgColor = pieceInfo?.piece ? pieceColors[pieceInfo.piece] : 'rgb(6, 182, 212)';
      if (isLastMove) {
        borderColor = '2px solid rgba(255, 255, 255, 0.8)';
        boxShadow = '0 0 12px rgba(6, 182, 212, 0.8), inset 0 0 8px rgba(255, 255, 255, 0.3)';
      }
    } else if (cellValue === 2) {
      bgColor = pieceInfo?.piece ? pieceColors[pieceInfo.piece] : 'rgb(244, 63, 94)';
      if (isLastMove) {
        borderColor = '2px solid rgba(255, 255, 255, 0.8)';
        boxShadow = '0 0 12px rgba(244, 63, 94, 0.8), inset 0 0 8px rgba(255, 255, 255, 0.3)';
      }
    } else {
      // Empty cell - checkerboard pattern
      bgColor = (row + col) % 2 === 0 
        ? 'rgba(51, 65, 85, 0.5)' 
        : 'rgba(30, 41, 59, 0.5)';
    }
    
    return {
      backgroundColor: bgColor,
      border: borderColor || '1px solid rgba(71, 85, 105, 0.3)',
      boxShadow: boxShadow || 'none',
      transition: 'all 0.3s ease',
    };
  };

  // Get piece border edges for a cell (to show piece boundaries)
  const getPieceBorders = (row, col) => {
    const cellValue = board?.[row]?.[col];
    if (!cellValue) return {};
    
    const pieceInfo = getPieceInfo(row, col);
    if (!pieceInfo) return {};
    
    const borders = {};
    
    // Check if adjacent cells belong to the same piece
    const checkAdjacent = (adjRow, adjCol) => {
      const adjPieceInfo = getPieceInfo(adjRow, adjCol);
      if (!adjPieceInfo) return true; // No piece = border
      // Same player but different piece = border
      return pieceInfo.piece !== adjPieceInfo.piece || pieceInfo.player !== adjPieceInfo.player;
    };
    
    // Top border
    if (row === 0 || checkAdjacent(row - 1, col)) {
      borders.borderTop = '2px solid rgba(255, 255, 255, 0.4)';
    }
    // Bottom border
    if (row === 7 || checkAdjacent(row + 1, col)) {
      borders.borderBottom = '2px solid rgba(255, 255, 255, 0.4)';
    }
    // Left border
    if (col === 0 || checkAdjacent(row, col - 1)) {
      borders.borderLeft = '2px solid rgba(255, 255, 255, 0.4)';
    }
    // Right border
    if (col === 7 || checkAdjacent(row, col + 1)) {
      borders.borderRight = '2px solid rgba(255, 255, 255, 0.4)';
    }
    
    return borders;
  };

  const winnerName = winner === 'player1' ? player1Name : 
                     winner === 'player2' ? player2Name : 
                     null;

  const isViewerWinner = (winner === 'player1' && viewerIsPlayer1) ||
                         (winner === 'player2' && !viewerIsPlayer1);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
      onClick={onClose}
    >
      {/* Modal */}
      <div 
        className="relative bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-slate-600/50 shadow-2xl max-w-sm w-full overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-full bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-white transition-colors z-10"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="p-4 pb-2 text-center">
          <h3 className="text-lg font-bold text-white mb-1">Final Board</h3>
          
          {/* Winner info */}
          {winnerName ? (
            <div className={`flex items-center justify-center gap-2 text-sm ${isViewerWinner ? 'text-green-400' : 'text-red-400'}`}>
              <Trophy size={16} />
              <span>{winnerName} won</span>
            </div>
          ) : (
            <div className="text-sm text-slate-400">Draw</div>
          )}
          
          {/* Last move indicator */}
          {lastMove.length > 0 && (
            <div className="text-xs text-amber-400 mt-1 flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Last move highlighted
            </div>
          )}
        </div>

        {/* Board */}
        <div className="flex justify-center p-4 pt-2">
          <div 
            className="relative rounded-lg overflow-hidden border-2 border-slate-600"
            style={{ 
              width: CELL_SIZE * BOARD_SIZE + 4,
              height: CELL_SIZE * BOARD_SIZE + 4
            }}
          >
            {/* Grid */}
            <div 
              className="grid"
              style={{ 
                gridTemplateColumns: `repeat(${BOARD_SIZE}, ${CELL_SIZE}px)`,
                gridTemplateRows: `repeat(${BOARD_SIZE}, ${CELL_SIZE}px)`,
              }}
            >
              {Array.from({ length: BOARD_SIZE }).map((_, row) =>
                Array.from({ length: BOARD_SIZE }).map((_, col) => {
                  const cellStyle = getCellStyle(row, col);
                  const pieceBorders = getPieceBorders(row, col);
                  const isLast = isLastMoveCell(row, col);
                  
                  return (
                    <div
                      key={`${row}-${col}`}
                      className={`relative ${isLast ? 'z-10' : ''}`}
                      style={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        ...cellStyle,
                        ...pieceBorders,
                      }}
                    >
                      {/* Pulse effect for last move */}
                      {isLast && (
                        <div 
                          className="absolute inset-0 animate-pulse"
                          style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            pointerEvents: 'none'
                          }}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 p-4 pt-0 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(6, 182, 212)' }} />
            <span className="text-slate-300">{player1Name}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(244, 63, 94)' }} />
            <span className="text-slate-300">{player2Name}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinalBoardView;
