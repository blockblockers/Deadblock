// AI Logic for Deadblock - Enhanced for Strategic Play
// Difficulties: RANDOM (Beginner), AVERAGE (Intermediate), PROFESSIONAL (Expert)
import { pieces } from './pieces';
import { getPieceCoords, canPlacePiece, canAnyPieceBePlaced, BOARD_SIZE } from './gameLogic';

export const AI_DIFFICULTY = {
  RANDOM: 'random',        // Beginner - picks random valid moves
  AVERAGE: 'average',      // Intermediate - basic evaluation with some randomness
  PROFESSIONAL: 'professional'  // Expert - deep minimax with blocking & future awareness
};

// Configurable AI move delay (in milliseconds)
export const AI_MOVE_DELAY = {
  [AI_DIFFICULTY.RANDOM]: 1200,
  [AI_DIFFICULTY.AVERAGE]: 1500,
  [AI_DIFFICULTY.PROFESSIONAL]: 1800,
  PUZZLE: 1500,
};

// ====== OPTIMIZED MOVE GENERATION ======

const pieceCoordCache = new Map();

const getCachedPieceCoords = (pieceType, rot, flip) => {
  const key = `${pieceType}-${rot}-${flip}`;
  if (!pieceCoordCache.has(key)) {
    pieceCoordCache.set(key, getPieceCoords(pieceType, rot, flip));
  }
  return pieceCoordCache.get(key);
};

const getPlacementHash = (coords, row, col) => {
  const placed = coords.map(([dx, dy]) => `${row + dy},${col + dx}`).sort().join('|');
  return placed;
};

