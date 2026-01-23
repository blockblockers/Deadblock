// AI Logic for Deadblock - Advanced Strategic AI
// ============================================
// Rebuilt with proper strategic evaluation including:
// - Mobility differential (counting actual moves, not just pieces)
// - Blocking detection and bonus
// - Dead space awareness
// - Piece flexibility management
// - Deeper minimax search with iterative deepening
// - Advanced move ordering for alpha-beta efficiency

import { pieces } from './pieces';
import { getPieceCoords, canPlacePiece, canAnyPieceBePlaced, BOARD_SIZE } from './gameLogic';

// ============================================
// CONSTANTS AND CONFIGURATION
// ============================================

export const AI_DIFFICULTY = {
  RANDOM: 'random',
  AVERAGE: 'average',
  PROFESSIONAL: 'professional'
};

// Configurable AI move delay (in milliseconds)
export const AI_MOVE_DELAY = {
  [AI_DIFFICULTY.RANDOM]: 1200,
  [AI_DIFFICULTY.AVERAGE]: 1500,
  [AI_DIFFICULTY.PROFESSIONAL]: 2000,
  PUZZLE: 1500,
};

// Evaluation weights (tunable)
const WEIGHTS = {
  MOBILITY: 15,              // Points per move advantage
  BLOCKING: 50,              // Bonus for blocking opponent's piece entirely
  DEAD_SPACE: -3,            // Penalty per dead cell created
  FLEXIBILITY_EARLY: 8,      // Bonus for using inflexible pieces early
  FLEXIBILITY_LATE: 12,      // Bonus for having flexible pieces late
  WIN: 100000,               // Winning position
  LOSS: -100000,             // Losing position
  CENTER_EARLY: 2,           // Small center preference early game
};

// Piece flexibility rankings (higher = more flexible, save for late game)
const PIECE_FLEXIBILITY = {
  'I': 10,  // Most flexible - long straight piece fits many places
  'L': 9,
  'Y': 8,
  'P': 8,
  'N': 7,
  'V': 6,
  'W': 5,
  'Z': 5,
  'T': 4,
  'U': 3,
  'F': 2,
  'X': 1,   // Least flexible - cross shape is hardest to place
};

// Time limits for search (milliseconds)
const TIME_LIMITS = {
  [AI_DIFFICULTY.RANDOM]: 100,
  [AI_DIFFICULTY.AVERAGE]: 800,
  [AI_DIFFICULTY.PROFESSIONAL]: 2500,
};

// ============================================
// CACHING AND OPTIMIZATION
// ============================================

const pieceCoordCache = new Map();

const getCachedPieceCoords = (pieceType, rot, flip) => {
  const key = `${pieceType}-${rot}-${flip}`;
  if (!pieceCoordCache.has(key)) {
    pieceCoordCache.set(key, getPieceCoords(pieceType, rot, flip));
  }
  return pieceCoordCache.get(key);
};

const getPlacementHash = (coords, row, col) => {
  return coords.map(([dx, dy]) => `${row + dy},${col + dx}`).sort().join('|');
};

// ============================================
// MOVE GENERATION
// ============================================

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

// Check if any move can be made
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

// Count total valid moves (not just pieces)
const countValidMoves = (board, usedPieces) => {
  return getAllPossibleMoves(board, usedPieces, true).length;
};

