import { RotateCw, FlipHorizontal, RefreshCw, Check, X, Loader, RotateCcw, Home, Flag, XCircle } from 'lucide-react';
import { soundManager } from '../utils/soundManager';

const ControlButtons = ({
  selectedPiece,
  pendingMove,
  canConfirm,
  gameOver,
  gameMode,
  currentPlayer,
  isGeneratingPuzzle,
  moveCount = 0,  // Number of moves made (for quit vs forfeit)
  onRotate,
  onFlip,
  onConfirm,
  onCancel,
  onReset,
  onRetryPuzzle,
  onMenu,
  onQuitGame,  // Handler for quit/forfeit
  hideResetButtons = false  // Hide reset/retry for speed mode
}) => {
  const isPlayerTurn = !((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2);
  const hasSelection = selectedPiece || pendingMove;
  const isPuzzleMode = gameMode === 'puzzle';
  const isOnlineMultiplayer = gameMode === 'online';  // Only online games need quit/forfeit
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
    <div className="flex gap-1 justify-between mt-2 flex-wrap">
      {/* Menu Button - Cyberpunk style */}
      {onMenu && (
        <button
          onClick={handleMenu}
          className="px-2 py-1.5 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-slate-300 rounded-lg text-xs flex items-center justify-center gap-1 border border-slate-500/50 shadow-[0_0_10px_rgba(100,116,139,0.3)] transition-all active:scale-95"
          title="Back to menu"
        >
          <Home size={14} className="text-cyan-400" />
          <span className="hidden sm:inline text-cyan-400 font-bold">MENU</span>
        </button>
      )}

      {/* Quit/Forfeit Button - Only for online multiplayer, not when game is over */}
      {onQuitGame && isOnlineMultiplayer && !gameOver && (
        <button
          onClick={handleQuitGame}
          className={`px-2 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 border transition-all active:scale-95 ${
            hasMovesMade 
              ? 'bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700 text-red-200 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
              : 'bg-gradient-to-r from-amber-900 to-orange-900 hover:from-amber-800 hover:to-orange-800 text-amber-200 border-amber-500/50 shadow-[0_0_10px_rgba(251,191,36,0.3)]'
          }`}
          title={hasMovesMade ? "Forfeit game (counts as loss)" : "Cancel game (no stats recorded)"}
        >
          {hasMovesMade ? (
            <>
              <Flag size={14} />
              <span className="hidden sm:inline font-bold">FORFEIT</span>
            </>
          ) : (
            <>
              <XCircle size={14} />
              <span className="hidden sm:inline font-bold">QUIT</span>
            </>
          )}
        </button>
      )}

      {/* Rotate Button */}
      <button
        onClick={onRotate}
        className="flex-1 px-1.5 py-1.5 bg-purple-600/70 hover:bg-purple-500/70 text-white rounded-lg text-xs flex items-center justify-center gap-1 disabled:opacity-30 border border-purple-400/30 shadow-[0_0_10px_rgba(168,85,247,0.4)]"
        disabled={!hasSelection || gameOver || !isPlayerTurn || isGeneratingPuzzle}
      >
        <RotateCw size={12} />ROTATE
      </button>

      {/* Flip Button */}
      <button
        onClick={onFlip}
        className="flex-1 px-1.5 py-1.5 bg-indigo-600/70 hover:bg-indigo-500/70 text-white rounded-lg text-xs flex items-center justify-center gap-1 disabled:opacity-30 border border-indigo-400/30 shadow-[0_0_10px_rgba(99,102,241,0.4)]"
        disabled={!hasSelection || gameOver || !isPlayerTurn || isGeneratingPuzzle}
      >
        <FlipHorizontal size={12} />FLIP
      </button>

      {/* Confirm/Cancel when pending move is valid */}
      {pendingMove && canConfirm && !isGeneratingPuzzle && (
        <>
          <button
            onClick={onConfirm}
            className="flex-1 px-1.5 py-1.5 bg-green-600/70 hover:bg-green-500/70 text-white rounded-lg text-xs flex items-center justify-center gap-1 font-bold border border-green-400/30 shadow-[0_0_15px_rgba(74,222,128,0.5)]"
          >
            <Check size={12} />CONFIRM
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-1.5 py-1.5 bg-red-600/70 hover:bg-red-500/70 text-white rounded-lg text-xs flex items-center justify-center gap-1 border border-red-400/30 shadow-[0_0_10px_rgba(239,68,68,0.4)]"
          >
            <X size={12} />CANCEL
          </button>
        </>
      )}

      {/* Cancel only when pending move is invalid, or Reset when no pending */}
      {(!pendingMove || !canConfirm) && !isGeneratingPuzzle && (
        <>
          {pendingMove && (
            <button
              onClick={onCancel}
              className="flex-1 px-1.5 py-1.5 bg-red-600/70 hover:bg-red-500/70 text-white rounded-lg text-xs flex items-center justify-center gap-1 border border-red-400/30 shadow-[0_0_10px_rgba(239,68,68,0.4)]"
            >
              <X size={12} />CANCEL
            </button>
          )}
          {!pendingMove && !hideResetButtons && (
            <>
              {/* Puzzle mode: Show RETRY and NEW buttons */}
              {isPuzzleMode ? (
                <>
                  {onRetryPuzzle && (
                    <button
                      onClick={handleRetry}
                      className="flex-1 px-1.5 py-1.5 bg-cyan-600/70 hover:bg-cyan-500/70 text-white rounded-lg text-xs flex items-center justify-center gap-1 border border-cyan-400/30 shadow-[0_0_10px_rgba(34,211,238,0.4)]"
                      title="Retry this puzzle from the beginning"
                    >
                      <RotateCcw size={12} />
                      <span>RETRY</span>
                    </button>
                  )}
                  {onReset && (
                    <button
                      onClick={handleReset}
                      className="flex-1 px-1.5 py-1.5 bg-slate-700/70 hover:bg-slate-600/70 text-white rounded-lg text-xs flex items-center justify-center gap-1 border border-slate-500/30 shadow-[0_0_10px_rgba(100,116,139,0.3)]"
                      title="Generate a new puzzle"
                    >
                      <RefreshCw size={12} />
                      <span>NEW</span>
                    </button>
                  )}
                </>
              ) : (
                /* Non-puzzle mode: Show reset with RESET text */
                onReset && (
                  <button
                    onClick={handleReset}
                    className="flex-1 px-1.5 py-1.5 bg-slate-700/70 hover:bg-slate-600/70 text-white rounded-lg text-xs flex items-center justify-center gap-1 border border-slate-500/30 shadow-[0_0_10px_rgba(100,116,139,0.3)]"
                    title="Reset game"
                  >
                    <RefreshCw size={12} />
                    <span>RESET</span>
                  </button>
                )
              )}
            </>
          )}
        </>
      )}

      {/* Loading state when generating puzzle */}
      {isGeneratingPuzzle && (
        <div className="flex-1 px-1.5 py-1.5 bg-cyan-600/70 text-white rounded-lg text-xs flex items-center justify-center gap-1 border border-cyan-400/30 shadow-[0_0_15px_rgba(34,211,238,0.5)]">
          <Loader size={12} className="animate-spin" />
          <span>GENERATING...</span>
        </div>
      )}
    </div>
  );
};

export default ControlButtons;
