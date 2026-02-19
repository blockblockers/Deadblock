// CreatorPuzzleSelect.jsx - Selection grid for hand-crafted creator puzzles
// v1.4: Compact grid, difficulty-themed cells, larger buttons, fits on screen
import { useState, useEffect } from 'react';
import { ArrowLeft, Check, Lock, Loader, Trophy } from 'lucide-react';
import NeonTitle from './NeonTitle';
import NeonSubtitle from './NeonSubtitle';
import { soundManager } from '../utils/soundManager';
import { useAuth } from '../contexts/AuthContext';
import FloatingPieces from './FloatingPieces';

// Supabase config
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Get auth token from localStorage
const getAuthToken = () => {
  try {
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

// Amber/Orange theme for creator puzzles
const theme = {
  gridColor: 'rgba(251, 191, 36, 0.2)',
  glow1: { color: 'bg-amber-500/30', pos: 'top-20 right-10' },
  glow2: { color: 'bg-orange-500/25', pos: 'bottom-32 left-10' },
  glow3: { color: 'bg-yellow-500/20', pos: 'top-1/2 left-1/4' },
  cardBg: 'bg-gradient-to-br from-slate-900/95 via-amber-950/20 to-slate-900/95',
  cardBorder: 'border-amber-500/30',
  cardShadow: 'shadow-[0_0_40px_rgba(251,191,36,0.15)]',
};

// Difficulty colors for individual cells
const difficultyColors = {
  easy: {
    bg: 'bg-green-500/20',
    border: 'border-green-500/50',
    text: 'text-green-400',
    dot: 'bg-green-400/60',
  },
  medium: {
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/50',
    text: 'text-amber-400',
    dot: 'bg-amber-400/60',
  },
  hard: {
    bg: 'bg-red-500/20',
    border: 'border-red-500/50',
    text: 'text-red-400',
    dot: 'bg-red-400/60',
  },
  expert: {
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/50',
    text: 'text-purple-400',
    dot: 'bg-purple-400/60',
  },
};

// Difficulty tiers with colors
const difficultyTiers = [
  { 
    id: 'easy', 
    label: 'BEG', 
    fullLabel: 'BEGINNER',
    range: [1, 25],
    color: {
      bg: 'bg-green-500/20',
      border: 'border-green-500/50',
      text: 'text-green-400',
      gradient: 'from-green-600 to-emerald-600',
      glow: 'rgba(34,197,94,0.6)',
    }
  },
  { 
    id: 'medium', 
    label: 'INT', 
    fullLabel: 'INTERMEDIATE',
    range: [26, 60],
    color: {
      bg: 'bg-amber-500/20',
      border: 'border-amber-500/50',
      text: 'text-amber-400',
      gradient: 'from-amber-500 to-orange-600',
      glow: 'rgba(251,191,36,0.6)',
    }
  },
  { 
    id: 'hard', 
    label: 'HRD', 
    fullLabel: 'HARD',
    range: [61, 85],
    color: {
      bg: 'bg-red-500/20',
      border: 'border-red-500/50',
      text: 'text-red-400',
      gradient: 'from-red-500 to-rose-600',
      glow: 'rgba(239,68,68,0.6)',
    }
  },
  { 
    id: 'expert', 
    label: 'EXP', 
    fullLabel: 'EXPERT',
    range: [86, 100],
    color: {
      bg: 'bg-purple-500/20',
      border: 'border-purple-500/50',
      text: 'text-purple-400',
      gradient: 'from-purple-500 to-pink-600',
      glow: 'rgba(168,85,247,0.6)',
    }
  },
];

const CreatorPuzzleSelect = ({ 
  onSelectPuzzle, 
  onBack,
}) => {
  const { profile } = useAuth();
  
  const [puzzles, setPuzzles] = useState([]);
  const [completedPuzzles, setCompletedPuzzles] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTier, setSelectedTier] = useState(difficultyTiers[0]);
  const [selectedPuzzle, setSelectedPuzzle] = useState(null);

  // Create puzzle slots map from actual puzzles
  const puzzleMap = {};
  puzzles.forEach(p => {
    puzzleMap[p.puzzle_number] = p;
  });

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
            }
          }
        );
        
        if (!puzzlesRes.ok) {
          throw new Error('Failed to fetch puzzles');
        }
        
        const puzzlesData = await puzzlesRes.json();
        setPuzzles(puzzlesData || []);
        
        // If user is logged in, fetch their completions with proper auth token
        if (profile?.id) {
          const authToken = getAuthToken();
          if (authToken) {
            const completionsRes = await fetch(
              `${SUPABASE_URL}/rest/v1/creator_puzzle_completions?user_id=eq.${profile.id}&select=puzzle_number`,
              {
                headers: {
                  'apikey': ANON_KEY,
                  'Authorization': `Bearer ${authToken}`,
                }
              }
            );
            
            if (completionsRes.ok) {
              const completionsData = await completionsRes.json();
              setCompletedPuzzles(new Set(completionsData.map(c => c.puzzle_number)));
            }
          }
        }
      } catch (err) {
        console.error('[CreatorPuzzleSelect] Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPuzzles();
  }, [profile?.id]);

  const handleSelectTier = (tier) => {
    soundManager.playClickSound('select');
    setSelectedTier(tier);
    setSelectedPuzzle(null);
  };

  const handleSelectPuzzle = (puzzleNumber) => {
    const puzzle = puzzleMap[puzzleNumber];
    if (!puzzle) {
      soundManager.playInvalid?.();
      return;
    }
    soundManager.playClickSound('select');
    setSelectedPuzzle(puzzle);
  };

  const handleStartPuzzle = () => {
    if (!selectedPuzzle) return;
    soundManager.playButtonClick();
    onSelectPuzzle?.(selectedPuzzle);
  };

  const handleBack = () => {
    soundManager.playButtonClick();
    if (selectedPuzzle) {
      setSelectedPuzzle(null);
    } else {
      onBack?.();
    }
  };

  // Get puzzle slots for current tier
  const [rangeStart, rangeEnd] = selectedTier.range;
  const currentSlots = [];
  for (let i = rangeStart; i <= rangeEnd; i++) {
    currentSlots.push(i);
  }

  // Stats
  const completedCount = completedPuzzles.size;
  const availableCount = puzzles.length;
  
  // Tier-specific stats
  const tierCompleted = currentSlots.filter(n => completedPuzzles.has(n)).length;
  const tierAvailable = currentSlots.filter(n => puzzleMap[n]).length;

  // Get colors for a puzzle based on its actual difficulty
  const getPuzzleColors = (puzzle) => {
    if (!puzzle) return null;
    return difficultyColors[puzzle.difficulty] || difficultyColors.medium;
  };

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden">
      {/* Themed Grid background */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            linear-gradient(to bottom, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.98)),
            repeating-linear-gradient(0deg, transparent, transparent 40px, ${theme.gridColor} 40px, ${theme.gridColor} 41px),
            repeating-linear-gradient(90deg, transparent, transparent 40px, ${theme.gridColor} 40px, ${theme.gridColor} 41px)
          `,
        }}
      />
      
      {/* Floating pieces background */}
      <FloatingPieces />

      {/* Animated glow orbs */}
      <div className={`fixed ${theme.glow1.pos} w-48 h-48 ${theme.glow1.color} rounded-full blur-3xl pointer-events-none animate-pulse`} style={{ animationDuration: '4s' }} />
      <div className={`fixed ${theme.glow2.pos} w-40 h-40 ${theme.glow2.color} rounded-full blur-3xl pointer-events-none animate-pulse`} style={{ animationDuration: '6s' }} />

      {/* Main Content - Scrollable if needed */}
      <div className="relative flex-1 flex flex-col overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="flex-1 flex flex-col items-center px-3 py-4">
          <div className="w-full max-w-sm">
            
            {/* Back Button - Compact */}
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-slate-400 hover:text-white mb-2 transition-colors text-sm"
            >
              <ArrowLeft size={16} />
              <span>{selectedPuzzle ? 'Back' : 'Back'}</span>
            </button>
            
            {/* Title - Compact */}
            <div className="text-center mb-3">
              <NeonTitle size="small" />
              <div className="flex items-center justify-center gap-2 mt-1">
                <Trophy size={14} className="text-amber-400" />
                <p className="text-amber-400/80 text-xs">
                  {completedCount}/{availableCount} completed
                </p>
              </div>
            </div>

            {/* Difficulty Tabs - Larger buttons */}
            <div className="grid grid-cols-4 gap-1.5 mb-3">
              {difficultyTiers.map(tier => {
                const isSelected = selectedTier.id === tier.id;
                const tierPuzzleCount = tier.range[1] - tier.range[0] + 1;
                const tierCompletedCount = Array.from({ length: tierPuzzleCount }, (_, i) => tier.range[0] + i)
                  .filter(n => completedPuzzles.has(n)).length;
                
                return (
                  <button
                    key={tier.id}
                    onClick={() => handleSelectTier(tier)}
                    className={`py-2.5 px-2 rounded-lg transition-all text-center ${
                      isSelected 
                        ? `bg-gradient-to-r ${tier.color.gradient} text-white shadow-lg` 
                        : `${tier.color.bg} ${tier.color.border} border hover:scale-105`
                    }`}
                    style={isSelected ? { boxShadow: `0 0 15px ${tier.color.glow}` } : {}}
                  >
                    <div className={`text-[10px] font-black tracking-wide ${isSelected ? 'text-white' : tier.color.text}`}>
                      {tier.label}
                    </div>
                    <div className={`text-[9px] mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                      {tierCompletedCount}/{tierPuzzleCount}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Card with puzzle grid */}
            <div className={`${theme.cardBg} backdrop-blur-md rounded-xl p-3 border ${theme.cardBorder} ${theme.cardShadow}`}>
              
              {/* Tier Header - Compact */}
              <div className="flex items-center justify-between mb-2">
                <h3 className={`text-sm font-bold ${selectedTier.color.text}`}>
                  {selectedTier.fullLabel} ({rangeStart}-{rangeEnd})
                </h3>
                <span className="text-slate-400 text-xs">
                  {tierCompleted}/{tierAvailable} ✓
                </span>
              </div>
              
              {/* Loading State */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader size={24} className="text-amber-400 animate-spin" />
                  <p className="text-slate-400 mt-2 text-sm">Loading...</p>
                </div>
              )}

              {/* Error State */}
              {error && !loading && (
                <div className="text-center py-6">
                  <p className="text-red-400 mb-3 text-sm">{error}</p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="px-3 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Puzzle Grid - Compact cells themed by difficulty */}
              {!loading && !error && (
                <div className="grid grid-cols-5 gap-1.5">
                  {currentSlots.map(puzzleNumber => {
                    const puzzle = puzzleMap[puzzleNumber];
                    const isAvailable = !!puzzle;
                    const isCompleted = completedPuzzles.has(puzzleNumber);
                    const isSelected = selectedPuzzle?.puzzle_number === puzzleNumber;
                    const colors = getPuzzleColors(puzzle) || selectedTier.color;
                    
                    return (
                      <button
                        key={puzzleNumber}
                        onClick={() => handleSelectPuzzle(puzzleNumber)}
                        disabled={!isAvailable}
                        className={`
                          w-full aspect-square rounded-lg flex flex-col items-center justify-center relative
                          transition-all duration-150 border
                          ${!isAvailable 
                            ? 'bg-slate-800/50 border-slate-700/30 cursor-not-allowed' 
                            : isCompleted
                              ? `${colors.bg} ${colors.border} hover:scale-105`
                              : `bg-slate-800/70 ${colors.border} border-opacity-30 hover:border-opacity-100 hover:scale-105`
                          }
                          ${isSelected ? 'ring-2 ring-amber-400 scale-105' : ''}
                        `}
                      >
                        {/* Puzzle number */}
                        <span className={`text-sm font-bold ${
                          !isAvailable 
                            ? 'text-slate-600' 
                            : isCompleted 
                              ? colors.text 
                              : 'text-slate-300'
                        }`}>
                          {puzzleNumber}
                        </span>
                        
                        {/* Status indicator */}
                        {!isAvailable ? (
                          <Lock size={8} className="text-slate-600 mt-0.5" />
                        ) : isCompleted ? (
                          <Check size={10} className={`${colors.text} mt-0.5`} />
                        ) : (
                          <div className={`w-1 h-1 rounded-full mt-0.5 ${colors.dot}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Puzzle Info - Compact */}
            {selectedPuzzle && (
              <div className="mt-3 p-3 rounded-xl bg-slate-900/90 border border-amber-500/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white">#{selectedPuzzle.puzzle_number}</span>
                      {selectedPuzzle.name && (
                        <span className="text-amber-400/80 text-sm truncate">{selectedPuzzle.name}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Completion badge */}
                  {completedPuzzles.has(selectedPuzzle.puzzle_number) && (
                    <Check size={16} className="text-green-400 flex-shrink-0" />
                  )}
                </div>
                
                <button
                  onClick={handleStartPuzzle}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-lg hover:from-amber-400 hover:to-orange-500 transition-all shadow-lg shadow-amber-500/30 active:scale-[0.98] text-sm"
                >
                  {completedPuzzles.has(selectedPuzzle.puzzle_number) ? 'PLAY AGAIN' : 'START PUZZLE'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorPuzzleSelect;
