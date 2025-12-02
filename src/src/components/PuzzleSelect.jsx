import NeonTitle from './NeonTitle';
import { puzzles } from '../data/puzzles';

const PuzzleSelect = ({ onSelectPuzzle, onBack }) => {
  return (
    <div className="min-h-screen relative p-4 flex items-center justify-center overflow-hidden bg-slate-950">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: 'linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />
      
      {/* Glow effect */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-green-500/20 rounded-full blur-3xl" />
      
      <div className="relative bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl p-8 max-w-2xl w-full border border-green-500/30 shadow-[0_0_30px_rgba(74,222,128,0.3)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <NeonTitle className="text-3xl">SELECT PUZZLE</NeonTitle>
          <button 
            onClick={onBack}
            className="px-4 py-2 bg-slate-800 text-cyan-300 rounded-lg text-sm border border-cyan-500/30 hover:bg-slate-700 shadow-[0_0_10px_rgba(34,211,238,0.3)]"
          >
            BACK
          </button>
        </div>
        
        {/* Puzzle Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {puzzles.map(puzzle => (
            <button 
              key={puzzle.id}
              onClick={() => onSelectPuzzle(puzzle)}
              className="w-full p-6 bg-slate-800/80 hover:bg-slate-700/80 rounded-xl border border-green-500/30 hover:border-green-400/50 transition-all shadow-[0_0_15px_rgba(74,222,128,0.2)] hover:shadow-[0_0_25px_rgba(74,222,128,0.4)] text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-green-300">{puzzle.name}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  puzzle.difficulty === '1-move' 
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                    : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                }`}>
                  {puzzle.difficulty}
                </span>
              </div>
              <p className="text-sm text-slate-400">{puzzle.description}</p>
            </button>
          ))}
        </div>
        
        {/* Empty state if no puzzles */}
        {puzzles.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p className="text-lg">No puzzles available yet.</p>
            <p className="text-sm mt-2">Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PuzzleSelect;