// NeonSubtitle - Smaller neon text with amber/orange theme for Online mode

const NeonSubtitle = ({ text = 'ONLINE', className = '', size = 'default' }) => {
  // Size presets
  const sizeClasses = {
    tiny: 'text-xs',
    small: 'text-sm',
    default: 'text-base sm:text-lg',
    large: 'text-lg sm:text-xl',
  };

  const sizeClass = sizeClasses[size] || sizeClasses.default;

  return (
    <div className={`relative inline-block ${className}`}>
      <span className={`neon-subtitle font-black tracking-[0.3em] ${sizeClass}`}>
        {text}
      </span>
      <style>{`
        .neon-subtitle {
          font-family: system-ui, -apple-system, sans-serif;
          color: #fff;
          text-shadow:
            0 0 5px #fff,
            0 0 10px #fff,
            0 0 20px #f59e0b,
            0 0 40px #f59e0b,
            0 0 60px #ea580c;
          animation: subtitle-pulse 3s ease-in-out infinite;
        }
        @keyframes subtitle-pulse {
          0%, 100% {
            text-shadow:
              0 0 5px #fff,
              0 0 10px #fff,
              0 0 20px #f59e0b,
              0 0 40px #f59e0b,
              0 0 60px #ea580c;
            filter: brightness(1);
          }
          50% {
            text-shadow:
              0 0 5px #fff,
              0 0 15px #fff,
              0 0 30px #f59e0b,
              0 0 50px #f59e0b,
              0 0 70px #ea580c;
            filter: brightness(1.1);
          }
        }
      `}</style>
    </div>
  );
};

export default NeonSubtitle;
