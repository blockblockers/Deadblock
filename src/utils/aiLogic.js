// AI Logic for Deadblock - Optimized for Speed
// UPDATED: Expert AI now plays random opening move, added configurable delay
import { pieces } from './pieces';
import { getPieceCoords, canPlacePiece, canAnyPieceBePlaced, BOARD_SIZE } from './gameLogic';

export const AI_DIFFICULTY = {
  RANDOM: 'random',
  AVERAGE: 'average',
  PROFESSIONAL: 'professional'
};

// Configurable AI move delay (in milliseconds)
// This creates a more natural turn-based feel
export const AI_MOVE_DELAY = {
  [AI_DIFFICULTY.RANDOM]: 1200,      // 1.2 seconds for beginner
  [AI_DIFFICULTY.AVERAGE]: 1500,     // 1.5 seconds for intermediate
  [AI_DIFFICULTY.PROFESSIONAL]: 1800, // 1.8 seconds for expert (thinking time)
  PUZZLE: 1500,                       // 1.5 seconds for puzzle mode
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

const applyMove = (board, move, player = 2) => {
  const newBoard = board.map(r => [...r]);
  for (const [dx, dy] of move.coords) {
    newBoard[move.row + dy][move.col + dx] = player;
  }
  return newBoard;
};

const quickEval = (board, row, col, coords) => {
  let score = 0;
  for (const [dx, dy] of coords) {
    const r = row + dy;
    const c = col + dx;
    score += (3.5 - Math.abs(r - 3.5)) + (3.5 - Math.abs(c - 3.5));
  }
  return score;
};

const evaluatePosition = (board, usedPieces, isAITurn) => {
  const placeablePieces = countPlaceablePieces(board, usedPieces);
  return isAITurn ? -placeablePieces : placeablePieces;
};

// ====== TIME-LIMITED MINIMAX ======

let searchStartTime = 0;
let nodesSearched = 0;
const MAX_SEARCH_TIME = 2000;

const isTimeUp = () => Date.now() - searchStartTime > MAX_SEARCH_TIME;

const minimax = (board, usedPieces, depth, isMaximizing, alpha, beta) => {
  nodesSearched++;
  if (isTimeUp()) return 0;
  if (!canAnyMoveBeMade(board, usedPieces)) {
    return isMaximizing ? -10000 : 10000;
  }
  if (depth <= 0) {
    return evaluatePosition(board, usedPieces, isMaximizing);
  }
  
  const moves = getAllPossibleMoves(board, usedPieces, true);
  moves.sort((a, b) => {
    const scoreA = quickEval(board, a.row, a.col, a.coords);
    const scoreB = quickEval(board, b.row, b.col, b.coords);
    return isMaximizing ? scoreB - scoreA : scoreA - scoreB;
  });
  
  const movesToEval = moves.slice(0, Math.min(6, moves.length));
  
  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const move of movesToEval) {
      if (isTimeUp()) break;
      const newBoard = applyMove(board, move, 2);
      const newUsed = [...usedPieces, move.pieceType];
      const score = minimax(newBoard, newUsed, depth - 1, false, alpha, beta);
      maxScore = Math.max(maxScore, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return maxScore;
  } else {
    let minScore = Infinity;
    for (const move of movesToEval) {
      if (isTimeUp()) break;
      const newBoard = applyMove(board, move, 1);
      const newUsed = [...usedPieces, move.pieceType];
      const score = minimax(newBoard, newUsed, depth - 1, true, alpha, beta);
      minScore = Math.min(minScore, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return minScore;
  }
};

const findBestMove = (board, usedPieces) => {
  searchStartTime = Date.now();
  nodesSearched = 0;
  
  const moves = getAllPossibleMoves(board, usedPieces, true);
  if (moves.length === 0) return null;
  
  const scoredMoves = moves.map(move => ({
    ...move,
    quickScore: quickEval(board, move.row, move.col, move.coords)
  })).sort((a, b) => b.quickScore - a.quickScore);
  
  if (scoredMoves.length === 1) {
    console.log('Expert AI: Only one move available');
    return scoredMoves[0];
  }
  
  const piecesRemaining = 12 - usedPieces.length;
  let depth;
  if (piecesRemaining <= 4) {
    depth = 4;
  } else if (piecesRemaining <= 6) {
    depth = 3;
  } else {
    depth = 2;
  }
  
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
    
    if (score > 5000) {
      console.log('Expert AI: Found strong winning path');
      break;
    }
  }
  
  const elapsed = Date.now() - searchStartTime;
  console.log(`Expert AI: ${nodesSearched} nodes in ${elapsed}ms, best score: ${bestScore}`);
  
  return bestMove;
};

// ====== RANDOM OPENING MOVE ======
const getRandomOpeningMove = (board, usedPieces) => {
  const moves = getAllPossibleMoves(board, usedPieces, false);
  if (moves.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * moves.length);
  console.log(`Random opening move: Selected move ${randomIndex + 1} of ${moves.length}`);
  return moves[randomIndex];
};

// ====== MAIN SELECT FUNCTION ======

export const selectAIMove = async (board, boardPieces, usedPieces, difficulty = AI_DIFFICULTY.AVERAGE) => {
  const possibleMoves = getAllPossibleMoves(board, usedPieces, false);
  
  if (possibleMoves.length === 0) return null;

  const isOpeningMove = usedPieces.length < 2;
  const isEarlyGame = usedPieces.length < 6;

  switch (difficulty) {
    case AI_DIFFICULTY.RANDOM:
      return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

    case AI_DIFFICULTY.PROFESSIONAL:
      // UPDATED: Random opening move instead of always placing "P" in center
      if (isOpeningMove) {
        console.log('Expert AI: Using random opening move');
        return getRandomOpeningMove(board, usedPieces);
      }
      
      console.log(`Expert AI thinking... (${usedPieces.length} pieces placed)`);
      await new Promise(r => setTimeout(r, 50));
      
      const bestMove = findBestMove(board, usedPieces);
      if (bestMove) return bestMove;
      
      console.log('Expert AI: Falling back to strategic move');
      // Fall through to average if minimax fails

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
      
      const evaluated = possibleMoves.map(move => {
        const newBoard = applyMove(board, move, 2);
        const newUsed = [...usedPieces, move.pieceType];
        const score = evaluatePosition(newBoard, newUsed, true) + Math.random() * 5;
        return { ...move, score };
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
