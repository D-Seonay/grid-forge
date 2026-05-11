'use client';

import { useState } from 'react';
import GridCanvas from '@/components/grid/GridCanvas';
import GridControls from '@/components/grid/GridControls';
import PriorityPanel from '@/components/word-list/PriorityPanel';
import { Grid, GenerateResponse } from '@/lib/types';
import { Copy, Download, FileText, Sparkles, AlertCircle, CheckCircle2, Clock, BarChart3 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from '@/lib/utils';

export default function Home() {
  const [grid, setGrid] = useState<Grid | null>(null);
  const [dimensions, setDimensions] = useState({ width: 10, height: 10 });
  const [priorityWords, setPriorityWords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleGenerate = async (data: { width: number; height: number; blackSquaresRatio: number }) => {
    setIsLoading(true);
    setError(null);
    setDimensions({ width: data.width, height: data.height });

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dimensions: { width: data.width, height: data.height },
          priorityWords,
          params: {
            maxBlackSquaresRatio: data.blackSquaresRatio
          }
        }),
      });

      const result: GenerateResponse = await res.json();
      setResponse(result);
      setGrid(result.grid);
      
      if (!result.success) {
        setError(result.errors?.[0] || 'Génération incomplète (Timeout)');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur.');
    } finally {
      setIsLoading(false);
    }
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Sparkles className="text-white" size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">GridForge <span className="text-slate-400 font-medium text-sm ml-1">v1.0</span></h1>
          </div>
          <div className="flex items-center gap-3">
            {grid && (
              <>
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
        {/* Sidebar */}
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

        {/* Main Canvas */}
        <div className="lg:col-span-9 space-y-6">
          {/* Status Bar */}
          {response && (
            <div className="flex flex-wrap gap-4">
              <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <Clock className="text-slate-400" size={18} />
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1">Temps</p>
                  <p className="text-sm font-semibold">{(response.stats.executionTime / 1000).toFixed(2)}s</p>
                </div>
              </div>
              <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <BarChart3 className="text-slate-400" size={18} />
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1">Remplissage</p>
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

          <div className="bg-white rounded-3xl p-12 shadow-sm border border-slate-200 min-h-[600px] flex items-center justify-center relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4F46E5 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
            
            {grid ? (
              <div className="relative z-10 transition-all duration-500 ease-out transform scale-100">
                <GridCanvas grid={grid} width={dimensions.width} height={dimensions.height} />
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                  <Sparkles size={32} />
                </div>
                <div className="max-w-xs mx-auto">
                  <h3 className="text-lg font-bold text-slate-800">Prêt à forger ?</h3>
                  <p className="text-slate-500 text-sm">Configurez vos paramètres à gauche pour générer votre première grille.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
