// Player Profile Card - Compact display for main menu header
import { useState } from 'react';
import { User, ChevronRight, WifiOff } from 'lucide-react';
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
        className="w-full flex items-center gap-3 p-3 bg-slate-800/60 hover:bg-slate-800/80 rounded-xl border border-slate-700/50 hover:border-slate-600/50 transition-all group"
      >
        <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center border-2 border-slate-600">
          <WifiOff size={20} className="text-slate-400" />
        </div>
        <div className="flex-1 text-left">
          <div className="text-white font-bold">Offline Mode</div>
          <div className="text-slate-400 text-sm">Stats not tracked</div>
        </div>
        <ChevronRight size={20} className="text-slate-500 group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />
      </button>
    );
  }
  
  // Loading state
  if (!profile) {
    return (
      <div className="w-full flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
        <div className="w-12 h-12 rounded-full bg-slate-700 animate-pulse" />
        <div className="flex-1">
          <div className="h-4 w-24 bg-slate-700 rounded animate-pulse mb-1" />
          <div className="h-3 w-16 bg-slate-700 rounded animate-pulse" />
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
      className="w-full flex items-center gap-3 p-3 bg-slate-800/60 hover:bg-slate-800/80 rounded-xl border border-slate-700/50 hover:border-cyan-500/30 transition-all group"
      style={{
        boxShadow: rankInfo ? `0 0 20px ${rankInfo.color}20` : 'none'
      }}
    >
      {/* Avatar with rank border */}
      <div 
        className="relative w-12 h-12 rounded-full overflow-hidden border-2"
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
            style={{ backgroundColor: rankInfo?.color + '40' || '#475569' }}
          >
            <User size={20} className="text-white/80" />
          </div>
        )}
        
        {/* Rank badge overlay */}
        {RankIcon && (
          <div 
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-900"
            style={{ backgroundColor: rankInfo.color }}
          >
            <RankIcon size={12} className="text-white" />
          </div>
        )}
      </div>
      
      {/* Player info */}
      <div className="flex-1 text-left min-w-0">
        <div className="text-white font-bold truncate">{displayName}</div>
        <div className="flex items-center gap-2">
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
      <ChevronRight size={20} className="text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
    </button>
  );
};

export default PlayerProfileCard;
