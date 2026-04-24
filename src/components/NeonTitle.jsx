// NeonTitle - Neon Segments Style (2A-5)
// v3: Added color prop (default=cyan/purple/pink, amber, red) for themed screens
// DEA (cyan) | DBL (purple) | OCK (pink) — default
// DEA/DBL/OCK all amber — for online screens
// DEA/DBL/OCK all red — for weekly/speed screens

const colorSchemes = {
  default: {
    seg1: '#22d3ee',
    seg2: '#a855f7',
    seg3: '#ec4899',
  },
  amber: {
    seg1: '#f59e0b',
    seg2: '#f59e0b',
    seg3: '#f59e0b',
  },
  red: {
    seg1: '#ef4444',
    seg2: '#ef4444',
    seg3: '#ef4444',
  },
};

const NeonTitle = ({ className = '', size = 'default', color = 'default' }) => {
  const sizeClasses = {
    small: 'text-xl',
    medium: 'text-2xl sm:text-3xl',
    default: 'text-2xl sm:text-3xl',
    large: 'text-3xl sm:text-4xl',
    xlarge: 'text-5xl sm:text-6xl md:text-7xl',
  };

  const sizeClass = sizeClasses[size] || sizeClasses.default;
  const scheme = colorSchemes[color] || colorSchemes.default;
  const uid = `nt-${color}`;

  return (
    <div className={`relative inline-block ${className}`}>
      <h1 className={`${uid}-segments font-black tracking-wider flex ${sizeClass}`}>
        <span className={`${uid}-seg1`}>DEA</span>
        <span className={`${uid}-seg2`}>DBL</span>
        <span className={`${uid}-seg3`}>OCK</span>
      </h1>
      <style>{`
        .${uid}-segments {
          font-family: system-ui, -apple-system, sans-serif;
        }
        .${uid}-seg1 {
          color: #fff;
          text-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 20px ${scheme.seg1}, 0 0 40px ${scheme.seg1}, 0 0 60px ${scheme.seg1};
          animation: ${uid}-pulse1 2.5s ease-in-out infinite;
        }
        .${uid}-seg2 {
          color: #fff;
          text-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 20px ${scheme.seg2}, 0 0 40px ${scheme.seg2}, 0 0 60px ${scheme.seg2};
          animation: ${uid}-pulse2 2.5s ease-in-out infinite;
          animation-delay: 0.4s;
        }
        .${uid}-seg3 {
          color: #fff;
          text-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 20px ${scheme.seg3}, 0 0 40px ${scheme.seg3}, 0 0 60px ${scheme.seg3};
          animation: ${uid}-pulse3 2.5s ease-in-out infinite;
          animation-delay: 0.8s;
        }
        @keyframes ${uid}-pulse1 {
          0%, 100% { text-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 20px ${scheme.seg1}, 0 0 40px ${scheme.seg1}, 0 0 60px ${scheme.seg1}; filter: brightness(1); }
          50% { text-shadow: 0 0 5px #fff, 0 0 15px #fff, 0 0 30px ${scheme.seg1}, 0 0 60px ${scheme.seg1}, 0 0 80px ${scheme.seg1}; filter: brightness(1.15); }
        }
        @keyframes ${uid}-pulse2 {
          0%, 100% { text-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 20px ${scheme.seg2}, 0 0 40px ${scheme.seg2}, 0 0 60px ${scheme.seg2}; filter: brightness(1); }
          50% { text-shadow: 0 0 5px #fff, 0 0 15px #fff, 0 0 30px ${scheme.seg2}, 0 0 60px ${scheme.seg2}, 0 0 80px ${scheme.seg2}; filter: brightness(1.15); }
        }
        @keyframes ${uid}-pulse3 {
          0%, 100% { text-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 20px ${scheme.seg3}, 0 0 40px ${scheme.seg3}, 0 0 60px ${scheme.seg3}; filter: brightness(1); }
          50% { text-shadow: 0 0 5px #fff, 0 0 15px #fff, 0 0 30px ${scheme.seg3}, 0 0 60px ${scheme.seg3}, 0 0 80px ${scheme.seg3}; filter: brightness(1.15); }
        }
      `}</style>
    </div>
  );
};

export default NeonTitle;
