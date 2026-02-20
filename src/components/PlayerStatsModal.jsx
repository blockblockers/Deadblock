// PlayerStatsModal.jsx - Comprehensive stats display
// v7.20: Fixed double # in rank, added AI/puzzle detail dropdowns, puzzles solved includes both types
// v7.19: Fixed scroll - separate backdrop from modal container for proper touch handling
// v7.17: Improved scroll with touchAction, backdrop click to close
// v7.14: Added play streak display, leaderboard rank, fixed scroll
// Place in src/components/PlayerStatsModal.jsx

import { useState, useEffect, useRef } from 'react';
import { X, User, Trophy, Target, Zap, Bot, Users, Globe, Flame, Award, TrendingUp, Gamepad2, Clock, Edit2, Check, ChevronDown, ChevronUp, Loader, Medal, Hash, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { statsService } from '../utils/statsService';
import { weeklyChallengeService } from '../services/weeklyChallengeService';
import { streakService } from '../services/streakService';
import { creatorPuzzleService } from '../services/creatorPuzzleService';
import { getRankInfo } from '../utils/rankUtils';
import { soundManager } from '../utils/soundManager';
import { supabase, isSupabaseConfigured } from '../utils/supabase';
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
    '#f59e0b': 'rgba(30, 20, 60, 0.95)',
    '#a855f7': 'rgba(20, 40, 40, 0.95)',
    '#3b82f6': 'rgba(40, 25, 20, 0.95)',
    '#22d3ee': 'rgba(40, 20, 40, 0.95)',
    '#22c55e': 'rgba(40, 20, 35, 0.95)',
    '#38bdf8': 'rgba(35, 25, 45, 0.95)',
    '#2dd4bf': 'rgba(40, 25, 50, 0.95)',
  };
  return backgrounds[glowColor] || 'rgba(15, 23, 42, 0.95)';
};

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, subValue, color = 'cyan' }) => {
  const colors = {
    cyan: { bg: 'rgba(34, 211, 238, 0.1)', border: 'rgba(34, 211, 238, 0.2)', text: '#22d3ee' },
    amber: { bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.2)', text: '#fbbf24' },
    green: { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.2)', text: '#22c55e' },
    purple: { bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.2)', text: '#a855f7' },
    orange: { bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.2)', text: '#f97316' },
    red: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)', text: '#ef4444' },
  };
  const c = colors[color] || colors.cyan;
  
  return (
    <div 
      className="p-3 rounded-lg"
      style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} style={{ color: c.text }} />
        <span className="text-slate-400 text-xs">{label}</span>
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
      {subValue && <div className="text-xs text-slate-500">{subValue}</div>}
    </div>
  );
};

