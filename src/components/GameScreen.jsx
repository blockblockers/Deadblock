// GameScreen.jsx - Main game screen with drag-and-drop support
// v7.7 FIXES: 
// - No board preview during drag (only floating piece shown)
// - Allow dropping with partial overlap (for rotation adjustment)
// - Improved mobile touch handling
import { useState, useEffect, useRef, useCallback } from 'react';
import { Flag, XCircle } from 'lucide-react';
import NeonTitle from './NeonTitle';
import NeonSubtitle from './NeonSubtitle';
import GameBoard from './GameBoard';
import PieceTray from './PieceTray';
import ControlButtons from './ControlButtons';
import DPad from './DPad';
import GameStatus from './GameStatus';
import GameOverModal from './GameOverModal';
import DragOverlay from './DragOverlay';
import AIDragAnimation from './AIDragAnimation';
import FloatingPiecesBackground from './FloatingPiecesBackground';
import { getPieceCoords, canPlacePiece, BOARD_SIZE } from '../utils/gameLogic';
import { soundManager } from '../utils/soundManager';
import { AI_DIFFICULTY } from '../utils/aiLogic';
import { PUZZLE_DIFFICULTY } from '../utils/puzzleGenerator';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

// Drag detection constants
const DRAG_THRESHOLD = 5; // Reduced for faster drag start
const SCROLL_ANGLE_THRESHOLD = 65; // Slightly increased to favor dragging

// Theme configurations for each difficulty
const difficultyThemes = {
  beginner: {
    gridColor: 'rgba(34,197,94,0.4)',
    glow1: 'bg-green-500/30',
    glow2: 'bg-emerald-400/20',
    panelBorder: 'border-green-500/40',
    panelShadow: 'shadow-[0_0_40px_rgba(34,197,94,0.3)]',
    label: 'BEGINNER',
    labelBg: 'from-green-600 via-emerald-500 to-green-600',
    labelGlow: 'shadow-[0_0_30px_rgba(34,197,94,0.8)]',
    labelBorder: 'border-green-400/50',
  },
  intermediate: {
    gridColor: 'rgba(251,191,36,0.4)',
    glow1: 'bg-amber-500/30',
    glow2: 'bg-orange-400/20',
    panelBorder: 'border-amber-500/40',
    panelShadow: 'shadow-[0_0_40px_rgba(251,191,36,0.3)]',
    label: 'INTERMEDIATE',
    labelBg: 'from-amber-600 via-orange-500 to-amber-600',
    labelGlow: 'shadow-[0_0_30px_rgba(251,191,36,0.8)]',
    labelBorder: 'border-amber-400/50',
  },
  expert: {
    gridColor: 'rgba(168,85,247,0.4)',
    glow1: 'bg-purple-500/30',
    glow2: 'bg-pink-400/20',
    panelBorder: 'border-purple-500/40',
    panelShadow: 'shadow-[0_0_40px_rgba(168,85,247,0.3)]',
    label: 'EXPERT',
    labelBg: 'from-purple-600 via-pink-500 to-purple-600',
    labelGlow: 'shadow-[0_0_30px_rgba(168,85,247,0.8)]',
    labelBorder: 'border-purple-400/50',
  },
  default: {
    gridColor: 'rgba(34,211,238,0.3)',
    glow1: 'bg-cyan-500/20',
    glow2: 'bg-pink-500/15',
    panelBorder: 'border-cyan-500/20',
    panelShadow: '',
    label: '',
    labelBg: '',
    labelGlow: '',
    labelBorder: '',
  },
};

const getTheme = (gameMode, aiDifficulty, puzzleDifficulty) => {
  if (gameMode === 'ai') {
    switch (aiDifficulty) {
      case AI_DIFFICULTY.RANDOM: return difficultyThemes.beginner;
      case AI_DIFFICULTY.AVERAGE: return difficultyThemes.intermediate;
      case AI_DIFFICULTY.PROFESSIONAL: return difficultyThemes.expert;
      default: return difficultyThemes.intermediate;
    }
  }
  if (gameMode === 'puzzle') {
    switch (puzzleDifficulty) {
      case PUZZLE_DIFFICULTY.EASY: return difficultyThemes.beginner;
      case PUZZLE_DIFFICULTY.MEDIUM: return difficultyThemes.intermediate;
      case PUZZLE_DIFFICULTY.HARD: return difficultyThemes.expert;
      default: return difficultyThemes.beginner;
    }
  }
  return difficultyThemes.default;
};

