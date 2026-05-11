import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Settings2, Wand2 } from 'lucide-react';

const formSchema = z.object({
  width: z.number().min(3, "Min 3").max(20, "Max 20"),
  height: z.number().min(3, "Min 3").max(20, "Max 20"),
});

interface GridControlsProps {
  onGenerate: (data: z.infer<typeof formSchema>) => void;
  isLoading: boolean;
}

const GridControls: React.FC<GridControlsProps> = ({ onGenerate, isLoading }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { width: 10, height: 10 }
  });

  return (
    <form onSubmit={handleSubmit(onGenerate)} className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Settings2 size={18} className="text-indigo-600" />
        <h2 className="font-bold text-slate-800">Dimensions</h2>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase ml-1">Largeur</label>
          <input
            type="number"
            {...register('width', { valueAsNumber: true })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
          />
          {errors.width && <p className="text-red-500 text-[10px] font-medium">{errors.width.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase ml-1">Hauteur</label>
          <input
            type="number"
            {...register('height', { valueAsNumber: true })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
          />
          {errors.height && <p className="text-red-500 text-[10px] font-medium">{errors.height.message}</p>}
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="group w-full bg-slate-900 text-white py-3 px-4 rounded-xl font-bold text-sm hover:bg-indigo-600 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
      >
        <Wand2 size={16} className={isLoading ? "animate-spin" : "group-hover:rotate-12 transition-transform"} />
        {isLoading ? 'Forgeage...' : 'Générer la grille'}
      </button>
    </form>
  );
};

export default GridControls;
