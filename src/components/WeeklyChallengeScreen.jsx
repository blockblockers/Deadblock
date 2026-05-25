// Weekly Challenge Screen - Timed puzzle gameplay for weekly challenges
// v7.36: Two changes:
//   (a) Replaced the v7.34 boardPieces-based aiBlockingCells useMemo with a
//       board-state diffing approach. The previous logic grouped AI cells by
//       pieceType and took the LAST group in iteration order — but when
//       boardPieces is a 2D array, iteration order is SPATIAL (row-by-row),
//       not chronological. The "last" piece in spatial iteration is just
//       whichever AI piece occupies the highest row/col, not the most
//       recently played. Result: gold/glitter sometimes landed on the wrong
//       AI piece. The diff approach tracks `board` snapshots across renders
//       and identifies cells that transitioned to player=2 — that's the
//       AI's most recent placement, regardless of board layout or
//       boardPieces shape.
//   (b) Stripped the v7.35 [v35-*] diagnostic logs. The timer regression
//       turned out to be Android Auto-Backup restoring stale localStorage
//       on reinstall (fixed via AndroidManifest android:allowBackup="false"
//       — not a code issue). With auth state clean, the timer watchdog
//       cascade introduced in v7.35 works as designed; the logs were
//       only useful for finding the regression. Watchdog code itself
//       (sync → setTimeout → rAF) kept in place — robustness has no cost.
// v7.35: Capacitor-Android-WebView diagnostic & defensive build. v7.33/v7.34
//        confirmed working on PWA (desktop Chrome / Netlify) but four
//        regressions persist on the Capacitor APK despite identical bundle
//        hashes: timer 0:00, no gold-highlight, no 4-sec modal, partial
//        FinalBoardView flicker. Without device logs I can't pinpoint which
//        mechanism diverges in Android System WebView, so this build:
//   (a) Extends the v7.33 timer watchdog from a single setTimeout(0) defer
//       to a three-strategy cascade: synchronous attempt inside the
//       useEffect body → setTimeout(0) macrotask → requestAnimationFrame
//       fallback. If ANY strategy succeeds the rest are no-ops thanks to
//       the v7.31 already-running guard inside start().
//   (b) Adds minimal [v35-*] console logs at four diagnostic points:
//         [v35-watch]  — each watchdog strategy attempt + outcome
//         [v35-tick]   — every 10th interval tick (less noisy than every tick)
//         [v35-loss]   — 4-sec setTimeout scheduling, firing, and elapsed ms
//         [v35-gold]   — aiBlockingCells computation (winner, cell count)
//       These let a single chrome://inspect capture identify the failure
//       mode: setTimeout-throttled, ref-still-null, useMemo-not-firing,
//       state-update-not-rendering, etc. Removed in v7.36 once diagnosed.
// v7.34: Two changes:
//   (a) Derive the AI's blocking-move cells from boardPieces + board when
//       winner === 2 and pass them to GameBoard as the new v7.14
//       `goldHighlightCells` prop. The board's most recently inserted AI
//       piece (player 2) — its 5 cells — gets the FinalBoardView-style gold
//       gradient + opacity-pulse + confetti treatment during the 4-second
//       delay before the LoseOverlay appears, so the player can see WHICH
//       move ended the game. Persists while the overlay is visible (gold
//       remains visible behind the modal).
//   (b) Stripped the [DB-Timer] diagnostic logs added in v7.32. Timer is
//       now confirmed working (interval ticks visible in v7.33 logs); the
//       logs were adding console noise. The watchdog, the split cleanup
//       useEffect, and all corrective logic stay in place — just the
//       console.log statements removed.
// v7.33: Two bugs identified from the v7.32 diagnostic logs:
//   (a) Modal-never-appears bug. The cleanup useEffect on lines tracking
//       [challenge, attemptCount, gameComplete] was calling clearTimeout on
//       blockedDelayTimeoutRef whenever ANY of those deps changed — not just
//       on unmount. The loss branch increments attemptCount right after
//       scheduling the 4-second setTimeout for setGameLost(true). That
//       attemptCount change immediately fired the cleanup, which canceled
//       the timeout. The modal never appeared.
//       Fix: split into two effects. One handles the modal-delay timeout
//       cleanup with `[]` deps (unmount only). The other handles the
//       saveTimerState side effect with the existing deps.
//   (b) Timer-never-starts bug. The v7.32 logs showed "auto-start BODY firing"
//       but no subsequent "start() called" — meaning liveTimerRef.current
//       was null at that exact moment. Later in the session pause() logs
//       did fire (and showed intervalRef=null, confirming the interval was
//       never created). React 18's documented effect order says
//       useImperativeHandle on the child runs before useEffect on the parent,
//       so the ref *should* be populated, but in this production build it
//       wasn't at that exact tick.
//       Fix: added a "watchdog" useEffect that re-evaluates whenever
//       gameStarted/gameOver/gameComplete/gameLost change, with a
//       setTimeout(0) trampoline to guarantee the LiveTimerPanel ref has
//       finished its commit-phase attachment before we touch it. This
//       effect calls start() when the game should be active and isn't.
//       Idempotent thanks to the v7.31 already-running guard in start().
// v7.32: Diagnostic build for the persistent "clock doesn't run on first
//        attempt" bug. v7.31's haveSeenGameNotOverRef filter didn't fix it,
//        which means the bug isn't an externally-observable transient
//        gameOver=true during loadPuzzle. Something else is either preventing
//        the interval from being created OR clearing it shortly after.
//        Added console.log statements (prefix '[DB-Timer]') at every key
//        event so the user can capture them via chrome://inspect with the
//        device attached and share. The logs trace:
//          - auto-start useEffect firing (with state values)
//          - startTimer/stopTimer/pauseTimer being called
//          - LiveTimerPanel start/pause/stop/setElapsed methods being invoked
//          - each interval tick (with elapsed value)
//          - check-completion effect entry (with gameOver/winner/refs)
//        No behavior change vs v7.31 — only added logging. To remove the
//        logs once we've diagnosed, search '[DB-Timer]' and delete those lines.
// v7.31: Root cause for both the "clock stays at 0:00 on first attempt" bug
//        and the "modal appears immediately after AI blocks" bug — the
//        check-puzzle-completion useEffect was firing during initial puzzle
//        load with a transient `gameOver=true, winner=2` (likely from
//        useGameState's reducer briefly producing that state during loadPuzzle
//        before its internal allowed-pieces list is populated). That fired the
//        loss branch immediately:
//          - pauseTimer() cleared the interval that auto-start had just set up
//            (→ clock stays at 0:00 for the whole "first attempt")
//          - setTimeout(setGameLost, 4000) was scheduled
//          - Four seconds later the LoseOverlay appeared even though the user
//            hadn't actually played a move
//        On retry, useGameState was already settled, so no spurious game-over,
//        so the timer worked.
//        Fix: added `haveSeenGameNotOverRef` that flips to true only once we've
//        observed gameStarted=true AND gameOver=false in the same render. The
//        check-completion effect now guards on this ref — it ignores the
//        transient initial-load game-over and only processes legitimate
//        post-play game-over transitions. Also added a safety guard inside
//        LiveTimerPanel.start() that bails out if the interval is already
//        running (prevents accidental restarts from resetting startTimeRef
//        mid-tick).
// v7.30: Two fixes:
//   (a) Bug fix: v7.29's skip-render optimization caused the clock to appear
//       frozen at "0:00" on attempts that ended within the first second. The
//       comparison Math.floor(prev/1000) === Math.floor(elapsed/1000) caused
//       every tick during the first second to bail (returning prev unchanged),
//       so React never re-rendered and state stayed at 0. On retry the
//       accumulated time was non-zero, so the first tick after retry crossed
//       a second boundary and the display advanced, giving the impression
//       that "the clock works on the second attempt but not the first."
//       Fix: switched to a 1000ms (1 Hz) setInterval and dropped the skip
//       logic entirely. Each tick advances elapsed by ~1000ms, guaranteeing a
//       real state change and a render. Same effective render rate as v7.29
//       (1 render/sec) but without the bail-out bug. Also added a defensive
//       setElapsedMs(accumulatedMsRef.current) at start() time so the state
//       is always in sync with the canonical accumulated value before ticking.
//   (b) Heat reduction: memoized the timer panel's style objects (boxShadow,
//       textShadow, scanline gradient, etc.) so they're only rebuilt when the
//       color tier changes (every 30s/60s/120s/180s), not on every panel
//       render. Cumulatively this is the cheap-but-real allocation overhead
//       that was left over from v7.29.
// v7.29: Three changes:
//   (a) Heat reduction (LiveTimerPanel): the panel still re-rendered 4× per
//       second after v7.28's parent isolation, even though the M:SS display
//       only changes once per second. setElapsedMs now returns the previous
//       reference when the displayed second hasn't changed, so React skips
//       ~75% of the panel's renders. Idle CPU drops correspondingly.
//   (b) Heat reduction (LiveTimerPanel): dropped animate-pulse from the
//       blur-md clock-icon backdrop. The pulse animated an opacity that drove
//       continuous blur filter invalidation; static blur is much cheaper.
//       The colored glow is still present, just no longer pulsing.
//   (c) UX: AI blocking move is now shown on the board for 4 seconds before
//       the LoseOverlay (Blocked modal) appears. Previously the modal covered
//       the AI's move instantly. Timer stops immediately (no time charged for
//       the visualization delay); blockedDelayTimeoutRef tracks the setTimeout
//       so it can be canceled on unmount.
// v7.28: Phone heat fix part 2 — the v7.27 fix reduced timer frequency from
//        100Hz to 4Hz, but the elapsedMs state still lived at the TOP of this
//        1500+ line component. Every state update (4×/sec) re-rendered the
//        entire tree (GameBoard, PieceTray, NeonTitle), recreating inline style
//        objects and re-running the color cascade IIFE. The JIT/GC pressure
//        kept the SoC at sustained high frequency = heat.
//        Fix: extracted LiveTimerPanel as a forwardRef child component that
//        owns elapsedMs, the setInterval, and the timer panel JSX. The parent
//        no longer re-renders on every tick — only the small LiveTimerPanel
//        does. Parent controls the timer via imperative ref API: start, stop,
//        pause, getElapsed, setElapsed. Visuals byte-identical, behavior
//        byte-identical, but idle CPU drops by ~90%.
// v7.27: Phone heat fix — timer setInterval reduced from 10ms (100 Hz) to 250ms (4 Hz).
//        The visible timer only displays M:SS (lines 1407, 1425) and the unused
//        TimerDisplay component (the only consumer of centisecond precision) is
//        dead code, so 99% of the 100/sec state updates produced identical output
//        and 99% of the renders were wasted CPU. Each tick re-rendered the full
//        screen tree (GameBoard, PieceTray, timer panel) which kept the SoC at
//        sustained high frequency and caused thermal buildup, especially with the
//        AI worker also active. Timer accuracy is unaffected — final times come
//        from Date.now() delta at stopTimer() moment, independent of interval.
//        If a live centisecond display is ever wired up (e.g., wiring up TimerDisplay
//        or showing hundredths during gameplay), bump back to ~33ms (30 Hz).
// v7.26: Title/subtitle moved to vertical side labels flanking board to save vertical space
// v7.25: Shrunk countdown timer (text-xl→text-sm, smaller padding/icons) for better title centering
// v7.24: Removed panel box around game board for visual consistency; floating background shows through
// v7.23: iOS scroll fix — removed WebkitOverflowScrolling, touchAction, changed overscrollBehavior to none
// v7.22: overflow-y-scroll (was auto) + removed overflow-hidden from outer shell
// v7.20: Fixed scroll — two-layer shell + WebkitOverflowScrolling + overscrollBehavior
//   - gameOverHandledRef guard prevents game-over effect re-firing when deps change mid-win/loss
//   - accumulatedMsRef mirrors accumulatedMs state so timer callbacks never have stale closures
//   - stopTimer/pauseTimer guard against double-calls (sessionTime grows if startTimeRef not reset)
//   - Attempt display: removed off-by-one (+1) since count is already incremented before overlay renders
// v7.18: Added confirmFlashCells for immediate cell-flash feedback on confirm tap
// v7.17: Persistent timer - saves elapsed time on reset/close, restores when returning
// UPDATED: Added full drag and drop support from piece tray and board
// UPDATED: Controls moved above piece tray, dynamic timer colors, removed duplicate home button
import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useMemo } from 'react';
import { Clock, Trophy, ArrowLeft, RotateCcw, CheckCircle, X, FlipHorizontal, Home, Move } from 'lucide-react';
import GameBoard from './GameBoard';
import PieceTray from './PieceTray';
import DPad from './DPad';
import DragOverlay from './DragOverlay';
import NeonTitle from './NeonTitle';
import { useGameState } from '../hooks/useGameState';
import { soundManager } from '../utils/soundManager';
import { weeklyChallengeService } from '../services/weeklyChallengeService';
import { streakService } from '../services/streakService';
import { streakTracker } from '../utils/streakTracker';
import { useAuth } from '../contexts/AuthContext';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import useKeyboardControls from '../hooks/useKeyboardControls';
import { getSeededPuzzle } from '../utils/puzzleGenerator';
import { PUZZLE_DIFFICULTY } from '../utils/puzzleGenerator';
import { getPieceCoords, canPlacePiece, BOARD_SIZE } from '../utils/gameLogic';

