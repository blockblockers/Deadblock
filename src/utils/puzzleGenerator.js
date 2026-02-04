// Puzzle Generator - Play complete game, then back out N moves
// v7.15.4: Enhanced with smart AI play and puzzle validation
// This guarantees exactly N moves remain and they are playable

import { pieces } from './pieces';
import { getPieceCoords, canPlacePiece, canAnyPieceBePlaced, BOARD_SIZE, createEmptyBoard } from './gameLogic';

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

// Get unique piece types from a list of moves
const getUniquePieceOptions = (moves) => {
  return [...new Set(moves.map(m => m.pieceType))];
};

// Simulate placing a move on the board
const simulateMove = (board, boardPieces, usedPieces, move, player) => {
  const newBoard = board.map(r => [...r]);
  const newBoardPieces = boardPieces.map(r => [...r]);
  const newUsedPieces = [...usedPieces, move.pieceType];
  
  for (const [dx, dy] of move.coords) {
    newBoard[move.row + dy][move.col + dx] = player;
    newBoardPieces[move.row + dy][move.col + dx] = move.pieceType;
  }
  
  return { board: newBoard, boardPieces: newBoardPieces, usedPieces: newUsedPieces };
};

// =====================================================
// SMART MOVE SELECTION (replaces pure random)
// =====================================================

// Quick evaluation for move quality - prefers center positions
const quickEval = (board, row, col, coords) => {
  let score = 0;
  for (const [dx, dy] of coords) {
    const r = row + dy;
    const c = col + dx;
    // Center preference
    score += (3.5 - Math.abs(r - 3.5)) + (3.5 - Math.abs(c - 3.5));
  }
  return score;
};

// Select a strategic move (similar to AI AVERAGE difficulty)
// This creates more realistic game states for puzzles
const selectStrategicMove = (board, usedPieces, isEarlyGame) => {
  const moves = getAllValidMoves(board, usedPieces);
  if (moves.length === 0) return null;
  
  if (isEarlyGame) {
    // Early game: prefer center positions with some randomness
    const scored = moves.map(m => ({
      ...m,
      score: quickEval(board, m.row, m.col, m.coords) + Math.random() * 8
    }));
    scored.sort((a, b) => b.score - a.score);
    const topMoves = scored.slice(0, Math.min(3, scored.length));
    return topMoves[Math.floor(Math.random() * topMoves.length)];
  }
  
  // Mid/late game: evaluate by position quality
  const scored = moves.map(m => {
    const newBoard = simulateMove(board, [], usedPieces, m, 1).board;
    const newUsedPieces = [...usedPieces, m.pieceType];
    // Count how many pieces opponent can still play
    const opponentMoveCount = getAllValidMoves(newBoard, newUsedPieces).length;
    // Prefer moves that limit opponent options
    return { ...m, score: -opponentMoveCount + Math.random() * 5 };
  });
  
  scored.sort((a, b) => b.score - a.score);
  const topMoves = scored.slice(0, Math.min(2, scored.length));
  return topMoves[Math.floor(Math.random() * topMoves.length)];
};

// =====================================================
// PUZZLE VALIDATION
// =====================================================

/**
 * Validates that a puzzle truly requires exactly N moves to win.
 * Uses minimax-like search to find the minimum moves needed.
 * 
 * @param {Array} board - Current board state
 * @param {Array} usedPieces - Already used pieces
 * @param {number} expectedMoves - Expected moves to win (from difficulty)
 * @returns {Object} { isValid, actualMinMoves, hasWinningPath }
 */
