import React from 'react';
import { Grid, Cell } from '@/lib/types';
import { cn } from '@/lib/utils';

interface GridCanvasProps {
  grid: Grid;
  width: number;
  height: number;
}

const GridCanvas: React.FC<GridCanvasProps> = ({ grid, width, height }) => {
  return (
    <div 
      className="grid gap-px bg-gray-300 p-px shadow-xl border-4 border-gray-800"
      style={{ 
        gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
        aspectRatio: `${width} / ${height}`,
        width: '100%',
        maxWidth: `${width * 40}px`
      }}
    >
      {grid.map((row, y) => 
        row.map((cell, x) => (
          <div
            key={`${x}-${y}`}
            className={cn(
              "flex items-center justify-center text-xl font-bold uppercase",
              cell.type === 'BLACK' ? "bg-black" : "bg-white",
              cell.isPriority && "text-blue-600"
            )}
            style={{ minHeight: '40px', minWidth: '40px' }}
          >
            {cell.type === 'LETTER' ? cell.char : ''}
          </div>
        ))
      )}
    </div>
  );
};

export default GridCanvas;
