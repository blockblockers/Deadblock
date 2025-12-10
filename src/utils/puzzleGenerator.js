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
    case PUZZLE_DIFFICULTY.EASY: return 1;
    case PUZZLE_DIFFICULTY.MEDIUM: return 3;
    case PUZZLE_DIFFICULTY.HARD: return 5;
    default: return 1;
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

// Get unique pieces that can be played (ignoring position variations)
const getUniquePieceOptions = (moves) => {
  const pieceSet = new Set();
  moves.forEach(m => pieceSet.add(m.pieceType));
  return Array.from(pieceSet);
};

// Simulate a move and return the resulting board state
const simulateMove = (board, boardPieces, usedPieces, move, player) => {
  const newBoard = board.map(r => [...r]);
  const newBoardPieces = boardPieces.map(r => [...r]);
  
  for (const [dx, dy] of move.coords) {
    newBoard[move.row + dy][move.col + dx] = player;
    newBoardPieces[move.row + dy][move.col + dx] = move.pieceType;
  }
  
  return {
    board: newBoard,
    boardPieces: newBoardPieces,
    usedPieces: [...usedPieces, move.pieceType]
  };
};

// Check if a move leads to winning (opponent has no moves after)
const isWinningMove = (board, boardPieces, usedPieces, move) => {
  const result = simulateMove(board, boardPieces, usedPieces, move, 1);
  const opponentMoves = getAllValidMoves(result.board, result.usedPieces);
  return opponentMoves.length === 0;
};

