// FinalBoardView.jsx - Display final board state with SpectatorView-like styling
// v7.8 FIXES:
// - Correct ELO scores from game data
// - Piece-specific colors (not just cyan/orange)
// - Clear move order with last piece prominently highlighted
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
 * v7.8 Features:
 * - Player panels with tier icons and CORRECT ELO ratings
 * - Piece-specific colors from pieceColors map
 * - Move numbers clearly visible
 * - Last move prominently highlighted with golden glow
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
  const p1Name = player1?.username || player1Name;
  const p2Name = player2?.username || player2Name;
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

      if (pieceType === undefined || anchorRow === undefined || anchorCol === undefined) return;

      try {
        const coords = getPieceCoords(pieceType, rotation, flipped);
        if (coords && coords.length > 0) {
          coords.forEach(([dx, dy]) => {
            const cellRow = anchorRow + dy;
            const cellCol = anchorCol + dx; // FIXED: was colIdx (bug)
            if (cellRow >= 0 && cellRow < BOARD_SIZE && cellCol >= 0 && cellCol < BOARD_SIZE) {
              cellMap[`${cellRow},${cellCol}`] = {
                moveNumber,
                player: (index % 2) + 1,
                pieceType,
                isLastMove: moveNumber === moveHistory.length
              };
            }
          });
        }
      } catch (e) {
        // Skip invalid moves
      }
    });

    return cellMap;
  }, [moveHistory]);

  // Build board states for replay
  const boardStates = useMemo(() => {
    if (!moveHistory || moveHistory.length === 0) {
      return [{ board: safeBoard, boardPieces: safeBoardPieces }];
    }

    const states = [];
    let currentBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    let currentBoardPieces = {};

    // Initial empty state
    states.push({ board: currentBoard.map(r => [...r]), boardPieces: {} });

    moveHistory.forEach((move, index) => {
      if (move.board_state?.board) {
        currentBoard = move.board_state.board.map(r => [...r]);
        currentBoardPieces = { ...move.board_state.boardPieces };
      } else {
        const pieceType = move.piece_type;
        const anchorRow = move.row;
        const anchorCol = move.col;
        const rotation = move.rotation || 0;
        const flipped = move.flipped || false;
        const playerNum = (index % 2) + 1;

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
          // Skip
        }
      }

      states.push({
        board: currentBoard.map(r => [...r]),
        boardPieces: { ...currentBoardPieces }
      });
    });

    return states;
  }, [moveHistory, safeBoard, safeBoardPieces]);

  // Playback logic
  useEffect(() => {
    if (!isPlaying || moveHistory.length === 0) return;

    const interval = setInterval(() => {
      setCurrentMoveIndex(prev => {
        if (prev >= moveHistory.length - 1) {
          setIsPlaying(false);
          return -1;
        }
        return prev + 1;
      });
    }, playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, moveHistory.length]);

  // Control handlers
  const handlePlayPause = () => {
    if (moveHistory.length === 0) return;
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

  // Current player for replay (whose turn it would be after this move)
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
      {/* Header - Like SpectatorView */}
      <div className="bg-slate-900 border-b border-purple-500/30 p-4 flex-shrink-0">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
          
          <div className="flex items-center gap-2 text-purple-400">
            <Film size={20} />
            <span className="font-medium">Game Replay</span>
            <span className="flex items-center gap-1 text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
              <Clock size={10} /> REPLAY
            </span>
          </div>
          
          <div className="w-10" /> {/* Spacer for balance */}
        </div>
      </div>

      {/* Players Panel - Shows CORRECT ELO ratings */}
      <div className="bg-slate-800/50 p-3 flex-shrink-0">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {/* Player 1 */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${hexToRgba(player1Tier.glowColor, 0.3)}, ${hexToRgba(player1Tier.glowColor, 0.1)})`,
                  border: `2px solid ${hexToRgba(player1Tier.glowColor, 0.5)}`
                }}
              >
                <TierIcon shape={player1Tier.shape} glowColor={player1Tier.glowColor} size="medium" />
              </div>
              {isPlayer1Winner && (
                <div className="absolute -top-1 -right-1 text-amber-400">
                  <Trophy size={14} />
                </div>
              )}
            </div>
            <div>
              <div className={`font-medium text-sm ${isPlayer1Winner ? 'text-amber-300' : 'text-cyan-400'}`}>
                {p1Name}
                {isPlayer1Winner && ' 👑'}
              </div>
              <div 
                className="text-xs font-medium"
                style={{ color: hexToRgba(player1Tier.glowColor, 0.9) }}
              >
                {p1Rating} ELO
              </div>
            </div>
          </div>

          {/* VS / Result */}
          <div className="text-center">
            <div className="text-slate-600 font-bold text-lg">VS</div>
            {formattedDate && (
              <div className="text-slate-600 text-[10px]">{formattedDate}</div>
            )}
          </div>

          {/* Player 2 */}
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className={`font-medium text-sm ${isPlayer2Winner ? 'text-amber-300' : 'text-pink-400'}`}>
                {isPlayer2Winner && '👑 '}
                {p2Name}
              </div>
              <div 
                className="text-xs font-medium"
                style={{ color: hexToRgba(player2Tier.glowColor, 0.9) }}
              >
                {p2Rating} ELO
              </div>
            </div>
            <div className="relative">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${hexToRgba(player2Tier.glowColor, 0.3)}, ${hexToRgba(player2Tier.glowColor, 0.1)})`,
                  border: `2px solid ${hexToRgba(player2Tier.glowColor, 0.5)}`
                }}
              >
                <TierIcon shape={player2Tier.shape} glowColor={player2Tier.glowColor} size="medium" />
              </div>
              {isPlayer2Winner && (
                <div className="absolute -top-1 -left-1 text-amber-400">
                  <Trophy size={14} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-slate-800/30 p-2 text-center flex-shrink-0 border-b border-slate-700/50">
        {isLoadingMoves ? (
          <span className="text-slate-400 flex items-center justify-center gap-2">
            <Loader size={14} className="animate-spin" />
            Loading game data...
          </span>
        ) : showingFinalWithNumbers ? (
          <span className="text-amber-400 font-medium">
            Game Over - {isPlayer1Winner ? p1Name : isPlayer2Winner ? p2Name : 'Winner'} wins! • {moveHistory.length} moves
          </span>
        ) : (
          <span className="text-slate-300">
            Move {displayMoveNumber} of {moveHistory.length} •{' '}
            <span className={currentPlayer === 1 ? 'text-cyan-400' : 'text-pink-400'}>
              {currentPlayer === 1 ? p1Name : p2Name}
            </span>'s move
          </span>
        )}
      </div>

      {/* Game Board */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        {isLoadingMoves ? (
          <div className="text-center">
            <Loader size={48} className="text-purple-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading game replay...</p>
          </div>
        ) : (
          <div className="w-full max-w-md">
            {/* Board grid with piece-specific colors */}
            <div 
              className="grid grid-cols-8 gap-1 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50"
              style={{ 
                boxShadow: '0 0 30px rgba(0,0,0,0.4), inset 0 0 20px rgba(0,0,0,0.2)',
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
                  
                  // Get piece type - from cellInfo (move history) or displayBoardPieces
                  const pieceType = cellInfo?.pieceType || getPieceType(rowIdx, colIdx);
                  
                  // Use PIECE-SPECIFIC colors (like the main game board)
                  let cellBg = 'bg-slate-700/30';
                  let cellGlow = '';
                  
                  if (isOccupied && pieceType && pieceColors[pieceType]) {
                    // Use the specific piece color from pieceColors
                    cellBg = pieceColors[pieceType];
                    cellGlow = '0 0 8px rgba(255, 255, 255, 0.15)';
                  } else if (isOccupied) {
                    // Fallback to player colors if piece type unknown
                    if (cellValue === 1) {
                      cellBg = 'bg-gradient-to-br from-cyan-400 to-cyan-600';
                      cellGlow = '0 0 10px rgba(34, 211, 238, 0.4)';
                    } else {
                      cellBg = 'bg-gradient-to-br from-orange-400 to-orange-600';
                      cellGlow = '0 0 10px rgba(249, 115, 22, 0.4)';
                    }
                  }
                  
                  return (
                    <div
                      key={key}
                      className={`
                        aspect-square rounded-md relative overflow-hidden
                        ${cellBg}
                        ${isLastMove ? 'last-move-highlight z-10' : ''}
                        transition-all duration-200
                      `}
                      style={{ 
                        boxShadow: isLastMove 
                          ? '0 0 0 3px rgba(251, 191, 36, 0.9), 0 0 20px rgba(251, 191, 36, 0.6), 0 0 40px rgba(251, 191, 36, 0.3)'
                          : (isOccupied ? cellGlow : 'none'),
                        transform: isLastMove ? 'scale(1.05)' : 'scale(1)'
                      }}
                    >
                      {/* Cell shine */}
                      {isOccupied && (
                        <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-black/25" />
                      )}
                      
                      {/* Move number with better visibility */}
                      {showMoveNumber && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span 
                            className={`
                              font-bold rounded shadow-md
                              ${isLastMove 
                                ? 'bg-amber-500 text-amber-950 text-sm sm:text-base px-1.5 py-0.5 animate-pulse' 
                                : 'bg-black/50 text-white text-[9px] sm:text-[10px] px-1 py-0.5'
                              }
                            `}
                          >
                            {cellInfo.moveNumber}
                          </span>
                        </div>
                      )}
                      
                      {/* Last move shimmer effect */}
                      {isLastMove && (
                        <div className="absolute inset-0 last-move-shimmer" />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Legend */}
            <div className="mt-4 space-y-2">
              {/* Player legend */}
              <div className="flex justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                  <span className={isPlayer1Winner ? 'text-amber-300 font-bold' : 'text-slate-400'}>
                    {p1Name} {isPlayer1Winner && '👑'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gradient-to-br from-orange-400 to-orange-600 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                  <span className={isPlayer2Winner ? 'text-amber-300 font-bold' : 'text-slate-400'}>
                    {p2Name} {isPlayer2Winner && '👑'}
                  </span>
                </div>
              </div>
              
              {/* Move info legend */}
              {showingFinalWithNumbers && moveHistory.length > 0 && (
                <div className="flex justify-center items-center gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <span className="bg-black/50 text-white px-1.5 py-0.5 rounded text-[10px]">3</span>
                    <span>= Move #</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="bg-amber-500 text-amber-950 px-1.5 py-0.5 rounded text-[10px] font-bold animate-pulse">{moveHistory.length}</span>
                    <span>= Last move</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Playback Controls - Like a media player */}
      {!isLoadingMoves && moveHistory.length > 0 && (
        <div className="bg-slate-900 border-t border-purple-500/30 p-4 flex-shrink-0">
          <div className="max-w-md mx-auto space-y-3">
            {/* Progress bar */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-8 text-center font-mono">
                {showingFinalWithNumbers ? '●' : displayMoveNumber}
              </span>
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-200"
                  style={{ 
                    width: showingFinalWithNumbers 
                      ? '100%' 
                      : `${((currentMoveIndex + 1) / moveHistory.length) * 100}%` 
                  }}
                />
              </div>
              <span className="text-xs text-slate-500 w-8 text-right font-mono">
                {moveHistory.length}
              </span>
            </div>

            {/* Control buttons */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleFirst}
                className="p-2.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                title="First move"
              >
                <SkipBack size={18} />
              </button>
              <button
                onClick={handlePrev}
                className="p-2.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                title="Previous move"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={handlePlayPause}
                className="p-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/30"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>
              <button
                onClick={handleNext}
                className="p-2.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                title="Next move"
              >
                <ChevronRight size={18} />
              </button>
              <button
                onClick={handleLast}
                className="p-2.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                title="Final board"
              >
                <SkipForward size={18} />
              </button>
            </div>

            {/* Speed control */}
            <div className="flex items-center justify-center gap-2 text-xs">
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
                  className={`px-2.5 py-1 rounded-full transition-all ${
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
        <div className="bg-slate-900 border-t border-slate-700 p-4 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full max-w-md mx-auto block py-3 bg-slate-800 text-slate-300 rounded-lg font-medium hover:bg-slate-700 transition-colors"
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
            box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.9), 0 0 20px rgba(251, 191, 36, 0.6);
          }
          50% { 
            box-shadow: 0 0 0 4px rgba(251, 191, 36, 1), 0 0 30px rgba(251, 191, 36, 0.8), 0 0 50px rgba(251, 191, 36, 0.4);
          }
        }
        
        .last-move-shimmer {
          background: linear-gradient(
            135deg,
            transparent 0%,
            transparent 30%,
            rgba(251, 191, 36, 0.3) 45%,
            rgba(251, 191, 36, 0.5) 50%,
            rgba(251, 191, 36, 0.3) 55%,
            transparent 70%,
            transparent 100%
          );
          background-size: 300% 300%;
          animation: last-move-sweep 2s ease-in-out infinite;
        }
        
        @keyframes last-move-sweep {
          0% { background-position: 100% 100%; }
          100% { background-position: -100% -100%; }
        }
      `}</style>
    </div>
  );
};

export default FinalBoardView;
