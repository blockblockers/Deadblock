// CreatorPuzzleSelect.jsx - Selection grid for hand-crafted creator puzzles
// v1.4: Pagination (25 per page), arrow navigation, enhanced scrolling for all devices
import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, ArrowRight, Check, Lock, Loader, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import NeonTitle from './NeonTitle';
import NeonSubtitle from './NeonSubtitle';
import { soundManager } from '../utils/soundManager';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { useAuth } from '../contexts/AuthContext';
import FloatingPieces from './FloatingPieces';

// Supabase config
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Max puzzles per page in grid
const PUZZLES_PER_PAGE = 25;

// Difficulty tiers with puzzle number ranges
const DIFFICULTY_TIERS = {
  easy: { min: 1, max: 25, label: 'EASY', count: 25 },
  medium: { min: 26, max: 60, label: 'MEDIUM', count: 35 },
  hard: { min: 61, max: 85, label: 'HARD', count: 25 },
  expert: { min: 86, max: 100, label: 'EXPERT', count: 15 },
};

// Dramatically different themes for each difficulty
const themes = {
  easy: {
    gridColor: 'rgba(34,197,94,0.4)',
    glow1: { color: 'bg-green-500/40', pos: 'top-20 left-10' },
    glow2: { color: 'bg-emerald-400/30', pos: 'bottom-32 right-10' },
    glow3: { color: 'bg-lime-500/20', pos: 'top-1/2 left-1/2' },
    cardBg: 'bg-gradient-to-br from-slate-900/95 via-green-950/50 to-slate-900/95',
    cardBorder: 'border-green-500/50',
    cardShadow: 'shadow-[0_0_60px_rgba(34,197,94,0.4),inset_0_0_30px_rgba(34,197,94,0.1)]',
  },
  medium: {
    gridColor: 'rgba(34,211,238,0.4)',
    glow1: { color: 'bg-cyan-500/40', pos: 'top-10 right-20' },
    glow2: { color: 'bg-sky-500/35', pos: 'bottom-20 left-10' },
    glow3: { color: 'bg-teal-500/20', pos: 'top-1/3 left-1/3' },
    cardBg: 'bg-gradient-to-br from-slate-900/95 via-cyan-950/50 to-slate-900/95',
    cardBorder: 'border-cyan-500/50',
    cardShadow: 'shadow-[0_0_60px_rgba(34,211,238,0.4),inset_0_0_30px_rgba(34,211,238,0.1)]',
  },
  hard: {
    gridColor: 'rgba(239,68,68,0.4)',
    glow1: { color: 'bg-red-500/40', pos: 'top-16 left-20' },
    glow2: { color: 'bg-rose-500/35', pos: 'bottom-24 right-16' },
    glow3: { color: 'bg-orange-500/25', pos: 'top-2/3 right-1/3' },
    cardBg: 'bg-gradient-to-br from-slate-900/95 via-red-950/50 to-slate-900/95',
    cardBorder: 'border-red-500/50',
    cardShadow: 'shadow-[0_0_60px_rgba(239,68,68,0.4),inset_0_0_30px_rgba(239,68,68,0.1)]',
  },
  expert: {
    gridColor: 'rgba(236,72,153,0.4)',
    glow1: { color: 'bg-fuchsia-500/40', pos: 'top-10 left-20' },
    glow2: { color: 'bg-pink-500/35', pos: 'bottom-24 right-10' },
    glow3: { color: 'bg-purple-500/20', pos: 'top-1/2 right-1/3' },
    cardBg: 'bg-gradient-to-br from-slate-900/95 via-fuchsia-950/50 to-slate-900/95',
    cardBorder: 'border-fuchsia-500/50',
    cardShadow: 'shadow-[0_0_60px_rgba(236,72,153,0.4),inset_0_0_30px_rgba(236,72,153,0.1)]',
  },
};

// Difficulty button colors
const difficultyColors = {
  easy: {
    gradient: 'from-green-600 to-emerald-600',
    glow: 'rgba(34,197,94,0.6)',
    text: 'text-green-300',
    bg: 'bg-green-900/30',
    border: 'border-green-500/40',
    buttonBg: 'bg-green-500/20',
    buttonBorder: 'border-green-500/50',
    buttonText: 'text-green-400',
  },
  medium: {
    gradient: 'from-cyan-500 to-sky-600',
    glow: 'rgba(34,211,238,0.6)',
    text: 'text-cyan-300',
    bg: 'bg-cyan-900/30',
    border: 'border-cyan-500/40',
    buttonBg: 'bg-cyan-500/20',
    buttonBorder: 'border-cyan-500/50',
    buttonText: 'text-cyan-400',
  },
  hard: {
    gradient: 'from-red-500 to-rose-600',
    glow: 'rgba(239,68,68,0.6)',
    text: 'text-red-300',
    bg: 'bg-red-900/30',
    border: 'border-red-500/40',
    buttonBg: 'bg-red-500/20',
    buttonBorder: 'border-red-500/50',
    buttonText: 'text-red-400',
  },
  expert: {
    gradient: 'from-fuchsia-500 to-pink-600',
    glow: 'rgba(236,72,153,0.6)',
    text: 'text-fuchsia-300',
    bg: 'bg-fuchsia-900/30',
    border: 'border-fuchsia-500/40',
    buttonBg: 'bg-fuchsia-500/20',
    buttonBorder: 'border-fuchsia-500/50',
    buttonText: 'text-fuchsia-400',
  },
};

