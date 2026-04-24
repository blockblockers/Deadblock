// Online Game Screen - Real-time multiplayer game with drag-and-drop support
// v7.40: Title/subtitle moved to vertical side labels flanking board to save vertical space
// v7.39: Removed panel box around game board for visual consistency with GameScreen/CreatorPuzzle;
//        floating background now shows through seamlessly
//        fired setShowGameOver(true) immediately on the same data that loadGame was
//        scheduling a delayed show for. Now: isReviewModeRef is set the moment the
//        completed game is detected (before any state updates can trigger
//        updateGameState), and updateGameState gates its immediate-show on that flag.
// v7.37: Desktop drag fix — global mousemove/mouseup now attached synchronously in
//        startDrag (matching the touch handler pattern). The useEffect-based attachment
//        was async (waited for React render), causing a gap where mouse events were lost.
// v7.36: iPhone drag fix — added dragPreviewCellRef for synchronous tracking;
//        endDrag uses refs as fallback when React state hasn't committed yet
// v7.35: iPhone drag fix — updateDrag uses ref fallbacks (isDraggingRef, draggedPieceRef)
//        so pointer events work before React state commits on first pointermove
// v7.34: iOS scroll fix — removed WebkitOverflowScrolling, touchAction, changed overscrollBehavior to none
// v7.33: iOS drag fix — added Pointer Events to createDragHandlers; PieceTray uses
//        setPointerCapture to bypass UIScrollView gesture recognition on iPhone
// v7.32: overflow-y-scroll (was auto) + removed overflow-hidden from outer shell
//        matching the existing your-turn notification pattern — in-app toast handles foreground
// v7.28: Fixed scroll — two-layer shell (fixed inset-0 overflow-hidden outer + flex-1 min-h-0 overflow-y-auto inner)
//   - FIX - Sender countdown banner replaces static toast (live 5s countdown)
// v7.26: FIX - Rematch sender: setShowGameOver(false) immediately on Play Again to kill polling
//   - FIX - Viewing completed game: isReviewModeRef blocks RematchModal from auto-showing
// v7.24: Added sound feedback to GameOverModal X button dismiss for consistency
// v7.23: CRITICAL FIX - Game over modal now appears for winning player (fixed useEffect reset cascade)
// v7.22: Added orange color to GlowOrbButton for Home button
// v7.21: Removed top-left menu button, updated bottom menu to orange Home icon
// v7.18: Fixed 5-second game over modal - removed stale closure check, use ref only
// v7.17: Fixed gold confetti highlighting all cells of winning piece using getPieceCoords
// v7.15: Removed duplicate pieces bars, chat icon now overlays bottom-right of piece tray
// v7.14: Added streak tracking on game completion
// v7.13: Fixed unviewed loss flow - shows board for 5s before game over modal
// FIXED: Real-time updates, drag from board, UI consistency, game over detection
// ADDED: Rematch request system with opponent notification
// UPDATED: Chat notifications, rematch navigation, placement animations
// v7.28: Added turnPulse (board edge ripple on turn change) and confirmFlashCells (cell flash on confirm tap)
// v7.29: Replaced window.confirm forfeit/quit dialogs with in-app cyberpunk toast confirmation
// v7.30: Fix modal reappear after Play Again (set dismissedGameOverRef before hiding modal)
//        Fix review mode Play Again: use sendInvite + immediate leave instead of rematch flow
// v7.12 FIX: Now sends push notification when it becomes your turn
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Flag, MessageCircle, Home, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { gameSyncService } from '../services/gameSync';
import { rematchService } from '../services/rematchService';
import { inviteService } from '../services/inviteService';
import { notificationService } from '../services/notificationService';
import { supabase } from '../utils/supabase';
import NeonTitle from './NeonTitle';
import NeonSubtitle from './NeonSubtitle';
import GameBoard from './GameBoard';
import PieceTray from './PieceTray';
import DPad from './DPad';
import DragOverlay from './DragOverlay';
import GameOverModal from './GameOverModal';
import RematchModal from './RematchModal';
import QuickChat from './QuickChat';
import TurnTimer from './TurnTimer';
import HeadToHead from './HeadToHead';
import TierIcon from './TierIcon';
import PlacementAnimation, { usePlacementAnimation } from './PlacementAnimation';
import { pieces } from '../utils/pieces';
import { getPieceCoords, canPlacePiece, canAnyPieceBePlaced, BOARD_SIZE } from '../utils/gameLogic';
import { soundManager } from '../utils/soundManager';
import { ratingService } from '../services/ratingService';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { realtimeManager } from '../services/realtimeManager';
import { streakService } from '../services/streakService';

// Orange/Amber theme for online mode
const theme = {
  gridColor: 'rgba(251,191,36,0.4)',
  glow1: 'bg-amber-500/30',
  glow2: 'bg-orange-500/25',
  panelBorder: 'border-amber-500/40',
  panelShadow: 'shadow-[0_0_40px_rgba(251,191,36,0.2)]',
  accent: 'text-amber-400',
};

