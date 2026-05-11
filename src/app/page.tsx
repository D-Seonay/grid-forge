'use client';

import { useState } from 'react';
import GridCanvas from '@/components/grid/GridCanvas';
import GridControls from '@/components/grid/GridControls';
import PriorityPanel from '@/components/word-list/PriorityPanel';
import { Grid, GenerateResponse } from '@/lib/types';
import { Copy, Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Home() {
  const [grid, setGrid] = useState<Grid | null>(null);
  const [dimensions, setDimensions] = useState({ width: 10, height: 10 });
  const [priorityWords, setPriorityWords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

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

      setGrid(result.grid); // On affiche la grille quoi qu'il arrive si elle est présente
      
      if (!result.success) {
        setError(result.errors?.[0] || 'La génération a échoué ou a été interrompue (timeout).');
      } else {
        setError(null);
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

  const copyToClipboard = () => {
    if (!grid) return;
    const text = grid.map(row => 
      row.map(cell => cell.type === 'BLACK' ? '#' : (cell.char || '.')).join(' ')
    ).join('\n');
    
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const downloadJson = () => {
    if (!grid) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      dimensions,
      priorityWords,
      grid
    }, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "grid-forge-export.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const downloadPdf = () => {
    if (!grid) return;
    const doc = new jsPDF();
    doc.text(`GridForge - Grille ${dimensions.width}x${dimensions.height}`, 14, 15);
    
    const tableData = grid.map(row => 
      row.map(cell => cell.type === 'BLACK' ? '' : (cell.char || ''))
    );

    autoTable(doc, {
      startY: 25,
      body: tableData,
      theme: 'grid',
      styles: {
        cellPadding: 2,
        fontSize: 12,
        halign: 'center',
        valign: 'middle',
        lineWidth: 0.5,
        lineColor: [0, 0, 0],
        textColor: [0, 0, 0],
        minCellHeight: 10,
      },
      didParseCell: (data) => {
        const rowIndex = data.row.index;
        const colIndex = data.column.index;
        if (grid[rowIndex][colIndex].type === 'BLACK') {
          data.cell.styles.fillColor = [0, 0, 0];
        }
      }
    });

    doc.save("grid-forge.pdf");
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
                <div className="w-full flex justify-end gap-2 mb-4">
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <Copy size={16} />
                    {copySuccess ? 'Copié !' : 'Copier texte'}
                  </button>
                  <button
                    onClick={downloadPdf}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <FileText size={16} />
                    PDF
                  </button>
                  <button
                    onClick={downloadJson}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    <Download size={16} />
                    JSON
                  </button>
                </div>
                
                <GridCanvas grid={grid} width={dimensions.width} height={dimensions.height} />
                
                <div className="mt-8 text-sm text-gray-500 italic">
                  Grille générée avec succès. {dimensions.width}x{dimensions.height}
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