// =========================================================================
// v7.17: PERSISTENT TIMER HELPERS
// Saves/restores elapsed time so users don't lose progress on reset or close
// =========================================================================
const TIMER_STORAGE_PREFIX = 'deadblock_weekly_timer_';

const getTimerStorageKey = (challengeId) => `${TIMER_STORAGE_PREFIX}${challengeId}`;

const saveTimerState = (challengeId, elapsedMs, attemptCount) => {
  if (!challengeId) return;
  try {
    const key = getTimerStorageKey(challengeId);
    const data = {
      elapsedMs,
      attemptCount,
      savedAt: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    // console.warn('[WeeklyChallenge] Failed to save timer state:', e);
  }
};

const loadTimerState = (challengeId) => {
  if (!challengeId) return null;
  try {
    const key = getTimerStorageKey(challengeId);
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    
    // Validate data structure
    if (typeof data.elapsedMs !== 'number' || data.elapsedMs < 0) return null;
    
    // Check if saved within the last 7 days (challenge week)
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - data.savedAt > sevenDaysMs) {
      clearTimerState(challengeId);
      return null;
    }
    
    return data;
  } catch (e) {
    // console.warn('[WeeklyChallenge] Failed to load timer state:', e);
    return null;
  }
};

const clearTimerState = (challengeId) => {
  if (!challengeId) return;
  try {
    const key = getTimerStorageKey(challengeId);
    localStorage.removeItem(key);
  } catch (e) {
    // console.warn('[WeeklyChallenge] Failed to clear timer state:', e);
  }
};

// Timer display component - RED THEME
const TimerDisplay = ({ elapsedMs, isPaused }) => {
  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hundredths = Math.floor((ms % 1000) / 10);
    
    return (
      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-mono font-black text-red-300">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
        <span className="text-xl font-mono text-red-400/70">
          .{hundredths.toString().padStart(2, '0')}
        </span>
      </div>
    );
  };
  
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-2 mb-1">
        <Clock size={20} className={`${isPaused ? 'text-amber-400' : 'text-red-400'}`} />
        <span className="text-slate-400 text-sm uppercase tracking-wider">
          {isPaused ? 'Paused' : 'Time'}
        </span>
      </div>
      {formatTime(elapsedMs)}
    </div>
  );
};

