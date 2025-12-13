// Weekly Challenge Menu - Entry point for weekly puzzle challenges
import { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Play, Clock, Calendar, Crown, ChevronRight, Loader, User } from 'lucide-react';
import NeonTitle from './NeonTitle';
import NeonSubtitle from './NeonSubtitle';
import { soundManager } from '../utils/soundManager';
import { weeklyChallengeService } from '../services/weeklyChallengeService';
import { useAuth } from '../contexts/AuthContext';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

const WeeklyChallengeMenu = ({ onPlay, onLeaderboard, onBack }) => {
  const { profile, isAuthenticated, loading: authLoading, sessionReady, refreshProfile } = useAuth();
  const { needsScroll } = useResponsiveLayout(700);
  
  const [challenge, setChallenge] = useState(null);
  const [userResult, setUserResult] = useState(null);
  const [userRank, setUserRank] = useState(null);
  const [topPlayers, setTopPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(null);
  
  // Debug log on mount
  console.log('[WeeklyChallengeMenu] Render:', { 
    isAuthenticated, 
    authLoading,
    sessionReady,
    hasProfile: !!profile,
    loading,
    hasChallenge: !!challenge 
  });
  
  // Load data when component mounts and when auth state changes
  useEffect(() => {
    console.log('[WeeklyChallengeMenu] Auth effect triggered:', { authLoading, sessionReady, isAuthenticated });
    // Wait for session to be verified before loading data
    if (!sessionReady) {
      console.log('[WeeklyChallengeMenu] Session not ready yet, waiting...');
      return;
    }
    
    if (!isAuthenticated) {
      console.log('[WeeklyChallengeMenu] Not authenticated, skipping load');
      setLoading(false);
      return;
    }
    
    console.log('[WeeklyChallengeMenu] Session ready & authenticated, calling loadChallengeData');
    loadChallengeData();
  }, [sessionReady, isAuthenticated]);
  
  // Also reload user-specific data when profile becomes available
  useEffect(() => {
    if (profile && challenge && !userResult) {
      loadUserData(challenge.id);
    }
  }, [profile, challenge]);
  
  // Try to refresh profile if authenticated but profile is missing
  useEffect(() => {
    if (isAuthenticated && !profile && !authLoading && refreshProfile) {
      console.log('[WeeklyChallengeMenu] Profile missing, refreshing...');
      refreshProfile();
    }
  }, [isAuthenticated, profile, authLoading, refreshProfile]);
  
  useEffect(() => {
    if (!challenge) return;
    
    // Update time remaining every minute
    const updateTime = () => {
      setTimeRemaining(weeklyChallengeService.getTimeRemaining(challenge));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [challenge]);
  
  const loadUserData = async (challengeId) => {
    try {
      // Get user's result
      const { data: resultData } = await weeklyChallengeService.getUserResult(challengeId);
      setUserResult(resultData);
      
      // Get user's rank
      const { rank } = await weeklyChallengeService.getUserRank(challengeId);
      setUserRank(rank);
    } catch (err) {
      console.error('[WeeklyChallengeMenu] Error loading user data:', err);
    }
  };
  
  const loadChallengeData = async () => {
    console.log('[WeeklyChallengeMenu] loadChallengeData starting...');
    setLoading(true);
    
    try {
      // Get current challenge
      console.log('[WeeklyChallengeMenu] Calling getCurrentChallenge...');
      const { data: challengeData, error } = await weeklyChallengeService.getCurrentChallenge();
      console.log('[WeeklyChallengeMenu] getCurrentChallenge result:', { challengeData, error });
      
      if (error) {
        console.error('[WeeklyChallengeMenu] Error getting challenge:', error);
        setLoading(false);
        return;
      }
      
      if (challengeData) {
        console.log('[WeeklyChallengeMenu] Challenge loaded:', challengeData.id);
        setChallenge(challengeData);
        
        // Load user-specific data
        await loadUserData(challengeData.id);
        
        // Get top 3 for preview
        const { data: leaderboardData } = await weeklyChallengeService.getLeaderboard(challengeData.id, 3);
        setTopPlayers(leaderboardData || []);
      } else {
        console.log('[WeeklyChallengeMenu] No challenge data returned');
      }
    } catch (err) {
      console.error('[WeeklyChallengeMenu] Error loading challenge:', err);
    }
    
    console.log('[WeeklyChallengeMenu] loadChallengeData complete');
    setLoading(false);
  };
  
  const handlePlay = () => {
    soundManager.playButtonClick();
    if (challenge) {
      onPlay(challenge);
    }
  };
  
  const handleLeaderboard = () => {
    soundManager.playButtonClick();
    if (challenge) {
      onLeaderboard(challenge);
    }
  };
  
  const handleBack = () => {
    soundManager.playButtonClick();
    onBack();
  };
  
  // Theme colors for weekly challenge - RED THEME
  const theme = {
    gridColor: 'rgba(239,68,68,0.5)',
    primary: 'red',
    gradient: 'from-red-500 to-rose-600',
    glow: 'rgba(239,68,68,0.6)',
    text: 'text-red-300',
    border: 'border-red-500/50',
  };
  
  return (
    <div 
      className="min-h-screen bg-slate-950"
      style={{ overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
    >
      {/* Themed Grid background */}
      <div className="fixed inset-0 opacity-40 pointer-events-none" style={{
        backgroundImage: `linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />
      
      {/* Glow orbs */}
      <div className="fixed top-20 left-10 w-80 h-80 bg-red-500/30 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-32 right-10 w-72 h-72 bg-rose-400/25 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 w-64 h-64 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
      
      {/* Content */}
      <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Title */}
          <div className="text-center mb-6">
            <NeonTitle size="large" />
            <NeonSubtitle text="WEEKLY CHALLENGE" size="default" className="mt-2" color="red" />
          </div>
          
          {/* Main Card */}
          <div className={`bg-gradient-to-br from-slate-900/95 via-red-950/30 to-slate-900/95 backdrop-blur-md rounded-2xl p-5 border ${theme.border} shadow-[0_0_60px_rgba(239,68,68,0.3),inset_0_0_30px_rgba(239,68,68,0.1)]`}>
            
            {loading ? (
              <div className="text-center py-8">
                <Loader className="w-8 h-8 animate-spin text-red-400 mx-auto mb-3" />
                <p className="text-slate-400">Loading challenge...</p>
              </div>
            ) : !challenge ? (
              <div className="text-center py-8">
                <Calendar size={48} className="mx-auto text-slate-500 mb-3" />
                <h3 className="text-lg font-bold text-white mb-2">No Challenge Available</h3>
                <p className="text-slate-400 text-sm mb-4">
                  The weekly challenge couldn't be loaded. Please try again later.
                </p>
                <button 
                  onClick={loadChallengeData}
                  className="px-4 py-2 rounded-lg bg-red-500/20 text-red-300 border border-red-500/50 hover:bg-red-500/30 transition-all"
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
                {/* Time Remaining */}
                <div className="flex items-center justify-center gap-2 mb-5 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <Clock size={18} className="text-red-400" />
                  <span className="text-slate-400 text-sm">Time remaining:</span>
                  {timeRemaining && !timeRemaining.expired ? (
                    <span className="text-red-300 font-bold">
                      {timeRemaining.days > 0 && `${timeRemaining.days}d `}
                      {timeRemaining.hours}h {timeRemaining.minutes}m
                    </span>
                  ) : (
                    <span className="text-amber-400 font-bold">Challenge ended</span>
                  )}
                </div>
                
                {/* Your Result - shows first attempt and best time */}
                {userResult ? (
                  <div className="mb-5 p-4 bg-gradient-to-r from-red-900/40 to-rose-900/40 rounded-xl border border-red-500/30">
                    <div className="text-center">
                      <div className="grid grid-cols-2 gap-3 mb-2">
                        <div className="bg-slate-800/50 rounded-lg p-2 border border-cyan-500/30">
                          <div className="text-cyan-400 text-xs mb-1">First Attempt</div>
                          <div className="text-lg font-mono font-black text-cyan-300">
                            {weeklyChallengeService.formatTime(userResult.first_attempt_time_ms || userResult.completion_time_ms)}
                          </div>
                          <div className="text-cyan-500 text-xs">(Ranked)</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-2 border border-amber-500/30">
                          <div className="text-amber-400 text-xs mb-1">Best Time</div>
                          <div className="text-lg font-mono font-black text-amber-300">
                            {weeklyChallengeService.formatTime(userResult.best_time_ms || userResult.completion_time_ms)}
                          </div>
                        </div>
                      </div>
                      {userRank && (
                        <div className="flex items-center justify-center gap-2 mt-2">
                          <Trophy size={16} className="text-amber-400" />
                          <span className="text-amber-300">
                            Rank #{userRank}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mb-5 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 text-center">
                    <Calendar size={24} className="mx-auto text-slate-500 mb-2" />
                    <div className="text-slate-400 text-sm">You haven't completed this week's challenge yet</div>
                    <div className="text-red-300 text-xs mt-1">Your FIRST attempt will count for ranking!</div>
                  </div>
                )}
                
                {/* Top 3 Preview */}
                {topPlayers.length > 0 && (
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-400 text-sm font-medium">Top Players</span>
                      <button 
                        onClick={handleLeaderboard}
                        className="text-red-400 text-xs hover:text-red-300 flex items-center gap-1"
                      >
                        View all <ChevronRight size={14} />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {topPlayers.map((player, index) => (
                        <div 
                          key={player.user_id}
                          className={`flex items-center gap-3 p-2 rounded-lg ${
                            index === 0 ? 'bg-amber-900/30 border border-amber-500/30' :
                            index === 1 ? 'bg-slate-700/30 border border-slate-500/30' :
                            'bg-slate-800/30 border border-slate-700/30'
                          }`}
                        >
                          {/* Rank */}
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-amber-500 text-slate-900' :
                            index === 1 ? 'bg-slate-400 text-slate-900' :
                            'bg-amber-700 text-white'
                          }`}>
                            {index === 0 ? <Crown size={12} /> : index + 1}
                          </div>
                          
                          {/* Avatar */}
                          <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                            {player.avatar_url ? (
                              <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User size={14} className="text-slate-400" />
                            )}
                          </div>
                          
                          {/* Name */}
                          <div className="flex-1 truncate text-sm text-white">
                            {player.display_name || player.username || 'Player'}
                          </div>
                          
                          {/* Time - show first attempt for ranking */}
                          <div className={`font-mono text-sm ${
                            index === 0 ? 'text-amber-300' : 'text-slate-400'
                          }`}>
                            {weeklyChallengeService.formatTime(player.first_attempt_time_ms || player.completion_time_ms)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* How It Works */}
                <div className="mb-5 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <div className="text-center">
                    <span className="weekly-info-title font-black tracking-[0.2em] text-xs">HOW IT WORKS</span>
                    <div className="mt-2 text-sm text-slate-400 space-y-1.5">
                      <p>Same puzzle for everyone, all week long!</p>
                      <p className="text-red-300">🧩 Hard difficulty - 5 moves to solve</p>
                      <p className="text-cyan-300">⚡ Your FIRST completion is your ranked time</p>
                    </div>
                    <div className="mt-3 p-2 bg-amber-900/30 rounded-lg border border-amber-500/30">
                      <p className="text-amber-300 text-xs font-medium">
                        ⏱️ If AI blocks you, hit retry - timer continues!
                        <br/>
                        <span className="text-amber-400/80">Total time until first success = your score</span>
                      </p>
                    </div>
                    <p className="mt-2 text-slate-500 text-xs">Practice runs after completing don't affect rank</p>
                  </div>
                </div>
                
                {/* Play Button */}
                <button 
                  onClick={handlePlay}
                  disabled={timeRemaining?.expired}
                  className={`w-full p-4 rounded-xl font-black tracking-wider text-lg transition-all flex items-center justify-center gap-3 ${
                    timeRemaining?.expired 
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                      : `bg-gradient-to-r ${theme.gradient} text-white hover:scale-[1.02] active:scale-[0.98]`
                  }`}
                  style={!timeRemaining?.expired ? { boxShadow: `0 0 30px ${theme.glow}` } : {}}
                >
                  <Play size={22} />
                  {userResult ? 'PRACTICE RUN' : 'START CHALLENGE'}
                </button>
                
                {/* Leaderboard Button */}
                <button 
                  onClick={handleLeaderboard}
                  className="w-full mt-3 p-3 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 bg-slate-800/70 hover:bg-slate-700/70 border border-red-500/30 text-red-300 hover:text-red-200"
                >
                  <Trophy size={18} />
                  VIEW LEADERBOARD
                </button>
                
                {/* Back Button */}
                <button 
                  onClick={handleBack}
                  className="w-full mt-3 py-3 px-4 rounded-xl font-bold text-base text-slate-300 bg-slate-800/70 hover:bg-slate-700/70 transition-all border border-slate-600/50 hover:border-slate-500/50 flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={18} />
                  BACK TO MENU
                </button>
              </>
            )}
          </div>
        </div>
        <div className="h-8 flex-shrink-0" />
      </div>
      
      {/* Title styling */}
      <style>{`
        .weekly-info-title {
          font-family: system-ui, -apple-system, sans-serif;
          color: #fff;
          text-shadow:
            0 0 5px #fff,
            0 0 10px #fff,
            0 0 20px #ef4444,
            0 0 40px #ef4444,
            0 0 60px #f43f5e;
        }
      `}</style>
    </div>
  );
};

export default WeeklyChallengeMenu;
