/**
 * Shared PropTypes Definitions
 * 
 * Centralized prop type definitions for reuse across components.
 * Import these instead of redefining the same shapes in every component.
 * 
 * @example
 * import { GamePropTypes, UserPropTypes } from '../utils/propTypes';
 * 
 * MyComponent.propTypes = {
 *   user: UserPropTypes.profile,
 *   game: GamePropTypes.state,
 * };
 */

import PropTypes from 'prop-types';

// =============================================================================
// GAME RELATED PROP TYPES
// =============================================================================

/**
 * A single cell on the game board
 */
const cellShape = PropTypes.shape({
  player: PropTypes.oneOf([null, 1, 2]),
  pieceId: PropTypes.string,
});

/**
 * Game board - 8x8 grid of cells
 */
const boardShape = PropTypes.arrayOf(
  PropTypes.arrayOf(cellShape)
);

/**
 * A pentomino piece definition
 */
const pieceShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string,
  shape: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
  color: PropTypes.string,
});

/**
 * Piece placement on board
 */
const boardPieceShape = PropTypes.shape({
  pieceId: PropTypes.string.isRequired,
  player: PropTypes.oneOf([1, 2]).isRequired,
  position: PropTypes.shape({
    row: PropTypes.number.isRequired,
    col: PropTypes.number.isRequired,
  }).isRequired,
  shape: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
});

/**
 * A move in the game history
 */
const moveShape = PropTypes.shape({
  player: PropTypes.oneOf([1, 2]).isRequired,
  pieceId: PropTypes.string.isRequired,
  position: PropTypes.shape({
    row: PropTypes.number.isRequired,
    col: PropTypes.number.isRequired,
  }).isRequired,
  rotation: PropTypes.number,
  flipped: PropTypes.bool,
  timestamp: PropTypes.number,
});

/**
 * Pending move waiting for confirmation
 */
const pendingMoveShape = PropTypes.shape({
  piece: pieceShape.isRequired,
  position: PropTypes.shape({
    row: PropTypes.number.isRequired,
    col: PropTypes.number.isRequired,
  }).isRequired,
  rotation: PropTypes.number,
  flipped: PropTypes.bool,
});

/**
 * Puzzle definition
 */
const puzzleShape = PropTypes.shape({
  id: PropTypes.string,
  board: boardShape,
  boardPieces: PropTypes.arrayOf(boardPieceShape),
  remainingPieces: PropTypes.arrayOf(pieceShape),
  movesRemaining: PropTypes.number,
  difficulty: PropTypes.oneOf(['easy', 'medium', 'hard', 'expert']),
  seed: PropTypes.number,
});

/**
 * Game state export
 */
export const GamePropTypes = {
  cell: cellShape,
  board: boardShape,
  piece: pieceShape,
  boardPiece: boardPieceShape,
  move: moveShape,
  pendingMove: pendingMoveShape,
  puzzle: puzzleShape,
  
  // Common prop combinations
  gameMode: PropTypes.oneOf([
    null,
    'ai',
    '2player',
    'puzzle',
    'speed-puzzle',
    'weekly-game',
    'weekly-menu',
    'weekly-leaderboard',
    'puzzle-select',
    'difficulty-select',
    'online-menu',
    'online-game',
    'matchmaking',
    'auth',
    'profile',
    'leaderboard',
    'spectate',
    'replay',
  ]),
  
  aiDifficulty: PropTypes.oneOf(['easy', 'medium', 'hard', 'expert']),
  
  player: PropTypes.oneOf([1, 2]),
  
  winner: PropTypes.oneOf([null, 1, 2, 'draw']),
};

// =============================================================================
// USER RELATED PROP TYPES
// =============================================================================

/**
 * User profile from Supabase
 */
const profileShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  username: PropTypes.string,
  display_name: PropTypes.string,
  avatar_url: PropTypes.string,
  rating: PropTypes.number,
  games_played: PropTypes.number,
  games_won: PropTypes.number,
  created_at: PropTypes.string,
  updated_at: PropTypes.string,
});

/**
 * Authentication state
 */
const authStateShape = PropTypes.shape({
  user: PropTypes.object,
  profile: profileShape,
  isAuthenticated: PropTypes.bool,
  isLoading: PropTypes.bool,
  error: PropTypes.string,
});

/**
 * Player stats
 */
const statsShape = PropTypes.shape({
  gamesPlayed: PropTypes.number,
  gamesWon: PropTypes.number,
  gamesLost: PropTypes.number,
  winRate: PropTypes.number,
  currentStreak: PropTypes.number,
  bestStreak: PropTypes.number,
  totalMoves: PropTypes.number,
  averageMovesPerGame: PropTypes.number,
  puzzlesCompleted: PropTypes.number,
  bestPuzzleTime: PropTypes.number,
});

/**
 * Achievement definition
 */
const achievementShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  icon: PropTypes.string,
  rarity: PropTypes.oneOf(['common', 'uncommon', 'rare', 'epic', 'legendary']),
  unlocked: PropTypes.bool,
  unlockedAt: PropTypes.string,
  progress: PropTypes.number,
  target: PropTypes.number,
});

/**
 * Rating tier
 */
const ratingTierShape = PropTypes.shape({
  name: PropTypes.string.isRequired,
  minRating: PropTypes.number.isRequired,
  maxRating: PropTypes.number,
  color: PropTypes.string.isRequired,
  icon: PropTypes.string,
});

export const UserPropTypes = {
  profile: profileShape,
  authState: authStateShape,
  stats: statsShape,
  achievement: achievementShape,
  ratingTier: ratingTierShape,
  
  // Common ID types
  odingerId: PropTypes.string,
};

// =============================================================================
// ONLINE/MULTIPLAYER PROP TYPES
// =============================================================================