// =========================================================================
// v7.28: LiveTimerPanel — owns the 4 Hz ticking state and the timer panel UI.
// Extracted from WeeklyChallengeScreen so the parent (1500+ lines with
// GameBoard, PieceTray, NeonTitle) doesn't re-render on every timer tick.
// Parent controls via imperative ref API.
// =========================================================================
const LiveTimerPanel = forwardRef((_, ref) => {
  const [elapsedMs, setElapsedMs] = useState(0);
  const accumulatedMsRef = useRef(0);
  const startTimeRef = useRef(null);
  const intervalRef = useRef(null);

  useImperativeHandle(ref, () => ({
    start: () => {
      // v7.31: Safety guard — if interval is already running, don't reset.
      // Without this, a stray repeat call to start() (e.g. from a re-fired
      // useEffect) would reset startTimeRef, dropping the partial time
      // accumulated since the last tick.
      if (intervalRef.current !== null) {
        return;
      }
      startTimeRef.current = Date.now();
      // v7.30: Defensive sync — commit the canonical accumulated value into
      // display state at start. If state already matches (the common case),
      // React bails out cheaply; if it doesn't (e.g. after a restore from
      // localStorage that ran via setTimeout after start), the display
      // catches up immediately rather than waiting for the first tick.
      const current = accumulatedMsRef.current;
      setElapsedMs(prev => prev !== current ? current : prev);
      // v7.30: 1 Hz interval, no skip-render logic. The displayed M:SS only
      // changes once per second, so this matches the visible granularity.
      // Each tick advances elapsed by ~1000ms, guaranteeing a real state
      // change and a render — no risk of bailing out the way v7.29 did.
      intervalRef.current = setInterval(() => {
        const elapsed = accumulatedMsRef.current + (Date.now() - startTimeRef.current);
        setElapsedMs(elapsed);
      }, 1000);
    },
    stop: () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (!startTimeRef.current) return accumulatedMsRef.current;
      const sessionTime = Date.now() - startTimeRef.current;
      startTimeRef.current = null;
      return accumulatedMsRef.current + sessionTime;
    },
    pause: () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (!startTimeRef.current) return accumulatedMsRef.current;
      const sessionTime = Date.now() - startTimeRef.current;
      startTimeRef.current = null;
      const newAccumulated = accumulatedMsRef.current + sessionTime;
      accumulatedMsRef.current = newAccumulated;
      setElapsedMs(newAccumulated);
      return newAccumulated;
    },
    // Read current elapsed without affecting timer state
    getElapsed: () => {
      if (!startTimeRef.current) return accumulatedMsRef.current;
      return accumulatedMsRef.current + (Date.now() - startTimeRef.current);
    },
    // Restore elapsed (e.g., from localStorage on mount)
    setElapsed: (ms) => {
      accumulatedMsRef.current = ms;
      setElapsedMs(ms);
    },
    isRunning: () => intervalRef.current !== null,
  }), []);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Color cascade — memoized so we only recompute on actual elapsed change
  const colors = useMemo(() => {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    if (totalSeconds < 30) {
      // 0-30s: Cyan (cool - great pace)
      return { timerColor: '#67e8f9', timerGlow: 'rgba(34,211,238,0.9)', borderColor: 'border-cyan-500/50', bgGradient: 'from-slate-900/95 to-cyan-950/40', iconColor: 'text-cyan-400' };
    } else if (totalSeconds < 60) {
      // 30s-1min: Green (good pace)
      return { timerColor: '#86efac', timerGlow: 'rgba(74,222,128,0.9)', borderColor: 'border-green-500/50', bgGradient: 'from-slate-900/95 to-green-950/40', iconColor: 'text-green-400' };
    } else if (totalSeconds < 120) {
      // 1-2min: Yellow (moderate)
      return { timerColor: '#fde047', timerGlow: 'rgba(250,204,21,0.9)', borderColor: 'border-yellow-500/50', bgGradient: 'from-slate-900/95 to-yellow-950/40', iconColor: 'text-yellow-400' };
    } else if (totalSeconds < 180) {
      // 2-3min: Orange (getting slow)
      return { timerColor: '#fdba74', timerGlow: 'rgba(251,146,60,0.9)', borderColor: 'border-orange-500/50', bgGradient: 'from-slate-900/95 to-orange-950/40', iconColor: 'text-orange-400' };
    } else {
      // 3min+: Red (hot - taking long)
      return { timerColor: '#fca5a5', timerGlow: 'rgba(239,68,68,0.9)', borderColor: 'border-red-500/50', bgGradient: 'from-slate-900/95 to-red-950/40', iconColor: 'text-red-400' };
    }
  }, [elapsedMs]);

  const { timerColor, timerGlow, borderColor, bgGradient, iconColor } = colors;

  // v7.30: Memoized style objects so we don't allocate new ones on every panel
  // render. These only depend on the color-tier outputs (timerColor, timerGlow)
  // which are themselves memoized on elapsedMs and change only 4 times per game
  // (at the 30s / 60s / 120s / 180s tier boundaries). Cumulatively reduces
  // per-render allocation pressure during the once-per-second ticks.
  const containerStyle = useMemo(() => ({
    boxShadow: `0 0 25px ${timerGlow.replace('0.9', '0.35')}, inset 0 0 20px ${timerGlow.replace('0.9', '0.15')}, 0 4px 15px rgba(0,0,0,0.4)`
  }), [timerGlow]);
  const scanlineStyle = useMemo(() => ({
    background: `linear-gradient(0deg, transparent 50%, ${timerGlow.replace('0.9', '0.1')} 50%)`,
    backgroundSize: '100% 4px',
    animation: 'scanline 8s linear infinite'
  }), [timerGlow]);
  const cornerStyle = useMemo(() => ({ borderColor: timerColor + '99' }), [timerColor]);
  const clockGlowStyle = useMemo(() => ({ backgroundColor: timerGlow.replace('0.9', '0.3') }), [timerGlow]);
  const digitStyle = useMemo(() => ({
    color: timerColor,
    textShadow: `0 0 12px ${timerGlow}, 0 0 25px ${timerGlow.replace('0.9', '0.5')}`
  }), [timerColor, timerGlow]);
  const colonStyle = useMemo(() => ({
    color: timerColor,
    textShadow: `0 0 8px ${timerGlow.replace('0.9', '0.8')}`
  }), [timerColor, timerGlow]);

  return (
    <div 
      className={`relative px-2.5 py-1.5 bg-gradient-to-br ${bgGradient} rounded-xl border ${borderColor} overflow-hidden transition-all duration-500`}
      style={containerStyle}
    >
      {/* Animated scan line effect */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-30"
        style={scanlineStyle}
      />
      
      {/* Corner accents with dynamic color */}
      <div className="absolute top-0 left-0 w-1.5 h-1.5 border-l-2 border-t-2 transition-colors duration-500" style={cornerStyle} />
      <div className="absolute top-0 right-0 w-1.5 h-1.5 border-r-2 border-t-2 transition-colors duration-500" style={cornerStyle} />
      <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-l-2 border-b-2 transition-colors duration-500" style={cornerStyle} />
      <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-r-2 border-b-2 transition-colors duration-500" style={cornerStyle} />
      
      <div className="relative flex items-center gap-1.5">
        {/* Animated clock icon with dynamic color */}
        <div className="relative">
          {/* v7.29: Dropped animate-pulse — pulsing opacity on a blurred element
              caused continuous blur filter invalidation. Static blur is much
              cheaper on mobile GPU and the soft glow effect is preserved. */}
          <div 
            className="absolute inset-0 rounded-full blur-md transition-colors duration-500" 
            style={clockGlowStyle}
          />
          <Clock size={14} className={`relative ${iconColor} transition-colors duration-500`} />
          {elapsedMs > 0 && (
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.8)]" />
          )}
        </div>
        
        {/* Time display with dynamic glowing digits */}
        <div className="flex items-baseline gap-0.5">
          <span 
            className="text-sm font-mono font-black tracking-tight tabular-nums transition-all duration-500"
            style={digitStyle}
          >
            {Math.floor(elapsedMs / 60000)}
          </span>
          <span 
            className="text-sm font-mono font-black animate-pulse transition-colors duration-500"
            style={colonStyle}
          >
            :
          </span>
          <span 
            className="text-sm font-mono font-black tracking-tight tabular-nums transition-all duration-500"
            style={digitStyle}
          >
            {String(Math.floor((elapsedMs % 60000) / 1000)).padStart(2, '0')}
          </span>
        </div>
      </div>
    </div>
  );
});
LiveTimerPanel.displayName = 'LiveTimerPanel';

// Success overlay when puzzle is completed - RED THEME
const SuccessOverlay = ({ completionTime, firstAttemptTime, bestTime, wasFirstAttempt, rank, onViewLeaderboard, onPlayAgain, onMenu }) => {
  const isNewBest = !bestTime || completionTime < bestTime;
  const formatTime = weeklyChallengeService.formatTime;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" 
         style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
      <div className="bg-gradient-to-br from-slate-900 via-red-950/50 to-slate-900 rounded-2xl p-6 max-w-sm w-full border border-red-500/50 shadow-[0_0_60px_rgba(239,68,68,0.4)]">
        {/* Success Icon */}
        <div className="text-center mb-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-3 animate-pulse">
            <CheckCircle size={40} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-black text-red-300">CHALLENGE COMPLETE!</h2>
        </div>
        
        {/* Times */}
        <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-red-500/20">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-slate-500 text-xs uppercase mb-1">This Run</div>
              <div className={`text-xl font-black ${isNewBest ? 'text-amber-400' : 'text-white'}`}>
                {formatTime(completionTime)}
              </div>
              {isNewBest && <div className="text-amber-400 text-xs mt-1">NEW BEST!</div>}
            </div>
            <div className="text-center">
              <div className="text-slate-500 text-xs uppercase mb-1">Best Time</div>
              <div className="text-xl font-black text-slate-300">
                {formatTime(isNewBest ? completionTime : bestTime)}
              </div>
            </div>
          </div>
        </div>
        
        {/* First attempt info */}
        {wasFirstAttempt && (
          <div className="bg-gradient-to-r from-amber-900/30 to-red-900/30 rounded-xl p-3 mb-4 border border-amber-500/30 text-center">
            <div className="text-amber-300 font-bold text-sm">⭐ First Attempt Recorded!</div>
            <div className="text-amber-500/70 text-xs mt-1">
              Your first completion time counts for the leaderboard.
            </div>
          </div>
        )}
        
        {/* Rank */}
        {rank && (
          <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-xl p-3 mb-4 border border-amber-500/30 text-center">
            <div className="flex items-center justify-center gap-2">
              <Trophy size={18} className="text-amber-400" />
              <span className="text-amber-300 font-bold">
                Current Rank: #{rank}
              </span>
            </div>
            <div className="text-amber-500/70 text-xs mt-1">Based on first attempt time</div>
          </div>
        )}
        
        {/* Buttons */}
        <div className="space-y-2">
          <button
            onClick={onViewLeaderboard}
            className="w-full p-3 rounded-xl font-bold bg-gradient-to-r from-red-500 to-rose-600 text-white hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Trophy size={18} />
            VIEW LEADERBOARD
          </button>
          
          <button
            onClick={onPlayAgain}
            className="w-full p-3 rounded-xl font-bold bg-slate-800 text-red-300 border border-red-500/30 hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw size={18} />
            {wasFirstAttempt ? 'PRACTICE RUN' : 'TRY AGAIN'}
          </button>
          
          <button
            onClick={onMenu}
            className="w-full p-3 rounded-xl font-bold bg-slate-800/50 text-slate-400 hover:text-slate-300 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} />
            BACK TO MENU
          </button>
        </div>
      </div>
    </div>
  );
};

// Lose overlay when AI wins
const LoseOverlay = ({ elapsedMs, attemptCount, isFirstAttempt, onRetry, onMenu }) => {
  const formatTime = weeklyChallengeService.formatTime;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" 
         style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 max-w-sm w-full border border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.3)]">
        {/* Icon */}
        <div className="text-center mb-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-900/30 flex items-center justify-center mb-3">
            <X size={40} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-black text-red-300">BLOCKED!</h2>
          <p className="text-slate-400 text-sm mt-2">AI found a winning move</p>
        </div>
        
        {/* Current time */}
        <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700">
          <div className="text-center">
            <div className="text-slate-500 text-xs uppercase mb-1">Time (continues on retry)</div>
            <div className="text-2xl font-black text-white">{formatTime(elapsedMs)}</div>
            {attemptCount > 0 && (
              <div className="text-slate-500 text-xs mt-1">Attempt #{attemptCount}</div>
            )}
          </div>
        </div>
        
        {/* First attempt notice */}
        {isFirstAttempt && (
          <div className="bg-amber-900/20 rounded-xl p-3 mb-4 border border-amber-500/30 text-center">
            <p className="text-amber-400 text-sm">
              Your first completion time counts for the leaderboard.
            </p>
          </div>
        )}
        
        {/* Buttons */}
        <div className="space-y-2">
          <button
            onClick={onRetry}
            className="w-full p-3 rounded-xl font-bold bg-gradient-to-r from-red-500 to-rose-600 text-white hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
          >
            <RotateCcw size={18} />
            RETRY (TIMER CONTINUES)
          </button>
          
          <button
            onClick={onMenu}
            className="w-full p-3 rounded-xl font-bold bg-slate-800/50 text-slate-400 hover:text-slate-300 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} />
            GIVE UP
          </button>
        </div>
      </div>
    </div>
  );
};

