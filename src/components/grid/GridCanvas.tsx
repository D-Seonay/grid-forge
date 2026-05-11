import React from 'react';
import { Grid } from '@/lib/types';
import { cn } from '@/lib/utils';

interface GridCanvasProps {
  grid: Grid;
  width: number;
  height: number;
  showWords?: boolean;
}

const GridCanvas: React.FC<GridCanvasProps> = ({ grid, width, height, showWords = true }) => {
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
              "bg-white",
              cell.isPriority && "text-indigo-600 bg-indigo-50/30",
              showWords && cell.isFiller && "text-slate-300 bg-slate-50/50"
            )}
          >
            {cell.char ? (
              <span className={cn(
                "animate-in fade-in zoom-in duration-500",
                showWords && !cell.isFiller && "text-indigo-700 font-black scale-110"
              )}>
                {cell.char}
              </span>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
};

export default GridCanvas;
