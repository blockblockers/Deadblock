// NeonTitle - Neon Segments Style (2A-5)
// DEA (cyan) | DBL (purple) | OCK (pink)

const NeonTitle = ({ className = '', size = 'default' }) => {
  // Size presets
  const sizeClasses = {
    small: 'text-xl',
    medium: 'text-2xl sm:text-3xl',
    default: 'text-2xl sm:text-3xl',
    large: 'text-4xl sm:text-5xl md:text-6xl',
    xlarge: 'text-5xl sm:text-6xl md:text-7xl',
  };

  const sizeClass = sizeClasses[size] || sizeClasses.default;

  return (
    <div className={`relative inline-block ${className}`}>
      <h1 className={`neon-segments font-black tracking-wider flex ${sizeClass}`}>
        <span className="neon-seg-cyan">DEA</span>
        <span className="neon-seg-purple">DBL</span>
        <span className="neon-seg-pink">OCK</span>
      </h1>
      <style>{`
        .neon-segments {
          font-family: system-ui, -apple-system, sans-serif;
        }
        .neon-seg-cyan {
          color: #fff;
          text-shadow:
            0 0 5px #fff,
            0 0 10px #fff,
            0 0 20px #22d3ee,
            0 0 40px #22d3ee,
            0 0 60px #22d3ee;
          animation: seg-pulse-cyan 2.5s ease-in-out infinite;
        }
        .neon-seg-purple {
          color: #fff;
          text-shadow:
            0 0 5px #fff,
            0 0 10px #fff,
            0 0 20px #a855f7,
            0 0 40px #a855f7,
            0 0 60px #a855f7;
          animation: seg-pulse-purple 2.5s ease-in-out infinite;
          animation-delay: 0.4s;
        }
        .neon-seg-pink {
          color: #fff;
          text-shadow:
            0 0 5px #fff,
            0 0 10px #fff,
            0 0 20px #ec4899,
            0 0 40px #ec4899,
            0 0 60px #ec4899;
          animation: seg-pulse-pink 2.5s ease-in-out infinite;
          animation-delay: 0.8s;
        }
        @keyframes seg-pulse-cyan {
          0%, 100% {
            text-shadow:
              0 0 5px #fff,
              0 0 10px #fff,
              0 0 20px #22d3ee,
              0 0 40px #22d3ee,
              0 0 60px #22d3ee;
            filter: brightness(1);
          }
          50% {
            text-shadow:
              0 0 5px #fff,
              0 0 15px #fff,
              0 0 30px #22d3ee,
              0 0 60px #22d3ee,
              0 0 80px #22d3ee;
            filter: brightness(1.15);
          }
        }
        @keyframes seg-pulse-purple {
          0%, 100% {
            text-shadow:
              0 0 5px #fff,
              0 0 10px #fff,
              0 0 20px #a855f7,
              0 0 40px #a855f7,
              0 0 60px #a855f7;
            filter: brightness(1);
          }
          50% {
            text-shadow:
              0 0 5px #fff,
              0 0 15px #fff,
              0 0 30px #a855f7,
              0 0 60px #a855f7,
              0 0 80px #a855f7;
            filter: brightness(1.15);
          }
        }
        @keyframes seg-pulse-pink {
          0%, 100% {
            text-shadow:
              0 0 5px #fff,
              0 0 10px #fff,
              0 0 20px #ec4899,
              0 0 40px #ec4899,
              0 0 60px #ec4899;
            filter: brightness(1);
          }
          50% {
            text-shadow:
              0 0 5px #fff,
              0 0 15px #fff,
              0 0 30px #ec4899,
              0 0 60px #ec4899,
              0 0 80px #ec4899;
            filter: brightness(1.15);
          }
        }
      `}</style>
    </div>
  );
};

export default NeonTitle;
