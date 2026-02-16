// CreatorPuzzleGame.jsx - Play hand-crafted creator puzzles
// v1.0: Initial release - Board display, piece placement, solution validation, completion tracking
import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { ArrowLeft, RotateCcw, Move, FlipHorizontal, Check, X, Trophy, Sparkles, Lightbulb, RefreshCw } from 'lucide-react';
import GameBoard from './GameBoard';
import PieceTray from './PieceTray';
import DPad from './DPad';
import DragOverlay from './DragOverlay';
import { pieces } from '../utils/pieces';
import { getPieceCoords, canPlacePiece, canAnyPieceBePlaced, BOARD_SIZE } from '../utils/gameLogic';
import { soundManager } from '../utils/soundManager';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { useAuth } from '../contexts/AuthContext';
import { creatorPuzzleService } from '../services/creatorPuzzleService';

// ============================================================================
// CONSTANTS
// ============================================================================
const ANIMATION_CLEAR_DELAY_MS = 500;
const WRONG_MOVE_DISPLAY_MS = 1500;
const SUCCESS_DELAY_MS = 300;

// Game states
const GAME_STATES = {
  LOADING: 'loading',
  PLAYING: 'playing',
  SUCCESS: 'success',
  FAILED: 'failed',
};

// Theme - Warm amber/gold for creator puzzles
const theme = {
  gridColor: 'rgba(251, 191, 36, 0.3)',
  glow1: 'bg-amber-500/30',
  glow2: 'bg-orange-500/25',
  panelBorder: 'border-amber-500/40',
  panelShadow: 'shadow-[0_0_40px_rgba(251,191,36,0.3)]',
};

// D-pad direction deltas
const DIRECTION_DELTAS = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Create empty 8x8 board
const createEmptyBoard = () => Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
const createEmptyBoardPieces = () => Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));