const validatePuzzleDifficulty = (board, usedPieces, expectedMoves) => {
  // Find minimum moves required to reach a winning state
  const findMinMovesToWin = (currentBoard, currentUsedPieces, depth, maxDepth) => {
    const moves = getAllValidMoves(currentBoard, currentUsedPieces);
    
    if (moves.length === 0) {
      // No moves available - this is a win/loss state
      return 0; // Can win in 0 more moves (current position is winning)
    }
    
    if (depth >= maxDepth) {
      // Reached max depth without finding a shorter path
      return maxDepth + 1;
    }
    
    let minMoves = maxDepth + 1;
    
    for (const move of moves) {
      const result = simulateMove(currentBoard, [], currentUsedPieces, move, 1);
      const opponentMoves = getAllValidMoves(result.board, result.usedPieces);
      
      if (opponentMoves.length === 0) {
        // This move wins immediately!
        return 1;
      }
      
      // Simulate opponent's best response (tries to extend the game)
      let worstCaseForPlayer = 0;
      for (const oppMove of opponentMoves.slice(0, 5)) { // Limit search
        const afterOpp = simulateMove(result.board, [], result.usedPieces, oppMove, 2);
        const recursiveResult = findMinMovesToWin(afterOpp.board, afterOpp.usedPieces, depth + 1, maxDepth);
        worstCaseForPlayer = Math.max(worstCaseForPlayer, recursiveResult);
      }
      
      // +1 for current move, +1 for opponent's move
      const totalMoves = 1 + 1 + worstCaseForPlayer;
      minMoves = Math.min(minMoves, totalMoves);
    }
    
    return minMoves;
  };
  
  // Check if there's any path to victory within expectedMoves
  const hasWinningPath = (currentBoard, currentUsedPieces, movesLeft) => {
    if (movesLeft <= 0) return false;
    
    const moves = getAllValidMoves(currentBoard, currentUsedPieces);
    if (moves.length === 0) return true; // No moves = we win
    
    for (const move of moves) {
      const result = simulateMove(currentBoard, [], currentUsedPieces, move, 1);
      const opponentMoves = getAllValidMoves(result.board, result.usedPieces);
      
      if (opponentMoves.length === 0) {
        // This move wins!
        return true;
      }
      
      if (movesLeft === 1) continue; // No more moves after this one
      
      // Check if player can still win after opponent plays
      let canStillWin = true;
      for (const oppMove of opponentMoves.slice(0, 3)) {
        const afterOpp = simulateMove(result.board, [], result.usedPieces, oppMove, 2);
        if (!hasWinningPath(afterOpp.board, afterOpp.usedPieces, movesLeft - 1)) {
          canStillWin = false;
          break;
        }
      }
      
      if (canStillWin) return true;
    }
    
    return false;
  };
  
  // Run validation
  const canWin = hasWinningPath(board, usedPieces, expectedMoves);
  
  // For simpler puzzles, also check minimum moves
  let actualMinMoves = expectedMoves;
  if (expectedMoves <= 3) {
    actualMinMoves = findMinMovesToWin(board, usedPieces, 0, expectedMoves);
  }
  
  return {
    isValid: canWin && actualMinMoves >= expectedMoves - 1, // Allow 1 move variance
    actualMinMoves,
    hasWinningPath: canWin
  };
};

// =====================================================
// WINNING/TRAP MOVE DETECTION (for EASY puzzles)
// =====================================================

// Check if a move results in a winning state (opponent can't play)
const isWinningMove = (board, boardPieces, usedPieces, move) => {
  const result = simulateMove(board, boardPieces, usedPieces, move, 1);
  const opponentMoves = getAllValidMoves(result.board, result.usedPieces);
  return opponentMoves.length === 0;
};

// Check if a move is a "trap" - looks valid but lets opponent win
const isTrapMove = (board, boardPieces, usedPieces, move) => {
  const afterPlayer = simulateMove(board, boardPieces, usedPieces, move, 1);
  const opponentMoves = getAllValidMoves(afterPlayer.board, afterPlayer.usedPieces);
  
  if (opponentMoves.length === 0) return false; // This is a winning move, not a trap
  
  // Check if any opponent move leaves player with no moves
  for (const oppMove of opponentMoves) {
    const afterOpponent = simulateMove(afterPlayer.board, afterPlayer.boardPieces, afterPlayer.usedPieces, oppMove, 2);
    const playerMovesAfter = getAllValidMoves(afterOpponent.board, afterOpponent.usedPieces);
    
    if (playerMovesAfter.length === 0) {
      return true; // This move lets opponent win
    }
  }
  
  return false;
};

// =====================================================
// GAME SIMULATION (with smart AI)
// =====================================================

