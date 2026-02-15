
import { Piece, Player, Position, Move, AIDifficulty } from '../types';

/**
 * Initializes the board with 16 pieces for each player according to Kurdish/Turkish Draughts rules.
 */
export const INITIAL_BOARD = (): (Piece | null)[][] => {
  const board: (Piece | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  
  for (let c = 0; c < 8; c++) {
    board[1][c] = { id: `black-1-${c}`, player: 'black', isKing: false };
    board[2][c] = { id: `black-2-${c}`, player: 'black', isKing: false };
    board[5][c] = { id: `white-5-${c}`, player: 'white', isKing: false };
    board[6][c] = { id: `white-6-${c}`, player: 'white', isKing: false };
  }
  return board;
};

const cloneBoard = (board: (Piece | null)[][]) => board.map(row => [...row]);

const findCapturePaths = (
  board: (Piece | null)[][],
  r: number,
  c: number,
  player: Player,
  isKing: boolean,
  currentPath: Position[] = [],
  currentCaptured: Position[] = [],
  originalFrom?: Position
): Move[] => {
  const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  const allPaths: Move[] = [];
  const from = originalFrom || { r, c };

  if (!isKing && ((player === 'white' && r === 0) || (player === 'black' && r === 7))) {
    return [];
  }

  for (const [dr, dc] of directions) {
    if (!isKing) {
      if (player === 'white' && dr === 1) continue;
      if (player === 'black' && dr === -1) continue;
    }

    if (isKing) {
      let nr = r + dr;
      let nc = c + dc;
      let pieceToJump: Position | null = null;

      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const target = board[nr][nc];
        if (target) {
          if (target.player === player) break;
          if (pieceToJump) break;
          if (currentCaptured.some(p => p.r === nr && p.c === nc)) break;
          pieceToJump = { r: nr, c: nc };
        } else if (pieceToJump) {
          const nextBoard = cloneBoard(board);
          nextBoard[pieceToJump.r][pieceToJump.c] = null;
          nextBoard[r][c] = null;
          nextBoard[nr][nc] = board[r][c];

          const nextCaptured = [...currentCaptured, pieceToJump];
          const nextPath = [...currentPath, { r: nr, c: nc }];

          const subPaths = findCapturePaths(nextBoard, nr, nc, player, true, nextPath, nextCaptured, from);
          if (subPaths.length > 0) {
            allPaths.push(...subPaths);
          } else {
            allPaths.push({ from, to: { r: nr, c: nc }, path: nextPath, captured: nextCaptured });
          }
        }
        nr += dr;
        nc += dc;
      }
    } else {
      const enemyR = r + dr;
      const enemyC = c + dc;
      const landR = r + dr * 2;
      const landC = c + dc * 2;

      if (landR >= 0 && landR < 8 && landC >= 0 && landC < 8) {
        const enemy = board[enemyR][enemyC];
        const land = board[landR][landC];

        if (enemy && enemy.player !== player && !land) {
          const nextBoard = cloneBoard(board);
          nextBoard[enemyR][enemyC] = null;
          nextBoard[r][c] = null;
          nextBoard[landR][landC] = board[r][c];

          const nextCaptured = [...currentCaptured, { r: enemyR, c: enemyC }];
          const nextPath = [...currentPath, { r: landR, c: landC }];

          const subPaths = findCapturePaths(nextBoard, landR, landC, player, false, nextPath, nextCaptured, from);
          if (subPaths.length > 0) {
            allPaths.push(...subPaths);
          } else {
            allPaths.push({ from, to: { r: landR, c: landC }, path: nextPath, captured: nextCaptured });
          }
        }
      }
    }
  }

  return allPaths;
};

export const getValidMoves = (board: (Piece | null)[][], r: number, c: number): Move[] => {
  const piece = board[r][c];
  if (!piece) return [];

  const captureMoves = findCapturePaths(board, r, c, piece.player, piece.isKing);
  if (captureMoves.length > 0) {
    return captureMoves;
  }

  const moves: Move[] = [];
  const directions = piece.isKing 
    ? [[0, 1], [0, -1], [1, 0], [-1, 0]]
    : [[0, 1], [0, -1], (piece.player === 'white' ? [-1, 0] : [1, 0])];

  for (const [dr, dc] of directions) {
    let nr = r + dr;
    let nc = c + dc;
    
    if (piece.isKing) {
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !board[nr][nc]) {
        moves.push({ from: { r, c }, to: { r: nr, c: nc }, path: [{ r: nr, c: nc }], captured: [] });
        nr += dr;
        nc += dc;
      }
    } else {
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !board[nr][nc]) {
        moves.push({ from: { r, c }, to: { r: nr, c: nc }, path: [{ r: nr, c: nc }], captured: [] });
      }
    }
  }

  return moves;
};

