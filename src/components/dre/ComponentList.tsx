import React from 'react';
import { PencilIcon, Trash2 } from 'lucide-react';
import { DreComponente } from '../../types/dre';

interface ComponentListProps {
  components: DreComponente[];
  onEdit: (component: DreComponente) => void;
  onDelete: (componentId: string) => void;
}

export const ComponentList: React.FC<ComponentListProps> = ({
  components,
  onEdit,
  onDelete
}) => {
  return (
    <>
      {components.map(componente => (
        <div key={componente.id} className="bg-zinc-800/30 p-2 rounded-lg flex items-center justify-between">
          <span className="text-zinc-400">
            {componente.nome_exibicao || (
              componente.referencia_tipo === 'categoria' ?
                componente.categoria?.name :
                componente.indicador?.name
            )}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(componente)}
              className="p-1 hover:bg-zinc-700 rounded-lg text-zinc-400"
            >
              <PencilIcon size={16} />
            </button>
            <button
              onClick={() => onDelete(componente.id)}
              className="p-1 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-red-400"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </>
  );
};