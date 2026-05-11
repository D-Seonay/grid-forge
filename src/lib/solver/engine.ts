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
    return this.options.timeout || 300000;
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

  private isValidCoord(y: number, x: number): boolean {
    return y >= 0 && y < this.height && x >= 0 && x < this.width;
  }

  private isLetter(cell: Cell): boolean {
    return cell.type === 'LETTER' && cell.char !== '' && cell.char !== '#';
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

    // Place the first word randomly instead of always center
    let placed = false;
    for (let attempt = 0; attempt < 50; attempt++) {
      const dir: 'H' | 'V' = Math.random() > 0.5 ? 'H' : 'V';
      const y = Math.floor(Math.random() * this.height);
      const x = Math.floor(Math.random() * this.width);
      
      if (this.canPlaceWord(words[0], y, x, dir)) {
        this.placeWord(words[0], y, x, dir);
        placed = true;
        break;
      }
    }

    // Fallback if random fails
    if (!placed) {
      this.placeWord(words[0], Math.floor(this.height / 2), Math.max(0, Math.floor((this.width - words[0].length) / 2)), 'H');
    }

    for (let i = 1; i < words.length; i++) {
      this.tryPlaceWithIntersection(words[i]);
    }
  }

  private tryPlaceWithIntersection(word: string): boolean {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.grid[y][x];
        if (this.isLetter(cell) && word.includes(cell.char)) {
          const charIndex = word.indexOf(cell.char);
          const hasLeft = this.isValidCoord(y, x - 1) && this.isLetter(this.grid[y][x - 1]);
          const hasRight = this.isValidCoord(y, x + 1) && this.isLetter(this.grid[y][x + 1]);
          const dir = hasLeft || hasRight ? 'H' : 'V';
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
    if (!this.isValidCoord(startY, startX)) return false;
    if (dir === 'H' && startX + word.length > this.width) return false;
    if (dir === 'V' && startY + word.length > this.height) return false;

    // Head check
    const headY = dir === 'V' ? startY - 1 : startY;
    const headX = dir === 'H' ? startX - 1 : startX;
    if (this.isValidCoord(headY, headX) && this.isLetter(this.grid[headY][headX])) return false;

    // Tail check
    const tailY = dir === 'V' ? startY + word.length : startY;
    const tailX = dir === 'H' ? startX + word.length : startX;
    if (this.isValidCoord(tailY, tailX) && this.isLetter(this.grid[tailY][tailX])) return false;

    for (let i = 0; i < word.length; i++) {
      const y = dir === 'V' ? startY + i : startY;
      const x = dir === 'H' ? startX + i : startX;
      
      const currentCell = this.grid[y][x];
      if (currentCell.char !== '' && currentCell.char !== word[i]) return false;

      // Side neighbors check (Strict Separation)
      const neighbors = dir === 'H' ? [{ dy: -1, dx: 0 }, { dy: 1, dx: 0 }] : [{ dy: 0, dx: -1 }, { dy: 0, dx: 1 }];
      for (const n of neighbors) {
        const ny = y + n.dy, nx = x + n.dx;
        if (this.isValidCoord(ny, nx)) {
          if (this.isLetter(this.grid[ny][nx])) {
            // If the cell we are filling is currently empty, it's a "glue" violation
            if (currentCell.char === '') return false;
          }
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
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    if (ratio > 0) {
      for (let y = 0; y < Math.ceil(this.height / 2); y++) {
        const isMiddleRow = y === this.height - 1 - y;
        const xLimit = isMiddleRow ? Math.ceil(this.width / 2) : this.width;
        
        for (let x = 0; x < xLimit; x++) {
          if (this.isLetter(this.grid[y][x])) continue;
          
          if (Math.random() < ratio) {
            const oppY = this.height - 1 - y;
            const oppX = this.width - 1 - x;
            
            if (!this.isLetter(this.grid[oppY][oppX])) {
              const randomChar = chars.charAt(Math.floor(Math.random() * chars.length));
              // On utilise le type 'BLACK' pour la logique interne du solver
              this.grid[y][x] = { char: randomChar, type: 'BLACK', isPriority: false, isFiller: true };
              this.grid[oppY][oppX] = { char: randomChar, type: 'BLACK', isPriority: false, isFiller: true };
            }
          }
        }
      }

      // Auto-fix singletons: convert white cells that don't belong to 2 slots into black squares
      let changed = true;
      while (changed) {
        changed = false;
        const slots = this.findSlots();
        for (let y = 0; y < this.height; y++) {
          for (let x = 0; x < this.width; x++) {
            if (this.grid[y][x].char === '' || this.grid[y][x].type === 'LETTER') {
              const hasH = slots.some(s => s.direction === 'H' && s.cells.some(c => c.x === x && c.y === y));
              const hasV = slots.some(s => s.direction === 'V' && s.cells.some(c => c.x === x && c.y === y));
              
              if (!hasH || !hasV) {
                const oppY = this.height - 1 - y;
                const oppX = this.width - 1 - x;
                
                if (!this.grid[y][x].isPriority && !this.grid[oppY][oppX].isPriority) {
                  const randomChar = chars.charAt(Math.floor(Math.random() * chars.length));
                  this.grid[y][x] = { char: randomChar, type: 'BLACK', isPriority: false, isFiller: true };
                  this.grid[oppY][oppX] = { char: randomChar, type: 'BLACK', isPriority: false, isFiller: true };
                  changed = true;
                  break; 
                }
              }
            }
          }
          if (changed) break;
        }
      }
    }

    // Phase finale : on s'assure que TOUT est visuellement une lettre
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.grid[y][x];
        
        // On convertit le type technique 'BLACK' en 'LETTER' pour l'affichage
        if (cell.type === 'BLACK') {
          cell.type = 'LETTER';
        }
        
        // Remplissage des cases vides restantes (pour ratio 0 ou zones inaccessibles)
        if (cell.char === '' || cell.type === 'EMPTY') {
          cell.char = chars.charAt(Math.floor(Math.random() * chars.length));
          cell.type = 'LETTER';
          cell.isFiller = true;
        }
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

    // 1. Heuristique MRV
    const nextSlot = this.getMostConstrainedSlot();
    
    // Si plus de slots vides, on vérifie si le taux de remplissage est satisfaisant
    if (!nextSlot) {
      return this.calculateFillRate() >= 0.8;
    }

    this.backtracks++;
    const pattern = nextSlot.cells.map(c => this.grid[c.y][c.x].char || '.').join('');
    const candidates = this.getValidCandidates(nextSlot, pattern);

    if (candidates.length === 0) return false;

    // Prioriser les mots qui laissent le plus d'options aux voisins (Heuristique simplifiée)
    const sortedCandidates = candidates
      .sort(() => Math.random() - 0.5)
      .slice(0, 25); // Augmenté pour explorer plus de possibilités

    for (const word of sortedCandidates) {
      const backup = this.applyWord(nextSlot, word);
      
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
