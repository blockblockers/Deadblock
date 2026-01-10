// FinalBoardView.jsx - Game replay with move order display
// v7.12 - FIXES:
// ✅ Reduced padding - board takes more screen space
// ✅ Move numbers VISIBLE on each cell with high contrast
// ✅ Player color dots showing who played each move (cyan=P1, pink=P2)
// ✅ Last move highlighted with golden glow + "FINAL" badge
// ✅ Player legend showing odd/even move pattern
// ✅ Smooth replay with progress bar

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

  // Build cell info map from move history - which move placed each cell
  const cellInfoMap = useMemo(() => {
    const map = {};
    if (!moveHistory || moveHistory.length === 0) return map;
    
    moveHistory.forEach((move, idx) => {
      if (!move?.piece_type || move.row === undefined || move.col === undefined) return;
      
      const rotation = move.rotation || 0;
      const flipped = move.flipped || false;
      const coords = getPieceCoords(move.piece_type, rotation, flipped);
      
      coords.forEach(([dx, dy]) => {
        const r = move.row + dy;
        const c = move.col + dx;
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
          map[`${r},${c}`] = {
            moveNumber: idx + 1,
            player: move.player_number || ((idx % 2) + 1),
            pieceType: move.piece_type,
            isLastMove: idx === moveHistory.length - 1
          };
        }
      });
    });
    
    return map;
  }, [moveHistory]);

  // Build progressive board states for replay
  const boardStates = useMemo(() => {
    const states = [{ board: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)), pieces: {} }];
    
    if (!moveHistory || moveHistory.length === 0) {
      states.push({ board: safeBoard, pieces: safeBoardPieces });
      return states;
    }
    
    let currentBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    let currentPieces = {};
    
    moveHistory.forEach((move, idx) => {
      if (!move?.piece_type || move.row === undefined || move.col === undefined) return;
      
      const rotation = move.rotation || 0;
      const flipped = move.flipped || false;
      const player = move.player_number || ((idx % 2) + 1);
      const coords = getPieceCoords(move.piece_type, rotation, flipped);
      
      currentBoard = currentBoard.map(row => [...row]);
      currentPieces = { ...currentPieces };
      
      coords.forEach(([dx, dy]) => {
        const r = move.row + dy;
        const c = move.col + dx;
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
          currentBoard[r][c] = player;
          currentPieces[`${r},${c}`] = move.piece_type;
        }
      });
      
      states.push({ board: currentBoard, pieces: currentPieces });
    });
    
    return states;
  }, [moveHistory, safeBoard, safeBoardPieces]);

  // Playback
  useEffect(() => {
    if (!isPlaying || moveHistory.length === 0) return;
    
    const timer = setInterval(() => {
      setCurrentMoveIndex(prev => {
        if (prev >= moveHistory.length - 1) {
          setIsPlaying(false);
          return -1; // Show final
        }
        return prev + 1;
      });
    }, playbackSpeed);
    
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, moveHistory.length]);

  // Controls
  const play = () => { setCurrentMoveIndex(0); setIsPlaying(true); soundManager.playButtonClick?.(); };
  const pause = () => { setIsPlaying(false); soundManager.playButtonClick?.(); };
  const prev = () => { setIsPlaying(false); soundManager.playButtonClick?.(); setCurrentMoveIndex(i => Math.max(-1, i - 1)); };
  const next = () => { setIsPlaying(false); soundManager.playButtonClick?.(); setCurrentMoveIndex(i => i < moveHistory.length - 1 ? i + 1 : -1); };
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
      <div className="flex items-center justify-between px-2 py-1 bg-slate-900 border-b border-purple-500/30 shrink-0">
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
          <X size={18} />
        </button>
        <div className="flex items-center gap-1">
          <Film size={12} className="text-purple-400" />
          <span className="text-purple-400 text-xs font-medium">Replay</span>
          {dateStr && <span className="text-slate-500 text-[10px]">• {dateStr}</span>}
        </div>
        <div className="w-6" />
      </div>

      {/* PLAYERS - Ultra compact */}
      <div className="flex items-center justify-between px-2 py-1 bg-slate-800/50 text-[10px] shrink-0">
        <div className="flex items-center gap-1">
          <div className="relative w-5 h-5 rounded flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${hexToRgba(p1Tier.glowColor, 0.3)}, transparent)` }}>
            <TierIcon shape={p1Tier.shape} glowColor={p1Tier.glowColor} size="small" />
            {isP1Winner && <Trophy size={6} className="absolute -top-0.5 -right-0.5 text-amber-400" />}
          </div>
          <div>
            <div className={`font-medium leading-tight ${isP1Winner ? 'text-amber-400' : 'text-white'}`}>{p1Name}</div>
            <div className="text-slate-500 text-[8px]">{p1Rating}</div>
          </div>
        </div>
        <span className="text-slate-600 font-bold text-[10px]">VS</span>
        <div className="flex items-center gap-1">
          <div className="text-right">
            <div className={`font-medium leading-tight ${isP2Winner ? 'text-amber-400' : 'text-white'}`}>{p2Name}</div>
            <div className="text-slate-500 text-[8px]">{p2Rating}</div>
          </div>
          <div className="relative w-5 h-5 rounded flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${hexToRgba(p2Tier.glowColor, 0.3)}, transparent)` }}>
            <TierIcon shape={p2Tier.shape} glowColor={p2Tier.glowColor} size="small" />
            {isP2Winner && <Trophy size={6} className="absolute -top-0.5 -right-0.5 text-amber-400" />}
          </div>
        </div>
      </div>

      {/* STATUS - Single line */}
      <div className="text-center py-0.5 text-[10px] bg-slate-800/30 shrink-0">
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

      {/* BOARD - Takes maximum space with minimal padding */}
      <div className="flex-1 flex flex-col items-center justify-center px-1 py-1 min-h-0 overflow-hidden">
        {isLoadingMoves ? (
          <div className="text-center">
            <Loader size={24} className="text-purple-400 animate-spin mx-auto mb-1" />
            <p className="text-slate-400 text-xs">Loading moves...</p>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            {/* Grid - maximize size */}
            <div 
              className="grid grid-cols-8 gap-[1px] rounded-lg bg-slate-800/80 border border-slate-700/50"
              style={{ 
                aspectRatio: '1',
                width: 'min(95vw, calc(100vh - 180px), 400px)',
                maxWidth: '400px'
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
                      className={`relative rounded-sm ${bg} transition-all duration-200`}
                      style={{
                        aspectRatio: '1',
                        boxShadow: isLast && showFinal
                          ? '0 0 12px 3px rgba(251, 191, 36, 0.8), inset 0 0 8px rgba(251, 191, 36, 0.4)'
                          : occupied 
                            ? `inset 0 0 6px ${player === 1 ? 'rgba(34, 211, 238, 0.4)' : 'rgba(236, 72, 153, 0.4)'}`
                            : 'none',
                        border: isLast && showFinal ? '2px solid #fbbf24' : 'none'
                      }}
                    >
                      {/* Move number + player indicator */}
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
                          {/* Move number - HIGH CONTRAST */}
                          <span 
                            className="font-black leading-none"
                            style={{ 
                              fontSize: 'clamp(8px, 2.5vw, 12px)',
                              color: isLast ? '#fef3c7' : '#ffffff',
                              textShadow: '0 0 3px #000, 0 1px 2px #000, 1px 0 2px #000, -1px 0 2px #000, 0 -1px 2px #000'
                            }}
                          >
                            {info.moveNumber}
                          </span>
                        </div>
                      )}
                      
                      {/* FINAL badge on last move */}
                      {isLast && showNum && (
                        <div 
                          className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-900 font-black rounded px-1 whitespace-nowrap shadow-lg z-10"
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

            {/* LEGEND - Shows player colors and move pattern */}
            <div className="flex justify-center gap-3 mt-1 text-[9px]">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-cyan-400" style={{ boxShadow: '0 0 4px #22d3ee' }} />
                <span className="text-cyan-400 font-medium">{p1Name}</span>
                <span className="text-slate-500">(1,3,5...)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-pink-400" style={{ boxShadow: '0 0 4px #ec4899' }} />
                <span className="text-pink-400 font-medium">{p2Name}</span>
                <span className="text-slate-500">(2,4,6...)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CONTROLS - Compact */}
      {moveHistory.length > 0 && !isLoadingMoves && (
        <div className="bg-slate-900 border-t border-slate-700 px-2 py-1 shrink-0">
          <div className="max-w-xs mx-auto space-y-1">
            {/* Progress bar */}
            <div className="flex items-center gap-1">
              <span className="text-[8px] text-slate-500 w-3 font-mono text-center">
                {showFinal ? '●' : currentMoveIndex + 1}
              </span>
              <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-200"
                  style={{ width: showFinal ? '100%' : `${((currentMoveIndex + 1) / moveHistory.length) * 100}%` }}
                />
              </div>
              <span className="text-[8px] text-slate-500 w-3 font-mono text-center">{moveHistory.length}</span>
            </div>

            {/* Playback buttons */}
            <div className="flex items-center justify-center gap-1">
              <button onClick={first} className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 active:scale-95">
                <SkipBack size={12} />
              </button>
              <button onClick={prev} className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 active:scale-95">
                <ChevronLeft size={12} />
              </button>
              <button 
                onClick={isPlaying ? pause : play}
                className="p-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg active:scale-95"
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button onClick={next} className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 active:scale-95">
                <ChevronRight size={12} />
              </button>
              <button onClick={last} className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 active:scale-95">
                <SkipForward size={12} />
              </button>
            </div>

            {/* Speed controls */}
            <div className="flex items-center justify-center gap-0.5 text-[7px]">
              {[{ ms: 1600, lbl: '0.5x' }, { ms: 800, lbl: '1x' }, { ms: 400, lbl: '2x' }, { ms: 200, lbl: '4x' }].map(({ ms, lbl }) => (
                <button
                  key={ms}
                  onClick={() => setPlaybackSpeed(ms)}
                  className={`px-1.5 py-0.5 rounded transition-colors active:scale-95 ${
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
      {(isLoadingMoves || moveHistory.length === 0) && (
        <div className="bg-slate-900 border-t border-slate-700 p-2 shrink-0">
          <button 
            onClick={onClose} 
            className="w-full max-w-xs mx-auto block py-2 bg-slate-800 text-slate-300 rounded font-medium hover:bg-slate-700 active:scale-98"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default FinalBoardView;
