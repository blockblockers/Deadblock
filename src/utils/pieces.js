// Pentomino piece definitions - coordinates for each shape
export const pieces = {
  F: [[0, 0], [0, 1], [1, 1], [2, 1], [1, 2]],
  I: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
  L: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]],
  N: [[0, 1], [0, 2], [0, 3], [1, 0], [1, 1]],
  P: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]],
  T: [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]],
  U: [[0, 0], [0, 1], [1, 1], [2, 0], [2, 1]],
  V: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]],
  W: [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2]],
  X: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]],
  Y: [[0, 1], [1, 0], [1, 1], [1, 2], [1, 3]],
  Z: [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2]]
};

// Neon color theme for pieces
export const pieceColors = {
  F: 'bg-gradient-to-br from-pink-400 via-pink-500 to-pink-600 shadow-[0_0_15px_rgba(236,72,153,0.7)]',
  I: 'bg-gradient-to-br from-cyan-400 via-cyan-500 to-cyan-600 shadow-[0_0_15px_rgba(34,211,238,0.7)]',
  L: 'bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 shadow-[0_0_15px_rgba(251,146,60,0.7)]',
  N: 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 shadow-[0_0_15px_rgba(96,165,250,0.7)]',
  P: 'bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 shadow-[0_0_15px_rgba(192,132,252,0.7)]',
  T: 'bg-gradient-to-br from-red-400 via-red-500 to-red-600 shadow-[0_0_15px_rgba(248,113,113,0.7)]',
  U: 'bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 shadow-[0_0_15px_rgba(253,224,71,0.7)]',
  V: 'bg-gradient-to-br from-green-400 via-green-500 to-green-600 shadow-[0_0_15px_rgba(74,222,128,0.7)]',
  W: 'bg-gradient-to-br from-rose-400 via-rose-500 to-rose-600 shadow-[0_0_15px_rgba(251,113,133,0.7)]',
  X: 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 shadow-[0_0_15px_rgba(251,191,36,0.7)]',
  Y: 'bg-gradient-to-br from-lime-400 via-lime-500 to-lime-600 shadow-[0_0_15px_rgba(163,230,53,0.7)]',
  Z: 'bg-gradient-to-br from-teal-400 via-teal-500 to-teal-600 shadow-[0_0_15px_rgba(45,212,191,0.7)]'
};

// Polyomino shapes for menu buttons
export const menuButtonShapes = {
  T: [[1,0],[0,1],[1,1],[2,1]],
  L: [[0,0],[0,1],[0,2],[1,2]],
  Z: [[0,0],[1,0],[1,1],[2,1]],
  P: [[0,0],[1,0],[0,1],[1,1],[0,2]]
};