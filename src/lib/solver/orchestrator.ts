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
    let bestResponse: GenerateResponse | null = null;
    let currentRatio = this.options.maxBlackSquaresRatio ?? 0.2;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      if (Date.now() - startTime > this.globalTimeout) break;

      const solver = new GridSolver({
        ...this.options,
        maxBlackSquaresRatio: currentRatio,
        timeout: 5000
      });

      try {
        const response = await solver.solve();
        lastResponse = response;

        // Track the best partial result (highest fill rate)
        if (!bestResponse || response.stats.fillRate > bestResponse.stats.fillRate) {
          bestResponse = response;
        }

        // If 100% filled, return immediately
        if (response.success && response.stats.fillRate === 1) {
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
        console.warn(`Attempt ${attempt} failed: ${error.message}`);
      }

      // Increase ratio for next attempt to make it easier
      currentRatio += 0.05;
      if (currentRatio > 0.5) currentRatio = 0.5; // Cap at 50%
    }

    // Return the best attempt we found if we didn't get a 100% success
    return bestResponse || lastResponse || { 
      success: false, 
      grid: null, 
      stats: { executionTime: 0, backtracks: 0, fillRate: 0 },
      errors: ['Maximum attempts reached or timeout']
    };
  }
}
