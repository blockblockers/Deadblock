// Puzzle Generator - Enhanced with Board Variety & Solution Uniqueness
// v2.1 - TIMEOUT PROTECTION UPDATE
// 
// FIXES:
// ✅ Pieces now spread across entire board (not clustered in center)
// ✅ Zone-based scoring rotates preferred placement areas each move
// ✅ Solution uniqueness validation - prefer puzzles with 1-3 winning paths
// ✅ Opening moves forced to different quadrants for variety
// ✅ Reduced adjacency bonus to prevent clustering
// ✅ v2.1: Timeout protection prevents infinite loops (3s max)
// ✅ v2.1: Expensive uniqueness check disabled by default for performance

import { pieces } from './pieces';
import { getPieceCoords, canPlacePiece, canAnyPieceBePlaced, BOARD_SIZE, createEmptyBoard } from './gameLogic';

// =====================================================
// TIMEOUT PROTECTION - Prevents infinite loops on slow devices
// =====================================================
const PUZZLE_GENERATION_TIMEOUT_MS = 3000; // 3 seconds max per generation call
const UNIQUENESS_CHECK_TIME_BUDGET_MS = 1500; // Only run expensive check if under this time
const ENABLE_UNIQUENESS_CHECK = false; // Disabled by default for performance

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

// =====================================================
// ZONE-BASED VARIETY SYSTEM (replaces center-biased quickEval)
// =====================================================

const ZONES = {
  TOP_LEFT: (r, c) => (r < 4 && c < 4) ? 6 : 0,
  TOP_RIGHT: (r, c) => (r < 4 && c >= 4) ? 6 : 0,
  BOTTOM_LEFT: (r, c) => (r >= 4 && c < 4) ? 6 : 0,
  BOTTOM_RIGHT: (r, c) => (r >= 4 && c >= 4) ? 6 : 0,
  CENTER: (r, c) => (r >= 2 && r <= 5 && c >= 2 && c <= 5) ? 5 : 0,
  EDGES: (r, c) => (r === 0 || r === 7 || c === 0 || c === 7) ? 4 : 0,
  CORNERS: (r, c) => ((r <= 1 || r >= 6) && (c <= 1 || c >= 6)) ? 5 : 0,
};

const ZONE_ORDER = ['TOP_LEFT', 'BOTTOM_RIGHT', 'TOP_RIGHT', 'BOTTOM_LEFT', 'CORNERS', 'CENTER', 'EDGES'];

// Get varied evaluation score based on move count (rotates through zones)
const getVariedEval = (board, row, col, coords, moveCount) => {
  // Rotate through different zone preferences based on move number
  const preferredZoneName = ZONE_ORDER[moveCount % ZONE_ORDER.length];
  const preferredZone = ZONES[preferredZoneName];
  
  let score = 0;
  for (const [dx, dy] of coords) {
    const r = row + dy;
    const c = col + dx;
    if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
      score += preferredZone(r, c);
    }
  }
  
  // Add high randomness for variety (more than before)
  score += Math.random() * 15;
  
  return score;
};

// Legacy quickEval for backward compatibility (used in some places)
const quickEval = (board, row, col, coords) => {
  let score = 0;
  for (const [dx, dy] of coords) {
    const r = row + dy;
    const c = col + dx;
    score += (3.5 - Math.abs(r - 3.5)) + (3.5 - Math.abs(c - 3.5));
  }
  return score;
};

// =====================================================
// STRATEGIC MOVE SELECTION WITH VARIETY
// =====================================================

// Select a strategic move with zone-based variety
const selectStrategicMove = (board, usedPieces, moveCount) => {
  const moves = getAllValidMoves(board, usedPieces);
  if (moves.length === 0) return null;
  
  // Score every move by zone preference + board coverage
  const scored = moves.map(m => {
    let score = getVariedEval(board, m.row, m.col, m.coords, moveCount);
    
    // Light adjacency bonus after first few moves (reduced from 2 to 0.5)
    if (moveCount >= 3) {
      let adjacencyBonus = 0;
      for (const [dx, dy] of m.coords) {
        const r = m.row + dy;
        const c = m.col + dx;
        // Check all 4 neighbors for occupied cells
        if (r > 0 && board[r - 1][c]) adjacencyBonus += 0.5;
        if (r < BOARD_SIZE - 1 && board[r + 1][c]) adjacencyBonus += 0.5;
        if (c > 0 && board[r][c - 1]) adjacencyBonus += 0.5;
        if (c < BOARD_SIZE - 1 && board[r][c + 1]) adjacencyBonus += 0.5;
      }
      score += adjacencyBonus;
    }
    
    return { ...m, score };
  });
  
  scored.sort((a, b) => b.score - a.score);
  
  // Pick from top 5 for more variety (increased from top 2-3)
  const topMoves = scored.slice(0, Math.min(5, scored.length));
  return topMoves[Math.floor(Math.random() * topMoves.length)];
};