// Play a complete game using strategic AI moves
const playCompleteGame = () => {
  let board = createEmptyBoard();
  let boardPieces = createEmptyBoard();
  let usedPieces = [];
  const history = [];
  let currentPlayer = 1;
  let moveCount = 0;
  
  while (moveCount < 12) {
    const isEarlyGame = moveCount < 4;
    
    // Save state BEFORE this move
    history.push({
      board: board.map(r => [...r]),
      boardPieces: boardPieces.map(r => [...r]),
      usedPieces: [...usedPieces],
      player: currentPlayer
    });
    
    // Use strategic move selection (not pure random)
    const move = selectStrategicMove(board, usedPieces, isEarlyGame);
    
    if (!move) break;
    
    // Apply move
    for (const [dx, dy] of move.coords) {
      board[move.row + dy][move.col + dx] = currentPlayer;
      boardPieces[move.row + dy][move.col + dx] = move.pieceType;
    }
    usedPieces.push(move.pieceType);
    moveCount++;
    
    // Switch player
    currentPlayer = currentPlayer === 1 ? 2 : 1;
  }
  
  return {
    history,
    totalMoves: moveCount
  };
};

// =====================================================
// EASY PUZZLE GENERATION (with traps)
// =====================================================

const generateEasyPuzzleWithTraps = (onProgress = null) => {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (onProgress) onProgress(attempt + 1, 50);
    
    const game = playCompleteGame();
    
    if (game.totalMoves < 2) continue;
    
    // Get state from 1 move before end
    const puzzleStateIndex = game.totalMoves - 1;
    const puzzleState = game.history[puzzleStateIndex];
    
    if (!puzzleState) continue;
    
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
    
    const winningPieces = getUniquePieceOptions(winningMoves);
    const trapPieces = getUniquePieceOptions(trapMoves);
    const allPieces = getUniquePieceOptions(allMoves);
    
    // Good EASY puzzle: at least 1 winning move, ideally some traps
    if (winningMoves.length > 0 && allPieces.length >= 2) {
      // Validate the puzzle
      const validation = validatePuzzleDifficulty(puzzleState.board, puzzleState.usedPieces, 1);
      
      if (validation.isValid) {
        console.log(`EASY puzzle generated: ${winningPieces.length} winning pieces, ${trapPieces.length} trap pieces, ${allPieces.length} total options (validated)`);
        
        return {
          id: `puzzle-easy-${Date.now()}`,
          name: 'Easy Puzzle',
          difficulty: PUZZLE_DIFFICULTY.EASY,
          description: '1 move remaining - choose wisely!',
          boardState: boardToString(puzzleState.boardPieces),
          usedPieces: [...puzzleState.usedPieces],
          movesRemaining: 1,
          _winningPieces: winningPieces,
          _trapPieces: trapPieces,
          _validated: true
        };
      }
    }
  }
  
  console.error('Failed to generate EASY puzzle with traps after 50 attempts');
  return null;
};

// =====================================================
// MEDIUM/HARD PUZZLE GENERATION (with validation)
// =====================================================

export const generatePuzzle = (difficulty = PUZZLE_DIFFICULTY.EASY, onProgress = null) => {
  if (difficulty === PUZZLE_DIFFICULTY.EASY) {
    return generateEasyPuzzleWithTraps(onProgress);
  }
  
  const movesToBackOut = getMovesForDifficulty(difficulty);
  
  for (let attempt = 0; attempt < 30; attempt++) {
    if (onProgress) onProgress(attempt + 1, 30);
    
    const game = playCompleteGame();
    
    if (game.totalMoves < movesToBackOut) {
      console.log(`Game ${attempt + 1}: Only ${game.totalMoves} moves, need ${movesToBackOut}`);
      continue;
    }
    
    const puzzleStateIndex = game.totalMoves - movesToBackOut;
    const puzzleState = game.history[puzzleStateIndex];
    
    if (!puzzleState) {
      console.log(`Game ${attempt + 1}: No state at index ${puzzleStateIndex}`);
      continue;
    }
    
    const remainingMoves = getAllValidMoves(puzzleState.board, puzzleState.usedPieces);
    
    if (remainingMoves.length > 0) {
      // Validate puzzle difficulty
      const validation = validatePuzzleDifficulty(puzzleState.board, puzzleState.usedPieces, movesToBackOut);
      
      if (!validation.isValid) {
        console.log(`Game ${attempt + 1}: Puzzle failed validation (can win in ${validation.actualMinMoves} moves, need ${movesToBackOut})`);
        continue;
      }
      
      console.log(`Puzzle generated (${difficulty}): ${puzzleState.usedPieces.length} pieces placed, ${movesToBackOut} moves required (validated)`);
      
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
        movesRemaining: movesToBackOut,
        _validated: true
      };
    }
  }
  
  console.error(`Failed to generate ${difficulty} puzzle after 30 attempts`);
  return null;
};

