// View Player Profile - View another player's public stats
// FIXED: Correct tier system, proper stats loading, working challenge button
import { useState, useEffect } from 'react';
import { X, User, Trophy, Target, Zap, Gamepad2, TrendingUp, Swords, Clock, Send, UserPlus, Crown, Award, Star } from 'lucide-react';
import { ratingService } from '../services/ratingService';
import { friendsService } from '../services/friendsService';
import { inviteService } from '../services/inviteService';
import TierIcon from './TierIcon';
import { soundManager } from '../utils/soundManager';
import { dbSelect, dbRpc } from '../services/supabaseDirectFetch';

const ViewPlayerProfile = ({ playerId, playerData, onClose, onInviteToGame, currentUserId }) => {
  const [profile, setProfile] = useState(playerData || null);
  const [playerStats, setPlayerStats] = useState(null);
  const [ratingHistory, setRatingHistory] = useState([]);
  const [achievementStats, setAchievementStats] = useState(null);
  const [loading, setLoading] = useState(!playerData);
  const [friendStatus, setFriendStatus] = useState(null);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [invitingToGame, setInvitingToGame] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteError, setInviteError] = useState(null);

  useEffect(() => {
    if (playerId) {
      loadPlayerData();
    }
  }, [playerId]);

  const loadPlayerData = async () => {
    setLoading(true);
    
    try {
      // Load profile if not provided
      let profileData = playerData;
      if (!profileData) {
        const { data } = await dbSelect('profiles', {
          select: 'id,username,display_name,avatar_url,rating,elo_rating,highest_rating,rating_games_played,games_won,games_played,created_at',
          eq: { id: playerId },
          single: true
        });
        profileData = data;
      }
      
      if (profileData) {
        setProfile(profileData);
      }

      // Load player_stats for detailed stats
      try {
        const { data: stats } = await dbSelect('player_stats', {
          select: '*',
          eq: { user_id: playerId },
          single: true
        });
        if (stats) {
          setPlayerStats(stats);
        }
      } catch (e) {
        console.log('[ViewPlayerProfile] player_stats not available');
      }

      // Load rating history
      try {
        const historyResult = await ratingService.getRatingHistory(playerId, 10);
        if (historyResult.data) {
          setRatingHistory(historyResult.data);
        }
      } catch (e) {
        console.log('[ViewPlayerProfile] Rating history not available');
      }

      // Load achievement stats
      try {
        const { data: achStats } = await dbRpc('get_achievement_stats', { p_user_id: playerId });
        if (achStats) {
          setAchievementStats(achStats);
        }
      } catch (e) {
        console.log('[ViewPlayerProfile] Achievement stats not available');
      }

      // Check friendship status
      if (currentUserId && currentUserId !== playerId) {
        try {
          const { data: friendship } = await friendsService.checkFriendship(currentUserId, playerId);
          if (friendship) {
            if (friendship.status === 'accepted') {
              setFriendStatus('friend');
            } else if (friendship.status === 'pending') {
              setFriendStatus(friendship.user_id === currentUserId ? 'pending_sent' : 'pending_received');
            }
          }
        } catch (e) {
          console.log('[ViewPlayerProfile] Friendship check failed');
        }
      }
    } catch (err) {
      console.error('[ViewPlayerProfile] Error loading player data:', err);
    }
    
    setLoading(false);
  };

  // Handle sending friend request
  const handleSendFriendRequest = async () => {
    if (!currentUserId || sendingRequest) return;
    
    setSendingRequest(true);
    try {
      const { error } = await friendsService.sendFriendRequest(currentUserId, playerId);
      if (!error) {
        setFriendStatus('pending_sent');
        soundManager.playSound('success');
      }
    } catch (err) {
      console.error('Error sending friend request:', err);
    }
    setSendingRequest(false);
  };

  // =====================================================
  // FIXED: Challenge button now actually sends invite
  // =====================================================
  const handleInviteToGame = async () => {
    if (invitingToGame || inviteSent) return;
    
    setInvitingToGame(true);
    setInviteError(null);
    
    try {
      // If parent provided callback, use it
      if (onInviteToGame) {
        await onInviteToGame(profile);
        setInviteSent(true);
        soundManager.playSound('success');
      } else if (currentUserId) {
        // Otherwise, send invite directly
        const { data, error } = await inviteService.sendInvite(currentUserId, playerId);
        
        if (error) {
          if (error.message === 'Invite already sent') {
            setInviteError('Invite already sent!');
          } else {
            setInviteError(error.message || 'Failed to send invite');
          }
        } else {
          setInviteSent(true);
          soundManager.playSound('success');
          
          // If mutual invite created a game, close and notify
          if (data?.game) {
            setTimeout(() => {
              onClose?.();
            }, 500);
          }
        }
      }
    } catch (err) {
      console.error('Error inviting to game:', err);
      setInviteError('Failed to send invite');
    }
    
    setInvitingToGame(false);
  };

  if (!profile && loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
        <div className="bg-slate-900 rounded-xl p-8 text-center">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
        <div className="bg-slate-900 rounded-xl p-6 text-center max-w-sm w-full border border-red-500/30">
          <X size={48} className="mx-auto text-red-400 mb-4" />
          <p className="text-white font-medium mb-2">Player Not Found</p>
          <p className="text-slate-400 text-sm mb-4">This player may have deleted their account.</p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Get tier using the CORRECT tier system (shape-based)
  const rating = profile.rating || profile.elo_rating || 1000;
  const tier = ratingService.getRatingTier(rating);
  const displayName = profile.username || profile.display_name || 'Player';
  
  // Calculate stats from profile OR player_stats
  const gamesPlayed = playerStats?.games_played || profile.games_played || 0;
  const gamesWon = playerStats?.games_won || profile.games_won || 0;
  const gamesLost = gamesPlayed - gamesWon;
  const winRate = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;
  
  // AI stats from player_stats
  const aiWins = playerStats ? 
    (playerStats.ai_easy_wins || 0) + (playerStats.ai_medium_wins || 0) + (playerStats.ai_hard_wins || 0) : 0;
  
  // Puzzle stats
  const puzzlesSolved = playerStats ?
    (playerStats.puzzles_easy_solved || 0) + (playerStats.puzzles_medium_solved || 0) + (playerStats.puzzles_hard_solved || 0) : 0;

  // Helper to convert hex color to rgba
  const hexToRgba = (hex, alpha) => {
    if (!hex || !hex.startsWith('#')) return `rgba(100, 116, 139, ${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const glowColor = tier?.glowColor || '#22d3ee';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div 
        className="bg-slate-900 rounded-2xl max-w-md w-full max-h-[85vh] overflow-hidden shadow-2xl"
        style={{ 
          border: `2px solid ${hexToRgba(glowColor, 0.4)}`,
          boxShadow: `0 0 60px ${hexToRgba(glowColor, 0.2)}`
        }}
      >
        {/* Header with tier-based gradient */}
        <div 
          className="p-4 flex items-center justify-between"
          style={{
            background: `linear-gradient(135deg, ${hexToRgba(glowColor, 0.3)} 0%, rgba(15, 23, 42, 0.95) 100%)`
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${hexToRgba(glowColor, 0.2)} 0%, rgba(15, 23, 42, 0.9) 100%)`,
                border: `2px solid ${hexToRgba(glowColor, 0.5)}`,
                boxShadow: `0 0 15px ${hexToRgba(glowColor, 0.3)}`
              }}
            >
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-xl font-bold">
                  {displayName[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{displayName}</h2>
              <div className="flex items-center gap-2">
                <TierIcon shape={tier.shape} glowColor={tier.glowColor} size="small" />
                <span style={{ color: glowColor }} className="font-medium">{tier.name}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 180px)' }}>
          
          {/* Rating Card with Tier Styling */}
          <div 
            className="rounded-xl p-4"
            style={{
              background: `linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, ${hexToRgba(glowColor, 0.1)} 100%)`,
              border: `1px solid ${hexToRgba(glowColor, 0.3)}`
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy style={{ color: glowColor }} size={20} />
                <span className="text-slate-400 text-sm">Rating</span>
              </div>
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    background: `radial-gradient(circle, ${hexToRgba(glowColor, 0.2)}, rgba(15, 23, 42, 0.9))`,
                    border: `2px solid ${hexToRgba(glowColor, 0.5)}`
                  }}
                >
                  <TierIcon shape={tier.shape} glowColor={tier.glowColor} size="medium" />
                </div>
                <span 
                  className="text-2xl font-bold"
                  style={{ color: glowColor, textShadow: `0 0 10px ${hexToRgba(glowColor, 0.5)}` }}
                >
                  {rating}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-900/50 rounded-lg p-2">
                <div className="text-slate-500 text-xs">Peak</div>
                <div style={{ color: glowColor }} className="font-bold">
                  {profile.highest_rating || rating}
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2">
                <div className="text-slate-500 text-xs">Ranked Games</div>
                <div className="text-white font-bold">
                  {profile.rating_games_played || gamesPlayed}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-1">
                <Swords size={14} className="text-cyan-400" />
                <span className="text-slate-400 text-xs">Online Record</span>
              </div>
              <div className="text-white font-bold">
                {gamesWon}W - {gamesLost}L
              </div>
              <div className="text-slate-500 text-xs">{winRate}% win rate</div>
            </div>
            
            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-1">
                <Target size={14} className="text-green-400" />
                <span className="text-slate-400 text-xs">vs AI</span>
              </div>
              <div className="text-white font-bold">{aiWins} wins</div>
              {playerStats?.ai_hard_wins > 0 && (
                <div className="text-amber-400 text-xs">{playerStats.ai_hard_wins} Expert wins</div>
              )}
            </div>

            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-1">
                <Zap size={14} className="text-purple-400" />
                <span className="text-slate-400 text-xs">Puzzles Solved</span>
              </div>
              <div className="text-white font-bold">{puzzlesSolved}</div>
              {playerStats?.puzzles_hard_solved > 0 && (
                <div className="text-purple-400 text-xs">{playerStats.puzzles_hard_solved} Hard</div>
              )}
            </div>

            {achievementStats && (
              <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <Award size={14} className="text-amber-400" />
                  <span className="text-slate-400 text-xs">Achievements</span>
                </div>
                <div className="text-white font-bold">
                  {achievementStats.unlockedCount || 0}/{achievementStats.totalAchievements || 0}
                </div>
                <div className="text-amber-400 text-xs">
                  {achievementStats.earnedPoints || 0} points
                </div>
              </div>
            )}
          </div>

          {/* Rating History */}
          {ratingHistory.length > 0 && (
            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-cyan-400" />
                <span className="text-slate-400 text-sm">Recent Games</span>
              </div>
              <div className="flex gap-1 h-8">
                {ratingHistory.slice(0, 10).map((game, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded transition-all hover:scale-110 ${
                      game.result === 'win' ? 'bg-green-500/60' : 'bg-red-500/60'
                    }`}
                    title={`${game.result === 'win' ? 'Win' : 'Loss'}: ${game.change > 0 ? '+' : ''}${game.change}`}
                  />
                ))}
                {ratingHistory.length < 10 && 
                  Array(10 - ratingHistory.length).fill(null).map((_, i) => (
                    <div key={`empty-${i}`} className="flex-1 h-full rounded bg-slate-700/50" />
                  ))
                }
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Oldest</span>
                <span>Recent</span>
              </div>
            </div>
          )}

          {/* Member Since */}
          <div className="text-center text-slate-500 text-xs">
            Member since {new Date(profile.created_at).toLocaleDateString()}
          </div>
        </div>

        {/* Action Buttons */}
        {currentUserId && currentUserId !== playerId && (
          <div className="p-4 border-t border-slate-700/50 space-y-2">
            {/* Invite Error/Success Message */}
            {inviteError && (
              <div className="text-red-400 text-sm text-center mb-2">{inviteError}</div>
            )}
            {inviteSent && (
              <div className="text-green-400 text-sm text-center mb-2">Challenge sent! ⚔️</div>
            )}
            
            <div className="flex gap-2">
              {friendStatus === 'friend' ? (
                <>
                  <button
                    onClick={handleInviteToGame}
                    disabled={invitingToGame || inviteSent}
                    className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:from-amber-400 hover:to-orange-400 transition-all disabled:opacity-50"
                  >
                    {invitingToGame ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : inviteSent ? (
                      <>
                        <Star size={18} />
                        Sent!
                      </>
                    ) : (
                      <>
                        <Gamepad2 size={18} />
                        Challenge
                      </>
                    )}
                  </button>
                  <div className="px-4 py-3 bg-green-500/20 text-green-400 rounded-xl font-medium flex items-center gap-2">
                    <User size={18} />
                    Friends
                  </div>
                </>
              ) : friendStatus === 'pending_sent' ? (
                <div className="flex-1 py-3 bg-slate-700 text-slate-400 rounded-xl font-medium text-center flex items-center justify-center gap-2">
                  <Clock size={18} />
                  Friend Request Sent
                </div>
              ) : friendStatus === 'pending_received' ? (
                <div className="flex-1 py-3 bg-amber-500/20 text-amber-400 rounded-xl font-medium text-center flex items-center justify-center gap-2">
                  <UserPlus size={18} />
                  Wants to be Friends
                </div>
              ) : (
                <>
                  <button
                    onClick={handleInviteToGame}
                    disabled={invitingToGame || inviteSent}
                    className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:from-amber-400 hover:to-orange-400 transition-all disabled:opacity-50"
                  >
                    {invitingToGame ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : inviteSent ? (
                      <>
                        <Star size={18} />
                        Sent!
                      </>
                    ) : (
                      <>
                        <Gamepad2 size={18} />
                        Challenge
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleSendFriendRequest}
                    disabled={sendingRequest}
                    className="px-4 py-3 bg-slate-700 text-slate-300 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-slate-600 transition-all disabled:opacity-50"
                  >
                    {sendingRequest ? (
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <UserPlus size={18} />
                        Add
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewPlayerProfile;
