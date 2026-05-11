import React from 'react';
import { Grid } from '@/lib/types';
import { cn } from '@/lib/utils';

interface GridCanvasProps {
  grid: Grid;
  width: number;
  height: number;
  viewMode?: 'uniform' | 'solution' | 'structure';
}

const GridCanvas: React.FC<GridCanvasProps> = ({ grid, width, height, viewMode = 'solution' }) => {
  // Calcul de la taille de cellule idéale en fonction de la dimension de la grille
  const getCellSize = () => {
    if (width > 50) return 'w-4 h-4 text-[8px]';
    if (width > 30) return 'w-6 h-6 text-xs';
    if (width > 20) return 'w-8 h-8 text-sm';
    return 'w-10 h-10 md:w-12 md:h-12 text-base md:text-xl';
  };

  const cellSizeClass = getCellSize();

  return (
    <div className="w-full h-full overflow-auto custom-scrollbar flex items-start justify-start p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
      <div 
        className="inline-grid bg-slate-900 gap-[1px] border-[2px] border-slate-900 shadow-2xl mx-auto"
        style={{ 
          gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
        }}
      >
        {grid.map((row, y) => 
          row.map((cell, x) => {
            const isFiller = cell.isFiller;
            const isPriority = cell.isPriority;
            const isDictionaryWord = !isFiller && !isPriority;

            return (
              <div
                key={`${x}-${y}`}
                className={cn(
                  "flex items-center justify-center font-bold uppercase transition-all duration-200 relative bg-white shrink-0",
                  cellSizeClass,
                  // Couleurs de fond en mode Solution ou Structure
                  viewMode !== 'uniform' && isPriority && "bg-indigo-50/50",
                  viewMode !== 'uniform' && isDictionaryWord && "bg-emerald-50/30",
                  viewMode === 'solution' && isFiller && "bg-slate-50/50"
                )}
              >
                {cell.char ? (
                  <span className={cn(
                    "animate-in fade-in zoom-in duration-500",
                    // Masquage total en mode structure pour les fillers
                    viewMode === 'structure' && isFiller && "opacity-0",
                    // Style des textes
                    viewMode === 'uniform' && "text-slate-900",
                    viewMode !== 'uniform' && isPriority && "text-indigo-600 font-black",
                    viewMode !== 'uniform' && isDictionaryWord && "text-emerald-700 font-bold",
                    viewMode === 'solution' && isFiller && "text-slate-300 font-normal"
                  )}>
                    {cell.char}
                  </span>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default GridCanvas;
