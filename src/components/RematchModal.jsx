import React, { useState, useEffect } from 'react';
import { X, Swords, Check, Loader2 } from 'lucide-react';
import { soundManager } from '../utils/soundManager';

/**
 * RematchModal - Themed modal for rematch requests
 * 
 * When a player clicks "Rematch" after game over:
 * 1. A rematch request is sent to the opponent
 * 2. This modal shows the request status
 * 3. Opponent sees the request in their game over modal
 * 4. Either player can accept to start the rematch
 */
const RematchModal = ({
  isOpen,
  onClose,
  onAccept,
  onDecline,
  isRequester,           // true if this player sent the request
  requesterName,         // Name of player who requested rematch
  isWaiting = false,     // Waiting for opponent response
  opponentAccepted = false,
  opponentDeclined = false,
  error = null,
  firstPlayerName = null, // Who goes first in the new game
}) => {
  const [dots, setDots] = useState('');
  const [hasPlayedSound, setHasPlayedSound] = useState(false);

  // Animate waiting dots
  useEffect(() => {
    if (!isWaiting) return;
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 500);
    return () => clearInterval(interval);
  }, [isWaiting]);

  // Play sound on open (only once)
  useEffect(() => {
    if (isOpen && !hasPlayedSound) {
      soundManager.playSound('notification');
      setHasPlayedSound(true);
    }
    if (!isOpen) {
      setHasPlayedSound(false);
    }
  }, [isOpen, hasPlayedSound]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
    >
      {/* Backdrop blur */}
      <div className="absolute inset-0 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-amber-500/30 shadow-2xl shadow-amber-500/20 max-w-sm w-full overflow-hidden">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-full bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-white transition-colors z-10"
        >
          <X size={20} />
        </button>

        {/* Header glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-amber-500/20 blur-3xl" />

        {/* Content */}
        <div className="relative p-6 pt-8">
          
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500/30 blur-xl rounded-full" />
              <div className="relative bg-gradient-to-br from-amber-500 to-orange-600 p-4 rounded-full">
                <Swords size={32} className="text-white" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-center text-white mb-2">
            {isRequester ? 'Rematch Requested' : 'Rematch Challenge!'}
          </h2>

          {/* Status message */}
          <div className="text-center mb-6">
            {isWaiting && !opponentAccepted && !opponentDeclined && (
              <div className="flex items-center justify-center gap-2 text-amber-400">
                <Loader2 size={20} className="animate-spin" />
                <span>Waiting for opponent{dots}</span>
              </div>
            )}
            
            {opponentAccepted && (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-green-400">
                  <Check size={20} />
                  <span>Opponent accepted!</span>
                </div>
                {firstPlayerName && (
                  <p className="text-amber-300 text-sm">
                    {firstPlayerName} goes first
                  </p>
                )}
                <p className="text-slate-400 text-sm">Starting game...</p>
              </div>
            )}
            
            {opponentDeclined && (
              <div className="text-red-400">
                Opponent declined the rematch
              </div>
            )}
            
            {error && (
              <div className="text-red-400">
                {error}
              </div>
            )}
            
            {!isRequester && !isWaiting && !opponentAccepted && !opponentDeclined && !error && (
              <p className="text-slate-300">
                <span className="text-amber-400 font-semibold">{requesterName}</span> wants a rematch!
              </p>
            )}
            
            {isRequester && !isWaiting && !opponentAccepted && !opponentDeclined && !error && (
              <p className="text-slate-300">
                Your rematch request has been sent
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            {/* Accept button (for receiver) */}
            {!isRequester && !opponentDeclined && !opponentAccepted && (
              <button
                onClick={onAccept}
                className="w-full py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-green-500/30 transition-all flex items-center justify-center gap-2"
              >
                <Check size={20} />
                Accept Rematch
              </button>
            )}

            {/* Decline button (for receiver) */}
            {!isRequester && !opponentAccepted && !opponentDeclined && (
              <button
                onClick={onDecline}
                className="w-full py-3 px-6 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <X size={20} />
                Decline
              </button>
            )}

            {/* Cancel button (for requester waiting) */}
            {isRequester && isWaiting && !opponentAccepted && !opponentDeclined && (
              <button
                onClick={onDecline}
                className="w-full py-3 px-6 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white font-medium rounded-xl transition-all"
              >
                Cancel Request
              </button>
            )}

            {/* Close button (when done) */}
            {(opponentDeclined || error) && (
              <button
                onClick={onClose}
                className="w-full py-3 px-6 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-medium rounded-xl border border-amber-500/30 transition-all"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RematchModal;
