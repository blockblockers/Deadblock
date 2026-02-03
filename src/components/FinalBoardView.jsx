// FinalBoardView.jsx - Game replay with move order display
// v7.14 - COMPLETE REWRITE
// 
// FIXES:
// ✅ Proper piece colors - uses pieceColors from pieces.js (same as GameBoard)
// ✅ Larger board - matches GameBoard cell sizing (w-9 h-9 sm:w-12 sm:h-12)
// ✅ Move numbers displayed on pieces in final view
// ✅ Replay works correctly - pieces appear when pressing play
// ✅ Minimal padding - board fills screen properly
// ✅ Player indicators with tier icons

import { useState, useEffect, useMemo, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, SkipBack, SkipForward, Play, Pause, Loader, Film, Trophy } from 'lucide-react';
import { BOARD_SIZE, getPieceCoords } from '../utils/gameLogic';
import { pieceColors } from '../utils/pieces';
import { soundManager } from '../utils/soundManager';
import { ratingService } from '../services/ratingService';
import TierIcon from './TierIcon';

const FinalBoardView = ({ 
  board, 
  boardPieces, 
  moveHistory = [],
  isLoadingMoves = false,
  player1 = null,
  player2 = null,
  player1Name = 'Player 1',
  player2Name = 'Player 2',
  player1Rating = 1200,
  player2Rating = 1200,
  winner = null,
  winnerId = null,
  gameDate = null,
  onClose 
}) => {
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1); // -1 = show final with numbers
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(500);

  // Extract player info
  const p1Name = player1?.username || player1?.display_name || player1Name;
  const p2Name = player2?.username || player2?.display_name || player2Name;
  const p1Rating = player1?.elo_rating || player1?.rating || player1Rating || 1200;
  const p2Rating = player2?.elo_rating || player2?.rating || player2Rating || 1200;
  const p1Id = player1?.id;
  const p2Id = player2?.id;

  const isP1Winner = winner === 'player1' || winnerId === p1Id;
  const isP2Winner = winner === 'player2' || winnerId === p2Id;

  const p1Tier = ratingService.getRatingTier(p1Rating);
  const p2Tier = ratingService.getRatingTier(p2Rating);

  // Helper to get piece name from boardPieces (handles both object and array formats)
  const getPieceName = useCallback((rowIdx, colIdx, piecesData) => {
    if (!piecesData) return null;
    // Object format: { "row,col": "T", ... }
    if (typeof piecesData === 'object' && !Array.isArray(piecesData)) {
      return piecesData[`${rowIdx},${colIdx}`] || null;
    }
    // Array format: [[null, "T", ...], ...]
    if (Array.isArray(piecesData) && piecesData[rowIdx]) {
      return piecesData[rowIdx][colIdx] || null;
    }
    return null;
  }, []);

  // Validate board - convert 0 to null for consistency
  const safeBoard = useMemo(() => {
    if (Array.isArray(board) && board.length === BOARD_SIZE) {
      return board.map(row => 
        Array.isArray(row) ? row.map(cell => (cell === 0 ? null : cell)) : Array(BOARD_SIZE).fill(null)
      );
    }
    return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  }, [board]);

  // Normalize boardPieces to object format
  const safeBoardPieces = useMemo(() => {
    if (!boardPieces) return {};
    if (typeof boardPieces === 'object' && !Array.isArray(boardPieces)) {
      return boardPieces;
    }
    // Convert array format to object format
    if (Array.isArray(boardPieces)) {
      const obj = {};
      boardPieces.forEach((row, ri) => {
        if (Array.isArray(row)) {
          row.forEach((piece, ci) => {
            if (piece) obj[`${ri},${ci}`] = piece;
          });
        }
      });
      return obj;
    }
    return {};
  }, [boardPieces]);

  // Build cell info map from moveHistory for final view numbers
  const cellInfoMap = useMemo(() => {
    const map = {};
    
    if (!moveHistory || moveHistory.length === 0) {
      // No move history - use boardPieces to estimate move numbers
      let moveNum = 1;
      Object.entries(safeBoardPieces).forEach(([key, pieceType]) => {
        map[key] = {
          moveNumber: moveNum,
          pieceType,
          isLastMove: false
        };
        moveNum++;
      });
      // Mark last one
      const keys = Object.keys(map);
      if (keys.length > 0) {
        map[keys[keys.length - 1]].isLastMove = true;
      }
      return map;
    }

    moveHistory.forEach((move, idx) => {
      const moveNum = move.move_number || (idx + 1);
      const piece = move.piece_type;
      const row = move.row;
      const col = move.col;
      const rot = move.rotation || 0;
      const flip = move.flipped || false;

      if (piece === undefined || row === undefined || col === undefined) return;

      try {
        const coords = getPieceCoords(piece, rot, flip);
        if (coords) {
          coords.forEach(([dx, dy]) => {
            const r = row + dy;
            const c = col + dx;
            if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
              map[`${r},${c}`] = {
                moveNumber: moveNum,
                pieceType: piece,
                isLastMove: idx === moveHistory.length - 1
              };
            }
          });
        }
      } catch (e) {
        console.error('[FinalBoardView] Error processing move:', e);
      }
    });

    return map;
  }, [moveHistory, safeBoardPieces]);

  // Build board states for step-by-step replay
  const boardStates = useMemo(() => {
    // State 0: empty board
    const emptyBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    const states = [{ board: emptyBoard, pieces: {} }];

    if (!moveHistory || moveHistory.length === 0) {
      // No move history - just show final state
      return [{ board: safeBoard, pieces: safeBoardPieces }];
    }

    let curBoard = emptyBoard.map(row => [...row]);
    let curPieces = {};

    moveHistory.forEach((move, idx) => {
      const piece = move.piece_type;
      const row = move.row;
      const col = move.col;
      const rot = move.rotation || 0;
      const flip = move.flipped || false;
      const player = (idx % 2) + 1;

      if (piece === undefined || row === undefined || col === undefined) {
        states.push({ board: curBoard.map(r => [...r]), pieces: { ...curPieces } });
        return;
      }

      try {
        const coords = getPieceCoords(piece, rot, flip);
        if (coords) {
          // Create new board/pieces objects (immutable update)
          curBoard = curBoard.map(r => [...r]);
          curPieces = { ...curPieces };
          
          coords.forEach(([dx, dy]) => {
            const r = row + dy;
            const c = col + dx;
            if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
              curBoard[r][c] = player;
              curPieces[`${r},${c}`] = piece; // Store piece type!
            }
          });
        }
      } catch (e) {
        console.error('[FinalBoardView] Error building state:', e);
      }

      states.push({ board: curBoard.map(r => [...r]), pieces: { ...curPieces } });
    });

    return states;
  }, [moveHistory, safeBoard, safeBoardPieces]);

  // Playback timer
  useEffect(() => {
    if (!isPlaying) return;
    if (moveHistory.length === 0 && Object.keys(safeBoardPieces).length === 0) return;
    
    const maxMoves = moveHistory.length > 0 ? moveHistory.length : Object.keys(safeBoardPieces).length;
    
    const timer = setInterval(() => {
      setCurrentMoveIndex(prev => {
        if (prev >= maxMoves - 1) {
          setIsPlaying(false);
          return -1; // Back to final view with numbers
        }
        soundManager.playClickSound?.('click');
        return prev + 1;
      });
    }, playbackSpeed);
    
    return () => clearInterval(timer);
  }, [isPlaying, moveHistory.length, safeBoardPieces, playbackSpeed]);

  // Get total moves count
  const totalMoves = moveHistory.length > 0 ? moveHistory.length : Object.keys(safeBoardPieces).length;

  // Controls
  const play = useCallback(() => {
    soundManager.playButtonClick?.();
    if (currentMoveIndex === -1 || currentMoveIndex >= totalMoves - 1) {
      setCurrentMoveIndex(0);
    }
    setIsPlaying(true);
  }, [currentMoveIndex, totalMoves]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    soundManager.playButtonClick?.();
  }, []);

  const prev = useCallback(() => {
    setIsPlaying(false);
    soundManager.playButtonClick?.();
    setCurrentMoveIndex(i => i === -1 ? totalMoves - 1 : i === 0 ? -1 : i - 1);
  }, [totalMoves]);

  const next = useCallback(() => {
    setIsPlaying(false);
    soundManager.playButtonClick?.();
    setCurrentMoveIndex(i => i === -1 ? 0 : i >= totalMoves - 1 ? -1 : i + 1);
  }, [totalMoves]);

  const first = useCallback(() => {
    setIsPlaying(false);
    soundManager.playButtonClick?.();
    setCurrentMoveIndex(0);
  }, []);

  const last = useCallback(() => {
    setIsPlaying(false);
    soundManager.playButtonClick?.();
    setCurrentMoveIndex(-1);
  }, []);

  // Current display state
  const showFinal = currentMoveIndex === -1;
  const stateIdx = showFinal ? boardStates.length - 1 : Math.min(currentMoveIndex + 1, boardStates.length - 1);
  const currentState = boardStates[stateIdx] || { board: safeBoard, pieces: safeBoardPieces };

  const dateStr = gameDate ? new Date(gameDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
      {/* HEADER - Minimal */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 border-b border-purple-500/30 flex-shrink-0">
        <button 
          onClick={onClose} 
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
        >
          <X size={22} />
        </button>
        <div className="flex items-center gap-2">
          <Film size={16} className="text-purple-400" />
          <span className="text-purple-400 font-medium">Replay</span>
          {dateStr && <span className="text-slate-500 text-sm">• {dateStr}</span>}
        </div>
        <div className="w-9" />
      </div>

      {/* PLAYERS BAR - Compact */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/60 flex-shrink-0">
        {/* Player 1 */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <div 
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ 
                background: `linear-gradient(135deg, ${p1Tier.glowColor}40, transparent)`,
                boxShadow: isP1Winner ? `0 0 10px ${p1Tier.glowColor}` : 'none'
              }}
            >
              <TierIcon shape={p1Tier.shape} glowColor={p1Tier.glowColor} size="small" />
            </div>
            {isP1Winner && <Trophy size={10} className="absolute -top-1 -right-1 text-amber-400" />}
          </div>
          <div>
            <div className={`font-bold text-xs ${isP1Winner ? 'text-amber-400' : 'text-white'}`}>{p1Name}</div>
            <div className="text-slate-500 text-[10px]">{p1Rating}</div>
          </div>
        </div>

        <span className="text-slate-600 font-black text-xs">VS</span>

        {/* Player 2 */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className={`font-bold text-xs ${isP2Winner ? 'text-amber-400' : 'text-white'}`}>{p2Name}</div>
            <div className="text-slate-500 text-[10px]">{p2Rating}</div>
          </div>
          <div className="relative">
            <div 
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ 
                background: `linear-gradient(135deg, ${p2Tier.glowColor}40, transparent)`,
                boxShadow: isP2Winner ? `0 0 10px ${p2Tier.glowColor}` : 'none'
              }}
            >
              <TierIcon shape={p2Tier.shape} glowColor={p2Tier.glowColor} size="small" />
            </div>
            {isP2Winner && <Trophy size={10} className="absolute -top-1 -right-1 text-amber-400" />}
          </div>
        </div>
      </div>

      {/* STATUS LINE */}
      <div className="text-center py-1 bg-slate-900/50 border-b border-slate-700/30 flex-shrink-0">
        {showFinal ? (
          <span className="text-amber-400 font-medium text-xs">
            {(isP1Winner || isP2Winner) ? `🏆 ${isP1Winner ? p1Name : p2Name} wins!` : 'Final'} 
            <span className="text-slate-400 ml-2">• {totalMoves} moves</span>
          </span>
        ) : (
          <span className="text-slate-300 text-xs">
            Move <span className="text-white font-bold">{currentMoveIndex + 1}</span>
            <span className="text-slate-500">/{totalMoves}</span>
          </span>
        )}
      </div>

      {/* BOARD AREA - Content at top, scrollable if needed */}
      <div className="flex-1 flex flex-col items-center justify-start p-2 min-h-0 overflow-auto">
        {isLoadingMoves ? (
          <div className="text-center py-8">
            <Loader size={32} className="text-purple-400 animate-spin mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Loading game...</p>
          </div>
        ) : (
          /* Board Grid - Matches GameBoard sizing exactly */
          <div 
            className="grid grid-cols-8 gap-0.5 sm:gap-1 p-1.5 sm:p-2 rounded-lg bg-slate-800/60 backdrop-blur-sm border border-purple-500/40"
            style={{
              boxShadow: '0 0 30px rgba(147,51,234,0.15), inset 0 0 20px rgba(0,0,0,0.2)',
            }}
          >
            {currentState.board.map((row, rowIdx) =>
              row.map((cellValue, colIdx) => {
                const key = `${rowIdx}-${colIdx}`;
                const isOccupied = cellValue !== null && cellValue !== 0;
                
                // Get piece name from current state's pieces
                const pieceName = getPieceName(rowIdx, colIdx, currentState.pieces);
                
                // Get piece-specific color or fallback to player color
                const pieceColor = pieceName ? pieceColors[pieceName] : null;
                
                // Get cell info for move numbers (only in final view)
                const cellInfo = showFinal ? cellInfoMap[`${rowIdx},${colIdx}`] : null;
                const isLastMove = cellInfo?.isLastMove;
                
                return (
                  <div
                    key={key}
                    className={`
                      w-9 h-9 sm:w-12 sm:h-12 rounded-md sm:rounded-lg relative
                      transition-all duration-150 overflow-hidden
                      ${isOccupied 
                        ? `${pieceColor || (cellValue === 1 
                            ? 'bg-gradient-to-br from-cyan-400 via-cyan-500 to-blue-600' 
                            : 'bg-gradient-to-br from-pink-400 via-pink-500 to-rose-600'
                          )} shadow-lg` 
                        : 'bg-slate-700/50'
                      }
                      ${isLastMove ? 'ring-2 ring-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]' : ''}
                    `}
                  >
                    {/* Scan line effect for placed pieces */}
                    {isOccupied && (
                      <div className="absolute inset-0 opacity-30 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.1)_2px,rgba(255,255,255,0.1)_4px)]" />
                    )}
                    
                    {/* Move number overlay - only in final view */}
                    {showFinal && cellInfo && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span 
                          className={`
                            font-black text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]
                            ${cellInfo.moveNumber > 9 ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm'}
                          `}
                          style={{
                            textShadow: '0 0 6px rgba(0,0,0,1), 0 2px 4px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,1)'
                          }}
                        >
                          {cellInfo.moveNumber}
                        </span>
                      </div>
                    )}
                    
                    {/* Last move indicator */}
                    {isLastMove && (
                      <div className="absolute top-0 right-0 bg-amber-500 text-[5px] sm:text-[6px] font-bold px-0.5 rounded-bl text-black">
                        LAST
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* CONTROLS - Fixed at bottom */}
      <div className="bg-slate-900/90 border-t border-purple-500/30 px-3 py-2 flex-shrink-0">
        {/* Progress bar */}
        {totalMoves > 0 && (
          <div className="mb-2">
            <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-200"
                style={{ 
                  width: showFinal 
                    ? '100%' 
                    : `${((currentMoveIndex + 1) / totalMoves) * 100}%` 
                }}
              />
            </div>
          </div>
        )}
        
        {/* Control buttons */}
        <div className="flex items-center justify-center gap-1 sm:gap-2">
          <button
            onClick={first}
            disabled={totalMoves === 0}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-30"
          >
            <SkipBack size={16} />
          </button>
          
          <button
            onClick={prev}
            disabled={totalMoves === 0}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-30"
          >
            <ChevronLeft size={20} />
          </button>
          
          <button
            onClick={isPlaying ? pause : play}
            disabled={totalMoves === 0}
            className={`
              p-2.5 sm:p-3 rounded-full transition-all
              ${isPlaying 
                ? 'bg-pink-600 text-white shadow-[0_0_15px_rgba(236,72,153,0.5)]' 
                : 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]'
              }
              hover:scale-105 disabled:opacity-30 disabled:hover:scale-100
            `}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
          </button>
          
          <button
            onClick={next}
            disabled={totalMoves === 0}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-30"
          >
            <ChevronRight size={20} />
          </button>
          
          <button
            onClick={last}
            disabled={totalMoves === 0}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-30"
          >
            <SkipForward size={16} />
          </button>
        </div>
        
        {/* Speed control */}
        {totalMoves > 0 && (
          <div className="flex items-center justify-center gap-2 mt-1.5">
            <span className="text-slate-500 text-[10px]">Speed:</span>
            {[
              { label: '0.5x', value: 1000 },
              { label: '1x', value: 500 },
              { label: '2x', value: 250 },
            ].map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setPlaybackSpeed(value)}
                className={`
                  px-2 py-0.5 text-[10px] rounded transition-all
                  ${playbackSpeed === value 
                    ? 'bg-purple-600 text-white' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FinalBoardView;
