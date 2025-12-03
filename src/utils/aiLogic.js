import { pieces } from './pieces';
import { getPieceCoords, canPlacePiece, canAnyPieceBePlaced, BOARD_SIZE } from './gameLogic';

// AI Difficulty Levels
export const AI_DIFFICULTY = {
  RANDOM: 'random',      // Level 1: Random moves
  AVERAGE: 'average',    // Level 2: Basic strategy
  PROFESSIONAL: 'professional' // Level 3: Claude AI powered
};

// Evaluate a potential AI move (used for Average difficulty)
export const evaluateAIMove = (board, row, col, coords, pieceType, usedPieces) => {
  const simulatedBoard = board.map(r => [...r]);
  for (const [dx, dy] of coords) {
    simulatedBoard[row + dy][col + dx] = 2;
  }
  
  const simulatedUsedPieces = [...usedPieces, pieceType];
  
  if (!canAnyPieceBePlaced(simulatedBoard, simulatedUsedPieces)) {
    return 10000;
  }

  let opponentMoveCount = 0;
  const remainingPieces = Object.keys(pieces).filter(p => !simulatedUsedPieces.includes(p));
  
  for (const oppPiece of remainingPieces) {
    for (let f = 0; f < 2; f++) {
      for (let r = 0; r < 4; r++) {
        const oppCoords = getPieceCoords(oppPiece, r, f === 1);
        for (let r2 = 0; r2 < BOARD_SIZE; r2++) {
          for (let c2 = 0; c2 < BOARD_SIZE; c2++) {
            if (canPlacePiece(simulatedBoard, r2, c2, oppCoords)) {
              opponentMoveCount++;
            }
          }
        }
      }
    }
  }

  let score = 1000 - opponentMoveCount;

  for (const [dx, dy] of coords) {
    const r = row + dy;
    const c = col + dx;
    score += (7 - Math.abs(r - 3.5) - Math.abs(c - 3.5)) * 2;
    if (r === 0 || r === BOARD_SIZE - 1 || c === 0 || c === BOARD_SIZE - 1) {
      score -= 3;
    }
  }
  
  return score + Math.random() * 5;
};

// Get all possible moves for AI
export const getAllPossibleMoves = (board, usedPieces) => {
  const availablePieces = Object.keys(pieces).filter(p => !usedPieces.includes(p));
  const possibleMoves = [];

  for (const pieceType of availablePieces) {
    for (let flip = 0; flip < 2; flip++) {
      for (let rot = 0; rot < 4; rot++) {
        const coords = getPieceCoords(pieceType, rot, flip === 1);
        for (let row = 0; row < BOARD_SIZE; row++) {
          for (let col = 0; col < BOARD_SIZE; col++) {
            if (canPlacePiece(board, row, col, coords)) {
              possibleMoves.push({ pieceType, row, col, rot, flip: flip === 1 });
            }
          }
        }
      }
    }
  }

  return possibleMoves;
};

// Convert board state to string representation for Claude
const boardToString = (board, boardPieces) => {
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

// Format available pieces for Claude
const formatAvailablePieces = (usedPieces) => {
  const available = Object.keys(pieces).filter(p => !usedPieces.includes(p));
  return available.join(', ');
};

// Format possible moves for Claude
const formatPossibleMoves = (possibleMoves) => {
  // Group by piece type and limit to avoid token overflow
  const byPiece = {};
  for (const move of possibleMoves) {
    if (!byPiece[move.pieceType]) {
      byPiece[move.pieceType] = [];
    }
    if (byPiece[move.pieceType].length < 5) { // Limit examples per piece
      byPiece[move.pieceType].push(`(${move.row},${move.col} rot:${move.rot} flip:${move.flip})`);
    }
  }
  
  let result = '';
  for (const [piece, moves] of Object.entries(byPiece)) {
    result += `${piece}: ${moves.join(', ')}\n`;
  }
  return result;
};

// Call Claude AI for professional-level move
export const getClaudeAIMove = async (board, boardPieces, usedPieces, possibleMoves) => {
  const boardStr = boardToString(board, boardPieces);
  const availablePieces = formatAvailablePieces(usedPieces);
  const movesStr = formatPossibleMoves(possibleMoves);

  const prompt = `You are an expert Deadblock (Golomb's Game) player. This is a two-player pentomino placement game on an 8x8 board. Players take turns placing one of 12 unique pentomino pieces. The last player able to make a valid move wins.

CURRENT BOARD STATE:
${boardStr}

AVAILABLE PIECES: ${availablePieces}

SAMPLE VALID MOVES BY PIECE:
${movesStr}

STRATEGIC CONSIDERATIONS:
1. The goal is to be the LAST player able to place a piece
2. Try to limit opponent's options while preserving your own
3. Control the center early, but create awkward spaces opponent can't fill
4. Consider which pieces are most flexible for later use
5. Look for moves that could end the game (leave no valid moves for opponent)

You are playing as Player 2 (AI). Choose the BEST move.

RESPOND WITH ONLY A JSON OBJECT IN THIS EXACT FORMAT:
{"piece": "X", "row": 0, "col": 0, "rotation": 0, "flip": false, "reasoning": "brief explanation"}

Where piece is the letter (F,I,L,N,P,T,U,V,W,X,Y,Z), row/col are 0-7, rotation is 0-3, flip is true/false.`;

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
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate the move
        const coords = getPieceCoords(parsed.piece, parsed.rotation, parsed.flip);
        if (canPlacePiece(board, parsed.row, parsed.col, coords) && 
            !usedPieces.includes(parsed.piece)) {
          console.log('Claude AI reasoning:', parsed.reasoning);
          return {
            pieceType: parsed.piece,
            row: parsed.row,
            col: parsed.col,
            rot: parsed.rotation,
            flip: parsed.flip
          };
        }
      }
    }
  } catch (error) {
    console.error('Claude AI error:', error);
  }
  
  // Fallback to average difficulty if Claude fails
  return null;
};

// Select move based on difficulty level
export const selectAIMove = async (board, boardPieces, usedPieces, difficulty = AI_DIFFICULTY.AVERAGE) => {
  const possibleMoves = getAllPossibleMoves(board, usedPieces);
  
  if (possibleMoves.length === 0) {
    return null;
  }

  const isEarlyGame = usedPieces.length < 4;

  switch (difficulty) {
    case AI_DIFFICULTY.RANDOM:
      // Level 1: Completely random moves
      return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

    case AI_DIFFICULTY.PROFESSIONAL:
      // Level 3: Try Claude AI first
      const claudeMove = await getClaudeAIMove(board, boardPieces, usedPieces, possibleMoves);
      if (claudeMove) {
        return claudeMove;
      }
      // Fall through to average if Claude fails
      console.log('Falling back to average difficulty');

    case AI_DIFFICULTY.AVERAGE:
    default:
      // Level 2: Basic strategic evaluation
      for (const move of possibleMoves) {
        const coords = getPieceCoords(move.pieceType, move.rot, move.flip);
        let score = evaluateAIMove(board, move.row, move.col, coords, move.pieceType, usedPieces);
        if (isEarlyGame) {
          score += Math.random() * 200;
        }
        move.score = score;
      }

      possibleMoves.sort((a, b) => b.score - a.score);
      const bestScore = possibleMoves[0].score;
      const topMoves = possibleMoves.filter(m => m.score >= bestScore - (isEarlyGame ? 50 : 1));
      
      return topMoves[Math.floor(Math.random() * Math.min(isEarlyGame ? 5 : 2, topMoves.length))];
  }
};