import { useState, useEffect, useCallback } from 'react';
import { 
  createEmptyBoard, 
  getPieceCoords, 
  canPlacePiece, 
  canAnyPieceBePlaced,
  findFittingOrientation,
  placePiece,
  BOARD_SIZE 
} from '../utils/gameLogic';
import { selectAIMove, getAllPossibleMoves, AI_DIFFICULTY } from '../utils/aiLogic';
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
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState(AI_DIFFICULTY.AVERAGE);

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

  // Handle cell click
  const handleCellClick = useCallback((row, col) => {
    if (gameOver || ((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2)) return;
    
    const piece = pendingMove ? (selectedPiece || pendingMove.piece) : selectedPiece;
    if (!piece) return;

    const fit = findFittingOrientation(row, col, piece, rotation, flipped);
    if (fit) {
      setRotation(fit.rotation);
      setFlipped(fit.flipped);
      setPendingMove({ row, col, piece, rotation: fit.rotation, flipped: fit.flipped });
      soundManager.playPieceMove();
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
    const fit = findFittingOrientation(newRow, newCol, pendingMove.piece, rotation, flipped);
    if (fit) {
      setPendingMove({ ...pendingMove, row: newRow, col: newCol });
      soundManager.playPieceMove();
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

  // Reset game
  const resetGame = useCallback(() => {
    if (gameMode === 'puzzle' && currentPuzzle) {
      loadPuzzle(currentPuzzle);
    } else {
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
  }, [gameMode, currentPuzzle]);

  // Load a puzzle
  const loadPuzzle = useCallback((puzzle) => {
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
  }, []);

  // Select a piece
  const selectPiece = useCallback((pieceName) => {
    setSelectedPiece(pieceName);
    setRotation(0);
    setFlipped(false);
    soundManager.playPieceSelect();
  }, []);

  // Rotate piece
  const rotatePiece = useCallback(() => {
    setRotation(prev => (prev + 1) % 4);
    soundManager.playPieceRotate();
  }, []);

  // Flip piece
  const flipPieceHandler = useCallback(() => {
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
    
    // Utils
    getPieceCoords,
    canPlacePiece: (row, col, coords) => canPlacePiece(board, row, col, coords),
  };
};