import { Grid, Cell, SolverOptions, GenerateResponse } from '../types';
import { dictionaryLoader } from '../dictionary/loader';

export class GridSolver {
  private width: number;
  private height: number;
  private grid: Grid;
  private options: SolverOptions;
  private startTime: number = 0;
  private backtracks: number = 0;
  private TIMEOUT_MS = 8000;

  constructor(options: SolverOptions) {
    this.width = options.width;
    this.height = options.height;
    this.options = options;
    this.grid = this.initializeGrid();
  }

  private initializeGrid(): Grid {
    return Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => ({
        char: '',
        type: 'EMPTY',
        isPriority: false,
      }))
    );
  }

  public async solve(): Promise<GenerateResponse> {
    this.startTime = Date.now();
    this.backtracks = 0;

    try {
      // Phase 1: Skeleton Placement (Priority words)
      this.placePriorityWords();

      // Phase 2: Black squares pattern
      this.generateBlackSquares();

      // Phase 3: CSP Filling
      const success = await this.fillGrid();

      return {
        success,
        grid: this.grid,
        stats: {
          executionTime: Date.now() - this.startTime,
          backtracks: this.backtracks,
          fillRate: this.calculateFillRate(),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        grid: null,
        stats: {
          executionTime: Date.now() - this.startTime,
          backtracks: this.backtracks,
          fillRate: 0,
        },
        errors: [error.message || 'Unknown error'],
      };
    }
  }

  private placePriorityWords() {
    const sortedWords = [...this.options.priorityWords]
      .map(w => w.toUpperCase())
      .sort((a, b) => b.length - a.length);

    if (sortedWords.length === 0) return;

    // Place the first (longest) word in the middle horizontally
    const firstWord = sortedWords[0];
    const midRow = Math.floor(this.height / 2);
    const startCol = Math.max(0, Math.floor((this.width - firstWord.length) / 2));

    for (let i = 0; i < firstWord.length && startCol + i < this.width; i++) {
      this.grid[midRow][startCol + i] = {
        char: firstWord[i],
        type: 'LETTER',
        isPriority: true,
      };
    }

    // Attempt to place remaining words
    // For a MVP, we just place them on alternate rows if they fit
    let row = 0;
    for (let i = 1; i < sortedWords.length; i++) {
      const word = sortedWords[i];
      if (row === midRow) row += 2;
      if (row >= this.height) break;

      const sCol = Math.max(0, Math.floor((this.width - word.length) / 2));
      let canPlace = true;
      
      // Simple collision check
      for (let j = 0; j < word.length && sCol + j < this.width; j++) {
        if (this.grid[row][sCol + j].type !== 'EMPTY') {
          canPlace = false;
          break;
        }
      }

      if (canPlace) {
        for (let j = 0; j < word.length && sCol + j < this.width; j++) {
          this.grid[row][sCol + j] = {
            char: word[j],
            type: 'LETTER',
            isPriority: true,
          };
        }
      }
      row += 2;
    }
  }

  private generateBlackSquares() {
    // Fill remaining empty cells with BLACK blocks if they aren't part of a word path
    // For MVP: any cell that is still EMPTY becomes BLACK
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x].type === 'EMPTY') {
          this.grid[y][x].type = 'BLACK';
          this.grid[y][x].char = '#';
        }
      }
    }
  }

  private async fillGrid(): Promise<boolean> {
    // Phase 3: CSP Placeholder
    // In the future, this will find all white space sequences and fill them
    return true;
  }

  private calculateFillRate(): number {
    let filled = 0;
    let total = this.width * this.height;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x].type !== 'EMPTY') filled++;
      }
    }
    return filled / total;
  }
}
