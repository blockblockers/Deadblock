import { pieces, pieceColors } from '../utils/pieces';

// Render a mini piece preview
const MiniPiece = ({ name, coords }) => {
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
          {Array(width).fill().map((_, col) => (
            <div
              key={col}
              className={`w-2 h-2 sm:w-3 sm:h-3 rounded-sm ${
                coords.some(([x, y]) => x === col + minX && y === row + minY)
                  ? pieceColors[name]
                  : 'bg-transparent'
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

const PieceTray = ({ 
  usedPieces, 
  selectedPiece, 
  pendingMove,
  gameOver,
  gameMode,
  currentPlayer,
  isMobile,
  onSelectPiece 
}) => {
  const isDisabled = (pieceName) => 
    gameOver || 
    usedPieces.includes(pieceName) || 
    ((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2) ||
    (!!pendingMove && isMobile);

  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-xl p-2 border border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.2)] mt-2">
      <div className="text-xs font-semibold text-cyan-300/70 text-center mb-2 tracking-widest">
        PIECES: {usedPieces.length}/12 USED
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {Object.entries(pieces).map(([name, coords]) => {
          const isUsed = usedPieces.includes(name);
          const isSelected = selectedPiece === name;
          
          return (
            <button
              key={name}
              onClick={() => !isUsed && !pendingMove && onSelectPiece(name)}
              className={`p-1.5 rounded-lg transition-all flex items-center justify-center relative overflow-hidden ${
                isUsed
                  ? 'bg-slate-800/50 opacity-30 cursor-not-allowed'
                  : isSelected
                    ? 'bg-slate-700 ring-2 ring-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.6)]'
                    : 'bg-slate-800/80 hover:bg-slate-700/80 border border-cyan-500/20'
              }`}
              disabled={isDisabled(name)}
            >
              <MiniPiece name={name} coords={coords} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PieceTray;