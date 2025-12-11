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

// Neon color theme for pieces - Cyberpunk Style with enhanced glow
// Each piece has: gradient background, dual-layer glow, crisp inner highlights, sharp border
// Color palette: cyan, orange, blue, violet, gray, gold, emerald, red, white, amber, lime, magenta
export const pieceColors = {
  // F - Hot Magenta - "Neon Sign" style
  F: 'bg-gradient-to-br from-fuchsia-300 via-fuchsia-500 to-fuchsia-800 shadow-[0_0_12px_rgba(232,121,249,0.8),0_0_25px_rgba(232,121,249,0.4),inset_0_1px_2px_rgba(255,255,255,0.6),inset_0_-1px_2px_rgba(0,0,0,0.5)] border border-fuchsia-200/80 ring-1 ring-fuchsia-400/40',
  
  // I - Electric Cyan - "Power Core" style
  I: 'bg-gradient-to-br from-cyan-200 via-cyan-500 to-cyan-800 shadow-[0_0_15px_rgba(34,211,238,0.9),0_0_30px_rgba(34,211,238,0.4),inset_0_1px_2px_rgba(255,255,255,0.7),inset_0_-1px_2px_rgba(0,0,0,0.4)] border border-cyan-200/80 ring-1 ring-cyan-300/50',
  
  // L - Plasma Orange - "Warning Light" style
  L: 'bg-gradient-to-br from-orange-200 via-orange-500 to-orange-800 shadow-[0_0_12px_rgba(251,146,60,0.8),0_0_25px_rgba(251,146,60,0.4),inset_0_1px_2px_rgba(255,255,255,0.6),inset_0_-1px_2px_rgba(0,0,0,0.5)] border border-orange-200/80 ring-1 ring-orange-400/40',
  
  // N - Holographic Blue - "Data Stream" style
  N: 'bg-gradient-to-br from-blue-200 via-blue-500 to-blue-800 shadow-[0_0_12px_rgba(59,130,246,0.8),0_0_25px_rgba(59,130,246,0.4),inset_0_1px_2px_rgba(255,255,255,0.6),inset_0_-1px_2px_rgba(0,0,0,0.5)] border border-blue-200/80 ring-1 ring-blue-400/40',
  
  // P - Deep Violet - "Synthwave" style
  P: 'bg-gradient-to-br from-violet-300 via-violet-600 to-violet-900 shadow-[0_0_12px_rgba(139,92,246,0.8),0_0_25px_rgba(139,92,246,0.4),inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-1px_2px_rgba(0,0,0,0.6)] border border-violet-200/80 ring-1 ring-violet-400/40',
  
  // T - Chrome Silver - "Metal Plate" style
  T: 'bg-gradient-to-br from-slate-100 via-slate-400 to-slate-700 shadow-[0_0_10px_rgba(148,163,184,0.6),0_0_20px_rgba(148,163,184,0.3),inset_0_2px_3px_rgba(255,255,255,0.8),inset_0_-2px_3px_rgba(0,0,0,0.4)] border border-slate-100/90 ring-1 ring-slate-300/50',
  
  // U - Neon Yellow - "Hazard Light" style  
  U: 'bg-gradient-to-br from-yellow-100 via-yellow-400 to-yellow-700 shadow-[0_0_15px_rgba(253,224,71,0.9),0_0_30px_rgba(253,224,71,0.4),inset_0_1px_2px_rgba(255,255,255,0.7),inset_0_-1px_2px_rgba(0,0,0,0.3)] border border-yellow-100/80 ring-1 ring-yellow-300/50',
  
  // V - Matrix Emerald - "Terminal Green" style
  V: 'bg-gradient-to-br from-emerald-200 via-emerald-500 to-emerald-800 shadow-[0_0_12px_rgba(52,211,153,0.8),0_0_25px_rgba(52,211,153,0.4),inset_0_1px_2px_rgba(255,255,255,0.6),inset_0_-1px_2px_rgba(0,0,0,0.5)] border border-emerald-200/80 ring-1 ring-emerald-400/40',
  
  // W - Scarlet Red - "Combat Mode" style (warm red, distinct from magenta)
  W: 'bg-gradient-to-br from-red-200 via-red-500 to-red-800 shadow-[0_0_12px_rgba(239,68,68,0.8),0_0_25px_rgba(239,68,68,0.4),inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-1px_2px_rgba(0,0,0,0.6)] border border-red-200/80 ring-1 ring-red-400/40',
  
  // X - Pure White - "Overload" style with subtle glow
  X: 'bg-gradient-to-br from-white via-gray-100 to-gray-300 shadow-[0_0_8px_rgba(255,255,255,0.6),0_0_14px_rgba(200,200,220,0.25),inset_0_2px_3px_rgba(255,255,255,1),inset_0_-2px_3px_rgba(100,100,120,0.2)] border border-gray-200/80 ring-1 ring-white/40',
  
  // Y - Super Electric Pink - "Laser Beam" style (hot pink neon)
  Y: 'bg-gradient-to-br from-pink-200 via-pink-500 to-rose-700 shadow-[0_0_15px_rgba(236,72,153,0.9),0_0_30px_rgba(244,114,182,0.5),inset_0_1px_2px_rgba(255,255,255,0.7),inset_0_-1px_2px_rgba(0,0,0,0.4)] border border-pink-200/80 ring-1 ring-pink-400/50',
  
  // Z - Electric Lime - "Glitch" style (bright green, completely distinct from pink/purple)
  Z: 'bg-gradient-to-br from-lime-200 via-lime-500 to-lime-700 shadow-[0_0_15px_rgba(163,230,53,0.9),0_0_30px_rgba(163,230,53,0.4),inset_0_1px_2px_rgba(255,255,255,0.7),inset_0_-1px_2px_rgba(0,0,0,0.3)] border border-lime-100/80 ring-1 ring-lime-400/50'
};

// Polyomino shapes for menu buttons
export const menuButtonShapes = {
  T: [[1,0],[0,1],[1,1],[2,1]],
  L: [[0,0],[0,1],[0,2],[1,2]],
  Z: [[0,0],[1,0],[1,1],[2,1]],
  P: [[0,0],[1,0],[0,1],[1,1],[0,2]]
};
