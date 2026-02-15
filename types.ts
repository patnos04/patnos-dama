
export type Player = 'white' | 'black';
export type AIDifficulty = 'beginner' | 'normal' | 'expert';

export interface Piece {
  id: string;
  player: Player;
  isKing: boolean;
}

export interface UserProfile {
  name: string;
  avatar: string | null;
}

export interface Square {
  row: number;
  col: number;
  piece: Piece | null;
}

export type Language = 'tr' | 'ku' | 'en';

export interface Position {
  r: number;
  c: number;
}

export interface Move {
  from: Position;
  to: Position;
  path: Position[]; // List of all squares landed on during a jump
  captured: Position[]; // Coordinates of all captured pieces
}

export interface Translations {
  title: string;
  subtitle: string;
  turn: string;
  white: string;
  black: string;
  restart: string;
  undo: string;
  aiAnalysis: string;
  winner: string;
  thinking: string;
  noSelection: string;
  moveHelp: string;
  difficulty: string;
  beginner: string;
  normal: string;
  expert: string;
  mandatoryCapture: string;
  opponentOffering: string;
  setupProfile: string;
  enterName: string;
  startGame: string;
  choosePhoto: string;
  timeout: string;
  analyze: string;
  aiFallback: string;
  engine: string;
  versionInfo: string;
}