// Get opening move forced to specific quadrant for variety
const getOpeningMove = (board, usedPieces, moveCount) => {
  const moves = getAllValidMoves(board, usedPieces);
  if (moves.length === 0) return null;
  
  // Force different quadrants for first 4 moves
  const quadrantFilters = [
    (r, c) => r < 3 && c < 3,       // Move 0: Top-left corner area
    (r, c) => r >= 5 && c >= 5,     // Move 1: Bottom-right corner area
    (r, c) => r < 3 && c >= 5,      // Move 2: Top-right corner area
    (r, c) => r >= 5 && c < 3,      // Move 3: Bottom-left corner area
  ];
  
  if (moveCount < quadrantFilters.length) {
    const filter = quadrantFilters[moveCount];
    const filtered = moves.filter(m => {
      // Check if any cell of the piece is in preferred quadrant
      return m.coords.some(([dx, dy]) => filter(m.row + dy, m.col + dx));
    });
    
    if (filtered.length > 0) {
      // Pick randomly from filtered moves
      return filtered[Math.floor(Math.random() * filtered.length)];
    }
  }
  
  // Fallback to varied selection
  return selectStrategicMove(board, usedPieces, moveCount);
};

// =====================================================
// SOLUTION UNIQUENESS VALIDATION
// =====================================================

// Count winning paths from a puzzle state (limited depth for performance)
const countWinningPaths = (board, boardPieces, usedPieces, movesRemaining, depth = 0) => {
  // Performance limits
  const MAX_DEPTH = 2;
  const MAX_MOVES_TO_CHECK = 8;
  
  if (depth > MAX_DEPTH) return 0;
  
  const moves = getAllValidMoves(board, usedPieces);
  if (moves.length === 0) return 0;
  
  let winningPaths = 0;
  const movesToCheck = moves.slice(0, MAX_MOVES_TO_CHECK);
  
  for (const move of movesToCheck) {
    const result = simulateMove(board, boardPieces, usedPieces, move, 1);
    const opponentMoves = getAllValidMoves(result.board, result.usedPieces);
    
    if (opponentMoves.length === 0) {
      // Immediate win
      winningPaths++;
    } else if (movesRemaining > 1 && depth < MAX_DEPTH) {
      // Check if any path through opponent responses leads to win
      const oppMovesToCheck = opponentMoves.slice(0, 3); // Limit opponent moves
      for (const oppMove of oppMovesToCheck) {
        const afterOpp = simulateMove(result.board, result.boardPieces, result.usedPieces, oppMove, 2);
        winningPaths += countWinningPaths(
          afterOpp.board, 
          afterOpp.boardPieces, 
          afterOpp.usedPieces, 
          movesRemaining - 1,
          depth + 1
        );
      }
    }
  }
  
  return winningPaths;
};

// Score puzzle by uniqueness (fewer winning paths = better)
const getUniquenessScore = (winningPaths) => {
  if (winningPaths === 1) return 100;  // Perfect: exactly one solution
  if (winningPaths <= 3) return 80;    // Great: very few solutions
  if (winningPaths <= 6) return 50;    // Good: limited solutions
  if (winningPaths <= 10) return 30;   // OK: several solutions
  return 10;                            // Many solutions
};

// =====================================================
// GAME SIMULATION FOR PUZZLE GENERATION
// =====================================================

