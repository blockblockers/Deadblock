import { pieces } from './pieces';

export const BOARD_SIZE = 8;

// Rotate piece 90 degrees clockwise
export const rotatePiece = (coords) => coords.map(([x, y]) => [-y, x]);

// Flip piece horizontally
export const flipPiece = (coords) => coords.map(([x, y]) => [-x, y]);

// Get piece coordinates with rotation and flip applied
// rotation can be either 0-3 (count) or 0/90/180/270 (degrees)
export const getPieceCoords = (pieceType, rotation = 0, flipped = false) => {
  let coords = pieces[pieceType];
  if (!coords) {
    console.error('getPieceCoords: Unknown piece type', pieceType);
    return [];
  }
  coords = [...coords.map(c => [...c])]; // Deep copy
  if (flipped) coords = flipPiece(coords);
  
  // Handle both rotation count (0-3) and degrees (0, 90, 180, 270)
  const rotationCount = rotation >= 90 ? Math.floor(rotation / 90) : rotation;
  for (let i = 0; i < rotationCount; i++) coords = rotatePiece(coords);
  return coords;
};

// Check if a piece can be placed at the given position
export const canPlacePiece = (board, row, col, pieceCoords) => {
  if (!board || !Array.isArray(board)) {
    console.error('canPlacePiece: Invalid board');
    return false;
  }
  if (!pieceCoords || !Array.isArray(pieceCoords)) {
    console.error('canPlacePiece: Invalid pieceCoords');
    return false;
  }
  
  for (const [dx, dy] of pieceCoords) {
    const newRow = row + dy;
    const newCol = col + dx;
    if (newRow < 0 || newRow >= BOARD_SIZE || newCol < 0 || newCol >= BOARD_SIZE) {
      return false;
    }
    // Check if cell is occupied (not null and not 0)
    const cell = board[newRow]?.[newCol];
    if (cell !== null && cell !== 0 && cell !== undefined) {
      return false;
    }
  }
  return true;
};

// Check if piece is within board bounds
export const isWithinBounds = (row, col, pieceCoords) => {
  for (const [dx, dy] of pieceCoords) {
    const newRow = row + dy;
    const newCol = col + dx;
    if (newRow < 0 || newRow >= BOARD_SIZE || newCol < 0 || newCol >= BOARD_SIZE) {
      return false;
    }
  }
  return true;
};

// Check if any piece can be placed on the board
export const canAnyPieceBePlaced = (board, usedPieces) => {
  if (!board || !Array.isArray(board)) {
    console.error('canAnyPieceBePlaced: Invalid board');
    return true; // Default to true to avoid ending game incorrectly
  }
  
  const safeUsedPieces = Array.isArray(usedPieces) ? usedPieces : [];
  
  for (const pieceType of Object.keys(pieces)) {
    if (safeUsedPieces.includes(pieceType)) continue;
    for (let flip = 0; flip < 2; flip++) {
      for (let rot = 0; rot < 4; rot++) {
        const coords = getPieceCoords(pieceType, rot * 90, flip === 1);
        for (let row = 0; row < BOARD_SIZE; row++) {
          for (let col = 0; col < BOARD_SIZE; col++) {
            if (canPlacePiece(board, row, col, coords)) return true;
          }
        }
      }
    }
  }
  return false;
};

// Check if the current orientation fits - NO AUTO-ROTATION
// Returns the same rotation/flip if valid, null if not valid
export const checkOrientationFits = (row, col, piece, rotation, flipped) => {
  const coords = getPieceCoords(piece, rotation, flipped);
  if (isWithinBounds(row, col, coords)) {
    return { rotation, flipped };
  }
  return null; // Don't auto-rotate, just return null if it doesn't fit
};

// Legacy function name for compatibility - now just checks current orientation
export const findFittingOrientation = (row, col, piece, startRot, startFlip) => {
  return checkOrientationFits(row, col, piece, startRot, startFlip);
};

// Create an empty board
export const createEmptyBoard = () => 
  Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));

// Place a piece on the board and return new board state
export const placePiece = (board, boardPieces, row, col, piece, pieceCoords, player) => {
  const newBoard = board.map(r => [...r]);
  const newBoardPieces = Array.isArray(boardPieces) 
    ? boardPieces.map(r => [...r])
    : Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  
  for (const [dx, dy] of pieceCoords) {
    newBoard[row + dy][col + dx] = player;
    newBoardPieces[row + dy][col + dx] = piece;
  }
  
  return { newBoard, newBoardPieces };
};