// Check if a move leads to a trap (opponent can still play, then player loses)
const isTrapMove = (board, boardPieces, usedPieces, move) => {
  // After player makes this move...
  const afterPlayer = simulateMove(board, boardPieces, usedPieces, move, 1);
  const opponentMoves = getAllValidMoves(afterPlayer.board, afterPlayer.usedPieces);
  
  // If opponent has no moves, this is a winning move, not a trap
  if (opponentMoves.length === 0) return false;
  
  // If opponent can play, check if there's any opponent move that leaves player with no moves
  for (const oppMove of opponentMoves) {
    const afterOpponent = simulateMove(afterPlayer.board, afterPlayer.boardPieces, afterPlayer.usedPieces, oppMove, 2);
    const playerMovesAfter = getAllValidMoves(afterOpponent.board, afterOpponent.usedPieces);
    
    // If player has no moves after opponent plays, this is a trap
    if (playerMovesAfter.length === 0) {
      return true;
    }
  }
  
  return false;
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

// Generate an EASY puzzle (1 move) with trap possibilities
const generateEasyPuzzleWithTraps = (onProgress = null) => {
  // Try multiple games to find one with good trap conditions
  for (let attempt = 0; attempt < 50; attempt++) {
    if (onProgress) onProgress(attempt + 1, 50);
    
    const game = playCompleteGame();
    
    // Need at least 2 moves (so we can back out 1 and have the player move)
    if (game.totalMoves < 2) {
      continue;
    }
    
    // Get state from 1 move before end (player's turn)
    const puzzleStateIndex = game.totalMoves - 1;
    const puzzleState = game.history[puzzleStateIndex];
    
    if (!puzzleState) continue;
    
    // Get all valid moves from this state
    const allMoves = getAllValidMoves(puzzleState.board, puzzleState.usedPieces);
    if (allMoves.length === 0) continue;
    
    // Find winning moves and trap moves
    const winningMoves = [];
    const trapMoves = [];
    
    for (const move of allMoves) {
      if (isWinningMove(puzzleState.board, puzzleState.boardPieces, puzzleState.usedPieces, move)) {
        winningMoves.push(move);
      } else if (isTrapMove(puzzleState.board, puzzleState.boardPieces, puzzleState.usedPieces, move)) {
        trapMoves.push(move);
      }
    }
    
    // For a good EASY puzzle, we want:
    // - At least 1 winning move
    // - At least 1 trap move (wrong choice that looks valid)
    // - Multiple different pieces that can be played
    const winningPieces = getUniquePieceOptions(winningMoves);
    const trapPieces = getUniquePieceOptions(trapMoves);
    const allPieces = getUniquePieceOptions(allMoves);
    
    // We want at least 2 different pieces playable, with at least one trap
    if (winningMoves.length > 0 && trapMoves.length > 0 && allPieces.length >= 2) {
      console.log(`EASY puzzle generated: ${winningPieces.length} winning pieces, ${trapPieces.length} trap pieces, ${allPieces.length} total options`);
      
      return {
        id: `puzzle-easy-${Date.now()}`,
        name: 'Easy Puzzle',
        difficulty: PUZZLE_DIFFICULTY.EASY,
        description: '1 move remaining - choose wisely!',
        boardState: boardToString(puzzleState.boardPieces),
        usedPieces: [...puzzleState.usedPieces],
        movesRemaining: 1,
        // Store hint data (not shown to player but useful for debugging)
        _winningPieces: winningPieces,
        _trapPieces: trapPieces
      };
    }
  }
  
  console.error('Failed to generate EASY puzzle with traps after 50 attempts');
  return null;
};

// Generate puzzle by playing game then backing out N moves
export const generatePuzzle = (difficulty = PUZZLE_DIFFICULTY.EASY, onProgress = null) => {
  // Special handling for EASY puzzles with trap logic
  if (difficulty === PUZZLE_DIFFICULTY.EASY) {
    return generateEasyPuzzleWithTraps(onProgress);
  }
  
  const movesToBackOut = getMovesForDifficulty(difficulty);
  
  // Try multiple games to find one with enough moves
  for (let attempt = 0; attempt < 30; attempt++) {
    if (onProgress) onProgress(attempt + 1, 30);
    
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
  
  console.error(`Failed to generate ${difficulty} puzzle after 30 attempts`);
  return null;
};

// Simple 1-move puzzle for speed mode (less strict requirements)
export const generateSpeedPuzzle = () => {
  // Try to generate a simple 1-move puzzle
  for (let attempt = 0; attempt < 30; attempt++) {
    const game = playCompleteGame();
    
    // Need at least 2 moves (so we can back out 1)
    if (game.totalMoves < 2) {
      continue;
    }
    
    // Get state from 1 move before end
    const puzzleStateIndex = game.totalMoves - 1;
    const puzzleState = game.history[puzzleStateIndex];
    
    if (!puzzleState) continue;
    
    // Get all valid moves from this state
    const allMoves = getAllValidMoves(puzzleState.board, puzzleState.usedPieces);
    
    // Just need at least 1 valid move
    if (allMoves.length > 0) {
      console.log(`Speed puzzle generated: ${allMoves.length} possible moves`);
      
      return {
        id: `speed-puzzle-${Date.now()}`,
        name: 'Speed Puzzle',
        difficulty: PUZZLE_DIFFICULTY.EASY,
        description: '1 move to win!',
        boardState: boardToString(puzzleState.boardPieces),
        usedPieces: [...puzzleState.usedPieces],
        movesRemaining: 1
      };
    }
  }
  
  console.error('Failed to generate speed puzzle after 30 attempts');
  return null;
};

// Async wrapper
export const getRandomPuzzle = async (difficulty = PUZZLE_DIFFICULTY.EASY, useAI = false, onProgress = null) => {
  await new Promise(resolve => setTimeout(resolve, 50));
  
  const puzzle = generatePuzzle(difficulty, onProgress);
  
  if (puzzle && onProgress) {
    const maxProgress = difficulty === PUZZLE_DIFFICULTY.EASY ? 50 : 30;
    onProgress(maxProgress, maxProgress);
  }
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return puzzle;
};

// Async wrapper for speed puzzles (simpler, faster generation)
export const getSpeedPuzzle = async () => {
  await new Promise(resolve => setTimeout(resolve, 10));
  
  const puzzle = generateSpeedPuzzle();
  
  await new Promise(resolve => setTimeout(resolve, 10));
  
  return puzzle;
};
