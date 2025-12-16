// FriendsList - View and manage friends
// UPDATED: Enhanced tier styling, improved challenge flow, tier-colored elements
import { useState, useEffect } from 'react';
import { Users, UserPlus, UserMinus, Search, Clock, Check, X, Gamepad2, Eye, Circle, AlertTriangle, User, Swords, ChevronRight, Star } from 'lucide-react';
import { friendsService } from '../services/friendsService';
import { ratingService } from '../services/ratingService';
import { spectatorService } from '../services/spectatorService';
import { inviteService } from '../services/inviteService';
import { soundManager } from '../utils/soundManager';
import TierIcon from './TierIcon';

const FriendsList = ({ userId, onInviteFriend, onSpectate, onViewProfile, onClose }) => {
  const [activeTab, setActiveTab] = useState('friends'); // friends, requests, add
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [friendGames, setFriendGames] = useState([]);
  const [error, setError] = useState(null);
  const [sendingInvite, setSendingInvite] = useState(null);
  const [sentGameInvites, setSentGameInvites] = useState(new Set());

  // Load friends data
  useEffect(() => {
    loadFriendsData();
  }, [userId]);

  const loadFriendsData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [friendsResult, requestsResult, sentResult] = await Promise.all([
        friendsService.getFriends(userId),
        friendsService.getPendingRequests(userId),
        friendsService.getSentRequests(userId)
      ]);

      if (friendsResult.error) throw new Error(friendsResult.error.message || 'Failed to load friends');
      if (friendsResult.data) setFriends(friendsResult.data);
      if (requestsResult.data) setPendingRequests(requestsResult.data);
      if (sentResult.data) setSentRequests(sentResult.data);

      // Load friend games for spectating
      if (friendsResult.data?.length > 0) {
        const friendIds = friendsResult.data.map(f => f.id);
        const { data: games } = await spectatorService.getFriendGames(friendIds);
        if (games) setFriendGames(games);
      }
    } catch (err) {
      console.error('Error loading friends data:', err);
      setError('Social features require database migration. Please run the migration first.');
    }

    setLoading(false);
  };

  // Search for users
  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    
    setSearching(true);
    
    try {
      const { data } = await inviteService.searchUsers(searchQuery, userId, 10);
      
      if (data) {
        // Filter out existing friends
        const friendIds = new Set(friends.map(f => f.id));
        const pendingIds = new Set([
          ...pendingRequests.map(r => r.from?.id),
          ...sentRequests.map(r => r.to?.id)
        ].filter(Boolean));
        
        const filtered = data.map(user => ({
          ...user,
          isFriend: friendIds.has(user.id),
          isPending: pendingIds.has(user.id)
        }));
        
        setSearchResults(filtered);
      }
    } catch (err) {
      console.error('Search error:', err);
    }
    
    setSearching(false);
  };

  // Send friend request
  const sendRequest = async (friendId) => {
    const { error } = await friendsService.sendFriendRequest(userId, friendId);
    if (!error) {
      soundManager.playSound('success');
      loadFriendsData();
      setSearchResults(prev => prev.map(u => 
        u.id === friendId ? { ...u, isPending: true } : u
      ));
    }
  };

  // Accept friend request
  const acceptRequest = async (requestId) => {
    const { error } = await friendsService.acceptFriendRequest(requestId, userId);
    if (!error) {
      soundManager.playSound('success');
      loadFriendsData();
    }
  };

  // Decline friend request
  const declineRequest = async (requestId) => {
    const { error } = await friendsService.declineFriendRequest(requestId, userId);
    if (!error) {
      loadFriendsData();
    }
  };

  // Remove friend
  const removeFriend = async (friendshipId) => {
    if (!confirm('Remove this friend?')) return;
    
    const { error } = await friendsService.removeFriend(friendshipId, userId);
    if (!error) {
      loadFriendsData();
    }
  };

  // Send game invite to friend
  const sendGameInvite = async (friend) => {
    if (sendingInvite || sentGameInvites.has(friend.id)) return;
    
    setSendingInvite(friend.id);
    
    try {
      const { data, error } = await inviteService.sendInvite(userId, friend.id);
      if (!error) {
        soundManager.playSound('success');
        setSentGameInvites(prev => new Set([...prev, friend.id]));
        // Also call onInviteFriend if provided for backwards compatibility
        if (onInviteFriend) {
          onInviteFriend(friend);
        }
      } else if (error.message === 'Invite already sent') {
        // Mark as sent anyway to update UI
        setSentGameInvites(prev => new Set([...prev, friend.id]));
      }
    } catch (err) {
      console.error('Error sending game invite:', err);
    }
    
    setSendingInvite(null);
  };

  // Check if friend is in a game and get game details
  const getFriendGame = (friendId) => {
    return friendGames.find(g => 
      g.player1?.id === friendId || g.player2?.id === friendId
    );
  };

  // Get the opponent in a game
  const getOpponent = (game, friendId) => {
    if (!game) return null;
    return game.player1?.id === friendId ? game.player2 : game.player1;
  };

  // Helper to convert hex to rgba for glow effects
  const hexToRgba = (hex, alpha) => {
    if (!hex || !hex.startsWith('#')) return `rgba(251, 191, 36, ${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Get online status indicator
  const getStatusIndicator = (friend) => {
    const game = getFriendGame(friend.id);
    if (game) {
      return (
        <div className="flex items-center gap-1">
          <Circle size={8} className="fill-green-400 text-green-400" />
          <span className="text-green-400 text-xs">In Game</span>
        </div>
      );
    }
    if (friend.is_online) {
      return (
        <div className="flex items-center gap-1">
          <Circle size={8} className="fill-green-400 text-green-400" />
          <span className="text-green-400 text-xs">Online</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1">
        <Circle size={8} className="fill-slate-600 text-slate-600" />
        <span className="text-slate-500 text-xs">Offline</span>
      </div>
    );
  };

  // Get tier info for a player - uses correct ratingService
  const getTier = (rating) => ratingService.getRatingTier(rating || 1200);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div 
        className="bg-slate-900 rounded-xl max-w-md w-full max-h-[85vh] overflow-hidden border border-amber-500/30 shadow-[0_0_40px_rgba(251,191,36,0.15)] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-amber-500/20 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Users className="text-amber-400" size={24} />
            <h2 className="text-lg font-bold text-amber-300">Friends</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-amber-500/20 flex-shrink-0">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'friends' 
                ? 'bg-amber-500/20 text-amber-300 border-b-2 border-amber-400' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'requests' 
                ? 'bg-amber-500/20 text-amber-300 border-b-2 border-amber-400' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Requests
            {pendingRequests.length > 0 && (
              <span className="absolute top-2 right-4 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'add' 
                ? 'bg-amber-500/20 text-amber-300 border-b-2 border-amber-400' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Add
          </button>
        </div>

        {/* Content - Scrollable */}
        <div 
          className="flex-1 overflow-y-auto p-4"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertTriangle className="mx-auto text-amber-500 mb-3" size={40} />
              <p className="text-amber-300 mb-2 font-medium">Feature Setup Required</p>
              <p className="text-slate-400 text-sm">{error}</p>
            </div>
          ) : activeTab === 'friends' ? (
            friends.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto text-slate-600 mb-2" size={40} />
                <p className="text-slate-400">No friends yet</p>
                <p className="text-slate-500 text-sm mt-1">Add friends to challenge them to games!</p>
                <button
                  onClick={() => setActiveTab('add')}
                  className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-400"
                >
                  Find Friends
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {friends.map(friend => {
                  const friendGame = getFriendGame(friend.id);
                  const opponent = getOpponent(friendGame, friend.id);
                  const tier = getTier(friend.rating || friend.elo_rating);
                  const hasInviteSent = sentGameInvites.has(friend.id);
                  const glowColor = tier?.glowColor || '#f59e0b';
                  
                  return (
                    <div 
                      key={friend.friendshipId}
                      className="p-3 bg-slate-800/50 rounded-lg transition-all hover:bg-slate-800/70"
                      style={{
                        border: `1px solid ${hexToRgba(glowColor, 0.25)}`,
                        boxShadow: `0 0 10px ${hexToRgba(glowColor, 0.1)}`
                      }}
                    >
                      {/* Main Friend Row */}
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => onViewProfile?.(friend.id, friend)}
                          className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition-opacity"
                        >
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold overflow-hidden"
                            style={{
                              background: `linear-gradient(135deg, ${hexToRgba(glowColor, 0.4)} 0%, ${hexToRgba(glowColor, 0.2)} 100%)`,
                              border: `2px solid ${hexToRgba(glowColor, 0.5)}`
                            }}
                          >
                            {friend.avatar_url ? (
                              <img src={friend.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              friend.username?.[0]?.toUpperCase() || '?'
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-white truncate">{friend.username}</p>
                              <ChevronRight size={14} className="text-slate-500 flex-shrink-0" />
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <div 
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded"
                                style={{ 
                                  background: hexToRgba(glowColor, 0.15),
                                  border: `1px solid ${hexToRgba(glowColor, 0.3)}`
                                }}
                              >
                                <TierIcon shape={tier.shape} glowColor={tier.glowColor} size="small" />
                                <span style={{ color: glowColor }} className="font-medium">
                                  {friend.rating || friend.elo_rating || 1200}
                                </span>
                              </div>
                              <span className="text-slate-600">•</span>
                              {getStatusIndicator(friend)}
                            </div>
                          </div>
                        </button>
                        
                        <div className="flex items-center gap-1 ml-2">
                          {friendGame ? (
                            <button
                              onClick={() => onSpectate?.(friendGame.id)}
                              className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                              title="Watch game"
                            >
                              <Eye size={18} />
                            </button>
                          ) : friend.is_online && !hasInviteSent ? (
                            <button
                              onClick={() => sendGameInvite(friend)}
                              disabled={sendingInvite === friend.id}
                              className="p-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                              title="Challenge to a game"
                            >
                              {sendingInvite === friend.id ? (
                                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Gamepad2 size={18} />
                              )}
                            </button>
                          ) : hasInviteSent ? (
                            <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                              <Star size={12} />
                              Sent
                            </div>
                          ) : !friend.is_online ? (
                            <button
                              onClick={() => sendGameInvite(friend)}
                              disabled={sendingInvite === friend.id}
                              className="p-2 bg-slate-700/50 text-slate-500 rounded-lg hover:bg-slate-700 hover:text-amber-400 transition-colors disabled:opacity-50"
                              title="Challenge (they'll see it when online)"
                            >
                              {sendingInvite === friend.id ? (
                                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Gamepad2 size={18} />
                              )}
                            </button>
                          ) : null}
                          <button
                            onClick={() => removeFriend(friend.friendshipId)}
                            className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                            title="Remove friend"
                          >
                            <UserMinus size={18} />
                          </button>
                        </div>
                      </div>
                      
                      {/* Game Info - Show opponent when spectating is available */}
                      {friendGame && opponent && (
                        <div className="mt-2 pt-2 border-t border-slate-700/50">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-slate-400">
                              <Swords size={12} className="text-green-400" />
                              <span>Playing vs</span>
                              <span className="text-white font-medium">{opponent.username || 'Unknown'}</span>
                              {(opponent.rating || opponent.elo_rating) && (
                                <span className="text-slate-500">({opponent.rating || opponent.elo_rating})</span>
                              )}
                            </div>
                            <button
                              onClick={() => onSpectate?.(friendGame.id)}
                              className="text-green-400 hover:text-green-300 font-medium"
                            >
                              Watch →
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : activeTab === 'requests' ? (
            <div className="space-y-4">
              {/* Received requests */}
              {pendingRequests.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Received</h3>
                  <div className="space-y-2">
                    {pendingRequests.map(request => {
                      const tier = getTier(request.from?.rating || request.from?.elo_rating);
                      const glowColor = tier?.glowColor || '#22d3ee';
                      return (
                        <div 
                          key={request.requestId}
                          className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                          style={{
                            border: `1px solid ${hexToRgba(glowColor, 0.3)}`,
                            boxShadow: `0 0 15px ${hexToRgba(glowColor, 0.1)}`
                          }}
                        >
                          <button
                            onClick={() => onViewProfile?.(request.from?.id, request.from)}
                            className="flex items-center gap-3 flex-1 text-left hover:opacity-80"
                          >
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                              style={{
                                background: `linear-gradient(135deg, ${hexToRgba(glowColor, 0.4)} 0%, ${hexToRgba(glowColor, 0.2)} 100%)`,
                                border: `2px solid ${hexToRgba(glowColor, 0.5)}`
                              }}
                            >
                              {request.from?.username?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <p className="font-medium text-white">{request.from?.username}</p>
                              <div className="flex items-center gap-1 text-xs">
                                <TierIcon shape={tier.shape} glowColor={tier.glowColor} size="small" />
                                <span style={{ color: glowColor }} className="font-medium">
                                  {tier.name} • {request.from?.rating || request.from?.elo_rating || 1200}
                                </span>
                              </div>
                            </div>
                          </button>
                          <div className="flex gap-2">
                            <button
                              onClick={() => acceptRequest(request.requestId)}
                              className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30"
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={() => declineRequest(request.requestId)}
                              className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sent requests */}
              {sentRequests.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Sent</h3>
                  <div className="space-y-2">
                    {sentRequests.map(request => {
                      const tier = getTier(request.to?.rating || request.to?.elo_rating);
                      return (
                        <div 
                          key={request.requestId}
                          className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-slate-300 font-bold">
                              {request.to?.username?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <p className="font-medium text-white">{request.to?.username}</p>
                              <div className="flex items-center gap-1 text-xs text-slate-500">
                                <Clock size={12} />
                                <span>Pending</span>
                                {(request.to?.rating || request.to?.elo_rating) && (
                                  <>
                                    <span>•</span>
                                    <TierIcon shape={tier.shape} glowColor={tier.glowColor} size="small" />
                                    <span>{request.to?.rating || request.to?.elo_rating}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => declineRequest(request.requestId)}
                            className="text-slate-500 hover:text-red-400"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {pendingRequests.length === 0 && sentRequests.length === 0 && (
                <div className="text-center py-8">
                  <Clock className="mx-auto text-slate-600 mb-2" size={40} />
                  <p className="text-slate-400">No pending requests</p>
                </div>
              )}
            </div>
          ) : (
            /* Add friends tab */
            <div>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by username..."
                  className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching || searchQuery.length < 2}
                  className="px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-400 disabled:opacity-50"
                >
                  {searching ? '...' : <Search size={20} />}
                </button>
              </div>

              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map(user => {
                    const tier = getTier(user.rating || user.elo_rating);
                    const glowColor = tier?.glowColor || '#a855f7';
                    return (
                      <div 
                        key={user.id}
                        className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg transition-all hover:bg-slate-800/70"
                        style={{
                          border: `1px solid ${hexToRgba(glowColor, 0.25)}`
                        }}
                      >
                        <button
                          onClick={() => onViewProfile?.(user.id, user)}
                          className="flex items-center gap-3 flex-1 text-left hover:opacity-80"
                        >
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                            style={{
                              background: `linear-gradient(135deg, ${hexToRgba(glowColor, 0.4)} 0%, ${hexToRgba(glowColor, 0.2)} 100%)`,
                              border: `2px solid ${hexToRgba(glowColor, 0.5)}`
                            }}
                          >
                            {user.username?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-white">{user.username}</p>
                            <div className="flex items-center gap-1 text-xs">
                              <TierIcon shape={tier.shape} glowColor={tier.glowColor} size="small" />
                              <span style={{ color: glowColor }} className="font-medium">
                                {tier.name} • {user.rating || user.elo_rating || 1200}
                              </span>
                            </div>
                          </div>
                        </button>
                        
                        {user.isFriend ? (
                          <span className="flex items-center gap-1 text-green-400 text-sm">
                            <Check size={14} />
                            Friends
                          </span>
                        ) : user.isPending ? (
                          <span className="flex items-center gap-1 text-amber-400 text-sm">
                            <Clock size={14} />
                            Pending
                          </span>
                        ) : (
                          <button
                            onClick={() => sendRequest(user.id)}
                            className="p-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors"
                          >
                            <UserPlus size={18} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : searchQuery.length >= 2 && !searching ? (
                <div className="text-center py-4 text-slate-400">
                  No users found
                </div>
              ) : (
                <div className="text-center py-8">
                  <Search className="mx-auto text-slate-600 mb-2" size={40} />
                  <p className="text-slate-400">Search for players to add</p>
                  <p className="text-slate-500 text-sm mt-1">Enter at least 2 characters</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendsList;
