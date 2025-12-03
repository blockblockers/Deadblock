import { pieces } from './pieces';
import { getPieceCoords, canPlacePiece, canAnyPieceBePlaced, BOARD_SIZE, createEmptyBoard } from './gameLogic';

// Puzzle difficulty levels with corresponding moves remaining
export const PUZZLE_DIFFICULTY = {
  EASY: 'easy',      // 3 moves remaining
  MEDIUM: 'medium',  // 5 moves remaining
  HARD: 'hard'       // 7 moves remaining
};

// Get moves remaining for each difficulty
export const getMovesForDifficulty = (difficulty) => {
  switch (difficulty) {
    case PUZZLE_DIFFICULTY.EASY: return 3;
    case PUZZLE_DIFFICULTY.MEDIUM: return 5;
    case PUZZLE_DIFFICULTY.HARD: return 7;
    default: return 3;
  }
};

// Convert board to string format for display to Claude
const boardToDisplayString = (board, boardPieces) => {
  let result = '  0 1 2 3 4 5 6 7\n';
  for (let row = 0; row < BOARD_SIZE; row++) {
    result += `${row} `;
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (boardPieces[row][col]) {
        result += boardPieces[row][col] + ' ';
      } else {
        result += '. ';
      }
    }
    result += '\n';
  }
  return result;
};

// Convert boardPieces array to 64-char string
const boardToString = (boardPieces) => {
  let result = '';
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      result += boardPieces[row][col] || 'G';
    }
  }
  return result;
};

// Get all valid moves for available pieces
const getAllValidMoves = (board, usedPieces) => {
  const availablePieces = Object.keys(pieces).filter(p => !usedPieces.includes(p));
  const validMoves = [];

  for (const pieceType of availablePieces) {
    for (let flip = 0; flip < 2; flip++) {
      for (let rot = 0; rot < 4; rot++) {
        const coords = getPieceCoords(pieceType, rot, flip === 1);
        for (let row = 0; row < BOARD_SIZE; row++) {
          for (let col = 0; col < BOARD_SIZE; col++) {
            if (canPlacePiece(board, row, col, coords)) {
              validMoves.push({ pieceType, row, col, rot, flip: flip === 1, coords });
            }
          }
        }
      }
    }
  }

  return validMoves;
};

// Place a piece on the board (mutates the arrays)
const placePieceOnBoard = (board, boardPieces, row, col, pieceType, coords) => {
  for (const [dx, dy] of coords) {
    board[row + dy][col + dx] = 1;
    boardPieces[row + dy][col + dx] = pieceType;
  }
};

// Get difficulty description
const getDifficultyDescription = (difficulty) => {
  const moves = getMovesForDifficulty(difficulty);
  switch (difficulty) {
    case PUZZLE_DIFFICULTY.EASY:
      return `${moves} moves left - Find the winning sequence!`;
    case PUZZLE_DIFFICULTY.MEDIUM:
      return `${moves} moves left - Think ahead to win!`;
    case PUZZLE_DIFFICULTY.HARD:
      return `${moves} moves left - Expert challenge!`;
    default:
      return "Find the winning sequence!";
  }
};

