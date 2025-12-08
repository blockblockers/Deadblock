// AI Logic for Deadblock - Optimized for Speed
import { pieces } from './pieces';
import { getPieceCoords, canPlacePiece, canAnyPieceBePlaced, BOARD_SIZE } from './gameLogic';

export const AI_DIFFICULTY = {
  RANDOM: 'random',
  AVERAGE: 'average',
  PROFESSIONAL: 'professional'
};

// ====== OPTIMIZED MOVE GENERATION ======

// Cache for piece coordinates to avoid recalculation
const pieceCoordCache = new Map();

const getCachedPieceCoords = (pieceType, rot, flip) => {
  const key = `${pieceType}-${rot}-${flip}`;
  if (!pieceCoordCache.has(key)) {
    pieceCoordCache.set(key, getPieceCoords(pieceType, rot, flip));
  }
  return pieceCoordCache.get(key);
};

// Generate a hash for piece placement to detect duplicates
const getPlacementHash = (coords, row, col) => {
  const placed = coords.map(([dx, dy]) => `${row + dy},${col + dx}`).sort().join('|');
  return placed;
};

// Get all possible moves with deduplication (many rotations produce same result)
export const getAllPossibleMoves = (board, usedPieces, dedupe = false) => {
  const available = Object.keys(pieces).filter(p => !usedPieces.includes(p));
  const moves = [];
  const seen = dedupe ? new Set() : null;

  for (const pieceType of available) {
    for (let flip = 0; flip < 2; flip++) {
      for (let rot = 0; rot < 4; rot++) {
        const coords = getCachedPieceCoords(pieceType, rot, flip);
        for (let row = 0; row < BOARD_SIZE; row++) {
          for (let col = 0; col < BOARD_SIZE; col++) {
            if (canPlacePiece(board, row, col, coords)) {
              if (dedupe) {
                const hash = pieceType + getPlacementHash(coords, row, col);
                if (seen.has(hash)) continue;
                seen.add(hash);
              }
              moves.push({ pieceType, row, col, rot, flip: flip === 1, coords });
            }
          }
        }
      }
    }
  }
  return moves;
};

// Fast check: can ANY piece be placed? (stops at first valid placement)
const canAnyMoveBeMade = (board, usedPieces) => {
  const available = Object.keys(pieces).filter(p => !usedPieces.includes(p));
  
  for (const pieceType of available) {
    for (let flip = 0; flip < 2; flip++) {
      for (let rot = 0; rot < 4; rot++) {
        const coords = getCachedPieceCoords(pieceType, rot, flip);
        for (let row = 0; row < BOARD_SIZE; row++) {
          for (let col = 0; col < BOARD_SIZE; col++) {
            if (canPlacePiece(board, row, col, coords)) {
              return true;
            }
          }
        }
      }
    }
  }
  return false;
};

// Count placeable pieces (faster than counting all moves)
const countPlaceablePieces = (board, usedPieces) => {
  const available = Object.keys(pieces).filter(p => !usedPieces.includes(p));
  let count = 0;

  for (const pieceType of available) {
    outerLoop:
    for (let flip = 0; flip < 2; flip++) {
      for (let rot = 0; rot < 4; rot++) {
        const coords = getCachedPieceCoords(pieceType, rot, flip);
        for (let row = 0; row < BOARD_SIZE; row++) {
          for (let col = 0; col < BOARD_SIZE; col++) {
            if (canPlacePiece(board, row, col, coords)) {
              count++;
              break outerLoop;
            }
          }
        }
      }
    }
  }
  return count;
};

// Apply a move to board (returns new board)
const applyMove = (board, move, player = 2) => {
  const newBoard = board.map(r => [...r]);
  for (const [dx, dy] of move.coords) {
    newBoard[move.row + dy][move.col + dx] = player;
  }
  return newBoard;
};

// ====== FAST EVALUATION ======

