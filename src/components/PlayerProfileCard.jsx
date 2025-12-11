// Player Profile Card - Compact display for main menu header
import { useState } from 'react';
import { User, ChevronRight, WifiOff, Gamepad2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getRankInfo } from '../utils/rankUtils';

const PlayerProfileCard = ({ onClick, isOffline = false }) => {
  const { profile, isAuthenticated } = useAuth();
  const [imageError, setImageError] = useState(false);
  
  // Get rank info for authenticated users
  const rankInfo = profile ? getRankInfo(profile.rating || 1000) : null;
  
  // Offline mode display
  if (isOffline || !isAuthenticated) {
    return (
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 p-2.5 bg-slate-800/60 hover:bg-slate-800/80 rounded-xl border border-slate-700/50 hover:border-slate-600/50 transition-all group"
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center border-2 border-slate-500/50">
          <WifiOff size={16} className="text-slate-400" />
        </div>
        <div className="flex-1 text-left">
          <div className="text-white font-bold text-sm">Offline Mode</div>
          <div className="text-slate-500 text-xs">Stats not tracked</div>
        </div>
        <ChevronRight size={18} className="text-slate-500 group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />
      </button>
    );
  }
  
  // Loading state
  if (!profile) {
    return (
      <div className="w-full flex items-center gap-3 p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/50">
        <div className="w-10 h-10 rounded-full bg-slate-700 animate-pulse" />
        <div className="flex-1">
          <div className="h-3.5 w-20 bg-slate-700 rounded animate-pulse mb-1" />
          <div className="h-2.5 w-14 bg-slate-700 rounded animate-pulse" />
        </div>
      </div>
    );
  }
  
  const displayName = profile.display_name || profile.username || 'Player';
  const avatarUrl = profile.avatar_url;
  
  // Render rank icon
  const RankIcon = rankInfo?.icon;
  
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all group"
      style={{
        backgroundColor: `${rankInfo?.color}10` || 'rgba(51, 65, 85, 0.6)',
        borderColor: `${rankInfo?.color}40` || 'rgba(71, 85, 105, 0.5)',
        boxShadow: rankInfo ? `0 0 15px ${rankInfo.color}20` : 'none'
      }}
    >
      {/* Avatar with rank border */}
      <div 
        className="relative w-10 h-10 rounded-full overflow-hidden border-2 flex-shrink-0"
        style={{ borderColor: rankInfo?.color || '#64748b' }}
      >
        {avatarUrl && !imageError ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center"
            style={{ 
              background: `linear-gradient(135deg, ${rankInfo?.color}60 0%, ${rankInfo?.color}30 100%)` || 'linear-gradient(135deg, #475569 0%, #334155 100%)'
            }}
          >
            <Gamepad2 size={18} className="text-white/80" />
          </div>
        )}
        
        {/* Rank badge overlay */}
        {RankIcon && (
          <div 
            className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900"
            style={{ backgroundColor: rankInfo.color }}
          >
            <RankIcon size={10} className="text-white" />
          </div>
        )}
      </div>
      
      {/* Player info */}
      <div className="flex-1 text-left min-w-0">
        <div className="text-white font-bold text-sm truncate">{displayName}</div>
        <div className="flex items-center gap-1.5">
          {rankInfo && (
            <span 
              className="text-xs font-medium"
              style={{ color: rankInfo.color }}
            >
              {rankInfo.name}
            </span>
          )}
          <span className="text-slate-500 text-xs">
            {profile.rating || 1000} ELO
          </span>
        </div>
      </div>
      
      {/* Arrow */}
      <ChevronRight size={18} className="text-slate-500 group-hover:translate-x-1 transition-all flex-shrink-0" style={{ color: rankInfo?.color || '#64748b' }} />
    </button>
  );
};

export default PlayerProfileCard;
