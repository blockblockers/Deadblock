/**
 * Centralized Constants for Deadblock
 * All magic numbers, strings, and configuration values in one place
 */

// =============================================================================
// GAME CONSTANTS
// =============================================================================

export const GAME = {
  BOARD_SIZE: 8,
  TOTAL_PIECES: 12,
  MIN_PIECES_FOR_PUZZLE: 3,
  MAX_PIECES_FOR_PUZZLE: 9,
};

// =============================================================================
// TIMING CONSTANTS (in milliseconds)
// =============================================================================

export const TIMING = {
  // Animation durations
  ANIMATION: {
    PIECE_PLACE: 500,
    AI_THINKING: 300,
    AI_MOVE: 600,
    SHIMMER: 800,
    EDGE_GLOW: 800,
    TRACE: 2000,
    BREATHE: 1500,
    MODAL_FADE: 300,
    BUTTON_PRESS: 100,
  },
  
  // Intervals
  INTERVAL: {
    AMBIENT_EFFECT_CHECK: 2000,
    AUTH_TIMEOUT: 5000,
    OAUTH_TIMEOUT: 8000,
    PROFILE_RETRY_BASE: 500,
    GAME_SYNC: 1000,
  },
  
  // Debounce delays
  DEBOUNCE: {
    SEARCH: 300,
    RESIZE: 150,
    INPUT: 200,
    BUTTON_CLICK: 100,
  },
  
  // Speed puzzle
  SPEED_PUZZLE: {
    TIME_PER_PUZZLE: 10000, // 10 seconds
    COUNTDOWN_WARNING: 3000,
  },
};

// =============================================================================
// STORAGE KEYS
// =============================================================================

export const STORAGE_KEYS = {
  SETTINGS: 'deadblock_settings',
  PENDING_ONLINE_INTENT: 'deadblock_pending_online_intent',
  PWA_INSTALLED: 'deadblock_pwa_installed',
  PWA_DISMISSED: 'deadblock_pwa_dismissed',
  LAST_PLAYED: 'deadblock_last_played',
  TUTORIAL_COMPLETED: 'deadblock_tutorial_completed',
};

// =============================================================================
// API & NETWORKING
// =============================================================================

export const API = {
  MAX_RETRIES: 3,
  RETRY_DELAY_BASE: 500,
  REQUEST_TIMEOUT: 10000,
  REALTIME_EVENTS_PER_SECOND: 10,
};

// =============================================================================
// AUDIO CONSTANTS
// =============================================================================

export const AUDIO = {
  DEFAULT_MUSIC_VOLUME: 0.3,
  DEFAULT_SFX_VOLUME: 0.5,
  
  FREQUENCIES: {
    BUTTON_CLICK: 600,
    PIECE_SELECT: 880,
    PIECE_ROTATE: 660,
    PIECE_FLIP: 550,
    PIECE_MOVE: 440,
    PIECE_PLACE: 523,
    CONFIRM: 700,
    CANCEL: 330,
    WIN: 880,
    LOSE: 220,
    ERROR: 220,
    NOTIFICATION: 660,
    SUCCESS: 770,
    INVALID: 180,
  },
  
  DURATIONS: {
    SHORT: 0.05,
    MEDIUM: 0.08,
    LONG: 0.1,
    EXTRA_LONG: 0.15,
    WIN: 0.2,
    LOSE: 0.3,
  },
  
  VIBRATION_PATTERNS: {
    SHORT: 20,
    MEDIUM: 40,
    LONG: 80,
    CONFIRM: [20, 40, 20],
    ERROR: [40, 20, 40],
    WIN: [80, 40, 80, 40, 160],
  },
};

// =============================================================================
// UI CONSTANTS
// =============================================================================

export const UI = {
  // Breakpoints (in pixels)
  BREAKPOINTS: {
    MOBILE: 640,
    TABLET: 768,
    DESKTOP: 1024,
    WIDE: 1280,
  },
  
  // Z-index layers
  Z_INDEX: {
    BASE: 0,
    DROPDOWN: 10,
    STICKY: 20,
    OVERLAY: 30,
    MODAL: 40,
    POPOVER: 50,
    TOAST: 60,
  },
  
  // Ambient effect probability (0-1)
  AMBIENT_EFFECT_PROBABILITY: 0.25,
  
  // Max items for lists
  MAX_ITEMS: {
    LEADERBOARD: 50,
    RECENT_GAMES: 20,
    FRIENDS: 100,
    ACHIEVEMENTS: 100,
  },
};

// =============================================================================
// VALIDATION CONSTANTS
// =============================================================================

export const VALIDATION = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Z0-9_]+$/,
  },
  PASSWORD: {
    MIN_LENGTH: 6,
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
};

// =============================================================================
// RATING & MATCHMAKING
// =============================================================================

export const RATING = {
  DEFAULT_ELO: 1000,
  K_FACTOR: 32,
  
  TIERS: {
    BRONZE: { min: 0, max: 1199, name: 'Bronze' },
    SILVER: { min: 1200, max: 1399, name: 'Silver' },
    GOLD: { min: 1400, max: 1599, name: 'Gold' },
    PLATINUM: { min: 1600, max: 1799, name: 'Platinum' },
    DIAMOND: { min: 1800, max: 1999, name: 'Diamond' },
    MASTER: { min: 2000, max: Infinity, name: 'Master' },
  },
};

// =============================================================================
// AI DIFFICULTY
// =============================================================================

export const AI_DIFFICULTY = {
  RANDOM: 'random',
  AVERAGE: 'average', 
  PROFESSIONAL: 'professional',
};

// =============================================================================
// PUZZLE DIFFICULTY
// =============================================================================

export const PUZZLE_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
};

export const PUZZLE_MOVES_REMAINING = {
  [PUZZLE_DIFFICULTY.EASY]: 3,
  [PUZZLE_DIFFICULTY.MEDIUM]: 5,
  [PUZZLE_DIFFICULTY.HARD]: 7,
};

// =============================================================================
// GAME MODES
// =============================================================================

export const GAME_MODES = {
  MENU: null,
  AI: 'ai',
  PUZZLE: 'puzzle',
  TWO_PLAYER: '2player',
  ONLINE: 'online',
  SPEED_PUZZLE: 'speed-puzzle',
  WEEKLY_CHALLENGE: 'weekly-challenge',
};

// =============================================================================
// EVENT NAMES (for custom events)
// =============================================================================

export const EVENTS = {
  GAME_OVER: 'deadblock:gameOver',
  PIECE_PLACED: 'deadblock:piecePlaced',
  ACHIEVEMENT_UNLOCKED: 'deadblock:achievementUnlocked',
  MATCH_FOUND: 'deadblock:matchFound',
  TURN_CHANGED: 'deadblock:turnChanged',
};

// =============================================================================
// ERROR CODES
// =============================================================================

export const ERROR_CODES = {
  // Supabase errors
  NOT_FOUND: 'PGRST116',
  UNAUTHORIZED: '401',
  FORBIDDEN: '403',
  
  // Custom errors
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  TIMEOUT: 'TIMEOUT',
  NETWORK_ERROR: 'NETWORK_ERROR',
};

export default {
  GAME,
  TIMING,
  STORAGE_KEYS,
  API,
  AUDIO,
  UI,
  VALIDATION,
  RATING,
  AI_DIFFICULTY,
  PUZZLE_DIFFICULTY,
  PUZZLE_MOVES_REMAINING,
  GAME_MODES,
  EVENTS,
  ERROR_CODES,
};
