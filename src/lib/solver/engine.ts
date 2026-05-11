import { Grid, Cell, SolverOptions, GenerateResponse } from '../types';
import { dictionaryLoader } from '../dictionary/loader';

interface Slot {
  id: number;
  x: number;
  y: number;
  length: number;
  direction: 'H' | 'V';
  cells: { x: number; y: number }[];
  intersections: Intersection[];
}

interface Intersection {
  slotId: number;      // ID de l'autre slot
  myIndex: number;     // Index de la lettre dans MON mot
  otherIndex: number;  // Index de la lettre dans SON mot
}

export class GridSolver {
  private width: number;
  private height: number;
  private grid: Grid;
  private options: SolverOptions;
  private startTime: number = 0;
  private backtracks: number = 0;
  private get timeoutMs(): number {
    return this.options.timeout || 30000;
  }
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
      if (!this.validateConnectivity()) throw new Error('INVALID_GRID_STRUCTURE');
      this.slots = this.findSlots();
      this.mapIntersections();

      // On lance le backtracking sur un ensemble de slots non-remplis
      const success = await this.solveRecursive();

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

  // --- PHASE 1 & 2 --- (Identiques mais simplifiées pour l'exemple)
  private placePriorityWords() {
    const words = [...this.options.priorityWords].map(w => w.toUpperCase()).sort((a, b) => b.length - a.length);
    if (words.length === 0) return;
    this.placeWord(words[0], Math.floor(this.height / 2), Math.max(0, Math.floor((this.width - words[0].length) / 2)), 'H');
    for (let i = 1; i < words.length; i++) this.tryPlaceWithIntersection(words[i]);
  }

