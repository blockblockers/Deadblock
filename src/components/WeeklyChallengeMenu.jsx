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
  const { profile } = useAuth();
  const { needsScroll } = useResponsiveLayout(700);
  
  const [challenge, setChallenge] = useState(null);
  const [userResult, setUserResult] = useState(null);
  const [userRank, setUserRank] = useState(null);
  const [topPlayers, setTopPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(null);
  
  useEffect(() => {
    loadChallengeData();
  }, []);
  
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
  
  const loadChallengeData = async () => {
    setLoading(true);
    
    // Get current challenge
    const { data: challengeData } = await weeklyChallengeService.getCurrentChallenge();
    if (challengeData) {
      setChallenge(challengeData);
      
      // Get user's result
      const { data: resultData } = await weeklyChallengeService.getUserResult(challengeData.id);
      setUserResult(resultData);
      
      // Get user's rank
      const { rank } = await weeklyChallengeService.getUserRank(challengeData.id);
      setUserRank(rank);
      
      // Get top 3 for preview
      const { data: leaderboardData } = await weeklyChallengeService.getLeaderboard(challengeData.id, 3);
      setTopPlayers(leaderboardData);
    }
    
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
  
  // Theme colors for weekly challenge (lime/green like Z piece)
  const theme = {
    gridColor: 'rgba(163,230,53,0.5)',
    primary: 'lime',
    gradient: 'from-lime-500 to-green-600',
    glow: 'rgba(163,230,53,0.6)',
    text: 'text-lime-300',
    border: 'border-lime-500/50',
  };
  
  return (
    <div 
      className={needsScroll ? 'min-h-screen bg-slate-950' : 'h-screen bg-slate-950 overflow-hidden'}
      style={needsScroll ? { overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' } : {}}
    >
      {/* Themed Grid background */}
      <div className="fixed inset-0 opacity-40 pointer-events-none" style={{
        backgroundImage: `linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />
      
      {/* Glow orbs */}
      <div className="fixed top-20 left-10 w-80 h-80 bg-lime-500/30 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-32 right-10 w-72 h-72 bg-green-400/25 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
      
      {/* Content */}
      <div className={`relative ${needsScroll ? 'min-h-screen' : 'h-full'} flex flex-col items-center justify-center px-4 ${needsScroll ? 'py-8' : 'py-4'}`}>
        <div className="w-full max-w-md">
          {/* Title */}
          <div className="text-center mb-6">
            <NeonTitle size="large" />
            <NeonSubtitle text="WEEKLY CHALLENGE" size="default" className="mt-2" color="lime" />
          </div>
          
          {/* Main Card */}
          <div className={`bg-gradient-to-br from-slate-900/95 via-lime-950/30 to-slate-900/95 backdrop-blur-md rounded-2xl p-5 border ${theme.border} shadow-[0_0_60px_rgba(163,230,53,0.3),inset_0_0_30px_rgba(163,230,53,0.1)]`}>
            
            {loading ? (
              <div className="text-center py-8">
                <Loader className="w-8 h-8 animate-spin text-lime-400 mx-auto mb-3" />
                <p className="text-slate-400">Loading challenge...</p>
              </div>
            ) : (
              <>
                {/* Time Remaining */}
                <div className="flex items-center justify-center gap-2 mb-5 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <Clock size={18} className="text-lime-400" />
                  <span className="text-slate-400 text-sm">Time remaining:</span>
                  {timeRemaining && !timeRemaining.expired ? (
                    <span className="text-lime-300 font-bold">
                      {timeRemaining.days > 0 && `${timeRemaining.days}d `}
                      {timeRemaining.hours}h {timeRemaining.minutes}m
                    </span>
                  ) : (
                    <span className="text-red-400 font-bold">Challenge ended</span>
                  )}
                </div>
                
                {/* Your Result */}
                {userResult ? (
                  <div className="mb-5 p-4 bg-gradient-to-r from-lime-900/40 to-green-900/40 rounded-xl border border-lime-500/30">
                    <div className="text-center">
                      <div className="text-slate-400 text-sm mb-1">Your Best Time</div>
                      <div className="text-3xl font-black text-lime-300">
                        {weeklyChallengeService.formatTime(userResult.completion_time_ms)}
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
                    <div className="text-lime-300 text-xs mt-1">Complete the puzzle to appear on the leaderboard!</div>
                  </div>
                )}
                
                {/* Top 3 Preview */}
                {topPlayers.length > 0 && (
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-400 text-sm font-medium">Top Players</span>
                      <button 
                        onClick={handleLeaderboard}
                        className="text-lime-400 text-xs hover:text-lime-300 flex items-center gap-1"
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
                          
                          {/* Time */}
                          <div className={`font-mono text-sm ${
                            index === 0 ? 'text-amber-300' : 'text-slate-400'
                          }`}>
                            {weeklyChallengeService.formatTime(player.completion_time_ms)}
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
                    <div className="mt-2 text-sm text-slate-400 space-y-1">
                      <p>Same puzzle for everyone, all week long!</p>
                      <p className="text-lime-300">🧩 Hard difficulty - 5 moves to solve</p>
                      <p>Fastest time wins - can you top the leaderboard?</p>
                    </div>
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
                  {userResult ? 'IMPROVE YOUR TIME' : 'START CHALLENGE'}
                </button>
                
                {/* Leaderboard Button */}
                <button 
                  onClick={handleLeaderboard}
                  className="w-full mt-3 p-3 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 bg-slate-800/70 hover:bg-slate-700/70 border border-lime-500/30 text-lime-300 hover:text-lime-200"
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
        {needsScroll && <div className="h-8 flex-shrink-0" />}
      </div>
      
      {/* Title styling */}
      <style>{`
        .weekly-info-title {
          font-family: system-ui, -apple-system, sans-serif;
          color: #fff;
          text-shadow:
            0 0 5px #fff,
            0 0 10px #fff,
            0 0 20px #84cc16,
            0 0 40px #84cc16,
            0 0 60px #22c55e;
        }
      `}</style>
    </div>
  );
};

export default WeeklyChallengeMenu;
