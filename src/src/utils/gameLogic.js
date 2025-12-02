import { pieces } from './pieces';

export const BOARD_SIZE = 8;

// Rotate piece 90 degrees clockwise
export const rotatePiece = (coords) => coords.map(([x, y]) => [-y, x]);

// Flip piece horizontally
export const flipPiece = (coords) => coords.map(([x, y]) => [-x, y]);

// Get piece coordinates with rotation and flip applied
export const getPieceCoords = (pieceType, rotation = 0, flipped = false) => {
  let coords = pieces[pieceType];
  if (flipped) coords = flipPiece(coords);
  for (let i = 0; i < rotation; i++) coords = rotatePiece(coords);
  return coords;
};

// Check if a piece can be placed at the given position
export const canPlacePiece = (board, row, col, pieceCoords) => {
  for (const [dx, dy] of pieceCoords) {
    const newRow = row + dy;
    const newCol = col + dx;
    if (newRow < 0 || newRow >= BOARD_SIZE || newCol < 0 || newCol >= BOARD_SIZE) {
      return false;
    }
    if (board[newRow][newCol] !== null) {
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
  for (const pieceType of Object.keys(pieces)) {
    if (usedPieces.includes(pieceType)) continue;
    for (let flip = 0; flip < 2; flip++) {
      for (let rot = 0; rot < 4; rot++) {
        const coords = getPieceCoords(pieceType, rot, flip === 1);
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

// Find a rotation/flip that fits the piece on the board at the given position
export const findFittingOrientation = (row, col, piece, startRot, startFlip) => {
  // First try current orientation
  let coords = getPieceCoords(piece, startRot, startFlip);
  if (isWithinBounds(row, col, coords)) {
    return { rotation: startRot, flipped: startFlip };
  }
  
  // Try all orientations to find one that fits
  for (let flip = 0; flip < 2; flip++) {
    for (let rot = 0; rot < 4; rot++) {
      coords = getPieceCoords(piece, rot, flip === 1);
      if (isWithinBounds(row, col, coords)) {
        return { rotation: rot, flipped: flip === 1 };
      }
    }
  }
  return null;
};

// Create an empty board
export const createEmptyBoard = () => 
  Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null));

// Place a piece on the board and return new board state
export const placePiece = (board, boardPieces, row, col, piece, pieceCoords, player) => {
  const newBoard = board.map(r => [...r]);
  const newBoardPieces = boardPieces.map(r => [...r]);
  
  for (const [dx, dy] of pieceCoords) {
    newBoard[row + dy][col + dx] = player;
    newBoardPieces[row + dy][col + dx] = piece;
  }
  
  return { newBoard, newBoardPieces };
};