// Player indicator component
const PlayerBar = ({ currentPlayer, gameMode, theme, isAIThinking, aiDifficulty, puzzleDifficulty }) => {
  const isVsAI = gameMode === 'ai';
  const isPuzzle = gameMode === 'puzzle';
  const p1Label = (isVsAI || isPuzzle) ? 'YOU' : 'PLAYER 1';
  const p2Label = (isVsAI || isPuzzle) ? 'AI' : 'PLAYER 2';
  
  // Get difficulty label for AI or Puzzle mode
  const getDifficultyLabel = () => {
    if (isVsAI) {
      switch (aiDifficulty) {
        case AI_DIFFICULTY.RANDOM: return { text: 'BEGINNER', color: 'from-green-600 to-emerald-600', glow: 'rgba(34,197,94,0.6)' };
        case AI_DIFFICULTY.AVERAGE: return { text: 'INTERMEDIATE', color: 'from-amber-500 to-orange-600', glow: 'rgba(251,191,36,0.6)' };
        case AI_DIFFICULTY.PROFESSIONAL: return { text: 'EXPERT', color: 'from-purple-500 to-pink-600', glow: 'rgba(168,85,247,0.6)' };
        default: return { text: 'INTERMEDIATE', color: 'from-amber-500 to-orange-600', glow: 'rgba(251,191,36,0.6)' };
      }
    }
    if (isPuzzle) {
      switch (puzzleDifficulty) {
        case PUZZLE_DIFFICULTY.EASY: return { text: 'EASY', color: 'from-green-600 to-emerald-600', glow: 'rgba(34,197,94,0.6)' };
        case PUZZLE_DIFFICULTY.MEDIUM: return { text: 'MEDIUM', color: 'from-amber-500 to-orange-600', glow: 'rgba(251,191,36,0.6)' };
        case PUZZLE_DIFFICULTY.HARD: return { text: 'HARD', color: 'from-purple-500 to-pink-600', glow: 'rgba(168,85,247,0.6)' };
        default: return { text: 'PUZZLE', color: 'from-cyan-500 to-blue-600', glow: 'rgba(34,211,238,0.6)' };
      }
    }
    return null;
  };
  
  const difficultyInfo = getDifficultyLabel();
  
  return (
    <div className="flex items-center justify-center gap-2 mb-3 py-2">
      {/* Player 1 - YOU */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 ${
        currentPlayer === 1 
          ? `bg-cyan-500/20 border border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.4)]` 
          : 'bg-slate-800/50 border border-slate-700/50'
      }`}>
        <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
          currentPlayer === 1 ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] animate-pulse' : 'bg-slate-600'
        }`} />
        <span className={`text-xs font-bold tracking-wide ${currentPlayer === 1 ? 'text-cyan-300' : 'text-slate-500'}`}>
          {p1Label}
        </span>
      </div>
      
      {/* Difficulty Badge (for AI or Puzzle mode) or VS text */}
      {(isVsAI || isPuzzle) && difficultyInfo ? (
        <div 
          className={`px-3 py-1 rounded-full bg-gradient-to-r ${difficultyInfo.color} border border-white/20`}
          style={{ boxShadow: `0 0 15px ${difficultyInfo.glow}` }}
        >
          <span className="text-white text-[10px] font-black tracking-wider">{difficultyInfo.text}</span>
        </div>
      ) : (
        <span className="text-slate-600 font-bold text-sm">VS</span>
      )}
      
      {/* Player 2 - AI or PLAYER 2 */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 ${
        currentPlayer === 2 
          ? `bg-pink-500/20 border border-pink-400/50 shadow-[0_0_15px_rgba(236,72,153,0.4)]` 
          : 'bg-slate-800/50 border border-slate-700/50'
      }`}>
        <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
          currentPlayer === 2 ? 'bg-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.8)] animate-pulse' : 'bg-slate-600'
        }`} />
        <span className={`text-xs font-bold tracking-wide ${currentPlayer === 2 ? 'text-pink-300' : 'text-slate-500'}`}>
          {p2Label}
          {isAIThinking && currentPlayer === 2 && (
            <span className="ml-1 text-[10px] text-pink-400/70">...</span>
          )}
        </span>
      </div>
    </div>
  );
};

