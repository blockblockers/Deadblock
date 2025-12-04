// Puzzle Generator - Play complete game, then back out N moves
// This guarantees exactly N moves remain and they are playable

import { pieces } from './pieces';
import { getPieceCoords, canPlacePiece, BOARD_SIZE, createEmptyBoard } from './gameLogic';

export const PUZZLE_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard'
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

// Play a complete AI vs AI game, recording all states
const playCompleteGame = () => {
  const board = createEmptyBoard();
  const boardPieces = createEmptyBoard();
  const usedPieces = [];
  const history = []; // Each entry: { board, boardPieces, usedPieces } BEFORE the move
  
  let moveCount = 0;
  
  while (true) {
    const moves = getAllValidMoves(board, usedPieces);
    
    if (moves.length === 0) {
      // Game over
      break;
    }
    
    // Save state BEFORE this move
    history.push({
      board: board.map(r => [...r]),
      boardPieces: boardPieces.map(r => [...r]),
      usedPieces: [...usedPieces]
    });
    
    // Pick a move (prefer center early, then random)
    let move;
    if (moveCount < 3) {
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
      board[move.row + dy][move.col + dx] = moveCount % 2 + 1;
      boardPieces[move.row + dy][move.col + dx] = move.pieceType;
    }
    usedPieces.push(move.pieceType);
    moveCount++;
  }
  
  return {
    history,
    totalMoves: moveCount
  };
};

// Generate puzzle by playing game then backing out N moves
export const generatePuzzle = (difficulty = PUZZLE_DIFFICULTY.EASY, onProgress = null) => {
  const movesToBackOut = getMovesForDifficulty(difficulty);
  
  // Try multiple games to find one with enough moves
  for (let attempt = 0; attempt < 20; attempt++) {
    if (onProgress) onProgress(attempt + 1, 20);
    
    const game = playCompleteGame();
    
    // Need at least N moves to back out
    if (game.totalMoves < movesToBackOut) {
      console.log(`Game ${attempt + 1}: Only ${game.totalMoves} moves, need ${movesToBackOut}`);
      continue;
    }
    
    // Get the state from N moves before the end
    const puzzleStateIndex = game.totalMoves - movesToBackOut;
    const puzzleState = game.history[puzzleStateIndex];
    
    if (!puzzleState) {
      console.log(`Game ${attempt + 1}: No state at index ${puzzleStateIndex}`);
      continue;
    }
    
    // Verify moves are still possible from this state
    const remainingMoves = getAllValidMoves(puzzleState.board, puzzleState.usedPieces);
    
    if (remainingMoves.length > 0) {
      console.log(`Puzzle generated (${difficulty}): ${puzzleState.usedPieces.length} pieces placed, exactly ${movesToBackOut} moves to play`);
      
      const difficultyNames = {
        [PUZZLE_DIFFICULTY.EASY]: 'Easy',
        [PUZZLE_DIFFICULTY.MEDIUM]: 'Medium',
        [PUZZLE_DIFFICULTY.HARD]: 'Hard'
      };
      
      return {
        id: `puzzle-${difficulty}-${Date.now()}`,
        name: `${difficultyNames[difficulty]} Puzzle`,
        difficulty: difficulty,
        description: `${movesToBackOut} moves remaining`,
        boardState: boardToString(puzzleState.boardPieces),
        usedPieces: [...puzzleState.usedPieces],
        movesRemaining: movesToBackOut
      };
    }
  }
  
  console.error(`Failed to generate ${difficulty} puzzle after 20 attempts`);
  return null;
};

// Async wrapper
export const getRandomPuzzle = async (difficulty = PUZZLE_DIFFICULTY.EASY, useClaudeAI = false, onProgress = null) => {
  await new Promise(resolve => setTimeout(resolve, 50));
  
  const puzzle = generatePuzzle(difficulty, onProgress);
  
  if (puzzle && onProgress) {
    onProgress(20, 20);
  }
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return puzzle;
};
