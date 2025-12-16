// View Player Profile - View another player's public stats
// PERFORMANCE FIX: Uses Promise.all for parallel queries instead of sequential
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
      // =====================================================
      // PERFORMANCE FIX: Parallel queries with Promise.all
      // Before: 4+ sequential queries (4x slower)
      // After: All queries run simultaneously
      // =====================================================
      
      // Start all independent queries in parallel
      const [
        profileResult,
        friendStatusResult,
        ratingHistoryResult
      ] = await Promise.all([
        // Query 1: Load profile if not provided
        playerData ? Promise.resolve({ data: null }) : dbSelect('profiles', {
          select: 'id,username,display_name,avatar_url,elo_rating,highest_rating,rating_games_played,wins,losses,games_played,created_at',
          eq: { id: playerId },
          limit: 1
        }),
        
        // Query 2: Check friend status (runs 3 sub-queries in parallel)
        currentUserId ? checkFriendStatusParallel(playerId, currentUserId) : Promise.resolve(null),
        
        // Query 3: Get rating history
        ratingService.getPlayerRatingHistory ? 
          ratingService.getPlayerRatingHistory(playerId) : 
          Promise.resolve([])
      ]);

      // Process profile result
      if (!playerData && profileResult.data && profileResult.data.length > 0) {
        setProfile(profileResult.data[0]);
      }

      // Process friend status
      if (friendStatusResult) {
        setFriendStatus(friendStatusResult);
      }

      // Process rating history
      if (ratingHistoryResult) {
        setRatingHistory(ratingHistoryResult);
      }

      // Calculate derived stats
      const p = playerData || (profileResult.data && profileResult.data[0]);
      if (p) {
        const totalGames = p.games_played || 0;
        const wins = p.wins || 0;
        const losses = p.losses || 0;
        
        setStats({
          totalGames,
          wins,
          losses,
          winRate: totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0,
          currentRating: p.elo_rating || 1000,
          highestRating: p.highest_rating || p.elo_rating || 1000,
          ratedGames: p.rating_games_played || 0
        });
      }
    } catch (err) {
      console.error('Error loading player data:', err);
    }
    
    setLoading(false);
  };

  // =====================================================
  // PERFORMANCE FIX: Check friend status with parallel queries
  // =====================================================
  const checkFriendStatusParallel = async (targetUserId, myUserId) => {
    try {
      // Run all 3 friend status checks in parallel
      const [areFriendsResult, sentResult, receivedResult] = await Promise.all([
        friendsService.areFriends(myUserId, targetUserId),
        friendsService.getSentRequests(myUserId),
        friendsService.getPendingRequests(myUserId)
      ]);

      // Check if already friends
      if (areFriendsResult) {
        return 'friend';
      }

      // Check if we sent a request to them
      const { data: sentRequests } = sentResult;
      if (sentRequests?.some(r => r.to_user_id === targetUserId)) {
        return 'pending_sent';
      }

      // Check if they sent a request to us
      const { data: receivedRequests } = receivedResult;
      if (receivedRequests?.some(r => r.from_user_id === targetUserId)) {
        return 'pending_received';
      }

      return null;
    } catch (err) {
      console.error('Error checking friend status:', err);
      return null;
    }
  };

  const handleSendFriendRequest = async () => {
    if (!currentUserId || sendingRequest) return;
    
    setSendingRequest(true);
    try {
      const { error } = await friendsService.sendFriendRequest(currentUserId, playerId);
      if (!error) {
        setFriendStatus('pending_sent');
        soundManager.playSound('success');
      } else {
        soundManager.playSound('error');
      }
    } catch (err) {
      console.error('Error sending friend request:', err);
      soundManager.playSound('error');
    }
    setSendingRequest(false);
  };

  const handleAcceptFriendRequest = async () => {
    if (!currentUserId || sendingRequest) return;
    
    setSendingRequest(true);
    try {
      const { error } = await friendsService.acceptFriendRequest(playerId, currentUserId);
      if (!error) {
        setFriendStatus('friend');
        soundManager.playSound('success');
      } else {
        soundManager.playSound('error');
      }
    } catch (err) {
      console.error('Error accepting friend request:', err);
      soundManager.playSound('error');
    }
    setSendingRequest(false);
  };

  const handleInviteToGame = async () => {
    if (!onInviteToGame || invitingToGame) return;
    
    setInvitingToGame(true);
    try {
      await onInviteToGame(playerId);
      soundManager.playSound('success');
    } catch (err) {
      console.error('Error inviting to game:', err);
      soundManager.playSound('error');
    }
    setInvitingToGame(false);
  };

  // Get tier info
  const getTierInfo = (rating) => {
    if (rating >= 2000) return { name: 'Master', color: 'text-pink-400', bg: 'bg-pink-500/20' };
    if (rating >= 1800) return { name: 'Diamond', color: 'text-purple-400', bg: 'bg-purple-500/20' };
    if (rating >= 1600) return { name: 'Platinum', color: 'text-cyan-300', bg: 'bg-cyan-500/20' };
    if (rating >= 1400) return { name: 'Gold', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    if (rating >= 1200) return { name: 'Silver', color: 'text-slate-300', bg: 'bg-slate-400/20' };
    return { name: 'Bronze', color: 'text-amber-600', bg: 'bg-amber-600/20' };
  };

  const tierInfo = stats ? getTierInfo(stats.currentRating) : null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-slate-900 rounded-xl p-8 border border-slate-700">
          <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 mt-4">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-slate-900 rounded-xl p-8 border border-slate-700 text-center">
          <User size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">Player not found</p>
          <button
            onClick={onClose}
            className="mt-4 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-xl max-w-md w-full overflow-hidden border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="relative p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-b border-slate-700">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
          
          {/* Profile Info */}
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${tierInfo?.bg || 'bg-slate-700'} border-2 ${tierInfo?.color.replace('text-', 'border-') || 'border-slate-600'}`}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className={`text-2xl font-bold ${tierInfo?.color || 'text-slate-400'}`}>
                  {(profile.display_name || profile.username)?.[0]?.toUpperCase() || '?'}
                </span>
              )}
            </div>
            
            {/* Name & Rating */}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">
                {profile.display_name || profile.username}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <TierIcon tier={tierInfo?.name?.toLowerCase() || 'bronze'} size={20} />
                <span className={`font-bold ${tierInfo?.color}`}>
                  {stats?.currentRating || 1000}
                </span>
                <span className="text-slate-500 text-sm">
                  {tierInfo?.name}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
              <Gamepad2 size={18} className="text-cyan-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-white">{stats?.totalGames || 0}</div>
              <div className="text-xs text-slate-500">Games</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
              <Trophy size={18} className="text-green-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-white">{stats?.wins || 0}</div>
              <div className="text-xs text-slate-500">Wins</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
              <Target size={18} className="text-amber-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-white">{stats?.winRate || 0}%</div>
              <div className="text-xs text-slate-500">Win Rate</div>
            </div>
          </div>
          
          {/* Rating Stats */}
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown size={16} className="text-yellow-400" />
                <span className="text-sm text-slate-400">Highest Rating</span>
              </div>
              <span className="font-bold text-yellow-400">{stats?.highestRating || 1000}</span>
            </div>
          </div>
          
          {/* Member Since */}
          {profile.created_at && (
            <div className="text-center text-xs text-slate-500">
              <Clock size={12} className="inline mr-1" />
              Member since {new Date(profile.created_at).toLocaleDateString()}
            </div>
          )}
        </div>
        
        {/* Actions */}
        {currentUserId && currentUserId !== playerId && (
          <div className="p-4 border-t border-slate-700 flex gap-3">
            {/* Friend Action */}
            {friendStatus === 'friend' ? (
              <div className="flex-1 py-2 px-4 bg-green-500/20 text-green-400 rounded-lg text-center text-sm font-medium">
                ✓ Friends
              </div>
            ) : friendStatus === 'pending_sent' ? (
              <div className="flex-1 py-2 px-4 bg-slate-700/50 text-slate-400 rounded-lg text-center text-sm">
                Request Sent
              </div>
            ) : friendStatus === 'pending_received' ? (
              <button
                onClick={handleAcceptFriendRequest}
                disabled={sendingRequest}
                className="flex-1 py-2 px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <UserPlus size={16} />
                Accept Request
              </button>
            ) : (
              <button
                onClick={handleSendFriendRequest}
                disabled={sendingRequest}
                className="flex-1 py-2 px-4 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <UserPlus size={16} />
                Add Friend
              </button>
            )}
            
            {/* Invite to Game */}
            {onInviteToGame && (
              <button
                onClick={handleInviteToGame}
                disabled={invitingToGame}
                className="flex-1 py-2 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Swords size={16} />
                Challenge
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewPlayerProfile;