export const getAllPossibleMoves = (board, usedPieces, dedupe = false) => {
  const available = Object.keys(pieces).filter(p => !usedPieces.includes(p));
  const moves = [];
  const seen = dedupe ? new Set() : null;
  
  for (const pieceType of available) {
    for (let rot = 0; rot < 4; rot++) {
      for (const flip of [false, true]) {
        const coords = getCachedPieceCoords(pieceType, rot, flip);
        
        for (let row = -3; row < BOARD_SIZE + 3; row++) {
          for (let col = -3; col < BOARD_SIZE + 3; col++) {
            if (canPlacePiece(board, row, col, coords)) {
              if (dedupe) {
                const hash = `${pieceType}-${getPlacementHash(coords, row, col)}`;
                if (seen.has(hash)) continue;
                seen.add(hash);
              }
              moves.push({ pieceType, row, col, rot, flip, coords });
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
    for (let rot = 0; rot < 4; rot++) {
      for (const flip of [false, true]) {
        const coords = getCachedPieceCoords(pieceType, rot, flip);
        
        for (let row = -3; row < BOARD_SIZE + 3; row++) {
          for (let col = -3; col < BOARD_SIZE + 3; col++) {
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

// Apply a move to the board (returns new board)
const applyMove = (board, move, player) => {
  const newBoard = board.map(row => [...row]);
  for (const [dx, dy] of move.coords) {
    const r = move.row + dy;
    const c = move.col + dx;
    if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
      newBoard[r][c] = player;
    }
  }
  return newBoard;
};

// ====== ENHANCED EVALUATION FUNCTIONS ======

// Quick evaluation for move ordering
const quickEval = (board, row, col, coords) => {
  let score = 0;
  const center = (BOARD_SIZE - 1) / 2;
  
  for (const [dx, dy] of coords) {
    const r = row + dy;
    const c = col + dx;
    if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
      // Prefer center positions
      const distFromCenter = Math.abs(r - center) + Math.abs(c - center);
      score += (6 - distFromCenter);
      
      // Bonus for adjacency to existing pieces
      for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] !== 0) {
          score += 2;
        }
      }
    }
  }
  
  return score;
};

// Count how many pieces can still be placed after this move
const countFutureMoves = (board, usedPieces) => {
  const available = Object.keys(pieces).filter(p => !usedPieces.includes(p));
  let placeablePieces = 0;
  
  for (const pieceType of available) {
    let canPlace = false;
    
    outerLoop:
    for (let rot = 0; rot < 4; rot++) {
      for (const flip of [false, true]) {
        const coords = getCachedPieceCoords(pieceType, rot, flip);
        
        for (let row = -3; row < BOARD_SIZE + 3; row++) {
          for (let col = -3; col < BOARD_SIZE + 3; col++) {
            if (canPlacePiece(board, row, col, coords)) {
              canPlace = true;
              break outerLoop;
            }
          }
        }
      }
    }
    
    if (canPlace) placeablePieces++;
  }
  
  return placeablePieces;
};

// Count total valid move positions (more granular than piece count)
const countTotalValidMoves = (board, usedPieces) => {
  return getAllPossibleMoves(board, usedPieces, true).length;
};

// Count empty cells in a region (for territory analysis)
const countEmptyCellsInRegion = (board, centerRow, centerCol, radius) => {
  let count = 0;
  for (let r = Math.max(0, centerRow - radius); r <= Math.min(BOARD_SIZE - 1, centerRow + radius); r++) {
    for (let c = Math.max(0, centerCol - radius); c <= Math.min(BOARD_SIZE - 1, centerCol + radius); c++) {
      if (board[r][c] === 0) count++;
    }
  }
  return count;
};

// Evaluate how much a move blocks the opponent
const evaluateBlockingPotential = (board, move, usedPieces) => {
  const newBoard = applyMove(board, move, 2);
  const newUsed = [...usedPieces, move.pieceType];
  
  // Count opponent's moves before and after this move
  // (Simulating as if it's opponent's turn with the same pieces available)
  const opponentMovesBefore = getAllPossibleMoves(board, usedPieces, true).length;
  const opponentMovesAfter = getAllPossibleMoves(newBoard, newUsed, true).length;
  
  // How many moves did we eliminate for the opponent?
  const movesBlocked = opponentMovesBefore - opponentMovesAfter;
  
  return movesBlocked;
};

// Enhanced position evaluation with blocking consideration
const evaluatePosition = (board, usedPieces, isAI, considerBlocking = false) => {
  let score = 0;
  
  // Count cells controlled
  let aiCells = 0;
  let playerCells = 0;
  
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 2) aiCells++;
      else if (board[r][c] === 1) playerCells++;
    }
  }
  
  score += (aiCells - playerCells) * 10;
  
  // CRITICAL: Evaluate future move availability
  const aiFutureMoves = countFutureMoves(board, usedPieces);
  
  // Strong bonus for maintaining playability
  score += aiFutureMoves * 50;
  
  // Penalty if running out of moves
  if (aiFutureMoves <= 2) {
    score -= 200;
  }
  if (aiFutureMoves === 0) {
    score -= 5000; // Severe penalty for having no moves
  }
  
  // Territory control - prefer controlling center regions
  const centerControl = countEmptyCellsInRegion(board, 3, 3, 2);
  score += centerControl * 3;
  
  return score;
};

// ====== TIME-LIMITED MINIMAX WITH FUTURE MOVE AWARENESS ======

let searchStartTime = 0;
let nodesSearched = 0;
const MAX_SEARCH_TIME_HARD = 3000;
const MAX_SEARCH_TIME_EXPERT = 3500;

const isTimeUp = (maxTime) => Date.now() - searchStartTime > maxTime;

const minimax = (board, usedPieces, depth, isMaximizing, alpha, beta, maxTime) => {
  nodesSearched++;
  if (isTimeUp(maxTime)) return 0;
  
  // Terminal state: no moves available
  if (!canAnyMoveBeMade(board, usedPieces)) {
    return isMaximizing ? -10000 : 10000;
  }
  
  if (depth <= 0) {
    return evaluatePosition(board, usedPieces, isMaximizing);
  }
  
  const moves = getAllPossibleMoves(board, usedPieces, true);
  
  // Sort moves by quick evaluation + future move potential
  moves.sort((a, b) => {
    const newBoardA = applyMove(board, a, isMaximizing ? 2 : 1);
    const newBoardB = applyMove(board, b, isMaximizing ? 2 : 1);
    const newUsedA = [...usedPieces, a.pieceType];
    const newUsedB = [...usedPieces, b.pieceType];
    
    // Quick future move count (just count pieces, not all positions)
    const futureA = countFutureMoves(newBoardA, newUsedA);
    const futureB = countFutureMoves(newBoardB, newUsedB);
    
    const scoreA = quickEval(board, a.row, a.col, a.coords) + futureA * 10;
    const scoreB = quickEval(board, b.row, b.col, b.coords) + futureB * 10;
    
    return isMaximizing ? scoreB - scoreA : scoreA - scoreB;
  });
  
  // Evaluate more moves for better analysis
  const movesToEval = moves.slice(0, Math.min(10, moves.length));
  
  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const move of movesToEval) {
      if (isTimeUp(maxTime)) break;
      const newBoard = applyMove(board, move, 2);
      const newUsed = [...usedPieces, move.pieceType];
      const score = minimax(newBoard, newUsed, depth - 1, false, alpha, beta, maxTime);
      maxScore = Math.max(maxScore, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return maxScore;
  } else {
    let minScore = Infinity;
    for (const move of movesToEval) {
      if (isTimeUp(maxTime)) break;
      const newBoard = applyMove(board, move, 1);
      const newUsed = [...usedPieces, move.pieceType];
      const score = minimax(newBoard, newUsed, depth - 1, true, alpha, beta, maxTime);
      minScore = Math.min(minScore, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return minScore;
  }
};

// ====== ENHANCED BEST MOVE FINDER FOR EXPERT ======

const findBestMoveExpert = (board, usedPieces) => {
  searchStartTime = Date.now();
  nodesSearched = 0;
  
  const moves = getAllPossibleMoves(board, usedPieces, true);
  if (moves.length === 0) return null;
  
  // Pre-evaluate all moves with comprehensive analysis including blocking
  const scoredMoves = moves.map(move => {
    const newBoard = applyMove(board, move, 2);
    const newUsed = [...usedPieces, move.pieceType];
    const futureMoveCount = countFutureMoves(newBoard, newUsed);
    const quickScore = quickEval(board, move.row, move.col, move.coords);
    const blockingScore = evaluateBlockingPotential(board, move, usedPieces);
    const totalMoves = countTotalValidMoves(newBoard, newUsed);
    
    return {
      ...move,
      quickScore,
      futureMoveCount,
      blockingScore,
      totalMoves,
      // Expert: Aggressive blocking + future awareness + position control
      combinedScore: quickScore + futureMoveCount * 30 + blockingScore * 20 + totalMoves * 3
    };
  });
  
  scoredMoves.sort((a, b) => b.combinedScore - a.combinedScore);
  
  // Filter out moves that leave no future options
  const viableMoves = scoredMoves.filter(m => m.futureMoveCount > 0);
  const movesToConsider = viableMoves.length > 0 ? viableMoves : scoredMoves;
  
  if (movesToConsider.length === 1) {
    console.log('Expert AI: Only one viable move available');
    return movesToConsider[0];
  }
  
  // Expert mode uses deepest search with aggressive depths
  const piecesRemaining = 12 - usedPieces.length;
  let depth;
  if (piecesRemaining <= 3) {
    depth = 6; // Very deep endgame - find the win
  } else if (piecesRemaining <= 5) {
    depth = 5;
  } else if (piecesRemaining <= 7) {
    depth = 4;
  } else {
    depth = 3;
  }
  
  // Consider more candidates for thorough analysis
  const candidates = movesToConsider.slice(0, Math.min(15, movesToConsider.length));
  
  let bestMove = candidates[0];
  let bestScore = -Infinity;
  
  console.log(`Expert AI evaluating ${candidates.length} candidates at depth ${depth}...`);
  
  for (const move of candidates) {
    if (isTimeUp(MAX_SEARCH_TIME_EXPERT)) {
      console.log('Expert AI: Time limit reached');
      break;
    }
    
    const newBoard = applyMove(board, move, 2);
    const newUsed = [...usedPieces, move.pieceType];
    
    // Aggressive scoring: heavily weight blocking and future moves
    const futureBonus = move.futureMoveCount * 40;
    const blockBonus = move.blockingScore * 25;  // Increased blocking importance
    const movesBonus = move.totalMoves * 4;
    const minimaxScore = minimax(newBoard, newUsed, depth, false, -Infinity, Infinity, MAX_SEARCH_TIME_EXPERT);
    const totalScore = minimaxScore + futureBonus + blockBonus + movesBonus;
    
    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestMove = move;
    }
    
    // Early exit if found a clearly winning move
    if (totalScore > 5000) {
      console.log('Expert AI: Found winning path');
      break;
    }
  }
  
  const elapsed = Date.now() - searchStartTime;
  console.log(`Expert AI: ${nodesSearched} nodes in ${elapsed}ms, best: ${bestScore}, future: ${bestMove.futureMoveCount}, blocking: ${bestMove.blockingScore}`);
  
  return bestMove;
};
  
  return bestMove;
};

// ====== RANDOM OPENING MOVE ======
const getRandomOpeningMove = (board, usedPieces) => {
  const moves = getAllPossibleMoves(board, usedPieces, false);
  if (moves.length === 0) return null;
  
  // Prefer center-ish positions for opening
  const centerMoves = moves.filter(m => 
    m.row >= 1 && m.row <= 5 && m.col >= 1 && m.col <= 5
  );
  
  const pool = centerMoves.length > 5 ? centerMoves : moves;
  const randomIndex = Math.floor(Math.random() * pool.length);
  console.log(`Random opening move: Selected move ${randomIndex + 1} of ${pool.length}`);
  return pool[randomIndex];
};

// ====== STRATEGIC OPENING MOVE (for Hard/Expert) ======
const getStrategicOpeningMove = (board, usedPieces) => {
  const moves = getAllPossibleMoves(board, usedPieces, true);
  if (moves.length === 0) return null;
  
  // Evaluate openings by future potential
  const evaluated = moves.map(move => {
    const newBoard = applyMove(board, move, 2);
    const newUsed = [...usedPieces, move.pieceType];
    const futureMoves = countFutureMoves(newBoard, newUsed);
    const centerScore = quickEval(board, move.row, move.col, move.coords);
    
    return {
      ...move,
      score: futureMoves * 10 + centerScore + Math.random() * 5 // Slight randomness
    };
  });
  
  evaluated.sort((a, b) => b.score - a.score);
  
  // Pick from top 3 to add variety
  const topMoves = evaluated.slice(0, Math.min(3, evaluated.length));
  return topMoves[Math.floor(Math.random() * topMoves.length)];
};

// ====== MAIN SELECT FUNCTION ======

export const selectAIMove = async (board, boardPieces, usedPieces, difficulty = AI_DIFFICULTY.AVERAGE) => {
  const possibleMoves = getAllPossibleMoves(board, usedPieces, false);
  
  if (possibleMoves.length === 0) return null;

  const isOpeningMove = usedPieces.length < 2;
  const isEarlyGame = usedPieces.length < 5;

  switch (difficulty) {
    case AI_DIFFICULTY.RANDOM:
      return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

    case AI_DIFFICULTY.PROFESSIONAL:
      // Expert mode: Deep analysis with blocking awareness and future move evaluation
      if (isOpeningMove) {
        console.log('Expert AI: Strategic opening move');
        return getStrategicOpeningMove(board, usedPieces);
      }
      
      console.log(`Expert AI thinking... (${usedPieces.length} pieces placed)`);
      await new Promise(r => setTimeout(r, 50));
      
      const expertMove = findBestMoveExpert(board, usedPieces);
      if (expertMove) return expertMove;
      
      console.log('Expert AI: Falling back to average strategy');
      // Fall through to average

    case AI_DIFFICULTY.AVERAGE:
    default:
      if (isOpeningMove) {
        const goodOpeners = possibleMoves.filter(m => 
          m.row >= 1 && m.row <= 5 && m.col >= 1 && m.col <= 5
        );
        const pool = goodOpeners.length > 5 ? goodOpeners : possibleMoves;
        return pool[Math.floor(Math.random() * pool.length)];
      }
      
      if (isEarlyGame) {
        const scored = possibleMoves.map(m => ({
          ...m,
          score: quickEval(board, m.row, m.col, m.coords) + Math.random() * 10
        }));
        scored.sort((a, b) => b.score - a.score);
        const topMoves = scored.slice(0, Math.min(3, scored.length));
        return topMoves[Math.floor(Math.random() * topMoves.length)];
      }
      
      // Mid/late game: Evaluate with some future awareness
      const evaluated = possibleMoves.map(move => {
        const newBoard = applyMove(board, move, 2);
        const newUsed = [...usedPieces, move.pieceType];
        const futureMoves = countFutureMoves(newBoard, newUsed);
        const positionScore = evaluatePosition(newBoard, newUsed, true);
        const score = positionScore + futureMoves * 15 + Math.random() * 5;
        return { ...move, score, futureMoves };
      });
      
      evaluated.sort((a, b) => b.score - a.score);
      const top = evaluated.slice(0, Math.min(2, evaluated.length));
      return top[Math.floor(Math.random() * top.length)];
  }
};

export default {
  AI_DIFFICULTY,
  AI_MOVE_DELAY,
  selectAIMove,
  getAllPossibleMoves,
};
