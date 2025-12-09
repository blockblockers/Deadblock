// Leaderboard Screen
import { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Medal, Crown, TrendingUp, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';
import NeonTitle from './NeonTitle';
import { soundManager } from '../utils/soundManager';

const Leaderboard = ({ onBack }) => {
  const { profile } = useAuth();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState(null);
  const [filter, setFilter] = useState('rating'); // rating, wins, games

  useEffect(() => {
    loadLeaderboard();
  }, [filter]);

  const loadLeaderboard = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Get top players
      let query = supabase
        .from('profiles')
        .select('*')
        .order(filter === 'rating' ? 'rating' : filter === 'wins' ? 'games_won' : 'games_played', { ascending: false })
        .limit(100);

      const { data, error } = await query;

      if (error) {
        console.error('Error loading leaderboard:', error);
      } else {
        setPlayers(data || []);
        
        // Find my rank
        if (profile?.id) {
          const myIndex = data?.findIndex(p => p.id === profile.id);
          if (myIndex !== -1) {
            setMyRank(myIndex + 1);
          } else {
            // Get my actual rank
            const { count } = await supabase
              .from('profiles')
              .select('*', { count: 'exact', head: true })
              .gt(filter === 'rating' ? 'rating' : filter === 'wins' ? 'games_won' : 'games_played', 
                  filter === 'rating' ? profile.rating : filter === 'wins' ? profile.games_won : profile.games_played);
            
            setMyRank((count || 0) + 1);
          }
        }
      }
    } catch (err) {
      console.error('Error:', err);
    }

    setLoading(false);
  };

  const handleBack = () => {
    soundManager.playButtonClick();
    onBack();
  };

  const handleRefresh = () => {
    soundManager.playClickSound('select');
    loadLeaderboard();
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown size={20} className="text-amber-400" />;
    if (rank === 2) return <Medal size={20} className="text-slate-300" />;
    if (rank === 3) return <Medal size={20} className="text-amber-600" />;
    return <span className="text-slate-500 text-sm font-bold w-5 text-center">{rank}</span>;
  };

  const getRankBg = (rank) => {
    if (rank === 1) return 'bg-gradient-to-r from-amber-900/40 to-yellow-900/40 border-amber-500/40';
    if (rank === 2) return 'bg-gradient-to-r from-slate-700/40 to-slate-600/40 border-slate-400/40';
    if (rank === 3) return 'bg-gradient-to-r from-amber-800/30 to-orange-900/30 border-amber-600/30';
    return 'bg-slate-800/40 border-slate-700/30';
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Grid background */}
      <div className="fixed inset-0 opacity-30 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(251,191,36,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.2) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      {/* Glow */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative min-h-screen px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 text-slate-400 hover:text-cyan-300 transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-black text-amber-400 flex items-center gap-2">
                  <Trophy size={28} />
                  LEADERBOARD
                </h1>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-6">
            {[
              { id: 'rating', label: 'Rating', icon: TrendingUp },
              { id: 'wins', label: 'Wins', icon: Trophy },
              { id: 'games', label: 'Games', icon: Medal }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  soundManager.playClickSound('select');
                  setFilter(tab.id);
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  filter === tab.id
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-slate-800/50 text-slate-500 border border-slate-700/50 hover:text-slate-300'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* My rank card */}
          {profile && myRank && (
            <div className="bg-gradient-to-r from-cyan-900/40 to-blue-900/40 rounded-xl p-4 mb-4 border border-cyan-500/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">
                    {profile.username?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="text-cyan-300 font-bold">{profile.username}</div>
                    <div className="text-cyan-600 text-xs">Your Rank</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-cyan-400">#{myRank}</div>
                  <div className="text-cyan-600 text-xs">
                    {filter === 'rating' ? `${profile.rating} pts` : 
                     filter === 'wins' ? `${profile.games_won} wins` : 
                     `${profile.games_played} games`}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Leaderboard list */}
          <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 border border-slate-700/50">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-500">Loading rankings...</p>
              </div>
            ) : players.length === 0 ? (
              <div className="text-center py-12">
                <Trophy size={48} className="text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500">No players yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {players.map((player, index) => {
                  const rank = index + 1;
                  const isMe = player.id === profile?.id;
                  
                  return (
                    <div
                      key={player.id}
                      className={`p-3 rounded-lg border flex items-center gap-3 transition-all ${
                        isMe 
                          ? 'bg-cyan-900/30 border-cyan-500/40 ring-1 ring-cyan-500/30' 
                          : getRankBg(rank)
                      }`}
                    >
                      {/* Rank */}
                      <div className="w-8 flex justify-center">
                        {getRankIcon(rank)}
                      </div>

                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                        rank === 1 ? 'bg-gradient-to-br from-amber-400 to-yellow-600' :
                        rank === 2 ? 'bg-gradient-to-br from-slate-300 to-slate-500' :
                        rank === 3 ? 'bg-gradient-to-br from-amber-600 to-orange-700' :
                        'bg-slate-700'
                      }`}>
                        {player.username?.[0]?.toUpperCase() || '?'}
                      </div>

                      {/* Name */}
                      <div className="flex-1">
                        <div className={`font-medium ${isMe ? 'text-cyan-300' : 'text-white'}`}>
                          {player.username}
                          {isMe && <span className="text-cyan-500 text-xs ml-2">(You)</span>}
                        </div>
                        <div className="text-slate-600 text-xs">
                          {player.games_played} games • {player.games_won} wins
                        </div>
                      </div>

                      {/* Score */}
                      <div className="text-right">
                        <div className={`font-bold ${
                          rank === 1 ? 'text-amber-400' :
                          rank === 2 ? 'text-slate-300' :
                          rank === 3 ? 'text-amber-600' :
                          'text-slate-400'
                        }`}>
                          {filter === 'rating' ? player.rating :
                           filter === 'wins' ? player.games_won :
                           player.games_played}
                        </div>
                        <div className="text-slate-600 text-xs">
                          {filter === 'rating' ? 'rating' : filter === 'wins' ? 'wins' : 'games'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
