// Weekly Challenge Screen - Timed puzzle gameplay for weekly challenges
import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, Trophy, ArrowLeft, RotateCcw, Play, CheckCircle, X } from 'lucide-react';
import GameBoard from './GameBoard';
import PieceTray from './PieceTray';
import ControlButtons from './ControlButtons';
import DPad from './DPad';
import { useGameState } from '../hooks/useGameState';
import { soundManager } from '../utils/soundManager';
import { weeklyChallengeService } from '../services/weeklyChallengeService';
import { useAuth } from '../contexts/AuthContext';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { getSeededPuzzle } from '../utils/puzzleGenerator';
import { PUZZLE_DIFFICULTY } from '../utils/puzzleGenerator';

// Timer display component - RED THEME
const TimerDisplay = ({ elapsedMs, isPaused }) => {
  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hundredths = Math.floor((ms % 1000) / 10);
    
    return (
      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-mono font-black text-red-300">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
        <span className="text-xl font-mono text-red-400/70">
          .{hundredths.toString().padStart(2, '0')}
        </span>
      </div>
    );
  };
  
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-2 mb-1">
        <Clock size={20} className={`${isPaused ? 'text-amber-400' : 'text-red-400'}`} />
        <span className="text-slate-400 text-sm uppercase tracking-wider">
          {isPaused ? 'Paused' : 'Time'}
        </span>
      </div>
      {formatTime(elapsedMs)}
    </div>
  );
};

// Success overlay when puzzle is completed - RED THEME
const SuccessOverlay = ({ completionTime, firstAttemptTime, bestTime, wasFirstAttempt, rank, onViewLeaderboard, onPlayAgain, onMenu }) => {
  const isNewBest = !bestTime || completionTime < bestTime;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" 
         style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
      <div className="bg-gradient-to-br from-slate-900 via-red-950/50 to-slate-900 rounded-2xl p-6 max-w-sm w-full border border-red-500/50 shadow-[0_0_60px_rgba(239,68,68,0.4)]">
        {/* Success Icon */}
        <div className="text-center mb-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-3 animate-pulse">
            <CheckCircle size={40} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-black text-red-300">CHALLENGE COMPLETE!</h2>
        </div>
        
        {/* Time */}
        <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700/50">
          <div className="text-center">
            <div className="text-slate-400 text-sm mb-1">Your Time</div>
            <div className="text-3xl font-mono font-black text-red-300">
              {weeklyChallengeService.formatTime(completionTime)}
            </div>
            
            {wasFirstAttempt && (
              <div className="mt-2 px-3 py-1 bg-cyan-500/20 rounded-full inline-flex items-center gap-1">
                <Trophy size={14} className="text-cyan-400" />
                <span className="text-cyan-300 text-sm font-bold">FIRST ATTEMPT - COUNTS FOR RANKING!</span>
              </div>
            )}
            
            {!wasFirstAttempt && isNewBest && (
              <div className="mt-2 px-3 py-1 bg-amber-500/20 rounded-full inline-flex items-center gap-1">
                <Trophy size={14} className="text-amber-400" />
                <span className="text-amber-300 text-sm font-bold">NEW PERSONAL BEST!</span>
              </div>
            )}
          </div>
        </div>
        
        {/* First Attempt vs Best Time Info */}
        {firstAttemptTime && !wasFirstAttempt && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-slate-800/50 rounded-lg p-2 border border-cyan-500/30 text-center">
              <div className="text-cyan-400 text-xs mb-1">First Attempt</div>
              <div className="text-cyan-300 font-mono font-bold text-sm">
                {weeklyChallengeService.formatTime(firstAttemptTime)}
              </div>
              <div className="text-cyan-500 text-xs">(Ranked)</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-2 border border-amber-500/30 text-center">
              <div className="text-amber-400 text-xs mb-1">Best Time</div>
              <div className="text-amber-300 font-mono font-bold text-sm">
                {weeklyChallengeService.formatTime(isNewBest ? completionTime : bestTime)}
              </div>
            </div>
          </div>
        )}
        
        {/* Rank */}
        {rank && (
          <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-xl p-3 mb-4 border border-amber-500/30 text-center">
            <div className="flex items-center justify-center gap-2">
              <Trophy size={18} className="text-amber-400" />
              <span className="text-amber-300 font-bold">
                Current Rank: #{rank}
              </span>
            </div>
            <div className="text-amber-500/70 text-xs mt-1">Based on first attempt time</div>
          </div>
        )}
        
        {/* Buttons */}
        <div className="space-y-2">
          <button
            onClick={onViewLeaderboard}
            className="w-full p-3 rounded-xl font-bold bg-gradient-to-r from-red-500 to-rose-600 text-white hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Trophy size={18} />
            VIEW LEADERBOARD
          </button>
          
          <button
            onClick={onPlayAgain}
            className="w-full p-3 rounded-xl font-bold bg-slate-800 text-red-300 border border-red-500/30 hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw size={18} />
            {wasFirstAttempt ? 'PLAY AGAIN (PRACTICE)' : 'TRY AGAIN'}
          </button>
          
          <button
            onClick={onMenu}
            className="w-full p-3 rounded-xl font-bold bg-slate-800/50 text-slate-400 hover:text-slate-300 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} />
            BACK TO MENU
          </button>
        </div>
      </div>
    </div>
  );
};

