// FinalBoardView.jsx - Game replay with move order display
// v7.12 - FIXES:
// ✅ Correct ELO display from player objects
// ✅ Correct tier icons from ratings
// ✅ Minimal padding - board fills available space
// ✅ Move numbers visible on each cell
// ✅ Final move highlighted with golden glow + FINAL badge
// ✅ Player legend showing move pattern

import { useState, useEffect, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, SkipBack, SkipForward, Play, Pause, Loader, Film, Trophy } from 'lucide-react';
import { BOARD_SIZE, getPieceCoords } from '../utils/gameLogic';
import { pieceColors } from '../utils/pieces';
import { soundManager } from '../utils/soundManager';
import { ratingService } from '../services/ratingService';
import TierIcon from './TierIcon';

const hexToRgba = (hex, alpha) => {
  if (!hex || !hex.startsWith('#')) return `rgba(100, 116, 139, ${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

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
  const [playbackSpeed, setPlaybackSpeed] = useState(800);

  // Extract player info - prioritize player objects, fallback to props
  const p1Name = player1?.display_name || player1?.username || player1Name;
  const p2Name = player2?.display_name || player2?.username || player2Name;
  const p1Rating = player1?.rating || player1?.elo_rating || player1Rating || 1200;
  const p2Rating = player2?.rating || player2?.elo_rating || player2Rating || 1200;
  const p1Id = player1?.id;
  const p2Id = player2?.id;

  // Determine winner
  const isP1Winner = winner === 'player1' || winnerId === p1Id;
  const isP2Winner = winner === 'player2' || winnerId === p2Id;

  // Get tier info from ratings
  const p1Tier = ratingService.getRatingTier(p1Rating);
  const p2Tier = ratingService.getRatingTier(p2Rating);

  // Validate board
  const safeBoard = useMemo(() => {
    if (Array.isArray(board) && board.length === BOARD_SIZE) {
      return board.map(row => row.map(cell => cell === 0 ? null : cell));
    }
    return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  }, [board]);

  const safeBoardPieces = useMemo(() => {
    return boardPieces && typeof boardPieces === 'object' ? boardPieces : {};
  }, [boardPieces]);

  // Build cell info map: { "row,col": { moveNumber, player, pieceType, isLastMove } }
  const cellInfoMap = useMemo(() => {
    const map = {};
    if (!moveHistory || moveHistory.length === 0) return map;

    moveHistory.forEach((move, idx) => {
      const moveNum = move.move_number || (idx + 1);
      const piece = move.piece_type;
      const row = move.row;
      const col = move.col;
      const rot = move.rotation || 0;
      const flip = move.flipped || false;
      const player = (idx % 2) + 1; // P1=odd moves (1,3,5), P2=even moves (2,4,6)

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
                player,
                pieceType: piece,
                isLastMove: idx === moveHistory.length - 1
              };
            }
          });
        }
      } catch (e) {
        console.warn('[FinalBoardView] Error processing move:', e);
      }
    });

    return map;
  }, [moveHistory]);

  // Build board states for step-by-step replay
  const boardStates = useMemo(() => {
    const states = [{ 
      board: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)), 
      pieces: {} 
    }];

    if (!moveHistory || moveHistory.length === 0) {
      return [{ board: safeBoard, pieces: safeBoardPieces }];
    }

    let curBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
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
          curBoard = curBoard.map(r => [...r]);
          curPieces = { ...curPieces };
          coords.forEach(([dx, dy]) => {
            const r = row + dy;
            const c = col + dx;
            if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
              curBoard[r][c] = player;
              curPieces[`${r},${c}`] = piece;
            }
          });
        }
      } catch (e) {}

      states.push({ board: curBoard.map(r => [...r]), pieces: { ...curPieces } });
    });

    return states;
  }, [moveHistory, safeBoard, safeBoardPieces]);

  // Playback timer
  useEffect(() => {
    if (!isPlaying || moveHistory.length === 0) return;
    const timer = setInterval(() => {
      setCurrentMoveIndex(prev => {
        if (prev >= moveHistory.length - 1) {
          setIsPlaying(false);
          return -1; // Back to final view
        }
        return prev + 1;
      });
    }, playbackSpeed);
    return () => clearInterval(timer);
  }, [isPlaying, moveHistory.length, playbackSpeed]);

  // Controls
  const play = () => {
    soundManager.playButtonClick?.();
    if (currentMoveIndex === -1 || currentMoveIndex >= moveHistory.length - 1) {
      setCurrentMoveIndex(0);
    }
    setIsPlaying(true);
  };
  const pause = () => { setIsPlaying(false); soundManager.playButtonClick?.(); };
  const prev = () => {
    setIsPlaying(false);
    soundManager.playButtonClick?.();
    setCurrentMoveIndex(i => i === -1 ? moveHistory.length - 1 : i === 0 ? -1 : i - 1);
  };
  const next = () => {
    setIsPlaying(false);
    soundManager.playButtonClick?.();
    setCurrentMoveIndex(i => i === -1 ? 0 : i >= moveHistory.length - 1 ? -1 : i + 1);
  };
  const first = () => { setIsPlaying(false); soundManager.playButtonClick?.(); setCurrentMoveIndex(0); };
  const last = () => { setIsPlaying(false); soundManager.playButtonClick?.(); setCurrentMoveIndex(-1); };

  // Current display state
  const showFinal = currentMoveIndex === -1;
  const stateIdx = showFinal ? boardStates.length - 1 : Math.min(currentMoveIndex + 1, boardStates.length - 1);
  const state = boardStates[stateIdx] || { board: safeBoard, pieces: safeBoardPieces };

  const getInfo = (r, c) => cellInfoMap[`${r},${c}`];
  const getPiece = (r, c) => state.pieces[`${r},${c}`];

  const dateStr = gameDate ? new Date(gameDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
      {/* HEADER - Minimal */}
      <div className="flex items-center justify-between px-2 py-1 bg-slate-900 border-b border-purple-500/30">
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
          <X size={18} />
        </button>
        <div className="flex items-center gap-1.5">
          <Film size={12} className="text-purple-400" />
          <span className="text-purple-400 text-xs font-medium">Replay</span>
          {dateStr && <span className="text-slate-500 text-[10px]">• {dateStr}</span>}
        </div>
        <div className="w-6" />
      </div>

      {/* PLAYERS - Compact row */}
      <div className="flex items-center justify-between px-2 py-1 bg-slate-800/50 text-[11px]">
        {/* Player 1 */}
        <div className="flex items-center gap-1">
          <div className="relative w-5 h-5 rounded flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${hexToRgba(p1Tier.glowColor, 0.4)}, transparent)` }}>
            <TierIcon shape={p1Tier.shape} glowColor={p1Tier.glowColor} size="small" />
            {isP1Winner && <Trophy size={6} className="absolute -top-0.5 -right-0.5 text-amber-400" />}
          </div>
          <div className="leading-tight">
            <div className={`font-medium truncate max-w-[80px] ${isP1Winner ? 'text-amber-400' : 'text-white'}`}>{p1Name}</div>
            <div className="text-slate-500 text-[9px]">{p1Rating} ELO</div>
          </div>
        </div>
        
        <span className="text-slate-600 font-bold text-[10px]">VS</span>
        
        {/* Player 2 */}
        <div className="flex items-center gap-1">
          <div className="leading-tight text-right">
            <div className={`font-medium truncate max-w-[80px] ${isP2Winner ? 'text-amber-400' : 'text-white'}`}>{p2Name}</div>
            <div className="text-slate-500 text-[9px]">{p2Rating} ELO</div>
          </div>
          <div className="relative w-5 h-5 rounded flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${hexToRgba(p2Tier.glowColor, 0.4)}, transparent)` }}>
            <TierIcon shape={p2Tier.shape} glowColor={p2Tier.glowColor} size="small" />
            {isP2Winner && <Trophy size={6} className="absolute -top-0.5 -right-0.5 text-amber-400" />}
          </div>
        </div>
      </div>

      {/* STATUS */}
      <div className="text-center py-0.5 text-[10px] bg-slate-800/30">
        {showFinal ? (
          <span className="text-amber-400 font-medium">
            {(isP1Winner || isP2Winner) ? `🏆 ${isP1Winner ? p1Name : p2Name} wins!` : 'Final'} • {moveHistory.length} moves
          </span>
        ) : (
          <span className="text-slate-300">
            Move <span className="text-white font-bold">{currentMoveIndex + 1}</span>/{moveHistory.length}
          </span>
        )}
      </div>

      {/* BOARD - Fill remaining space */}
      <div className="flex-1 flex flex-col items-center justify-center p-1 min-h-0">
        {isLoadingMoves ? (
          <div className="text-center">
            <Loader size={24} className="text-purple-400 animate-spin mx-auto mb-1" />
            <p className="text-slate-400 text-xs">Loading moves...</p>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            {/* Grid - maximize size */}
            <div 
              className="grid grid-cols-8 gap-[1px] p-0.5 rounded-lg bg-slate-800/80 border border-slate-700/50"
              style={{ 
                width: 'min(95vw, 95vh - 140px, 360px)',
                aspectRatio: '1'
              }}
            >
              {state.board.map((row, ri) =>
                row.map((cell, ci) => {
                  const key = `${ri},${ci}`;
                  const info = showFinal ? getInfo(ri, ci) : null;
                  const occupied = cell !== null && cell !== 0;
                  const showNum = showFinal && info && moveHistory.length > 0;
                  const isLast = info?.isLastMove;
                  const player = info?.player || cell;
                  const piece = info?.pieceType || getPiece(ri, ci);
                  
                  // Cell background
                  let bg = 'bg-slate-700/40';
                  if (occupied && piece && pieceColors[piece]) {
                    bg = pieceColors[piece];
                  } else if (occupied) {
                    bg = cell === 1 ? 'bg-cyan-500' : 'bg-pink-500';
                  }

                  return (
                    <div
                      key={key}
                      className={`relative flex items-center justify-center ${bg} ${
                        isLast && showNum ? 'ring-2 ring-amber-400 ring-inset z-10' : ''
                      }`}
                      style={{
                        aspectRatio: '1',
                        boxShadow: isLast && showNum ? '0 0 12px rgba(251,191,36,0.6)' : undefined
                      }}
                    >
                      {/* Move number overlay */}
                      {showNum && (
                        <div className="flex flex-col items-center justify-center">
                          {/* Player dot */}
                          <div 
                            className={`w-1.5 h-1.5 rounded-full mb-0.5 ${player === 1 ? 'bg-cyan-300' : 'bg-pink-300'}`}
                            style={{ 
                              boxShadow: player === 1 ? '0 0 3px #22d3ee' : '0 0 3px #ec4899'
                            }}
                          />
                          {/* Move number */}
                          <span 
                            className="font-black leading-none"
                            style={{ 
                              fontSize: '9px',
                              color: isLast ? '#fef3c7' : '#ffffff',
                              textShadow: '0 0 2px #000, 0 1px 1px #000, 1px 0 1px #000, -1px 0 1px #000'
                            }}
                          >
                            {info.moveNumber}
                          </span>
                        </div>
                      )}
                      
                      {/* FINAL badge */}
                      {isLast && showNum && (
                        <div 
                          className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-900 font-black rounded px-1 whitespace-nowrap shadow-lg z-20"
                          style={{ fontSize: '5px', lineHeight: '8px' }}
                        >
                          FINAL
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* LEGEND */}
            {moveHistory.length > 0 && showFinal && (
              <div className="flex justify-center gap-3 mt-1 text-[9px]">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-cyan-400" style={{ boxShadow: '0 0 3px #22d3ee' }} />
                  <span className="text-cyan-400 font-medium">{p1Name}</span>
                  <span className="text-slate-500">(1,3,5...)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-pink-400" style={{ boxShadow: '0 0 3px #ec4899' }} />
                  <span className="text-pink-400 font-medium">{p2Name}</span>
                  <span className="text-slate-500">(2,4,6...)</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CONTROLS */}
      {moveHistory.length > 0 && !isLoadingMoves && (
        <div className="bg-slate-900 border-t border-slate-700 px-2 py-1">
          <div className="max-w-xs mx-auto space-y-1">
            {/* Progress bar */}
            <div className="flex items-center gap-1">
              <span className="text-[8px] text-slate-500 w-4 font-mono text-center">
                {showFinal ? '●' : currentMoveIndex + 1}
              </span>
              <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-200"
                  style={{ width: showFinal ? '100%' : `${((currentMoveIndex + 1) / moveHistory.length) * 100}%` }}
                />
              </div>
              <span className="text-[8px] text-slate-500 w-4 font-mono text-center">{moveHistory.length}</span>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-center gap-1">
              <button onClick={first} className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700">
                <SkipBack size={12} />
              </button>
              <button onClick={prev} className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700">
                <ChevronLeft size={12} />
              </button>
              <button 
                onClick={isPlaying ? pause : play}
                className="p-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button onClick={next} className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700">
                <ChevronRight size={12} />
              </button>
              <button onClick={last} className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700">
                <SkipForward size={12} />
              </button>
            </div>

            {/* Speed controls */}
            <div className="flex items-center justify-center gap-1 text-[7px]">
              {[{ ms: 1600, lbl: '0.5x' }, { ms: 800, lbl: '1x' }, { ms: 400, lbl: '2x' }, { ms: 200, lbl: '4x' }].map(({ ms, lbl }) => (
                <button
                  key={ms}
                  onClick={() => setPlaybackSpeed(ms)}
                  className={`px-1.5 py-0.5 rounded transition-colors ${
                    playbackSpeed === ms ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Close button when no moves */}
      {(isLoadingMoves || moveHistory.length === 0) && !isLoadingMoves && (
        <div className="bg-slate-900 border-t border-slate-700 p-2">
          <button 
            onClick={onClose} 
            className="w-full max-w-xs mx-auto block py-2 bg-slate-800 text-slate-300 rounded font-medium hover:bg-slate-700 text-sm"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default FinalBoardView;