const CreatorPuzzleSelect = ({ 
  onSelectPuzzle, 
  onBack,
}) => {
  const { needsScroll } = useResponsiveLayout(700);
  const { profile } = useAuth();
  const scrollContainerRef = useRef(null);
  
  const [puzzles, setPuzzles] = useState([]);
  const [completedPuzzles, setCompletedPuzzles] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState('easy');
  const [selectedPuzzle, setSelectedPuzzle] = useState(null);
  const [currentPage, setCurrentPage] = useState(0); // Page index within difficulty

  // Get current theme
  const theme = themes[selectedDifficulty];
  const colors = difficultyColors[selectedDifficulty];
  const tier = DIFFICULTY_TIERS[selectedDifficulty];

  // Create puzzle slots map from actual puzzles
  const puzzleMap = {};
  puzzles.forEach(p => {
    puzzleMap[p.puzzle_number] = p;
  });

  // Fetch puzzles and completion status
  const fetchPuzzlesAndCompletions = useCallback(async () => {
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
      
      // If user is logged in, fetch their completions
      if (profile?.id) {
        const completionsRes = await fetch(
          `${SUPABASE_URL}/rest/v1/creator_puzzle_completions?user_id=eq.${profile.id}&select=puzzle_number`,
          {
            headers: {
              'apikey': ANON_KEY,
              'Authorization': `Bearer ${ANON_KEY}`,
            }
          }
        );
        
        if (completionsRes.ok) {
          const completionsData = await completionsRes.json();
          setCompletedPuzzles(new Set(completionsData.map(c => c.puzzle_number)));
        }
      } else {
        // For non-logged-in users, check localStorage
        try {
          const localCompletions = JSON.parse(localStorage.getItem('creator_puzzle_completions') || '[]');
          setCompletedPuzzles(new Set(localCompletions));
        } catch {
          setCompletedPuzzles(new Set());
        }
      }
    } catch (err) {
      console.error('[CreatorPuzzleSelect] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchPuzzlesAndCompletions();
  }, [fetchPuzzlesAndCompletions]);

  // Get all puzzle numbers for current difficulty tier
  const allTierSlots = [];
  for (let i = tier.min; i <= tier.max; i++) {
    allTierSlots.push(i);
  }

  // Calculate pagination
  const totalPages = Math.ceil(allTierSlots.length / PUZZLES_PER_PAGE);
  const startIdx = currentPage * PUZZLES_PER_PAGE;
  const currentSlots = allTierSlots.slice(startIdx, startIdx + PUZZLES_PER_PAGE);

  // Calculate completion stats for entire tier
  const tierCompletedCount = allTierSlots.filter(n => completedPuzzles.has(n)).length;
  const tierAvailableCount = allTierSlots.filter(n => puzzleMap[n]).length;

  // Reset page when difficulty changes
  useEffect(() => {
    setCurrentPage(0);
    setSelectedPuzzle(null);
  }, [selectedDifficulty]);

  const handleSelectDifficulty = (diffId) => {
    soundManager.playClickSound('select');
    setSelectedDifficulty(diffId);
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
    onBack?.();
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      soundManager.playClickSound('select');
      setCurrentPage(prev => prev - 1);
      setSelectedPuzzle(null);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      soundManager.playClickSound('select');
      setCurrentPage(prev => prev + 1);
      setSelectedPuzzle(null);
    }
  };

  // Total completion stats
  const totalCompleted = completedPuzzles.size;
  const totalAvailable = puzzles.length;

  // Page range display
  const pageStartNum = currentSlots[0] || tier.min;
  const pageEndNum = currentSlots[currentSlots.length - 1] || tier.max;

  return (
    <div 
      ref={scrollContainerRef}
      className="min-h-screen bg-slate-950 overflow-y-auto overflow-x-hidden"
      style={{ 
        WebkitOverflowScrolling: 'touch', 
        touchAction: 'pan-y',
        overscrollBehavior: 'contain',
      }}
    >
      {/* Themed Grid background */}
      <div 
        className="fixed inset-0 opacity-40 pointer-events-none transition-all duration-700"
        style={{
          backgroundImage: `linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Floating pieces background */}
      <FloatingPieces />

      {/* Animated glow orbs */}
      <div className={`fixed ${theme.glow1.pos} w-72 h-72 ${theme.glow1.color} rounded-full blur-3xl pointer-events-none transition-all duration-700`} />
      <div className={`fixed ${theme.glow2.pos} w-64 h-64 ${theme.glow2.color} rounded-full blur-3xl pointer-events-none transition-all duration-700`} />
      <div className={`fixed ${theme.glow3.pos} w-56 h-56 ${theme.glow3.color} rounded-full blur-3xl pointer-events-none transition-all duration-700`} />

      {/* Main Content */}
      <div className="relative min-h-screen flex flex-col items-center px-3 sm:px-4 py-3 sm:py-4">
        <div className="w-full max-w-md">
          
          {/* Title - Compact */}
          <div className="text-center mb-2 sm:mb-3">
            <NeonTitle size="medium" />
            <NeonSubtitle text="CREATOR PUZZLES" size="small" className="mt-0.5" />
            <p className={`${colors.text} text-[10px] sm:text-xs mt-0.5`}>
              {totalCompleted} / {totalAvailable} completed
            </p>
          </div>

          {/* Card with theme */}
          <div className={`${theme.cardBg} backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border ${theme.cardBorder} ${theme.cardShadow} transition-all duration-700`}>
            
            {/* Difficulty Tab Selector */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-2.5 sm:mb-3">
              {Object.entries(DIFFICULTY_TIERS).map(([diffId, diffTier]) => {
                const isSelected = selectedDifficulty === diffId;
                const diffColors = difficultyColors[diffId];
                const diffCompletedCount = Array.from({ length: diffTier.max - diffTier.min + 1 }, (_, i) => diffTier.min + i)
                  .filter(n => completedPuzzles.has(n)).length;
                const diffAvailableCount = Array.from({ length: diffTier.max - diffTier.min + 1 }, (_, i) => diffTier.min + i)
                  .filter(n => puzzleMap[n]).length;
                
                return (
                  <button
                    key={diffId}
                    onClick={() => handleSelectDifficulty(diffId)}
                    className={`py-2 sm:py-2.5 px-1.5 rounded-lg transition-all text-center ${
                      isSelected 
                        ? `bg-gradient-to-r ${diffColors.gradient} text-white shadow-lg` 
                        : `${diffColors.bg} ${diffColors.border} border hover:scale-[1.02] active:scale-[0.98]`
                    }`}
                    style={isSelected ? { boxShadow: `0 0 20px ${diffColors.glow}` } : {}}
                  >
                    <div className={`text-[10px] sm:text-xs font-black tracking-wide ${isSelected ? 'text-white' : diffColors.text}`}>
                      {diffTier.label}
                    </div>
                    <div className={`text-[9px] sm:text-[10px] ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                      {diffCompletedCount}/{diffAvailableCount}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader size={28} className={`${colors.buttonText} animate-spin`} />
                <p className="text-slate-400 mt-2 text-sm">Loading puzzles...</p>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="text-center py-6">
                <p className="text-red-400 mb-3 text-sm">{error}</p>
                <button 
                  onClick={() => fetchPuzzlesAndCompletions()}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Puzzle Grid with Pagination */}
            {!loading && !error && (
              <>
                {/* Page Navigation Header */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={handlePrevPage}
                      disabled={currentPage === 0}
                      className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${
                        currentPage === 0
                          ? 'bg-slate-800/30 text-slate-600 cursor-not-allowed'
                          : `${colors.buttonBg} ${colors.buttonText} border ${colors.buttonBorder} hover:scale-105 active:scale-95`
                      }`}
                    >
                      <ChevronLeft size={16} />
                      <span className="text-[10px] font-bold hidden sm:inline">PREV</span>
                    </button>
                    
                    <div className="text-center">
                      <span className={`${colors.text} text-[10px] sm:text-xs font-bold`}>
                        {pageStartNum} - {pageEndNum}
                      </span>
                      <div className="flex items-center justify-center gap-1 mt-0.5">
                        {Array.from({ length: totalPages }).map((_, idx) => (
                          <div
                            key={idx}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${
                              idx === currentPage 
                                ? `${colors.buttonText.replace('text-', 'bg-')}` 
                                : 'bg-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage >= totalPages - 1}
                      className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${
                        currentPage >= totalPages - 1
                          ? 'bg-slate-800/30 text-slate-600 cursor-not-allowed'
                          : `${colors.buttonBg} ${colors.buttonText} border ${colors.buttonBorder} hover:scale-105 active:scale-95`
                      }`}
                    >
                      <span className="text-[10px] font-bold hidden sm:inline">NEXT</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}

                {/* Puzzle Grid - 5 columns */}
                <div className="grid grid-cols-5 gap-1 sm:gap-1.5 mb-2">
                  {currentSlots.map(puzzleNumber => {
                    const puzzle = puzzleMap[puzzleNumber];
                    const isAvailable = !!puzzle;
                    const isCompleted = completedPuzzles.has(puzzleNumber);
                    const isSelected = selectedPuzzle?.puzzle_number === puzzleNumber;
                    
                    return (
                      <button
                        key={puzzleNumber}
                        onClick={() => handleSelectPuzzle(puzzleNumber)}
                        disabled={!isAvailable}
                        className={`
                          aspect-square rounded-lg flex items-center justify-center
                          font-bold text-[10px] sm:text-xs transition-all relative overflow-hidden
                          ${!isAvailable
                            ? 'bg-slate-800/30 text-slate-600 border border-slate-700/30 cursor-not-allowed'
                            : isSelected 
                              ? `bg-gradient-to-br ${colors.gradient} text-white scale-105 shadow-lg` 
                              : isCompleted
                                ? `${colors.bg} ${colors.buttonText} border ${colors.buttonBorder}`
                                : `${colors.buttonBg} ${colors.buttonText} border ${colors.buttonBorder} hover:scale-105 active:scale-95`
                          }
                        `}
                        style={isSelected ? { boxShadow: `0 0 15px ${colors.glow}` } : {}}
                      >
                        {!isAvailable ? (
                          <Lock size={10} className="text-slate-600" />
                        ) : isCompleted && !isSelected ? (
                          <div className="relative">
                            <span className="opacity-50">{puzzleNumber}</span>
                            <Check size={8} className={`absolute -top-0.5 -right-0.5 ${colors.buttonText}`} />
                          </div>
                        ) : (
                          puzzleNumber
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Tier Progress */}
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <Sparkles size={10} className={colors.buttonText} />
                  <span className="text-slate-400 text-[10px] sm:text-xs">
                    {DIFFICULTY_TIERS[selectedDifficulty].label}: {tierCompletedCount}/{tierAvailableCount}
                  </span>
                </div>

                {/* Selected Puzzle Info - Compact */}
                {selectedPuzzle && (
                  <div className={`mb-2 p-2 ${colors.bg} rounded-xl border ${colors.border}`}>
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className="text-white font-bold text-xs sm:text-sm">#{selectedPuzzle.puzzle_number}</h3>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] font-bold uppercase ${colors.buttonBg} ${colors.buttonText}`}>
                        {selectedPuzzle.difficulty || selectedDifficulty}
                      </span>
                    </div>
                    {selectedPuzzle.name && (
                      <p className={`${colors.text} text-[10px] sm:text-xs font-medium`}>{selectedPuzzle.name}</p>
                    )}
                    {selectedPuzzle.description && (
                      <p className="text-slate-400 text-[9px] sm:text-[10px] mt-0.5 line-clamp-2">{selectedPuzzle.description}</p>
                    )}
                  </div>
                )}

                {/* Start Button */}
                <button 
                  onClick={handleStartPuzzle}
                  disabled={!selectedPuzzle}
                  className={`w-full p-2 sm:p-2.5 rounded-xl font-black tracking-wider text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                    selectedPuzzle
                      ? `bg-gradient-to-r ${colors.gradient} text-white hover:scale-[1.02] active:scale-[0.98]`
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                  style={selectedPuzzle ? { boxShadow: `0 0 25px ${colors.glow}` } : {}}
                >
                  {selectedPuzzle ? `START PUZZLE #${selectedPuzzle.puzzle_number}` : 'SELECT A PUZZLE'}
                </button>
              </>
            )}
            
            {/* Back button - Same size as Start button */}
            <button 
              onClick={handleBack}
              className="w-full mt-2 p-2 sm:p-2.5 rounded-xl font-black tracking-wider text-xs sm:text-sm text-slate-300 bg-slate-800/70 hover:bg-slate-700/70 transition-all border border-slate-600/50 hover:border-slate-500/50 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <ArrowLeft size={14} />
              BACK TO MENU
            </button>
          </div>
        </div>
        
        {/* Bottom safe area for iOS */}
        <div className="flex-shrink-0" style={{ height: 'max(16px, env(safe-area-inset-bottom))' }} />
      </div>
    </div>
  );
};

export default CreatorPuzzleSelect;
