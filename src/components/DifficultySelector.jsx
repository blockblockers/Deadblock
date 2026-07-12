// DifficultySelector.jsx
// v7.25: Continuous GPU draw reduction (the GPU pressure source the v7.24
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
//              rule in a new <style> block:
//                .neontitle-stable, .neontitle-stable * {
//                  animation: none !important;
//                  filter: none !important;
//                }
//              This kills the title pulse and filter ONLY on this screen,
//              preserving the animation everywhere else NeonTitle is
//              used. Same pattern we used on FinalBoardView v7.34.
//          (b) FloatingPieces count 6 → 0. Removes all six continuous
//              animated layers from this screen's background. (Other
//              screens still render FloatingPieces normally.)
//        These are continuous drains so eliminating them frees GPU
//        bandwidth permanently, giving the compositor enough headroom
//        that click-time events (gradient interpolation, layer
//        re-rasterization) no longer push it over capacity.
//        Same change mirrored to PuzzleSelect v7.23.
// v7.24: Pivoting back to GPU pressure. The remaining "varies, mostly on
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
//          1. Unified cardShadow across all themes — single neutral
//             slate color (rgba(100,116,139,...)) regardless of
//             difficulty. The shadow layer is now stable; clicking no
//             longer triggers re-rasterization of the largest layer
//             on screen.
//          2. Outer blur 60px → 30px. Halves the linear dimension of
//             the shadow layer's extended bounds — roughly 50% drop
//             in shadow-layer GPU memory.
//        Inset shadow kept at 30px (inset doesn't extend the layer,
//        so it's free GPU-wise). Outer opacity nudged 0.4 → 0.3 so the
//        neutral tone doesn't feel too gray. Theme color is still
//        strongly indicated by card background gradient, border color,
//        difficulty-button gradients, and start-button gradient — the
//        cardShadow was the secondary visual cue.
//        Same change mirrored to PuzzleSelect v7.22.
// v7.23: Removed the animate-shine effect entirely (option C in our flicker
//        triage). The v7.22 "infinite → 1" change stopped the recurring
//        sweep but the single post-click sweep was still visible as a
//        delayed flash. Removing the shine entirely eliminates the
//        last functional source of post-click flash.
//        The selected difficulty button still reads as clearly selected
//        via: filled gradient background, white border, ring-4 outline,
//        glow box-shadow, white text vs colored text, white selection
//        indicator dot. Plenty of selection signal without the shine.
//        Cleanup: also removed the @keyframes shine + .animate-shine CSS
//        from the inline <style> tag, then removed the whole <style>
//        block (it had nothing else). Same change mirrored to
//        PuzzleSelect v7.21 (but its <style> tag stays because of
//        speed-pulse + turn-order-pulse).
// v7.22: Functional (not GPU) fix for the lingering delayed flash.
//        Root cause: `animate-shine` on the selected difficulty button runs
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
//        change mirrored to PuzzleSelect v7.20.
// v7.21: Switch-flash root cause: gradient changes weren't being transitioned.
//        `transition-colors` covers background-color/border-color but NOT
//        background-image — and CSS gradients are `background-image:
//        linear-gradient(...)`. So when the user picked a new difficulty,
//        the card gradient (theme.cardBg), the difficulty-button selected-
//        state gradient, and the grid background's linear-gradient ALL
//        snapped instantly while only the border/text colors faded. The
//        mismatch read as a flash.
//        Fix: replace `transition-colors duration-X` with
//        `transition-[background-color,background-image,border-color]
//        duration-X` (and on buttons, also `color`). The arbitrary-value
//        syntax includes background-image so gradients fade smoothly, but
//        EXCLUDES box-shadow — that exclusion is deliberate, because
//        animating multi-layer box-shadows per frame is what the v7.14/v7.16
//        "transition-all → transition-colors" change was originally moving
//        AWAY from for mobile perf. Targeted middle-ground.
//        Also added inline `transition: background-image 700ms ease` to the
//        grid background div since its gradient comes from inline `style`
//        (the className transition can't reach into inline styles).
//        Same change mirrored to PuzzleSelect v7.19.
// v7.20: Unified orb positions across all 3 themes so option-switching no
//        longer causes a flash. Previously each theme had its own glow1/2/3
//        positions, so clicking a different difficulty made the 3 large
//        blur-2xl orbs each jump to entirely new screen locations in a
//        single frame — the v7.17 transition narrowing (which fixed idle
//        flicker) was only animating colors, so positions snapped. With
//        unified positions, color still fades smoothly over 700ms but
//        orbs never move. Visual cost: themes now differ only by palette,
//        not orb layout, but the green/amber/purple color signals are
//        already the primary theming cue. Adopted the beginner theme's
//        position set (top-20 left-10, bottom-32 right-10, top-1/2 left-1/2)
//        as the shared layout. Same change mirrored to PuzzleSelect v7.18.
// v7.19: Reduced orb blur from `blur-3xl` (64px) to `blur-2xl` (40px) — about
//        a 37.5% reduction in blur radius. Smaller blur means each orb's
//        GPU layer texture is smaller (the layer extends to cover the orb
//        + blur radius on all sides), which reduces compositor memory
//        pressure and per-frame layer-cache work on Capacitor. Visual
//        impact: orbs have a slightly tighter, less-diffuse glow falloff —
//        more "soft blob" than "wide aura". Still very visibly glow-y.
//        Same change mirrored to PuzzleSelect v7.17.
// v7.18: Two more flicker-reduction changes on top of v7.17:
//   (a) FloatingPieces count 12 → 6. Halves the background animated-piece
//       count, reducing continuous compositor work. Still keeps ambient
//       motion for visual identity, just less of it.
//   (b) Memoized the grid background + 3 orbs as one JSX block via
//       useMemo([theme]). aiGoesFirst toggle (and any other re-render
//       trigger) was making React reconcile all 4 large blur layers on
//       every render even though they only visually depend on the theme.
//       With memoization, when theme is stable, the same JSX object is
//       reused and React skips the subtree.
// v7.17: Completed the orb transition narrowing that the v7.16 comment claimed
//        was applied but wasn't — the orbs and themed grid still had
//        `transition-colors duration-700` despite v7.16's note. `transition-all`
//        forces the WebView to evaluate every animatable property each frame
//        AND, when something does change (theme switch), animates LAYOUT
//        properties (top/left/right/bottom from the position Tailwind classes)
//        which trigger reflow + paint. Narrowed to `transition-colors
//        duration-700` so only background-color transitions (kept smooth);
//        positions snap on theme change instead of sliding. Eliminates one
//        of the layer-pressure contributors causing Capacitor flicker on
//        this screen even at idle. Same fix mirrored to PuzzleSelect v7.15.
// v7.16: Mobile perf — transition-all→transition-colors on glow orbs/cards, removed backdrop-blur
// v7.15: iOS scroll fix — removed WebkitOverflowScrolling, touchAction, changed overscrollBehavior to none
// v7.14: overflow-y-scroll (was auto) + removed overflow-hidden from outer shell
import { useState, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import NeonTitle from './NeonTitle';
import NeonSubtitle from './NeonSubtitle';
import { AI_DIFFICULTY } from '../utils/aiLogic';
import { soundManager } from '../utils/soundManager';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import FloatingPieces from './FloatingPieces';

// Dramatically different themes for each difficulty
const themes = {
  beginner: {
    gridColor: 'rgba(34,197,94,0.5)',
    glow1: { color: 'bg-green-500/40', pos: 'top-20 left-10' },
    glow2: { color: 'bg-emerald-400/30', pos: 'bottom-32 right-10' },
    glow3: { color: 'bg-lime-500/20', pos: 'top-1/2 left-1/2' },
    cardBg: 'bg-gradient-to-br from-slate-900/95 via-green-950/50 to-slate-900/95',
    cardBorder: 'border-green-500/50',
    cardShadow: 'shadow-[0_0_30px_rgba(100,116,139,0.3),inset_0_0_30px_rgba(100,116,139,0.1)]',
  },
  intermediate: {
    gridColor: 'rgba(251,191,36,0.5)',
    glow1: { color: 'bg-amber-500/40', pos: 'top-20 left-10' },
    glow2: { color: 'bg-orange-500/35', pos: 'bottom-32 right-10' },
    glow3: { color: 'bg-red-500/20', pos: 'top-1/2 left-1/2' },
    cardBg: 'bg-gradient-to-br from-slate-900/95 via-amber-950/50 to-slate-900/95',
    cardBorder: 'border-amber-500/50',
    cardShadow: 'shadow-[0_0_30px_rgba(100,116,139,0.3),inset_0_0_30px_rgba(100,116,139,0.1)]',
  },
  expert: {
    gridColor: 'rgba(168,85,247,0.5)',
    glow1: { color: 'bg-purple-500/40', pos: 'top-20 left-10' },
    glow2: { color: 'bg-pink-500/35', pos: 'bottom-32 right-10' },
    glow3: { color: 'bg-violet-500/25', pos: 'top-1/2 left-1/2' },
    cardBg: 'bg-gradient-to-br from-slate-900/95 via-purple-950/50 to-slate-900/95',
    cardBorder: 'border-purple-500/50',
    cardShadow: 'shadow-[0_0_30px_rgba(100,116,139,0.3),inset_0_0_30px_rgba(100,116,139,0.1)]',
  },
};

const difficulties = [
  { 
    id: AI_DIFFICULTY.RANDOM, 
    name: 'BEGINNER', 
    subtitle: 'Random Moves', 
    description: 'A.I. plays randomly. Perfect for learning the game.', 
    theme: 'beginner',
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
    id: AI_DIFFICULTY.AVERAGE, 
    name: 'INTERMEDIATE', 
    subtitle: 'Strategic', 
    description: 'A.I. uses strategy and thinks ahead.', 
    theme: 'intermediate',
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
    id: AI_DIFFICULTY.PROFESSIONAL, 
    name: 'EXPERT', 
    subtitle: 'Advanced A.I.', 
    description: 'A.I. analyzes deeply and plays to win.', 
    theme: 'expert',
    colors: {
      gradient: 'from-purple-500 to-pink-600',
      glow: 'rgba(168,85,247,0.6)',
      text: 'text-purple-300',
      ring: 'ring-purple-500/50',
      bg: 'bg-purple-900/30',
      border: 'border-purple-500/40',
    }
  }
];

const DifficultySelector = ({ selectedDifficulty, onSelectDifficulty, onStartGame, onBack }) => {
  const { needsScroll } = useResponsiveLayout(700);
  const [aiGoesFirst, setAiGoesFirst] = useState(false);

  const selectedDiff = difficulties.find(d => d.id === selectedDifficulty) || difficulties[0];
  const theme = themes[selectedDiff.theme];

  // v7.18(b): Memoize the themed grid background + 3 large blur-3xl orbs as
  // one JSX block keyed on the theme reference. Without this, the aiGoesFirst
  // toggle (and any other parent re-render) makes React walk all 4 large
  // layer-promoted divs on every render even though they're visually a
  // function of theme alone. `themes[selectedDiff.theme]` returns the same
  // object reference whenever selectedDifficulty doesn't change, so
  // `[theme]` is a stable dep — memo holds until the user picks a
  // different difficulty.
  const memoizedBackdrop = useMemo(() => (
    <>
      {/* v7.21: Grid background — `transition-[background-color,background-image]
          duration-700` instead of `transition-colors` so the gridColor change
          inside the inline-style linear-gradient transitions smoothly instead
          of snapping. (transition-colors covers background-color but not
          background-image; CSS gradients are background-image.) Also added
          explicit `transition: background-image 700ms ease` in the style
          object because className-based transitions can't reach inline-style
          property changes — the inline style is what actually changes between
          themes. */}
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

  const handleSelect = (diffId) => {
    soundManager.playClickSound('select');
    onSelectDifficulty(diffId);
  };

  const handleStart = () => {
    soundManager.playButtonClick();
    onStartGame(aiGoesFirst);
  };

  const handleBack = () => {
    soundManager.playButtonClick();
    onBack();
  };

  const toggleAiFirst = () => {
    soundManager.playClickSound('select');
    setAiGoesFirst(!aiGoesFirst);
  };

  return (
    <div className="fixed inset-0 bg-slate-950">
      {/* v7.18(b): Themed grid background + 3 orbs hoisted into memoizedBackdrop
          (defined above) — see header note. Identical visual output, just
          memoized to skip reconciliation on theme-irrelevant re-renders. */}
      {memoizedBackdrop}
      {/* v7.25(b): FloatingPieces count 6 → 0 to eliminate 6 continuous
          animated GPU layers from this screen's background. The biggest
          single source of continuous GPU draw besides NeonTitle. Background
          loses ambient pentomino motion on this screen (preserved
          everywhere else FloatingPieces is rendered). */}
      <FloatingPieces count={0} theme="ai" minOpacity={0.2} maxOpacity={0.4} />

      {/* Inner scroll child — absolute inset-0 gives iOS explicit pixel bounds */}
      <div
        className="absolute inset-0 overflow-y-scroll overflow-x-hidden"
        style={{ overscrollBehavior: 'none' }}
      >
      {/* Content */}
      <div className="relative flex flex-col items-center justify-center px-4 py-6 min-h-full">
        <div className="w-full max-w-md">
          {/* v7.25(a): Wrapped with `neontitle-stable` to disable NeonTitle's
              continuous text-shadow + filter:brightness animation on this
              screen (scoped CSS rule in <style> block at the end). */}
          <div className="text-center mb-4 neontitle-stable">
            <NeonTitle size="large" />
            <NeonSubtitle text="VS A.I. MODE" size="small" className="mt-1" />
          </div>

          {/* Card with dramatic theme */}
          {/* v7.21: Card transition — narrowed transition-colors → explicit list
              including background-image so the cardBg gradient (which changes
              with theme) fades smoothly instead of snapping. Excludes
              box-shadow per v7.14/v7.16 mobile-perf intent. */}
          <div className={`${theme.cardBg} rounded-2xl p-4 border ${theme.cardBorder} ${theme.cardShadow} transition-[background-color,background-image,border-color] duration-500`}>
            
            {/* Difficulty Options */}
            <div className="space-y-2 mb-4">
              {difficulties.map((diff) => {
                const isSelected = selectedDifficulty === diff.id;
                return (
                  <button 
                    key={diff.id} 
                    onClick={() => handleSelect(diff.id)}
                    className={`w-full p-3 rounded-xl border-2 transition-[background-color,background-image,border-color,color] duration-300 text-left relative overflow-hidden ${
                      isSelected 
                        ? `bg-gradient-to-r ${diff.colors.gradient} border-white/40 ring-4 ${diff.colors.ring}` 
                        : `${diff.colors.bg} ${diff.colors.border} hover:bg-opacity-50`
                    }`}
                    style={isSelected ? { boxShadow: `0 0 40px ${diff.colors.glow}` } : {}}
                  >
                    <div className="relative flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className={`font-black tracking-wide text-base ${isSelected ? 'text-white' : diff.colors.text}`}>
                            {diff.name}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-700/50 text-slate-400'}`}>
                            {diff.subtitle}
                          </span>
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

            {/* AI Goes First Toggle - Enhanced Cyberpunk Style */}
            <div className="mb-4 p-3 bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl border border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.1),inset_0_0_30px_rgba(0,0,0,0.3)]">
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                <span className="text-xs font-bold tracking-widest text-cyan-300/90">TURN ORDER</span>
                <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/50 to-transparent" />
              </div>
              
              <button
                onClick={toggleAiFirst}
                className="w-full flex items-center justify-between group"
              >
                <div className="text-left">
                  <div className={`text-xs font-semibold transition-colors ${aiGoesFirst ? 'text-purple-300' : 'text-cyan-300'}`}>
                    {aiGoesFirst ? 'A.I. Leads' : 'You Lead'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {aiGoesFirst ? 'A.I. makes the first move' : 'You make the first move'}
                  </div>
                </div>
                
                {/* Enhanced Toggle Switch */}
                <div className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
                  aiGoesFirst 
                    ? 'bg-gradient-to-r from-purple-600 to-purple-800 shadow-[0_0_15px_rgba(168,85,247,0.5),inset_0_2px_4px_rgba(0,0,0,0.3)]' 
                    : 'bg-gradient-to-r from-cyan-600 to-cyan-800 shadow-[0_0_15px_rgba(34,211,238,0.5),inset_0_2px_4px_rgba(0,0,0,0.3)]'
                }`}>
                  <div className={`absolute top-1 w-5 h-5 rounded-full transition-colors duration-300 ${
                    aiGoesFirst 
                      ? 'translate-x-8 bg-gradient-to-br from-purple-300 to-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.8)]' 
                      : 'translate-x-1 bg-gradient-to-br from-cyan-300 to-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]'
                  }`}>
                    <div className="absolute inset-0 rounded-full bg-white/30" />
                  </div>
                </div>
              </button>
              
              {/* Turn Order Visualization */}
              <div className="flex items-center justify-center gap-1.5 mt-3 p-1.5 bg-slate-900/50 rounded-lg">
                {/* First Player */}
                <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors duration-300 ${
                  !aiGoesFirst 
                    ? 'bg-cyan-500/20 border border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.4)]' 
                    : 'bg-purple-500/20 border border-purple-400/50 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${!aiGoesFirst ? 'bg-cyan-400' : 'bg-purple-400'} animate-pulse`} />
                  <span className={`text-[10px] font-bold tracking-wide ${!aiGoesFirst ? 'text-cyan-300' : 'text-purple-300'}`}>
                    {aiGoesFirst ? 'A.I.' : 'YOU'}
                  </span>
                  <span className="text-[9px] px-1 py-0.5 rounded bg-slate-700/50 text-slate-400 font-medium">1ST</span>
                </div>
                
                {/* Arrow */}
                <div className="flex items-center">
                  <div className={`w-6 h-0.5 ${!aiGoesFirst ? 'bg-gradient-to-r from-cyan-500 to-purple-500' : 'bg-gradient-to-r from-purple-500 to-cyan-500'}`} />
                  <div className={`w-0 h-0 border-t-[3px] border-b-[3px] border-l-[6px] border-transparent ${!aiGoesFirst ? 'border-l-purple-500' : 'border-l-cyan-500'}`} />
                </div>
                
                {/* Second Player */}
                <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors duration-300 ${
                  aiGoesFirst 
                    ? 'bg-cyan-500/20 border border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.4)]' 
                    : 'bg-purple-500/20 border border-purple-400/50 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${aiGoesFirst ? 'bg-cyan-400' : 'bg-purple-400'}`} />
                  <span className={`text-[10px] font-bold tracking-wide ${aiGoesFirst ? 'text-cyan-300' : 'text-purple-300'}`}>
                    {aiGoesFirst ? 'YOU' : 'A.I.'}
                  </span>
                  <span className="text-[9px] px-1 py-0.5 rounded bg-slate-700/50 text-slate-400 font-medium">2ND</span>
                </div>
              </div>
            </div>

            {/* Start Button */}
            <button 
              onClick={handleStart}
              className={`w-full p-3 rounded-xl font-black tracking-wider text-base transition-all flex items-center justify-center gap-2 text-white bg-gradient-to-r ${selectedDiff.colors.gradient} hover:scale-[1.02] active:scale-[0.98]`}
              style={{ boxShadow: `0 0 30px ${selectedDiff.colors.glow}` }}
            >
              START {selectedDiff.name} GAME
            </button>
            
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
        <div className="h-6 flex-shrink-0" />
      </div>
      </div>{/* end inner scroll child */}

      {/* v7.25(a): Scoped override that disables NeonTitle's pulsing
          animation + filter:brightness ONLY when nested inside a
          .neontitle-stable wrapper. Eliminates the continuous filter-layer
          repaint on this screen without affecting NeonTitle elsewhere. */}
      <style>{`
        .neontitle-stable,
        .neontitle-stable * {
          animation: none !important;
          filter: none !important;
        }
      `}</style>
    </div>
  );
};

export default DifficultySelector;
