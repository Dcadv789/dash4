import React from 'react';
import { X, Save } from 'lucide-react';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: {
    nome: string;
    tipo: string;
    simbolo: string | null;
    ordem_padrao: number;
    visivel: boolean;
  };
  setFormData: (data: any) => void;
  editingConta: any;
  onSave: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  formData,
  setFormData,
  editingConta,
  onSave
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-zinc-100">
            {editingConta ? 'Editar Conta' : 'Nova Conta'}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              Nome
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              Tipo
            </label>
            <select
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
            >
              <option value="simples">Simples</option>
              <option value="composta">Composta</option>
              <option value="formula">Fórmula</option>
              <option value="indicador">Indicador</option>
              <option value="soma_indicadores">Soma de Indicadores</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              Símbolo
            </label>
            <select
              value={formData.simbolo || ''}
              onChange={(e) => setFormData({ ...formData, simbolo: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
            >
              <option value="">Selecione um símbolo</option>
              <option value="+" className="text-green-400">+ (Receita)</option>
              <option value="-" className="text-red-400">- (Despesa)</option>
              <option value="=" className="text-blue-400">= (Resultado)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              Ordem Padrão
            </label>
            <input
              type="number"
              value={formData.ordem_padrao}
              onChange={(e) => setFormData({ ...formData, ordem_padrao: parseInt(e.target.value) })}
              className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.visivel}
                onChange={(e) => setFormData({ ...formData, visivel: e.target.checked })}
                className="w-4 h-4 rounded border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-800"
              />
              <span className="text-zinc-400">Visível</span>
            </label>
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
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
          >
            <Save size={16} className="inline-block mr-2" />
            {editingConta ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
};