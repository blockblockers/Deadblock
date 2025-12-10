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
// Each piece has: gradient background, multi-layer neon glow, inner highlights, border accent, and dramatic effects
// Color palette designed for maximum distinction: cyan, orange, blue, violet, gray, yellow, emerald, amber, white, indigo, lime, magenta
export const pieceColors = {
  // F - Hot Magenta - "Neon Sign" style
  F: 'bg-gradient-to-br from-fuchsia-300 via-fuchsia-500 to-fuchsia-800 shadow-[0_0_20px_rgba(232,121,249,0.9),0_0_40px_rgba(232,121,249,0.5),0_0_60px_rgba(232,121,249,0.25),inset_0_2px_3px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.4)] border-2 border-fuchsia-300/60 ring-1 ring-fuchsia-400/30',
  
  // I - Electric Cyan - "Power Core" style
  I: 'bg-gradient-to-br from-cyan-200 via-cyan-500 to-cyan-800 shadow-[0_0_25px_rgba(34,211,238,0.9),0_0_50px_rgba(34,211,238,0.5),0_0_75px_rgba(34,211,238,0.25),inset_0_2px_3px_rgba(255,255,255,0.6),inset_0_-2px_3px_rgba(0,0,0,0.4)] border-2 border-cyan-200/60 ring-1 ring-cyan-400/30',
  
  // L - Plasma Orange - "Warning Light" style
  L: 'bg-gradient-to-br from-orange-200 via-orange-500 to-orange-800 shadow-[0_0_20px_rgba(251,146,60,0.9),0_0_40px_rgba(251,146,60,0.5),0_0_60px_rgba(251,146,60,0.25),inset_0_2px_3px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.4)] border-2 border-orange-200/60 ring-1 ring-orange-400/30',
  
  // N - Holographic Blue - "Data Stream" style
  N: 'bg-gradient-to-br from-blue-200 via-blue-500 to-blue-800 shadow-[0_0_20px_rgba(59,130,246,0.9),0_0_40px_rgba(59,130,246,0.5),0_0_60px_rgba(59,130,246,0.25),inset_0_2px_3px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.4)] border-2 border-blue-200/60 ring-1 ring-blue-400/30',
  
  // P - Deep Violet - "Synthwave" style
  P: 'bg-gradient-to-br from-violet-300 via-violet-600 to-violet-900 shadow-[0_0_20px_rgba(139,92,246,0.9),0_0_40px_rgba(139,92,246,0.5),0_0_60px_rgba(139,92,246,0.25),inset_0_2px_3px_rgba(255,255,255,0.4),inset_0_-2px_3px_rgba(0,0,0,0.5)] border-2 border-violet-300/60 ring-1 ring-violet-400/30',
  
  // T - Chrome Silver - "Metal Plate" style
  T: 'bg-gradient-to-br from-slate-100 via-slate-400 to-slate-700 shadow-[0_0_15px_rgba(148,163,184,0.7),0_0_30px_rgba(148,163,184,0.4),0_0_45px_rgba(148,163,184,0.2),inset_0_3px_4px_rgba(255,255,255,0.7),inset_0_-3px_4px_rgba(0,0,0,0.3)] border-2 border-slate-100/70 ring-1 ring-slate-300/40',
  
  // U - Neon Yellow - "Hazard Light" style  
  U: 'bg-gradient-to-br from-yellow-100 via-yellow-400 to-yellow-700 shadow-[0_0_25px_rgba(253,224,71,0.9),0_0_50px_rgba(253,224,71,0.5),0_0_75px_rgba(253,224,71,0.25),inset_0_2px_3px_rgba(255,255,255,0.6),inset_0_-2px_3px_rgba(0,0,0,0.3)] border-2 border-yellow-100/60 ring-1 ring-yellow-300/40',
  
  // V - Matrix Emerald - "Terminal Green" style
  V: 'bg-gradient-to-br from-emerald-200 via-emerald-500 to-emerald-800 shadow-[0_0_20px_rgba(52,211,153,0.9),0_0_40px_rgba(52,211,153,0.5),0_0_60px_rgba(52,211,153,0.25),inset_0_2px_3px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.4)] border-2 border-emerald-200/60 ring-1 ring-emerald-400/30',
  
  // W - Scarlet Red - "Combat Mode" style (warm red, distinct from magenta)
  W: 'bg-gradient-to-br from-red-200 via-red-500 to-red-800 shadow-[0_0_20px_rgba(239,68,68,0.9),0_0_40px_rgba(239,68,68,0.5),0_0_60px_rgba(239,68,68,0.25),inset_0_2px_3px_rgba(255,255,255,0.4),inset_0_-2px_3px_rgba(0,0,0,0.5)] border-2 border-red-200/60 ring-1 ring-red-400/30',
  
  // X - Pure White - "Overload" style with prismatic edge glow
  X: 'bg-gradient-to-br from-white via-gray-50 to-gray-300 shadow-[0_0_25px_rgba(255,255,255,1),0_0_50px_rgba(255,255,255,0.6),0_0_75px_rgba(200,200,255,0.4),0_0_100px_rgba(255,200,255,0.2),inset_0_3px_4px_rgba(255,255,255,0.9),inset_0_-3px_4px_rgba(0,0,0,0.15)] border-2 border-white/80 ring-1 ring-white/50',
  
  // Y - Deep Indigo - "Night Circuit" style
  Y: 'bg-gradient-to-br from-indigo-200 via-indigo-500 to-indigo-800 shadow-[0_0_20px_rgba(99,102,241,0.9),0_0_40px_rgba(99,102,241,0.5),0_0_60px_rgba(99,102,241,0.25),inset_0_2px_3px_rgba(255,255,255,0.4),inset_0_-2px_3px_rgba(0,0,0,0.4)] border-2 border-indigo-200/60 ring-1 ring-indigo-400/30',
  
  // Z - Electric Lime - "Glitch" style (bright green, completely distinct from pink/purple)
  Z: 'bg-gradient-to-br from-lime-200 via-lime-500 to-lime-700 shadow-[0_0_25px_rgba(163,230,53,0.9),0_0_50px_rgba(163,230,53,0.5),0_0_75px_rgba(163,230,53,0.25),inset_0_2px_3px_rgba(255,255,255,0.6),inset_0_-2px_3px_rgba(0,0,0,0.3)] border-2 border-lime-200/60 ring-1 ring-lime-400/30'
};

// Polyomino shapes for menu buttons
export const menuButtonShapes = {
  T: [[1,0],[0,1],[1,1],[2,1]],
  L: [[0,0],[0,1],[0,2],[1,2]],
  Z: [[0,0],[1,0],[1,1],[2,1]],
  P: [[0,0],[1,0],[0,1],[1,1],[0,2]]
};
