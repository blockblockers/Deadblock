// useAchievements.js - Hook for checking and displaying achievements
// v7.8: Integrates achievement checking into game flow
import { useState, useCallback } from 'react';
import achievementService from '../services/achievementService';
import { soundManager } from '../utils/soundManager';

/**
 * Hook for managing achievement checks and notifications
 * 
 * Usage in any game screen:
 * 
 * const { checkAfterGame, checkAfterPuzzle, newAchievements, clearAchievements } = useAchievements();
 * 
 * // After a game ends:
 * useEffect(() => {
 *   if (gameOver && userId) {
 *     checkAfterGame(userId, gameId, isWin);
 *   }
 * }, [gameOver]);
 */
export function useAchievements() {
  const [newAchievements, setNewAchievements] = useState([]);
  const [checking, setChecking] = useState(false);

  /**
   * Check achievements after an online game ends
   */
  const checkAfterGame = useCallback(async (userId, gameId = null, isWin = false) => {
    if (!userId || checking) return;
    
    setChecking(true);
    console.log('[useAchievements] Checking achievements after game:', { userId, gameId, isWin });
    
    try {
      const { data, error } = await achievementService.checkAchievements(userId, gameId);
      
      if (error) {
        console.error('[useAchievements] Error checking achievements:', error);
      } else if (data && data.length > 0) {
        console.log('[useAchievements] New achievements unlocked:', data);
        setNewAchievements(prev => [...prev, ...data]);
        
        // Play achievement sound
        soundManager.playButtonClick?.();
      }
    } catch (err) {
      console.error('[useAchievements] Exception:', err);
    }
    
    setChecking(false);
  }, [checking]);

  /**
   * Check achievements after completing a puzzle
   */
  const checkAfterPuzzle = useCallback(async (userId, difficulty, solved = true) => {
    if (!userId || !solved || checking) return;
    
    setChecking(true);
    console.log('[useAchievements] Checking achievements after puzzle:', { userId, difficulty });
    
    try {
      // Use the general check which looks at player_stats
      const { data, error } = await achievementService.checkAchievements(userId);
      
      if (error) {
        console.error('[useAchievements] Error checking puzzle achievements:', error);
      } else if (data && data.length > 0) {
        console.log('[useAchievements] New achievements unlocked:', data);
        setNewAchievements(prev => [...prev, ...data]);
        soundManager.playButtonClick?.();
      }
    } catch (err) {
      console.error('[useAchievements] Exception:', err);
    }
    
    setChecking(false);
  }, [checking]);

  /**
   * Check achievements after speed puzzle streak
   */
  const checkAfterSpeedPuzzle = useCallback(async (userId, currentStreak) => {
    if (!userId || checking) return;
    
    // Only check on milestone streaks
    if (![5, 10, 25, 50].includes(currentStreak)) return;
    
    setChecking(true);
    console.log('[useAchievements] Checking speed puzzle achievements:', { userId, currentStreak });
    
    try {
      const { data, error } = await achievementService.checkAchievements(userId);
      
      if (!error && data && data.length > 0) {
        console.log('[useAchievements] Speed puzzle achievements unlocked:', data);
        setNewAchievements(prev => [...prev, ...data]);
        soundManager.playButtonClick?.();
      }
    } catch (err) {
      console.error('[useAchievements] Exception:', err);
    }
    
    setChecking(false);
  }, [checking]);

  /**
   * Check achievements after weekly challenge
   */
  const checkAfterWeeklyChallenge = useCallback(async (userId, rank, challengeId) => {
    if (!userId || checking) return;
    
    setChecking(true);
    console.log('[useAchievements] Checking weekly challenge achievements:', { userId, rank, challengeId });
    
    try {
      // Check weekly-specific achievements
      const awarded = await achievementService.checkWeeklyAchievements(rank, challengeId);
      
      if (awarded && awarded.length > 0) {
        console.log('[useAchievements] Weekly achievements unlocked:', awarded);
        // Convert to display format
        const newOnes = awarded.map(id => ({ achievement_id: id, success: true }));
        setNewAchievements(prev => [...prev, ...newOnes]);
        soundManager.playButtonClick?.();
      }
      
      // Also run general check
      const { data } = await achievementService.checkAchievements(userId);
      if (data && data.length > 0) {
        setNewAchievements(prev => [...prev, ...data]);
      }
    } catch (err) {
      console.error('[useAchievements] Exception:', err);
    }
    
    setChecking(false);
  }, [checking]);

  /**
   * Check achievements after AI game
   */
  const checkAfterAIGame = useCallback(async (userId, difficulty, isWin) => {
    if (!userId || checking) return;
    
    setChecking(true);
    console.log('[useAchievements] Checking AI game achievements:', { userId, difficulty, isWin });
    
    try {
      const { data, error } = await achievementService.checkAchievements(userId);
      
      if (!error && data && data.length > 0) {
        console.log('[useAchievements] AI achievements unlocked:', data);
        setNewAchievements(prev => [...prev, ...data]);
        soundManager.playButtonClick?.();
      }
    } catch (err) {
      console.error('[useAchievements] Exception:', err);
    }
    
    setChecking(false);
  }, [checking]);

  /**
   * Clear displayed achievements (after user dismisses them)
   */
  const clearAchievements = useCallback(() => {
    setNewAchievements([]);
  }, []);

  /**
   * Dismiss a single achievement notification
   */
  const dismissAchievement = useCallback((index) => {
    setNewAchievements(prev => prev.filter((_, i) => i !== index));
  }, []);

  return {
    newAchievements,
    checking,
    checkAfterGame,
    checkAfterPuzzle,
    checkAfterSpeedPuzzle,
    checkAfterWeeklyChallenge,
    checkAfterAIGame,
    clearAchievements,
    dismissAchievement,
  };
}

export default useAchievements;
