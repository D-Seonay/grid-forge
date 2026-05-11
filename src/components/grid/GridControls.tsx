import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const formSchema = z.object({
  width: z.number().min(3).max(20),
  height: z.number().min(3).max(20),
});

interface GridControlsProps {
  onGenerate: (data: z.infer<typeof formSchema>) => void;
  isLoading: boolean;
}

const GridControls: React.FC<GridControlsProps> = ({ onGenerate, isLoading }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      width: 10,
      height: 10,
    }
  });

  return (
    <form onSubmit={handleSubmit(onGenerate)} className="space-y-4 bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h2 className="text-xl font-bold mb-4">Configuration de la grille</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Largeur</label>
          <input
            type="number"
            {...register('width', { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
          />
          {errors.width && <p className="text-red-500 text-xs mt-1">{errors.width.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Hauteur</label>
          <input
            type="number"
            {...register('height', { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
          />
          {errors.height && <p className="text-red-500 text-xs mt-1">{errors.height.message}</p>}
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
      >
        {isLoading ? 'Génération en cours...' : 'Générer la grille'}
      </button>
    </form>
  );
};

export default GridControls;
