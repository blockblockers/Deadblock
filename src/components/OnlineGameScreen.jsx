// Online Game Screen - Real-time multiplayer game
import { useState, useEffect, useCallback } from 'react';
import { Flag } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { gameSyncService } from '../services/gameSync';
import NeonTitle from './NeonTitle';
import GameBoard from './GameBoard';
import PieceTray from './PieceTray';
import DPad from './DPad';
import GameOverModal from './GameOverModal';
import { getPieceCoords, canPlacePiece, canAnyPieceBePlaced, BOARD_SIZE } from '../utils/gameLogic';
import { soundManager } from '../utils/soundManager';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

// Orange/Amber theme for online mode
const theme = {
  gridColor: 'rgba(251,191,36,0.4)',
  glow1: 'bg-amber-500/30',
  glow2: 'bg-orange-500/25',
  panelBorder: 'border-amber-500/40',
  panelShadow: 'shadow-[0_0_40px_rgba(251,191,36,0.2)]',
  accent: 'text-amber-400',
  accentBg: 'bg-amber-500/20',
  accentBorder: 'border-amber-400/50',
};

// Player indicator bar for online games
const OnlinePlayerBar = ({ profile, opponent, isMyTurn, gameStatus }) => {
  return (
    <div className="flex items-center justify-between mb-3">
      {/* Me */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${
        isMyTurn && gameStatus === 'active'
          ? 'bg-amber-500/20 border border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.4)]' 
          : 'bg-slate-800/50 border border-slate-700/50'
      }`}>
        <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
          isMyTurn && gameStatus === 'active' ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)] animate-pulse' : 'bg-slate-600'
        }`} />
        <span className={`text-sm font-bold tracking-wide ${isMyTurn ? 'text-amber-300' : 'text-slate-500'}`}>
          {profile?.username || 'You'}
        </span>
        <span className="text-xs text-slate-600">({profile?.rating || 1000})</span>
      </div>
      
      {/* VS */}
      <div className="text-slate-600 text-xs font-bold px-2">VS</div>
      
      {/* Opponent */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${
        !isMyTurn && gameStatus === 'active'
          ? 'bg-orange-500/20 border border-orange-400/50 shadow-[0_0_15px_rgba(249,115,22,0.4)]' 
          : 'bg-slate-800/50 border border-slate-700/50'
      }`}>
        <span className={`text-sm font-bold tracking-wide ${!isMyTurn && gameStatus === 'active' ? 'text-orange-300' : 'text-slate-500'}`}>
          {opponent?.username || 'Opponent'}
        </span>
        <span className="text-xs text-slate-600">({opponent?.rating || 1000})</span>
        <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
          !isMyTurn && gameStatus === 'active' ? 'bg-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.8)] animate-pulse' : 'bg-slate-600'
        }`} />
      </div>
    </div>
  );
};

