'use client';

import { useState, useEffect, useRef } from 'react';
import GridCanvas from '@/components/grid/GridCanvas';
import GridControls from '@/components/grid/GridControls';
import PriorityPanel from '@/components/word-list/PriorityPanel';
import { Grid, GenerateResponse } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Copy, Download, FileText, Sparkles, AlertCircle, CheckCircle2, Clock, BarChart3, Loader2, Eye, EyeOff } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Home() {
  const [grid, setGrid] = useState<Grid | null>(null);
  const [dimensions, setDimensions] = useState({ width: 10, height: 10 });
  const [priorityWords, setPriorityWords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDictLoading, setIsDictLoading] = useState(true);
  const [response, setResponse] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showWords, setShowWords] = useState(true);

  // Utilisation d'une Ref pour garder une instance unique du Worker
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialisation du worker
    const worker = new Worker(new URL('../lib/solver/solver.worker.ts', import.meta.url));
    workerRef.current = worker;

    // Gestionnaire de messages entrant
    worker.onmessage = (e: MessageEvent) => {
      const { type, payload, error } = e.data;

      if (type === 'DICT_READY') {
        setIsDictLoading(false);
      } else if (type === 'RESULT') {
        setResponse(payload);
        setGrid(payload.grid);
        setIsLoading(false);
        if (!payload.success) {
          setError(payload.errors?.[0] || 'Génération incomplète');
        }
      } else if (type === 'ERROR') {
        setError(error);
        setIsLoading(false);
      }
    };

    // Charger le dictionnaire dans le worker
    worker.postMessage({ type: 'LOAD_DICT' });

    return () => {
      worker.terminate();
    };
  }, []);

  const handleGenerate = (data: { width: number; height: number; blackSquaresRatio: number }) => {
    if (!workerRef.current) return;
    
    setIsLoading(true);
    setError(null);
    setDimensions({ width: data.width, height: data.height });

    // Envoi de la commande au worker
    workerRef.current.postMessage({
      type: 'GENERATE',
      payload: {
        width: data.width,
        height: data.height,
        priorityWords,
        maxBlackSquaresRatio: data.blackSquaresRatio
      }
    });
  };

  const copyToClipboard = () => {
    if (!grid) return;
    const text = grid.map(row => 
      row.map(cell => cell.type === 'BLACK' ? '#' : (cell.char || '.')).join(' ')
    ).join('\n');
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const downloadPdf = () => {
    if (!grid) return;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("GridForge Export", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Dimensions: ${dimensions.width}x${dimensions.height} | Mots: ${priorityWords.length}`, 14, 28);
    
    const tableData = grid.map(row => row.map(cell => cell.type === 'BLACK' ? '' : (cell.char || '')));
    autoTable(doc, {
      startY: 35,
      body: tableData,
      theme: 'grid',
      styles: { cellPadding: 2, fontSize: 12, halign: 'center', valign: 'middle', lineWidth: 0.5, lineColor: [0, 0, 0] },
      didParseCell: (data) => {
        if (grid[data.row.index][data.column.index].type === 'BLACK') data.cell.styles.fillColor = [0, 0, 0];
      }
    });
    doc.save(`gridforge-${dimensions.width}x${dimensions.height}.pdf`);
  };

  if (isDictLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-4">
        <div className="relative">
           <div className="absolute inset-0 bg-indigo-100 blur-2xl rounded-full opacity-50 animate-pulse"></div>
           <Loader2 className="text-indigo-600 animate-spin relative z-10" size={56} />
        </div>
        <div className="text-center space-y-1">
          <p className="text-slate-800 font-bold text-lg">Initialisation de la Forge</p>
          <p className="text-slate-400 text-sm">Chargement du dictionnaire linguistique...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-100">
              <Sparkles className="text-white" size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">GridForge <span className="text-slate-400 font-medium text-sm ml-1">v1.0</span></h1>
          </div>
          <div className="flex items-center gap-3">
            {grid && (
              <>
                <button 
                  onClick={() => setShowWords(!showWords)} 
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2",
                    showWords ? "text-indigo-600 bg-indigo-50 hover:bg-indigo-100" : "text-slate-600 bg-slate-100 hover:bg-slate-200"
                  )}
                >
                  {showWords ? <Eye size={16} /> : <EyeOff size={16} />}
                  {showWords ? 'Masquer mots' : 'Voir mots'}
                </button>
                <button onClick={copyToClipboard} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-all flex items-center gap-2">
                  <Copy size={16} /> {copySuccess ? 'Copié' : 'Copier'}
                </button>
                <button onClick={downloadPdf} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all flex items-center gap-2">
                  <FileText size={16} /> PDF
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <GridControls onGenerate={handleGenerate} isLoading={isLoading} />
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <PriorityPanel 
              words={priorityWords} 
              onAddWord={(w) => setPriorityWords([...priorityWords, w])} 
              onRemoveWord={(i) => setPriorityWords(priorityWords.filter((_, idx) => idx !== i))} 
            />
          </div>
        </div>

        <div className="lg:col-span-9 space-y-6">
          {response && (
            <div className="flex flex-wrap gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="bg-slate-50 p-2 rounded-lg text-slate-400">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1 tracking-wider">Temps</p>
                  <p className="text-sm font-semibold">{(response.stats.executionTime / 1000).toFixed(2)}s</p>
                </div>
              </div>
              <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="bg-slate-50 p-2 rounded-lg text-slate-400">
                  <BarChart3 size={18} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1 tracking-wider">Remplissage</p>
                  <p className="text-sm font-semibold">{(response.stats.fillRate * 100).toFixed(1)}%</p>
                </div>
              </div>
              {error && (
                <div className="bg-amber-50 px-4 py-3 rounded-xl border border-amber-200 flex items-center gap-3 text-amber-700">
                  <AlertCircle size={18} />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}
              {response.success && (
                <div className="bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-200 flex items-center gap-3 text-emerald-700">
                  <CheckCircle2 size={18} />
                  <p className="text-sm font-medium">Grille complète</p>
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-3xl p-4 md:p-8 shadow-sm border border-slate-200 min-h-[700px] max-h-[85vh] flex items-center justify-center relative overflow-hidden transition-all">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4F46E5 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
            
            {grid ? (
              <GridCanvas grid={grid} width={dimensions.width} height={dimensions.height} showWords={showWords} />
            ) : (
              <div className="text-center space-y-6">
                <div className="w-24 h-24 bg-indigo-50 text-indigo-200 rounded-full flex items-center justify-center mx-auto transition-transform hover:scale-110 duration-500">
                  <Sparkles size={40} className="text-indigo-600/30" />
                </div>
                <div className="max-w-xs mx-auto space-y-2">
                  <h3 className="text-xl font-bold text-slate-800">Forgez votre chef-d'œuvre</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">Le dictionnaire est chargé et l'algorithme est prêt. Configurez vos dimensions pour commencer.</p>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[2px] flex items-center justify-center transition-all animate-in fade-in duration-300">
                <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center gap-4 scale-110">
                  <Loader2 className="text-indigo-600 animate-spin" size={32} />
                  <p className="text-slate-800 font-bold text-sm">Forgeage en cours...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
