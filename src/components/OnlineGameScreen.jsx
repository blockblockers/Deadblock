// Online Game Screen - Real-time multiplayer game with drag-and-drop support
import { useState, useEffect, useCallback, useRef } from 'react';
import { Flag, Users, Shuffle, ArrowUp, ArrowDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { gameSyncService } from '../services/gameSync';
import NeonTitle from './NeonTitle';
import NeonSubtitle from './NeonSubtitle';
import GameBoard from './GameBoard';
import PieceTray from './PieceTray';
import DPad from './DPad';
import DragOverlay from './DragOverlay';
import GameOverModal from './GameOverModal';
import QuickChat from './QuickChat';
import TurnTimer from './TurnTimer';
import HeadToHead from './HeadToHead';
import { RatingChange, RatingBadge } from './RatingDisplay';
import TierIcon from './TierIcon';
import { getPieceCoords, canPlacePiece, canAnyPieceBePlaced, BOARD_SIZE } from '../utils/gameLogic';
import { soundManager } from '../utils/soundManager';
import { notificationService } from '../services/notificationService';
import { replayService } from '../services/replayService';
import { ratingService } from '../services/ratingService';
import achievementService from '../services/achievementService';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

// Drag detection constants
const DRAG_THRESHOLD = 10;
const SCROLL_ANGLE_THRESHOLD = 60;

// Orange/Amber theme for online mode
const theme = {
  gridColor: 'rgba(251,191,36,0.4)',
  glow1: 'bg-amber-500/30',
  glow2: 'bg-orange-500/25',
  panelBorder: 'border-amber-500/40',
  panelShadow: 'shadow-[0_0_40px_rgba(251,191,36,0.2)]',
  accent: 'text-amber-400',
  accentBg: 'bg-amber-500/20',
  accentBorder: 'border-amber-400/50',
};

// Player indicator bar for online games
const OnlinePlayerBar = ({ profile, opponent, isMyTurn, gameStatus, userId, opponentId }) => {
  const myRating = profile?.rating || 1000;
  const oppRating = opponent?.rating || 1000;
  const myTier = ratingService.getRatingTier(myRating);
  const oppTier = ratingService.getRatingTier(oppRating);
  
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between">
        {/* Me */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${
          isMyTurn && gameStatus === 'active'
            ? 'bg-amber-500/20 border border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.4)]' 
            : 'bg-slate-800/50 border border-slate-700/50'
        }`}>
          <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
            isMyTurn && gameStatus === 'active' ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)] animate-pulse' : 'bg-slate-600'
          }`} />
          <span className={`text-sm font-bold tracking-wide ${isMyTurn ? 'text-amber-300' : 'text-slate-500'}`}>
            You
          </span>
          <TierIcon shape={myTier.shape} glowColor={myTier.glowColor} size="small" />
          <span className="text-xs text-slate-600">{myRating}</span>
        </div>
        
        {/* VS */}
        <div className="text-slate-600 text-xs font-bold px-2">VS</div>
        
        {/* Opponent */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${
          !isMyTurn && gameStatus === 'active'
            ? 'bg-orange-500/20 border border-orange-400/50 shadow-[0_0_15px_rgba(249,115,22,0.4)]' 
            : 'bg-slate-800/50 border border-slate-700/50'
        }`}>
          <span className={`text-sm font-bold tracking-wide ${!isMyTurn && gameStatus === 'active' ? 'text-orange-300' : 'text-slate-500'}`}>
            Opponent
          </span>
          <TierIcon shape={oppTier.shape} glowColor={oppTier.glowColor} size="small" />
          <span className="text-xs text-slate-600">{oppRating}</span>
          <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
            !isMyTurn && gameStatus === 'active' ? 'bg-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.8)] animate-pulse' : 'bg-slate-600'
          }`} />
        </div>
      </div>
      
      {/* Head to head mini display */}
      {userId && opponentId && (
        <div className="mt-2 flex justify-center">
          <HeadToHead userId={userId} opponentId={opponentId} compact={true} />
        </div>
      )}
    </div>
  );
};