// Collapsible Section Component
const Section = ({ id, title, icon: Icon, color, children, expanded, onToggle }) => {
  const colors = {
    cyan: '#22d3ee',
    amber: '#fbbf24',
    green: '#22c55e',
    purple: '#a855f7',
    orange: '#f97316',
  };
  const c = colors[color] || colors.cyan;
  
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${c}30` }}>
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between p-3"
        style={{ backgroundColor: `${c}10` }}
      >
        <div className="flex items-center gap-2">
          <Icon size={16} style={{ color: c }} />
          <span className="font-bold text-sm" style={{ color: c }}>{title}</span>
        </div>
        {expanded ? (
          <ChevronUp size={16} style={{ color: c }} />
        ) : (
          <ChevronDown size={16} style={{ color: c }} />
        )}
      </button>
      {expanded && (
        <div className="p-3 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
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
  
  // Play streak (daily streak)
  const [playStreak, setPlayStreak] = useState({ current: 0, longest: 0, status: 'none' });
  
  // Leaderboard rank
  const [leaderboardRank, setLeaderboardRank] = useState(null);
  
  // Weekly challenge stats
  const [weeklyStats, setWeeklyStats] = useState({ first: 0, second: 0, third: 0, total: 0 });
  
  // Creator puzzle stats
  const [creatorStats, setCreatorStats] = useState({
    easy: { completed: 0, total: 25 },
    medium: { completed: 0, total: 35 },
    hard: { completed: 0, total: 25 },
    expert: { completed: 0, total: 15 },
    totalCompleted: 0,
    totalPuzzles: 100
  });
  
  // Dropdown states for detailed breakdowns
  const [showAIDetails, setShowAIDetails] = useState(false);
  const [showPuzzleDetails, setShowPuzzleDetails] = useState(false);
  
  const scrollContainerRef = useRef(null);
  
  // Get tier info for theming
  const rankInfo = profile ? getRankInfo(profile.rating || 1000) : null;
  const glowColor = rankInfo?.glowColor || '#22d3ee';
  
  useEffect(() => {
    if (isOpen && !isOffline) {
      loadStats();
      loadPlayStreak();
      loadLeaderboardRank();
      loadCreatorPuzzleStats();
    }
  }, [isOpen, isOffline]);
  
  useEffect(() => {
    if (profile) {
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
    
    // Load weekly challenge stats
    if (profile?.id) {
      try {
        const detailedResult = await weeklyChallengeService.getUserPodiumBreakdown?.(profile.id);
        if (detailedResult?.data) {
          setWeeklyStats(detailedResult.data);
        } else {
          const { data: podiumCount } = await weeklyChallengeService.getUserPodiumCount(profile.id);
          setWeeklyStats({ first: 0, second: 0, third: 0, total: podiumCount || 0 });
        }
      } catch (err) {
        console.warn('[PlayerStatsModal] Error loading weekly stats:', err);
      }
    }
    
    setLoading(false);
  };
  
  const loadPlayStreak = async () => {
    if (!profile?.id) return;
    
    try {
      console.log('[PlayerStatsModal] Loading play streak for:', profile.id);
      const result = await streakService.getStreak(profile.id);
      
      if (result.data && !result.error) {
        console.log('[PlayerStatsModal] Play streak loaded:', result.data);
        setPlayStreak({
          current: result.data.current_streak || 0,
          longest: result.data.longest_streak || 0,
          status: result.data.streak_status || 'none'
        });
      }
    } catch (err) {
      console.error('[PlayerStatsModal] Error loading play streak:', err);
    }
  };
  
  const loadLeaderboardRank = async () => {
    if (!profile?.id || !isSupabaseConfigured()) return;
    
    try {
      // Count how many players have higher rating
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('rating', profile.rating || 1000)
        .gt('games_played', 0);
      
      if (!error) {
        setLeaderboardRank((count || 0) + 1);
      }
    } catch (err) {
      console.warn('[PlayerStatsModal] Error loading leaderboard rank:', err);
    }
  };
  
  const loadCreatorPuzzleStats = async () => {
    if (!profile?.id) return;
    
    try {
      // Try RPC first for accurate counts
      const { data, error } = await supabase.rpc('get_creator_puzzle_stats', {
        p_user_id: profile.id
      });
      
      if (!error && data && data.length > 0) {
        const stats = data[0];
        setCreatorStats({
          easy: { completed: stats.easy_completed || 0, total: stats.easy_total || 25 },
          medium: { completed: stats.medium_completed || 0, total: stats.medium_total || 35 },
          hard: { completed: stats.hard_completed || 0, total: stats.hard_total || 25 },
          expert: { completed: stats.expert_completed || 0, total: stats.expert_total || 15 },
          totalCompleted: stats.total_completed || 0,
          totalPuzzles: stats.total_puzzles || 100
        });
      } else {
        // Fallback: Use creatorPuzzleService
        const completions = await creatorPuzzleService.getUserCompletions(profile.id);
        const puzzles = await creatorPuzzleService.getAllPuzzles();
        
        // Count by difficulty
        const puzzleDifficultyMap = {};
        puzzles.forEach(p => { puzzleDifficultyMap[p.puzzle_number] = p.difficulty; });
        
        const counts = { easy: 0, medium: 0, hard: 0, expert: 0 };
        completions.forEach(c => {
          const diff = puzzleDifficultyMap[c.puzzle_number];
          if (diff && counts[diff] !== undefined) {
            counts[diff]++;
          }
        });
        
        const totals = { easy: 0, medium: 0, hard: 0, expert: 0 };
        puzzles.forEach(p => {
          if (p.difficulty && totals[p.difficulty] !== undefined) {
            totals[p.difficulty]++;
          }
        });
        
        setCreatorStats({
          easy: { completed: counts.easy, total: totals.easy || 25 },
          medium: { completed: counts.medium, total: totals.medium || 35 },
          hard: { completed: counts.hard, total: totals.hard || 25 },
          expert: { completed: counts.expert, total: totals.expert || 15 },
          totalCompleted: completions.length,
          totalPuzzles: puzzles.length
        });
      }
    } catch (err) {
      console.warn('[PlayerStatsModal] Error loading creator puzzle stats:', err);
    }
  };
  
  const handleSectionToggle = (sectionId) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
    soundManager.playClickSound?.('click');
  };
  
  const handleSaveUsername = async () => {
    if (!newUsername.trim() || newUsername.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return;
    }
    if (newUsername.length > 20) {
      setUsernameError('Username must be 20 characters or less');
      return;
    }
    
    setSavingUsername(true);
    setUsernameError('');
    
    try {
      const { error } = await updateProfile({ username: newUsername.trim() });
      if (error) {
        setUsernameError(error.message || 'Failed to update username');
      } else {
        setEditingName(false);
        soundManager.playClickSound?.('success');
      }
    } catch (err) {
      setUsernameError('An error occurred');
    }
    
    setSavingUsername(false);
  };
  
  if (!isOpen) return null;
  
  const displayName = profile?.username || profile?.display_name || 'Player';
  const tierBg = getTierBackground(glowColor);
  
  return (
    <>
      {/* Backdrop - separate for proper touch handling */}
      <div 
        className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Container - pointer-events-none allows touch passthrough */}
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        style={{
          padding: '16px',
          paddingTop: 'max(16px, env(safe-area-inset-top))',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        }}
      >
        {/* Modal - pointer-events-auto captures events */}
        <div 
          className="w-full max-w-md max-h-[85vh] rounded-2xl overflow-hidden flex flex-col pointer-events-auto"
          style={{ 
            backgroundColor: tierBg,
            border: `1px solid ${hexToRgba(glowColor, 0.3)}`,
            boxShadow: `0 0 60px ${hexToRgba(glowColor, 0.3)}`
          }}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div 
          className="p-4 flex items-center gap-4 flex-shrink-0"
          style={{ borderBottom: `1px solid ${hexToRgba(glowColor, 0.2)}` }}
        >
          {/* Avatar/Tier Icon */}
          <div 
            className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${hexToRgba(glowColor, 0.3)}, ${hexToRgba(glowColor, 0.1)})`,
              border: `2px solid ${hexToRgba(glowColor, 0.5)}`,
              boxShadow: `0 0 20px ${hexToRgba(glowColor, 0.4)}`
            }}
          >
            {rankInfo && <TierIcon shape={rankInfo.shape} glowColor={glowColor} size="large" />}
          </div>
          
          {/* Name & Rank */}
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="flex-1 bg-slate-800/80 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                  maxLength={20}
                  autoFocus
                />
                <button
                  onClick={handleSaveUsername}
                  disabled={savingUsername}
                  className="p-1.5 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30"
                >
                  {savingUsername ? <Loader size={16} className="animate-spin" /> : <Check size={16} />}
                </button>
                <button
                  onClick={() => { setEditingName(false); setUsernameError(''); }}
                  className="p-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30"
                >
                  <X size={16} />
                </button>
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
            
            {usernameError && (
              <p className="text-red-400 text-xs mt-1">{usernameError}</p>
            )}
            
            {rankInfo && !isOffline && (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span 
                  className="text-sm font-bold uppercase tracking-wider"
                  style={{ color: glowColor, textShadow: `0 0 8px ${hexToRgba(glowColor, 0.5)}` }}
                >
                  {rankInfo.name}
                </span>
                <span className="text-slate-500 text-sm">
                  {profile?.rating || 1000} ELO
                </span>
                {/* Leaderboard Rank */}
                {leaderboardRank && (
                  <span className="flex items-center gap-1 text-amber-400 text-xs">
                    <Hash size={12} />
                    {leaderboardRank} Global
                  </span>
                )}
              </div>
            )}
            
            {isOffline && (
              <div className="text-slate-400 text-sm mt-1">
                Offline Mode - Stats not tracked
              </div>
            )}
          </div>
          
          <button 
            onClick={onClose}
            className="transition-colors flex-shrink-0"
            style={{ color: hexToRgba(glowColor, 0.6) }}
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Stats Content - Scrollable */}
        <div 
          ref={scrollContainerRef}
          className="p-4 space-y-3 overflow-y-auto overscroll-contain"
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
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
              <Section 
                id="overview" 
                title="Overview" 
                icon={TrendingUp} 
                color="cyan"
                expanded={expandedSection === 'overview'}
                onToggle={handleSectionToggle}
              >
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
                    value={(stats?.puzzleTotalSolved || 0) + (creatorStats.totalCompleted || 0)}
                    subValue="generated + creator"
                    color="green"
                  />
                  <StatCard 
                    icon={Bot} 
                    label="AI Wins" 
                    value={stats?.aiTotalWins || 0}
                    subValue={`of ${stats?.aiTotalGames || 0} games`}
                    color="purple"
                  />
                  <StatCard 
                    icon={Zap} 
                    label="Speed Best" 
                    value={stats?.speed_best_streak || 0}
                    subValue="puzzles in a row"
                    color="orange"
                  />
                </div>
                
                {/* AI Wins Dropdown */}
                <button
                  onClick={() => setShowAIDetails(!showAIDetails)}
                  className="w-full mt-3 flex items-center justify-between p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
                >
                  <span className="text-purple-400 text-xs font-medium">AI Wins by Difficulty</span>
                  {showAIDetails ? <ChevronUp size={14} className="text-purple-400" /> : <ChevronDown size={14} className="text-purple-400" />}
                </button>
                {showAIDetails && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                      <div className="text-green-400 text-sm font-bold">{stats?.ai_easy_wins || 0}</div>
                      <div className="text-[10px] text-slate-500">Beginner</div>
                      <div className="text-[9px] text-slate-600">{(stats?.ai_easy_wins || 0) + (stats?.ai_easy_losses || 0)} games</div>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                      <div className="text-amber-400 text-sm font-bold">{stats?.ai_medium_wins || 0}</div>
                      <div className="text-[10px] text-slate-500">Intermediate</div>
                      <div className="text-[9px] text-slate-600">{(stats?.ai_medium_wins || 0) + (stats?.ai_medium_losses || 0)} games</div>
                    </div>
                    <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                      <div className="text-purple-400 text-sm font-bold">{stats?.ai_hard_wins || 0}</div>
                      <div className="text-[10px] text-slate-500">Expert</div>
                      <div className="text-[9px] text-slate-600">{(stats?.ai_hard_wins || 0) + (stats?.ai_hard_losses || 0)} games</div>
                    </div>
                  </div>
                )}
                
                {/* Generated Puzzles Dropdown */}
                <button
                  onClick={() => setShowPuzzleDetails(!showPuzzleDetails)}
                  className="w-full mt-3 flex items-center justify-between p-2 rounded-lg bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-colors"
                >
                  <span className="text-green-400 text-xs font-medium">Generated Puzzles by Difficulty</span>
                  {showPuzzleDetails ? <ChevronUp size={14} className="text-green-400" /> : <ChevronDown size={14} className="text-green-400" />}
                </button>
                {showPuzzleDetails && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                      <div className="text-green-400 text-sm font-bold">{stats?.puzzles_easy_solved || 0}</div>
                      <div className="text-[10px] text-slate-500">Beginner</div>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                      <div className="text-amber-400 text-sm font-bold">{stats?.puzzles_medium_solved || 0}</div>
                      <div className="text-[10px] text-slate-500">Intermediate</div>
                    </div>
                    <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                      <div className="text-purple-400 text-sm font-bold">{stats?.puzzles_hard_solved || 0}</div>
                      <div className="text-[10px] text-slate-500">Expert</div>
                    </div>
                  </div>
                )}
              </Section>
              
              {/* Play Streak Section - NEW */}
              <Section 
                id="streak" 
                title="Play Streak" 
                icon={Flame} 
                color="orange"
                expanded={expandedSection === 'streak'}
                onToggle={handleSectionToggle}
              >
                <div className="grid grid-cols-2 gap-2">
                  <StatCard 
                    icon={Flame} 
                    label="Current Streak" 
                    value={playStreak.current}
                    subValue={
                      playStreak.status === 'played_today' ? 'Played today ✓' :
                      playStreak.status === 'at_risk' ? 'Play today!' :
                      playStreak.status === 'broken' ? 'Streak broken' :
                      'Start playing!'
                    }
                    color={playStreak.current >= 7 ? 'orange' : playStreak.current >= 3 ? 'red' : 'cyan'}
                  />
                  <StatCard 
                    icon={Award} 
                    label="Longest Streak" 
                    value={playStreak.longest}
                    subValue="days"
                    color="amber"
                  />
                </div>
                
                {playStreak.status === 'at_risk' && (
                  <div className="mt-2 p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg text-center">
                    <span className="text-orange-400 text-sm font-medium">
                      ⚠️ Play today to keep your {playStreak.current}-day streak!
                    </span>
                  </div>
                )}
                
                {playStreak.current >= playStreak.longest && playStreak.current > 0 && (
                  <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center">
                    <span className="text-amber-400 text-sm font-medium">
                      🏆 You're on your best streak ever!
                    </span>
                  </div>
                )}
              </Section>
              
              {/* Achievements Section */}
              <Section 
                id="achievements" 
                title="Achievements" 
                icon={Award} 
                color="amber"
                expanded={expandedSection === 'achievements'}
                onToggle={handleSectionToggle}
              >
                <AchievementsDisplay userId={profile?.id} compact />
              </Section>
              
              {/* Weekly Challenge Section */}
              <Section 
                id="weekly" 
                title="Weekly Challenge" 
                icon={Clock} 
                color="purple"
                expanded={expandedSection === 'weekly'}
                onToggle={handleSectionToggle}
              >
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                    <div className="text-amber-400 text-lg font-bold">{weeklyStats.first || 0}</div>
                    <div className="text-xs text-slate-500 flex items-center justify-center gap-1">
                      <Medal size={10} className="text-amber-400" /> 1st
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-400/10 border border-slate-400/20 text-center">
                    <div className="text-slate-300 text-lg font-bold">{weeklyStats.second || 0}</div>
                    <div className="text-xs text-slate-500 flex items-center justify-center gap-1">
                      <Medal size={10} className="text-slate-300" /> 2nd
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-600/10 border border-amber-600/20 text-center">
                    <div className="text-amber-600 text-lg font-bold">{weeklyStats.third || 0}</div>
                    <div className="text-xs text-slate-500 flex items-center justify-center gap-1">
                      <Medal size={10} className="text-amber-600" /> 3rd
                    </div>
                  </div>
                </div>
                {weeklyStats.total > 0 && (
                  <div className="mt-2 text-center text-sm text-slate-400">
                    {weeklyStats.total} podium finish{weeklyStats.total !== 1 ? 'es' : ''} total
                  </div>
                )}
              </Section>
              
              {/* Creator Puzzles Section */}
              <Section 
                id="creator" 
                title="Creator Puzzles" 
                icon={Sparkles} 
                color="cyan"
                expanded={expandedSection === 'creator'}
                onToggle={handleSectionToggle}
              >
                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">Overall Progress</span>
                    <span className="text-xs text-cyan-400 font-bold">
                      {creatorStats.totalCompleted}/{creatorStats.totalPuzzles}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${(creatorStats.totalCompleted / creatorStats.totalPuzzles) * 100}%` }}
                    />
                  </div>
                </div>
                
                {/* Difficulty breakdown */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Easy */}
                  <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-green-400 text-xs font-bold">Beginner</span>
                      <span className="text-xs text-slate-400">
                        {creatorStats.easy.completed}/{creatorStats.easy.total}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${(creatorStats.easy.completed / creatorStats.easy.total) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Medium */}
                  <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-amber-400 text-xs font-bold">Intermediate</span>
                      <span className="text-xs text-slate-400">
                        {creatorStats.medium.completed}/{creatorStats.medium.total}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-cyan-500 rounded-full"
                        style={{ width: `${(creatorStats.medium.completed / creatorStats.medium.total) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Hard */}
                  <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-red-400 text-xs font-bold">Hard</span>
                      <span className="text-xs text-slate-400">
                        {creatorStats.hard.completed}/{creatorStats.hard.total}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${(creatorStats.hard.completed / creatorStats.hard.total) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Expert */}
                  <div className="p-2 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-fuchsia-400 text-xs font-bold">Expert</span>
                      <span className="text-xs text-slate-400">
                        {creatorStats.expert.completed}/{creatorStats.expert.total}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-fuchsia-500 rounded-full"
                        style={{ width: `${(creatorStats.expert.completed / creatorStats.expert.total) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Completion message */}
                {creatorStats.totalCompleted === creatorStats.totalPuzzles && creatorStats.totalPuzzles > 0 && (
                  <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center">
                    <span className="text-amber-400 text-sm font-medium">
                      🏆 All puzzles completed! You're a Creator Puzzle Master!
                    </span>
                  </div>
                )}
              </Section>
              
              {/* Online Stats Section */}
              <Section 
                id="online" 
                title="Online Games" 
                icon={Globe} 
                color="green"
                expanded={expandedSection === 'online'}
                onToggle={handleSectionToggle}
              >
                <div className="grid grid-cols-2 gap-2">
                  <StatCard 
                    icon={Gamepad2} 
                    label="Games Played" 
                    value={stats?.games_played || 0}
                    color="cyan"
                  />
                  <StatCard 
                    icon={Trophy} 
                    label="Win Rate" 
                    value={`${stats?.onlineWinRate || 0}%`}
                    subValue={`${stats?.games_won || 0}W / ${(stats?.games_played || 0) - (stats?.games_won || 0)}L`}
                    color="amber"
                  />
                </div>
                {leaderboardRank && (
                  <div className="mt-2 p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-center justify-center gap-2">
                    <Hash size={16} className="text-cyan-400" />
                    <span className="text-cyan-300 font-medium">Global Rank: #{leaderboardRank}</span>
                  </div>
                )}
              </Section>
            </>
          )}
        </div>
        
        {/* Footer */}
        <div 
          className="p-3 text-center flex-shrink-0"
          style={{ borderTop: `1px solid ${hexToRgba(glowColor, 0.2)}` }}
        >
          <p className="text-slate-600 text-xs">
            Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
          </p>
        </div>
      </div>
    </div>
    </>
  );
};

export default PlayerStatsModal;
