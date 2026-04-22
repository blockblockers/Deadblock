// SpectatorView.jsx - Watch live games
// v7.21: Player outlines — cyan inset for P1, pink for P2; transition-colors for mobile perf
// v7.20: Fixed fallback move numbering — uses game.used_pieces (chronological) instead of
//        unordered Object.keys. Fixes "newest piece = 1" bug when game_moves query fails.
//        on spectate start and reloads on each real-time update. Sorts by move_number
//        ascending to guarantee correct order. Falls back to piece-group numbering if
//        unavailable. Fixed player name colors using inline styles (Tailwind class was
//        rendering as black).
// v7.18: REDESIGN — Silver cyberpunk theme modeled after FinalBoardView.
//        Custom board with piece colors, move numbering, last-move gold highlighting,
//        animated glow orbs, cyberpunk grid background, FloatingPieces.
//        Maintains all live functionality (real-time updates, game switching, spectators).
// v7.17: Added Back button and Deadblock title to header
// v7.10: Added iOS scroll fixes for games list
// v7.7: Added game switching for multiple active games (when watching a friend)
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Eye, X, Users, Clock, Trophy, Radio, AlertTriangle, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { spectatorService } from '../services/spectatorService';
import { ratingService } from '../services/ratingService';
import { BOARD_SIZE, getPieceCoords } from '../utils/gameLogic';
import { pieceColors } from '../utils/pieces';
import { soundManager } from '../utils/soundManager';
import { replayService } from '../services/replayService';
import TierIcon from './TierIcon';
import NeonTitle from './NeonTitle';
import FloatingPieces from './FloatingPieces';

