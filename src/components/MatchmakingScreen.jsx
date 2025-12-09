// Matchmaking Screen - Find online opponents
import { useState, useEffect, useRef } from 'react';
import { Search, X, Users, Zap, Trophy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { matchmakingService } from '../services/matchmaking';
import NeonTitle from './NeonTitle';
import { soundManager } from '../utils/soundManager';

const MatchmakingScreen = ({ onMatchFound, onCancel }) => {
  const { user, profile } = useAuth();
  const [status, setStatus] = useState('idle'); // idle, searching, found
  const [searchTime, setSearchTime] = useState(0);
  const [playersInQueue, setPlayersInQueue] = useState(0);
  const [error, setError] = useState('');
  const timerRef = useRef(null);
  const cleanupRef = useRef(null);

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
      setStatus('idle');
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

    // Start matchmaking polling
    cleanupRef.current = matchmakingService.startMatchmaking(
      user.id,
      profile.rating || 1000,
      (game) => {
        // Match found!
        setStatus('found');
        soundManager.playSound('win');
        clearInterval(queueInterval);
        
        setTimeout(() => {
          onMatchFound(game);
        }, 1500);
      },
      (err) => {
        console.error('Matchmaking error:', err);
      }
    );

    // Also subscribe to being matched by others
    matchmakingService.subscribeToMatches(user.id, (game) => {
      setStatus('found');
      soundManager.playSound('win');
      clearInterval(queueInterval);
      
      setTimeout(() => {
        onMatchFound(game);
      }, 1500);
    });

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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Animated grid background */}
      <div className="fixed inset-0 opacity-30 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        animation: 'gridMove 20s linear infinite'
      }} />
      
      {/* Pulsing glow effects */}
      <div className="fixed top-1/3 left-1/4 w-80 h-80 bg-cyan-500/30 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="fixed bottom-1/3 right-1/4 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          
          {/* Title */}
          <NeonTitle size="default" />
          
          {/* Status Card */}
          <div className="mt-8 bg-slate-900/90 backdrop-blur-md rounded-2xl p-8 border border-cyan-500/30 shadow-[0_0_60px_rgba(34,211,238,0.3)]">
            
            {status === 'searching' && (
              <>
                {/* Animated search indicator */}
                <div className="relative w-24 h-24 mx-auto mb-6">
                  {/* Outer ring */}
                  <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full animate-ping" />
                  {/* Middle ring */}
                  <div className="absolute inset-2 border-4 border-cyan-400/50 rounded-full animate-pulse" />
                  {/* Inner spinning ring */}
                  <div className="absolute inset-4 border-4 border-transparent border-t-cyan-400 rounded-full animate-spin" />
                  {/* Center icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Search size={28} className="text-cyan-300" />
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-cyan-300 mb-2">
                  Finding Opponent...
                </h2>
                
                <p className="text-slate-400 mb-6">
                  Searching for players near your skill level
                </p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-white">{formatTime(searchTime)}</div>
                    <div className="text-xs text-slate-500">Search Time</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-white">{playersInQueue}</div>
                    <div className="text-xs text-slate-500">In Queue</div>
                  </div>
                </div>

                {/* Player info */}
                <div className="bg-slate-800/30 rounded-lg p-4 mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">
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
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-500 to-emerald-600 rounded-full">
                    <Zap size={36} className="text-white" />
                  </div>
                </div>

                <h2 className="text-3xl font-black text-green-400 mb-2">
                  MATCH FOUND!
                </h2>
                
                <p className="text-slate-400">
                  Preparing your game...
                </p>

                {/* Loading dots */}
                <div className="flex justify-center gap-2 mt-6">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Tips */}
          {status === 'searching' && (
            <div className="mt-6 text-slate-500 text-sm">
              <p>💡 Tip: Games typically match within 30 seconds during peak hours</p>
            </div>
          )}
        </div>
      </div>

      {/* Grid animation */}
      <style>{`
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(40px, 40px); }
        }
      `}</style>
    </div>
  );
};

export default MatchmakingScreen;
