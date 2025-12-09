// DPad component for moving pending pieces
import { memo } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const DPad = ({ onMove }) => {
  const buttonStyle = `
    w-10 h-10 
    bg-slate-700/80 
    hover:bg-slate-600 
    active:bg-cyan-600/50 
    rounded-lg 
    flex items-center justify-center 
    text-slate-300 
    hover:text-white 
    transition-all 
    active:scale-95
    border border-slate-600/50
  `;

  return (
    <div className="flex justify-center py-2">
      <div className="grid grid-cols-3 gap-1">
        {/* Top row */}
        <div />
        <button
          onClick={() => onMove?.('up')}
          className={buttonStyle}
          aria-label="Move up"
        >
          <ChevronUp size={20} />
        </button>
        <div />
        
        {/* Middle row */}
        <button
          onClick={() => onMove?.('left')}
          className={buttonStyle}
          aria-label="Move left"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="w-10 h-10" />
        <button
          onClick={() => onMove?.('right')}
          className={buttonStyle}
          aria-label="Move right"
        >
          <ChevronRight size={20} />
        </button>
        
        {/* Bottom row */}
        <div />
        <button
          onClick={() => onMove?.('down')}
          className={buttonStyle}
          aria-label="Move down"
        >
          <ChevronDown size={20} />
        </button>
        <div />
      </div>
    </div>
  );
};

export default memo(DPad);