  private tryPlaceWithIntersection(word: string): boolean {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const char = this.grid[y][x].char;
        if (char && word.includes(char)) {
          const charIndex = word.indexOf(char);
          const dir = (x > 0 && this.grid[y][x - 1].char !== '') || (x < this.width - 1 && this.grid[y][x + 1].char !== '') ? 'H' : 'V';
          const newDir = dir === 'H' ? 'V' : 'H';
          const startX = newDir === 'H' ? x - charIndex : x;
          const startY = newDir === 'V' ? y - charIndex : y;
          if (this.canPlaceWord(word, startY, startX, newDir)) {
            this.placeWord(word, startY, startX, newDir);
            return true;
          }
        }
      }
    }
    return this.placeWordIsolated(word);
  }

  private canPlaceWord(word: string, startY: number, startX: number, dir: 'H' | 'V'): boolean {
    if (startY < 0 || startX < 0 || (dir === 'H' && startX + word.length > this.width) || (dir === 'V' && startY + word.length > this.height)) return false;
    for (let i = 0; i < word.length; i++) {
      const y = dir === 'V' ? startY + i : startY, x = dir === 'H' ? startX + i : startX;
      if (this.grid[y][x].char !== '' && this.grid[y][x].char !== word[i]) return false;
      if (this.grid[y][x].char === '') {
        const neighbors = dir === 'H' ? [{ dy: -1, dx: 0 }, { dy: 1, dx: 0 }] : [{ dy: 0, dx: -1 }, { dy: 0, dx: 1 }];
        for (const n of neighbors) {
          const ny = y + n.dy, nx = x + n.dx;
          if (ny >= 0 && ny < this.height && nx >= 0 && nx < this.width && this.grid[ny][nx].char !== '') return false;
        }
      }
    }
    return true;
  }

  private placeWord(word: string, startY: number, startX: number, dir: 'H' | 'V') {
    for (let i = 0; i < word.length; i++) {
      const y = dir === 'V' ? startY + i : startY, x = dir === 'H' ? startX + i : startX;
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
    const ratio = this.options.maxBlackSquaresRatio ?? 0.2;
    if (ratio > 0) {
      for (let y = 0; y < Math.ceil(this.height / 2); y++) {
        const isMiddleRow = y === this.height - 1 - y;
        const xLimit = isMiddleRow ? Math.ceil(this.width / 2) : this.width;
        
        for (let x = 0; x < xLimit; x++) {
          // Skip if already set (e.g. by priority words)
          if (this.grid[y][x].char !== '') continue;
          
          if (Math.random() < ratio) {
            const oppY = this.height - 1 - y;
            const oppX = this.width - 1 - x;
            
            // Check if opposite is also empty
            if (this.grid[oppY][oppX].char === '') {
              this.grid[y][x] = { char: '#', type: 'BLACK', isPriority: false };
              this.grid[oppY][oppX] = { char: '#', type: 'BLACK', isPriority: false };
            }
          }
        }
      }
    }
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x].type === 'EMPTY') this.grid[y][x].type = 'LETTER';
      }
    }
  }

  private validateConnectivity(): boolean {
    const slots = this.findSlots();
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x].type === 'BLACK') continue;
        
        const hasH = slots.some(s => s.direction === 'H' && s.cells.some(c => c.x === x && c.y === y));
        const hasV = slots.some(s => s.direction === 'V' && s.cells.some(c => c.x === x && c.y === y));
        
        if (!hasH || !hasV) return false;
      }
    }
    return true;
  }

  // --- STRUCTURE ANALYSIS ---

  private findSlots(): Slot[] {
    const found: Slot[] = [];
    let idCounter = 0;
    const directions: ('H' | 'V')[] = ['H', 'V'];

    for (const dir of directions) {
      for (let i = 0; i < (dir === 'H' ? this.height : this.width); i++) {
        let j = 0;
        const maxJ = dir === 'H' ? this.width : this.height;
        while (j < maxJ) {
          const y = dir === 'H' ? i : j, x = dir === 'H' ? j : i;
          if (this.grid[y][x].type !== 'BLACK') {
            const startJ = j;
            const cells = [];
            while (j < maxJ) {
              const cy = dir === 'H' ? i : j, cx = dir === 'H' ? j : i;
              if (this.grid[cy][cx].type === 'BLACK') break;
              cells.push({ x: cx, y: cy });
              j++;
            }
            if (cells.length >= 2) {
              found.push({ id: idCounter++, x: cells[0].x, y: cells[0].y, length: cells.length, direction: dir, cells, intersections: [] });
            }
          } else j++;
        }
      }
    }
    return found;
  }

  private mapIntersections() {
    for (const s1 of this.slots) {
      for (const s2 of this.slots) {
        if (s1.direction === s2.direction) continue;
        for (let i = 0; i < s1.cells.length; i++) {
          for (let j = 0; j < s2.cells.length; j++) {
            if (s1.cells[i].x === s2.cells[j].x && s1.cells[i].y === s2.cells[j].y) {
              s1.intersections.push({ slotId: s2.id, myIndex: i, otherIndex: j });
            }
          }
        }
      }
    }
  }

  // --- ADVANCED CSP SOLVER ---

  private async solveRecursive(): Promise<boolean> {
    if (Date.now() - this.startTime > this.timeoutMs) throw new Error('TIMEOUT');

    // 1. Heuristique MRV : Trouver le slot le plus contraint (moins de candidats)
    const nextSlot = this.getMostConstrainedSlot();
    if (!nextSlot) return true; // Fini !

    this.backtracks++;
    const pattern = nextSlot.cells.map(c => this.grid[c.y][c.x].char || '.').join('');
    const candidates = this.getValidCandidates(nextSlot, pattern);

    if (candidates.length === 0) return false;

    // 2. Heuristique LCV (Optionnel ici, on utilise un shuffle limité pour la variété)
    const shuffled = candidates.sort(() => Math.random() - 0.5).slice(0, 15);

    for (const word of shuffled) {
      const backup = this.applyWord(nextSlot, word);
      
      // 3. Forward Checking : Vérifier si ce mot bloque un voisin
      if (this.isConsistent(nextSlot)) {
        if (await this.solveRecursive()) return true;
      }

      this.rollback(nextSlot, backup);
    }

    return false;
  }

  private getMostConstrainedSlot(): Slot | null {
    let bestSlot: Slot | null = null;
    let minCandidates = Infinity;
    let minDistance = Infinity;

    const centerX = this.width / 2;
    const centerY = this.height / 2;

    for (const slot of this.slots) {
      const pattern = slot.cells.map(c => this.grid[c.y][c.x].char || '.').join('');
      if (!pattern.includes('.')) continue;

      const candidatesCount = this.getValidCandidates(slot, pattern).length;
      if (candidatesCount === 0) return slot;

      // Distance from center of the slot (first cell for simplicity) to center of grid
      const dist = Math.sqrt(Math.pow(slot.x - centerX, 2) + Math.pow(slot.y - centerY, 2));

      if (candidatesCount < minCandidates || (candidatesCount === minCandidates && dist < minDistance)) {
        minCandidates = candidatesCount;
        minDistance = dist;
        bestSlot = slot;
      }
    }
    return bestSlot;
  }

  private getValidCandidates(slot: Slot, pattern: string): string[] {
    const all = dictionaryLoader.getWordsByLength(slot.length);
    return all.filter(word => {
      for (let i = 0; i < pattern.length; i++) {
        if (pattern[i] !== '.' && word[i] !== pattern[i]) return false;
      }
      return true;
    });
  }

  private isConsistent(slot: Slot): boolean {
    // Forward Checking : on regarde tous les slots qui croisent celui qu'on vient de remplir
    for (const intersect of slot.intersections) {
      const otherSlot = this.slots.find(s => s.id === intersect.slotId)!;
      const otherPattern = otherSlot.cells.map(c => this.grid[c.y][c.x].char || '.').join('');
      
      if (otherPattern.includes('.')) {
        // Est-ce qu'il reste au moins un mot possible pour ce voisin ?
        const candidates = this.getValidCandidates(otherSlot, otherPattern);
        if (candidates.length === 0) return false;
      }
    }
    return true;
  }

  private applyWord(slot: Slot, word: string): string[] {
    const backup = slot.cells.map(c => this.grid[c.y][c.x].char);
    slot.cells.forEach((c, i) => {
      this.grid[c.y][c.x].char = word[i];
      this.grid[c.y][c.x].type = 'LETTER';
    });
    return backup;
  }

  private rollback(slot: Slot, backup: string[]) {
    slot.cells.forEach((c, i) => {
      if (!this.grid[c.y][c.x].isPriority) {
        this.grid[c.y][c.x].char = backup[i];
        if (backup[i] === '') this.grid[c.y][c.x].type = 'EMPTY';
      }
    });
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