const GameScreen = ({
  board,
  boardPieces,
  usedPieces,
  currentPlayer,
  selectedPiece,
  rotation,
  flipped,
  pendingMove,
  gameOver,
  winner,
  gameMode,
  aiDifficulty,
  puzzleDifficulty,
  isAIThinking,
  isGeneratingPuzzle,
  aiAnimatingMove,
  playerAnimatingMove,
  moveCount = 0,  // Number of moves made
  onCellClick,
  onSelectPiece,
  onRotate,
  onFlip,
  onMovePiece,
  onConfirm,
  onCancel,
  onReset,
  onMenu,
  onRetryPuzzle,
  onDifficultySelect,
  onQuitGame,  // Handler for quit/forfeit
  // Add setter for pending move (needed for drag-and-drop)
  setPendingMove,
}) => {
  const { needsScroll, viewportHeight } = useResponsiveLayout(850);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [showQuitConfirmModal, setShowQuitConfirmModal] = useState(false);
  const [quitIsForfeit, setQuitIsForfeit] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  
  // Drag-and-drop state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isValidDrop, setIsValidDrop] = useState(false);
  // v7.7: Track preview cell separately without updating board preview
  const [dragPreviewCell, setDragPreviewCell] = useState(null);
  // v7.7: Track if at least one cell can be placed (for partial overlap drops)
  const [hasValidCell, setHasValidCell] = useState(false);
  const boardRef = useRef(null);
  const trayRef = useRef(null); // Ref for PieceTray (used by AI drag animation)
  const boardBoundsRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const hasDragStartedRef = useRef(false);

  const theme = getTheme(gameMode, aiDifficulty, puzzleDifficulty);
  const isPuzzle = gameMode === 'puzzle';
  const playerWon = winner === 1;

  // Calculate if confirm should be enabled
  const canConfirm = pendingMove && (() => {
    const coords = getPieceCoords(pendingMove.piece, rotation, flipped);
    return canPlacePiece(board, pendingMove.row, pendingMove.col, coords);
  })();

  // Show error when placement is invalid
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

  // Show game over modal when game ends
  useEffect(() => {
    if (gameOver && winner !== null) {
      const delay = setTimeout(() => {
        setShowGameOverModal(true);
      }, 500);
      return () => clearTimeout(delay);
    }
  }, [gameOver, winner]);

  const handleCloseModal = () => {
    setShowGameOverModal(false);
  };

  // ==========================================
  // Drag-and-drop handlers
  // ==========================================
  
  // Calculate which board cell the drag position is over
  // v7.7 FIX: Account for the visual offset of the floating piece (40px up from touch)
  const calculateBoardCell = useCallback((clientX, clientY) => {
    if (!boardBoundsRef.current) return null;
    
    const { left, top, width, height } = boardBoundsRef.current;
    const cellWidth = width / BOARD_SIZE;
    const cellHeight = height / BOARD_SIZE;
    
    // The floating piece is shown 40px above the touch point
    // So we calculate based on where the piece CENTER actually appears
    const visualY = clientY - 40;
    
    const relX = clientX - left;
    const relY = visualY - top;
    
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
    if (gameOver || usedPieces.includes(piece)) return;
    if ((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2) return;
    
    const offsetX = clientX - (elementRect.left + elementRect.width / 2);
    const offsetY = clientY - (elementRect.top + elementRect.height / 2);
    
    setDraggedPiece(piece);
    setDragPosition({ x: clientX, y: clientY });
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
    hasDragStartedRef.current = true;
    
    // Also select the piece
    onSelectPiece?.(piece);
    soundManager.playPieceSelect();
    
    // Prevent scroll while dragging
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }, [gameOver, usedPieces, gameMode, currentPlayer, onSelectPiece]);

  // Handle starting drag from a pending piece on the board
  const handleBoardDragStart = useCallback((piece, clientX, clientY, elementRect) => {
    if (gameOver) return;
    if ((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2) return;
    
    // Clear the pending move first (piece is being "picked up")
    if (setPendingMove) {
      setPendingMove(null);
    }
    
    // Start the drag
    const offsetX = clientX - (elementRect.left + elementRect.width / 2);
    const offsetY = clientY - (elementRect.top + elementRect.height / 2);
    
    setDraggedPiece(piece);
    setDragPosition({ x: clientX, y: clientY });
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
    hasDragStartedRef.current = true;
    
    // Piece is already selected, just play sound
    soundManager.playPieceSelect();
    
    // Prevent scroll while dragging
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }, [gameOver, gameMode, currentPlayer, setPendingMove]);

  // Update drag position - v7.7: NO board preview during drag, allow partial overlap drops
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
      // v7.7: Track preview cell WITHOUT updating board preview
      setDragPreviewCell(cell);
      
      // Check validity
      const coords = getPieceCoords(draggedPiece, rotation, flipped);
      const perfectValid = canPlacePiece(board, cell.row, cell.col, coords);
      setIsValidDrop(perfectValid);
      
      // v7.7: Check if at least one cell can be placed (for rotation adjustment)
      // This allows dropping even with partial overlap
      let validCellCount = 0;
      coords.forEach(([dx, dy]) => {
        const cellRow = cell.row + dy;
        const cellCol = cell.col + dx;
        if (cellRow >= 0 && cellRow < BOARD_SIZE && cellCol >= 0 && cellCol < BOARD_SIZE) {
          const existing = board[cellRow]?.[cellCol];
          if (existing === null || existing === 0 || existing === undefined) {
            validCellCount++;
          }
        }
      });
      setHasValidCell(validCellCount > 0);
    } else {
      setIsValidDrop(false);
      setHasValidCell(false);
      setDragPreviewCell(null);
    }
  }, [isDragging, draggedPiece, rotation, flipped, board, calculateBoardCell]);

  // End drag - v7.7: Set pendingMove ONLY after drop, allow partial overlap drops
  const endDrag = useCallback(() => {
    if (!isDragging) return;
    
    // v7.7: Set pending move AFTER dropping (not during drag)
    // Allow drop if at least one cell is valid (for rotation adjustment)
    if (dragPreviewCell && hasValidCell && draggedPiece && setPendingMove) {
      setPendingMove({ piece: draggedPiece, row: dragPreviewCell.row, col: dragPreviewCell.col });
    }
    
    setIsDragging(false);
    setDraggedPiece(null);
    setDragPosition({ x: 0, y: 0 });
    setDragOffset({ x: 0, y: 0 });
    setIsValidDrop(false);
    setHasValidCell(false);
    setDragPreviewCell(null);
    hasDragStartedRef.current = false;
    
    // Re-enable scroll
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  }, [isDragging, dragPreviewCell, hasValidCell, draggedPiece, setPendingMove]);

  // Create drag handlers for PieceTray
  const createDragHandlers = useCallback((piece) => {
    if (gameOver || usedPieces.includes(piece)) return {};
    if ((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2) return {};

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
  }, [gameOver, usedPieces, gameMode, currentPlayer, isScrollGesture, startDrag, updateDrag, endDrag]);

  // Global mouse move/up handlers for desktop drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      updateDrag(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      endDrag();
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        endDrag();
        onCancel?.();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDragging, updateDrag, endDrag, onCancel]);

  // Global touch handlers for drag (needed for board drag on mobile)
  useEffect(() => {
    if (!isDragging) return;

    const handleTouchMove = (e) => {
      if (e.touches && e.touches[0]) {
        updateDrag(e.touches[0].clientX, e.touches[0].clientY);
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {
      endDrag();
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, updateDrag, endDrag]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, []);

  // Handle cell click (ignore during drag)
  const handleCellClick = useCallback((row, col) => {
    if (isDragging) return;
    onCellClick?.(row, col);
  }, [isDragging, onCellClick]);

  return (
    <div 
      className={needsScroll ? 'min-h-screen bg-slate-950' : 'h-screen bg-slate-950 overflow-hidden'}
      style={needsScroll ? { 
        overflowY: 'auto', 
        overflowX: 'hidden', 
        WebkitOverflowScrolling: 'touch',
        touchAction: isDragging ? 'none' : 'pan-y pinch-zoom',
        overscrollBehavior: 'contain',
      } : {}}
    >
      {/* Dynamic grid background */}
      <div className="fixed inset-0 opacity-30 pointer-events-none" style={{
        backgroundImage: `linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`,
        backgroundSize: '30px 30px'
      }} />
      
      {/* Ambient glow effects */}
      <div className={`fixed top-0 right-0 w-96 h-96 ${theme.glow1} rounded-full blur-3xl pointer-events-none`} />
      <div className={`fixed bottom-0 left-0 w-80 h-80 ${theme.glow2} rounded-full blur-3xl pointer-events-none`} />
      
      {/* Floating pieces background animation */}
      <FloatingPiecesBackground />

      {/* Main content */}
      <div className={`relative ${needsScroll ? 'min-h-screen' : 'h-full'} flex flex-col`}>
        <div className={`flex-1 flex flex-col items-center justify-start px-2 sm:px-4 ${needsScroll ? 'pt-4 pb-2' : 'pt-2'}`}>
          
          {/* Title - CONSISTENT sizing across all game modes */}
          <div className="text-center mb-2">
            <NeonTitle size="medium" />
            {gameMode === 'ai' && (
              <NeonSubtitle text="VS AI" size="small" className="mt-1" />
            )}
            {gameMode === 'puzzle' && (
              <NeonSubtitle text="PUZZLE MODE" size="small" className="mt-1" />
            )}
            {gameMode === '2player' && (
              <NeonSubtitle text="2 PLAYER" size="small" className="mt-1" />
            )}
          </div>

          {/* Game Area */}
          <div className={`w-full max-w-md ${needsScroll ? '' : 'flex-shrink-0'}`}>
            
            {/* Player Bar - with difficulty shown between YOU and AI */}
            <PlayerBar 
              currentPlayer={currentPlayer} 
              gameMode={gameMode} 
              theme={theme}
              isAIThinking={isAIThinking}
              aiDifficulty={aiDifficulty}
              puzzleDifficulty={puzzleDifficulty}
            />
            
            <GameStatus isAIThinking={isAIThinking} gameOver={gameOver} winner={winner} gameMode={gameMode} aiDifficulty={aiDifficulty} />

            {/* Game Board with ref for drag positioning */}
            <div className="flex justify-center pb-1">
              <GameBoard
                ref={boardRef}
                board={board}
                boardPieces={boardPieces}
                pendingMove={pendingMove}
                rotation={rotation}
                flipped={flipped}
                gameOver={gameOver}
                gameMode={gameMode}
                currentPlayer={currentPlayer}
                onCellClick={handleCellClick}
                onPendingPieceDragStart={handleBoardDragStart}
                aiAnimatingMove={aiAnimatingMove}
                playerAnimatingMove={playerAnimatingMove}
                selectedPiece={selectedPiece}
                // v7.7: Pass drag preview info for highlighting during drag
                isDragging={isDragging}
                dragPreviewCell={dragPreviewCell}
                draggedPiece={draggedPiece}
                dragRotation={rotation}
                dragFlipped={flipped}
              />
            </div>

            {/* D-Pad and Error Message Layout */}
            {pendingMove && !isGeneratingPuzzle && !isDragging && (
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
                <DPad onMove={onMovePiece} />
                
                {/* Spacer for symmetry */}
                <div className="flex-shrink-0 w-24" />
              </div>
            )}

            <ControlButtons
              selectedPiece={selectedPiece}
              pendingMove={pendingMove}
              canConfirm={canConfirm}
              gameOver={gameOver}
              gameMode={gameMode}
              currentPlayer={currentPlayer}
              isGeneratingPuzzle={isGeneratingPuzzle}
              moveCount={moveCount}
              onRotate={onRotate}
              onFlip={onFlip}
              onConfirm={onConfirm}
              onCancel={onCancel}
              onReset={onReset}
              onRetryPuzzle={onRetryPuzzle}
              onMenu={onMenu}
              onQuitGame={onQuitGame ? (isForfeit) => {
                setQuitIsForfeit(isForfeit);
                setShowQuitConfirmModal(true);
              } : null}
            />
          </div>

          {/* Piece Tray with drag handlers */}
          <div ref={trayRef} className={needsScroll ? '' : 'flex-1 min-h-0 overflow-auto'}>
            <PieceTray
              usedPieces={usedPieces}
              selectedPiece={selectedPiece}
              pendingMove={pendingMove}
              gameOver={gameOver}
              gameMode={gameMode}
              currentPlayer={currentPlayer}
              isMobile={isMobile}
              isGeneratingPuzzle={isGeneratingPuzzle}
              onSelectPiece={onSelectPiece}
              createDragHandlers={createDragHandlers}
              isDragging={isDragging}
              draggedPiece={draggedPiece}
            />
          </div>
          
          {needsScroll && <div className="h-8" />}
        </div>
      </div>

      {/* Drag Overlay - floating piece following cursor/finger */}
      {/* v7.7: No board preview during drag, only shows floating piece */}
      <DragOverlay
        isDragging={isDragging}
        piece={draggedPiece}
        position={dragPosition}
        offset={dragOffset}
        rotation={rotation}
        flipped={flipped}
        isValid={isValidDrop}
        hasValidCell={hasValidCell}
      />

      {/* AI Drag Animation - shows piece flying from tray to board during AI moves */}
      {aiAnimatingMove?.phase === 'dragging' && (
        <AIDragAnimation
          piece={aiAnimatingMove.piece}
          targetRow={aiAnimatingMove.row}
          targetCol={aiAnimatingMove.col}
          rotation={aiAnimatingMove.rotation}
          flipped={aiAnimatingMove.flipped}
          boardRef={boardRef}
          trayRef={trayRef}
          duration={800}
        />
      )}

      {/* Game Over Modal */}
      {showGameOverModal && (
        <GameOverModal
          isWin={playerWon}
          isPuzzle={isPuzzle}
          gameMode={gameMode}
          winner={winner}
          onClose={handleCloseModal}
          onRetry={isPuzzle ? onRetryPuzzle : onReset}
          onNewGame={onReset}
          onMenu={onMenu}
          onDifficultySelect={onDifficultySelect}
        />
      )}

      {/* Quit/Forfeit Confirmation Modal */}
      {showQuitConfirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl p-6 max-w-sm w-full border border-slate-600/50 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                quitIsForfeit 
                  ? 'bg-red-500/20 border-2 border-red-500/50' 
                  : 'bg-amber-500/20 border-2 border-amber-500/50'
              }`}>
                {quitIsForfeit ? (
                  <Flag size={32} className="text-red-400" />
                ) : (
                  <XCircle size={32} className="text-amber-400" />
                )}
              </div>
            </div>

            {/* Title */}
            <h2 className={`text-xl font-bold text-center mb-2 ${
              quitIsForfeit ? 'text-red-400' : 'text-amber-400'
            }`}>
              {quitIsForfeit ? 'Forfeit Game?' : 'Cancel Game?'}
            </h2>

            {/* Description */}
            <p className="text-slate-300 text-center text-sm mb-6">
              {quitIsForfeit 
                ? 'This will count as a loss. Are you sure you want to forfeit?'
                : 'No moves have been made yet. This game will not affect your stats.'
              }
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowQuitConfirmModal(false)}
                className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all border border-slate-500/50"
              >
                Keep Playing
              </button>
              <button
                onClick={() => {
                  setShowQuitConfirmModal(false);
                  if (onQuitGame) onQuitGame(quitIsForfeit);
                }}
                className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all border ${
                  quitIsForfeit
                    ? 'bg-red-600 hover:bg-red-500 text-white border-red-400/50'
                    : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400/50'
                }`}
              >
                {quitIsForfeit ? 'Forfeit' : 'Quit'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Error message animation styles */}
      <style>{`
        .error-message-box {
          animation: error-shake 0.5s ease-in-out, error-pulse 1.5s ease-in-out infinite;
        }
        @keyframes error-shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
        @keyframes error-pulse {
          0%, 100% { box-shadow: 0 0 15px rgba(239,68,68,0.4); }
          50% { box-shadow: 0 0 25px rgba(239,68,68,0.6); }
        }
      `}</style>
    </div>
  );
};

export default GameScreen;