// Play a complete AI vs AI game using varied strategic moves
const playCompleteGame = () => {
  const board = createEmptyBoard();
  const boardPieces = createEmptyBoard();
  const usedPieces = [];
  const history = []; // Each entry: { board, boardPieces, usedPieces } BEFORE the move
  
  let moveCount = 0;
  
  while (true) {
    // Save state BEFORE this move
    history.push({
      board: board.map(r => [...r]),
      boardPieces: boardPieces.map(r => [...r]),
      usedPieces: [...usedPieces]
    });
    
    // Use opening move for first 4 moves (quadrant-based), then strategic
    const move = moveCount < 4 
      ? getOpeningMove(board, usedPieces, moveCount)
      : selectStrategicMove(board, usedPieces, moveCount);
    
    if (!move) break;
    
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

// =====================================================
// PUZZLE GENERATORS
// =====================================================

// Generate an EASY puzzle (1 move) with trap possibilities
const generateEasyPuzzleWithTraps = (onProgress = null) => {
  let bestPuzzle = null;
  let bestScore = 0;
  const startTime = Date.now();
  
  // Try multiple games to find one with good trap conditions
  for (let attempt = 0; attempt < 50; attempt++) {
    // Timeout protection
    if (Date.now() - startTime > PUZZLE_GENERATION_TIMEOUT_MS) {
      console.warn(`[PuzzleGen] EASY timeout after ${attempt} attempts, returning best found`);
      break;
    }
    
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
    
    // Score this puzzle
    const winningPieces = getUniquePieceOptions(winningMoves);
    const trapPieces = getUniquePieceOptions(trapMoves);
    const allPieces = getUniquePieceOptions(allMoves);
    
    // Calculate puzzle quality score
    let puzzleScore = 0;
    
    // Must have at least 1 winning move
    if (winningMoves.length === 0) continue;
    
    // Prefer puzzles with traps (makes it challenging)
    if (trapMoves.length > 0) puzzleScore += 30;
    
    // Prefer puzzles with fewer winning pieces (harder to guess)
    if (winningPieces.length === 1) puzzleScore += 40;
    else if (winningPieces.length === 2) puzzleScore += 20;
    
    // Prefer puzzles with multiple piece options (interesting choices)
    if (allPieces.length >= 3) puzzleScore += 20;
    
    // Prefer puzzles with board variety (pieces not all clustered)
    const boardSpread = calculateBoardSpread(puzzleState.boardPieces);
    puzzleScore += boardSpread;
    
    // Check if this is the best puzzle so far
    if (puzzleScore > bestScore) {
      bestScore = puzzleScore;
      bestPuzzle = {
        id: `puzzle-easy-${Date.now()}`,
        name: 'Easy Puzzle',
        difficulty: PUZZLE_DIFFICULTY.EASY,
        description: '1 move remaining - choose wisely!',
        boardState: boardToString(puzzleState.boardPieces),
        usedPieces: [...puzzleState.usedPieces],
        movesRemaining: 1,
        _winningPieces: winningPieces,
        _trapPieces: trapPieces,
        _score: puzzleScore
      };
      
      // If we found a great puzzle, use it
      if (puzzleScore >= 80) {
        console.log(`EASY puzzle generated (score ${puzzleScore}): ${winningPieces.length} winning pieces, ${trapPieces.length} trap pieces`);
        return bestPuzzle;
      }
    }
  }
  
  if (bestPuzzle) {
    console.log(`EASY puzzle generated (score ${bestScore}): best found after 50 attempts`);
    return bestPuzzle;
  }
  
  console.error('Failed to generate EASY puzzle after 50 attempts');
  return null;
};

// Calculate how spread out pieces are on the board (higher = more variety)
const calculateBoardSpread = (boardPieces) => {
  let minRow = 7, maxRow = 0, minCol = 7, maxCol = 0;
  let pieceCount = 0;
  
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (boardPieces[r][c]) {
        pieceCount++;
        minRow = Math.min(minRow, r);
        maxRow = Math.max(maxRow, r);
        minCol = Math.min(minCol, c);
        maxCol = Math.max(maxCol, c);
      }
    }
  }
  
  if (pieceCount === 0) return 0;
  
  // Calculate spread as percentage of board used
  const rowSpread = maxRow - minRow + 1;
  const colSpread = maxCol - minCol + 1;
  const areaUsed = rowSpread * colSpread;
  const spreadScore = (areaUsed / 64) * 30; // Max 30 points for full board spread
  
  return Math.round(spreadScore);
};

