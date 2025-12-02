import { pieces } from './pieces';
import { getPieceCoords, canPlacePiece, canAnyPieceBePlaced, BOARD_SIZE } from './gameLogic';

// Evaluate a potential AI move
export const evaluateAIMove = (board, row, col, coords, pieceType, usedPieces) => {
  // Simulate placing the piece
  const simulatedBoard = board.map(r => [...r]);
  for (const [dx, dy] of coords) {
    simulatedBoard[row + dy][col + dx] = 2;
  }
  
  const simulatedUsedPieces = [...usedPieces, pieceType];
  
  // If this move wins the game, give it maximum score
  if (!canAnyPieceBePlaced(simulatedBoard, simulatedUsedPieces)) {
    return 10000;
  }

  // Count opponent's possible moves after this placement
  let opponentMoveCount = 0;
  const remainingPieces = Object.keys(pieces).filter(p => !simulatedUsedPieces.includes(p));
  
  for (const oppPiece of remainingPieces) {
    for (let f = 0; f < 2; f++) {
      for (let r = 0; r < 4; r++) {
        const oppCoords = getPieceCoords(oppPiece, r, f === 1);
        for (let r2 = 0; r2 < BOARD_SIZE; r2++) {
          for (let c2 = 0; c2 < BOARD_SIZE; c2++) {
            if (canPlacePiece(simulatedBoard, r2, c2, oppCoords)) {
              opponentMoveCount++;
            }
          }
        }
      }
    }
  }

  // Base score: fewer opponent moves = better
  let score = 1000 - opponentMoveCount;

  // Bonus for center control
  for (const [dx, dy] of coords) {
    const r = row + dy;
    const c = col + dx;
    score += (7 - Math.abs(r - 3.5) - Math.abs(c - 3.5)) * 2;
    
    // Penalty for edge placement
    if (r === 0 || r === BOARD_SIZE - 1 || c === 0 || c === BOARD_SIZE - 1) {
      score -= 3;
    }
  }
  
  return score + Math.random() * 5;
};

// Get all possible moves for AI
export const getAllPossibleMoves = (board, usedPieces) => {
  const availablePieces = Object.keys(pieces).filter(p => !usedPieces.includes(p));
  const possibleMoves = [];

  for (const pieceType of availablePieces) {
    for (let flip = 0; flip < 2; flip++) {
      for (let rot = 0; rot < 4; rot++) {
        const coords = getPieceCoords(pieceType, rot, flip === 1);
        for (let row = 0; row < BOARD_SIZE; row++) {
          for (let col = 0; col < BOARD_SIZE; col++) {
            if (canPlacePiece(board, row, col, coords)) {
              possibleMoves.push({ pieceType, row, col, rot, flip: flip === 1 });
            }
          }
        }
      }
    }
  }

  return possibleMoves;
};

// Select the best move for AI
export const selectAIMove = (board, usedPieces) => {
  const possibleMoves = getAllPossibleMoves(board, usedPieces);
  
  if (possibleMoves.length === 0) {
    return null; // No moves available
  }

  const isEarlyGame = usedPieces.length < 4;
  
  // Score all moves
  for (const move of possibleMoves) {
    const coords = getPieceCoords(move.pieceType, move.rot, move.flip);
    let score = evaluateAIMove(board, move.row, move.col, coords, move.pieceType, usedPieces);
    
    // Add heavy randomization in early game for variety
    if (isEarlyGame) {
      score += Math.random() * 200;
    }
    move.score = score;
  }

  // Sort by score and select from top moves
  possibleMoves.sort((a, b) => b.score - a.score);
  const bestScore = possibleMoves[0].score;
  const topMoves = possibleMoves.filter(m => m.score >= bestScore - (isEarlyGame ? 50 : 1));
  
  return topMoves[Math.floor(Math.random() * Math.min(isEarlyGame ? 5 : 2, topMoves.length))];
};