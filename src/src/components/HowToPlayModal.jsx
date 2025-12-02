import { X } from 'lucide-react';

const HowToPlayModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900/95 rounded-2xl p-6 max-w-lg w-full border border-amber-500/30 shadow-[0_0_40px_rgba(251,191,36,0.3)] max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-amber-300 tracking-wide">HOW TO PLAY</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Content */}
        <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <section>
            <h3 className="text-cyan-400 font-bold mb-1 tracking-wide">OBJECTIVE</h3>
            <p>Be the last player to place a piece on the board. When your opponent cannot make a valid move, you win!</p>
          </section>
          
          <section>
            <h3 className="text-pink-400 font-bold mb-1 tracking-wide">GAMEPLAY</h3>
            <p>Players take turns placing one of the 12 unique pentomino pieces (shapes made of 5 squares) onto the 8×8 board. Each piece can only be used once per game by either player.</p>
          </section>
          
          <section>
            <h3 className="text-green-400 font-bold mb-1 tracking-wide">PLACEMENT RULES</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Pieces cannot overlap with other pieces</li>
              <li>Pieces must fit entirely within the board</li>
              <li>You can rotate and flip pieces before placing</li>
              <li>Once placed, pieces cannot be moved</li>
            </ul>
          </section>
          
          <section>
            <h3 className="text-purple-400 font-bold mb-1 tracking-wide">CONTROLS</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><span className="text-white">Select</span> a piece from the tray below the board</li>
              <li><span className="text-white">Tap</span> a cell on the board to position it</li>
              <li><span className="text-white">Rotate/Flip</span> to change orientation</li>
              <li><span className="text-white">D-Pad</span> to fine-tune position</li>
              <li><span className="text-white">Confirm</span> to place or <span className="text-white">Cancel</span> to pick a different piece</li>
            </ul>
          </section>
          
          <section>
            <h3 className="text-yellow-400 font-bold mb-1 tracking-wide">STRATEGY TIPS</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Control the center of the board early</li>
              <li>Try to leave awkward spaces your opponent can't fill</li>
              <li>Save flexible pieces for later in the game</li>
              <li>Watch which pieces have been used!</li>
            </ul>
          </section>
        </div>
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="w-full mt-6 p-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-bold tracking-wide hover:from-amber-500 hover:to-orange-500 transition-all shadow-[0_0_20px_rgba(251,191,36,0.4)]"
        >
          GOT IT!
        </button>
      </div>
    </div>
  );
};

export default HowToPlayModal;