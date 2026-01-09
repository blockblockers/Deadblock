// FinalBoardView.jsx - Display final board state with move order and replay
// v7.11 FIXES:
// - Compact layout - reduced whitespace between header/board/footer
// - Move numbers show player indicator (cyan dot for P1, pink dot for P2)
// - Last move prominently highlighted with golden glow and "LAST" badge
// - Player legend showing which color is which player
// - Fixed cellCol bug in move number calculation

import { useState, useEffect, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, SkipBack, SkipForward, Play, Pause, Loader, Film, Trophy, Clock } from 'lucide-react';
import { BOARD_SIZE, getPieceCoords } from '../utils/gameLogic';
import { pieceColors } from '../utils/pieces';
import { soundManager } from '../utils/soundManager';
import { ratingService } from '../services/ratingService';
import TierIcon from './TierIcon';

// Helper to convert hex to rgba
const hexToRgba = (hex, alpha) => {
  if (!hex || !hex.startsWith('#')) return `rgba(100, 116, 139, ${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * FinalBoardView - Shows game replay with SpectatorView-like styling
 * 
 * v7.11 Features:
 * - COMPACT layout - minimal padding, no extra whitespace
 * - Move numbers with player color indicator dots
 * - Last move highlighted with golden glow + "LAST" badge
 * - Player legend at bottom of board
 * - Move-by-move replay with playback controls
 */
const FinalBoardView = ({ 
  board, 
  boardPieces, 
  moveHistory = [],
  isLoadingMoves = false,
  player1 = null,      // { username, rating/elo_rating, id }
  player2 = null,      // { username, rating/elo_rating, id }
  player1Name = 'Player 1',
  player2Name = 'Player 2',
  player1Rating = 1200,
  player2Rating = 1200,
  winner = null,       // 'player1' | 'player2' | player_id
  winnerId = null,     // Winner's user ID
  viewerIsPlayer1 = true,
  gameDate = null,     // When the game was played
  onClose 
}) => {
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1); // -1 = show final with numbers
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000);

  // Extract player info - check multiple possible rating field names
  const p1Name = player1?.username || player1?.display_name || player1Name;
  const p2Name = player2?.username || player2?.display_name || player2Name;
  const p1Rating = player1?.elo_rating || player1?.rating || player1?.elo || player1Rating || 1200;
  const p2Rating = player2?.elo_rating || player2?.rating || player2?.elo || player2Rating || 1200;
  const p1Id = player1?.id;
  const p2Id = player2?.id;

  // Determine winner
  const isPlayer1Winner = winner === 'player1' || winnerId === p1Id || (winnerId && winnerId === p1Id);
  const isPlayer2Winner = winner === 'player2' || winnerId === p2Id || (winnerId && winnerId === p2Id);

  // Get tier info for both players
  const player1Tier = ratingService.getRatingTier(p1Rating);
  const player2Tier = ratingService.getRatingTier(p2Rating);

  // Ensure board is valid
  const safeBoard = useMemo(() => {
    if (Array.isArray(board) && board.length === BOARD_SIZE) {
      return board.map(row => row.map(cell => cell === 0 ? null : cell));
    }
    return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  }, [board]);

  // Ensure boardPieces is valid
  const safeBoardPieces = useMemo(() => {
    return boardPieces && typeof boardPieces === 'object' ? boardPieces : {};
  }, [boardPieces]);

  // Build comprehensive cell info map from move history
  const cellInfoMap = useMemo(() => {
    const cellMap = {};
    if (!moveHistory || moveHistory.length === 0) return cellMap;

    moveHistory.forEach((move, index) => {
      const moveNumber = move.move_number || (index + 1);
      const pieceType = move.piece_type;
      const anchorRow = move.row;
      const anchorCol = move.col;
      const rotation = move.rotation || 0;
      const flipped = move.flipped || false;
      // Player 1 plays odd moves (1, 3, 5...), Player 2 plays even moves (2, 4, 6...)
      const player = (index % 2) + 1;

      if (pieceType === undefined || anchorRow === undefined || anchorCol === undefined) return;

      try {
        const coords = getPieceCoords(pieceType, rotation, flipped);
        if (coords && coords.length > 0) {
          coords.forEach(([dx, dy]) => {
            const cellRow = anchorRow + dy;
            const cellCol = anchorCol + dx;
            if (cellRow >= 0 && cellRow < BOARD_SIZE && cellCol >= 0 && cellCol < BOARD_SIZE) {
              cellMap[`${cellRow},${cellCol}`] = {
                moveNumber,
                player,
                pieceType,
                isLastMove: index === moveHistory.length - 1
              };
            }
          });
        }
      } catch (e) {
        console.warn('Error calculating piece coords:', e);
      }
    });

    return cellMap;
  }, [moveHistory]);

  // Build board states for replay
  const boardStates = useMemo(() => {
    if (!moveHistory || moveHistory.length === 0) {
      return [{ board: safeBoard, boardPieces: safeBoardPieces }];
    }

    const states = [{ 
      board: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)), 
      boardPieces: {} 
    }];

    let currentBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    let currentBoardPieces = {};

    moveHistory.forEach((move, index) => {
      const pieceType = move.piece_type;
      const anchorRow = move.row;
      const anchorCol = move.col;
      const rotation = move.rotation || 0;
      const flipped = move.flipped || false;
      const player = (index % 2) + 1;

      if (pieceType === undefined || anchorRow === undefined || anchorCol === undefined) return;

      try {
        const coords = getPieceCoords(pieceType, rotation, flipped);
        if (coords && coords.length > 0) {
          coords.forEach(([dx, dy]) => {
            const cellRow = anchorRow + dy;
            const cellCol = anchorCol + dx;
            if (cellRow >= 0 && cellRow < BOARD_SIZE && cellCol >= 0 && cellCol < BOARD_SIZE) {
              currentBoard[cellRow][cellCol] = player;
              currentBoardPieces[`${cellRow},${cellCol}`] = pieceType;
            }
          });
        }
      } catch (e) {
        console.warn('Error building board state:', e);
      }

      states.push({
        board: currentBoard.map(row => [...row]),
        boardPieces: { ...currentBoardPieces }
      });
    });

    return states;
  }, [moveHistory, safeBoard, safeBoardPieces]);

  // Playback effect
  useEffect(() => {
    if (!isPlaying || moveHistory.length === 0) return;

    const interval = setInterval(() => {
      setCurrentMoveIndex(prev => {
        if (prev >= moveHistory.length - 1) {
          setIsPlaying(false);
          return -1; // Back to final view
        }
        return prev + 1;
      });
    }, playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, moveHistory.length, playbackSpeed]);

  // Playback controls
  const handlePlayPause = () => {
    soundManager.playButtonClick?.();
    
    if (currentMoveIndex === -1) {
      setCurrentMoveIndex(0);
      setIsPlaying(true);
    } else if (currentMoveIndex >= moveHistory.length - 1) {
      setCurrentMoveIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handlePrev = () => {
    if (moveHistory.length === 0) return;
    setIsPlaying(false);
    soundManager.playButtonClick?.();
    setCurrentMoveIndex(prev => {
      if (prev === -1) return moveHistory.length - 1;
      if (prev === 0) return -1;
      return prev - 1;
    });
  };

  const handleNext = () => {
    if (moveHistory.length === 0) return;
    setIsPlaying(false);
    soundManager.playButtonClick?.();
    setCurrentMoveIndex(prev => {
      if (prev === -1) return 0;
      if (prev >= moveHistory.length - 1) return -1;
      return prev + 1;
    });
  };

  const handleFirst = () => {
    if (moveHistory.length === 0) return;
    setIsPlaying(false);
    soundManager.playButtonClick?.();
    setCurrentMoveIndex(0);
  };

  const handleLast = () => {
    if (moveHistory.length === 0) return;
    setIsPlaying(false);
    soundManager.playButtonClick?.();
    setCurrentMoveIndex(-1);
  };

  // Determine current display state
  const showingFinalWithNumbers = currentMoveIndex === -1;
  const displayStateIndex = showingFinalWithNumbers 
    ? boardStates.length - 1 
    : Math.min(currentMoveIndex + 1, boardStates.length - 1);
  
  const displayState = boardStates[displayStateIndex] || { board: safeBoard, boardPieces: safeBoardPieces };
  const displayBoard = displayState.board;
  const displayBoardPieces = displayState.boardPieces;
  const displayMoveNumber = currentMoveIndex + 1;

  // Current player for replay
  const currentPlayer = showingFinalWithNumbers 
    ? (moveHistory.length % 2 === 0 ? 1 : 2)
    : ((currentMoveIndex % 2) + 1);

  // Format date
  const formattedDate = gameDate 
    ? new Date(gameDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  // Get cell info from map
  const getCellInfo = (rowIdx, colIdx) => {
    return cellInfoMap[`${rowIdx},${colIdx}`] || null;
  };
  
  // Get piece type from displayBoardPieces
  const getPieceType = (rowIdx, colIdx) => {
    return displayBoardPieces[`${rowIdx},${colIdx}`] || null;
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col">
      {/* Header - Compact */}
      <div className="bg-slate-900 border-b border-purple-500/30 px-3 py-2 flex-shrink-0">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white transition-colors"
          >
            <X size={22} />
          </button>
          
          <div className="flex items-center gap-2 text-purple-400">
            <Film size={18} />
            <span className="font-medium text-sm">Game Replay</span>
            {formattedDate && (
              <span className="text-xs text-slate-500">• {formattedDate}</span>
            )}
          </div>
          
          <div className="w-8" />
        </div>
      </div>

      {/* Players Panel - Compact */}
      <div className="bg-slate-800/50 px-3 py-2 flex-shrink-0">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {/* Player 1 */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${hexToRgba(player1Tier.glowColor, 0.3)}, ${hexToRgba(player1Tier.glowColor, 0.1)})`,
                  border: `2px solid ${hexToRgba(player1Tier.glowColor, 0.5)}`
                }}
              >
                <TierIcon shape={player1Tier.shape} glowColor={player1Tier.glowColor} size="small" />
              </div>
              {isPlayer1Winner && (
                <div className="absolute -top-1 -right-1 text-amber-400">
                  <Trophy size={12} />
                </div>
              )}
            </div>
            <div>
              <div className={`font-medium text-xs ${isPlayer1Winner ? 'text-amber-400' : 'text-white'}`}>
                {p1Name}
              </div>
              <div className="text-[10px] text-slate-500">{p1Rating} ELO</div>
            </div>
          </div>
          
          {/* VS */}
          <div className="text-slate-600 font-bold text-xs">VS</div>
          
          {/* Player 2 */}
          <div className="flex items-center gap-2">
            <div>
              <div className={`font-medium text-xs text-right ${isPlayer2Winner ? 'text-amber-400' : 'text-white'}`}>
                {p2Name}
              </div>
              <div className="text-[10px] text-slate-500 text-right">{p2Rating} ELO</div>
            </div>
            <div className="relative">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${hexToRgba(player2Tier.glowColor, 0.3)}, ${hexToRgba(player2Tier.glowColor, 0.1)})`,
                  border: `2px solid ${hexToRgba(player2Tier.glowColor, 0.5)}`
                }}
              >
                <TierIcon shape={player2Tier.shape} glowColor={player2Tier.glowColor} size="small" />
              </div>
              {isPlayer2Winner && (
                <div className="absolute -top-1 -right-1 text-amber-400">
                  <Trophy size={12} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Move info bar */}
      <div className="text-center py-1.5 text-xs bg-slate-800/30 flex-shrink-0">
        {showingFinalWithNumbers ? (
          <span className="text-amber-400 font-medium">
            {isPlayer1Winner || isPlayer2Winner ? (
              <>🏆 {isPlayer1Winner ? p1Name : p2Name} wins! • {moveHistory.length} moves</>
            ) : (
              <>{moveHistory.length} moves total</>
            )}
          </span>
        ) : (
          <span className="text-slate-300">
            Move {displayMoveNumber}/{moveHistory.length} •{' '}
            <span className={currentPlayer === 1 ? 'text-cyan-400' : 'text-pink-400'}>
              {currentPlayer === 1 ? p1Name : p2Name}
            </span>
          </span>
        )}
      </div>

      {/* Game Board - Takes remaining space */}
      <div className="flex-1 flex items-center justify-center p-2 overflow-hidden">
        {isLoadingMoves ? (
          <div className="text-center">
            <Loader size={40} className="text-purple-400 animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Loading game replay...</p>
          </div>
        ) : (
          <div className="w-full max-w-sm">
            {/* Board grid */}
            <div 
              className="grid grid-cols-8 gap-0.5 p-2 rounded-xl bg-slate-800/50 border border-slate-700/50"
              style={{ 
                boxShadow: '0 0 20px rgba(0,0,0,0.3)',
                aspectRatio: '1'
              }}
            >
              {displayBoard.map((row, rowIdx) =>
                row.map((cellValue, colIdx) => {
                  const key = `${rowIdx},${colIdx}`;
                  const cellInfo = showingFinalWithNumbers ? getCellInfo(rowIdx, colIdx) : null;
                  const isOccupied = cellValue !== null && cellValue !== 0;
                  const showMoveNumber = showingFinalWithNumbers && cellInfo && moveHistory.length > 0;
                  const isLastMove = cellInfo?.isLastMove;
                  const player = cellInfo?.player || cellValue;
                  
                  // Get piece type for color
                  const pieceType = cellInfo?.pieceType || getPieceType(rowIdx, colIdx);
                  
                  // Determine cell background color
                  let cellBg = 'bg-slate-700/30';
                  let cellGlow = '';
                  
                  if (isOccupied && pieceType && pieceColors[pieceType]) {
                    cellBg = pieceColors[pieceType];
                    cellGlow = '0 0 6px rgba(255, 255, 255, 0.1)';
                  } else if (isOccupied) {
                    // Fallback to player colors
                    if (cellValue === 1) {
                      cellBg = 'bg-gradient-to-br from-cyan-400 to-cyan-600';
                      cellGlow = '0 0 8px rgba(34, 211, 238, 0.3)';
                    } else {
                      cellBg = 'bg-gradient-to-br from-pink-400 to-pink-600';
                      cellGlow = '0 0 8px rgba(236, 72, 153, 0.3)';
                    }
                  }
                  
                  return (
                    <div
                      key={key}
                      className={`
                        aspect-square rounded-sm relative overflow-hidden
                        ${cellBg}
                        ${isLastMove ? 'last-move-highlight z-10' : ''}
                        transition-all duration-200
                      `}
                      style={{ 
                        boxShadow: isLastMove 
                          ? '0 0 0 2px rgba(251, 191, 36, 1), 0 0 15px rgba(251, 191, 36, 0.7)'
                          : (isOccupied ? cellGlow : 'none'),
                        transform: isLastMove ? 'scale(1.08)' : 'scale(1)'
                      }}
                    >
                      {/* Cell shine */}
                      {isOccupied && (
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/20" />
                      )}
                      
                      {/* Move number with player indicator */}
                      {showMoveNumber && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex flex-col items-center">
                            {/* Player color dot */}
                            <div 
                              className={`w-1.5 h-1.5 rounded-full mb-0.5 ${
                                player === 1 ? 'bg-cyan-400' : 'bg-pink-400'
                              }`}
                              style={{ 
                                boxShadow: player === 1 
                                  ? '0 0 4px rgba(34, 211, 238, 0.8)' 
                                  : '0 0 4px rgba(236, 72, 153, 0.8)'
                              }}
                            />
                            {/* Move number */}
                            <span 
                              className={`
                                text-[9px] font-bold leading-none
                                ${isLastMove 
                                  ? 'text-amber-300' 
                                  : 'text-white/90'
                                }
                              `}
                              style={{ 
                                textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                              }}
                            >
                              {cellInfo.moveNumber}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Last move badge */}
                      {isLastMove && showMoveNumber && (
                        <div className="absolute -top-0.5 -right-0.5 bg-amber-500 text-[6px] font-bold text-slate-900 px-1 rounded-sm">
                          LAST
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Player Legend - Shows which color is which player */}
            <div className="flex justify-center gap-6 mt-2 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-cyan-400" style={{ boxShadow: '0 0 6px rgba(34, 211, 238, 0.6)' }} />
                <span className="text-cyan-400">{p1Name}</span>
                <span className="text-slate-500">(odd moves)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-pink-400" style={{ boxShadow: '0 0 6px rgba(236, 72, 153, 0.6)' }} />
                <span className="text-pink-400">{p2Name}</span>
                <span className="text-slate-500">(even moves)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Playback Controls - Compact */}
      {moveHistory.length > 0 && !isLoadingMoves && (
        <div className="bg-slate-900 border-t border-slate-700 px-3 py-2 flex-shrink-0">
          <div className="max-w-md mx-auto space-y-2">
            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-6 font-mono">
                {showingFinalWithNumbers ? '●' : displayMoveNumber}
              </span>
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-200"
                  style={{ 
                    width: showingFinalWithNumbers 
                      ? '100%' 
                      : `${((currentMoveIndex + 1) / moveHistory.length) * 100}%` 
                  }}
                />
              </div>
              <span className="text-xs text-slate-500 w-6 text-right font-mono">
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
                onClick={handlePrev}
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                title="Previous move"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handlePlayPause}
                className="p-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/30"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <button
                onClick={handleNext}
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                title="Next move"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={handleLast}
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                title="Final board"
              >
                <SkipForward size={16} />
              </button>
            </div>

            {/* Speed control */}
            <div className="flex items-center justify-center gap-1.5 text-[10px]">
              <span className="text-slate-500">Speed:</span>
              {[
                { speed: 2000, label: '0.5x' }, 
                { speed: 1000, label: '1x' }, 
                { speed: 500, label: '2x' },
                { speed: 250, label: '4x' }
              ].map(({ speed, label }) => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-2 py-0.5 rounded-full transition-all ${
                    playbackSpeed === speed 
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' 
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Close button - Only show when no playback controls */}
      {(isLoadingMoves || moveHistory.length === 0) && (
        <div className="bg-slate-900 border-t border-slate-700 p-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full max-w-md mx-auto block py-2.5 bg-slate-800 text-slate-300 rounded-lg font-medium hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      )}

      {/* CSS for last move highlight */}
      <style>{`
        .last-move-highlight {
          animation: last-move-pulse 1.5s ease-in-out infinite;
        }
        
        @keyframes last-move-pulse {
          0%, 100% { 
            box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.9), 0 0 12px rgba(251, 191, 36, 0.5);
          }
          50% { 
            box-shadow: 0 0 0 3px rgba(251, 191, 36, 1), 0 0 20px rgba(251, 191, 36, 0.7);
          }
        }
      `}</style>
    </div>
  );
};

export default FinalBoardView;