// Quick evaluation for move ordering (must be fast)
const quickEval = (board, row, col, coords) => {
  let score = 0;
  
  // Center bonus
  for (const [dx, dy] of coords) {
    const r = row + dy;
    const c = col + dx;
    score += (3.5 - Math.abs(r - 3.5)) + (3.5 - Math.abs(c - 3.5));
  }
  
  return score;
};

// Full evaluation for a position
const evaluatePosition = (board, usedPieces, isAITurn) => {
  // Count how many pieces each side can still place
  const placeablePieces = countPlaceablePieces(board, usedPieces);
  
  // From AI's perspective: fewer opponent options = better
  return isAITurn ? -placeablePieces * 100 : placeablePieces * 100;
};

// Evaluate a specific move
export const evaluateAIMove = (board, row, col, coords, pieceType, usedPieces) => {
  const simBoard = applyMove(board, { row, col, coords }, 2);
  const simUsed = [...usedPieces, pieceType];
  
  // Instant win
  if (!canAnyMoveBeMade(simBoard, simUsed)) {
    return 100000;
  }

  // Count opponent's placeable pieces
  const oppPieces = countPlaceablePieces(simBoard, simUsed);
  let score = 1000 - oppPieces * 100;

  // Position bonus
  for (const [dx, dy] of coords) {
    const r = row + dy;
    const c = col + dx;
    score += (3.5 - Math.abs(r - 3.5)) * 2;
    score += (3.5 - Math.abs(c - 3.5)) * 2;
  }
  
  return score;
};

// ====== TIME-LIMITED MINIMAX ======

let searchStartTime = 0;
let nodesSearched = 0;
const MAX_SEARCH_TIME = 1200; // 1.2 seconds max

const isTimeUp = () => {
  return Date.now() - searchStartTime > MAX_SEARCH_TIME;
};

