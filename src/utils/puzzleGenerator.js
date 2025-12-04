// Puzzle Generator for Deadblock
// Uses AI vs AI gameplay to generate puzzles
// Approach: Play a complete game, then remove the last N moves to create a puzzle

import { pieces } from './pieces';
import { getPieceCoords, canPlacePiece, canAnyPieceBePlaced, BOARD_SIZE, createEmptyBoard, placePiece } from './gameLogic';

// Puzzle difficulty levels with corresponding moves remaining
export const PUZZLE_DIFFICULTY = {
  EASY: 'easy',      // 3 moves remaining
  MEDIUM: 'medium',  // 5 moves remaining
  HARD: 'hard'       // 7 moves remaining
};

// Get moves remaining for each difficulty
export const getMovesForDifficulty = (difficulty) => {
  switch (difficulty) {
    case PUZZLE_DIFFICULTY.EASY: return 3;
    case PUZZLE_DIFFICULTY.MEDIUM: return 5;
    case PUZZLE_DIFFICULTY.HARD: return 7;
    default: return 3;
  }
};

// Convert boardPieces array to 64-char string for puzzle state
const boardToString = (boardPieces) => {
  let result = '';
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      result += boardPieces[row][col] || 'G';
    }
  }
  return result;
};

// Get all valid moves for available pieces
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

// Evaluate a move for AI decision making (strategic scoring)
const evaluateMove = (board, row, col, coords, pieceType, usedPieces, isEarlyGame) => {
  // Simulate placing this piece
  const simulatedBoard = board.map(r => [...r]);
  for (const [dx, dy] of coords) {
    simulatedBoard[row + dy][col + dx] = 1;
  }
  
  const simulatedUsedPieces = [...usedPieces, pieceType];
  
  // If this move ends the game for opponent, it's excellent
  if (!canAnyPieceBePlaced(simulatedBoard, simulatedUsedPieces)) {
    return 10000;
  }

  // Count how many moves opponent would have after this
  let opponentMoveCount = 0;
  const remainingPieces = Object.keys(pieces).filter(p => !simulatedUsedPieces.includes(p));
  
  for (const oppPiece of remainingPieces) {
    for (let f = 0; f < 2; f++) {
      for (let r = 0; r < 4; r++) {
        const oppCoords = getPieceCoords(oppPiece, r, f === 1);
        for (let r2 = 0; r2 < BOARD_SIZE; r2++) {
          for (let c2 = 0; c2 < BOARD_SIZE; c2++) {
            if (canPlacePiece(simulatedBoard, r2, c2, oppCoords)) {
              opponentMoveCount++;
            }
          }
        }
      }
    }
  }

  // Score: fewer opponent moves = better
  let score = 1000 - opponentMoveCount;

  // Prefer center positions
  for (const [dx, dy] of coords) {
    const r = row + dy;
    const c = col + dx;
    score += (7 - Math.abs(r - 3.5) - Math.abs(c - 3.5)) * 2;
    // Slight penalty for edge positions
    if (r === 0 || r === BOARD_SIZE - 1 || c === 0 || c === BOARD_SIZE - 1) {
      score -= 3;
    }
  }
  
  // Add randomness for variety
  score += Math.random() * (isEarlyGame ? 100 : 20);
  
  return score;
};

// Select the best move using AI strategy
const selectAIMove = (board, usedPieces) => {
  const possibleMoves = getAllValidMoves(board, usedPieces);
  
  if (possibleMoves.length === 0) {
    return null;
  }

  const isEarlyGame = usedPieces.length < 4;

  // Score all moves
  for (const move of possibleMoves) {
    move.score = evaluateMove(board, move.row, move.col, move.coords, move.pieceType, usedPieces, isEarlyGame);
  }

  // Sort by score (best first)
  possibleMoves.sort((a, b) => b.score - a.score);
  
  // Pick from top moves with some randomness for variety
  const topMoves = possibleMoves.slice(0, Math.min(isEarlyGame ? 5 : 3, possibleMoves.length));
  return topMoves[Math.floor(Math.random() * topMoves.length)];
};

