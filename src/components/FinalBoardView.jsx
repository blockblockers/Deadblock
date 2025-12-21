import React from 'react';
import { X, Trophy } from 'lucide-react';

/**
 * FinalBoardView - Shows the final state of a completed game
 * 
 * Features:
 * - Displays the final board state
 * - Shows winner/loser info
 * - Compact modal design
 */
const FinalBoardView = ({
  isOpen,
  onClose,
  board,              // 8x8 board array
  boardPieces = {},   // { 'r,c': { player, piece, rotation, flipped } }
  winner = null,      // 'player1' | 'player2' | null (draw)
  player1Name = 'Player 1',
  player2Name = 'Player 2',
  viewerIsPlayer1 = true,
}) => {
  if (!isOpen) return null;

  const CELL_SIZE = 36;
  const BOARD_SIZE = 8;

  // Determine cell color
  const getCellColor = (row, col) => {
    const cellValue = board?.[row]?.[col];
    
    if (cellValue === 1) {
      return 'bg-cyan-500/80';
    } else if (cellValue === 2) {
      return 'bg-rose-500/80';
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
                  
                  return (
                    <div
                      key={`${row}-${col}`}
                      className={`${cellColor} transition-all`}
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
        <div className="flex justify-center gap-6 p-4 pt-0 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-cyan-500/80" />
            <span className="text-slate-300">{player1Name}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-rose-500/80" />
            <span className="text-slate-300">{player2Name}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinalBoardView;
