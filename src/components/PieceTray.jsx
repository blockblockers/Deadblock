import { pieces, pieceColors } from '../utils/pieces';

// Render a mini piece preview with cyberpunk styling
const MiniPiece = ({ name, coords }) => {
  // Safety check for coords
  if (!coords || !Array.isArray(coords) || coords.length === 0) {
    return null;
  }
  
  const minX = Math.min(...coords.map(([x]) => x));
  const maxX = Math.max(...coords.map(([x]) => x));
  const minY = Math.min(...coords.map(([, y]) => y));
  const maxY = Math.max(...coords.map(([, y]) => y));
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  return (
    <div className="inline-flex flex-col gap-0.5">
      {Array(height).fill().map((_, row) => (
        <div key={row} className="flex gap-0.5">
          {Array(width).fill().map((_, col) => {
            const isFilled = coords.some(([x, y]) => x === col + minX && y === row + minY);
            return (
              <div
                key={col}
                className={`w-2 h-2 sm:w-3 sm:h-3 rounded-sm relative overflow-hidden ${
                  isFilled ? pieceColors[name] : 'bg-transparent'
                }`}
              >
                {/* Mini scan line for filled cells */}
                {isFilled && (
                  <div className="absolute inset-0 opacity-30 bg-[repeating-linear-gradient(0deg,transparent,transparent_1px,rgba(255,255,255,0.2)_1px,rgba(255,255,255,0.2)_2px)]" />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const PieceTray = ({ 
  usedPieces = [], 
  selectedPiece, 
  pendingMove,
  gameOver,
  gameMode,
  currentPlayer,
  isMobile,
  isGeneratingPuzzle,
  onSelectPiece 
}) => {
  // Ensure usedPieces is always an array
  const safeUsedPieces = Array.isArray(usedPieces) ? usedPieces : [];
  
  const isDisabled = (pieceName) => 
    gameOver || 
    safeUsedPieces.includes(pieceName) || 
    ((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2) ||
    isGeneratingPuzzle;

  return (
    <div className={`bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-xl p-2 border border-cyan-500/30 shadow-[0_0_25px_rgba(34,211,238,0.15),inset_0_0_30px_rgba(0,0,0,0.3)] mt-2 ${isGeneratingPuzzle ? 'opacity-50' : ''}`}>
      {/* UPDATED: Piece grid moved to top */}
      <div className="grid grid-cols-6 gap-1.5">
        {pieces && Object.entries(pieces).map(([name, coords]) => {
          const isUsed = safeUsedPieces.includes(name);
          const isSelected = selectedPiece === name;
          
          return (
            <button
              key={name}
              onClick={() => !isUsed && !isGeneratingPuzzle && onSelectPiece(name)}
              className={`p-1.5 rounded-lg transition-all flex items-center justify-center relative overflow-hidden ${
                isUsed
                  ? 'bg-slate-800/30 opacity-25 cursor-not-allowed border border-slate-700/30'
                  : isSelected
                    ? 'bg-slate-700/80 ring-2 ring-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.7),inset_0_0_15px_rgba(34,211,238,0.2)] border border-cyan-400/50'
                    : 'bg-slate-800/60 hover:bg-slate-700/70 border border-cyan-500/20 hover:border-cyan-500/40 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)]'
              }`}
              disabled={isDisabled(name)}
            >
              {/* Selection glow effect */}
              {isSelected && (
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-transparent pointer-events-none" />
              )}
              <MiniPiece name={name} coords={coords} />
            </button>
          );
        })}
      </div>
      
      {/* UPDATED: Counter moved below the pieces grid */}
      <div className="text-xs font-semibold text-cyan-300/80 text-center mt-2 tracking-widest relative">
        <span className="relative z-10">PIECES: {safeUsedPieces.length}/12 USED</span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent" />
      </div>
    </div>
  );
};

export default PieceTray;
