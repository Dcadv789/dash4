import React from 'react';
import { Edit, Trash2 } from 'lucide-react';

interface DashboardItemProps {
  item: {
    id: string;
    ordem: number;
    titulo_personalizado: string;
    tipo: string;
    referencias_ids: string[];
    is_active: boolean;
    cor_resultado: string;
    tipo_grafico?: string;
    dados_vinculados?: {
      id: string;
      tipo: string;
      nome: string;
    }[];
    top_limit?: number;
  };
  onEdit: () => void;
  onDelete: () => void;
}

export const DashboardItem: React.FC<DashboardItemProps> = ({
  item,
  onEdit,
  onDelete
}) => {
  return (
    <div className="bg-zinc-900 rounded-xl p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-zinc-500 font-mono">#{item.ordem + 1}</span>
          <div>
            <h3 className="text-lg font-medium text-zinc-100">
              {item.titulo_personalizado}
            </h3>
            <p className="text-sm text-zinc-400">
              {item.tipo === 'categoria' && 'Soma de Categorias'}
              {item.tipo === 'indicador' && 'Indicador'}
              {item.tipo === 'conta_dre' && 'Conta DRE'}
              {item.tipo === 'custom_sum' && 'Soma Personalizada'}
              {item.tipo === 'grafico' && `Gráfico (${item.tipo_grafico})`}
              {item.tipo === 'lista' && `Lista (Top ${item.top_limit})`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-red-400"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};