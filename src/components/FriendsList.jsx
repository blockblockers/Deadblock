// FriendsList - View and manage friends
import { useState, useEffect } from 'react';
import { Users, UserPlus, UserMinus, Search, Clock, Check, X, MessageCircle, Gamepad2, Eye, Circle, AlertTriangle } from 'lucide-react';
import { friendsService } from '../services/friendsService';
import { ratingService } from '../services/ratingService';
import { spectatorService } from '../services/spectatorService';
import { soundManager } from '../utils/soundManager';
import TierIcon from './TierIcon';

const FriendsList = ({ userId, onInviteFriend, onSpectate, onClose }) => {
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
    
    // Import supabase for search
    const { supabase } = await import('../utils/supabase');
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, elo_rating')
      .ilike('username', `%${searchQuery}%`)
      .neq('id', userId)
      .limit(10);

    if (data) {
      // Filter out existing friends
      const friendIds = new Set(friends.map(f => f.id));
      const pendingIds = new Set([
        ...pendingRequests.map(r => r.from.id),
        ...sentRequests.map(r => r.to.id)
      ]);
      
      const filtered = data.map(user => ({
        ...user,
        isFriend: friendIds.has(user.id),
        isPending: pendingIds.has(user.id)
      }));
      
      setSearchResults(filtered);
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

  // Check if friend is in a game
  const getFriendGame = (friendId) => {
    return friendGames.find(g => 
      g.player1?.id === friendId || g.player2?.id === friendId
    );
  };

  // Get online status indicator
  const getStatusIndicator = (friend) => {
    if (getFriendGame(friend.id)) {
      return <Circle size={8} className="fill-green-400 text-green-400" title="In game" />;
    }
    if (friend.is_online) {
      return <Circle size={8} className="fill-green-400 text-green-400" title="Online" />;
    }
    return <Circle size={8} className="fill-slate-600 text-slate-600" title="Offline" />;
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden border border-amber-500/30 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-amber-500/20">
          <div className="flex items-center gap-2">
            <Users className="text-amber-400" size={24} />
            <h2 className="text-lg font-bold text-amber-300">Friends</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-amber-500/20">
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

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          {error ? (
            <div className="text-center py-8">
              <AlertTriangle className="mx-auto text-amber-400 mb-2" size={40} />
              <p className="text-amber-300 font-medium mb-2">Feature Not Available</p>
              <p className="text-slate-400 text-sm">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          ) : loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Loading...</p>
            </div>
          ) : activeTab === 'friends' ? (
            friends.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto text-slate-600 mb-2" size={40} />
                <p className="text-slate-400">No friends yet</p>
                <button
                  onClick={() => setActiveTab('add')}
                  className="mt-2 text-amber-400 text-sm hover:underline"
                >
                  Add your first friend
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {friends.map(friend => {
                  const friendGame = getFriendGame(friend.id);
                  const tier = ratingService.getRatingTier(friend.elo_rating || 1200);
                  
                  return (
                    <div 
                      key={friend.id}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                            {friend.username?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="absolute -bottom-1 -right-1">
                            {getStatusIndicator(friend)}
                          </div>
                        </div>
                        <div>
                          <p className="font-medium text-white">{friend.username}</p>
                          <div className="flex items-center gap-1 text-xs">
                            <TierIcon shape={tier.shape} glowColor={tier.glowColor} size="small" />
                            <span className="text-slate-400">{friend.elo_rating || 1200}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {friendGame ? (
                          <button
                            onClick={() => onSpectate?.(friendGame.id)}
                            className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30"
                            title="Watch game"
                          >
                            <Eye size={18} />
                          </button>
                        ) : friend.is_online ? (
                          <button
                            onClick={() => onInviteFriend?.(friend)}
                            className="p-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30"
                            title="Invite to play"
                          >
                            <Gamepad2 size={18} />
                          </button>
                        ) : null}
                        <button
                          onClick={() => removeFriend(friend.friendshipId)}
                          className="p-2 text-slate-500 hover:text-red-400"
                          title="Remove friend"
                        >
                          <UserMinus size={18} />
                        </button>
                      </div>
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
                    {pendingRequests.map(request => (
                      <div 
                        key={request.requestId}
                        className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-amber-500/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                            {request.from.username?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-white">{request.from.username}</p>
                            <p className="text-xs text-slate-400">
                              Rating: {request.from.elo_rating || 1200}
                            </p>
                          </div>
                        </div>
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
                    ))}
                  </div>
                </div>
              )}

              {/* Sent requests */}
              {sentRequests.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Sent</h3>
                  <div className="space-y-2">
                    {sentRequests.map(request => (
                      <div 
                        key={request.requestId}
                        className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-slate-300 font-bold">
                            {request.to.username?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-white">{request.to.username}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Clock size={12} /> Pending
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => declineRequest(request.requestId)}
                          className="text-slate-500 hover:text-red-400"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
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
                  {searchResults.map(user => (
                    <div 
                      key={user.id}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold">
                          {user.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-white">{user.username}</p>
                          <p className="text-xs text-slate-400">
                            Rating: {user.elo_rating || 1200}
                          </p>
                        </div>
                      </div>
                      
                      {user.isFriend ? (
                        <span className="text-green-400 text-sm">Friends</span>
                      ) : user.isPending ? (
                        <span className="text-amber-400 text-sm">Pending</span>
                      ) : (
                        <button
                          onClick={() => sendRequest(user.id)}
                          className="p-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30"
                        >
                          <UserPlus size={18} />
                        </button>
                      )}
                    </div>
                  ))}
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
