// Rank Utilities - Provides rank info for display components
import { ratingService } from '../services/ratingService';

// Map tier shapes to Lucide icons (fallback for small contexts)
import { Sparkles, Star, Zap, Target, Award, Circle, Hexagon } from 'lucide-react';

const tierIcons = {
  X: Sparkles,   // Grandmaster
  W: Star,       // Master
  T: Zap,        // Expert
  Y: Target,     // Advanced
  L: Award,      // Intermediate
  I: Hexagon,    // Beginner
  O: Circle,     // Novice
};

/**
 * Get comprehensive rank info for a given rating
 * @param {number} rating - ELO rating
 * @returns {Object} Rank info with name, color, icon, shape, etc.
 */
export const getRankInfo = (rating) => {
  const tier = ratingService.getRatingTier(rating);
  
  return {
    ...tier,
    icon: tierIcons[tier.shape] || Circle,
    // Convert Tailwind color class to hex for inline styles
    hexColor: getHexColor(tier.glowColor),
  };
};

/**
 * Get hex color - the glowColor from ratingService is already hex
 */
const getHexColor = (glowColor) => {
  return glowColor || '#64748b';
};

/**
 * Get rank progress to next tier
 * @param {number} rating - Current ELO rating
 * @returns {Object} Progress info
 */
export const getRankProgress = (rating) => {
  const thresholds = [2200, 2000, 1800, 1600, 1400, 1200, 0];
  const names = ['Grandmaster', 'Master', 'Expert', 'Advanced', 'Intermediate', 'Beginner', 'Novice'];
  
  for (let i = 0; i < thresholds.length - 1; i++) {
    if (rating >= thresholds[i]) {
      return {
        currentTier: names[i],
        nextTier: null,
        pointsToNext: 0,
        progress: 100,
        isMaxTier: i === 0,
      };
    }
    if (rating >= thresholds[i + 1]) {
      const tierSize = thresholds[i] - thresholds[i + 1];
      const pointsInTier = rating - thresholds[i + 1];
      return {
        currentTier: names[i + 1],
        nextTier: names[i],
        pointsToNext: thresholds[i] - rating,
        progress: Math.round((pointsInTier / tierSize) * 100),
        isMaxTier: false,
      };
    }
  }
  
  // Novice tier
  return {
    currentTier: 'Novice',
    nextTier: 'Beginner',
    pointsToNext: 1200 - rating,
    progress: Math.round((rating / 1200) * 100),
    isMaxTier: false,
  };
};

export default { getRankInfo, getRankProgress };
