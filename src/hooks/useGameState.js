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
  const [puzzleDifficulty, setPuzzleDifficulty] = useState(null);

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
    const success = commitMove(pendingMove.row, pendingMove.col, pendingMove.piece, rotation, flipped);
    if (success) {
      soundManager.playConfirm();
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
      await new Promise(r => setTimeout(r, 500));
      
      if (move) {
        commitMove(move.row, move.col, move.pieceType, move.rot, move.flip);
      }
    } catch (e) {
      console.error('AI move error:', e);
    }
    
    setIsAIThinking(false);
  }, [board, boardPieces, usedPieces, aiDifficulty, commitMove]);

  // Trigger AI move
  useEffect(() => {
    if ((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2 && !gameOver && !isAIThinking) {
      makeAIMove();
    }
  }, [currentPlayer, gameMode, gameOver, isAIThinking, makeAIMove]);

  // Load puzzle from data
  const loadPuzzleInternal = useCallback((puzzle) => {
    console.log('Loading puzzle:', puzzle?.id);
    
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
      
      console.log('Puzzle loaded successfully');
    } catch (error) {
      console.error('Error loading puzzle:', error);
      setIsGeneratingPuzzle(false);
    }
  }, []);

  // Generate and load a new puzzle
  const generateAndLoadPuzzle = useCallback(async () => {
    console.log('Generating puzzle...');
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
      console.error('Puzzle generation error:', error);
      setIsGeneratingPuzzle(false);
    }
  }, [loadPuzzleInternal]);

  // Public loadPuzzle
  const loadPuzzle = useCallback((puzzle) => {
    if (puzzle?.boardState) {
      loadPuzzleInternal(puzzle);
    } else {
      generateAndLoadPuzzle();
    }
  }, [loadPuzzleInternal, generateAndLoadPuzzle]);

  // Reset game
  const resetGame = useCallback(() => {
    if (gameMode === 'puzzle') {
      generateAndLoadPuzzle();
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
