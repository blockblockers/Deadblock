// FinalBoardView.jsx - Display final board state with move order numbers
// IMPROVED: Shows board even when moveHistory is missing, with player colors
// Shows each piece with its move number overlay for game analysis

import { useState, useEffect, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, SkipBack, SkipForward, Play, Pause, Loader } from 'lucide-react';
import { BOARD_SIZE, getPieceCoords } from '../utils/gameLogic';
import { pieceColors } from '../utils/pieces';
import { soundManager } from '../utils/soundManager';

/**
 * FinalBoardView - Shows the final game board with move order numbers
 * 
 * IMPROVED: 
 * - Shows board even without moveHistory (from board/boardPieces props)
 * - Different colors for Player 1 (cyan) and Player 2 (orange)
 * - Move order numbers on each piece (when available)
 * - Gold shimmering highlight on the last moved piece
 * - Loading state support
 */
const FinalBoardView = ({ 
  board, 
  boardPieces, 
  moveHistory = [],
  isLoadingMoves = false,
  player1Name = 'Player 1',
  player2Name = 'Player 2',
  winner = null,
  viewerIsPlayer1 = true,
  onClose 
}) => {
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1); // -1 = show all with numbers
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000); // ms per move

  // Ensure board is valid
  const safeBoard = useMemo(() => {
    if (Array.isArray(board) && board.length === BOARD_SIZE) {
      return board;
    }
    // Create empty board as fallback
    return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  }, [board]);

  // Ensure boardPieces is valid
  const safeBoardPieces = useMemo(() => {
    if (boardPieces && typeof boardPieces === 'object') {
      return boardPieces;
    }
    return {};
  }, [boardPieces]);

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
                player: safeBoard[cellRow]?.[cellCol] || ((index % 2) + 1)
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
  }, [safeBoard, moveHistory]);

  // Build board states at each move for replay
  const boardStates = useMemo(() => {
    if (!moveHistory || moveHistory.length === 0) {
      return [{ board: safeBoard, boardPieces: safeBoardPieces }];
    }

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
  }, [moveHistory, safeBoard, safeBoardPieces]);

  // Playback controls
  useEffect(() => {
    if (!isPlaying || moveHistory.length === 0) return;

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
    if (moveHistory.length === 0) return;
    
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
    soundManager.playClickSound?.('soft') || soundManager.playButtonClick?.();
  };

  const handlePrevMove = () => {
    if (moveHistory.length === 0) return;
    setIsPlaying(false);
    setCurrentMoveIndex(prev => {
      if (prev === -1) return moveHistory.length - 1;
      if (prev === 0) return -1;
      return prev - 1;
    });
    soundManager.playClickSound?.('soft') || soundManager.playButtonClick?.();
  };

  const handleNextMove = () => {
    if (moveHistory.length === 0) return;
    setIsPlaying(false);
    setCurrentMoveIndex(prev => {
      if (prev >= moveHistory.length - 1) return -1;
      return prev + 1;
    });
    soundManager.playClickSound?.('soft') || soundManager.playButtonClick?.();
  };

  const handleFirst = () => {
    if (moveHistory.length === 0) return;
    setIsPlaying(false);
    setCurrentMoveIndex(0);
    soundManager.playClickSound?.('soft') || soundManager.playButtonClick?.();
  };

  const handleLast = () => {
    if (moveHistory.length === 0) return;
    setIsPlaying(false);
    setCurrentMoveIndex(-1); // Show final with numbers
    soundManager.playClickSound?.('soft') || soundManager.playButtonClick?.();
  };

  // Get cell color based on player - DISTINCT COLORS
  const getCellColor = (player) => {
    if (player === 1) {
      return 'bg-gradient-to-br from-cyan-400 to-cyan-600'; // Player 1: Cyan
    } else if (player === 2) {
      return 'bg-gradient-to-br from-orange-400 to-orange-600'; // Player 2: Orange
    }
    return 'bg-slate-700/30';
  };

  // Determine display state
  const showingFinalWithNumbers = currentMoveIndex === -1;
  const stateIndex = showingFinalWithNumbers ? boardStates.length - 1 : currentMoveIndex + 1;
  const displayState = boardStates[stateIndex] || { board: safeBoard, boardPieces: safeBoardPieces };
  const displayBoard = displayState.board || safeBoard;

  // Get the current move number being shown (for progress display)
  const displayMoveNumber = showingFinalWithNumbers 
    ? moveHistory.length 
    : (currentMoveIndex + 1);

  // Check if we have any pieces on the board
  const hasPieces = displayBoard.some(row => row.some(cell => cell !== null && cell !== 0));

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
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Player Legend */}
        <div className="flex justify-center gap-6 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
            <span className={`${winner === 'player1' ? 'text-cyan-300 font-bold' : 'text-slate-400'}`}>
              {player1Name} {winner === 'player1' && '👑'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-orange-400 to-orange-600 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
            <span className={`${winner === 'player2' ? 'text-orange-300 font-bold' : 'text-slate-400'}`}>
              {player2Name} {winner === 'player2' && '👑'}
            </span>
          </div>
        </div>

        {/* Loading State */}
        {isLoadingMoves && (
          <div className="flex items-center justify-center py-8">
            <Loader size={32} className="text-amber-400 animate-spin" />
            <span className="ml-2 text-slate-400">Loading moves...</span>
          </div>
        )}

        {/* Board Grid */}
        {!isLoadingMoves && (
          <div className="flex justify-center mb-4">
            <div 
              className="grid grid-cols-8 gap-1 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50"
              style={{ boxShadow: '0 0 20px rgba(0,0,0,0.3)' }}
            >
              {displayBoard.map((row, rowIdx) =>
                row.map((cellValue, colIdx) => {
                  const key = `${rowIdx},${colIdx}`;
                  const moveInfo = cellMoveNumbers[key];
                  const isOccupied = cellValue !== null && cellValue !== 0;
                  const isLastMove = lastMoveCells.has(key) && showingFinalWithNumbers;
                  const showMoveNumber = showingFinalWithNumbers && moveInfo && moveHistory.length > 0;
                  
                  return (
                    <div
                      key={key}
                      className={`
                        w-8 h-8 sm:w-10 sm:h-10 rounded-md relative overflow-hidden
                        ${isOccupied ? getCellColor(cellValue) : 'bg-slate-700/30'}
                        ${isOccupied ? 'shadow-sm' : ''}
                        ${isLastMove ? 'last-move-shimmer ring-2 ring-amber-400' : ''}
                        transition-all duration-200
                      `}
                    >
                      {/* Cell shine for occupied cells */}
                      {isOccupied && (
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/20" />
                      )}
                      
                      {/* Move number overlay */}
                      {showMoveNumber && (
                        <div className={`
                          absolute inset-0 flex items-center justify-center
                          text-[10px] sm:text-xs font-bold
                          ${cellValue === 1 ? 'text-cyan-900' : 'text-orange-900'}
                          bg-white/30 rounded-sm
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
        )}

        {/* No pieces message */}
        {!isLoadingMoves && !hasPieces && (
          <div className="text-center text-slate-500 py-4">
            No pieces on board
          </div>
        )}

        {/* Playback Controls - only show if we have move history */}
        {!isLoadingMoves && moveHistory.length > 0 && (
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
          {isLoadingMoves ? (
            <span>Loading game data...</span>
          ) : moveHistory.length > 0 ? (
            showingFinalWithNumbers 
              ? <span>Numbers show move order • {moveHistory.length} total moves</span>
              : <span>Replaying game...</span>
          ) : hasPieces ? (
            <span>Final board state • Move history not available</span>
          ) : (
            <span>No game data available</span>
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

      {/* Shimmer animation for last move */}
      <style>{`
        .last-move-shimmer {
          animation: last-move-glow 1.5s ease-in-out infinite;
        }
        
        @keyframes last-move-glow {
          0%, 100% {
            box-shadow: 0 0 5px rgba(251, 191, 36, 0.5), inset 0 0 5px rgba(251, 191, 36, 0.2);
          }
          50% {
            box-shadow: 0 0 15px rgba(251, 191, 36, 0.8), inset 0 0 10px rgba(251, 191, 36, 0.4);
          }
        }
      `}</style>
    </div>
  );
};

export default FinalBoardView;
