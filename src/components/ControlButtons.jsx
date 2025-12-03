import { RotateCw, FlipHorizontal, Undo, Plus, Check, X } from 'lucide-react';
import { soundManager } from '../utils/soundManager';

const ControlButtons = ({
  selectedPiece,
  pendingMove,
  canConfirm,
  gameOver,
  gameMode,
  currentPlayer,
  moveHistoryLength,
  onRotate,
  onFlip,
  onConfirm,
  onCancel,
  onUndo,
  onReset
}) => {
  const isPlayerTurn = !((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2);
  const hasSelection = selectedPiece || pendingMove;

  const handleUndo = () => {
    soundManager.playButtonClick();
    onUndo();
  };

  const handleReset = () => {
    soundManager.playButtonClick();
    onReset();
  };

  return (
    <div className="flex gap-1 justify-between mt-2 flex-wrap">
      {/* Rotate Button */}
      <button
        onClick={onRotate}
        className="flex-1 px-1.5 py-1.5 bg-purple-600/70 hover:bg-purple-500/70 text-white rounded-lg text-xs flex items-center justify-center gap-1 disabled:opacity-30 border border-purple-400/30 shadow-[0_0_10px_rgba(168,85,247,0.4)]"
        disabled={!hasSelection || gameOver || !isPlayerTurn}
      >
        <RotateCw size={12} />ROTATE
      </button>

      {/* Flip Button */}
      <button
        onClick={onFlip}
        className="flex-1 px-1.5 py-1.5 bg-indigo-600/70 hover:bg-indigo-500/70 text-white rounded-lg text-xs flex items-center justify-center gap-1 disabled:opacity-30 border border-indigo-400/30 shadow-[0_0_10px_rgba(99,102,241,0.4)]"
        disabled={!hasSelection || gameOver || !isPlayerTurn}
      >
        <FlipHorizontal size={12} />FLIP
      </button>

      {/* Confirm/Cancel when pending move is valid */}
      {pendingMove && canConfirm && (
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

      {/* Cancel only when pending move is invalid, or Undo/Reset when no pending */}
      {(!pendingMove || !canConfirm) && (
        <>
          {pendingMove && (
            <button
              onClick={onCancel}
              className="flex-1 px-1.5 py-1.5 bg-red-600/70 hover:bg-red-500/70 text-white rounded-lg text-xs flex items-center justify-center gap-1 border border-red-400/30 shadow-[0_0_10px_rgba(239,68,68,0.4)]"
            >
              <X size={12} />CANCEL
            </button>
          )}
          {!pendingMove && (
            <>
              <button
                onClick={handleUndo}
                className="flex-1 px-1.5 py-1.5 bg-orange-600/70 hover:bg-orange-500/70 text-white rounded-lg text-xs flex items-center justify-center gap-1 disabled:opacity-30 border border-orange-400/30 shadow-[0_0_10px_rgba(251,146,60,0.4)]"
                disabled={moveHistoryLength === 0 || gameOver || !isPlayerTurn}
              >
                <Undo size={12} />
              </button>
              <button
                onClick={handleReset}
                className="flex-1 px-1.5 py-1.5 bg-slate-700/70 hover:bg-slate-600/70 text-white rounded-lg text-xs flex items-center justify-center gap-1 border border-slate-500/30 shadow-[0_0_10px_rgba(100,116,139,0.3)]"
              >
                <Plus size={12} />
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ControlButtons;