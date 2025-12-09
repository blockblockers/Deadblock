// Online Menu - Hub for online features
import { useState, useEffect } from 'react';
import { Swords, Trophy, User, LogOut, History, ChevronRight, X, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { gameSyncService } from '../services/gameSync';
import NeonTitle from './NeonTitle';
import { soundManager } from '../utils/soundManager';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

// Online theme - amber/orange to match the menu button
const theme = {
  gridColor: 'rgba(251,191,36,0.4)',
  glow1: { color: 'bg-amber-500/40', pos: 'top-10 right-20' },
  glow2: { color: 'bg-orange-500/35', pos: 'bottom-20 left-10' },
  glow3: { color: 'bg-yellow-500/20', pos: 'top-1/3 left-1/3' },
  cardBg: 'bg-gradient-to-br from-slate-900/95 via-amber-950/40 to-slate-900/95',
  cardBorder: 'border-amber-500/40',
  cardShadow: 'shadow-[0_0_50px_rgba(251,191,36,0.3),inset_0_0_20px_rgba(251,191,36,0.05)]',
};

// Active Game Prompt Modal
const ActiveGamePrompt = ({ games, profile, onResume, onDismiss }) => {
  // Find games where it's the user's turn
  const myTurnGames = games?.filter(game => game && gameSyncService.isPlayerTurn(game, profile?.id)) || [];
  
  if (myTurnGames.length === 0) return null;

  const getOpponentName = (game) => {
    if (!game) return 'Unknown';
    if (game.player1_id === profile?.id) {
      return game.player2?.username || 'Unknown';
    }
    return game.player1?.username || 'Unknown';
  };

  const game = myTurnGames[0]; // Show the first game where it's their turn
  if (!game) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-slate-900 rounded-2xl border border-amber-500/50 shadow-[0_0_60px_rgba(251,191,36,0.3)] overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-4 relative">
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 p-1 text-white/70 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
          <div className="flex items-center justify-center gap-3">
            <Zap size={28} className="text-white" />
            <h2 className="text-xl font-black text-white">IT'S YOUR TURN!</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-slate-400 text-center mb-4">
            You have {myTurnGames.length === 1 ? 'a game' : `${myTurnGames.length} games`} waiting for your move
          </p>

          {/* Game preview */}
          <div className="bg-slate-800/50 rounded-xl p-4 mb-5 border border-slate-700/50">
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold mb-1">
                  {profile?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="text-white text-xs font-medium">You</div>
              </div>
              <div className="text-xl font-black text-amber-400">VS</div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold mb-1">
                  {getOpponentName(game)?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="text-white text-xs font-medium">{getOpponentName(game)}</div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-2">
            <button
              onClick={() => {
                soundManager.playButtonClick();
                onResume(game);
              }}
              className="w-full p-4 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl font-bold text-white hover:from-amber-400 hover:to-orange-500 transition-all shadow-[0_0_20px_rgba(251,191,36,0.4)] active:scale-[0.98]"
            >
              RESUME GAME
            </button>
            <button
              onClick={onDismiss}
              className="w-full p-3 text-slate-500 hover:text-slate-300 text-sm transition-colors"
            >
              Maybe Later
            </button>
          </div>

          {/* Additional games indicator */}
          {myTurnGames.length > 1 && (
            <p className="text-center text-amber-400/70 text-xs mt-3">
              +{myTurnGames.length - 1} more {myTurnGames.length - 1 === 1 ? 'game' : 'games'} waiting
            </p>
          )}
        </div>
      </div>

      {/* Animation */}
      <style>{`
        @keyframes scaleIn {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

const OnlineMenu = ({ 
  onFindMatch, 
  onViewProfile, 
  onViewLeaderboard, 
  onResumeGame,
  onBack 
}) => {
  const { profile, signOut } = useAuth();
  const { needsScroll } = useResponsiveLayout(700);
  const [activeGames, setActiveGames] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showActivePrompt, setShowActivePrompt] = useState(true);

  useEffect(() => {
    loadGames();
  }, [profile?.id]);

  const loadGames = async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    try {
      // Get active games
      const { data: active } = await gameSyncService.getActiveGames(profile.id);
      setActiveGames(active || []);

      // Get recent completed games
      const { data: recent } = await gameSyncService.getPlayerGames(profile.id, 5);
      setRecentGames((recent || []).filter(g => g.status === 'completed'));
    } catch (err) {
      console.error('Error loading games:', err);
    }
    
    setLoading(false);
  };

  const handleSignOut = async () => {
    soundManager.playButtonClick();
    await signOut();
    onBack();
  };

  const handleFindMatch = () => {
    soundManager.playButtonClick();
    onFindMatch();
  };

  const handleBack = () => {
    soundManager.playButtonClick();
    onBack();
  };

  const getOpponentName = (game) => {
    if (!game) return 'Unknown';
    if (game.player1_id === profile?.id) {
      return game.player2?.username || 'Unknown';
    }
    return game.player1?.username || 'Unknown';
  };

  const getGameResult = (game) => {
    if (!game) return { text: 'Unknown', color: 'text-slate-400' };
    if (!game.winner_id) return { text: 'Draw', color: 'text-slate-400' };
    if (game.winner_id === profile?.id) return { text: 'Won', color: 'text-green-400' };
    return { text: 'Lost', color: 'text-red-400' };
  };

  // Check if there are games where it's the user's turn
  const hasMyTurnGames = activeGames?.some(game => game && gameSyncService.isPlayerTurn(game, profile?.id)) || false;

  return (
    <div 
      className={needsScroll ? 'min-h-screen bg-slate-950' : 'h-screen bg-slate-950 overflow-hidden'}
      style={needsScroll ? { overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' } : {}}
    >
      {/* Themed Grid background */}
      <div className="fixed inset-0 opacity-40 pointer-events-none" style={{
        backgroundImage: `linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />
      
      {/* Themed glow orbs */}
      <div className={`fixed ${theme.glow1.pos} w-80 h-80 ${theme.glow1.color} rounded-full blur-3xl pointer-events-none`} />
      <div className={`fixed ${theme.glow2.pos} w-72 h-72 ${theme.glow2.color} rounded-full blur-3xl pointer-events-none`} />
      <div className={`fixed ${theme.glow3.pos} w-64 h-64 ${theme.glow3.color} rounded-full blur-3xl pointer-events-none`} />

      {/* Active Game Prompt Modal */}
      {showActivePrompt && hasMyTurnGames && !loading && (
        <ActiveGamePrompt
          games={activeGames}
          profile={profile}
          onResume={(game) => {
            setShowActivePrompt(false);
            onResumeGame(game);
          }}
          onDismiss={() => setShowActivePrompt(false)}
        />
      )}

      {/* Content */}
      <div className={`relative ${needsScroll ? 'min-h-screen' : 'h-full'} flex flex-col items-center justify-center px-4 ${needsScroll ? 'py-8' : 'py-4'}`}>
        <div className="w-full max-w-md">
          
          {/* Title - Centered and Large */}
          <div className="text-center mb-6">
            <NeonTitle size="large" />
            <p className="text-amber-400/80 text-sm mt-2 font-medium">Online Multiplayer</p>
          </div>

          {/* Main Card */}
          <div className={`${theme.cardBg} backdrop-blur-md rounded-2xl p-5 border ${theme.cardBorder} ${theme.cardShadow}`}>
            
            {/* User Stats Card */}
            <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-amber-500/30">
                  {profile?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1">
                  <h2 className="text-white font-bold text-lg">{profile?.username || 'Player'}</h2>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-amber-400 font-medium">⭐ {profile?.rating || 1000}</span>
                    <span className="text-slate-500">{profile?.games_played || 0} games</span>
                    <span className="text-green-400">{profile?.games_won || 0} wins</span>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                  title="Sign Out"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </div>

            {/* Find Match - Primary CTA */}
            <button
              onClick={handleFindMatch}
              className="w-full p-4 mb-4 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl font-black tracking-wider text-lg text-white hover:from-amber-400 hover:to-orange-500 transition-all shadow-[0_0_30px_rgba(251,191,36,0.5)] active:scale-[0.98]"
            >
              FIND MATCH
            </button>

            {/* Secondary actions */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => {
                  soundManager.playButtonClick();
                  onViewLeaderboard();
                }}
                className="p-3 bg-slate-800/70 rounded-xl text-slate-300 hover:bg-slate-700/70 transition-all flex items-center justify-center gap-2 border border-slate-700/50"
              >
                <Trophy size={18} className="text-amber-400" />
                <span className="text-sm font-medium">Leaderboard</span>
              </button>
              <button
                onClick={() => {
                  soundManager.playButtonClick();
                  onViewProfile();
                }}
                className="p-3 bg-slate-800/70 rounded-xl text-slate-300 hover:bg-slate-700/70 transition-all flex items-center justify-center gap-2 border border-slate-700/50"
              >
                <User size={18} className="text-amber-400" />
                <span className="text-sm font-medium">Profile</span>
              </button>
            </div>

            {/* Active Games */}
            {activeGames.length > 0 && (
              <div className="bg-amber-900/20 rounded-xl p-4 mb-4 border border-amber-500/30">
                <h3 className="text-amber-400 font-bold text-sm mb-3 flex items-center gap-2">
                  <Swords size={16} />
                  ACTIVE GAMES ({activeGames.length})
                </h3>
                <div className="space-y-2">
                  {activeGames.filter(g => g).map(game => {
                    const isMyTurn = gameSyncService.isPlayerTurn(game, profile?.id);
                    const opponentName = getOpponentName(game);
                    return (
                      <button
                        key={game.id}
                        onClick={() => {
                          soundManager.playButtonClick();
                          onResumeGame(game);
                        }}
                        className={`w-full p-3 rounded-lg flex items-center justify-between transition-all group ${
                          isMyTurn 
                            ? 'bg-gradient-to-r from-amber-600/30 to-orange-600/30 border border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.2)]' 
                            : 'bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
                            {opponentName?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="text-left">
                            <div className="text-white text-sm font-medium">vs {opponentName}</div>
                            <div className={`text-xs ${isMyTurn ? 'text-amber-300 font-medium' : 'text-slate-500'}`}>
                              {isMyTurn ? '🎮 Your turn!' : 'Waiting for opponent...'}
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={18} className={`transition-colors ${
                          isMyTurn ? 'text-amber-400' : 'text-slate-600 group-hover:text-amber-400'
                        }`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Games */}
            {recentGames.length > 0 && (
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                <h3 className="text-slate-400 font-bold text-sm mb-3 flex items-center gap-2">
                  <History size={16} />
                  RECENT GAMES
                </h3>
                <div className="space-y-2">
                  {recentGames.slice(0, 3).filter(g => g).map(game => {
                    const result = getGameResult(game);
                    const opponentName = getOpponentName(game);
                    return (
                      <div
                        key={game.id}
                        className="p-3 bg-slate-800/50 rounded-lg flex items-center justify-between border border-slate-700/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-xs font-bold">
                            {opponentName?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="text-left">
                            <div className="text-slate-300 text-sm">vs {opponentName}</div>
                            <div className="text-slate-600 text-xs">
                              {game.created_at ? new Date(game.created_at).toLocaleDateString() : 'Unknown date'}
                            </div>
                          </div>
                        </div>
                        <span className={`text-sm font-bold ${result.color}`}>
                          {result.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Back button */}
            <button
              onClick={handleBack}
              className="w-full mt-4 py-2.5 text-slate-400 hover:text-slate-200 text-sm transition-colors"
            >
              ← Back to Menu
            </button>
          </div>
        </div>
        {needsScroll && <div className="h-8 flex-shrink-0" />}
      </div>
    </div>
  );
};

export default OnlineMenu;