const WeeklyChallengeScreen = ({ challenge, onMenu, onLeaderboard }) => {
  const { profile } = useAuth();
  const { needsScroll, isMobile } = useResponsiveLayout(650);
  
  // Game state
  const [puzzle, setPuzzle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [completionTime, setCompletionTime] = useState(null);
  const [firstAttemptTime, setFirstAttemptTime] = useState(null);
  const [bestTime, setBestTime] = useState(null);
  const [isFirstAttempt, setIsFirstAttempt] = useState(true);
  const [wasFirstAttempt, setWasFirstAttempt] = useState(false);
  const [currentRank, setCurrentRank] = useState(null);
  
  // Refs
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  
  // Game state from hook
  const {
    board,
    boardPieces,
    currentPlayer,
    selectedPiece,
    rotation,
    flipped,
    gameOver,
    winner,
    usedPieces,
    pendingMove,
    handleCellClick,
    confirmMove,
    cancelMove,
    movePendingPiece,
    selectPiece,
    rotatePiece,
    flipPiece,
    loadPuzzle,
    resetCurrentPuzzle,
  } = useGameState();
  
  // Load the puzzle
  useEffect(() => {
    const loadWeeklyPuzzle = async () => {
      setLoading(true);
      
      try {
        // Generate deterministic puzzle from challenge seed
        const seed = weeklyChallengeService.generatePuzzleSeed(challenge);
        const puzzleData = await getSeededPuzzle(seed, PUZZLE_DIFFICULTY.HARD);
        
        if (puzzleData) {
          setPuzzle(puzzleData);
        }
        
        // Get user's existing results
        const { data: existingResult } = await weeklyChallengeService.getUserResult(challenge.id);
        if (existingResult) {
          setFirstAttemptTime(existingResult.first_attempt_time_ms);
          setBestTime(existingResult.best_time_ms || existingResult.completion_time_ms);
          setIsFirstAttempt(false);
        }
      } catch (err) {
        console.error('Error loading weekly puzzle:', err);
      }
      
      setLoading(false);
    };
    
    loadWeeklyPuzzle();
  }, [challenge]);
  
  // Start the timer
  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 10);
  }, []);
  
  // Stop the timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return Date.now() - startTimeRef.current;
  }, []);
  
  // Start the game
  const handleStartGame = useCallback(() => {
    if (puzzle) {
      loadPuzzle(puzzle);
      setGameStarted(true);
      startTimer();
      soundManager.playClickSound('success');
    }
  }, [puzzle, loadPuzzle, startTimer]);
  
  // Check for puzzle completion
  useEffect(() => {
    if (gameStarted && gameOver && winner === 1) {
      const finalTime = stopTimer();
      setCompletionTime(finalTime);
      setWasFirstAttempt(isFirstAttempt);
      setGameComplete(true);
      soundManager.playPuzzleSolvedSound();
      submitResult(finalTime);
    }
  }, [gameOver, winner, gameStarted, stopTimer, isFirstAttempt]);
  
  // Submit result to database
  const submitResult = async (timeMs) => {
    try {
      const { data } = await weeklyChallengeService.submitResult(challenge.id, timeMs, isFirstAttempt);
      
      if (data) {
        if (isFirstAttempt) {
          setFirstAttemptTime(timeMs);
          setIsFirstAttempt(false);
        }
        
        // Update best time if improved
        if (!bestTime || timeMs < bestTime) {
          setBestTime(timeMs);
        }
        
        // Get rank (based on first attempt)
        const { rank } = await weeklyChallengeService.getUserRank(challenge.id);
        setCurrentRank(rank);
      }
    } catch (err) {
      console.error('Error submitting result:', err);
    }
  };
  
  // Restart the puzzle
  const handleRestart = useCallback(() => {
    resetCurrentPuzzle();
    setGameComplete(false);
    setCompletionTime(null);
    setWasFirstAttempt(false);
    setElapsedMs(0);
    setGameStarted(false);
  }, [resetCurrentPuzzle]);
  
  // Handle going to leaderboard
  const handleViewLeaderboard = () => {
    soundManager.playButtonClick();
    onLeaderboard(challenge);
  };
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  // Loading state - RED THEME
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-red-300">Loading weekly challenge...</p>
        </div>
      </div>
    );
  }
  
  // Pre-game state (ready to start) - RED THEME
  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        {/* Background */}
        <div className="fixed inset-0 opacity-30 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(239,68,68,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.4) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        <div className="fixed top-1/4 left-1/4 w-64 h-64 bg-red-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-1/4 right-1/4 w-64 h-64 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative bg-slate-900/90 rounded-2xl p-6 max-w-sm w-full border border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.3)] text-center">
          <h2 className="text-2xl font-black text-red-300 mb-2">WEEKLY CHALLENGE</h2>
          <p className="text-slate-400 mb-6">Week {challenge.week_number}, {challenge.year}</p>
          
          {/* Show existing times if not first attempt */}
          {firstAttemptTime && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-slate-800/50 rounded-xl p-3 border border-cyan-500/30">
                <div className="text-cyan-400 text-xs mb-1">First Attempt</div>
                <div className="text-lg font-mono font-bold text-cyan-300">
                  {weeklyChallengeService.formatTime(firstAttemptTime)}
                </div>
                <div className="text-cyan-500 text-xs">(Ranked)</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-3 border border-amber-500/30">
                <div className="text-amber-400 text-xs mb-1">Best Time</div>
                <div className="text-lg font-mono font-bold text-amber-300">
                  {weeklyChallengeService.formatTime(bestTime)}
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700/50">
            <Clock size={32} className="mx-auto text-red-400 mb-2" />
            <p className="text-slate-300 text-sm">
              Timer starts when you press START
            </p>
            {isFirstAttempt ? (
              <p className="text-red-300 text-xs mt-1 font-bold">
                ⚡ Your FIRST attempt time will be used for ranking!
              </p>
            ) : (
              <p className="text-slate-500 text-xs mt-1">
                Practice mode - try to beat your best time!
              </p>
            )}
          </div>
          
          <button
            onClick={handleStartGame}
            className="w-full p-4 rounded-xl font-black text-lg bg-gradient-to-r from-red-500 to-rose-600 text-white hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(239,68,68,0.5)]"
          >
            <Play size={24} />
            {isFirstAttempt ? 'START CHALLENGE' : 'PRACTICE RUN'}
          </button>
          
          <button
            onClick={() => { soundManager.playButtonClick(); onMenu(); }}
            className="w-full mt-3 p-3 rounded-xl font-bold text-slate-400 hover:text-slate-300 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} />
            Back
          </button>
        </div>
      </div>
    );
  }
  
  // Game in progress - RED THEME with proper scrolling
  return (
    <div 
      className="min-h-screen bg-slate-950"
      style={{ 
        overflowY: 'auto', 
        overflowX: 'hidden', 
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain'
      }}
    >
      {/* Background */}
      <div className="fixed inset-0 opacity-20 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(239,68,68,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.3) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />
      
      {/* Content */}
      <div className="relative min-h-screen flex flex-col items-center px-2 py-4">
        <div className="w-full max-w-lg">
          
          {/* Header with Timer */}
          <div className="flex items-center justify-between mb-4 px-2">
            <button
              onClick={() => { soundManager.playButtonClick(); onMenu(); }}
              className="p-2 text-slate-400 hover:text-slate-300 transition-colors"
            >
              <X size={24} />
            </button>
            
            <TimerDisplay elapsedMs={elapsedMs} isPaused={false} />
            
            <button
              onClick={handleRestart}
              className="p-2 text-slate-400 hover:text-red-300 transition-colors"
            >
              <RotateCcw size={20} />
            </button>
          </div>
          
          {/* Game Board - with rotation/flipped for ghost preview */}
          <div className="flex justify-center mb-3">
            <GameBoard
              board={board}
              boardPieces={boardPieces}
              selectedPiece={selectedPiece}
              pendingMove={pendingMove}
              rotation={rotation}
              flipped={flipped}
              onCellClick={handleCellClick}
              currentPlayer={currentPlayer}
              gameOver={gameOver}
              gameMode="puzzle"
            />
          </div>
          
          {/* D-Pad for moving pieces */}
          {pendingMove && (
            <div className="flex justify-center mb-3">
              <DPad onMove={movePendingPiece} />
            </div>
          )}
          
          {/* Piece Tray */}
          <PieceTray
            usedPieces={usedPieces}
            selectedPiece={selectedPiece}
            pendingMove={pendingMove}
            gameOver={gameOver}
            gameMode="puzzle"
            currentPlayer={currentPlayer}
            onSelectPiece={selectPiece}
          />
          
          {/* Controls */}
          <ControlButtons
            selectedPiece={selectedPiece}
            pendingMove={pendingMove}
            canConfirm={!!pendingMove}
            gameOver={gameOver}
            gameMode="puzzle"
            currentPlayer={currentPlayer}
            isGeneratingPuzzle={false}
            onRotate={rotatePiece}
            onFlip={flipPiece}
            onConfirm={confirmMove}
            onCancel={cancelMove}
          />
        </div>
        
        {/* Bottom padding for scroll */}
        <div className="h-8 flex-shrink-0" />
      </div>
      
      {/* Success Overlay */}
      {gameComplete && (
        <SuccessOverlay
          completionTime={completionTime}
          firstAttemptTime={firstAttemptTime}
          bestTime={bestTime}
          wasFirstAttempt={wasFirstAttempt}
          rank={currentRank}
          onViewLeaderboard={handleViewLeaderboard}
          onPlayAgain={handleRestart}
          onMenu={onMenu}
        />
      )}
    </div>
  );
};

export default WeeklyChallengeScreen;
