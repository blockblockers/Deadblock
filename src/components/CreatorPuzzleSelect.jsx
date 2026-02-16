// CreatorPuzzleSelect.jsx - Selection grid for hand-crafted creator puzzles
// v1.0: Initial release - 100 puzzle grid with completion tracking
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
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/50',
    text: 'text-purple-400',
    glow: 'shadow-purple-500/30',
    gradient: 'from-purple-500 to-pink-600',
  },
  expert: {
    bg: 'bg-red-500/20',
    border: 'border-red-500/50',
    text: 'text-red-400',
    glow: 'shadow-red-500/30',
    gradient: 'from-red-500 to-rose-600',
  },
};

// Puzzles per page for pagination
const PUZZLES_PER_PAGE = 20;

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

        // Fetch user's completions if logged in
        if (profile?.id) {
          const completionsRes = await fetch(
            `${SUPABASE_URL}/rest/v1/creator_puzzle_completions?user_id=eq.${profile.id}&select=puzzle_number`,
            {
              headers: {
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${ANON_KEY}`,
              },
            }
          );
          
          if (completionsRes.ok) {
            const completionsData = await completionsRes.json();
            setCompletedPuzzles(new Set(completionsData.map(c => c.puzzle_number)));
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
  const totalPuzzles = puzzles.length || 100; // Show 100 slots even if not all puzzles exist yet
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
        isLocked: !puzzle, // Lock if puzzle doesn't exist yet
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
    soundManager.playClickSound?.('select');
    if (direction === 'prev' && currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    } else if (direction === 'next' && currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
    }
  };

  // Stats
  const completedCount = completedPuzzles.size;
  const availableCount = puzzles.length;
  const completionPercent = availableCount > 0 ? Math.round((completedCount / availableCount) * 100) : 0;

  return (
    <div 
      className={`min-h-screen flex flex-col ${needsScroll ? 'overflow-y-auto' : 'overflow-hidden'}`}
      style={{
        background: `
          linear-gradient(to bottom, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.98)),
          repeating-linear-gradient(0deg, transparent, transparent 40px, ${theme.gridColor} 40px, ${theme.gridColor} 41px),
          repeating-linear-gradient(90deg, transparent, transparent 40px, ${theme.gridColor} 40px, ${theme.gridColor} 41px)
        `,
        minHeight: '100vh',
        minHeight: '100dvh',
      }}
    >
      {/* Floating pieces background */}
      <FloatingPieces />

      {/* Animated glow orbs */}
      <div className={`fixed ${theme.glow1.pos} w-72 h-72 ${theme.glow1.color} rounded-full blur-3xl pointer-events-none animate-pulse`} style={{ animationDuration: '4s' }} />
      <div className={`fixed ${theme.glow2.pos} w-64 h-64 ${theme.glow2.color} rounded-full blur-3xl pointer-events-none animate-pulse`} style={{ animationDuration: '6s' }} />
      <div className={`fixed ${theme.glow3.pos} w-56 h-56 ${theme.glow3.color} rounded-full blur-3xl pointer-events-none animate-pulse`} style={{ animationDuration: '5s' }} />

      {/* Safe area top padding */}
      <div className="flex-shrink-0" style={{ height: 'env(safe-area-inset-top)' }} />

      {/* Header */}
      <div className="relative z-10 px-4 pt-4 pb-2 flex items-center justify-between flex-shrink-0">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Back</span>
        </button>

        {/* Stats badge */}
        {!loading && availableCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 rounded-full border border-amber-500/30">
            <Trophy size={14} className="text-amber-400" />
            <span className="text-amber-300 text-sm font-bold">{completedCount}/{availableCount}</span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center px-4 py-4 relative z-10">
        {/* Title */}
        <div className="mb-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Sparkles size={24} className="text-amber-400" />
            <h1 className="text-2xl font-black text-white tracking-wider">CREATOR PUZZLES</h1>
          </div>
          <p className="text-slate-400 text-sm">Hand-crafted challenges with one true solution</p>
        </div>

        {/* Progress bar */}
        {!loading && availableCount > 0 && (
          <div className="w-full max-w-md mb-6">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500">Overall Progress</span>
              <span className="text-amber-400 font-bold">{completionPercent}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader size={40} className="animate-spin text-amber-400 mx-auto mb-3" />
              <p className="text-slate-400">Loading puzzles...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-red-400">
              <p>{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Puzzle Grid */}
        {!loading && !error && (
          <>
            {/* Page indicator */}
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => handlePageChange('prev')}
                disabled={currentPage === 0}
                className={`p-2 rounded-lg transition-all ${
                  currentPage === 0 
                    ? 'text-slate-600 cursor-not-allowed' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <ChevronLeft size={24} />
              </button>
              
              <div className="text-slate-400 text-sm font-medium">
                {currentPage * PUZZLES_PER_PAGE + 1}-{Math.min((currentPage + 1) * PUZZLES_PER_PAGE, 100)} of 100
              </div>
              
              <button
                onClick={() => handlePageChange('next')}
                disabled={currentPage >= totalPages - 1}
                className={`p-2 rounded-lg transition-all ${
                  currentPage >= totalPages - 1 
                    ? 'text-slate-600 cursor-not-allowed' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <ChevronRight size={24} />
              </button>
            </div>

            {/* Grid */}
            <div className="w-full max-w-md">
              <div className="grid grid-cols-5 gap-2">
                {getCurrentPagePuzzles().map((item) => {
                  const difficulty = item.puzzle?.difficulty || 'medium';
                  const colors = difficultyColors[difficulty] || difficultyColors.medium;
                  
                  return (
                    <button
                      key={item.number}
                      onClick={() => handleSelectPuzzle(item)}
                      disabled={item.isLocked}
                      className={`
                        aspect-square rounded-xl flex flex-col items-center justify-center relative
                        transition-all duration-200 border-2
                        ${item.isLocked 
                          ? 'bg-slate-800/50 border-slate-700/50 cursor-not-allowed' 
                          : item.isCompleted
                            ? `${colors.bg} ${colors.border} hover:scale-105`
                            : `bg-slate-800/80 border-slate-600/50 hover:border-amber-500/50 hover:scale-105 hover:bg-slate-700/80`
                        }
                        ${selectedPuzzle?.number === item.number ? 'ring-2 ring-amber-400 scale-105' : ''}
                      `}
                    >
                      {/* Puzzle number */}
                      <span className={`text-lg font-bold ${
                        item.isLocked 
                          ? 'text-slate-600' 
                          : item.isCompleted 
                            ? colors.text 
                            : 'text-white'
                      }`}>
                        {item.number}
                      </span>
                      
                      {/* Status indicator */}
                      {item.isLocked ? (
                        <Lock size={12} className="text-slate-600 mt-0.5" />
                      ) : item.isCompleted ? (
                        <Check size={14} className={`${colors.text} mt-0.5`} />
                      ) : (
                        <div className={`w-1.5 h-1.5 rounded-full mt-1 ${
                          item.puzzle ? 'bg-amber-400/60' : 'bg-slate-600'
                        }`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Page dots */}
            <div className="flex items-center gap-2 mt-4">
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    soundManager.playClickSound?.('select');
                    setCurrentPage(idx);
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentPage 
                      ? 'bg-amber-400 w-4' 
                      : 'bg-slate-600 hover:bg-slate-500'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Selected Puzzle Info */}
        {selectedPuzzle && selectedPuzzle.puzzle && (
          <div className="w-full max-w-md mt-6 p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Puzzle #{selectedPuzzle.number}
                </h3>
                {selectedPuzzle.puzzle.name && (
                  <p className="text-slate-400 text-sm">{selectedPuzzle.puzzle.name}</p>
                )}
              </div>
              
              {/* Difficulty badge */}
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                difficultyColors[selectedPuzzle.puzzle.difficulty]?.bg || 'bg-slate-700'
              } ${difficultyColors[selectedPuzzle.puzzle.difficulty]?.text || 'text-slate-300'}`}>
                {selectedPuzzle.puzzle.difficulty || 'Medium'}
              </span>
            </div>
            
            {selectedPuzzle.puzzle.description && (
              <p className="text-slate-400 text-sm mb-4">{selectedPuzzle.puzzle.description}</p>
            )}
            
            {/* Completion status */}
            {selectedPuzzle.isCompleted && (
              <div className="flex items-center gap-2 mb-4 text-green-400 text-sm">
                <Check size={16} />
                <span>Completed</span>
              </div>
            )}
            
            <button
              onClick={handleStartPuzzle}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl hover:from-amber-400 hover:to-orange-500 transition-all shadow-lg shadow-amber-500/30 active:scale-[0.98]"
            >
              {selectedPuzzle.isCompleted ? 'PLAY AGAIN' : 'START PUZZLE'}
            </button>
          </div>
        )}

        {/* Empty state when no puzzles available */}
        {!loading && !error && puzzles.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-6 bg-slate-900/50 rounded-2xl border border-slate-700/50">
              <Sparkles size={48} className="text-amber-400/50 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Coming Soon!</h3>
              <p className="text-slate-400 text-sm">
                Creator puzzles are being crafted by our team.<br />
                Check back soon for hand-crafted challenges!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Safe area bottom padding */}
      <div className="flex-shrink-0" style={{ height: 'max(16px, env(safe-area-inset-bottom))' }} />
    </div>
  );
};

export default CreatorPuzzleSelect;
