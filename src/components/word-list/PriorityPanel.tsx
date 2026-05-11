import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h2 className="text-xl font-bold mb-4">Mots prioritaires</h2>
      
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Ajouter un mot..."
          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
        />
        <button
          onClick={handleAdd}
          className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {words.length === 0 && (
          <p className="text-gray-400 text-sm italic">Aucun mot ajouté.</p>
        )}
        {words.map((word, index) => (
          <span 
            key={index}
            className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium"
          >
            {word}
            <button 
              onClick={() => onRemoveWord(index)}
              className="hover:text-indigo-600 transition-colors"
            >
              <X size={14} />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
};

export default PriorityPanel;
