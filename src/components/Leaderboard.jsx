// Leaderboard.jsx - Global leaderboard with scrollable list
// v7.20: Fixed stats to show online-only games/wins (subtracts AI + local from profile totals)
// v7.19: Added Eye icon per player row to watch their active games. Accepts onSpectateGame prop.
// v7.18: Added safe area top padding for iPhone notch clearance
// v7.17: Fixed mobile scroll - proper touch-action, safe area padding, hardware acceleration
// Place in src/components/Leaderboard.jsx

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Trophy, Crown, Medal, User, RefreshCw, TrendingUp, Gamepad2, Award, Eye, X, Radio, Loader } from 'lucide-react';
import { soundManager } from '../utils/soundManager';
import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getRankInfo } from '../utils/rankUtils';
import { spectatorService } from '../services/spectatorService';
import TierIcon from './TierIcon';

// v7.20: Compute online-only stats — profiles.games_played/games_won include AI + local games
const getOnlineStats = (p) => {
  const aiWins = (p.ai_easy_wins || 0) + (p.ai_medium_wins || 0) + (p.ai_hard_wins || 0);
  const aiLosses = (p.ai_easy_losses || 0) + (p.ai_medium_losses || 0) + (p.ai_hard_losses || 0);
  const onlineGames = Math.max(0, (p.games_played || 0) - aiWins - aiLosses - (p.local_games_played || 0));
  const onlineWins = Math.max(0, (p.games_won || 0) - aiWins);
  return { onlineGames, onlineWins };
};

