// How to Play Modal
import { X, Target, Users, Trophy, Lightbulb, Wifi } from 'lucide-react';

const HowToPlayModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-xl max-w-md w-full max-h-[85vh] overflow-hidden border border-cyan-500/30 shadow-[0_0_50px_rgba(34,211,238,0.3)]">
        {/* Header */}
        <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800">
          <h2 className="text-xl font-black text-cyan-300 tracking-wider">HOW TO PLAY</h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[70vh] space-y-5">
          {/* Objective */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-cyan-400">
              <Target size={20} />
              <h3 className="font-bold tracking-wide">OBJECTIVE</h3>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              Be the last player to place a piece! Force your opponent into a position where they can't make a valid move.
            </p>
          </div>

          {/* Gameplay */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-400">
              <Users size={20} />
              <h3 className="font-bold tracking-wide">GAMEPLAY</h3>
            </div>
            <ul className="text-slate-300 text-sm space-y-2 leading-relaxed">
              <li className="flex gap-2">
                <span className="text-emerald-400">1.</span>
                <span>Players take turns placing one of 12 unique pentomino pieces on the 8×8 board.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-400">2.</span>
                <span>Each piece can only be used once per game.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-400">3.</span>
                <span>Pieces cannot overlap with existing pieces.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-400">4.</span>
                <span>Use rotate and flip buttons to adjust piece orientation.</span>
              </li>
            </ul>
          </div>

          {/* Winning */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-400">
              <Trophy size={20} />
              <h3 className="font-bold tracking-wide">WINNING</h3>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              The game ends when a player cannot place any remaining piece. The player who made the last successful move wins!
            </p>
          </div>

          {/* Online Play */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-orange-400">
              <Wifi size={20} />
              <h3 className="font-bold tracking-wide">ONLINE PLAY</h3>
            </div>
            <ul className="text-slate-300 text-sm space-y-2 leading-relaxed">
              <li className="flex gap-2">
                <span className="text-orange-400">•</span>
                <span>Create an account or sign in with Google to play online.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-400">•</span>
                <span>Use "Find Match" for quick matchmaking with other players.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-400">•</span>
                <span>Invite friends using a shareable link.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-400">•</span>
                <span>Your rating changes based on wins and losses.</span>
              </li>
            </ul>
          </div>

          {/* Tips */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-purple-400">
              <Lightbulb size={20} />
              <h3 className="font-bold tracking-wide">TIPS</h3>
            </div>
            <ul className="text-slate-300 text-sm space-y-2 leading-relaxed">
              <li className="flex gap-2">
                <span className="text-purple-400">•</span>
                <span>Save flexible pieces for later in the game.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-400">•</span>
                <span>Create awkward spaces that are hard for opponents to fill.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-400">•</span>
                <span>Watch what pieces your opponent has left.</span>
              </li>
            </ul>
          </div>

          {/* Piece Info */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <p className="text-slate-400 text-xs text-center">
              There are 12 unique pentomino shapes, each made of 5 connected squares: F, I, L, N, P, T, U, V, W, X, Y, Z
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cyan-500/20">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white font-bold rounded-lg transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)]"
          >
            GOT IT!
          </button>
        </div>
      </div>
    </div>
  );
};

export default HowToPlayModal;