const SpectatorView = ({ 
  gameId, userId, onClose,
  friendGames = [], onSwitchGame, currentGameIndex = 0
}) => {
  const [game, setGame] = useState(null);
  const [spectators, setSpectators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [board, setBoard] = useState(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
  const [boardPieces, setBoardPieces] = useState({});
  const [moveHistory, setMoveHistory] = useState([]);
  const [lastMovePiece, setLastMovePiece] = useState(null);
  const prevBoardPiecesRef = useRef({});
  const gameSubRef = useRef(null);
  const spectatorSubRef = useRef(null);

  useEffect(() => {
    initSpectating();
    return () => { leaveSpectating(); };
  }, [gameId, userId]);

  const initSpectating = async () => {
    setLoading(true);
    if (userId) await spectatorService.joinAsSpectator(gameId, userId);
    const { data: gameData, error: gameError } = await spectatorService.getGameForSpectating(gameId);
    if (gameError) { setError(gameError.message); setLoading(false); return; }
    setGame(gameData);
    updateBoard(gameData);
    // Load chronological move history from game_moves table
    await loadMoveHistory();
    const { data: specs } = await spectatorService.getSpectators(gameId);
    setSpectators(specs || []);
    gameSubRef.current = spectatorService.subscribeToGame(gameId,
      (updatedGame) => {
        setGame(updatedGame);
        updateBoard(updatedGame);
        // Reload move history to pick up the new move in chronological order
        loadMoveHistory();
        soundManager.playClickSound('soft');
      },
      (err) => console.error('Spectator subscription error:', err)
    );
    spectatorSubRef.current = spectatorService.subscribeToSpectators(gameId,
      (updatedSpectators) => setSpectators(updatedSpectators)
    );
    setLoading(false);
  };

  const loadMoveHistory = async () => {
    try {
      const { data } = await replayService.getGameMoves(gameId);
      if (data?.length > 0) {
        // Sort by move_number ascending — guarantees chronological order
        // regardless of API return order
        const sorted = [...data].sort((a, b) => (a.move_number || 0) - (b.move_number || 0));
        setMoveHistory(sorted);
      }
    } catch (e) {
      // Non-fatal — falls back to piece-group numbering
    }
  };

  const leaveSpectating = async () => {
    if (userId) await spectatorService.leaveSpectating(gameId, userId);
    if (gameSubRef.current) spectatorService.unsubscribe(gameSubRef.current);
    if (spectatorSubRef.current) spectatorService.unsubscribe(spectatorSubRef.current);
  };

  // Helper to extract entries from boardPieces (handles array and object formats)
  const getEntries = useCallback((bp) => {
    if (Array.isArray(bp)) {
      const entries = [];
      bp.forEach((row, ri) => {
        if (Array.isArray(row)) row.forEach((p, ci) => { if (p) entries.push([`${ri},${ci}`, p]); });
      });
      return entries;
    }
    return Object.entries(bp || {});
  }, []);

  const updateBoard = (gameData) => {
    if (!gameData) return;
    let validBoard = gameData.board;
    if (Array.isArray(validBoard) && validBoard.length === BOARD_SIZE) {
      validBoard = validBoard.map(row => row.map(cell => (cell === 0 ? null : cell)));
    } else {
      validBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    }
    // Detect last placed piece by comparing with previous state
    const newPieces = gameData.board_pieces || {};
    const prevKeys = new Set(getEntries(prevBoardPiecesRef.current).map(([k]) => k));
    const newPieceNames = new Set();
    getEntries(newPieces).forEach(([k, v]) => { if (!prevKeys.has(k) && v) newPieceNames.add(v); });
    if (newPieceNames.size > 0) setLastMovePiece([...newPieceNames][0]);
    prevBoardPiecesRef.current = newPieces;
    setBoard(validBoard);
    setBoardPieces(newPieces);
  };

  // Build cell info map — uses chronological moveHistory when available, falls back to piece groups
  const cellInfoMap = useMemo(() => {
    const map = {};
    
    // If we have chronological move history from game_moves table, use it
    if (moveHistory.length > 0) {
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
                map[`${r},${c}`] = { moveNumber: moveNum, pieceType: piece, isLastMove: idx === moveHistory.length - 1 };
              }
            });
          }
        } catch (e) { /* skip invalid move */ }
      });
      return map;
    }
    
    // Fallback: use game.used_pieces (chronological) to order piece groups from boardPieces
    const pieceGroups = {};
    getEntries(boardPieces).forEach(([key, pieceType]) => {
      if (!pieceGroups[pieceType]) pieceGroups[pieceType] = [];
      pieceGroups[pieceType].push(key);
    });
    // used_pieces array is in play order (first placed = first element)
    const orderedPieces = game?.used_pieces || Object.keys(pieceGroups);
    let moveNum = 1;
    orderedPieces.forEach((pieceType) => {
      const cells = pieceGroups[pieceType];
      if (!cells) return;
      const isLast = pieceType === lastMovePiece;
      cells.forEach(key => {
        map[key] = { moveNumber: moveNum, pieceType, isLastMove: isLast };
      });
      moveNum++;
    });
    return map;
  }, [moveHistory, boardPieces, lastMovePiece, getEntries, game?.used_pieces]);

  const getPieceName = useCallback((rowIdx, colIdx) => {
    if (Array.isArray(boardPieces) && boardPieces[rowIdx]) return boardPieces[rowIdx][colIdx] || null;
    if (typeof boardPieces === 'object') return boardPieces[`${rowIdx},${colIdx}`] || null;
    return null;
  }, [boardPieces]);

  const handlePrevGame = () => {
    if (friendGames.length <= 1) return;
    const idx = currentGameIndex > 0 ? currentGameIndex - 1 : friendGames.length - 1;
    if (friendGames[idx]?.id && onSwitchGame) { soundManager.playButtonClick(); onSwitchGame(friendGames[idx].id, idx); }
  };
  const handleNextGame = () => {
    if (friendGames.length <= 1) return;
    const idx = currentGameIndex < friendGames.length - 1 ? currentGameIndex + 1 : 0;
    if (friendGames[idx]?.id && onSwitchGame) { soundManager.playButtonClick(); onSwitchGame(friendGames[idx].id, idx); }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ backgroundColor: '#0f172a' }}>
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-slate-400 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-400">Joining as spectator...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: '#0f172a' }}>
        <div className="bg-slate-800 rounded-xl p-6 text-center max-w-sm border border-slate-600/30">
          <AlertTriangle className="mx-auto text-slate-400 mb-3" size={48} />
          <h2 className="text-white text-xl font-bold mb-2">Unable to Watch</h2>
          <p className="text-slate-400 mb-4">{error}</p>
          <button onClick={onClose} className="px-6 py-2 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-500">Go Back</button>
        </div>
      </div>
    );
  }

  const isGameOver = game?.status === 'completed';
  const currentPlayerName = game?.current_player === 1 ? game?.player1?.username : game?.player2?.username;
  const p1 = game?.player1;
  const p2 = game?.player2;
  const p1Rating = p1?.rating || p1?.elo_rating || 1200;
  const p2Rating = p2?.rating || p2?.elo_rating || 1200;
  const p1Tier = ratingService.getRatingTier(p1Rating);
  const p2Tier = ratingService.getRatingTier(p2Rating);
  const isP1Winner = game?.winner_id === p1?.id;
  const isP2Winner = game?.winner_id === p2?.id;
  const totalPieces = new Set(getEntries(boardPieces).map(([, v]) => v)).size;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden" style={{
      background: `linear-gradient(to bottom, rgba(15,23,42,0.92), rgba(15,23,42,0.95)),
        repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(148,163,184,0.08) 40px, rgba(148,163,184,0.08) 41px),
        repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(148,163,184,0.08) 40px, rgba(148,163,184,0.08) 41px)`,
      backgroundColor: '#0f172a',
    }}>
      <FloatingPieces theme="silver" immediateStart={true} maxDelay={0} />
      <div className="fixed top-10 right-10 w-64 h-64 bg-slate-400/25 rounded-full blur-3xl pointer-events-none animate-glow-pulse-1" />
      <div className="fixed bottom-20 left-10 w-56 h-56 bg-slate-300/20 rounded-full blur-3xl pointer-events-none animate-glow-pulse-2" />
      <div className="fixed top-1/3 left-1/4 w-48 h-48 bg-zinc-400/15 rounded-full blur-3xl pointer-events-none animate-glow-pulse-3" />

      {/* Safe area top */}
      <div className="flex-shrink-0" style={{ height: 'max(16px, env(safe-area-inset-top))', background: 'linear-gradient(to bottom, rgba(15,23,42,1), transparent)' }} />

      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-500/20 flex-shrink-0 relative backdrop-blur-sm">
        <button onClick={onClose} className="flex items-center gap-1.5 px-2 py-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-all">
          <ArrowLeft size={18} /><span className="text-xs">Back</span>
        </button>
        <div className="absolute left-1/2 transform -translate-x-1/2"><NeonTitle text="DEADBLOCK" size="medium" /></div>
        <div className="flex items-center gap-2">
          {!isGameOver && <span className="flex items-center gap-1 text-xs text-red-400 animate-pulse font-bold"><Radio size={10} /> LIVE</span>}
          <div className="flex items-center gap-1 text-slate-500 text-xs"><Eye size={12} /><span>{spectators.length}</span></div>
        </div>
      </div>

      {/* PLAYER INFO */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/60 border-b border-slate-700/30 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{
              background: `linear-gradient(135deg, ${p1Tier.glowColor}40, transparent)`,
              boxShadow: isP1Winner ? `0 0 12px ${p1Tier.glowColor}` : (game?.current_player === 1 && !isGameOver ? '0 0 8px rgba(34,211,238,0.5)' : 'none')
            }}><TierIcon shape={p1Tier.shape} glowColor={p1Tier.glowColor} size="small" /></div>
            {isP1Winner && <Trophy size={10} className="absolute -top-1 -right-1 text-amber-400 drop-shadow-lg" />}
            {game?.current_player === 1 && !isGameOver && <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-pulse" />}
          </div>
          <div>
            <div className="font-bold text-xs" style={{ color: isP1Winner ? '#fbbf24' : (game?.current_player === 1 && !isGameOver ? '#38bdf8' : '#e2e8f0') }}>{p1?.username || 'Player 1'}</div>
            <div className="text-slate-500 text-[10px]">{p1Rating}</div>
          </div>
        </div>
        <span className="text-slate-600 font-black text-xs px-2">VS</span>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="font-bold text-xs" style={{ color: isP2Winner ? '#fbbf24' : (game?.current_player === 2 && !isGameOver ? '#f472b6' : '#e2e8f0') }}>{p2?.username || 'Player 2'}</div>
            <div className="text-slate-500 text-[10px]">{p2Rating}</div>
          </div>
          <div className="relative">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{
              background: `linear-gradient(135deg, ${p2Tier.glowColor}40, transparent)`,
              boxShadow: isP2Winner ? `0 0 12px ${p2Tier.glowColor}` : (game?.current_player === 2 && !isGameOver ? '0 0 8px rgba(236,72,153,0.5)' : 'none')
            }}><TierIcon shape={p2Tier.shape} glowColor={p2Tier.glowColor} size="small" /></div>
            {isP2Winner && <Trophy size={10} className="absolute -top-1 -right-1 text-amber-400 drop-shadow-lg" />}
            {game?.current_player === 2 && !isGameOver && <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-pink-400 rounded-full animate-pulse" />}
          </div>
        </div>
      </div>

      {/* STATUS */}
      <div className="text-center py-1.5 bg-slate-900/40 border-b border-slate-700/20 flex-shrink-0">
        {isGameOver ? (
          <span className="text-amber-400 font-medium text-xs">
            🏆 {isP1Winner ? p1?.username : p2?.username} wins!
            <span className="text-slate-400 ml-2">• {totalPieces} pieces placed</span>
          </span>
        ) : (
          <span className="text-slate-300 text-xs">
            <span className="font-bold" style={{ color: game?.current_player === 1 ? '#38bdf8' : '#f472b6' }}>{currentPlayerName}</span>
            <span className="text-slate-500">'s turn</span>
            {totalPieces > 0 && <span className="text-slate-500 ml-2">• {totalPieces} pieces placed</span>}
          </span>
        )}
      </div>

      {/* GAME SWITCHER */}
      {friendGames.length > 1 && (
        <div className="bg-slate-900/40 border-b border-slate-700/20 py-1.5 px-4 flex-shrink-0">
          <div className="flex items-center justify-center gap-3">
            <button onClick={handlePrevGame} className="p-1.5 rounded-full bg-slate-700/50 hover:bg-slate-600 text-slate-400 hover:text-white transition-all"><ChevronLeft size={16} /></button>
            <div className="flex items-center gap-1.5">
              {friendGames.map((g, idx) => (
                <button key={g.id} onClick={() => { if (g.id !== gameId && onSwitchGame) { soundManager.playButtonClick(); onSwitchGame(g.id, idx); } }}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    g.id === gameId ? 'bg-slate-400 text-slate-900 shadow-lg shadow-slate-400/30' : 'bg-slate-700 text-slate-500 hover:bg-slate-600 hover:text-white'
                  }`}>{idx + 1}</button>
              ))}
            </div>
            <button onClick={handleNextGame} className="p-1.5 rounded-full bg-slate-700/50 hover:bg-slate-600 text-slate-400 hover:text-white transition-all"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {/* BOARD */}
      <div className="flex-1 flex flex-col items-center justify-start pt-4 sm:pt-6 px-4 py-2 min-h-0">
        <div className="flex flex-col items-center">
          <div className="grid grid-cols-8 gap-0.5 sm:gap-1 p-1.5 sm:p-2 rounded-xl border border-slate-500/30" style={{
            background: 'linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95))',
            boxShadow: '0 0 30px rgba(148,163,184,0.1), inset 0 0 20px rgba(0,0,0,0.3)',
            width: 'min(calc(100vw - 32px), calc(100dvh - 320px), calc(100vh - 320px))',
            height: 'min(calc(100vw - 32px), calc(100dvh - 320px), calc(100vh - 320px))',
            maxWidth: '420px', maxHeight: '420px',
          }}>
            {board.map((row, rowIdx) => row.map((cellValue, colIdx) => {
              const isOccupied = cellValue !== null && cellValue !== 0;
              const pieceName = getPieceName(rowIdx, colIdx);
              const pieceColor = pieceName ? pieceColors[pieceName] : null;
              const cellInfo = cellInfoMap[`${rowIdx},${colIdx}`];
              const isLastMove = cellInfo?.isLastMove;
              return (
                <div key={`${rowIdx}-${colIdx}`} className={`aspect-square rounded-md sm:rounded-lg relative transition-colors duration-100 overflow-hidden ${
                  isOccupied ? (isLastMove ? 'shadow-lg' : `${pieceColor || (cellValue === 1 ? 'bg-gradient-to-br from-cyan-400 via-cyan-500 to-blue-600' : 'bg-gradient-to-br from-pink-400 via-pink-500 to-rose-600')} shadow-md`) : 'bg-slate-700/40'
                }`} style={isLastMove ? { background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)', animation: 'last-move-pulse 2s ease-in-out infinite', boxShadow: `0 0 15px rgba(251,191,36,0.6), inset 0 0 8px rgba(255,255,255,0.3), inset 0 0 0 1.5px ${cellValue === 1 ? 'rgba(34,211,238,0.8)' : 'rgba(244,114,182,0.8)'}` } : isOccupied ? { boxShadow: `inset 0 0 0 1.5px ${cellValue === 1 ? 'rgba(34,211,238,0.6)' : 'rgba(244,114,182,0.6)'}` } : undefined}>
                  {isOccupied && !isLastMove && <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/20 rounded-md sm:rounded-lg" />}
                  {cellInfo && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`font-black text-white ${cellInfo.moveNumber > 9 ? 'text-[9px] sm:text-[11px]' : 'text-[10px] sm:text-xs'}`}
                        style={{ textShadow: '0 0 6px rgba(0,0,0,1), 0 2px 4px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,1)' }}>
                        {cellInfo.moveNumber}
                      </span>
                    </div>
                  )}
                  {isLastMove && (
                    <>
                      <div className="absolute w-1 h-1 bg-yellow-300 rounded-full animate-confetti-1" style={{ left: '20%', top: '-10%' }} />
                      <div className="absolute w-1.5 h-1 bg-amber-400 rounded-sm animate-confetti-2" style={{ left: '60%', top: '-10%' }} />
                      <div className="absolute w-1 h-1.5 bg-yellow-200 rounded-sm animate-confetti-3" style={{ left: '40%', top: '-10%' }} />
                    </>
                  )}
                </div>
              );
            }))}
          </div>
          {spectators.length > 0 && (
            <div className="mt-3 w-full max-w-[340px]">
              <div className="flex items-center gap-2 px-2">
                <Eye size={11} className="text-slate-600 flex-shrink-0" />
                <div className="flex flex-wrap gap-1.5 overflow-hidden max-h-6">
                  {spectators.slice(0, 8).map(spec => <span key={spec.id} className="text-[10px] text-slate-500">{spec.user?.username || 'Anon'}</span>)}
                  {spectators.length > 8 && <span className="text-[10px] text-slate-600">+{spectators.length - 8}</span>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* STOP WATCHING */}
      <div className="flex-shrink-0 px-4 pb-2">
        <button onClick={onClose} className="w-full max-w-[340px] mx-auto block py-2.5 bg-slate-800/80 text-slate-400 rounded-xl font-medium text-sm hover:bg-slate-700 hover:text-white border border-slate-700/50 transition-all">
          Stop Watching
        </button>
      </div>
      <div className="flex-shrink-0" style={{ height: 'max(8px, env(safe-area-inset-bottom))' }} />

      <style>{`
        @keyframes last-move-pulse {
          0%, 100% { box-shadow: 0 0 15px rgba(251,191,36,0.6), inset 0 0 8px rgba(255,255,255,0.3); }
          50% { box-shadow: 0 0 25px rgba(251,191,36,0.9), inset 0 0 12px rgba(255,255,255,0.5); }
        }
        @keyframes glow-pulse-1 { 0%, 100% { opacity: 0.25; transform: scale(1) translate(0,0); } 50% { opacity: 0.4; transform: scale(1.1) translate(-10px,10px); } }
        @keyframes glow-pulse-2 { 0%, 100% { opacity: 0.2; transform: scale(1) translate(0,0); } 50% { opacity: 0.35; transform: scale(1.15) translate(15px,-5px); } }
        @keyframes glow-pulse-3 { 0%, 100% { opacity: 0.15; transform: scale(1) translate(0,0); } 50% { opacity: 0.3; transform: scale(1.05) translate(-5px,-10px); } }
        .animate-glow-pulse-1 { animation: glow-pulse-1 8s ease-in-out infinite; }
        .animate-glow-pulse-2 { animation: glow-pulse-2 10s ease-in-out infinite; animation-delay: 2s; }
        .animate-glow-pulse-3 { animation: glow-pulse-3 12s ease-in-out infinite; animation-delay: 4s; }
        @keyframes confetti-fall-1 { 0% { transform: translate(0,0) rotate(0deg); opacity: 1; } 50% { transform: translate(-2px,16px) rotate(180deg); opacity: 0.8; } 100% { transform: translate(-1px,32px) rotate(360deg); opacity: 0; } }
        @keyframes confetti-fall-2 { 0% { transform: translate(0,0) rotate(45deg); opacity: 1; } 50% { transform: translate(2px,18px) rotate(225deg); opacity: 0.8; } 100% { transform: translate(0px,34px) rotate(405deg); opacity: 0; } }
        @keyframes confetti-fall-3 { 0% { transform: translate(0,0) rotate(20deg); opacity: 1; } 60% { transform: translate(-1px,22px) rotate(240deg); opacity: 0.7; } 100% { transform: translate(3px,36px) rotate(380deg); opacity: 0; } }
        .animate-confetti-1 { animation: confetti-fall-1 1.8s ease-out infinite; }
        .animate-confetti-2 { animation: confetti-fall-2 2.1s ease-out infinite; animation-delay: 0.3s; }
        .animate-confetti-3 { animation: confetti-fall-3 1.9s ease-out infinite; animation-delay: 0.1s; }
      `}</style>
    </div>
  );
};

export const SpectatableGamesList = ({ userId, onSpectate, onClose }) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => { loadGames(); const interval = setInterval(loadGames, 10000); return () => clearInterval(interval); }, []);
  const loadGames = async () => {
    try { const { data, error: e } = await spectatorService.getSpectatableGames(20); if (e) throw e; setGames(data || []); setError(null); }
    catch (err) { console.error('Error loading spectatable games:', err); setError('Unable to load live games.'); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden border border-slate-600/30">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-300"><Eye size={20} /><span className="font-bold">Live Games</span></div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24} /></button>
        </div>
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 80px)', overscrollBehavior: 'contain' }}>
          {loading ? (
            <div className="text-center py-8"><div className="animate-spin w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full mx-auto mb-2" /><p className="text-slate-400 text-sm">Finding games...</p></div>
          ) : games.length === 0 ? (
            <div className="text-center py-8"><Eye className="mx-auto text-slate-600 mb-2" size={40} /><p className="text-slate-400">No live games right now</p><p className="text-slate-500 text-sm mt-1">Check back later!</p></div>
          ) : (
            <div className="space-y-3">
              {games.map(game => (
                <button key={game.game_id} onClick={() => onSpectate(game.game_id)} className="w-full p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-500/50 transition-all text-left">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2"><span className="text-cyan-400 font-medium">{game.player1_username}</span><span className="text-slate-500 text-xs">({game.player1_rating})</span></div>
                    <span className="text-slate-600">vs</span>
                    <div className="flex items-center gap-2"><span className="text-slate-500 text-xs">({game.player2_rating})</span><span className="text-pink-400 font-medium">{game.player2_username}</span></div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Users size={12} /> {game.spectator_count} watching</span>
                    <span className="flex items-center gap-1 text-red-400"><Radio size={12} /> LIVE</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpectatorView;
