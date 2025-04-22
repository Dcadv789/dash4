import React from 'react';
import { X, Save } from 'lucide-react';
import { Reference } from '../../../types/dashboard';

interface ComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: {
    referencia_tipo: 'categoria' | 'indicador';
    referencia_id: string;
    peso: number;
    ordem: number;
    nome_exibicao: string;
  };
  setFormData: (data: any) => void;
  editingComponente: any;
  onSave: () => void;
  categorias: Reference[];
  indicadores: Reference[];
}

export const ComponentModal: React.FC<ComponentModalProps> = ({
  isOpen,
  onClose,
  formData,
  setFormData,
  editingComponente,
  onSave,
  categorias,
  indicadores
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-zinc-100">
            {editingComponente ? 'Editar Componente' : 'Novo Componente'}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              Tipo de Referência
            </label>
            <select
              value={formData.referencia_tipo}
              onChange={(e) => setFormData({
                ...formData,
                referencia_tipo: e.target.value as 'categoria' | 'indicador',
                referencia_id: ''
              })}
              className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
            >
              <option value="categoria">Categoria</option>
              <option value="indicador">Indicador</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              Referência
            </label>
            <select
              value={formData.referencia_id}
              onChange={(e) => setFormData({
                ...formData,
                referencia_id: e.target.value
              })}
              className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
            >
              <option value="">Selecione...</option>
              {formData.referencia_tipo === 'categoria' ? (
                categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.codigo} - {cat.nome}
                  </option>
                ))
              ) : (
                indicadores.map(ind => (
                  <option key={ind.id} value={ind.id}>
                    {ind.codigo} - {ind.nome}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              Nome de Exibição (opcional)
            </label>
            <input
              type="text"
              value={formData.nome_exibicao}
              onChange={(e) => setFormData({
                ...formData,
                nome_exibicao: e.target.value
              })}
              placeholder="Nome personalizado para exibição"
              className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              Peso
            </label>
            <input
              type="number"
              value={formData.peso}
              onChange={(e) => setFormData({
                ...formData,
                peso: parseFloat(e.target.value)
              })}
              step="0.01"
              className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              Ordem
            </label>
            <input
              type="number"
              value={formData.ordem}
              onChange={(e) => setFormData({
                ...formData,
                ordem: parseInt(e.target.value)
              })}
              className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={!formData.referencia_id}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} className="inline-block mr-2" />
            {editingComponente ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
};