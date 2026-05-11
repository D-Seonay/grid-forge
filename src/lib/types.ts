export type CellType = 'EMPTY' | 'BLACK' | 'LETTER';

export interface Cell {
  char: string; // "" si vide, "#" si noir, "A-Z" si lettre
  type: CellType;
  isPriority: boolean; // Marqueur pour les mots imposés par l'utilisateur
  isFiller?: boolean; // Marqueur pour les lettres de remplissage aléatoire
}

export type Grid = Cell[][];

export interface SolverOptions {
  width: number;
  height: number;
  priorityWords: string[];
  maxBlackSquaresRatio?: number; // Défaut 0.20
  allowSymmetry?: boolean;
  timeout?: number;
}

export interface GenerateResponse {
  success: boolean;
  grid: Grid | null;
  stats: {
    executionTime: number;
    backtracks: number;
    fillRate: number;
    attempts?: number;
    totalTime?: number;
  };
  errors?: string[];
}

export interface GenerateGridRequest {
  dimensions: {
    width: number;
    height: number;
  };
  priorityWords: string[];
  params?: {
    maxBlackSquaresRatio?: number;
  };
}