// Reusable styled button for consistent control styling across game screens
const GlowOrbButton = ({ onClick, disabled, children, color = 'cyan', className = '' }) => {
  const colorClasses = {
    cyan: 'from-cyan-500 to-blue-600 shadow-[0_0_15px_rgba(34,211,238,0.4)] hover:shadow-[0_0_25px_rgba(34,211,238,0.6)]',
    orange: 'from-orange-500 to-amber-600 shadow-[0_0_15px_rgba(249,115,22,0.4)] hover:shadow-[0_0_25px_rgba(249,115,22,0.6)]',
    green: 'from-green-500 to-emerald-600 shadow-[0_0_15px_rgba(34,197,94,0.4)] hover:shadow-[0_0_25px_rgba(34,197,94,0.6)]',
    red: 'from-red-500 to-rose-600 shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:shadow-[0_0_25px_rgba(239,68,68,0.6)]',
    purple: 'from-purple-500 to-violet-600 shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)]',
    slate: 'from-slate-600 to-slate-700 shadow-[0_0_10px_rgba(100,116,139,0.3)] hover:shadow-[0_0_15px_rgba(100,116,139,0.5)]',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        bg-gradient-to-r ${colorClasses[color]}
        text-white font-bold rounded-xl px-3 py-2 text-xs
        transition-all duration-200
        hover:scale-105 active:scale-95
        disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none
        flex items-center justify-center gap-1
        ${className}
      `}
    >
      {children}
    </button>
  );
};

const WeeklyChallengeScreen = ({ challenge, onMenu, onMainMenu, onLeaderboard }) => {
  const { profile } = useAuth();
  const { needsScroll, isMobile } = useResponsiveLayout(650);
  
  // Game state
  const [puzzle, setPuzzle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [gameLost, setGameLost] = useState(false);
  // v7.28: Timer state (elapsedMs, accumulatedMs, accumulatedMsRef, startTimeRef,
  // timerRef) has all moved into <LiveTimerPanel>. Parent only keeps a ref to
  // control the panel imperatively, plus finalElapsedMs for the lose overlay
  // (frozen time, captured at game-over).
  const [finalElapsedMs, setFinalElapsedMs] = useState(0);
  const [completionTime, setCompletionTime] = useState(null);
  const [firstAttemptTime, setFirstAttemptTime] = useState(null);
  const [bestTime, setBestTime] = useState(null);
  const [isFirstAttempt, setIsFirstAttempt] = useState(true);
  const [wasFirstAttempt, setWasFirstAttempt] = useState(false);
  const [currentRank, setCurrentRank] = useState(null);
  const [attemptCount, setAttemptCount] = useState(0);
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const [confirmFlashCells, setConfirmFlashCells] = useState(null); // v7.18: Immediate flash on confirm tap
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isValidDrop, setIsValidDrop] = useState(false);
  const [dragPreviewCell, setDragPreviewCell] = useState(null); // v7.22: For board preview during drag
  const [pieceCellOffset, setPieceCellOffset] = useState({ row: 0, col: 0 }); // Which cell of piece is under finger
  
  // Refs
  // v7.28: liveTimerRef gives us imperative access to LiveTimerPanel's
  // start/stop/pause/getElapsed/setElapsed. Replaces the previous timerRef +
  // startTimeRef + accumulatedMsRef trio that lived directly in the parent.
  const liveTimerRef = useRef(null);
  // v7.29: Tracks the 4-second setTimeout that defers the LoseOverlay so the
  // player can see the AI's blocking move before the modal covers it. Cleared
  // on unmount to prevent setState-on-unmounted warnings.
  const blockedDelayTimeoutRef = useRef(null);
  // v7.31: Filters out the transient gameOver=true that useGameState produces
  // during initial loadPuzzle. Flips to true only after we've observed
  // gameStarted=true AND gameOver=false together in a render — only then is
  // any subsequent gameOver transition treated as a legitimate end-of-game.
  const haveSeenGameNotOverRef = useRef(false);
  const gameOverHandledRef = useRef(false); // Prevents game-over effect re-firing when deps change (e.g. attemptCount increment)
  const boardRef = useRef(null);
  const boardBoundsRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const hasDragStartedRef = useRef(false);
  
  // CRITICAL: Cleanup body scroll on unmount to prevent scroll issues
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, []);
  
  // v7.17: Save timer state on browser/tab close
  // v7.28: Read current elapsed from LiveTimerPanel via ref instead of inlined refs.
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (challenge?.id && gameStarted && !gameComplete && liveTimerRef.current?.isRunning()) {
        const currentTime = liveTimerRef.current.getElapsed();
        saveTimerState(challenge.id, currentTime, attemptCount);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [challenge, gameStarted, gameComplete, attemptCount]);
  
  // Game state from hook
  const {
    board,
    boardPieces,
    currentPlayer,
    selectedPiece,
    rotation,
    flipped,
    gameOver,
    winner,
    usedPieces,
    pendingMove,
    handleCellClick,
    confirmMove,
    cancelMove,
    movePendingPiece,
    selectPiece,
    rotatePiece,
    flipPiece,
    loadPuzzle,
    resetCurrentPuzzle,
    setPendingMove,
    setFastAIMode,
  } = useGameState();
  
  // v7.36: Track the AI's most recent move via board-state diffing. Replaces
  // the v7.34 boardPieces-iteration approach which was order-dependent and
  // failed when boardPieces is a 2D array (spatial != chronological order).
  // Diffing `board` snapshots directly identifies cells that just became
  // AI-owned (player=2) on each render — those ARE the AI's last move,
  // regardless of board layout. Reset to null on empty board (retry/reset).
  const [lastAiMoveCells, setLastAiMoveCells] = useState(null);
  const prevBoardRef = useRef(null);

  useEffect(() => {
    if (!Array.isArray(board)) return;

    // Detect empty board (retry/reset) — clear the tracked move so the
    // next AI placement gets captured cleanly rather than inheriting stale
    // data. setLastAiMoveCells(null) when already null is a no-op (React
    // bails out on identity-equal updates).
    let hasAnyCell = false;
    for (let r = 0; r < board.length && !hasAnyCell; r++) {
      const row = board[r];
      if (!Array.isArray(row)) continue;
      for (let c = 0; c < row.length; c++) {
        if (row[c]) { hasAnyCell = true; break; }
      }
    }
    if (!hasAnyCell) {
      setLastAiMoveCells(null);
      prevBoardRef.current = board;
      return;
    }

    const prev = prevBoardRef.current;
    if (prev) {
      const newAiCells = [];
      for (let r = 0; r < board.length; r++) {
        const row = board[r];
        if (!Array.isArray(row)) continue;
        for (let c = 0; c < row.length; c++) {
          if (row[c] === 2 && prev[r]?.[c] !== 2) {
            newAiCells.push({ row: r, col: c });
          }
        }
      }
      if (newAiCells.length > 0) {
        setLastAiMoveCells(newAiCells);
      }
    }
    prevBoardRef.current = board;
  }, [board]);

  // Gate on winner so the highlight only renders when the game ended in a
  // loss (winner=2). useMemo stabilizes the prop identity so GameBoard
  // doesn't re-render whenever lastAiMoveCells's wrapper reference changes
  // but winner stays null.
  const aiBlockingCells = useMemo(
    () => (winner === 2 ? lastAiMoveCells : null),
    [winner, lastAiMoveCells]
  );
  
  // Enable fast AI mode for weekly challenge (instant AI moves)
  useEffect(() => {
    setFastAIMode(true);
    return () => setFastAIMode(false); // Reset on unmount
  }, [setFastAIMode]);
  
  // WASD + R/F keyboard controls for desktop
  useKeyboardControls({
    onMove: movePendingPiece,
    onRotate: rotatePiece,
    onFlip: flipPiece,
    enabled: !gameOver && gameStarted,
  });
  
  // Helper to check if pending piece has cells off the grid
  const isPieceOffGrid = pendingMove ? (() => {
    const coords = getPieceCoords(pendingMove.piece, rotation, flipped);
    return coords.some(([dx, dy]) => {
      const cellRow = pendingMove.row + dy;
      const cellCol = pendingMove.col + dx;
      return cellRow < 0 || cellRow >= BOARD_SIZE || cellCol < 0 || cellCol >= BOARD_SIZE;
    });
  })() : false;
  
  // =========================================================================
  // DRAG AND DROP HANDLERS - FIXED WITH DIAGNOSTIC LOGGING
  // =========================================================================
  
  const DRAG_THRESHOLD = 8;
  const SCROLL_ANGLE_THRESHOLD = 60;
  
  // Track which cell of the piece is under the finger
  const pieceCellOffsetRef = useRef({ row: 0, col: 0 });
  
  // Refs for global touch handlers - allows immediate attachment/detachment
  const globalTouchHandlersRef = useRef({ move: null, end: null, cancel: null });
  
  // Refs to store latest callback functions (avoids stale closure issues)
  const updateDragRef = useRef(null);
  const endDragRef = useRef(null);
  
  // CRITICAL: Use ref for isDragging to avoid stale closure issues
  // State updates are async, but refs update synchronously
  const isDraggingRef = useRef(false);
  const draggedPieceRef = useRef(null);
  const dragCellRef = useRef(null); // v7.22: Store current cell during drag
  
  // Calculate which cell of the piece was touched
  const calculateTouchedPieceCell = useCallback((piece, touchX, touchY, elementRect, currentRotation, currentFlipped) => {
    if (!elementRect || !piece) return { row: 0, col: 0 };
    
    const coords = getPieceCoords(piece, currentRotation, currentFlipped);
    if (!coords || coords.length === 0) return { row: 0, col: 0 };
    
    const minX = Math.min(...coords.map(([x]) => x));
    const maxX = Math.max(...coords.map(([x]) => x));
    const minY = Math.min(...coords.map(([, y]) => y));
    const maxY = Math.max(...coords.map(([, y]) => y));
    
    const pieceCols = maxX - minX + 1;
    const pieceRows = maxY - minY + 1;
    
    const relX = (touchX - elementRect.left) / elementRect.width;
    const relY = (touchY - elementRect.top) / elementRect.height;
    
    const cellCol = Math.floor(relX * pieceCols) + minX;
    const cellRow = Math.floor(relY * pieceRows) + minY;
    
    let closestCell = { row: 0, col: 0 };
    let minDist = Infinity;
    
    for (const [x, y] of coords) {
      const dist = Math.abs(x - cellCol) + Math.abs(y - cellRow);
      if (dist < minDist) {
        minDist = dist;
        closestCell = { row: y, col: x };
      }
    }
    
    return closestCell;
  }, []);

  // Calculate which board cell the drag position is over
  // Allow positions outside the board for pieces that extend beyond their anchor
  const calculateBoardCell = useCallback((clientX, clientY) => {
    if (!boardBoundsRef.current) return null;
    
    const { left, top, width, height } = boardBoundsRef.current;
    const cellWidth = width / BOARD_SIZE;
    const cellHeight = height / BOARD_SIZE;
    
    // Match DragOverlay fingerOffset - piece is shown above finger
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const fingerOffset = isMobile ? 40 : 20;
    
    const relX = clientX - left;
    const relY = (clientY - fingerOffset) - top;
    
    // Raw cell under finger (adjusted for fingerOffset only)
    // Note: Do NOT adjust by pieceCellOffsetRef here - updateDrag handles centering
    const col = Math.floor(relX / cellWidth);
    const row = Math.floor(relY / cellHeight);
    
    // Allow anchor position up to 4 cells outside board for piece extension
    const EXTENSION_MARGIN = 4;
    if (row >= -EXTENSION_MARGIN && row < BOARD_SIZE + EXTENSION_MARGIN && 
        col >= -EXTENSION_MARGIN && col < BOARD_SIZE + EXTENSION_MARGIN) {
      return { row, col };
    }
    
    return null;
  }, []);

  // Detach global touch handlers
  const detachGlobalTouchHandlers = useCallback(() => {
    const { move, end, cancel } = globalTouchHandlersRef.current;
    if (move) window.removeEventListener('touchmove', move);
    if (end) window.removeEventListener('touchend', end);
    if (cancel) window.removeEventListener('touchcancel', cancel);
    globalTouchHandlersRef.current = { move: null, end: null, cancel: null };
  }, []);

  // Attach global touch handlers SYNCHRONOUSLY (must be called during touch event)
  const attachGlobalTouchHandlers = useCallback(() => {
    // Detach any existing handlers first
    detachGlobalTouchHandlers();
    
    const handleTouchMove = (e) => {
      if (!isDraggingRef.current) return;
      
      const touch = e.touches?.[0];
      if (!touch) return;
      
      // Update drag position
      setDragPosition({ x: touch.clientX, y: touch.clientY });
      
      // Update board bounds
      if (boardRef.current) {
        boardBoundsRef.current = boardRef.current.getBoundingClientRect();
      }
      
      // Calculate board cell and preview INLINE (like GameScreen)
      if (boardBoundsRef.current && draggedPieceRef.current) {
        const { left, top, width, height } = boardBoundsRef.current;
        const cellWidth = width / BOARD_SIZE;
        const cellHeight = height / BOARD_SIZE;
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
        const fingerOffset = isMobile ? 40 : 20;
        
        const relX = touch.clientX - left;
        const relY = (touch.clientY - fingerOffset) - top;
        
        const col = Math.floor(relX / cellWidth);
        const row = Math.floor(relY / cellHeight);
        
        const EXTENSION_MARGIN = 4;
        if (row >= -EXTENSION_MARGIN && row < BOARD_SIZE + EXTENSION_MARGIN && 
            col >= -EXTENSION_MARGIN && col < BOARD_SIZE + EXTENSION_MARGIN) {
          // Get piece coordinates to calculate center offset
          const coords = getPieceCoords(draggedPieceRef.current, rotation, flipped);
          
          const minX = Math.min(...coords.map(([x]) => x));
          const maxX = Math.max(...coords.map(([x]) => x));
          const minY = Math.min(...coords.map(([, y]) => y));
          const maxY = Math.max(...coords.map(([, y]) => y));
          
          const centerOffsetCol = Math.floor((maxX + minX) / 2);
          const centerOffsetRow = Math.floor((maxY + minY) / 2);
          
          const adjustedRow = row - centerOffsetRow;
          const adjustedCol = col - centerOffsetCol;
          
          // Store in ref for endDrag to access synchronously
          dragCellRef.current = { row: adjustedRow, col: adjustedCol };
          setDragPreviewCell({ row: adjustedRow, col: adjustedCol });
          
          const valid = canPlacePiece(board, adjustedRow, adjustedCol, coords);
          setIsValidDrop(valid);
        } else {
          dragCellRef.current = null;
          setDragPreviewCell(null);
          setIsValidDrop(false);
        }
      }
      
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      if (!isDraggingRef.current) return;
      
      // Call endDrag via ref to properly set pendingMove
      endDragRef.current?.();
      
      // Clean up listeners
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
      globalTouchHandlersRef.current = { move: null, end: null, cancel: null };
    };
    
    const handleTouchCancel = () => {
      if (!isDraggingRef.current) return;
      
      endDragRef.current?.();
      
      // Clean up listeners
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
      globalTouchHandlersRef.current = { move: null, end: null, cancel: null };
    };

    globalTouchHandlersRef.current = { move: handleTouchMove, end: handleTouchEnd, cancel: handleTouchCancel };
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchCancel);
  }, [rotation, flipped, board, detachGlobalTouchHandlers]);

  // Update drag position and check validity
  const updateDrag = useCallback((clientX, clientY) => {
    // Use state OR refs for guards - support both patterns
    if (!isDragging && !isDraggingRef.current) return;
    if (!draggedPiece && !draggedPieceRef.current) return;
    
    const piece = draggedPiece || draggedPieceRef.current;
    
    setDragPosition({ x: clientX, y: clientY });
    
    // Update board bounds
    if (boardRef.current) {
      boardBoundsRef.current = boardRef.current.getBoundingClientRect();
    }
    
    const cell = calculateBoardCell(clientX, clientY);
    if (cell && piece) {
      // Get piece coordinates to calculate center offset
      const coords = getPieceCoords(piece, rotation, flipped);
      
      // Calculate piece bounds
      const minX = Math.min(...coords.map(([x]) => x));
      const maxX = Math.max(...coords.map(([x]) => x));
      const minY = Math.min(...coords.map(([, y]) => y));
      const maxY = Math.max(...coords.map(([, y]) => y));
      
      // Calculate center offset (piece anchor is at 0,0, we want center under finger)
      const centerOffsetCol = Math.floor((maxX + minX) / 2);
      const centerOffsetRow = Math.floor((maxY + minY) / 2);
      
      // Offset the cell so piece CENTER is under finger, not anchor
      const adjustedRow = cell.row - centerOffsetRow;
      const adjustedCol = cell.col - centerOffsetCol;
      
      dragCellRef.current = { row: adjustedRow, col: adjustedCol };
      
      // v7.22: Update dragPreviewCell for live board preview
      setDragPreviewCell({ row: adjustedRow, col: adjustedCol });
      
      const valid = canPlacePiece(board, adjustedRow, adjustedCol, coords);
      setIsValidDrop(valid);
    } else {
      dragCellRef.current = null;
      setDragPreviewCell(null);
      setIsValidDrop(false);
    }
  }, [isDragging, draggedPiece, rotation, flipped, board, calculateBoardCell]);

  // End drag - keep pending move for confirmation
  const endDrag = useCallback(() => {
    // Check if we were actually dragging
    const wasDragging = isDragging || isDraggingRef.current || hasDragStartedRef.current;
    if (!wasDragging) return;
    
    // Set pendingMove from dragCellRef (sync) or dragPreviewCell (state)
    // dragCellRef is more reliable as it's updated synchronously in global handlers
    const piece = draggedPiece || draggedPieceRef.current;
    const cell = dragCellRef.current || dragPreviewCell;
    
    if (cell && piece) {
      const coords = getPieceCoords(piece, rotation, flipped);
      setPendingMove({
        piece,
        row: cell.row,
        col: cell.col,
        coords
      });
    }
    
    // Clear refs
    isDraggingRef.current = false;
    draggedPieceRef.current = null;
    hasDragStartedRef.current = false;
    pieceCellOffsetRef.current = { row: 0, col: 0 };
    dragCellRef.current = null;
    
    // Clear state
    setIsDragging(false);
    setDraggedPiece(null);
    setDragPosition({ x: 0, y: 0 });
    setDragOffset({ x: 0, y: 0 });
    setIsValidDrop(false);
    setDragPreviewCell(null);
    setPieceCellOffset({ row: 0, col: 0 });
    
    // Re-enable scroll
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  }, [isDragging, dragPreviewCell, draggedPiece, rotation, flipped]);

  // CRITICAL: Update refs SYNCHRONOUSLY (not in useEffect) to avoid race conditions
  // This ensures refs are always current when touch handlers fire
  updateDragRef.current = updateDrag;
  endDragRef.current = endDrag;

  // Helper function to start drag
  const startDrag = useCallback((piece, clientX, clientY, elementRect) => {
    // Guard against duplicate calls
    if (hasDragStartedRef.current) return;
    if (gameOver || usedPieces.includes(piece) || !gameStarted) return;
    if (currentPlayer === 2) return; // Don't allow drag during AI turn
    
    // Set refs FIRST (synchronous) - these are checked by handlers
    hasDragStartedRef.current = true;
    isDraggingRef.current = true;
    draggedPieceRef.current = piece;
    
    // CRITICAL: Attach global touch handlers SYNCHRONOUSLY
    attachGlobalTouchHandlers();
    
    // Set pieceCellOffset to 0,0 for tray drags (updateDrag handles centering)
    pieceCellOffsetRef.current = { row: 0, col: 0 };
    setPieceCellOffset({ row: 0, col: 0 });
    
    if (boardRef.current) {
      boardBoundsRef.current = boardRef.current.getBoundingClientRect();
    }
    
    const offsetX = elementRect ? clientX - (elementRect.left + elementRect.width / 2) : 0;
    const offsetY = elementRect ? clientY - (elementRect.top + elementRect.height / 2) : 0;
    
    // Update state (async, triggers re-render)
    setDraggedPiece(piece);
    setDragPosition({ x: clientX, y: clientY });
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
    
    // Select piece - this plays sound, don't play again
    selectPiece(piece);
    if (setPendingMove) setPendingMove(null);
    
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }, [gameOver, usedPieces, gameStarted, currentPlayer, selectPiece, setPendingMove, attachGlobalTouchHandlers]);

  // Create drag handlers for piece tray
  const createDragHandlers = useCallback((piece) => {
    if (gameOver || usedPieces.includes(piece) || !gameStarted) {
      return {};
    }
    if (currentPlayer === 2) return {}; // Don't allow drag during AI turn

    let elementRect = null;

    // Touch start - start drag immediately (touch-action: none prevents scrolling)
    const handleTouchStart = (e) => {
      if (hasDragStartedRef.current) return; // Guard against double-start
      
      const touch = e.touches?.[0];
      if (!touch) return;
      
      // Capture element rect
      elementRect = e.currentTarget?.getBoundingClientRect() || null;
      
      // Update board bounds for drop detection
      if (boardRef?.current) {
        boardBoundsRef.current = boardRef.current.getBoundingClientRect();
      }
      
      // Start drag immediately
      startDrag(piece, touch.clientX, touch.clientY, elementRect);
    };

    // Touch move - call updateDrag directly (matching GameScreen pattern)
    const handleTouchMove = (e) => {
      if (hasDragStartedRef.current && e.touches?.[0]) {
        e.preventDefault();
        updateDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    // Touch end - call endDrag directly (matching GameScreen pattern)
    const handleTouchEnd = (e) => {
      if (hasDragStartedRef.current) {
        e.preventDefault();
        endDrag();
      }
    };

    // Mouse handlers for desktop
    const handleMouseDown = (e) => {
      if (e.button !== 0) return;
      if (hasDragStartedRef.current) return;
      
      elementRect = e.currentTarget?.getBoundingClientRect() || null;
      
      if (boardRef?.current) {
        boardBoundsRef.current = boardRef.current.getBoundingClientRect();
      }
      
      startDrag(piece, e.clientX, e.clientY, elementRect);
    };

    return {
      onMouseDown: handleMouseDown,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    };
  }, [gameOver, usedPieces, gameStarted, currentPlayer, startDrag, updateDrag, endDrag]);

  // Handle dragging from board (moving pending piece)
  const handleBoardDragStart = useCallback((piece, clientX, clientY, elementRect) => {
    // Guard against duplicate calls
    if (hasDragStartedRef.current) return;
    if (gameOver || !gameStarted) return;
    if (currentPlayer === 2) return; // Don't allow drag during AI turn
    if (!pendingMove || pendingMove.piece !== piece) return;
    
    // v7.22: Set ALL refs FIRST (synchronous) - these are checked by handlers
    hasDragStartedRef.current = true;
    isDraggingRef.current = true;
    draggedPieceRef.current = piece;
    
    // v7.22: CRITICAL - Attach global touch handlers IMMEDIATELY
    attachGlobalTouchHandlers();
    
    // Update board bounds
    if (boardRef.current) {
      boardBoundsRef.current = boardRef.current.getBoundingClientRect();
    }
    
    // v7.22: Calculate which cell of the piece was touched using touch position
    if (pendingMove && boardBoundsRef.current) {
      const { left, top, width, height } = boardBoundsRef.current;
      const cellWidth = width / BOARD_SIZE;
      const cellHeight = height / BOARD_SIZE;
      
      // Get the board cell directly under the finger
      const fingerCol = Math.floor((clientX - left) / cellWidth);
      const fingerRow = Math.floor((clientY - top) / cellHeight);
      
      // Calculate offset from piece anchor to touched cell
      const offset = {
        row: fingerRow - pendingMove.row,
        col: fingerCol - pendingMove.col
      };
      pieceCellOffsetRef.current = offset;
      setPieceCellOffset(offset);
    } else {
      pieceCellOffsetRef.current = { row: 0, col: 0 };
      setPieceCellOffset({ row: 0, col: 0 });
    }
    
    // v7.22: DON'T clear pending move - keep it in DOM to prevent touch cancel
    
    const offsetX = elementRect ? clientX - (elementRect.left + elementRect.width / 2) : 0;
    const offsetY = elementRect ? clientY - (elementRect.top + elementRect.height / 2) : 0;
    
    // Update React state (async, triggers re-render)
    setDraggedPiece(piece);
    setDragPosition({ x: clientX, y: clientY });
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
    
    // Select piece - plays sound
    selectPiece(piece);
    
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }, [gameOver, gameStarted, currentPlayer, pendingMove, selectPiece, attachGlobalTouchHandlers]);

  // v7.18: Wrapper around hook's confirmMove to fire immediate cell-flash feedback
  const handleConfirmMove = useCallback(() => {
    if (pendingMove) {
      const coords = getPieceCoords(pendingMove.piece, rotation, flipped);
      const flashCells = coords.map(([dx, dy]) => ({
        row: pendingMove.row + dy,
        col: pendingMove.col + dx,
      })).filter(c => c.row >= 0 && c.row < 8 && c.col >= 0 && c.col < 8);
      setConfirmFlashCells(flashCells);
      setTimeout(() => setConfirmFlashCells(null), 400);
    }
    confirmMove();
  }, [pendingMove, rotation, flipped, confirmMove]);

  // Global mouse handlers for desktop drag
  useEffect(() => {
    if (!isDragging) return;
    
    const handleGlobalMove = (e) => {
      updateDrag(e.clientX, e.clientY);
    };
    
    const handleGlobalEnd = () => {
      endDrag();
    };
    
    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalEnd);
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalEnd);
    };
  }, [isDragging, updateDrag, endDrag]);

  // Global touch handlers (backup for synchronous handlers)
  useEffect(() => {
    if (!isDragging) return;
    
    const handleTouchMove = (e) => {
      if (e.touches?.[0]) {
        updateDrag(e.touches[0].clientX, e.touches[0].clientY);
        if (e.cancelable) e.preventDefault();
      }
    };
    
    const handleTouchEnd = () => endDrag();
    const handleTouchCancel = () => endDrag();
    
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchCancel);
    
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [isDragging, updateDrag, endDrag]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      detachGlobalTouchHandlers();
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [detachGlobalTouchHandlers]);
  
  // =========================================================================
  // TIMER AND GAME LOGIC
  // =========================================================================
  
  // Load the puzzle
  useEffect(() => {
    const loadWeeklyPuzzle = async () => {
      if (!challenge || !challenge.id) {
        console.error('[WeeklyChallengeScreen] No challenge provided');
        setLoadError('Challenge data not available. Please go back and try again.');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setLoadError(null);
      
      try {
        const seed = weeklyChallengeService.generatePuzzleSeed(challenge);
        
        const puzzleData = await getSeededPuzzle(seed, PUZZLE_DIFFICULTY.HARD);
        
        if (puzzleData) {
          setPuzzle(puzzleData);
        } else {
          setLoadError('Failed to generate puzzle. Please try again.');
        }
        
        const { data: existingResult } = await weeklyChallengeService.getUserResult(challenge.id);
        if (existingResult) {
          setFirstAttemptTime(existingResult.first_attempt_time_ms);
          setBestTime(existingResult.best_time_ms || existingResult.completion_time_ms);
          setIsFirstAttempt(false);
        }
        
        // v7.17: Restore saved timer state if user previously left mid-challenge
        // v7.28: Push restored value into LiveTimerPanel via ref instead of using
        // parent state (which no longer exists).
        const savedTimer = loadTimerState(challenge.id);
        if (savedTimer) {
          // Defer setElapsed to next tick so LiveTimerPanel's ref is populated
          // (ref is set during the panel's mount, which happens after this effect
          // runs on first puzzle load).
          setTimeout(() => {
            liveTimerRef.current?.setElapsed(savedTimer.elapsedMs);
          }, 0);
          setAttemptCount(savedTimer.attemptCount || 0);
          // console.log('[WeeklyChallenge] Restored timer:', savedTimer.elapsedMs, 'ms');
        }
      } catch (err) {
        console.error('Error loading weekly puzzle:', err);
        setLoadError('Failed to load puzzle: ' + (err.message || 'Unknown error'));
      }
      
      setLoading(false);
    };
    
    loadWeeklyPuzzle();
  }, [challenge]);
  
  // v7.28: Timer control delegates — actual timer state lives in <LiveTimerPanel>,
  // accessed via liveTimerRef. All logic (interval, accumulated math) moved there;
  // these wrappers preserve the existing call sites (startTimer/stopTimer/pauseTimer)
  // so the rest of the component code didn't need to be touched.
  const startTimer = useCallback(() => {
    liveTimerRef.current?.start();
  }, []);
  
  // Stop the timer — returns final elapsed for completionTime recording
  const stopTimer = useCallback(() => {
    return liveTimerRef.current?.stop() ?? 0;
  }, []);
  
  // Pause the timer — returns accumulated elapsed for saveTimerState writes
  const pauseTimer = useCallback(() => {
    return liveTimerRef.current?.pause() ?? 0;
  }, []);
  
  // Auto-start the game when puzzle is loaded
  useEffect(() => {
    if (puzzle && !loading && !loadError && !gameStarted && loadPuzzle) {
      // v7.31: Reset the filter so a transient gameOver=true during loadPuzzle
      // is ignored. It flips back to true only when gameOver=false is observed.
      haveSeenGameNotOverRef.current = false;
      loadPuzzle(puzzle);
      setGameStarted(true);
      startTimer();
      soundManager.playClickSound('success');
    }
  }, [puzzle, loading, loadError, gameStarted, loadPuzzle, startTimer]);
  
  // Check for puzzle completion
  useEffect(() => {
    // Reset guard when game is not over so next game-over is handled
    if (!gameOver) {
      gameOverHandledRef.current = false;
      // v7.31: Mark that we've seen the post-load steady state. From now on,
      // any gameOver=true transition is considered legitimate (user has had
      // at least one render of actual gameplay).
      if (gameStarted) {
        haveSeenGameNotOverRef.current = true;
      }
      return;
    }
    if (!gameStarted) return;
    // v7.31: Filter out the spurious gameOver=true that useGameState produces
    // during initial loadPuzzle. Without this, the loss branch fires before
    // the player has done anything — pauseTimer kills the just-created
    // interval (clock freezes at 0:00) and the 4-second setTimeout for
    // setGameLost(true) makes the "Blocked" modal appear unbidden.
    if (!haveSeenGameNotOverRef.current) {
      return;
    }
    // Guard: prevent re-firing when deps change mid-win/loss (stopTimer/pauseTimer recreation,
    // attemptCount increment, etc. would all cause this effect to re-run without this guard)
    if (gameOverHandledRef.current) return;
    gameOverHandledRef.current = true;

    if (winner === 1) {
        const finalTime = stopTimer();
        setCompletionTime(finalTime);
        setWasFirstAttempt(isFirstAttempt);
        setGameComplete(true);
        soundManager.playPuzzleSolvedSound();
        submitResult(finalTime);
        
        // v7.17: Clear saved timer state on successful completion
        if (challenge?.id) {
          clearTimerState(challenge.id);
        }
        
        // v7.15.2: Record daily play for streak tracking
        streakTracker.recordPlay();
        
        // v7.12: Update play streak
        try {
          const cachedProfile = localStorage.getItem('deadblock_profile_cache');
          if (cachedProfile) {
            const { profile } = JSON.parse(cachedProfile);
            if (profile?.id) {
              streakService.updateStreak(profile.id).then(({ data }) => {
                if (data?.new_achievements?.length > 0) {
                  // console.log('[WeeklyChallenge] New streak achievements:', data.new_achievements);
                }
              });
            }
          }
        } catch (err) {
          // console.warn('[WeeklyChallenge] Failed to update streak:', err);
        }
      } else if (winner === 2) {
        const pausedTime = pauseTimer();
        // v7.28: Capture frozen time for LoseOverlay (was reading parent's live
        // elapsedMs state, which no longer exists since the timer state moved
        // into LiveTimerPanel).
        setFinalElapsedMs(pausedTime);
        // v7.29: Defer the LoseOverlay by 4 seconds so the AI's blocking move
        // is visible on the board first. Timer is already stopped above (no
        // time charged for the delay). Ref tracks the timeout so we can cancel
        // on unmount.
        if (blockedDelayTimeoutRef.current) clearTimeout(blockedDelayTimeoutRef.current);
        blockedDelayTimeoutRef.current = setTimeout(() => {
          setGameLost(true);
          soundManager.playGameOver();
          blockedDelayTimeoutRef.current = null;
        }, 4000);
        // Use functional updater so saveTimerState receives the correct post-increment count
        setAttemptCount(prev => {
          const next = prev + 1;
          if (challenge?.id) {
            saveTimerState(challenge.id, pausedTime, next);
          }
          return next;
        });
      }
  // stopTimer/pauseTimer are now stable (no deps) so omitting them is safe.
  // attemptCount removed — its increment was the original cause of the re-fire loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver, winner, gameStarted, isFirstAttempt, challenge]);
  
  // Submit result
  const submitResult = async (timeMs) => {
    try {
      const { data } = await weeklyChallengeService.submitResult(challenge.id, timeMs, isFirstAttempt);
      
      if (data) {
        if (isFirstAttempt) {
          setFirstAttemptTime(timeMs);
          setIsFirstAttempt(false);
        }
        
        if (!bestTime || timeMs < bestTime) {
          setBestTime(timeMs);
        }
        
        const { rank } = await weeklyChallengeService.getUserRank(challenge.id);
        setCurrentRank(rank);
      }
    } catch (err) {
      console.error('Error submitting result:', err);
    }
  };
  
  // Retry after loss
  const handleRetryAfterLoss = useCallback(() => {
    // v7.31: Reset the load-filter so any transient gameOver during the
    // puzzle-reset sequence is ignored. Matches the auto-start handling.
    haveSeenGameNotOverRef.current = false;
    gameOverHandledRef.current = false; // allow next game-over to be processed
    resetCurrentPuzzle();
    setGameLost(false);
    startTimer();
    soundManager.playClickSound('success');
  }, [resetCurrentPuzzle, startTimer]);
  
  // Full restart - v7.17: Timer continues, saves state
  // v7.28: All direct timer ref manipulation replaced with liveTimerRef calls.
  // pause() returns the captured elapsed; setElapsed() seeds it for the next session.
  const handleRestart = useCallback(() => {
    const currentTime = liveTimerRef.current?.pause() ?? 0;
    
    if (challenge?.id) {
      saveTimerState(challenge.id, currentTime, attemptCount);
    }
    
    resetCurrentPuzzle();
    setGameComplete(false);
    setGameLost(false);
    setCompletionTime(null);
    setWasFirstAttempt(false);
    
    // Re-seed the timer with the accumulated time so the next start() resumes from there
    liveTimerRef.current?.setElapsed(currentTime);
    gameOverHandledRef.current = false; // allow next game-over to be processed
    // v7.31: Reset the load-filter so any transient gameOver during the
    // puzzle-reset sequence is ignored on the next play.
    haveSeenGameNotOverRef.current = false;
    
    setGameStarted(false);
  }, [resetCurrentPuzzle, attemptCount, challenge]);
  
  // View leaderboard
  const handleViewLeaderboard = () => {
    soundManager.playButtonClick();
    onLeaderboard(challenge);
  };
  
  // v7.17: Go to menu - saves timer state before navigating away
  // v7.28: Use liveTimerRef for both getElapsed (saving) and stop (cleanup).
  const handleGoToMenu = useCallback(() => {
    soundManager.playButtonClick();
    
    if (challenge?.id && !gameComplete) {
      const currentTime = liveTimerRef.current?.getElapsed() ?? 0;
      saveTimerState(challenge.id, currentTime, attemptCount);
    }
    
    // Stop the interval cleanly before navigating away
    liveTimerRef.current?.stop();
    
    (onMainMenu || onMenu)();
  }, [challenge, gameComplete, attemptCount, onMainMenu, onMenu]);
  
  // Cleanup - v7.17: Save timer state on unmount
  // v7.28: LiveTimerPanel cleans up its own interval via its useEffect cleanup.
  // We only need to capture the elapsed for saveTimerState if mid-game.
  // v7.33: Split the previous combined cleanup into two effects.
  // Effect 1: cancel the blocked-modal setTimeout on UNMOUNT ONLY. Empty deps
  // means the cleanup never re-fires during the component's lifetime. (The
  // previous combined effect re-fired its cleanup whenever attemptCount
  // changed — which is exactly what the loss branch does right after
  // scheduling the modal timeout — silently canceling it.)
  useEffect(() => {
    return () => {
      if (blockedDelayTimeoutRef.current) {
        clearTimeout(blockedDelayTimeoutRef.current);
        blockedDelayTimeoutRef.current = null;
      }
    };
  }, []);

  // Effect 2: save timer state when challenge/attemptCount/gameComplete deps
  // shift OR on unmount. Same behavior as before for this branch.
  useEffect(() => {
    return () => {
      if (challenge?.id && !gameComplete && liveTimerRef.current?.isRunning()) {
        const currentTime = liveTimerRef.current.getElapsed();
        saveTimerState(challenge.id, currentTime, attemptCount);
      }
    };
  }, [challenge, attemptCount, gameComplete]);
  
  // v7.35: Multi-strategy timer-start watchdog (extends v7.33). Cascades
  // through three start-attempt strategies for Capacitor-Android-WebView
  // compatibility, since one of them may resolve a timing edge case that
  // Chrome desktop hides:
  //   (1) Synchronous — try start() immediately. If LiveTimerPanel's
  //       useImperativeHandle has already attached the ref by the time this
  //       useEffect fires, we never need the deferred strategies.
  //   (2) setTimeout(0) — macrotask defer (v7.33 strategy). Catches the
  //       case where the parent's useEffect fires before the child's ref
  //       attachment completes.
  //   (3) requestAnimationFrame — paint-frame defer. Last-resort fallback
  //       if Android WebView's macrotask scheduling is throttled while the
  //       app is foregrounded but mid-startup.
  // start() is idempotent (v7.31 already-running guard), so a strategy
  // succeeding before the next fires causes no harm — the later attempts
  // are no-ops. [v35-watch] logs each attempt's outcome so a single
  // chrome://inspect capture identifies which strategy actually starts
  // the timer on Capacitor.
  useEffect(() => {
    if (!gameStarted) return;
    if (gameOver || gameComplete || gameLost) return;

    let cleanedUp = false;
    let timeoutId = null;
    let rafId = null;

    const tryStart = (strategy) => {
      if (cleanedUp) return true; // treat cleanup as "done"; abort remaining strategies
      const ref = liveTimerRef.current;
      if (!ref) {
        return false;
      }
      if (ref.isRunning()) {
        return true;
      }
      try {
        ref.start();
        return true;
      } catch (e) {
        return false;
      }
    };

    // Strategy 1: synchronous attempt
    if (tryStart('sync')) {
      return () => { cleanedUp = true; };
    }

    // Strategy 2: setTimeout(0) macrotask defer
    timeoutId = setTimeout(() => {
      if (tryStart('setTimeout(0)')) return;

      // Strategy 3: rAF fallback
      rafId = requestAnimationFrame(() => {
        tryStart('rAF');
      });
    }, 0);

    return () => {
      cleanedUp = true;
      if (timeoutId !== null) clearTimeout(timeoutId);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [gameStarted, gameOver, gameComplete, gameLost]);
  
  // =========================================================================
  // RENDER
  // =========================================================================
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center relative z-20">
        <div className="fixed inset-0 opacity-20 pointer-events-none z-0" style={{
          backgroundImage: 'linear-gradient(rgba(239,68,68,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        <div className="relative z-10 text-center">
          <div className="w-12 h-12 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-red-300">Loading weekly challenge...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative z-20">
        <div className="fixed inset-0 opacity-20 pointer-events-none z-0" style={{
          backgroundImage: 'linear-gradient(rgba(239,68,68,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        <div className="relative z-10 bg-slate-900 rounded-xl p-6 max-w-sm w-full border border-red-500/30 text-center">
          <X size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-300 mb-2">Error</h2>
          <p className="text-slate-400 mb-4">{loadError}</p>
          <button
            onClick={() => { soundManager.playButtonClick(); onMenu(); }}
            className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }
  
  // Waiting for game to start (puzzle loaded, auto-start effect running)
  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center relative z-20">
        <div className="fixed inset-0 opacity-20 pointer-events-none z-0" style={{
          backgroundImage: 'linear-gradient(rgba(239,68,68,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        <div className="relative z-10 text-center">
          <div className="w-12 h-12 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-red-300">Starting challenge...</p>
        </div>
      </div>
    );
  }
  
  // Game in progress
  return (
    <div className="fixed inset-0 bg-slate-950 relative z-20">
      {/* Red Background Grid */}
      <div className="fixed inset-0 opacity-30 pointer-events-none z-0" style={{
        backgroundImage: 'linear-gradient(rgba(239,68,68,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.4) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        background: 'radial-gradient(ellipse at center, rgba(239,68,68,0.15) 0%, transparent 70%)'
      }} />
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        boxShadow: 'inset 0 0 150px rgba(239,68,68,0.2)'
      }} />

      {/* Drag Overlay — outside scroll child so it covers full screen */}
      {isDragging && draggedPiece && (
        <DragOverlay
          isDragging={isDragging}
          piece={draggedPiece}
          rotation={rotation}
          flipped={flipped}
          position={dragPosition}
          offset={dragOffset}
          isValidDrop={isValidDrop}
          cellOffset={pieceCellOffset}
        />
      )}

      {/* Inner scroll child — absolute inset-0 gives iOS explicit pixel bounds */}
      <div
        className="absolute inset-0 overflow-y-scroll overflow-x-hidden relative z-10"
        style={{ overscrollBehavior: 'none' }}
      >
      {/* Content */}
      <div className="min-h-full flex flex-col items-center px-2 py-1" style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}>
        <div className="w-full max-w-lg">
          
          {/* Title + Timer on same line */}
          <div className="flex items-center justify-between mb-1 px-2">
            <div className="w-20" />
            <div className="text-center flex-1">
              <NeonTitle size="large" color="red" />
            </div>
            
            {/* v7.28: Timer panel extracted into <LiveTimerPanel> so the parent doesn't
                re-render on every 250ms tick. Visual output is byte-identical to the
                previous inline IIFE; only the location of the elapsedMs state changed. */}
            <div className="w-20 flex justify-end">
              <LiveTimerPanel ref={liveTimerRef} />
            </div>
          </div>
          
          {/* Main Game Panel - RED THEME */}
          <div className="mb-1">
            
            {/* Game Board with side labels */}
            <div className="flex items-center justify-center pb-2 gap-3">
              <div className="text-xl font-black tracking-wider select-none flex-shrink-0" style={{
                writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                color: '#fff',
                textShadow: '0 0 4px #fff, 0 0 8px #fff, 0 0 16px #ef4444, 0 0 32px #ef4444, 0 0 48px #ef4444'
              }}>WEEKLY CHALLENGE</div>
              <GameBoard
                ref={boardRef}
                board={board}
                boardPieces={boardPieces}
                selectedPiece={selectedPiece}
                pendingMove={pendingMove}
                rotation={rotation}
                flipped={flipped}
                onCellClick={handleCellClick}
                currentPlayer={currentPlayer}
                gameOver={gameOver}
                gameMode="puzzle"
                onPendingPieceDragStart={handleBoardDragStart}
                isDragging={isDragging}
                dragPreviewCell={dragPreviewCell}
                draggedPiece={draggedPiece}
                dragRotation={rotation}
                dragFlipped={flipped}
                customColors={{
                  1: 'bg-gradient-to-br from-red-400 to-rose-500',
                  2: 'bg-gradient-to-br from-rose-400 to-pink-500',
                }}
                confirmFlashCells={confirmFlashCells}
                goldHighlightCells={aiBlockingCells}
              />
              <div className="text-xl font-black tracking-wider select-none flex-shrink-0" style={{
                writingMode: 'vertical-rl',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                color: '#fff',
                textShadow: '0 0 4px #fff, 0 0 8px #fff, 0 0 16px #ef4444, 0 0 32px #ef4444, 0 0 48px #ef4444'
              }}>WEEKLY CHALLENGE</div>
            </div>
            
            {/* Off-grid indicator - shows when piece extends beyond board */}
            {isPieceOffGrid && pendingMove && !isDragging && (
              <div className="flex justify-center mb-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-900/60 border border-amber-500/50 rounded-lg">
                  <Move size={14} className="text-amber-400" />
                  <span className="text-amber-300 text-xs font-bold">Use D-Pad to reposition</span>
                </div>
              </div>
            )}
            
            {/* D-Pad for moving pieces */}
            {pendingMove && !isDragging && (
              <div className="flex justify-center mb-3">
                <DPad onMove={movePendingPiece} />
              </div>
            )}
            
            {/* Control Buttons - Above Piece Tray */}
            <div className="flex gap-1 mb-2">
              <GlowOrbButton onClick={handleGoToMenu} color="orange" className="flex-1">
                <Home size={14} />
              </GlowOrbButton>
              <GlowOrbButton onClick={rotatePiece} disabled={!selectedPiece && !pendingMove} color="cyan" className="flex-1">
                Rotate
              </GlowOrbButton>
              <GlowOrbButton onClick={flipPiece} disabled={!selectedPiece && !pendingMove} color="purple" className="flex-1">
                Flip
              </GlowOrbButton>
              <GlowOrbButton onClick={handleRestart} color="slate" className="flex-1">
                Reset
              </GlowOrbButton>
            </div>
            
            {/* Confirm/Cancel Controls */}
            {pendingMove && (
              <div className="flex gap-2 justify-center mb-2">
                <GlowOrbButton onClick={cancelMove} color="red" className="flex-1">
                  Cancel
                </GlowOrbButton>
                <GlowOrbButton
                  onClick={handleConfirmMove}
                  disabled={!pendingMove || !(() => {
                    const coords = getPieceCoords(pendingMove.piece, rotation, flipped);
                    return canPlacePiece(board, pendingMove.row, pendingMove.col, coords);
                  })()}
                  color="green"
                  className="flex-1"
                >
                  Confirm
                </GlowOrbButton>
              </div>
            )}
          </div>
          
          {/* Piece Tray */}
          <PieceTray
            usedPieces={usedPieces}
            selectedPiece={selectedPiece}
            pendingMove={pendingMove}
            gameOver={gameOver}
            gameMode="puzzle"
            currentPlayer={currentPlayer}
            onSelectPiece={selectPiece}
            createDragHandlers={createDragHandlers}
            isDragging={isDragging}
            draggedPiece={draggedPiece}
          />
        </div>
        
        {/* Bottom padding for scroll */}
        <div className="h-8 flex-shrink-0" />
      </div>
      
      {/* Success Overlay */}
      {gameComplete && (
        <SuccessOverlay
          completionTime={completionTime}
          firstAttemptTime={firstAttemptTime}
          bestTime={bestTime}
          wasFirstAttempt={wasFirstAttempt}
          rank={currentRank}
          onViewLeaderboard={handleViewLeaderboard}
          onPlayAgain={handleRestart}
          onMenu={onMenu}
        />
      )}
      
      {/* Lose Overlay */}
      {/* v7.28: finalElapsedMs is frozen at game-loss time. Previously this was
          the parent's live elapsedMs state, but that state moved into
          LiveTimerPanel — finalElapsedMs is captured from pauseTimer() return
          in the game-over effect. */}
      {gameLost && (
        <LoseOverlay
          elapsedMs={finalElapsedMs}
          attemptCount={attemptCount}
          isFirstAttempt={isFirstAttempt}
          onRetry={handleRetryAfterLoss}
          onMenu={onMenu}
        />
      )}
      </div>{/* end inner scroll child */}
    </div>
  );
};

export default WeeklyChallengeScreen;
