import React from 'react';
import { Plus } from 'lucide-react';

interface DashboardHeaderProps {
  onNewItem: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onNewItem }) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Configuração do Dashboard</h1>
        <p className="text-zinc-400 mt-1">Configure os itens que serão exibidos no dashboard</p>
      </div>
      <button
        onClick={onNewItem}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white flex items-center gap-2"
      >
        <Plus size={20} />
        Novo Item
      </button>
    </div>
  );
};