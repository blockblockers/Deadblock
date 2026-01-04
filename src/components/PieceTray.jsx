// PieceTray.jsx - Piece selection tray with drag-and-drop support
// UPDATED: Added drag handlers for dragging pieces to the board
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

/**
 * PieceTray Component
 * 
 * @param {Object} props
 * @param {Array} props.usedPieces - Array of piece names that have been used
 * @param {string} props.selectedPiece - Currently selected piece name
 * @param {Object} props.pendingMove - Current pending move (if any)
 * @param {boolean} props.gameOver - Whether the game is over
 * @param {string} props.gameMode - Current game mode ('2player', 'ai', 'puzzle', 'online')
 * @param {number} props.currentPlayer - Current player number
 * @param {boolean} props.isMobile - Whether on mobile device
 * @param {boolean} props.isGeneratingPuzzle - Whether puzzle is being generated
 * @param {Function} props.onSelectPiece - Callback when piece is selected/tapped
 * @param {Function} props.createDragHandlers - Function to create drag handlers (from useDragAndDrop)
 * @param {boolean} props.isDragging - Whether a drag is in progress
 * @param {string} props.draggedPiece - Name of piece being dragged
 */
const PieceTray = ({ 
  usedPieces = [], 
  selectedPiece, 
  pendingMove,
  gameOver,
  gameMode,
  currentPlayer,
  isMobile,
  isGeneratingPuzzle,
  onSelectPiece,
  // Drag-and-drop props (optional)
  createDragHandlers,
  isDragging,
  draggedPiece,
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
      {/* Piece grid */}
      <div className="grid grid-cols-6 gap-1.5">
        {pieces && Object.entries(pieces).map(([name, coords]) => {
          const isUsed = safeUsedPieces.includes(name);
          const isSelected = selectedPiece === name;
          const isBeingDragged = isDragging && draggedPiece === name;
          
          // Get drag handlers if available
          const dragHandlers = createDragHandlers ? createDragHandlers(name) : {};
          
          return (
            <button
              key={name}
              onClick={() => !isUsed && !isGeneratingPuzzle && !isDragging && onSelectPiece(name)}
              {...dragHandlers}
              className={`p-1.5 rounded-lg transition-all flex items-center justify-center relative overflow-hidden ${
                isUsed
                  ? 'bg-slate-800/30 opacity-25 cursor-not-allowed border border-slate-700/30'
                  : isBeingDragged
                    ? 'bg-slate-700/50 ring-2 ring-cyan-400/50 opacity-50 border border-cyan-500/30'
                    : isSelected
                      ? 'bg-slate-700/80 ring-2 ring-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.7),inset_0_0_15px_rgba(34,211,238,0.2)] border border-cyan-400/50'
                      : 'bg-slate-800/60 hover:bg-slate-700/70 border border-cyan-500/20 hover:border-cyan-500/40 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)]'
              }`}
              disabled={isDisabled(name)}
              style={{
                // Prevent text selection during drag
                WebkitUserSelect: 'none',
                userSelect: 'none',
                // Prevent context menu on long press
                WebkitTouchCallout: 'none',
                // CRITICAL: Prevent browser from intercepting touch for scroll
                touchAction: 'none',
              }}
            >
              {/* Selection glow effect */}
              {isSelected && !isBeingDragged && (
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-transparent pointer-events-none" />
              )}
              
              {/* Drag indicator */}
              {isBeingDragged && (
                <div className="absolute inset-0 bg-cyan-400/10 pointer-events-none animate-pulse" />
              )}
              
              <MiniPiece name={name} coords={coords} />
            </button>
          );
        })}
      </div>
      
      {/* Counter */}
      <div className="text-xs font-semibold text-cyan-300/80 text-center mt-2 tracking-widest relative">
        <span className="relative z-10">PIECES: {safeUsedPieces.length}/12 USED</span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent" />
      </div>
      
      {/* Drag hint - moved to bottom so pieces are visible during placement */}
      {!gameOver && !isGeneratingPuzzle && (
        <div className="text-[10px] text-cyan-400/60 text-center mt-1 font-medium tracking-wide">
          TAP TO SELECT • DRAG TO PLACE
        </div>
      )}
    </div>
  );
};

export default PieceTray;
