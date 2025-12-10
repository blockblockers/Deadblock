// NeonSubtitle - Smaller neon text with customizable color theme

const NeonSubtitle = ({ text = 'ONLINE', className = '', size = 'default', color = 'amber' }) => {
  // Size presets
  const sizeClasses = {
    tiny: 'text-xs',
    small: 'text-sm',
    default: 'text-base sm:text-lg',
    large: 'text-lg sm:text-xl',
  };

  // Color presets
  const colorPresets = {
    amber: { primary: '#f59e0b', secondary: '#ea580c' },
    lime: { primary: '#84cc16', secondary: '#22c55e' },
    cyan: { primary: '#22d3ee', secondary: '#3b82f6' },
    purple: { primary: '#a855f7', secondary: '#ec4899' },
    red: { primary: '#ef4444', secondary: '#f97316' },
    green: { primary: '#22c55e', secondary: '#10b981' },
  };

  const sizeClass = sizeClasses[size] || sizeClasses.default;
  const colors = colorPresets[color] || colorPresets.amber;
  
  // Generate unique class name based on color
  const uniqueClass = `neon-subtitle-${color}`;

  return (
    <div className={`relative inline-block ${className}`}>
      <span className={`${uniqueClass} font-black tracking-[0.3em] ${sizeClass}`}>
        {text}
      </span>
      <style>{`
        .${uniqueClass} {
          font-family: system-ui, -apple-system, sans-serif;
          color: #fff;
          text-shadow:
            0 0 5px #fff,
            0 0 10px #fff,
            0 0 20px ${colors.primary},
            0 0 40px ${colors.primary},
            0 0 60px ${colors.secondary};
          animation: ${uniqueClass}-pulse 3s ease-in-out infinite;
        }
        @keyframes ${uniqueClass}-pulse {
          0%, 100% {
            text-shadow:
              0 0 5px #fff,
              0 0 10px #fff,
              0 0 20px ${colors.primary},
              0 0 40px ${colors.primary},
              0 0 60px ${colors.secondary};
            filter: brightness(1);
          }
          50% {
            text-shadow:
              0 0 5px #fff,
              0 0 15px #fff,
              0 0 30px ${colors.primary},
              0 0 50px ${colors.primary},
              0 0 70px ${colors.secondary};
            filter: brightness(1.1);
          }
        }
      `}</style>
    </div>
  );
};

export default NeonSubtitle;