// Generate puzzle by playing game then backing out N moves
export const generatePuzzle = (difficulty = PUZZLE_DIFFICULTY.EASY, onProgress = null) => {
  // Special handling for EASY puzzles with trap logic
  if (difficulty === PUZZLE_DIFFICULTY.EASY) {
    return generateEasyPuzzleWithTraps(onProgress);
  }
  
  const movesToBackOut = getMovesForDifficulty(difficulty);
  let bestPuzzle = null;
  let bestUniquenessScore = 0;
  const startTime = Date.now();
  
  // Try multiple games to find one with enough moves
  for (let attempt = 0; attempt < 30; attempt++) {
    // Timeout protection
    if (Date.now() - startTime > PUZZLE_GENERATION_TIMEOUT_MS) {
      console.warn(`[PuzzleGen] ${difficulty} timeout after ${attempt} attempts, returning best found`);
      break;
    }
    
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
    
    if (remainingMoves.length === 0) continue;
    
    // Calculate solution uniqueness (only if enabled and within time budget)
    let winningPaths = 0;
    let uniquenessScore = 50; // Default mid-score when check is skipped
    const elapsedTime = Date.now() - startTime;
    
    if (ENABLE_UNIQUENESS_CHECK && elapsedTime < UNIQUENESS_CHECK_TIME_BUDGET_MS) {
      winningPaths = countWinningPaths(
        puzzleState.board, 
        puzzleState.boardPieces, 
        puzzleState.usedPieces, 
        movesToBackOut
      );
      uniquenessScore = getUniquenessScore(winningPaths);
    }
    
    // Calculate board spread
    const spreadScore = calculateBoardSpread(puzzleState.boardPieces);
    const totalScore = uniquenessScore + spreadScore;
    
    // Track best puzzle
    if (totalScore > bestUniquenessScore) {
      bestUniquenessScore = totalScore;
      
      const difficultyNames = {
        [PUZZLE_DIFFICULTY.EASY]: 'Easy',
        [PUZZLE_DIFFICULTY.MEDIUM]: 'Medium',
        [PUZZLE_DIFFICULTY.HARD]: 'Hard'
      };
      
      bestPuzzle = {
        id: `puzzle-${difficulty}-${Date.now()}`,
        name: `${difficultyNames[difficulty]} Puzzle`,
        difficulty: difficulty,
        description: `${movesToBackOut} moves remaining`,
        boardState: boardToString(puzzleState.boardPieces),
        usedPieces: [...puzzleState.usedPieces],
        movesRemaining: movesToBackOut,
        _winningPaths: winningPaths,
        _uniquenessScore: uniquenessScore,
        _spreadScore: spreadScore
      };
      
      // If we found a great puzzle (unique solution + good spread), use it
      if (uniquenessScore >= 80 && spreadScore >= 15) {
        console.log(`Puzzle generated (${difficulty}): ${winningPaths} winning paths, spread ${spreadScore}`);
        return bestPuzzle;
      }
    }
  }
  
  if (bestPuzzle) {
    console.log(`Puzzle generated (${difficulty}): best found with score ${bestUniquenessScore}`);
    return bestPuzzle;
  }
  
  console.error(`Failed to generate ${difficulty} puzzle after 30 attempts`);
  return null;
};

