import { memo } from 'react';
import { PIECE_NAMES, getPieceCoords, PIECE_COLORS } from '../utils/gameLogic';
import { soundManager } from '../utils/soundManager';

// Memoized piece display component
const PieceDisplay = memo(({ piece, size = 'normal', isSelected, isUsed, onClick }) => {
  const baseCoords = getPieceCoords(piece, 0, false);
  const cellSize = size === 'small' ? 6 : size === 'tiny' ? 4 : 8;
  const gapSize = 1;
  
  // Calculate grid bounds
  const minRow = Math.min(...baseCoords.map(([r]) => r));
  const maxRow = Math.max(...baseCoords.map(([r]) => r));
  const minCol = Math.min(...baseCoords.map(([, c]) => c));
  const maxCol = Math.max(...baseCoords.map(([, c]) => c));
  
  const rows = maxRow - minRow + 1;
  const cols = maxCol - minCol + 1;
  
  // Normalize coordinates
  const normalizedCoords = baseCoords.map(([r, c]) => [r - minRow, c - minCol]);
  
  const gridWidth = cols * cellSize + (cols - 1) * gapSize;
  const gridHeight = rows * cellSize + (rows - 1) * gapSize;
  
  const colors = PIECE_COLORS[piece] || { bg: 'bg-gray-500', glow: 'rgba(128,128,128,0.5)' };
  
  return (
    <button
      onClick={onClick}
      disabled={isUsed}
      className={`
        relative p-2 rounded-lg transition-all duration-200 touch-manipulation
        ${isUsed 
          ? 'opacity-30 cursor-not-allowed' 
          : isSelected 
            ? 'ring-2 ring-white scale-110 shadow-[0_0_20px_rgba(255,255,255,0.5)]' 
            : 'hover:scale-105 active:scale-95'
        }
      `}
      style={{
        background: isSelected 
          ? 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.1))' 
          : 'rgba(30, 41, 59, 0.8)',
        minWidth: `${gridWidth + 16}px`,
      }}
    >
      <div 
        className="relative"
        style={{ 
          width: gridWidth, 
          height: gridHeight,
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
          gap: `${gapSize}px`,
        }}
      >
        {Array.from({ length: rows * cols }).map((_, idx) => {
          const row = Math.floor(idx / cols);
          const col = idx % cols;
          const isFilled = normalizedCoords.some(([r, c]) => r === row && c === col);
          
          return (
            <div
              key={idx}
              className={`rounded-sm ${isFilled ? colors.bg : 'bg-transparent'}`}
              style={{
                boxShadow: isFilled ? `0 0 ${cellSize}px ${colors.glow}` : 'none',
              }}
            />
          );
        })}
      </div>
      
      {/* Piece label */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-slate-400 font-bold">
        {piece}
      </div>
    </button>
  );
});

PieceDisplay.displayName = 'PieceDisplay';

const PieceTray = ({
  usedPieces,
  selectedPiece,
  pendingMove,
  gameOver,
  gameMode,
  currentPlayer,
  isMobile,
  isGeneratingPuzzle,
  onSelectPiece
}) => {
  const handlePieceSelect = (piece) => {
    if (usedPieces[piece] || gameOver || (gameMode === 'ai' && currentPlayer === 2) || isGeneratingPuzzle) {
      return;
    }
    soundManager.playClickSound('select');
    onSelectPiece(piece);
  };

  const isDisabled = gameOver || (gameMode === 'ai' && currentPlayer === 2) || isGeneratingPuzzle;

  return (
    <div className="w-full">
      {/* Label */}
      <div className="text-center mb-2">
        <span className="text-cyan-300/70 text-xs tracking-wider">
          {pendingMove ? 'PLACING PIECE' : 'SELECT A PIECE'}
        </span>
      </div>
      
      {/* Scrollable piece container */}
      <div 
        className="piece-tray-scroll"
        style={{
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorX: 'contain',
          touchAction: 'pan-x',
          scrollBehavior: 'smooth',
          // Hide scrollbar
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}
      >
        <div 
          className="flex gap-2 px-2 py-2"
          style={{
            minWidth: 'max-content',
            paddingRight: 'max(0.5rem, env(safe-area-inset-right, 0))',
            paddingLeft: 'max(0.5rem, env(safe-area-inset-left, 0))',
          }}
        >
          {PIECE_NAMES.map((piece) => (
            <PieceDisplay
              key={piece}
              piece={piece}
              size={isMobile ? 'small' : 'normal'}
              isSelected={selectedPiece === piece && !pendingMove}
              isUsed={usedPieces[piece]}
              onClick={() => handlePieceSelect(piece)}
            />
          ))}
        </div>
      </div>
      
      {/* Scroll hint for mobile */}
      {isMobile && (
        <div className="text-center mt-1">
          <span className="text-slate-500 text-[10px]">← swipe to see more →</span>
        </div>
      )}
    </div>
  );
};

export default memo(PieceTray);