const minimax = (board, usedPieces, depth, isMaximizing, alpha, beta) => {
  nodesSearched++;
  
  // Time check every 500 nodes
  if (nodesSearched % 500 === 0 && isTimeUp()) {
    return isMaximizing ? -999 : 999; // Return neutral-ish value
  }

  // Get moves with deduplication for speed
  const moves = getAllPossibleMoves(board, usedPieces, true);
  
  // Terminal: current player can't move
  if (moves.length === 0) {
    return isMaximizing ? -10000 + depth : 10000 - depth;
  }
  
  // Depth limit
  if (depth === 0) {
    return evaluatePosition(board, usedPieces, isMaximizing);
  }

  // Quick sort by heuristic for better pruning
  moves.forEach(m => {
    m.quickScore = quickEval(board, m.row, m.col, m.coords);
  });
  moves.sort((a, b) => isMaximizing ? (b.quickScore - a.quickScore) : (a.quickScore - b.quickScore));
  
  // Only evaluate top moves
  const maxMoves = depth >= 2 ? 6 : 8;
  const movesToEval = moves.slice(0, Math.min(maxMoves, moves.length));

  if (isMaximizing) {
    let maxEval = -Infinity;
    
    for (const move of movesToEval) {
      if (isTimeUp()) break;
      
      const newBoard = applyMove(board, move, 2);
      const newUsed = [...usedPieces, move.pieceType];
      
      // Check for instant win
      if (!canAnyMoveBeMade(newBoard, newUsed)) {
        return 10000 - depth;
      }
      
      const evalScore = minimax(newBoard, newUsed, depth - 1, false, alpha, beta);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    
    for (const move of movesToEval) {
      if (isTimeUp()) break;
      
      const newBoard = applyMove(board, move, 1);
      const newUsed = [...usedPieces, move.pieceType];
      
      // Check for instant loss (opponent wins)
      if (!canAnyMoveBeMade(newBoard, newUsed)) {
        return -10000 + depth;
      }
      
      const evalScore = minimax(newBoard, newUsed, depth - 1, true, alpha, beta);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
};

// Find best move with time limit
const findBestMove = (board, usedPieces) => {
  searchStartTime = Date.now();
  nodesSearched = 0;
  
  // Get moves with deduplication
  const moves = getAllPossibleMoves(board, usedPieces, true);
  if (moves.length === 0) return null;
  
  console.log(`Expert AI: ${moves.length} unique moves to analyze`);
  
  // Quick evaluation for all moves
  const scoredMoves = moves.map(m => ({
    ...m,
    score: evaluateAIMove(board, m.row, m.col, m.coords, m.pieceType, usedPieces)
  }));
  
  // Sort by quick score
  scoredMoves.sort((a, b) => b.score - a.score);
  
  // Check for instant winning move
  if (scoredMoves[0].score >= 100000) {
    console.log('Expert AI: Found winning move!');
    return scoredMoves[0];
  }
  
  // Determine search depth based on game stage
  const piecesRemaining = 12 - usedPieces.length;
  let depth;
  if (piecesRemaining <= 4) {
    depth = 4; // Deep endgame search
  } else if (piecesRemaining <= 6) {
    depth = 3;
  } else {
    depth = 2;
  }
  
  // Evaluate top candidates with minimax
  const candidates = scoredMoves.slice(0, Math.min(8, scoredMoves.length));
  
  let bestMove = candidates[0];
  let bestScore = -Infinity;
  
  for (const move of candidates) {
    if (isTimeUp()) {
      console.log('Expert AI: Time limit reached');
      break;
    }
    
    const newBoard = applyMove(board, move, 2);
    const newUsed = [...usedPieces, move.pieceType];
    
    const score = minimax(newBoard, newUsed, depth, false, -Infinity, Infinity);
    
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    
    // Early exit if we found a very strong move
    if (score > 5000) {
      console.log('Expert AI: Found strong winning path');
      break;
    }
  }
  
  const elapsed = Date.now() - searchStartTime;
  console.log(`Expert AI: ${nodesSearched} nodes in ${elapsed}ms, best score: ${bestScore}`);
  
  return bestMove;
};

// ====== MAIN SELECT FUNCTION ======

export const selectAIMove = async (board, boardPieces, usedPieces, difficulty = AI_DIFFICULTY.AVERAGE) => {
  const possibleMoves = getAllPossibleMoves(board, usedPieces, false);
  
  if (possibleMoves.length === 0) return null;

  const isEarlyGame = usedPieces.length < 6;
  const isOpeningMove = usedPieces.length < 2;

  switch (difficulty) {
    case AI_DIFFICULTY.RANDOM:
      // Level 1: Completely random
      return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

    case AI_DIFFICULTY.PROFESSIONAL:
      // Level 3: Time-limited minimax
      console.log(`Expert AI thinking... (${usedPieces.length} pieces placed)`);
      
      // Small delay for UX
      await new Promise(r => setTimeout(r, 50));
      
      const bestMove = findBestMove(board, usedPieces);
      
      if (bestMove) {
        return bestMove;
      }
      
      console.log('Expert AI: Falling back to strategic move');
      // Fall through to average if minimax fails

    case AI_DIFFICULTY.AVERAGE:
    default:
      // Level 2: Basic strategy with randomness
      
      // Opening move: random from good positions
      if (isOpeningMove) {
        const goodOpeners = possibleMoves.filter(m => 
          m.row >= 1 && m.row <= 5 && m.col >= 1 && m.col <= 5
        );
        const pool = goodOpeners.length > 5 ? goodOpeners : possibleMoves;
        return pool[Math.floor(Math.random() * pool.length)];
      }
      
      // Score all moves
      for (const move of possibleMoves) {
        let score = evaluateAIMove(board, move.row, move.col, move.coords, move.pieceType, usedPieces);
        
        // Add randomness
        if (isEarlyGame) {
          score += Math.random() * 400;
        } else {
          score += Math.random() * 50;
        }
        move.score = score;
      }

      possibleMoves.sort((a, b) => b.score - a.score);
      
      // Pick from top moves
      const topCount = isEarlyGame ? 6 : 3;
      const topMoves = possibleMoves.slice(0, Math.min(topCount, possibleMoves.length));
      
      return topMoves[Math.floor(Math.random() * topMoves.length)];
  }
};
