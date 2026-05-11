import React, { useState } from 'react';
import { Plus, X, ListTodo } from 'lucide-react';

interface PriorityPanelProps {
  words: string[];
  onAddWord: (word: string) => void;
  onRemoveWord: (index: number) => void;
}

const PriorityPanel: React.FC<PriorityPanelProps> = ({ words, onAddWord, onRemoveWord }) => {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    if (inputValue.trim()) {
      onAddWord(inputValue.trim().toUpperCase());
      setInputValue('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <ListTodo size={18} className="text-indigo-600" />
        <h2 className="font-bold text-slate-800">Mots Prioritaires</h2>
      </div>
      
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="ex: SOLEIL..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
        />
        <button
          onClick={handleAdd}
          className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
        {words.length === 0 ? (
          <p className="text-slate-400 text-xs italic ml-1">Aucun mot imposé.</p>
        ) : (
          words.map((word, index) => (
            <div 
              key={index}
              className="group flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all animate-in slide-in-from-left-2 duration-300"
            >
              {word}
              <button 
                onClick={() => onRemoveWord(index)}
                className="text-slate-300 hover:text-red-500 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PriorityPanel;