// Rematch Modal Component
const RematchModal = ({ isOpen, opponentName, onClose, onConfirm, isSending }) => {
  const [selectedOrder, setSelectedOrder] = useState('random');
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl p-6 max-w-sm w-full border border-amber-500/50 shadow-[0_0_50px_rgba(251,191,36,0.3)]">
        {/* Header */}
        <h2 className="text-xl font-bold text-amber-400 text-center mb-4">
          Rematch {opponentName}?
        </h2>
        
        {/* Order Selection */}
        <div className="mb-6">
          <p className="text-slate-400 text-sm text-center mb-3">Who goes first?</p>
          
          <div className="flex flex-col gap-2">
            {/* Random Option */}
            <button
              onClick={() => setSelectedOrder('random')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                selectedOrder === 'random'
                  ? 'bg-amber-500/20 border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                  : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                selectedOrder === 'random' ? 'bg-amber-500/30' : 'bg-slate-700/50'
              }`}>
                <Shuffle size={20} className={selectedOrder === 'random' ? 'text-amber-400' : 'text-slate-500'} />
              </div>
              <div className="text-left">
                <p className={`font-bold ${selectedOrder === 'random' ? 'text-amber-300' : 'text-slate-300'}`}>
                  Random
                </p>
                <p className="text-xs text-slate-500">Let fate decide</p>
              </div>
            </button>
            
            {/* I Go First */}
            <button
              onClick={() => setSelectedOrder('me')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                selectedOrder === 'me'
                  ? 'bg-green-500/20 border-green-400/50 shadow-[0_0_15px_rgba(74,222,128,0.3)]'
                  : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                selectedOrder === 'me' ? 'bg-green-500/30' : 'bg-slate-700/50'
              }`}>
                <ArrowUp size={20} className={selectedOrder === 'me' ? 'text-green-400' : 'text-slate-500'} />
              </div>
              <div className="text-left">
                <p className={`font-bold ${selectedOrder === 'me' ? 'text-green-300' : 'text-slate-300'}`}>
                  I Go First
                </p>
                <p className="text-xs text-slate-500">Request to start</p>
              </div>
            </button>
            
            {/* Opponent Goes First */}
            <button
              onClick={() => setSelectedOrder('opponent')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                selectedOrder === 'opponent'
                  ? 'bg-orange-500/20 border-orange-400/50 shadow-[0_0_15px_rgba(249,115,22,0.3)]'
                  : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                selectedOrder === 'opponent' ? 'bg-orange-500/30' : 'bg-slate-700/50'
              }`}>
                <ArrowDown size={20} className={selectedOrder === 'opponent' ? 'text-orange-400' : 'text-slate-500'} />
              </div>
              <div className="text-left">
                <p className={`font-bold ${selectedOrder === 'opponent' ? 'text-orange-300' : 'text-slate-300'}`}>
                  {opponentName} First
                </p>
                <p className="text-xs text-slate-500">Let them start</p>
              </div>
            </button>
          </div>
        </div>
        
        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isSending}
            className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all border border-slate-500/50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedOrder)}
            disabled={isSending}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-xl font-bold transition-all border border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              'Send Rematch'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const OnlineGameScreen = ({ gameId, onGameEnd, onLeave }) => {
  const { user, profile, loading: authLoading } = useAuth();
  const { needsScroll: checkScroll } = useResponsiveLayout(900);
  const needsScroll = true; // Force scroll mode for better mobile experience
  
  // Game state
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  
  // Ref to track expected piece count after a move
  const expectedPieceCountRef = useRef(null);
  const moveInProgressRef = useRef(false);
  
  // Local game state for UI
  const [board, setBoard] = useState(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
  const [boardPieces, setBoardPieces] = useState({});
  const [usedPieces, setUsedPieces] = useState([]);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [pendingMove, setPendingMove] = useState(null);
  
  // Game info
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [myPlayerNumber, setMyPlayerNumber] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [showGameOver, setShowGameOver] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  
  // Rematch modal state
  const [showRematchModal, setShowRematchModal] = useState(false);
  const [isSendingRematch, setIsSendingRematch] = useState(false);
  
  // Social features state
  const [moveCount, setMoveCount] = useState(0);
  const [turnStartedAt, setTurnStartedAt] = useState(null);
  const [ratingChange, setRatingChange] = useState(null);
  const [newAchievements, setNewAchievements] = useState([]);
  const turnStartRef = useRef(Date.now());
  
  // Drag-and-drop state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isValidDrop, setIsValidDrop] = useState(false);
  const boardRef = useRef(null);
  const boardBoundsRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const hasDragStartedRef = useRef(false);

  // Calculate which board cell the drag position is over
  const calculateBoardCell = useCallback((clientX, clientY) => {
    if (!boardBoundsRef.current) return null;
    
    const { left, top, width, height } = boardBoundsRef.current;
    const cellWidth = width / BOARD_SIZE;
    const cellHeight = height / BOARD_SIZE;
    
    const relX = clientX - left;
    const relY = clientY - top;
    
    const col = Math.floor(relX / cellWidth);
    const row = Math.floor(relY / cellHeight);
    
    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
      return { row, col };
    }
    return null;
  }, []);

  // Check if movement is a scroll gesture (mostly vertical)
  const isScrollGesture = useCallback((startX, startY, currentX, currentY) => {
    const dx = Math.abs(currentX - startX);
    const dy = Math.abs(currentY - startY);
    
    if (dx + dy < DRAG_THRESHOLD) return null;
    
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    return angle > SCROLL_ANGLE_THRESHOLD;
  }, []);

  // Start drag from piece tray
  const startDrag = useCallback((piece, clientX, clientY, elementRect) => {
    if (game?.status !== 'active' || usedPieces.includes(piece)) return;
    if (!isMyTurn) return;
    
    const offsetX = clientX - (elementRect.left + elementRect.width / 2);
    const offsetY = clientY - (elementRect.top + elementRect.height / 2);
    
    setDraggedPiece(piece);
    setDragPosition({ x: clientX, y: clientY });
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
    hasDragStartedRef.current = true;
    
    // Also select the piece
    setSelectedPiece(piece);
    setRotation(0);
    setFlipped(false);
    setPendingMove(null);
    soundManager.playPieceSelect();
    
    // Prevent scroll while dragging
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }, [game?.status, usedPieces, isMyTurn]);

  // Handle starting drag from a pending piece on the board
  const handleBoardDragStart = useCallback((piece, clientX, clientY, elementRect) => {
    if (game?.status !== 'active') return;
    if (!isMyTurn) return;
    
    // Clear the pending move first (piece is being "picked up")
    setPendingMove(null);
    
    // Start the drag
    const offsetX = clientX - (elementRect.left + elementRect.width / 2);
    const offsetY = clientY - (elementRect.top + elementRect.height / 2);
    
    setDraggedPiece(piece);
    setDragPosition({ x: clientX, y: clientY });
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
    hasDragStartedRef.current = true;
    
    soundManager.playPieceSelect();
    
    // Prevent scroll while dragging
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }, [game?.status, isMyTurn]);

  // Update drag position
  const updateDrag = useCallback((clientX, clientY) => {
    if (!isDragging || !draggedPiece) return;
    
    setDragPosition({ x: clientX, y: clientY });
    
    // Update board bounds
    if (boardRef.current) {
      boardBoundsRef.current = boardRef.current.getBoundingClientRect();
    }
    
    // Calculate which cell we're over
    const cell = calculateBoardCell(clientX, clientY);
    
    if (cell) {
      // Update pending move for visual feedback
      setPendingMove({ piece: draggedPiece, row: cell.row, col: cell.col });
      
      // Check if valid drop position
      const coords = getPieceCoords(draggedPiece, rotation, flipped);
      const valid = canPlacePiece(board, cell.row, cell.col, coords);
      setIsValidDrop(valid);
    } else {
      setIsValidDrop(false);
    }
  }, [isDragging, draggedPiece, rotation, flipped, board, calculateBoardCell]);

  // End drag
  const endDrag = useCallback(() => {
    if (!isDragging) return;
    
    // Keep pending move for user to confirm/adjust
    
    setIsDragging(false);
    setDraggedPiece(null);
    setDragPosition({ x: 0, y: 0 });
    setDragOffset({ x: 0, y: 0 });
    setIsValidDrop(false);
    hasDragStartedRef.current = false;
    
    // Restore scroll
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  }, [isDragging]);

  // Create drag handlers for a piece
  const createDragHandlers = useCallback((piece) => {
    if (game?.status !== 'active' || usedPieces.includes(piece) || !isMyTurn) {
      return {};
    }

    let startX = 0;
    let startY = 0;
    let elementRect = null;
    let gestureDecided = false;

    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      elementRect = e.currentTarget.getBoundingClientRect();
      gestureDecided = false;
      dragStartRef.current = { x: startX, y: startY };
    };

    const handleTouchMove = (e) => {
      if (gestureDecided && !hasDragStartedRef.current) return;
      
      const touch = e.touches[0];
      const currentX = touch.clientX;
      const currentY = touch.clientY;
      
      if (!gestureDecided) {
        const isScroll = isScrollGesture(startX, startY, currentX, currentY);
        
        if (isScroll === null) return;
        
        gestureDecided = true;
        
        if (isScroll) {
          return; // It's a scroll
        } else {
          e.preventDefault();
          startDrag(piece, currentX, currentY, elementRect);
        }
      }
      
      if (hasDragStartedRef.current) {
        e.preventDefault();
        updateDrag(currentX, currentY);
      }
    };

    const handleTouchEnd = (e) => {
      if (hasDragStartedRef.current) {
        e.preventDefault();
        endDrag();
      }
      gestureDecided = false;
    };

    // Mouse handlers for desktop
    const handleMouseDown = (e) => {
      if (e.button !== 0) return;
      startX = e.clientX;
      startY = e.clientY;
      elementRect = e.currentTarget.getBoundingClientRect();
      startDrag(piece, e.clientX, e.clientY, elementRect);
    };

    return {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onMouseDown: handleMouseDown,
    };
  }, [game?.status, usedPieces, isMyTurn, isScrollGesture, startDrag, updateDrag, endDrag]);

  // Global mouse move/up handlers for desktop drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      updateDrag(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      endDrag();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, updateDrag, endDrag]);

  // Clean up drag state on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, []);

  // Update board bounds when board ref changes
  useEffect(() => {
    if (boardRef.current) {
      boardBoundsRef.current = boardRef.current.getBoundingClientRect();
    }
  }, [board]);

  // Calculate if pending move is valid
  const canConfirm = pendingMove && (() => {
    const coords = getPieceCoords(pendingMove.piece, rotation, flipped);
    return canPlacePiece(board, pendingMove.row, pendingMove.col, coords);
  })();

  // Update local state from game data
  const updateGameState = useCallback((gameData, userId) => {
    if (!gameData) return;

    let validBoard = gameData.board;
    const isValidBoard = Array.isArray(validBoard) && 
                         validBoard.length === BOARD_SIZE &&
                         validBoard.every(row => Array.isArray(row) && row.length === BOARD_SIZE);
    
    if (!isValidBoard) {
      validBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    } else {
      validBoard = validBoard.map(row => 
        row.map(cell => (cell === 0 ? null : cell))
      );
    }

    setBoard(validBoard);
    setBoardPieces(gameData.board_pieces || {});
    setUsedPieces(gameData.used_pieces || []);
    setMoveCount((gameData.used_pieces || []).length);
    
    const playerNum = gameData.player1_id === userId ? 1 : 2;
    setMyPlayerNumber(playerNum);
    
    const isTurn = gameData.current_player === playerNum && gameData.status === 'active';
    setIsMyTurn(isTurn);
    
    if (isTurn) {
      setTurnStartedAt(gameData.turn_started_at);
      turnStartRef.current = Date.now();
    }
    
    // Set opponent
    if (gameData.player1_id === userId) {
      setOpponent(gameData.player2);
    } else {
      setOpponent(gameData.player1);
    }
    
    // Check for game over
    if (gameData.status === 'completed' && !showGameOver) {
      const winnerId = gameData.winner_id;
      const isWin = winnerId === userId;
      
      setGameResult({
        isWin,
        winnerId,
        reason: gameData.end_reason || 'normal'
      });
      setShowGameOver(true);
      
      if (isWin) {
        soundManager.playSound('win');
      } else {
        soundManager.playSound('lose');
      }
    }
    
    setGame(gameData);
  }, [showGameOver]);

  // Load game and subscribe to updates
  useEffect(() => {
    if (!gameId || !user?.id || authLoading) return;

    let mounted = true;
    const userId = user.id;

    const loadingTimeout = setTimeout(() => {
      if (mounted && loading) {
        setError('Loading timed out. Please try again.');
        setLoading(false);
      }
    }, 15000);

    gameSyncService.subscribeToGame(
      gameId,
      userId,
      (gameData) => {
        if (!mounted) return;
        
        if (!gameData) {
          setError('Game not found');
          setLoading(false);
          return;
        }
        
        setLoading(false);
        setConnected(true);
        
        // Check for stale updates during move
        if (moveInProgressRef.current || expectedPieceCountRef.current !== null) {
          const incomingPieceCount = gameData?.used_pieces?.length || 0;
          const expectedCount = expectedPieceCountRef.current || 0;
          
          if (incomingPieceCount < expectedCount) {
            return; // Ignore stale update
          }
          
          if (incomingPieceCount >= expectedCount) {
            expectedPieceCountRef.current = null;
          }
        }
        
        updateGameState(gameData, userId);
      },
      (err) => {
        console.error('Connection error:', err);
        if (mounted) {
          setConnected(false);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
      gameSyncService.unsubscribe();
    };
  }, [gameId, user?.id, authLoading, updateGameState, retryCount]);

  // Handle cell click
  const handleCellClick = (row, col) => {
    if (!isMyTurn || !selectedPiece || game?.status !== 'active') return;

    const coords = getPieceCoords(selectedPiece, rotation, flipped);
    setPendingMove({ piece: selectedPiece, row, col });
    
    const isWithinBounds = coords.every(([dx, dy]) => {
      const cellRow = row + dy;
      const cellCol = col + dx;
      return cellRow >= 0 && cellRow < BOARD_SIZE && cellCol >= 0 && cellCol < BOARD_SIZE;
    });
    
    if (isWithinBounds && canPlacePiece(board, row, col, coords)) {
      soundManager.playClickSound('place');
    } else {
      soundManager.playInvalid();
    }
  };

  // Handle piece selection
  const handleSelectPiece = (pieceType) => {
    if (!isMyTurn || usedPieces.includes(pieceType)) return;
    
    setSelectedPiece(pieceType);
    setRotation(0);
    setFlipped(false);
    setPendingMove(null);
    soundManager.playClickSound('select');
  };

  // Handle rotation
  const handleRotate = () => {
    if (!selectedPiece) return;
    setRotation((r) => (r + 90) % 360);
    soundManager.playClickSound('rotate');
    
    if (pendingMove) {
      setPendingMove({ ...pendingMove });
    }
  };

  // Handle flip
  const handleFlip = () => {
    if (!selectedPiece) return;
    setFlipped((f) => !f);
    soundManager.playClickSound('flip');
    
    if (pendingMove) {
      setPendingMove({ ...pendingMove });
    }
  };

  // Handle move piece with D-pad
  const handleMovePiece = (direction) => {
    if (!pendingMove) return;
    
    const { row, col } = pendingMove;
    let newRow = row;
    let newCol = col;
    
    switch (direction) {
      case 'up': newRow = Math.max(0, row - 1); break;
      case 'down': newRow = Math.min(BOARD_SIZE - 1, row + 1); break;
      case 'left': newCol = Math.max(0, col - 1); break;
      case 'right': newCol = Math.min(BOARD_SIZE - 1, col + 1); break;
      default: break;
    }
    
    setPendingMove({ ...pendingMove, row: newRow, col: newCol });
    soundManager.playClickSound('move');
  };

  // Handle confirm move
  const handleConfirm = async () => {
    if (!pendingMove || !isMyTurn || !game) return;
    
    const coords = getPieceCoords(pendingMove.piece, rotation, flipped);
    if (!canPlacePiece(board, pendingMove.row, pendingMove.col, coords)) {
      soundManager.playInvalid();
      return;
    }
    
    moveInProgressRef.current = true;
    const newUsedPieces = [...usedPieces, pendingMove.piece];
    expectedPieceCountRef.current = newUsedPieces.length;
    
    // Optimistic update
    const newBoard = board.map(row => [...row]);
    const newBoardPieces = { ...boardPieces };
    
    coords.forEach(([dx, dy]) => {
      const cellRow = pendingMove.row + dy;
      const cellCol = pendingMove.col + dx;
      if (cellRow >= 0 && cellRow < BOARD_SIZE && cellCol >= 0 && cellCol < BOARD_SIZE) {
        newBoard[cellRow][cellCol] = myPlayerNumber;
        newBoardPieces[`${cellRow},${cellCol}`] = pendingMove.piece;
      }
    });
    
    setBoard(newBoard);
    setBoardPieces(newBoardPieces);
    setUsedPieces(newUsedPieces);
    
    soundManager.playClickSound('confirm');
    
    // Send move to server
    const { error: moveError } = await gameSyncService.makeMove(gameId, {
      piece: pendingMove.piece,
      row: pendingMove.row,
      col: pendingMove.col,
      rotation: rotation,
      flipped: flipped,
      playerId: user.id
    });
    
    if (moveError) {
      console.error('Move error:', moveError);
      // Revert on error
      updateGameState(game, user.id);
      moveInProgressRef.current = false;
      expectedPieceCountRef.current = null;
      return;
    }
    
    // Check for game over
    const gameOver = !canAnyPieceBePlaced(newBoard, newUsedPieces);
    
    // Clear selection
    setSelectedPiece(null);
    setPendingMove(null);
    setRotation(0);
    setFlipped(false);
    
    setTimeout(() => {
      moveInProgressRef.current = false;
    }, 500);
    
    if (gameOver) {
      setGameResult({
        isWin: true,
        winnerId: user.id,
        reason: 'normal'
      });
      setShowGameOver(true);
      soundManager.playSound('win');
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setPendingMove(null);
    soundManager.playClickSound('cancel');
  };

  // Handle forfeit
  const handleForfeit = async () => {
    if (!game || game.status !== 'active') return;
    
    if (window.confirm('Are you sure you want to forfeit this game?')) {
      await gameSyncService.forfeitGame(gameId, user.id);
    }
  };

  // Handle game over modal close
  const handleCloseGameOver = () => {
    setShowGameOver(false);
    onGameEnd?.(gameResult);
  };

  // Handle rematch - show modal first
  const handleRematchClick = () => {
    setShowRematchModal(true);
  };

  // Handle rematch confirm with order preference
  const handleRematchConfirm = async (orderPreference) => {
    if (!user || !game) return;
    
    setIsSendingRematch(true);
    
    const opponentId = game.player1_id === user.id ? game.player2_id : game.player1_id;
    
    try {
      const { inviteService } = await import('../services/inviteService');
      
      // Pass the order preference with the invite
      const { data, error } = await inviteService.sendInvite(user.id, opponentId, {
        orderPreference,
        isRematch: true
      });
      
      if (error) {
        if (error.message === 'Invite already sent') {
          alert('Invite already sent! Waiting for opponent to accept.');
        } else {
          alert('Could not send rematch invite: ' + error.message);
        }
        setIsSendingRematch(false);
        setShowRematchModal(false);
        return;
      }
      
      // If both players invited each other, a game is created
      if (data?.game) {
        setShowRematchModal(false);
        setShowGameOver(false);
        onGameEnd?.({ ...gameResult, rematchGameId: data.game.id });
      } else {
        alert('Rematch invite sent! The game will start when your opponent accepts.');
        setShowRematchModal(false);
        setShowGameOver(false);
        onGameEnd?.(gameResult);
      }
    } catch (err) {
      console.error('Rematch error:', err);
      alert('Failed to send rematch invite');
    }
    
    setIsSendingRematch(false);
  };

  // Get opponent name
  const getOpponentName = () => {
    if (!game || !user) return 'Opponent';
    if (game.player1_id === user.id) {
      return game.player2?.username || game.player2?.display_name || 'Opponent';
    }
    return game.player1?.username || game.player1?.display_name || 'Opponent';
  };

  // Handle leave
  const handleLeave = () => {
    soundManager.playButtonClick();
    onLeave();
  };

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="fixed inset-0 opacity-40 pointer-events-none" style={{
          backgroundImage: `linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} />
        <div className={`fixed top-1/4 right-1/4 w-64 h-64 ${theme.glow1} rounded-full blur-3xl pointer-events-none`} />
        <div className={`fixed bottom-1/4 left-1/4 w-64 h-64 ${theme.glow2} rounded-full blur-3xl pointer-events-none`} />
        
        <div className="relative text-center">
          <div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-amber-300 mb-6">Loading game...</p>
          <button
            onClick={handleLeave}
            className="px-6 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Error screen
  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={handleLeave}
            className="px-6 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-all"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 overflow-x-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 opacity-40 pointer-events-none" style={{
        backgroundImage: `linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />
      <div className={`fixed top-1/4 right-1/4 w-64 h-64 ${theme.glow1} rounded-full blur-3xl pointer-events-none`} />
      <div className={`fixed bottom-1/4 left-1/4 w-64 h-64 ${theme.glow2} rounded-full blur-3xl pointer-events-none`} />

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
          
          {/* Header */}
          <div className="flex justify-between items-center mb-2">
            <button
              onClick={handleLeave}
              className="px-3 py-1.5 bg-slate-800/80 text-slate-300 rounded-lg text-sm hover:bg-slate-700 transition-all"
            >
              ← Leave
            </button>
            <span className={`text-sm font-bold ${theme.accent}`}>
              {game?.status === 'active' ? (isMyTurn ? "YOUR TURN" : "OPPONENT'S TURN") : game?.status === 'completed' ? "GAME OVER" : "Loading..."}
            </span>
            {/* Turn Timer */}
            {game?.turn_timer_seconds && game?.status === 'active' && (
              <TurnTimer
                seconds={game.turn_timer_seconds}
                turnStartedAt={game.turn_started_at || turnStartedAt}
                isMyTurn={isMyTurn}
                onTimeout={() => {
                  if (isMyTurn) {
                    gameSyncService.forfeitGame(gameId, user.id);
                  }
                }}
              />
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
              userId={user?.id}
              opponentId={opponent?.id}
            />

            {/* Game Board with ref for drag positioning */}
            <div className="flex justify-center pb-4">
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
            </div>

            {/* D-Pad for moving piece */}
            {pendingMove && isMyTurn && !isDragging && <DPad onMove={handleMovePiece} />}

            {/* Controls */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleRotate}
                disabled={!selectedPiece || !isMyTurn}
                className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg disabled:opacity-30 hover:bg-slate-600 transition-all text-sm"
              >
                Rotate
              </button>
              <button
                onClick={handleFlip}
                disabled={!selectedPiece || !isMyTurn}
                className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg disabled:opacity-30 hover:bg-slate-600 transition-all text-sm"
              >
                Flip
              </button>
              {pendingMove ? (
                <>
                  <button
                    onClick={handleCancel}
                    className="flex-1 py-2 bg-slate-600 text-slate-300 rounded-lg hover:bg-slate-500 transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={!canConfirm}
                    className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg disabled:opacity-30 hover:from-amber-400 hover:to-orange-500 transition-all text-sm font-bold shadow-[0_0_15px_rgba(251,191,36,0.4)]"
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button
                  onClick={handleForfeit}
                  disabled={game?.status !== 'active'}
                  className="py-2 px-4 bg-slate-800 text-slate-400 rounded-lg hover:bg-red-900/50 hover:text-red-300 transition-all text-sm disabled:opacity-30"
                >
                  <Flag size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Piece Tray with drag handlers */}
          <div>
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
          
          {/* Bottom padding for scroll */}
          <div className="h-16" />
        </div>
      </div>

      {/* Quick Chat - for emotes and quick messages */}
      {game?.status === 'active' && user?.id && (
        <QuickChat
          gameId={gameId}
          userId={user.id}
          opponentName={opponent?.username || 'Opponent'}
          disabled={game?.status !== 'active'}
        />
      )}

      {/* Game Over Modal */}
      {showGameOver && (
        <GameOverModal
          isWin={gameResult?.isWin}
          isPuzzle={false}
          gameMode="online"
          winner={gameResult?.isWin ? myPlayerNumber : (myPlayerNumber === 1 ? 2 : 1)}
          opponentName={getOpponentName()}
          onClose={handleCloseGameOver}
          onMenu={handleCloseGameOver}
          onRematch={handleRematchClick}
        />
      )}

      {/* Rematch Modal */}
      <RematchModal
        isOpen={showRematchModal}
        opponentName={getOpponentName()}
        onClose={() => setShowRematchModal(false)}
        onConfirm={handleRematchConfirm}
        isSending={isSendingRematch}
      />
    </div>
  );
};

export default OnlineGameScreen;
