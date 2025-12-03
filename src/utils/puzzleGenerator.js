import { pieces } from './pieces';
import { getPieceCoords, canPlacePiece, canAnyPieceBePlaced, BOARD_SIZE, createEmptyBoard } from './gameLogic';

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

// Place a piece on the board (creates new arrays, doesn't mutate)
const placePieceOnBoardCopy = (board, boardPieces, row, col, pieceType, coords) => {
  const newBoard = board.map(r => [...r]);
  const newBoardPieces = boardPieces.map(r => [...r]);
  
  for (const [dx, dy] of coords) {
    newBoard[row + dy][col + dx] = 1;
    newBoardPieces[row + dy][col + dx] = pieceType;
  }
  
  return { newBoard, newBoardPieces };
};

// Place a piece on the board (mutates the arrays - for generation)
const placePieceOnBoardMutate = (board, boardPieces, row, col, pieceType, coords) => {
  for (const [dx, dy] of coords) {
    board[row + dy][col + dx] = 1;
    boardPieces[row + dy][col + dx] = pieceType;
  }
};

// Simulate remaining moves to verify puzzle is playable for all moves
const verifyPuzzlePlayable = (board, boardPieces, usedPieces, movesRequired) => {
  if (movesRequired <= 0) return true;
  
  // Get all valid moves for the current state
  const validMoves = getAllValidMoves(board, usedPieces);
  
  if (validMoves.length === 0) {
    return false; // No moves available, puzzle ends too early
  }
  
  // For thorough validation, we need to check that at least one move
  // leads to a state where the opponent can also move, and so on...
  // This ensures the puzzle actually lasts for the required number of moves
  
  // Try multiple random paths to see if any allow full playthrough
  const maxAttempts = 30; // Increased for better validation
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let testBoard = board.map(r => [...r]);
    let testBoardPieces = boardPieces.map(r => [...r]);
    let testUsedPieces = [...usedPieces];
    let movesPlayed = 0;
    
    while (movesPlayed < movesRequired) {
      const moves = getAllValidMoves(testBoard, testUsedPieces);
      
      if (moves.length === 0) {
        break; // Game ended early
      }
      
      // Pick a random move
      const move = moves[Math.floor(Math.random() * moves.length)];
      const { newBoard, newBoardPieces } = placePieceOnBoardCopy(
        testBoard, testBoardPieces, move.row, move.col, move.pieceType, move.coords
      );
      
      testBoard = newBoard;
      testBoardPieces = newBoardPieces;
      testUsedPieces.push(move.pieceType);
      movesPlayed++;
    }
    
    if (movesPlayed >= movesRequired) {
      return true; // Found a valid playthrough
    }
  }
  
  return false; // Couldn't find a valid playthrough
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

// Score a move for strategic placement
const scoreMoveStrategically = (board, row, col, coords, moveCount, totalMoves) => {
  let score = 0;
  
  // Early game: prefer center positions
  if (moveCount < totalMoves / 2) {
    const centerDist = coords.reduce((sum, [dx, dy]) => {
      const cellRow = row + dy;
      const cellCol = col + dx;
      return sum + Math.abs(cellRow - 3.5) + Math.abs(cellCol - 3.5);
    }, 0);
    score -= centerDist * 2; // Lower distance = higher score
  }
  
  // Prefer positions that leave more open space
  const adjacentOpenCells = coords.reduce((sum, [dx, dy]) => {
    const cellRow = row + dy;
    const cellCol = col + dx;
    let openCount = 0;
    
    // Check all 4 directions
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dRow, dCol] of directions) {
      const adjRow = cellRow + dRow;
      const adjCol = cellCol + dCol;
      if (adjRow >= 0 && adjRow < BOARD_SIZE && adjCol >= 0 && adjCol < BOARD_SIZE) {
        if (board[adjRow][adjCol] === null) {
          openCount++;
        }
      }
    }
    return sum + openCount;
  }, 0);
  
  score += adjacentOpenCells * 3;
  
  // Add some randomness to create varied puzzles
  score += Math.random() * 10;
  
  return score;
};

