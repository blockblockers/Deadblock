// FinalBoardView.jsx - Game replay with move order display
// v7.12 - CROSS-BROWSER SPACING FIX
// 
// FIXES:
// ✅ Cross-browser consistent spacing (Safari, Chrome, Android, PC)
// ✅ NO extra whitespace - compact layout with minimal padding
// ✅ Move numbers VISIBLE on each cell with high contrast
// ✅ Player color dots showing who played each move (cyan=P1, pink=P2)
// ✅ Last move highlighted with golden glow + "FINAL" badge
// ✅ Player legend showing odd/even move pattern
// ✅ Smooth replay with progress bar
// ✅ Uses CSS grid layout for consistent spacing across browsers

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

  // Build cell info map from move history
  const cellInfoMap = useMemo(() => {
    const map = {};
    if (!moveHistory || moveHistory.length === 0) return map;

    moveHistory.forEach((move, idx) => {
      try {
        const { piece_type, position, rotation, flipped, player_number } = move;
        if (!piece_type || !position) return;

        const coords = getPieceCoords(piece_type, rotation || 0, flipped || false);
        if (!coords) return;

        const [col, row] = position;
        coords.forEach(([dx, dy]) => {
          const r = row + dy;
          const c = col + dx;
          if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
            map[`${r},${c}`] = {
              moveNumber: idx + 1,
              player: player_number,
              pieceType: piece_type,
              isLastMove: idx === moveHistory.length - 1
            };
          }
        });
      } catch (e) {}
    });

    return map;
  }, [moveHistory]);

  // Build board states for replay
  const boardStates = useMemo(() => {
    const states = [{ board: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)), pieces: {} }];
    if (!moveHistory || moveHistory.length === 0) {
      states.push({ board: safeBoard, pieces: safeBoardPieces });
      return states;
    }

    let curBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    let curPieces = {};

    moveHistory.forEach((move) => {
      try {
        const { piece_type, position, rotation, flipped, player_number } = move;
        if (!piece_type || !position) {
          states.push({ board: curBoard.map(r => [...r]), pieces: { ...curPieces } });
          return;
        }

        const [col, row] = position;
        const player = player_number;
        const piece = piece_type;
        const coords = getPieceCoords(piece, rotation || 0, flipped || false);

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
    <div className="fixed inset-0 z-50 bg-slate-950 overflow-hidden">
      {/* v7.12: CSS Grid layout for cross-browser consistent spacing */}
      <style>{`
        .fbv-layout {
          display: grid;
          grid-template-rows: auto auto auto 1fr auto;
          height: 100%;
          height: 100dvh; /* Dynamic viewport height for mobile */
          overflow: hidden;
        }
        .fbv-board-area {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          min-height: 0; /* Critical for grid item shrinking */
          overflow: hidden;
        }
        .fbv-board-wrapper {
          width: 100%;
          max-width: min(85vw, calc(100dvh - 180px), 320px);
        }
        .fbv-grid-container {
          position: relative;
          width: 100%;
          padding-bottom: 100%; /* 1:1 aspect ratio */
        }
        .fbv-grid {
          position: absolute;
          inset: 0;
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 1px;
          padding: 4px;
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid rgba(71, 85, 105, 0.5);
          border-radius: 8px;
        }
      `}</style>

      <div className="fbv-layout">
        {/* HEADER */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-purple-500/30">
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X size={20} />
          </button>
          <div className="flex items-center gap-1.5">
            <Film size={14} className="text-purple-400" />
            <span className="text-purple-400 text-sm font-medium">Replay</span>
            {dateStr && <span className="text-slate-500 text-xs">• {dateStr}</span>}
          </div>
          <div className="w-7" />
        </div>

        {/* PLAYERS */}
        <div className="flex items-center justify-between px-3 py-1 bg-slate-800/50 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="relative w-6 h-6 rounded flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${hexToRgba(p1Tier.glowColor, 0.3)}, transparent)` }}>
              <TierIcon shape={p1Tier.shape} glowColor={p1Tier.glowColor} size="small" />
              {isP1Winner && <Trophy size={8} className="absolute -top-0.5 -right-0.5 text-amber-400" />}
            </div>
            <div>
              <div className={`font-medium ${isP1Winner ? 'text-amber-400' : 'text-white'}`}>{p1Name}</div>
              <div className="text-slate-500 text-[10px]">{p1Rating}</div>
            </div>
          </div>
          <span className="text-slate-600 font-bold text-xs">VS</span>
          <div className="flex items-center gap-1.5">
            <div className="text-right">
              <div className={`font-medium ${isP2Winner ? 'text-amber-400' : 'text-white'}`}>{p2Name}</div>
              <div className="text-slate-500 text-[10px]">{p2Rating}</div>
            </div>
            <div className="relative w-6 h-6 rounded flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${hexToRgba(p2Tier.glowColor, 0.3)}, transparent)` }}>
              <TierIcon shape={p2Tier.shape} glowColor={p2Tier.glowColor} size="small" />
              {isP2Winner && <Trophy size={8} className="absolute -top-0.5 -right-0.5 text-amber-400" />}
            </div>
          </div>
        </div>

        {/* STATUS */}
        <div className="text-center py-0.5 text-[11px] bg-slate-800/30">
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

        {/* BOARD AREA */}
        <div className="fbv-board-area">
          {isLoadingMoves ? (
            <div className="text-center">
              <Loader size={28} className="text-purple-400 animate-spin mx-auto mb-1" />
              <p className="text-slate-400 text-xs">Loading moves...</p>
            </div>
          ) : (
            <div className="fbv-board-wrapper">
              {/* Grid with aspect ratio container */}
              <div className="fbv-grid-container">
                <div className="fbv-grid">
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
                          className={`relative rounded-sm flex items-center justify-center ${bg}`}
                          style={{
                            boxShadow: isLast ? '0 0 8px 2px rgba(251, 191, 36, 0.6), inset 0 0 4px rgba(251, 191, 36, 0.3)' : undefined,
                            border: isLast ? '2px solid #fbbf24' : undefined
                          }}
                        >
                          {/* Move number overlay */}
                          {showNum && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              {/* Player color dot */}
                              <div 
                                className={`w-1.5 h-1.5 rounded-full ${player === 1 ? 'bg-cyan-300' : 'bg-pink-300'}`}
                                style={{ 
                                  boxShadow: player === 1 ? '0 0 4px #22d3ee' : '0 0 4px #ec4899',
                                  marginBottom: '1px'
                                }}
                              />
                              {/* Move number */}
                              <span 
                                className="font-black leading-none"
                                style={{ 
                                  fontSize: '10px',
                                  color: isLast ? '#fef3c7' : '#ffffff',
                                  textShadow: '0 0 3px #000, 0 1px 2px #000, 1px 0 2px #000, -1px 0 2px #000, 0 -1px 2px #000'
                                }}
                              >
                                {info.moveNumber}
                              </span>
                            </div>
                          )}
                          
                          {/* FINAL badge */}
                          {isLast && showNum && (
                            <div 
                              className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-900 font-black rounded px-1 whitespace-nowrap shadow-lg z-10"
                              style={{ fontSize: '6px', lineHeight: '10px' }}
                            >
                              FINAL
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* LEGEND */}
              <div className="flex justify-center gap-4 mt-2 text-[10px]">
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" style={{ boxShadow: '0 0 4px #22d3ee' }} />
                  <span className="text-cyan-400 font-medium">{p1Name}</span>
                  <span className="text-slate-500">(1,3,5...)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-pink-400" style={{ boxShadow: '0 0 4px #ec4899' }} />
                  <span className="text-pink-400 font-medium">{p2Name}</span>
                  <span className="text-slate-500">(2,4,6...)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CONTROLS */}
        {moveHistory.length > 0 && !isLoadingMoves ? (
          <div className="bg-slate-900 border-t border-slate-700 px-3 py-1.5">
            <div className="max-w-xs mx-auto space-y-1">
              {/* Progress */}
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-slate-500 w-4 font-mono text-center">
                  {showFinal ? '●' : currentMoveIndex + 1}
                </span>
                <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-200"
                    style={{ width: showFinal ? '100%' : `${((currentMoveIndex + 1) / moveHistory.length) * 100}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-500 w-4 font-mono text-center">{moveHistory.length}</span>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-center gap-1">
                <button onClick={first} className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700">
                  <SkipBack size={14} />
                </button>
                <button onClick={prev} className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700">
                  <ChevronLeft size={14} />
                </button>
                <button 
                  onClick={isPlaying ? pause : play}
                  className="p-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button onClick={next} className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700">
                  <ChevronRight size={14} />
                </button>
                <button onClick={last} className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700">
                  <SkipForward size={14} />
                </button>
              </div>

              {/* Speed */}
              <div className="flex items-center justify-center gap-1 text-[8px]">
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
        ) : (
          <div className="bg-slate-900 border-t border-slate-700 p-2">
            <button 
              onClick={onClose} 
              className="w-full max-w-xs mx-auto block py-2 bg-slate-800 text-slate-300 rounded font-medium hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinalBoardView;
