// ============================================================
// PATCH for src/utils/aiLogic.js
// Fix: AI opening move piece selection bias
//
// PROBLEM: X pentomino is fully symmetric (all 8 orientations
// produce identical coords). Without dedup, it gets 8x entries
// in the moves list, making it ~8x more likely to be selected
// by a flat Math.random() pick.
//
// FIX: Pick a random piece type FIRST (equal 1/12 probability),
// then pick a random center-ish placement for that piece.
// Uses dedupe=true to eliminate duplicate orientations.
// ============================================================

// REPLACE the existing getRandomOpeningMove function with this:

// ====== RANDOM OPENING MOVE (FIXED - fair piece selection) ======
const getRandomOpeningMove = (board, usedPieces) => {
  // Use dedupe=true to eliminate symmetric orientation duplicates
  const moves = getAllPossibleMoves(board, usedPieces, true);
  if (moves.length === 0) return null;

  // Group moves by piece type
  const byPiece = {};
  for (const move of moves) {
    if (!byPiece[move.pieceType]) byPiece[move.pieceType] = [];
    byPiece[move.pieceType].push(move);
  }

  // Pick a random piece type first (equal probability for each piece)
  const pieceTypes = Object.keys(byPiece);
  const randomPiece = pieceTypes[Math.floor(Math.random() * pieceTypes.length)];

  // Then pick a random placement for that piece, preferring center positions
  const pieceMoves = byPiece[randomPiece];
  const centerMoves = pieceMoves.filter(m =>
    m.row >= 1 && m.row <= 5 && m.col >= 1 && m.col <= 5
  );
  const pool = centerMoves.length > 0 ? centerMoves : pieceMoves;
  const selected = pool[Math.floor(Math.random() * pool.length)];

  console.log(`Random opening: Picked ${randomPiece} (1 of ${pieceTypes.length} pieces, ${pool.length} positions)`);
  return selected;
};


// ALSO UPDATE the AVERAGE opening move section inside selectAIMove.
// Find this block:
//
//   case AI_DIFFICULTY.AVERAGE:
//   default:
//     if (isOpeningMove) {
//       const goodOpeners = possibleMoves.filter(m =>
//         m.row >= 1 && m.row <= 5 && m.col >= 1 && m.col <= 5
//       );
//       const pool = goodOpeners.length > 5 ? goodOpeners : possibleMoves;
//       return pool[Math.floor(Math.random() * pool.length)];
//     }
//
// REPLACE WITH:
//
//   case AI_DIFFICULTY.AVERAGE:
//   default:
//     if (isOpeningMove) {
//       return getRandomOpeningMove(board, usedPieces);
//     }
