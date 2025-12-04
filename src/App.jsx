import { useState, useEffect } from 'react';
import { useGameState } from './hooks/useGameState';
import MenuScreen from './components/MenuScreen';
import PuzzleSelect from './components/PuzzleSelect';
import GameScreen from './components/GameScreen';
import DifficultySelector from './components/DifficultySelector';
import IOSInstallPrompt from './components/IOSInstallPrompt';

function App() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    moveHistory,
    gameMode,
    isAIThinking,
    pendingMove,
    currentPuzzle,
    showHowToPlay,
    showSettings,
    aiDifficulty,
    isGeneratingPuzzle,
    
    setGameMode,
    setShowHowToPlay,
    setShowSettings,
    setAiDifficulty,
    handleCellClick,
    confirmMove,
    cancelMove,
    movePendingPiece,
    undoMove,
    resetGame,
    loadPuzzle,
    startNewGame,
    selectPiece,
    rotatePiece,
    flipPiece,
  } = useGameState();

  const handleStartGame = (mode) => {
    if (mode === 'ai') {
      setGameMode('difficulty-select');
    } else {
      startNewGame(mode);
    }
  };

  const handleStartAIGame = () => {
    startNewGame('ai');
  };

  const handlePuzzleSelect = (puzzle) => {
    console.log('App received puzzle:', puzzle?.id);
    loadPuzzle(puzzle);
  };

  // Menu Screen
  if (!gameMode) {
    return (
      <>
        <MenuScreen
          onStartGame={handleStartGame}
          onPuzzleSelect={() => setGameMode('puzzle-select')}
          showHowToPlay={showHowToPlay}
          onToggleHowToPlay={setShowHowToPlay}
          showSettings={showSettings}
          onToggleSettings={setShowSettings}
        />
        <IOSInstallPrompt />
      </>
    );
  }

  // AI Difficulty Selector
  if (gameMode === 'difficulty-select') {
    return (
      <DifficultySelector
        selectedDifficulty={aiDifficulty}
        onSelectDifficulty={setAiDifficulty}
        onStartGame={handleStartAIGame}
        onBack={() => setGameMode(null)}
      />
    );
  }

  // Puzzle Select
  if (gameMode === 'puzzle-select') {
    return (
      <PuzzleSelect
        onSelectPuzzle={handlePuzzleSelect}
        onBack={() => setGameMode(null)}
      />
    );
  }

  // Game Screen
  return (
    <GameScreen
      board={board}
      boardPieces={boardPieces}
      currentPlayer={currentPlayer}
      selectedPiece={selectedPiece}
      rotation={rotation}
      flipped={flipped}
      gameOver={gameOver}
      winner={winner}
      usedPieces={usedPieces}
      moveHistory={moveHistory}
      gameMode={gameMode}
      isAIThinking={isAIThinking}
      pendingMove={pendingMove}
      currentPuzzle={currentPuzzle}
      aiDifficulty={aiDifficulty}
      isMobile={isMobile}
      isGeneratingPuzzle={isGeneratingPuzzle}
      onCellClick={handleCellClick}
      onSelectPiece={selectPiece}
      onRotate={rotatePiece}
      onFlip={flipPiece}
      onConfirm={confirmMove}
      onCancel={cancelMove}
      onMovePiece={movePendingPiece}
      onUndo={undoMove}
      onReset={resetGame}
      onMenu={() => setGameMode(null)}
    />
  );
}

export default App;
