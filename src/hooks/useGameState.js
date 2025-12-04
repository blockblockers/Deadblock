import { useState, useEffect, useCallback } from 'react';
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
import { getRandomPuzzle } from '../utils/puzzleGenerator';
import { soundManager } from '../utils/soundManager';

export const useGameState = () => {
  const [board, setBoard] = useState(createEmptyBoard());
  const [boardPieces, setBoardPieces] = useState(createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [usedPieces, setUsedPieces] = useState([]);
  const [moveHistory, setMoveHistory] = useState([]);
  const [gameMode, setGameMode] = useState(null);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [pendingMove, setPendingMove] = useState(null);
  const [currentPuzzle, setCurrentPuzzle] = useState(null);
  const [puzzleDifficulty, setPuzzleDifficulty] = useState(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState(AI_DIFFICULTY.AVERAGE);
  const [isGeneratingPuzzle, setIsGeneratingPuzzle] = useState(false);

  // Commit a move to the board
  const commitMove = useCallback((row, col, piece, rot, flip) => {
    const pieceCoords = getPieceCoords(piece, rot, flip);
    if (!canPlacePiece(board, row, col, pieceCoords)) return false;

    const { newBoard, newBoardPieces } = placePiece(
      board, boardPieces, row, col, piece, pieceCoords, currentPlayer
    );

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
    
    // Check if game is over
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
    
    // Set pending move so user can see preview
    setPendingMove({ row, col, piece, rotation, flipped });
    
    if (isWithinBounds(row, col, pieceCoords)) {
      soundManager.playPieceMove();
    } else {
      soundManager.playError();
    }
  }, [gameOver, gameMode, currentPlayer, pendingMove, selectedPiece, rotation, flipped]);

  // Confirm pending move
  const confirmMove = useCallback(() => {
    if (pendingMove) {
      const success = commitMove(pendingMove.row, pendingMove.col, pendingMove.piece, rotation, flipped);
      if (success) {
        soundManager.playConfirm();
      }
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

  // Move pending piece with d-pad
  const movePendingPiece = useCallback((direction) => {
    if (!pendingMove) return;
    
    let newRow = pendingMove.row;
    let newCol = pendingMove.col;
    
    if (direction === 'up') newRow -= 1;
    else if (direction === 'down') newRow += 1;
    else if (direction === 'left') newCol -= 1;
    else if (direction === 'right') newCol += 1;

    const pieceCoords = getPieceCoords(pendingMove.piece, rotation, flipped);
    
    // Check if at least one cell would be on board
    const hasAnyCellOnBoard = pieceCoords.some(([dx, dy]) => {
      const cellRow = newRow + dy;
      const cellCol = newCol + dx;
      return cellRow >= 0 && cellRow < BOARD_SIZE && cellCol >= 0 && cellCol < BOARD_SIZE;
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

  // Make AI move
  const makeAIMove = useCallback(async () => {
    const possibleMoves = getAllPossibleMoves(board, usedPieces);
    
    if (possibleMoves.length === 0) {
      setGameOver(true);
      setWinner(1); // Player wins if AI can't move
      return;
    }

    setIsAIThinking(true);
    
    const move = await selectAIMove(board, boardPieces, usedPieces, aiDifficulty);
    
    // Small delay for UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (move) {
      commitMove(move.row, move.col, move.pieceType, move.rot, move.flip);
    }
    setIsAIThinking(false);
  }, [board, boardPieces, usedPieces, aiDifficulty, commitMove]);

  // AI move effect
  useEffect(() => {
    if ((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2 && !gameOver && !isAIThinking) {
      makeAIMove();
    }
  }, [currentPlayer, gameMode, gameOver, isAIThinking, makeAIMove]);

  // Load puzzle into game state
  const loadPuzzleInternal = useCallback((puzzle) => {
    console.log('Loading puzzle:', puzzle);
    
    try {
      const newBoard = createEmptyBoard();
      const newBoardPieces = createEmptyBoard();

      // Parse board state (64-character string)
      if (puzzle.boardState && puzzle.boardState.length === 64) {
        for (let i = 0; i < puzzle.boardState.length; i++) {
          const char = puzzle.boardState[i];
          if (char !== 'G') {
            const row = Math.floor(i / BOARD_SIZE);
            const col = i % BOARD_SIZE;
            newBoard[row][col] = 1;
            newBoardPieces[row][col] = char === 'H' ? 'Y' : char;
          }
        }
      }
      
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
      
      console.log('Puzzle loaded! Board pieces:', puzzle.usedPieces?.length || 0);
    } catch (error) {
      console.error('Error loading puzzle:', error);
      setIsGeneratingPuzzle(false);
    }
  }, []);

  // Generate and load a new puzzle
  const generateAndLoadPuzzle = useCallback(async () => {
    console.log('Generating new puzzle...');
    setIsGeneratingPuzzle(true);
    
    try {
      const puzzle = await getRandomPuzzle('easy', false, (current, total) => {
        console.log(`Progress: ${current}/${total}`);
      });
      
      if (puzzle) {
        loadPuzzleInternal(puzzle);
      } else {
        console.error('Puzzle generation returned null');
        setIsGeneratingPuzzle(false);
      }
    } catch (error) {
      console.error('Error generating puzzle:', error);
      setIsGeneratingPuzzle(false);
    }
  }, [loadPuzzleInternal]);

  // Public load puzzle function
  const loadPuzzle = useCallback((puzzle) => {
    if (puzzle && puzzle.boardState) {
      // Puzzle already generated, just load it
      loadPuzzleInternal(puzzle);
    } else {
      // Generate new puzzle
      generateAndLoadPuzzle();
    }
  }, [loadPuzzleInternal, generateAndLoadPuzzle]);

  // Reset game
  const resetGame = useCallback(() => {
    if (gameMode === 'puzzle') {
      // Generate new puzzle
      generateAndLoadPuzzle();
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
  const startNewGame = useCallback((mode) => {
    setGameMode(mode);
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
    setCurrentPuzzle(null);
    setPuzzleDifficulty(null);
  }, []);

  // Select a piece
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
  };
};
