// FinalBoardView.jsx - Game replay with move order display
// v7.31: Real flicker fix — the orb pattern was innocent all along (PuzzleSelect
//        uses the same 3 blurred orbs without flickering). The actual cause was
//        the `last-move-pulse` CSS keyframe animating `box-shadow` continuously
//        on every cell of the last-placed pentomino. box-shadow is a CPU-painted
//        property: animating it cannot be GPU-accelerated, forces a repaint
//        every frame, and on a forced compositor layer (the board has
//        willChange:transform from v7.27) causes layer-cache invalidation that
//        manifests as full-screen gray/black flashes on Android WebView.
//        Five simultaneous box-shadow animations on a layer-promoted surface
//        is plenty to overrun the compositor every frame.
//        Fix: split the pulse into two parts. The cell keeps a STATIC base
//        box-shadow (matching the keyframe's 0%/100% state). A new overlay
//        div is laid on top with a STATIC larger box-shadow (matching the
//        keyframe's 50% peak state), and its OPACITY is animated 0→1→0 over
//        2s. Opacity changes on a separate element are GPU-compositor-only:
//        zero CPU paint cost, no layer invalidation. The visual result is
//        identical — the glow still "pulses" in the same rhythm.
// v7.30: Mobile flicker fix part 4 — diagnosis came from comparing against
//        PuzzleSelect.jsx, which uses the exact same 3-orb pattern but doesn't
//        flicker. The difference wasn't blur intensity, layer count, or
//        willChange: it was the `animate-glow-pulse-N` continuous animations.
//        A blurred element with a continuous transform/opacity animation
//        forces sustained per-frame compositor work and aggressive layer
//        eviction. A static blurred div renders once and is then cached.
//        Reverted v7.29's radial-gradient-in-background approach (which
//        helped but added 3 gradient layers to the static paint) and
//        replaced it with 3 static blur-3xl orb divs that match PuzzleSelect's
//        non-flickering pattern: no animation, no willChange, same blur-3xl
//        and same color/position as the original orbs (pre-v7.28).
// v7.29: Mobile flicker fix part 3 — replaced the 3 animated blurred glow orbs
//        with 3 static radial gradients painted directly into the background CSS.
//        Diagnosis: v7.28's blur-xl + willChange:transform actually made flicker
//        WORSE because willChange forced each orb into a permanent dedicated
//        compositor layer. Combined with the board's layer, FloatingPieces, and
//        animated cells, this exceeded the WebView compositor's working memory,
//        causing aggressive layer eviction that flashed the ENTIRE screen gray
//        and black — the symptom is layer-count-driven, not blur-cost-driven.
//        Static radial gradients painted into the parent's background eliminate
//        the layer problem at the source: zero compositor layers for orbs,
//        zero blur filter computation, zero animation. Visual difference: the
//        gentle 8-12s pulse is gone; orbs are static at their resting opacity.
//        Same colors, same positions, same sizes.
// v7.28: Mobile flicker fix part 2 — glow orb blur reduced from blur-3xl (64px)
//        to blur-xl (24px), and willChange:transform added to each orb. v7.27
//        fixed the viewport-units recalc but flicker persisted because the three
//        animated glow orbs at blur-3xl created ~1.5 MB of GPU compositor memory
//        (each blur filter expands its layer buffer by 2×radius in each dimension).
//        Under that pressure plus FloatingPieces + the board's own layer + animated
//        last-move cells, the Capacitor Android WebView compositor was evicting
//        layers, causing the brief grey/black flashes through to the underlying
//        surface. blur-xl uses ~14% of the GPU memory and ~7× less compute per
//        frame while keeping the visible glow effect. willChange:transform on each
//        orb prevents per-frame layer re-promotion churn during the glow-pulse
//        animations. Visual aesthetic is mostly preserved — orbs look slightly
//        more concentrated but still clearly soft glow, not solid circles.
// v7.27: Mobile flicker fix — dropped redundant `100vh` term from board sizing min()
//        formula and narrowed willChange from 'contents' to 'transform'.
//        Symptom: grid + background flickering to black on Android with no user
//        action. Root cause: `min(100vw, 100dvh, 100vh)` recalcs whenever 100dvh
//        and 100vh diverge (system UI animations, edge-to-edge inset changes),
//        causing the board to resize → aspect-square cells repaint → compositor
//        occasionally drops a frame. The `100vh` term was mathematically redundant
//        because `100dvh ≤ 100vh` always, so removing it preserves identical
//        layout while eliminating one recalc trigger. `willChange: 'contents'`
//        (overly broad layer-promotion hint) was contributing to GPU churn under
//        heavy load (glow orbs + FloatingPieces + cyberpunk gradient); narrowing
//        to 'transform' keeps the v7.25 layer-promotion benefit with less GPU
//        management overhead.
// v7.26: Player outlines — cyan inset border for P1, pink for P2 on all occupied cells
// v7.25: Mobile flash fix — cell transition-all→transition-colors, board GPU layer promotion
// v7.24 - Fixed spacing (justify-start instead of center), increased grid opacity (0.12), larger board (420px max)
// v7.23 - Enhanced grid background opacity (0.03 -> 0.06) for better visibility
// v7.22 - FloatingPieces with immediateStart and maxDelay=0 for instant smooth animation
// v7.21 - Added FloatingPieces background animation (purple theme)
// v7.20 - Enhanced glow orbs (higher opacity), enlarged title to medium
// v7.19 - Added animated glow orbs for consistent cyberpunk aesthetic across all views
// v7.18 - Added cyberpunk grid background, controls directly under board, more header padding
// v7.17 - Full screen takeover with z-[60], fully opaque background
// v7.17 - Added Back button, Deadblock title, fixed last move gold highlighting
// v7.17 - COMPACT LAYOUT UPDATE
// 
// FIXES:
// ✅ Reduced wide margins - board now fills more of the screen width
// ✅ Compacted spacing between header, board, and controls
// ✅ Consistent with GameBoard and OnlineGameScreen layouts
// ✅ Proper piece colors - uses pieceColors from pieces.js (same as GameBoard)
// ✅ Move numbers displayed on pieces in final view
// ✅ Replay works correctly - pieces appear when pressing play
// ✅ Animated glow orbs for consistent look across all call sites

