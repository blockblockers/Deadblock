// CreatorPuzzleSelect.jsx - Selection grid for hand-crafted creator puzzles
// v1.2: Fixed difficulty colors - Easy=green, Medium=amber, Hard=red, Expert=purple
// v1.1: Fixed auth token for completions fetch (was using ANON_KEY instead of user token)
import { useState, useEffect } from 'react';
import { ArrowLeft, Check, Lock, Trophy, Sparkles, Loader, ChevronLeft, ChevronRight } from 'lucide-react';
import NeonTitle from './NeonTitle';
import { soundManager } from '../utils/soundManager';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { useAuth } from '../contexts/AuthContext';
import FloatingPieces from './FloatingPieces';

// Supabase config
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Get auth token from localStorage - tries multiple possible key formats
const getAuthToken = () => {
  try {
    // Try the standard Supabase auth key patterns
    const possibleKeys = [
      `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`,
      'supabase.auth.token',
      'sb-auth-token'
    ];
    
    for (const key of possibleKeys) {
      const authData = JSON.parse(localStorage.getItem(key) || 'null');
      if (authData?.access_token) {
        return authData.access_token;
      }
    }
    
    // Fallback: search for any Supabase auth key
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('auth-token')) {
        const authData = JSON.parse(localStorage.getItem(key) || 'null');
        if (authData?.access_token) {
          return authData.access_token;
        }
      }
    }
    
    return null;
  } catch {
    return null;
  }
};

// Theme - warm amber/gold for creator puzzles
const theme = {
  gridColor: 'rgba(251, 191, 36, 0.2)',
  glow1: { color: 'bg-amber-500/30', pos: 'top-20 right-10' },
  glow2: { color: 'bg-orange-500/25', pos: 'bottom-32 left-10' },
  glow3: { color: 'bg-yellow-500/20', pos: 'top-1/2 left-1/4' },
};

// Difficulty colors
const difficultyColors = {
  easy: {
    bg: 'bg-green-500/20',
    border: 'border-green-500/50',
    text: 'text-green-400',
    glow: 'shadow-green-500/30',
    gradient: 'from-green-600 to-emerald-600',
  },
  medium: {
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/50',
    text: 'text-amber-400',
    glow: 'shadow-amber-500/30',
    gradient: 'from-amber-500 to-orange-600',
  },
  hard: {
    bg: 'bg-red-500/20',
    border: 'border-red-500/50',
    text: 'text-red-400',
    glow: 'shadow-red-500/30',
    gradient: 'from-red-500 to-rose-600',
  },
  expert: {
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/50',
    text: 'text-purple-400',
    glow: 'shadow-purple-500/30',
    gradient: 'from-purple-500 to-pink-600',
  },
};

// Puzzles per page for pagination
const PUZZLES_PER_PAGE = 25;

