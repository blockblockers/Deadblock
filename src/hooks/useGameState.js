// useGameState.js - Custom hook for managing local game state
// CRITICAL: This hook must export startNewGame, setGameMode, and all other functions App.jsx needs
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  createEmptyBoard, 
  getPieceCoords, 
  canPlacePiece, 
  canAnyPieceBePlaced,
  isWithinBounds,
  placePiece,
  BOARD_SIZE 
} from '../utils/gameLogic';
import { selectAIMove, getAllPossibleMoves, AI_DIFFICULTY } from '../utils/aiLogic';
import { getRandomPuzzle, PUZZLE_DIFFICULTY } from '../utils/puzzleGenerator';
import { soundManager } from '../utils/soundManager';
import { statsService } from '../utils/statsService';

// AI delay in milliseconds for realistic turn-based gameplay
const AI_MOVE_DELAY = 1500;

export const useGameState = () => {
  // Core game state
  const [board, setBoard] = useState(() => createEmptyBoard());
  const [boardPieces, setBoardPieces] = useState(() => createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [usedPieces, setUsedPieces] = useState([]);
  const [moveHistory, setMoveHistory] = useState([]);
  
  // Mode and UI state
  const [gameMode, setGameMode] = useState(null);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [pendingMove, setPendingMove] = useState(null);
  const [currentPuzzle, setCurrentPuzzle] = useState(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState(AI_DIFFICULTY.AVERAGE);
  const [isGeneratingPuzzle, setIsGeneratingPuzzle] = useState(false);
  const [aiAnimatingMove, setAiAnimatingMove] = useState(null);
  const [playerAnimatingMove, setPlayerAnimatingMove] = useState(null);
  
  // Puzzle difficulty state
  const puzzleDifficultyRef = useRef(PUZZLE_DIFFICULTY.EASY);
  const [puzzleDifficulty, setPuzzleDifficultyState] = useState(PUZZLE_DIFFICULTY.EASY);
  
  // AI goes first preference for VS AI mode
  const aiGoesFirstRef = useRef(false);
  
  // Store original puzzle state for retry functionality
  const [originalPuzzleState, setOriginalPuzzleState] = useState(null);
  
  // Wrapper to update both ref and state for puzzle difficulty
  const setPuzzleDifficulty = useCallback((diff) => {
    puzzleDifficultyRef.current = diff;
    setPuzzleDifficultyState(diff);
  }, []);

  // Select a piece from the tray
  const selectPiece = useCallback((piece) => {
    if (usedPieces.includes(piece)) return;
    if (gameOver) return;
    
    setSelectedPiece(piece);
    setPendingMove(null);
    soundManager.playPieceSelect();
  }, [usedPieces, gameOver]);

  // Rotate the selected piece
  const rotatePiece = useCallback(() => {
    if (!selectedPiece && !pendingMove) return;
    setRotation(r => (r + 1) % 4);
    soundManager.playPieceRotate();
  }, [selectedPiece, pendingMove]);

  // Flip the selected piece
  const flipPiece = useCallback(() => {
    if (!selectedPiece && !pendingMove) return;
    setFlipped(f => !f);
    soundManager.playPieceFlip();
  }, [selectedPiece, pendingMove]);

  // Handle cell click - place or move piece
  const handleCellClick = useCallback((row, col) => {
    if (gameOver) return;
    if ((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2) return;
    
    const piece = pendingMove ? pendingMove.piece : selectedPiece;
    if (!piece) return;
    
    setPendingMove({ piece, row, col });
    soundManager.playClickSound('place');
  }, [gameOver, gameMode, currentPlayer, selectedPiece, pendingMove]);

  // Move pending piece with D-pad
  const movePendingPiece = useCallback((direction) => {
    if (!pendingMove) return;
    
    const deltas = {
      up: [-1, 0],
      down: [1, 0],
      left: [0, -1],
      right: [0, 1],
    };
    
    const [dRow, dCol] = deltas[direction] || [0, 0];
    const newRow = Math.max(0, Math.min(BOARD_SIZE - 1, pendingMove.row + dRow));
    const newCol = Math.max(0, Math.min(BOARD_SIZE - 1, pendingMove.col + dCol));
    
    setPendingMove({ ...pendingMove, row: newRow, col: newCol });
    soundManager.playClickSound('move');
  }, [pendingMove]);

  // Confirm the pending move
  const confirmMove = useCallback(() => {
    if (!pendingMove) return;
    
    const coords = getPieceCoords(pendingMove.piece, rotation, flipped);
    
    if (!canPlacePiece(board, pendingMove.row, pendingMove.col, coords)) {
      soundManager.playInvalid();
      return;
    }
    
    // Animate player piece placement
    setPlayerAnimatingMove({
      piece: pendingMove.piece,
      row: pendingMove.row,
      col: pendingMove.col,
      rotation,
      flipped,
    });
    
    soundManager.playConfirm();
    
    // Commit move after brief animation
    setTimeout(() => {
      // Place the piece
      const { newBoard, newBoardPieces } = placePiece(
        board,
        boardPieces,
        pendingMove.row,
        pendingMove.col,
        pendingMove.piece,
        coords,
        currentPlayer
      );
      
      // Save to history
      const move = {
        player: currentPlayer,
        piece: pendingMove.piece,
        row: pendingMove.row,
        col: pendingMove.col,
        rotation,
        flipped,
        board: board.map(r => [...r]),
        boardPieces: boardPieces.map(r => [...r]),
      };
      
      setBoard(newBoard);
      setBoardPieces(newBoardPieces);
      setUsedPieces(prev => [...prev, pendingMove.piece]);
      setMoveHistory(prev => [...prev, move]);
      setSelectedPiece(null);
      setRotation(0);
      setFlipped(false);
      setPendingMove(null);
      setPlayerAnimatingMove(null);
      
      // Check for game over
      const newUsedPieces = [...usedPieces, pendingMove.piece];
      if (!canAnyPieceBePlaced(newBoard, newUsedPieces)) {
        setGameOver(true);
        setWinner(currentPlayer);
        soundManager.playWin();
      } else {
        setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
      }
    }, 200);
  }, [pendingMove, rotation, flipped, board, boardPieces, currentPlayer, usedPieces]);

  // Cancel the pending move
  const cancelMove = useCallback(() => {
    setPendingMove(null);
    setSelectedPiece(null);
    setRotation(0);
    setFlipped(false);
    soundManager.playCancel();
  }, []);

  // AI Move logic
  const makeAIMove = useCallback(async () => {
    if (gameOver || currentPlayer !== 2) return;
    if (gameMode !== 'ai' && gameMode !== 'puzzle') return;
    
    setIsAIThinking(true);
    
    // Add delay for realistic gameplay
    await new Promise(resolve => setTimeout(resolve, AI_MOVE_DELAY));
    
    try {
      const move = await selectAIMove(board, boardPieces, usedPieces, aiDifficulty);
      
      if (!move) {
        // AI can't move - player wins
        setIsAIThinking(false);
        setGameOver(true);
        setWinner(1);
        soundManager.playWin();
        return;
      }
      
      // Animate AI move
      setAiAnimatingMove({
        piece: move.pieceType,
        row: move.row,
        col: move.col,
        rotation: move.rot,
        flipped: move.flip,
      });
      
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Place the piece
      const coords = getPieceCoords(move.pieceType, move.rot, move.flip);
      const { newBoard, newBoardPieces } = placePiece(
        board,
        boardPieces,
        move.row,
        move.col,
        move.pieceType,
        coords,
        2
      );
      
      setBoard(newBoard);
      setBoardPieces(newBoardPieces);
      setUsedPieces(prev => [...prev, move.pieceType]);
      setAiAnimatingMove(null);
      
      // Check for game over
      const newUsedPieces = [...usedPieces, move.pieceType];
      if (!canAnyPieceBePlaced(newBoard, newUsedPieces)) {
        setGameOver(true);
        setWinner(2);
        soundManager.playLose();
      } else {
        setCurrentPlayer(1);
      }
    } catch (err) {
      console.error('AI move error:', err);
    }
    
    setIsAIThinking(false);
  }, [board, boardPieces, usedPieces, gameOver, currentPlayer, gameMode, aiDifficulty]);

  // Trigger AI move when it's AI's turn
  useEffect(() => {
    if ((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2 && !gameOver && !isAIThinking) {
      makeAIMove();
    }
  }, [currentPlayer, gameMode, gameOver, isAIThinking, makeAIMove]);

  // Record game stats when game ends
  useEffect(() => {
    if (gameOver && winner !== null) {
      const playerWon = winner === 1;
      
      if (gameMode === 'ai') {
        const difficultyMap = {
          [AI_DIFFICULTY.RANDOM]: 'beginner',
          [AI_DIFFICULTY.AVERAGE]: 'intermediate',
          [AI_DIFFICULTY.PROFESSIONAL]: 'expert',
        };
        const difficultyString = difficultyMap[aiDifficulty] || 'intermediate';
        statsService.recordAIGameResult(difficultyString, playerWon);
      } else if (gameMode === 'puzzle' && currentPuzzle) {
        const difficultyMap = {
          [PUZZLE_DIFFICULTY.EASY]: 'easy',
          [PUZZLE_DIFFICULTY.MEDIUM]: 'medium',
          [PUZZLE_DIFFICULTY.HARD]: 'hard',
        };
        const difficultyString = difficultyMap[puzzleDifficulty] || 'easy';
        statsService.recordPuzzleResult(difficultyString, playerWon);
      }
    }
  }, [gameOver, winner, gameMode, aiDifficulty, puzzleDifficulty, currentPuzzle]);

  // Internal puzzle loading
  const loadPuzzleInternal = useCallback((puzzle) => {
    if (!puzzle) {
      console.error('loadPuzzleInternal: No puzzle provided');
      return;
    }
    
    console.log('Loading puzzle:', puzzle.name, 'difficulty:', puzzle.difficulty);
    
    // Parse the board state
    const newBoard = createEmptyBoard();
    const newBoardPieces = createEmptyBoard();
    
    for (let i = 0; i < 64; i++) {
      const char = puzzle.boardState[i];
      if (char !== 'G') {
        const row = Math.floor(i / 8);
        const col = i % 8;
        newBoard[row][col] = 1;
        newBoardPieces[row][col] = char === 'H' ? 'Y' : char;
      }
    }
    
    // Store original state for retry
    setOriginalPuzzleState({
      board: newBoard.map(r => [...r]),
      boardPieces: newBoardPieces.map(r => [...r]),
      usedPieces: [...puzzle.usedPieces],
      puzzle: { ...puzzle }
    });
    
    if (puzzle.difficulty) {
      setPuzzleDifficulty(puzzle.difficulty);
    }
    
    setBoard(newBoard);
    setBoardPieces(newBoardPieces);
    setUsedPieces(puzzle.usedPieces);
    setCurrentPuzzle(puzzle);
    setGameMode('puzzle');
    setCurrentPlayer(1);
    setSelectedPiece(null);
    setRotation(0);
    setFlipped(false);
    setMoveHistory([]);
    setPendingMove(null);
    setGameOver(false);
    setWinner(null);
    setIsGeneratingPuzzle(false);
    
    soundManager.playButtonClick();
  }, [setPuzzleDifficulty]);

  // Generate and load puzzle
  const generateAndLoadPuzzle = useCallback(async (difficulty) => {
    setIsGeneratingPuzzle(true);
    
    try {
      const puzzle = await getRandomPuzzle(difficulty);
      if (puzzle) {
        loadPuzzleInternal(puzzle);
      } else {
        console.error('Puzzle generation returned null');
        setIsGeneratingPuzzle(false);
      }
    } catch (error) {
      console.error('Puzzle generation error:', error);
      setIsGeneratingPuzzle(false);
    }
  }, [loadPuzzleInternal]);

  // Public loadPuzzle - receives puzzle from PuzzleSelect
  const loadPuzzle = useCallback((puzzle) => {
    if (puzzle?.boardState) {
      loadPuzzleInternal(puzzle);
    } else if (puzzle?.difficulty) {
      generateAndLoadPuzzle(puzzle.difficulty);
    } else {
      generateAndLoadPuzzle(puzzleDifficultyRef.current);
    }
  }, [loadPuzzleInternal, generateAndLoadPuzzle]);

  // Reset current puzzle to original state (retry)
  const resetCurrentPuzzle = useCallback(() => {
    if (!originalPuzzleState) {
      console.log('No original puzzle state to reset to');
      return;
    }
    
    console.log('Resetting puzzle to original state');
    
    setBoard(originalPuzzleState.board.map(r => [...r]));
    setBoardPieces(originalPuzzleState.boardPieces.map(r => [...r]));
    setUsedPieces([...originalPuzzleState.usedPieces]);
    setCurrentPuzzle(originalPuzzleState.puzzle);
    setCurrentPlayer(1);
    setSelectedPiece(null);
    setRotation(0);
    setFlipped(false);
    setMoveHistory([]);
    setPendingMove(null);
    setGameOver(false);
    setWinner(null);
    
    soundManager.playButtonClick();
  }, [originalPuzzleState]);

  // Reset game - preserves AI goes first preference for VS AI mode
  const resetGame = useCallback(() => {
    if (gameMode === 'puzzle') {
      console.log('Reset: generating new puzzle with difficulty:', puzzleDifficultyRef.current);
      generateAndLoadPuzzle(puzzleDifficultyRef.current);
    } else if (gameMode === 'ai') {
      console.log('Reset: starting new AI game, aiGoesFirst:', aiGoesFirstRef.current);
      setBoard(createEmptyBoard());
      setBoardPieces(createEmptyBoard());
      setCurrentPlayer(aiGoesFirstRef.current ? 2 : 1);
      setSelectedPiece(null);
      setRotation(0);
      setFlipped(false);
      setGameOver(false);
      setWinner(null);
      setUsedPieces([]);
      setMoveHistory([]);
      setPendingMove(null);
    } else {
      // Regular reset for 2player mode
      setBoard(createEmptyBoard());
      setBoardPieces(createEmptyBoard());
      setCurrentPlayer(1);
      setSelectedPiece(null);
      setRotation(0);
      setFlipped(false);
      setGameOver(false);
      setWinner(null);
      setUsedPieces([]);
      setMoveHistory([]);
      setPendingMove(null);
    }
  }, [gameMode, generateAndLoadPuzzle]);

  // Start new game - CRITICAL: This is called by App.jsx handleStartGame for '2player' mode
  const startNewGame = useCallback((mode, aiGoesFirst = false) => {
    console.log('startNewGame called:', mode, 'aiGoesFirst:', aiGoesFirst);
    
    // Store AI goes first preference
    if (mode === 'ai') {
      aiGoesFirstRef.current = aiGoesFirst;
    }
    
    setGameMode(mode);
    setBoard(createEmptyBoard());
    setBoardPieces(createEmptyBoard());
    setCurrentPlayer(mode === 'ai' && aiGoesFirst ? 2 : 1);
    setSelectedPiece(null);
    setRotation(0);
    setFlipped(false);
    setGameOver(false);
    setWinner(null);
    setUsedPieces([]);
    setMoveHistory([]);
    setPendingMove(null);
    setCurrentPuzzle(null);
    setOriginalPuzzleState(null);
    
    soundManager.playButtonClick();
  }, []);

  // Undo last move
  const undoMove = useCallback(() => {
    if (moveHistory.length === 0) return;
    
    const lastMove = moveHistory[moveHistory.length - 1];
    
    setBoard(lastMove.board);
    setBoardPieces(lastMove.boardPieces);
    setUsedPieces(prev => prev.slice(0, -1));
    setMoveHistory(prev => prev.slice(0, -1));
    setCurrentPlayer(lastMove.player);
    setGameOver(false);
    setWinner(null);
    
    soundManager.playCancel();
  }, [moveHistory]);

  return {
    // State
    board,
    boardPieces,
    currentPlayer,
    selectedPiece,
    rotation,
    flipped,
    gameOver,
    winner,
    usedPieces,
    moveHistory,
    gameMode,
    isAIThinking,
    pendingMove,
    currentPuzzle,
    showHowToPlay,
    showSettings,
    aiDifficulty,
    puzzleDifficulty,
    isGeneratingPuzzle,
    aiAnimatingMove,
    playerAnimatingMove,
    
    // Setters - CRITICAL: These must be exported for App.jsx
    setGameMode,
    setShowHowToPlay,
    setShowSettings,
    setAiDifficulty,
    setPuzzleDifficulty,
    
    // Actions - CRITICAL: startNewGame must be exported
    handleCellClick,
    selectPiece,
    rotatePiece,
    flipPiece,
    movePendingPiece,
    confirmMove,
    cancelMove,
    resetGame,
    startNewGame,
    undoMove,
    loadPuzzle,
    resetCurrentPuzzle,
  };
};

export default useGameState;
