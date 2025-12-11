import { RotateCw, FlipHorizontal, RefreshCw, Check, X, Loader, RotateCcw } from 'lucide-react';
import { soundManager } from '../utils/soundManager';

const ControlButtons = ({
  selectedPiece,
  pendingMove,
  canConfirm,
  gameOver,
  gameMode,
  currentPlayer,
  isGeneratingPuzzle,
  onRotate,
  onFlip,
  onConfirm,
  onCancel,
  onReset,
  onRetryPuzzle,
  hideResetButtons = false  // New prop to hide reset/retry for speed mode
}) => {
  const isPlayerTurn = !((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2);
  const hasSelection = selectedPiece || pendingMove;
  const isPuzzleMode = gameMode === 'puzzle';

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

  return (
    <div className="flex gap-1 justify-between mt-2 flex-wrap">
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
                      <span className="hidden sm:inline">RETRY</span>
                    </button>
                  )}
                  {onReset && (
                    <button
                      onClick={handleReset}
                      className="flex-1 px-1.5 py-1.5 bg-slate-700/70 hover:bg-slate-600/70 text-white rounded-lg text-xs flex items-center justify-center gap-1 border border-slate-500/30 shadow-[0_0_10px_rgba(100,116,139,0.3)]"
                      title="Generate a new puzzle"
                    >
                      <RefreshCw size={12} />
                      <span className="hidden sm:inline">NEW</span>
                    </button>
                  )}
                </>
              ) : (
                /* Non-puzzle mode: Just show reset */
                onReset && (
                  <button
                    onClick={handleReset}
                    className="flex-1 px-1.5 py-1.5 bg-slate-700/70 hover:bg-slate-600/70 text-white rounded-lg text-xs flex items-center justify-center gap-1 border border-slate-500/30 shadow-[0_0_10px_rgba(100,116,139,0.3)]"
                    title="Reset game"
                  >
                    <RefreshCw size={12} />
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