const CreatorPuzzleSelect = ({ 
  onSelectPuzzle, 
  onBack,
}) => {
  const { needsScroll } = useResponsiveLayout(800);
  const { profile } = useAuth();
  
  const [puzzles, setPuzzles] = useState([]);
  const [completedPuzzles, setCompletedPuzzles] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedPuzzle, setSelectedPuzzle] = useState(null);

  // Fetch puzzles and completion status
  useEffect(() => {
    const fetchPuzzles = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch all active creator puzzles
        const puzzlesRes = await fetch(
          `${SUPABASE_URL}/rest/v1/creator_puzzles?is_active=eq.true&order=puzzle_number.asc`,
          {
            headers: {
              'apikey': ANON_KEY,
              'Authorization': `Bearer ${ANON_KEY}`,
            },
          }
        );
        
        if (!puzzlesRes.ok) throw new Error('Failed to fetch puzzles');
        const puzzlesData = await puzzlesRes.json();
        setPuzzles(puzzlesData);

        // Fetch user's completions if logged in - USE USER'S AUTH TOKEN
        if (profile?.id) {
          const authToken = getAuthToken();
          if (authToken) {
            console.log('[CreatorPuzzleSelect] Fetching completions for user:', profile.id);
            const completionsRes = await fetch(
              `${SUPABASE_URL}/rest/v1/creator_puzzle_completions?user_id=eq.${profile.id}&select=puzzle_number`,
              {
                headers: {
                  'apikey': ANON_KEY,
                  'Authorization': `Bearer ${authToken}`,  // Use user's token, not ANON_KEY
                },
              }
            );
            
            if (completionsRes.ok) {
              const completionsData = await completionsRes.json();
              console.log('[CreatorPuzzleSelect] Loaded completions:', completionsData.length);
              setCompletedPuzzles(new Set(completionsData.map(c => c.puzzle_number)));
            } else {
              console.warn('[CreatorPuzzleSelect] Failed to fetch completions:', completionsRes.status);
            }
          } else {
            console.warn('[CreatorPuzzleSelect] No auth token available');
          }
        }
      } catch (err) {
        console.error('Error fetching creator puzzles:', err);
        setError('Failed to load puzzles. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPuzzles();
  }, [profile?.id]);

  // Calculate total pages
  const totalPuzzles = puzzles.length || 100;
  const totalPages = Math.ceil(totalPuzzles / PUZZLES_PER_PAGE);

  // Get puzzles for current page
  const getCurrentPagePuzzles = () => {
    const startNum = currentPage * PUZZLES_PER_PAGE + 1;
    const endNum = Math.min(startNum + PUZZLES_PER_PAGE - 1, 100);
    
    const pageItems = [];
    for (let num = startNum; num <= endNum; num++) {
      const puzzle = puzzles.find(p => p.puzzle_number === num);
      pageItems.push({
        number: num,
        puzzle: puzzle || null,
        isCompleted: completedPuzzles.has(num),
        isLocked: !puzzle,
      });
    }
    return pageItems;
  };

  const handleSelectPuzzle = (item) => {
    if (item.isLocked) {
      soundManager.playClickSound?.('error');
      return;
    }
    soundManager.playButtonClick();
    setSelectedPuzzle(item);
  };

  const handleStartPuzzle = () => {
    if (!selectedPuzzle?.puzzle) return;
    soundManager.playButtonClick();
    onSelectPuzzle?.(selectedPuzzle.puzzle);
  };

  const handleBack = () => {
    soundManager.playButtonClick();
    if (selectedPuzzle) {
      setSelectedPuzzle(null);
    } else {
      onBack?.();
    }
  };

  const handlePageChange = (direction) => {
    soundManager.playClickSound?.('click');
    if (direction === 'prev' && currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    } else if (direction === 'next' && currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
    }
  };

  // Get difficulty tier info
  const getDifficultyTier = (puzzleNumber) => {
    if (puzzleNumber <= 25) return 'easy';
    if (puzzleNumber <= 60) return 'medium';
    if (puzzleNumber <= 85) return 'hard';
    return 'expert';
  };

  const getPageDifficulty = () => {
    const startNum = currentPage * PUZZLES_PER_PAGE + 1;
    return getDifficultyTier(startNum);
  };

  const pageColors = difficultyColors[getPageDifficulty()];

  // Calculate completion stats
  const totalCompleted = completedPuzzles.size;
  const totalAvailable = puzzles.length;
  const completionPercent = totalAvailable > 0 ? Math.round((totalCompleted / totalAvailable) * 100) : 0;

  return (
    <div className={`${needsScroll ? 'min-h-screen' : 'h-screen'} bg-slate-950 text-white flex flex-col overflow-hidden`}>
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <FloatingPieces />
        <div className={`absolute ${theme.glow1.pos} w-64 h-64 ${theme.glow1.color} rounded-full blur-3xl`} />
        <div className={`absolute ${theme.glow2.pos} w-48 h-48 ${theme.glow2.color} rounded-full blur-3xl`} />
        <div className={`absolute ${theme.glow3.pos} w-32 h-32 ${theme.glow3.color} rounded-full blur-2xl`} />
      </div>

      {/* Header */}
      <div className="relative z-10 flex-shrink-0 px-4 pt-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back</span>
          </button>
          
          {/* Completion stats */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <Trophy size={14} className="text-amber-400" />
            <span className="text-sm text-slate-300">
              {totalCompleted}/{totalAvailable}
            </span>
            <span className="text-xs text-slate-500">({completionPercent}%)</span>
          </div>
        </div>

        <div className="text-center mb-4">
          <NeonTitle size="medium" />
          <p className="text-amber-400/80 text-sm font-medium mt-1">
            <Sparkles size={14} className="inline mr-1" />
            Creator Puzzles
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col px-4 overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader className="w-8 h-8 text-amber-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-6 bg-red-900/20 rounded-xl border border-red-500/30">
              <p className="text-red-400">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-3 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Page Navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => handlePageChange('prev')}
                disabled={currentPage === 0}
                className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 disabled:opacity-30 hover:bg-slate-700/50 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="text-center">
                <span className={`text-sm font-bold ${pageColors.text}`}>
                  {getPageDifficulty().toUpperCase()}
                </span>
                <span className="text-slate-500 text-xs ml-2">
                  ({currentPage * PUZZLES_PER_PAGE + 1}-{Math.min((currentPage + 1) * PUZZLES_PER_PAGE, 100)})
                </span>
              </div>
              
              <button
                onClick={() => handlePageChange('next')}
                disabled={currentPage >= totalPages - 1}
                className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 disabled:opacity-30 hover:bg-slate-700/50 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Puzzle Grid */}
            <div className="flex-1 overflow-auto pb-4">
              <div className="grid grid-cols-5 gap-2">
                {getCurrentPagePuzzles().map((item) => {
                  const difficulty = getDifficultyTier(item.number);
                  const colors = difficultyColors[difficulty];
                  
                  return (
                    <button
                      key={item.number}
                      onClick={() => handleSelectPuzzle(item)}
                      disabled={item.isLocked}
                      className={`
                        aspect-square rounded-xl flex flex-col items-center justify-center
                        transition-all duration-200 relative
                        ${item.isLocked 
                          ? 'bg-slate-800/30 border border-slate-700/30 cursor-not-allowed' 
                          : item.isCompleted
                            ? `${colors.bg} border-2 ${colors.border} shadow-lg ${colors.glow}`
                            : `bg-slate-800/50 border border-slate-700/50 hover:${colors.bg} hover:border-${difficulty}-500/50 hover:scale-105`
                        }
                        ${selectedPuzzle?.number === item.number ? 'ring-2 ring-amber-400 scale-105' : ''}
                      `}
                    >
                      {item.isLocked ? (
                        <Lock size={16} className="text-slate-600" />
                      ) : (
                        <>
                          <span className={`text-lg font-bold ${item.isCompleted ? colors.text : 'text-white'}`}>
                            {item.number}
                          </span>
                          {item.isCompleted && (
                            <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r ${colors.gradient} flex items-center justify-center shadow-lg`}>
                              <Check size={12} className="text-white" />
                            </div>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Selected Puzzle Info */}
        {selectedPuzzle && selectedPuzzle.puzzle && (
          <div className="flex-shrink-0 p-4 bg-slate-900/80 rounded-xl border border-amber-500/30 mb-4 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-amber-400">#{selectedPuzzle.number}</span>
                  {selectedPuzzle.puzzle.name}
                </h3>
                <p className="text-sm text-slate-400">{selectedPuzzle.puzzle.description}</p>
              </div>
              <div className={`px-3 py-1 rounded-lg bg-gradient-to-r ${difficultyColors[getDifficultyTier(selectedPuzzle.number)].gradient}`}>
                <span className="text-white text-xs font-bold uppercase">
                  {getDifficultyTier(selectedPuzzle.number)}
                </span>
              </div>
            </div>
            
            <button
              onClick={handleStartPuzzle}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl hover:from-amber-400 hover:to-orange-500 transition-all shadow-lg shadow-amber-500/30 active:scale-[0.98]"
            >
              {selectedPuzzle.isCompleted ? 'PLAY AGAIN' : 'START PUZZLE'}
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && puzzles.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-6 bg-slate-900/50 rounded-2xl border border-slate-700/50">
              <Sparkles size={48} className="text-amber-400/50 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Coming Soon!</h3>
              <p className="text-slate-400 text-sm">
                Creator puzzles are being crafted.<br />
                Check back soon!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Safe area padding */}
      <div className="flex-shrink-0" style={{ height: 'max(16px, env(safe-area-inset-bottom))' }} />
    </div>
  );
};

export default CreatorPuzzleSelect;
