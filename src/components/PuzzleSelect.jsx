// PuzzleSelect.jsx - Puzzle difficulty selection
// v7.23: Continuous GPU draw reduction (the GPU pressure source the v7.22
//        cardShadow change didn't reach). cardShadow fixed the click-time
//        event but the WebView is still close to its compositor ceiling
//        because of TWO continuous animation sources draining GPU at
//        60fps even when nothing's happening:
//          1. NeonTitle pulses via animated text-shadow + filter:brightness.
//             `filter` creates a GPU layer that gets repainted every
//             animation frame. Continuous drain.
//          2. 6 FloatingPieces, each a separate animated layer with
//             ongoing opacity/transform animations.
//        Both fixes:
//          (a) Wrapped the NeonTitle/NeonSubtitle pair with a div
//              `className="neontitle-stable"`, and added a scoped CSS
//              rule to the existing <style> block:
//                .neontitle-stable, .neontitle-stable * {
//                  animation: none !important;
//                  filter: none !important;
//                }
//              This kills the title pulse and filter ONLY on this screen,
//              preserving the animation everywhere else NeonTitle is
//              used.
//          (b) FloatingPieces count 6 → 0. Removes all six continuous
//              animated layers from this screen's background. (Other
//              screens still render FloatingPieces normally.)
//        These are continuous drains so eliminating them frees GPU
//        bandwidth permanently, giving the compositor enough headroom
//        that click-time events (gradient interpolation, layer
//        re-rasterization) no longer push it over capacity.
//        Same change mirrored from DifficultySelector v7.25.
// v7.22: Pivoting back to GPU pressure. The remaining "varies, mostly on
//        the card, sometimes whole screen" flash is the signature of
//        compositor cache eviction under GPU memory pressure on the
//        Capacitor WebView — not a deterministic element snap. Earlier
//        rounds (shine, gradient, position) addressed specific
//        deterministic snaps but didn't touch the underlying GPU
//        capacity issue.
//        cardShadow is the single biggest GPU layer on screen that
//        changes color on every click (multi-layer 60px outer + 30px
//        inset blur on a ~350-500px card, themed by rgba color).
//        Two changes folded together:
//          1. Unified cardShadow across all 4 themes — single neutral
//             slate color (rgba(100,116,139,...)) regardless of puzzle
//             type. The shadow layer is now stable; clicking no longer
//             triggers re-rasterization of the largest layer on
//             screen.
//          2. Outer blur 60px → 30px. Halves the linear dimension of
//             the shadow layer's extended bounds — roughly 50% drop
//             in shadow-layer GPU memory.
//        Inset shadow kept at 30px (inset doesn't extend the layer,
//        so it's free GPU-wise). Outer opacity nudged 0.4 → 0.3 so the
//        neutral tone doesn't feel too gray. Theme color is still
//        strongly indicated by card background gradient, border color,
//        puzzle-type-button gradients, and start-button gradient — the
//        cardShadow was the secondary visual cue.
//        Same change mirrored from DifficultySelector v7.24.
// v7.21: Removed the animate-shine effect entirely (option C in our flicker
//        triage). The v7.20 "infinite → 1" change stopped the recurring
//        sweep but the single post-click sweep was still visible as a
//        delayed flash. Removing the shine entirely eliminates the
//        last functional source of post-click flash.
//        The selected puzzle-type button still reads as clearly selected
//        via: filled gradient background, ring/border styling, glow
//        box-shadow, white text vs colored text. Plenty of selection
//        signal without the shine.
//        Cleanup: removed the @keyframes shine + .animate-shine CSS from
//        the inline <style> tag (the rest of the <style> block stays
//        intact for speed-pulse and turn-order-pulse animations which are
//        unrelated and still needed). Same change mirrored from
//        DifficultySelector v7.23.
// v7.20: Functional (not GPU) fix for the lingering delayed flash.
//        Root cause: `animate-shine` on the selected puzzle-type button runs
//        `shine 1.5s ease-in-out infinite`. With ease-in-out, the bright
//        white/20 sweep enters the visible button area roughly 600ms after
//        the animation starts and exits roughly 900ms — and the `infinite`
//        keyword makes it repeat every 1.5s. This was always present, but
//        once we smoothed the gradient/color/position flashes from earlier
//        rounds, the shine became the most visible event on the screen
//        after each click.
//        Fix: changed `infinite` → `1` so the shine plays exactly once per
//        selection (functions as a "selection confirmation" sweep) and then
//        stops. Eliminates the repeating delayed flash. The single sweep
//        after each click is still present by design; if that's still too
//        noticeable, the next step is removing the shine entirely. Same
//        change mirrored from DifficultySelector v7.22.
// v7.19: Switch-flash root cause: gradient changes weren't being transitioned.
//        `transition-colors` covers background-color/border-color but NOT
//        background-image — and CSS gradients are `background-image:
//        linear-gradient(...)`. So when the user picked a new puzzle type,
//        the card gradient (theme.cardBg), the puzzle-type-button selected-
//        state gradient, and the grid background's linear-gradient ALL
//        snapped instantly while only the border/text colors faded. The
//        mismatch read as a flash.
//        Fix: replace `transition-colors duration-X` with
//        `transition-[background-color,background-image,border-color]
//        duration-X` (and on buttons, also `color`). The arbitrary-value
//        syntax includes background-image so gradients fade smoothly, but
//        EXCLUDES box-shadow — deliberate, because animating multi-layer
//        box-shadows per frame is what the v7.14 "transition-all →
//        transition-colors" change was originally moving AWAY from for
//        mobile perf. Targeted middle-ground.
//        Also added inline `transition: background-image 700ms ease` to the
//        grid background div since its gradient comes from inline `style`
//        (the className transition can't reach into inline styles).
//        Same change mirrored from DifficultySelector v7.21.
// v7.18: Unified orb positions across all 4 themes so option-switching no
//        longer causes a flash. Previously each theme had its own glow1/2/3
//        positions, so clicking a different puzzle type made the 3 large
//        blur-2xl orbs each jump to entirely new screen locations in a
//        single frame — the v7.15 transition narrowing (which fixed idle
//        flicker) was only animating colors, so positions snapped. With
//        unified positions, color still fades smoothly over 700ms but
//        orbs never move. Visual cost: themes now differ only by palette,
//        not orb layout, but the per-type color signals (green/amber/
//        purple/red) are already the primary theming cue. Adopted the
//        easy theme's position set (top-20 left-10, bottom-32 right-10,
//        top-1/2 left-1/2) as the shared layout. Same change mirrored to
//        DifficultySelector v7.20.
// v7.17: Reduced orb blur from `blur-3xl` (64px) to `blur-2xl` (40px) — about
//        a 37.5% reduction in blur radius. Smaller blur means each orb's
//        GPU layer texture is smaller (the layer extends to cover the orb
//        + blur radius on all sides), which reduces compositor memory
//        pressure and per-frame layer-cache work on Capacitor. Visual
//        impact: orbs have a slightly tighter, less-diffuse glow falloff —
//        more "soft blob" than "wide aura". Still very visibly glow-y.
//        Same change mirrored to DifficultySelector v7.19.
// v7.16: Two more flicker-reduction changes on top of v7.15:
//   (a) FloatingPieces count 12 → 6. Halves the background animated-piece
//       count, reducing continuous compositor work. Still keeps ambient
//       motion for visual identity, just less of it.
//   (b) Memoized the grid background + 3 orbs as one JSX block via
//       useMemo([theme]). isLoading / progress / error state changes
//       (especially during puzzle loading when progress increments) were
//       making React reconcile all 4 large blur layers on every render
//       even though they only visually depend on theme. With memoization,
//       when theme is stable, the same JSX object is reused and React
//       skips the subtree.
// v7.15: Completed the orb transition narrowing that the v7.14 comment claimed
//        was applied but wasn't — the orbs and themed grid still had
//        `transition-all duration-700` despite v7.14's note (the card got
//        the fix at line 211, orbs and grid bg were missed). `transition-all`
//        forces the WebView to evaluate every animatable property each frame
//        AND, when something does change (puzzle-type switch), animates
//        LAYOUT properties (top/left/right/bottom from the position Tailwind
//        classes) which trigger reflow + paint. Narrowed to
//        `transition-colors duration-700` so only background-color
//        transitions (kept smooth); positions snap on type change instead
//        of sliding. Eliminates one of the layer-pressure contributors
//        causing Capacitor flicker on this screen. Same fix mirrored to
//        DifficultySelector v7.17.
// v7.14: Mobile perf — transition-all→transition-colors on glow orbs/cards, removed backdrop-blur
// v7.13: iOS scroll fix — removed WebkitOverflowScrolling, touchAction, changed overscrollBehavior to none
// v7.12: overflow-y-scroll (was auto) + removed overflow-hidden from outer shell

