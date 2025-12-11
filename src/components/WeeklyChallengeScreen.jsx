// Weekly Challenge Screen - Timed puzzle gameplay for weekly challenges
import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, Trophy, ArrowLeft, RotateCcw, Play, CheckCircle, X } from 'lucide-react';
import GameBoard from './GameBoard';
import PieceTray from './PieceTray';
import ControlButtons from './ControlButtons';
import { useGameState } from '../hooks/useGameState';
import { soundManager } from '../utils/soundManager';
import { weeklyChallengeService } from '../services/weeklyChallengeService';
import { useAuth } from '../contexts/AuthContext';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { getSeededPuzzle } from '../utils/puzzleGenerator';
import { PUZZLE_DIFFICULTY } from '../utils/puzzleGenerator';

// Timer display component
const TimerDisplay = ({ elapsedMs, isPaused }) => {
  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hundredths = Math.floor((ms % 1000) / 10);
    
    return (
      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-mono font-black text-lime-300">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
        <span className="text-xl font-mono text-lime-400/70">
          .{hundredths.toString().padStart(2, '0')}
        </span>
      </div>
    );
  };
  
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-2 mb-1">
        <Clock size={20} className={`${isPaused ? 'text-amber-400' : 'text-lime-400'}`} />
        <span className="text-slate-400 text-sm uppercase tracking-wider">
          {isPaused ? 'Paused' : 'Time'}
        </span>
      </div>
      {formatTime(elapsedMs)}
    </div>
  );
};

