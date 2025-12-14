// View Player Profile - View another player's public stats
import { useState, useEffect } from 'react';
import { X, User, Trophy, Target, Zap, Gamepad2, TrendingUp, Swords, Clock, Send, UserPlus, Crown } from 'lucide-react';
import { ratingService } from '../services/ratingService';
import { friendsService } from '../services/friendsService';
import TierIcon from './TierIcon';
import { soundManager } from '../utils/soundManager';
import { dbSelect } from '../services/supabaseDirectFetch';

const ViewPlayerProfile = ({ playerId, playerData, onClose, onInviteToGame, currentUserId }) => {
  const [profile, setProfile] = useState(playerData || null);
  const [stats, setStats] = useState(null);
  const [ratingHistory, setRatingHistory] = useState([]);
  const [loading, setLoading] = useState(!playerData);
  const [friendStatus, setFriendStatus] = useState(null); // 'friend', 'pending_sent', 'pending_received', null
  const [sendingRequest, setSendingRequest] = useState(false);
  const [invitingToGame, setInvitingToGame] = useState(false);

  useEffect(() => {
    if (playerId) {
      loadPlayerData();
    }
  }, [playerId]);

  const loadPlayerData = async () => {
    setLoading(true);
    
    try {
      // Load profile if not provided
      if (!playerData) {
        const { data: profileData } = await dbSelect('profiles', {
          select: 'id,username,display_name,avatar_url,elo_rating,highest_rating,rating_games_played,wins,losses,games_played,created_at',
          eq: { id: playerId },
          single: true
        });
        if (profileData) {
          setProfile(profileData);
        }
      }

      // Load rating history
      const { data: history } = await ratingService.getRatingHistory(playerId, 20);
      if (history) {
        setRatingHistory(history);
      }

      // Check friend status
      if (currentUserId && currentUserId !== playerId) {
        const areFriends = await friendsService.areFriends(currentUserId, playerId);
        if (areFriends) {
          setFriendStatus('friend');
        } else {
          // Check for pending requests
          const { data: sentRequests } = await friendsService.getSentRequests(currentUserId);
          const { data: receivedRequests } = await friendsService.getPendingRequests(currentUserId);
          
          if (sentRequests?.some(r => r.to?.id === playerId)) {
            setFriendStatus('pending_sent');
          } else if (receivedRequests?.some(r => r.from?.id === playerId)) {
            setFriendStatus('pending_received');
          }
        }
      }
    } catch (err) {
      console.error('Error loading player data:', err);
    }
    
    setLoading(false);
  };

  const handleSendFriendRequest = async () => {
    if (!currentUserId || friendStatus) return;
    
    setSendingRequest(true);
    const { error } = await friendsService.sendFriendRequest(currentUserId, playerId);
    if (!error) {
      setFriendStatus('pending_sent');
      soundManager.playSound('success');
    }
    setSendingRequest(false);
  };

  const handleInviteToGame = async () => {
    if (!onInviteToGame) return;
    
    setInvitingToGame(true);
    await onInviteToGame(profile);
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

  const tier = ratingService.getRatingTier(profile.elo_rating || profile.rating || 1200);
  const displayName = profile.display_name || profile.username || 'Player';
  const winRate = profile.games_played > 0 
    ? Math.round((profile.wins / profile.games_played) * 100) 
    : 0;

  // Calculate recent form from history
  const recentGames = ratingHistory.slice(0, 10);
  const recentWins = recentGames.filter(g => g.result === 'win').length;
  const recentForm = recentGames.length > 0 ? `${recentWins}W-${recentGames.length - recentWins}L` : 'N/A';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div 
        className="bg-slate-900 rounded-2xl max-w-md w-full max-h-[85vh] overflow-hidden border border-amber-500/30 shadow-[0_0_60px_rgba(251,191,36,0.2)]"
        style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-amber-600 to-orange-600 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
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
              <div className="flex items-center gap-1 text-white/80 text-sm">
                <TierIcon shape={tier.shape} glowColor={tier.glowColor} size="small" />
                <span>{tier.name}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/70 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Rating Card */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-amber-500/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="text-amber-400" size={20} />
                <span className="text-slate-400 text-sm">Rating</span>
              </div>
              <div className="flex items-center gap-2">
                <TierIcon shape={tier.shape} glowColor={tier.glowColor} size="medium" />
                <span className={`text-2xl font-bold ${tier.color}`}>
                  {profile.elo_rating || profile.rating || 1200}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-900/50 rounded-lg p-2">
                <div className="text-slate-500 text-xs">Peak</div>
                <div className="text-amber-300 font-bold">
                  {profile.highest_rating || profile.elo_rating || 1200}
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2">
                <div className="text-slate-500 text-xs">Ranked Games</div>
                <div className="text-white font-bold">
                  {profile.rating_games_played || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-1">
                <Swords size={14} className="text-cyan-400" />
                <span className="text-slate-400 text-xs">Record</span>
              </div>
              <div className="text-white font-bold">
                {profile.wins || 0}W - {profile.losses || 0}L
              </div>
              <div className="text-slate-500 text-xs">{winRate}% win rate</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={14} className="text-green-400" />
                <span className="text-slate-400 text-xs">Recent Form</span>
              </div>
              <div className="text-white font-bold">{recentForm}</div>
              <div className="text-slate-500 text-xs">Last 10 games</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-1">
                <Gamepad2 size={14} className="text-purple-400" />
                <span className="text-slate-400 text-xs">Total Games</span>
              </div>
              <div className="text-white font-bold">{profile.games_played || 0}</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} className="text-slate-400" />
                <span className="text-slate-400 text-xs">Joined</span>
              </div>
              <div className="text-white font-bold text-sm">
                {profile.created_at 
                  ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  : 'N/A'
                }
              </div>
            </div>
          </div>

          {/* Recent Rating History */}
          {ratingHistory.length > 0 && (
            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-amber-400" />
                <span className="text-slate-400 text-sm">Recent Games</span>
              </div>
              <div className="flex gap-1">
                {ratingHistory.slice(0, 10).reverse().map((game, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-6 rounded ${
                      game.result === 'win' ? 'bg-green-500/60' : 'bg-red-500/60'
                    }`}
                    title={`${game.result === 'win' ? 'Win' : 'Loss'}: ${game.change > 0 ? '+' : ''}${game.change}`}
                  />
                ))}
                {ratingHistory.length < 10 && 
                  Array(10 - ratingHistory.length).fill(null).map((_, i) => (
                    <div key={`empty-${i}`} className="flex-1 h-6 rounded bg-slate-700/50" />
                  ))
                }
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Oldest</span>
                <span>Recent</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {currentUserId && currentUserId !== playerId && (
            <div className="flex gap-2 pt-2">
              {friendStatus === 'friend' ? (
                <>
                  <button
                    onClick={handleInviteToGame}
                    disabled={invitingToGame}
                    className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:from-amber-400 hover:to-orange-400 transition-all disabled:opacity-50"
                  >
                    {invitingToGame ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
                    disabled={invitingToGame}
                    className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:from-amber-400 hover:to-orange-400 transition-all disabled:opacity-50"
                  >
                    {invitingToGame ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewPlayerProfile;