import { useState, useMemo } from 'react';
import { Loader, AlertCircle, ArrowLeft, Zap, Timer, Flame } from 'lucide-react';
import NeonTitle from './NeonTitle';
import NeonSubtitle from './NeonSubtitle';
import { soundManager } from '../utils/soundManager';
import { getRandomPuzzle, PUZZLE_DIFFICULTY } from '../utils/puzzleGenerator';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import FloatingPieces from './FloatingPieces';

// Dramatically different themes for each difficulty
const themes = {
  easy: {
    gridColor: 'rgba(34,197,94,0.5)',
    glow1: { color: 'bg-green-500/40', pos: 'top-20 left-10' },
    glow2: { color: 'bg-emerald-400/30', pos: 'bottom-32 right-10' },
    glow3: { color: 'bg-lime-500/20', pos: 'top-1/2 left-1/2' },
    cardBg: 'bg-gradient-to-br from-slate-900/95 via-green-950/50 to-slate-900/95',
    cardBorder: 'border-green-500/50',
    cardShadow: 'shadow-[0_0_30px_rgba(100,116,139,0.3),inset_0_0_30px_rgba(100,116,139,0.1)]',
  },
  medium: {
    gridColor: 'rgba(251,191,36,0.5)',
    glow1: { color: 'bg-amber-500/40', pos: 'top-20 left-10' },
    glow2: { color: 'bg-orange-500/35', pos: 'bottom-32 right-10' },
    glow3: { color: 'bg-red-500/20', pos: 'top-1/2 left-1/2' },
    cardBg: 'bg-gradient-to-br from-slate-900/95 via-amber-950/50 to-slate-900/95',
    cardBorder: 'border-amber-500/50',
    cardShadow: 'shadow-[0_0_30px_rgba(100,116,139,0.3),inset_0_0_30px_rgba(100,116,139,0.1)]',
  },
  hard: {
    gridColor: 'rgba(168,85,247,0.5)',
    glow1: { color: 'bg-purple-500/40', pos: 'top-20 left-10' },
    glow2: { color: 'bg-pink-500/35', pos: 'bottom-32 right-10' },
    glow3: { color: 'bg-violet-500/25', pos: 'top-1/2 left-1/2' },
    cardBg: 'bg-gradient-to-br from-slate-900/95 via-purple-950/50 to-slate-900/95',
    cardBorder: 'border-purple-500/50',
    cardShadow: 'shadow-[0_0_30px_rgba(100,116,139,0.3),inset_0_0_30px_rgba(100,116,139,0.1)]',
  },
  speed: {
    gridColor: 'rgba(239,68,68,0.5)',
    glow1: { color: 'bg-red-500/40', pos: 'top-20 left-10' },
    glow2: { color: 'bg-orange-500/35', pos: 'bottom-32 right-10' },
    glow3: { color: 'bg-amber-500/20', pos: 'top-1/2 left-1/2' },
    cardBg: 'bg-gradient-to-br from-slate-900/95 via-red-950/50 to-slate-900/95',
    cardBorder: 'border-red-500/50',
    cardShadow: 'shadow-[0_0_30px_rgba(100,116,139,0.3),inset_0_0_30px_rgba(100,116,139,0.1)]',
  },
};

