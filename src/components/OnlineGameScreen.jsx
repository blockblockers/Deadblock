// Online Game Screen - Real-time multiplayer game
import { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, Flag, MessageCircle, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { gameSyncService } from '../services/gameSync';
import NeonTitle from './NeonTitle';
import GameBoard from './GameBoard';
import PieceTray from './PieceTray';
import ControlButtons from './ControlButtons';
import DPad from './DPad';
import GameOverModal from './GameOverModal';
import { getPieceCoords, canPlacePiece, placePiece, canAnyPieceBePlaced, BOARD_SIZE } from '../utils/gameLogic';
import { pieces } from '../utils/pieces';
import { soundManager } from '../utils/soundManager';

const OnlineGameScreen = ({ gameId, onGameEnd, onLeave }) => {
  const { user, profile, loading: authLoading } = useAuth();
  
  // Game state
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  
  // Local game state for UI
  const [board, setBoard] = useState(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0)));
  const [boardPieces, setBoardPieces] = useState({});
  const [usedPieces, setUsedPieces] = useState([]);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [pendingMove, setPendingMove] = useState(null);
  
  // Game info
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [myPlayerNumber, setMyPlayerNumber] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [showGameOver, setShowGameOver] = useState(false);
  const [gameResult, setGameResult] = useState(null);

  // Update local state from game data
  const updateGameState = useCallback((gameData, userId) => {
    if (!gameData) {
      console.log('updateGameState: No game data');
      return;
    }

    console.log('updateGameState: Updating with game', gameData.id);
    
    setGame(gameData);
    setBoard(gameData.board || Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0)));
    setBoardPieces(gameData.board_pieces || {});
    setUsedPieces(gameData.used_pieces || []);
    setConnected(true);

    // Only set player-specific state if user is available
    if (userId) {
      // Determine player number and opponent
      const playerNum = gameSyncService.getPlayerNumber(gameData, userId);
      setMyPlayerNumber(playerNum);
      
      const opp = playerNum === 1 ? gameData.player2 : gameData.player1;
      setOpponent(opp);

      // Check if it's my turn
      const myTurn = gameSyncService.isPlayerTurn(gameData, userId);
      setIsMyTurn(myTurn);

      // Check for game over
      if (gameData.status === 'completed') {
        const iWon = gameData.winner_id === userId;
        setGameResult({
          isWin: iWon,
          winnerId: gameData.winner_id,
          reason: gameData.winner_id ? 'normal' : 'draw'
        });
        setShowGameOver(true);
        soundManager.playSound(iWon ? 'win' : 'lose');
      }
    }
  }, []);

  // Load game and subscribe to updates
  useEffect(() => {
    console.log('OnlineGameScreen useEffect triggered:', { gameId, userId: user?.id, authLoading, retryCount });
    
    if (!gameId) {
      console.log('OnlineGameScreen: No gameId provided');
      setError('No game ID provided');
      setLoading(false);
      return;
    }

    // Wait for auth to finish loading first
    if (authLoading) {
      console.log('OnlineGameScreen: Waiting for auth to complete...');
      return;
    }

    // After auth is complete, check if user is available
    if (!user?.id) {
      console.log('OnlineGameScreen: User not authenticated');
      setError('Please sign in to view this game');
      setLoading(false);
      return;
    }

    const userId = user.id;
    let mounted = true;
    let loadingTimeout;
    
    console.log('OnlineGameScreen: Starting game load for:', gameId, 'user:', userId);

    // Set a timeout to show error if loading takes too long
    loadingTimeout = setTimeout(() => {
      if (mounted) {
        console.error('OnlineGameScreen: Loading timeout reached after 15 seconds');
        setError('Loading took too long. Please try again.');
        setLoading(false);
      }
    }, 15000); // 15 second timeout

    const loadGame = async () => {
      try {
        console.log('OnlineGameScreen: Calling gameSyncService.getGame...');
        const { data, error: fetchError } = await gameSyncService.getGame(gameId);
        
        console.log('OnlineGameScreen: Server response:', { 
          hasData: !!data, 
          gameId: data?.id, 
          error: fetchError 
        });
        
        if (!mounted) {
          console.log('OnlineGameScreen: Component unmounted, ignoring response');
          return;
        }
        
        clearTimeout(loadingTimeout);
        
        if (fetchError) {
          console.error('OnlineGameScreen: Error loading game:', fetchError);
          setError('Failed to load game: ' + (fetchError.message || 'Unknown error'));
          setLoading(false);
          return;
        }

        if (!data) {
          console.error('OnlineGameScreen: No game data returned');
          setError('Game not found');
          setLoading(false);
          return;
        }

        console.log('OnlineGameScreen: Game loaded successfully, calling updateGameState');
        updateGameState(data, userId);
        setLoading(false);
        console.log('OnlineGameScreen: Loading complete, setLoading(false) called');
      } catch (err) {
        console.error('OnlineGameScreen: Exception loading game:', err);
        if (mounted) {
          clearTimeout(loadingTimeout);
          setError('Error loading game: ' + err.message);
          setLoading(false);
        }
      }
    };

    loadGame();

    // Subscribe to real-time updates
    const subscription = gameSyncService.subscribeToGame(
      gameId,
      (updatedGame) => {
        if (mounted) {
          console.log('Real-time update received');
          updateGameState(updatedGame, userId);
        }
      },
      (err) => {
        console.error('Connection error:', err);
        if (mounted) {
          setConnected(false);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
      gameSyncService.unsubscribe();
    };
  }, [gameId, user?.id, authLoading, updateGameState, retryCount]);

  // Handle cell click
  const handleCellClick = (row, col) => {
    if (!isMyTurn || !selectedPiece || game?.status !== 'active') return;

    const coords = getPieceCoords(selectedPiece, rotation, flipped);
    
    if (canPlacePiece(board, row, col, coords)) {
      setPendingMove({ piece: selectedPiece, row, col });
      soundManager.playClickSound('place');
    }
  };

  // Handle piece selection
  const handleSelectPiece = (pieceType) => {
    if (!isMyTurn || usedPieces.includes(pieceType)) return;
    
    soundManager.playClickSound('select');
    setSelectedPiece(pieceType);
    setRotation(0);
    setFlipped(false);
    setPendingMove(null);
  };

  // Rotation and flip
  const handleRotate = () => {
    soundManager.playClickSound('rotate');
    setRotation((r) => (r + 1) % 4);
  };

  const handleFlip = () => {
    soundManager.playClickSound('flip');
    setFlipped((f) => !f);
  };

  // Move piece with D-pad
  const handleMovePiece = (direction) => {
    if (!pendingMove) return;

    const deltas = {
      up: [-1, 0],
      down: [1, 0],
      left: [0, -1],
      right: [0, 1]
    };

    const [dRow, dCol] = deltas[direction];
    const newRow = pendingMove.row + dRow;
    const newCol = pendingMove.col + dCol;
    const coords = getPieceCoords(selectedPiece, rotation, flipped);

    if (canPlacePiece(board, newRow, newCol, coords)) {
      setPendingMove({ ...pendingMove, row: newRow, col: newCol });
      soundManager.playClickSound('move');
    }
  };

  // Cancel pending move
  const handleCancel = () => {
    soundManager.playButtonClick();
    setPendingMove(null);
    setSelectedPiece(null);
    setRotation(0);
    setFlipped(false);
  };

  // Confirm and send move
  const handleConfirm = async () => {
    if (!pendingMove || !isMyTurn || !game) return;

    const coords = getPieceCoords(pendingMove.piece, rotation, flipped);
    
    if (!canPlacePiece(board, pendingMove.row, pendingMove.col, coords)) {
      return;
    }

    soundManager.playSound('place');

    // Calculate new state
    const newBoard = placePiece(board, pendingMove.row, pendingMove.col, coords, myPlayerNumber);
    const newBoardPieces = {
      ...boardPieces,
      [pendingMove.piece]: {
        row: pendingMove.row,
        col: pendingMove.col,
        rotation,
        flipped,
        player: myPlayerNumber
      }
    };
    const newUsedPieces = [...usedPieces, pendingMove.piece];
    
    // Determine next player
    const nextPlayer = myPlayerNumber === 1 ? 2 : 1;
    
    // Check for game over
    const opponentCanMove = canAnyPieceBePlaced(newBoard, newUsedPieces);
    const gameOver = !opponentCanMove;
    
    // If game over, current player wins (opponent can't move)
    const winnerId = gameOver ? user.id : null;

    // Send move to server
    const { error } = await gameSyncService.makeMove(gameId, user.id, {
      pieceType: pendingMove.piece,
      row: pendingMove.row,
      col: pendingMove.col,
      rotation,
      flipped,
      newBoard,
      newBoardPieces,
      newUsedPieces,
      nextPlayer,
      gameOver,
      winnerId
    });

    if (error) {
      console.error('Error making move:', error);
      soundManager.playSound('invalid');
      return;
    }

    // Clear local state
    setPendingMove(null);
    setSelectedPiece(null);
    setRotation(0);
    setFlipped(false);
  };

  // Forfeit game
  const handleForfeit = async () => {
    if (!confirm('Are you sure you want to forfeit? This counts as a loss.')) {
      return;
    }

    soundManager.playButtonClick();
    await gameSyncService.forfeitGame(gameId, user.id);
  };

  // Handle game over modal close
  const handleCloseGameOver = () => {
    setShowGameOver(false);
    onGameEnd?.(gameResult);
  };

  // Calculate if confirm is possible
  const canConfirm = pendingMove && canPlacePiece(
    board,
    pendingMove.row,
    pendingMove.col,
    getPieceCoords(pendingMove.piece, rotation, flipped)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        {/* Themed background */}
        <div className="fixed inset-0 opacity-40 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(251,191,36,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        <div className="fixed top-1/4 right-1/4 w-64 h-64 bg-amber-500/30 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-1/4 left-1/4 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative text-center">
          <div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-amber-300 mb-6">Loading game...</p>
          <button
            onClick={onLeave}
            className="px-6 py-2 text-slate-400 hover:text-slate-200 text-sm transition-colors"
          >
            ← Cancel
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        {/* Themed background */}
        <div className="fixed inset-0 opacity-40 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(251,191,36,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        
        <div className="relative text-center max-w-sm mx-4">
          <div className="w-16 h-16 rounded-full bg-red-900/50 flex items-center justify-center mx-auto mb-4 border-2 border-red-500/50">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-red-400 mb-2">Failed to Load Game</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setError('');
                setLoading(true);
                setRetryCount(c => c + 1);
              }}
              className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition-all font-bold"
            >
              Retry
            </button>
            <button
              onClick={onLeave}
              className="px-6 py-3 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all"
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 overflow-auto">
      {/* Grid background */}
      <div className="fixed inset-0 opacity-20 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      {/* Content */}
      <div className="relative min-h-screen p-2 sm:p-4">
        <div className="max-w-lg mx-auto">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <NeonTitle size="small" />
            <div className="flex items-center gap-2">
              {/* Connection status */}
              {connected ? (
                <Wifi size={16} className="text-green-400" />
              ) : (
                <WifiOff size={16} className="text-red-400 animate-pulse" />
              )}
              <span className="text-xs text-slate-500">ONLINE</span>
            </div>
          </div>

          {/* Players bar */}
          <div className="flex items-center justify-between mb-3 bg-slate-900/80 rounded-xl p-3 border border-slate-700/50">
            {/* Me */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
              isMyTurn 
                ? 'bg-cyan-500/20 border border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.4)]' 
                : 'bg-slate-800/50'
            }`}>
              <div className={`w-3 h-3 rounded-full ${isMyTurn ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
              <span className={`text-sm font-bold ${isMyTurn ? 'text-cyan-300' : 'text-slate-500'}`}>
                {profile?.username || 'You'}
              </span>
              <span className="text-xs text-slate-600">({profile?.rating || 1000})</span>
            </div>

            {/* VS */}
            <div className="text-slate-600 text-xs font-bold">VS</div>

            {/* Opponent */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
              !isMyTurn && game?.status === 'active'
                ? 'bg-purple-500/20 border border-purple-400/50 shadow-[0_0_15px_rgba(168,85,247,0.4)]' 
                : 'bg-slate-800/50'
            }`}>
              <span className={`text-sm font-bold ${!isMyTurn ? 'text-purple-300' : 'text-slate-500'}`}>
                {opponent?.username || 'Opponent'}
              </span>
              <span className="text-xs text-slate-600">({opponent?.rating || 1000})</span>
              <div className={`w-3 h-3 rounded-full ${!isMyTurn && game?.status === 'active' ? 'bg-purple-400 animate-pulse' : 'bg-slate-600'}`} />
            </div>
          </div>

          {/* Turn indicator */}
          <div className={`text-center py-2 mb-3 rounded-lg font-bold text-sm ${
            isMyTurn 
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
              : 'bg-slate-800/50 text-slate-400'
          }`}>
            {game?.status === 'active' 
              ? (isMyTurn ? "🎮 YOUR TURN" : "⏳ Waiting for opponent...")
              : "Game Over"
            }
          </div>

          {/* Game board */}
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-3 mb-3 border border-slate-700/50">
            <div className="flex justify-center pb-3">
              <GameBoard
                board={board}
                boardPieces={boardPieces}
                pendingMove={pendingMove}
                rotation={rotation}
                flipped={flipped}
                gameOver={game?.status === 'completed'}
                gameMode="online"
                currentPlayer={myPlayerNumber}
                onCellClick={handleCellClick}
              />
            </div>

            {/* D-Pad for moving piece */}
            {pendingMove && isMyTurn && <DPad onMove={handleMovePiece} />}

            {/* Controls */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleRotate}
                disabled={!selectedPiece || !isMyTurn}
                className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg disabled:opacity-30 hover:bg-slate-600 transition-all text-sm"
              >
                Rotate
              </button>
              <button
                onClick={handleFlip}
                disabled={!selectedPiece || !isMyTurn}
                className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg disabled:opacity-30 hover:bg-slate-600 transition-all text-sm"
              >
                Flip
              </button>
              {pendingMove ? (
                <>
                  <button
                    onClick={handleCancel}
                    className="flex-1 py-2 bg-red-900/50 text-red-300 rounded-lg hover:bg-red-900/70 transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={!canConfirm}
                    className="flex-1 py-2 bg-green-600 text-white rounded-lg disabled:opacity-30 hover:bg-green-500 transition-all text-sm font-bold"
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button
                  onClick={handleForfeit}
                  className="py-2 px-4 bg-slate-800 text-slate-400 rounded-lg hover:bg-red-900/50 hover:text-red-300 transition-all text-sm"
                >
                  <Flag size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Piece tray */}
          <PieceTray
            usedPieces={usedPieces}
            selectedPiece={selectedPiece}
            pendingMove={pendingMove}
            gameOver={game?.status === 'completed'}
            gameMode="online"
            currentPlayer={myPlayerNumber}
            isMobile={true}
            onSelectPiece={handleSelectPiece}
          />

          {/* Leave button */}
          <button
            onClick={onLeave}
            className="w-full mt-4 py-2 text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            Leave Game
          </button>
        </div>
      </div>

      {/* Game Over Modal */}
      {showGameOver && (
        <GameOverModal
          isWin={gameResult?.isWin}
          isPuzzle={false}
          gameMode="online"
          winner={gameResult?.isWin ? myPlayerNumber : (myPlayerNumber === 1 ? 2 : 1)}
          onClose={handleCloseGameOver}
          onMenu={handleCloseGameOver}
        />
      )}
    </div>
  );
};

export default OnlineGameScreen;
