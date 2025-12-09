// Online Menu - Hub for online features
import { useState, useEffect } from 'react';
import { Swords, Trophy, User, LogOut, History, Users, ChevronRight, Wifi } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { gameSyncService } from '../services/gameSync';
import NeonTitle from './NeonTitle';
import { soundManager } from '../utils/soundManager';

const OnlineMenu = ({ 
  onFindMatch, 
  onViewProfile, 
  onViewLeaderboard, 
  onResumeGame,
  onBack 
}) => {
  const { profile, signOut, isAuthenticated } = useAuth();
  const [activeGames, setActiveGames] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGames();
  }, [profile?.id]);

  const loadGames = async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    try {
      // Get active games
      const { data: active } = await gameSyncService.getActiveGames(profile.id);
      setActiveGames(active || []);

      // Get recent completed games
      const { data: recent } = await gameSyncService.getPlayerGames(profile.id, 5);
      setRecentGames((recent || []).filter(g => g.status === 'completed'));
    } catch (err) {
      console.error('Error loading games:', err);
    }
    
    setLoading(false);
  };

  const handleSignOut = async () => {
    soundManager.playButtonClick();
    await signOut();
    onBack();
  };

  const handleFindMatch = () => {
    soundManager.playButtonClick();
    onFindMatch();
  };

  const handleBack = () => {
    soundManager.playButtonClick();
    onBack();
  };

  const getOpponentName = (game) => {
    if (game.player1_id === profile?.id) {
      return game.player2?.username || 'Unknown';
    }
    return game.player1?.username || 'Unknown';
  };

  const getGameResult = (game) => {
    if (!game.winner_id) return { text: 'Draw', color: 'text-slate-400' };
    if (game.winner_id === profile?.id) return { text: 'Won', color: 'text-green-400' };
    return { text: 'Lost', color: 'text-red-400' };
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Grid background */}
      <div className="fixed inset-0 opacity-30 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />
      
      {/* Glow effects */}
      <div className="fixed top-1/4 left-1/4 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative min-h-screen flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-md">
          
          {/* Header */}
          <div className="text-center mb-6">
            <NeonTitle size="large" />
            <div className="flex items-center justify-center gap-2 mt-2">
              <Wifi size={16} className="text-green-400" />
              <span className="text-green-400 text-sm font-medium">ONLINE</span>
            </div>
          </div>

          {/* User Card */}
          <div className="bg-slate-900/90 backdrop-blur-md rounded-xl p-4 mb-4 border border-cyan-500/30">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                {profile?.username?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1">
                <h2 className="text-white font-bold text-lg">{profile?.username || 'Player'}</h2>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-amber-400">⭐ {profile?.rating || 1000}</span>
                  <span className="text-slate-500">{profile?.games_played || 0} games</span>
                  <span className="text-green-400">{profile?.games_won || 0} wins</span>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                title="Sign Out"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>

          {/* Main Actions */}
          <div className="bg-slate-900/90 backdrop-blur-md rounded-xl p-4 mb-4 border border-cyan-500/30 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
            {/* Find Match - Primary CTA */}
            <button
              onClick={handleFindMatch}
              className="w-full p-4 mb-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold text-white flex items-center justify-center gap-3 hover:from-cyan-400 hover:to-blue-500 transition-all shadow-[0_0_25px_rgba(34,211,238,0.4)] active:scale-[0.98]"
            >
              <Swords size={24} />
              FIND MATCH
            </button>

            {/* Secondary actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onViewLeaderboard}
                className="p-3 bg-slate-800 rounded-lg text-slate-300 hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
              >
                <Trophy size={18} className="text-amber-400" />
                <span className="text-sm">Leaderboard</span>
              </button>
              <button
                onClick={onViewProfile}
                className="p-3 bg-slate-800 rounded-lg text-slate-300 hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
              >
                <User size={18} className="text-cyan-400" />
                <span className="text-sm">Profile</span>
              </button>
            </div>
          </div>

          {/* Active Games */}
          {activeGames.length > 0 && (
            <div className="bg-slate-900/90 backdrop-blur-md rounded-xl p-4 mb-4 border border-amber-500/30">
              <h3 className="text-amber-400 font-bold text-sm mb-3 flex items-center gap-2">
                <Swords size={16} />
                ACTIVE GAMES
              </h3>
              <div className="space-y-2">
                {activeGames.map(game => (
                  <button
                    key={game.id}
                    onClick={() => {
                      soundManager.playButtonClick();
                      onResumeGame(game);
                    }}
                    className="w-full p-3 bg-slate-800/80 rounded-lg flex items-center justify-between hover:bg-slate-700/80 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
                        {getOpponentName(game)[0]?.toUpperCase()}
                      </div>
                      <div className="text-left">
                        <div className="text-white text-sm font-medium">vs {getOpponentName(game)}</div>
                        <div className="text-slate-500 text-xs">
                          {gameSyncService.isPlayerTurn(game, profile?.id) ? 'Your turn' : 'Their turn'}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-600 group-hover:text-cyan-400 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent Games */}
          {recentGames.length > 0 && (
            <div className="bg-slate-900/90 backdrop-blur-md rounded-xl p-4 mb-4 border border-slate-700/50">
              <h3 className="text-slate-400 font-bold text-sm mb-3 flex items-center gap-2">
                <History size={16} />
                RECENT GAMES
              </h3>
              <div className="space-y-2">
                {recentGames.slice(0, 3).map(game => {
                  const result = getGameResult(game);
                  return (
                    <div
                      key={game.id}
                      className="p-3 bg-slate-800/50 rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-xs font-bold">
                          {getOpponentName(game)[0]?.toUpperCase()}
                        </div>
                        <div className="text-left">
                          <div className="text-slate-300 text-sm">vs {getOpponentName(game)}</div>
                          <div className="text-slate-600 text-xs">
                            {new Date(game.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${result.color}`}>
                        {result.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Back button */}
          <button
            onClick={handleBack}
            className="w-full py-3 text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            ← Back to Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnlineMenu;
