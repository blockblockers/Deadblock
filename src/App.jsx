import { useState, useEffect } from 'react';
import { RotateCw, FlipHorizontal, User, Bot, Trophy, Undo, Plus, Check, X } from 'lucide-react';

export default function GolombGame() {
  const BOARD_SIZE = 8;
  const [board, setBoard] = useState(Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null)));
  const [boardPieces, setBoardPieces] = useState(Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null)));
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [usedPieces, setUsedPieces] = useState([]);
  const [moveHistory, setMoveHistory] = useState([]);
  const [gameMode, setGameMode] = useState(null);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [pendingMove, setPendingMove] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [currentPuzzle, setCurrentPuzzle] = useState(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const pieces = {
    F: [[0, 0], [0, 1], [1, 1], [2, 1], [1, 2]],
    I: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
    L: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]],
    N: [[0, 1], [0, 2], [0, 3], [1, 0], [1, 1]],
    P: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]],
    T: [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]],
    U: [[0, 0], [0, 1], [1, 1], [2, 0], [2, 1]],
    V: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]],
    W: [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2]],
    X: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]],
    Y: [[0, 1], [1, 0], [1, 1], [1, 2], [1, 3]],
    Z: [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2]]
  };

  // Neon color theme
  const pieceColors = {
    F: 'bg-gradient-to-br from-pink-400 via-pink-500 to-pink-600 shadow-[0_0_15px_rgba(236,72,153,0.7)]',
    I: 'bg-gradient-to-br from-cyan-400 via-cyan-500 to-cyan-600 shadow-[0_0_15px_rgba(34,211,238,0.7)]',
    L: 'bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 shadow-[0_0_15px_rgba(251,146,60,0.7)]',
    N: 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 shadow-[0_0_15px_rgba(96,165,250,0.7)]',
    P: 'bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 shadow-[0_0_15px_rgba(192,132,252,0.7)]',
    T: 'bg-gradient-to-br from-red-400 via-red-500 to-red-600 shadow-[0_0_15px_rgba(248,113,113,0.7)]',
    U: 'bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 shadow-[0_0_15px_rgba(253,224,71,0.7)]',
    V: 'bg-gradient-to-br from-green-400 via-green-500 to-green-600 shadow-[0_0_15px_rgba(74,222,128,0.7)]',
    W: 'bg-gradient-to-br from-rose-400 via-rose-500 to-rose-600 shadow-[0_0_15px_rgba(251,113,133,0.7)]',
    X: 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 shadow-[0_0_15px_rgba(251,191,36,0.7)]',
    Y: 'bg-gradient-to-br from-lime-400 via-lime-500 to-lime-600 shadow-[0_0_15px_rgba(163,230,53,0.7)]',
    Z: 'bg-gradient-to-br from-teal-400 via-teal-500 to-teal-600 shadow-[0_0_15px_rgba(45,212,191,0.7)]'
  };

  const puzzles = [
    {
      id: 1,
      name: "Endgame Position",
      difficulty: "3-move",
      description: "Find the winning move in this endgame position!",
      boardState: "GGGXGGGGGIXXXGNGGIGXGNNHGIUUUNHHGIUWUNGHGIWWFFGHGWWGGFFGGGGGGFGG",
      usedPieces: ['X', 'I', 'N', 'Y', 'U', 'W', 'F']
    }
  ];

  const rotatePiece = (coords) => coords.map(([x, y]) => [-y, x]);
  const flipPiece = (coords) => coords.map(([x, y]) => [-x, y]);

  const getPieceCoords = (pieceType, rot = rotation, flip = flipped) => {
    let coords = pieces[pieceType];
    if (flip) coords = flipPiece(coords);
    for (let i = 0; i < rot; i++) coords = rotatePiece(coords);
    return coords;
  };

  const canPlacePiece = (row, col, pieceCoords) => {
    for (const [dx, dy] of pieceCoords) {
      const newRow = row + dy, newCol = col + dx;
      if (newRow < 0 || newRow >= BOARD_SIZE || newCol < 0 || newCol >= BOARD_SIZE) return false;
      if (board[newRow][newCol] !== null) return false;
    }
    return true;
  };

  const isWithinBounds = (row, col, pieceCoords) => {
    for (const [dx, dy] of pieceCoords) {
      const newRow = row + dy, newCol = col + dx;
      if (newRow < 0 || newRow >= BOARD_SIZE || newCol < 0 || newCol >= BOARD_SIZE) return false;
    }
    return true;
  };

  const canAnyPieceBePlaced = (currentBoard, globalUsedPieces) => {
    for (const pieceType of Object.keys(pieces)) {
      if (globalUsedPieces.includes(pieceType)) continue;
      for (let flip = 0; flip < 2; flip++) {
        for (let rot = 0; rot < 4; rot++) {
          const coords = getPieceCoords(pieceType, rot, flip === 1);
          for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
              if (canPlacePiece(row, col, coords)) return true;
            }
          }
        }
      }
    }
    return false;
  };

  const commitMove = (row, col, piece, rot, flip) => {
    const pieceCoords = getPieceCoords(piece, rot, flip);
    if (!canPlacePiece(row, col, pieceCoords)) return false;

    const newBoard = board.map(r => [...r]);
    const newBoardPieces = boardPieces.map(r => [...r]);
    for (const [dx, dy] of pieceCoords) {
      newBoard[row + dy][col + dx] = currentPlayer;
      newBoardPieces[row + dy][col + dx] = piece;
    }

    const move = { player: currentPlayer, piece, row, col, rotation: rot, flipped: flip, board: board.map(r => [...r]), boardPieces: boardPieces.map(r => [...r]) };

    setBoard(newBoard);
    setBoardPieces(newBoardPieces);
    setUsedPieces([...usedPieces, piece]);
    setMoveHistory([...moveHistory, move]);
    setSelectedPiece(null);
    setRotation(0);
    setFlipped(false);
    setPendingMove(null);

    const nextPlayer = currentPlayer === 1 ? 2 : 1;
    if (!canAnyPieceBePlaced(newBoard, [...usedPieces, piece])) {
      setGameOver(true);
      setWinner(currentPlayer);
    } else {
      setCurrentPlayer(nextPlayer);
    }
    return true;
  };

  const findFittingOrientation = (row, col, piece, startRot, startFlip) => {
    let coords = getPieceCoords(piece, startRot, startFlip);
    if (isWithinBounds(row, col, coords)) return { rotation: startRot, flipped: startFlip };
    for (let flip = 0; flip < 2; flip++) {
      for (let rot = 0; rot < 4; rot++) {
        coords = getPieceCoords(piece, rot, flip === 1);
        if (isWithinBounds(row, col, coords)) return { rotation: rot, flipped: flip === 1 };
      }
    }
    return null;
  };

  const handleCellClick = (row, col) => {
    if (gameOver || ((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2)) return;
    
    if (pendingMove) {
      const piece = selectedPiece || pendingMove.piece;
      const fit = findFittingOrientation(row, col, piece, rotation, flipped);
      if (fit) {
        setRotation(fit.rotation);
        setFlipped(fit.flipped);
        setPendingMove({ row, col, piece, rotation: fit.rotation, flipped: fit.flipped });
      }
    } else if (selectedPiece) {
      const fit = findFittingOrientation(row, col, selectedPiece, rotation, flipped);
      if (fit) {
        setRotation(fit.rotation);
        setFlipped(fit.flipped);
        setPendingMove({ row, col, piece: selectedPiece, rotation: fit.rotation, flipped: fit.flipped });
      }
    }
  };

  const confirmMove = () => {
    if (pendingMove) commitMove(pendingMove.row, pendingMove.col, pendingMove.piece, rotation, flipped);
  };

  const cancelMove = () => {
    setPendingMove(null);
    setSelectedPiece(null);
    setRotation(0);
    setFlipped(false);
  };

  const movePendingPiece = (direction) => {
    if (!pendingMove) return;
    let newRow = pendingMove.row, newCol = pendingMove.col;
    if (direction === 'up') newRow -= 1;
    else if (direction === 'down') newRow += 1;
    else if (direction === 'left') newCol -= 1;
    else if (direction === 'right') newCol += 1;

    const pieceCoords = getPieceCoords(pendingMove.piece);
    if (isWithinBounds(newRow, newCol, pieceCoords)) {
      setPendingMove({ ...pendingMove, row: newRow, col: newCol });
    }
  };

  const undoMove = () => {
    if (moveHistory.length === 0 || gameOver) return;
    const lastMove = moveHistory[moveHistory.length - 1];
    setBoard(lastMove.board);
    setBoardPieces(lastMove.boardPieces);
    setUsedPieces(usedPieces.slice(0, -1));
    setMoveHistory(moveHistory.slice(0, -1));
    setCurrentPlayer(lastMove.player);
    setSelectedPiece(null);
    setRotation(0);
    setFlipped(false);
    setPendingMove(null);
  };

  const evaluateAIMove = (row, col, coords, pieceType) => {
    const simulatedBoard = board.map(r => [...r]);
    for (const [dx, dy] of coords) simulatedBoard[row + dy][col + dx] = 2;
    const simulatedUsedPieces = [...usedPieces, pieceType];
    if (!canAnyPieceBePlaced(simulatedBoard, simulatedUsedPieces)) return 10000;

    let opponentMoveCount = 0;
    const remainingPieces = Object.keys(pieces).filter(p => !simulatedUsedPieces.includes(p));
    for (const oppPiece of remainingPieces) {
      for (let f = 0; f < 2; f++) {
        for (let r = 0; r < 4; r++) {
          const oppCoords = getPieceCoords(oppPiece, r, f === 1);
          for (let r2 = 0; r2 < BOARD_SIZE; r2++) {
            for (let c2 = 0; c2 < BOARD_SIZE; c2++) {
              let canPlace = true;
              for (const [dx, dy] of oppCoords) {
                const newRow = r2 + dy, newCol = c2 + dx;
                if (newRow < 0 || newRow >= BOARD_SIZE || newCol < 0 || newCol >= BOARD_SIZE || simulatedBoard[newRow][newCol] !== null) {
                  canPlace = false;
                  break;
                }
              }
              if (canPlace) opponentMoveCount++;
            }
          }
        }
      }
    }

    let score = 1000 - opponentMoveCount;
    for (const [dx, dy] of coords) {
      const r = row + dy, c = col + dx;
      score += (7 - Math.abs(r - 3.5) - Math.abs(c - 3.5)) * 2;
      if (r === 0 || r === BOARD_SIZE - 1 || c === 0 || c === BOARD_SIZE - 1) score -= 3;
    }
    return score + Math.random() * 5;
  };

  const makeAIMove = () => {
    const availablePieces = Object.keys(pieces).filter(p => !usedPieces.includes(p));
    const possibleMoves = [];

    for (const pieceType of availablePieces) {
      for (let flip = 0; flip < 2; flip++) {
        for (let rot = 0; rot < 4; rot++) {
          const coords = getPieceCoords(pieceType, rot, flip === 1);
          for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
              if (canPlacePiece(row, col, coords)) {
                possibleMoves.push({ pieceType, row, col, rot, flip: flip === 1 });
              }
            }
          }
        }
      }
    }

    if (possibleMoves.length === 0) {
      setGameOver(true);
      setWinner(1);
      return;
    }

    setIsAIThinking(true);
    setTimeout(() => {
      const isEarlyGame = usedPieces.length < 4;
      
      for (const move of possibleMoves) {
        const coords = getPieceCoords(move.pieceType, move.rot, move.flip);
        let score = evaluateAIMove(move.row, move.col, coords, move.pieceType);
        if (isEarlyGame) score += Math.random() * 200;
        move.score = score;
      }

      possibleMoves.sort((a, b) => b.score - a.score);
      const bestScore = possibleMoves[0].score;
      const topMoves = possibleMoves.filter(m => m.score >= bestScore - (isEarlyGame ? 50 : 1));
      const move = topMoves[Math.floor(Math.random() * Math.min(isEarlyGame ? 5 : 2, topMoves.length))];
      commitMove(move.row, move.col, move.pieceType, move.rot, move.flip);
      
      setIsAIThinking(false);
    }, 800);
  };

  useEffect(() => {
    if ((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2 && !gameOver && !isAIThinking) {
      makeAIMove();
    }
  }, [currentPlayer, gameMode, gameOver, isAIThinking]);

  const resetGame = () => {
    if (gameMode === 'puzzle' && currentPuzzle) {
      loadPuzzle(currentPuzzle);
    } else {
      setBoard(Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null)));
      setBoardPieces(Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null)));
      setCurrentPlayer(1);
      setSelectedPiece(null);
      setRotation(0);
      setFlipped(false);
      setGameOver(false);
      setWinner(null);
      setUsedPieces([]);
      setMoveHistory([]);
      setPendingMove(null);
    }
  };

  const loadPuzzle = (puzzle) => {
    if (puzzle.boardState.length !== 64) return;

    const newBoard = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null));
    const newBoardPieces = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null));

    for (let i = 0; i < puzzle.boardState.length; i++) {
      const char = puzzle.boardState[i];
      if (char !== 'G') {
        const row = Math.floor(i / BOARD_SIZE), col = i % BOARD_SIZE;
        newBoard[row][col] = 1;
        newBoardPieces[row][col] = char === 'H' ? 'Y' : char;
      }
    }

    setBoard(newBoard);
    setBoardPieces(newBoardPieces);
    setUsedPieces([...puzzle.usedPieces]);
    setCurrentPuzzle(puzzle);
    setGameMode('puzzle');
    setCurrentPlayer(1);
    setSelectedPiece(null);
    setRotation(0);
    setFlipped(false);
    setMoveHistory([]);
    setPendingMove(null);
    setGameOver(false);
    setWinner(null);
  };

  const renderMiniPiece = (name, coords) => {
    const minX = Math.min(...coords.map(([x]) => x)), maxX = Math.max(...coords.map(([x]) => x));
    const minY = Math.min(...coords.map(([, y]) => y)), maxY = Math.max(...coords.map(([, y]) => y));
    const width = maxX - minX + 1, height = maxY - minY + 1;

    return (
      <div className="inline-flex flex-col gap-0.5">
        {Array(height).fill().map((_, row) => (
          <div key={row} className="flex gap-0.5">
            {Array(width).fill().map((_, col) => (
              <div key={col} className={`w-2 h-2 sm:w-3 sm:h-3 rounded-sm ${coords.some(([x, y]) => x === col + minX && y === row + minY) ? pieceColors[name] : 'bg-transparent'}`} />
            ))}
          </div>
        ))}
      </div>
    );
  };

  // Neon text style component
  const NeonTitle = ({ children, className = "" }) => (
    <h1 className={`font-bold bg-gradient-to-r from-pink-500 via-yellow-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(236,72,153,0.8)] ${className}`}>
      {children}
    </h1>
  );

  const [showHowToPlay, setShowHowToPlay] = useState(false);

  // Polyomino button component
  const PolyominoButton = ({ onClick, shape, color, glowColor, children }) => {
    const shapes = {
      T: [[1,0],[0,1],[1,1],[2,1]], // T-shape
      L: [[0,0],[0,1],[0,2],[1,2]], // L-shape
      Z: [[0,0],[1,0],[1,1],[2,1]], // Z-shape
      P: [[0,0],[1,0],[0,1],[1,1],[0,2]], // P-shape
    };
    const cells = shapes[shape] || shapes.T;
    
    return (
      <button onClick={onClick} className={`relative w-full p-4 ${color} rounded-xl hover:scale-105 transition-all duration-300 border border-white/20`} style={{ boxShadow: `0 0 25px ${glowColor}, inset 0 0 20px rgba(255,255,255,0.1)` }}>
        <div className="absolute top-2 left-2 opacity-30">
          <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(3, 8px)' }}>
            {[0,1,2].map(row => [0,1,2].map(col => (
              <div key={`${row}-${col}`} className={`w-2 h-2 rounded-sm ${cells.some(([r,c]) => r === col && c === row) ? 'bg-white' : 'bg-transparent'}`} />
            )))}
          </div>
        </div>
        {children}
      </button>
    );
  };

  // Menu Screen
  if (!gameMode) {
    return (
      <div className="min-h-screen relative p-4 flex items-center justify-center overflow-hidden bg-slate-950">
        {/* Animated grid background */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}></div>
        
        {/* Glow effects */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl"></div>
        
        <div className="relative bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full border border-cyan-500/30 shadow-[0_0_30px_rgba(34,211,238,0.3)]">
          <NeonTitle className="text-4xl sm:text-5xl text-center mb-2">DEADBLOCK</NeonTitle>
          <p className="text-center text-cyan-300/70 mb-6 tracking-widest text-xs sm:text-sm">CHOOSE YOUR MODE</p>
          
          <div className="space-y-3">
            <PolyominoButton onClick={() => { setGameMode('ai'); resetGame(); }} shape="T" color="bg-gradient-to-r from-purple-600/90 to-pink-600/90" glowColor="rgba(168,85,247,0.5)">
              <div className="flex items-center justify-center gap-3">
                <Bot size={26} className="drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
                <div className="text-left text-white">
                  <div className="text-lg font-bold tracking-wide">PLAY vs AI</div>
                  <div className="text-xs opacity-70">Challenge the machine</div>
                </div>
              </div>
            </PolyominoButton>
            
            <PolyominoButton onClick={() => { setGameMode('2player'); resetGame(); }} shape="L" color="bg-gradient-to-r from-cyan-600/90 to-blue-600/90" glowColor="rgba(34,211,238,0.5)">
              <div className="flex items-center justify-center gap-3">
                <User size={26} className="drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
                <div className="text-left text-white">
                  <div className="text-lg font-bold tracking-wide">2 PLAYER</div>
                  <div className="text-xs opacity-70">Local multiplayer</div>
                </div>
              </div>
            </PolyominoButton>

            <PolyominoButton onClick={() => setGameMode('puzzle-select')} shape="Z" color="bg-gradient-to-r from-green-600/90 to-emerald-600/90" glowColor="rgba(74,222,128,0.5)">
              <div className="flex items-center justify-center gap-3">
                <Trophy size={26} className="drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
                <div className="text-left text-white">
                  <div className="text-lg font-bold tracking-wide">PUZZLE MODE</div>
                  <div className="text-xs opacity-70">Tactical challenges</div>
                </div>
              </div>
            </PolyominoButton>

            <PolyominoButton onClick={() => setShowHowToPlay(true)} shape="P" color="bg-gradient-to-r from-amber-600/90 to-orange-600/90" glowColor="rgba(251,191,36,0.5)">
              <div className="flex items-center justify-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
                <div className="text-left text-white">
                  <div className="text-lg font-bold tracking-wide">HOW TO PLAY</div>
                  <div className="text-xs opacity-70">Learn the rules</div>
                </div>
              </div>
            </PolyominoButton>
          </div>
        </div>

        {/* How to Play Modal */}
        {showHowToPlay && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowHowToPlay(false)}>
            <div className="bg-slate-900/95 rounded-2xl p-6 max-w-lg w-full border border-amber-500/30 shadow-[0_0_40px_rgba(251,191,36,0.3)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-amber-300 tracking-wide">HOW TO PLAY</h2>
                <button onClick={() => setShowHowToPlay(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
                <div>
                  <h3 className="text-cyan-400 font-bold mb-1 tracking-wide">OBJECTIVE</h3>
                  <p>Be the last player to place a piece on the board. When your opponent cannot make a valid move, you win!</p>
                </div>
                
                <div>
                  <h3 className="text-pink-400 font-bold mb-1 tracking-wide">GAMEPLAY</h3>
                  <p>Players take turns placing one of the 12 unique pentomino pieces (shapes made of 5 squares) onto the 8×8 board. Each piece can only be used once per game by either player.</p>
                </div>
                
                <div>
                  <h3 className="text-green-400 font-bold mb-1 tracking-wide">PLACEMENT RULES</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Pieces cannot overlap with other pieces</li>
                    <li>Pieces must fit entirely within the board</li>
                    <li>You can rotate and flip pieces before placing</li>
                    <li>Once placed, pieces cannot be moved</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-purple-400 font-bold mb-1 tracking-wide">CONTROLS</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><span className="text-white">Select</span> a piece from the tray below the board</li>
                    <li><span className="text-white">Tap</span> a cell on the board to position it</li>
                    <li><span className="text-white">Rotate/Flip</span> to change orientation</li>
                    <li><span className="text-white">D-Pad</span> to fine-tune position</li>
                    <li><span className="text-white">Confirm</span> to place or <span className="text-white">Cancel</span> to pick a different piece</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-yellow-400 font-bold mb-1 tracking-wide">STRATEGY TIPS</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Control the center of the board early</li>
                    <li>Try to leave awkward spaces your opponent can't fill</li>
                    <li>Save flexible pieces for later in the game</li>
                    <li>Watch which pieces have been used!</li>
                  </ul>
                </div>
              </div>
              
              <button onClick={() => setShowHowToPlay(false)} className="w-full mt-6 p-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-bold tracking-wide hover:from-amber-500 hover:to-orange-500 transition-all shadow-[0_0_20px_rgba(251,191,36,0.4)]">
                GOT IT!
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Puzzle Select Screen
  if (gameMode === 'puzzle-select') {
    return (
      <div className="min-h-screen relative p-4 flex items-center justify-center overflow-hidden bg-slate-950">
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}></div>
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-green-500/20 rounded-full blur-3xl"></div>
        
        <div className="relative bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl p-8 max-w-2xl w-full border border-green-500/30 shadow-[0_0_30px_rgba(74,222,128,0.3)]">
          <div className="flex items-center justify-between mb-6">
            <NeonTitle className="text-3xl">SELECT PUZZLE</NeonTitle>
            <button onClick={() => setGameMode(null)} className="px-4 py-2 bg-slate-800 text-cyan-300 rounded-lg text-sm border border-cyan-500/30 hover:bg-slate-700 shadow-[0_0_10px_rgba(34,211,238,0.3)]">BACK</button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {puzzles.map(puzzle => (
              <button key={puzzle.id} onClick={() => loadPuzzle(puzzle)} className="w-full p-6 bg-slate-800/80 hover:bg-slate-700/80 rounded-xl border border-green-500/30 hover:border-green-400/50 transition-all shadow-[0_0_15px_rgba(74,222,128,0.2)] hover:shadow-[0_0_25px_rgba(74,222,128,0.4)] text-left">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-green-300">{puzzle.name}</h3>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30">{puzzle.difficulty}</span>
                </div>
                <p className="text-sm text-slate-400">{puzzle.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Game Screen
  return (
    <div className="min-h-screen relative p-2 sm:p-4 overflow-hidden bg-slate-950">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'linear-gradient(rgba(34,211,238,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.4) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }}></div>
      
      <div className="relative max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <NeonTitle className="text-xl sm:text-3xl md:text-4xl">DEADBLOCK</NeonTitle>
          <button onClick={() => setGameMode(null)} className="px-3 py-1.5 bg-slate-800 text-cyan-300 rounded-lg text-xs sm:text-sm border border-cyan-500/30 hover:bg-slate-700 shadow-[0_0_10px_rgba(34,211,238,0.3)]">MENU</button>
        </div>

        {gameMode === 'puzzle' && currentPuzzle && (
          <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-2 mb-2 text-center shadow-[0_0_15px_rgba(74,222,128,0.3)]">
            <span className="font-bold text-green-300 text-sm">{currentPuzzle.name}</span>
            <span className="text-green-400/70 text-xs ml-2">- {currentPuzzle.description}</span>
          </div>
        )}

        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-xl p-2 sm:p-4 mb-2 border border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <User className={currentPlayer === 1 ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" : "text-slate-600"} size={16} />
              <span className={`font-semibold text-xs sm:text-sm tracking-wide ${currentPlayer === 1 ? 'text-cyan-300' : 'text-slate-500'}`}>PLAYER 1</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-semibold text-xs sm:text-sm tracking-wide ${currentPlayer === 2 ? 'text-pink-300' : 'text-slate-500'}`}>{gameMode === 'ai' || gameMode === 'puzzle' ? 'AI' : 'PLAYER 2'}</span>
              {gameMode === 'ai' || gameMode === 'puzzle' ? <Bot className={currentPlayer === 2 ? "text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]" : "text-slate-600"} size={16} /> : <User className={currentPlayer === 2 ? "text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]" : "text-slate-600"} size={16} />}
            </div>
          </div>

          {isAIThinking && <div className="mb-2 p-2 bg-purple-900/50 border border-purple-500/50 rounded-lg text-center shadow-[0_0_15px_rgba(168,85,247,0.4)]"><span className="font-semibold text-purple-300 text-xs tracking-widest">AI PROCESSING...</span></div>}
          
          {gameOver && (
            <div className="mb-2 p-2 bg-yellow-900/50 border border-yellow-500/50 rounded-lg text-center shadow-[0_0_20px_rgba(253,224,71,0.5)]">
              <div className="flex items-center justify-center gap-2">
                <Trophy className="text-yellow-400 drop-shadow-[0_0_10px_rgba(253,224,71,0.8)]" size={16} />
                <span className="font-bold text-sm text-yellow-300 tracking-wide">{winner === 1 ? (gameMode === 'puzzle' ? 'PUZZLE SOLVED!' : 'PLAYER 1 WINS!') : (gameMode === 'ai' || gameMode === 'puzzle' ? 'AI WINS!' : 'PLAYER 2 WINS!')}</span>
              </div>
            </div>
          )}

          <div className="inline-grid gap-0.5 sm:gap-1 bg-slate-950 p-2 rounded-xl mx-auto touch-none shadow-[0_0_30px_rgba(34,211,238,0.3),inset_0_0_30px_rgba(0,0,0,0.5)] border border-cyan-500/30">
            {board.map((row, rowIdx) => (
              <div key={rowIdx} className="flex gap-0.5 sm:gap-1">
                {row.map((cell, colIdx) => {
                  const pieceName = boardPieces[rowIdx][colIdx];
                  const isPendingCell = pendingMove && getPieceCoords(pendingMove.piece, rotation, flipped).some(([dx, dy]) => rowIdx === pendingMove.row + dy && colIdx === pendingMove.col + dx);
                  const isPendingValid = pendingMove && canPlacePiece(pendingMove.row, pendingMove.col, getPieceCoords(pendingMove.piece, rotation, flipped));
                  
                  let bgClass;
                  if (isPendingCell) {
                    if (cell !== null && pieceName) {
                      bgClass = pieceColors[pieceName];
                    } else {
                      bgClass = pieceColors[pendingMove.piece];
                    }
                  } else if (cell !== null && pieceName) {
                    bgClass = pieceColors[pieceName];
                  } else {
                    bgClass = 'bg-slate-800/80 hover:bg-slate-700/80 border border-cyan-500/20 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]';
                  }
                  
                  return (
                    <button
                      key={colIdx}
                      onClick={() => handleCellClick(rowIdx, colIdx)}
                      className={`w-9 h-9 sm:w-12 sm:h-12 rounded-lg transition-all relative ${bgClass} ${
                        isPendingCell 
                          ? `${isPendingValid ? 'ring-2 ring-green-400 shadow-[0_0_25px_rgba(74,222,128,0.8)]' : 'ring-2 ring-red-500 shadow-[0_0_25px_rgba(239,68,68,0.8)] animate-pulse'}`
                          : ''
                      }`}
                      disabled={gameOver || ((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2)}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {pendingMove && (
            <div className="flex justify-center mt-3 mb-2">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28">
                <button onClick={() => movePendingPiece('up')} className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-cyan-600/80 hover:bg-cyan-500 text-white rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.5)] flex items-center justify-center border border-cyan-400/50"><svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg></button>
                <button onClick={() => movePendingPiece('down')} className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-cyan-600/80 hover:bg-cyan-500 text-white rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.5)] flex items-center justify-center border border-cyan-400/50"><svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg></button>
                <button onClick={() => movePendingPiece('left')} className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-cyan-600/80 hover:bg-cyan-500 text-white rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.5)] flex items-center justify-center border border-cyan-400/50"><svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg></button>
                <button onClick={() => movePendingPiece('right')} className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-cyan-600/80 hover:bg-cyan-500 text-white rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.5)] flex items-center justify-center border border-cyan-400/50"><svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg></button>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 sm:w-8 sm:h-8 bg-slate-800 rounded-full border border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.3)]"></div>
              </div>
            </div>
          )}

          <div className="flex gap-1 justify-between mt-2 flex-wrap">
            <button onClick={() => setRotation((rotation + 1) % 4)} className="flex-1 px-1.5 py-1.5 bg-purple-600/70 hover:bg-purple-500/70 text-white rounded-lg text-xs flex items-center justify-center gap-1 disabled:opacity-30 border border-purple-400/30 shadow-[0_0_10px_rgba(168,85,247,0.4)]" disabled={(!selectedPiece && !pendingMove) || gameOver || ((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2)}><RotateCw size={12} />ROTATE</button>
            <button onClick={() => setFlipped(!flipped)} className="flex-1 px-1.5 py-1.5 bg-indigo-600/70 hover:bg-indigo-500/70 text-white rounded-lg text-xs flex items-center justify-center gap-1 disabled:opacity-30 border border-indigo-400/30 shadow-[0_0_10px_rgba(99,102,241,0.4)]" disabled={(!selectedPiece && !pendingMove) || gameOver || ((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2)}><FlipHorizontal size={12} />FLIP</button>
            {pendingMove && canPlacePiece(pendingMove.row, pendingMove.col, getPieceCoords(pendingMove.piece, rotation, flipped)) && (
              <>
                <button onClick={confirmMove} className="flex-1 px-1.5 py-1.5 bg-green-600/70 hover:bg-green-500/70 text-white rounded-lg text-xs flex items-center justify-center gap-1 font-bold border border-green-400/30 shadow-[0_0_15px_rgba(74,222,128,0.5)]"><Check size={12} />CONFIRM</button>
                <button onClick={cancelMove} className="flex-1 px-1.5 py-1.5 bg-red-600/70 hover:bg-red-500/70 text-white rounded-lg text-xs flex items-center justify-center gap-1 border border-red-400/30 shadow-[0_0_10px_rgba(239,68,68,0.4)]"><X size={12} />CANCEL</button>
              </>
            )}
            {(!pendingMove || !canPlacePiece(pendingMove.row, pendingMove.col, getPieceCoords(pendingMove.piece, rotation, flipped))) && (
              <>
                {pendingMove && <button onClick={cancelMove} className="flex-1 px-1.5 py-1.5 bg-red-600/70 hover:bg-red-500/70 text-white rounded-lg text-xs flex items-center justify-center gap-1 border border-red-400/30 shadow-[0_0_10px_rgba(239,68,68,0.4)]"><X size={12} />CANCEL</button>}
                {!pendingMove && (
                  <>
                    <button onClick={undoMove} className="flex-1 px-1.5 py-1.5 bg-orange-600/70 hover:bg-orange-500/70 text-white rounded-lg text-xs flex items-center justify-center gap-1 disabled:opacity-30 border border-orange-400/30 shadow-[0_0_10px_rgba(251,146,60,0.4)]" disabled={moveHistory.length === 0 || gameOver || ((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2)}><Undo size={12} /></button>
                    <button onClick={resetGame} className="flex-1 px-1.5 py-1.5 bg-slate-700/70 hover:bg-slate-600/70 text-white rounded-lg text-xs flex items-center justify-center gap-1 border border-slate-500/30 shadow-[0_0_10px_rgba(100,116,139,0.3)]"><Plus size={12} /></button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-xl p-2 border border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.2)] mt-2">
          <div className="text-xs font-semibold text-cyan-300/70 text-center mb-2 tracking-widest">PIECES: {usedPieces.length}/12 USED</div>
          <div className="grid grid-cols-6 gap-1.5">
            {Object.entries(pieces).map(([name, coords]) => {
              const isUsed = usedPieces.includes(name);
              return (
                <button key={name} onClick={() => { if (!isUsed && !pendingMove) { setSelectedPiece(name); setRotation(0); setFlipped(false); }}} className={`p-1.5 rounded-lg transition-all flex items-center justify-center relative overflow-hidden ${isUsed ? 'bg-slate-800/50 opacity-30 cursor-not-allowed' : selectedPiece === name ? 'bg-slate-700 ring-2 ring-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.6)]' : 'bg-slate-800/80 hover:bg-slate-700/80 border border-cyan-500/20'}`} disabled={gameOver || isUsed || ((gameMode === 'ai' || gameMode === 'puzzle') && currentPlayer === 2) || (!!pendingMove && isMobile)}>{renderMiniPiece(name, coords)}</button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}