const OnlineGameScreen = ({ gameId, onGameEnd, onLeave }) => {
  const { user, profile, loading: authLoading } = useAuth();
  const { needsScroll } = useResponsiveLayout(750);
  
  // Game state
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  
  // Local game state for UI
  const [board, setBoard] = useState(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
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

    console.log('updateGameState: Updating with game', gameData.id, {
      current_player: gameData.current_player,
      player1_id: gameData.player1_id,
      player2_id: gameData.player2_id,
      status: gameData.status,
      boardSample: gameData.board?.[0]?.slice(0, 3),
      used_pieces: gameData.used_pieces
    });
    
    // Validate and fix board data
    let validBoard = gameData.board;
    
    // Check if board is valid (2D array with all rows being arrays)
    const isValidBoard = Array.isArray(validBoard) && 
                         validBoard.length === BOARD_SIZE &&
                         validBoard.every(row => Array.isArray(row) && row.length === BOARD_SIZE);
    
    if (!isValidBoard) {
      console.log('updateGameState: Invalid board data, creating empty board');
      validBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    } else {
      // Convert any 0s to nulls for compatibility with game logic
      validBoard = validBoard.map(row => 
        row.map(cell => (cell === 0 ? null : cell))
      );
    }
    
    console.log('updateGameState: Board validated', { firstRow: validBoard[0] });
    
    setGame(gameData);
    setBoard(validBoard);
    setBoardPieces(gameData.board_pieces || {});
    setUsedPieces(Array.isArray(gameData.used_pieces) ? gameData.used_pieces : []);
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
      
      console.log('updateGameState: Player state', { playerNum, myTurn, current_player: gameData.current_player });

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
    }, 15000);

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
    console.log('handleCellClick:', { row, col, isMyTurn, selectedPiece, gameStatus: game?.status });
    
    if (!isMyTurn) {
      console.log('handleCellClick: Not my turn');
      return;
    }
    if (!selectedPiece) {
      console.log('handleCellClick: No piece selected');
      return;
    }
    if (game?.status !== 'active') {
      console.log('handleCellClick: Game not active');
      return;
    }

    const coords = getPieceCoords(selectedPiece, rotation, flipped);
    console.log('handleCellClick: Checking canPlacePiece', { row, col, coords, boardCell: board[row]?.[col] });
    
    if (canPlacePiece(board, row, col, coords)) {
      console.log('handleCellClick: Setting pending move');
      setPendingMove({ piece: selectedPiece, row, col });
      soundManager.playClickSound('place');
    } else {
      console.log('handleCellClick: Cannot place piece here');
    }
  };

  // Handle piece selection
  const handleSelectPiece = (pieceType) => {
    console.log('handleSelectPiece:', { pieceType, isMyTurn, isUsed: usedPieces.includes(pieceType), usedPieces });
    
    if (!isMyTurn) {
      console.log('handleSelectPiece: Not my turn');
      return;
    }
    if (usedPieces.includes(pieceType)) {
      console.log('handleSelectPiece: Piece already used');
      return;
    }
    
    console.log('handleSelectPiece: Selecting piece', pieceType);
    setSelectedPiece(pieceType);
    setRotation(0);
    setFlipped(false);
    setPendingMove(null);
    soundManager.playClickSound('select');
  };

  // Handle rotation
  const handleRotate = () => {
    if (!selectedPiece) return;
    setRotation((r) => (r + 90) % 360);
    soundManager.playClickSound('rotate');
    
    // Update pending move position if exists
    if (pendingMove) {
      setPendingMove({ ...pendingMove });
    }
  };

  // Handle flip
  const handleFlip = () => {
    if (!selectedPiece) return;
    setFlipped((f) => !f);
    soundManager.playClickSound('flip');
    
    if (pendingMove) {
      setPendingMove({ ...pendingMove });
    }
  };

  // Handle move piece with D-pad
  const handleMovePiece = (direction) => {
    if (!pendingMove) return;
    
    const { row, col } = pendingMove;
    let newRow = row;
    let newCol = col;
    
    switch (direction) {
      case 'up': newRow = Math.max(0, row - 1); break;
      case 'down': newRow = Math.min(BOARD_SIZE - 1, row + 1); break;
      case 'left': newCol = Math.max(0, col - 1); break;
      case 'right': newCol = Math.min(BOARD_SIZE - 1, col + 1); break;
      default: break;
    }
    
    setPendingMove({ ...pendingMove, row: newRow, col: newCol });
    soundManager.playClickSound('move');
  };

  // Handle confirm move
  const handleConfirm = async () => {
    console.log('handleConfirm: Starting...', { 
      pendingMove, 
      isMyTurn, 
      hasGame: !!game,
      myPlayerNumber,
      rotation,
      flipped
    });
    
    if (!pendingMove || !isMyTurn || !game) {
      console.log('handleConfirm: Cannot confirm', { pendingMove, isMyTurn, game: !!game });
      return;
    }

    const coords = getPieceCoords(pendingMove.piece, rotation, flipped);
    console.log('handleConfirm: Piece coords', { piece: pendingMove.piece, coords });
    
    if (!canPlacePiece(board, pendingMove.row, pendingMove.col, coords)) {
      console.log('handleConfirm: Invalid placement - canPlacePiece returned false');
      return;
    }

    console.log('handleConfirm: Confirming move', { piece: pendingMove.piece, row: pendingMove.row, col: pendingMove.col });

    soundManager.playClickSound('confirm');

    // Calculate new board state
    const newBoard = board.map(row => [...row]);
    const newBoardPieces = { ...boardPieces };
    
    // Place the piece on the board
    for (const [dx, dy] of coords) {
      const newRow = pendingMove.row + dy;
      const newCol = pendingMove.col + dx;
      newBoard[newRow][newCol] = myPlayerNumber; // 1 or 2
      newBoardPieces[`${newRow},${newCol}`] = pendingMove.piece;
    }
    
    console.log('handleConfirm: New board state calculated', { 
      newBoardSample: newBoard[pendingMove.row],
      newBoardPiecesSample: Object.keys(newBoardPieces).slice(0, 5)
    });
    
    // Add piece to used pieces
    const newUsedPieces = [...usedPieces, pendingMove.piece];
    
    // Determine next player
    const nextPlayer = myPlayerNumber === 1 ? 2 : 1;
    
    // Check if game is over (opponent can't place any pieces)
    const opponentCanMove = canAnyPieceBePlaced(newBoard, newUsedPieces);
    const gameOver = !opponentCanMove;
    const winnerId = gameOver ? user.id : null;
    
    console.log('handleConfirm: Calculated game state', { 
      newUsedPieces, 
      nextPlayer, 
      gameOver, 
      opponentCanMove 
    });

    // Send move to server with full state
    console.log('handleConfirm: Sending to server...');
    const { data: responseData, error: moveError } = await gameSyncService.makeMove(
      gameId,
      user.id,
      {
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
      }
    );

    console.log('handleConfirm: Server response', { responseData, moveError });

    if (moveError) {
      console.error('Move failed:', moveError);
      soundManager.playSound('invalid');
      return;
    }

    console.log('handleConfirm: Move successful, applying optimistic update');

    // Apply optimistic update to local state immediately
    // (The real-time subscription will confirm/correct this)
    setBoard(newBoard);
    setBoardPieces(newBoardPieces);
    setUsedPieces(newUsedPieces);
    setIsMyTurn(false); // It's now the opponent's turn

    // Clear selection
    setSelectedPiece(null);
    setPendingMove(null);
    setRotation(0);
    setFlipped(false);
    
    // If game is over, show game over modal
    if (gameOver) {
      setGameResult({
        isWin: true,
        winnerId: user.id,
        reason: 'normal'
      });
      setShowGameOver(true);
      soundManager.playSound('win');
    }
    
    // Backup: manually refresh game state after a short delay
    // This handles cases where real-time subscription might not be working
    setTimeout(async () => {
      console.log('handleConfirm: Fetching fresh game state as backup...');
      const { data: freshData } = await gameSyncService.getGame(gameId);
      if (freshData) {
        console.log('handleConfirm: Got fresh data, updating state');
        updateGameState(freshData, user.id);
      }
    }, 1000);
  };

  // Handle cancel
  const handleCancel = () => {
    setPendingMove(null);
    soundManager.playClickSound('cancel');
  };

  // Handle forfeit
  const handleForfeit = async () => {
    if (!game || game.status !== 'active') return;
    
    if (window.confirm('Are you sure you want to forfeit this game?')) {
      await gameSyncService.forfeitGame(gameId, user.id);
    }
  };

  // Handle game over modal close
  const handleCloseGameOver = () => {
    setShowGameOver(false);
    onGameEnd?.(gameResult);
  };

  // Handle leave
  const handleLeave = () => {
    soundManager.playButtonClick();
    onLeave();
  };

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="fixed inset-0 opacity-40 pointer-events-none" style={{
          backgroundImage: `linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} />
        <div className={`fixed top-1/4 right-1/4 w-64 h-64 ${theme.glow1} rounded-full blur-3xl pointer-events-none`} />
        <div className={`fixed bottom-1/4 left-1/4 w-64 h-64 ${theme.glow2} rounded-full blur-3xl pointer-events-none`} />
        
        <div className="relative text-center">
          <div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-amber-300 mb-6">Loading game...</p>
          <button
            onClick={handleLeave}
            className="px-6 py-2 text-slate-400 hover:text-slate-200 text-sm transition-colors"
          >
            ← Cancel
          </button>
        </div>
      </div>
    );
  }

  // Error screen
  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="fixed inset-0 opacity-40 pointer-events-none" style={{
          backgroundImage: `linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`,
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
              onClick={handleLeave}
              className="px-6 py-3 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all"
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Validate board data before rendering
  const isBoardValid = Array.isArray(board) && 
                       board.length === BOARD_SIZE && 
                       board.every(row => Array.isArray(row) && row.length === BOARD_SIZE);

  if (!isBoardValid) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="relative text-center">
          <div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-amber-300">Initializing game board...</p>
        </div>
      </div>
    );
  }

  // Calculate if confirm is possible
  const canConfirm = pendingMove && canPlacePiece(
    board,
    pendingMove.row,
    pendingMove.col,
    getPieceCoords(pendingMove.piece, rotation, flipped)
  );

  return (
    <div 
      className={needsScroll ? 'min-h-screen bg-slate-950' : 'h-screen bg-slate-950 overflow-hidden'}
      style={needsScroll ? {
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
      } : {}}
    >
      {/* Themed Grid background */}
      <div className="fixed inset-0 opacity-25 pointer-events-none" style={{
        backgroundImage: `linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />
      
      {/* Themed glow effects */}
      <div className={`fixed top-1/4 left-1/4 w-80 h-80 ${theme.glow1} rounded-full blur-3xl pointer-events-none`} />
      <div className={`fixed bottom-1/4 right-1/4 w-80 h-80 ${theme.glow2} rounded-full blur-3xl pointer-events-none`} />

      {/* Content */}
      <div className={`relative ${needsScroll ? 'min-h-screen' : 'h-full flex flex-col'} p-2 sm:p-4`}>
        <div className={`max-w-lg mx-auto w-full ${needsScroll ? '' : 'flex-1 flex flex-col'}`}>
          
          {/* Header - Centered Title with ONLINE subtitle */}
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div className="flex-1" /> {/* Spacer for centering */}
            <div className="text-center">
              <NeonTitle size="small" />
              <div className="text-xs font-bold tracking-[0.3em] bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">
                ONLINE
              </div>
            </div>
            <div className="flex-1 flex justify-end">
              <button 
                onClick={handleLeave}
                className={`px-3 py-1.5 bg-slate-800 ${theme.accent} rounded-lg text-xs sm:text-sm border ${theme.accentBorder} hover:bg-slate-700 shadow-[0_0_10px_rgba(251,191,36,0.3)]`}
              >
                MENU
              </button>
            </div>
          </div>

          {/* Turn Indicator */}
          <div className={`text-center py-2 mb-2 rounded-lg font-bold text-sm flex-shrink-0 ${
            isMyTurn 
              ? `${theme.accentBg} ${theme.accent} border ${theme.accentBorder}` 
              : 'bg-slate-800/50 text-slate-400 border border-slate-700/50'
          }`}>
            {game?.status === 'active' 
              ? (isMyTurn ? "YOUR TURN" : "Waiting for opponent...")
              : (game?.status === 'completed' ? "GAME OVER" : "Loading...")}
          </div>

          {/* Main Game Panel */}
          <div className={`bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-xl p-2 sm:p-4 mb-2 border ${theme.panelBorder} ${theme.panelShadow} ${needsScroll ? '' : 'flex-shrink-0'}`}>
            
            {/* Player Bar */}
            <OnlinePlayerBar 
              profile={profile}
              opponent={opponent}
              isMyTurn={isMyTurn}
              gameStatus={game?.status}
            />

            {/* Game Board */}
            <div className="flex justify-center pb-4">
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
                    className="flex-1 py-2 bg-slate-600 text-slate-300 rounded-lg hover:bg-slate-500 transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={!canConfirm}
                    className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg disabled:opacity-30 hover:from-amber-400 hover:to-orange-500 transition-all text-sm font-bold shadow-[0_0_15px_rgba(251,191,36,0.4)]"
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button
                  onClick={handleForfeit}
                  disabled={game?.status !== 'active'}
                  className="py-2 px-4 bg-slate-800 text-slate-400 rounded-lg hover:bg-red-900/50 hover:text-red-300 transition-all text-sm disabled:opacity-30"
                >
                  <Flag size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Piece Tray */}
          <div className={needsScroll ? '' : 'flex-1 min-h-0 overflow-auto'}>
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
          </div>
          
          {needsScroll && <div className="h-8" />}
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