// Success overlay when puzzle is completed
const SuccessOverlay = ({ completionTime, previousBest, rank, onViewLeaderboard, onPlayAgain, onMenu }) => {
  const isNewRecord = !previousBest || completionTime < previousBest;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" 
         style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
      <div className="bg-gradient-to-br from-slate-900 via-lime-950/50 to-slate-900 rounded-2xl p-6 max-w-sm w-full border border-lime-500/50 shadow-[0_0_60px_rgba(163,230,53,0.4)]">
        {/* Success Icon */}
        <div className="text-center mb-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-lime-500/20 flex items-center justify-center mb-3 animate-pulse">
            <CheckCircle size={40} className="text-lime-400" />
          </div>
          <h2 className="text-2xl font-black text-lime-300">CHALLENGE COMPLETE!</h2>
        </div>
        
        {/* Time */}
        <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700/50">
          <div className="text-center">
            <div className="text-slate-400 text-sm mb-1">Your Time</div>
            <div className="text-3xl font-mono font-black text-lime-300">
              {weeklyChallengeService.formatTime(completionTime)}
            </div>
            
            {isNewRecord && (
              <div className="mt-2 px-3 py-1 bg-amber-500/20 rounded-full inline-flex items-center gap-1">
                <Trophy size={14} className="text-amber-400" />
                <span className="text-amber-300 text-sm font-bold">NEW PERSONAL BEST!</span>
              </div>
            )}
            
            {previousBest && !isNewRecord && (
              <div className="text-slate-500 text-sm mt-2">
                Previous best: {weeklyChallengeService.formatTime(previousBest)}
              </div>
            )}
          </div>
        </div>
        
        {/* Rank */}
        {rank && (
          <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-xl p-3 mb-4 border border-amber-500/30 text-center">
            <div className="flex items-center justify-center gap-2">
              <Trophy size={18} className="text-amber-400" />
              <span className="text-amber-300 font-bold">
                Current Rank: #{rank}
              </span>
            </div>
          </div>
        )}
        
        {/* Buttons */}
        <div className="space-y-2">
          <button
            onClick={onViewLeaderboard}
            className="w-full p-3 rounded-xl font-bold bg-gradient-to-r from-lime-500 to-green-600 text-white hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Trophy size={18} />
            VIEW LEADERBOARD
          </button>
          
          <button
            onClick={onPlayAgain}
            className="w-full p-3 rounded-xl font-bold bg-slate-800 text-lime-300 border border-lime-500/30 hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw size={18} />
            TRY AGAIN
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
  const { needsScroll, isMobile } = useResponsiveLayout(700);
  
  // Game state
  const [puzzle, setPuzzle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [completionTime, setCompletionTime] = useState(null);
  const [previousBest, setPreviousBest] = useState(null);
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
        
        // Get user's previous best
        const { data: existingResult } = await weeklyChallengeService.getUserResult(challenge.id);
        if (existingResult) {
          setPreviousBest(existingResult.completion_time_ms);
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
    }, 10); // Update every 10ms for smooth display
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
      // Player won!
      const finalTime = stopTimer();
      setCompletionTime(finalTime);
      setGameComplete(true);
      soundManager.playPuzzleSolvedSound();
      
      // Submit result
      submitResult(finalTime);
    }
  }, [gameOver, winner, gameStarted, stopTimer]);
  
  // Submit result to database
  const submitResult = async (timeMs) => {
    try {
      const { data } = await weeklyChallengeService.submitResult(challenge.id, timeMs);
      
      if (data?.is_improvement) {
        // Get updated rank
        const { rank } = await weeklyChallengeService.getUserRank(challenge.id);
        setCurrentRank(rank);
        
        // TODO: Add achievement checking once achievementsService is integrated
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
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-lime-500/30 border-t-lime-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lime-300">Loading weekly challenge...</p>
        </div>
      </div>
    );
  }
  
  // Pre-game state (ready to start)
  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        {/* Background */}
        <div className="fixed inset-0 opacity-30 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(163,230,53,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(163,230,53,0.4) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        <div className="fixed top-1/4 left-1/4 w-64 h-64 bg-lime-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-1/4 right-1/4 w-64 h-64 bg-green-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative bg-slate-900/90 rounded-2xl p-6 max-w-sm w-full border border-lime-500/50 shadow-[0_0_40px_rgba(163,230,53,0.3)] text-center">
          <h2 className="text-2xl font-black text-lime-300 mb-2">WEEKLY CHALLENGE</h2>
          <p className="text-slate-400 mb-6">Week {challenge.week_number}, {challenge.year}</p>
          
          {previousBest && (
            <div className="bg-slate-800/50 rounded-xl p-3 mb-4 border border-slate-700/50">
              <div className="text-slate-400 text-sm">Your Best Time</div>
              <div className="text-xl font-mono font-bold text-lime-300">
                {weeklyChallengeService.formatTime(previousBest)}
              </div>
            </div>
          )}
          
          <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700/50">
            <Clock size={32} className="mx-auto text-lime-400 mb-2" />
            <p className="text-slate-300 text-sm">
              Timer starts when you press START
            </p>
            <p className="text-slate-500 text-xs mt-1">
              Solve the puzzle as fast as you can!
            </p>
          </div>
          
          <button
            onClick={handleStartGame}
            className="w-full p-4 rounded-xl font-black text-lg bg-gradient-to-r from-lime-500 to-green-600 text-white hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(163,230,53,0.5)]"
          >
            <Play size={24} />
            START
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
  
  // Game in progress
  return (
    <div 
      className={needsScroll ? 'min-h-screen bg-slate-950' : 'h-screen bg-slate-950 overflow-hidden'}
      style={needsScroll ? { overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' } : {}}
    >
      {/* Background */}
      <div className="fixed inset-0 opacity-20 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(163,230,53,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(163,230,53,0.3) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />
      
      {/* Content */}
      <div className={`relative ${needsScroll ? 'min-h-screen' : 'h-full'} flex flex-col items-center justify-center px-2 py-4`}>
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
              className="p-2 text-slate-400 hover:text-lime-300 transition-colors"
            >
              <RotateCcw size={20} />
            </button>
          </div>
          
          {/* Game Board */}
          <div className="flex justify-center mb-4">
            <GameBoard
              board={board}
              boardPieces={boardPieces}
              pendingMove={pendingMove}
              onCellClick={handleCellClick}
              onMovePiece={movePendingPiece}
              currentPlayer={currentPlayer}
              gameOver={gameOver}
              isMobile={isMobile}
            />
          </div>
          
          {/* Piece Tray */}
          <PieceTray
            selectedPiece={selectedPiece}
            usedPieces={usedPieces}
            onSelectPiece={selectPiece}
            currentPlayer={currentPlayer}
            rotation={rotation}
            flipped={flipped}
            gameMode="puzzle"
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
      </div>
      
      {/* Success Overlay */}
      {gameComplete && (
        <SuccessOverlay
          completionTime={completionTime}
          previousBest={previousBest}
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