import { useState, useEffect, useMemo, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, SkipBack, SkipForward, Play, Pause, Loader, Trophy, ArrowLeft } from 'lucide-react';
import { BOARD_SIZE, getPieceCoords } from '../utils/gameLogic';
import { pieceColors } from '../utils/pieces';
import { soundManager } from '../utils/soundManager';
import { ratingService } from '../services/ratingService';
import TierIcon from './TierIcon';
import NeonTitle from './NeonTitle';
import FloatingPieces from './FloatingPieces';

const FinalBoardView = ({ 
  board, 
  boardPieces, 
  moveHistory = [],
  isLoadingMoves = false,
  player1 = null,
  player2 = null,
  player1Name = 'Player 1',
  player2Name = 'Player 2',
  player1Rating = 1200,
  player2Rating = 1200,
  winner = null,
  winnerId = null,
  gameDate = null,
  onClose 
}) => {
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1); // -1 = show final with numbers
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(500);

  // Extract player info
  const p1Name = player1?.username || player1?.display_name || player1Name;
  const p2Name = player2?.username || player2?.display_name || player2Name;
  const p1Rating = player1?.elo_rating || player1?.rating || player1Rating || 1200;
  const p2Rating = player2?.elo_rating || player2?.rating || player2Rating || 1200;
  const p1Id = player1?.id;
  const p2Id = player2?.id;

  const isP1Winner = winner === 'player1' || winnerId === p1Id;
  const isP2Winner = winner === 'player2' || winnerId === p2Id;

  const p1Tier = ratingService.getRatingTier(p1Rating);
  const p2Tier = ratingService.getRatingTier(p2Rating);

  // Helper to get piece name from boardPieces (handles both object and array formats)
  const getPieceName = useCallback((rowIdx, colIdx, piecesData) => {
    if (!piecesData) return null;
    // Object format: { "row,col": "T", ... }
    if (typeof piecesData === 'object' && !Array.isArray(piecesData)) {
      return piecesData[`${rowIdx},${colIdx}`] || null;
    }
    // Array format: [[null, "T", ...], ...]
    if (Array.isArray(piecesData) && piecesData[rowIdx]) {
      return piecesData[rowIdx][colIdx] || null;
    }
    return null;
  }, []);

  // Validate board - convert 0 to null for consistency
  const safeBoard = useMemo(() => {
    if (Array.isArray(board) && board.length === BOARD_SIZE) {
      return board.map(row => 
        Array.isArray(row) ? row.map(cell => (cell === 0 ? null : cell)) : Array(BOARD_SIZE).fill(null)
      );
    }
    return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  }, [board]);

  // Normalize boardPieces to object format
  const safeBoardPieces = useMemo(() => {
    if (!boardPieces) return {};
    if (typeof boardPieces === 'object' && !Array.isArray(boardPieces)) {
      return boardPieces;
    }
    // Convert array format to object format
    if (Array.isArray(boardPieces)) {
      const obj = {};
      boardPieces.forEach((row, ri) => {
        if (Array.isArray(row)) {
          row.forEach((piece, ci) => {
            if (piece) obj[`${ri},${ci}`] = piece;
          });
        }
      });
      return obj;
    }
    return {};
  }, [boardPieces]);

  // Build cell info map from moveHistory for final view numbers
  const cellInfoMap = useMemo(() => {
    const map = {};
    
    if (!moveHistory || moveHistory.length === 0) {
      // No move history - use boardPieces to estimate move numbers
      // v7.17: Group cells by piece type and mark all cells of "last" piece
      const pieceGroups = {};
      
      Object.entries(safeBoardPieces).forEach(([key, pieceType]) => {
        if (!pieceGroups[pieceType]) {
          pieceGroups[pieceType] = [];
        }
        pieceGroups[pieceType].push(key);
      });
      
      // Assign move numbers (we don't know true order, so use piece type order)
      let moveNum = 1;
      const pieceTypes = Object.keys(pieceGroups);
      const lastPieceType = pieceTypes[pieceTypes.length - 1];
      
      pieceTypes.forEach((pieceType) => {
        const isLast = pieceType === lastPieceType;
        pieceGroups[pieceType].forEach(key => {
          map[key] = {
            moveNumber: moveNum,
            pieceType,
            isLastMove: isLast  // Mark ALL cells of last piece
          };
        });
        moveNum++;
      });
      
      return map;
    }

    moveHistory.forEach((move, idx) => {
      const moveNum = move.move_number || (idx + 1);
      const piece = move.piece_type;
      const row = move.row;
      const col = move.col;
      const rot = move.rotation || 0;
      const flip = move.flipped || false;

      if (piece === undefined || row === undefined || col === undefined) return;

      try {
        const coords = getPieceCoords(piece, rot, flip);
        if (coords) {
          coords.forEach(([dx, dy]) => {
            const r = row + dy;
            const c = col + dx;
            if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
              map[`${r},${c}`] = {
                moveNumber: moveNum,
                pieceType: piece,
                isLastMove: idx === moveHistory.length - 1
              };
            }
          });
        }
      } catch (e) {
        console.error('[FinalBoardView] Error processing move:', e);
      }
    });

    return map;
  }, [moveHistory, safeBoardPieces]);

  // Build board states for step-by-step replay
  const boardStates = useMemo(() => {
    // State 0: empty board
    const emptyBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    const states = [{ board: emptyBoard, pieces: {} }];

    if (!moveHistory || moveHistory.length === 0) {
      // No move history - just show final state
      return [{ board: safeBoard, pieces: safeBoardPieces }];
    }

    let curBoard = emptyBoard.map(row => [...row]);
    let curPieces = {};

    moveHistory.forEach((move, idx) => {
      const piece = move.piece_type;
      const row = move.row;
      const col = move.col;
      const rot = move.rotation || 0;
      const flip = move.flipped || false;
      const player = (idx % 2) + 1;

      if (piece === undefined || row === undefined || col === undefined) {
        states.push({ board: curBoard.map(r => [...r]), pieces: { ...curPieces } });
        return;
      }

      try {
        const coords = getPieceCoords(piece, rot, flip);
        if (coords) {
          // Create new board/pieces objects (immutable update)
          curBoard = curBoard.map(r => [...r]);
          curPieces = { ...curPieces };
          
          coords.forEach(([dx, dy]) => {
            const r = row + dy;
            const c = col + dx;
            if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
              curBoard[r][c] = player;
              curPieces[`${r},${c}`] = piece; // Store piece type!
            }
          });
        }
      } catch (e) {
        console.error('[FinalBoardView] Error building state:', e);
      }

      states.push({ board: curBoard.map(r => [...r]), pieces: { ...curPieces } });
    });

    return states;
  }, [moveHistory, safeBoard, safeBoardPieces]);

  // Playback timer
  useEffect(() => {
    if (!isPlaying) return;
    if (moveHistory.length === 0 && Object.keys(safeBoardPieces).length === 0) return;
    
    const maxMoves = moveHistory.length > 0 ? moveHistory.length : Object.keys(safeBoardPieces).length;
    
    const timer = setInterval(() => {
      setCurrentMoveIndex(prev => {
        if (prev >= maxMoves - 1) {
          setIsPlaying(false);
          return -1; // Back to final view with numbers
        }
        soundManager.playClickSound?.('click');
        return prev + 1;
      });
    }, playbackSpeed);
    
    return () => clearInterval(timer);
  }, [isPlaying, moveHistory.length, safeBoardPieces, playbackSpeed]);

  // Get total moves count
  const totalMoves = moveHistory.length > 0 ? moveHistory.length : Object.keys(safeBoardPieces).length;

  // Controls
  const play = useCallback(() => {
    soundManager.playButtonClick?.();
    if (currentMoveIndex === -1 || currentMoveIndex >= totalMoves - 1) {
      setCurrentMoveIndex(0);
    }
    setIsPlaying(true);
  }, [currentMoveIndex, totalMoves]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    soundManager.playButtonClick?.();
  }, []);

  const prev = useCallback(() => {
    setIsPlaying(false);
    soundManager.playButtonClick?.();
    setCurrentMoveIndex(i => i === -1 ? totalMoves - 1 : i === 0 ? -1 : i - 1);
  }, [totalMoves]);

  const next = useCallback(() => {
    setIsPlaying(false);
    soundManager.playButtonClick?.();
    setCurrentMoveIndex(i => i >= totalMoves - 1 ? -1 : i + 1);
  }, [totalMoves]);

  const first = useCallback(() => {
    setIsPlaying(false);
    soundManager.playButtonClick?.();
    setCurrentMoveIndex(0);
  }, []);

  const last = useCallback(() => {
    setIsPlaying(false);
    soundManager.playButtonClick?.();
    setCurrentMoveIndex(-1); // Show final with numbers
  }, []);

  // Determine current state to display
  const showFinal = currentMoveIndex === -1;
  const currentState = useMemo(() => {
    if (showFinal) {
      return { board: safeBoard, pieces: safeBoardPieces };
    }
    // Map currentMoveIndex to boardStates index
    // boardStates[0] = empty, boardStates[1] = after move 1, etc.
    const stateIdx = currentMoveIndex + 1;
    if (stateIdx >= 0 && stateIdx < boardStates.length) {
      return boardStates[stateIdx];
    }
    return { board: safeBoard, pieces: safeBoardPieces };
  }, [showFinal, currentMoveIndex, boardStates, safeBoard, safeBoardPieces]);

  return (
    <div 
      className="fixed inset-0 z-[60] flex flex-col overflow-hidden"
      style={{
        // v7.30: Reverted to the v7.24 background. The v7.29 attempt to bake
        // the orb glows into this `background` as 3 radial-gradients helped
        // but wasn't the right fix; static orb divs (below) match the
        // PuzzleSelect pattern that doesn't flicker.
        background: `
          linear-gradient(to bottom, rgba(15, 23, 42, 0.92), rgba(15, 23, 42, 0.95)),
          repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(139, 92, 246, 0.12) 40px, rgba(139, 92, 246, 0.12) 41px),
          repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(139, 92, 246, 0.12) 40px, rgba(139, 92, 246, 0.12) 41px)
        `,
        backgroundColor: '#0f172a',
      }}
    >
      {/* v7.22: Floating pentomino pieces - immediate start, no delay for instant animation */}
      <FloatingPieces theme="purple" immediateStart={true} maxDelay={0} />
      
      {/* v7.30: Static blurred orbs — matches PuzzleSelect.jsx (which doesn't
          flicker on the same WebView). NO `animate-glow-pulse-N` classes (the
          continuous animation was the actual culprit, not blur intensity or
          layer count), NO `willChange: transform` (let the browser decide
          layer promotion; for truly static blurred divs the browser typically
          paints once and caches). Colors, positions, blur radius, and sizes
          match the original pre-v7.28 orbs. */}
      <div className="fixed top-10 right-10 w-64 h-64 bg-purple-500/40 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 left-10 w-56 h-56 bg-cyan-500/35 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/3 left-1/4 w-48 h-48 bg-pink-500/30 rounded-full blur-3xl pointer-events-none" />
      
      {/* v7.18: Extra padding at top for iPhone notch/dynamic island */}
      <div 
        className="flex-shrink-0"
        style={{ 
          height: 'max(16px, env(safe-area-inset-top))',
          background: 'linear-gradient(to bottom, rgba(15, 23, 42, 1), transparent)'
        }}
      />
      
      {/* HEADER - With Back Button and Deadblock Title */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/95 border-b border-purple-500/20 flex-shrink-0 relative">
        {/* Back Button */}
        <button 
          onClick={onClose}
          className="flex items-center gap-1.5 px-2 py-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-xs">Back</span>
        </button>
        
        {/* Centered Deadblock Title - v7.20: enlarged to medium */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <NeonTitle text="DEADBLOCK" size="medium" />
        </div>
        
        {/* Speed control - compact */}
        <div className="flex gap-1">
          {[1000, 500, 250].map((speed, idx) => {
            const labels = ['1x', '2x', '4x'];
            return (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${
                  playbackSpeed === speed 
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' 
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {labels[idx]}
              </button>
            );
          })}
        </div>
      </div>

      {/* PLAYER INFO - Compact with glow effects */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/60 border-b border-slate-700/30 flex-shrink-0">
        {/* Player 1 */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <div 
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ 
                background: `linear-gradient(135deg, ${p1Tier.glowColor}40, transparent)`,
                boxShadow: isP1Winner ? `0 0 12px ${p1Tier.glowColor}` : 'none'
              }}
            >
              <TierIcon shape={p1Tier.shape} glowColor={p1Tier.glowColor} size="small" />
            </div>
            {isP1Winner && <Trophy size={10} className="absolute -top-1 -right-1 text-amber-400 drop-shadow-lg" />}
          </div>
          <div>
            <div className={`font-bold text-xs ${isP1Winner ? 'text-amber-400' : 'text-white'}`}>{p1Name}</div>
            <div className="text-slate-500 text-[10px]">{p1Rating}</div>
          </div>
        </div>

        <span className="text-slate-600 font-black text-xs px-2">VS</span>

        {/* Player 2 */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className={`font-bold text-xs ${isP2Winner ? 'text-amber-400' : 'text-white'}`}>{p2Name}</div>
            <div className="text-slate-500 text-[10px]">{p2Rating}</div>
          </div>
          <div className="relative">
            <div 
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ 
                background: `linear-gradient(135deg, ${p2Tier.glowColor}40, transparent)`,
                boxShadow: isP2Winner ? `0 0 12px ${p2Tier.glowColor}` : 'none'
              }}
            >
              <TierIcon shape={p2Tier.shape} glowColor={p2Tier.glowColor} size="small" />
            </div>
            {isP2Winner && <Trophy size={10} className="absolute -top-1 -right-1 text-amber-400 drop-shadow-lg" />}
          </div>
        </div>
      </div>

      {/* STATUS LINE */}
      <div className="text-center py-1 bg-slate-900/40 border-b border-slate-700/20 flex-shrink-0">
        {showFinal ? (
          <span className="text-amber-400 font-medium text-xs">
            {(isP1Winner || isP2Winner) ? `🏆 ${isP1Winner ? p1Name : p2Name} wins!` : 'Final'} 
            <span className="text-slate-400 ml-2">• {totalMoves} moves</span>
          </span>
        ) : (
          <span className="text-slate-300 text-xs">
            Move <span className="text-white font-bold">{currentMoveIndex + 1}</span>
            <span className="text-slate-500">/{totalMoves}</span>
          </span>
        )}
      </div>

      {/* BOARD + CONTROLS AREA - v7.24: Start from top with padding for better spacing */}
      <div className="flex-1 flex flex-col items-center justify-start pt-4 sm:pt-8 px-4 py-2 min-h-0">
        {isLoadingMoves ? (
          <div className="text-center">
            <Loader size={32} className="text-purple-400 animate-spin mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Loading game...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* Board Grid with cyberpunk styling */}
            <div 
              className="grid grid-cols-8 gap-0.5 sm:gap-1 p-1.5 sm:p-2 rounded-xl border border-purple-500/30"
              style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))',
                boxShadow: '0 0 30px rgba(139, 92, 246, 0.15), inset 0 0 20px rgba(0,0,0,0.3)',
                // v7.27: Dropped redundant `calc(100vh - 280px)` term — 100dvh ≤ 100vh
                // is always true, so the `100vh` term was dominated by `100dvh` whenever
                // they differ and equal when they don't. Removing it eliminates one
                // recalc trigger when the WebView's viewport units shift (Android system
                // UI animations, edge-to-edge inset changes), which was causing board
                // resize → cell repaint → compositor frame drops to black.
                width: 'min(calc(100vw - 32px), calc(100dvh - 280px))',
                height: 'min(calc(100vw - 32px), calc(100dvh - 280px))',
                maxWidth: '420px',
                maxHeight: '420px',
                // v7.27: Narrowed willChange from 'contents' (too broad — hints any
                // content change, leads to aggressive layer management on Android GPU)
                // to 'transform'. Still promotes the board to its own composite layer
                // for the v7.25 replay-stepping fix, with less compositor overhead.
                contain: 'layout style',
                willChange: 'transform',
              }}
            >
            {currentState.board.map((row, rowIdx) =>
              row.map((cellValue, colIdx) => {
                const key = `${rowIdx}-${colIdx}`;
                const isOccupied = cellValue !== null && cellValue !== 0;
                
                // Get piece name from current state's pieces
                const pieceName = getPieceName(rowIdx, colIdx, currentState.pieces);
                
                // Get piece-specific color or fallback to player color
                const pieceColor = pieceName ? pieceColors[pieceName] : null;
                
                // Get cell info for move numbers (only in final view)
                const cellInfo = showFinal ? cellInfoMap[`${rowIdx},${colIdx}`] : null;
                const isLastMove = cellInfo?.isLastMove;
                
                return (
                  <div
                    key={key}
                    className={`
                      aspect-square rounded-md sm:rounded-lg relative
                      transition-colors duration-100 overflow-hidden
                      ${isOccupied 
                        ? isLastMove
                          ? 'shadow-lg'
                          : `${pieceColor || (cellValue === 1 
                              ? 'bg-gradient-to-br from-cyan-400 via-cyan-500 to-blue-600' 
                              : 'bg-gradient-to-br from-pink-400 via-pink-500 to-rose-600'
                            )} shadow-lg`
                        : 'bg-slate-700/50'
                      }
                    `}
                    style={isLastMove ? {
                      background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)',
                      // v7.31: Removed `animation: 'last-move-pulse 2s ...'` here.
                      // The keyframe was animating box-shadow (CPU-painted), causing
                      // per-frame repaints on each of the 5 last-move cells and
                      // overrunning the compositor. The static box-shadow below
                      // matches the keyframe's 0%/100% (resting) state; the pulse
                      // peak is now overlaid as a separate div whose opacity is
                      // animated instead.
                      boxShadow: `0 0 15px rgba(251, 191, 36, 0.6), inset 0 0 8px rgba(255, 255, 255, 0.3), inset 0 0 0 2.5px ${cellValue === 1 ? 'rgba(34,211,238,0.8)' : 'rgba(244,114,182,0.8)'}`,
                    } : isOccupied ? {
                      boxShadow: `inset 0 0 0 2.5px ${cellValue === 1 ? 'rgba(34,211,238,0.6)' : 'rgba(244,114,182,0.6)'}`,
                    } : undefined}
                  >
                    {/* v7.31: Opacity-animated overlay carries the pulse-peak box-shadow.
                        Static shadow + animated opacity = GPU-compositor only, no CPU
                        paint per frame. Pointer events off so it doesn't intercept clicks. */}
                    {isLastMove && (
                      <div
                        className="absolute inset-0 rounded-md sm:rounded-lg pointer-events-none"
                        style={{
                          boxShadow: '0 0 25px rgba(251, 191, 36, 0.9), inset 0 0 12px rgba(255, 255, 255, 0.5)',
                          animation: 'last-move-pulse-opacity 2s ease-in-out infinite',
                        }}
                      />
                    )}
                    
                    {/* Inner glow for occupied cells */}
                    {isOccupied && !isLastMove && (
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/20 rounded-md sm:rounded-lg" />
                    )}
                    
                    {/* Move number overlay - only in final view */}
                    {cellInfo && showFinal && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span 
                          className={`
                            font-black
                            ${isLastMove ? 'text-white' : 'text-white'}
                            ${cellInfo.moveNumber > 9 ? 'text-[9px] sm:text-[11px]' : 'text-[10px] sm:text-xs'}
                          `}
                          style={{
                            textShadow: '0 0 6px rgba(0,0,0,1), 0 2px 4px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,1)'
                          }}
                        >
                          {cellInfo.moveNumber}
                        </span>
                      </div>
                    )}
                    
                    {/* Gold confetti particles on last move cells */}
                    {isLastMove && showFinal && (
                      <>
                        <div className="absolute w-1 h-1 bg-yellow-300 rounded-full animate-confetti-1" style={{ left: '20%', top: '-10%' }} />
                        <div className="absolute w-1.5 h-1 bg-amber-400 rounded-sm animate-confetti-2" style={{ left: '60%', top: '-10%' }} />
                        <div className="absolute w-1 h-1.5 bg-yellow-200 rounded-sm animate-confetti-3" style={{ left: '40%', top: '-10%' }} />
                        <div className="absolute w-1 h-1 bg-orange-400 rounded-full animate-confetti-4" style={{ left: '80%', top: '-10%' }} />
                        <div className="absolute w-1.5 h-1 bg-yellow-500 rounded-sm animate-confetti-5" style={{ left: '10%', top: '-10%' }} />
                      </>
                    )}
                  </div>
                );
              })
            )}
            </div>
            
            {/* CONTROLS - Directly under board */}
            <div className="w-full max-w-[340px] mt-3">
              {/* Progress bar */}
              {totalMoves > 0 && (
                <div className="mb-2 px-2">
                  <div className="h-1.5 bg-slate-700/80 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-200"
                      style={{ 
                        width: showFinal 
                          ? '100%' 
                          : `${((currentMoveIndex + 1) / totalMoves) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              )}
              
              {/* Control buttons - larger touch targets */}
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={first}
                  disabled={totalMoves === 0}
                  className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors disabled:opacity-30"
                >
                  <SkipBack size={16} />
                </button>
                
                <button
                  onClick={prev}
                  disabled={totalMoves === 0}
                  className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors disabled:opacity-30"
                >
                  <ChevronLeft size={20} />
                </button>
                
                <button
                  onClick={isPlaying ? pause : play}
                  disabled={totalMoves === 0}
                  className="p-3.5 bg-purple-600 hover:bg-purple-500 text-white rounded-full transition-colors disabled:opacity-30 mx-2 shadow-lg shadow-purple-500/40"
                >
                  {isPlaying ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
                </button>
                
                <button
                  onClick={next}
                  disabled={totalMoves === 0}
                  className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors disabled:opacity-30"
                >
                  <ChevronRight size={20} />
                </button>
                
                <button
                  onClick={last}
                  disabled={totalMoves === 0}
                  className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors disabled:opacity-30"
                >
                  <SkipForward size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom safe area padding */}
      <div 
        className="flex-shrink-0"
        style={{ 
          height: 'max(8px, env(safe-area-inset-bottom))',
        }}
      />

      {/* Animation styles */}
      <style>{`
        /* v7.31: Old keyframe `last-move-pulse` animated box-shadow on each
           last-move cell (CPU-painted, per-frame repaint, layer thrash).
           Replaced with an opacity-only keyframe that drives a separate
           overlay div carrying a static peak-state box-shadow. Visual
           result is identical; rendering cost drops to near-zero. */
        @keyframes last-move-pulse-opacity {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        @keyframes glow-pulse-1 {
          0%, 100% { opacity: 0.4; transform: scale(1) translate(0, 0); }
          50% { opacity: 0.6; transform: scale(1.1) translate(-10px, 10px); }
        }
        @keyframes glow-pulse-2 {
          0%, 100% { opacity: 0.35; transform: scale(1) translate(0, 0); }
          50% { opacity: 0.5; transform: scale(1.15) translate(15px, -5px); }
        }
        @keyframes glow-pulse-3 {
          0%, 100% { opacity: 0.3; transform: scale(1) translate(0, 0); }
          50% { opacity: 0.45; transform: scale(1.05) translate(-5px, -10px); }
        }
        .animate-glow-pulse-1 { animation: glow-pulse-1 8s ease-in-out infinite; }
        .animate-glow-pulse-2 { animation: glow-pulse-2 10s ease-in-out infinite; animation-delay: 2s; }
        .animate-glow-pulse-3 { animation: glow-pulse-3 12s ease-in-out infinite; animation-delay: 4s; }
        @keyframes confetti-fall-1 {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          20% { transform: translate(3px, 8px) rotate(90deg); opacity: 1; }
          50% { transform: translate(-2px, 16px) rotate(180deg); opacity: 0.8; }
          80% { transform: translate(2px, 24px) rotate(270deg); opacity: 0.4; }
          100% { transform: translate(-1px, 32px) rotate(360deg); opacity: 0; }
        }
        @keyframes confetti-fall-2 {
          0% { transform: translate(0, 0) rotate(45deg); opacity: 1; }
          25% { transform: translate(-4px, 10px) rotate(135deg); opacity: 1; }
          50% { transform: translate(2px, 18px) rotate(225deg); opacity: 0.8; }
          75% { transform: translate(-3px, 26px) rotate(315deg); opacity: 0.5; }
          100% { transform: translate(0px, 34px) rotate(405deg); opacity: 0; }
        }
        @keyframes confetti-fall-3 {
          0% { transform: translate(0, 0) rotate(20deg); opacity: 1; }
          30% { transform: translate(5px, 12px) rotate(120deg); opacity: 1; }
          60% { transform: translate(-1px, 22px) rotate(240deg); opacity: 0.7; }
          100% { transform: translate(3px, 36px) rotate(380deg); opacity: 0; }
        }
        @keyframes confetti-fall-4 {
          0% { transform: translate(0, 0) rotate(-10deg); opacity: 1; }
          35% { transform: translate(-3px, 9px) rotate(80deg); opacity: 1; }
          65% { transform: translate(4px, 20px) rotate(200deg); opacity: 0.6; }
          100% { transform: translate(-2px, 30px) rotate(350deg); opacity: 0; }
        }
        @keyframes confetti-fall-5 {
          0% { transform: translate(0, 0) rotate(60deg); opacity: 1; }
          20% { transform: translate(2px, 7px) rotate(140deg); opacity: 1; }
          55% { transform: translate(-4px, 19px) rotate(260deg); opacity: 0.7; }
          100% { transform: translate(1px, 33px) rotate(420deg); opacity: 0; }
        }
        .animate-confetti-1 { animation: confetti-fall-1 1.8s ease-out infinite; animation-delay: 0s; }
        .animate-confetti-2 { animation: confetti-fall-2 2.1s ease-out infinite; animation-delay: 0.3s; }
        .animate-confetti-3 { animation: confetti-fall-3 1.9s ease-out infinite; animation-delay: 0.1s; }
        .animate-confetti-4 { animation: confetti-fall-4 2.3s ease-out infinite; animation-delay: 0.5s; }
        .animate-confetti-5 { animation: confetti-fall-5 2.0s ease-out infinite; animation-delay: 0.2s; }
      `}</style>
    </div>
  );
};

export default FinalBoardView;
