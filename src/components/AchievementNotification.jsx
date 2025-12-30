// AchievementNotification.jsx - Toast/popup for newly unlocked achievements
// v7.8: Shows animated notification when player unlocks an achievement
import { useEffect, useState } from 'react';
import { Trophy, Star, X } from 'lucide-react';

// Rarity colors
const RARITY_STYLES = {
  common: {
    bg: 'from-slate-600 to-slate-700',
    border: 'border-slate-400',
    glow: 'rgba(148, 163, 184, 0.5)',
    text: 'text-slate-200'
  },
  uncommon: {
    bg: 'from-green-600 to-green-700',
    border: 'border-green-400',
    glow: 'rgba(74, 222, 128, 0.5)',
    text: 'text-green-200'
  },
  rare: {
    bg: 'from-blue-600 to-blue-700',
    border: 'border-blue-400',
    glow: 'rgba(96, 165, 250, 0.5)',
    text: 'text-blue-200'
  },
  epic: {
    bg: 'from-purple-600 to-purple-700',
    border: 'border-purple-400',
    glow: 'rgba(192, 132, 252, 0.5)',
    text: 'text-purple-200'
  },
  legendary: {
    bg: 'from-amber-500 to-orange-600',
    border: 'border-amber-300',
    glow: 'rgba(251, 191, 36, 0.6)',
    text: 'text-amber-100'
  }
};

/**
 * Single achievement notification toast
 */
const AchievementToast = ({ achievement, onDismiss, index }) => {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  const rarity = achievement.rarity || 'common';
  const style = RARITY_STYLES[rarity] || RARITY_STYLES.common;
  const name = achievement.achievement_name || achievement.name || 'Achievement Unlocked';
  const description = achievement.description || '';
  const points = achievement.points || 10;

  useEffect(() => {
    // Staggered entrance
    const enterTimer = setTimeout(() => setVisible(true), index * 200);
    
    // Auto-dismiss after 5 seconds
    const dismissTimer = setTimeout(() => {
      handleDismiss();
    }, 5000 + index * 200);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(dismissTimer);
    };
  }, [index]);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => onDismiss?.(), 300);
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border-2 ${style.border}
        bg-gradient-to-r ${style.bg}
        transform transition-all duration-300 ease-out
        ${visible && !exiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
      style={{
        boxShadow: `0 0 30px ${style.glow}, inset 0 0 20px rgba(255,255,255,0.1)`,
        marginBottom: '8px',
      }}
    >
      {/* Shine effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, transparent 0%, transparent 40%, rgba(255,255,255,0.2) 50%, transparent 60%, transparent 100%)',
          animation: 'achievement-shine 2s ease-in-out',
        }}
      />

      <div className="relative flex items-center gap-3 p-4">
        {/* Icon */}
        <div 
          className={`w-12 h-12 rounded-full flex items-center justify-center bg-black/30 border ${style.border}`}
          style={{ boxShadow: `0 0 15px ${style.glow}` }}
        >
          <Trophy size={24} className={style.text} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${style.text} opacity-80`}>
              {rarity}
            </span>
            <div className="flex items-center gap-1 text-amber-300">
              <Star size={12} fill="currentColor" />
              <span className="text-xs font-bold">+{points}</span>
            </div>
          </div>
          <h3 className="text-white font-bold text-lg truncate">{name}</h3>
          {description && (
            <p className="text-white/70 text-sm truncate">{description}</p>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="p-1 text-white/50 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes achievement-shine {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

/**
 * Container for multiple achievement notifications
 * Position in top-right corner of screen
 */
const AchievementNotification = ({ achievements = [], onDismiss }) => {
  if (!achievements || achievements.length === 0) return null;

  return (
    <div 
      className="fixed top-4 right-4 z-[100] w-80 max-w-[calc(100vw-2rem)]"
      style={{ pointerEvents: 'none' }}
    >
      <div style={{ pointerEvents: 'auto' }}>
        {achievements.map((achievement, index) => (
          <AchievementToast
            key={achievement.achievement_id || index}
            achievement={achievement}
            index={index}
            onDismiss={() => onDismiss?.(index)}
          />
        ))}
      </div>
    </div>
  );
};

export default AchievementNotification;
