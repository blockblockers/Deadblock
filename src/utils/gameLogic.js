import { pieces } from './pieces';

export const BOARD_SIZE = 8;

// ====== CENTER-BASED ROTATION ======
// Rotate piece 90 degrees clockwise around its center
export const rotatePiece = (coords) => {
  // Calculate the center of the piece
  const xs = coords.map(([x]) => x);
  const ys = coords.map(([, y]) => y);
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
  
  // Rotate each coordinate 90 degrees clockwise around the center
  return coords.map(([x, y]) => {
    const dx = x - centerX;
    const dy = y - centerY;
    // Rotate 90 degrees clockwise: (dx, dy) -> (dy, -dx)
    const newX = centerX + dy;
    const newY = centerY - dx;
    return [Math.round(newX), Math.round(newY)];
  });
};

// Flip piece horizontally around its center
export const flipPiece = (coords) => {
  const xs = coords.map(([x]) => x);
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
  
  return coords.map(([x, y]) => {
    const newX = centerX - (x - centerX);
    return [Math.round(newX), y];
  });
};

// Normalize piece coordinates to start from (0,0)
const normalizePieceCoords = (coords) => {
  if (!coords || coords.length === 0) return coords;
  
  const minX = Math.min(...coords.map(([x]) => x));
  const minY = Math.min(...coords.map(([, y]) => y));
  
  return coords.map(([x, y]) => [x - minX, y - minY]);
};

// Get piece coordinates with rotation and flip applied
export const getPieceCoords = (pieceType, rotation = 0, flipped = false) => {
  let coords = pieces[pieceType];
  if (!coords) {
    console.error('getPieceCoords: Unknown piece type', pieceType);
    return [];
  }
  coords = [...coords.map(c => [...c])];
  
  if (flipped) coords = flipPiece(coords);
  
  const rotationCount = rotation >= 90 ? Math.floor(rotation / 90) : rotation;
  for (let i = 0; i < rotationCount; i++) {
    coords = rotatePiece(coords);
  }
  
  coords = normalizePieceCoords(coords);
  
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

// Check if piece overlaps with existing pieces on the board
export const hasOverlap = (board, row, col, pieceCoords) => {
  for (const [dx, dy] of pieceCoords) {
    const newRow = row + dy;
    const newCol = col + dx;
    if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
      const cell = board[newRow]?.[newCol];
      if (cell !== null && cell !== 0 && cell !== undefined) {
        return true;
      }
    }
  }
  return false;
};

// Check if any piece can be placed on the board
export const canAnyPieceBePlaced = (board, usedPieces) => {
  if (!board || !Array.isArray(board)) {
    console.error('canAnyPieceBePlaced: Invalid board');
    return true;
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

export const checkOrientationFits = (row, col, piece, rotation, flipped) => {
  const coords = getPieceCoords(piece, rotation, flipped);
  if (isWithinBounds(row, col, coords)) {
    return { rotation, flipped };
  }
  return null;
};

export const findFittingOrientation = (row, col, piece, startRot, startFlip) => {
  return checkOrientationFits(row, col, piece, startRot, startFlip);
};

export const createEmptyBoard = () => 
  Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));

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

export default {
  BOARD_SIZE,
  rotatePiece,
  flipPiece,
  getPieceCoords,
  canPlacePiece,
  isWithinBounds,
  hasOverlap,
  canAnyPieceBePlaced,
  checkOrientationFits,
  findFittingOrientation,
  createEmptyBoard,
  placePiece,
};
