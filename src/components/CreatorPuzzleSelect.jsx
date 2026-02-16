// CreatorPuzzleSelect.jsx - Selection grid for hand-crafted creator puzzles
// v1.1: Updated styling - cyan theme, removed header buttons, proper title/subtitle
import { useState, useEffect } from 'react';
import { ArrowLeft, Check, Lock, Loader, ChevronLeft, ChevronRight } from 'lucide-react';
import NeonTitle from './NeonTitle';
import NeonSubtitle from './NeonSubtitle';
import { soundManager } from '../utils/soundManager';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { useAuth } from '../contexts/AuthContext';
import FloatingPieces from './FloatingPieces';

// Supabase config
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Cyan theme for creator puzzles
const theme = {
  gridColor: 'rgba(34, 211, 238, 0.25)',
  glow1: { color: 'bg-cyan-500/35', pos: 'top-20 right-10' },
  glow2: { color: 'bg-sky-500/30', pos: 'bottom-32 left-10' },
  glow3: { color: 'bg-teal-500/20', pos: 'top-1/2 left-1/4' },
  cardBg: 'bg-gradient-to-br from-slate-900/95 via-cyan-950/30 to-slate-900/95',
  cardBorder: 'border-cyan-500/30',
  cardShadow: 'shadow-[0_0_40px_rgba(34,211,238,0.2)]',
};

