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

// Neon color theme for pieces - Enhanced Cyberpunk Style
// Each piece has: gradient background, outer neon glow, inner highlight, and border accent
export const pieceColors = {
  // F - Hot Pink / Magenta - "Neon Sign" style
  F: 'bg-gradient-to-br from-pink-300 via-pink-500 to-pink-700 shadow-[0_0_20px_rgba(236,72,153,0.8),0_0_40px_rgba(236,72,153,0.4),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-1px_1px_rgba(0,0,0,0.3)] border border-pink-300/50',
  
  // I - Electric Cyan - "Power Core" style
  I: 'bg-gradient-to-br from-cyan-300 via-cyan-500 to-cyan-700 shadow-[0_0_20px_rgba(34,211,238,0.8),0_0_40px_rgba(34,211,238,0.4),inset_0_1px_1px_rgba(255,255,255,0.5),inset_0_-1px_1px_rgba(0,0,0,0.3)] border border-cyan-300/50',
  
  // L - Plasma Orange - "Warning Light" style
  L: 'bg-gradient-to-br from-orange-300 via-orange-500 to-orange-700 shadow-[0_0_20px_rgba(251,146,60,0.8),0_0_40px_rgba(251,146,60,0.4),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-1px_1px_rgba(0,0,0,0.3)] border border-orange-300/50',
  
  // N - Holographic Blue - "Data Stream" style
  N: 'bg-gradient-to-br from-blue-300 via-blue-500 to-blue-700 shadow-[0_0_20px_rgba(96,165,250,0.8),0_0_40px_rgba(96,165,250,0.4),inset_0_1px_1px_rgba(255,255,255,0.5),inset_0_-1px_1px_rgba(0,0,0,0.3)] border border-blue-300/50',
  
  // P - Ultraviolet Purple - "Synthwave" style
  P: 'bg-gradient-to-br from-purple-300 via-purple-500 to-purple-700 shadow-[0_0_20px_rgba(192,132,252,0.8),0_0_40px_rgba(192,132,252,0.4),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-1px_1px_rgba(0,0,0,0.3)] border border-purple-300/50',
  
  // T - Chrome Silver - "Metal Plate" style
  T: 'bg-gradient-to-br from-slate-200 via-slate-400 to-slate-600 shadow-[0_0_15px_rgba(148,163,184,0.6),0_0_30px_rgba(148,163,184,0.3),inset_0_2px_2px_rgba(255,255,255,0.6),inset_0_-2px_2px_rgba(0,0,0,0.2)] border border-slate-200/60',
  
  // U - Neon Yellow - "Hazard Light" style  
  U: 'bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 shadow-[0_0_20px_rgba(253,224,71,0.8),0_0_40px_rgba(253,224,71,0.4),inset_0_1px_1px_rgba(255,255,255,0.5),inset_0_-1px_1px_rgba(0,0,0,0.2)] border border-yellow-200/50',
  
  // V - Matrix Emerald - "Terminal Green" style
  V: 'bg-gradient-to-br from-emerald-300 via-emerald-500 to-emerald-700 shadow-[0_0_20px_rgba(52,211,153,0.8),0_0_40px_rgba(52,211,153,0.4),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-1px_1px_rgba(0,0,0,0.3)] border border-emerald-300/50',
  
  // W - Laser Rose - "Combat Mode" style
  W: 'bg-gradient-to-br from-rose-300 via-rose-500 to-rose-700 shadow-[0_0_20px_rgba(251,113,133,0.8),0_0_40px_rgba(251,113,133,0.4),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-1px_1px_rgba(0,0,0,0.3)] border border-rose-300/50',
  
  // X - Pure White - "Overload" style with rainbow edge glow
  X: 'bg-gradient-to-br from-white via-gray-100 to-gray-300 shadow-[0_0_20px_rgba(255,255,255,0.9),0_0_40px_rgba(255,255,255,0.5),0_0_60px_rgba(200,200,255,0.3),inset_0_2px_2px_rgba(255,255,255,0.8),inset_0_-2px_2px_rgba(0,0,0,0.1)] border border-white/70',
  
  // Y - Deep Indigo - "Night Circuit" style
  Y: 'bg-gradient-to-br from-indigo-300 via-indigo-500 to-indigo-700 shadow-[0_0_20px_rgba(129,140,248,0.8),0_0_40px_rgba(129,140,248,0.4),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-1px_1px_rgba(0,0,0,0.3)] border border-indigo-300/50',
  
  // Z - Electric Fuchsia - "Glitch" style
  Z: 'bg-gradient-to-br from-fuchsia-300 via-fuchsia-500 to-fuchsia-700 shadow-[0_0_20px_rgba(232,121,249,0.8),0_0_40px_rgba(232,121,249,0.4),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-1px_1px_rgba(0,0,0,0.3)] border border-fuchsia-300/50'
};

// Polyomino shapes for menu buttons
export const menuButtonShapes = {
  T: [[1,0],[0,1],[1,1],[2,1]],
  L: [[0,0],[0,1],[0,2],[1,2]],
  Z: [[0,0],[1,0],[1,1],[2,1]],
  P: [[0,0],[1,0],[0,1],[1,1],[0,2]]
};
