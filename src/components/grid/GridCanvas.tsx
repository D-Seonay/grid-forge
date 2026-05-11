import React from 'react';
import { Grid } from '@/lib/types';
import { cn } from '@/lib/utils';

interface GridCanvasProps {
  grid: Grid;
  width: number;
  height: number;
}

const GridCanvas: React.FC<GridCanvasProps> = ({ grid, width, height }) => {
  return (
    <div 
      className="inline-grid bg-slate-900 gap-[1px] border-[2px] border-slate-900 shadow-2xl"
      style={{ 
        gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
      }}
    >
      {grid.map((row, y) => 
        row.map((cell, x) => (
          <div
            key={`${x}-${y}`}
            className={cn(
              "flex items-center justify-center font-bold uppercase transition-all duration-300 relative",
              "w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-sm sm:text-base md:text-xl",
              cell.type === 'BLACK' ? "bg-slate-900" : "bg-white",
              cell.isPriority && "text-indigo-600 bg-indigo-50/30"
            )}
          >
            {cell.type === 'LETTER' ? (
              <span className="animate-in fade-in zoom-in duration-500">{cell.char}</span>
            ) : null}
            
            {/* Small index for future use or aesthetics */}
            {cell.type !== 'BLACK' && (
              <span className="absolute top-0.5 left-0.5 text-[8px] text-slate-300 select-none">
                {/* Optionnel: numéro de case */}
              </span>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default GridCanvas;
