'use client';

import { useState } from 'react';
import GridCanvas from '@/components/grid/GridCanvas';
import GridControls from '@/components/grid/GridControls';
import PriorityPanel from '@/components/word-list/PriorityPanel';
import { Grid, GenerateResponse } from '@/lib/types';

export default function Home() {
  const [grid, setGrid] = useState<Grid | null>(null);
  const [dimensions, setDimensions] = useState({ width: 10, height: 10 });
  const [priorityWords, setPriorityWords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (data: { width: number; height: number }) => {
    setIsLoading(true);
    setError(null);
    setDimensions(data);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dimensions: data,
          priorityWords,
        }),
      });

      const result: GenerateResponse = await response.json();

      if (result.success && result.grid) {
        setGrid(result.grid);
      } else {
        setError(result.errors?.[0] || 'Une erreur est survenue lors de la génération.');
      }
    } catch (err) {
      setError('Impossible de contacter le serveur.');
    } finally {
      setIsLoading(false);
    }
  };

  const addPriorityWord = (word: string) => {
    if (!priorityWords.includes(word)) {
      setPriorityWords([...priorityWords, word]);
    }
  };

  const removePriorityWord = (index: number) => {
    setPriorityWords(priorityWords.filter((_, i) => i !== index));
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
            GridForge
          </h1>
          <p className="text-lg text-gray-600">
            Générateur de structures de mots fléchés & croisés
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <GridControls onGenerate={handleGenerate} isLoading={isLoading} />
            <PriorityPanel 
              words={priorityWords} 
              onAddWord={addPriorityWord} 
              onRemoveWord={removePriorityWord} 
            />
            
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 flex flex-col items-center justify-start bg-white p-8 rounded-lg shadow-inner border border-gray-200 min-h-[500px]">
            {grid ? (
              <div className="w-full flex flex-col items-center">
                <GridCanvas grid={grid} width={dimensions.width} height={dimensions.height} />
                <div className="mt-8 text-sm text-gray-500 italic">
                  Grille générée avec succès.
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <p className="text-xl mb-2">Aucune grille générée</p>
                <p>Configurez vos paramètres et cliquez sur "Générer"</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
