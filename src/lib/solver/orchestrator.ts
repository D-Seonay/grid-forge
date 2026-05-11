import { GridSolver } from './engine';
import { SolverOptions, GenerateResponse } from '../types';

export class SolverOrchestrator {
  private options: SolverOptions;
  private maxAttempts = 10;
  private globalTimeout = 30000;

  constructor(options: SolverOptions) {
    this.options = options;
  }

  public async solve(): Promise<GenerateResponse> {
    const startTime = Date.now();
    let lastResponse: GenerateResponse | null = null;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      if (Date.now() - startTime > this.globalTimeout) break;

      const solver = new GridSolver({
        ...this.options,
        timeout: 5000
      });
      try {
        const response = await solver.solve();
        lastResponse = response;

        if (response.success) {
          return {
            ...response,
            stats: {
              ...response.stats,
              attempts: attempt,
              totalTime: Date.now() - startTime
            }
          };
        }
      } catch (error: any) {
        // Handle INVALID_GRID_STRUCTURE or other retryable errors
        console.warn(`Attempt ${attempt} failed: ${error.message}`);
      }
    }

    return lastResponse || { 
      success: false, 
      grid: null, 
      stats: { executionTime: 0, backtracks: 0, fillRate: 0 },
      errors: ['Maximum attempts reached or timeout']
    };
  }
}