// Glow Orb Button Component - consistent across all game screens
// Glow Orb Button Component - consistent styling across all game screens
// UPDATED: Now matches ControlButtons.jsx exactly for consistency
const GlowOrbButton = ({ onClick, disabled, children, color = 'cyan', className = '', title = '' }) => {
  const colorClasses = {
    cyan: 'from-cyan-500 to-blue-600 shadow-[0_0_15px_rgba(34,211,238,0.4)] hover:shadow-[0_0_25px_rgba(34,211,238,0.6)]',
    amber: 'from-amber-500 to-orange-600 shadow-[0_0_15px_rgba(251,191,36,0.4)] hover:shadow-[0_0_25px_rgba(251,191,36,0.6)]',
    orange: 'from-orange-500 to-amber-600 shadow-[0_0_15px_rgba(249,115,22,0.4)] hover:shadow-[0_0_25px_rgba(249,115,22,0.6)]',
    green: 'from-green-500 to-emerald-600 shadow-[0_0_15px_rgba(34,197,94,0.4)] hover:shadow-[0_0_25px_rgba(34,197,94,0.6)]',
    red: 'from-red-500 to-rose-600 shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:shadow-[0_0_25px_rgba(239,68,68,0.6)]',
    purple: 'from-purple-500 to-violet-600 shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)]',
    indigo: 'from-indigo-500 to-blue-600 shadow-[0_0_15px_rgba(99,102,241,0.4)] hover:shadow-[0_0_25px_rgba(99,102,241,0.6)]',
    slate: 'from-slate-600 to-slate-700 shadow-[0_0_10px_rgba(100,116,139,0.3)] hover:shadow-[0_0_15px_rgba(100,116,139,0.5)]',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
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

// Player indicator bar for online games - with usernames
const OnlinePlayerBar = ({ profile, opponent, isMyTurn, gameStatus }) => {
  const myRating = profile?.rating || 1000;
  const oppRating = opponent?.rating || 1000;
  const myTier = ratingService.getRatingTier(myRating);
  const oppTier = ratingService.getRatingTier(oppRating);
  const myUsername = profile?.username || profile?.display_name || 'You';
  const oppUsername = opponent?.username || opponent?.display_name || 'Opponent';
  
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between">
        {/* Me */}
        <div className={`flex-1 px-3 py-2 rounded-lg transition-all duration-300 ${
          isMyTurn && gameStatus === 'active'
            ? 'bg-amber-500/20 border border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.4)]' 
            : 'bg-slate-800/50 border border-slate-700/50'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 transition-all duration-300 ${
              isMyTurn && gameStatus === 'active' ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)] animate-pulse' : 'bg-slate-600'
            }`} />
            <span className={`text-sm font-bold tracking-wide truncate max-w-[80px] ${isMyTurn ? 'text-amber-300' : 'text-slate-500'}`}>
              {myUsername}
            </span>
            <TierIcon shape={myTier.shape} glowColor={myTier.glowColor} size="small" />
            <span className="text-xs text-slate-600">{myRating}</span>
          </div>
        </div>
        
        <div className="text-slate-600 text-xs font-bold px-3">VS</div>
        
        {/* Opponent - RIGHT ALIGNED for symmetry */}
        <div className={`flex-1 px-3 py-2 rounded-lg transition-all duration-300 ${
          !isMyTurn && gameStatus === 'active'
            ? 'bg-orange-500/20 border border-orange-400/50 shadow-[0_0_15px_rgba(249,115,22,0.4)]' 
            : 'bg-slate-800/50 border border-slate-700/50'
        }`}>
          <div className="flex items-center gap-2 justify-end">
            <span className="text-xs text-slate-600">{oppRating}</span>
            <TierIcon shape={oppTier.shape} glowColor={oppTier.glowColor} size="small" />
            <span className={`text-sm font-bold tracking-wide truncate max-w-[80px] ${!isMyTurn && gameStatus === 'active' ? 'text-orange-300' : 'text-slate-500'}`}>
              {oppUsername}
            </span>
            <div className={`w-3 h-3 rounded-full flex-shrink-0 transition-all duration-300 ${
              !isMyTurn && gameStatus === 'active' ? 'bg-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.8)] animate-pulse' : 'bg-slate-600'
            }`} />
          </div>
        </div>
      </div>
    </div>
  );
};

const OnlineGameScreen = ({ gameId, onLeave, onNavigateToGame }) => {
  const { user, profile } = useAuth();
  const { needsScroll } = useResponsiveLayout(700);
  
  // Track the current game (can change on rematch)
  const [currentGameId, setCurrentGameId] = useState(gameId);
  
  // Game state
  const [game, setGame] = useState(null);
  const [board, setBoard] = useState(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
  const [boardPieces, setBoardPieces] = useState({});
  const [usedPieces, setUsedPieces] = useState([]);
  const [myPlayerNumber, setMyPlayerNumber] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  // v7.28: Turn transition pulse & confirm flash feedback
  const [turnPulse, setTurnPulse] = useState(false);
  const [confirmFlashCells, setConfirmFlashCells] = useState(null);
  const [opponent, setOpponent] = useState(null);
  
  // UI state
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [pendingMove, setPendingMove] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null); // For invalid placement message
  const [showGameOver, setShowGameOver] = useState(false);
  const [rematchMessage, setRematchMessage] = useState(null);
  const [rematchError, setRematchError] = useState(null);
  const [rematchCountdown, setRematchCountdown] = useState(null); // v7.27: live countdown for sender
  const [gameResult, setGameResult] = useState(null);
  
  // Rematch request system state
  const [showRematchModal, setShowRematchModal] = useState(false);
  const [rematchRequest, setRematchRequest] = useState(null);
  const [isRematchRequester, setIsRematchRequester] = useState(false);
  const [rematchWaiting, setRematchWaiting] = useState(false);
  const [rematchAccepted, setRematchAccepted] = useState(false);
  const [rematchDeclined, setRematchDeclined] = useState(false);
  const [newGameFromRematch, setNewGameFromRematch] = useState(null);
  
  // Quit/forfeit confirmation toast
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [quitIsForfeit, setQuitIsForfeit] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const [chatToast, setChatToast] = useState(null); // { senderName, message, timestamp }
  const [turnStartedAt, setTurnStartedAt] = useState(null);
  const [connected, setConnected] = useState(false); // Track realtime connection
  const [winningMoveCells, setWinningMoveCells] = useState(null); // Gold/confetti cells for completed games
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isValidDrop, setIsValidDrop] = useState(false);
  const [dragPreviewCell, setDragPreviewCell] = useState(null); // v7.22: Live preview cell during drag
  const [pieceCellOffset, setPieceCellOffset] = useState({ row: 0, col: 0 }); // Offset from anchor to touched cell
  
  // Refs
  const boardRef = useRef(null);
  const boardBoundsRef = useRef(null);
  const hasDragStartedRef = useRef(false);
  const turnStartRef = useRef(Date.now());
  const moveInProgressRef = useRef(false);
  const expectedPieceCountRef = useRef(null);
  const mountedRef = useRef(true);
  const dismissedGameOverRef = useRef(false);
  const isReviewModeRef = useRef(false);  // v7.26: True when viewing an already-completed game
  const prevBoardPiecesRef = useRef({});  // Track previous board pieces for opponent animation
  const prevGameIdRef = useRef(null);  // v7.23: Track previous game ID to prevent spurious resets
  const countdownIntervalRef = useRef(null);  // v7.28: Ref so acceptance poll can clear it
  // Refs for synchronous access in touch handlers
  const isDraggingRef = useRef(false);
  const draggedPieceRef = useRef(null);
  const pieceCellOffsetRef = useRef({ row: 0, col: 0 });
  const scrollChildRef = useRef(null); // v7.30: imperative touch-action for iOS drag fix
  const dragPreviewCellRef = useRef(null); // v7.36: synchronous cell tracking for endDrag
  const mouseHandlersRef = useRef(null); // v7.37: tracks synchronous mouse handlers for cleanup

  // Placement animation hook
  const { animation: placementAnimation, triggerAnimation, clearAnimation } = usePlacementAnimation();

  const userId = user?.id;
  const hasMovesPlayed = usedPieces.length > 0;

  // =========================================================================
  // DRAG HANDLERS - Simplified to match working GameScreen approach
  // =========================================================================
  
  // Simple board cell calculation
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
    
    const col = Math.floor(relX / cellWidth);
    const row = Math.floor(relY / cellHeight);
    
    // Allow some margin for pieces that extend beyond anchor
    const EXTENSION_MARGIN = 4;
    if (row >= -EXTENSION_MARGIN && row < BOARD_SIZE + EXTENSION_MARGIN && 
        col >= -EXTENSION_MARGIN && col < BOARD_SIZE + EXTENSION_MARGIN) {
      return { row, col };
    }
    return null;
  }, []);

  // Attach global touch handlers synchronously (critical for mobile drag from board)
  const attachGlobalTouchHandlers = useCallback(() => {
    const handleGlobalTouchMove = (e) => {
      if (!isDraggingRef.current) return;
      
      const touch = e.touches?.[0];
      if (!touch) return;
      
      setDragPosition({ x: touch.clientX, y: touch.clientY });
      
      if (boardRef.current) {
        boardBoundsRef.current = boardRef.current.getBoundingClientRect();
      }
      
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
          const coords = getPieceCoords(draggedPieceRef.current, rotation, flipped);
          
          const minX = Math.min(...coords.map(([x]) => x));
          const maxX = Math.max(...coords.map(([x]) => x));
          const minY = Math.min(...coords.map(([, y]) => y));
          const maxY = Math.max(...coords.map(([, y]) => y));
          
          const centerOffsetCol = Math.floor((maxX + minX) / 2);
          const centerOffsetRow = Math.floor((maxY + minY) / 2);
          
          const adjustedRow = row - centerOffsetRow;
          const adjustedCol = col - centerOffsetCol;
          
          setDragPreviewCell({ row: adjustedRow, col: adjustedCol });
          dragPreviewCellRef.current = { row: adjustedRow, col: adjustedCol };
          
          const valid = canPlacePiece(board, adjustedRow, adjustedCol, coords);
          setIsValidDrop(valid);
        } else {
          setDragPreviewCell(null);
          dragPreviewCellRef.current = null;
          setIsValidDrop(false);
        }
      }
      
      if (e.cancelable) {
        e.preventDefault();
      }
    };
    
    const handleGlobalTouchEnd = () => {
      if (!isDraggingRef.current) return;
      
      // v7.36: Use refs for pendingMove — same pattern as endDrag
      const previewCell = dragPreviewCellRef.current;
      const piece = draggedPieceRef.current;
      if (previewCell && piece) {
        setPendingMove({ piece: piece, row: previewCell.row, col: previewCell.col });
      }
      
      isDraggingRef.current = false;
      hasDragStartedRef.current = false;
      dragPreviewCellRef.current = null;
      
      setIsDragging(false);
      
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      if (scrollChildRef.current) scrollChildRef.current.style.touchAction = '';
      
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
      window.removeEventListener('touchcancel', handleGlobalTouchEnd);
    };
    
    window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    window.addEventListener('touchend', handleGlobalTouchEnd);
    window.addEventListener('touchcancel', handleGlobalTouchEnd);
  }, [rotation, flipped, board]);

  // v7.37: Attach global MOUSE handlers synchronously — same pattern as touch handlers.
  // The useEffect-based mouse handlers wait for isDragging state (async), creating a gap
  // where desktop mousemove/mouseup events are lost. This attaches immediately in startDrag.
  const attachGlobalMouseHandlers = useCallback(() => {
    // Clean up any previous handlers
    if (mouseHandlersRef.current) {
      window.removeEventListener('mousemove', mouseHandlersRef.current.move);
      window.removeEventListener('mouseup', mouseHandlersRef.current.up);
    }
    
    const handleGlobalMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      
      const piece = draggedPieceRef.current;
      if (!piece) return;
      
      setDragPosition({ x: e.clientX, y: e.clientY });
      
      if (boardRef.current) {
        boardBoundsRef.current = boardRef.current.getBoundingClientRect();
      }
      
      if (boardBoundsRef.current) {
        const { left, top, width, height } = boardBoundsRef.current;
        const cellWidth = width / BOARD_SIZE;
        const cellHeight = height / BOARD_SIZE;
        const isMobile = false; // desktop
        const fingerOffset = 20;
        
        const relX = e.clientX - left;
        const relY = (e.clientY - fingerOffset) - top;
        
        const col = Math.floor(relX / cellWidth);
        const row = Math.floor(relY / cellHeight);
        
        const EXTENSION_MARGIN = 4;
        if (row >= -EXTENSION_MARGIN && row < BOARD_SIZE + EXTENSION_MARGIN && 
            col >= -EXTENSION_MARGIN && col < BOARD_SIZE + EXTENSION_MARGIN) {
          const coords = getPieceCoords(piece, rotation, flipped);
          
          const minX = Math.min(...coords.map(([x]) => x));
          const maxX = Math.max(...coords.map(([x]) => x));
          const minY = Math.min(...coords.map(([, y]) => y));
          const maxY = Math.max(...coords.map(([, y]) => y));
          
          const centerOffsetCol = Math.floor((maxX + minX) / 2);
          const centerOffsetRow = Math.floor((maxY + minY) / 2);
          
          const adjustedRow = row - centerOffsetRow;
          const adjustedCol = col - centerOffsetCol;
          
          setDragPreviewCell({ row: adjustedRow, col: adjustedCol });
          dragPreviewCellRef.current = { row: adjustedRow, col: adjustedCol };
          
          const valid = canPlacePiece(board, adjustedRow, adjustedCol, coords);
          setIsValidDrop(valid);
        } else {
          setDragPreviewCell(null);
          dragPreviewCellRef.current = null;
          setIsValidDrop(false);
        }
      }
    };
    
    const handleGlobalMouseUp = () => {
      if (!isDraggingRef.current) return;
      
      const previewCell = dragPreviewCellRef.current;
      const piece = draggedPieceRef.current;
      if (previewCell && piece) {
        setPendingMove({ piece: piece, row: previewCell.row, col: previewCell.col });
      }
      
      isDraggingRef.current = false;
      draggedPieceRef.current = null;
      hasDragStartedRef.current = false;
      pieceCellOffsetRef.current = { row: 0, col: 0 };
      dragPreviewCellRef.current = null;
      
      setIsDragging(false);
      setDraggedPiece(null);
      setDragPosition({ x: 0, y: 0 });
      setDragOffset({ x: 0, y: 0 });
      setIsValidDrop(false);
      setDragPreviewCell(null);
      setPieceCellOffset({ row: 0, col: 0 });
      
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      if (scrollChildRef.current) scrollChildRef.current.style.touchAction = '';
      
      // Self-cleanup
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      mouseHandlersRef.current = null;
    };
    
    mouseHandlersRef.current = { move: handleGlobalMouseMove, up: handleGlobalMouseUp };
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
  }, [rotation, flipped, board]);

  // Start drag from piece tray
  const startDrag = useCallback((piece, clientX, clientY, elementRect) => {
    if (hasDragStartedRef.current) return;
    if (game?.status !== 'active' || usedPieces.includes(piece) || !isMyTurn) return;
    
    // Set refs synchronously FIRST
    hasDragStartedRef.current = true;
    isDraggingRef.current = true;
    draggedPieceRef.current = piece;
    pieceCellOffsetRef.current = { row: 0, col: 0 };
    
    // Attach global touch handlers IMMEDIATELY
    attachGlobalTouchHandlers();
    // v7.37: Also attach global mouse handlers IMMEDIATELY (desktop)
    attachGlobalMouseHandlers();
    
    // Update board bounds
    if (boardRef.current) {
      boardBoundsRef.current = boardRef.current.getBoundingClientRect();
    }
    
    const offsetX = elementRect ? clientX - (elementRect.left + elementRect.width / 2) : 0;
    const offsetY = elementRect ? clientY - (elementRect.top + elementRect.height / 2) : 0;
    
    setDraggedPiece(piece);
    setDragPosition({ x: clientX, y: clientY });
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
    setPieceCellOffset({ row: 0, col: 0 });
    
    setSelectedPiece(piece);
    setPendingMove(null);
    soundManager.playPieceSelect();
    
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    if (scrollChildRef.current) scrollChildRef.current.style.touchAction = 'none';
  }, [game?.status, usedPieces, isMyTurn, attachGlobalTouchHandlers, attachGlobalMouseHandlers]);

  // Handle drag from pending piece on board
  const handleBoardDragStart = useCallback((piece, clientX, clientY, elementRect) => {
    if (hasDragStartedRef.current) return;
    if (game?.status !== 'active' || !isMyTurn) return;
    if (!pendingMove || pendingMove.piece !== piece) return;
    
    // Set refs synchronously FIRST
    hasDragStartedRef.current = true;
    isDraggingRef.current = true;
    draggedPieceRef.current = piece;
    
    // Attach global touch handlers IMMEDIATELY
    attachGlobalTouchHandlers();
    // v7.37: Also attach global mouse handlers IMMEDIATELY (desktop)
    attachGlobalMouseHandlers();
    
    // Update board bounds
    if (boardRef.current) {
      boardBoundsRef.current = boardRef.current.getBoundingClientRect();
    }
    
    // Calculate which cell of the piece was touched
    if (pendingMove && boardBoundsRef.current) {
      const { left, top, width, height } = boardBoundsRef.current;
      const cellWidth = width / BOARD_SIZE;
      const cellHeight = height / BOARD_SIZE;
      
      const fingerCol = Math.floor((clientX - left) / cellWidth);
      const fingerRow = Math.floor((clientY - top) / cellHeight);
      
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
    
    const offsetX = elementRect ? clientX - (elementRect.left + elementRect.width / 2) : 0;
    const offsetY = elementRect ? clientY - (elementRect.top + elementRect.height / 2) : 0;
    
    setDraggedPiece(piece);
    setDragPosition({ x: clientX, y: clientY });
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
    
    soundManager.playPieceSelect();
    
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    if (scrollChildRef.current) scrollChildRef.current.style.touchAction = 'none';
  }, [game?.status, isMyTurn, pendingMove, attachGlobalTouchHandlers, attachGlobalMouseHandlers]);

  // Update drag position
  const updateDrag = useCallback((clientX, clientY) => {
    // v7.35: Use refs as fallback — pointer events fire before React state commits,
    // so isDragging/draggedPiece (state) may still be false on the first pointermove
    if (!isDragging && !isDraggingRef.current) return;
    const piece = draggedPiece || draggedPieceRef.current;
    if (!piece) return;
    
    setDragPosition({ x: clientX, y: clientY });
    
    if (boardRef.current) {
      boardBoundsRef.current = boardRef.current.getBoundingClientRect();
    }
    
    const cell = calculateBoardCell(clientX, clientY);
    
    if (cell) {
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
      
      // v7.22: Update dragPreviewCell for live board preview
      setDragPreviewCell({ row: adjustedRow, col: adjustedCol });
      dragPreviewCellRef.current = { row: adjustedRow, col: adjustedCol };
      
      const valid = canPlacePiece(board, adjustedRow, adjustedCol, coords);
      setIsValidDrop(valid);
    } else {
      setDragPreviewCell(null);
      dragPreviewCellRef.current = null;
      setIsValidDrop(false);
    }
  }, [isDragging, draggedPiece, rotation, flipped, board, calculateBoardCell]);

  // End drag
  const endDrag = useCallback(() => {
    if (!isDragging && !isDraggingRef.current) return;
    
    // v7.36: Use refs as fallback — React state may not have committed yet
    // on fast pointer event cycles (especially iOS)
    const previewCell = dragPreviewCell || dragPreviewCellRef.current;
    const piece = draggedPiece || draggedPieceRef.current;
    
    // v7.22: Set pendingMove from dragPreviewCell when drag ends
    if (previewCell && piece) {
      setPendingMove({ piece: piece, row: previewCell.row, col: previewCell.col });
    }
    
    // Clear refs
    isDraggingRef.current = false;
    draggedPieceRef.current = null;
    hasDragStartedRef.current = false;
    pieceCellOffsetRef.current = { row: 0, col: 0 };
    dragPreviewCellRef.current = null;
    
    // Clear state
    setIsDragging(false);
    setDraggedPiece(null);
    setDragPosition({ x: 0, y: 0 });
    setDragOffset({ x: 0, y: 0 });
    setIsValidDrop(false);
    setDragPreviewCell(null);
    setPieceCellOffset({ row: 0, col: 0 });
    
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    if (scrollChildRef.current) scrollChildRef.current.style.touchAction = '';
    
    // v7.37: Clean up synchronous mouse handlers
    if (mouseHandlersRef.current) {
      window.removeEventListener('mousemove', mouseHandlersRef.current.move);
      window.removeEventListener('mouseup', mouseHandlersRef.current.up);
      mouseHandlersRef.current = null;
    }
  }, [isDragging, dragPreviewCell, draggedPiece]);

  // Create drag handlers for PieceTray
  // SIMPLIFIED: Since pieces have touch-action: none, we start drag immediately
  // Create drag handlers for PieceTray
  // Since pieces have touch-action: none, we start drag immediately on touchstart
  const createDragHandlers = useCallback((piece) => {
    if (game?.status !== 'active' || usedPieces.includes(piece) || !isMyTurn) {
      return {};
    }

    let elementRect = null;

    // Touch start - start drag immediately (touch-action: none prevents scrolling)
    const handleTouchStart = (e) => {
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

    // Touch move - handle locally before global handlers attach
    const handleTouchMove = (e) => {
      if (hasDragStartedRef.current && e.touches?.[0]) {
        e.preventDefault();
        updateDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    
    // Touch end - handle locally before global handlers attach
    const handleTouchEnd = (e) => {
      if (hasDragStartedRef.current) {
        e.preventDefault();
        endDrag();
      }
    };

    // Mouse handlers for desktop
    const handleMouseDown = (e) => {
      if (e.button !== 0) return;
      elementRect = e.currentTarget?.getBoundingClientRect() || null;
      
      if (boardRef?.current) {
        boardBoundsRef.current = boardRef.current.getBoundingClientRect();
      }
      
      startDrag(piece, e.clientX, e.clientY, elementRect);
    };

    // v7.33: Pointer event handlers — PieceTray calls these with setPointerCapture,
    // which bypasses iOS UIScrollView gesture recognition entirely.
    // When PieceTray detects onPointerDown in dragEvents, it switches from touch
    // events to pointer events for the full drag lifecycle.
    const handlePointerDown = (e) => {
      if (!e.isPrimary) return;
      
      elementRect = e.currentTarget?.getBoundingClientRect() || null;
      
      if (boardRef?.current) {
        boardBoundsRef.current = boardRef.current.getBoundingClientRect();
      }
      
      startDrag(piece, e.clientX, e.clientY, elementRect);
    };

    const handlePointerMove = (e) => {
      if (hasDragStartedRef.current) {
        e.preventDefault();
        updateDrag(e.clientX, e.clientY);
      }
    };

    const handlePointerUp = () => {
      if (hasDragStartedRef.current) {
        endDrag();
      }
    };

    return {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onMouseDown: handleMouseDown,
      // v7.33: Pointer events for iOS — PieceTray uses these with setPointerCapture
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
    };
  }, [game?.status, usedPieces, isMyTurn, startDrag, updateDrag, endDrag]);

  // Global mouse handlers
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => updateDrag(e.clientX, e.clientY);
    const handleMouseUp = () => endDrag();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, updateDrag, endDrag]);

  // Global touch handlers
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

  // Poll for rematch requests when game is over
  useEffect(() => {
    if (!showGameOver || !gameId || !user?.id) return;
    
    let pollInterval;
    let mounted = true;
    
    const checkRematch = async () => {
      if (!mounted) return;
      
      try {
        // Use getRematchRequestByGame to get any status (including accepted)
        const { data: request } = await rematchService.getRematchRequestByGame(gameId, user.id);
        
        if (!mounted) return;
        
        if (request) {
          setRematchRequest(request);
          
          // Check if we're the requester or receiver
          const isSender = request.from_user_id === user.id;
          setIsRematchRequester(isSender);
          
          // Handle accepted rematch - navigate to new game
          // v7.27: Skip in review mode - stale accepted rematch for old game was wiping the board
          if (request.status === 'accepted' && request.new_game_id && !isReviewModeRef.current) {
            // console.log('[OnlineGameScreen] Rematch accepted! New game:', request.new_game_id);
            setRematchAccepted(true);
            setShowRematchModal(false);
            soundManager.playSound('notification');
            // Store new game ID and trigger navigation via state change
            setNewGameFromRematch(request.new_game_id);
            // Reset game state for new game
            setCurrentGameId(request.new_game_id);
            setGame(null);
            setLoading(true);
            setShowGameOver(false);
            setRematchWaiting(false);
            setRematchRequest(null);
            setIsRematchRequester(false);
            setRematchDeclined(false);
            setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
            setBoardPieces({});
            setUsedPieces([]);
            setSelectedPiece(null);
            setPendingMove(null);
            setRotation(0);
            setFlipped(false);
            setWinningMoveCells(null);
            return;
          }
          
          // Handle declined rematch
          if (request.status === 'declined') {
            setRematchDeclined(true);
            setRematchWaiting(false);
            return;
          }
          
          // Handle pending request
          if (request.status === 'pending') {
            // If we're the receiver and haven't seen this request yet, show modal
            // v7.26: Skip in review mode - don't interrupt viewing a completed game
            if (!isSender && !showRematchModal && !rematchDeclined && !isReviewModeRef.current) {
              setShowRematchModal(true);
              soundManager.playSound('notification');
            }
            
            // If we're the requester, show waiting state
            // v7.26: Skip in review mode - sender was already navigated away
            if (isSender && !rematchAccepted && !isReviewModeRef.current) {
              setRematchWaiting(true);
              if (!showRematchModal) {
                setShowRematchModal(true);
              }
            }
          }
        } else if (rematchRequest && !rematchAccepted && rematchRequest.status === 'pending') {
          // Request was cancelled or expired
          if (isRematchRequester) {
            // Our request was declined or expired
            setRematchDeclined(true);
            setRematchWaiting(false);
          }
        }
      } catch (e) {
        console.error('[OnlineGameScreen] Rematch poll error:', e);
      }
    };
    
    // Initial check
    checkRematch();
    
    // Poll every 2 seconds
    pollInterval = setInterval(checkRematch, 2000);
    
    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [showGameOver, gameId, user?.id, showRematchModal, rematchDeclined, rematchAccepted, isRematchRequester]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      if (scrollChildRef.current) scrollChildRef.current.style.touchAction = '';
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      // v7.37: Clean up synchronous mouse handlers
      if (mouseHandlersRef.current) {
        window.removeEventListener('mousemove', mouseHandlersRef.current.move);
        window.removeEventListener('mouseup', mouseHandlersRef.current.up);
        mouseHandlersRef.current = null;
      }
    };
  }, []);

  // Update board bounds
  useEffect(() => {
    if (boardRef.current) {
      boardBoundsRef.current = boardRef.current.getBoundingClientRect();
    }
  }, [board]);

  // Calculate if pending move is valid
  const canConfirm = useMemo(() => {
    if (!pendingMove) return false;
    const coords = getPieceCoords(pendingMove.piece, rotation, flipped);
    return canPlacePiece(board, pendingMove.row, pendingMove.col, coords);
  }, [pendingMove, rotation, flipped, board]);

  // =========================================================================
  // GAME STATE MANAGEMENT - FIXED REAL-TIME UPDATES
  // =========================================================================

  const updateGameState = useCallback((gameData, currentUserId) => {
    if (!gameData || !mountedRef.current) return;

    /* updateGameState debug - disabled for production
    // console.log('updateGameState: Received', { 
      // id: gameData.id, 
      // status: gameData.status,
      // current_player: gameData.current_player,
      // pieces: gameData.used_pieces?.length 
    // });
    */

    let validBoard = gameData.board;
    if (!Array.isArray(validBoard) || validBoard.length !== BOARD_SIZE) {
      validBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    } else {
      validBoard = validBoard.map(row => row.map(cell => (cell === 0 ? null : cell)));
    }
    
    // DETECT OPPONENT'S NEW PIECE PLACEMENT FOR ANIMATION
    const newBoardPieces = gameData.board_pieces || {};
    const prevPieces = prevBoardPiecesRef.current;
    const newCellKeys = Object.keys(newBoardPieces).filter(key => !prevPieces[key]);
    
    // Track if we're animating a new opponent move
    let animatingOpponentMove = false;
    
    // If there are new cells and it's now our turn (opponent just moved), trigger opponent animation
    if (currentUserId && newCellKeys.length > 0 && !moveInProgressRef.current) {
      const playerNum = gameData.player1_id === currentUserId ? 1 : 2;
      const opponentNum = playerNum === 1 ? 2 : 1;
      const isNowMyTurn = gameData.current_player === playerNum && gameData.status === 'active';
      const isGameOver = gameData.status === 'completed';
      
      // Animate if it's now our turn (meaning opponent just moved) OR if game just ended
      if ((isNowMyTurn || isGameOver) && boardRef.current) {
        animatingOpponentMove = true;
        const newCells = newCellKeys.map(key => {
          const [row, col] = key.split(',').map(Number);
          return { row, col };
        });
        
        const boardRect = boardRef.current.getBoundingClientRect();
        const cellSize = boardRect.width / BOARD_SIZE;
        
        // Small delay to let the board render first
        setTimeout(() => {
          triggerAnimation(newCells, opponentNum, boardRef, cellSize);
        }, 100);
      }
    }
    
    // Update ref with current board pieces
    prevBoardPiecesRef.current = newBoardPieces;
    
    setGame(gameData);
    setBoard(validBoard);
    setBoardPieces(newBoardPieces);
    setUsedPieces(Array.isArray(gameData.used_pieces) ? gameData.used_pieces : []);
    
    if (gameData.turn_started_at) {
      setTurnStartedAt(gameData.turn_started_at);
    }

    if (currentUserId) {
      const playerNum = gameData.player1_id === currentUserId ? 1 : 2;
      setMyPlayerNumber(playerNum);
      
      const opp = playerNum === 1 ? gameData.player2 : gameData.player1;
      setOpponent(opp);

      const myTurn = gameData.current_player === playerNum && gameData.status === 'active';
      const wasMyTurn = isMyTurn;
      setIsMyTurn(myTurn);
      
      if (myTurn && !wasMyTurn) {
        turnStartRef.current = Date.now();
        // Play notification sound when it becomes our turn
        soundManager.playSound('notification');
        
        // v7.28: Board edge pulse for ~650ms to catch attention
        setTurnPulse(true);
        setTimeout(() => setTurnPulse(false), 650);
        
        // v7.12 FIX: Send push notification if page is hidden (user not actively viewing)
        if (document.visibilityState === 'hidden' || document.hidden) {
          const opponentName = gameData.player1_id === currentUserId 
            ? (gameData.player2?.display_name || gameData.player2?.username)
            : (gameData.player1?.display_name || gameData.player1?.username);
          notificationService.notifyYourTurn(opponentName || 'Opponent', currentGameId);
        }
      }

      // FIXED: Game over detection with animation delay
      // v7.27: Also gate on isReviewModeRef — when user opens a completed game to
      // review, loadGame's completed-game branch schedules a 5-second delayed show.
      // Without this check, updateGameState fires setShowGameOver(true) immediately
      // on the same data, bypassing the review window.
      if (gameData.status === 'completed' && !showGameOver && !dismissedGameOverRef.current && !isReviewModeRef.current) {
        const iWon = gameData.winner_id === currentUserId;
        const result = {
          isWin: iWon,
          winnerId: gameData.winner_id,
          reason: gameData.winner_id ? 'normal' : 'draw'
        };
        setGameResult(result);
        
        // v7.14: Update play streak when online game completes
        if (currentUserId) {
          streakService.updateStreak(currentUserId).then(({ data }) => {
            if (data?.new_achievements?.length > 0) {
              // console.log('[OnlineGame] New streak achievements:', data.new_achievements);
            }
          }).catch(err => console.warn('[OnlineGame] Failed to update streak:', err));
        }
        
        // If we're animating opponent's final move, delay the popup
        // Otherwise show immediately (game was already over when loaded)
        if (animatingOpponentMove) {
          setTimeout(() => {
            if (mountedRef.current) {
              setShowGameOver(true);
              soundManager.playSound(iWon ? 'win' : 'lose');
            }
          }, 1200); // Delay to let animation complete
        } else {
          setShowGameOver(true);
          soundManager.playSound(iWon ? 'win' : 'lose');
        }
      }
    }
  }, [isMyTurn, showGameOver, triggerAnimation]);

  // FIXED: Load game and subscribe to REAL-TIME updates
  useEffect(() => {
    if (!currentGameId || !userId) return;
    
    mountedRef.current = true;
    
    // v7.23: CRITICAL FIX - Only reset game over state when GAME ID actually changes
    // Previously, updateGameState in deps caused this effect to re-run when showGameOver changed,
    // which reset the modal state immediately after it was set (modal never appeared)
    const isNewGame = prevGameIdRef.current !== currentGameId;
    if (isNewGame) {
      prevGameIdRef.current = currentGameId;
      dismissedGameOverRef.current = false;
      isReviewModeRef.current = false;
      setShowGameOver(false);
      setGameResult(null);
      setWinningMoveCells(null);
    }
    
    // console.log('OnlineGameScreen: Starting game load', { gameId: currentGameId, userId });

    const loadingTimeout = setTimeout(() => {
      if (mountedRef.current && loading) {
        setError('Loading took too long. Please try again.');
        setLoading(false);
      }
    }, 15000);

    const loadGame = async () => {
      try {
        const { data, error: fetchError } = await gameSyncService.getGame(currentGameId);
        
        if (!mountedRef.current) return;
        clearTimeout(loadingTimeout);
        
        if (fetchError) {
          setError('Failed to load game: ' + (fetchError.message || 'Unknown error'));
          setLoading(false);
          return;
        }

        if (!data) {
          setError('Game not found');
          setLoading(false);
          return;
        }

        // v7.13: Check if this is a completed game being viewed (unviewed loss)
        const isCompletedGame = data.status === 'completed';
        const playerNum = data.player1_id === userId ? 1 : 2;
        const iWon = data.winner_id === userId;
        
        // For completed games, we want to show the board first, then the modal
        // So we'll set the game state but NOT trigger game over yet
        if (isCompletedGame) {
          // v7.27: Set review mode flag IMMEDIATELY — before any state updates can
          // trigger updateGameState, which would otherwise fire setShowGameOver(true)
          // right away and bypass the 5-second review window. This flag is checked
          // in updateGameState's completed-game branch to suppress the immediate show.
          isReviewModeRef.current = true;
          
          // Set game result for later use
          const result = {
            isWin: iWon,
            winnerId: data.winner_id,
            reason: data.winner_id ? 'normal' : 'draw'
          };
          setGameResult(result);
          
          // Set up board state WITHOUT showing game over modal
          const validBoard = data.board && Array.isArray(data.board) && data.board.length === BOARD_SIZE
            ? data.board.map(row => Array.isArray(row) && row.length === BOARD_SIZE 
                ? row.map(cell => cell === null || cell === undefined ? 0 : cell)
                : Array(BOARD_SIZE).fill(0))
            : Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
          
          setGame(data);
          setBoard(validBoard);
          setBoardPieces(data.board_pieces || {});
          setUsedPieces(Array.isArray(data.used_pieces) ? data.used_pieces : []);
          setMyPlayerNumber(playerNum);
          setOpponent(playerNum === 1 ? data.player2 : data.player1);
          setIsMyTurn(false);
          setLoading(false);
          
          // Fetch and show the winning move with gold/confetti effect
          const { data: lastMove } = await gameSyncService.getLastMove(currentGameId);
          
          if (lastMove && mountedRef.current) {
            // v7.17: Use getPieceCoords for correct transformation (matches game logic)
            const rot = lastMove.rotation || 0;
            const flip = lastMove.flipped || false;
            const coords = getPieceCoords(lastMove.piece_type, rot, flip);
            
            if (coords && coords.length > 0) {
              const placedCells = coords.map(([dx, dy]) => ({
                row: lastMove.row + dy,
                col: lastMove.col + dx
              })).filter(cell => 
                cell.row >= 0 && cell.row < BOARD_SIZE && 
                cell.col >= 0 && cell.col < BOARD_SIZE
              );
              
              // Set gold/confetti cells instead of PlacementAnimation
              setTimeout(() => {
                if (mountedRef.current) {
                  setWinningMoveCells(placedCells);
                }
              }, 500);
            }
          }
          
          // v7.18: Show game over modal after 5 second delay for completed games
          // This gives user time to see the board and the winning move
          // NOTE: Only check dismissedGameOverRef (not showGameOver) to avoid stale closure
          // v7.26: Mark as review mode so rematch polling won't auto-show RematchModal
          isReviewModeRef.current = true;
          setTimeout(() => {
            if (mountedRef.current && !dismissedGameOverRef.current) {
              setShowGameOver(true);
              soundManager.playSound(iWon ? 'win' : 'lose');
            }
          }, 5000);
          
          return; // Don't continue to regular game state update
        }

        // Regular game loading (active games)
        updateGameState(data, userId);
        setLoading(false);
        
        // REPLAY LAST MOVE: If there are pieces on the board and it's now our turn,
        // fetch and replay the opponent's last move so user can see what changed
        const isMyTurnNow = data.current_player === playerNum && data.status === 'active';
        const hasMovesOnBoard = data.used_pieces && data.used_pieces.length > 0;
        
        if (hasMovesOnBoard && isMyTurnNow) {
          // Fetch the last move
          const { data: lastMove } = await gameSyncService.getLastMove(currentGameId);
          
          if (lastMove && lastMove.player_id !== userId) {
            // This was opponent's move - replay animation after a short delay
            const opponentNum = playerNum === 1 ? 2 : 1;
            
            // Wait for board to render, then trigger animation
            setTimeout(() => {
              if (!mountedRef.current || !boardRef.current) return;
              
              // v7.17: Use getPieceCoords for correct transformation (matches game logic)
              const rot = lastMove.rotation || 0;
              const flip = lastMove.flipped || false;
              const coords = getPieceCoords(lastMove.piece_type, rot, flip);
              
              if (!coords || coords.length === 0) return;
              
              // Calculate actual board positions
              const placedCells = coords.map(([dx, dy]) => ({
                row: lastMove.row + dy,
                col: lastMove.col + dx
              })).filter(cell => 
                cell.row >= 0 && cell.row < BOARD_SIZE && 
                cell.col >= 0 && cell.col < BOARD_SIZE
              );
              
              // Trigger animation
              const boardRect = boardRef.current.getBoundingClientRect();
              const cellSize = boardRect.width / BOARD_SIZE;
              triggerAnimation(placedCells, opponentNum, boardRef, cellSize);
            }, 500); // Delay to let board render first
          }
        }
      } catch (err) {
        if (mountedRef.current) {
          clearTimeout(loadingTimeout);
          setError('Error loading game: ' + err.message);
          setLoading(false);
        }
      }
    };

    loadGame();

    // FIXED: Subscribe to real-time updates via gameSyncService ONLY (no duplicate)
    // console.log('[OnlineGameScreen] Subscribing to real-time updates via gameSyncService');
    
    const subscription = gameSyncService.subscribeToGame(
      currentGameId,
      (updatedGame) => {
        if (!mountedRef.current) return;
        if (!updatedGame || updatedGame.id !== currentGameId) return;
        
        /* Real-time update debug - disabled for production
        // console.log('Real-time update received', {
          // pieces: updatedGame?.used_pieces?.length,
          // expected: expectedPieceCountRef.current,
          // moveInProgress: moveInProgressRef.current
        // });
        */
        
        // Skip stale updates
        if (expectedPieceCountRef.current !== null) {
          const incoming = updatedGame.used_pieces?.length || 0;
          if (incoming < expectedPieceCountRef.current) {
            // console.log('Ignoring stale update');
            return;
          }
          expectedPieceCountRef.current = null;
        }
        
        // Skip if move in progress
        if (moveInProgressRef.current) {
          // console.log('Move in progress, will fetch fresh state after');
          return;
        }
        
        updateGameState(updatedGame, userId);
        setConnected(true);
      },
      (err) => {
        console.error('[OnlineGameScreen] Subscription error:', err);
        setConnected(false);
      }
    );

    return () => {
      mountedRef.current = false;
      // v7.25: Removed dismissedGameOverRef reset from cleanup
      // It was causing the game over modal to re-appear after X button dismiss
      // because showGameOver changing → updateGameState recreated → this effect re-runs →
      // cleanup resets the ref → loadGame timeout re-shows the modal.
      // The ref is correctly reset when game ID changes (in the isNewGame check above).
      clearTimeout(loadingTimeout);
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [currentGameId, userId, updateGameState]);

  // Subscribe to chat messages for notification when chat is closed
  // Chat notification subscription - FIXED: Use supabase directly
  useEffect(() => {
    if (!currentGameId || !user?.id || !supabase) return;
    
    // console.log('[OnlineGameScreen] Setting up chat notification subscription');
    
    // Subscribe to chat messages
    const chatChannel = supabase
      .channel(`chat-notify-${currentGameId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_chat',
          filter: `game_id=eq.${currentGameId}`
        },
        (payload) => {
          // Only notify if message is from opponent and chat is closed
          if (payload.new.sender_id !== user.id && !chatOpen) {
            // console.log('[OnlineGameScreen] New chat message from opponent!');
            setHasUnreadChat(true);
            soundManager.playSound('notification');
            
            // Show floating toast banner
            const opponentName = opponent?.display_name || opponent?.username || 'Opponent';
            const message = payload.new.message || payload.new.quick_message || 'Sent a message';
            const toastTimestamp = Date.now();
            
            setChatToast({
              senderName: opponentName,
              message: message,
              timestamp: toastTimestamp
            });
            
            // Auto-hide toast after 5 seconds
            setTimeout(() => {
              setChatToast(prev => {
                if (prev?.timestamp === toastTimestamp) return null;
                return prev;
              });
            }, 5000);
            
            // Send push notification only when app is in background
            // (in-app toast handles the foreground case; matches your-turn notification pattern)
            if (document.visibilityState === 'hidden' || document.hidden) {
              notificationService.notifyChatMessage(opponentName, message, currentGameId);
            }
          }
        }
      )
      .subscribe((status) => {
        // console.log('[OnlineGameScreen] Chat channel status:', status);
      });
    
    return () => {
      // console.log('[OnlineGameScreen] Cleaning up chat subscription');
      chatChannel.unsubscribe();
    };
  }, [currentGameId, user?.id, chatOpen, opponent]);

  // Check for openChat flag from notification navigation
  useEffect(() => {
    // Check URL param first
    const params = new URLSearchParams(window.location.search);
    if (params.get('openChat') === 'true') {
      setChatOpen(true);
      setHasUnreadChat(false);
      setChatToast(null);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // Check sessionStorage (set by App.jsx from notification navigation)
    const sessionOpenChat = sessionStorage.getItem('deadblock_open_chat');
    if (sessionOpenChat === 'true') {
      setChatOpen(true);
      setHasUnreadChat(false);
      setChatToast(null);
      sessionStorage.removeItem('deadblock_open_chat');
    }
  }, [currentGameId]);

  // Show error message when placement is invalid
  useEffect(() => {
    if (pendingMove) {
      const coords = getPieceCoords(pendingMove.piece, rotation, flipped);
      const isValid = canPlacePiece(board, pendingMove.row, pendingMove.col, coords);
      if (!isValid) {
        setErrorMessage('Invalid placement!');
      } else {
        setErrorMessage(null);
      }
    } else {
      setErrorMessage(null);
    }
  }, [pendingMove, rotation, flipped, board]);

  // =========================================================================
  // GAME ACTIONS
  // =========================================================================

  const handleSelectPiece = useCallback((piece) => {
    if (!isMyTurn || game?.status !== 'active') return;
    if (usedPieces.includes(piece)) return;
    
    setSelectedPiece(piece);
    setPendingMove(null);
    setRotation(0);
    setFlipped(false);
    soundManager.playPieceSelect();
  }, [isMyTurn, game?.status, usedPieces]);

  const handleCellClick = useCallback((row, col) => {
    if (isDragging) return;
    if (!isMyTurn || game?.status !== 'active') return;
    if (!selectedPiece) return;
    
    setPendingMove({ piece: selectedPiece, row, col });
    soundManager.playClickSound('neutral');
  }, [isDragging, isMyTurn, game?.status, selectedPiece]);

  const handleMovePiece = useCallback((direction) => {
    if (!pendingMove) return;
    
    // EXTENSION_MARGIN allows pieces to extend outside the board
    // This matches useGameState.js and allows pieces like 'I' to be placed at edges
    const EXTENSION_MARGIN = 4;
    
    const deltas = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
    const [dRow, dCol] = deltas[direction];
    
    // Allow movement from -EXTENSION_MARGIN to BOARD_SIZE + EXTENSION_MARGIN - 1
    const newRow = Math.max(-EXTENSION_MARGIN, Math.min(BOARD_SIZE + EXTENSION_MARGIN - 1, pendingMove.row + dRow));
    const newCol = Math.max(-EXTENSION_MARGIN, Math.min(BOARD_SIZE + EXTENSION_MARGIN - 1, pendingMove.col + dCol));
    
    setPendingMove({ ...pendingMove, row: newRow, col: newCol });
    soundManager.playClickSound('neutral');
  }, [pendingMove]);

  const handleRotate = useCallback(() => {
    if (!selectedPiece) return;
    setRotation((r) => (r + 1) % 4);
    soundManager.playPieceRotate();
  }, [selectedPiece]);

  const handleFlip = useCallback(() => {
    if (!selectedPiece) return;
    setFlipped((f) => !f);
    soundManager.playPieceFlip();
  }, [selectedPiece]);

  const handleCancel = useCallback(() => {
    setPendingMove(null);
    soundManager.playButtonClick();
  }, []);

  // FIXED: handleConfirm with proper game over detection
  const handleConfirm = useCallback(async () => {
    if (!pendingMove || !canConfirm || moveInProgressRef.current) return;
    
    moveInProgressRef.current = true;
    // console.log('handleConfirm: Starting...', { pendingMove, rotation, flipped });

    const coords = getPieceCoords(pendingMove.piece, rotation, flipped);
    
    // v7.28: Immediate cell flash feedback on confirm tap (clears after 400ms)
    const flashCells = coords.map(([dx, dy]) => ({
      row: pendingMove.row + dy,
      col: pendingMove.col + dx,
    })).filter(c => c.row >= 0 && c.row < BOARD_SIZE && c.col >= 0 && c.col < BOARD_SIZE);
    setConfirmFlashCells(flashCells);
    setTimeout(() => setConfirmFlashCells(null), 400);
    soundManager.vibrate(50); // v7.28: haptic on confirm
    
    // Calculate new board state
    const newBoard = board.map(row => [...row]);
    const newBoardPieces = { ...boardPieces };
    
    coords.forEach(([dx, dy]) => {
      const r = pendingMove.row + dy;
      const c = pendingMove.col + dx;
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
        newBoard[r][c] = myPlayerNumber;
        newBoardPieces[`${r},${c}`] = pendingMove.piece;
      }
    });

    const newUsedPieces = [...usedPieces, pendingMove.piece];
    const nextPlayer = myPlayerNumber === 1 ? 2 : 1;
    const totalPieces = Object.keys(pieces).length; // Should be 12
    
    // FIXED: Proper game over detection
    let gameOver = false;
    let winnerId = null;
    let gameOverReason = null;
    
    /* handleConfirm game over check debug - disabled for production
    // console.log('handleConfirm: Checking game over...', { 
      // usedPiecesCount: newUsedPieces.length, 
      // totalPieces,
      // myPlayerNumber,
      // nextPlayer
    // });
    */
    
    // Case 1: All pieces have been placed - game ends, count cells to determine winner
    if (newUsedPieces.length >= totalPieces) {
      gameOver = true;
      gameOverReason = 'all_pieces_placed';
      
      // Count cells for each player
      let player1Cells = 0;
      let player2Cells = 0;
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (newBoard[r][c] === 1) player1Cells++;
          else if (newBoard[r][c] === 2) player2Cells++;
        }
      }
      
      // console.log('handleConfirm: ALL PIECES PLACED - Counting cells', { player1Cells, player2Cells });
      
      // Determine winner by cell count (more cells = winner)
      if (myPlayerNumber === 1) {
        winnerId = player1Cells >= player2Cells ? user.id : game.player2_id;
      } else {
        winnerId = player2Cells >= player1Cells ? user.id : game.player1_id;
      }
      
      // console.log('handleConfirm: GAME OVER - All pieces placed, winner determined by cell count');
    }
    // Case 2: Check if opponent can place any remaining pieces
    else if (newUsedPieces.length >= 2) {
      // console.log('handleConfirm: Checking if opponent can move...');
      // FIXED: Pass usedPieces (pieces to skip), not remainingPieces
      // The function signature is canAnyPieceBePlaced(board, usedPieces)
      const opponentCanMove = canAnyPieceBePlaced(newBoard, newUsedPieces);
      
      // console.log('handleConfirm: Opponent can move?', opponentCanMove);
      
      if (!opponentCanMove) {
        gameOver = true;
        gameOverReason = 'opponent_blocked';
        winnerId = user.id;
        // console.log('handleConfirm: GAME OVER - Opponent cannot move, I win!');
      }
    }

    soundManager.playPiecePlace();

    // Send move to server
    const { data: responseData, error: moveError } = await gameSyncService.makeMove(
      currentGameId,
      user.id,
      {
        pieceType: pendingMove.piece,
        row: pendingMove.row,
        col: pendingMove.col,
        rotation,
        flipped,
        newBoard,
        newBoardPieces,
        newUsedPieces,
        nextPlayer,
        gameOver,
        winnerId
      }
    );

    if (moveError) {
      console.error('Move failed:', moveError);
      
      // CRITICAL: If we detected game over locally but server failed, 
      // still show the game over screen and retry the server update
      if (gameOver) {
        // console.log('handleConfirm: Server failed but game over detected locally - showing result anyway');
        
        const isWin = winnerId === user.id;
        setGameResult({ isWin, winnerId, reason: gameOverReason || 'opponent_blocked' });
        
        // Apply the local board state so user sees their move
        setBoard(newBoard);
        setBoardPieces(newBoardPieces);
        setUsedPieces(newUsedPieces);
        setGame(prev => prev ? { ...prev, status: 'completed', winner_id: winnerId } : prev);
        
        // Trigger placement animation for the move
        if (boardRef.current) {
          const boardRect = boardRef.current.getBoundingClientRect();
          const cellSize = boardRect.width / BOARD_SIZE;
          const placedCells = coords.map(([dx, dy]) => ({
            row: pendingMove.row + dy,
            col: pendingMove.col + dx
          })).filter(cell => 
            cell.row >= 0 && cell.row < BOARD_SIZE && 
            cell.col >= 0 && cell.col < BOARD_SIZE
          );
          triggerAnimation(placedCells, myPlayerNumber, boardRef, cellSize);
        }
        
        // Delay the popup so user can see the final placement animation
        setTimeout(() => {
          if (mountedRef.current) {
            setShowGameOver(true);
            soundManager.playSound(isWin ? 'win' : 'lose');
          }
        }, 1200);
        
        // Retry the server update in background (the RLS policy needs to be fixed)
        // console.log('handleConfirm: Retrying server update in background...');
        setTimeout(async () => {
          try {
            const retryResult = await gameSyncService.makeMove(
              currentGameId, user.id,
              { pieceType: pendingMove.piece, row: pendingMove.row, col: pendingMove.col,
                rotation, flipped, newBoard, newBoardPieces, newUsedPieces,
                nextPlayer, gameOver: true, winnerId }
            );
            // console.log('handleConfirm: Background retry result:', retryResult.error ? 'failed' : 'success');
          } catch (e) {
            // console.log('handleConfirm: Background retry exception:', e.message);
          }
        }, 2000);
        
        moveInProgressRef.current = false;
        return;
      }
      
      soundManager.playSound('invalid');
      moveInProgressRef.current = false;
      expectedPieceCountRef.current = null;
      return;
    }

    // console.log('handleConfirm: Move successful');
    
    // Set expected piece count to ignore stale updates
    expectedPieceCountRef.current = newUsedPieces.length;

    // TRIGGER PLACEMENT ANIMATION - Calculate placed cells for animation
    const placedCells = coords.map(([dx, dy]) => ({
      row: pendingMove.row + dy,
      col: pendingMove.col + dx
    })).filter(cell => 
      cell.row >= 0 && cell.row < BOARD_SIZE && 
      cell.col >= 0 && cell.col < BOARD_SIZE
    );
    
    // Get cell size from board bounds
    if (boardRef.current) {
      const boardRect = boardRef.current.getBoundingClientRect();
      const cellSize = boardRect.width / BOARD_SIZE;
      triggerAnimation(placedCells, myPlayerNumber, boardRef, cellSize);
      soundManager.playSound('place');
    }

    // Apply optimistic update
    setBoard(newBoard);
    setBoardPieces(newBoardPieces);
    setUsedPieces(newUsedPieces);
    setIsMyTurn(false);
    setSelectedPiece(null);
    setPendingMove(null);
    setRotation(0);
    setFlipped(false);
    
    // Handle game over - DELAY popup to let placement animation complete
    if (gameOver) {
      const isWin = winnerId === user.id;
      // console.log('handleConfirm: Game over!', { isWin, winnerId, userId: user.id, reason: gameOverReason });
      
      setGameResult({ isWin, winnerId, reason: gameOverReason || 'normal' });
      setGame(prev => prev ? { ...prev, status: 'completed', winner_id: winnerId } : prev);
      
      // v7.14: Update play streak when online game completes
      if (user?.id) {
        streakService.updateStreak(user.id).then(({ data }) => {
          if (data?.new_achievements?.length > 0) {
            // console.log('[OnlineGame] New streak achievements:', data.new_achievements);
          }
        }).catch(err => console.warn('[OnlineGame] Failed to update streak:', err));
      }
      
      // Delay the popup so user can see the final placement animation
      setTimeout(() => {
        if (mountedRef.current) {
          setShowGameOver(true);
          soundManager.playSound(isWin ? 'win' : 'lose');
        }
      }, 1200); // 1.2s delay - animation is ~600ms, plus buffer for appreciation
    }

    // Clear move in progress after a delay
    setTimeout(() => {
      moveInProgressRef.current = false;
    }, 500);

    // Fetch fresh game state as backup
    const { data: freshData } = await gameSyncService.getGame(currentGameId);
    if (freshData && mountedRef.current) {
      const freshCount = freshData.used_pieces?.length || 0;
      if (freshCount >= newUsedPieces.length) {
        updateGameState(freshData, user.id);
      }
    }
  }, [pendingMove, canConfirm, rotation, flipped, board, boardPieces, usedPieces, 
      myPlayerNumber, gameId, user, updateGameState, triggerAnimation, currentGameId]);

  const handleQuitOrForfeit = useCallback(() => {
    if (game?.status !== 'active') return;
    setQuitIsForfeit(hasMovesPlayed);
    setShowQuitConfirm(true);
    soundManager.playClickSound();
  }, [game?.status, hasMovesPlayed]);

  const confirmQuitOrForfeit = useCallback(async () => {
    setShowQuitConfirm(false);
    soundManager.playButtonClick();
    if (quitIsForfeit) {
      await gameSyncService.forfeitGame(currentGameId, user.id);
      setGameResult({ isWin: false, winnerId: opponent?.id, reason: 'forfeit' });
      setShowGameOver(true);
      soundManager.playSound('lose');
    } else {
      await gameSyncService.abandonGame(currentGameId);
      onLeave();
    }
  }, [quitIsForfeit, currentGameId, user?.id, opponent?.id, onLeave]);

  const handleLeave = () => {
    soundManager.playButtonClick();
    onLeave();
  };

  // =========================================================================
  // RENDER
  // =========================================================================

  if (loading) {
    return (
      // FIX: Changed from bg-slate-950 to bg-transparent to show GlobalBackground
      <div className="min-h-dvh bg-transparent flex items-center justify-center">
        <div className="relative text-center">
          <div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-amber-300 mb-6">Loading game...</p>
          <button onClick={handleLeave} className="px-6 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      // FIX: Changed from bg-slate-950 to bg-transparent to show GlobalBackground
      <div className="min-h-dvh bg-transparent flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={handleLeave} className="px-6 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700">
            Game Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-transparent">
      {/* Background glow effects */}
      <div className={`fixed top-1/4 right-1/4 w-64 h-64 ${theme.glow1} rounded-full blur-3xl pointer-events-none`} />
      <div className={`fixed bottom-1/4 left-1/4 w-64 h-64 ${theme.glow2} rounded-full blur-3xl pointer-events-none`} />

      {/* Inner scroll child — absolute inset-0 gives iOS explicit pixel bounds */}
      <div
        ref={scrollChildRef}
        className="absolute inset-0 overflow-y-scroll overflow-x-hidden"
        style={{ overscrollBehavior: 'none' }}
      >
      {/* Main content */}
      <div className="relative z-10 min-h-full flex flex-col">
        <div className="flex-1 flex flex-col max-w-lg mx-auto p-2 sm:p-4 w-full" style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}>
          
          {/* Header with title and optional turn timer */}
          <div className="flex items-center justify-between mb-1">
            <div className="w-16" />
            <div className="text-center flex-1 mx-2">
              <NeonTitle text="DEADBLOCK" size="medium" color="amber" />
            </div>
            {game?.turn_timer_seconds && game?.status === 'active' ? (
              <TurnTimer
                seconds={game.turn_timer_seconds}
                turnStartedAt={game.turn_started_at || turnStartedAt}
                isMyTurn={isMyTurn}
                onTimeout={() => {
                  if (isMyTurn) gameSyncService.forfeitGame(currentGameId, user.id);
                }}
              />
            ) : (
              <div className="w-16" />
            )}
          </div>

          {/* Main Game Panel */}
          <div className="mb-2">
            
            {/* Player Bar */}
            <OnlinePlayerBar 
              profile={profile}
              opponent={opponent}
              isMyTurn={isMyTurn}
              gameStatus={game?.status}
            />

            {/* Game Board with side labels */}
            <div className="flex items-center justify-center pb-2 gap-3">
              <div className="text-xl font-black tracking-wider select-none flex-shrink-0" style={{
                writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                color: '#fff',
                textShadow: '0 0 4px #fff, 0 0 8px #fff, 0 0 16px #f59e0b, 0 0 32px #f59e0b, 0 0 48px #f59e0b'
              }}>ONLINE BATTLE</div>
              <div className="relative">
                <GameBoard
                  ref={boardRef}
                  board={board}
                  boardPieces={boardPieces}
                  pendingMove={pendingMove}
                  rotation={rotation}
                  flipped={flipped}
                  gameOver={game?.status === 'completed'}
                  gameMode="online"
                  currentPlayer={myPlayerNumber}
                  onCellClick={handleCellClick}
                  onPendingPieceDragStart={handleBoardDragStart}
                  // v7.22: Drag preview props for board highlighting during drag
                  isDragging={isDragging}
                  dragPreviewCell={dragPreviewCell}
                  draggedPiece={draggedPiece}
                  dragRotation={rotation}
                  dragFlipped={flipped}
                  // v7.28: Turn pulse & confirm flash
                  turnPulse={turnPulse}
                  confirmFlashCells={confirmFlashCells}
                />
                {/* Placement Animation Overlay */}
                {placementAnimation && (
                  <PlacementAnimation
                    key={placementAnimation.key}
                    cells={placementAnimation.cells}
                    player={placementAnimation.player}
                    boardRef={placementAnimation.boardRef}
                    cellSize={placementAnimation.cellSize}
                    onComplete={clearAnimation}
                  />
                )}
                {/* Gold/Confetti Overlay for completed game winning move */}
                {winningMoveCells && winningMoveCells.length > 0 && boardRef.current && (
                  <div className="absolute inset-0 pointer-events-none z-10">
                    {winningMoveCells.map((cell, idx) => {
                      const boardRect = boardRef.current?.getBoundingClientRect();
                      if (!boardRect) return null;
                      const boardWidth = boardRect.width;
                      // Match GameBoard grid: gap-0.5 sm:gap-1, p-1.5 sm:p-2
                      const isSmall = window.innerWidth < 640;
                      const gap = isSmall ? 2 : 4;
                      const padding = isSmall ? 6 : 8;
                      const cellSize = isSmall ? 36 : 48;
                      const left = padding + cell.col * (cellSize + gap);
                      const top = padding + cell.row * (cellSize + gap);
                      
                      return (
                        <div
                          key={`gold-${cell.row}-${cell.col}`}
                          className="absolute rounded-md sm:rounded-lg overflow-hidden winning-move-gold"
                          style={{
                            left: `${left}px`,
                            top: `${top}px`,
                            width: `${cellSize}px`,
                            height: `${cellSize}px`,
                            background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)',
                            '--pop-delay': `${idx * 0.06}s`,
                          }}
                        >
                          {/* Gold shimmer */}
                          <div className="absolute inset-0 opacity-50 bg-[repeating-linear-gradient(135deg,transparent,transparent_3px,rgba(255,255,255,0.3)_3px,rgba(255,255,255,0.3)_5px)] animate-gold-shimmer-online" />
                          {/* Confetti particles */}
                          <div className="absolute w-1 h-1 bg-yellow-300 rounded-full animate-confetti-online-1" style={{ left: '20%', top: '-10%' }} />
                          <div className="absolute w-1.5 h-1 bg-amber-400 rounded-sm animate-confetti-online-2" style={{ left: '60%', top: '-10%' }} />
                          <div className="absolute w-1 h-1.5 bg-yellow-200 rounded-sm animate-confetti-online-3" style={{ left: '40%', top: '-10%' }} />
                          <div className="absolute w-1 h-1 bg-orange-400 rounded-full animate-confetti-online-4" style={{ left: '80%', top: '-10%' }} />
                          <div className="absolute w-1.5 h-1 bg-yellow-500 rounded-sm animate-confetti-online-5" style={{ left: '10%', top: '-10%' }} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="text-xl font-black tracking-wider select-none flex-shrink-0" style={{
                writingMode: 'vertical-rl',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                color: '#fff',
                textShadow: '0 0 4px #fff, 0 0 8px #fff, 0 0 16px #f59e0b, 0 0 32px #f59e0b, 0 0 48px #f59e0b'
              }}>ONLINE BATTLE</div>
            </div>

            {/* D-Pad with Error Message Layout - matches GameScreen */}
            {pendingMove && isMyTurn && !isDragging && (
              <div className="flex items-start justify-center gap-3 mb-0">
                {/* Error message box */}
                <div className="flex-shrink-0 w-24">
                  {errorMessage && (
                    <div className="error-message-box bg-red-900/80 border border-red-500/60 rounded-lg p-2 text-center shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                      <span className="text-red-300 text-xs font-bold leading-tight block">
                        {errorMessage}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* D-Pad */}
                <DPad onMove={handleMovePiece} />
                
                {/* Spacer for balance (removed chat button from here) */}
                <div className="flex-shrink-0 w-24" />
              </div>
            )}
            
            {/* UPDATED: Controls - GLOW ORB STYLE consistent with other boards */}
            {/* Row 1: Home, Rotate, Flip, Forfeit/Quit */}
            <div className="flex gap-1 mt-1">
              <GlowOrbButton
                onClick={() => { soundManager.playButtonClick(); onLeave(); }}
                color="orange"
                className="flex-1 flex items-center gap-1 justify-center"
              >
                <Home size={14} />
              </GlowOrbButton>
              <GlowOrbButton
                onClick={handleRotate}
                disabled={!selectedPiece || !isMyTurn}
                color="cyan"
                className="flex-1"
              >
                Rotate
              </GlowOrbButton>
              <GlowOrbButton
                onClick={handleFlip}
                disabled={!selectedPiece || !isMyTurn}
                color="purple"
                className="flex-1"
              >
                Flip
              </GlowOrbButton>
              {game?.status === 'active' && (
                <GlowOrbButton
                  onClick={handleQuitOrForfeit}
                  color="slate"
                  className="flex items-center gap-1 justify-center flex-1"
                >
                  <Flag size={14} />
                  <span className="hidden sm:inline">{hasMovesPlayed ? 'Forfeit' : 'Quit'}</span>
                </GlowOrbButton>
              )}
            </div>
            
            {/* Row 2: Cancel/Confirm when piece is pending */}
            {pendingMove && (
              <div className="flex gap-2 mt-1">
                <GlowOrbButton
                  onClick={handleCancel}
                  color="red"
                  className="flex-1"
                >
                  Cancel
                </GlowOrbButton>
                <GlowOrbButton
                  onClick={handleConfirm}
                  disabled={!canConfirm}
                  color="green"
                  className="flex-1"
                >
                  Confirm
                </GlowOrbButton>
              </div>
            )}
          </div>

          {/* Piece Tray with Chat Icon */}
          <div className="relative">
            <PieceTray
              usedPieces={usedPieces}
              selectedPiece={selectedPiece}
              pendingMove={pendingMove}
              gameOver={game?.status === 'completed'}
              gameMode="online"
              currentPlayer={myPlayerNumber}
              isMobile={true}
              onSelectPiece={handleSelectPiece}
              createDragHandlers={createDragHandlers}
              isDragging={isDragging}
              draggedPiece={draggedPiece}
            />
            {/* Chat button - bottom right corner of piece tray */}
            {game?.status === 'active' && (
              <button
                onClick={() => {
                  setChatOpen(!chatOpen);
                  if (!chatOpen) setHasUnreadChat(false);
                }}
                className={`
                  absolute bottom-2 right-2 w-9 h-9 rounded-full shadow-lg transition-all flex items-center justify-center z-10
                  ${chatOpen 
                    ? 'bg-amber-500 text-slate-900 shadow-[0_0_15px_rgba(251,191,36,0.5)]' 
                    : hasUnreadChat 
                      ? 'bg-gradient-to-br from-red-500 to-orange-500 text-white' 
                      : 'bg-slate-800/90 text-amber-400 border border-amber-500/40 hover:bg-slate-700'
                  }
                `}
                style={hasUnreadChat && !chatOpen ? {
                  animation: 'chatBlink 0.8s ease-in-out infinite',
                  boxShadow: '0 0 30px rgba(239,68,68,0.9), 0 0 60px rgba(239,68,68,0.4)'
                } : {}}
              >
                <MessageCircle size={18} className={hasUnreadChat && !chatOpen ? 'animate-bounce' : ''} />
                {hasUnreadChat && !chatOpen && (
                  <>
                    <span 
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                      style={{
                        animation: 'bounce 0.5s ease-in-out infinite',
                        boxShadow: '0 0 15px rgba(239,68,68,1)'
                      }}
                    >
                      !
                    </span>
                    <span className="absolute inset-0 rounded-full bg-red-400/50 animate-ping" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Floating Chat Toast Banner */}
      {chatToast && !chatOpen && (
        <div 
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] animate-in slide-in-from-top-4 fade-in duration-300"
          onClick={() => {
            setChatOpen(true);
            setHasUnreadChat(false);
            setChatToast(null);
          }}
        >
          <div className="bg-gradient-to-r from-cyan-600/95 to-blue-600/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-2xl border border-cyan-400/30 cursor-pointer hover:scale-[1.02] transition-transform max-w-[90vw] sm:max-w-sm">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2">
                <MessageCircle size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-cyan-100 text-xs font-medium">{chatToast.senderName}</p>
                <p className="text-white text-sm truncate">{chatToast.message}</p>
              </div>
              <div className="text-cyan-200/60 text-xs">tap to open</div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Chat Panel - FIXED: Use external control to hide duplicate button */}
      {chatOpen && game && (
        <QuickChat
          gameId={currentGameId}
          userId={user?.id}
          opponentName={opponent?.display_name || opponent?.username}
          isOpen={chatOpen}
          onToggle={(open) => {
            setChatOpen(open);
            if (!open) setHasUnreadChat(false);
          }}
          hideButton={true}
          onNewMessage={() => {
            if (!chatOpen) setHasUnreadChat(true);
          }}
        />
      )}

      {/* Game Over Modal */}
      {showGameOver && gameResult && (
        <GameOverModal
          isOpen={showGameOver}
          isWin={gameResult.isWin}
          isDraw={!gameResult.winnerId}
          reason={gameResult.reason}
          gameMode="online"
          opponentName={opponent?.display_name || opponent?.username || 'Opponent'}
          onClose={() => {
            // v7.24: Play click sound for user feedback
            soundManager.playButtonClick();
            // Permanently dismiss - won't reappear from real-time updates
            dismissedGameOverRef.current = true;
            setShowGameOver(false);
          }}
          onRematch={async () => {
            try {
              // v7.30 FIX: Review mode (viewing a lost game from active games menu)
              // Opponent isn't watching — just send a standard invite and go back to online menu.
              if (isReviewModeRef.current) {
                if (!opponent?.id) {
                  if (typeof onLeave === 'function') onLeave();
                  return;
                }
                soundManager.playButtonClick();
                // Seal the modal before hiding so updateGameState can't re-open it
                dismissedGameOverRef.current = true;
                setShowGameOver(false);
                const { error: inviteError } = await inviteService.sendInvite(user.id, opponent.id);
                if (inviteError && inviteError.message !== 'Invite already sent') {
                  console.error('[OnlineGameScreen] sendInvite error:', inviteError);
                }
                soundManager.playClickSound('confirm');
                if (typeof onLeave === 'function') onLeave();
                return;
              }

              // Normal post-game flow: use rematch request system
              // v7.30 FIX: Seal the modal before proceeding so updateGameState can't
              // re-show it when it sees game=completed + showGameOver=false.
              dismissedGameOverRef.current = true;

              const { data, error } = await rematchService.createRematchRequest(
                gameId,
                user.id,
                opponent?.id
              );
              
              if (error) {
                console.error('[OnlineGameScreen] Rematch request failed:', error);
                setRematchError(error.message || 'Could not create rematch request');
                return;
              }
              
              // Check if rematch was auto-accepted (opponent already requested)
              if (data?.game) {
                setRematchAccepted(true);
                setNewGameFromRematch(data.game);
                const firstPlayerId = data.firstPlayerId;
                const firstPlayerName = firstPlayerId === user.id
                  ? 'You go'
                  : `${opponent?.display_name || opponent?.username || 'Opponent'} goes`;
                soundManager.playSound('notification');
                setRematchMessage(`Rematch starting! ${firstPlayerName} first.`);
                setTimeout(() => {
                  setShowGameOver(false);
                  setShowRematchModal(false);
                  setRematchWaiting(false);
                  setRematchRequest(null);
                  setIsRematchRequester(false);
                  setRematchDeclined(false);
                  setRematchAccepted(false);
                  setRematchMessage(null);
                  setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
                  setBoardPieces({});
                  setUsedPieces([]);
                  setSelectedPiece(null);
                  setPendingMove(null);
                  setRotation(0);
                  setFlipped(false);
                  setWinningMoveCells(null);
                  setGameResult(null);
                  setGame(null);
                  setLoading(true);
                  setCurrentGameId(data.game.id);
                }, 2000);
                return;
              }
              
              // No auto-accept - opponent hasn't requested yet
              soundManager.playSound('notification');
              setShowGameOver(false);
              sessionStorage.setItem('deadblock_rematch_pending', '1');
              const pendingGameId = gameId;
              const pendingUserId = user.id;
              const COUNTDOWN = 5;
              setRematchCountdown(COUNTDOWN);
              let remaining = COUNTDOWN;
              if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = setInterval(async () => {
                remaining -= 1;
                setRematchCountdown(remaining > 0 ? remaining : null);
                try {
                  const { data: req } = await rematchService.getRematchRequestByGame(pendingGameId, pendingUserId);
                  if (req?.status === 'accepted' && req?.new_game_id) {
                    clearInterval(countdownIntervalRef.current);
                    countdownIntervalRef.current = null;
                    setRematchCountdown(null);
                    soundManager.playSound('notification');
                    setShowGameOver(false);
                    setShowRematchModal(false);
                    setRematchWaiting(false);
                    setRematchRequest(null);
                    setIsRematchRequester(false);
                    setRematchDeclined(false);
                    setRematchAccepted(false);
                    setRematchMessage(null);
                    setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
                    setBoardPieces({});
                    setUsedPieces([]);
                    setSelectedPiece(null);
                    setPendingMove(null);
                    setRotation(0);
                    setFlipped(false);
                    setWinningMoveCells(null);
                    setGameResult(null);
                    setGame(null);
                    setLoading(true);
                    setCurrentGameId(req.new_game_id);
                    return;
                  }
                } catch (e) {
                  // Ignore poll errors during countdown
                }
                if (remaining <= 0) {
                  clearInterval(countdownIntervalRef.current);
                  countdownIntervalRef.current = null;
                  if (typeof onLeave === 'function') onLeave();
                }
              }, 1000);
              
            } catch (err) {
              console.error('[OnlineGameScreen] Rematch error:', err);
              setRematchError('Failed to request rematch. Please try again.');
            }
          }}
          onMenu={() => {
            setShowGameOver(false);
            if (typeof onLeave === 'function') {
              onLeave();
            } else {
              console.error('[OnlineGameScreen] onLeave is not a function:', onLeave);
              // Fallback: go to online menu via URL
              window.location.href = window.location.origin;
            }
          }}
        />
      )}

      {/* v7.27: Countdown banner for rematch sender */}
      {rematchCountdown !== null && (
        <div className="fixed inset-x-0 top-20 z-[60] flex justify-center pointer-events-none">
          <div className="px-5 py-4 rounded-xl shadow-2xl max-w-sm mx-4 bg-slate-900/95 border border-amber-500/50 backdrop-blur-sm text-center"
            style={{ animation: 'rematch-sender-in 0.3s ease-out both' }}
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-xl">⚔️</span>
              <span className="text-amber-300 font-bold text-sm">Rematch request sent!</span>
            </div>
            <p className="text-slate-400 text-xs">
              Waiting for {opponent?.display_name || opponent?.username || 'opponent'}…
              redirecting in <span className="text-amber-400 font-bold tabular-nums">{rematchCountdown}s</span>
            </p>
          </div>
        </div>
      )}

      {/* Error toast */}
      {rematchError && (
        <div className="fixed inset-x-0 top-20 z-[60] flex justify-center pointer-events-none">
          <div className="px-6 py-4 rounded-xl shadow-2xl max-w-sm mx-4 bg-red-900/90 border border-red-500/50 text-red-100 backdrop-blur-sm text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">❌</span>
              <span className="font-medium">{rematchError}</span>
            </div>
          </div>
        </div>
      )}

      {/* Rematch Modal - For rematch requests */}
      <RematchModal
        isOpen={showRematchModal}
        onClose={() => {
          setShowRematchModal(false);
          // If we're the requester and closing, cancel the request
          if (isRematchRequester && rematchRequest?.id && !rematchAccepted) {
            rematchService.cancelRematchRequest(rematchRequest.id, user.id);
          }
        }}
        onBackToMenu={() => {
          // Navigate back to menu without canceling rematch request
          setShowRematchModal(false);
          setShowGameOver(false);
          if (typeof onLeave === 'function') {
            onLeave();
          }
        }}
        onAccept={async () => {
          if (!rematchRequest?.id) return;
          
          // console.log('[OnlineGameScreen] Accepting rematch...');
          const { data, error } = await rematchService.acceptRematchRequest(rematchRequest.id, user.id);
          
          if (error) {
            setRematchError(error.message);
            return;
          }
          
          if (data?.game) {
            // console.log('[OnlineGameScreen] Rematch accepted! New game:', data.game.id);
            setRematchAccepted(true);
            setNewGameFromRematch(data.game);
            soundManager.playSound('notification');
            
            // Navigate to new game after brief delay
            setTimeout(() => {
              // Close modals first
              setShowRematchModal(false);
              setShowGameOver(false);
              
              // If onNavigateToGame is provided, use it to navigate (preferred)
              // This tells App.jsx about the new game ID
              if (onNavigateToGame) {
                // console.log('[OnlineGameScreen] Using onNavigateToGame to navigate to:', data.game.id);
                onNavigateToGame(data.game);
              } else {
                // Fallback: reset internal state and load new game
                // console.log('[OnlineGameScreen] Fallback: resetting internal state');
                setRematchWaiting(false);
                setRematchRequest(null);
                setIsRematchRequester(false);
                setRematchDeclined(false);
                setRematchAccepted(false);
                
                // Reset board state
                setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
                setBoardPieces({});
                setUsedPieces([]);
                setSelectedPiece(null);
                setPendingMove(null);
                setRotation(0);
                setFlipped(false);
                setWinningMoveCells(null);
                setGame(null);
                setLoading(true);
                
                // Set the new game ID - this triggers the useEffect to load the new game
                setCurrentGameId(data.game.id);
              }
            }, 1000);
          }
        }}
        onDecline={async () => {
          if (!rematchRequest?.id) {
            setShowRematchModal(false);
            return;
          }
          
          if (isRematchRequester) {
            // Cancel our own request
            await rematchService.cancelRematchRequest(rematchRequest.id, user.id);
            setRematchWaiting(false);
            setShowRematchModal(false);
          } else {
            // Decline opponent's request
            await rematchService.declineRematchRequest(rematchRequest.id, user.id);
            setRematchDeclined(true);
            setShowRematchModal(false);
          }
        }}
        isRequester={isRematchRequester}
        requesterName={isRematchRequester ? 'You' : (opponent?.display_name || opponent?.username || 'Opponent')}
        isWaiting={rematchWaiting}
        opponentAccepted={rematchAccepted}
        opponentDeclined={rematchDeclined}
        error={rematchError}
        firstPlayerName={newGameFromRematch ? (
          newGameFromRematch.player1_id === user.id 
            ? 'You go' 
            : `${opponent?.display_name || opponent?.username || 'Opponent'} goes`
        ) : null}
      />

      {/* Gold confetti and shimmer animations for completed game winning move */}
      {winningMoveCells && (
        <style>{`
          @keyframes winning-move-pop {
            0% { transform: scale(0); opacity: 0; }
            60% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes rematch-sender-in {
            0%   { opacity: 0; transform: translateY(-10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes winning-move-breathe {
            0%   { box-shadow: 0 0 12px rgba(251,191,36,0.5), 0 0 32px rgba(251,191,36,0.2); }
            100% { box-shadow: 0 0 28px rgba(251,191,36,0.9), 0 0 55px rgba(251,191,36,0.5); }
          }
          .winning-move-gold {
            animation:
              winning-move-pop 0.5s ease-out both,
              winning-move-breathe 2s ease-in-out infinite alternate;
            animation-delay: var(--pop-delay, 0s), calc(var(--pop-delay, 0s) + 0.5s);
          }
          @keyframes gold-shimmer-online {
            0% { background-position: 0% 0%; }
            100% { background-position: 200% 200%; }
          }
          .animate-gold-shimmer-online {
            background-size: 200% 200%;
            animation: gold-shimmer-online 2s linear infinite;
          }
          @keyframes confetti-online-1 {
            0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
            25% { transform: translate(3px, 8px) rotate(90deg); opacity: 1; }
            50% { transform: translate(-2px, 16px) rotate(180deg); opacity: 0.8; }
            75% { transform: translate(4px, 24px) rotate(270deg); opacity: 0.5; }
            100% { transform: translate(1px, 32px) rotate(360deg); opacity: 0; }
          }
          @keyframes confetti-online-2 {
            0% { transform: translate(0, 0) rotate(45deg); opacity: 1; }
            25% { transform: translate(-4px, 10px) rotate(135deg); opacity: 1; }
            50% { transform: translate(2px, 18px) rotate(225deg); opacity: 0.8; }
            75% { transform: translate(-3px, 26px) rotate(315deg); opacity: 0.5; }
            100% { transform: translate(0px, 34px) rotate(405deg); opacity: 0; }
          }
          @keyframes confetti-online-3 {
            0% { transform: translate(0, 0) rotate(20deg); opacity: 1; }
            30% { transform: translate(5px, 12px) rotate(120deg); opacity: 1; }
            60% { transform: translate(-1px, 22px) rotate(240deg); opacity: 0.7; }
            100% { transform: translate(3px, 36px) rotate(380deg); opacity: 0; }
          }
          @keyframes confetti-online-4 {
            0% { transform: translate(0, 0) rotate(-10deg); opacity: 1; }
            35% { transform: translate(-3px, 9px) rotate(80deg); opacity: 1; }
            65% { transform: translate(4px, 20px) rotate(200deg); opacity: 0.6; }
            100% { transform: translate(-2px, 30px) rotate(350deg); opacity: 0; }
          }
          @keyframes confetti-online-5 {
            0% { transform: translate(0, 0) rotate(60deg); opacity: 1; }
            20% { transform: translate(2px, 7px) rotate(140deg); opacity: 1; }
            55% { transform: translate(-4px, 19px) rotate(260deg); opacity: 0.7; }
            100% { transform: translate(1px, 33px) rotate(420deg); opacity: 0; }
          }
          .animate-confetti-online-1 { animation: confetti-online-1 1.8s ease-out infinite; animation-delay: 0s; }
          .animate-confetti-online-2 { animation: confetti-online-2 2.1s ease-out infinite; animation-delay: 0.3s; }
          .animate-confetti-online-3 { animation: confetti-online-3 1.9s ease-out infinite; animation-delay: 0.1s; }
          .animate-confetti-online-4 { animation: confetti-online-4 2.3s ease-out infinite; animation-delay: 0.5s; }
          .animate-confetti-online-5 { animation: confetti-online-5 2.0s ease-out infinite; animation-delay: 0.2s; }
        `}</style>
      )}

      {/* Forfeit / Quit confirmation toast */}
      {showQuitConfirm && (
        <div className="fixed inset-0 z-[9998]" onClick={() => setShowQuitConfirm(false)}>
          <div
            className={`
              fixed bottom-5 left-4 right-4 max-w-sm mx-auto z-[9999]
              transition-all duration-300 opacity-100 translate-y-0
            `}
            onClick={e => e.stopPropagation()}
            style={{ animation: 'quitToastSlideUp 0.25s ease-out' }}
          >
            <div
              className="relative rounded-xl border-2 overflow-hidden p-4"
              style={{
                background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.98) 100%)',
                borderColor: quitIsForfeit ? 'rgba(239,68,68,0.6)' : 'rgba(251,191,36,0.6)',
                boxShadow: quitIsForfeit
                  ? '0 0 30px rgba(239,68,68,0.35), 0 0 60px rgba(239,68,68,0.15), inset 0 1px 0 rgba(255,255,255,0.08)'
                  : '0 0 30px rgba(251,191,36,0.35), 0 0 60px rgba(251,191,36,0.15), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
            >
              {/* Animated top border glow */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{
                  background: quitIsForfeit
                    ? 'linear-gradient(90deg, transparent, rgba(239,68,68,0.9), rgba(244,63,94,0.7), transparent)'
                    : 'linear-gradient(90deg, transparent, rgba(251,191,36,0.9), rgba(249,115,22,0.7), transparent)',
                }}
              />

              {/* Corner accents */}
              <div className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 ${quitIsForfeit ? 'border-red-400/80' : 'border-amber-400/80'}`} />
              <div className={`absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 ${quitIsForfeit ? 'border-red-400/80' : 'border-amber-400/80'}`} />
              <div className={`absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 ${quitIsForfeit ? 'border-red-400/80' : 'border-amber-400/80'}`} />
              <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 ${quitIsForfeit ? 'border-red-400/80' : 'border-amber-400/80'}`} />

              {/* Icon + title */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: quitIsForfeit ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.15)',
                    boxShadow: quitIsForfeit ? '0 0 15px rgba(239,68,68,0.3)' : '0 0 15px rgba(251,191,36,0.3)',
                  }}
                >
                  {quitIsForfeit
                    ? <Flag size={20} className="text-red-400" />
                    : <XCircle size={20} className="text-amber-400" />
                  }
                </div>
                <div>
                  <h3
                    className={`font-black text-sm uppercase tracking-wider ${quitIsForfeit ? 'text-red-300' : 'text-amber-300'}`}
                    style={{ fontFamily: "'Orbitron', sans-serif" }}
                  >
                    {quitIsForfeit ? 'Forfeit Game?' : 'Quit Game?'}
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {quitIsForfeit
                      ? 'This will count as a loss on your record.'
                      : 'No moves made — no penalty to your stats.'
                    }
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowQuitConfirm(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold transition-all border border-slate-600/50"
                >
                  Keep Playing
                </button>
                <button
                  onClick={confirmQuitOrForfeit}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all border ${
                    quitIsForfeit
                      ? 'bg-red-600/80 hover:bg-red-500/80 text-white border-red-400/50'
                      : 'bg-amber-600/80 hover:bg-amber-500/80 text-white border-amber-400/50'
                  }`}
                >
                  {quitIsForfeit ? 'Forfeit' : 'Quit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes quitToastSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      </div>{/* end inner scroll child */}

      {/* v7.37: DragOverlay AFTER scroll child — later DOM order paints on top. */}
      {isDragging && draggedPiece && (
        <DragOverlay
          isDragging={isDragging}
          piece={draggedPiece}
          rotation={rotation}
          flipped={flipped}
          position={dragPosition}
          offset={dragOffset}
          isValidDrop={isValidDrop}
        />
      )}
    </div>
  );
};

export default OnlineGameScreen;
