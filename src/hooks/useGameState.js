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
  const [puzzleDifficulty, setPuzzleDifficulty] = useState(null); // Track puzzle difficulty for regeneration
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
    
    if (!canAnyPieceBePlaced(newBoard, newUsedPieces)) {
      setGameOver(true);
      setWinner(currentPlayer);
      soundManager.playWin();
    } else {
      setCurrentPlayer(nextPlayer);
    }
    return true;
  }, [board, boardPieces, currentPlayer, usedPieces]);

  // Handle cell click - NO AUTO-ROTATION, but show preview even if out of bounds
  const handleCellClick = useCallback((row, col) => {
    if (gameOver || ((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2)) return;
    
    const piece = pendingMove ? (selectedPiece || pendingMove.piece) : selectedPiece;
    if (!piece) return;

    // Get current piece coords with current rotation/flip
    const pieceCoords = getPieceCoords(piece, rotation, flipped);
    
    // Always set pending move so user can see where piece would go
    // (including out-of-bounds ghost cells)
    setPendingMove({ row, col, piece, rotation, flipped });
    
    // Check if piece fits at this position with current orientation
    if (isWithinBounds(row, col, pieceCoords)) {
      soundManager.playPieceMove();
    } else {
      // Piece partially out of bounds - play warning sound
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

  // Move pending piece with d-pad - allow moving to see out-of-bounds preview
  const movePendingPiece = useCallback((direction) => {
    if (!pendingMove) return;
    
    let newRow = pendingMove.row;
    let newCol = pendingMove.col;
    
    if (direction === 'up') newRow -= 1;
    else if (direction === 'down') newRow += 1;
    else if (direction === 'left') newCol -= 1;
    else if (direction === 'right') newCol += 1;

    const pieceCoords = getPieceCoords(pendingMove.piece, rotation, flipped);
    
    // Check if at least one cell of the piece would still be on the board
    // (don't allow moving completely off the board)
    const hasAnyCellOnBoard = pieceCoords.some(([dx, dy]) => {
      const cellRow = newRow + dy;
      const cellCol = newCol + dx;
      return cellRow >= 0 && cellRow < BOARD_SIZE && cellCol >= 0 && cellCol < BOARD_SIZE;
    });
    
    if (hasAnyCellOnBoard) {
      setPendingMove({ ...pendingMove, row: newRow, col: newCol });
      
      // Play appropriate sound based on whether fully in bounds
      if (isWithinBounds(newRow, newCol, pieceCoords)) {
        soundManager.playPieceMove();
      } else {
        soundManager.playError();
      }
    } else {
      // Completely off board - don't allow
      soundManager.playError();
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
      setWinner(1);
      return;
    }

    setIsAIThinking(true);
    
    // Use async for Claude AI (professional difficulty)
    const move = await selectAIMove(board, boardPieces, usedPieces, aiDifficulty);
    
    // Add small delay for UX
    await new Promise(resolve => setTimeout(resolve, 600));
    
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

  // Generate a new puzzle (used by reset button in puzzle mode)
  const generateNewPuzzle = useCallback(async () => {
    if (!puzzleDifficulty) return;
    
    setIsGeneratingPuzzle(true);
    
    try {
      const puzzle = await getRandomPuzzle(puzzleDifficulty, true);
      if (puzzle) {
        loadPuzzleInternal(puzzle);
      }
    } catch (error) {
      console.error('Error generating new puzzle:', error);
    } finally {
      setIsGeneratingPuzzle(false);
    }
  }, [puzzleDifficulty]);

  // Reset game - in puzzle mode, generate a NEW puzzle
  const resetGame = useCallback(() => {
    if (gameMode === 'puzzle' && puzzleDifficulty) {
      // Generate a completely new puzzle
      generateNewPuzzle();
    } else if (gameMode === 'puzzle' && currentPuzzle) {
      // Fallback: reload current puzzle if no difficulty stored
      loadPuzzleInternal(currentPuzzle);
    } else {
      // Regular game reset
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
  }, [gameMode, currentPuzzle, puzzleDifficulty, generateNewPuzzle]);

  // Internal function to load a puzzle (without async)
  const loadPuzzleInternal = useCallback((puzzle) => {
    try {
      const newBoard = createEmptyBoard();
      const newBoardPieces = createEmptyBoard();

      // Parse board state if provided
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
    } catch (error) {
      console.error('Error loading puzzle:', error);
    }
  }, []);

  // Load a puzzle (public API)
  const loadPuzzle = useCallback((puzzle) => {
    // Store the difficulty for regeneration
    if (puzzle.difficulty) {
      setPuzzleDifficulty(puzzle.difficulty);
    }
    loadPuzzleInternal(puzzle);
  }, [loadPuzzleInternal]);

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
  const selectPiece = useCallback((pieceName) => {
    setSelectedPiece(pieceName);
    setRotation(0);
    setFlipped(false);
    setPendingMove(null); // Clear pending move when selecting new piece
    soundManager.playPieceSelect();
  }, []);

  // Rotate piece
  const rotatePiece = useCallback(() => {
    const newRotation = (rotation + 1) % 4;
    setRotation(newRotation);
    
    // Update pending move if exists
    if (pendingMove) {
      const pieceCoords = getPieceCoords(pendingMove.piece, newRotation, flipped);
      if (isWithinBounds(pendingMove.row, pendingMove.col, pieceCoords)) {
        setPendingMove({ ...pendingMove, rotation: newRotation });
      }
      // If rotation causes out of bounds, still update rotation state
      // but the visual will show invalid placement
    }
    
    soundManager.playPieceRotate();
  }, [rotation, flipped, pendingMove]);

  // Flip piece
  const flipPieceHandler = useCallback(() => {
    const newFlipped = !flipped;
    setFlipped(newFlipped);
    
    // Update pending move if exists
    if (pendingMove) {
      const pieceCoords = getPieceCoords(pendingMove.piece, rotation, newFlipped);
      if (isWithinBounds(pendingMove.row, pendingMove.col, pieceCoords)) {
        setPendingMove({ ...pendingMove, flipped: newFlipped });
      }
      // If flip causes out of bounds, still update flip state
      // but the visual will show invalid placement
    }
    
    soundManager.playPieceFlip();
  }, [flipped, rotation, pendingMove]);

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
    flipPiece: flipPieceHandler,
    generateNewPuzzle,
    
    // Utils
    getPieceCoords,
    canPlacePiece: (row, col, coords) => canPlacePiece(board, row, col, coords),
  };
};
