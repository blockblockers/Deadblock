// Puzzle Generator for Deadblock
// Simple approach: Play AI vs AI game, then back out last 3 moves

import { pieces } from './pieces';
import { getPieceCoords, canPlacePiece, canAnyPieceBePlaced, BOARD_SIZE, createEmptyBoard } from './gameLogic';

// Convert boardPieces array to 64-char string
const boardToString = (boardPieces) => {
  let result = '';
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      result += boardPieces[row][col] || 'G';
    }
  }
  return result;
};

// Get all valid moves for a board state
const getAllValidMoves = (board, usedPieces) => {
  const availablePieces = Object.keys(pieces).filter(p => !usedPieces.includes(p));
  const validMoves = [];

  for (const pieceType of availablePieces) {
    for (let flip = 0; flip < 2; flip++) {
      for (let rot = 0; rot < 4; rot++) {
        const coords = getPieceCoords(pieceType, rot, flip === 1);
        for (let row = 0; row < BOARD_SIZE; row++) {
          for (let col = 0; col < BOARD_SIZE; col++) {
            if (canPlacePiece(board, row, col, coords)) {
              validMoves.push({ pieceType, row, col, rot, flip: flip === 1, coords });
            }
          }
        }
      }
    }
  }

  return validMoves;
};

// Simple AI move selection - picks a random good move
const selectAIMove = (board, usedPieces) => {
  const moves = getAllValidMoves(board, usedPieces);
  if (moves.length === 0) return null;
  
  // Prefer center moves early in game
  if (usedPieces.length < 4) {
    const centerMoves = moves.filter(m => {
      const centerDist = Math.abs(m.row - 3.5) + Math.abs(m.col - 3.5);
      return centerDist < 4;
    });
    if (centerMoves.length > 0) {
      return centerMoves[Math.floor(Math.random() * centerMoves.length)];
    }
  }
  
  // Otherwise pick random
  return moves[Math.floor(Math.random() * moves.length)];
};

// Play a complete AI vs AI game and return move history
const playAIvsAIGame = (onProgress = null) => {
  let board = createEmptyBoard();
  let boardPieces = createEmptyBoard();
  let usedPieces = [];
  const moveHistory = [];
  let currentPlayer = 1;
  
  // Play until game ends
  while (true) {
    const move = selectAIMove(board, usedPieces);
    
    if (!move) {
      // No moves available - game over
      break;
    }
    
    // Store state BEFORE this move
    const boardBefore = board.map(r => [...r]);
    const boardPiecesBefore = boardPieces.map(r => [...r]);
    const usedPiecesBefore = [...usedPieces];
    
    // Place the piece
    const newBoard = board.map(r => [...r]);
    const newBoardPieces = boardPieces.map(r => [...r]);
    
    for (const [dx, dy] of move.coords) {
      newBoard[move.row + dy][move.col + dx] = currentPlayer;
      newBoardPieces[move.row + dy][move.col + dx] = move.pieceType;
    }
    
    // Record this move
    moveHistory.push({
      player: currentPlayer,
      piece: move.pieceType,
      row: move.row,
      col: move.col,
      rotation: move.rot,
      flipped: move.flip,
      coords: move.coords,
      // State before this move
      boardBefore,
      boardPiecesBefore,
      usedPiecesBefore,
      // State after this move
      boardAfter: newBoard.map(r => [...r]),
      boardPiecesAfter: newBoardPieces.map(r => [...r]),
      usedPiecesAfter: [...usedPieces, move.pieceType]
    });
    
    // Update state
    board = newBoard;
    boardPieces = newBoardPieces;
    usedPieces.push(move.pieceType);
    
    // Report progress
    if (onProgress) {
      onProgress(usedPieces.length, 12);
    }
    
    // Switch players
    currentPlayer = currentPlayer === 1 ? 2 : 1;
  }
  
  return {
    moveHistory,
    finalBoard: board,
    finalBoardPieces: boardPieces,
    totalMoves: moveHistory.length
  };
};

// Generate puzzle by playing AI vs AI then backing out 3 moves
export const generatePuzzle = async (onProgress = null) => {
  console.log('Starting puzzle generation...');
  
  // Try up to 10 times to get a valid game
  for (let attempt = 0; attempt < 10; attempt++) {
    console.log(`Attempt ${attempt + 1}`);
    
    // Play AI vs AI game
    const game = playAIvsAIGame(onProgress);
    
    console.log(`Game completed with ${game.totalMoves} moves`);
    
    // Need at least 3 moves to back out
    if (game.totalMoves < 3) {
      console.log('Game too short, retrying...');
      continue;
    }
    
    // Back out 3 moves - get state from 3 moves before the end
    const puzzleMoveIndex = game.totalMoves - 3;
    const stateMove = game.moveHistory[puzzleMoveIndex - 1]; // State after this move
    
    if (!stateMove) {
      // If puzzleMoveIndex is 0, start from empty board
      if (puzzleMoveIndex === 0) {
        return {
          id: `puzzle-${Date.now()}`,
          name: 'Random Puzzle',
          difficulty: 'easy',
          description: '3 moves remaining - Find the winning sequence!',
          boardState: boardToString(createEmptyBoard()),
          usedPieces: [],
          movesRemaining: 3,
          // Store the solution moves
          solution: game.moveHistory.slice(0, 3)
        };
      }
      continue;
    }
    
    // Create puzzle from state after the move 3 before the end
    const puzzle = {
      id: `puzzle-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: 'Random Puzzle',
      difficulty: 'easy',
      description: '3 moves remaining - Find the winning sequence!',
      boardState: boardToString(stateMove.boardPiecesAfter),
      usedPieces: [...stateMove.usedPiecesAfter],
      movesRemaining: 3,
      // Store the solution (the 3 moves we backed out)
      solution: game.moveHistory.slice(puzzleMoveIndex)
    };
    
    // Verify puzzle has at least 1 valid move
    const board = stateMove.boardAfter;
    const moves = getAllValidMoves(board, stateMove.usedPiecesAfter);
    
    if (moves.length > 0) {
      console.log('Puzzle generated successfully!');
      console.log(`Board has ${stateMove.usedPiecesAfter.length} pieces, ${moves.length} valid moves available`);
      return puzzle;
    }
    
    console.log('No valid moves in puzzle state, retrying...');
  }
  
  console.error('Failed to generate puzzle after 10 attempts');
  return null;
};

// Main export - async wrapper
export const getRandomPuzzle = async (difficulty = 'easy', useClaudeAI = false, onProgress = null) => {
  // Add small delay for UI
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const puzzle = await generatePuzzle(onProgress);
  
  if (puzzle && onProgress) {
    onProgress(12, 12); // Show complete
  }
  
  // Small delay before returning
  await new Promise(resolve => setTimeout(resolve, 200));
  
  return puzzle;
};

// Export difficulty constants for compatibility
export const PUZZLE_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard'
};

export const getMovesForDifficulty = (difficulty) => 3; // Always 3 for now
