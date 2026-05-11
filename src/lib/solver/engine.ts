import { Grid, Cell, SolverOptions, GenerateResponse } from '../types';
import { dictionaryLoader } from '../dictionary/loader';

interface Slot {
  x: number;
  y: number;
  length: number;
  direction: 'H' | 'V';
  cells: { x: number; y: number }[];
}

export class GridSolver {
  private width: number;
  private height: number;
  private grid: Grid;
  private options: SolverOptions;
  private startTime: number = 0;
  private backtracks: number = 0;
  private TIMEOUT_MS = 8000;
  private slots: Slot[] = [];

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
      // Phase 1: Placement des mots prioritaires
      this.placePriorityWords();

      // Phase 2: Génération des cases noires avec symétrie
      this.generateBlackSquares();

      // Analyse de la grille pour trouver les slots à remplir
      this.slots = this.findSlots();

      // Phase 3: Remplissage CSP (Backtracking)
      const success = await this.backtrack(0);

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
        grid: this.grid,
        stats: {
          executionTime: Date.now() - this.startTime,
          backtracks: this.backtracks,
          fillRate: this.calculateFillRate(),
        },
        errors: [error.message || 'Échec de la génération'],
      };
    }
  }

  private placePriorityWords() {
    const sortedWords = [...this.options.priorityWords]
      .map(w => w.toUpperCase())
      .sort((a, b) => b.length - a.length);

    if (sortedWords.length === 0) return;

    // Placement simple du premier mot au centre pour le MVP
    const firstWord = sortedWords[0];
    const midRow = Math.floor(this.height / 2);
    const startCol = Math.max(0, Math.floor((this.width - firstWord.length) / 2));

    for (let i = 0; i < firstWord.length && startCol + i < this.width; i++) {
      this.grid[midRow][startCol + i] = { char: firstWord[i], type: 'LETTER', isPriority: true };
    }
  }

  private generateBlackSquares() {
    const ratio = this.options.maxBlackSquaresRatio || 0.2;
    const targetBlackCells = Math.floor(this.width * this.height * ratio);
    let currentBlackCells = 0;

    // Remplissage aléatoire avec symétrie centrale (180°)
    for (let i = 0; i < 100 && currentBlackCells < targetBlackCells; i++) {
      const y = Math.floor(Math.random() * this.height);
      const x = Math.floor(Math.random() * this.width);
      
      const oppY = this.height - 1 - y;
      const oppX = this.width - 1 - x;

      if (this.grid[y][x].type === 'EMPTY' && this.grid[oppY][oppX].type === 'EMPTY') {
        this.grid[y][x] = { char: '#', type: 'BLACK', isPriority: false };
        this.grid[oppY][oppX] = { char: '#', type: 'BLACK', isPriority: false };
        currentBlackCells += (y === oppY && x === oppX) ? 1 : 2;
      }
    }

    // On transforme le reste du vide en zones blanches (slots potentiels)
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x].type === 'EMPTY') {
          this.grid[y][x].type = 'LETTER';
          this.grid[y][x].char = '';
        }
      }
    }
  }

  private findSlots(): Slot[] {
    const foundSlots: Slot[] = [];

    // Slots Horizontaux
    for (let y = 0; y < this.height; y++) {
      let x = 0;
      while (x < this.width) {
        if (this.grid[y][x].type !== 'BLACK') {
          let startX = x;
          let cells = [];
          while (x < this.width && this.grid[y][x].type !== 'BLACK') {
            cells.push({ x, y });
            x++;
          }
          if (cells.length >= 2) {
            foundSlots.push({ x: startX, y, length: cells.length, direction: 'H', cells });
          }
        } else x++;
      }
    }

    // Slots Verticaux
    for (let x = 0; x < this.width; x++) {
      let y = 0;
      while (y < this.height) {
        if (this.grid[y][x].type !== 'BLACK') {
          let startY = y;
          let cells = [];
          while (y < this.height && this.grid[y][x].type !== 'BLACK') {
            cells.push({ x, y });
            y++;
          }
          if (cells.length >= 2) {
            foundSlots.push({ x, y: startY, length: cells.length, direction: 'V', cells });
          }
        } else y++;
      }
    }

    return foundSlots;
  }

  private async backtrack(slotIndex: number): Promise<boolean> {
    if (Date.now() - this.startTime > this.TIMEOUT_MS) {
      throw new Error('TIMEOUT');
    }

    // Si on a rempli tous les slots, c'est gagné
    if (slotIndex >= this.slots.length) return true;

    this.backtracks++;

    // Heuristique MRV : on pourrait trier les slots ici, mais on suit l'index pour simplifier le MVP
    const slot = this.slots[slotIndex];
    
    // Déterminer le pattern actuel (ex: ".A..E")
    const pattern = slot.cells.map(c => this.grid[c.y][c.x].char || '.').join('');
    
    // Si le slot est déjà plein (mots prioritaires), on passe au suivant
    if (!pattern.includes('.')) return await this.backtrack(slotIndex + 1);

    const regex = new RegExp(`^${pattern}$`);
    const candidates = dictionaryLoader.getWordsByLength(slot.length)
      .filter(word => regex.test(word));

    // Mélanger les candidats pour avoir des grilles variées
    const shuffledCandidates = candidates.sort(() => Math.random() - 0.5);

    for (const candidate of shuffledCandidates) {
      // Sauvegarder l'état actuel pour le rollback
      const previousChars = slot.cells.map(c => this.grid[c.y][c.x].char);

      // Appliquer le candidat
      slot.cells.forEach((c, i) => {
        this.grid[c.y][c.x].char = candidate[i];
      });

      // Récurrence
      if (await this.backtrack(slotIndex + 1)) return true;

      // Rollback
      slot.cells.forEach((c, i) => {
        if (!this.grid[c.y][c.x].isPriority) {
          this.grid[c.y][c.x].char = previousChars[i];
        }
      });
    }

    return false;
  }

  private calculateFillRate(): number {
    let filled = 0;
    let totalCells = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x].type !== 'BLACK') {
          totalCells++;
          if (this.grid[y][x].char !== '') filled++;
        }
      }
    }
    return totalCells === 0 ? 0 : filled / totalCells;
  }
}
