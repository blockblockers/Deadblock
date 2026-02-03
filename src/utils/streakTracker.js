// streakTracker.js - Daily play streak tracking and notification scheduling
// v7.15.2 - NEW: Track consecutive days of play and send reminder notifications
//
// Features:
// - Tracks consecutive days of gameplay
// - Sends push notification reminder if streak ≥5 days and player hasn't played today
// - Respects user notification preferences
// - Stores data in localStorage for offline support
// - Can sync with database for cross-device consistency

import { notificationService } from '../services/notificationService';

const STREAK_STORAGE_KEY = 'deadblock_daily_streak';
const REMINDER_SENT_KEY = 'deadblock_streak_reminder_sent';

export const streakTracker = {
  // Get current streak data from localStorage
  getStreakData() {
    try {
      const data = localStorage.getItem(STREAK_STORAGE_KEY);
      return data ? JSON.parse(data) : { streak: 0, lastPlayedDate: null };
    } catch {
      return { streak: 0, lastPlayedDate: null };
    }
  },

  // Save streak data
  saveStreakData(data) {
    try {
      localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[StreakTracker] Error saving:', e);
    }
  },

  // Get today's date as YYYY-MM-DD string (in local timezone)
  getTodayString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  },

  // Get yesterday's date as YYYY-MM-DD string
  getYesterdayString() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  },

  // Record that user played today - call this after any game activity
  // (online move, puzzle solve, AI game, speed puzzle)
  recordPlay() {
    const today = this.getTodayString();
    const data = this.getStreakData();
    
    if (data.lastPlayedDate === today) {
      // Already played today, no change needed
      console.log('[StreakTracker] Already played today, streak:', data.streak);
      return data.streak;
    }
    
    if (data.lastPlayedDate === this.getYesterdayString()) {
      // Played yesterday, increment streak
      data.streak += 1;
      console.log('[StreakTracker] Streak continued! Now at:', data.streak);
    } else {
      // Streak broken or new streak starting
      data.streak = 1;
      console.log('[StreakTracker] New streak started');
    }
    
    data.lastPlayedDate = today;
    this.saveStreakData(data);
    
    // Clear reminder sent flag since they played
    localStorage.removeItem(REMINDER_SENT_KEY);
    
    return data.streak;
  },

  // Check if streak is at risk and should send reminder
  // Call this on app load (after auth is ready)
  checkAndRemind() {
    const data = this.getStreakData();
    const today = this.getTodayString();
    const yesterday = this.getYesterdayString();
    
    console.log('[StreakTracker] Checking streak:', data);
    
    // Only remind if streak is 5+ days
    if (data.streak < 5) {
      console.log('[StreakTracker] Streak < 5, no reminder needed');
      return false;
    }
    
    // Don't remind if already played today
    if (data.lastPlayedDate === today) {
      console.log('[StreakTracker] Already played today, no reminder needed');
      return false;
    }
    
    // If last played wasn't yesterday, streak is already broken
    if (data.lastPlayedDate !== yesterday) {
      console.log('[StreakTracker] Streak already broken (missed yesterday)');
      // Reset streak since they missed yesterday
      this.saveStreakData({ streak: 0, lastPlayedDate: null });
      return false;
    }
    
    // Check if we already sent reminder today
    const reminderSentDate = localStorage.getItem(REMINDER_SENT_KEY);
    if (reminderSentDate === today) {
      console.log('[StreakTracker] Reminder already sent today');
      return false;
    }
    
    // Check if streak reminders are enabled in user preferences
    try {
      const prefs = JSON.parse(localStorage.getItem('deadblock_notification_prefs') || '{}');
      if (prefs.streakReminder === false) {
        console.log('[StreakTracker] Streak reminders disabled in preferences');
        return false;
      }
    } catch (e) {
      // Default to enabled if can't read prefs
    }
    
    // Send the reminder!
    console.log('[StreakTracker] Sending streak reminder for', data.streak, 'day streak');
    
    if (notificationService.isEnabled()) {
      notificationService.notifyStreakReminder(data.streak);
      
      // Mark reminder as sent for today
      localStorage.setItem(REMINDER_SENT_KEY, today);
      return true;
    }
    
    return false;
  },

  // Get current valid streak (for display purposes)
  getCurrentStreak() {
    const data = this.getStreakData();
    const today = this.getTodayString();
    const yesterday = this.getYesterdayString();
    
    // If last played was today or yesterday, streak is valid
    if (data.lastPlayedDate === today || data.lastPlayedDate === yesterday) {
      return data.streak;
    }
    
    // Streak is broken
    return 0;
  },

  // Check if streak is at risk (played yesterday but not today)
  isStreakAtRisk() {
    const data = this.getStreakData();
    const today = this.getTodayString();
    const yesterday = this.getYesterdayString();
    
    return data.streak >= 5 && 
           data.lastPlayedDate === yesterday && 
           data.lastPlayedDate !== today;
  },

  // Get streak status for UI display
  getStreakStatus() {
    const data = this.getStreakData();
    const today = this.getTodayString();
    const yesterday = this.getYesterdayString();
    
    return {
      streak: this.getCurrentStreak(),
      playedToday: data.lastPlayedDate === today,
      atRisk: this.isStreakAtRisk(),
      lastPlayedDate: data.lastPlayedDate
    };
  }
};

export default streakTracker;