/**
 * Online game state
 */
const onlineGameShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  status: PropTypes.oneOf(['waiting', 'active', 'completed', 'abandoned']),
  player1_id: PropTypes.string,
  player2_id: PropTypes.string,
  current_player: PropTypes.oneOf([1, 2]),
  board_state: PropTypes.object,
  winner_id: PropTypes.string,
  created_at: PropTypes.string,
  updated_at: PropTypes.string,
});

/**
 * Match info from matchmaking
 */
const matchInfoShape = PropTypes.shape({
  gameId: PropTypes.string.isRequired,
  opponentId: PropTypes.string.isRequired,
  opponentName: PropTypes.string,
  opponentRating: PropTypes.number,
  playerNumber: PropTypes.oneOf([1, 2]).isRequired,
});

/**
 * Leaderboard entry
 */
const leaderboardEntryShape = PropTypes.shape({
  rank: PropTypes.number.isRequired,
  userId: PropTypes.string.isRequired,
  username: PropTypes.string.isRequired,
  rating: PropTypes.number.isRequired,
  gamesPlayed: PropTypes.number,
  winRate: PropTypes.number,
});

export const OnlinePropTypes = {
  game: onlineGameShape,
  matchInfo: matchInfoShape,
  leaderboardEntry: leaderboardEntryShape,
};

// =============================================================================
// WEEKLY CHALLENGE PROP TYPES
// =============================================================================

/**
 * Weekly challenge definition
 */
const weeklyChallengeShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  week_number: PropTypes.number.isRequired,
  year: PropTypes.number.isRequired,
  seed: PropTypes.number.isRequired,
  difficulty: PropTypes.oneOf(['easy', 'medium', 'hard', 'expert']),
  starts_at: PropTypes.string.isRequired,
  ends_at: PropTypes.string.isRequired,
  puzzle_config: PropTypes.object,
});

/**
 * Weekly challenge submission
 */
const weeklySubmissionShape = PropTypes.shape({
  id: PropTypes.string,
  challenge_id: PropTypes.string.isRequired,
  user_id: PropTypes.string.isRequired,
  time_ms: PropTypes.number.isRequired,
  attempts: PropTypes.number,
  completed_at: PropTypes.string,
});

export const WeeklyPropTypes = {
  challenge: weeklyChallengeShape,
  submission: weeklySubmissionShape,
};

// =============================================================================
// UI COMPONENT PROP TYPES
// =============================================================================

/**
 * Common button props
 */
const buttonPropsShape = {
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'ghost']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  fullWidth: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};

/**
 * Modal props
 */
const modalPropsShape = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node,
  showCloseButton: PropTypes.bool,
  closeOnOverlayClick: PropTypes.bool,
  className: PropTypes.string,
};

/**
 * Common navigation props
 */
const navigationPropsShape = {
  onBack: PropTypes.func,
  onMenu: PropTypes.func,
  onClose: PropTypes.func,
};

export const UIPropTypes = {
  button: PropTypes.shape(buttonPropsShape),
  modal: PropTypes.shape(modalPropsShape),
  navigation: PropTypes.shape(navigationPropsShape),
  
  // Individual props for spreading
  buttonProps: buttonPropsShape,
  modalProps: modalPropsShape,
  navigationProps: navigationPropsShape,
  
  // Common prop types
  children: PropTypes.node,
  className: PropTypes.string,
  style: PropTypes.object,
  id: PropTypes.string,
  testId: PropTypes.string,
};

// =============================================================================
// CALLBACK PROP TYPES
// =============================================================================

/**
 * Common callback function types
 */
export const CallbackPropTypes = {
  // No arguments
  onAction: PropTypes.func,
  onBack: PropTypes.func,
  onClose: PropTypes.func,
  onMenu: PropTypes.func,
  onCancel: PropTypes.func,
  onConfirm: PropTypes.func,
  onReset: PropTypes.func,
  
  // With event
  onClick: PropTypes.func,
  onChange: PropTypes.func,
  onSubmit: PropTypes.func,
  
  // With data
  onSelect: PropTypes.func,
  onUpdate: PropTypes.func,
  onError: PropTypes.func,
  onSuccess: PropTypes.func,
  onComplete: PropTypes.func,
};

// =============================================================================
// AUDIO PROP TYPES
// =============================================================================

export const AudioPropTypes = {
  volume: PropTypes.number,
  muted: PropTypes.bool,
  enabled: PropTypes.bool,
  soundEffect: PropTypes.oneOf([
    'move',
    'capture',
    'invalid',
    'win',
    'lose',
    'draw',
    'click',
    'hover',
    'notification',
    'countdown',
    'achievement',
  ]),
};

// =============================================================================
// SETTINGS PROP TYPES
// =============================================================================

const settingsShape = PropTypes.shape({
  soundEnabled: PropTypes.bool,
  musicEnabled: PropTypes.bool,
  soundVolume: PropTypes.number,
  musicVolume: PropTypes.number,
  vibrationEnabled: PropTypes.bool,
  showMoveHints: PropTypes.bool,
  showValidMoves: PropTypes.bool,
  autoRotate: PropTypes.bool,
  theme: PropTypes.oneOf(['dark', 'light', 'system']),
  reducedMotion: PropTypes.bool,
});

export const SettingsPropTypes = {
  settings: settingsShape,
};

// =============================================================================
// DEFAULT EXPORT - ALL PROP TYPES
// =============================================================================

export default {
  Game: GamePropTypes,
  User: UserPropTypes,
  Online: OnlinePropTypes,
  Weekly: WeeklyPropTypes,
  UI: UIPropTypes,
  Callback: CallbackPropTypes,
  Audio: AudioPropTypes,
  Settings: SettingsPropTypes,
};
