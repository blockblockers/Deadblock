// Puzzle Generator - Three Difficulty Levels
// Easy: 3 moves remaining (9 pieces placed)
// Medium: 5 moves remaining (7 pieces placed)  
// Hard: 7 moves remaining (5 pieces placed)

import { pieces } from './pieces';
import { getPieceCoords, canPlacePiece, BOARD_SIZE, createEmptyBoard } from './gameLogic';

export const PUZZLE_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard'
};

// Get pieces to place based on difficulty
export const getPiecesToPlace = (difficulty) => {
  switch (difficulty) {
    case PUZZLE_DIFFICULTY.EASY: return 9;    // 3 remaining
    case PUZZLE_DIFFICULTY.MEDIUM: return 7;  // 5 remaining
    case PUZZLE_DIFFICULTY.HARD: return 5;    // 7 remaining
    default: return 9;
  }
};

export const getMovesForDifficulty = (difficulty) => {
  switch (difficulty) {
    case PUZZLE_DIFFICULTY.EASY: return 3;
    case PUZZLE_DIFFICULTY.MEDIUM: return 5;
    case PUZZLE_DIFFICULTY.HARD: return 7;
    default: return 3;
  }
};

// Convert boardPieces to 64-char string
const boardToString = (boardPieces) => {
  let result = '';
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      result += boardPieces[row][col] || 'G';
    }
  }
  return result;
};

// Get all valid moves for a given board state
const getAllValidMoves = (board, usedPieces) => {
  const available = Object.keys(pieces).filter(p => !usedPieces.includes(p));
  const moves = [];

  for (const pieceType of available) {
    for (let flip = 0; flip < 2; flip++) {
      for (let rot = 0; rot < 4; rot++) {
        const coords = getPieceCoords(pieceType, rot, flip === 1);
        for (let row = 0; row < BOARD_SIZE; row++) {
          for (let col = 0; col < BOARD_SIZE; col++) {
            if (canPlacePiece(board, row, col, coords)) {
              moves.push({ pieceType, row, col, rot, flip: flip === 1, coords });
            }
          }
        }
      }
    }
  }
  return moves;
};

// Generate a puzzle by placing pieces randomly
export const generatePuzzle = (difficulty = PUZZLE_DIFFICULTY.EASY, onProgress = null) => {
  const piecesToPlace = getPiecesToPlace(difficulty);
  const movesRemaining = getMovesForDifficulty(difficulty);
  
  // Try multiple times to generate a valid puzzle
  for (let attempt = 0; attempt < 30; attempt++) {
    const board = createEmptyBoard();
    const boardPieces = createEmptyBoard();
    const usedPieces = [];
    
    // Place pieces one by one
    for (let i = 0; i < piecesToPlace; i++) {
      if (onProgress) onProgress(i + 1, piecesToPlace);
      
      const moves = getAllValidMoves(board, usedPieces);
      
      if (moves.length === 0) {
        // No valid moves, restart
        break;
      }
      
      // Pick a random move, prefer center early
      let move;
      if (i < 3) {
        // Early game: prefer center moves
        const centerMoves = moves.filter(m => {
          const dist = Math.abs(m.row - 3.5) + Math.abs(m.col - 3.5);
          return dist < 4;
        });
        move = centerMoves.length > 0 
          ? centerMoves[Math.floor(Math.random() * centerMoves.length)]
          : moves[Math.floor(Math.random() * moves.length)];
      } else {
        move = moves[Math.floor(Math.random() * moves.length)];
      }
      
      // Place the piece
      for (const [dx, dy] of move.coords) {
        board[move.row + dy][move.col + dx] = 1;
        boardPieces[move.row + dy][move.col + dx] = move.pieceType;
      }
      usedPieces.push(move.pieceType);
    }
    
    // Check if we placed all required pieces
    if (usedPieces.length === piecesToPlace) {
      // Verify there are still valid moves for remaining pieces
      const remainingMoves = getAllValidMoves(board, usedPieces);
      
      if (remainingMoves.length >= movesRemaining) {
        console.log(`Puzzle generated (${difficulty}): ${usedPieces.length} pieces, ${remainingMoves.length} moves available`);
        
        const difficultyNames = {
          [PUZZLE_DIFFICULTY.EASY]: 'Easy',
          [PUZZLE_DIFFICULTY.MEDIUM]: 'Medium',
          [PUZZLE_DIFFICULTY.HARD]: 'Hard'
        };
        
        return {
          id: `puzzle-${difficulty}-${Date.now()}`,
          name: `${difficultyNames[difficulty]} Puzzle`,
          difficulty: difficulty,
          description: `${movesRemaining} moves remaining`,
          boardState: boardToString(boardPieces),
          usedPieces: [...usedPieces],
          movesRemaining: movesRemaining
        };
      }
    }
  }
  
  console.error(`Failed to generate ${difficulty} puzzle after 30 attempts`);
  return null;
};

// Async wrapper
export const getRandomPuzzle = async (difficulty = PUZZLE_DIFFICULTY.EASY, useClaudeAI = false, onProgress = null) => {
  await new Promise(resolve => setTimeout(resolve, 50));
  
  const puzzle = generatePuzzle(difficulty, onProgress);
  
  if (puzzle && onProgress) {
    onProgress(getPiecesToPlace(difficulty), getPiecesToPlace(difficulty));
  }
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return puzzle;
};
