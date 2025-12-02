// Puzzle definitions
// boardState: 64 character string representing 8x8 board
// 'G' = empty cell, other letters = piece type placed there
// 'H' is used as alias for 'Y' piece

export const puzzles = [
  {
    id: 1,
    name: "Endgame Position",
    difficulty: "3-move",
    description: "Find the winning move in this endgame position!",
    boardState: "GGGXGGGGGIXXXGNGGIGXGNNHGIUUUNHHGIUWUNGHGIWWFFGHGWWGGFFGGGGGGFGG",
    usedPieces: ['X', 'I', 'N', 'Y', 'U', 'W', 'F']
  }
  // Add more puzzles here:
  // {
  //   id: 2,
  //   name: "Corner Trap",
  //   difficulty: "1-move",
  //   description: "Block your opponent in the corner!",
  //   boardState: "...",
  //   usedPieces: [...]
  // }
];

// Parse a puzzle's board state into board arrays
export const parsePuzzleBoard = (puzzle, BOARD_SIZE = 8) => {
  if (puzzle.boardState.length !== 64) {
    throw new Error(`Invalid puzzle data for ${puzzle.name}`);
  }

  const board = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null));
  const boardPieces = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null));

  for (let i = 0; i < puzzle.boardState.length; i++) {
    const char = puzzle.boardState[i];
    if (char !== 'G') {
      const row = Math.floor(i / BOARD_SIZE);
      const col = i % BOARD_SIZE;
      board[row][col] = 1;
      boardPieces[row][col] = char === 'H' ? 'Y' : char;
    }
  }

  return { board, boardPieces };
};