// Count how many pieces can still be placed (at least one valid position)
const countPlaceablePieces = (board, usedPieces) => {
  const available = Object.keys(pieces).filter(p => !usedPieces.includes(p));
  let count = 0;

  for (const pieceType of available) {
    let canPlace = false;
    outerLoop:
    for (let flip = 0; flip < 2; flip++) {
      for (let rot = 0; rot < 4; rot++) {
        const coords = getCachedPieceCoords(pieceType, rot, flip);
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

// Get list of pieces that are completely blocked (0 valid placements)
const getBlockedPieces = (board, usedPieces) => {
  const available = Object.keys(pieces).filter(p => !usedPieces.includes(p));
  const blocked = [];

  for (const pieceType of available) {
    let canPlace = false;
    outerLoop:
    for (let flip = 0; flip < 2; flip++) {
      for (let rot = 0; rot < 4; rot++) {
        const coords = getCachedPieceCoords(pieceType, rot, flip);
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
    if (!canPlace) blocked.push(pieceType);
  }
  return blocked;
};

// Apply a move to the board
const applyMove = (board, move, player = 2) => {
  const newBoard = board.map(r => [...r]);
  for (const [dx, dy] of move.coords) {
    newBoard[move.row + dy][move.col + dx] = player;
  }
  return newBoard;
};

// ============================================
// DEAD SPACE DETECTION
// ============================================

// Find connected empty regions and check if any piece can fit
const countDeadSpace = (board, usedPieces) => {
  const visited = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false));
  let deadCells = 0;

  // Flood fill to find connected empty regions
  const floodFill = (startRow, startCol) => {
    const region = [];
    const stack = [[startRow, startCol]];
    
    while (stack.length > 0) {
      const [r, c] = stack.pop();
      if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) continue;
      if (visited[r][c]) continue;
      if (board[r][c] !== null && board[r][c] !== 0) continue;
      
      visited[r][c] = true;
      region.push([r, c]);
      
      stack.push([r-1, c], [r+1, c], [r, c-1], [r, c+1]);
    }
    return region;
  };

  // Check if any remaining piece can fit in a region
  const canAnyPieceFitInRegion = (region) => {
    if (region.length < 5) return false; // No pentomino can fit in < 5 cells
    
    const regionSet = new Set(region.map(([r, c]) => `${r},${c}`));
    const available = Object.keys(pieces).filter(p => !usedPieces.includes(p));
    
    for (const pieceType of available) {
      for (let flip = 0; flip < 2; flip++) {
        for (let rot = 0; rot < 4; rot++) {
          const coords = getCachedPieceCoords(pieceType, rot, flip);
          
          // Try placing at each cell in the region
          for (const [baseR, baseC] of region) {
            let fits = true;
            for (const [dx, dy] of coords) {
              const cellKey = `${baseR + dy},${baseC + dx}`;
              if (!regionSet.has(cellKey)) {
                fits = false;
                break;
              }
            }
            if (fits) return true;
          }
        }
      }
    }
    return false;
  };

  // Find all empty regions
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (!visited[r][c] && (board[r][c] === null || board[r][c] === 0)) {
        const region = floodFill(r, c);
        if (region.length > 0 && region.length < 5) {
          // Region too small for any piece
          deadCells += region.length;
        } else if (region.length >= 5 && !canAnyPieceFitInRegion(region)) {
          // Region exists but no piece fits (awkward shape)
          deadCells += region.length;
        }
      }
    }
  }
  
  return deadCells;
};

// ============================================
// STRATEGIC EVALUATION
// ============================================

// Quick evaluation for move ordering (fast, approximate)
const quickEval = (board, move, usedPieces, isEarlyGame) => {
  let score = 0;
  
  // 1. Center preference (early game only)
  if (isEarlyGame) {
    for (const [dx, dy] of move.coords) {
      const r = move.row + dy;
      const c = move.col + dx;
      score += (3.5 - Math.abs(r - 3.5)) + (3.5 - Math.abs(c - 3.5));
    }
  }
  
  // 2. Piece flexibility - prefer using inflexible pieces early
  const flexibility = PIECE_FLEXIBILITY[move.pieceType] || 5;
  if (isEarlyGame) {
    score += (10 - flexibility) * 2; // Use inflexible pieces early
  } else {
    score -= (10 - flexibility); // Save flexible pieces for late
  }
  
  // 3. Quick blocking check - does this move block opponent's piece?
  const newBoard = applyMove(board, move, 2);
  const opponentBlockedBefore = getBlockedPieces(board, usedPieces).length;
  const opponentBlockedAfter = getBlockedPieces(newBoard, [...usedPieces, move.pieceType]).length;
  if (opponentBlockedAfter > opponentBlockedBefore) {
    score += 25; // Significant bonus for blocking
  }
  
  return score;
};

// Full strategic evaluation
const evaluatePosition = (board, usedPieces, isAITurn) => {
  // Terminal state check
  const aiCanMove = canAnyMoveBeMade(board, usedPieces);
  
  if (!aiCanMove) {
    return isAITurn ? WEIGHTS.LOSS : WEIGHTS.WIN;
  }
  
  let score = 0;
  const gamePhase = usedPieces.length; // 0-12
  const isEarlyGame = gamePhase < 4;
  const isLateGame = gamePhase >= 8;
  
  // 1. MOBILITY DIFFERENTIAL (most important)
  // Count actual moves, not just pieces
  const aiMoves = countValidMoves(board, usedPieces);
  const aiPieces = countPlaceablePieces(board, usedPieces);
  
  // Mobility is crucial - having more options is always better
  score += aiMoves * WEIGHTS.MOBILITY * 0.5; // Per-move bonus
  score += aiPieces * WEIGHTS.MOBILITY * 2;   // Per-piece bonus (weighted more)
  
  // 2. BLOCKING BONUS
  // Pieces that opponent can no longer place
  const blockedPieces = getBlockedPieces(board, usedPieces);
  score += blockedPieces.length * WEIGHTS.BLOCKING;
  
  // Extra bonus for blocking flexible pieces (harder to block normally)
  for (const piece of blockedPieces) {
    const flex = PIECE_FLEXIBILITY[piece] || 5;
    score += flex * 5; // More valuable to block flexible pieces
  }
  
  // 3. DEAD SPACE AWARENESS
  if (!isEarlyGame) {
    const deadCells = countDeadSpace(board, usedPieces);
    score += deadCells * WEIGHTS.DEAD_SPACE;
  }
  
  // 4. PIECE FLEXIBILITY MANAGEMENT
  const remainingPieces = Object.keys(pieces).filter(p => !usedPieces.includes(p));
  let flexibilityScore = 0;
  for (const piece of remainingPieces) {
    flexibilityScore += PIECE_FLEXIBILITY[piece] || 5;
  }
  
  if (isLateGame) {
    // Late game: having flexible pieces is very valuable
    score += flexibilityScore * WEIGHTS.FLEXIBILITY_LATE * 0.5;
  }
  
  // 5. Adjust perspective
  return isAITurn ? score : -score;
};

// ============================================
// MINIMAX WITH ALPHA-BETA PRUNING
// ============================================

let searchStartTime = 0;
let nodesSearched = 0;
let maxTimeMs = 2000;

const isTimeUp = () => Date.now() - searchStartTime > maxTimeMs;

const minimax = (board, usedPieces, depth, isMaximizing, alpha, beta, isEarlyGame) => {
  nodesSearched++;
  
  // Time check
  if (isTimeUp()) return 0;
  
  // Terminal state
  if (!canAnyMoveBeMade(board, usedPieces)) {
    return isMaximizing ? WEIGHTS.LOSS + depth : WEIGHTS.WIN - depth; // Prefer faster wins
  }
  
  // Depth limit - evaluate position
  if (depth <= 0) {
    return evaluatePosition(board, usedPieces, isMaximizing);
  }
  
  // Generate and order moves
  let moves = getAllPossibleMoves(board, usedPieces, true);
  
  // Move ordering: evaluate promising moves first for better pruning
  moves = moves.map(move => ({
    ...move,
    quickScore: quickEval(board, move, usedPieces, isEarlyGame)
  })).sort((a, b) => isMaximizing ? b.quickScore - a.quickScore : a.quickScore - b.quickScore);
  
  // Limit branching factor
  const maxMoves = depth >= 3 ? 8 : depth >= 2 ? 10 : 12;
  moves = moves.slice(0, Math.min(maxMoves, moves.length));
  
  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const move of moves) {
      if (isTimeUp()) break;
      
      const newBoard = applyMove(board, move, 2);
      const newUsed = [...usedPieces, move.pieceType];
      const score = minimax(newBoard, newUsed, depth - 1, false, alpha, beta, isEarlyGame);
      
      maxScore = Math.max(maxScore, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break; // Prune
    }
    return maxScore;
  } else {
    let minScore = Infinity;
    for (const move of moves) {
      if (isTimeUp()) break;
      
      const newBoard = applyMove(board, move, 1);
      const newUsed = [...usedPieces, move.pieceType];
      const score = minimax(newBoard, newUsed, depth - 1, true, alpha, beta, isEarlyGame);
      
      minScore = Math.min(minScore, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break; // Prune
    }
    return minScore;
  }
};

// ============================================
// EXPERT AI - ITERATIVE DEEPENING
// ============================================

const findBestMoveExpert = (board, usedPieces) => {
  searchStartTime = Date.now();
  nodesSearched = 0;
  maxTimeMs = TIME_LIMITS[AI_DIFFICULTY.PROFESSIONAL];
  
  const moves = getAllPossibleMoves(board, usedPieces, true);
  if (moves.length === 0) return null;
  if (moves.length === 1) {
    console.log('[Expert AI] Only one move available');
    return moves[0];
  }
  
  const isEarlyGame = usedPieces.length < 4;
  const piecesRemaining = 12 - usedPieces.length;
  
  // Pre-score moves for ordering
  let scoredMoves = moves.map(move => ({
    ...move,
    score: quickEval(board, move, usedPieces, isEarlyGame)
  })).sort((a, b) => b.score - a.score);
  
  // Limit candidates for deep search
  const maxCandidates = piecesRemaining <= 4 ? 12 : 10;
  let candidates = scoredMoves.slice(0, Math.min(maxCandidates, scoredMoves.length));
  
  let bestMove = candidates[0];
  let bestScore = -Infinity;
  let completedDepth = 0;
  
  // Iterative deepening: search depth 2, 3, 4, 5, 6 until time runs out
  const maxDepth = piecesRemaining <= 4 ? 6 : piecesRemaining <= 6 ? 5 : 4;
  
  for (let depth = 2; depth <= maxDepth; depth++) {
    if (isTimeUp()) break;
    
    let depthBestMove = candidates[0];
    let depthBestScore = -Infinity;
    const moveScores = [];
    
    for (const move of candidates) {
      if (isTimeUp()) break;
      
      const newBoard = applyMove(board, move, 2);
      const newUsed = [...usedPieces, move.pieceType];
      const score = minimax(newBoard, newUsed, depth - 1, false, -Infinity, Infinity, isEarlyGame);
      
      moveScores.push({ move, score });
      
      if (score > depthBestScore) {
        depthBestScore = score;
        depthBestMove = move;
      }
      
      // Early exit if we found a winning move
      if (score >= WEIGHTS.WIN - 100) {
        console.log(`[Expert AI] Found winning move at depth ${depth}`);
        return move;
      }
    }
    
    // If we completed this depth, update best move
    if (!isTimeUp() || depth === 2) {
      bestMove = depthBestMove;
      bestScore = depthBestScore;
      completedDepth = depth;
      
      // Re-order candidates based on this depth's scores for next iteration
      moveScores.sort((a, b) => b.score - a.score);
      candidates = moveScores.map(ms => ms.move);
    }
  }
  
  const elapsed = Date.now() - searchStartTime;
  console.log(`[Expert AI] Depth ${completedDepth}, ${nodesSearched} nodes in ${elapsed}ms, score: ${bestScore}`);
  
  return bestMove;
};

// ============================================
// INTERMEDIATE AI
// ============================================

const findMoveIntermediate = (board, usedPieces) => {
  const moves = getAllPossibleMoves(board, usedPieces, true);
  if (moves.length === 0) return null;
  
  const isEarlyGame = usedPieces.length < 4;
  
  // Score all moves with quick evaluation
  const scoredMoves = moves.map(move => {
    let score = quickEval(board, move, usedPieces, isEarlyGame);
    
    // Add 1-ply lookahead evaluation
    const newBoard = applyMove(board, move, 2);
    const newUsed = [...usedPieces, move.pieceType];
    
    // Check if this move wins
    if (!canAnyMoveBeMade(newBoard, newUsed)) {
      score += 1000; // Winning move!
    } else {
      // Simple mobility evaluation
      const opponentMoves = countValidMoves(newBoard, newUsed);
      score -= opponentMoves * 2; // Fewer opponent moves = better
    }
    
    // Add randomness for unpredictability (10-15%)
    score += (Math.random() - 0.5) * Math.abs(score) * 0.25;
    
    return { ...move, score };
  });
  
  scoredMoves.sort((a, b) => b.score - a.score);
  
  // Pick from top 3 moves with weighted probability
  const topMoves = scoredMoves.slice(0, Math.min(3, scoredMoves.length));
  const weights = [0.6, 0.3, 0.1];
  const rand = Math.random();
  let cumulative = 0;
  
  for (let i = 0; i < topMoves.length; i++) {
    cumulative += weights[i];
    if (rand < cumulative) {
      return topMoves[i];
    }
  }
  
  return topMoves[0];
};

// ============================================
// BEGINNER AI (RANDOM)
// ============================================

const findMoveRandom = (board, usedPieces) => {
  const moves = getAllPossibleMoves(board, usedPieces, false);
  if (moves.length === 0) return null;
  
  // Truly random selection
  const randomIndex = Math.floor(Math.random() * moves.length);
  return moves[randomIndex];
};

// ============================================
// OPENING MOVE SELECTION
// ============================================

const getOpeningMove = (board, usedPieces, difficulty) => {
  const moves = getAllPossibleMoves(board, usedPieces, true);
  if (moves.length === 0) return null;
  
  if (difficulty === AI_DIFFICULTY.RANDOM) {
    // Random opening
    return moves[Math.floor(Math.random() * moves.length)];
  }
  
  // For intermediate and expert: prefer inflexible pieces placed centrally
  const openingMoves = moves.filter(m => {
    // Prefer center-ish positions
    const centerDist = Math.abs(m.row - 3.5) + Math.abs(m.col - 3.5);
    return centerDist < 4;
  });
  
  const pool = openingMoves.length > 0 ? openingMoves : moves;
  
  // Score by piece inflexibility (use hard pieces first)
  const scored = pool.map(m => ({
    ...m,
    score: (10 - (PIECE_FLEXIBILITY[m.pieceType] || 5)) + Math.random() * 3
  })).sort((a, b) => b.score - a.score);
  
  // Pick from top few for variety
  const topN = Math.min(5, scored.length);
  return scored[Math.floor(Math.random() * topN)];
};

// ============================================
// MAIN AI SELECTION FUNCTION
// ============================================

export const selectAIMove = async (board, boardPieces, usedPieces, difficulty = AI_DIFFICULTY.AVERAGE) => {
  const possibleMoves = getAllPossibleMoves(board, usedPieces, false);
  
  if (possibleMoves.length === 0) {
    console.log('[AI] No moves available');
    return null;
  }

  const isOpeningMove = usedPieces.length < 2;

  // Handle opening moves
  if (isOpeningMove) {
    console.log(`[AI] Opening move (${difficulty})`);
    return getOpeningMove(board, usedPieces, difficulty);
  }

  // Select move based on difficulty
  switch (difficulty) {
    case AI_DIFFICULTY.RANDOM:
      console.log('[Beginner AI] Selecting random move');
      return findMoveRandom(board, usedPieces);

    case AI_DIFFICULTY.PROFESSIONAL:
      console.log(`[Expert AI] Thinking... (${usedPieces.length} pieces placed)`);
      await new Promise(r => setTimeout(r, 100)); // Brief delay for UI
      
      const expertMove = findBestMoveExpert(board, usedPieces);
      if (expertMove) return expertMove;
      
      // Fallback to intermediate if something goes wrong
      console.log('[Expert AI] Falling back to intermediate');
      return findMoveIntermediate(board, usedPieces);

    case AI_DIFFICULTY.AVERAGE:
    default:
      console.log('[Intermediate AI] Evaluating moves');
      return findMoveIntermediate(board, usedPieces);
  }
};

// ============================================
// EXPORTS
// ============================================

export default {
  AI_DIFFICULTY,
  AI_MOVE_DELAY,
  selectAIMove,
  getAllPossibleMoves,
};
