// useGameState.js - Custom hook for managing local game state
// FIXED: Changed soundManager.playMove() to soundManager.playClickSound('move')
import { useState, useCallback, useRef } from 'react';
import { 
  BOARD_SIZE, 
  createEmptyBoard, 
  getPieceCoords, 
  canPlacePiece, 
  placePiece,
  canAnyPieceBePlaced 
} from '../utils/gameLogic';
import { getAIMove } from '../utils/aiPlayer';
import { soundManager } from '../utils/soundManager';

// AI move delay for better UX
const AI_MOVE_DELAY = 1500;

/**
 * Custom hook for managing local game state (2-player, AI, puzzle modes)
 * Handles board state, piece placement, turns, and game over detection
 */
export const useGameState = (initialGameMode = '2player') => {
  // Core game state
  const [board, setBoard] = useState(() => createEmptyBoard());
  const [boardPieces, setBoardPieces] = useState(() => 
    Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null))
  );
  const [usedPieces, setUsedPieces] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [gameMode, setGameMode] = useState(initialGameMode);
  
  // UI state
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [pendingMove, setPendingMove] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [isAIThinking, setIsAIThinking] = useState(false);
  
  // Animation states
  const [aiAnimatingMove, setAiAnimatingMove] = useState(null);
  const [playerAnimatingMove, setPlayerAnimatingMove] = useState(null);
  
  // Puzzle mode state
  const [puzzleDifficultyState, setPuzzleDifficultyState] = useState('easy');
  const puzzleDifficultyRef = useRef('easy');

  // Reset game to initial state
  const resetGame = useCallback((mode = gameMode) => {
    setBoard(createEmptyBoard());
    setBoardPieces(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
    setUsedPieces([]);
    setCurrentPlayer(1);
    setGameOver(false);
    setWinner(null);
    setSelectedPiece(null);
    setRotation(0);
    setFlipped(false);
    setPendingMove(null);
    setMoveHistory([]);
    setIsAIThinking(false);
    setAiAnimatingMove(null);
    setPlayerAnimatingMove(null);
    setGameMode(mode);
  }, [gameMode]);

  // Set puzzle difficulty with ref and state
  const setPuzzleDifficulty = useCallback((diff) => {
    puzzleDifficultyRef.current = diff;
    setPuzzleDifficultyState(diff);
    console.log('Puzzle difficulty set to:', diff);
  }, []);

  // Commit a move to the board
  const commitMove = useCallback((row, col, piece, rot, flip) => {
    const pieceCoords = getPieceCoords(piece, rot, flip);
    if (!canPlacePiece(board, row, col, pieceCoords)) {
      console.log('Cannot place piece at', row, col);
      return false;
    }

    const { newBoard, newBoardPieces } = placePiece(
      board, boardPieces, row, col, piece, pieceCoords, currentPlayer
    );

    // Save state for undo
    const move = {
      player: currentPlayer,
      piece,
      row,
      col,
      rotation: rot,
      flipped: flip,
      board: board.map(r => [...r]),
      boardPieces: boardPieces.map(r => [...r])
    };

    setBoard(newBoard);
    setBoardPieces(newBoardPieces);
    setUsedPieces(prev => [...prev, piece]);
    setMoveHistory(prev => [...prev, move]);
    setSelectedPiece(null);
    setRotation(0);
    setFlipped(false);
    setPendingMove(null);

    const newUsedPieces = [...usedPieces, piece];
    const nextPlayer = currentPlayer === 1 ? 2 : 1;
    
    // Check game over
    if (!canAnyPieceBePlaced(newBoard, newUsedPieces)) {
      setGameOver(true);
      setWinner(currentPlayer);
      soundManager.playWin();
    } else {
      setCurrentPlayer(nextPlayer);
    }
    
    return true;
  }, [board, boardPieces, currentPlayer, usedPieces]);

  // Handle cell click
  const handleCellClick = useCallback((row, col) => {
    if (gameOver) return;
    if ((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2) return;
    
    const piece = pendingMove ? pendingMove.piece : selectedPiece;
    if (!piece) return;
    
    // Set pending move (for preview)
    setPendingMove({ piece, row, col });
  }, [gameOver, gameMode, currentPlayer, pendingMove, selectedPiece]);

  // Select a piece
  const selectPiece = useCallback((piece) => {
    if (gameOver) return;
    if ((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2) return;
    if (usedPieces.includes(piece)) return;
    
    soundManager.playPieceSelect();
    setSelectedPiece(piece);
    setPendingMove(null);
  }, [gameOver, gameMode, currentPlayer, usedPieces]);

  // Rotate piece
  const rotatePiece = useCallback(() => {
    if (!selectedPiece && !pendingMove) return;
    soundManager.playPieceRotate();
    setRotation(r => (r + 1) % 4);
  }, [selectedPiece, pendingMove]);

  // Flip piece
  const flipPiece = useCallback(() => {
    if (!selectedPiece && !pendingMove) return;
    soundManager.playPieceFlip();
    setFlipped(f => !f);
  }, [selectedPiece, pendingMove]);

  // Move pending piece - FIXED: Use playClickSound('move') instead of playMove()
  const movePendingPiece = useCallback((dir) => {
    if (!pendingMove) return;
    
    // FIXED: soundManager.playMove() doesn't exist, use playClickSound('move')
    soundManager.playClickSound('move');
    
    let { row, col } = pendingMove;
    switch (dir) {
      case 'up': row = Math.max(0, row - 1); break;
      case 'down': row = Math.min(BOARD_SIZE - 1, row + 1); break;
      case 'left': col = Math.max(0, col - 1); break;
      case 'right': col = Math.min(BOARD_SIZE - 1, col + 1); break;
      default: break;
    }
    
    setPendingMove({ ...pendingMove, row, col });
  }, [pendingMove]);

  // Confirm pending move
  const confirmMove = useCallback(() => {
    if (!pendingMove) return;
    
    const coords = getPieceCoords(pendingMove.piece, rotation, flipped);
    if (!canPlacePiece(board, pendingMove.row, pendingMove.col, coords)) {
      soundManager.playInvalid();
      return;
    }
    
    soundManager.playConfirm();
    
    // Animate player piece placement
    setPlayerAnimatingMove({
      piece: pendingMove.piece,
      row: pendingMove.row,
      col: pendingMove.col,
      rot: rotation,
      flip: flipped,
      phase: 'placing'
    });
    
    // Commit after brief animation
    setTimeout(() => {
      setPlayerAnimatingMove(null);
      commitMove(pendingMove.row, pendingMove.col, pendingMove.piece, rotation, flipped);
    }, 300);
  }, [pendingMove, rotation, flipped, board, commitMove]);

  // Cancel pending move
  const cancelMove = useCallback(() => {
    soundManager.playCancel();
    setPendingMove(null);
    setSelectedPiece(null);
    setRotation(0);
    setFlipped(false);
  }, []);

  // Make AI move with DELAY for realistic turn-based gameplay
  const makeAIMove = useCallback(async () => {
    if (gameOver || currentPlayer !== 2) return;
    
    setIsAIThinking(true);
    
    try {
      // UPDATED: Add delay before AI starts thinking (1.5 seconds)
      // This makes the turn-based gameplay feel more realistic
      await new Promise(r => setTimeout(r, AI_MOVE_DELAY));
      
      // Check if game state changed during delay
      if (gameOver) {
        setIsAIThinking(false);
        return;
      }
      
      const difficulty = gameMode === 'puzzle' ? puzzleDifficultyRef.current : 'medium';
      const move = await getAIMove(board, usedPieces, difficulty);
      
      if (move) {
        // Animate AI piece placement
        setAiAnimatingMove({
          piece: move.piece,
          row: move.row,
          col: move.col,
          rot: move.rotation,
          flip: move.flipped
        });
        
        // Brief delay to show animation
        await new Promise(r => setTimeout(r, 500));
        
        setAiAnimatingMove(null);
        
        const pieceCoords = getPieceCoords(move.piece, move.rotation, move.flipped);
        const { newBoard, newBoardPieces } = placePiece(
          board, boardPieces, move.row, move.col, move.piece, pieceCoords, 2
        );
        
        setBoard(newBoard);
        setBoardPieces(newBoardPieces);
        setUsedPieces(prev => [...prev, move.piece]);
        
        const newUsedPieces = [...usedPieces, move.piece];
        
        // Check game over
        if (!canAnyPieceBePlaced(newBoard, newUsedPieces)) {
          setGameOver(true);
          setWinner(2);
          soundManager.playLose();
        } else {
          setCurrentPlayer(1);
        }
      } else {
        // AI can't move - player wins
        setGameOver(true);
        setWinner(1);
        soundManager.playWin();
      }
    } catch (err) {
      console.error('AI move error:', err);
    }
    
    setIsAIThinking(false);
  }, [board, boardPieces, usedPieces, gameOver, currentPlayer, gameMode]);

  // Undo last move
  const undoMove = useCallback(() => {
    if (moveHistory.length === 0) return;
    
    const lastMove = moveHistory[moveHistory.length - 1];
    setBoard(lastMove.board);
    setBoardPieces(lastMove.boardPieces);
    setUsedPieces(prev => prev.filter(p => p !== lastMove.piece));
    setCurrentPlayer(lastMove.player);
    setMoveHistory(prev => prev.slice(0, -1));
    setGameOver(false);
    setWinner(null);
    setPendingMove(null);
    setSelectedPiece(null);
  }, [moveHistory]);

  // Load a puzzle state
  const loadPuzzle = useCallback((puzzleState) => {
    if (!puzzleState) return;
    
    setBoard(puzzleState.board.map(row => [...row]));
    setBoardPieces(puzzleState.boardPieces.map(row => [...row]));
    setUsedPieces([...puzzleState.usedPieces]);
    setCurrentPlayer(1);
    setGameOver(false);
    setWinner(null);
    setSelectedPiece(null);
    setRotation(0);
    setFlipped(false);
    setPendingMove(null);
    setMoveHistory([]);
    setGameMode('puzzle');
  }, []);

  return {
    // State
    board,
    boardPieces,
    usedPieces,
    currentPlayer,
    gameOver,
    winner,
    gameMode,
    selectedPiece,
    rotation,
    flipped,
    pendingMove,
    moveHistory,
    isAIThinking,
    aiAnimatingMove,
    playerAnimatingMove,
    puzzleDifficulty: puzzleDifficultyState,
    
    // Actions
    resetGame,
    setGameMode,
    setPuzzleDifficulty,
    handleCellClick,
    selectPiece,
    rotatePiece,
    flipPiece,
    movePendingPiece,
    confirmMove,
    cancelMove,
    makeAIMove,
    undoMove,
    loadPuzzle,
    
    // Direct setters for special cases
    setBoard,
    setBoardPieces,
    setUsedPieces,
    setCurrentPlayer,
    setGameOver,
    setWinner,
    setSelectedPiece,
    setRotation,
    setFlipped,
    setPendingMove,
  };
};

export default useGameState;