// Difficulty colors
const difficultyColors = {
  easy: {
    bg: 'bg-green-500/20',
    border: 'border-green-500/50',
    text: 'text-green-400',
    gradient: 'from-green-600 to-emerald-600',
  },
  medium: {
    bg: 'bg-cyan-500/20',
    border: 'border-cyan-500/50',
    text: 'text-cyan-400',
    gradient: 'from-cyan-500 to-sky-600',
  },
  hard: {
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/50',
    text: 'text-purple-400',
    gradient: 'from-purple-500 to-pink-600',
  },
  expert: {
    bg: 'bg-red-500/20',
    border: 'border-red-500/50',
    text: 'text-red-400',
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

  const handleSelectPuzzle = (puzzle) => {
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
    soundManager.playClickSound('select');
    setCurrentPage(p => Math.max(0, p - 1));
  };

  const handleNextPage = () => {
    soundManager.playClickSound('select');
    const maxPage = Math.ceil(puzzles.length / PUZZLES_PER_PAGE) - 1;
    setCurrentPage(p => Math.min(maxPage, p + 1));
  };

  // Get puzzles for current page
  const startIdx = currentPage * PUZZLES_PER_PAGE;
  const paginatedPuzzles = puzzles.slice(startIdx, startIdx + PUZZLES_PER_PAGE);
  const totalPages = Math.ceil(puzzles.length / PUZZLES_PER_PAGE);
  const completedCount = completedPuzzles.size;

  return (
    <div 
      className={needsScroll ? 'min-h-screen bg-slate-950' : 'h-screen bg-slate-950 overflow-hidden'}
      style={needsScroll ? { overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' } : {}}
    >
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
      <div className={`fixed ${theme.glow1.pos} w-72 h-72 ${theme.glow1.color} rounded-full blur-3xl pointer-events-none animate-pulse`} style={{ animationDuration: '4s' }} />
      <div className={`fixed ${theme.glow2.pos} w-64 h-64 ${theme.glow2.color} rounded-full blur-3xl pointer-events-none animate-pulse`} style={{ animationDuration: '6s' }} />
      <div className={`fixed ${theme.glow3.pos} w-56 h-56 ${theme.glow3.color} rounded-full blur-3xl pointer-events-none animate-pulse`} style={{ animationDuration: '5s' }} />

      {/* Main Content */}
      <div className={`relative ${needsScroll ? 'min-h-screen' : 'h-full'} flex flex-col items-center px-4 py-6`}>
        <div className="w-full max-w-md">
          
          {/* Title */}
          <div className="text-center mb-4">
            <NeonTitle size="medium" />
            <NeonSubtitle text="CREATOR PUZZLES" size="small" className="mt-1" />
            {puzzles.length > 0 && (
              <p className="text-cyan-400/80 text-sm mt-2">
                {completedCount} / {puzzles.length} completed
              </p>
            )}
          </div>

          {/* Card with theme */}
          <div className={`${theme.cardBg} backdrop-blur-md rounded-2xl p-4 border ${theme.cardBorder} ${theme.cardShadow}`}>
            
            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader size={32} className="text-cyan-400 animate-spin" />
                <p className="text-slate-400 mt-3">Loading puzzles...</p>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="text-center py-8">
                <p className="text-red-400 mb-4">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Puzzle Grid */}
            {!loading && !error && (
              <>
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {paginatedPuzzles.map(puzzle => {
                    const isCompleted = completedPuzzles.has(puzzle.puzzle_number);
                    const isSelected = selectedPuzzle?.id === puzzle.id;
                    const difficulty = puzzle.difficulty || 'medium';
                    const colors = difficultyColors[difficulty] || difficultyColors.medium;
                    
                    return (
                      <button
                        key={puzzle.id}
                        onClick={() => handleSelectPuzzle(puzzle)}
                        className={`
                          aspect-square rounded-lg flex items-center justify-center
                          font-bold text-sm transition-all relative overflow-hidden
                          ${isSelected 
                            ? `bg-gradient-to-br ${colors.gradient} text-white scale-105 shadow-lg` 
                            : isCompleted
                              ? 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
                              : `${colors.bg} ${colors.text} border ${colors.border} hover:scale-105`
                          }
                        `}
                        style={isSelected ? { boxShadow: '0 0 20px rgba(34,211,238,0.5)' } : {}}
                      >
                        {isCompleted && !isSelected ? (
                          <Check size={16} className="text-green-400" />
                        ) : (
                          puzzle.puzzle_number
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <button
                      onClick={handlePrevPage}
                      disabled={currentPage === 0}
                      className="p-2 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <span className="text-slate-400 text-sm">
                      Page {currentPage + 1} of {totalPages}
                    </span>
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage >= totalPages - 1}
                      className="p-2 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}

                {/* Selected Puzzle Info */}
                {selectedPuzzle && (
                  <div className="mb-4 p-3 bg-slate-800/50 rounded-xl border border-cyan-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-bold">Puzzle #{selectedPuzzle.puzzle_number}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        difficultyColors[selectedPuzzle.difficulty || 'medium'].bg
                      } ${difficultyColors[selectedPuzzle.difficulty || 'medium'].text}`}>
                        {selectedPuzzle.difficulty || 'medium'}
                      </span>
                    </div>
                    {selectedPuzzle.name && (
                      <p className="text-slate-400 text-sm">{selectedPuzzle.name}</p>
                    )}
                  </div>
                )}

                {/* Start Button */}
                <button 
                  onClick={handleStartPuzzle}
                  disabled={!selectedPuzzle}
                  className={`w-full p-3 rounded-xl font-black tracking-wider text-base transition-all flex items-center justify-center gap-2 ${
                    selectedPuzzle
                      ? 'bg-gradient-to-r from-cyan-500 to-sky-600 text-white hover:scale-[1.02] active:scale-[0.98]'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                  style={selectedPuzzle ? { boxShadow: '0 0 30px rgba(34,211,238,0.5)' } : {}}
                >
                  {selectedPuzzle ? `START PUZZLE #${selectedPuzzle.puzzle_number}` : 'SELECT A PUZZLE'}
                </button>
              </>
            )}
            
            {/* Back button - Themed */}
            <button 
              onClick={handleBack}
              className="w-full mt-3 py-2.5 px-4 rounded-xl font-bold text-sm text-slate-300 bg-slate-800/70 hover:bg-slate-700/70 transition-all border border-slate-600/50 hover:border-slate-500/50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(100,116,139,0.2)]"
            >
              <ArrowLeft size={16} />
              BACK TO MENU
            </button>
          </div>
        </div>
        {needsScroll && <div className="h-6 flex-shrink-0" />}
      </div>
    </div>
  );
};

export default CreatorPuzzleSelect;
