// GameReplay - Watch recorded games move by move
import { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, FastForward, Rewind, Share2, X, Clock, Trophy, User } from 'lucide-react';
import { replayService } from '../services/replayService';
import GameBoard from './GameBoard';
import { BOARD_SIZE } from '../utils/gameLogic';
import { soundManager } from '../utils/soundManager';

const GameReplay = ({ gameId, onClose }) => {
  const [summary, setSummary] = useState(null);
  const [moves, setMoves] = useState([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState(
    Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null))
  );
  const [boardPieces, setBoardPieces] = useState({});
  const playIntervalRef = useRef(null);

  useEffect(() => {
    loadReplay();
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [gameId]);

  const loadReplay = async () => {
    setLoading(true);
    
    const [summaryResult, movesResult] = await Promise.all([
      replayService.getReplaySummary(gameId),
      replayService.getGameMoves(gameId)
    ]);

    if (summaryResult.data) setSummary(summaryResult.data);
    if (movesResult.data) setMoves(movesResult.data);
    
    setLoading(false);
  };

  // Apply board state up to a given move
  const applyBoardState = (moveIndex) => {
    if (moveIndex < 0) {
      // Reset to empty board
      setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
      setBoardPieces({});
      return;
    }

    const move = moves[moveIndex];
    if (move?.board_state) {
      // Use saved board state if available
      setBoard(move.board_state.board || move.board_state);
      setBoardPieces(move.board_state.boardPieces || {});
    }
  };

  // Go to specific move
  const goToMove = (index) => {
    const clampedIndex = Math.max(-1, Math.min(index, moves.length - 1));
    setCurrentMoveIndex(clampedIndex);
    applyBoardState(clampedIndex);
    soundManager.playClickSound('soft');
  };

  // Playback controls
  const togglePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    } else {
      if (currentMoveIndex >= moves.length - 1) {
        // Reset to beginning if at end
        goToMove(-1);
      }
      setIsPlaying(true);
      playIntervalRef.current = setInterval(() => {
        setCurrentMoveIndex(prev => {
          const next = prev + 1;
          if (next >= moves.length) {
            setIsPlaying(false);
            clearInterval(playIntervalRef.current);
            return prev;
          }
          applyBoardState(next);
          soundManager.playClickSound('soft');
          return next;
        });
      }, 1500 / playbackSpeed);
    }
  };

  // Update interval when speed changes
  useEffect(() => {
    if (isPlaying && playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = setInterval(() => {
        setCurrentMoveIndex(prev => {
          const next = prev + 1;
          if (next >= moves.length) {
            setIsPlaying(false);
            clearInterval(playIntervalRef.current);
            return prev;
          }
          applyBoardState(next);
          return next;
        });
      }, 1500 / playbackSpeed);
    }
  }, [playbackSpeed]);

  // Share replay
  const shareReplay = async () => {
    const link = replayService.getReplayLink(gameId);
    if (navigator.share) {
      await navigator.share({
        title: 'Deadblock Game Replay',
        text: `Watch this game between ${summary?.player1?.username} and ${summary?.player2?.username}!`,
        url: link
      });
    } else {
      navigator.clipboard.writeText(link);
      alert('Replay link copied!');
    }
  };

  const currentMove = currentMoveIndex >= 0 ? moves[currentMoveIndex] : null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-3 border-amber-400 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-400">Loading replay...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col z-50">
      {/* Header */}
      <div className="bg-slate-900 border-b border-amber-500/30 p-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X size={24} />
            </button>
            <div>
              <h2 className="text-amber-300 font-bold">Game Replay</h2>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock size={12} />
                {summary?.durationFormatted || 'Unknown'}
                <span>•</span>
                {summary?.moveCount || 0} moves
              </div>
            </div>
          </div>
          <button
            onClick={shareReplay}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
          >
            <Share2 size={16} />
            Share
          </button>
        </div>
      </div>

      {/* Players */}
      <div className="bg-slate-900/50 p-3">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {/* Player 1 */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              {summary?.player1?.username?.[0] || '?'}
            </div>
            <div>
              <div className="text-white font-medium flex items-center gap-1">
                {summary?.player1?.username}
                {summary?.winner_id === summary?.player1?.id && (
                  <Trophy size={14} className="text-amber-400" />
                )}
              </div>
              <div className="text-xs text-slate-400">
                {summary?.player1?.elo_rating || 1200}
              </div>
            </div>
          </div>

          <div className="text-slate-600 font-bold">VS</div>

          {/* Player 2 */}
          <div className="flex items-center gap-2">
            <div>
              <div className="text-white font-medium flex items-center gap-1 justify-end">
                {summary?.winner_id === summary?.player2?.id && (
                  <Trophy size={14} className="text-amber-400" />
                )}
                {summary?.player2?.username}
              </div>
              <div className="text-xs text-slate-400 text-right">
                {summary?.player2?.elo_rating || 1200}
              </div>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
              {summary?.player2?.username?.[0] || '?'}
            </div>
          </div>
        </div>
      </div>

      {/* Game Board */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <GameBoard
            board={board}
            boardPieces={boardPieces}
            selectedPiece={null}
            pendingMove={null}
            currentPlayer={currentMove?.player?.id === summary?.player1?.id ? 1 : 2}
            onCellClick={() => {}}
            disabled={true}
          />
        </div>
      </div>

      {/* Current move info */}
      {currentMove && (
        <div className="bg-slate-900/50 p-2 text-center">
          <span className="text-slate-400 text-sm">
            Move {currentMove.move_number}: 
            <span className={currentMove.player?.id === summary?.player1?.id ? 'text-cyan-400' : 'text-pink-400'}>
              {' '}{currentMove.player?.username}
            </span>
            {' '}placed {currentMove.piece_type}
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div className="px-4 py-2 bg-slate-900">
        <div className="max-w-lg mx-auto">
          <input
            type="range"
            min="-1"
            max={moves.length - 1}
            value={currentMoveIndex}
            onChange={(e) => goToMove(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
              [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Start</span>
            <span>Move {currentMoveIndex + 1} / {moves.length}</span>
            <span>End</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-slate-900 border-t border-amber-500/30 p-4">
        <div className="flex items-center justify-center gap-3 max-w-lg mx-auto">
          {/* Skip to start */}
          <button
            onClick={() => goToMove(-1)}
            className="p-2 text-slate-400 hover:text-white disabled:opacity-50"
            disabled={currentMoveIndex === -1}
          >
            <SkipBack size={20} />
          </button>

          {/* Previous */}
          <button
            onClick={() => goToMove(currentMoveIndex - 1)}
            className="p-2 text-slate-400 hover:text-white disabled:opacity-50"
            disabled={currentMoveIndex === -1}
          >
            <Rewind size={20} />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlayback}
            className="p-4 bg-amber-500 text-slate-900 rounded-full hover:bg-amber-400"
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>

          {/* Next */}
          <button
            onClick={() => goToMove(currentMoveIndex + 1)}
            className="p-2 text-slate-400 hover:text-white disabled:opacity-50"
            disabled={currentMoveIndex >= moves.length - 1}
          >
            <FastForward size={20} />
          </button>

          {/* Skip to end */}
          <button
            onClick={() => goToMove(moves.length - 1)}
            className="p-2 text-slate-400 hover:text-white disabled:opacity-50"
            disabled={currentMoveIndex >= moves.length - 1}
          >
            <SkipForward size={20} />
          </button>

          {/* Speed control */}
          <div className="ml-4 flex items-center gap-2">
            <span className="text-xs text-slate-500">Speed:</span>
            {[0.5, 1, 2].map(speed => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-2 py-1 text-xs rounded ${
                  playbackSpeed === speed 
                    ? 'bg-amber-500 text-slate-900' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameReplay;