// Generate puzzle using Claude AI to simulate a real game
export const generateClaudePuzzle = async (difficulty, onProgress = null) => {
  const movesRemaining = getMovesForDifficulty(difficulty);
  const piecesToPlace = 12 - movesRemaining;
  
  // Start with empty board
  let board = createEmptyBoard();
  let boardPieces = createEmptyBoard();
  let usedPieces = [];
  let moveCount = 0;

  const pieceDefinitions = `PIECES (each is 5 squares, format is [x,y] offsets):
F: [[0,0],[0,1],[1,1],[2,1],[1,2]]
I: [[0,0],[0,1],[0,2],[0,3],[0,4]] (straight vertical line)
L: [[0,0],[0,1],[0,2],[0,3],[1,3]]
N: [[0,1],[0,2],[0,3],[1,0],[1,1]]
P: [[0,0],[1,0],[0,1],[1,1],[0,2]]
T: [[0,0],[1,0],[2,0],[1,1],[1,2]]
U: [[0,0],[0,1],[1,1],[2,0],[2,1]]
V: [[0,0],[0,1],[0,2],[1,2],[2,2]]
W: [[0,0],[0,1],[1,1],[1,2],[2,2]]
X: [[1,0],[0,1],[1,1],[2,1],[1,2]] (plus/cross shape)
Y: [[0,1],[1,0],[1,1],[1,2],[1,3]]
Z: [[0,0],[1,0],[1,1],[1,2],[2,2]]`;

  // Have Claude play out moves one at a time
  while (moveCount < piecesToPlace) {
    // Report progress if callback provided
    if (onProgress) {
      onProgress(moveCount, piecesToPlace);
    }
    
    const currentBoardStr = boardToDisplayString(board, boardPieces);
    const availablePieces = Object.keys(pieces).filter(p => !usedPieces.includes(p));
    
    // Get sample valid moves for context
    const validMoves = getAllValidMoves(board, usedPieces);
    if (validMoves.length === 0) {
      console.log('No valid moves available, stopping early');
      break;
    }

    // Format sample moves (limit to prevent token overflow)
    const sampleMoves = {};
    for (const move of validMoves.slice(0, 50)) {
      if (!sampleMoves[move.pieceType]) {
        sampleMoves[move.pieceType] = [];
      }
      if (sampleMoves[move.pieceType].length < 3) {
        sampleMoves[move.pieceType].push(`row:${move.row},col:${move.col},rot:${move.rot},flip:${move.flip}`);
      }
    }
    
    const movesStr = Object.entries(sampleMoves)
      .map(([piece, moves]) => `${piece}: ${moves.join(' | ')}`)
      .join('\n');

    const prompt = `You are playing Deadblock, a strategic pentomino game. Place pieces to create an interesting puzzle position.

${pieceDefinitions}

CURRENT BOARD (. = empty, letters = placed pieces):
${currentBoardStr}

MOVE ${moveCount + 1} of ${piecesToPlace}
Available pieces: ${availablePieces.join(', ')}
Pieces already used: ${usedPieces.length > 0 ? usedPieces.join(', ') : 'None'}

SAMPLE VALID PLACEMENTS:
${movesStr}

STRATEGY: Create an interesting game state. Vary piece placement across the board. Don't cluster everything in one corner. Leave playable spaces for the remaining ${movesRemaining} moves.

RESPOND WITH ONLY JSON:
{"piece": "X", "row": 0, "col": 0, "rotation": 0, "flip": false}

Where piece is a letter (${availablePieces.join(',')}), row/col are 0-7, rotation is 0-3, flip is true/false.`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = await response.json();
      
      if (data.content && data.content[0] && data.content[0].text) {
        const text = data.content[0].text;
        const jsonMatch = text.match(/\{[\s\S]*?\}/);
        
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const { piece, row, col, rotation, flip } = parsed;
          
          // Validate the move
          if (availablePieces.includes(piece)) {
            const coords = getPieceCoords(piece, rotation || 0, flip || false);
            
            if (canPlacePiece(board, row, col, coords)) {
              placePieceOnBoard(board, boardPieces, row, col, piece, coords);
              usedPieces.push(piece);
              moveCount++;
              console.log(`Placed piece ${piece} at (${row},${col}) - Move ${moveCount}/${piecesToPlace}`);
              continue;
            }
          }
        }
      }
      
      // If Claude's move was invalid, pick a random valid move
      console.log('Claude move invalid, using random fallback');
      const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
      placePieceOnBoard(board, boardPieces, randomMove.row, randomMove.col, randomMove.pieceType, randomMove.coords);
      usedPieces.push(randomMove.pieceType);
      moveCount++;
      
    } catch (error) {
      console.error('Claude API error:', error);
      // Fallback to random move
      const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
      placePieceOnBoard(board, boardPieces, randomMove.row, randomMove.col, randomMove.pieceType, randomMove.coords);
      usedPieces.push(randomMove.pieceType);
      moveCount++;
    }
  }

  // Final progress update
  if (onProgress) {
    onProgress(piecesToPlace, piecesToPlace);
  }

  // Verify the puzzle is valid (remaining pieces can still be placed)
  if (!canAnyPieceBePlaced(board, usedPieces)) {
    console.log('Generated puzzle has no valid moves, regenerating...');
    return generateLocalPuzzle(difficulty);
  }

  return {
    id: `claude-${difficulty}-${Date.now()}`,
    name: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Challenge`,
    difficulty: difficulty,
    description: getDifficultyDescription(difficulty),
    boardState: boardToString(boardPieces),
    usedPieces: usedPieces,
    movesRemaining: movesRemaining
  };
};

// Generate puzzle locally (fallback when Claude isn't available)
export const generateLocalPuzzle = (difficulty) => {
  const movesRemaining = getMovesForDifficulty(difficulty);
  const piecesToPlace = 12 - movesRemaining;
  
  let attempts = 0;
  const maxAttempts = 20;
  
  while (attempts < maxAttempts) {
    let board = createEmptyBoard();
    let boardPieces = createEmptyBoard();
    let usedPieces = [];
    
    // Shuffle pieces for variety
    const allPieces = Object.keys(pieces).sort(() => Math.random() - 0.5);
    
    // Place pieces one by one
    for (let i = 0; i < piecesToPlace && i < allPieces.length; i++) {
      const pieceType = allPieces[i];
      const validMoves = getAllValidMoves(board, usedPieces).filter(m => m.pieceType === pieceType);
      
      if (validMoves.length > 0) {
        // Pick a random valid placement for this piece
        const move = validMoves[Math.floor(Math.random() * validMoves.length)];
        placePieceOnBoard(board, boardPieces, move.row, move.col, pieceType, move.coords);
        usedPieces.push(pieceType);
      }
    }
    
    // Verify puzzle validity
    if (usedPieces.length === piecesToPlace && canAnyPieceBePlaced(board, usedPieces)) {
      return {
        id: `local-${difficulty}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        name: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Puzzle`,
        difficulty: difficulty,
        description: getDifficultyDescription(difficulty),
        boardState: boardToString(boardPieces),
        usedPieces: usedPieces,
        movesRemaining: movesRemaining
      };
    }
    
    attempts++;
  }
  
  console.error('Failed to generate valid puzzle after max attempts');
  return null;
};

// Main function to get a puzzle - always uses Claude AI
export const getRandomPuzzle = async (difficulty, useClaudeAI = true, onProgress = null) => {
  const movesRemaining = getMovesForDifficulty(difficulty);
  console.log(`Generating ${difficulty} puzzle (${movesRemaining} moves remaining, ${12 - movesRemaining} pieces to place)...`);
  
  if (useClaudeAI) {
    try {
      const puzzle = await generateClaudePuzzle(difficulty, onProgress);
      if (puzzle) {
        console.log('Claude-generated puzzle ready:', puzzle.id);
        return puzzle;
      }
    } catch (error) {
      console.error('Claude puzzle generation failed:', error);
    }
  }
  
  // Fallback to local generation
  console.log('Using local puzzle generation fallback');
  return generateLocalPuzzle(difficulty);
};