// Generate a puzzle using smart local generation
const generateLocalPuzzle = (difficulty, onProgress = null) => {
  const movesRemaining = getMovesForDifficulty(difficulty);
  const piecesToPlace = 12 - movesRemaining;
  
  const maxAttempts = 50; // Try many times to find a good puzzle
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let board = createEmptyBoard();
    let boardPieces = createEmptyBoard();
    let usedPieces = [];
    
    // Shuffle piece order for variety
    const pieceOrder = Object.keys(pieces).sort(() => Math.random() - 0.5);
    
    let success = true;
    
    for (let moveNum = 0; moveNum < piecesToPlace; moveNum++) {
      // Report progress
      if (onProgress) {
        onProgress(moveNum + 1, piecesToPlace);
      }
      
      // Get available pieces (use shuffled order but filter by what's available)
      const availablePieces = pieceOrder.filter(p => !usedPieces.includes(p));
      
      if (availablePieces.length === 0) {
        success = false;
        break;
      }
      
      // Collect all valid moves for all available pieces
      let allMoves = [];
      for (const pieceType of availablePieces) {
        for (let flip = 0; flip < 2; flip++) {
          for (let rot = 0; rot < 4; rot++) {
            const coords = getPieceCoords(pieceType, rot, flip === 1);
            for (let row = 0; row < BOARD_SIZE; row++) {
              for (let col = 0; col < BOARD_SIZE; col++) {
                if (canPlacePiece(board, row, col, coords)) {
                  const score = scoreMoveStrategically(board, row, col, coords, moveNum, piecesToPlace);
                  allMoves.push({ pieceType, row, col, rot, flip: flip === 1, coords, score });
                }
              }
            }
          }
        }
      }
      
      if (allMoves.length === 0) {
        success = false;
        break;
      }
      
      // Sort by score and pick from top moves with some randomness
      allMoves.sort((a, b) => b.score - a.score);
      const topMoves = allMoves.slice(0, Math.min(10, allMoves.length));
      const move = topMoves[Math.floor(Math.random() * topMoves.length)];
      
      placePieceOnBoardMutate(board, boardPieces, move.row, move.col, move.pieceType, move.coords);
      usedPieces.push(move.pieceType);
    }
    
    // Verify puzzle validity AND playability
    if (success && usedPieces.length === piecesToPlace) {
      const isPlayable = verifyPuzzlePlayable(board, boardPieces, usedPieces, movesRemaining);
      
      if (isPlayable) {
        console.log(`Generated valid puzzle on attempt ${attempt + 1}`);
        return {
          id: `puzzle-${difficulty}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          name: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Puzzle`,
          difficulty: difficulty,
          description: getDifficultyDescription(difficulty),
          boardState: boardToString(boardPieces),
          usedPieces: usedPieces,
          movesRemaining: movesRemaining
        };
      }
    }
  }
  
  console.error('Failed to generate valid puzzle after max attempts');
  return null;
};

// Async wrapper for puzzle generation with simulated delay for UX
export const getRandomPuzzle = async (difficulty, useClaudeAI = false, onProgress = null) => {
  const movesRemaining = getMovesForDifficulty(difficulty);
  const piecesToPlace = 12 - movesRemaining;
  
  console.log(`Generating ${difficulty} puzzle (${movesRemaining} moves remaining, ${piecesToPlace} pieces to place)...`);
  
  // Add a small initial delay for UX
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Generate puzzle with progress updates
  let lastProgress = 0;
  const progressCallback = (current, total) => {
    if (current !== lastProgress) {
      lastProgress = current;
      if (onProgress) {
        onProgress(current, total);
      }
    }
  };
  
  // Use local generation (fast and reliable)
  const puzzle = generateLocalPuzzle(difficulty, progressCallback);
  
  if (puzzle) {
    console.log('Puzzle generated successfully:', puzzle.id);
    // Final progress update
    if (onProgress) {
      onProgress(piecesToPlace, piecesToPlace);
    }
    // Small delay before returning to show completion
    await new Promise(resolve => setTimeout(resolve, 200));
    return puzzle;
  }
  
  console.error('Failed to generate puzzle');
  return null;
};

// Export for testing
export { generateLocalPuzzle, getAllValidMoves, verifyPuzzlePlayable };
