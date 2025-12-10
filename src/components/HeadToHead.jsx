// HeadToHead - Display head-to-head statistics between two players
import { useState, useEffect } from 'react';
import { Swords, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ratingService } from '../services/ratingService';

const HeadToHead = ({ userId, opponentId, userName, opponentName, compact = false }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId && opponentId) {
      loadStats();
    }
  }, [userId, opponentId]);

  const loadStats = async () => {
    setLoading(true);
    const { data } = await ratingService.getHeadToHead(userId, opponentId);
    setStats(data);
    setLoading(false);
  };

  if (loading) {
    return compact ? null : (
      <div className="bg-slate-800/50 rounded-lg p-3 animate-pulse">
        <div className="h-4 bg-slate-700 rounded w-24 mx-auto" />
      </div>
    );
  }

  if (!stats || stats.total_games === 0) {
    return compact ? null : (
      <div className="bg-slate-800/50 rounded-lg p-3 text-center">
        <Swords className="mx-auto text-slate-600 mb-1" size={20} />
        <p className="text-xs text-slate-500">First match!</p>
      </div>
    );
  }

  const myWins = Number(stats.user1_wins);
  const oppWins = Number(stats.user2_wins);
  const total = Number(stats.total_games);
  const draws = Number(stats.draws);

  // Win percentage
  const winRate = total > 0 ? Math.round((myWins / total) * 100) : 0;

  // Determine who's ahead
  const isAhead = myWins > oppWins;
  const isTied = myWins === oppWins;

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <Swords size={12} className="text-slate-500" />
        <span className={isAhead ? 'text-green-400' : isTied ? 'text-slate-400' : 'text-red-400'}>
          {myWins}-{oppWins}
        </span>
        <span className="text-slate-500">({total} games)</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <Swords className="text-amber-400" size={18} />
        <span className="text-sm font-medium text-slate-300">Head to Head</span>
      </div>

      {/* Score display */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-center flex-1">
          <div className="text-2xl font-bold text-cyan-400">{myWins}</div>
          <div className="text-xs text-slate-500 truncate">{userName || 'You'}</div>
        </div>
        
        <div className="text-center px-4">
          <div className="text-slate-600">-</div>
          <div className="text-xs text-slate-600">{draws > 0 ? `${draws} draws` : ''}</div>
        </div>
        
        <div className="text-center flex-1">
          <div className="text-2xl font-bold text-pink-400">{oppWins}</div>
          <div className="text-xs text-slate-500 truncate">{opponentName || 'Opponent'}</div>
        </div>
      </div>

      {/* Win bar */}
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden flex mb-2">
        <div 
          className="bg-cyan-500 transition-all duration-500"
          style={{ width: `${total > 0 ? (myWins / total) * 100 : 50}%` }}
        />
        {draws > 0 && (
          <div 
            className="bg-slate-500"
            style={{ width: `${(draws / total) * 100}%` }}
          />
        )}
        <div 
          className="bg-pink-500 transition-all duration-500"
          style={{ width: `${total > 0 ? (oppWins / total) * 100 : 50}%` }}
        />
      </div>

      {/* Stats footer */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          {isAhead ? (
            <TrendingUp size={12} className="text-green-400" />
          ) : isTied ? (
            <Minus size={12} className="text-slate-400" />
          ) : (
            <TrendingDown size={12} className="text-red-400" />
          )}
          <span className={isAhead ? 'text-green-400' : isTied ? 'text-slate-400' : 'text-red-400'}>
            {winRate}% win rate
          </span>
        </div>
        <span className="text-slate-500">
          {total} game{total !== 1 ? 's' : ''} played
        </span>
      </div>

      {/* Last played */}
      {stats.last_played && (
        <div className="text-center text-xs text-slate-600 mt-2">
          Last played: {new Date(stats.last_played).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

export default HeadToHead;
