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
const AI_MOVE_DELAY = 1500; // 1.5 seconds delay before AI moves

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
  const [aiAnimatingMove, setAiAnimatingMove] = useState(null); // For AI piece placement animation
  const [playerAnimatingMove, setPlayerAnimatingMove] = useState(null); // For player piece placement animation
  
  // Use ref to persist puzzle difficulty across resets
  const puzzleDifficultyRef = useRef(PUZZLE_DIFFICULTY.EASY);
  const [puzzleDifficulty, setPuzzleDifficultyState] = useState(PUZZLE_DIFFICULTY.EASY);
  
  // UPDATED: Track AI goes first preference for VS AI mode
  const aiGoesFirstRef = useRef(false);
  
  // Store original puzzle state for retry functionality
  const [originalPuzzleState, setOriginalPuzzleState] = useState(null);
  
  // Wrapper to update both ref and state
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
    soundManager.playRotate();
    setRotation(r => (r + 1) % 4);
  }, [selectedPiece, pendingMove]);

  // Flip piece
  const flipPiece = useCallback(() => {
    if (!selectedPiece && !pendingMove) return;
    soundManager.playFlip();
    setFlipped(f => !f);
  }, [selectedPiece, pendingMove]);

  // Move pending piece
  const movePendingPiece = useCallback((dir) => {
    if (!pendingMove) return;
    
    soundManager.playMove();
    
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
      
      const difficulty = gameMode === 'puzzle' ? AI_DIFFICULTY.RANDOM : aiDifficulty;
      const move = await selectAIMove(board, boardPieces, usedPieces, difficulty);
      
      if (move) {
        // Show AI animating to position
        setAiAnimatingMove({
          piece: move.pieceType,
          row: move.row,
          col: move.col,
          rot: move.rot,
          flip: move.flip,
          phase: 'placing' // Animation phase
        });
        
        // Play sound for AI selecting piece
        soundManager.playPieceSelect();
        
        // Wait for animation to play
        await new Promise(r => setTimeout(r, 600));
        
        // Clear animation and commit the move
        setAiAnimatingMove(null);
        commitMove(move.row, move.col, move.pieceType, move.rot, move.flip);
      }
    } catch (e) {
      console.error('AI move error:', e);
      setAiAnimatingMove(null);
    }
    
    setIsAIThinking(false);
  }, [board, boardPieces, usedPieces, aiDifficulty, gameMode, gameOver, currentPlayer, commitMove]);

  // Trigger AI move
  useEffect(() => {
    if ((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2 && !gameOver && !isAIThinking) {
      makeAIMove();
    }
  }, [currentPlayer, gameMode, gameOver, isAIThinking, makeAIMove]);

  // Record stats when AI game ends
  useEffect(() => {
    if (gameOver && winner !== null) {
      // Player 1 is human, Player 2 is AI
      const playerWon = winner === 1;
      
      if (gameMode === 'ai') {
        // Map AI difficulty to string for stats
        const difficultyMap = {
          [AI_DIFFICULTY.RANDOM]: 'easy',
          [AI_DIFFICULTY.AVERAGE]: 'medium',
          [AI_DIFFICULTY.PROFESSIONAL]: 'hard',
        };
        const difficultyString = difficultyMap[aiDifficulty] || 'medium';
        
        console.log('[Stats] Recording AI game result:', difficultyString, playerWon ? 'win' : 'loss');
        statsService.recordAIGameResult(difficultyString, playerWon);
      } else if (gameMode === 'puzzle' && currentPuzzle) {
        // Record puzzle attempt
        const difficultyMap = {
          [PUZZLE_DIFFICULTY.EASY]: 'easy',
          [PUZZLE_DIFFICULTY.MEDIUM]: 'medium',
          [PUZZLE_DIFFICULTY.HARD]: 'hard',
        };
        const difficultyString = difficultyMap[puzzleDifficulty] || 'easy';
        
        console.log('[Stats] Recording puzzle result:', difficultyString, playerWon ? 'win' : 'loss');
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
      if (char !== 'G') { // G = empty (Gap)
        const row = Math.floor(i / 8);
        const col = i % 8;
        newBoard[row][col] = 1; // All pre-placed pieces show as player 1
        newBoardPieces[row][col] = char === 'H' ? 'Y' : char; // H is legacy for Y piece
      }
    }
    
    // Store original state for retry
    setOriginalPuzzleState({
      board: newBoard.map(r => [...r]),
      boardPieces: newBoardPieces.map(r => [...r]),
      usedPieces: [...puzzle.usedPieces],
      puzzle: { ...puzzle }
    });
    
    // Set difficulty from puzzle
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
      // Puzzle already generated, just load it
      loadPuzzleInternal(puzzle);
    } else if (puzzle?.difficulty) {
      // Generate with specified difficulty
      generateAndLoadPuzzle(puzzle.difficulty);
    } else {
      // Fallback: generate with current difficulty
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

  // UPDATED: Reset game - preserves AI goes first preference for VS AI mode
  const resetGame = useCallback(() => {
    if (gameMode === 'puzzle') {
      // Generate new puzzle with SAME difficulty
      console.log('Reset: generating new puzzle with difficulty:', puzzleDifficultyRef.current);
      generateAndLoadPuzzle(puzzleDifficultyRef.current);
    } else if (gameMode === 'ai') {
      // UPDATED: Preserve AI goes first preference when starting new game
      console.log('Reset: starting new AI game, aiGoesFirst:', aiGoesFirstRef.current);
      setBoard(createEmptyBoard());
      setBoardPieces(createEmptyBoard());
      // Use the stored preference for who goes first
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

  // UPDATED: Start new game - stores AI goes first preference
  const startNewGame = useCallback((mode, aiGoesFirst = false) => {
    // Store the preference for later resets
    if (mode === 'ai') {
      aiGoesFirstRef.current = aiGoesFirst;
      console.log('Starting AI game, storing aiGoesFirst:', aiGoesFirst);
    }
    
    setGameMode(mode);
    setBoard(createEmptyBoard());
    setBoardPieces(createEmptyBoard());
    // If AI goes first in AI mode, set currentPlayer to 2
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
    
    // Setters
    setGameMode,
    setShowHowToPlay,
    setShowSettings,
    setAiDifficulty,
    setPuzzleDifficulty,
    
    // Actions
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
