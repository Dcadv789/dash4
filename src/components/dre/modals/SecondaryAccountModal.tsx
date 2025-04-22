import React from 'react';
import { X, Save } from 'lucide-react';

interface SecondaryAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: {
    nome: string;
    ordem: number;
    empresa_ids: string[];
  };
  setFormData: (data: any) => void;
  editingContaSecundaria: any;
  onSave: () => void;
}

export const SecondaryAccountModal: React.FC<SecondaryAccountModalProps> = ({
  isOpen,
  onClose,
  formData,
  setFormData,
  editingContaSecundaria,
  onSave
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-zinc-100">
            {editingContaSecundaria ? 'Editar Conta Secundária' : 'Nova Conta Secundária'}
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
              Ordem
            </label>
            <input
              type="number"
              value={formData.ordem}
              onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) })}
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
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
          >
            <Save size={16} className="inline-block mr-2" />
            {editingContaSecundaria ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
};