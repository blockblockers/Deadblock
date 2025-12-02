import { useState, useEffect } from 'react';
import { useGameState } from './hooks/useGameState';
import MenuScreen from './components/MenuScreen';
import PuzzleSelect from './components/PuzzleSelect';
import GameScreen from './components/GameScreen';

function App() {
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get all game state and actions from custom hook
  const {
    // State
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
    
    // Actions
    setGameMode,
    setShowHowToPlay,
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

  // Render Menu Screen
  if (!gameMode) {
    return (
      <MenuScreen
        onStartGame={startNewGame}
        onPuzzleSelect={() => setGameMode('puzzle-select')}
        showHowToPlay={showHowToPlay}
        onToggleHowToPlay={setShowHowToPlay}
      />
    );
  }

  // Render Puzzle Select Screen
  if (gameMode === 'puzzle-select') {
    return (
      <PuzzleSelect
        onSelectPuzzle={loadPuzzle}
        onBack={() => setGameMode(null)}
      />
    );
  }

  // Render Game Screen
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
      isMobile={isMobile}
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