// User Profile Screen
import { useState, useEffect } from 'react';
import { ArrowLeft, Edit2, Save, X, Trophy, Target, Percent, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { gameSyncService } from '../services/gameSync';
import NeonTitle from './NeonTitle';
import { soundManager } from '../utils/soundManager';

const UserProfile = ({ onBack }) => {
  const { profile, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [saving, setSaving] = useState(false);
  const [recentGames, setRecentGames] = useState([]);
  const [stats, setStats] = useState({
    totalGames: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    currentStreak: 0,
    bestStreak: 0
  });

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || profile.username);
      loadStats();
    }
  }, [profile]);

  const loadStats = async () => {
    if (!profile?.id) return;

    try {
      const { data: games } = await gameSyncService.getPlayerGames(profile.id, 50);
      
      if (games) {
        const completed = games.filter(g => g.status === 'completed');
        const wins = completed.filter(g => g.winner_id === profile.id).length;
        const losses = completed.length - wins;
        
        // Calculate streak
        let currentStreak = 0;
        let bestStreak = 0;
        let streak = 0;
        
        for (const game of completed) {
          if (game.winner_id === profile.id) {
            streak++;
            bestStreak = Math.max(bestStreak, streak);
          } else {
            if (currentStreak === 0 && streak > 0) {
              currentStreak = streak;
            }
            streak = 0;
          }
        }
        if (streak > 0) currentStreak = streak;

        setStats({
          totalGames: completed.length,
          wins,
          losses,
          winRate: completed.length > 0 ? Math.round((wins / completed.length) * 100) : 0,
          currentStreak,
          bestStreak
        });

        setRecentGames(completed.slice(0, 10));
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    soundManager.playButtonClick();
    
    const { error } = await updateProfile({ display_name: displayName });
    
    if (!error) {
      setEditing(false);
    }
    
    setSaving(false);
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Grid background */}
      <div className="fixed inset-0 opacity-30 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      {/* Content */}
      <div className="relative min-h-screen px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={handleBack}
              className="p-2 text-slate-400 hover:text-cyan-300 transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <NeonTitle size="small" />
          </div>

          {/* Profile Card */}
          <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-6 mb-4 border border-cyan-500/30 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
            {/* Avatar and name */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                {profile?.username?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1">
                {editing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-500 outline-none"
                      placeholder="Display name"
                    />
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50"
                    >
                      <Save size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setDisplayName(profile?.display_name || profile?.username);
                      }}
                      className="p-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-white text-2xl font-bold">
                      {profile?.display_name || profile?.username}
                    </h2>
                    <button
                      onClick={() => setEditing(true)}
                      className="p-1.5 text-slate-500 hover:text-cyan-400 transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                )}
                <p className="text-slate-500">@{profile?.username}</p>
              </div>
            </div>

            {/* Rating */}
            <div className="text-center py-4 bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-xl border border-amber-500/30 mb-6">
              <div className="text-4xl font-black text-amber-400 mb-1">
                {profile?.rating || 1000}
              </div>
              <div className="text-amber-600 text-sm font-medium">RATING</div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <Target size={20} className="text-cyan-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{stats.totalGames}</div>
                <div className="text-slate-500 text-xs">Games Played</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <Percent size={20} className="text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{stats.winRate}%</div>
                <div className="text-slate-500 text-xs">Win Rate</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <Trophy size={20} className="text-amber-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{stats.wins}</div>
                <div className="text-slate-500 text-xs">Victories</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <div className="text-xl mb-2">🔥</div>
                <div className="text-2xl font-bold text-white">{stats.bestStreak}</div>
                <div className="text-slate-500 text-xs">Best Streak</div>
              </div>
            </div>
          </div>

          {/* Match History */}
          <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 border border-slate-700/50">
            <h3 className="text-slate-400 font-bold text-sm mb-4 flex items-center gap-2">
              <Calendar size={16} />
              MATCH HISTORY
            </h3>

            {recentGames.length === 0 ? (
              <p className="text-slate-600 text-center py-8">No games played yet</p>
            ) : (
              <div className="space-y-2">
                {recentGames.map(game => {
                  const won = game.winner_id === profile?.id;
                  return (
                    <div
                      key={game.id}
                      className={`p-3 rounded-lg flex items-center justify-between ${
                        won ? 'bg-green-900/20 border border-green-500/20' : 'bg-red-900/20 border border-red-500/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${won ? 'bg-green-400' : 'bg-red-400'}`} />
                        <div>
                          <div className="text-slate-300 text-sm">vs {getOpponentName(game)}</div>
                          <div className="text-slate-600 text-xs">{formatDate(game.created_at)}</div>
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${won ? 'text-green-400' : 'text-red-400'}`}>
                        {won ? 'WIN' : 'LOSS'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Member since */}
          <p className="text-center text-slate-600 text-xs mt-6">
            Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
