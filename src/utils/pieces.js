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

// Neon color theme for pieces - Cyberpunk Style with subtle glow
// Each piece has: gradient background, subtle glow, inner highlights, border accent
// Color palette: cyan, orange, blue, violet, gray, gold, emerald, red, white, amber, lime, magenta
export const pieceColors = {
  // F - Hot Magenta - "Neon Sign" style
  F: 'bg-gradient-to-br from-fuchsia-300 via-fuchsia-500 to-fuchsia-800 shadow-[0_0_8px_rgba(232,121,249,0.6),inset_0_2px_3px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.4)] border-2 border-fuchsia-300/60',
  
  // I - Electric Cyan - "Power Core" style
  I: 'bg-gradient-to-br from-cyan-200 via-cyan-500 to-cyan-800 shadow-[0_0_10px_rgba(34,211,238,0.6),inset_0_2px_3px_rgba(255,255,255,0.6),inset_0_-2px_3px_rgba(0,0,0,0.4)] border-2 border-cyan-200/60',
  
  // L - Plasma Orange - "Warning Light" style
  L: 'bg-gradient-to-br from-orange-200 via-orange-500 to-orange-800 shadow-[0_0_8px_rgba(251,146,60,0.6),inset_0_2px_3px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.4)] border-2 border-orange-200/60',
  
  // N - Holographic Blue - "Data Stream" style
  N: 'bg-gradient-to-br from-blue-200 via-blue-500 to-blue-800 shadow-[0_0_8px_rgba(59,130,246,0.6),inset_0_2px_3px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.4)] border-2 border-blue-200/60',
  
  // P - Deep Violet - "Synthwave" style
  P: 'bg-gradient-to-br from-violet-300 via-violet-600 to-violet-900 shadow-[0_0_8px_rgba(139,92,246,0.6),inset_0_2px_3px_rgba(255,255,255,0.4),inset_0_-2px_3px_rgba(0,0,0,0.5)] border-2 border-violet-300/60',
  
  // T - Chrome Silver - "Metal Plate" style
  T: 'bg-gradient-to-br from-slate-100 via-slate-400 to-slate-700 shadow-[0_0_6px_rgba(148,163,184,0.5),inset_0_3px_4px_rgba(255,255,255,0.7),inset_0_-3px_4px_rgba(0,0,0,0.3)] border-2 border-slate-100/70',
  
  // U - Neon Yellow - "Hazard Light" style  
  U: 'bg-gradient-to-br from-yellow-100 via-yellow-400 to-yellow-700 shadow-[0_0_10px_rgba(253,224,71,0.6),inset_0_2px_3px_rgba(255,255,255,0.6),inset_0_-2px_3px_rgba(0,0,0,0.3)] border-2 border-yellow-100/60',
  
  // V - Matrix Emerald - "Terminal Green" style
  V: 'bg-gradient-to-br from-emerald-200 via-emerald-500 to-emerald-800 shadow-[0_0_8px_rgba(52,211,153,0.6),inset_0_2px_3px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.4)] border-2 border-emerald-200/60',
  
  // W - Scarlet Red - "Combat Mode" style (warm red, distinct from magenta)
  W: 'bg-gradient-to-br from-red-200 via-red-500 to-red-800 shadow-[0_0_8px_rgba(239,68,68,0.6),inset_0_2px_3px_rgba(255,255,255,0.4),inset_0_-2px_3px_rgba(0,0,0,0.5)] border-2 border-red-200/60',
  
  // X - Pure White - "Overload" style with prismatic edge glow
  X: 'bg-gradient-to-br from-white via-gray-50 to-gray-300 shadow-[0_0_12px_rgba(255,255,255,0.7),inset_0_3px_4px_rgba(255,255,255,0.9),inset_0_-3px_4px_rgba(0,0,0,0.15)] border-2 border-white/80',
  
  // Y - Rich Gold - "Treasure" style (distinct from yellow)
  Y: 'bg-gradient-to-br from-amber-200 via-amber-500 to-amber-800 shadow-[0_0_8px_rgba(217,119,6,0.6),inset_0_2px_3px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.4)] border-2 border-amber-300/60',
  
  // Z - Electric Lime - "Glitch" style (bright green, completely distinct from pink/purple)
  Z: 'bg-gradient-to-br from-lime-200 via-lime-500 to-lime-700 shadow-[0_0_10px_rgba(163,230,53,0.6),inset_0_2px_3px_rgba(255,255,255,0.6),inset_0_-2px_3px_rgba(0,0,0,0.3)] border-2 border-lime-200/60'
};

// Polyomino shapes for menu buttons
export const menuButtonShapes = {
  T: [[1,0],[0,1],[1,1],[2,1]],
  L: [[0,0],[0,1],[0,2],[1,2]],
  Z: [[0,0],[1,0],[1,1],[2,1]],
  P: [[0,0],[1,0],[0,1],[1,1],[0,2]]
};
