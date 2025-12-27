// FinalBoardView.jsx - Display final board state with move order numbers
// ENHANCED: Added gold shimmer on last moved piece
// Shows each piece with its move number overlay for game analysis
import { useState, useEffect, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, SkipBack, SkipForward, Play, Pause } from 'lucide-react';
import { BOARD_SIZE, getPieceCoords } from '../utils/gameLogic';
import { pieceColors } from '../utils/pieces';
import { soundManager } from '../utils/soundManager';

/**
 * FinalBoardView - Shows the final game board with move order numbers
 * 
 * ENHANCED: 
 * - Different colors for Player 1 (cyan) and Player 2 (orange)
 * - Move order numbers on each piece
 * - Gold shimmering highlight on the last moved piece
 * 
 * @param {Object} props
 * @param {Array} props.board - Final board state (8x8 grid)
 * @param {Object} props.boardPieces - Map of "row,col" -> pieceType
 * @param {Array} props.moveHistory - Array of moves with move_number, piece_type, row, col, rotation, flipped
 * @param {string} props.player1Name - Player 1's name
 * @param {string} props.player2Name - Player 2's name
 * @param {Function} props.onClose - Callback to close the view
 */
const FinalBoardView = ({ 
  board, 
  boardPieces, 
  moveHistory = [],
  player1Name = 'Player 1',
  player2Name = 'Player 2',
  onClose 
}) => {
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1); // -1 = show all with numbers
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000); // ms per move

  // Build cell move numbers and track which cells belong to last move
  const { cellMoveNumbers, lastMoveCells } = useMemo(() => {
    const cellMap = {};
    const lastCells = new Set();
    
    if (!moveHistory || moveHistory.length === 0) {
      return { cellMoveNumbers: cellMap, lastMoveCells: lastCells };
    }

    const lastMoveNumber = moveHistory.length;

    // Process each move and calculate which cells it occupies
    moveHistory.forEach((move, index) => {
      const moveNumber = move.move_number || (index + 1);
      const pieceType = move.piece_type;
      const anchorRow = move.row;
      const anchorCol = move.col;
      const rotation = move.rotation || 0;
      const flipped = move.flipped || false;

      if (pieceType === undefined || anchorRow === undefined || anchorCol === undefined) {
        return;
      }

      try {
        // Get piece coordinates with rotation and flip applied
        const coords = getPieceCoords(pieceType, rotation, flipped);
        
        if (coords && coords.length > 0) {
          // Mark each cell this piece occupies
          coords.forEach(([dx, dy]) => {
            const cellRow = anchorRow + dy;
            const cellCol = anchorCol + dx;
            
            // Make sure cell is within bounds
            if (cellRow >= 0 && cellRow < BOARD_SIZE && cellCol >= 0 && cellCol < BOARD_SIZE) {
              const key = `${cellRow},${cellCol}`;
              cellMap[key] = {
                moveNumber,
                player: board[cellRow]?.[cellCol] || ((index % 2) + 1)
              };
              
              // Track last move cells
              if (moveNumber === lastMoveNumber) {
                lastCells.add(key);
              }
            }
          });
        }
      } catch (e) {
        console.warn('FinalBoardView: Could not calculate coords for move', moveNumber, e);
      }
    });

    return { cellMoveNumbers: cellMap, lastMoveCells: lastCells };
  }, [board, moveHistory]);

  // Build board states at each move for replay
  const boardStates = useMemo(() => {
    const states = [];
    let currentBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    let currentBoardPieces = {};

    // State 0: empty board
    states.push({
      board: currentBoard.map(r => [...r]),
      boardPieces: { ...currentBoardPieces }
    });

    moveHistory.forEach((move, index) => {
      // If move has board_state, use it
      if (move.board_state?.board) {
        currentBoard = move.board_state.board.map(r => [...r]);
        currentBoardPieces = { ...move.board_state.boardPieces };
      } else {
        // Otherwise calculate from piece placement
        const pieceType = move.piece_type;
        const anchorRow = move.row;
        const anchorCol = move.col;
        const rotation = move.rotation || 0;
        const flipped = move.flipped || false;
        const playerNum = (index % 2) + 1; // Alternate players

        try {
          const coords = getPieceCoords(pieceType, rotation, flipped);
          if (coords) {
            currentBoard = currentBoard.map(r => [...r]);
            currentBoardPieces = { ...currentBoardPieces };
            
            coords.forEach(([dx, dy]) => {
              const cellRow = anchorRow + dy;
              const cellCol = anchorCol + dx;
              if (cellRow >= 0 && cellRow < BOARD_SIZE && cellCol >= 0 && cellCol < BOARD_SIZE) {
                currentBoard[cellRow][cellCol] = playerNum;
                currentBoardPieces[`${cellRow},${cellCol}`] = pieceType;
              }
            });
          }
        } catch (e) {
          // Skip invalid moves
        }
      }

      states.push({
        board: currentBoard.map(r => [...r]),
        boardPieces: { ...currentBoardPieces }
      });
    });

    return states;
  }, [moveHistory]);

  // Playback controls
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentMoveIndex(prev => {
        if (prev >= moveHistory.length - 1) {
          setIsPlaying(false);
          return -1; // Return to final view with numbers
        }
        return prev + 1;
      });
    }, playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, moveHistory.length]);

  const handlePlayPause = () => {
    if (currentMoveIndex === -1) {
      // Start from beginning
      setCurrentMoveIndex(0);
      setIsPlaying(true);
    } else if (currentMoveIndex >= moveHistory.length - 1) {
      // At end, restart
      setCurrentMoveIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
    soundManager.playClickSound('soft');
  };

  const handlePrevMove = () => {
    setIsPlaying(false);
    setCurrentMoveIndex(prev => {
      if (prev === -1) return moveHistory.length - 1;
      if (prev === 0) return -1;
      return prev - 1;
    });
    soundManager.playClickSound('soft');
  };

  const handleNextMove = () => {
    setIsPlaying(false);
    setCurrentMoveIndex(prev => {
      if (prev >= moveHistory.length - 1) return -1;
      return prev + 1;
    });
    soundManager.playClickSound('soft');
  };

  const handleFirst = () => {
    setIsPlaying(false);
    setCurrentMoveIndex(0);
    soundManager.playClickSound('soft');
  };

  const handleLast = () => {
    setIsPlaying(false);
    setCurrentMoveIndex(-1); // Show final with numbers
    soundManager.playClickSound('soft');
  };

  // Get cell color based on player - ENHANCED colors
  const getCellColor = (player) => {
    if (player === 1) {
      return 'bg-gradient-to-br from-cyan-400 to-cyan-600';
    } else if (player === 2) {
      return 'bg-gradient-to-br from-orange-400 to-orange-600';
    }
    return 'bg-slate-700/30';
  };

  // Determine display state
  const showingFinalWithNumbers = currentMoveIndex === -1;
  const stateIndex = showingFinalWithNumbers ? boardStates.length - 1 : currentMoveIndex + 1;
  const displayState = boardStates[stateIndex] || { board, boardPieces };
  const displayBoard = displayState.board || board;

  // Get the current move number being shown (for progress display)
  const displayMoveNumber = showingFinalWithNumbers 
    ? moveHistory.length 
    : (currentMoveIndex + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-slate-900/95 rounded-xl p-4 sm:p-6 max-w-md w-full border border-amber-500/30 shadow-[0_0_50px_rgba(251,191,36,0.2)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-amber-300">
            {showingFinalWithNumbers ? 'Final Board' : `Move ${displayMoveNumber}`}
          </h2>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Legend - ENHANCED with clearer player colors */}
        <div className="flex justify-center gap-6 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
            <span className="text-cyan-300 font-medium">{player1Name}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-orange-400 to-orange-600 shadow-[0_0_8px_rgba(251,146,60,0.5)]" />
            <span className="text-orange-300 font-medium">{player2Name}</span>
          </div>
        </div>

        {/* Board */}
        <div className="flex justify-center mb-4">
          <div 
            className="grid gap-0.5 p-2 bg-slate-800/50 rounded-lg border border-slate-700/50"
            style={{ 
              gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
              width: 'min(100%, 320px)',
              aspectRatio: '1'
            }}
          >
            {Array(BOARD_SIZE).fill(null).map((_, row) =>
              Array(BOARD_SIZE).fill(null).map((_, col) => {
                const cellKey = `${row},${col}`;
                const cellValue = displayBoard[row]?.[col];
                const moveInfo = cellMoveNumbers[cellKey];
                const isOccupied = cellValue !== null && cellValue !== 0;
                const isLastMove = lastMoveCells.has(cellKey);
                
                // Show move number only on final view
                const showMoveNumber = showingFinalWithNumbers && moveInfo && isOccupied;

                return (
                  <div
                    key={cellKey}
                    className={`
                      relative aspect-square rounded-sm flex items-center justify-center
                      ${isOccupied ? getCellColor(cellValue) : 'bg-slate-700/30'}
                      ${isOccupied ? 'shadow-sm' : ''}
                      ${showingFinalWithNumbers && isLastMove ? 'gold-shimmer-cell' : ''}
                      transition-all duration-200
                    `}
                  >
                    {/* ENHANCED: Gold shimmer overlay for last moved piece */}
                    {showingFinalWithNumbers && isLastMove && (
                      <div className="absolute inset-0 rounded-sm overflow-hidden pointer-events-none">
                        <div className="absolute inset-0 gold-shimmer-effect" />
                        <div className="absolute inset-0 border-2 border-amber-300/70 rounded-sm" />
                      </div>
                    )}
                    
                    {/* Move number overlay */}
                    {showMoveNumber && (
                      <div className={`
                        absolute inset-0 flex items-center justify-center
                        text-[10px] sm:text-xs font-bold
                        ${isLastMove 
                          ? 'text-amber-900 bg-amber-300/50' 
                          : cellValue === 1 
                            ? 'text-cyan-900 bg-white/30' 
                            : 'text-orange-900 bg-white/30'
                        }
                        rounded-sm z-10
                      `}>
                        {moveInfo.moveNumber}
                      </div>
                    )}
                    
                    {/* Cell highlight for non-numbered cells during replay */}
                    {isOccupied && !showMoveNumber && (
                      <div className="absolute inset-0 bg-white/10 rounded-sm" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Last Move Indicator */}
        {showingFinalWithNumbers && moveHistory.length > 0 && (
          <div className="text-center mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-xs text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Last move highlighted in gold
            </span>
          </div>
        )}

        {/* Playback Controls */}
        {moveHistory.length > 0 && (
          <div className="space-y-3">
            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-8 text-center">
                {showingFinalWithNumbers ? '●' : displayMoveNumber}
              </span>
              <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-200"
                  style={{ 
                    width: showingFinalWithNumbers 
                      ? '100%' 
                      : `${((currentMoveIndex + 1) / moveHistory.length) * 100}%` 
                  }}
                />
              </div>
              <span className="text-xs text-slate-500 w-8 text-right">
                {moveHistory.length}
              </span>
            </div>

            {/* Control buttons */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={handleFirst}
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                title="First move"
              >
                <SkipBack size={16} />
              </button>
              <button
                onClick={handlePrevMove}
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                title="Previous move"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handlePlayPause}
                className="p-3 rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition-all"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <button
                onClick={handleNextMove}
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                title="Next move"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={handleLast}
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                title="Final board with move numbers"
              >
                <SkipForward size={16} />
              </button>
            </div>

            {/* Speed control */}
            <div className="flex items-center justify-center gap-2 text-xs">
              <span className="text-slate-500">Speed:</span>
              {[{ speed: 2000, label: '0.5x' }, { speed: 1000, label: '1x' }, { speed: 500, label: '2x' }].map(({ speed, label }) => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-2 py-1 rounded ${
                    playbackSpeed === speed 
                      ? 'bg-amber-600 text-white' 
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  } transition-all`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Info text */}
        <div className="mt-4 text-center text-sm text-slate-500">
          {moveHistory.length > 0 ? (
            showingFinalWithNumbers 
              ? <span>Numbers show move order • {moveHistory.length} total moves</span>
              : <span>Replaying game...</span>
          ) : (
            <span>Move history not available</span>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full mt-4 py-2.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all font-medium"
        >
          Close
        </button>
      </div>

      {/* ENHANCED: Gold shimmer animation styles */}
      <style>{`
        .gold-shimmer-cell {
          box-shadow: 0 0 15px rgba(251,191,36,0.6), 0 0 30px rgba(251,191,36,0.3);
        }
        
        .gold-shimmer-effect {
          background: linear-gradient(
            135deg,
            transparent 0%,
            transparent 40%,
            rgba(251,191,36,0.4) 45%,
            rgba(255,255,255,0.6) 50%,
            rgba(251,191,36,0.4) 55%,
            transparent 60%,
            transparent 100%
          );
          background-size: 300% 300%;
          animation: gold-shimmer 2s ease-in-out infinite;
        }
        
        @keyframes gold-shimmer {
          0% {
            background-position: 200% 200%;
          }
          50% {
            background-position: 0% 0%;
          }
          100% {
            background-position: -200% -200%;
          }
        }
      `}</style>
    </div>
  );
};

export default FinalBoardView;
