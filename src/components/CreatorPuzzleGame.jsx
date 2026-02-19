// CreatorPuzzleGame.jsx - Play hand-crafted creator puzzles
// v1.8: Fixed difficulty colors - Easy=green, Medium=amber, Hard=red, Expert=purple
// v1.7: Neon glow square badge, theme-colored puzzle info, fixed AI piece removal from tray
// v1.6: Fixed AI bugs - correct piece tracking, better scoring, proper winning move detection
// v1.5: Attempt persistence - loads/saves attempts to database across sessions
// v1.4: Removed duplicate "New" button (creator puzzles don't generate new puzzles)
// v1.3: Difficulty-based background theming, centered puzzle info, cleaned up UI
// v1.2: Enhanced Expert AI - better trap detection, blocking scoring, deterministic tiebreakers
// v1.1: Updated layout to match GameScreen - cyan theme, proper DPad/controls layout
import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { ArrowLeft, RotateCcw, Move, FlipHorizontal, Check, X, Trophy, Sparkles, Lightbulb, RefreshCw } from 'lucide-react';
import NeonTitle from './NeonTitle';
import NeonSubtitle from './NeonSubtitle';
import GameBoard from './GameBoard';
import PieceTray from './PieceTray';
import ControlButtons from './ControlButtons';
import DPad from './DPad';
import DragOverlay from './DragOverlay';
import { pieces } from '../utils/pieces';
import { getPieceCoords, canPlacePiece, canAnyPieceBePlaced, BOARD_SIZE } from '../utils/gameLogic';
import { soundManager } from '../utils/soundManager';
import { streakTracker } from '../utils/streakTracker';
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

// Difficulty-based themes for background and UI styling
const difficultyThemes = {
  easy: {
    gridColor: 'rgba(34, 197, 94, 0.3)',
    glow1: 'bg-green-500/30',
    glow2: 'bg-emerald-500/25',
    panelBorder: 'border-green-500/40',
    panelShadow: 'shadow-[0_0_40px_rgba(34,197,94,0.3)]',
  },
  medium: {
    gridColor: 'rgba(251, 191, 36, 0.3)',
    glow1: 'bg-amber-500/30',
    glow2: 'bg-orange-500/25',
    panelBorder: 'border-amber-500/40',
    panelShadow: 'shadow-[0_0_40px_rgba(251,191,36,0.3)]',
  },
  hard: {
    gridColor: 'rgba(239, 68, 68, 0.3)',
    glow1: 'bg-red-500/30',
    glow2: 'bg-rose-500/25',
    panelBorder: 'border-red-500/40',
    panelShadow: 'shadow-[0_0_40px_rgba(239,68,68,0.3)]',
  },
  expert: {
    gridColor: 'rgba(168, 85, 247, 0.3)',
    glow1: 'bg-purple-500/30',
    glow2: 'bg-pink-500/25',
    panelBorder: 'border-purple-500/40',
    panelShadow: 'shadow-[0_0_40px_rgba(168,85,247,0.3)]',
  },
};

