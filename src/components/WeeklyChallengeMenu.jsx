// WeeklyChallengeMenu - Weekly puzzle challenge menu with leaderboard
// UPDATED: Fixed scrolling for all devices including iPad/iOS/Android
import { useState, useEffect } from 'react';
import { Calendar, Trophy, Clock, Target, Loader, ArrowLeft, Play, Medal, Users, ChevronRight } from 'lucide-react';
import NeonTitle from './NeonTitle';
import NeonSubtitle from './NeonSubtitle';
import FloatingPieces from './FloatingPieces';
import { soundManager } from '../utils/soundManager';
import { weeklyChallengeService } from '../services/weeklyChallengeService';

const WeeklyChallengeMenu = ({ onPlay, onLeaderboard, onBack }) => {
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState(null);
  const [topPlayers, setTopPlayers] = useState([]);
  
  useEffect(() => {
    loadChallenge();
  }, []);
  
  const loadChallenge = async () => {
    setLoading(true);
    try {
      const { data, error } = await weeklyChallengeService.getCurrentChallenge();
      if (data && !error) {
        setChallenge(data);
        
        // Load user stats for this challenge
        const statsResult = await weeklyChallengeService.getUserChallengeStats(data.id);
        if (statsResult.data) {
          setUserStats(statsResult.data);
        }
        
        // Load top 3 for preview
        const leaderboardResult = await weeklyChallengeService.getLeaderboard(data.id, 3);
        if (leaderboardResult.data) {
          setTopPlayers(leaderboardResult.data);
        }
      }
    } catch (err) {
      console.error('Error loading weekly challenge:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePlay = () => {
    soundManager.playButtonClick();
    onPlay(challenge);
  };
  
  const handleLeaderboard = () => {
    soundManager.playButtonClick();
    onLeaderboard(challenge);
  };
  
  const handleBack = () => {
    soundManager.playButtonClick();
    onBack();
  };
  
  // Format time display
  const formatTime = (ms) => {
    if (!ms) return '--:--';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Calculate time remaining
  const getTimeRemaining = () => {
    if (!challenge?.ends_at) return 'Unknown';
    const end = new Date(challenge.ends_at);
    const now = new Date();
    const diff = end - now;
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
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
  
  // UPDATED: Comprehensive scroll styles for all devices
  const scrollStyles = {
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
    touchAction: 'pan-y pinch-zoom',
    overscrollBehavior: 'contain',
    scrollBehavior: 'smooth',
  };
  
  return (
    <div 
      className="min-h-screen bg-slate-950"
      style={scrollStyles}
    >
      {/* Themed Grid background */}
      <div className="fixed inset-0 opacity-40 pointer-events-none" style={{
        backgroundImage: `linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />
      
      {/* Floating Pentomino Pieces */}
      <FloatingPieces count={12} theme="weekly" minOpacity={0.2} maxOpacity={0.4} />
      
      {/* Glow orbs */}
      <div className="fixed top-20 left-10 w-80 h-80 bg-red-500/30 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-32 right-10 w-72 h-72 bg-rose-400/25 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 w-64 h-64 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
      
      {/* Content */}
      <div className="relative min-h-screen flex flex-col items-center px-4 py-8">
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
                  onClick={loadChallenge}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-sm transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
                {/* Challenge Info */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={20} className="text-red-400" />
                    <span className="text-white font-bold">Week {challenge.week_number}</span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400 text-sm">
                    <Clock size={14} />
                    <span>{getTimeRemaining()}</span>
                  </div>
                </div>
                
                {/* Challenge Description */}
                <div className="bg-slate-800/50 rounded-lg p-3 mb-4 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={16} className="text-red-400" />
                    <span className="text-red-300 font-bold text-sm">OBJECTIVE</span>
                  </div>
                  <p className="text-slate-300 text-sm">
                    Solve the puzzle as fast as you can! Your best time counts towards the leaderboard.
                  </p>
                </div>
                
                {/* User Stats (if completed) */}
                {userStats?.best_time && (
                  <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-lg p-3 mb-4 border border-green-500/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy size={16} className="text-green-400" />
                        <span className="text-green-300 font-bold text-sm">YOUR BEST</span>
                      </div>
                      <span className="text-white font-mono font-bold">{formatTime(userStats.best_time)}</span>
                    </div>
                    {userStats.attempts > 1 && (
                      <p className="text-green-400/70 text-xs mt-1">
                        {userStats.attempts} attempts
                      </p>
                    )}
                  </div>
                )}
                
                {/* Top Players Preview */}
                {topPlayers.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Medal size={16} className="text-amber-400" />
                        <span className="text-amber-300 font-bold text-sm">TOP PLAYERS</span>
                      </div>
                      <button
                        onClick={handleLeaderboard}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                      >
                        View All <ChevronRight size={12} />
                      </button>
                    </div>
                    <div className="space-y-1">
                      {topPlayers.slice(0, 3).map((player, idx) => (
                        <div 
                          key={player.id}
                          className="flex items-center justify-between bg-slate-800/50 rounded px-3 py-1.5"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-sm ${
                              idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-300' : 'text-amber-600'
                            }`}>
                              #{idx + 1}
                            </span>
                            <span className="text-white text-sm truncate max-w-[120px]">
                              {player.profiles?.display_name || player.profiles?.username || 'Anonymous'}
                            </span>
                          </div>
                          <span className="text-cyan-300 font-mono text-sm">{formatTime(player.best_time)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handlePlay}
                    className="w-full py-4 rounded-xl font-black text-lg text-white bg-gradient-to-r from-red-500 to-rose-600 hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(239,68,68,0.5)] border border-white/10"
                  >
                    <Play size={20} />
                    {userStats?.best_time ? 'PLAY AGAIN' : 'START CHALLENGE'}
                  </button>
                  
                  <button
                    onClick={handleLeaderboard}
                    className="w-full py-3 rounded-xl font-bold text-base text-slate-300 bg-slate-800/70 hover:bg-slate-700/70 transition-all flex items-center justify-center gap-2 border border-slate-600/50"
                  >
                    <Users size={18} />
                    VIEW LEADERBOARD
                  </button>
                </div>
              </>
            )}
          </div>
          
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="w-full mt-4 py-3 rounded-xl font-bold text-base text-slate-400 bg-slate-800/50 hover:bg-slate-700/50 transition-all flex items-center justify-center gap-2 border border-slate-700/50"
          >
            <ArrowLeft size={18} />
            BACK TO MENU
          </button>
        </div>
        
        {/* Bottom safe area padding */}
        <div className="h-8 flex-shrink-0" />
      </div>
    </div>
  );
};

export default WeeklyChallengeMenu;
