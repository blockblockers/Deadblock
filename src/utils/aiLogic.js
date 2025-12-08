// AI Logic for Deadblock - Enhanced Expert AI with deeper Minimax
import { pieces } from './pieces';
import { getPieceCoords, canPlacePiece, canAnyPieceBePlaced, BOARD_SIZE } from './gameLogic';

export const AI_DIFFICULTY = {
  RANDOM: 'random',
  AVERAGE: 'average',
  PROFESSIONAL: 'professional'
};

// Get all possible moves for a board state
export const getAllPossibleMoves = (board, usedPieces) => {
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

// Count valid moves for a given player
const countPlayerMoves = (board, usedPieces) => {
  const available = Object.keys(pieces).filter(p => !usedPieces.includes(p));
  let count = 0;

  for (const pieceType of available) {
    for (let flip = 0; flip < 2; flip++) {
      for (let rot = 0; rot < 4; rot++) {
        const coords = getPieceCoords(pieceType, rot, flip === 1);
        for (let row = 0; row < BOARD_SIZE; row++) {
          for (let col = 0; col < BOARD_SIZE; col++) {
            if (canPlacePiece(board, row, col, coords)) {
              count++;
            }
          }
        }
      }
    }
  }
  return count;
};

// Count unique pieces that can still be placed (more important than total moves)
const countPlaceablePieces = (board, usedPieces) => {
  const available = Object.keys(pieces).filter(p => !usedPieces.includes(p));
  let count = 0;

  for (const pieceType of available) {
    let canPlace = false;
    outerLoop:
    for (let flip = 0; flip < 2; flip++) {
      for (let rot = 0; rot < 4; rot++) {
        const coords = getPieceCoords(pieceType, rot, flip === 1);
        for (let row = 0; row < BOARD_SIZE; row++) {
          for (let col = 0; col < BOARD_SIZE; col++) {
            if (canPlacePiece(board, row, col, coords)) {
              canPlace = true;
              break outerLoop;
            }
          }
        }
      }
    }
    if (canPlace) count++;
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

// Enhanced evaluation function
export const evaluateAIMove = (board, row, col, coords, pieceType, usedPieces, isExpert = false) => {
  const simBoard = board.map(r => [...r]);
  for (const [dx, dy] of coords) {
    simBoard[row + dy][col + dx] = 2;
  }
  
  const simUsed = [...usedPieces, pieceType];
  
  // Instant win = best score
  if (!canAnyPieceBePlaced(simBoard, simUsed)) {
    return 100000;
  }

  let score = 0;

  // Primary: Reduce opponent's available pieces (more important than total moves)
  const oppPlaceablePieces = countPlaceablePieces(simBoard, simUsed);
  score -= oppPlaceablePieces * 100;

  // Secondary: Reduce opponent's total move count
  const oppMoves = countPlayerMoves(simBoard, simUsed);
  score -= oppMoves * 2;

  // Tertiary: Position bonuses
  for (const [dx, dy] of coords) {
    const r = row + dy;
    const c = col + dx;
    
    // Center control bonus (center is stronger)
    const centerDist = Math.abs(r - 3.5) + Math.abs(c - 3.5);
    score += (7 - centerDist) * 3;
    
    // Edge penalty
    if (r === 0 || r === 7 || c === 0 || c === 7) {
      score -= 5;
    }
    
    // Corner penalty (corners are weakest)
    if ((r === 0 || r === 7) && (c === 0 || c === 7)) {
      score -= 8;
    }
  }
  
  // Bonus for blocking large contiguous empty areas
  if (isExpert) {
    // Count adjacent empty cells being blocked
    const adjacentEmpty = new Set();
    for (const [dx, dy] of coords) {
      const r = row + dy;
      const c = col + dx;
      const neighbors = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      for (const [nr, nc] of neighbors) {
        const newR = r + nr;
        const newC = c + nc;
        if (newR >= 0 && newR < 8 && newC >= 0 && newC < 8 && board[newR][newC] === 0) {
          adjacentEmpty.add(`${newR},${newC}`);
        }
      }
    }
    score += adjacentEmpty.size * 2;
  }
  
  return score;
};

// ====== IMPROVED MINIMAX FOR EXPERT MODE ======

const minimax = (board, usedPieces, depth, isMaximizing, alpha, beta, moveCache = new Map()) => {
  // Create cache key
  const boardKey = board.map(r => r.join('')).join('') + usedPieces.sort().join(',') + depth + isMaximizing;
  if (moveCache.has(boardKey)) {
    return moveCache.get(boardKey);
  }

  const moves = getAllPossibleMoves(board, usedPieces);
  
  // Terminal: current player can't move = they lose
  if (moves.length === 0) {
    const result = isMaximizing ? -50000 + depth : 50000 - depth;
    return result;
  }
  
  // Depth limit reached - evaluate position
  if (depth === 0) {
    const aiPieces = countPlaceablePieces(board, usedPieces);
    const aiMoves = countPlayerMoves(board, usedPieces);
    // Positive = good for AI (maximizing player)
    const result = isMaximizing ? (-aiMoves - aiPieces * 50) : (aiMoves + aiPieces * 50);
    return result;
  }

  // Pre-score all moves for better ordering
  const scoredMoves = moves.map(m => ({
    ...m,
    quickScore: evaluateAIMove(board, m.row, m.col, m.coords, m.pieceType, usedPieces, true)
  }));
  
  // Sort by score (best first for better pruning)
  scoredMoves.sort((a, b) => isMaximizing ? (b.quickScore - a.quickScore) : (a.quickScore - b.quickScore));
  
  // Limit moves to evaluate based on depth
  const maxMoves = depth >= 3 ? 8 : depth >= 2 ? 10 : 12;
  const movesToEval = scoredMoves.slice(0, Math.min(maxMoves, scoredMoves.length));

  let result;
  
  if (isMaximizing) {
    let maxEval = -Infinity;
    
    for (const move of movesToEval) {
      const newBoard = applyMove(board, move, 2);
      const newUsed = [...usedPieces, move.pieceType];
      
      // Check for instant win
      if (!canAnyPieceBePlaced(newBoard, newUsed)) {
        return 50000 - depth;
      }
      
      const evalScore = minimax(newBoard, newUsed, depth - 1, false, alpha, beta, moveCache);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    result = maxEval;
  } else {
    let minEval = Infinity;
    
    for (const move of movesToEval) {
      const newBoard = applyMove(board, move, 1);
      const newUsed = [...usedPieces, move.pieceType];
      
      // Check for instant loss
      if (!canAnyPieceBePlaced(newBoard, newUsed)) {
        return -50000 + depth;
      }
      
      const evalScore = minimax(newBoard, newUsed, depth - 1, true, alpha, beta, moveCache);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    result = minEval;
  }
  
  moveCache.set(boardKey, result);
  return result;
};

// Find best move using minimax with iterative deepening
const findBestMoveWithMinimax = (board, usedPieces, targetDepth = 3) => {
  const moves = getAllPossibleMoves(board, usedPieces);
  if (moves.length === 0) return null;
  
  console.log(`Expert AI: Analyzing ${moves.length} possible moves...`);
  
  // Pre-score moves
  const scoredMoves = moves.map(m => ({
    ...m,
    quickScore: evaluateAIMove(board, m.row, m.col, m.coords, m.pieceType, usedPieces, true)
  })).sort((a, b) => b.quickScore - a.quickScore);
  
  // Check for immediate winning move
  for (const move of scoredMoves) {
    const newBoard = applyMove(board, move);
    const newUsed = [...usedPieces, move.pieceType];
    if (!canAnyPieceBePlaced(newBoard, newUsed)) {
      console.log('Expert AI: Found winning move!');
      return move;
    }
  }
  
  // Evaluate top candidates with minimax
  const candidates = scoredMoves.slice(0, Math.min(15, scoredMoves.length));
  const moveCache = new Map();
  
  let bestMove = candidates[0];
  let bestScore = -Infinity;
  
  for (const move of candidates) {
    const newBoard = applyMove(board, move);
    const newUsed = [...usedPieces, move.pieceType];
    
    const score = minimax(newBoard, newUsed, targetDepth, false, -Infinity, Infinity, moveCache);
    
    console.log(`  ${move.pieceType} at (${move.row},${move.col}): score ${score}`);
    
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    
    // If we found a very good move, accept it
    if (score > 40000) break;
  }
  
  console.log(`Expert AI: Best move ${bestMove.pieceType} with score ${bestScore}`);
  return bestMove;
};

// ====== MAIN SELECT FUNCTION ======

export const selectAIMove = async (board, boardPieces, usedPieces, difficulty = AI_DIFFICULTY.AVERAGE) => {
  const possibleMoves = getAllPossibleMoves(board, usedPieces);
  
  if (possibleMoves.length === 0) return null;

  const isEarlyGame = usedPieces.length < 6;
  const isOpeningMove = usedPieces.length < 2;
  const isLateGame = usedPieces.length >= 8;

  switch (difficulty) {
    case AI_DIFFICULTY.RANDOM:
      // Level 1: Completely random
      return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

    case AI_DIFFICULTY.PROFESSIONAL:
      // Level 3: Full minimax - NO random openings, always play optimally
      console.log(`Expert AI thinking... (${usedPieces.length} pieces used)`);
      
      // Small delay for UX
      await new Promise(r => setTimeout(r, 150));
      
      // Deeper search as game progresses (more pruning possible)
      let depth;
      if (isLateGame) {
        depth = 4; // Deep search in endgame
      } else if (usedPieces.length >= 4) {
        depth = 3; // Medium search in mid-game
      } else {
        depth = 3; // Still play strategically in opening
      }
      
      const bestMove = findBestMoveWithMinimax(board, usedPieces, depth);
      
      if (bestMove) {
        return bestMove;
      }
      
      // Fall through only if minimax completely fails
      console.log('Expert AI: Minimax failed, using strategic fallback');
      
    case AI_DIFFICULTY.AVERAGE:
    default:
      // Level 2: Basic strategy with randomness
      
      // Opening move: pick from good positions with some randomness
      if (isOpeningMove) {
        const goodOpeners = possibleMoves.filter(m => 
          m.row >= 1 && m.row <= 5 && m.col >= 1 && m.col <= 5
        );
        const pool = goodOpeners.length > 5 ? goodOpeners : possibleMoves;
        return pool[Math.floor(Math.random() * pool.length)];
      }
      
      // Score all moves
      for (const move of possibleMoves) {
        const coords = getPieceCoords(move.pieceType, move.rot, move.flip);
        let score = evaluateAIMove(board, move.row, move.col, coords, move.pieceType, usedPieces);
        
        // Add randomness - more in early game
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
