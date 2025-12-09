// PieceTray component with safe null checks
import { memo, useMemo } from 'react';
import { pieces } from '../utils/pieces';

// Player colors
const PLAYER_COLORS = {
  1: {
    selected: 'ring-2 ring-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]',
    available: 'bg-cyan-500/80 border-cyan-400',
    used: 'bg-slate-700/30 border-slate-600/30',
  },
  2: {
    selected: 'ring-2 ring-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.5)]',
    available: 'bg-pink-500/80 border-pink-400',
    used: 'bg-slate-700/30 border-slate-600/30',
  },
};

// Mini piece preview component
const PiecePreview = ({ pieceType, isUsed, isSelected, player, onClick }) => {
  const piece = pieces?.[pieceType];
  if (!piece) return null;
  
  const coords = piece.coords || [];
  const colors = PLAYER_COLORS[player] || PLAYER_COLORS[1];
  
  // Calculate bounds
  const minRow = Math.min(...coords.map(([r]) => r));
  const maxRow = Math.max(...coords.map(([r]) => r));
  const minCol = Math.min(...coords.map(([, c]) => c));
  const maxCol = Math.max(...coords.map(([, c]) => c));
  
  const rows = maxRow - minRow + 1;
  const cols = maxCol - minCol + 1;
  
  // Normalize coordinates
  const normalizedCoords = coords.map(([r, c]) => [r - minRow, c - minCol]);
  const coordSet = new Set(normalizedCoords.map(([r, c]) => `${r},${c}`));
  
  return (
    <button
      onClick={() => !isUsed && onClick?.(pieceType)}
      disabled={isUsed}
      className={`
        p-1.5 rounded-lg border transition-all
        ${isUsed 
          ? 'opacity-30 cursor-not-allowed border-slate-600/30' 
          : `cursor-pointer hover:scale-105 border-slate-600 ${isSelected ? colors.selected : ''}`
        }
        ${isSelected ? 'bg-slate-700/80' : 'bg-slate-800/60'}
      `}
      title={pieceType}
    >
      <div
        className="grid gap-px"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: rows }).map((_, rowIndex) => (
          Array.from({ length: cols }).map((_, colIndex) => {
            const isFilled = coordSet.has(`${rowIndex},${colIndex}`);
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`
                  w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-sm
                  ${isFilled 
                    ? (isUsed ? colors.used : colors.available)
                    : 'bg-transparent'
                  }
                `}
              />
            );
          })
        ))}
      </div>
    </button>
  );
};

const PieceTray = ({
  usedPieces = [],
  selectedPiece,
  pendingMove,
  gameOver = false,
  gameMode = 'ai',
  currentPlayer = 1,
  isMobile = false,
  onSelectPiece,
}) => {
  // Ensure usedPieces is always an array
  const safeUsedPieces = useMemo(() => {
    return Array.isArray(usedPieces) ? usedPieces : [];
  }, [usedPieces]);

  // Get piece types
  const pieceTypes = useMemo(() => {
    return pieces ? Object.keys(pieces) : [];
  }, []);

  // Determine which player's pieces to show based on game mode
  const player = gameMode === 'online' ? currentPlayer : currentPlayer;

  if (pieceTypes.length === 0) {
    return (
      <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/50">
        <p className="text-slate-500 text-sm text-center">No pieces available</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-3 border border-slate-700/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-400 text-xs font-medium">
          PIECES ({pieceTypes.length - safeUsedPieces.length} remaining)
        </span>
        {selectedPiece && (
          <span className="text-cyan-400 text-xs">
            Selected: {selectedPiece}
          </span>
        )}
      </div>
      
      <div className={`
        grid gap-2
        ${isMobile 
          ? 'grid-cols-6 sm:grid-cols-7' 
          : 'grid-cols-4 sm:grid-cols-6 md:grid-cols-7'
        }
      `}>
        {pieceTypes.map(pieceType => (
          <PiecePreview
            key={pieceType}
            pieceType={pieceType}
            isUsed={safeUsedPieces.includes(pieceType)}
            isSelected={selectedPiece === pieceType}
            player={player}
            onClick={gameOver ? undefined : onSelectPiece}
          />
        ))}
      </div>
    </div>
  );
};

export default memo(PieceTray);
