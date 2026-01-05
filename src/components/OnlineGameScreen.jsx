// Online Game Screen - Real-time multiplayer game with drag-and-drop support
// FIXED: Real-time updates, drag from board, UI consistency, game over detection
// ADDED: Rematch request system with opponent notification
// UPDATED: Chat notifications, rematch navigation, placement animations
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Flag, MessageCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { gameSyncService } from '../services/gameSync';
import { rematchService } from '../services/rematchService';
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
import FloatingPiecesBackground from './FloatingPiecesBackground';
import TierIcon from './TierIcon';
import PlacementAnimation, { usePlacementAnimation } from './PlacementAnimation';
import { pieces } from '../utils/pieces';
import { getPieceCoords, canPlacePiece, canAnyPieceBePlaced, BOARD_SIZE } from '../utils/gameLogic';
import { soundManager } from '../utils/soundManager';
import { ratingService } from '../services/ratingService';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { realtimeManager } from '../services/realtimeManager';

// Drag detection constants
const DRAG_THRESHOLD = 5; // Reduced from 10 for faster drag response on phones
const SCROLL_ANGLE_THRESHOLD = 60;

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
  const myUsername = profile?.display_name || profile?.username || 'You';
  const oppUsername = opponent?.display_name || opponent?.username || 'Opponent';
  
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
            <span className={`text-sm font-bold tracking-wide ${isMyTurn ? 'text-amber-300' : 'text-slate-500'}`}>
              You
            </span>
            <TierIcon shape={myTier.shape} glowColor={myTier.glowColor} size="small" />
            <span className="text-xs text-slate-600">{myRating}</span>
          </div>
          <div className="mt-1 text-left">
            <span className={`text-xs font-medium truncate block max-w-[100px] ${isMyTurn ? 'text-amber-400/80' : 'text-slate-500'}`}>
              {myUsername}
            </span>
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
            <span className={`text-sm font-bold tracking-wide ${!isMyTurn && gameStatus === 'active' ? 'text-orange-300' : 'text-slate-500'}`}>
              Opponent
            </span>
            <div className={`w-3 h-3 rounded-full flex-shrink-0 transition-all duration-300 ${
              !isMyTurn && gameStatus === 'active' ? 'bg-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.8)] animate-pulse' : 'bg-slate-600'
            }`} />
          </div>
          {/* Username RIGHT-ALIGNED for symmetry */}
          <div className="mt-1 text-right">
            <span className={`text-xs font-medium truncate block max-w-[100px] ml-auto ${!isMyTurn && gameStatus === 'active' ? 'text-orange-400/80' : 'text-slate-500'}`}>
              {oppUsername}
            </span>
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
  const [gameResult, setGameResult] = useState(null);
  
  // Rematch request system state
  const [showRematchModal, setShowRematchModal] = useState(false);
  const [rematchRequest, setRematchRequest] = useState(null);
  const [isRematchRequester, setIsRematchRequester] = useState(false);
  const [rematchWaiting, setRematchWaiting] = useState(false);
  const [rematchAccepted, setRematchAccepted] = useState(false);
  const [rematchDeclined, setRematchDeclined] = useState(false);
  const [newGameFromRematch, setNewGameFromRematch] = useState(null);
  
  const [chatOpen, setChatOpen] = useState(false);
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const [chatToast, setChatToast] = useState(null); // { senderName, message, timestamp }
  const [turnStartedAt, setTurnStartedAt] = useState(null);
  const [connected, setConnected] = useState(false); // Track realtime connection
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isValidDrop, setIsValidDrop] = useState(false);
  
  // Refs
  const boardRef = useRef(null);
  const boardBoundsRef = useRef(null);
  const hasDragStartedRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const turnStartRef = useRef(Date.now());
  const moveInProgressRef = useRef(false);
  const expectedPieceCountRef = useRef(null);
  const mountedRef = useRef(true);
  const prevBoardPiecesRef = useRef({});  // Track previous board pieces for opponent animation

  // Placement animation hook
  const { animation: placementAnimation, triggerAnimation, clearAnimation } = usePlacementAnimation();

  const userId = user?.id;
  const hasMovesPlayed = usedPieces.length > 0;

  // =========================================================================
  // DRAG HANDLERS
  // =========================================================================
  
  // Track which cell of the piece is under the finger
  const pieceCellOffsetRef = useRef({ row: 0, col: 0 });
  
  const calculateBoardCell = useCallback((clientX, clientY) => {
    if (!boardBoundsRef.current) return null;
    
    const { left, top, width, height } = boardBoundsRef.current;
    const cellWidth = width / BOARD_SIZE;
    const cellHeight = height / BOARD_SIZE;
    
    const relX = clientX - left;
    const relY = clientY - top;
    
    // Raw cell under finger
    const fingerCol = Math.floor(relX / cellWidth);
    const fingerRow = Math.floor(relY / cellHeight);
    
    // Adjust by which cell of the piece is under the finger
    const col = fingerCol - pieceCellOffsetRef.current.col;
    const row = fingerRow - pieceCellOffsetRef.current.row;
    
    // Allow some margin for pieces that extend beyond anchor
    const EXTENSION_MARGIN = 4;
    if (row >= -EXTENSION_MARGIN && row < BOARD_SIZE + EXTENSION_MARGIN && 
        col >= -EXTENSION_MARGIN && col < BOARD_SIZE + EXTENSION_MARGIN) {
      return { row, col };
    }
    return null;
  }, []);

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

  const isScrollGesture = useCallback((startX, startY, currentX, currentY) => {
    const deltaX = Math.abs(currentX - startX);
    const deltaY = Math.abs(currentY - startY);
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    return angle > SCROLL_ANGLE_THRESHOLD;
  }, []);

  const startDrag = useCallback((piece, clientX, clientY, elementRect) => {
    // Guard against duplicate calls
    if (hasDragStartedRef.current) return;
    if (game?.status !== 'active' || usedPieces.includes(piece) || !isMyTurn) return;
    
    // Set ref first to prevent duplicate calls
    hasDragStartedRef.current = true;
    
    // Calculate which cell of the piece is under the finger
    const touchedCell = calculateTouchedPieceCell(piece, clientX, clientY, elementRect, rotation, flipped);
    pieceCellOffsetRef.current = touchedCell;
    
    if (boardRef.current) {
      boardBoundsRef.current = boardRef.current.getBoundingClientRect();
    }
    
    // Handle null elementRect gracefully
    const offsetX = elementRect ? clientX - (elementRect.left + elementRect.width / 2) : 0;
    const offsetY = elementRect ? clientY - (elementRect.top + elementRect.height / 2) : 0;
    
    setDraggedPiece(piece);
    setDragPosition({ x: clientX, y: clientY });
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
    
    setSelectedPiece(piece);
    setPendingMove(null);
    soundManager.playPieceSelect();
    
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }, [game?.status, usedPieces, isMyTurn, rotation, flipped, calculateTouchedPieceCell]);

  // FIXED: Handle drag from pending piece on board
  const handleBoardDragStart = useCallback((piece, clientX, clientY, elementRect) => {
    // Guard against duplicate calls
    if (hasDragStartedRef.current) return;
    if (game?.status !== 'active' || !isMyTurn) return;
    
    // Set ref first to prevent duplicate calls
    hasDragStartedRef.current = true;
    
    // CRITICAL: Update board bounds FIRST before using them
    if (boardRef.current) {
      boardBoundsRef.current = boardRef.current.getBoundingClientRect();
    }
    
    // For board drag, calculate which cell was touched
    if (pendingMove && elementRect && boardBoundsRef.current) {
      const { left, top, width, height } = boardBoundsRef.current;
      const cellWidth = width / BOARD_SIZE;
      const cellHeight = height / BOARD_SIZE;
      
      const clickedRow = Math.round((elementRect.top + elementRect.height / 2 - top) / cellHeight);
      const clickedCol = Math.round((elementRect.left + elementRect.width / 2 - left) / cellWidth);
      
      pieceCellOffsetRef.current = {
        row: clickedRow - pendingMove.row,
        col: clickedCol - pendingMove.col
      };
    } else {
      pieceCellOffsetRef.current = { row: 0, col: 0 };
    }
    
    // Clear pending move - piece is being "picked up"
    setPendingMove(null);
    
    // Handle null elementRect gracefully
    const offsetX = elementRect ? clientX - (elementRect.left + elementRect.width / 2) : 0;
    const offsetY = elementRect ? clientY - (elementRect.top + elementRect.height / 2) : 0;
    
    setDraggedPiece(piece);
    setDragPosition({ x: clientX, y: clientY });
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
    
    soundManager.playPieceSelect();
    
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }, [game?.status, isMyTurn, pendingMove]);

  const updateDrag = useCallback((clientX, clientY) => {
    if (!isDragging || !draggedPiece) return;
    
    setDragPosition({ x: clientX, y: clientY });
    
    if (boardRef.current) {
      boardBoundsRef.current = boardRef.current.getBoundingClientRect();
    }
    
    const cell = calculateBoardCell(clientX, clientY);
    
    if (cell) {
      setPendingMove({ piece: draggedPiece, row: cell.row, col: cell.col });
      const coords = getPieceCoords(draggedPiece, rotation, flipped);
      const valid = canPlacePiece(board, cell.row, cell.col, coords);
      setIsValidDrop(valid);
    } else {
      setIsValidDrop(false);
    }
  }, [isDragging, draggedPiece, rotation, flipped, board, calculateBoardCell]);

  const endDrag = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    setDraggedPiece(null);
    setDragPosition({ x: 0, y: 0 });
    setDragOffset({ x: 0, y: 0 });
    setIsValidDrop(false);
    hasDragStartedRef.current = false;
    pieceCellOffsetRef.current = { row: 0, col: 0 };
    
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  }, [isDragging]);

  // Create drag handlers for PieceTray
  // SIMPLIFIED: Since pieces have touch-action: none, we start drag immediately
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

    // Touch move/end - global handlers take care of updates when isDragging
    const handleTouchMove = () => {};
    const handleTouchEnd = () => {};

    // Mouse handlers for desktop
    const handleMouseDown = (e) => {
      if (e.button !== 0) return;
      elementRect = e.currentTarget?.getBoundingClientRect() || null;
      
      if (boardRef?.current) {
        boardBoundsRef.current = boardRef.current.getBoundingClientRect();
      }
      
      startDrag(piece, e.clientX, e.clientY, elementRect);
    };

    return {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onMouseDown: handleMouseDown,
    };
  }, [game?.status, usedPieces, isMyTurn, startDrag]);

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

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
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
          if (request.status === 'accepted' && request.new_game_id) {
            console.log('[OnlineGameScreen] Rematch accepted! New game:', request.new_game_id);
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
            if (!isSender && !showRematchModal && !rematchDeclined) {
              setShowRematchModal(true);
              soundManager.playSound('notification');
            }
            
            // If we're the requester, show waiting state
            if (isSender && !rematchAccepted) {
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

    console.log('updateGameState: Received', { 
      id: gameData.id, 
      status: gameData.status,
      current_player: gameData.current_player,
      pieces: gameData.used_pieces?.length 
    });

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
    
    // If there are new cells and it's now our turn (opponent just moved), trigger opponent animation
    if (currentUserId && newCellKeys.length > 0 && !moveInProgressRef.current) {
      const playerNum = gameData.player1_id === currentUserId ? 1 : 2;
      const opponentNum = playerNum === 1 ? 2 : 1;
      const isNowMyTurn = gameData.current_player === playerNum && gameData.status === 'active';
      
      // Only animate if it's now our turn (meaning opponent just moved)
      if (isNowMyTurn && boardRef.current) {
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
      }

      // FIXED: Game over detection
      if (gameData.status === 'completed' && !showGameOver) {
        const iWon = gameData.winner_id === currentUserId;
        setGameResult({
          isWin: iWon,
          winnerId: gameData.winner_id,
          reason: gameData.winner_id ? 'normal' : 'draw'
        });
        setShowGameOver(true);
        soundManager.playSound(iWon ? 'win' : 'lose');
      }
    }
  }, [isMyTurn, showGameOver, triggerAnimation]);

  // FIXED: Load game and subscribe to REAL-TIME updates
  useEffect(() => {
    if (!currentGameId || !userId) return;
    
    mountedRef.current = true;
    console.log('OnlineGameScreen: Starting game load', { gameId: currentGameId, userId });

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

        updateGameState(data, userId);
        setLoading(false);
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
    console.log('[OnlineGameScreen] Subscribing to real-time updates via gameSyncService');
    
    const subscription = gameSyncService.subscribeToGame(
      currentGameId,
      (updatedGame) => {
        if (!mountedRef.current) return;
        if (!updatedGame || updatedGame.id !== currentGameId) return;
        
        console.log('Real-time update received', {
          pieces: updatedGame?.used_pieces?.length,
          expected: expectedPieceCountRef.current,
          moveInProgress: moveInProgressRef.current
        });
        
        // Skip stale updates
        if (expectedPieceCountRef.current !== null) {
          const incoming = updatedGame.used_pieces?.length || 0;
          if (incoming < expectedPieceCountRef.current) {
            console.log('Ignoring stale update');
            return;
          }
          expectedPieceCountRef.current = null;
        }
        
        // Skip if move in progress
        if (moveInProgressRef.current) {
          console.log('Move in progress, will fetch fresh state after');
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
    
    console.log('[OnlineGameScreen] Setting up chat notification subscription');
    
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
            console.log('[OnlineGameScreen] New chat message from opponent!');
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
            
            // Send push notification for chat message
            notificationService.notifyChatMessage(opponentName, message, currentGameId);
          }
        }
      )
      .subscribe((status) => {
        console.log('[OnlineGameScreen] Chat channel status:', status);
      });
    
    return () => {
      console.log('[OnlineGameScreen] Cleaning up chat subscription');
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
    
    const deltas = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
    const [dRow, dCol] = deltas[direction];
    
    const newRow = Math.max(0, Math.min(BOARD_SIZE - 1, pendingMove.row + dRow));
    const newCol = Math.max(0, Math.min(BOARD_SIZE - 1, pendingMove.col + dCol));
    
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
    console.log('handleConfirm: Starting...', { pendingMove, rotation, flipped });

    const coords = getPieceCoords(pendingMove.piece, rotation, flipped);
    
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
    
    console.log('handleConfirm: Checking game over...', { 
      usedPiecesCount: newUsedPieces.length, 
      totalPieces,
      myPlayerNumber,
      nextPlayer
    });
    
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
      
      console.log('handleConfirm: ALL PIECES PLACED - Counting cells', { player1Cells, player2Cells });
      
      // Determine winner by cell count (more cells = winner)
      if (myPlayerNumber === 1) {
        winnerId = player1Cells >= player2Cells ? user.id : game.player2_id;
      } else {
        winnerId = player2Cells >= player1Cells ? user.id : game.player1_id;
      }
      
      console.log('handleConfirm: GAME OVER - All pieces placed, winner determined by cell count');
    }
    // Case 2: Check if opponent can place any remaining pieces
    else if (newUsedPieces.length >= 2) {
      console.log('handleConfirm: Checking if opponent can move...');
      // FIXED: Pass usedPieces (pieces to skip), not remainingPieces
      // The function signature is canAnyPieceBePlaced(board, usedPieces)
      const opponentCanMove = canAnyPieceBePlaced(newBoard, newUsedPieces);
      
      console.log('handleConfirm: Opponent can move?', opponentCanMove);
      
      if (!opponentCanMove) {
        gameOver = true;
        gameOverReason = 'opponent_blocked';
        winnerId = user.id;
        console.log('handleConfirm: GAME OVER - Opponent cannot move, I win!');
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
        console.log('handleConfirm: Server failed but game over detected locally - showing result anyway');
        
        const isWin = winnerId === user.id;
        setGameResult({ isWin, winnerId, reason: gameOverReason || 'opponent_blocked' });
        setShowGameOver(true);
        soundManager.playSound(isWin ? 'win' : 'lose');
        
        // Apply the local board state so user sees their move
        setBoard(newBoard);
        setBoardPieces(newBoardPieces);
        setUsedPieces(newUsedPieces);
        setGame(prev => prev ? { ...prev, status: 'completed', winner_id: winnerId } : prev);
        
        // Retry the server update in background (the RLS policy needs to be fixed)
        console.log('handleConfirm: Retrying server update in background...');
        setTimeout(async () => {
          try {
            const retryResult = await gameSyncService.makeMove(
              currentGameId, user.id,
              { pieceType: pendingMove.piece, row: pendingMove.row, col: pendingMove.col,
                rotation, flipped, newBoard, newBoardPieces, newUsedPieces,
                nextPlayer, gameOver: true, winnerId }
            );
            console.log('handleConfirm: Background retry result:', retryResult.error ? 'failed' : 'success');
          } catch (e) {
            console.log('handleConfirm: Background retry exception:', e.message);
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

    console.log('handleConfirm: Move successful');
    
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
    
    // Handle game over
    if (gameOver) {
      const isWin = winnerId === user.id;
      console.log('handleConfirm: Game over!', { isWin, winnerId, userId: user.id, reason: gameOverReason });
      
      setGameResult({ isWin, winnerId, reason: gameOverReason || 'normal' });
      setShowGameOver(true);
      soundManager.playSound(isWin ? 'win' : 'lose');
      setGame(prev => prev ? { ...prev, status: 'completed', winner_id: winnerId } : prev);
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

  const handleQuitOrForfeit = useCallback(async () => {
    if (game?.status !== 'active') return;
    
    if (hasMovesPlayed) {
      const confirmed = window.confirm('Forfeit this game? This will count as a loss.');
      if (!confirmed) return;
      
      soundManager.playButtonClick();
      await gameSyncService.forfeitGame(currentGameId, user.id);
      
      setGameResult({ isWin: false, winnerId: opponent?.id, reason: 'forfeit' });
      setShowGameOver(true);
      soundManager.playSound('lose');
    } else {
      const confirmed = window.confirm('Quit this game? No penalty since no moves have been made.');
      if (!confirmed) return;
      
      soundManager.playButtonClick();
      await gameSyncService.abandonGame(currentGameId);
      onLeave();
    }
  }, [game?.status, hasMovesPlayed, gameId, user?.id, opponent?.id, onLeave]);

  const handleLeave = () => {
    soundManager.playButtonClick();
    onLeave();
  };

  // =========================================================================
  // RENDER
  // =========================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="fixed inset-0 opacity-40 pointer-events-none" style={{
          backgroundImage: `linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} />
        <FloatingPiecesBackground colorPreset="online" />
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
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
    <div 
      className="min-h-screen bg-slate-950 overflow-x-hidden"
      style={{ 
        overflowY: needsScroll ? 'auto' : 'hidden',
        touchAction: isDragging ? 'none' : 'pan-y'
      }}
    >
      {/* Background effects */}
      <div className="fixed inset-0 opacity-40 pointer-events-none" style={{
        backgroundImage: `linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />
      <div className={`fixed top-1/4 right-1/4 w-64 h-64 ${theme.glow1} rounded-full blur-3xl pointer-events-none`} />
      <div className={`fixed bottom-1/4 left-1/4 w-64 h-64 ${theme.glow2} rounded-full blur-3xl pointer-events-none`} />
      
      {/* Floating pieces background animation - amber/online theme */}
      <FloatingPiecesBackground colorPreset="online" />

      {/* Drag Overlay */}
      {isDragging && draggedPiece && (
        <DragOverlay
          piece={draggedPiece}
          rotation={rotation}
          flipped={flipped}
          position={dragPosition}
          offset={dragOffset}
          isValidDrop={isValidDrop}
        />
      )}

      {/* Main content */}
      <div className={`relative z-10 ${needsScroll ? 'min-h-screen' : 'h-screen flex flex-col'}`}>
        <div className={`${needsScroll ? '' : 'flex-1 flex flex-col'} max-w-lg mx-auto p-2 sm:p-4`}>
          
          {/* UPDATED: Header with Menu button on same row, ENLARGED title, NO turn indicator text */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={handleLeave}
              className="px-3 py-1.5 bg-slate-800/80 text-slate-300 rounded-lg text-sm hover:bg-slate-700 transition-all flex items-center gap-1"
            >
              <ArrowLeft size={16} />
              Menu
            </button>
            
            <div className="text-center flex-1 mx-2">
              <NeonTitle text="DEADBLOCK" size="medium" color="amber" />
              <NeonSubtitle text="ONLINE BATTLE" color="amber" size="small" className="mt-0" />
            </div>
            
            {/* Turn Timer */}
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
          <div className={`bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-xl p-2 sm:p-4 mb-2 border ${theme.panelBorder} ${theme.panelShadow}`}>
            
            {/* Player Bar */}
            <OnlinePlayerBar 
              profile={profile}
              opponent={opponent}
              isMyTurn={isMyTurn}
              gameStatus={game?.status}
            />

            {/* Game Board - FIXED: Pass ref directly to GameBoard */}
            <div className="flex justify-center pb-4">
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
              </div>
            </div>

            {/* D-Pad with Error Message Layout - matches GameScreen */}
            {pendingMove && isMyTurn && !isDragging && (
              <div className="flex items-start justify-center gap-3 mb-2">
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
                
                {/* Chat button on right */}
                <div className="flex-shrink-0 w-24 flex justify-center">
                  {game?.status === 'active' && (
                    <button
                      onClick={() => {
                        setChatOpen(!chatOpen);
                        if (!chatOpen) setHasUnreadChat(false);
                      }}
                      className={`
                        relative w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-lg transition-all flex items-center justify-center
                        ${chatOpen 
                          ? 'bg-amber-500 text-slate-900 shadow-[0_0_15px_rgba(251,191,36,0.5)]' 
                          : hasUnreadChat 
                            ? 'bg-gradient-to-br from-red-500 to-orange-500 text-white' 
                            : 'bg-slate-800 text-amber-400 border border-amber-500/30 hover:bg-slate-700'
                        }
                      `}
                      style={hasUnreadChat && !chatOpen ? {
                        animation: 'chatBlink 0.8s ease-in-out infinite',
                        boxShadow: '0 0 30px rgba(239,68,68,0.9), 0 0 60px rgba(239,68,68,0.4)'
                      } : {}}
                    >
                      <MessageCircle size={20} className={hasUnreadChat && !chatOpen ? 'animate-bounce' : ''} />
                      {hasUnreadChat && !chatOpen && (
                        <>
                          <span 
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
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
            )}
            
            {/* Chat button when no pending move */}
            {(!pendingMove || !isMyTurn || isDragging) && game?.status === 'active' && (
              <div className="flex justify-center mb-3">
                <button
                  onClick={() => {
                    setChatOpen(!chatOpen);
                    if (!chatOpen) setHasUnreadChat(false);
                  }}
                  className={`
                    relative w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-lg transition-all flex items-center justify-center
                    ${chatOpen 
                      ? 'bg-amber-500 text-slate-900 shadow-[0_0_15px_rgba(251,191,36,0.5)]' 
                      : hasUnreadChat 
                        ? 'bg-gradient-to-br from-red-500 to-orange-500 text-white' 
                        : 'bg-slate-800 text-amber-400 border border-amber-500/30 hover:bg-slate-700'
                    }
                  `}
                  style={hasUnreadChat && !chatOpen ? {
                    animation: 'chatBlink 0.8s ease-in-out infinite',
                    boxShadow: '0 0 30px rgba(239,68,68,0.9), 0 0 60px rgba(239,68,68,0.4)'
                  } : {}}
                >
                  <MessageCircle size={20} className={hasUnreadChat && !chatOpen ? 'animate-bounce' : ''} />
                  {hasUnreadChat && !chatOpen && (
                    <>
                      <span 
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
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
              </div>
            )}

            {/* UPDATED: Controls - GLOW ORB STYLE consistent with other boards */}
            {/* Row 1: Menu, Rotate, Flip, Forfeit/Quit */}
            <div className="flex gap-1 mt-3">
              <GlowOrbButton
                onClick={() => { soundManager.playButtonClick(); onLeave(); }}
                color="red"
                className="flex-1"
              >
                Menu
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
              <div className="flex gap-2 mt-2">
                <GlowOrbButton
                  onClick={handleCancel}
                  color="slate"
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

          {/* Piece Tray */}
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
            // Just close the modal but stay on game screen
            setShowGameOver(false);
          }}
          onRematch={async () => {
            try {
              console.log('[OnlineGameScreen] Initiating rematch request...');
              
              // Create rematch request (this will check if opponent already requested)
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
                console.log('[OnlineGameScreen] Rematch auto-accepted, new game:', data.game.id);
                setRematchAccepted(true);
                setNewGameFromRematch(data.game);
                
                // Determine who goes first
                const firstPlayerId = data.firstPlayerId;
                const firstPlayerName = firstPlayerId === user.id
                  ? 'You go'
                  : `${opponent?.display_name || opponent?.username || 'Opponent'} goes`;
                
                soundManager.playSound('notification');
                setRematchMessage(`Rematch starting! ${firstPlayerName} first.`);
                
                // Navigate to new game after delay
                setTimeout(() => {
                  setShowGameOver(false);
                  setShowRematchModal(false);
                  if (typeof onLeave === 'function') {
                    onLeave();
                  } else {
                    window.location.href = window.location.origin;
                  }
                }, 2000);
                return;
              }
              
              // Show rematch modal in waiting state
              console.log('[OnlineGameScreen] Rematch request sent:', data.id);
              setRematchRequest(data);
              setIsRematchRequester(true);
              setRematchWaiting(true);
              setShowRematchModal(true);
              
              soundManager.playSound('notification');
              
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

      {/* Rematch Notification Toast */}
      {(rematchMessage || rematchError) && (
        <div className="fixed inset-x-0 top-20 z-[60] flex justify-center pointer-events-none">
          <div 
            className={`
              px-6 py-4 rounded-xl shadow-2xl max-w-sm mx-4 text-center
              ${rematchError 
                ? 'bg-red-900/90 border border-red-500/50 text-red-100' 
                : 'bg-gradient-to-r from-amber-500/90 to-orange-500/90 border border-amber-400/50 text-white'
              }
              backdrop-blur-sm animate-pulse
            `}
          >
            <div className="flex items-center justify-center gap-2">
              {rematchError ? (
                <>
                  <span className="text-2xl">❌</span>
                  <span className="font-medium">{rematchError}</span>
                </>
              ) : (
                <>
                  <span className="text-2xl">⚔️</span>
                  <span className="font-bold">{rematchMessage}</span>
                </>
              )}
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
          
          console.log('[OnlineGameScreen] Accepting rematch...');
          const { data, error } = await rematchService.acceptRematchRequest(rematchRequest.id, user.id);
          
          if (error) {
            setRematchError(error.message);
            return;
          }
          
          if (data?.game) {
            console.log('[OnlineGameScreen] Rematch accepted! New game:', data.game.id);
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
                console.log('[OnlineGameScreen] Using onNavigateToGame to navigate to:', data.game.id);
                onNavigateToGame(data.game);
              } else {
                // Fallback: reset internal state and load new game
                console.log('[OnlineGameScreen] Fallback: resetting internal state');
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
    </div>
  );
};

export default OnlineGameScreen;