// Play a complete AI vs AI game and return the move history
const playAIvsAIGame = (onProgress = null) => {
  let board = createEmptyBoard();
  let boardPieces = createEmptyBoard();
  let usedPieces = [];
  const moveHistory = [];
  let currentPlayer = 1;
  let moveCount = 0;
  
  // Play until no more moves are possible
  while (true) {
    const move = selectAIMove(board, usedPieces);
    
    if (!move) {
      // Current player can't move - game over
      break;
    }
    
    // Store the state BEFORE this move (for undo purposes)
    const boardBefore = board.map(r => [...r]);
    const boardPiecesBefore = boardPieces.map(r => [...r]);
    
    // Place the piece
    const { newBoard, newBoardPieces } = placePiece(
      board, boardPieces, move.row, move.col, move.pieceType, move.coords, currentPlayer
    );
    
    // Record this move with all necessary data
    moveHistory.push({
      player: currentPlayer,
      piece: move.pieceType,
      row: move.row,
      col: move.col,
      rotation: move.rot,
      flipped: move.flip,
      coords: move.coords,
      boardBefore: boardBefore,
      boardPiecesBefore: boardPiecesBefore,
      boardAfter: newBoard.map(r => [...r]),
      boardPiecesAfter: newBoardPieces.map(r => [...r])
    });
    
    board = newBoard;
    boardPieces = newBoardPieces;
    usedPieces.push(move.pieceType);
    moveCount++;
    
    // Report progress
    if (onProgress) {
      onProgress(moveCount, 12); // Max 12 pieces
    }
    
    // Switch players
    currentPlayer = currentPlayer === 1 ? 2 : 1;
  }
  
  return {
    moveHistory,
    finalBoard: board,
    finalBoardPieces: boardPieces,
    usedPieces
  };
};

// Verify that a puzzle state has at least N valid moves remaining
const verifyPuzzleHasMoves = (board, usedPieces, requiredMoves) => {
  // Try to simulate playing out the required number of moves
  let testBoard = board.map(r => [...r]);
  let testUsedPieces = [...usedPieces];
  
  for (let i = 0; i < requiredMoves; i++) {
    const moves = getAllValidMoves(testBoard, testUsedPieces);
    if (moves.length === 0) {
      return false; // Can't play the required number of moves
    }
    
    // Play a random valid move
    const move = moves[Math.floor(Math.random() * moves.length)];
    for (const [dx, dy] of move.coords) {
      testBoard[move.row + dy][move.col + dx] = 1;
    }
    testUsedPieces.push(move.pieceType);
  }
  
  return true;
};

// Generate a puzzle by playing AI vs AI, then removing moves
const generatePuzzleFromGame = async (difficulty, onProgress = null) => {
  const movesRemaining = getMovesForDifficulty(difficulty);
  const maxAttempts = 20;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    console.log(`Puzzle generation attempt ${attempt + 1}/${maxAttempts}`);
    
    // Report initial progress
    if (onProgress) {
      onProgress(0, 12);
    }
    
    // Play a complete AI vs AI game
    const gameResult = playAIvsAIGame(onProgress);
    const { moveHistory, usedPieces } = gameResult;
    
    console.log(`Game completed with ${moveHistory.length} moves`);
    
    // Need at least movesRemaining moves to create a puzzle
    if (moveHistory.length < movesRemaining) {
      console.log('Game too short, retrying...');
      continue;
    }
    
    // Try different numbers of moves to remove (starting from movesRemaining)
    for (let movesToRemove = movesRemaining; movesToRemove <= Math.min(movesRemaining + 3, moveHistory.length); movesToRemove++) {
      // Get the state after removing the last N moves
      const puzzleMoveIndex = moveHistory.length - movesToRemove;
      
      if (puzzleMoveIndex < 0) continue;
      
      // Get the board state at that point
      let puzzleBoard, puzzleBoardPieces, puzzleUsedPieces;
      
      if (puzzleMoveIndex === 0) {
        // Remove all moves - start from empty
        puzzleBoard = createEmptyBoard();
        puzzleBoardPieces = createEmptyBoard();
        puzzleUsedPieces = [];
      } else {
        // Get state after the move before our puzzle starts
        const stateMove = moveHistory[puzzleMoveIndex - 1];
        puzzleBoard = stateMove.boardAfter.map(r => [...r]);
        puzzleBoardPieces = stateMove.boardPiecesAfter.map(r => [...r]);
        puzzleUsedPieces = moveHistory.slice(0, puzzleMoveIndex).map(m => m.piece);
      }
      
      // Verify this puzzle state has at least movesRemaining valid moves
      const hasEnoughMoves = verifyPuzzleHasMoves(puzzleBoard, puzzleUsedPieces, movesRemaining);
      
      if (hasEnoughMoves) {
        console.log(`Valid puzzle found! ${puzzleUsedPieces.length} pieces placed, ${movesRemaining} moves remaining`);
        
        return {
          id: `puzzle-${difficulty}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          name: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Puzzle`,
          difficulty: difficulty,
          description: getDifficultyDescription(difficulty),
          boardState: boardToString(puzzleBoardPieces),
          usedPieces: puzzleUsedPieces,
          movesRemaining: movesRemaining,
          // Store the solution (the moves that were removed)
          solutionMoves: moveHistory.slice(puzzleMoveIndex)
        };
      }
    }
    
    console.log('Could not create valid puzzle from this game, retrying...');
  }
  
  console.error('Failed to generate valid puzzle after max attempts');
  return null;
};

