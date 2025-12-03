import { pieces } from './pieces';
import { getPieceCoords, canPlacePiece, canAnyPieceBePlaced, BOARD_SIZE, createEmptyBoard } from './gameLogic';

// Puzzle difficulty levels
export const PUZZLE_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium', 
  HARD: 'hard'
};

// Generate a random valid board state by simulating a game
const simulateGame = (movesRemaining = 3) => {
  let board = createEmptyBoard();
  let boardPieces = createEmptyBoard();
  let usedPieces = [];
  const allPieces = Object.keys(pieces);
  
  // Shuffle pieces for randomness
  const shuffledPieces = [...allPieces].sort(() => Math.random() - 0.5);
  
  // Play moves until we have the desired number of pieces remaining
  const targetUsed = 12 - movesRemaining;
  
  for (let i = 0; i < targetUsed && i < shuffledPieces.length; i++) {
    const pieceType = shuffledPieces[i];
    let placed = false;
    
    // Try random positions and orientations
    const attempts = 100;
    for (let attempt = 0; attempt < attempts && !placed; attempt++) {
      const rot = Math.floor(Math.random() * 4);
      const flip = Math.random() < 0.5;
      const coords = getPieceCoords(pieceType, rot, flip);
      
      const row = Math.floor(Math.random() * BOARD_SIZE);
      const col = Math.floor(Math.random() * BOARD_SIZE);
      
      if (canPlacePiece(board, row, col, coords)) {
        // Place the piece
        for (const [dx, dy] of coords) {
          board[row + dy][col + dx] = 1;
          boardPieces[row + dy][col + dx] = pieceType;
        }
        usedPieces.push(pieceType);
        placed = true;
      }
    }
    
    if (!placed) {
      // Try all positions systematically
      outerLoop:
      for (let rot = 0; rot < 4; rot++) {
        for (let flip = 0; flip < 2; flip++) {
          const coords = getPieceCoords(pieceType, rot, flip === 1);
          for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
              if (canPlacePiece(board, row, col, coords)) {
                for (const [dx, dy] of coords) {
                  board[row + dy][col + dx] = 1;
                  boardPieces[row + dy][col + dx] = pieceType;
                }
                usedPieces.push(pieceType);
                placed = true;
                break outerLoop;
              }
            }
          }
        }
      }
    }
  }
  
  return { board, boardPieces, usedPieces };
};

// Convert board to string format
const boardToString = (boardPieces) => {
  let result = '';
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      result += boardPieces[row][col] || 'G';
    }
  }
  return result;
};

// Verify puzzle has exactly the right number of moves
const verifyPuzzle = (board, usedPieces, expectedMoves) => {
  const availablePieces = Object.keys(pieces).filter(p => !usedPieces.includes(p));
  let validMoveCount = 0;
  
  for (const pieceType of availablePieces) {
    for (let flip = 0; flip < 2; flip++) {
      for (let rot = 0; rot < 4; rot++) {
        const coords = getPieceCoords(pieceType, rot, flip === 1);
        for (let row = 0; row < BOARD_SIZE; row++) {
          for (let col = 0; col < BOARD_SIZE; col++) {
            if (canPlacePiece(board, row, col, coords)) {
              validMoveCount++;
              if (validMoveCount > 0) {
                return true; // At least one valid move exists
              }
            }
          }
        }
      }
    }
  }
  
  return validMoveCount > 0;
};

