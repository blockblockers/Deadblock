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
          // Extract style separately since it needs to be merged
          const { style: dragStyle, ...dragEvents } = dragHandlers;
          
          // Hold threshold in ms - shorter = faster drag start
          const HOLD_THRESHOLD = 100;
          let holdTimer = null;
          let touchStartPos = { x: 0, y: 0 };
          let cachedRect = null;
          let hasMoved = false;
          let dragStarted = false;
          
          const startDragFromTouch = (touchX, touchY) => {
            if (dragStarted) return;
            dragStarted = true;
            
            // Create a synthetic event-like object with the info the handler needs
            const syntheticEvent = {
              touches: [{ clientX: touchX, clientY: touchY }],
              currentTarget: { getBoundingClientRect: () => cachedRect },
              preventDefault: () => {},
              stopPropagation: () => {},
            };
            
            if (dragEvents.onTouchStart) {
              dragEvents.onTouchStart(syntheticEvent);
            }
          };
          
          const handleTouchStart = (e) => {
            const touch = e.touches[0];
            touchStartPos = { x: touch.clientX, y: touch.clientY };
            cachedRect = e.currentTarget.getBoundingClientRect();
            hasMoved = false;
            dragStarted = false;
            
            // Start hold timer - after threshold, begin drag
            holdTimer = setTimeout(() => {
              if (!hasMoved && !dragStarted) {
                startDragFromTouch(touch.clientX, touch.clientY);
              }
            }, HOLD_THRESHOLD);
          };
          
          const handleTouchMove = (e) => {
            const touch = e.touches[0];
            const dx = Math.abs(touch.clientX - touchStartPos.x);
            const dy = Math.abs(touch.clientY - touchStartPos.y);
            
            // If moved more than 5px, consider it a drag attempt
            if (dx > 5 || dy > 5) {
              hasMoved = true;
              // Clear hold timer and start drag immediately on movement
              if (holdTimer) {
                clearTimeout(holdTimer);
                holdTimer = null;
              }
              if (!dragStarted) {
                startDragFromTouch(touch.clientX, touch.clientY);
              }
            }
            
            // Forward move event if dragging
            if (dragStarted && dragEvents.onTouchMove) {
              dragEvents.onTouchMove(e);
            }
          };
          
          const handleTouchEnd = (e) => {
            // Clear hold timer
            if (holdTimer) {
              clearTimeout(holdTimer);
              holdTimer = null;
            }
            
            // If didn't drag and didn't move much, treat as tap for selection
            if (!dragStarted && !hasMoved) {
              if (!isUsed && !isGeneratingPuzzle) {
                onSelectPiece(name);
              }
            }
            
            // Forward end event if dragging
            if (dragStarted && dragEvents.onTouchEnd) {
              dragEvents.onTouchEnd(e);
            }
          };
          
          return (
            <div
              key={name}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={dragEvents.onMouseDown}
              onClick={() => {
                // Desktop click for selection (drag is handled by mousedown)
                if (!isUsed && !isGeneratingPuzzle && !isDragging) {
                  onSelectPiece(name);
                }
              }}
              className={`p-1.5 rounded-lg transition-all flex items-center justify-center relative overflow-hidden cursor-pointer ${
                isUsed
                  ? 'bg-slate-800/30 opacity-25 cursor-not-allowed border border-slate-700/30'
                  : isBeingDragged
                    ? 'bg-slate-700/50 ring-2 ring-cyan-400/50 opacity-50 border border-cyan-500/30'
                    : isSelected
                      ? 'bg-slate-700/80 ring-2 ring-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.7),inset_0_0_15px_rgba(34,211,238,0.2)] border border-cyan-400/50'
                      : 'bg-slate-800/60 hover:bg-slate-700/70 border border-cyan-500/20 hover:border-cyan-500/40 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)]'
              }`}
              style={{
                // CRITICAL: Prevent default touch behaviors like scrolling
                touchAction: 'none',
                // Prevent text selection during drag
                WebkitUserSelect: 'none',
                userSelect: 'none',
                // Prevent context menu on long press
                WebkitTouchCallout: 'none',
                ...dragStyle,
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
            </div>
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
          TAP TO SELECT • HOLD TO DRAG
        </div>
      )}
    </div>
  );
};

export default PieceTray;