const difficulties = [
  { 
    id: PUZZLE_DIFFICULTY.EASY, 
    name: 'BEGINNER', 
    moves: 1, 
    description: '1 move to win. But watch out for traps!', 
    theme: 'easy',
    colors: {
      gradient: 'from-green-600 to-emerald-600',
      glow: 'rgba(34,197,94,0.6)',
      text: 'text-green-300',
      ring: 'ring-green-500/50',
      bg: 'bg-green-900/30',
      border: 'border-green-500/40',
    }
  },
  { 
    id: PUZZLE_DIFFICULTY.MEDIUM, 
    name: 'INTERMEDIATE', 
    moves: 3, 
    description: '3 moves to solve. A solid challenge.', 
    theme: 'medium',
    colors: {
      gradient: 'from-amber-500 to-orange-600',
      glow: 'rgba(251,191,36,0.6)',
      text: 'text-amber-300',
      ring: 'ring-amber-500/50',
      bg: 'bg-amber-900/30',
      border: 'border-amber-500/40',
    }
  },
  { 
    id: PUZZLE_DIFFICULTY.HARD, 
    name: 'EXPERT', 
    moves: 5, 
    description: '5 moves to solve. For puzzle masters.', 
    theme: 'hard',
    colors: {
      gradient: 'from-purple-500 to-pink-600',
      glow: 'rgba(168,85,247,0.6)',
      text: 'text-purple-300',
      ring: 'ring-purple-500/50',
      bg: 'bg-purple-900/30',
      border: 'border-purple-500/40',
    }
  },
  { 
    id: 'speed', 
    name: 'SPEED', 
    moves: null, // Special - timed mode
    description: 'Beat the clock! 10 seconds per puzzle.', 
    theme: 'speed',
    isSpeed: true,
    colors: {
      gradient: 'from-red-500 to-orange-600',
      glow: 'rgba(239,68,68,0.6)',
      text: 'text-red-300',
      ring: 'ring-red-500/50',
      bg: 'bg-red-900/30',
      border: 'border-red-500/40',
    }
  }
];

