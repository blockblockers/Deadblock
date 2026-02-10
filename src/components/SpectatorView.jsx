// SpectatorView.jsx - Watch live games
// v7.17: Added Back button and Deadblock title to header
// v7.10: Added iOS scroll fixes for games list
// v7.7: Added game switching for multiple active games (when watching a friend)
import { useState, useEffect, useRef } from 'react';
import { Eye, X, Users, Clock, Trophy, Radio, AlertTriangle, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { spectatorService } from '../services/spectatorService';
import { ratingService } from '../services/ratingService';
import TierIcon from './TierIcon';
import NeonTitle from './NeonTitle';
import GameBoard from './GameBoard';
import { BOARD_SIZE } from '../utils/gameLogic';
import { soundManager } from '../utils/soundManager';

const SpectatorView = ({ 
  gameId, 
  userId, 
  onClose,
  // NEW v7.7: Support for multiple games
  friendGames = [],      // Array of active games for this friend
  onSwitchGame,          // Callback to switch to different game
  currentGameIndex = 0   // Current position in friendGames array
}) => {
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
    } else {
      validBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    }
    
    setBoard(validBoard);
    setBoardPieces(gameData.board_pieces || {});
  };

  // Handle switching to previous game
  const handlePrevGame = () => {
    if (friendGames.length <= 1) return;
    const prevIndex = currentGameIndex > 0 ? currentGameIndex - 1 : friendGames.length - 1;
    const prevGame = friendGames[prevIndex];
    if (prevGame?.id && onSwitchGame) {
      soundManager.playButtonClick();
      onSwitchGame(prevGame.id, prevIndex);
    }
  };

  // Handle switching to next game
  const handleNextGame = () => {
    if (friendGames.length <= 1) return;
    const nextIndex = currentGameIndex < friendGames.length - 1 ? currentGameIndex + 1 : 0;
    const nextGame = friendGames[nextIndex];
    if (nextGame?.id && onSwitchGame) {
      soundManager.playButtonClick();
      onSwitchGame(nextGame.id, nextIndex);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-400">Joining as spectator...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-xl p-6 text-center max-w-sm">
          <AlertTriangle className="mx-auto text-amber-400 mb-3" size={48} />
          <h2 className="text-white text-xl font-bold mb-2">Unable to Watch</h2>
          <p className="text-slate-400 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-400"
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

  // Get player tiers
  const player1Tier = ratingService.getRatingTier(game?.player1?.rating || game?.player1?.elo_rating || 1200);
  const player2Tier = ratingService.getRatingTier(game?.player2?.rating || game?.player2?.elo_rating || 1200);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col">
      {/* Header with Back Button and Deadblock Title */}
      <div className="bg-slate-900 border-b border-amber-500/30 p-4">
        <div className="flex items-center justify-between max-w-md mx-auto relative">
          {/* Back Button */}
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm">Back</span>
          </button>
          
          {/* Centered Deadblock Title */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <NeonTitle text="DEADBLOCK" size="small" />
          </div>
          
          {/* Spectator Count */}
          <div className="flex items-center gap-1 text-slate-500 text-sm">
            <Users size={16} />
            <span>{spectators.length}</span>
          </div>
        </div>
      </div>
      
      {/* Live Indicator Bar */}
      <div className="bg-slate-800/50 border-b border-slate-700/50 py-2 px-4">
        <div className="max-w-md mx-auto flex items-center justify-center gap-2">
          <Eye size={16} className="text-amber-400" />
          <span className="text-amber-400 font-medium text-sm">Spectating</span>
          {!isGameOver && (
            <span className="flex items-center gap-1 text-xs text-red-400 animate-pulse">
              <Radio size={12} /> LIVE
            </span>
          )}
        </div>
      </div>

      {/* NEW v7.7: Game Switcher (when watching friend with multiple games) */}
      {friendGames.length > 1 && (
        <div className="bg-slate-800/50 border-b border-slate-700/50 py-2 px-4">
          <div className="max-w-md mx-auto flex items-center justify-center gap-4">
            <button
              onClick={handlePrevGame}
              className="p-2 rounded-full bg-slate-700/50 hover:bg-slate-600 text-slate-400 hover:text-white transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            
            <div className="flex items-center gap-2">
              {friendGames.map((g, idx) => (
                <button
                  key={g.id}
                  onClick={() => {
                    if (g.id !== gameId && onSwitchGame) {
                      soundManager.playButtonClick();
                      onSwitchGame(g.id, idx);
                    }
                  }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    g.id === gameId 
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' 
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'
                  }`}
                  title={`Game ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            
            <button
              onClick={handleNextGame}
              className="p-2 rounded-full bg-slate-700/50 hover:bg-slate-600 text-slate-400 hover:text-white transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <p className="text-center text-slate-500 text-xs mt-1">
            Game {currentGameIndex + 1} of {friendGames.length}
          </p>
        </div>
      )}

      {/* Players */}
      <div className="bg-slate-800/50 p-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {/* Player 1 */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <TierIcon tier={player1Tier.name} size={24} />
              {game?.current_player === 1 && !isGameOver && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-pulse" />
              )}
            </div>
            <div>
              <div className="text-cyan-400 font-medium text-sm">{game?.player1?.username || 'Player 1'}</div>
              <div className="text-slate-500 text-xs">{game?.player1?.rating || game?.player1?.elo_rating || 1200}</div>
            </div>
          </div>

          {/* VS */}
          <div className="text-slate-600 font-bold">VS</div>

          {/* Player 2 */}
          <div className="flex items-center gap-2">
            <div>
              <div className="text-pink-400 font-medium text-sm text-right">{game?.player2?.username || 'Player 2'}</div>
              <div className="text-slate-500 text-xs text-right">{game?.player2?.rating || game?.player2?.elo_rating || 1200}</div>
            </div>
            <div className="relative">
              <TierIcon tier={player2Tier.name} size={24} />
              {game?.current_player === 2 && !isGameOver && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-pink-400 rounded-full animate-pulse" />
              )}
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
  const [error, setError] = useState(null);

  useEffect(() => {
    loadGames();
    const interval = setInterval(loadGames, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const loadGames = async () => {
    try {
      const { data, error: fetchError } = await spectatorService.getSpectatableGames(20);
      if (fetchError) throw fetchError;
      setGames(data || []);
      setError(null);
    } catch (err) {
      console.error('Error loading spectatable games:', err);
      setError('Unable to load live games. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-400">
            <Eye size={20} />
            <span className="font-bold">Live Games</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Games list - v7.10: iOS scroll fix */}
        <div 
          className="p-4 overflow-y-auto" 
          style={{ 
            maxHeight: 'calc(80vh - 80px)',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain'
          }}
        >
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
