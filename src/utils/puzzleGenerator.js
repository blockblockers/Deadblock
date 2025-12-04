// Puzzle Generator - Simple random board filling
// Creates a board with 9 pieces placed, player completes the last 3

import { pieces } from './pieces';
import { getPieceCoords, canPlacePiece, BOARD_SIZE, createEmptyBoard } from './gameLogic';

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

// Generate a random puzzle by placing 9 pieces
export const generatePuzzle = (onProgress = null) => {
  const PIECES_TO_PLACE = 9; // Leave 3 for player
  
  // Try multiple times to generate a valid puzzle
  for (let attempt = 0; attempt < 20; attempt++) {
    const board = createEmptyBoard();
    const boardPieces = createEmptyBoard();
    const usedPieces = [];
    
    // Place pieces one by one
    for (let i = 0; i < PIECES_TO_PLACE; i++) {
      if (onProgress) onProgress(i + 1, PIECES_TO_PLACE);
      
      const moves = getAllValidMoves(board, usedPieces);
      
      if (moves.length === 0) {
        // No valid moves, restart
        break;
      }
      
      // Pick a random move
      const move = moves[Math.floor(Math.random() * moves.length)];
      
      // Place the piece
      for (const [dx, dy] of move.coords) {
        board[move.row + dy][move.col + dx] = 1;
        boardPieces[move.row + dy][move.col + dx] = move.pieceType;
      }
      usedPieces.push(move.pieceType);
    }
    
    // Check if we placed all 9 pieces
    if (usedPieces.length === PIECES_TO_PLACE) {
      // Verify there are still valid moves for remaining pieces
      const remainingMoves = getAllValidMoves(board, usedPieces);
      
      if (remainingMoves.length > 0) {
        console.log(`Puzzle generated on attempt ${attempt + 1}: ${usedPieces.length} pieces placed, ${remainingMoves.length} moves available`);
        
        return {
          id: `puzzle-${Date.now()}`,
          name: 'Random Puzzle',
          difficulty: 'easy',
          description: '3 moves remaining - You and AI take turns!',
          boardState: boardToString(boardPieces),
          usedPieces: [...usedPieces],
          movesRemaining: 3
        };
      }
    }
  }
  
  console.error('Failed to generate puzzle after 20 attempts');
  return null;
};

// Async wrapper for compatibility
export const getRandomPuzzle = async (difficulty = 'easy', useClaudeAI = false, onProgress = null) => {
  // Small delay for UI responsiveness
  await new Promise(resolve => setTimeout(resolve, 50));
  
  const puzzle = generatePuzzle(onProgress);
  
  if (puzzle && onProgress) {
    onProgress(9, 9);
  }
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return puzzle;
};

// Export for compatibility
export const PUZZLE_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium', 
  HARD: 'hard'
};

export const getMovesForDifficulty = () => 3;
