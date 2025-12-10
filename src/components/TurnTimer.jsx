// TurnTimer - Visual countdown timer for turns
import { useState, useEffect, useRef } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { soundManager } from '../utils/soundManager';

const TurnTimer = ({ 
  seconds, 
  turnStartedAt, 
  isMyTurn, 
  onTimeout,
  paused = false 
}) => {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [isWarning, setIsWarning] = useState(false);
  const [isCritical, setIsCritical] = useState(false);
  const hasPlayedWarningRef = useRef(false);
  const hasPlayedCriticalRef = useRef(false);

  // Calculate remaining time based on server timestamp
  useEffect(() => {
    if (!seconds || !turnStartedAt || paused) {
      setTimeLeft(seconds);
      return;
    }

    const startTime = new Date(turnStartedAt).getTime();
    
    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, seconds - elapsed);
      
      setTimeLeft(remaining);
      setIsWarning(remaining <= 30 && remaining > 10);
      setIsCritical(remaining <= 10);

      // Play warning sounds
      if (isMyTurn) {
        if (remaining <= 30 && remaining > 10 && !hasPlayedWarningRef.current) {
          soundManager.playSound('notification');
          hasPlayedWarningRef.current = true;
        }
        if (remaining <= 10 && !hasPlayedCriticalRef.current) {
          soundManager.playSound('invalid');
          hasPlayedCriticalRef.current = true;
        }
      }

      // Handle timeout
      if (remaining === 0 && isMyTurn) {
        onTimeout?.();
      }
    };

    // Initial update
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [seconds, turnStartedAt, isMyTurn, paused, onTimeout]);

  // Reset warning flags when turn changes
  useEffect(() => {
    hasPlayedWarningRef.current = false;
    hasPlayedCriticalRef.current = false;
  }, [turnStartedAt]);

  if (!seconds) return null;

  // Format time
  const minutes = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeDisplay = minutes > 0 
    ? `${minutes}:${secs.toString().padStart(2, '0')}` 
    : `${secs}s`;

  // Progress percentage
  const progress = (timeLeft / seconds) * 100;

  // Colors based on state
  const getColors = () => {
    if (isCritical) return {
      bg: 'bg-red-500/20',
      border: 'border-red-500',
      text: 'text-red-400',
      fill: 'bg-red-500'
    };
    if (isWarning) return {
      bg: 'bg-amber-500/20',
      border: 'border-amber-500',
      text: 'text-amber-400',
      fill: 'bg-amber-500'
    };
    if (isMyTurn) return {
      bg: 'bg-green-500/20',
      border: 'border-green-500',
      text: 'text-green-400',
      fill: 'bg-green-500'
    };
    return {
      bg: 'bg-slate-500/20',
      border: 'border-slate-500',
      text: 'text-slate-400',
      fill: 'bg-slate-500'
    };
  };

  const colors = getColors();

  return (
    <div className={`
      flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
      ${colors.bg} ${colors.border}
      ${isCritical && isMyTurn ? 'animate-pulse' : ''}
    `}>
      {isCritical && isMyTurn ? (
        <AlertTriangle size={16} className={`${colors.text} animate-bounce`} />
      ) : (
        <Clock size={16} className={colors.text} />
      )}
      
      <div className="flex-1 min-w-[60px]">
        {/* Progress bar */}
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mb-1">
          <div 
            className={`h-full ${colors.fill} transition-all duration-1000`}
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Time display */}
        <span className={`text-sm font-mono font-bold ${colors.text}`}>
          {timeDisplay}
        </span>
      </div>
    </div>
  );
};

// Timer presets for game creation
export const TIMER_PRESETS = [
  { value: null, label: 'No Timer', description: 'Relaxed pace' },
  { value: 30, label: 'Blitz', description: '30 seconds per turn' },
  { value: 60, label: 'Quick', description: '1 minute per turn' },
  { value: 120, label: 'Standard', description: '2 minutes per turn' },
  { value: 300, label: 'Extended', description: '5 minutes per turn' }
];

// Timer selector for game creation
export const TimerSelector = ({ value, onChange }) => {
  return (
    <div className="space-y-2">
      <label className="text-sm text-slate-400">Turn Timer</label>
      <div className="grid grid-cols-2 gap-2">
        {TIMER_PRESETS.map(preset => (
          <button
            key={preset.value ?? 'none'}
            onClick={() => onChange(preset.value)}
            className={`
              p-3 rounded-lg border text-left transition-all
              ${value === preset.value 
                ? 'bg-amber-500/20 border-amber-500 text-amber-300' 
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
              }
            `}
          >
            <div className="font-medium text-sm">{preset.label}</div>
            <div className="text-xs opacity-70">{preset.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TurnTimer;