// Get theme based on puzzle difficulty
const getTheme = (difficulty) => {
  return difficultyThemes[difficulty] || difficultyThemes.medium;
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
    medium: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/50' },
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
  const [errorMessage, setErrorMessage] = useState(null);
  
  // Mobile detection
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  
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
  const endDragRef = useRef(null); // For global touch handlers to access endDrag
  const dragCellRef = useRef(null); // Synchronous cell tracking for touch handlers
  
  // -------------------------------------------------------------------------
  // DERIVED STATE
  // -------------------------------------------------------------------------
  const currentPlayer = puzzle?.current_player || 1;
  
  // Get theme based on puzzle difficulty
  const theme = useMemo(() => getTheme(puzzle?.difficulty), [puzzle?.difficulty]);
  
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
  // This includes all pieces NOT in availablePieces + actually placed pieces + pieces currently on board
  const effectiveUsedPieces = useMemo(() => {
    const allPieceNames = Object.keys(pieces);
    const notAvailable = allPieceNames.filter(p => !availablePieces.includes(p));
    
    // Also include any pieces currently on the board (handles AI pieces)
    const piecesOnBoard = new Set();
    if (boardPieces) {
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (boardPieces[r]?.[c]) {
            piecesOnBoard.add(boardPieces[r][c]);
          }
        }
      }
    }
    
    return [...new Set([...notAvailable, ...usedPieces, ...piecesOnBoard])];
  }, [availablePieces, usedPieces, boardPieces]);
  
  // Show error when placement is invalid (matching GameScreen behavior)
  useEffect(() => {
    if (pendingMove && pendingMove.coords) {
      const isValid = canPlacePiece(board, pendingMove.row, pendingMove.col, pendingMove.coords);
      if (!isValid) {
        setErrorMessage('Invalid placement!');
      } else {
        setErrorMessage(null);
      }
    } else {
      setErrorMessage(null);
    }
  }, [pendingMove, board]);
  
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
  
  // Get all pieces currently on the board (from initial state + user moves)
  const getPiecesOnBoard = useCallback((boardPiecesState) => {
    const onBoard = new Set();
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (boardPiecesState[r][c]) {
          onBoard.add(boardPiecesState[r][c]);
        }
      }
    }
    return Array.from(onBoard);
  }, []);
  
  // Get all possible moves for a player given current board state
  const getAllPossibleMoves = useCallback((currentBoard, availablePiecesList, dedupe = false) => {
    const moves = [];
    const seen = dedupe ? new Set() : null;
    
    for (const pieceName of availablePiecesList) {
      if (!pieces[pieceName]) continue;
      
      for (let flip = 0; flip < 2; flip++) {
        for (let rot = 0; rot < 4; rot++) {
          const coords = getPieceCoords(pieceName, rot * 90, flip === 1);
          if (!coords) continue;
          
          for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
              if (canPlacePiece(currentBoard, row, col, coords)) {
                if (dedupe) {
                  // Create hash for deduplication
                  const placed = coords.map(([dx, dy]) => `${row + dy},${col + dx}`).sort().join('|');
                  const hash = pieceName + placed;
                  if (seen.has(hash)) continue;
                  seen.add(hash);
                }
                moves.push({ 
                  piece: pieceName, 
                  row, 
                  col, 
                  coords, 
                  rotation: rot * 90, 
                  flipped: flip === 1 
                });
              }
            }
          }
        }
      }
    }
    return moves;
  }, []);
  
  // Apply a move to a board and return new board state
  const applyMoveToBoard = useCallback((currentBoard, move, player) => {
    const newBoard = currentBoard.map(r => [...r]);
    for (const [dx, dy] of move.coords) {
      newBoard[move.row + dy][move.col + dx] = player;
    }
    return newBoard;
  }, []);
  
  // Quick position evaluation (center preference)
  const quickEval = useCallback((row, col, coords) => {
    let score = 0;
    for (const [dx, dy] of coords) {
      const r = row + dy;
      const c = col + dx;
      score += (3.5 - Math.abs(r - 3.5)) + (3.5 - Math.abs(c - 3.5));
    }
    return score;
  }, []);
  
  // Count how many pieces can still be placed
  const countPlaceablePieces = useCallback((currentBoard, availablePiecesList) => {
    let count = 0;
    for (const pieceName of availablePiecesList) {
      if (!pieces[pieceName]) continue;
      
      let found = false;
      for (let flip = 0; flip < 2 && !found; flip++) {
        for (let rot = 0; rot < 4 && !found; rot++) {
          const coords = getPieceCoords(pieceName, rot * 90, flip === 1);
          if (!coords) continue;
          
          for (let row = 0; row < BOARD_SIZE && !found; row++) {
            for (let col = 0; col < BOARD_SIZE && !found; col++) {
              if (canPlacePiece(currentBoard, row, col, coords)) {
                count++;
                found = true;
              }
            }
          }
        }
      }
    }
    return count;
  }, []);
  
  // Expert AI: Find the best move using minimax-like evaluation
  // For creator puzzles: Find a move that still allows AI to respond after player's next turn
  // v1.1: Enhanced for Expert puzzles - more thorough evaluation, blocking scoring
  const findExpertAIMove = useCallback((currentBoard, aiAvailablePieces, playerAvailablePieces) => {
    console.log('[CreatorPuzzle AI] Finding optimal move. AI pieces:', aiAvailablePieces, 'Player pieces:', playerAvailablePieces);
    
    const aiMoves = getAllPossibleMoves(currentBoard, aiAvailablePieces, true);
    if (aiMoves.length === 0) {
      console.log('[CreatorPuzzle AI] No valid moves available');
      return null;
    }
    
    // Helper: Count player's winning moves from a given board state
    // A "winning move" = player plays, then AI has NO valid response
    const countPlayerWinningMoves = (board, playerPieces, aiPieces) => {
      const pMoves = getAllPossibleMoves(board, playerPieces, true);
      let winCount = 0;
      
      // Check all player moves (more thorough for puzzle accuracy)
      for (const pm of pMoves) {
        const afterPlayer = applyMoveToBoard(board, pm, 1);
        const playerPiecesAfter = playerPieces.filter(p => p !== pm.piece);
        
        // AI responds - does AI have any valid moves?
        const aiResponses = getAllPossibleMoves(afterPlayer, aiPieces, false);
        
        if (aiResponses.length === 0) {
          // Player wins with this move
          winCount++;
        }
      }
      return winCount;
    };
    
    // Count player's winning moves BEFORE AI plays
    const playerWinningMovesBefore = countPlayerWinningMoves(currentBoard, playerAvailablePieces, aiAvailablePieces);
    console.log('[CreatorPuzzle AI] Player has', playerWinningMovesBefore, 'winning moves BEFORE AI plays');
    
    // Score each possible AI move
    const scoredMoves = [];
    
    for (const aiMove of aiMoves) {
      const boardAfterAI = applyMoveToBoard(currentBoard, aiMove, 2);
      const aiPiecesAfterMove = aiAvailablePieces.filter(p => p !== aiMove.piece);
      
      // Check player's options after this AI move
      const playerMoves = getAllPossibleMoves(boardAfterAI, playerAvailablePieces, true);
      
      // PRIORITY 1: AI wins immediately (player has no moves)
      if (playerMoves.length === 0) {
        scoredMoves.push({ ...aiMove, score: 100000, reason: 'wins', playerWinsAfter: 0 });
        console.log(`[CreatorPuzzle AI] ${aiMove.piece} WINS (blocks all player moves)`);
        continue;
      }
      
      // Count player's winning moves AFTER this AI move (with reduced AI pieces)
      const playerWinningMovesAfter = countPlayerWinningMoves(boardAfterAI, playerAvailablePieces, aiPiecesAfterMove);
      const blockedWinningMoves = playerWinningMovesBefore - playerWinningMovesAfter;
      
      // PRIORITY 2: Minimize player's winning moves
      // Heavily penalize moves that INCREASE player's winning options
      // Reward moves that DECREASE player's winning options
      let score = 0;
      
      // Big bonus for blocking winning moves
      score += blockedWinningMoves * 2000;
      
      // Heavy penalty for leaving player with winning moves
      score -= playerWinningMovesAfter * 1000;
      
      // Penalty for total player options (prefer constraining player)
      score -= playerMoves.length * 10;
      
      // PRIORITY 3: Look ahead - can AI survive all player responses?
      let aiCanAlwaysRespond = true;
      let minAIResponseOptions = Infinity;
      
      for (const playerMove of playerMoves) {
        const boardAfterPlayer = applyMoveToBoard(boardAfterAI, playerMove, 1);
        const playerPiecesAfterMove = playerAvailablePieces.filter(p => p !== playerMove.piece);
        
        // Can AI respond to this player move?
        const aiResponseMoves = getAllPossibleMoves(boardAfterPlayer, aiPiecesAfterMove, false);
        
        if (aiResponseMoves.length === 0) {
          // This player move would win for player (AI blocked)
          aiCanAlwaysRespond = false;
        }
        
        minAIResponseOptions = Math.min(minAIResponseOptions, aiResponseMoves.length);
      }
      
      // Bonus if AI can respond to ALL player moves
      if (aiCanAlwaysRespond) {
        score += 500;
      }
      
      // Small bonus for AI flexibility
      score += minAIResponseOptions * 5;
      
      // PRIORITY 4: Position preference (center is slightly better)
      const positionBonus = quickEval(aiMove.row, aiMove.col, aiMove.coords) * 0.5;
      score += positionBonus;
      
      // Deterministic tiebreaker for consistency
      const tiebreaker = aiMove.piece.charCodeAt(0) * 0.01 + aiMove.row * 0.001 + aiMove.col * 0.0001;
      score += tiebreaker;
      
      scoredMoves.push({ 
        ...aiMove, 
        score, 
        blocked: blockedWinningMoves, 
        playerWinsAfter: playerWinningMovesAfter,
        playerMoves: playerMoves.length,
        canSurvive: aiCanAlwaysRespond
      });
    }
    
    // Sort by score (highest = best for AI)
    scoredMoves.sort((a, b) => b.score - a.score);
    
    // Log top moves for debugging
    console.log('[CreatorPuzzle AI] Top 5 moves:');
    scoredMoves.slice(0, 5).forEach((m, i) => {
      console.log(`  ${i+1}. ${m.piece} at (${m.row},${m.col}) score=${m.score.toFixed(0)} ` +
        `blocked=${m.blocked} playerWins=${m.playerWinsAfter} survive=${m.canSurvive}`);
    });
    
    const bestMove = scoredMoves[0];
    console.log(`[CreatorPuzzle AI] Selected: ${bestMove.piece} at (${bestMove.row},${bestMove.col})`);
    
    return bestMove;
  }, [getAllPossibleMoves, applyMoveToBoard, quickEval]);
  
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
    
    // Load previous attempts from database (if user is logged in)
    if (profile?.id && puzzle?.id) {
      creatorPuzzleService.getProgress(profile.id, puzzle.id)
        .then(progress => {
          if (progress?.attempts) {
            console.log('[CreatorPuzzleGame] Loaded previous attempts:', progress.attempts);
            setAttempts(progress.attempts);
          } else {
            setAttempts(1);
          }
        })
        .catch(err => {
          console.warn('[CreatorPuzzleGame] Failed to load progress:', err);
          setAttempts(1);
        });
    } else {
      setAttempts(1);
    }
    
    setGameState(GAME_STATES.PLAYING);
    
    return () => {
      mountedRef.current = false;
      pendingTimeoutsRef.current.forEach(clearTimeout);
    };
  }, [puzzle, profile?.id]);
  
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
    
    // Allow anchor to be positioned outside board for pieces that extend
    // This matches the EXTENSION_MARGIN in calculateBoardCell
    const EXTENSION_MARGIN = 4;
    const minPos = -EXTENSION_MARGIN;
    const maxPos = BOARD_SIZE - 1 + EXTENSION_MARGIN;
    
    if (pendingMove) {
      const newRow = Math.max(minPos, Math.min(maxPos, pendingMove.row + dRow));
      const newCol = Math.max(minPos, Math.min(maxPos, pendingMove.col + dCol));
      setPendingMove({ ...pendingMove, row: newRow, col: newCol });
    } else {
      const coords = getPieceCoords(selectedPiece, rotation, flipped);
      setPendingMove({ row: Math.max(minPos, 3 + dRow), col: Math.max(minPos, 3 + dCol), coords, piece: selectedPiece });
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
    
    // Calculate available pieces for AI
    // AI pieces = puzzle.ai_pieces minus pieces already on the board
    const piecesOnBoard = getPiecesOnBoard(newBoardPieces);
    const aiPiecesList = (puzzle.ai_pieces || []).filter(p => !piecesOnBoard.includes(p));
    const playerPiecesRemaining = availablePieces.filter(p => !newUsedPieces.includes(p));
    
    console.log('[CreatorPuzzleGame] Pieces on board:', piecesOnBoard);
    console.log('[CreatorPuzzleGame] AI can use:', aiPiecesList);
    console.log('[CreatorPuzzleGame] Player can use:', playerPiecesRemaining);
    
    // Use expert AI to find best move
    const aiMove = findExpertAIMove(newBoard, aiPiecesList, playerPiecesRemaining);
    
    safeSetTimeout(() => {
      if (!aiMove) {
        // SUCCESS - AI blocked! User wins!
        console.log('[CreatorPuzzleGame] AI blocked - User wins!');
        soundManager.playWin();
        setGameState(GAME_STATES.SUCCESS);
        
        // Record daily play for streak tracking (creator puzzle completed)
        streakTracker.recordPlay();
        
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
        // AI can play - check if this is a "forced" move (player made good move)
        // If AI's score was very negative, player made a winning move - let them continue
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
        
        // Check if player can still play after AI's move
        const piecesOnBoardAfterAI = getPiecesOnBoard(boardPiecesAfterAI);
        const playerPiecesAfterAI = availablePieces.filter(p => 
          !newUsedPieces.includes(p) && !piecesOnBoardAfterAI.includes(p)
        );
        const playerCanContinue = getAllPossibleMoves(boardAfterAI, playerPiecesAfterAI, false).length > 0;
        
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
        
        // Clear AI animation
        safeSetTimeout(() => {
          setAiAnimatingMove(null);
          
          if (playerCanContinue) {
            // Player can continue - this is a multi-move puzzle or player made good move
            console.log('[CreatorPuzzleGame] Player can continue playing');
            // Don't reset - let player make another move
          } else {
            // Player cannot continue after AI's response - wrong move
            console.log('[CreatorPuzzleGame] Wrong move - Player blocked');
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
              
              // Increment attempts and save to database
              setAttempts(prev => {
                const newAttempts = prev + 1;
                // Save progress to database (non-blocking)
                if (profile?.id && puzzle?.id) {
                  creatorPuzzleService.saveProgress(
                    profile.id, 
                    puzzle.id, 
                    puzzle.puzzle_number, 
                    newAttempts
                  ).catch(err => console.warn('[CreatorPuzzleGame] Failed to save progress:', err));
                }
                return newAttempts;
              });
            }, WRONG_MOVE_DISPLAY_MS);
          }
        }, ANIMATION_CLEAR_DELAY_MS);
      }
    }, SUCCESS_DELAY_MS);
  }, [pendingMove, selectedPiece, board, boardPieces, rotation, flipped, gameState, puzzle, usedPieces, availablePieces, currentPlayer, safeSetTimeout, initialBoard, initialBoardPieces, profile, startTime, attempts, findExpertAIMove, getPiecesOnBoard, getAllPossibleMoves]);
  
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
    
    // Increment attempts and save to database
    setAttempts(prev => {
      const newAttempts = prev + 1;
      // Save progress to database (non-blocking)
      if (profile?.id && puzzle?.id) {
        creatorPuzzleService.saveProgress(
          profile.id, 
          puzzle.id, 
          puzzle.puzzle_number, 
          newAttempts
        ).catch(err => console.warn('[CreatorPuzzleGame] Failed to save progress:', err));
      }
      return newAttempts;
    });
  }, [initialBoard, initialBoardPieces, profile?.id, puzzle?.id, puzzle?.puzzle_number]);
  
  // Cancel current move
  const cancelMove = useCallback(() => {
    if (pendingMove) {
      soundManager.playButtonClick();
      setSelectedPiece(null);
      setPendingMove(null);
    }
  }, [pendingMove]);
  
  // -------------------------------------------------------------------------
  // DRAG AND DROP - Matching GameScreen implementation exactly
  // -------------------------------------------------------------------------
  
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

  // Attach global touch handlers synchronously (critical for mobile drag)
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
      endDragRef.current?.();
      
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
    if (gameState !== GAME_STATES.PLAYING) return;
    if (effectiveUsedPieces.includes(piece)) return;
    
    hasDragStartedRef.current = true;
    isDraggingRef.current = true;
    draggedPieceRef.current = piece;
    pieceCellOffsetRef.current = { row: 0, col: 0 };
    
    attachGlobalTouchHandlers();
    
    if (boardRef.current) {
      boardBoundsRef.current = boardRef.current.getBoundingClientRect();
    }
    
    const offsetX = clientX - (elementRect.left + elementRect.width / 2);
    const offsetY = clientY - (elementRect.top + elementRect.height / 2);
    
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
  }, [gameState, effectiveUsedPieces, attachGlobalTouchHandlers]);

  // Handle starting drag from a pending piece on the board
  const handleBoardDragStart = useCallback((piece, clientX, clientY, elementRect) => {
    if (hasDragStartedRef.current) return;
    if (gameState !== GAME_STATES.PLAYING) return;
    if (!pendingMove || pendingMove.piece !== piece) return;
    
    hasDragStartedRef.current = true;
    isDraggingRef.current = true;
    draggedPieceRef.current = piece;
    
    attachGlobalTouchHandlers();
    
    if (boardRef.current) {
      boardBoundsRef.current = boardRef.current.getBoundingClientRect();
    }
    
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
  }, [gameState, pendingMove, attachGlobalTouchHandlers]);

  // Update drag position (for mouse events)
  const updateDrag = useCallback((clientX, clientY) => {
    if (!isDraggingRef.current || !draggedPieceRef.current) return;
    
    setDragPosition({ x: clientX, y: clientY });
    
    if (boardRef.current) {
      boardBoundsRef.current = boardRef.current.getBoundingClientRect();
    }
    
    const cell = calculateBoardCell(clientX, clientY);
    
    if (cell) {
      const coords = getPieceCoords(draggedPieceRef.current, rotation, flipped);
      
      const minX = Math.min(...coords.map(([x]) => x));
      const maxX = Math.max(...coords.map(([x]) => x));
      const minY = Math.min(...coords.map(([, y]) => y));
      const maxY = Math.max(...coords.map(([, y]) => y));
      
      const centerOffsetCol = Math.floor((maxX + minX) / 2);
      const centerOffsetRow = Math.floor((maxY + minY) / 2);
      
      const adjustedRow = cell.row - centerOffsetRow;
      const adjustedCol = cell.col - centerOffsetCol;
      
      dragCellRef.current = { row: adjustedRow, col: adjustedCol };
      setDragPreviewCell({ row: adjustedRow, col: adjustedCol });
      
      const valid = canPlacePiece(board, adjustedRow, adjustedCol, coords);
      setIsValidDrop(valid);
    } else {
      dragCellRef.current = null;
      setDragPreviewCell(null);
      setIsValidDrop(false);
    }
  }, [rotation, flipped, board, calculateBoardCell]);

  // End drag
  const endDrag = useCallback(() => {
    const wasDragging = isDragging || isDraggingRef.current || hasDragStartedRef.current;
    if (!wasDragging) return;
    
    const piece = draggedPiece || draggedPieceRef.current;
    const cell = dragCellRef.current || dragPreviewCell;
    
    if (cell && piece) {
      const coords = getPieceCoords(piece, rotation, flipped);
      setPendingMove({ piece, row: cell.row, col: cell.col, coords });
    }
    
    isDraggingRef.current = false;
    draggedPieceRef.current = null;
    hasDragStartedRef.current = false;
    pieceCellOffsetRef.current = { row: 0, col: 0 };
    dragCellRef.current = null;
    
    setIsDragging(false);
    setDraggedPiece(null);
    setDragPosition({ x: 0, y: 0 });
    setDragOffset({ x: 0, y: 0 });
    setIsValidDrop(false);
    setDragPreviewCell(null);
    setPieceCellOffset({ row: 0, col: 0 });
    
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  }, [isDragging, dragPreviewCell, draggedPiece, rotation, flipped]);

  // Keep endDragRef current for global touch handlers
  endDragRef.current = endDrag;

  // Create drag handlers for PieceTray
  const getPieceHandlers = useCallback((piece) => {
    if (gameState !== GAME_STATES.PLAYING) return {};
    if (effectiveUsedPieces.includes(piece)) return {};

    let elementRect = null;

    const handleTouchStart = (e) => {
      if (hasDragStartedRef.current) return;
      
      const touch = e.touches[0];
      elementRect = e.currentTarget.getBoundingClientRect();
      
      if (boardRef.current) {
        boardBoundsRef.current = boardRef.current.getBoundingClientRect();
      }
      
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
  }, [gameState, effectiveUsedPieces, startDrag, updateDrag, endDrag]);

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
        cancelMove();
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
  }, [isDragging, updateDrag, endDrag, cancelMove]);

  // Global touch handlers for drag (backup for board drag on mobile)
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
          
          {/* Title */}
          <div className="text-center mb-2">
            <NeonTitle size="medium" />
            <NeonSubtitle text="CREATOR PUZZLE" size="small" className="mt-1" />
          </div>

          {/* Game Area */}
          <div className={`w-full max-w-md ${needsScroll ? '' : 'flex-shrink-0'}`}>
            
            {/* Puzzle Info Bar - Centered with theme glow */}
            <div className="flex items-center justify-center mb-2 px-1">
              <div 
                className={`flex items-center gap-2 text-center px-4 py-1.5 rounded-lg border ${
                  puzzle.difficulty === 'easy' ? 'bg-green-500/10 border-green-500/30' :
                  puzzle.difficulty === 'hard' ? 'bg-red-500/10 border-red-500/30' :
                  puzzle.difficulty === 'expert' ? 'bg-purple-500/10 border-purple-500/30' :
                  'bg-amber-500/10 border-amber-500/30'
                }`}
                style={{
                  boxShadow: `0 0 20px ${
                    puzzle.difficulty === 'easy' ? 'rgba(34,197,94,0.25)' :
                    puzzle.difficulty === 'hard' ? 'rgba(239,68,68,0.25)' :
                    puzzle.difficulty === 'expert' ? 'rgba(168,85,247,0.25)' :
                    'rgba(251,191,36,0.25)'
                  }`
                }}
              >
                <span className={`font-bold text-sm ${
                  puzzle.difficulty === 'easy' ? 'text-green-400' :
                  puzzle.difficulty === 'hard' ? 'text-red-400' :
                  puzzle.difficulty === 'expert' ? 'text-purple-400' :
                  'text-amber-400'
                }`}>#{puzzle.puzzle_number}</span>
                {puzzle.name && (
                  <>
                    <span className={`${
                      puzzle.difficulty === 'easy' ? 'text-green-500/50' :
                      puzzle.difficulty === 'hard' ? 'text-red-500/50' :
                      puzzle.difficulty === 'expert' ? 'text-purple-500/50' :
                      'text-amber-500/50'
                    }`}>•</span>
                    <span className={`text-sm font-medium ${
                      puzzle.difficulty === 'easy' ? 'text-green-300/80' :
                      puzzle.difficulty === 'hard' ? 'text-red-300/80' :
                      puzzle.difficulty === 'expert' ? 'text-purple-300/80' :
                      'text-amber-300/80'
                    }`}>{puzzle.name}</span>
                  </>
                )}
                {attempts > 1 && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-500 text-xs">Attempt #{attempts}</span>
                  </>
                )}
              </div>
            </div>

            {/* Player Bar - matches GameScreen layout */}
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
                  YOU
                </span>
              </div>
              
              {/* Difficulty Badge - Neon Glow Square */}
              <div 
                className={`px-4 py-1.5 rounded-lg bg-gradient-to-r ${
                  puzzle.difficulty === 'easy' ? 'from-green-600 to-emerald-600' :
                  puzzle.difficulty === 'hard' ? 'from-red-500 to-rose-600' :
                  puzzle.difficulty === 'expert' ? 'from-purple-500 to-pink-600' :
                  'from-amber-500 to-orange-600'
                } border ${
                  puzzle.difficulty === 'easy' ? 'border-green-400/60' :
                  puzzle.difficulty === 'hard' ? 'border-red-400/60' :
                  puzzle.difficulty === 'expert' ? 'border-purple-400/60' :
                  'border-amber-400/60'
                }`}
                style={{ 
                  boxShadow: `0 0 20px ${
                    puzzle.difficulty === 'easy' ? 'rgba(34,197,94,0.7)' :
                    puzzle.difficulty === 'hard' ? 'rgba(239,68,68,0.7)' :
                    puzzle.difficulty === 'expert' ? 'rgba(168,85,247,0.7)' :
                    'rgba(251,191,36,0.7)'
                  }, inset 0 1px 0 rgba(255,255,255,0.2)` 
                }}
              >
                <span className="text-white text-xs font-black tracking-wider uppercase drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
                  {puzzle.difficulty === 'easy' ? 'BEGINNER' : 
                   puzzle.difficulty === 'medium' ? 'INTERMEDIATE' : 
                   puzzle.difficulty === 'hard' ? 'HARD' : 
                   puzzle.difficulty === 'expert' ? 'EXPERT' : 'INTERMEDIATE'}
                </span>
              </div>
              
              {/* Player 2 - AI */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 ${
                currentPlayer === 2 
                  ? `bg-pink-500/20 border border-pink-400/50 shadow-[0_0_15px_rgba(236,72,153,0.4)]` 
                  : 'bg-slate-800/50 border border-slate-700/50'
              }`}>
                <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  currentPlayer === 2 ? 'bg-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.8)] animate-pulse' : 'bg-slate-600'
                }`} />
                <span className={`text-xs font-bold tracking-wide ${currentPlayer === 2 ? 'text-pink-300' : 'text-slate-500'}`}>
                  AI
                </span>
              </div>
            </div>

            {/* Game Board */}
            <div className="flex justify-center pb-1 relative">
              <WrongMoveFeedback visible={showWrongMove} />
              <GameBoard
                ref={boardRef}
                board={board}
                boardPieces={boardPieces}
                pendingMove={pendingMove}
                rotation={rotation}
                flipped={flipped}
                gameOver={gameState === GAME_STATES.SUCCESS}
                gameMode="puzzle"
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

            {/* Off-grid indicator */}
            {isPieceOffGrid && pendingMove && !isDragging && (
              <div className="flex justify-center mb-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-900/60 border border-amber-500/50 rounded-lg">
                  <Move size={14} className="text-amber-400" />
                  <span className="text-amber-300 text-xs font-bold">Use D-Pad to reposition</span>
                </div>
              </div>
            )}

            {/* D-Pad and Error Message Layout - matches GameScreen */}
            {pendingMove && !isDragging && (
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
                <DPad onMove={handleDPadMove} />
                
                {/* Spacer for symmetry */}
                <div className="flex-shrink-0 w-24" />
              </div>
            )}

            {/* Control Buttons - No "New" button for creator puzzles */}
            <ControlButtons
              selectedPiece={selectedPiece}
              pendingMove={pendingMove}
              canConfirm={canConfirm && !isPieceOffGrid}
              gameOver={gameState === GAME_STATES.SUCCESS}
              gameMode="puzzle"
              currentPlayer={currentPlayer}
              isGeneratingPuzzle={false}
              moveCount={0}
              onRotate={handleRotate}
              onFlip={handleFlip}
              onConfirm={confirmMove}
              onCancel={cancelMove}
              onRetryPuzzle={resetPuzzle}
              onMenu={onBack}
            />
          </div>

          {/* Piece Tray */}
          <div className={needsScroll ? '' : 'flex-1 min-h-0 overflow-auto'}>
            <PieceTray
              usedPieces={effectiveUsedPieces}
              selectedPiece={selectedPiece}
              pendingMove={pendingMove}
              gameOver={gameState === GAME_STATES.SUCCESS}
              gameMode="puzzle"
              currentPlayer={currentPlayer}
              isMobile={isMobile}
              isGeneratingPuzzle={false}
              onSelectPiece={handleSelectPiece}
              createDragHandlers={getPieceHandlers}
            />
          </div>
        </div>
      </div>
      
      {/* Drag overlay */}
      {isDragging && draggedPiece && (
        <DragOverlay
          isDragging={isDragging}
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
