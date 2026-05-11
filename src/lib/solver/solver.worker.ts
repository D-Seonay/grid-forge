import { GridSolver } from './engine';
import { dictionaryLoader } from '../dictionary/loader';
import { SolverOptions } from '../types';

// On écoute les messages du thread principal
self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'LOAD_DICT') {
    try {
      await dictionaryLoader.load();
      self.postMessage({ type: 'DICT_READY' });
    } catch (error) {
      self.postMessage({ type: 'ERROR', error: 'Échec du chargement du dictionnaire' });
    }
  }

  if (type === 'GENERATE') {
    const options: SolverOptions = payload;
    
    try {
      // S'assurer que le dictionnaire est chargé (au cas où)
      await dictionaryLoader.load();
      
      const solver = new GridSolver(options);
      const result = await solver.solve();
      
      self.postMessage({ type: 'RESULT', payload: result });
    } catch (error: any) {
      self.postMessage({ type: 'ERROR', error: error.message });
    }
  }
};
