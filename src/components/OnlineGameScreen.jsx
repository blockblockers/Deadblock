// Online Game Screen - Real-time multiplayer game with drag-and-drop support
// FIXED: Real-time updates, drag from board, UI consistency, game over detection
// ADDED: Rematch request system with opponent notification
// UPDATED: Chat notifications, rematch navigation, placement animations
// DIAGNOSTIC: Temporarily removed isMyTurn blocking to test piece selection
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
import TierIcon from './TierIcon';
import PlacementAnimation, { usePlacementAnimation } from './PlacementAnimation';
import { pieces } from '../utils/pieces';
import { getPieceCoords, canPlacePiece, canAnyPieceBePlaced, BOARD_SIZE } from '../utils/gameLogic';
import { soundManager } from '../utils/soundManager';
import { ratingService } from '../services/ratingService';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { realtimeManager } from '../services/realtimeManager';

// Orange/Amber theme for online mode
const theme = {
  gridColor: 'rgba(251,191,36,0.4)',
  glow1: 'bg-amber-500/30',
  glow2: 'bg-orange-500/25',
  panelBorder: 'border-amber-500/40',
  panelShadow: 'shadow-[0_0_40px_rgba(251,191,36,0.2)]',
  accent: 'text-amber-400',
};

// Glow Orb Button Component
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