// =====================================================
// SPEED PUZZLE GENERATION
// =====================================================

export const generateSpeedPuzzle = () => {
  let bestPuzzle = null;
  let bestWinRatio = 0;
  
  for (let attempt = 0; attempt < 50; attempt++) {
    const game = playCompleteGame();
    
    if (game.totalMoves < 2) continue;
    
    const puzzleStateIndex = game.totalMoves - 1;
    const puzzleState = game.history[puzzleStateIndex];
    
    if (!puzzleState) continue;
    
    const allMoves = getAllValidMoves(puzzleState.board, puzzleState.usedPieces);
    if (allMoves.length === 0) continue;
    
    // Find winning moves
    const winningMoves = [];
    
    for (const move of allMoves) {
      const testBoard = puzzleState.board.map(r => [...r]);
      const testUsedPieces = [...puzzleState.usedPieces, move.pieceType];
      
      for (const [dx, dy] of move.coords) {
        testBoard[move.row + dy][move.col + dx] = 1;
      }
      
      const opponentCanPlay = canAnyPieceBePlaced(testBoard, testUsedPieces);
      
      if (!opponentCanPlay) {
        winningMoves.push(move);
      }
    }
    
    if (winningMoves.length > 0) {
      const winRatio = winningMoves.length / allMoves.length;
      
      // Ideal: 100% win ratio (any valid move wins)
      if (winRatio >= 1.0) {
        console.log(`Speed puzzle generated: ${winningMoves.length} winning moves out of ${allMoves.length} total moves (PERFECT - 100%)`);
        return {
          id: `speed-puzzle-${Date.now()}`,
          name: 'Speed Puzzle',
          difficulty: PUZZLE_DIFFICULTY.EASY,
          description: '1 move to win!',
          boardState: boardToString(puzzleState.boardPieces),
          usedPieces: [...puzzleState.usedPieces],
          movesRemaining: 1,
          _winningMoveCount: winningMoves.length,
          _totalMoves: allMoves.length
        };
      }
      
      if (winRatio > bestWinRatio) {
        bestWinRatio = winRatio;
        bestPuzzle = {
          id: `speed-puzzle-${Date.now()}`,
          name: 'Speed Puzzle',
          difficulty: PUZZLE_DIFFICULTY.EASY,
          description: '1 move to win!',
          boardState: boardToString(puzzleState.boardPieces),
          usedPieces: [...puzzleState.usedPieces],
          movesRemaining: 1,
          _winningMoveCount: winningMoves.length,
          _totalMoves: allMoves.length
        };
      }
    }
  }
  
  if (bestPuzzle && bestWinRatio >= 0.5) {
    console.log(`Speed puzzle generated: ${bestPuzzle._winningMoveCount} winning moves out of ${bestPuzzle._totalMoves} total moves (${Math.round(bestWinRatio * 100)}%)`);
    return bestPuzzle;
  }
  
  if (bestPuzzle) {
    console.log(`Speed puzzle generated (low quality): ${bestPuzzle._winningMoveCount} winning moves out of ${bestPuzzle._totalMoves} total moves (${Math.round(bestWinRatio * 100)}%)`);
    return bestPuzzle;
  }
  
  console.error('Failed to generate winning speed puzzle after 50 attempts');
  return null;
};

// =====================================================
// SEEDED PUZZLE GENERATION (for Weekly Challenges)
// =====================================================

