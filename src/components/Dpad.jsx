import { soundManager } from '../utils/soundManager';

const DPad = ({ onMove }) => {
  const buttonClass = "w-8 h-8 sm:w-10 sm:h-10 bg-cyan-600/80 hover:bg-cyan-500 text-white rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.5)] flex items-center justify-center border border-cyan-400/50 active:scale-95 transition-transform";
  
  const handleMove = (direction) => {
    onMove(direction);
  };
  
  return (
    <div className="flex justify-center mt-3 mb-2">
      <div className="relative w-24 h-24 sm:w-28 sm:h-28">
        {/* Up */}
        <button
          onClick={() => handleMove('up')}
          className={`absolute top-0 left-1/2 -translate-x-1/2 ${buttonClass}`}
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
          </svg>
        </button>

        {/* Down */}
        <button
          onClick={() => handleMove('down')}
          className={`absolute bottom-0 left-1/2 -translate-x-1/2 ${buttonClass}`}
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Left */}
        <button
          onClick={() => handleMove('left')}
          className={`absolute left-0 top-1/2 -translate-y-1/2 ${buttonClass}`}
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Right */}
        <button
          onClick={() => handleMove('right')}
          className={`absolute right-0 top-1/2 -translate-y-1/2 ${buttonClass}`}
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 sm:w-8 sm:h-8 bg-slate-800 rounded-full border border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.3)]" />
      </div>
    </div>
  );
};

export default DPad;