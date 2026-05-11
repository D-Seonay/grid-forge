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
      this.placePriorityWords();
      this.generateBlackSquares();
      this.slots = this.findSlots();
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
    const words = [...this.options.priorityWords]
      .map(w => w.toUpperCase())
      .sort((a, b) => b.length - a.length);

    if (words.length === 0) return;

    // Placer le premier mot au centre
    this.placeWord(words[0], Math.floor(this.height / 2), Math.max(0, Math.floor((this.width - words[0].length) / 2)), 'H');

    for (let i = 1; i < words.length; i++) {
      this.tryPlaceWithIntersection(words[i]);
    }
  }

  private tryPlaceWithIntersection(word: string): boolean {
    // Parcourir la grille pour trouver une lettre commune
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const char = this.grid[y][x].char;
        if (char && word.includes(char)) {
          const charIndex = word.indexOf(char);
          const direction = this.getExistingWordDirection(x, y);
          const newDirection = direction === 'H' ? 'V' : 'H';

          const startX = newDirection === 'H' ? x - charIndex : x;
          const startY = newDirection === 'V' ? y - charIndex : y;

          if (this.canPlaceWord(word, startY, startX, newDirection)) {
            this.placeWord(word, startY, startX, newDirection);
            return true;
          }
        }
      }
    }

    // Si aucune intersection, placer de manière isolée
    return this.placeWordIsolated(word);
  }

  private getExistingWordDirection(x: number, y: number): 'H' | 'V' {
    const hasH = (x > 0 && this.grid[y][x - 1].char !== '') || (x < this.width - 1 && this.grid[y][x + 1].char !== '');
    return hasH ? 'H' : 'V';
  }

  private canPlaceWord(word: string, startY: number, startX: number, dir: 'H' | 'V'): boolean {
    if (startY < 0 || startX < 0) return false;
    if (dir === 'H' && startX + word.length > this.width) return false;
    if (dir === 'V' && startY + word.length > this.height) return false;

    for (let i = 0; i < word.length; i++) {
      const y = dir === 'V' ? startY + i : startY;
      const x = dir === 'H' ? startX + i : startX;

      const current = this.grid[y][x];
      // Si la case contient déjà une lettre différente
      if (current.char !== '' && current.char !== word[i]) return false;
      
      // Vérifier les voisins pour ne pas coller de mots parallèlement
      if (current.char === '') {
        if (!this.checkNeighbors(y, x, dir)) return false;
      }
    }
    return true;
  }

  private checkNeighbors(y: number, x: number, dir: 'H' | 'V'): boolean {
    const neighbors = dir === 'H' 
      ? [{ dy: -1, dx: 0 }, { dy: 1, dx: 0 }] 
      : [{ dy: 0, dx: -1 }, { dy: 0, dx: 1 }];

    for (const n of neighbors) {
      const ny = y + n.dy, nx = x + n.dx;
      if (ny >= 0 && ny < this.height && nx >= 0 && nx < this.width) {
        if (this.grid[ny][nx].char !== '') return false;
      }
    }
    return true;
  }

  private placeWord(word: string, startY: number, startX: number, dir: 'H' | 'V') {
    for (let i = 0; i < word.length; i++) {
      const y = dir === 'V' ? startY + i : startY;
      const x = dir === 'H' ? startX + i : startX;
      this.grid[y][x] = { char: word[i], type: 'LETTER', isPriority: true };
    }
    return true;
  }

  private placeWordIsolated(word: string): boolean {
    for (let y = 0; y < this.height; y += 2) {
      for (let x = 0; x <= this.width - word.length; x++) {
        if (this.canPlaceWord(word, y, x, 'H')) {
          this.placeWord(word, y, x, 'H');
          return true;
        }
      }
    }
    return false;
  }

  private generateBlackSquares() {
    const ratio = this.options.maxBlackSquaresRatio !== undefined ? this.options.maxBlackSquaresRatio : 0.2;
    
    if (ratio === 0) {
      // Si ratio 0, on transforme tout le vide directement en LETTER
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          if (this.grid[y][x].type === 'EMPTY') {
            this.grid[y][x].type = 'LETTER';
          }
        }
      }
      return;
    }

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

    // Phase 2: On entoure les mots prioritaires de cases noires pour définir la structure
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x].char === '') {
          // Si une cellule vide est adjacente à un mot prioritaire (mais pas dans l'alignement), 
          // on a une chance d'y mettre une case noire
          if (Math.random() < 0.3) {
             this.grid[y][x] = { char: '#', type: 'BLACK', isPriority: false };
             // Symétrie
             const oppY = this.height - 1 - y;
             const oppX = this.width - 1 - x;
             this.grid[oppY][oppX] = { char: '#', type: 'BLACK', isPriority: false };
          }
        }
      }
    }

    // Reste vide -> LETTER pour le CSP
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x].type === 'EMPTY') {
          this.grid[y][x].type = 'LETTER';
        }
      }
    }
  }

  private findSlots(): Slot[] {
    const foundSlots: Slot[] = [];
    for (let y = 0; y < this.height; y++) {
      let x = 0;
      while (x < this.width) {
        if (this.grid[y][x].type !== 'BLACK') {
          let startX = x, cells = [];
          while (x < this.width && this.grid[y][x].type !== 'BLACK') {
            cells.push({ x, y });
            x++;
          }
          if (cells.length >= 2) foundSlots.push({ x: startX, y, length: cells.length, direction: 'H', cells });
        } else x++;
      }
    }
    for (let x = 0; x < this.width; x++) {
      let y = 0;
      while (y < this.height) {
        if (this.grid[y][x].type !== 'BLACK') {
          let startY = y, cells = [];
          while (y < this.height && this.grid[y][x].type !== 'BLACK') {
            cells.push({ x, y });
            y++;
          }
          if (cells.length >= 2) foundSlots.push({ x, y: startY, length: cells.length, direction: 'V', cells });
        } else y++;
      }
    }
    return foundSlots.sort((a, b) => {
        const aFixed = a.cells.filter(c => this.grid[c.y][c.x].char !== '').length;
        const bFixed = b.cells.filter(c => this.grid[c.y][c.x].char !== '').length;
        return bFixed - aFixed; // MRV Heuristic: plus de lettres fixées en premier
    });
  }

  private async backtrack(slotIndex: number): Promise<boolean> {
    if (Date.now() - this.startTime > this.TIMEOUT_MS) {
      throw new Error('TIMEOUT : La grille est trop complexe pour être terminée en 8s.');
    }

    if (slotIndex >= this.slots.length) return true;

    this.backtracks++;
    const slot = this.slots[slotIndex];
    
    // Pattern actuel
    const pattern = slot.cells.map(c => this.grid[c.y][c.x].char || '.').join('');
    
    // Si déjà rempli (via priorité ou intersection précédente)
    if (!pattern.includes('.')) {
        return await this.backtrack(slotIndex + 1);
    }

    const regex = new RegExp(`^${pattern}$`);
    const allCandidates = dictionaryLoader.getWordsByLength(slot.length);
    const candidates = allCandidates.filter(word => regex.test(word));

    if (candidates.length === 0) return false;

    // On limite à 10 candidats aléatoires pour explorer plus de branches rapidement
    const shuffled = candidates.sort(() => Math.random() - 0.5).slice(0, 10);

    for (const candidate of shuffled) {
      // Sauvegarde sélective
      const savedChars: {x: number, y: number, char: string}[] = [];
      
      let possible = true;
      for (let i = 0; i < slot.cells.length; i++) {
        const c = slot.cells[i];
        if (this.grid[c.y][c.x].char === '') {
            savedChars.push({ x: c.x, y: c.y, char: '' });
            this.grid[c.y][c.x].char = candidate[i];
            this.grid[c.y][c.x].type = 'LETTER';
        } else if (this.grid[c.y][c.x].char !== candidate[i]) {
            // Conflit imprévu
            possible = false;
            break;
        }
      }

      if (possible && await this.backtrack(slotIndex + 1)) {
        return true;
      }

      // Rollback
      for (const saved of savedChars) {
        this.grid[saved.y][saved.x].char = '';
        this.grid[saved.y][saved.x].type = 'EMPTY';
      }
    }

    return false;
  }

  private calculateFillRate(): number {
    let filled = 0, total = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x].type !== 'BLACK') {
          total++;
          if (this.grid[y][x].char !== '') filled++;
        }
      }
    }
    return total === 0 ? 0 : filled / total;
  }
}
