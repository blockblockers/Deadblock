// GameScreen.jsx - Main game screen with drag-and-drop support
// UPDATED: Added drag-and-drop for pieces from tray to board
import { useState, useEffect, useRef, useCallback } from 'react';
import { Flag, XCircle, Move } from 'lucide-react';
import NeonTitle from './NeonTitle';
import NeonSubtitle from './NeonSubtitle';
import GameBoard from './GameBoard';
import PieceTray from './PieceTray';
import ControlButtons from './ControlButtons';
import DPad from './DPad';
import GameStatus from './GameStatus';
import GameOverModal from './GameOverModal';
import DragOverlay from './DragOverlay';
import { getPieceCoords, canPlacePiece, BOARD_SIZE } from '../utils/gameLogic';
import { soundManager } from '../utils/soundManager';
import { AI_DIFFICULTY } from '../utils/aiLogic';
import { PUZZLE_DIFFICULTY } from '../utils/puzzleGenerator';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { streakTracker } from '../utils/streakTracker';

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
  hard: {
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
      case PUZZLE_DIFFICULTY.HARD: return difficultyThemes.hard;
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
        case PUZZLE_DIFFICULTY.EASY: return { text: 'BEGINNER', color: 'from-green-600 to-emerald-600', glow: 'rgba(34,197,94,0.6)' };
        case PUZZLE_DIFFICULTY.MEDIUM: return { text: 'INTERMEDIATE', color: 'from-amber-500 to-orange-600', glow: 'rgba(251,191,36,0.6)' };
        case PUZZLE_DIFFICULTY.HARD: return { text: 'EXPERT', color: 'from-purple-500 to-pink-600', glow: 'rgba(168,85,247,0.6)' };
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
      
      {/* Difficulty Badge - Neon Glow Square (for AI or Puzzle mode) or VS text */}
      {(isVsAI || isPuzzle) && difficultyInfo ? (
        <div 
          className={`px-4 py-1.5 rounded-lg bg-gradient-to-r ${difficultyInfo.color} border border-white/30`}
          style={{ 
            boxShadow: `0 0 20px ${difficultyInfo.glow}, inset 0 1px 0 rgba(255,255,255,0.2)` 
          }}
        >
          <span className="text-white text-xs font-black tracking-wider drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
            {difficultyInfo.text}
          </span>
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
  const [dragPreviewCell, setDragPreviewCell] = useState(null); // v7.22: Live preview cell during drag
  const [pieceCellOffset, setPieceCellOffset] = useState({ row: 0, col: 0 }); // Offset from anchor to touched cell
  const boardRef = useRef(null);
  const boardBoundsRef = useRef(null);
  const hasDragStartedRef = useRef(false);
  // Refs for synchronous access in touch handlers
  const isDraggingRef = useRef(false);
  const draggedPieceRef = useRef(null);
  const pieceCellOffsetRef = useRef({ row: 0, col: 0 });

  const theme = getTheme(gameMode, aiDifficulty, puzzleDifficulty);
  const isPuzzle = gameMode === 'puzzle';
  const playerWon = winner === 1;

  // Refs for drag function access in global handlers
  const endDragRef = useRef(null);
  const dragCellRef = useRef(null);

  // Calculate if confirm should be enabled
  const canConfirm = pendingMove && (() => {
    const coords = getPieceCoords(pendingMove.piece, rotation, flipped);
    const isValid = canPlacePiece(board, pendingMove.row, pendingMove.col, coords);
    return isValid;
  })();

  // Helper to check if pending piece has cells off the grid
  const isPieceOffGrid = pendingMove ? (() => {
    const coords = getPieceCoords(pendingMove.piece, rotation, flipped);
    return coords.some(([dx, dy]) => {
      const cellRow = pendingMove.row + dy;
      const cellCol = pendingMove.col + dx;
      return cellRow < 0 || cellRow >= BOARD_SIZE || cellCol < 0 || cellCol >= BOARD_SIZE;
    });
  })() : false;

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
      // v7.15.2: Record daily play for streak tracking (VS AI game completed)
      if (gameMode === 'ai') {
        streakTracker.recordPlay();
      }
      
      const delay = setTimeout(() => {
        setShowGameOverModal(true);
      }, 500);
      return () => clearTimeout(delay);
    }
  }, [gameOver, winner, gameMode]);

  const handleCloseModal = () => {
    setShowGameOverModal(false);
  };

  // ==========================================
  // Drag-and-drop handlers
  // ==========================================
  
  // Calculate which board cell the drag position is over
  // Allow positions outside the board for pieces that extend beyond their anchor
  // Account for fingerOffset to match DragOverlay visual position
  const calculateBoardCell = useCallback((clientX, clientY) => {
    if (!boardBoundsRef.current) return null;
    
    const { left, top, width, height } = boardBoundsRef.current;
    const cellWidth = width / BOARD_SIZE;
    const cellHeight = height / BOARD_SIZE;
    
    // Match DragOverlay fingerOffset - piece is shown above finger
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const fingerOffset = isMobile ? 40 : 20;
    
    // Adjust Y position to match where piece visually appears
    const relX = clientX - left;
    const relY = (clientY - fingerOffset) - top;
    
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

  // Attach global touch handlers synchronously (critical for mobile drag from board)
  const attachGlobalTouchHandlers = useCallback(() => {
    const handleGlobalTouchMove = (e) => {
      if (!isDraggingRef.current) return;
      
      const touch = e.touches?.[0];
      if (!touch) return;
      
      // Update drag position using state setter directly
      setDragPosition({ x: touch.clientX, y: touch.clientY });
      
      // Update board bounds
      if (boardRef.current) {
        boardBoundsRef.current = boardRef.current.getBoundingClientRect();
      }
      
      // Calculate board cell and preview
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
          
          // Store in ref for endDrag to access
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
    
    const handleGlobalTouchEnd = () => {
      if (!isDraggingRef.current) return;
      
      // Call endDrag via ref to properly set pendingMove
      endDragRef.current?.();
      
      // Clean up listeners
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
      window.removeEventListener('touchcancel', handleGlobalTouchEnd);
    };
    
    window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    window.addEventListener('touchend', handleGlobalTouchEnd);
    window.addEventListener('touchcancel', handleGlobalTouchEnd);
  }, [rotation, flipped, board]);

  // Start drag from piece tray
  const startDrag = useCallback((piece, clientX, clientY, elementRect) => {
    if (hasDragStartedRef.current) return;
    if (gameOver || usedPieces.includes(piece)) return;
    if ((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2) return;
    
    // Set refs synchronously FIRST
    hasDragStartedRef.current = true;
    isDraggingRef.current = true;
    draggedPieceRef.current = piece;
    pieceCellOffsetRef.current = { row: 0, col: 0 };
    
    // Attach global touch handlers IMMEDIATELY (synchronous)
    attachGlobalTouchHandlers();
    
    // Update board bounds
    if (boardRef.current) {
      boardBoundsRef.current = boardRef.current.getBoundingClientRect();
    }
    
    const offsetX = clientX - (elementRect.left + elementRect.width / 2);
    const offsetY = clientY - (elementRect.top + elementRect.height / 2);
    
    // Update React state (async)
    setDraggedPiece(piece);
    setDragPosition({ x: clientX, y: clientY });
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
    setPieceCellOffset({ row: 0, col: 0 });
    
    // Also select the piece
    onSelectPiece?.(piece);
    soundManager.playPieceSelect();
    
    // Prevent scroll while dragging
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }, [gameOver, usedPieces, gameMode, currentPlayer, onSelectPiece, attachGlobalTouchHandlers]);

  // Handle starting drag from a pending piece on the board
  const handleBoardDragStart = useCallback((piece, clientX, clientY, elementRect) => {
    // Guard against duplicate calls
    if (hasDragStartedRef.current) return;
    if (gameOver) return;
    if ((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2) return;
    if (!pendingMove || pendingMove.piece !== piece) return;
    
    // Set refs synchronously FIRST
    hasDragStartedRef.current = true;
    isDraggingRef.current = true;
    draggedPieceRef.current = piece;
    
    // Attach global touch handlers IMMEDIATELY (synchronous)
    attachGlobalTouchHandlers();
    
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
    
    // Update React state (async)
    setDraggedPiece(piece);
    setDragPosition({ x: clientX, y: clientY });
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
    
    // Piece is already selected, just play sound
    soundManager.playPieceSelect();
    
    // Prevent scroll while dragging
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }, [gameOver, gameMode, currentPlayer, pendingMove, attachGlobalTouchHandlers]);

  // Update drag position
  const updateDrag = useCallback((clientX, clientY) => {
    if (!isDragging || !draggedPiece) return;
    
    setDragPosition({ x: clientX, y: clientY });
    
    // Update board bounds
    if (boardRef.current) {
      boardBoundsRef.current = boardRef.current.getBoundingClientRect();
    }
    
    // Calculate which cell the finger is over
    const cell = calculateBoardCell(clientX, clientY);
    
    if (cell) {
      // Get piece coordinates to calculate center offset
      const coords = getPieceCoords(draggedPiece, rotation, flipped);
      
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
      
      // Store in ref for endDrag to access (sync) and state for render
      dragCellRef.current = { row: adjustedRow, col: adjustedCol };
      setDragPreviewCell({ row: adjustedRow, col: adjustedCol });
      
      // Check if valid drop position
      const valid = canPlacePiece(board, adjustedRow, adjustedCol, coords);
      setIsValidDrop(valid);
    } else {
      dragCellRef.current = null;
      setDragPreviewCell(null);
      setIsValidDrop(false);
    }
  }, [isDragging, draggedPiece, rotation, flipped, board, calculateBoardCell]);

  // End drag
  const endDrag = useCallback(() => {
    // Check if we were actually dragging
    const wasDragging = isDragging || isDraggingRef.current || hasDragStartedRef.current;
    if (!wasDragging) return;
    
    // Set pendingMove from dragCellRef (sync) or dragPreviewCell (state)
    // dragCellRef is more reliable as it's updated synchronously in global handlers
    const piece = draggedPiece || draggedPieceRef.current;
    const cell = dragCellRef.current || dragPreviewCell;
    
    if (cell && piece && setPendingMove) {
      setPendingMove({ piece, row: cell.row, col: cell.col });
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
  }, [isDragging, dragPreviewCell, draggedPiece, setPendingMove]);

  // Keep endDragRef current for global touch handlers
  endDragRef.current = endDrag;

  // Create drag handlers for PieceTray
  // Since pieces have touch-action: none, we start drag immediately on touchstart
  const createDragHandlers = useCallback((piece) => {
    if (gameOver || usedPieces.includes(piece)) return {};
    if ((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2) return {};

    let elementRect = null;

    const handleTouchStart = (e) => {
      if (hasDragStartedRef.current) return; // Guard against double-start
      
      const touch = e.touches[0];
      elementRect = e.currentTarget.getBoundingClientRect();
      
      // Update board bounds for accurate cell calculation
      if (boardRef.current) {
        boardBoundsRef.current = boardRef.current.getBoundingClientRect();
      }
      
      // Start drag immediately - touch-action: none prevents scrolling
      startDrag(piece, touch.clientX, touch.clientY, elementRect);
    };

    const handleTouchMove = (e) => {
      if (hasDragStartedRef.current) {
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

    // Mouse handlers for desktop
    const handleMouseDown = (e) => {
      if (e.button !== 0) return;
      if (hasDragStartedRef.current) return;
      
      elementRect = e.currentTarget.getBoundingClientRect();
      
      if (boardRef.current) {
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
  }, [gameOver, usedPieces, gameMode, currentPlayer, startDrag, updateDrag, endDrag]);

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
      // FIX: Changed from bg-slate-950 to bg-transparent to show GlobalBackground
      className={needsScroll ? 'min-h-screen bg-transparent' : 'h-screen bg-transparent overflow-hidden'}
      style={needsScroll ? { 
        overflowY: 'auto', 
        overflowX: 'hidden', 
        WebkitOverflowScrolling: 'touch',
        touchAction: isDragging ? 'none' : 'pan-y',
      } : {}}
    >
      {/* Ambient glow effects */}
      <div className={`fixed top-0 right-0 w-96 h-96 ${theme.glow1} rounded-full blur-3xl pointer-events-none`} />
      <div className={`fixed bottom-0 left-0 w-80 h-80 ${theme.glow2} rounded-full blur-3xl pointer-events-none`} />

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
                isDragging={isDragging}
                dragPreviewCell={dragPreviewCell}
                draggedPiece={draggedPiece}
                dragRotation={rotation}
                dragFlipped={flipped}
              />
            </div>

            {/* Off-grid indicator - shows when piece extends beyond board */}
            {isPieceOffGrid && pendingMove && !isGeneratingPuzzle && !isDragging && (
              <div className="flex justify-center mb-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-900/60 border border-amber-500/50 rounded-lg">
                  <Move size={14} className="text-amber-400" />
                  <span className="text-amber-300 text-xs font-bold">Use D-Pad to reposition</span>
                </div>
              </div>
            )}

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
          <div className={needsScroll ? '' : 'flex-1 min-h-0 overflow-auto'}>
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
      <DragOverlay
        isDragging={isDragging}
        piece={draggedPiece}
        position={dragPosition}
        offset={dragOffset}
        rotation={rotation}
        flipped={flipped}
        isValid={isValidDrop}
      />

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
