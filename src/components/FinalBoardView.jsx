// FinalBoardView.jsx - Game replay with move order display
// v7.14 - COMPACT LAYOUT: Reduced padding, consistent spacing
// 
// FIXES:
// ✅ Minimal padding between header/board/controls
// ✅ Last move highlighted with golden glow and pulsing border
// ✅ Consistent layout across all views (recent games, match history, etc)

import { useState, useEffect, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, SkipBack, SkipForward, Play, Pause, Loader, Trophy } from 'lucide-react';
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

  // Build move info map from moveHistory
  const moveInfoMap = useMemo(() => {
    const map = {};
    if (!moveHistory || moveHistory.length === 0) return map;
    
    moveHistory.forEach((move, idx) => {
      const moveNum = idx + 1;
      const player = (idx % 2 === 0) ? 1 : 2;
      
      if (move.cells && Array.isArray(move.cells)) {
        move.cells.forEach(cell => {
          const key = `${cell.row},${cell.col}`;
          map[key] = { moveNumber: moveNum, player, pieceType: move.piece_type, isLastMove: idx === moveHistory.length - 1 };
        });
      } else if (move.position) {
        try {
          const coords = getPieceCoords(move.piece_type, move.position.row, move.position.col, move.rotation || 0, move.flipped || false);
          coords.forEach(([r, c]) => {
            const key = `${r},${c}`;
            map[key] = { moveNumber: moveNum, player, pieceType: move.piece_type, isLastMove: idx === moveHistory.length - 1 };
          });
        } catch (e) {}
      }
    });
    return map;
  }, [moveHistory]);

  // State for replay
  const [state, setState] = useState({ board: safeBoard });
  
  useEffect(() => {
    if (currentMoveIndex === -1) {
      setState({ board: safeBoard });
    } else {
      const newBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
      for (let i = 0; i <= currentMoveIndex && i < moveHistory.length; i++) {
        const move = moveHistory[i];
        const player = (i % 2 === 0) ? 1 : 2;
        
        if (move.cells && Array.isArray(move.cells)) {
          move.cells.forEach(cell => {
            if (cell.row >= 0 && cell.row < BOARD_SIZE && cell.col >= 0 && cell.col < BOARD_SIZE) {
              newBoard[cell.row][cell.col] = player;
            }
          });
        } else if (move.position) {
          try {
            const coords = getPieceCoords(move.piece_type, move.position.row, move.position.col, move.rotation || 0, move.flipped || false);
            coords.forEach(([r, c]) => {
              if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                newBoard[r][c] = player;
              }
            });
          } catch (e) {}
        }
      }
      setState({ board: newBoard });
    }
  }, [currentMoveIndex, moveHistory, safeBoard]);

  // Playback
  useEffect(() => {
    if (!isPlaying || moveHistory.length === 0) return;
    const timer = setInterval(() => {
      setCurrentMoveIndex(prev => {
        if (prev >= moveHistory.length - 1) {
          setIsPlaying(false);
          return -1;
        }
        return prev + 1;
      });
    }, playbackSpeed);
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, moveHistory.length]);

  const first = () => { setCurrentMoveIndex(-1); setIsPlaying(false); soundManager.playClickSound?.('click'); };
  const prev = () => { setCurrentMoveIndex(p => Math.max(-1, p - 1)); soundManager.playClickSound?.('click'); };
  const next = () => { setCurrentMoveIndex(p => Math.min(moveHistory.length - 1, p + 1)); soundManager.playClickSound?.('click'); };
  const last = () => { setCurrentMoveIndex(-1); setIsPlaying(false); soundManager.playClickSound?.('click'); };
  const play = () => { if (currentMoveIndex === -1) setCurrentMoveIndex(-1); setIsPlaying(true); };
  const pause = () => setIsPlaying(false);

  const showFinal = currentMoveIndex === -1;

  const getInfo = (r, c) => moveInfoMap[`${r},${c}`];
  const getPiece = (r, c) => {
    const key = `${r},${c}`;
    for (const [pieceKey, data] of Object.entries(safeBoardPieces)) {
      if (data.cells?.some(cell => `${cell.row},${cell.col}` === key)) {
        return data.piece_type || pieceKey.split('_')[0];
      }
    }
    return null;
  };

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-50 flex flex-col"
      onClick={onClose}
    >
      <div 
        className="flex-1 flex flex-col max-w-lg mx-auto w-full"
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER - Compact */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-900/95 border-b border-slate-700">
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white">
            <X size={20} />
          </button>
          <span className="text-slate-400 text-xs">
            {gameDate ? new Date(gameDate).toLocaleDateString() : 'Game Replay'}
          </span>
          <div className="w-8" />
        </div>

        {/* PLAYERS - Compact row */}
        <div className="flex items-center justify-center gap-3 px-3 py-1.5 bg-slate-800/50 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="relative w-5 h-5 rounded flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${hexToRgba(p1Tier.glowColor, 0.3)}, transparent)` }}>
              <TierIcon shape={p1Tier.shape} glowColor={p1Tier.glowColor} size="small" />
              {isP1Winner && <Trophy size={8} className="absolute -top-0.5 -right-0.5 text-amber-400" />}
            </div>
            <div className="text-left">
              <div className={`font-medium text-xs ${isP1Winner ? 'text-amber-400' : 'text-white'}`}>{p1Name}</div>
              <div className="text-slate-500 text-[10px]">{p1Rating}</div>
            </div>
          </div>
          <span className="text-slate-600 font-bold text-[10px]">VS</span>
          <div className="flex items-center gap-1.5">
            <div className="text-right">
              <div className={`font-medium text-xs ${isP2Winner ? 'text-amber-400' : 'text-white'}`}>{p2Name}</div>
              <div className="text-slate-500 text-[10px]">{p2Rating}</div>
            </div>
            <div className="relative w-5 h-5 rounded flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${hexToRgba(p2Tier.glowColor, 0.3)}, transparent)` }}>
              <TierIcon shape={p2Tier.shape} glowColor={p2Tier.glowColor} size="small" />
              {isP2Winner && <Trophy size={8} className="absolute -top-0.5 -right-0.5 text-amber-400" />}
            </div>
          </div>
        </div>

        {/* STATUS - Single line, minimal height */}
        <div className="text-center py-1 text-[10px] bg-slate-800/30">
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

        {/* BOARD - Centered, minimal padding */}
        <div className="flex-1 flex items-center justify-center p-2 min-h-0">
          {isLoadingMoves ? (
            <div className="text-center">
              <Loader size={24} className="text-purple-400 animate-spin mx-auto mb-1" />
              <p className="text-slate-400 text-xs">Loading...</p>
            </div>
          ) : (
            <div className="w-full" style={{ maxWidth: 'min(80vw, 300px)' }}>
              {/* Grid */}
              <div 
                className="grid grid-cols-8 gap-[1px] p-0.5 rounded-lg bg-slate-800/80 border border-slate-700/50 mx-auto"
                style={{ aspectRatio: '1' }}
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
                        className={`relative ${bg} rounded-[2px] flex items-center justify-center ${
                          isLast ? 'ring-2 ring-amber-400 animate-pulse' : ''
                        }`}
                        style={isLast ? { boxShadow: '0 0 8px rgba(251, 191, 36, 0.8)' } : {}}
                      >
                        {showNum && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            {/* Player dot */}
                            <div 
                              className={`w-1.5 h-1.5 rounded-full ${player === 1 ? 'bg-cyan-300' : 'bg-pink-300'}`}
                              style={{ 
                                boxShadow: player === 1 ? '0 0 3px #22d3ee' : '0 0 3px #ec4899',
                                marginBottom: '1px'
                              }}
                            />
                            {/* Move number */}
                            <span 
                              className="font-black leading-none"
                              style={{ 
                                fontSize: '9px',
                                color: isLast ? '#fef3c7' : '#ffffff',
                                textShadow: '0 0 2px #000, 0 1px 1px #000'
                              }}
                            >
                              {info.moveNumber}
                            </span>
                          </div>
                        )}
                        
                        {/* LAST move indicator */}
                        {isLast && showNum && (
                          <div 
                            className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-900 font-black rounded px-0.5 whitespace-nowrap"
                            style={{ fontSize: '5px', lineHeight: '8px' }}
                          >
                            LAST
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* LEGEND - Compact */}
              <div className="flex justify-center gap-3 mt-1 text-[9px]">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-cyan-400" style={{ boxShadow: '0 0 3px #22d3ee' }} />
                  <span className="text-cyan-400 font-medium">{p1Name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-pink-400" style={{ boxShadow: '0 0 3px #ec4899' }} />
                  <span className="text-pink-400 font-medium">{p2Name}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CONTROLS - Compact */}
        {moveHistory.length > 0 && !isLoadingMoves && (
          <div className="bg-slate-900 border-t border-slate-700 px-3 py-2">
            <div className="max-w-xs mx-auto space-y-1.5">
              {/* Progress */}
              <div className="flex items-center gap-1.5">
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

              {/* Speed */}
              <div className="flex items-center justify-center gap-1 text-[7px]">
                {[{ ms: 1600, lbl: '0.5x' }, { ms: 800, lbl: '1x' }, { ms: 400, lbl: '2x' }, { ms: 200, lbl: '4x' }].map(({ ms, lbl }) => (
                  <button
                    key={ms}
                    onClick={() => setPlaybackSpeed(ms)}
                    className={`px-1 py-0.5 rounded transition-colors ${
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

        {/* Close button fallback */}
        {(isLoadingMoves || moveHistory.length === 0) && (
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
