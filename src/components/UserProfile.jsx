// User Profile Screen - Enhanced with tier theming and clickable opponents
// FIXES:
// 1. Uses username priority (same as PlayerProfileCard)
// 2. Tier-colored styling throughout
// 3. Clickable opponents in match history
// 4. Final Board View for completed games
import { useState, useEffect } from 'react';
import { ArrowLeft, Edit2, Save, X, Trophy, Target, Percent, Calendar, User, TrendingUp, Swords, Award, Gamepad2, Zap, LayoutGrid } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { gameSyncService } from '../services/gameSync';
import { getRankInfo } from '../utils/rankUtils';
import NeonTitle from './NeonTitle';
import TierIcon from './TierIcon';
import ViewPlayerProfile from './ViewPlayerProfile';
import FinalBoardView from './FinalBoardView';
import { soundManager } from '../utils/soundManager';

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

const UserProfile = ({ onBack }) => {
  const { profile, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.username || profile?.display_name || '');
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
  
  // State for viewing opponent profile
  const [viewingOpponent, setViewingOpponent] = useState(null);
  
  // State for Final Board View
  const [selectedGameForFinalView, setSelectedGameForFinalView] = useState(null);

  // Get tier info for theming
  const rankInfo = profile ? getRankInfo(profile.rating || 1000) : null;
  const glowColor = rankInfo?.glowColor || '#22d3ee';

  useEffect(() => {
    if (profile) {
      // FIX: Use username priority
      setDisplayName(profile.username || profile.display_name || 'Player');
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
    
    const { error } = await updateProfile({ 
      username: displayName.toLowerCase(),
      display_name: displayName 
    });
    
    if (!error) {
      setEditing(false);
    }
    
    setSaving(false);
  };

  const handleBack = () => {
    soundManager.playButtonClick();
    onBack();
  };

  // FIX: Get opponent info with username priority
  const getOpponentInfo = (game) => {
    if (game.player1_id === profile?.id) {
      return {
        id: game.player2_id,
        name: game.player2?.username || game.player2?.display_name || 'Unknown',
        rating: game.player2?.rating || 1000,
        data: game.player2
      };
    }
    return {
      id: game.player1_id,
      name: game.player1?.username || game.player1?.display_name || 'Unknown',
      rating: game.player1?.rating || 1000,
      data: game.player1
    };
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Handle clicking on opponent
  const handleViewOpponent = (opponent) => {
    soundManager.playButtonClick();
    setViewingOpponent(opponent);
  };

  // FIX: Display name uses username priority
  const playerDisplayName = profile?.username || profile?.display_name || 'Player';

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Grid background with tier color */}
      <div 
        className="fixed inset-0 opacity-30 pointer-events-none" 
        style={{
          backgroundImage: `linear-gradient(${hexToRgba(glowColor, 0.4)} 1px, transparent 1px), linear-gradient(90deg, ${hexToRgba(glowColor, 0.4)} 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} 
      />
      
      {/* Glowing orbs with tier color */}
      <div 
        className="fixed top-10 right-20 w-64 h-64 rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: hexToRgba(glowColor, 0.25) }}
      />
      <div 
        className="fixed bottom-20 left-10 w-48 h-48 rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: hexToRgba(glowColor, 0.2) }}
      />

      {/* Content */}
      <div className="relative min-h-screen px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={handleBack}
              className="p-2 transition-colors"
              style={{ color: glowColor }}
            >
              <ArrowLeft size={24} />
            </button>
            <NeonTitle size="small" />
          </div>

          {/* Profile Card - Tier themed */}
          <div 
            className="backdrop-blur-md rounded-2xl p-6 mb-4"
            style={{
              background: `linear-gradient(135deg, ${getTierBackground(glowColor)} 0%, ${hexToRgba(glowColor, 0.1)} 50%, rgba(15, 23, 42, 0.95) 100%)`,
              border: `2px solid ${hexToRgba(glowColor, 0.4)}`,
              boxShadow: `0 0 40px ${hexToRgba(glowColor, 0.25)}, inset 0 0 30px ${hexToRgba(glowColor, 0.05)}`
            }}
          >
            {/* Avatar and name */}
            <div className="flex items-center gap-4 mb-6">
              {/* Avatar with tier icon */}
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${getTierBackground(glowColor)}, rgba(10, 15, 25, 0.98))`,
                  border: `3px solid ${hexToRgba(glowColor, 0.6)}`,
                  boxShadow: `0 0 25px ${hexToRgba(glowColor, 0.4)}`
                }}
              >
                {rankInfo && (
                  <TierIcon shape={rankInfo.shape} glowColor={rankInfo.glowColor} size="large" />
                )}
              </div>
              
              <div className="flex-1">
                {editing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-800 border rounded-lg text-white focus:outline-none transition-colors"
                      style={{ borderColor: hexToRgba(glowColor, 0.5) }}
                      placeholder="Username"
                    />
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="p-2 text-white rounded-lg disabled:opacity-50"
                      style={{ backgroundColor: hexToRgba(glowColor, 0.3) }}
                    >
                      <Save size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setDisplayName(profile?.username || profile?.display_name);
                      }}
                      className="p-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 
                      className="text-2xl font-bold"
                      style={{ color: '#f1f5f9', textShadow: `0 0 15px ${hexToRgba(glowColor, 0.5)}` }}
                    >
                      {playerDisplayName}
                    </h2>
                    <button
                      onClick={() => setEditing(true)}
                      className="p-1.5 transition-colors"
                      style={{ color: hexToRgba(glowColor, 0.7) }}
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                )}
                {/* Tier name */}
                {rankInfo && (
                  <p 
                    className="text-sm font-bold uppercase tracking-wider"
                    style={{ color: glowColor, textShadow: `0 0 10px ${hexToRgba(glowColor, 0.5)}` }}
                  >
                    {rankInfo.name}
                  </p>
                )}
              </div>
            </div>

            {/* Rating - Tier themed */}
            <div 
              className="text-center py-4 rounded-xl mb-6"
              style={{
                background: `linear-gradient(135deg, ${hexToRgba(glowColor, 0.15)} 0%, ${hexToRgba(glowColor, 0.05)} 100%)`,
                border: `1px solid ${hexToRgba(glowColor, 0.3)}`
              }}
            >
              <div 
                className="text-4xl font-black mb-1"
                style={{ color: glowColor, textShadow: `0 0 20px ${hexToRgba(glowColor, 0.6)}` }}
              >
                {profile?.rating || 1000}
              </div>
              <div className="text-sm font-medium" style={{ color: hexToRgba(glowColor, 0.7) }}>
                ELO RATING
              </div>
            </div>

            {/* Stats grid - Tier accented */}
            <div className="grid grid-cols-3 gap-3">
              <div 
                className="rounded-lg p-4 text-center"
                style={{ 
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  border: `1px solid ${hexToRgba(glowColor, 0.2)}`
                }}
              >
                <Target size={20} className="mx-auto mb-2" style={{ color: glowColor }} />
                <div className="text-2xl font-bold text-white">{stats.totalGames}</div>
                <div className="text-slate-500 text-xs">Games</div>
              </div>
              <div 
                className="rounded-lg p-4 text-center"
                style={{ 
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  border: `1px solid ${hexToRgba(glowColor, 0.2)}`
                }}
              >
                <Percent size={20} className="text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{stats.winRate}%</div>
                <div className="text-slate-500 text-xs">Win Rate</div>
              </div>
              <div 
                className="rounded-lg p-4 text-center"
                style={{ 
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  border: `1px solid ${hexToRgba(glowColor, 0.2)}`
                }}
              >
                <Trophy size={20} className="text-amber-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{stats.wins}</div>
                <div className="text-slate-500 text-xs">Victories</div>
              </div>
            </div>
            
            {/* Streak info */}
            {(stats.currentStreak > 0 || stats.bestStreak > 0) && (
              <div className="flex justify-center gap-6 mt-4 pt-4" style={{ borderTop: `1px solid ${hexToRgba(glowColor, 0.2)}` }}>
                {stats.currentStreak > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🔥</span>
                    <div>
                      <div className="text-white font-bold">{stats.currentStreak}</div>
                      <div className="text-slate-500 text-xs">Current Streak</div>
                    </div>
                  </div>
                )}
                {stats.bestStreak > 0 && (
                  <div className="flex items-center gap-2">
                    <Award size={20} className="text-amber-400" />
                    <div>
                      <div className="text-white font-bold">{stats.bestStreak}</div>
                      <div className="text-slate-500 text-xs">Best Streak</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Match History - Tier themed with clickable opponents */}
          <div 
            className="backdrop-blur-md rounded-2xl p-4"
            style={{
              background: `linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, ${hexToRgba(glowColor, 0.05)} 100%)`,
              border: `1px solid ${hexToRgba(glowColor, 0.3)}`,
              boxShadow: `0 0 20px ${hexToRgba(glowColor, 0.1)}`
            }}
          >
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: glowColor }}>
              <Calendar size={16} />
              MATCH HISTORY
            </h3>

            {recentGames.length === 0 ? (
              <p className="text-slate-600 text-center py-8">No games played yet</p>
            ) : (
              <div className="space-y-2">
                {recentGames.map(game => {
                  const won = game.winner_id === profile?.id;
                  const opponent = getOpponentInfo(game);
                  const opponentRankInfo = getRankInfo(opponent.rating);
                  
                  return (
                    <div
                      key={game.id}
                      className={`w-full p-3 rounded-lg transition-all ${
                        won 
                          ? 'bg-green-900/20 border border-green-500/30' 
                          : 'bg-red-900/20 border border-red-500/30'
                      }`}
                    >
                      {/* Clickable opponent info row */}
                      <button
                        onClick={() => handleViewOpponent(opponent)}
                        className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${won ? 'bg-green-400' : 'bg-red-400'}`} />
                          
                          {/* Opponent avatar with tier icon */}
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{
                              background: getTierBackground(opponentRankInfo?.glowColor || '#64748b'),
                              border: `2px solid ${hexToRgba(opponentRankInfo?.glowColor || '#64748b', 0.5)}`
                            }}
                          >
                            {opponentRankInfo ? (
                              <TierIcon shape={opponentRankInfo.shape} glowColor={opponentRankInfo.glowColor} size="small" />
                            ) : (
                              <User size={14} className="text-slate-400" />
                            )}
                          </div>
                          
                          <div className="text-left">
                            <div className="text-slate-300 text-sm font-medium">vs {opponent.name}</div>
                            <div className="text-slate-600 text-xs flex items-center gap-2">
                              <span>{formatDate(game.created_at)}</span>
                              <span style={{ color: opponentRankInfo?.glowColor || '#64748b' }}>
                                {opponent.rating} ELO
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${won ? 'text-green-400' : 'text-red-400'}`}>
                            {won ? 'WIN' : 'LOSS'}
                          </span>
                          <div className="text-slate-600">›</div>
                        </div>
                      </button>
                      
                      {/* Final Board View button */}
                      <div className="mt-2 flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            soundManager.playButtonClick();
                            setSelectedGameForFinalView(game);
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors text-xs"
                          title="View final board state"
                        >
                          <LayoutGrid size={14} />
                          Final Board
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Member since */}
          <p className="text-center text-slate-600 text-xs mt-6">
            Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
          </p>
        </div>
      </div>
      
      {/* View Opponent Profile Modal */}
      {viewingOpponent && (
        <ViewPlayerProfile
          playerId={viewingOpponent.id}
          playerData={viewingOpponent.data}
          currentUserId={profile?.id}
          onClose={() => setViewingOpponent(null)}
        />
      )}
      
      {/* Final Board View Modal */}
      {selectedGameForFinalView && (
        <FinalBoardView
          isOpen={true}
          onClose={() => setSelectedGameForFinalView(null)}
          board={selectedGameForFinalView.board}
          boardPieces={selectedGameForFinalView.board_pieces}
          winner={selectedGameForFinalView.winner_id === selectedGameForFinalView.player1_id ? 'player1' : 
                  selectedGameForFinalView.winner_id === selectedGameForFinalView.player2_id ? 'player2' : null}
          player1Name={selectedGameForFinalView.player1?.username || selectedGameForFinalView.player1?.display_name || 'Player 1'}
          player2Name={selectedGameForFinalView.player2?.username || selectedGameForFinalView.player2?.display_name || 'Player 2'}
          viewerIsPlayer1={selectedGameForFinalView.player1_id === profile?.id}
        />
      )}
    </div>
  );
};

export default UserProfile;
