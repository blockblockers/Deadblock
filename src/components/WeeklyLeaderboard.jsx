// Weekly Leaderboard - Shows rankings for weekly challenge
import { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Crown, Medal, User, Clock, RefreshCw, Calendar } from 'lucide-react';
import { soundManager } from '../utils/soundManager';
import { weeklyChallengeService } from '../services/weeklyChallengeService';
import { useAuth } from '../contexts/AuthContext';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

const WeeklyLeaderboard = ({ challenge, onBack }) => {
  const { profile } = useAuth();
  const { needsScroll } = useResponsiveLayout(800);
  
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [userResult, setUserResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  useEffect(() => {
    loadLeaderboard();
  }, [challenge]);
  
  const loadLeaderboard = async () => {
    setLoading(true);
    
    try {
      // Get leaderboard
      const { data } = await weeklyChallengeService.getLeaderboard(challenge.id, 100);
      setLeaderboard(data || []);
      
      // Find user's position
      if (profile?.id) {
        const userIndex = data?.findIndex(entry => entry.user_id === profile.id);
        if (userIndex !== -1) {
          setUserRank(userIndex + 1);
          setUserResult(data[userIndex]);
        } else {
          // User might not be in top 100, get their result directly
          const { data: result } = await weeklyChallengeService.getUserResult(challenge.id);
          if (result) {
            setUserResult(result);
            const { rank } = await weeklyChallengeService.getUserRank(challenge.id);
            setUserRank(rank);
          }
        }
      }
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    }
    
    setLoading(false);
  };
  
  const handleRefresh = async () => {
    soundManager.playClickSound('select');
    setRefreshing(true);
    await loadLeaderboard();
    setRefreshing(false);
  };
  
  const handleBack = () => {
    soundManager.playButtonClick();
    onBack();
  };
  
  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown size={18} className="text-amber-400" />;
    if (rank === 2) return <Medal size={18} className="text-slate-300" />;
    if (rank === 3) return <Medal size={18} className="text-amber-600" />;
    return <span className="text-slate-500 text-sm font-bold w-5 text-center">{rank}</span>;
  };
  
  const getRankBg = (rank, isCurrentUser) => {
    if (isCurrentUser) return 'bg-gradient-to-r from-lime-900/50 to-green-900/50 border-lime-500/50';
    if (rank === 1) return 'bg-gradient-to-r from-amber-900/40 to-yellow-900/40 border-amber-500/40';
    if (rank === 2) return 'bg-gradient-to-r from-slate-700/40 to-slate-600/40 border-slate-400/40';
    if (rank === 3) return 'bg-gradient-to-r from-amber-800/30 to-orange-900/30 border-amber-600/30';
    return 'bg-slate-800/40 border-slate-700/30';
  };
  
  return (
    <div 
      className={needsScroll ? 'min-h-screen bg-slate-950' : 'h-screen bg-slate-950 overflow-hidden'}
      style={needsScroll ? { overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' } : {}}
    >
      {/* Background */}
      <div className="fixed inset-0 opacity-30 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(163,230,53,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(163,230,53,0.3) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />
      <div className="fixed top-1/4 left-1/4 w-64 h-64 bg-lime-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-64 h-64 bg-green-500/15 rounded-full blur-3xl pointer-events-none" />
      
      {/* Content */}
      <div className="relative min-h-screen px-4 py-6">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="p-2 text-slate-400 hover:text-lime-300 transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-xl font-black text-lime-300 flex items-center gap-2">
                  <Trophy size={24} />
                  WEEKLY LEADERBOARD
                </h1>
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Calendar size={14} />
                  Week {challenge.week_number}, {challenge.year}
                </div>
              </div>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-slate-400 hover:text-lime-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
          
          {/* User's Position (if not in top list) */}
          {userResult && userRank && userRank > 10 && (
            <div className="mb-4 p-3 bg-gradient-to-r from-lime-900/40 to-green-900/40 rounded-xl border border-lime-500/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-lime-500/20 flex items-center justify-center text-lime-300 font-bold text-sm">
                    #{userRank}
                  </div>
                  <div>
                    <div className="text-white font-medium">Your Position</div>
                    <div className="text-slate-400 text-sm">
                      {weeklyChallengeService.formatTime(userResult.completion_time_ms)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Leaderboard */}
          <div className="bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-lime-500/30 overflow-hidden shadow-[0_0_30px_rgba(163,230,53,0.2)]">
            {/* Column Headers */}
            <div className="flex items-center px-4 py-3 bg-slate-800/50 border-b border-slate-700/50 text-slate-500 text-xs uppercase tracking-wider">
              <div className="w-12 text-center">Rank</div>
              <div className="flex-1">Player</div>
              <div className="w-24 text-right flex items-center justify-end gap-1">
                <Clock size={12} />
                Time
              </div>
            </div>
            
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-lime-500/30 border-t-lime-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-slate-400">Loading leaderboard...</p>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-12">
                <Trophy size={40} className="mx-auto text-slate-600 mb-3" />
                <p className="text-slate-400">No completions yet</p>
                <p className="text-slate-500 text-sm">Be the first to complete this week's challenge!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/50 max-h-[60vh] overflow-y-auto">
                {leaderboard.map((entry, index) => {
                  const rank = index + 1;
                  const isCurrentUser = entry.user_id === profile?.id;
                  
                  return (
                    <div 
                      key={entry.user_id}
                      className={`flex items-center px-4 py-3 transition-colors ${getRankBg(rank, isCurrentUser)} border-l-2 ${
                        isCurrentUser ? 'border-l-lime-500' : 'border-l-transparent'
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
                      <div className="flex-1 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                          {entry.avatar_url ? (
                            <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User size={16} className="text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className={`font-medium truncate ${isCurrentUser ? 'text-lime-300' : 'text-white'}`}>
                            {entry.display_name || entry.username || 'Player'}
                            {isCurrentUser && <span className="text-lime-500 text-xs ml-1">(you)</span>}
                          </div>
                        </div>
                      </div>
                      
                      {/* Time */}
                      <div className={`w-24 text-right font-mono font-bold ${
                        rank === 1 ? 'text-amber-300' :
                        rank <= 3 ? 'text-slate-300' :
                        'text-slate-400'
                      }`}>
                        {weeklyChallengeService.formatTime(entry.completion_time_ms)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="w-full mt-4 py-3 px-4 rounded-xl font-bold text-slate-300 bg-slate-800/70 hover:bg-slate-700/70 transition-all border border-slate-600/50 flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} />
            BACK
          </button>
        </div>
        
        {needsScroll && <div className="h-8" />}
      </div>
    </div>
  );
};

export default WeeklyLeaderboard;
