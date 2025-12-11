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
    
    const piece = pendingMove ? (selectedPiece || pendingMove.piece) : selectedPiece;
    if (!piece) return;

    const pieceCoords = getPieceCoords(piece, rotation, flipped);
    setPendingMove({ row, col, piece, rotation, flipped });
    
    if (isWithinBounds(row, col, pieceCoords)) {
      soundManager.playPieceMove();
    } else {
      soundManager.playError();
    }
  }, [gameOver, gameMode, currentPlayer, pendingMove, selectedPiece, rotation, flipped]);

  // Confirm pending move
  const confirmMove = useCallback(() => {
    if (!pendingMove) return;
    
    // Set player animating move before committing
    setPlayerAnimatingMove({
      piece: pendingMove.piece,
      row: pendingMove.row,
      col: pendingMove.col,
      rot: rotation,
      flip: flipped
    });
    
    const success = commitMove(pendingMove.row, pendingMove.col, pendingMove.piece, rotation, flipped);
    if (success) {
      soundManager.playConfirm();
      // Clear animation after a short delay
      setTimeout(() => setPlayerAnimatingMove(null), 500);
    } else {
      setPlayerAnimatingMove(null);
    }
  }, [pendingMove, rotation, flipped, commitMove]);

  // Cancel pending move
  const cancelMove = useCallback(() => {
    setPendingMove(null);
    setSelectedPiece(null);
    setRotation(0);
    setFlipped(false);
    soundManager.playCancel();
  }, []);

  // Move pending piece
  const movePendingPiece = useCallback((direction) => {
    if (!pendingMove) return;
    
    let newRow = pendingMove.row;
    let newCol = pendingMove.col;
    
    if (direction === 'up') newRow--;
    else if (direction === 'down') newRow++;
    else if (direction === 'left') newCol--;
    else if (direction === 'right') newCol++;

    const pieceCoords = getPieceCoords(pendingMove.piece, rotation, flipped);
    
    const hasAnyCellOnBoard = pieceCoords.some(([dx, dy]) => {
      const r = newRow + dy, c = newCol + dx;
      return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
    });
    
    if (hasAnyCellOnBoard) {
      setPendingMove({ ...pendingMove, row: newRow, col: newCol });
      if (isWithinBounds(newRow, newCol, pieceCoords)) {
        soundManager.playPieceMove();
      } else {
        soundManager.playError();
      }
    }
  }, [pendingMove, rotation, flipped]);

  // Undo last move
  const undoMove = useCallback(() => {
    if (moveHistory.length === 0 || gameOver) return;
    
    const lastMove = moveHistory[moveHistory.length - 1];
    setBoard(lastMove.board);
    setBoardPieces(lastMove.boardPieces);
    setUsedPieces(prev => prev.slice(0, -1));
    setMoveHistory(prev => prev.slice(0, -1));
    setCurrentPlayer(lastMove.player);
    setSelectedPiece(null);
    setRotation(0);
    setFlipped(false);
    setPendingMove(null);
  }, [moveHistory, gameOver]);

  // AI move
  const makeAIMove = useCallback(async () => {
    const possibleMoves = getAllPossibleMoves(board, usedPieces);
    
    if (possibleMoves.length === 0) {
      setGameOver(true);
      setWinner(1);
      return;
    }

    setIsAIThinking(true);
    
    try {
      const move = await selectAIMove(board, boardPieces, usedPieces, aiDifficulty);
      await new Promise(r => setTimeout(r, 300)); // Shorter thinking delay
      
      if (move) {
        // Start animation - show piece moving to position
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
  }, [board, boardPieces, usedPieces, aiDifficulty, commitMove]);

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
          [AI_DIFFICULTY.EASY]: 'easy',
          [AI_DIFFICULTY.AVERAGE]: 'medium',
          [AI_DIFFICULTY.HARD]: 'hard',
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
        
        console.log('[Stats] Recording puzzle result:', difficultyString, playerWon ? 'solved' : 'failed');
        statsService.recordPuzzleAttempt(difficultyString);
        if (playerWon) {
          statsService.recordPuzzleSolved(difficultyString);
        }
      } else if (gameMode === '2player') {
        // Record local multiplayer game
        console.log('[Stats] Recording local game');
        statsService.recordLocalGame();
      }
    }
  }, [gameOver, gameMode, winner, aiDifficulty, currentPuzzle, puzzleDifficulty]);

  // Load puzzle from data
  const loadPuzzleInternal = useCallback((puzzle) => {
    console.log('Loading puzzle:', puzzle?.id, 'difficulty:', puzzle?.difficulty);
    
    if (!puzzle || !puzzle.boardState || puzzle.boardState.length !== 64) {
      console.error('Invalid puzzle data');
      setIsGeneratingPuzzle(false);
      return;
    }

    try {
      const newBoard = createEmptyBoard();
      const newBoardPieces = createEmptyBoard();

      for (let i = 0; i < 64; i++) {
        const char = puzzle.boardState[i];
        if (char !== 'G') {
          const row = Math.floor(i / BOARD_SIZE);
          const col = i % BOARD_SIZE;
          newBoard[row][col] = 1;
          newBoardPieces[row][col] = char === 'H' ? 'Y' : char;
        }
      }
      
      // Store original state for retry functionality
      setOriginalPuzzleState({
        board: newBoard.map(r => [...r]),
        boardPieces: newBoardPieces.map(r => [...r]),
        usedPieces: puzzle.usedPieces ? [...puzzle.usedPieces] : [],
        puzzle: { ...puzzle }
      });
      
      setBoard(newBoard);
      setBoardPieces(newBoardPieces);
      setUsedPieces(puzzle.usedPieces ? [...puzzle.usedPieces] : []);
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
      
      // Store the difficulty for reset
      if (puzzle.difficulty) {
        setPuzzleDifficulty(puzzle.difficulty);
      }
      
      console.log('Puzzle loaded successfully, difficulty:', puzzle.difficulty);
    } catch (error) {
      console.error('Error loading puzzle:', error);
      setIsGeneratingPuzzle(false);
    }
  }, [setPuzzleDifficulty]);

  // Generate and load a new puzzle with specific difficulty
  const generateAndLoadPuzzle = useCallback(async (difficulty) => {
    // Use provided difficulty, or fall back to stored difficulty
    const diffToUse = difficulty || puzzleDifficultyRef.current;
    console.log('Generating new puzzle with difficulty:', diffToUse);
    
    setIsGeneratingPuzzle(true);
    
    try {
      const puzzle = await getRandomPuzzle(diffToUse, false, (current, total) => {
        console.log(`Progress: ${current}/${total}`);
      });
      
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

  // Reset game - uses stored difficulty for puzzles
  const resetGame = useCallback(() => {
    if (gameMode === 'puzzle') {
      // Generate new puzzle with SAME difficulty
      console.log('Reset: generating new puzzle with difficulty:', puzzleDifficultyRef.current);
      generateAndLoadPuzzle(puzzleDifficultyRef.current);
    } else {
      // Regular reset
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

  // Start new game
  const startNewGame = useCallback((mode, aiGoesFirst = false) => {
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
  }, []);

  // Select piece
  const selectPiece = useCallback((piece) => {
    if (gameOver) return;
    if ((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2) return;
    if (usedPieces.includes(piece)) return;
    
    setSelectedPiece(piece);
    setRotation(0);
    setFlipped(false);
    setPendingMove(null);
    soundManager.playPieceSelect();
  }, [gameOver, gameMode, currentPlayer, usedPieces]);

  // Rotate piece
  const rotatePiece = useCallback(() => {
    setRotation(prev => (prev + 1) % 4);
    soundManager.playPieceRotate();
  }, []);

  // Flip piece
  const flipPiece = useCallback(() => {
    setFlipped(prev => !prev);
    soundManager.playPieceFlip();
  }, []);

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
    isGeneratingPuzzle,
    puzzleDifficulty,
    aiAnimatingMove,
    playerAnimatingMove,
    
    // Actions
    setGameMode,
    setShowHowToPlay,
    setShowSettings,
    setAiDifficulty,
    handleCellClick,
    confirmMove,
    cancelMove,
    movePendingPiece,
    undoMove,
    resetGame,
    loadPuzzle,
    startNewGame,
    selectPiece,
    rotatePiece,
    flipPiece,
    generateAndLoadPuzzle,
    resetCurrentPuzzle,
  };
};
