// SpectatorView - Watch live games
import { useState, useEffect, useRef } from 'react';
import { Eye, X, Users, Clock, Trophy, Radio } from 'lucide-react';
import { spectatorService } from '../services/spectatorService';
import { ratingService } from '../services/ratingService';
import GameBoard from './GameBoard';
import { BOARD_SIZE } from '../utils/gameLogic';
import { soundManager } from '../utils/soundManager';

const SpectatorView = ({ gameId, userId, onClose }) => {
  const [game, setGame] = useState(null);
  const [spectators, setSpectators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [board, setBoard] = useState(
    Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null))
  );
  const [boardPieces, setBoardPieces] = useState({});
  const gameSubRef = useRef(null);
  const spectatorSubRef = useRef(null);

  useEffect(() => {
    initSpectating();
    
    return () => {
      leaveSpectating();
    };
  }, [gameId, userId]);

  const initSpectating = async () => {
    setLoading(true);
    
    // Join as spectator
    if (userId) {
      await spectatorService.joinAsSpectator(gameId, userId);
    }

    // Load game data
    const { data: gameData, error: gameError } = await spectatorService.getGameForSpectating(gameId);
    
    if (gameError) {
      setError(gameError.message);
      setLoading(false);
      return;
    }

    setGame(gameData);
    updateBoard(gameData);

    // Load spectators
    const { data: specs } = await spectatorService.getSpectators(gameId);
    setSpectators(specs || []);

    // Subscribe to game updates
    gameSubRef.current = spectatorService.subscribeToGame(
      gameId,
      (updatedGame) => {
        setGame(updatedGame);
        updateBoard(updatedGame);
        soundManager.playClickSound('soft');
      },
      (err) => {
        console.error('Spectator subscription error:', err);
      }
    );

    // Subscribe to spectator updates
    spectatorSubRef.current = spectatorService.subscribeToSpectators(
      gameId,
      (updatedSpectators) => {
        setSpectators(updatedSpectators);
      }
    );

    setLoading(false);
  };

  const leaveSpectating = async () => {
    if (userId) {
      await spectatorService.leaveSpectating(gameId, userId);
    }
    if (gameSubRef.current) {
      spectatorService.unsubscribe(gameSubRef.current);
    }
    if (spectatorSubRef.current) {
      spectatorService.unsubscribe(spectatorSubRef.current);
    }
  };

  const updateBoard = (gameData) => {
    if (!gameData) return;
    
    let validBoard = gameData.board;
    if (Array.isArray(validBoard) && validBoard.length === BOARD_SIZE) {
      validBoard = validBoard.map(row => 
        row.map(cell => (cell === 0 ? null : cell))
      );
      setBoard(validBoard);
    }
    setBoardPieces(gameData.board_pieces || {});
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-3 border-amber-400 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-400">Joining as spectator...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="bg-slate-900 rounded-xl p-6 max-w-sm text-center border border-red-500/30">
          <X className="mx-auto text-red-400 mb-4" size={48} />
          <h2 className="text-lg font-bold text-white mb-2">Cannot Spectate</h2>
          <p className="text-slate-400 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const isGameOver = game?.status === 'completed';
  const currentPlayerName = game?.current_player === 1 
    ? game?.player1?.username 
    : game?.player2?.username;

  const player1Tier = ratingService.getRatingTier(game?.player1?.elo_rating || 1200);
  const player2Tier = ratingService.getRatingTier(game?.player2?.elo_rating || 1200);

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col z-50">
      {/* Header */}
      <div className="bg-slate-900 border-b border-amber-500/30 p-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X size={24} />
            </button>
            <div className="flex items-center gap-2">
              <Eye className="text-amber-400" size={20} />
              <span className="text-amber-300 font-bold">Spectating</span>
              {!isGameOver && (
                <span className="flex items-center gap-1 text-red-400 text-xs animate-pulse">
                  <Radio size={12} /> LIVE
                </span>
              )}
            </div>
          </div>
          
          {/* Spectator count */}
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Users size={16} />
            {spectators.length} watching
          </div>
        </div>
      </div>

      {/* Players */}
      <div className="bg-slate-900/50 p-3">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {/* Player 1 */}
          <div className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
            !isGameOver && game?.current_player === 1 ? 'bg-cyan-500/20 ring-2 ring-cyan-400' : ''
          }`}>
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {game?.player1?.username?.[0] || '?'}
            </div>
            <div>
              <div className="text-white font-medium flex items-center gap-1">
                {game?.player1?.username}
                {isGameOver && game?.winner_id === game?.player1?.id && (
                  <Trophy size={14} className="text-amber-400" />
                )}
              </div>
              <div className="text-xs flex items-center gap-1">
                <span className={player1Tier.color}>{player1Tier.icon}</span>
                <span className="text-slate-400">{game?.player1?.elo_rating || 1200}</span>
              </div>
            </div>
          </div>

          <div className="text-slate-600 font-bold text-lg">VS</div>

          {/* Player 2 */}
          <div className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
            !isGameOver && game?.current_player === 2 ? 'bg-pink-500/20 ring-2 ring-pink-400' : ''
          }`}>
            <div>
              <div className="text-white font-medium flex items-center gap-1 justify-end">
                {isGameOver && game?.winner_id === game?.player2?.id && (
                  <Trophy size={14} className="text-amber-400" />
                )}
                {game?.player2?.username}
              </div>
              <div className="text-xs flex items-center gap-1 justify-end">
                <span className="text-slate-400">{game?.player2?.elo_rating || 1200}</span>
                <span className={player2Tier.color}>{player2Tier.icon}</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {game?.player2?.username?.[0] || '?'}
            </div>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="bg-slate-800/50 p-2 text-center">
        {isGameOver ? (
          <span className="text-amber-400 font-medium">
            Game Over - {game?.winner_id === game?.player1?.id ? game?.player1?.username : game?.player2?.username} wins!
          </span>
        ) : (
          <span className="text-slate-300">
            <span className={game?.current_player === 1 ? 'text-cyan-400' : 'text-pink-400'}>
              {currentPlayerName}
            </span>'s turn
          </span>
        )}
      </div>

      {/* Game Board */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div className="w-full max-w-md">
          <GameBoard
            board={board}
            boardPieces={boardPieces}
            selectedPiece={null}
            pendingMove={null}
            currentPlayer={game?.current_player || 1}
            onCellClick={() => {}}
            disabled={true}
          />
        </div>
      </div>

      {/* Spectators list */}
      {spectators.length > 0 && (
        <div className="bg-slate-900 border-t border-slate-800 p-3">
          <div className="max-w-md mx-auto">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
              <Eye size={12} /> Spectators:
            </div>
            <div className="flex flex-wrap gap-2">
              {spectators.slice(0, 10).map(spec => (
                <span 
                  key={spec.id}
                  className="px-2 py-1 bg-slate-800 rounded-full text-xs text-slate-400"
                >
                  {spec.user?.username || 'Anonymous'}
                </span>
              ))}
              {spectators.length > 10 && (
                <span className="px-2 py-1 bg-slate-800 rounded-full text-xs text-slate-500">
                  +{spectators.length - 10} more
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leave button */}
      <div className="bg-slate-900 border-t border-amber-500/30 p-4">
        <button
          onClick={onClose}
          className="w-full max-w-md mx-auto block py-3 bg-slate-800 text-slate-300 rounded-lg font-medium hover:bg-slate-700"
        >
          Stop Watching
        </button>
      </div>
    </div>
  );
};

// Spectatable games list
export const SpectatableGamesList = ({ userId, onSpectate, onClose }) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGames();
    const interval = setInterval(loadGames, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const loadGames = async () => {
    const { data } = await spectatorService.getSpectatableGames(20);
    setGames(data || []);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden border border-amber-500/30">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-amber-500/20">
          <div className="flex items-center gap-2">
            <Eye className="text-amber-400" size={24} />
            <h2 className="text-lg font-bold text-amber-300">Live Games</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Games list */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Finding games...</p>
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-8">
              <Eye className="mx-auto text-slate-600 mb-2" size={40} />
              <p className="text-slate-400">No live games right now</p>
              <p className="text-slate-500 text-sm mt-1">Check back later!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {games.map(game => (
                <button
                  key={game.game_id}
                  onClick={() => onSpectate(game.game_id)}
                  className="w-full p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-amber-500/30 transition-all text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-medium">{game.player1_username}</span>
                      <span className="text-slate-500 text-xs">({game.player1_rating})</span>
                    </div>
                    <span className="text-slate-600">vs</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-xs">({game.player2_rating})</span>
                      <span className="text-pink-400 font-medium">{game.player2_username}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users size={12} /> {game.spectator_count} watching
                    </span>
                    <span className="flex items-center gap-1 text-red-400">
                      <Radio size={12} /> LIVE
                    </span>
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