const createSeededRandom = (seed) => {
  let a = 0;
  for (let i = 0; i < seed.length; i++) {
    a = ((a << 5) - a) + seed.charCodeAt(i);
    a = a & a;
  }
  a = Math.abs(a);
  
  return () => {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
};

// Seeded version with strategic move selection
const playCompleteGameSeeded = (random) => {
  let board = createEmptyBoard();
  let boardPieces = createEmptyBoard();
  let usedPieces = [];
  const history = [];
  let currentPlayer = 1;
  let moveCount = 0;
  
  while (moveCount < 12) {
    const moves = getAllValidMoves(board, usedPieces);
    if (moves.length === 0) break;
    
    history.push({
      board: board.map(r => [...r]),
      boardPieces: boardPieces.map(r => [...r]),
      usedPieces: [...usedPieces],
      player: currentPlayer
    });
    
    // Use strategic selection with seeded randomness
    let move;
    if (moveCount < 4) {
      // Early game: center preference
      const scored = moves.map(m => ({
        ...m,
        score: quickEval(board, m.row, m.col, m.coords) + random() * 8
      }));
      scored.sort((a, b) => b.score - a.score);
      const topMoves = scored.slice(0, Math.min(3, scored.length));
      move = topMoves[Math.floor(random() * topMoves.length)];
    } else {
      // Later: position evaluation
      const scored = moves.map(m => {
        const newBoard = simulateMove(board, [], usedPieces, m, currentPlayer).board;
        const oppMoves = getAllValidMoves(newBoard, [...usedPieces, m.pieceType]).length;
        return { ...m, score: -oppMoves + random() * 5 };
      });
      scored.sort((a, b) => b.score - a.score);
      const topMoves = scored.slice(0, Math.min(2, scored.length));
      move = topMoves[Math.floor(random() * topMoves.length)];
    }
    
    // Apply move
    for (const [dx, dy] of move.coords) {
      board[move.row + dy][move.col + dx] = currentPlayer;
      boardPieces[move.row + dy][move.col + dx] = move.pieceType;
    }
    usedPieces.push(move.pieceType);
    moveCount++;
    
    currentPlayer = currentPlayer === 1 ? 2 : 1;
  }
  
  return {
    history,
    totalMoves: moveCount
  };
};

const generateSeededPuzzle = (seed, difficulty = PUZZLE_DIFFICULTY.HARD) => {
  const random = createSeededRandom(seed);
  const movesToBackOut = getMovesForDifficulty(difficulty);
  
  for (let attempt = 0; attempt < 30; attempt++) {
    const game = playCompleteGameSeeded(random);
    
    if (game.totalMoves < movesToBackOut) continue;
    
    const puzzleStateIndex = game.totalMoves - movesToBackOut;
    const puzzleState = game.history[puzzleStateIndex];
    
    if (!puzzleState) continue;
    
    const allMoves = getAllValidMoves(puzzleState.board, puzzleState.usedPieces);
    
    if (allMoves.length > 0) {
      // Validate the puzzle
      const validation = validatePuzzleDifficulty(puzzleState.board, puzzleState.usedPieces, movesToBackOut);
      
      if (!validation.hasWinningPath) {
        console.log(`Seeded puzzle attempt ${attempt + 1}: No winning path found`);
        continue;
      }
      
      console.log(`Seeded puzzle generated from seed "${seed}": ${allMoves.length} possible moves (validated)`);
      
      return {
        id: `seeded-puzzle-${seed}`,
        name: 'Weekly Challenge',
        difficulty: difficulty,
        description: `${movesToBackOut} move${movesToBackOut > 1 ? 's' : ''} to win!`,
        boardState: boardToString(puzzleState.boardPieces),
        usedPieces: [...puzzleState.usedPieces],
        movesRemaining: movesToBackOut,
        seed: seed,
        _validated: true
      };
    }
  }
  
  console.error(`Failed to generate seeded puzzle from seed "${seed}" after 30 attempts`);
  return null;
};

// =====================================================
// ASYNC WRAPPERS
// =====================================================

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

export const getSpeedPuzzle = async () => {
  await new Promise(resolve => setTimeout(resolve, 10));
  
  const puzzle = generateSpeedPuzzle();
  
  await new Promise(resolve => setTimeout(resolve, 10));
  
  return puzzle;
};

export const getSeededPuzzle = async (seed, difficulty = PUZZLE_DIFFICULTY.HARD) => {
  await new Promise(resolve => setTimeout(resolve, 50));
  
  const puzzle = generateSeededPuzzle(seed, difficulty);
  
  await new Promise(resolve => setTimeout(resolve, 50));
  
  return puzzle;
};

export default {
  PUZZLE_DIFFICULTY,
  getMovesForDifficulty,
  generatePuzzle,
  generateSpeedPuzzle,
  getRandomPuzzle,
  getSpeedPuzzle,
  getSeededPuzzle
};
