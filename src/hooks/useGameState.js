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
import { selectAIMove, getAllPossibleMoves } from '../utils/aiLogic';
import { parsePuzzleBoard } from '../data/puzzles';

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
    }
  }, [gameOver, gameMode, currentPlayer, pendingMove, selectedPiece, rotation, flipped]);

  // Confirm pending move
  const confirmMove = useCallback(() => {
    if (pendingMove) {
      commitMove(pendingMove.row, pendingMove.col, pendingMove.piece, rotation, flipped);
    }
  }, [pendingMove, rotation, flipped, commitMove]);

  // Cancel pending move
  const cancelMove = useCallback(() => {
    setPendingMove(null);
    setSelectedPiece(null);
    setRotation(0);
    setFlipped(false);
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
  const makeAIMove = useCallback(() => {
    const possibleMoves = getAllPossibleMoves(board, usedPieces);
    
    if (possibleMoves.length === 0) {
      setGameOver(true);
      setWinner(1);
      return;
    }

    setIsAIThinking(true);
    
    setTimeout(() => {
      const move = selectAIMove(board, usedPieces);
      if (move) {
        commitMove(move.row, move.col, move.pieceType, move.rot, move.flip);
      }
      setIsAIThinking(false);
    }, 800);
  }, [board, usedPieces, commitMove]);

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
      const { board: newBoard, boardPieces: newBoardPieces } = parsePuzzleBoard(puzzle);
      
      setBoard(newBoard);
      setBoardPieces(newBoardPieces);
      setUsedPieces([...puzzle.usedPieces]);
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
      console.error(error);
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
  }, []);

  // Rotate piece
  const rotatePiece = useCallback(() => {
    setRotation(prev => (prev + 1) % 4);
  }, []);

  // Flip piece
  const flipPieceHandler = useCallback(() => {
    setFlipped(prev => !prev);
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
    
    // Actions
    setGameMode,
    setShowHowToPlay,
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