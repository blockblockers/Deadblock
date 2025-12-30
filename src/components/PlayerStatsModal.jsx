// Player Stats Modal - Comprehensive stats display
// v7.8 ENHANCEMENTS:
// 1. Uses username priority (same as PlayerProfileCard)
// 2. Enhanced tier-based theming
// 3. Scroll behavior on mobile
// 4. Weekly Challenge podium breakdown (1st, 2nd, 3rd place counts)

import { useState, useEffect, useRef } from 'react';
import { X, User, Trophy, Target, Zap, Bot, Users, Globe, Flame, Award, TrendingUp, Gamepad2, Clock, Edit2, Check, ChevronDown, ChevronUp, Loader, Medal } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { statsService } from '../utils/statsService';
import { weeklyChallengeService } from '../services/weeklyChallengeService';
import { getRankInfo } from '../utils/rankUtils';
import { soundManager } from '../utils/soundManager';
import TierIcon from './TierIcon';
import AchievementsDisplay from './AchievementsDisplay';

// Helper to convert hex to rgba
const hexToRgba = (hex, alpha) => {
  if (!hex || !hex.startsWith('#')) return `rgba(34, 211, 238, ${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Get contrasting background for tier
const getTierBackground = (glowColor) => {
  const backgrounds = {
    '#f59e0b': 'rgba(30, 20, 60, 0.95)',   // Grandmaster
    '#a855f7': 'rgba(20, 40, 40, 0.95)',   // Master
    '#3b82f6': 'rgba(40, 25, 20, 0.95)',   // Expert
    '#22d3ee': 'rgba(40, 20, 40, 0.95)',   // Advanced
    '#22c55e': 'rgba(40, 20, 35, 0.95)',   // Intermediate
    '#38bdf8': 'rgba(35, 25, 45, 0.95)',   // Beginner
    '#2dd4bf': 'rgba(40, 25, 50, 0.95)',   // Novice
  };
  return backgrounds[glowColor] || 'rgba(15, 23, 42, 0.95)';
};

const PlayerStatsModal = ({ isOpen, onClose, isOffline = false }) => {
  const { profile, updateProfile } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [expandedSection, setExpandedSection] = useState('overview');
  // v7.8: Enhanced weekly challenge stats with podium breakdown
  const [weeklyPodiums, setWeeklyPodiums] = useState(0); // Total top 3 finishes
  const [weeklyStats, setWeeklyStats] = useState({ first: 0, second: 0, third: 0, total: 0 });
  const scrollContainerRef = useRef(null);
  
  // Get tier info for theming
  const rankInfo = profile ? getRankInfo(profile.rating || 1000) : null;
  const glowColor = rankInfo?.glowColor || '#22d3ee';
  
  useEffect(() => {
    if (isOpen && !isOffline) {
      loadStats();
    }
  }, [isOpen, isOffline]);
  
  useEffect(() => {
    if (profile) {
      // FIX: Use username priority (same as PlayerProfileCard)
      setNewUsername(profile.username || profile.display_name || '');
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
    
    // v7.8: Load detailed weekly challenge podium stats (1st, 2nd, 3rd)
    if (profile?.id) {
      try {
        console.log('[PlayerStatsModal] Loading weekly podium breakdown for:', profile.id);
        
        // Try to get detailed breakdown first
        const detailedResult = await weeklyChallengeService.getUserPodiumBreakdown?.(profile.id);
        if (detailedResult?.data) {
          console.log('[PlayerStatsModal] Weekly podium breakdown:', detailedResult.data);
          setWeeklyStats({
            first: detailedResult.data.first || 0,
            second: detailedResult.data.second || 0,
            third: detailedResult.data.third || 0,
            total: detailedResult.data.total || 0
          });
          setWeeklyPodiums(detailedResult.data.total || 0);
        } else {
          // Fallback to simple count
          const result = await weeklyChallengeService.getUserPodiumCount(profile.id);
          console.log('[PlayerStatsModal] Weekly podium result:', result);
          if (result?.data !== null && result?.data !== undefined) {
            setWeeklyPodiums(result.data);
            setWeeklyStats({ first: 0, second: 0, third: 0, total: result.data });
          }
        }
      } catch (err) {
        console.log('[PlayerStatsModal] Weekly podium count error:', err);
      }
    }
    
    setLoading(false);
  };
  
  const handleSaveUsername = async () => {
    if (!newUsername.trim()) return;
    
    // Validate
    if (newUsername.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return;
    }
    if (newUsername.length > 20) {
      setUsernameError('Username must be 20 characters or less');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      setUsernameError('Only letters, numbers, and underscores allowed');
      return;
    }
    
    setSavingUsername(true);
    setUsernameError('');
    
    // Update both username and display_name
    const { error } = await updateProfile({ 
      username: newUsername.toLowerCase(),
      display_name: newUsername 
    });
    
    setSavingUsername(false);
    
    if (error) {
      setUsernameError(error.message || 'Failed to update username');
    } else {
      soundManager.playClickSound('success');
      setEditingName(false);
    }
  };
  
  const toggleSection = (section) => {
    soundManager.playClickSound('select');
    setExpandedSection(expandedSection === section ? null : section);
  };
  
  if (!isOpen) return null;
  
  // FIX: Use username priority (same as PlayerProfileCard button)
  const displayName = profile?.username || profile?.display_name || 'Player';
  
  // Stat card component - Tier themed
  const StatCard = ({ icon: Icon, label, value, subValue, color = 'cyan' }) => (
    <div 
      className="rounded-lg p-3"
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        border: `1px solid ${hexToRgba(glowColor, 0.2)}`
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={`text-${color}-400`} />
        <span className="text-slate-400 text-xs">{label}</span>
      </div>
      <div className="text-white font-bold text-lg">{value}</div>
      {subValue && <div className="text-slate-500 text-xs">{subValue}</div>}
    </div>
  );
  
  // Collapsible section component - Tier themed
  const Section = ({ id, title, icon: Icon, color, children }) => {
    const isExpanded = expandedSection === id;
    return (
      <div 
        className="rounded-xl overflow-hidden"
        style={{ border: `1px solid ${hexToRgba(glowColor, 0.2)}` }}
      >
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between p-3 transition-colors"
          style={{ 
            backgroundColor: isExpanded ? hexToRgba(glowColor, 0.1) : 'rgba(30, 41, 59, 0.5)',
            borderBottom: isExpanded ? `1px solid ${hexToRgba(glowColor, 0.2)}` : 'none'
          }}
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
            className="h-full rounded-full transition-all"
            style={{ 
              width: `${rate}%`,
              background: `linear-gradient(90deg, ${glowColor}, ${hexToRgba(glowColor, 0.6)})`
            }}
          />
        </div>
      </div>
    );
  };
  
  // Handle touch events to prevent modal close on scroll
  const handleTouchMove = (e) => {
    e.stopPropagation();
  };
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md max-h-[85vh] rounded-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ 
          minHeight: 0,
          background: `linear-gradient(135deg, ${getTierBackground(glowColor)} 0%, rgba(15, 23, 42, 0.98) 50%, ${hexToRgba(glowColor, 0.05)} 100%)`,
          border: `2px solid ${hexToRgba(glowColor, 0.4)}`,
          boxShadow: `0 0 60px ${hexToRgba(glowColor, 0.3)}, inset 0 0 40px ${hexToRgba(glowColor, 0.05)}`
        }}
      >
        {/* Header - Fixed, Tier themed */}
        <div 
          className="p-4 flex-shrink-0 rounded-t-2xl"
          style={{ 
            background: `linear-gradient(135deg, ${hexToRgba(glowColor, 0.15)} 0%, rgba(15, 23, 42, 0.9) 100%)`,
            borderBottom: `1px solid ${hexToRgba(glowColor, 0.3)}`
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {/* Avatar with Tier Icon */}
              <div 
                className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                style={{ 
                  background: `radial-gradient(circle at 30% 30%, ${getTierBackground(glowColor)}, rgba(10, 15, 25, 0.98))`,
                  border: `3px solid ${hexToRgba(glowColor, 0.6)}`,
                  boxShadow: `0 0 25px ${hexToRgba(glowColor, 0.4)}`
                }}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : rankInfo ? (
                  <TierIcon shape={rankInfo.shape} glowColor={rankInfo.glowColor} size="large" />
                ) : (
                  <User size={28} className="text-white/60" />
                )}
              </div>
              
              {/* Name and rank */}
              <div className="min-w-0 flex-1">
                {editingName ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => {
                          setNewUsername(e.target.value);
                          setUsernameError('');
                        }}
                        className="bg-slate-800 rounded px-2 py-1 text-white text-sm w-32 focus:outline-none"
                        style={{ border: `1px solid ${hexToRgba(glowColor, 0.5)}` }}
                        autoFocus
                        maxLength={20}
                      />
                      <button 
                        onClick={handleSaveUsername} 
                        disabled={savingUsername}
                        className="text-green-400 hover:text-green-300 disabled:opacity-50"
                      >
                        {savingUsername ? <Loader size={16} className="animate-spin" /> : <Check size={16} />}
                      </button>
                      <button 
                        onClick={() => {
                          setEditingName(false);
                          setNewUsername(profile?.username || profile?.display_name || '');
                          setUsernameError('');
                        }}
                        className="text-slate-500 hover:text-slate-300"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    {usernameError && (
                      <p className="text-red-400 text-xs">{usernameError}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span 
                      className="font-bold text-lg truncate"
                      style={{ color: '#f1f5f9', textShadow: `0 0 10px ${hexToRgba(glowColor, 0.5)}` }}
                    >
                      {displayName}
                    </span>
                    {!isOffline && (
                      <button 
                        onClick={() => setEditingName(true)} 
                        className="flex-shrink-0 transition-colors"
                        style={{ color: hexToRgba(glowColor, 0.6) }}
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>
                )}
                
                {rankInfo && !isOffline && (
                  <div className="flex items-center gap-2 mt-1">
                    <span 
                      className="text-sm font-bold uppercase tracking-wider"
                      style={{ color: glowColor, textShadow: `0 0 8px ${hexToRgba(glowColor, 0.5)}` }}
                    >
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
              className="transition-colors flex-shrink-0"
              style={{ color: hexToRgba(glowColor, 0.6) }}
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
            minHeight: 0,
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
              <div 
                className="w-8 h-8 border-2 rounded-full animate-spin mx-auto"
                style={{ borderColor: hexToRgba(glowColor, 0.3), borderTopColor: glowColor }}
              />
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
                  <WinRateBar 
                    wins={stats?.games_won || 0} 
                    total={stats?.games_played || 0} 
                    label="Overall"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <StatCard 
                      icon={Trophy} 
                      label="Wins" 
                      value={stats?.games_won || 0}
                      color="green"
                    />
                    <StatCard 
                      icon={Target} 
                      label="Games" 
                      value={stats?.games_played || 0}
                      color="blue"
                    />
                  </div>
                  {(stats?.highest_rating || 0) > 0 && (
                    <div 
                      className="text-center p-2 rounded-lg"
                      style={{ 
                        backgroundColor: hexToRgba(glowColor, 0.1),
                        border: `1px solid ${hexToRgba(glowColor, 0.2)}`
                      }}
                    >
                      <span className="text-slate-400 text-sm">Highest Rating: </span>
                      <span style={{ color: glowColor }} className="font-bold">{stats?.highest_rating}</span>
                    </div>
                  )}
                </div>
              </Section>
              
              {/* AI Stats */}
              <Section id="ai" title="AI Battles" icon={Bot} color="purple">
                <div className="space-y-3">
                  <WinRateBar 
                    wins={stats?.aiTotalWins || 0} 
                    total={stats?.aiTotalGames || 0} 
                    label="Overall vs AI"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 bg-green-900/20 rounded-lg border border-green-500/20">
                      <div className="text-green-400 font-bold">
                        {stats?.ai_easy_wins || 0}/{(stats?.ai_easy_wins || 0) + (stats?.ai_easy_losses || 0)}
                      </div>
                      <div className="text-slate-500 text-xs">Easy</div>
                    </div>
                    <div className="text-center p-2 bg-amber-900/20 rounded-lg border border-amber-500/20">
                      <div className="text-amber-400 font-bold">
                        {stats?.ai_medium_wins || 0}/{(stats?.ai_medium_wins || 0) + (stats?.ai_medium_losses || 0)}
                      </div>
                      <div className="text-slate-500 text-xs">Medium</div>
                    </div>
                    <div className="text-center p-2 bg-red-900/20 rounded-lg border border-red-500/20">
                      <div className="text-red-400 font-bold">
                        {stats?.ai_hard_wins || 0}/{(stats?.ai_hard_wins || 0) + (stats?.ai_hard_losses || 0)}
                      </div>
                      <div className="text-slate-500 text-xs">Hard</div>
                    </div>
                  </div>
                </div>
              </Section>
              
              {/* Puzzle Stats */}
              <Section id="puzzles" title="Puzzles" icon={Target} color="green">
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 bg-green-900/20 rounded-lg border border-green-500/20">
                      <div className="text-green-400 font-bold">
                        {stats?.puzzles_easy_solved || 0}/{stats?.puzzles_easy_attempted || 0}
                      </div>
                      <div className="text-slate-500 text-xs">Easy</div>
                    </div>
                    <div className="text-center p-2 bg-amber-900/20 rounded-lg border border-amber-500/20">
                      <div className="text-amber-400 font-bold">
                        {stats?.puzzles_medium_solved || 0}/{stats?.puzzles_medium_attempted || 0}
                      </div>
                      <div className="text-slate-500 text-xs">Medium</div>
                    </div>
                    <div className="text-center p-2 bg-red-900/20 rounded-lg border border-red-500/20">
                      <div className="text-red-400 font-bold">
                        {stats?.puzzles_hard_solved || 0}/{stats?.puzzles_hard_attempted || 0}
                      </div>
                      <div className="text-slate-500 text-xs">Hard</div>
                    </div>
                  </div>
                  
                  {/* Weekly Challenge Stats - v7.8: Enhanced with podium breakdown */}
                  <div 
                    className="p-3 rounded-lg"
                    style={{ 
                      backgroundColor: 'rgba(234, 179, 8, 0.1)',
                      border: '1px solid rgba(234, 179, 8, 0.3)'
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Medal size={14} className="text-amber-400" />
                      <span className="text-slate-300 text-sm font-medium">Weekly Challenge</span>
                    </div>
                    
                    {weeklyPodiums > 0 ? (
                      <div className="space-y-2">
                        {/* Podium breakdown */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center p-2 bg-amber-900/30 rounded-lg border border-amber-500/30">
                            <div className="text-lg">🥇</div>
                            <div className="text-amber-300 font-bold text-lg">{weeklyStats.first || 0}</div>
                            <div className="text-slate-500 text-[10px]">1st Place</div>
                          </div>
                          <div className="text-center p-2 bg-slate-700/30 rounded-lg border border-slate-500/30">
                            <div className="text-lg">🥈</div>
                            <div className="text-slate-300 font-bold text-lg">{weeklyStats.second || 0}</div>
                            <div className="text-slate-500 text-[10px]">2nd Place</div>
                          </div>
                          <div className="text-center p-2 bg-orange-900/30 rounded-lg border border-orange-500/30">
                            <div className="text-lg">🥉</div>
                            <div className="text-orange-300 font-bold text-lg">{weeklyStats.third || 0}</div>
                            <div className="text-slate-500 text-[10px]">3rd Place</div>
                          </div>
                        </div>
                        
                        {/* Total podiums */}
                        <div className="text-center text-sm">
                          <span className="text-slate-500">Total Top 3 Finishes: </span>
                          <span className="text-amber-400 font-bold">{weeklyPodiums}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500 text-center py-2">
                        No top 3 finishes yet. Keep competing!
                      </div>
                    )}
                  </div>
                  
                  {/* Speed Puzzle Stats */}
                  <div 
                    className="p-3 rounded-lg"
                    style={{ 
                      backgroundColor: hexToRgba(glowColor, 0.05),
                      border: `1px solid ${hexToRgba(glowColor, 0.2)}`
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Zap size={14} style={{ color: glowColor }} />
                      <span className="text-slate-300 text-sm font-medium">Speed Puzzles</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-slate-500">Best Streak: </span>
                      <span className="text-amber-400 font-bold">{stats?.speed_best_streak || 0}</span>
                    </div>
                  </div>
                </div>
              </Section>
            </>
          )}
        </div>
        
        {/* Footer */}
        <div 
          className="p-3 text-center flex-shrink-0 rounded-b-2xl"
          style={{ borderTop: `1px solid ${hexToRgba(glowColor, 0.2)}` }}
        >
          <p className="text-slate-600 text-xs">
            Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlayerStatsModal;