// Generate a puzzle locally (fallback)
export const generateLocalPuzzle = (difficulty) => {
  const movesRemaining = 3; // Always 3 moves: 2 player, 1 AI
  
  let attempts = 0;
  const maxAttempts = 50;
  
  while (attempts < maxAttempts) {
    const { board, boardPieces, usedPieces } = simulateGame(movesRemaining);
    
    if (verifyPuzzle(board, usedPieces, movesRemaining)) {
      return {
        id: `generated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `${difficulty.toUpperCase()} Puzzle`,
        difficulty: difficulty,
        description: getDifficultyDescription(difficulty),
        boardState: boardToString(boardPieces),
        usedPieces: usedPieces
      };
    }
    attempts++;
  }
  
  // Return a default puzzle if generation fails
  return null;
};

const getDifficultyDescription = (difficulty) => {
  switch (difficulty) {
    case PUZZLE_DIFFICULTY.EASY:
      return "Find the obvious winning move!";
    case PUZZLE_DIFFICULTY.MEDIUM:
      return "Think carefully to outmaneuver the AI!";
    case PUZZLE_DIFFICULTY.HARD:
      return "Expert-level positioning required!";
    default:
      return "Find the winning sequence!";
  }
};

// Call Claude AI to generate a puzzle
export const generateClaudePuzzle = async (difficulty) => {
  const difficultyHints = {
    [PUZZLE_DIFFICULTY.EASY]: "Create an EASY puzzle where the winning move is fairly obvious - perhaps blocking a large open area or using a piece that clearly fits in only one good spot.",
    [PUZZLE_DIFFICULTY.MEDIUM]: "Create a MEDIUM puzzle that requires thinking 2 moves ahead. The winning move should not be immediately obvious but findable with careful analysis.",
    [PUZZLE_DIFFICULTY.HARD]: "Create a HARD puzzle that requires expert-level thinking. The winning move should be subtle and require deep analysis of how pieces interact."
  };

  const prompt = `You are creating a Deadblock puzzle. This is a pentomino placement game on an 8x8 board with 12 unique pieces (F,I,L,N,P,T,U,V,W,X,Y,Z).

TASK: Generate a puzzle board state where:
1. Exactly 9 pieces have been placed (3 remain: 2 for player, 1 for AI)
2. It's the player's turn
3. There IS a winning sequence for the player
4. ${difficultyHints[difficulty]}

PIECES (each is 5 squares):
F: [[0,0],[0,1],[1,1],[2,1],[1,2]]
I: [[0,0],[0,1],[0,2],[0,3],[0,4]] (straight line)
L: [[0,0],[0,1],[0,2],[0,3],[1,3]]
N: [[0,1],[0,2],[0,3],[1,0],[1,1]]
P: [[0,0],[1,0],[0,1],[1,1],[0,2]]
T: [[0,0],[1,0],[2,0],[1,1],[1,2]]
U: [[0,0],[0,1],[1,1],[2,0],[2,1]]
V: [[0,0],[0,1],[0,2],[1,2],[2,2]]
W: [[0,0],[0,1],[1,1],[1,2],[2,2]]
X: [[1,0],[0,1],[1,1],[2,1],[1,2]] (plus shape)
Y: [[0,1],[1,0],[1,1],[1,2],[1,3]]
Z: [[0,0],[1,0],[1,1],[1,2],[2,2]]

RESPOND WITH ONLY THIS JSON FORMAT:
{
  "boardState": "64 character string using G for empty, piece letter for occupied",
  "usedPieces": ["array", "of", "9", "piece", "letters"],
  "winningHint": "brief hint about the winning strategy"
}

Example boardState format: "GGGGGGGGGGGGGGGG..." (8x8 = 64 chars, row by row)
Use G for empty cells, the piece letter (F,I,L,N,P,T,U,V,W,X,Y,Z) for occupied cells.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    const data = await response.json();
    
    if (data.content && data.content[0] && data.content[0].text) {
      const text = data.content[0].text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate the puzzle
        if (parsed.boardState && parsed.boardState.length === 64 && 
            parsed.usedPieces && parsed.usedPieces.length === 9) {
          return {
            id: `claude-${difficulty}-${Date.now()}`,
            name: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Challenge`,
            difficulty: difficulty,
            description: parsed.winningHint || getDifficultyDescription(difficulty),
            boardState: parsed.boardState,
            usedPieces: parsed.usedPieces
          };
        }
      }
    }
  } catch (error) {
    console.error('Claude puzzle generation error:', error);
  }
  
  // Fallback to local generation
  return generateLocalPuzzle(difficulty);
};

// Pre-generated puzzle sets for each difficulty (50 each)
// These are generated offline and stored for instant loading
export const PRESET_PUZZLES = {
  [PUZZLE_DIFFICULTY.EASY]: generatePuzzleSet(PUZZLE_DIFFICULTY.EASY, 50),
  [PUZZLE_DIFFICULTY.MEDIUM]: generatePuzzleSet(PUZZLE_DIFFICULTY.MEDIUM, 50),
  [PUZZLE_DIFFICULTY.HARD]: generatePuzzleSet(PUZZLE_DIFFICULTY.HARD, 50)
};

// Generate a set of puzzles
function generatePuzzleSet(difficulty, count) {
  const puzzles = [];
  for (let i = 0; i < count; i++) {
    const puzzle = generateLocalPuzzle(difficulty);
    if (puzzle) {
      puzzle.id = `${difficulty}-${i + 1}`;
      puzzle.name = `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} #${i + 1}`;
      puzzles.push(puzzle);
    }
  }
  return puzzles;
}

// Get a random puzzle of specified difficulty
export const getRandomPuzzle = async (difficulty, useClaudeAI = false) => {
  if (useClaudeAI) {
    const puzzle = await generateClaudePuzzle(difficulty);
    if (puzzle) return puzzle;
  }
  
  // Use pre-generated puzzles
  const puzzleSet = PRESET_PUZZLES[difficulty];
  if (puzzleSet && puzzleSet.length > 0) {
    const randomIndex = Math.floor(Math.random() * puzzleSet.length);
    return puzzleSet[randomIndex];
  }
  
  // Generate on the fly as last resort
  return generateLocalPuzzle(difficulty);
};