const PuzzleSelect = ({ onSelectPuzzle, onSpeedMode, onBack }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(PUZZLE_DIFFICULTY.EASY);
  const { needsScroll } = useResponsiveLayout(750);
  
  // Get best speed streak for display
  const [bestSpeedStreak] = useState(() => {
    try {
      return parseInt(localStorage.getItem('speed-puzzle-best') || '0', 10);
    } catch {
      return 0;
    }
  });

  const selectedDiff = difficulties.find(d => d.id === selectedDifficulty) || difficulties[0];
  const theme = themes[selectedDiff.theme];

  // v7.16(b): Memoize the themed grid background + 3 large blur-3xl orbs as
  // one JSX block keyed on the theme reference. Loading state churn
  // (isLoading, progress increments during puzzle fetch) was making React
  // reconcile all 4 large layer-promoted divs on every render even though
  // they're visually a function of theme alone. `themes[selectedDiff.theme]`
  // returns the same object reference whenever selectedDifficulty doesn't
  // change, so `[theme]` is a stable dep — memo holds until the user picks
  // a different puzzle type.
  const memoizedBackdrop = useMemo(() => (
    <>
      {/* v7.19: Grid background — `transition-[background-color,background-image]
          duration-700` instead of `transition-colors` so the gridColor change
          inside the inline-style linear-gradient transitions smoothly instead
          of snapping. Also added explicit `transition: background-image 700ms
          ease` in the style object since className transitions can't reach
          inline-style property changes. */}
      <div className="fixed inset-0 opacity-40 pointer-events-none transition-[background-color,background-image] duration-700" style={{
        backgroundImage: `linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
        transition: 'background-image 700ms ease'
      }} />
      <div className={`fixed ${theme.glow1.pos} w-80 h-80 ${theme.glow1.color} rounded-full blur-2xl pointer-events-none transition-colors duration-700`} />
      <div className={`fixed ${theme.glow2.pos} w-72 h-72 ${theme.glow2.color} rounded-full blur-2xl pointer-events-none transition-colors duration-700`} />
      <div className={`fixed ${theme.glow3.pos} w-64 h-64 ${theme.glow3.color} rounded-full blur-2xl pointer-events-none transition-colors duration-700`} />
    </>
  ), [theme]);

  const handleSelectDifficulty = (diffId) => {
    soundManager.playClickSound('select');
    setSelectedDifficulty(diffId);
  };

  const handleGeneratePuzzle = async () => {
    soundManager.playButtonClick();
    
    // Speed mode goes directly to speed puzzle screen
    if (selectedDifficulty === 'speed') {
      onSpeedMode?.();
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setProgress(0);
    
    try {
      const puzzle = await getRandomPuzzle(selectedDifficulty, false, (current, total) => {
        setProgress(Math.round((current / total) * 100));
      });
      
      if (puzzle) {
        setProgress(100);
        await new Promise(r => setTimeout(r, 200));
        onSelectPuzzle(puzzle);
      } else {
        setError('Could not generate puzzle. Try again.');
        setIsLoading(false);
      }
    } catch (err) {
      setError('Something went wrong. Try again.');
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    soundManager.playButtonClick();
    onBack();
  };

  return (
    <div className="fixed inset-0 bg-slate-950">
      {/* v7.16(b): Themed grid background + 3 orbs hoisted into memoizedBackdrop
          (defined above) — see header note. */}
      {memoizedBackdrop}
      
      {/* v7.23(b): FloatingPieces count 6 → 0 to eliminate 6 continuous
          animated GPU layers from this screen's background. The biggest
          single source of continuous GPU draw besides NeonTitle. Background
          loses ambient pentomino motion on this screen (preserved
          everywhere else FloatingPieces is rendered). */}
      <FloatingPieces count={0} theme="puzzle" minOpacity={0.2} maxOpacity={0.4} />

      {/* Inner scroll child — absolute inset-0 gives iOS explicit pixel bounds */}
      <div
        className="absolute inset-0 overflow-y-scroll overflow-x-hidden"
        style={{ overscrollBehavior: 'none' }}
      >
      {/* Content */}
      <div className="relative flex flex-col items-center justify-center px-4 py-6 min-h-full">
        <div className="w-full max-w-md">
          {/* v7.23(a): Wrapped with `neontitle-stable` to disable NeonTitle's
              continuous text-shadow + filter:brightness animation on this
              screen (scoped CSS rule in <style> block at the end). */}
          <div className="text-center mb-4 neontitle-stable">
            <NeonTitle size="large" />
            <NeonSubtitle text="GENERATED PUZZLE MODE" size="small" className="mt-1" />
          </div>

          {/* Card with dramatic theme */}
          {/* v7.19: Card transition — narrowed transition-colors → explicit list
              including background-image so the cardBg gradient (which changes
              with theme) fades smoothly instead of snapping. Excludes
              box-shadow per v7.14 mobile-perf intent. */}
          <div className={`${theme.cardBg} rounded-2xl p-5 border ${theme.cardBorder} ${theme.cardShadow} transition-[background-color,background-image,border-color] duration-700`}>
            
            {/* Difficulty Selection */}
            <div className="space-y-2 mb-4">
              {difficulties.map(diff => {
                const isSelected = selectedDifficulty === diff.id;
                const isSpeedMode = diff.isSpeed;
                
                return (
                  <button
                    key={diff.id}
                    onClick={() => handleSelectDifficulty(diff.id)}
                    className={`w-full p-3 rounded-xl transition-[background-color,background-image,border-color,color] duration-300 relative overflow-hidden ${
                      isSelected 
                        ? `bg-gradient-to-r ${diff.colors.gradient} text-white shadow-lg` 
                        : `${diff.colors.bg} ${diff.colors.border} border hover:scale-[1.02]`
                    }`}
                    style={isSelected ? { boxShadow: `0 0 25px ${diff.colors.glow}` } : {}}
                  >
                    {/* Speed mode pulse effect */}
                    {isSpeedMode && isSelected && (
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20 animate-speed-pulse" />
                    )}
                    
                    <div className="relative flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className={`font-black tracking-wide text-base ${isSelected ? 'text-white' : diff.colors.text}`}>
                            {diff.name}
                          </h3>
                          {isSpeedMode ? (
                            <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${isSelected ? 'bg-white/20 text-white' : 'bg-red-500/30 text-red-300'}`}>
                              <Timer size={10} />
                              10s
                            </span>
                          ) : (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-700/50 text-slate-400'}`}>
                              {diff.moves} {diff.moves === 1 ? 'move' : 'moves'}
                            </span>
                          )}
                          {/* Best streak badge for speed mode */}
                          {isSpeedMode && bestSpeedStreak > 0 && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 text-xs">
                              <Flame size={10} />
                              {bestSpeedStreak}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                          {diff.description}
                        </p>
                      </div>
                      
                      {/* Selection indicator */}
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-2 ${
                        isSelected ? 'border-white bg-white' : 'border-slate-600'
                      }`}>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-slate-900" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* REMOVED: Turn order info - no longer shown */}
            
            {/* Speed mode info - UPDATED text */}
            {selectedDiff.isSpeed && (
              <div className="mb-5 p-3 bg-slate-800/50 rounded-xl border border-red-500/30">
                <div className="text-center">
                  <span className="speed-info-title font-black tracking-[0.2em] text-xs">HOW IT WORKS</span>
                  <div className="mt-2 text-sm text-slate-400 space-y-1">
                    <p>Find the <span className="text-white font-medium">ONE winning move</span> before time runs out!</p>
                    <p className="text-red-300">⏱ 10 seconds per puzzle</p>
                    <p>Build your streak - how far can you go?</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Speed mode title styling */}
            <style>{`
              .speed-info-title {
                font-family: system-ui, -apple-system, sans-serif;
                color: #fff;
                text-shadow:
                  0 0 5px #fff,
                  0 0 10px #fff,
                  0 0 20px #ef4444,
                  0 0 40px #ef4444,
                  0 0 60px #f97316;
                animation: turn-order-pulse 3s ease-in-out infinite;
              }
              @keyframes turn-order-pulse {
                0%, 100% {
                  text-shadow:
                    0 0 5px #fff,
                    0 0 10px #fff,
                    0 0 20px #ef4444,
                    0 0 40px #ef4444,
                    0 0 60px #f97316;
                  filter: brightness(1);
                }
                50% {
                  text-shadow:
                    0 0 5px #fff,
                    0 0 15px #fff,
                    0 0 30px #ef4444,
                    0 0 50px #ef4444,
                    0 0 70px #f97316;
                  filter: brightness(1.1);
                }
              }
            `}</style>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-500/50 rounded-lg flex items-center gap-2">
                <AlertCircle size={16} className="text-red-400" />
                <span className="text-red-300 text-sm">{error}</span>
              </div>
            )}

            {/* Start Button */}
            <button 
              onClick={handleGeneratePuzzle} 
              disabled={isLoading}
              className={`w-full p-3 rounded-xl font-black tracking-wider text-base transition-all flex items-center justify-center gap-2 ${
                isLoading 
                  ? 'bg-slate-700 text-slate-400 cursor-wait' 
                  : `bg-gradient-to-r ${selectedDiff.colors.gradient} text-white hover:scale-[1.02] active:scale-[0.98]`
              }`}
              style={!isLoading ? { boxShadow: `0 0 30px ${selectedDiff.colors.glow}` } : {}}
            >
              {isLoading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  <div className="text-left">
                    <div className="text-xs">GENERATING...</div>
                    <div className="text-[10px] opacity-70">{progress}%</div>
                  </div>
                </>
              ) : selectedDiff.isSpeed ? (
                <>
                  <Zap size={18} />
                  START SPEED MODE
                </>
              ) : (
                <>
                  START {selectedDiff.name} PUZZLE
                </>
              )}
            </button>
            
            {/* Back button - Themed */}
            <button 
              onClick={handleBack} 
              disabled={isLoading}
              className="w-full mt-3 py-2.5 px-4 rounded-xl font-bold text-sm text-slate-300 bg-slate-800/70 hover:bg-slate-700/70 transition-all border border-slate-600/50 hover:border-slate-500/50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(100,116,139,0.2)] disabled:opacity-50"
            >
              <ArrowLeft size={16} />
              BACK TO MENU
            </button>
          </div>
        </div>
        <div className="h-6 flex-shrink-0" />
      </div>
      
      {/* Inline animations (speed-pulse) + v7.23(a) neontitle-stable scoping
          to disable NeonTitle's pulse animation + filter:brightness on this
          screen without affecting NeonTitle elsewhere. */}
      <style>{`
        @keyframes speed-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        .animate-speed-pulse {
          animation: speed-pulse 2s ease-in-out infinite;
        }
        .neontitle-stable,
        .neontitle-stable * {
          animation: none !important;
          filter: none !important;
        }
      `}</style>
      </div>{/* end inner scroll child */}
    </div>
  );
};

export default PuzzleSelect;
