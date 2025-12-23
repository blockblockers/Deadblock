import React, { useMemo } from 'react';
import { X, Trophy } from 'lucide-react';

/**
 * FinalBoardView - Shows the final state of a completed game
 * 
 * Features:
 * - Displays the final board state
 * - Highlights the last move with glowing border
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

  // Find the last move cells by looking at usedPieces or boardPieces
  const lastMoveCells = useMemo(() => {
    let cells = [];
    
    // Method 1: Check usedPieces for the last placed piece
    if (usedPieces && usedPieces.length > 0) {
      const lastPiece = usedPieces[usedPieces.length - 1];
      if (lastPiece && lastPiece.row !== undefined && lastPiece.col !== undefined) {
        // The usedPieces contains the anchor position, but we need all cells
        // For now, just highlight around that area
        // Since we don't have the full shape info easily, we'll look at board state
        const player = lastPiece.player;
        
        // Find all cells belonging to the last piece by checking if they were part of the last move
        // We'll use a simple heuristic: cells adjacent to the anchor point with same player
        const anchorRow = lastPiece.row;
        const anchorCol = lastPiece.col;
        
        // Look at all cells and find connected component from anchor
        const visited = new Set();
        const queue = [[anchorRow, anchorCol]];
        
        // Handle both numeric (1,2) and string ('cyan','rose') target values
        const targetValues = player === 1 ? [1, 'cyan'] : [2, 'rose'];
        
        while (queue.length > 0 && cells.length < 5) {
          const [r, c] = queue.shift();
          const key = `${r},${c}`;
          
          if (visited.has(key)) continue;
          if (r < 0 || r >= 8 || c < 0 || c >= 8) continue;
          
          const cellVal = board?.[r]?.[c];
          if (!targetValues.includes(cellVal)) continue;
          
          visited.add(key);
          cells.push({ row: r, col: c });
          
          // Add neighbors
          queue.push([r-1, c], [r+1, c], [r, c-1], [r, c+1]);
        }
      }
    }
    
    // Method 2: If usedPieces didn't work, try boardPieces moveNumber
    if (cells.length === 0 && Object.keys(boardPieces).length > 0) {
      let maxMoveNumber = -1;
      
      Object.entries(boardPieces).forEach(([key, info]) => {
        if (info.moveNumber !== undefined && info.moveNumber > maxMoveNumber) {
          maxMoveNumber = info.moveNumber;
        }
      });
      
      if (maxMoveNumber >= 0) {
        Object.entries(boardPieces).forEach(([key, info]) => {
          if (info.moveNumber === maxMoveNumber) {
            const [row, col] = key.split(',').map(Number);
            cells.push({ row, col });
          }
        });
      }
    }
    
    return cells;
  }, [board, boardPieces, usedPieces]);

  // Check if a cell is part of the last move
  const isLastMoveCell = (row, col) => {
    return lastMoveCells.some(cell => cell.row === row && cell.col === col);
  };

  // Get piece info for a cell (for distinguishing different pieces)
  const getPieceInfo = (row, col) => {
    const key = `${row},${col}`;
    return boardPieces?.[key];
  };

  // Generate a subtle shade variation based on moveNumber or piece
  const getShadeVariation = (pieceInfo) => {
    if (!pieceInfo?.moveNumber && !pieceInfo?.piece) return 0;
    // Use moveNumber or piece name to create variation
    const identifier = pieceInfo.moveNumber || (pieceInfo.piece?.charCodeAt(0) || 0);
    return (identifier % 3) * 10 - 10; // -10, 0, or 10 for subtle variation
  };

  // Get a unique pattern/texture index for each piece based on move number
  const getPiecePattern = (pieceInfo) => {
    if (!pieceInfo?.moveNumber) return 0;
    return pieceInfo.moveNumber % 6; // 6 different patterns
  };

  // Determine cell color - handles both numeric (1,2) and string ('cyan','rose') values
  const getCellColor = (row, col) => {
    const cellValue = board?.[row]?.[col];
    const isLast = isLastMoveCell(row, col);
    const pieceInfo = getPieceInfo(row, col);
    const pattern = getPiecePattern(pieceInfo);
    
    // Handle numeric values (1, 2) or string values ('cyan', 'rose')
    const isPlayer1 = cellValue === 1 || cellValue === 'cyan';
    const isPlayer2 = cellValue === 2 || cellValue === 'rose';
    
    if (isPlayer1) {
      // Player 1 - Cyan with distinct piece patterns
      if (isLast) {
        return 'bg-cyan-300 ring-2 ring-white ring-offset-1 ring-offset-slate-900 shadow-[0_0_25px_rgba(34,211,238,1),inset_0_0_15px_rgba(255,255,255,0.3)]';
      }
      // Different shades based on move number for piece distinction
      const shades = [
        'bg-cyan-500 border border-cyan-300/40',      // Pattern 0
        'bg-cyan-600 border border-cyan-400/30',      // Pattern 1
        'bg-teal-500 border border-teal-300/40',      // Pattern 2
        'bg-cyan-400 border border-cyan-200/40',      // Pattern 3
        'bg-teal-600 border border-teal-400/30',      // Pattern 4
        'bg-sky-500 border border-sky-300/40',        // Pattern 5
      ];
      return shades[pattern];
    } else if (isPlayer2) {
      // Player 2 - Rose with distinct piece patterns
      if (isLast) {
        return 'bg-rose-300 ring-2 ring-white ring-offset-1 ring-offset-slate-900 shadow-[0_0_25px_rgba(244,63,94,1),inset_0_0_15px_rgba(255,255,255,0.3)]';
      }
      // Different shades based on move number for piece distinction
      const shades = [
        'bg-rose-500 border border-rose-300/40',      // Pattern 0
        'bg-rose-600 border border-rose-400/30',      // Pattern 1
        'bg-pink-500 border border-pink-300/40',      // Pattern 2
        'bg-rose-400 border border-rose-200/40',      // Pattern 3
        'bg-pink-600 border border-pink-400/30',      // Pattern 4
        'bg-red-500 border border-red-300/40',        // Pattern 5
      ];
      return shades[pattern];
    }
    
    // Empty cell - checkerboard pattern
    return (row + col) % 2 === 0 
      ? 'bg-slate-700/50' 
      : 'bg-slate-800/50';
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
          {lastMoveCells.length > 0 && (
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
                  const cellColor = getCellColor(row, col);
                  const isLast = isLastMoveCell(row, col);
                  
                  return (
                    <div
                      key={`${row}-${col}`}
                      className={`${cellColor} transition-all ${isLast ? 'z-10 animate-pulse' : ''}`}
                      style={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                      }}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2 p-4 pt-0">
          <div className="flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-cyan-500/80" />
              <span className="text-slate-300">{player1Name}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-rose-500/80" />
              <span className="text-slate-300">{player2Name}</span>
            </div>
          </div>
          
          {/* Last move legend */}
          {lastMoveCells.length > 0 && (
            <div className="flex justify-center">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="w-4 h-4 rounded bg-white/80 ring-2 ring-white shadow-[0_0_10px_rgba(255,255,255,0.5)] animate-pulse" />
                <span className="text-amber-400 text-xs font-medium">Last piece placed</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinalBoardView;