// Get difficulty description
const getDifficultyDescription = (difficulty) => {
  const moves = getMovesForDifficulty(difficulty);
  switch (difficulty) {
    case PUZZLE_DIFFICULTY.EASY:
      return `${moves} moves left - Find the winning sequence!`;
    case PUZZLE_DIFFICULTY.MEDIUM:
      return `${moves} moves left - Think ahead to win!`;
    case PUZZLE_DIFFICULTY.HARD:
      return `${moves} moves left - Expert challenge!`;
    default:
      return "Find the winning sequence!";
  }
};

// Main export - async puzzle generation
export const getRandomPuzzle = async (difficulty, useClaudeAI = false, onProgress = null) => {
  const movesRemaining = getMovesForDifficulty(difficulty);
  const piecesToShow = 12 - movesRemaining;
  
  console.log(`Generating ${difficulty} puzzle (${movesRemaining} moves remaining)...`);
  
  // Small initial delay for UI
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Generate puzzle using AI vs AI approach
  const puzzle = await generatePuzzleFromGame(difficulty, onProgress);
  
  if (puzzle) {
    console.log('Puzzle generated successfully:', puzzle.id);
    // Final progress update
    if (onProgress) {
      onProgress(piecesToShow, piecesToShow);
    }
    // Small delay before returning
    await new Promise(resolve => setTimeout(resolve, 200));
    return puzzle;
  }
  
  // Fallback: create a simple puzzle if generation fails
  console.warn('Using fallback puzzle generation');
  return createFallbackPuzzle(difficulty);
};

// Fallback puzzle if AI generation fails
const createFallbackPuzzle = (difficulty) => {
  const movesRemaining = getMovesForDifficulty(difficulty);
  const piecesToPlace = 12 - movesRemaining;
  
  let board = createEmptyBoard();
  let boardPieces = createEmptyBoard();
  let usedPieces = [];
  
  // Simple placement in order
  const pieceOrder = Object.keys(pieces).sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < piecesToPlace && i < pieceOrder.length; i++) {
    const pieceType = pieceOrder[i];
    const moves = getAllValidMoves(board, usedPieces);
    
    if (moves.length === 0) break;
    
    // Find moves for this piece
    const pieceMoves = moves.filter(m => m.pieceType === pieceType);
    if (pieceMoves.length === 0) continue;
    
    const move = pieceMoves[Math.floor(Math.random() * pieceMoves.length)];
    
    // Place the piece
    for (const [dx, dy] of move.coords) {
      board[move.row + dy][move.col + dx] = 1;
      boardPieces[move.row + dy][move.col + dx] = pieceType;
    }
    usedPieces.push(pieceType);
  }
  
  return {
    id: `fallback-${difficulty}-${Date.now()}`,
    name: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Puzzle`,
    difficulty: difficulty,
    description: getDifficultyDescription(difficulty),
    boardState: boardToString(boardPieces),
    usedPieces: usedPieces,
    movesRemaining: movesRemaining
  };
};

// Export for testing
export { generatePuzzleFromGame, playAIvsAIGame, getAllValidMoves, verifyPuzzleHasMoves };