const Leaderboard = ({ onBack, onSpectateGame }) => {
  const { profile } = useAuth();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('rating'); // 'rating', 'wins', 'games'
  const [myRank, setMyRank] = useState(null);
  const [watchPlayer, setWatchPlayer] = useState(null);
  const [watchGames, setWatchGames] = useState([]);
  const [loadingWatch, setLoadingWatch] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    loadLeaderboard();
  }, [filter]);

  const loadLeaderboard = async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // v7.20: Fetch AI stats + local_games_played to compute online-only values
      let query = supabase
        .from('profiles')
        .select('id, username, display_name, rating, games_played, games_won, avatar_url, ai_easy_wins, ai_easy_losses, ai_medium_wins, ai_medium_losses, ai_hard_wins, ai_hard_losses, local_games_played')
        .gt('games_played', 0)
        .order('rating', { ascending: false });

      const { data, error } = await query.limit(200);

      if (!error && data) {
        // Compute online-only stats for each player
        const enriched = data.map(p => {
          const { onlineGames, onlineWins } = getOnlineStats(p);
          return { ...p, onlineGames, onlineWins };
        }).filter(p => p.onlineGames > 0);

        // Re-sort by corrected values for wins/games filters
        if (filter === 'wins') {
          enriched.sort((a, b) => b.onlineWins - a.onlineWins);
        } else if (filter === 'games') {
          enriched.sort((a, b) => b.onlineGames - a.onlineGames);
        }

        const top100 = enriched.slice(0, 100);
        setPlayers(top100);

        // Find user's rank
        if (profile?.id) {
          const userIndex = top100.findIndex(p => p.id === profile.id);
          if (userIndex !== -1) {
            setMyRank(userIndex + 1);
          } else {
            // User not in top 100 — compute rank from full enriched list
            const allIndex = enriched.findIndex(p => p.id === profile.id);
            if (allIndex !== -1) {
              setMyRank(allIndex + 1);
            } else {
              setMyRank(null);
            }
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

  const handleWatchPlayer = async (player) => {
    if (player.id === profile?.id) return; // Can't watch yourself
    soundManager.playClickSound('select');
    setWatchPlayer(player);
    setLoadingWatch(true);
    try {
      const { data } = await spectatorService.getFriendGames([player.id]);
      setWatchGames(data || []);
    } catch (e) { setWatchGames([]); }
    setLoadingWatch(false);
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown size={20} className="text-amber-400" />;
    if (rank === 2) return <Medal size={20} className="text-slate-300" />;
    if (rank === 3) return <Medal size={20} className="text-amber-600" />;
    return <span className="text-slate-500 text-sm font-bold w-5 text-center">{rank}</span>;
  };

  const getRankBg = (rank, isCurrentUser) => {
    if (isCurrentUser) return 'bg-gradient-to-r from-cyan-900/50 to-blue-900/50 border-cyan-500/50';
    if (rank === 1) return 'bg-gradient-to-r from-amber-900/40 to-yellow-900/40 border-amber-500/40';
    if (rank === 2) return 'bg-gradient-to-r from-slate-700/40 to-slate-600/40 border-slate-400/40';
    if (rank === 3) return 'bg-gradient-to-r from-amber-800/30 to-orange-900/30 border-amber-600/30';
    return 'bg-slate-800/40 border-slate-700/30';
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950"
      style={{ 
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Grid background */}
      <div className="fixed inset-0 opacity-30 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(251,191,36,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.2) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      {/* Glow */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Content - v7.17: Added safe area bottom padding; v7.18: added safe area top padding for iPhone notch */}
      <div 
        className="relative flex-1 flex flex-col min-h-0 px-4"
        style={{
          paddingTop: 'max(24px, calc(env(safe-area-inset-top) + 16px))',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))'
        }}
      >
        <div className="max-w-md mx-auto w-full flex flex-col flex-1 min-h-0">
          {/* Header - Fixed */}
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
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

          {/* Filter Tabs - Fixed */}
          <div className="flex gap-2 mb-4 flex-shrink-0">
            {[
              { id: 'rating', label: 'Rating', icon: TrendingUp },
              { id: 'wins', label: 'Wins', icon: Trophy },
              { id: 'games', label: 'Games', icon: Gamepad2 },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => { setFilter(id); soundManager.playClickSound('select'); }}
                className={`flex-1 py-2 px-3 rounded-lg font-bold text-sm flex items-center justify-center gap-1.5 transition-all ${
                  filter === id
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* My Rank (if not in top 10) - Fixed */}
          {myRank && myRank > 10 && (
            <div className="mb-4 p-3 bg-gradient-to-r from-cyan-900/40 to-blue-900/40 rounded-xl border border-cyan-500/40 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-300 font-bold text-sm">
                    #{myRank}
                  </div>
                  <div>
                    <div className="text-white font-medium">Your Rank</div>
                    <div className="text-slate-400 text-sm">
                      {filter === 'rating' ? `${profile?.rating || 1000} rating` :
                       filter === 'wins' ? `${profile ? getOnlineStats(profile).onlineWins : 0} wins` :
                       `${profile ? getOnlineStats(profile).onlineGames : 0} games`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Leaderboard Container - Scrollable v7.17: Improved flex constraints */}
          <div 
            className="flex-1 min-h-0 bg-slate-900/95 rounded-2xl border border-amber-500/30 shadow-[0_0_30px_rgba(251,191,36,0.2)] flex flex-col"
            style={{
              overflow: 'hidden',
              // Ensure container takes remaining space but doesn't overflow
              maxHeight: '100%'
            }}
          >
            {/* Column Headers - Fixed within container */}
            <div className="flex items-center px-4 py-3 bg-slate-800/50 border-b border-slate-700/50 text-slate-500 text-xs uppercase tracking-wider flex-shrink-0">
              <div className="w-12 text-center">Rank</div>
              <div className="flex-1">Player</div>
              <div className="w-20 text-right">
                {filter === 'rating' ? 'Rating' : filter === 'wins' ? 'Wins' : 'Games'}
              </div>
              {onSpectateGame && <div className="w-10 text-center">Live</div>}
            </div>
            
            {/* Scrollable List - v7.17: Enhanced mobile scroll */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto"
              style={{
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
                minHeight: 0,
                touchAction: 'pan-y',
                // Hardware acceleration for smooth iOS scrolling
                transform: 'translateZ(0)',
                willChange: 'scroll-position'
              }}
            >
              {loading ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-slate-400">Loading leaderboard...</p>
                </div>
              ) : players.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy size={48} className="mx-auto text-slate-600 mb-3" />
                  <p className="text-slate-400">No players yet</p>
                  <p className="text-slate-500 text-sm">Be the first to play!</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/50 pb-4">
                  {players.map((player, index) => {
                    const rank = index + 1;
                    const isCurrentUser = player.id === profile?.id;
                    const rankInfo = getRankInfo(player.rating || 1000);
                    const displayName = player.username || player.display_name || 'Player';
                    
                    return (
                      <div 
                        key={player.id}
                        className={`flex items-center px-4 py-3 transition-colors ${getRankBg(rank, isCurrentUser)} border-l-2 ${
                          isCurrentUser ? 'border-l-cyan-500' : 'border-l-transparent'
                        }`}
                      >
                        {/* Rank */}
                        <div className="w-12 flex items-center justify-center">
                          {rank <= 3 ? (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              rank === 1 ? 'bg-amber-500/20' :
                              rank === 2 ? 'bg-slate-400/20' :
                              'bg-amber-600/20'
                            }`}>
                              {getRankIcon(rank)}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-bold">{rank}</span>
                          )}
                        </div>
                        
                        {/* Player */}
                        <div className="flex-1 flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                               style={{ backgroundColor: `${rankInfo?.glowColor}20` }}>
                            {player.avatar_url ? (
                              <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : rankInfo ? (
                              <TierIcon shape={rankInfo.shape} glowColor={rankInfo.glowColor} size="small" />
                            ) : (
                              <User size={16} className="text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className={`font-medium truncate ${isCurrentUser ? 'text-cyan-300' : 'text-white'}`}>
                              {displayName}
                              {isCurrentUser && <span className="text-cyan-400 text-xs ml-1">(You)</span>}
                            </div>
                            {rankInfo && (
                              <div className="text-xs" style={{ color: rankInfo.glowColor }}>
                                {rankInfo.name}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Stats */}
                        <div className="w-20 text-right">
                          <div className={`font-bold ${
                            rank === 1 ? 'text-amber-400' :
                            rank === 2 ? 'text-slate-300' :
                            rank === 3 ? 'text-amber-600' :
                            'text-slate-400'
                          }`}>
                            {filter === 'rating' ? player.rating :
                             filter === 'wins' ? player.onlineWins :
                             player.onlineGames}
                          </div>
                          <div className="text-slate-600 text-xs">
                            {filter === 'rating' ? 'rating' : filter === 'wins' ? 'wins' : 'games'}
                          </div>
                        </div>
                        
                        {/* Watch button */}
                        {onSpectateGame && !isCurrentUser && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleWatchPlayer(player); }}
                            className="w-10 flex items-center justify-center text-slate-600 hover:text-slate-300 transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                        )}
                        {onSpectateGame && isCurrentUser && <div className="w-10" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Watch Games Popup */}
      {watchPlayer && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-slate-900 rounded-xl max-w-sm w-full overflow-hidden border border-slate-500/30 shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-slate-300" />
                <span className="text-white font-bold text-sm">Watch {watchPlayer.username || watchPlayer.display_name}</span>
              </div>
              <button onClick={() => { setWatchPlayer(null); setWatchGames([]); }} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              {loadingWatch ? (
                <div className="py-6 text-center">
                  <Loader size={20} className="text-slate-400 animate-spin mx-auto mb-2" />
                  <p className="text-slate-500 text-xs">Finding active games...</p>
                </div>
              ) : watchGames.length === 0 ? (
                <div className="py-6 text-center">
                  <Eye size={28} className="text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">No active games</p>
                  <p className="text-slate-500 text-xs mt-1">This player isn't in a live game right now</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {watchGames.map(game => {
                    const opponent = game.player1?.id === watchPlayer.id ? game.player2 : game.player1;
                    return (
                      <button
                        key={game.id}
                        onClick={() => {
                          soundManager.playButtonClick();
                          setWatchPlayer(null);
                          setWatchGames([]);
                          onSpectateGame(game.id);
                        }}
                        className="w-full p-3 bg-slate-800/60 rounded-lg border border-slate-700/50 hover:border-slate-500/50 transition-all text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-white text-sm font-medium">{watchPlayer.username || '?'}</span>
                            <span className="text-slate-600 text-xs">vs</span>
                            <span className="text-slate-300 text-sm">{opponent?.username || '?'}</span>
                          </div>
                          <span className="flex items-center gap-1 text-red-400 text-[10px] font-bold animate-pulse">
                            <Radio size={10} /> LIVE
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