// Simple 1-move puzzle for speed mode (less strict requirements)
// Prefer puzzles where most/all moves are winning moves to reduce frustration
export const generateSpeedPuzzle = () => {
  let bestPuzzle = null;
  let bestWinRatio = 0;
  const startTime = Date.now();
  
  for (let attempt = 0; attempt < 50; attempt++) {
    // Timeout protection
    if (Date.now() - startTime > PUZZLE_GENERATION_TIMEOUT_MS) {
      console.warn(`[PuzzleGen] Speed puzzle timeout after ${attempt} attempts, returning best found`);
      break;
    }
    
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
    
    if (allMoves.length === 0) continue;
    
    // Check each possible move to see if any leads to a winning state
    const winningMoves = [];
    
    for (const move of allMoves) {
      // Simulate placing this piece
      const testBoard = puzzleState.board.map(r => [...r]);
      const testUsedPieces = [...puzzleState.usedPieces, move.pieceType];
      
      for (const [dx, dy] of move.coords) {
        testBoard[move.row + dy][move.col + dx] = 1;
      }
      
      // Check if ANY unused piece can be placed after this move
      const opponentCanPlay = canAnyPieceBePlaced(testBoard, testUsedPieces);
      
      if (!opponentCanPlay) {
        // This is a winning move!
        winningMoves.push(move);
      }
    }
    
    // If we found winning moves, check if this is a good puzzle
    if (winningMoves.length > 0) {
      const winRatio = winningMoves.length / allMoves.length;
      
      // Ideal puzzle: ALL moves are winning (100% win ratio)
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
      
      // Track the best puzzle we've found so far
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
  
  // Return the best puzzle found (prefer 50%+ win ratio)
  if (bestPuzzle && bestWinRatio >= 0.5) {
    console.log(`Speed puzzle generated: ${bestPuzzle._winningMoveCount} winning moves out of ${bestPuzzle._totalMoves} total moves (${Math.round(bestWinRatio * 100)}%)`);
    return bestPuzzle;
  }
  
  // If no good puzzle found, return the best we have (even if low win ratio)
  if (bestPuzzle) {
    console.log(`Speed puzzle generated (low quality): ${bestPuzzle._winningMoveCount} winning moves out of ${bestPuzzle._totalMoves} total moves (${Math.round(bestWinRatio * 100)}%)`);
    return bestPuzzle;
  }
  
  console.error('Failed to generate winning speed puzzle after 50 attempts');
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

// =====================================================
// SEEDED PUZZLE GENERATION (for Weekly Challenges)
// =====================================================

// Simple seeded random number generator (Mulberry32)
const createSeededRandom = (seed) => {
  // Convert string seed to number
  let a = 0;
  for (let i = 0; i < seed.length; i++) {
    a = ((a << 5) - a) + seed.charCodeAt(i);
    a = a & a; // Convert to 32-bit integer
  }
  a = Math.abs(a);
  
  return () => {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
};

// Seeded version of playCompleteGame with zone-based variety
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
    
    // Save state before move
    history.push({
      board: board.map(r => [...r]),
      boardPieces: boardPieces.map(r => [...r]),
      usedPieces: [...usedPieces],
      player: currentPlayer
    });
    
    let move;
    
    // Opening moves: force different quadrants
    if (moveCount < 4) {
      const quadrantFilters = [
        (r, c) => r < 3 && c < 3,
        (r, c) => r >= 5 && c >= 5,
        (r, c) => r < 3 && c >= 5,
        (r, c) => r >= 5 && c < 3,
      ];
      const filter = quadrantFilters[moveCount];
      const filtered = moves.filter(m => 
        m.coords.some(([dx, dy]) => filter(m.row + dy, m.col + dx))
      );
      
      if (filtered.length > 0) {
        move = filtered[Math.floor(random() * filtered.length)];
      }
    }
    
    // Fallback: zone-based selection with seeded randomness
    if (!move) {
      const preferredZoneName = ZONE_ORDER[moveCount % ZONE_ORDER.length];
      const preferredZone = ZONES[preferredZoneName];
      
      const scored = moves.map(m => {
        let score = 0;
        for (const [dx, dy] of m.coords) {
          const r = m.row + dy;
          const c = m.col + dx;
          if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
            score += preferredZone(r, c);
          }
        }
        
        // Light adjacency bonus
        if (moveCount >= 3) {
          for (const [dx, dy] of m.coords) {
            const r = m.row + dy;
            const c = m.col + dx;
            if (r > 0 && board[r - 1][c]) score += 0.5;
            if (r < BOARD_SIZE - 1 && board[r + 1][c]) score += 0.5;
            if (c > 0 && board[r][c - 1]) score += 0.5;
            if (c < BOARD_SIZE - 1 && board[r][c + 1]) score += 0.5;
          }
        }
        
        score += random() * 15;
        return { ...m, score };
      });
      
      scored.sort((a, b) => b.score - a.score);
      const topMoves = scored.slice(0, Math.min(5, scored.length));
      move = topMoves[Math.floor(random() * topMoves.length)];
    }
    
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

// Generate a deterministic puzzle from a seed string
const generateSeededPuzzle = (seed, difficulty = PUZZLE_DIFFICULTY.HARD) => {
  const random = createSeededRandom(seed);
  const movesToBackOut = getMovesForDifficulty(difficulty);
  const startTime = Date.now();
  
  // Try multiple games with the seeded RNG
  for (let attempt = 0; attempt < 30; attempt++) {
    // Timeout protection
    if (Date.now() - startTime > PUZZLE_GENERATION_TIMEOUT_MS) {
      console.warn(`[PuzzleGen] Seeded puzzle timeout after ${attempt} attempts`);
      break;
    }
    
    const game = playCompleteGameSeeded(random);
    
    // Need at least N moves to back out
    if (game.totalMoves < movesToBackOut) {
      continue;
    }
    
    // Get the state from N moves before the end
    const puzzleStateIndex = game.totalMoves - movesToBackOut;
    const puzzleState = game.history[puzzleStateIndex];
    
    if (!puzzleState) continue;
    
    // Get all valid moves from this state
    const allMoves = getAllValidMoves(puzzleState.board, puzzleState.usedPieces);
    
    // Just need at least 1 valid move
    if (allMoves.length > 0) {
      console.log(`Seeded puzzle generated from seed "${seed}": ${allMoves.length} possible moves`);
      
      return {
        id: `seeded-puzzle-${seed}`,
        name: 'Weekly Challenge',
        difficulty: difficulty,
        description: `${movesToBackOut} move${movesToBackOut > 1 ? 's' : ''} to win!`,
        boardState: boardToString(puzzleState.boardPieces),
        usedPieces: [...puzzleState.usedPieces],
        movesRemaining: movesToBackOut,
        seed: seed
      };
    }
  }
  
  console.error(`Failed to generate seeded puzzle from seed "${seed}" after 30 attempts`);
  return null;
};

// Async wrapper for seeded puzzles
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