// Parse puzzle board data into game state
const parsePuzzleBoard = (puzzleBoard, puzzleBoardPieces) => {
  const board = createEmptyBoard();
  const boardPieces = createEmptyBoardPieces();
  
  // Parse board array
  if (Array.isArray(puzzleBoard)) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (puzzleBoard[r]?.[c] !== null && puzzleBoard[r]?.[c] !== undefined) {
          board[r][c] = puzzleBoard[r][c];
        }
      }
    }
  }
  
  // Parse board pieces mapping
  if (puzzleBoardPieces && typeof puzzleBoardPieces === 'object') {
    for (const [key, pieceName] of Object.entries(puzzleBoardPieces)) {
      const [row, col] = key.split(',').map(Number);
      if (!isNaN(row) && !isNaN(col) && row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
        boardPieces[row][col] = pieceName;
      }
    }
  }
  
  return { board, boardPieces };
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Puzzle header with number and name
const PuzzleHeader = memo(({ puzzleNumber, puzzleName, difficulty, onBack }) => {
  const difficultyColors = {
    easy: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50' },
    medium: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/50' },
    hard: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/50' },
    expert: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50' },
  };
  
  const colors = difficultyColors[difficulty] || difficultyColors.medium;
  
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
      >
        <ArrowLeft size={20} />
        <span className="text-sm font-medium">Back</span>
      </button>
      
      <div className="flex items-center gap-3">
        <div className="text-center">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-amber-400" />
            <span className="text-white font-bold">#{puzzleNumber}</span>
          </div>
          {puzzleName && (
            <p className="text-slate-400 text-xs">{puzzleName}</p>
          )}
        </div>
        
        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${colors.bg} ${colors.text} border ${colors.border}`}>
          {difficulty || 'Medium'}
        </span>
      </div>
      
      {/* Spacer for centering */}
      <div className="w-20" />
    </div>
  );
});

PuzzleHeader.displayName = 'PuzzleHeader';

// Wrong move feedback overlay
const WrongMoveFeedback = memo(({ visible }) => {
  if (!visible) return null;
  
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-red-900/30 rounded-xl z-20 pointer-events-none animate-pulse">
      <div className="bg-red-500/90 px-4 py-2 rounded-full flex items-center gap-2">
        <X size={20} className="text-white" />
        <span className="text-white font-bold text-sm">Wrong move! Try again.</span>
      </div>
    </div>
  );
});

WrongMoveFeedback.displayName = 'WrongMoveFeedback';

// Success overlay
const SuccessOverlay = memo(({ puzzleNumber, onContinue, onBack }) => (
  <div 
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/85"
    style={{ backdropFilter: 'blur(4px)' }}
  >
    <div className="bg-gradient-to-br from-slate-900 via-amber-950/30 to-slate-900 rounded-2xl p-6 max-w-sm w-full mx-4 border-2 border-amber-500/50 shadow-[0_0_60px_rgba(251,191,36,0.4)]">
      <div className="text-center">
        {/* Trophy icon */}
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/50">
          <Trophy size={40} className="text-white" />
        </div>
        
        {/* Title */}
        <h2 className="text-3xl font-black text-amber-400 mb-2" style={{ textShadow: '0 0 20px rgba(251,191,36,0.5)' }}>
          SOLVED!
        </h2>
        
        <p className="text-slate-400 mb-6">
          Puzzle #{puzzleNumber} completed!
        </p>
        
        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={onContinue}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl hover:from-amber-400 hover:to-orange-500 transition-all shadow-lg shadow-amber-500/30 active:scale-[0.98]"
          >
            NEXT PUZZLE
          </button>
          
          <button
            onClick={onBack}
            className="w-full py-3 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-all border border-slate-600"
          >
            Back to Puzzles
          </button>
        </div>
      </div>
    </div>
  </div>
));

SuccessOverlay.displayName = 'SuccessOverlay';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const CreatorPuzzleGame = ({ puzzle, onBack, onNextPuzzle }) => {
  const { profile } = useAuth();
  const { needsScroll } = useResponsiveLayout(700);
  
  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------
  
  // Game flow
  const [gameState, setGameState] = useState(GAME_STATES.LOADING);
  const [attempts, setAttempts] = useState(1);
  const [startTime] = useState(Date.now());
  
  // Board state
  const [board, setBoard] = useState(createEmptyBoard);
  const [boardPieces, setBoardPieces] = useState(createEmptyBoardPieces);
  const [initialBoard, setInitialBoard] = useState(null);
  const [initialBoardPieces, setInitialBoardPieces] = useState(null);
  
  // Piece state
  const [availablePieces, setAvailablePieces] = useState([]);
  const [usedPieces, setUsedPieces] = useState([]);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [pendingMove, setPendingMove] = useState(null);
  
  // Animation state
  const [playerAnimatingMove, setPlayerAnimatingMove] = useState(null);
  const [aiAnimatingMove, setAiAnimatingMove] = useState(null);
  const [showWrongMove, setShowWrongMove] = useState(false);
  const [moveIndex, setMoveIndex] = useState(0); // Track which move we're on in the solution
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isValidDrop, setIsValidDrop] = useState(false);
  const [dragPreviewCell, setDragPreviewCell] = useState(null);
  const [pieceCellOffset, setPieceCellOffset] = useState({ row: 0, col: 0 });
  
  // -------------------------------------------------------------------------
  // REFS
  // -------------------------------------------------------------------------
  const boardRef = useRef(null);
  const boardBoundsRef = useRef(null);
  const mountedRef = useRef(true);
  const pendingTimeoutsRef = useRef(new Set());
  const isDraggingRef = useRef(false);
  const draggedPieceRef = useRef(null);
  const pieceCellOffsetRef = useRef({ row: 0, col: 0 });
  const hasDragStartedRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  
  // -------------------------------------------------------------------------
  // DERIVED STATE
  // -------------------------------------------------------------------------
  const currentPlayer = puzzle?.current_player || 1;
  
  const canConfirm = useMemo(() => {
    if (!pendingMove) return false;
    return canPlacePiece(board, pendingMove.row, pendingMove.col, pendingMove.coords);
  }, [pendingMove, board]);
  
  const isPieceOffGrid = useMemo(() => {
    if (!pendingMove || !pendingMove.coords) return false;
    return pendingMove.coords.some(([dx, dy]) => {
      const cellRow = pendingMove.row + dy;
      const cellCol = pendingMove.col + dx;
      return cellRow < 0 || cellRow >= BOARD_SIZE || cellCol < 0 || cellCol >= BOARD_SIZE;
    });
  }, [pendingMove]);
  
  // Compute effective used pieces for PieceTray
  // This includes all pieces NOT in availablePieces + actually placed pieces
  const effectiveUsedPieces = useMemo(() => {
    const allPieceNames = Object.keys(pieces);
    const notAvailable = allPieceNames.filter(p => !availablePieces.includes(p));
    return [...new Set([...notAvailable, ...usedPieces])];
  }, [availablePieces, usedPieces]);
  
  // -------------------------------------------------------------------------
  // HELPERS
  // -------------------------------------------------------------------------
  const safeSetTimeout = useCallback((callback, delay) => {
    const timeoutId = setTimeout(() => {
      pendingTimeoutsRef.current.delete(timeoutId);
      if (mountedRef.current) {
        callback();
      }
    }, delay);
    pendingTimeoutsRef.current.add(timeoutId);
    return timeoutId;
  }, []);
  
  // Find a valid AI move - returns { piece, row, col, coords, rotation, flipped } or null
  const findAIMove = useCallback((currentBoard, aiPiecesList) => {
    for (const pieceName of aiPiecesList) {
      const piece = pieces[pieceName];
      if (!piece) continue;
      
      // Try all rotations and flips
      for (const rot of [0, 90, 180, 270]) {
        for (const flip of [false, true]) {
          const coords = getPieceCoords(pieceName, rot, flip);
          if (!coords) continue;
          
          // Try all board positions
          for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
              if (canPlacePiece(currentBoard, row, col, coords)) {
                return { piece: pieceName, row, col, coords, rotation: rot, flipped: flip };
              }
            }
          }
        }
      }
    }
    
    return null; // No valid move found
  }, []);
  
  // -------------------------------------------------------------------------
  // INITIALIZE PUZZLE
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!puzzle) return;
    
    console.log('[CreatorPuzzleGame] Loading puzzle:', puzzle.puzzle_number);
    
    const { board: parsedBoard, boardPieces: parsedBoardPieces } = parsePuzzleBoard(
      puzzle.board,
      puzzle.board_pieces
    );
    
    setBoard(parsedBoard);
    setBoardPieces(parsedBoardPieces);
    setInitialBoard(parsedBoard.map(row => [...row]));
    setInitialBoardPieces(parsedBoardPieces.map(row => [...row]));
    
    // Set available pieces for the player
    const playerPieces = puzzle.player_pieces || [];
    setAvailablePieces(playerPieces);
    setUsedPieces([]);
    setMoveIndex(0);
    
    setGameState(GAME_STATES.PLAYING);
    
    return () => {
      mountedRef.current = false;
      pendingTimeoutsRef.current.forEach(clearTimeout);
    };
  }, [puzzle]);
  
  // -------------------------------------------------------------------------
  // PIECE SELECTION & MOVEMENT
  // -------------------------------------------------------------------------
  const handleSelectPiece = useCallback((piece) => {
    if (gameState !== GAME_STATES.PLAYING) return;
    if (effectiveUsedPieces.includes(piece)) return;
    
    soundManager.playPieceSelect();
    setSelectedPiece(piece);
    setRotation(0);
    setFlipped(false);
    setPendingMove(null);
  }, [gameState, effectiveUsedPieces]);
  
  const handleRotate = useCallback(() => {
    if (!selectedPiece || gameState !== GAME_STATES.PLAYING) return;
    soundManager.playRotate();
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
    
    if (pendingMove) {
      const coords = getPieceCoords(selectedPiece, newRotation, flipped);
      setPendingMove({ ...pendingMove, coords });
    }
  }, [selectedPiece, rotation, flipped, pendingMove, gameState]);
  
  const handleFlip = useCallback(() => {
    if (!selectedPiece || gameState !== GAME_STATES.PLAYING) return;
    soundManager.playRotate();
    const newFlipped = !flipped;
    setFlipped(newFlipped);
    
    if (pendingMove) {
      const coords = getPieceCoords(selectedPiece, rotation, newFlipped);
      setPendingMove({ ...pendingMove, coords });
    }
  }, [selectedPiece, rotation, flipped, pendingMove, gameState]);
  
  // -------------------------------------------------------------------------
  // BOARD CELL CLICK
  // -------------------------------------------------------------------------
  const handleCellClick = useCallback((row, col) => {
    if (!selectedPiece || gameState !== GAME_STATES.PLAYING) return;
    
    const coords = getPieceCoords(selectedPiece, rotation, flipped);
    setPendingMove({ row, col, coords, piece: selectedPiece });
    soundManager.playClickSound?.('select');
  }, [selectedPiece, rotation, flipped, gameState]);
  
  // -------------------------------------------------------------------------
  // D-PAD MOVEMENT
  // -------------------------------------------------------------------------
  const handleDPadMove = useCallback((direction) => {
    if (!selectedPiece || gameState !== GAME_STATES.PLAYING) return;
    
    const [dRow, dCol] = DIRECTION_DELTAS[direction] || [0, 0];
    
    if (pendingMove) {
      const newRow = Math.max(0, Math.min(BOARD_SIZE - 1, pendingMove.row + dRow));
      const newCol = Math.max(0, Math.min(BOARD_SIZE - 1, pendingMove.col + dCol));
      setPendingMove({ ...pendingMove, row: newRow, col: newCol });
    } else {
      const coords = getPieceCoords(selectedPiece, rotation, flipped);
      setPendingMove({ row: Math.max(0, 3 + dRow), col: Math.max(0, 3 + dCol), coords, piece: selectedPiece });
    }
    
    soundManager.playClickSound?.('move');
  }, [selectedPiece, rotation, flipped, pendingMove, gameState]);
  
  // -------------------------------------------------------------------------
  // VALIDATE AND CONFIRM MOVE
  // -------------------------------------------------------------------------
  const confirmMove = useCallback(() => {
    if (!pendingMove || !selectedPiece || gameState !== GAME_STATES.PLAYING) return;
    if (!canPlacePiece(board, pendingMove.row, pendingMove.col, pendingMove.coords)) {
      soundManager.playInvalid();
      return;
    }
    
    // Place the user's piece
    const newBoard = board.map(row => [...row]);
    const newBoardPieces = boardPieces.map(row => [...row]);
    
    for (const [dx, dy] of pendingMove.coords) {
      const r = pendingMove.row + dy;
      const c = pendingMove.col + dx;
      newBoard[r][c] = currentPlayer;
      newBoardPieces[r][c] = selectedPiece;
    }
    
    const newUsedPieces = [...usedPieces, selectedPiece];
    
    // Set player animation
    setPlayerAnimatingMove({ 
      ...pendingMove, 
      pieceType: selectedPiece, 
      rot: rotation, 
      flip: flipped 
    });
    
    // Update board with user's move
    setBoard(newBoard);
    setBoardPieces(newBoardPieces);
    setUsedPieces(newUsedPieces);
    setSelectedPiece(null);
    setPendingMove(null);
    soundManager.playPiecePlace();
    
    // Clear player animation after delay
    safeSetTimeout(() => setPlayerAnimatingMove(null), ANIMATION_CLEAR_DELAY_MS);
    
    // Check if AI can play
    const aiPiecesList = puzzle.ai_pieces || [];
    const aiMove = findAIMove(newBoard, aiPiecesList);
    
    safeSetTimeout(() => {
      if (!aiMove) {
        // SUCCESS - AI blocked! User wins!
        console.log('[CreatorPuzzleGame] AI blocked - User wins!');
        soundManager.playWin();
        setGameState(GAME_STATES.SUCCESS);
        
        // Record completion
        if (profile?.id && puzzle?.id) {
          const timeToComplete = Date.now() - startTime;
          creatorPuzzleService.markCompleted(
            profile.id,
            puzzle.id,
            puzzle.puzzle_number,
            timeToComplete,
            attempts
          ).catch(err => console.error('[CreatorPuzzleGame] Failed to record completion:', err));
        }
      } else {
        // AI can play - this means user made wrong move (or it's a multi-move puzzle)
        console.log('[CreatorPuzzleGame] AI plays:', aiMove.piece, 'at', aiMove.row, aiMove.col);
        
        // Place AI's piece on the board
        const aiPlayer = currentPlayer === 1 ? 2 : 1;
        const boardAfterAI = newBoard.map(row => [...row]);
        const boardPiecesAfterAI = newBoardPieces.map(row => [...row]);
        
        for (const [dx, dy] of aiMove.coords) {
          const r = aiMove.row + dy;
          const c = aiMove.col + dx;
          boardAfterAI[r][c] = aiPlayer;
          boardPiecesAfterAI[r][c] = aiMove.piece;
        }
        
        // Show AI's move with animation
        setAiAnimatingMove({
          row: aiMove.row,
          col: aiMove.col,
          coords: aiMove.coords,
          pieceType: aiMove.piece,
          rot: aiMove.rotation,
          flip: aiMove.flipped,
        });
        
        // Update board with AI's move
        setBoard(boardAfterAI);
        setBoardPieces(boardPiecesAfterAI);
        soundManager.playPiecePlace();
        
        // Clear AI animation and show wrong move feedback
        safeSetTimeout(() => {
          setAiAnimatingMove(null);
          
          // Show wrong move feedback
          console.log('[CreatorPuzzleGame] Wrong move - AI still has moves');
          soundManager.playInvalid();
          setShowWrongMove(true);
          
          // Reset after showing the wrong move
          safeSetTimeout(() => {
            setShowWrongMove(false);
            // Reset to initial state
            if (initialBoard && initialBoardPieces) {
              setBoard(initialBoard.map(row => [...row]));
              setBoardPieces(initialBoardPieces.map(row => [...row]));
            }
            setUsedPieces([]);
            setSelectedPiece(null);
            setPendingMove(null);
            setMoveIndex(0);
            setAttempts(prev => prev + 1);
          }, WRONG_MOVE_DISPLAY_MS);
        }, ANIMATION_CLEAR_DELAY_MS);
      }
    }, SUCCESS_DELAY_MS);
  }, [pendingMove, selectedPiece, board, boardPieces, rotation, flipped, gameState, puzzle, usedPieces, currentPlayer, safeSetTimeout, initialBoard, initialBoardPieces, profile, startTime, attempts, findAIMove]);
  
  // -------------------------------------------------------------------------
  // RESET PUZZLE
  // -------------------------------------------------------------------------
  const resetPuzzle = useCallback(() => {
    if (!initialBoard || !initialBoardPieces) return;
    
    soundManager.playButtonClick();
    setBoard(initialBoard.map(row => [...row]));
    setBoardPieces(initialBoardPieces.map(row => [...row]));
    setUsedPieces([]);
    setSelectedPiece(null);
    setPendingMove(null);
    setRotation(0);
    setFlipped(false);
    setMoveIndex(0);
    setGameState(GAME_STATES.PLAYING);
    setAttempts(prev => prev + 1);
  }, [initialBoard, initialBoardPieces]);
  
  // -------------------------------------------------------------------------
  // DRAG AND DROP (simplified from SpeedPuzzleScreen)
  // -------------------------------------------------------------------------
  const DRAG_THRESHOLD = 10;
  
  const updateDrag = useCallback((clientX, clientY) => {
    if (!isDraggingRef.current || !draggedPieceRef.current) return;
    
    setDragPosition({ x: clientX, y: clientY });
    
    if (boardBoundsRef.current) {
      const { left, top, width, height } = boardBoundsRef.current;
      const cellWidth = width / BOARD_SIZE;
      const cellHeight = height / BOARD_SIZE;
      
      const offsetRow = pieceCellOffsetRef.current?.row || 0;
      const offsetCol = pieceCellOffsetRef.current?.col || 0;
      
      const col = Math.floor((clientX - left) / cellWidth) - offsetCol;
      const row = Math.floor((clientY - top) / cellHeight) - offsetRow;
      
      const coords = getPieceCoords(draggedPieceRef.current, rotation, flipped);
      const isValid = canPlacePiece(board, row, col, coords);
      
      setIsValidDrop(isValid);
      setDragPreviewCell({ row, col });
    }
  }, [rotation, flipped, board]);
  
  const endDrag = useCallback(() => {
    if (!isDraggingRef.current) return;
    
    const piece = draggedPieceRef.current;
    const previewRow = dragPreviewCell?.row;
    const previewCol = dragPreviewCell?.col;
    
    if (piece && previewRow !== undefined && previewCol !== undefined && isValidDrop) {
      const coords = getPieceCoords(piece, rotation, flipped);
      setPendingMove({ row: previewRow, col: previewCol, coords, piece });
    }
    
    isDraggingRef.current = false;
    draggedPieceRef.current = null;
    hasDragStartedRef.current = false;
    
    setIsDragging(false);
    setDraggedPiece(null);
    setIsValidDrop(false);
    setDragPreviewCell(null);
    
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  }, [dragPreviewCell, isValidDrop, rotation, flipped]);
  
  const getPieceHandlers = useCallback((piece) => {
    if (gameState !== GAME_STATES.PLAYING) return {};
    if (effectiveUsedPieces.includes(piece)) return {};
    
    const handleStart = (clientX, clientY, elementRect) => {
      if (hasDragStartedRef.current) return;
      
      hasDragStartedRef.current = true;
      isDraggingRef.current = true;
      draggedPieceRef.current = piece;
      pieceCellOffsetRef.current = { row: 0, col: 0 };
      
      if (boardRef.current) {
        boardBoundsRef.current = boardRef.current.getBoundingClientRect();
      }
      
      setIsDragging(true);
      setDraggedPiece(piece);
      setSelectedPiece(piece);
      setPendingMove(null);
      setDragPosition({ x: clientX, y: clientY });
      setDragOffset({ x: 0, y: 0 });
      
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      
      soundManager.playPieceSelect();
    };
    
    const handleTouchStart = (e) => {
      const touch = e.touches?.[0];
      if (!touch) return;
      dragStartRef.current = { x: touch.clientX, y: touch.clientY };
    };
    
    const handleTouchMove = (e) => {
      if (!e.touches?.[0]) return;
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - dragStartRef.current.x);
      const dy = Math.abs(touch.clientY - dragStartRef.current.y);
      
      if (!hasDragStartedRef.current && (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD)) {
        const rect = e.currentTarget.getBoundingClientRect();
        handleStart(touch.clientX, touch.clientY, rect);
      }
      
      if (isDraggingRef.current) {
        updateDrag(touch.clientX, touch.clientY);
        if (e.cancelable) e.preventDefault();
      }
    };
    
    const handleTouchEnd = () => {
      if (isDraggingRef.current) {
        endDrag();
      } else if (!hasDragStartedRef.current) {
        handleSelectPiece(piece);
      }
      hasDragStartedRef.current = false;
    };
    
    const handleMouseDown = (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      handleStart(e.clientX, e.clientY, rect);
    };
    
    return {
      onMouseDown: handleMouseDown,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    };
  }, [gameState, effectiveUsedPieces, handleSelectPiece, updateDrag, endDrag]);
  
  // Global mouse handlers for drag
  useEffect(() => {
    if (!isDragging) return;
    
    const handleGlobalMove = (e) => updateDrag(e.clientX, e.clientY);
    const handleGlobalEnd = () => endDrag();
    
    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalEnd);
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalEnd);
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
    window.addEventListener('touchcancel', handleTouchEnd);
    
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isDragging, updateDrag, endDrag]);
  
  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------
  
  if (!puzzle) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-slate-400">Loading puzzle...</div>
      </div>
    );
  }
  
  return (
    <div 
      className={`min-h-screen flex flex-col ${needsScroll ? 'overflow-y-auto' : 'overflow-hidden'}`}
      style={{
        background: `
          linear-gradient(to bottom, rgba(15, 23, 42, 0.97), rgba(15, 23, 42, 0.99)),
          repeating-linear-gradient(0deg, transparent, transparent 40px, ${theme.gridColor} 40px, ${theme.gridColor} 41px),
          repeating-linear-gradient(90deg, transparent, transparent 40px, ${theme.gridColor} 40px, ${theme.gridColor} 41px)
        `,
        minHeight: '100vh',
        minHeight: '100dvh',
      }}
    >
      {/* Glow orbs */}
      <div className={`fixed top-20 right-10 w-64 h-64 ${theme.glow1} rounded-full blur-3xl pointer-events-none`} />
      <div className={`fixed bottom-32 left-10 w-56 h-56 ${theme.glow2} rounded-full blur-3xl pointer-events-none`} />
      
      {/* Safe area */}
      <div className="flex-shrink-0" style={{ height: 'env(safe-area-inset-top)' }} />
      
      {/* Header */}
      <PuzzleHeader
        puzzleNumber={puzzle.puzzle_number}
        puzzleName={puzzle.name}
        difficulty={puzzle.difficulty}
        onBack={onBack}
      />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-4">
        {/* Attempt counter */}
        {attempts > 1 && (
          <div className="mb-2 px-3 py-1 bg-slate-800/80 rounded-full border border-slate-700/50">
            <span className="text-slate-400 text-xs">Attempt #{attempts}</span>
          </div>
        )}
        
        {/* Board container */}
        <div className="relative w-full max-w-md">
          <WrongMoveFeedback visible={showWrongMove} />
          
          <div ref={boardRef}>
            <GameBoard
              board={board}
              boardPieces={boardPieces}
              currentPlayer={currentPlayer}
              pendingMove={pendingMove}
              onCellClick={handleCellClick}
              selectedPiece={selectedPiece}
              rotation={rotation}
              flipped={flipped}
              playerAnimatingMove={playerAnimatingMove}
              aiAnimatingMove={aiAnimatingMove}
              lastPlacedPiece={null}
              dragPreviewCell={dragPreviewCell}
              draggedPiece={draggedPiece}
              isValidDrop={isValidDrop}
            />
          </div>
        </div>
        
        {/* Controls */}
        <div className="w-full max-w-md mt-4 flex items-center justify-center gap-2">
          <button
            onClick={resetPuzzle}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors border border-slate-600"
          >
            <RefreshCw size={16} />
            <span className="text-sm font-medium">Reset</span>
          </button>
          
          <button
            onClick={handleRotate}
            disabled={!selectedPiece}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border ${
              selectedPiece 
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 hover:bg-cyan-500/30' 
                : 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed'
            }`}
          >
            <RotateCcw size={16} />
            <span className="text-sm font-medium">Rotate</span>
          </button>
          
          <button
            onClick={handleFlip}
            disabled={!selectedPiece}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border ${
              selectedPiece 
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 hover:bg-purple-500/30' 
                : 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed'
            }`}
          >
            <FlipHorizontal size={16} />
            <span className="text-sm font-medium">Flip</span>
          </button>
        </div>
        
        {/* D-Pad and Confirm */}
        <div className="w-full max-w-md mt-4 flex items-center justify-between px-4">
          <DPad onMove={handleDPadMove} disabled={!selectedPiece} />
          
          <button
            onClick={confirmMove}
            disabled={!canConfirm || isPieceOffGrid}
            className={`px-8 py-3 rounded-xl font-bold text-lg transition-all ${
              canConfirm && !isPieceOffGrid
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 hover:from-amber-400 hover:to-orange-500 active:scale-[0.98]'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-2">
              <Check size={20} />
              <span>CONFIRM</span>
            </div>
          </button>
        </div>
        
        {/* Piece tray */}
        <div className={`w-full max-w-md mt-4 p-3 rounded-xl ${theme.panelBorder} border bg-slate-900/80`}>
          <PieceTray
            usedPieces={effectiveUsedPieces}
            selectedPiece={selectedPiece}
            onSelectPiece={handleSelectPiece}
            currentPlayer={currentPlayer}
            getPieceHandlers={getPieceHandlers}
          />
        </div>
      </div>
      
      {/* Drag overlay */}
      {isDragging && draggedPiece && (
        <DragOverlay
          piece={draggedPiece}
          position={dragPosition}
          offset={dragOffset}
          rotation={rotation}
          flipped={flipped}
          isValid={isValidDrop}
          currentPlayer={currentPlayer}
        />
      )}
      
      {/* Success overlay */}
      {gameState === GAME_STATES.SUCCESS && (
        <SuccessOverlay
          puzzleNumber={puzzle.puzzle_number}
          onContinue={() => onNextPuzzle?.(puzzle.puzzle_number + 1)}
          onBack={onBack}
        />
      )}
      
      {/* Safe area bottom */}
      <div className="flex-shrink-0" style={{ height: 'max(16px, env(safe-area-inset-bottom))' }} />
    </div>
  );
};

export default CreatorPuzzleGame;