// Player indicator bar for online games
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
        
        {/* Opponent */}
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
  const [errorMessage, setErrorMessage] = useState(null);
  const [showGameOver, setShowGameOver] = useState(false);
  const [rematchMessage, setRematchMessage] = useState(null);
  const [rematchError, setRematchError] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  
  // Rematch state
  const [showRematchModal, setShowRematchModal] = useState(false);
  const [rematchRequest, setRematchRequest] = useState(null);
  const [isRematchRequester, setIsRematchRequester] = useState(false);
  const [rematchWaiting, setRematchWaiting] = useState(false);
  const [rematchAccepted, setRematchAccepted] = useState(false);
  const [rematchDeclined, setRematchDeclined] = useState(false);
  const [newGameFromRematch, setNewGameFromRematch] = useState(null);
  
  const [chatOpen, setChatOpen] = useState(false);
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const [chatToast, setChatToast] = useState(null);
  const [turnStartedAt, setTurnStartedAt] = useState(null);
  const [connected, setConnected] = useState(false);
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isValidDrop, setIsValidDrop] = useState(false);
  const [dragPreviewCell, setDragPreviewCell] = useState(null);
  
  // Refs
  const boardRef = useRef(null);
  const boardBoundsRef = useRef(null);
  const hasDragStartedRef = useRef(false);
  const turnStartRef = useRef(Date.now());
  const moveInProgressRef = useRef(false);
  const expectedPieceCountRef = useRef(null);
  const mountedRef = useRef(true);
  const prevBoardPiecesRef = useRef({});

  const { animation: placementAnimation, triggerAnimation, clearAnimation } = usePlacementAnimation();

  const userId = user?.id;
  const hasMovesPlayed = usedPieces.length > 0;

  // =========================================================================
  // DRAG HANDLERS
  // =========================================================================
  
  const calculateBoardCell = useCallback((clientX, clientY) => {
    if (!boardBoundsRef.current) return null;
    
    const { left, top, width, height } = boardBoundsRef.current;
    const cellWidth = width / BOARD_SIZE;
    const cellHeight = height / BOARD_SIZE;
    
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const fingerOffset = isMobile ? 40 : 20;
    
    const relX = clientX - left;
    const relY = (clientY - fingerOffset) - top;
    
    const col = Math.floor(relX / cellWidth);
    const row = Math.floor(relY / cellHeight);
    
    const EXTENSION_MARGIN = 4;
    if (row >= -EXTENSION_MARGIN && row < BOARD_SIZE + EXTENSION_MARGIN && 
        col >= -EXTENSION_MARGIN && col < BOARD_SIZE + EXTENSION_MARGIN) {
      return { row, col };
    }
    return null;
  }, []);

  // DIAGNOSTIC: Removed isMyTurn check to test if that's blocking piece selection
  const startDrag = useCallback((piece, clientX, clientY, elementRect) => {
    if (hasDragStartedRef.current) return;
    // Only check game status and piece usage, NOT turn
    if (game?.status !== 'active' || usedPieces.includes(piece)) return;
    
    const offsetX = clientX - (elementRect.left + elementRect.width / 2);
    const offsetY = clientY - (elementRect.top + elementRect.height / 2);
    
    hasDragStartedRef.current = true;
    
    setDraggedPiece(piece);
    setDragPosition({ x: clientX, y: clientY });
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
    
    setSelectedPiece(piece);
    setPendingMove(null);
    soundManager.playPieceSelect();
    
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }, [game?.status, usedPieces]);

  const handleBoardDragStart = useCallback((piece, clientX, clientY, elementRect) => {
    if (hasDragStartedRef.current) return;
    if (game?.status !== 'active' || !isMyTurn) return;
    
    const offsetX = elementRect ? clientX - (elementRect.left + elementRect.width / 2) : 0;
    const offsetY = elementRect ? clientY - (elementRect.top + elementRect.height / 2) : 0;
    
    hasDragStartedRef.current = true;
    
    if (boardRef.current) {
      boardBoundsRef.current = boardRef.current.getBoundingClientRect();
    }
    
    setDraggedPiece(piece);
    setDragPosition({ x: clientX, y: clientY });
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
    
    soundManager.playPieceSelect();
    
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }, [game?.status, isMyTurn]);

  const updateDrag = useCallback((clientX, clientY) => {
    if (!isDragging || !draggedPiece) return;
    
    setDragPosition({ x: clientX, y: clientY });
    
    if (boardRef.current) {
      boardBoundsRef.current = boardRef.current.getBoundingClientRect();
    }
    
    const cell = calculateBoardCell(clientX, clientY);
    
    if (cell) {
      const coords = getPieceCoords(draggedPiece, rotation, flipped);
      
      const minX = Math.min(...coords.map(([x]) => x));
      const maxX = Math.max(...coords.map(([x]) => x));
      const minY = Math.min(...coords.map(([, y]) => y));
      const maxY = Math.max(...coords.map(([, y]) => y));
      
      const centerOffsetCol = Math.floor((maxX + minX) / 2);
      const centerOffsetRow = Math.floor((maxY + minY) / 2);
      
      const adjustedRow = cell.row - centerOffsetRow;
      const adjustedCol = cell.col - centerOffsetCol;
      
      setDragPreviewCell({ row: adjustedRow, col: adjustedCol });
      
      const valid = canPlacePiece(board, adjustedRow, adjustedCol, coords);
      setIsValidDrop(valid);
    } else {
      setDragPreviewCell(null);
      setIsValidDrop(false);
    }
  }, [isDragging, draggedPiece, rotation, flipped, board, calculateBoardCell]);

  const endDrag = useCallback(() => {
    if (!isDragging) return;
    
    if (dragPreviewCell && draggedPiece) {
      setPendingMove({ piece: draggedPiece, row: dragPreviewCell.row, col: dragPreviewCell.col });
    }
    
    setIsDragging(false);
    setDraggedPiece(null);
    setDragPosition({ x: 0, y: 0 });
    setDragOffset({ x: 0, y: 0 });
    setIsValidDrop(false);
    setDragPreviewCell(null);
    hasDragStartedRef.current = false;
    
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  }, [isDragging, dragPreviewCell, draggedPiece]);

  // DIAGNOSTIC: Removed isMyTurn check to test if that's blocking piece selection
  const createDragHandlers = useCallback((piece) => {
    // Only check game status and piece usage, NOT turn
    if (game?.status !== 'active' || usedPieces.includes(piece)) {
      return {};
    }

    let elementRect = null;

    const handleTouchStart = (e) => {
      const touch = e.touches?.[0];
      if (!touch) return;
      
      elementRect = e.currentTarget?.getBoundingClientRect() || null;
      
      if (boardRef?.current) {
        boardBoundsRef.current = boardRef.current.getBoundingClientRect();
      }
      
      startDrag(piece, touch.clientX, touch.clientY, elementRect);
    };

    const handleTouchMove = (e) => {
      if (hasDragStartedRef.current && e.touches?.[0]) {
        e.preventDefault();
        updateDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    
    const handleTouchEnd = (e) => {
      if (hasDragStartedRef.current) {
        e.preventDefault();
        endDrag();
      }
    };

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
  }, [game?.status, usedPieces, startDrag, updateDrag, endDrag]);

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
        const { data: request } = await rematchService.getRematchRequestByGame(gameId, user.id);
        
        if (!mounted) return;
        
        if (request) {
          setRematchRequest(request);
          const isSender = request.from_user_id === user.id;
          setIsRematchRequester(isSender);
          
          if (request.status === 'accepted' && request.new_game_id) {
            setRematchAccepted(true);
            setShowRematchModal(false);
            soundManager.playSound('notification');
            setNewGameFromRematch(request.new_game_id);
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
          
          if (request.status === 'declined') {
            setRematchDeclined(true);
            if (showRematchModal && isRematchRequester) {
              setRematchWaiting(false);
            }
            return;
          }
          
          if (request.status === 'pending' && !isSender && !showRematchModal && !rematchDeclined) {
            setShowRematchModal(true);
          }
        }
      } catch (err) {
        console.error('[OnlineGameScreen] Error checking rematch:', err);
      }
    };
    
    checkRematch();
    pollInterval = setInterval(checkRematch, 2000);
    
    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [showGameOver, gameId, user?.id, showRematchModal, rematchDeclined, rematchAccepted, isRematchRequester]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, []);

  useEffect(() => {
    if (boardRef.current) {
      boardBoundsRef.current = boardRef.current.getBoundingClientRect();
    }
  }, [board]);

  const canConfirm = useMemo(() => {
    if (!pendingMove) return false;
    const coords = getPieceCoords(pendingMove.piece, rotation, flipped);
    return canPlacePiece(board, pendingMove.row, pendingMove.col, coords);
  }, [pendingMove, rotation, flipped, board]);

  // =========================================================================
  // GAME STATE MANAGEMENT
  // =========================================================================

  const updateGameState = useCallback((gameData, currentUserId) => {
    if (!gameData || !mountedRef.current) return;

    let validBoard = gameData.board;
    if (!Array.isArray(validBoard) || validBoard.length !== BOARD_SIZE) {
      validBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    } else {
      validBoard = validBoard.map(row => row.map(cell => (cell === 0 ? null : cell)));
    }
    
    const newBoardPieces = gameData.board_pieces || {};
    const prevPieces = prevBoardPiecesRef.current;
    const newCellKeys = Object.keys(newBoardPieces).filter(key => !prevPieces[key]);
    
    let animatingOpponentMove = false;
    
    if (currentUserId && newCellKeys.length > 0 && !moveInProgressRef.current) {
      const playerNum = gameData.player1_id === currentUserId ? 1 : 2;
      const opponentNum = playerNum === 1 ? 2 : 1;
      const isNowMyTurn = gameData.current_player === playerNum && gameData.status === 'active';
      const isGameOver = gameData.status === 'completed';
      
      if ((isNowMyTurn || isGameOver) && boardRef.current) {
        animatingOpponentMove = true;
        const newCells = newCellKeys.map(key => {
          const [row, col] = key.split(',').map(Number);
          return { row, col };
        });
        
        const boardRect = boardRef.current.getBoundingClientRect();
        const cellSize = boardRect.width / BOARD_SIZE;
        
        setTimeout(() => {
          triggerAnimation(newCells, opponentNum, boardRef, cellSize);
        }, 100);
      }
    }
    
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
        soundManager.playSound('notification');
      }

      if (gameData.status === 'completed' && !showGameOver) {
        const iWon = gameData.winner_id === currentUserId;
        const result = {
          isWin: iWon,
          winnerId: gameData.winner_id,
          reason: gameData.winner_id ? 'normal' : 'draw'
        };
        setGameResult(result);
        
        if (animatingOpponentMove) {
          setTimeout(() => {
            if (mountedRef.current) {
              setShowGameOver(true);
              soundManager.playSound(iWon ? 'win' : 'lose');
            }
          }, 2000);
        } else {
          setShowGameOver(true);
          soundManager.playSound(iWon ? 'win' : 'lose');
        }
      }
    }
  }, [isMyTurn, showGameOver, triggerAnimation]);

  useEffect(() => {
    if (!currentGameId || !userId) return;
    
    mountedRef.current = true;

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
        
        const playerNum = data.player1_id === userId ? 1 : 2;
        const isMyTurnNow = data.current_player === playerNum && data.status === 'active';
        const hasMovesOnBoard = data.used_pieces && data.used_pieces.length > 0;
        
        if (hasMovesOnBoard && isMyTurnNow) {
          const { data: lastMove } = await gameSyncService.getLastMove(currentGameId);
          
          if (lastMove && lastMove.player_id !== userId) {
            const opponentNum = playerNum === 1 ? 2 : 1;
            
            setTimeout(() => {
              if (!mountedRef.current || !boardRef.current) return;
              
              const pieceCoords = pieces[lastMove.piece_type];
              if (!pieceCoords) return;
              
              let coords = [...pieceCoords];
              const rot = lastMove.rotation || 0;
              const flip = lastMove.flipped || false;
              
              for (let r = 0; r < rot; r++) {
                coords = coords.map(([x, y]) => [-y, x]);
              }
              if (flip) {
                coords = coords.map(([x, y]) => [-x, y]);
              }
              
              const placedCells = coords.map(([dx, dy]) => ({
                row: lastMove.row + dy,
                col: lastMove.col + dx
              })).filter(cell => 
                cell.row >= 0 && cell.row < BOARD_SIZE && 
                cell.col >= 0 && cell.col < BOARD_SIZE
              );
              
              const boardRect = boardRef.current.getBoundingClientRect();
              const cellSize = boardRect.width / BOARD_SIZE;
              triggerAnimation(placedCells, opponentNum, boardRef, cellSize);
            }, 500);
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

    const subscription = gameSyncService.subscribeToGame(
      currentGameId,
      (updatedGame) => {
        if (!mountedRef.current) return;
        if (!updatedGame || updatedGame.id !== currentGameId) return;
        
        if (expectedPieceCountRef.current !== null) {
          const incoming = updatedGame.used_pieces?.length || 0;
          if (incoming < expectedPieceCountRef.current) {
            return;
          }
          expectedPieceCountRef.current = null;
        }
        
        if (moveInProgressRef.current) {
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

  useEffect(() => {
    if (!currentGameId || !user?.id || !supabase) return;
    
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
          if (payload.new.sender_id !== user.id && !chatOpen) {
            setHasUnreadChat(true);
            soundManager.playSound('notification');
            
            const opponentName = opponent?.display_name || opponent?.username || 'Opponent';
            const message = payload.new.message || payload.new.quick_message || 'Sent a message';
            const toastTimestamp = Date.now();
            
            setChatToast({
              senderName: opponentName,
              message: message,
              timestamp: toastTimestamp
            });
            
            setTimeout(() => {
              setChatToast(prev => {
                if (prev?.timestamp === toastTimestamp) return null;
                return prev;
              });
            }, 5000);
            
            notificationService.notifyChatMessage(opponentName, message, currentGameId);
          }
        }
      )
      .subscribe();
    
    return () => {
      chatChannel.unsubscribe();
    };
  }, [currentGameId, user?.id, chatOpen, opponent]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('openChat') === 'true') {
      setChatOpen(true);
      setHasUnreadChat(false);
      setChatToast(null);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    const sessionOpenChat = sessionStorage.getItem('deadblock_open_chat');
    if (sessionOpenChat === 'true') {
      setChatOpen(true);
      setHasUnreadChat(false);
      setChatToast(null);
      sessionStorage.removeItem('deadblock_open_chat');
    }
  }, [currentGameId]);

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

  // DIAGNOSTIC: Removed isMyTurn check to test if that's blocking piece selection
  const handleSelectPiece = useCallback((piece) => {
    // Only check game status and piece usage, NOT turn
    if (game?.status !== 'active') return;
    if (usedPieces.includes(piece)) return;
    
    setSelectedPiece(piece);
    setPendingMove(null);
    setRotation(0);
    setFlipped(false);
    soundManager.playPieceSelect();
  }, [game?.status, usedPieces]);

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

  const handleConfirm = useCallback(async () => {
    if (!pendingMove || !canConfirm || moveInProgressRef.current) return;
    
    // IMPORTANT: Keep turn check for confirm to prevent out-of-turn moves
    if (!isMyTurn) {
      setErrorMessage("Wait for your turn!");
      return;
    }
    
    moveInProgressRef.current = true;

    const coords = getPieceCoords(pendingMove.piece, rotation, flipped);
    
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
    const totalPieces = Object.keys(pieces).length;
    
    let gameOver = false;
    let winnerId = null;
    let gameOverReason = null;
    
    if (newUsedPieces.length >= totalPieces) {
      gameOver = true;
      gameOverReason = 'all_pieces_placed';
      
      let player1Cells = 0;
      let player2Cells = 0;
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (newBoard[r][c] === 1) player1Cells++;
          else if (newBoard[r][c] === 2) player2Cells++;
        }
      }
      
      if (myPlayerNumber === 1) {
        winnerId = player1Cells >= player2Cells ? user.id : game.player2_id;
      } else {
        winnerId = player2Cells >= player1Cells ? user.id : game.player1_id;
      }
    }
    else if (newUsedPieces.length >= 2) {
      const opponentCanMove = canAnyPieceBePlaced(newBoard, newUsedPieces);
      
      if (!opponentCanMove) {
        gameOver = true;
        gameOverReason = 'opponent_blocked';
        winnerId = user.id;
      }
    }

    soundManager.playPiecePlace();

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
      
      if (gameOver) {
        const isWin = winnerId === user.id;
        setGameResult({ isWin, winnerId, reason: gameOverReason || 'opponent_blocked' });
        
        setBoard(newBoard);
        setBoardPieces(newBoardPieces);
        setUsedPieces(newUsedPieces);
        setGame(prev => prev ? { ...prev, status: 'completed', winner_id: winnerId } : prev);
        
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
        
        setTimeout(() => {
          if (mountedRef.current) {
            setShowGameOver(true);
            soundManager.playSound(isWin ? 'win' : 'lose');
          }
        }, 2000);
        
        setTimeout(async () => {
          try {
            await gameSyncService.makeMove(
              currentGameId, user.id,
              { pieceType: pendingMove.piece, row: pendingMove.row, col: pendingMove.col,
                rotation, flipped, newBoard, newBoardPieces, newUsedPieces,
                nextPlayer, gameOver: true, winnerId }
            );
          } catch (e) {}
        }, 2000);
        
        moveInProgressRef.current = false;
        return;
      }
      
      soundManager.playSound('invalid');
      moveInProgressRef.current = false;
      expectedPieceCountRef.current = null;
      return;
    }

    expectedPieceCountRef.current = newUsedPieces.length;

    const placedCells = coords.map(([dx, dy]) => ({
      row: pendingMove.row + dy,
      col: pendingMove.col + dx
    })).filter(cell => 
      cell.row >= 0 && cell.row < BOARD_SIZE && 
      cell.col >= 0 && cell.col < BOARD_SIZE
    );
    
    if (boardRef.current) {
      const boardRect = boardRef.current.getBoundingClientRect();
      const cellSize = boardRect.width / BOARD_SIZE;
      triggerAnimation(placedCells, myPlayerNumber, boardRef, cellSize);
      soundManager.playSound('place');
    }

    setBoard(newBoard);
    setBoardPieces(newBoardPieces);
    setUsedPieces(newUsedPieces);
    setIsMyTurn(false);
    setSelectedPiece(null);
    setPendingMove(null);
    setRotation(0);
    setFlipped(false);
    
    if (gameOver) {
      const isWin = winnerId === user.id;
      
      setGameResult({ isWin, winnerId, reason: gameOverReason || 'normal' });
      setGame(prev => prev ? { ...prev, status: 'completed', winner_id: winnerId } : prev);
      
      setTimeout(() => {
        if (mountedRef.current) {
          setShowGameOver(true);
          soundManager.playSound(isWin ? 'win' : 'lose');
        }
      }, 2000);
    }

    setTimeout(() => {
      moveInProgressRef.current = false;
    }, 500);

    const { data: freshData } = await gameSyncService.getGame(currentGameId);
    if (freshData && mountedRef.current) {
      const freshCount = freshData.used_pieces?.length || 0;
      if (freshCount >= newUsedPieces.length) {
        updateGameState(freshData, user.id);
      }
    }
  }, [pendingMove, canConfirm, rotation, flipped, board, boardPieces, usedPieces, 
      myPlayerNumber, gameId, user, updateGameState, triggerAnimation, currentGameId, isMyTurn]);

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
      <div className="min-h-screen bg-transparent flex items-center justify-center">
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
      <div className="min-h-screen bg-transparent flex items-center justify-center">
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
      className="min-h-screen bg-transparent overflow-x-hidden"
      style={{ 
        overflowY: needsScroll ? 'auto' : 'hidden',
        touchAction: isDragging ? 'none' : 'pan-y'
      }}
    >
      {/* Background glow effects */}
      <div className={`fixed top-1/4 right-1/4 w-64 h-64 ${theme.glow1} rounded-full blur-3xl pointer-events-none`} />
      <div className={`fixed bottom-1/4 left-1/4 w-64 h-64 ${theme.glow2} rounded-full blur-3xl pointer-events-none`} />

      {/* Drag Overlay */}
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

      {/* Main content */}
      <div className={`relative z-10 ${needsScroll ? 'min-h-screen' : 'h-screen flex flex-col'}`}>
        <div className={`${needsScroll ? '' : 'flex-1 flex flex-col'} max-w-lg mx-auto p-2 sm:p-4`}>
          
          {/* Header */}
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

          {/* DIAGNOSTIC: Debug info banner - shows turn state - REMOVE AFTER TESTING */}
          {game && (
            <div className={`mb-2 px-3 py-1.5 rounded-lg text-xs font-mono ${
              isMyTurn ? 'bg-green-900/50 text-green-300 border border-green-500/30' : 'bg-red-900/50 text-red-300 border border-red-500/30'
            }`}>
              Turn: {isMyTurn ? 'YOURS' : 'OPPONENT'} | Status: {game?.status} | Player#: {myPlayerNumber} | DB current_player: {game?.current_player}
            </div>
          )}

          {/* Main Game Panel */}
          <div className={`bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-xl p-2 sm:p-4 mb-2 border ${theme.panelBorder} ${theme.panelShadow}`}>
            
            <OnlinePlayerBar 
              profile={profile}
              opponent={opponent}
              isMyTurn={isMyTurn}
              gameStatus={game?.status}
            />

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
                  isDragging={isDragging}
                  dragPreviewCell={dragPreviewCell}
                  draggedPiece={draggedPiece}
                  dragRotation={rotation}
                  dragFlipped={flipped}
                />
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

            {pendingMove && isMyTurn && !isDragging && (
              <div className="flex items-start justify-center gap-3 mb-2">
                <div className="flex-shrink-0 w-24">
                  {errorMessage && (
                    <div className="error-message-box bg-red-900/80 border border-red-500/60 rounded-lg p-2 text-center shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                      <span className="text-red-300 text-xs font-bold leading-tight block">
                        {errorMessage}
                      </span>
                    </div>
                  )}
                </div>
                
                <DPad onMove={handleMovePiece} />
                
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
                  disabled={!canConfirm || !isMyTurn}
                  color="green"
                  className="flex-1"
                >
                  {isMyTurn ? 'Confirm' : 'Wait...'}
                </GlowOrbButton>
              </div>
            )}
          </div>

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

      {showGameOver && gameResult && (
        <GameOverModal
          isOpen={showGameOver}
          isWin={gameResult.isWin}
          isDraw={!gameResult.winnerId}
          reason={gameResult.reason}
          gameMode="online"
          opponentName={opponent?.display_name || opponent?.username || 'Opponent'}
          onClose={() => setShowGameOver(false)}
          onRematch={async () => {
            try {
              const { data, error } = await rematchService.createRematchRequest(gameId, user.id, opponent?.id);
              
              if (error) {
                setRematchError(error.message || 'Could not create rematch request');
                return;
              }
              
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
                  if (typeof onLeave === 'function') {
                    onLeave();
                  } else {
                    window.location.href = window.location.origin;
                  }
                }, 2000);
                return;
              }
              
              setRematchRequest(data);
              setIsRematchRequester(true);
              setRematchWaiting(true);
              setShowRematchModal(true);
              soundManager.playSound('notification');
            } catch (err) {
              setRematchError('Failed to request rematch. Please try again.');
            }
          }}
          onMenu={() => {
            setShowGameOver(false);
            if (typeof onLeave === 'function') {
              onLeave();
            } else {
              window.location.href = window.location.origin;
            }
          }}
        />
      )}

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

      <RematchModal
        isOpen={showRematchModal}
        onClose={() => {
          setShowRematchModal(false);
          if (isRematchRequester && rematchRequest?.id && !rematchAccepted) {
            rematchService.cancelRematchRequest(rematchRequest.id, user.id);
          }
        }}
        onBackToMenu={() => {
          setShowRematchModal(false);
          setShowGameOver(false);
          if (typeof onLeave === 'function') onLeave();
        }}
        onAccept={async () => {
          if (!rematchRequest?.id) return;
          
          const { data, error } = await rematchService.acceptRematchRequest(rematchRequest.id, user.id);
          
          if (error) {
            setRematchError(error.message);
            return;
          }
          
          if (data?.game) {
            setRematchAccepted(true);
            setNewGameFromRematch(data.game);
            soundManager.playSound('notification');
            
            setTimeout(() => {
              setShowRematchModal(false);
              setShowGameOver(false);
              
              if (onNavigateToGame) {
                onNavigateToGame(data.game);
              } else {
                setRematchWaiting(false);
                setRematchRequest(null);
                setIsRematchRequester(false);
                setRematchDeclined(false);
                setRematchAccepted(false);
                setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
                setBoardPieces({});
                setUsedPieces([]);
                setSelectedPiece(null);
                setPendingMove(null);
                setRotation(0);
                setFlipped(false);
                setGame(null);
                setLoading(true);
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
            await rematchService.cancelRematchRequest(rematchRequest.id, user.id);
            setRematchWaiting(false);
            setShowRematchModal(false);
          } else {
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
