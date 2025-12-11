/**
 * Centralized Storage Utility
 * Handles all localStorage operations with error handling and type safety
 */

import { STORAGE_KEYS } from './constants';
import { logger } from './logger';

const log = logger.app;

// =============================================================================
// CORE STORAGE FUNCTIONS
// =============================================================================

/**
 * Get an item from localStorage with JSON parsing
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if not found or error
 * @returns {any} The stored value or default
 */
export function getItem(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item);
  } catch (error) {
    log.warn(`Error reading localStorage key "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Set an item in localStorage with JSON stringification
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 * @returns {boolean} Success status
 */
export function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    log.warn(`Error writing localStorage key "${key}":`, error);
    return false;
  }
}

/**
 * Remove an item from localStorage
 * @param {string} key - Storage key
 * @returns {boolean} Success status
 */
export function removeItem(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    log.warn(`Error removing localStorage key "${key}":`, error);
    return false;
  }
}

/**
 * Check if an item exists in localStorage
 * @param {string} key - Storage key
 * @returns {boolean} Whether the key exists
 */
export function hasItem(key) {
  try {
    return localStorage.getItem(key) !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Clear all Deadblock-related items from localStorage
 * @param {string[]} preserveKeys - Keys to preserve (not delete)
 */
export function clearAll(preserveKeys = []) {
  try {
    const preserved = {};
    
    // Preserve specified keys
    preserveKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value !== null) {
        preserved[key] = value;
      }
    });
    
    // Remove all deadblock keys
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('deadblock')) {
        localStorage.removeItem(key);
      }
    });
    
    // Restore preserved keys
    Object.entries(preserved).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
    
    return true;
  } catch (error) {
    log.warn('Error clearing localStorage:', error);
    return false;
  }
}

// =============================================================================
// SETTINGS STORAGE
// =============================================================================

const DEFAULT_SETTINGS = {
  musicEnabled: true,
  sfxEnabled: true,
  vibrationEnabled: true,
  musicVolume: 30,
  sfxVolume: 50,
  showTutorialHints: true,
  reduceMotion: false,
  highContrast: false,
};

/**
 * Get all settings
 * @returns {Object} Settings object
 */
export function getSettings() {
  return getItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
}

/**
 * Update settings (merges with existing)
 * @param {Object} updates - Settings to update
 * @returns {Object} Updated settings
 */
export function updateSettings(updates) {
  const current = getSettings();
  const updated = { ...current, ...updates };
  setItem(STORAGE_KEYS.SETTINGS, updated);
  return updated;
}

/**
 * Reset settings to defaults
 * @returns {Object} Default settings
 */
export function resetSettings() {
  setItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

/**
 * Get a specific setting
 * @param {string} key - Setting key
 * @param {any} defaultValue - Default if not found
 * @returns {any} Setting value
 */
export function getSetting(key, defaultValue = null) {
  const settings = getSettings();
  return settings[key] ?? defaultValue;
}

/**
 * Set a specific setting
 * @param {string} key - Setting key
 * @param {any} value - Setting value
 */
export function setSetting(key, value) {
  updateSettings({ [key]: value });
}

// =============================================================================
// PWA STORAGE
// =============================================================================

/**
 * Check if PWA install prompt was dismissed
 * @returns {boolean}
 */
export function isPWADismissed() {
  return hasItem(STORAGE_KEYS.PWA_DISMISSED);
}

/**
 * Mark PWA install prompt as dismissed
 */
export function dismissPWAPrompt() {
  setItem(STORAGE_KEYS.PWA_DISMISSED, Date.now());
}

/**
 * Check if app was installed as PWA
 * @returns {boolean}
 */
export function isPWAInstalled() {
  return getItem(STORAGE_KEYS.PWA_INSTALLED, false) === true;
}

/**
 * Mark app as installed
 */
export function markPWAInstalled() {
  setItem(STORAGE_KEYS.PWA_INSTALLED, true);
}

// =============================================================================
// GAME STATE STORAGE
// =============================================================================

/**
 * Get pending online intent (set before OAuth redirect)
 * @returns {boolean}
 */
export function hasPendingOnlineIntent() {
  return getItem(STORAGE_KEYS.PENDING_ONLINE_INTENT, false) === true;
}

/**
 * Set pending online intent
 * @param {boolean} value
 */
export function setPendingOnlineIntent(value) {
  if (value) {
    setItem(STORAGE_KEYS.PENDING_ONLINE_INTENT, true);
  } else {
    removeItem(STORAGE_KEYS.PENDING_ONLINE_INTENT);
  }
}

/**
 * Clear pending online intent
 */
export function clearPendingOnlineIntent() {
  removeItem(STORAGE_KEYS.PENDING_ONLINE_INTENT);
}

/**
 * Check if tutorial was completed
 * @returns {boolean}
 */
export function isTutorialCompleted() {
  return getItem(STORAGE_KEYS.TUTORIAL_COMPLETED, false) === true;
}

/**
 * Mark tutorial as completed
 */
export function completeTutorial() {
  setItem(STORAGE_KEYS.TUTORIAL_COMPLETED, true);
}

/**
 * Update last played timestamp
 */
export function updateLastPlayed() {
  setItem(STORAGE_KEYS.LAST_PLAYED, Date.now());
}

/**
 * Get last played timestamp
 * @returns {number|null}
 */
export function getLastPlayed() {
  return getItem(STORAGE_KEYS.LAST_PLAYED, null);
}

// =============================================================================
// AUTH STORAGE (for clearing on sign out)
// =============================================================================

/**
 * Clear all auth-related storage (for sign out)
 */
export function clearAuthStorage() {
  try {
    // Remove Deadblock auth data
    removeItem(STORAGE_KEYS.PENDING_ONLINE_INTENT);
    
    // Remove all Supabase auth data
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    });
    
    return true;
  } catch (error) {
    log.warn('Error clearing auth storage:', error);
    return false;
  }
}

// =============================================================================
// STORAGE INFO
// =============================================================================

/**
 * Get storage usage info
 * @returns {Object} Storage info
 */
export function getStorageInfo() {
  try {
    let totalSize = 0;
    const items = {};
    
    Object.keys(localStorage).forEach(key => {
      const value = localStorage.getItem(key);
      const size = new Blob([value]).size;
      totalSize += size;
      
      if (key.startsWith('deadblock')) {
        items[key] = {
          size,
          sizeFormatted: formatBytes(size),
        };
      }
    });
    
    return {
      totalSize,
      totalSizeFormatted: formatBytes(totalSize),
      itemCount: Object.keys(items).length,
      items,
    };
  } catch (error) {
    return { totalSize: 0, itemCount: 0, items: {} };
  }
}

/**
 * Format bytes to human readable string
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// =============================================================================
// EXPORTS
// =============================================================================

export const storage = {
  // Core
  get: getItem,
  set: setItem,
  remove: removeItem,
  has: hasItem,
  clearAll,
  
  // Settings
  getSettings,
  updateSettings,
  resetSettings,
  getSetting,
  setSetting,
  
  // PWA
  isPWADismissed,
  dismissPWAPrompt,
  isPWAInstalled,
  markPWAInstalled,
  
  // Game state
  hasPendingOnlineIntent,
  setPendingOnlineIntent,
  clearPendingOnlineIntent,
  isTutorialCompleted,
  completeTutorial,
  updateLastPlayed,
  getLastPlayed,
  
  // Auth
  clearAuthStorage,
  
  // Info
  getStorageInfo,
};

export default storage;
