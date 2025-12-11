// Player Stats Modal - Comprehensive stats display
// FIXES: Scroll behavior on mobile - users can now scroll back up after scrolling down

import { useState, useEffect, useRef } from 'react';
import { X, User, Trophy, Target, Zap, Bot, Users, Globe, Flame, Award, TrendingUp, Gamepad2, Clock, Edit2, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { statsService } from '../utils/statsService';
import { getRankInfo } from '../utils/rankUtils';
import { soundManager } from '../utils/soundManager';
import AchievementsDisplay from './AchievementsDisplay';

const PlayerStatsModal = ({ isOpen, onClose, isOffline = false }) => {
  const { profile, updateProfile } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [expandedSection, setExpandedSection] = useState('overview');
  const scrollContainerRef = useRef(null);
  
  useEffect(() => {
    if (isOpen && !isOffline) {
      loadStats();
    }
  }, [isOpen, isOffline]);
  
  useEffect(() => {
    if (profile) {
      setNewDisplayName(profile.display_name || profile.username || '');
    }
  }, [profile]);
  
  // Reset scroll position when modal opens
  useEffect(() => {
    if (isOpen && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [isOpen]);
  
  const loadStats = async () => {
    setLoading(true);
    const data = await statsService.getStats();
    if (data) {
      setStats(statsService.calculateDerivedStats(data));
    }
    setLoading(false);
  };
  
  const handleSaveDisplayName = async () => {
    if (newDisplayName.trim() && newDisplayName !== profile?.display_name) {
      await updateProfile({ display_name: newDisplayName.trim() });
      soundManager.playClickSound('success');
    }
    setEditingName(false);
  };
  
  const toggleSection = (section) => {
    soundManager.playClickSound('select');
    setExpandedSection(expandedSection === section ? null : section);
  };
  
  if (!isOpen) return null;
  
  const rankInfo = profile ? getRankInfo(profile.rating || 1000) : null;
  const RankIcon = rankInfo?.icon;
  const displayName = profile?.display_name || profile?.username || 'Player';
  
  // Stat card component
  const StatCard = ({ icon: Icon, label, value, subValue, color = 'cyan' }) => (
    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={`text-${color}-400`} />
        <span className="text-slate-400 text-xs">{label}</span>
      </div>
      <div className="text-white font-bold text-lg">{value}</div>
      {subValue && <div className="text-slate-500 text-xs">{subValue}</div>}
    </div>
  );
  
  // Collapsible section component
  const Section = ({ id, title, icon: Icon, color, children }) => {
    const isExpanded = expandedSection === id;
    return (
      <div className="border border-slate-700/50 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection(id)}
          className={`w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800/80 transition-colors ${isExpanded ? 'border-b border-slate-700/50' : ''}`}
        >
          <div className="flex items-center gap-2">
            <Icon size={16} className={`text-${color}-400`} />
            <span className="text-white font-medium">{title}</span>
          </div>
          {isExpanded ? (
            <ChevronUp size={16} className="text-slate-400" />
          ) : (
            <ChevronDown size={16} className="text-slate-400" />
          )}
        </button>
        {isExpanded && (
          <div className="p-3 bg-slate-900/50">
            {children}
          </div>
        )}
      </div>
    );
  };
  
  // Win rate bar component
  const WinRateBar = ({ wins, total, label }) => {
    const rate = total > 0 ? Math.round((wins / total) * 100) : 0;
    return (
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-400">{label}</span>
          <span className="text-slate-300">{wins}/{total} ({rate}%)</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
            style={{ width: `${rate}%` }}
          />
        </div>
      </div>
    );
  };
  
  // Handle touch events to prevent modal close on scroll
  const handleTouchMove = (e) => {
    // Allow scrolling within the scroll container
    e.stopPropagation();
  };
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 rounded-2xl w-full max-w-md max-h-[85vh] border border-slate-700/50 shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ minHeight: 0 }} // Critical for flex scroll to work
      >
        {/* Header - Fixed */}
        <div className="p-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-800 to-slate-900 flex-shrink-0 rounded-t-2xl">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div 
                className="w-16 h-16 rounded-full overflow-hidden border-2 flex items-center justify-center flex-shrink-0"
                style={{ 
                  borderColor: rankInfo?.color || '#64748b',
                  backgroundColor: rankInfo?.color + '20' || '#475569'
                }}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={28} className="text-white/60" />
                )}
              </div>
              
              {/* Name and rank */}
              <div className="min-w-0 flex-1">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm w-32"
                      autoFocus
                      maxLength={20}
                    />
                    <button onClick={handleSaveDisplayName} className="text-green-400 hover:text-green-300">
                      <Check size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-lg truncate">{displayName}</span>
                    {!isOffline && (
                      <button onClick={() => setEditingName(true)} className="text-slate-500 hover:text-slate-300 flex-shrink-0">
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>
                )}
                
                {rankInfo && !isOffline && (
                  <div className="flex items-center gap-2 mt-1">
                    {RankIcon && <RankIcon size={14} style={{ color: rankInfo.color }} />}
                    <span style={{ color: rankInfo.color }} className="text-sm font-medium">
                      {rankInfo.name}
                    </span>
                    <span className="text-slate-500 text-sm">
                      {profile?.rating || 1000} ELO
                    </span>
                  </div>
                )}
                
                {isOffline && (
                  <div className="text-slate-400 text-sm mt-1">
                    Offline Mode - Stats not tracked
                  </div>
                )}
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors flex-shrink-0"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* Stats Content - Scrollable */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 p-4 space-y-3"
          onTouchMove={handleTouchMove}
          style={{
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorY: 'contain',
            minHeight: 0, // Critical for flex scroll
            // Remove touchAction to allow natural scrolling
          }}
        >
          {isOffline ? (
            <div className="text-center py-8">
              <Gamepad2 size={48} className="mx-auto text-slate-600 mb-3" />
              <p className="text-slate-400">Sign in to track your stats</p>
              <p className="text-slate-500 text-sm mt-1">Your progress will be saved across devices</p>
            </div>
          ) : loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto" />
              <p className="text-slate-400 mt-3">Loading stats...</p>
            </div>
          ) : (
            <>
              {/* Overview Section */}
              <Section id="overview" title="Overview" icon={TrendingUp} color="cyan">
                <div className="grid grid-cols-2 gap-2">
                  <StatCard 
                    icon={Trophy} 
                    label="Online Wins" 
                    value={stats?.games_won || 0}
                    subValue={`${stats?.onlineWinRate || 0}% win rate`}
                    color="amber"
                  />
                  <StatCard 
                    icon={Target} 
                    label="Puzzles Solved" 
                    value={stats?.puzzleTotalSolved || 0}
                    color="green"
                  />
                  <StatCard 
                    icon={Flame} 
                    label="Best Streak" 
                    value={stats?.speed_best_streak || 0}
                    subValue="Speed Puzzle"
                    color="orange"
                  />
                  <StatCard 
                    icon={Bot} 
                    label="AI Wins" 
                    value={stats?.aiTotalWins || 0}
                    subValue={`of ${stats?.aiTotalGames || 0} games`}
                    color="purple"
                  />
                </div>
              </Section>
              
              {/* Achievements Section */}
              <Section id="achievements" title="Achievements" icon={Award} color="amber">
                <AchievementsDisplay compact={false} />
              </Section>
              
              {/* Online Stats */}
              <Section id="online" title="Online Matches" icon={Globe} color="blue">
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-800/50 rounded-lg p-2">
                      <div className="text-green-400 font-bold text-lg">{stats?.games_won || 0}</div>
                      <div className="text-slate-500 text-xs">Wins</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-2">
                      <div className="text-red-400 font-bold text-lg">{(stats?.games_played || 0) - (stats?.games_won || 0)}</div>
                      <div className="text-slate-500 text-xs">Losses</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-2">
                      <div className="text-cyan-400 font-bold text-lg">{stats?.onlineWinRate || 0}%</div>
                      <div className="text-slate-500 text-xs">Win Rate</div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={14} className="text-slate-400" />
                      <span className="text-slate-400 text-xs">Total Games</span>
                    </div>
                    <div className="text-white font-bold text-xl">{stats?.games_played || 0}</div>
                  </div>
                </div>
              </Section>
              
              {/* AI Stats */}
              <Section id="ai" title="VS AI" icon={Bot} color="purple">
                <div className="space-y-3">
                  <WinRateBar 
                    wins={stats?.ai_beginner_wins || 0} 
                    total={stats?.ai_beginner_games || 0} 
                    label="Beginner AI"
                  />
                  <WinRateBar 
                    wins={stats?.ai_intermediate_wins || 0} 
                    total={stats?.ai_intermediate_games || 0} 
                    label="Intermediate AI"
                  />
                  <WinRateBar 
                    wins={stats?.ai_expert_wins || 0} 
                    total={stats?.ai_expert_games || 0} 
                    label="Expert AI"
                  />
                </div>
              </Section>
              
              {/* Puzzle Stats */}
              <Section id="puzzles" title="Puzzles" icon={Target} color="green">
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-800/50 rounded-lg p-2">
                      <div className="text-green-400 font-bold">{stats?.puzzles_easy_solved || 0}</div>
                      <div className="text-slate-500 text-xs">Easy</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-2">
                      <div className="text-amber-400 font-bold">{stats?.puzzles_medium_solved || 0}</div>
                      <div className="text-slate-500 text-xs">Medium</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-2">
                      <div className="text-purple-400 font-bold">{stats?.puzzles_hard_solved || 0}</div>
                      <div className="text-slate-500 text-xs">Hard</div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap size={14} className="text-orange-400" />
                      <span className="text-slate-400 text-xs">Speed Puzzle</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="text-slate-500 text-xs">Completed</div>
                        <div className="text-white font-bold">{stats?.speed_puzzles_completed || 0}</div>
                      </div>
                      <div className="h-8 w-px bg-slate-700" />
                      <div>
                        <div className="text-slate-500 text-xs">Best Streak</div>
                        <div className="text-orange-400 font-bold">{stats?.speed_best_streak || 0}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Section>
              
              {/* Local Stats */}
              <Section id="local" title="Local 2P" icon={Users} color="pink">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                    <div className="text-cyan-400 font-bold text-lg">{stats?.local_player1_wins || 0}</div>
                    <div className="text-slate-500 text-xs">Player 1 Wins</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                    <div className="text-pink-400 font-bold text-lg">{stats?.local_player2_wins || 0}</div>
                    <div className="text-slate-500 text-xs">Player 2 Wins</div>
                  </div>
                </div>
              </Section>
              
              {/* Bottom padding for scroll */}
              <div className="h-4" />
            </>
          )}
        </div>
        
        {/* Footer with close button - Fixed */}
        <div className="p-3 border-t border-slate-700/50 bg-slate-800/50 flex-shrink-0 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerStatsModal;
