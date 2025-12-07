// AI Logic for Deadblock - Enhanced with Minimax Lookahead
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

// Count valid moves for opponent
const countOpponentMoves = (board, usedPieces) => {
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

// Apply a move to board (returns new board)
const applyMove = (board, move) => {
  const newBoard = board.map(r => [...r]);
  for (const [dx, dy] of move.coords) {
    newBoard[move.row + dy][move.col + dx] = 2; // AI player
  }
  return newBoard;
};

// Basic evaluation: minimize opponent options
export const evaluateAIMove = (board, row, col, coords, pieceType, usedPieces) => {
  const simBoard = board.map(r => [...r]);
  for (const [dx, dy] of coords) {
    simBoard[row + dy][col + dx] = 2;
  }
  
  const simUsed = [...usedPieces, pieceType];
  
  // Instant win = best score
  if (!canAnyPieceBePlaced(simBoard, simUsed)) {
    return 100000;
  }

  // Count opponent's moves
  const oppMoves = countOpponentMoves(simBoard, simUsed);
  let score = 1000 - oppMoves;

  // Center control bonus
  for (const [dx, dy] of coords) {
    const r = row + dy;
    const c = col + dx;
    score += (7 - Math.abs(r - 3.5) - Math.abs(c - 3.5)) * 2;
    // Edge penalty
    if (r === 0 || r === 7 || c === 0 || c === 7) {
      score -= 3;
    }
  }
  
  return score;
};

// ====== MINIMAX FOR EXPERT MODE ======

// Minimax with alpha-beta pruning, depth-limited
const minimax = (board, usedPieces, depth, isMaximizing, alpha, beta) => {
  const moves = getAllPossibleMoves(board, usedPieces);
  
  // Terminal conditions
  if (moves.length === 0) {
    // Current player can't move = they lose
    return isMaximizing ? -10000 + depth : 10000 - depth;
  }
  
  if (depth === 0) {
    // Evaluation: negative opponent moves is good for AI
    const oppMoves = countOpponentMoves(board, usedPieces);
    return -oppMoves;
  }

  if (isMaximizing) {
    // AI's turn - maximize
    let maxEval = -Infinity;
    
    // Only check top moves for speed
    const scoredMoves = moves.map(m => ({
      ...m,
      quickScore: evaluateAIMove(board, m.row, m.col, m.coords, m.pieceType, usedPieces)
    })).sort((a, b) => b.quickScore - a.quickScore);
    
    const topMoves = scoredMoves.slice(0, Math.min(8, scoredMoves.length));
    
    for (const move of topMoves) {
      const newBoard = applyMove(board, move);
      const newUsed = [...usedPieces, move.pieceType];
      const evalScore = minimax(newBoard, newUsed, depth - 1, false, alpha, beta);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    // Opponent's turn - minimize
    let minEval = Infinity;
    
    // Sample opponent moves for speed
    const sampleMoves = moves.slice(0, Math.min(6, moves.length));
    
    for (const move of sampleMoves) {
      const newBoard = board.map(r => [...r]);
      for (const [dx, dy] of move.coords) {
        newBoard[move.row + dy][move.col + dx] = 1; // Player
      }
      const newUsed = [...usedPieces, move.pieceType];
      const evalScore = minimax(newBoard, newUsed, depth - 1, true, alpha, beta);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
};

// Find best move using minimax
const findBestMoveWithMinimax = (board, usedPieces, depth = 2) => {
  const moves = getAllPossibleMoves(board, usedPieces);
  if (moves.length === 0) return null;
  
  let bestMove = null;
  let bestScore = -Infinity;
  
  // Pre-score moves for ordering
  const scoredMoves = moves.map(m => ({
    ...m,
    quickScore: evaluateAIMove(board, m.row, m.col, m.coords, m.pieceType, usedPieces)
  })).sort((a, b) => b.quickScore - a.quickScore);
  
  // Check top candidates with minimax
  const candidates = scoredMoves.slice(0, Math.min(12, scoredMoves.length));
  
  for (const move of candidates) {
    const newBoard = applyMove(board, move);
    const newUsed = [...usedPieces, move.pieceType];
    
    // Check for instant win
    if (!canAnyPieceBePlaced(newBoard, newUsed)) {
      console.log('Expert AI found winning move!');
      return move;
    }
    
    const score = minimax(newBoard, newUsed, depth, false, -Infinity, Infinity);
    
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  
  console.log(`Expert AI evaluated ${candidates.length} moves, best score: ${bestScore}`);
  return bestMove;
};

// ====== MAIN SELECT FUNCTION ======

export const selectAIMove = async (board, boardPieces, usedPieces, difficulty = AI_DIFFICULTY.AVERAGE) => {
  const possibleMoves = getAllPossibleMoves(board, usedPieces);
  
  if (possibleMoves.length === 0) return null;

  // Early game = first 3 AI moves (pieces 0-5 placed means AI has moved 0-2 times)
  const isEarlyGame = usedPieces.length < 6;
  // Very early = first move
  const isOpeningMove = usedPieces.length < 2;

  switch (difficulty) {
    case AI_DIFFICULTY.RANDOM:
      // Level 1: Completely random
      return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

    case AI_DIFFICULTY.PROFESSIONAL:
      // Level 3: Minimax lookahead, but random opening
      
      // For opening moves, pick randomly from reasonable positions to add variety
      if (isOpeningMove) {
        console.log('Expert AI: Random opening move for variety');
        // Filter to center-ish positions but pick randomly
        const centerMoves = possibleMoves.filter(m => {
          const centerRow = m.row + 2; // Approximate center of piece
          const centerCol = m.col + 2;
          return centerRow >= 1 && centerRow <= 6 && centerCol >= 1 && centerCol <= 6;
        });
        const pool = centerMoves.length > 10 ? centerMoves : possibleMoves;
        return pool[Math.floor(Math.random() * pool.length)];
      }
      
      // Early game: add significant randomness
      if (isEarlyGame) {
        console.log('Expert AI: Semi-random early game');
        // Score moves but add heavy randomness
        const scoredMoves = possibleMoves.map(m => ({
          ...m,
          score: evaluateAIMove(board, m.row, m.col, m.coords, m.pieceType, usedPieces) + Math.random() * 500
        }));
        scoredMoves.sort((a, b) => b.score - a.score);
        // Pick randomly from top 8
        const topN = Math.min(8, scoredMoves.length);
        return scoredMoves[Math.floor(Math.random() * topN)];
      }
      
      console.log('Expert AI thinking with minimax...');
      
      // Use deeper search in late game when fewer pieces remain
      const depth = usedPieces.length >= 8 ? 3 : 2;
      
      // Small delay for UX
      await new Promise(r => setTimeout(r, 100));
      
      const bestMove = findBestMoveWithMinimax(board, usedPieces, depth);
      
      if (bestMove) {
        return bestMove;
      }
      // Fall through to average if minimax fails
      console.log('Minimax failed, falling back to average');

    case AI_DIFFICULTY.AVERAGE:
    default:
      // Level 2: Basic strategy with randomness
      
      // Opening move: pick completely randomly from good positions
      if (isOpeningMove) {
        // Any move that's not right on the edge is fine for opening
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
          score += Math.random() * 400; // Heavy randomness early
        } else {
          score += Math.random() * 50;  // Light randomness late
        }
        move.score = score;
      }

      possibleMoves.sort((a, b) => b.score - a.score);
      
      // Pick from top moves - more variety in early game
      const topCount = isEarlyGame ? 6 : 3;
      const topMoves = possibleMoves.slice(0, Math.min(topCount, possibleMoves.length));
      
      return topMoves[Math.floor(Math.random() * topMoves.length)];
  }
};
