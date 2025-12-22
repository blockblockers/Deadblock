import { RotateCw, FlipHorizontal, RefreshCw, Check, X, Loader, RotateCcw, Home, Flag, XCircle } from 'lucide-react';
import { soundManager } from '../utils/soundManager';

// Glow Orb Button Component - consistent styling across all game screens
const GlowOrbButton = ({ onClick, disabled, children, color = 'cyan', className = '', title = '' }) => {
  const colorClasses = {
    cyan: 'from-cyan-500 to-blue-600 shadow-[0_0_15px_rgba(34,211,238,0.4)] hover:shadow-[0_0_25px_rgba(34,211,238,0.6)]',
    amber: 'from-amber-500 to-orange-600 shadow-[0_0_15px_rgba(251,191,36,0.4)] hover:shadow-[0_0_25px_rgba(251,191,36,0.6)]',
    green: 'from-green-500 to-emerald-600 shadow-[0_0_15px_rgba(34,197,94,0.4)] hover:shadow-[0_0_25px_rgba(34,197,94,0.6)]',
    red: 'from-red-500 to-rose-600 shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:shadow-[0_0_25px_rgba(239,68,68,0.6)]',
    purple: 'from-purple-500 to-violet-600 shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)]',
    indigo: 'from-indigo-500 to-blue-600 shadow-[0_0_15px_rgba(99,102,241,0.4)] hover:shadow-[0_0_25px_rgba(99,102,241,0.6)]',
    slate: 'from-slate-600 to-slate-700 shadow-[0_0_10px_rgba(100,116,139,0.3)] hover:shadow-[0_0_15px_rgba(100,116,139,0.5)]',
    rose: 'from-rose-500 to-pink-600 shadow-[0_0_15px_rgba(244,63,94,0.4)] hover:shadow-[0_0_25px_rgba(244,63,94,0.6)]',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        bg-gradient-to-r ${colorClasses[color]}
        text-white font-bold rounded-xl px-3 py-2 text-xs
        transition-all duration-200
        hover:scale-105 active:scale-95
        disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none
        flex items-center justify-center gap-1
        ${className}
      `}
    >
      {children}
    </button>
  );
};

const ControlButtons = ({
  selectedPiece,
  pendingMove,
  canConfirm,
  gameOver,
  gameMode,
  currentPlayer,
  isGeneratingPuzzle,
  moveCount = 0,
  onRotate,
  onFlip,
  onConfirm,
  onCancel,
  onReset,
  onRetryPuzzle,
  onMenu,
  onQuitGame,
  hideResetButtons = false
}) => {
  const isPlayerTurn = !((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2);
  const hasSelection = selectedPiece || pendingMove;
  const isPuzzleMode = gameMode === 'puzzle';
  const isOnlineMultiplayer = gameMode === 'online';
  const hasMovesMade = moveCount > 0;

  const handleReset = () => {
    soundManager.playButtonClick();
    if (onReset) onReset();
  };

  const handleRetry = () => {
    soundManager.playButtonClick();
    if (onRetryPuzzle) {
      onRetryPuzzle();
    }
  };

  const handleMenu = () => {
    soundManager.playButtonClick();
    if (onMenu) onMenu();
  };

  const handleQuitGame = () => {
    soundManager.playButtonClick();
    if (onQuitGame) onQuitGame(hasMovesMade);
  };

  return (
    <div className="flex gap-2 justify-between mt-2 flex-wrap">
      {/* Menu Button - Rose/Pink color for visibility */}
      {onMenu && (
        <GlowOrbButton onClick={handleMenu} color="rose" title="Back to menu">
          <Home size={14} />
          <span className="hidden sm:inline">HOME</span>
        </GlowOrbButton>
      )}

      {/* Quit/Forfeit Button - Only for online multiplayer, not when game is over */}
      {onQuitGame && isOnlineMultiplayer && !gameOver && (
        <GlowOrbButton 
          onClick={handleQuitGame} 
          color={hasMovesMade ? 'red' : 'amber'}
          title={hasMovesMade ? "Forfeit game (counts as loss)" : "Cancel game (no stats recorded)"}
        >
          {hasMovesMade ? (
            <>
              <Flag size={14} />
              <span className="hidden sm:inline">FORFEIT</span>
            </>
          ) : (
            <>
              <XCircle size={14} />
              <span className="hidden sm:inline">QUIT</span>
            </>
          )}
        </GlowOrbButton>
      )}

      {/* Rotate Button */}
      <GlowOrbButton
        onClick={onRotate}
        disabled={!hasSelection || gameOver || !isPlayerTurn || isGeneratingPuzzle}
        color="cyan"
        className="flex-1"
      >
        <RotateCw size={14} />ROTATE
      </GlowOrbButton>

      {/* Flip Button */}
      <GlowOrbButton
        onClick={onFlip}
        disabled={!hasSelection || gameOver || !isPlayerTurn || isGeneratingPuzzle}
        color="purple"
        className="flex-1"
      >
        <FlipHorizontal size={14} />FLIP
      </GlowOrbButton>

      {/* Confirm/Cancel when pending move is valid */}
      {pendingMove && canConfirm && !isGeneratingPuzzle && (
        <>
          <GlowOrbButton
            onClick={onCancel}
            color="slate"
            className="flex-1"
          >
            <X size={14} />CANCEL
          </GlowOrbButton>
          <GlowOrbButton
            onClick={onConfirm}
            color="green"
            className="flex-1"
          >
            <Check size={14} />CONFIRM
          </GlowOrbButton>
        </>
      )}

      {/* Cancel only when pending move is invalid, or Reset when no pending */}
      {(!pendingMove || !canConfirm) && !isGeneratingPuzzle && (
        <>
          {pendingMove && (
            <GlowOrbButton
              onClick={onCancel}
              color="slate"
              className="flex-1"
            >
              <X size={14} />CANCEL
            </GlowOrbButton>
          )}
          {!pendingMove && !hideResetButtons && (
            <>
              {isPuzzleMode ? (
                <>
                  {onRetryPuzzle && (
                    <GlowOrbButton
                      onClick={handleRetry}
                      color="cyan"
                      className="flex-1"
                      title="Retry this puzzle from the beginning"
                    >
                      <RotateCcw size={14} />RETRY
                    </GlowOrbButton>
                  )}
                  {onReset && (
                    <GlowOrbButton
                      onClick={handleReset}
                      color="slate"
                      className="flex-1"
                      title="Generate a new puzzle"
                    >
                      <RefreshCw size={14} />NEW
                    </GlowOrbButton>
                  )}
                </>
              ) : (
                onReset && (
                  <GlowOrbButton
                    onClick={handleReset}
                    color="slate"
                    className="flex-1"
                    title="Reset game"
                  >
                    <RefreshCw size={14} />RESET
                  </GlowOrbButton>
                )
              )}
            </>
          )}
        </>
      )}

      {/* Loading state when generating puzzle */}
      {isGeneratingPuzzle && (
        <div className="flex-1 px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-[0_0_15px_rgba(34,211,238,0.5)]">
          <Loader size={14} className="animate-spin" />
          <span>GENERATING...</span>
        </div>
      )}
    </div>
  );
};

export default ControlButtons;
