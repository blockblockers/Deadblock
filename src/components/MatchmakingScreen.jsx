// Matchmaking Screen - Find online opponents
import { useState, useEffect, useRef } from 'react';
import { Search, X, Zap, Trophy, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { matchmakingService } from '../services/matchmaking';
import NeonTitle from './NeonTitle';
import { soundManager } from '../utils/soundManager';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import FloatingPieces from './FloatingPieces';

// Online theme - amber/orange to match the menu button
const theme = {
  gridColor: 'rgba(251,191,36,0.4)',
  glow1: { color: 'bg-amber-500/40', pos: 'top-1/3 left-1/4' },
  glow2: { color: 'bg-orange-500/35', pos: 'bottom-1/3 right-1/4' },
  cardBg: 'bg-gradient-to-br from-slate-900/95 via-amber-950/40 to-slate-900/95',
  cardBorder: 'border-amber-500/40',
  cardShadow: 'shadow-[0_0_60px_rgba(251,191,36,0.3),inset_0_0_20px_rgba(251,191,36,0.05)]',
};

const MatchmakingScreen = ({ onMatchFound, onCancel }) => {
  const { user, profile } = useAuth();
  const { needsScroll } = useResponsiveLayout(700);
  const [status, setStatus] = useState('idle'); // idle, searching, found, loading, error
  const [searchTime, setSearchTime] = useState(0);
  const [playersInQueue, setPlayersInQueue] = useState(0);
  const [error, setError] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [matchedGame, setMatchedGame] = useState(null);
  const timerRef = useRef(null);
  const cleanupRef = useRef(null);
  const loadingTimerRef = useRef(null);

  useEffect(() => {
    startSearch();

    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (loadingTimerRef.current) {
      clearInterval(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    matchmakingService.stopMatchmaking();
    if (user?.id) {
      matchmakingService.leaveQueue(user.id);
    }
  };

  const startSearch = async () => {
    if (!user || !profile) {
      setError('Not logged in');
      return;
    }

    setStatus('searching');
    setError('');
    setSearchTime(0);

    // Join the queue
    const { error: queueError } = await matchmakingService.joinQueue(
      user.id, 
      profile.rating || 1000
    );

    if (queueError) {
      setError('Failed to join queue: ' + queueError.message);
      setStatus('error');
      return;
    }

    // Start timer
    timerRef.current = setInterval(() => {
      setSearchTime(t => t + 1);
    }, 1000);

    // Check queue status periodically
    const updateQueueStatus = async () => {
      const { count } = await matchmakingService.getQueueStatus();
      setPlayersInQueue(count);
    };
    updateQueueStatus();
    const queueInterval = setInterval(updateQueueStatus, 5000);

    // Handle match found
    const handleMatchFound = (game) => {
      if (!game || !game.id) {
        console.error('Invalid game received:', game);
        setError('Failed to create game. Please try again.');
        setStatus('error');
        clearInterval(queueInterval);
        return;
      }

      setMatchedGame(game);
      setStatus('found');
      soundManager.playSound('win');
      clearInterval(queueInterval);
      
      // Start loading progress animation
      setLoadingProgress(0);
      let progress = 0;
      loadingTimerRef.current = setInterval(() => {
        progress += 5;
        setLoadingProgress(Math.min(progress, 95));
        
        if (progress >= 100) {
          clearInterval(loadingTimerRef.current);
        }
      }, 50);
      
      // Navigate after animation
      setTimeout(() => {
        setLoadingProgress(100);
        setTimeout(() => {
          onMatchFound(game);
        }, 200);
      }, 1200);
    };

    // Handle errors
    const handleError = (err) => {
      console.error('Matchmaking error:', err);
      setError(err?.message || 'An error occurred. Please try again.');
      setStatus('error');
      clearInterval(queueInterval);
    };

    // Start matchmaking polling
    cleanupRef.current = matchmakingService.startMatchmaking(
      user.id,
      profile.rating || 1000,
      handleMatchFound,
      handleError
    );

    // Also subscribe to being matched by others
    matchmakingService.subscribeToMatches(user.id, handleMatchFound);

    // Cleanup queue interval on unmount
    const originalCleanup = cleanupRef.current;
    cleanupRef.current = () => {
      originalCleanup?.();
      clearInterval(queueInterval);
    };
  };

  const handleCancel = () => {
    soundManager.playButtonClick();
    cleanup();
    onCancel();
  };

  const handleRetry = () => {
    soundManager.playButtonClick();
    setError('');
    startSearch();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className={needsScroll ? 'min-h-screen bg-slate-950' : 'h-screen bg-slate-950 overflow-hidden'}
      style={needsScroll ? { overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' } : {}}
    >
      {/* Themed Grid background */}
      <div className="fixed inset-0 opacity-40 pointer-events-none" style={{
        backgroundImage: `linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
        animation: 'gridMove 20s linear infinite'
      }} />
      
      {/* Themed glow orbs */}
      <div className={`fixed ${theme.glow1.pos} w-80 h-80 ${theme.glow1.color} rounded-full blur-3xl pointer-events-none animate-pulse`} />
      <div className={`fixed ${theme.glow2.pos} w-80 h-80 ${theme.glow2.color} rounded-full blur-3xl pointer-events-none animate-pulse`} style={{ animationDelay: '1s' }} />

      {/* Floating pieces background */}
      <FloatingPieces count={8} theme="online" minOpacity={0.06} maxOpacity={0.15} />

      {/* Content */}
      <div className={`relative ${needsScroll ? 'min-h-screen' : 'h-full'} flex flex-col items-center justify-center px-4 ${needsScroll ? 'py-8' : 'py-4'}`}>
        <div className="w-full max-w-md text-center">
          
          {/* Title - Large and centered */}
          <div className="mb-6">
            <NeonTitle size="large" />
            <p className="text-amber-400/80 text-sm mt-2 font-medium">Online Matchmaking</p>
          </div>
          
          {/* Status Card */}
          <div className={`${theme.cardBg} backdrop-blur-md rounded-2xl p-8 border ${theme.cardBorder} ${theme.cardShadow}`}>
            
            {status === 'searching' && (
              <>
                {/* Animated search indicator */}
                <div className="relative w-24 h-24 mx-auto mb-6">
                  {/* Outer ring */}
                  <div className="absolute inset-0 border-4 border-amber-500/30 rounded-full animate-ping" />
                  {/* Middle ring */}
                  <div className="absolute inset-2 border-4 border-amber-400/50 rounded-full animate-pulse" />
                  {/* Inner spinning ring */}
                  <div className="absolute inset-4 border-4 border-transparent border-t-amber-400 rounded-full animate-spin" />
                  {/* Center icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Search size={28} className="text-amber-300" />
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-amber-300 mb-2">
                  Finding Opponent...
                </h2>
                
                <p className="text-slate-400 mb-6">
                  Searching for players near your skill level
                </p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                    <div className="text-2xl font-bold text-white">{formatTime(searchTime)}</div>
                    <div className="text-xs text-slate-500">Search Time</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                    <div className="text-2xl font-bold text-white">{playersInQueue}</div>
                    <div className="text-xs text-slate-500">In Queue</div>
                  </div>
                </div>

                {/* Player info */}
                <div className="bg-slate-800/30 rounded-lg p-4 mb-6 flex items-center justify-between border border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold">
                      {profile?.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="text-left">
                      <div className="text-white font-medium">{profile?.username || 'Player'}</div>
                      <div className="text-slate-500 text-xs">Rating: {profile?.rating || 1000}</div>
                    </div>
                  </div>
                  <Trophy size={20} className="text-amber-400" />
                </div>

                {/* Cancel button */}
                <button
                  onClick={handleCancel}
                  className="w-full py-3 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <X size={18} />
                  Cancel Search
                </button>
              </>
            )}

            {status === 'found' && (
              <>
                {/* Match found animation */}
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 bg-green-500/30 rounded-full animate-ping" />
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-500 to-emerald-600 rounded-full shadow-[0_0_30px_rgba(34,197,94,0.6)]">
                    <Zap size={36} className="text-white" />
                  </div>
                </div>

                <h2 className="text-3xl font-black text-green-400 mb-2">
                  MATCH FOUND!
                </h2>
                
                <p className="text-slate-400 mb-6">
                  Preparing your game...
                </p>

                {/* Progress Bar */}
                <div className="w-full mb-4">
                  <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-100 ease-out relative"
                      style={{ width: `${loadingProgress}%` }}
                    >
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">{loadingProgress}%</div>
                </div>

                {/* Opponent info (if available) */}
                {matchedGame && (
                  <div className="bg-slate-800/30 rounded-lg p-4 flex items-center justify-center gap-4 border border-slate-700/50">
                    <div className="text-center">
                      <div className="w-10 h-10 mx-auto rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold mb-1">
                        {profile?.username?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="text-white text-xs font-medium">{profile?.username}</div>
                    </div>
                    <div className="text-2xl font-black text-slate-600">VS</div>
                    <div className="text-center">
                      <div className="w-10 h-10 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold mb-1">
                        {(matchedGame.player1?.id === user?.id 
                          ? matchedGame.player2?.username?.[0] 
                          : matchedGame.player1?.username?.[0]
                        )?.toUpperCase() || '?'}
                      </div>
                      <div className="text-white text-xs font-medium">
                        {matchedGame.player1?.id === user?.id 
                          ? matchedGame.player2?.username 
                          : matchedGame.player1?.username}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {status === 'error' && (
              <>
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 flex items-center justify-center bg-red-900/50 rounded-full border-2 border-red-500/50">
                    <AlertCircle size={36} className="text-red-400" />
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-red-400 mb-2">
                  Connection Error
                </h2>
                
                <p className="text-slate-400 mb-6">
                  {error || 'Something went wrong. Please try again.'}
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={handleCancel}
                    className="flex-1 py-3 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleRetry}
                    className="flex-1 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition-all font-bold"
                  >
                    Retry
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Tips */}
          {status === 'searching' && (
            <div className="mt-6 text-slate-500 text-sm">
              <p>💡 Tip: Games typically match within 30 seconds during peak hours</p>
            </div>
          )}
        </div>
        {needsScroll && <div className="h-8 flex-shrink-0" />}
      </div>

      {/* Animations */}
      <style>{`
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(40px, 40px); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-shimmer {
          animation: shimmer 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default MatchmakingScreen;
