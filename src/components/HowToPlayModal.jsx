import { X, ChevronRight } from 'lucide-react';
import { soundManager } from '../utils/soundManager';

const HowToPlayModal = ({ isOpen, onClose }) => {
  const handleClose = () => {
    soundManager.playButtonClick();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={handleClose}
    >
      <div 
        className="bg-slate-900/95 rounded-2xl w-full max-w-lg border border-cyan-500/30 shadow-[0_0_40px_rgba(34,211,238,0.3)]"
        style={{
          maxHeight: '85vh',
          maxHeight: '85dvh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header - fixed */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-700/50 flex-shrink-0">
          <h2 className="text-2xl font-bold text-cyan-300 tracking-wide">HOW TO PLAY</h2>
          <button 
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors p-2 -m-2 touch-manipulation active:scale-90"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Scrollable content */}
        <div 
          className="flex-1 overflow-auto px-6 py-4"
          style={{
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
          }}
        >
          <div className="space-y-6 text-slate-300">
            {/* Objective */}
            <section>
              <h3 className="text-lg font-bold text-purple-400 mb-2 flex items-center gap-2">
                <ChevronRight size={18} className="text-purple-400" />
                Objective
              </h3>
              <p className="text-sm leading-relaxed">
                Be the <span className="text-cyan-400 font-semibold">last player to place a piece</span> on the board. 
                When neither player can make a valid move, the last player to have placed a piece wins!
              </p>
            </section>

            {/* The Pieces */}
            <section>
              <h3 className="text-lg font-bold text-purple-400 mb-2 flex items-center gap-2">
                <ChevronRight size={18} className="text-purple-400" />
                The Pieces
              </h3>
              <p className="text-sm leading-relaxed mb-2">
                There are <span className="text-cyan-400 font-semibold">12 unique pentominoes</span> - shapes made of exactly 5 connected squares. 
                Each piece can only be used once per game by either player.
              </p>
              <div className="bg-slate-800/50 rounded-lg p-3 text-xs text-slate-400">
                Pieces: F, I, L, N, P, T, U, V, W, X, Y, Z
              </div>
            </section>

            {/* How to Place */}
            <section>
              <h3 className="text-lg font-bold text-purple-400 mb-2 flex items-center gap-2">
                <ChevronRight size={18} className="text-purple-400" />
                How to Place
              </h3>
              <ol className="text-sm space-y-2 list-decimal list-inside">
                <li>Select a piece from the tray at the bottom</li>
                <li>Tap a cell on the board to place it</li>
                <li>Use <span className="text-cyan-400">Rotate</span> and <span className="text-cyan-400">Flip</span> to adjust orientation</li>
                <li>Use the <span className="text-cyan-400">D-pad</span> to fine-tune position</li>
                <li>Press <span className="text-green-400">Confirm</span> when the placement is valid (green outline)</li>
              </ol>
            </section>

            {/* Placement Rules */}
            <section>
              <h3 className="text-lg font-bold text-purple-400 mb-2 flex items-center gap-2">
                <ChevronRight size={18} className="text-purple-400" />
                Placement Rules
              </h3>
              <ul className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Piece must fit entirely within the 8×8 board</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Piece cannot overlap with any existing pieces</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400">✗</span>
                  <span>Red outline = invalid placement</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Green outline = valid placement</span>
                </li>
              </ul>
            </section>

            {/* Game Modes */}
            <section>
              <h3 className="text-lg font-bold text-purple-400 mb-2 flex items-center gap-2">
                <ChevronRight size={18} className="text-purple-400" />
                Game Modes
              </h3>
              <div className="space-y-3 text-sm">
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                  <h4 className="font-bold text-purple-300 mb-1">VS AI</h4>
                  <p className="text-slate-400">Play against the computer with 3 difficulty levels</p>
                </div>
                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                  <h4 className="font-bold text-cyan-300 mb-1">2 PLAYER</h4>
                  <p className="text-slate-400">Local multiplayer on the same device</p>
                </div>
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <h4 className="font-bold text-green-300 mb-1">PUZZLE MODE</h4>
                  <p className="text-slate-400">Solve pre-set challenges with limited moves</p>
                </div>
              </div>
            </section>

            {/* Tips */}
            <section>
              <h3 className="text-lg font-bold text-purple-400 mb-2 flex items-center gap-2">
                <ChevronRight size={18} className="text-purple-400" />
                Tips & Strategy
              </h3>
              <ul className="text-sm space-y-2 text-slate-400">
                <li>• Control the center of the board early</li>
                <li>• Save flexible pieces (like I and L) for later</li>
                <li>• Try to create awkward spaces your opponent can't fill</li>
                <li>• Watch for opportunities to block your opponent</li>
              </ul>
            </section>

            {/* Extra padding at bottom */}
            <div className="h-4" />
          </div>
        </div>

        {/* Footer - fixed */}
        <div className="p-4 border-t border-slate-700/50 flex-shrink-0">
          <button
            onClick={handleClose}
            className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl transition-all duration-300 shadow-lg touch-manipulation active:scale-[0.98]"
          >
            GOT IT!
          </button>
        </div>
      </div>
    </div>
  );
};

export default HowToPlayModal;