export const getAllAvailableMoves = (board: (Piece | null)[][], player: Player): Move[] => {
  let allPossibleMoves: Move[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.player === player) {
        allPossibleMoves.push(...getValidMoves(board, r, c));
      }
    }
  }
  const captureMoves = allPossibleMoves.filter(m => m.captured.length > 0);
  if (captureMoves.length > 0) {
    const maxCaptures = Math.max(...captureMoves.map(m => m.captured.length));
    return captureMoves.filter(m => m.captured.length === maxCaptures);
  }
  return allPossibleMoves;
};

/**
 * Enhanced evaluation function for smarter AI.
 * Now predicts and blocks player's path to King row.
 */
const evaluateBoard = (board: (Piece | null)[][]): number => {
  let score = 0;
  const pieceWeight = 100;
  const kingWeight = 400; // Increased king importance
  const centerBonus = 25;
  const backRowBonus = 50; // Heavy bonus for keeping back row occupied
  
  // Predict threats: Check each column for approaching player pieces
  const columnBlockingStatus = Array(8).fill(false);
  for (let c = 0; c < 8; c++) {
    for (let r = 0; r < 8; r++) {
      if (board[r][c]?.player === 'black') {
        columnBlockingStatus[c] = true;
        break;
      }
    }
  }

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      
      let val = p.isKing ? kingWeight : pieceWeight;
      
      // Position bonuses
      if (!p.isKing) {
        // Player (White) proximity to promotion line (Row 0) is a major threat
        if (p.player === 'white') {
          // The closer White gets to row 0, the more we subtract from AI score
          const proximityToKing = (7 - r) * 20; 
          val += proximityToKing;
          
          // CRITICAL THREAT: If white is at row 1 or 2, AI must panic
          if (r <= 2) val += 150; 
          
          // PATH BLOCKING: If there's no black piece in this column to stop it
          if (!columnBlockingStatus[c]) val += 100;
        } else {
          // AI (Black) progression bonus
          val += r * 10;

          // Back row defense: AI pieces at row 0 are defensive shields
          if (r === 0) val += backRowBonus;
        }
      }

      // Center control (dama is won in the middle)
      if (r >= 2 && r <= 5 && c >= 2 && c <= 5) {
        val += centerBonus;
      }

      if (p.player === 'black') score += val;
      else score -= val;
    }
  }
  return score;
};

const simulateMove = (board: (Piece | null)[][], move: Move): (Piece | null)[][] => {
  const nextBoard = cloneBoard(board);
  const sourcePiece = nextBoard[move.from.r][move.from.c];
  if (!sourcePiece) return nextBoard;

  const piece = { ...sourcePiece };
  nextBoard[move.from.r][move.from.c] = null;
  
  for (const victim of move.captured) {
    nextBoard[victim.r][victim.c] = null;
  }
  
  if (!piece.isKing) {
    if ((piece.player === 'white' && move.to.r === 0) || (piece.player === 'black' && move.to.r === 7)) {
      piece.isKing = true;
    }
  }
  nextBoard[move.to.r][move.to.c] = piece;
  return nextBoard;
};

const minimax = (
  board: (Piece | null)[][],
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean
): number => {
  if (depth === 0) return evaluateBoard(board);
  
  const player = isMaximizing ? 'black' : 'white';
  const moves = getAllAvailableMoves(board, player);
  
  if (moves.length === 0) {
    return isMaximizing ? -50000 : 50000;
  }

  // Strategic sorting: captures first
  moves.sort((a, b) => b.captured.length - a.captured.length);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const ev = minimax(simulateMove(board, move), depth - 1, alpha, beta, false);
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const ev = minimax(simulateMove(board, move), depth - 1, alpha, beta, true);
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return minEval;
  }
};

export const getBestMove = (board: (Piece | null)[][], player: Player, difficulty: AIDifficulty): Move | null => {
  const moves = getAllAvailableMoves(board, player);
  if (moves.length === 0) return null;

  let depth = 2;
  if (difficulty === 'normal') depth = 4;
  if (difficulty === 'expert') {
    const pieceCount = board.flat().filter(p => p !== null).length;
    depth = pieceCount < 12 ? 8 : 6;
  }

  let bestMove = null;
  let bestValue = player === 'black' ? -Infinity : Infinity;

  // Shuffle to avoid predictable repetitive behavior
  const shuffledMoves = [...moves].sort(() => Math.random() - 0.5);

  for (const move of shuffledMoves) {
    const boardValue = minimax(simulateMove(board, move), depth - 1, -Infinity, Infinity, player === 'white');
    if (player === 'black') {
      if (boardValue > bestValue) {
        bestValue = boardValue;
        bestMove = move;
      }
    } else {
      if (boardValue < bestValue) {
        bestValue = boardValue;
        bestMove = move;
      }
    }
  }
  return bestMove;
};
