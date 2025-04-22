import React from 'react';
import { X, Save } from 'lucide-react';
import { Reference } from '../../types/dashboard';

interface DashboardItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: {
    titulo_personalizado: string;
    tipo: string;
    referencias_ids: string[];
    ordem: number;
    is_active: boolean;
    cor_resultado: string;
    tipo_grafico: 'linha' | 'barra' | 'pizza';
    dados_vinculados: { id: string; tipo: 'categoria' | 'indicador' | 'conta_dre'; nome: string; }[];
    top_limit: number;
  };
  setFormData: (data: any) => void;
  editingItem: any;
  handleSave: () => void;
  getFilteredReferences: () => Reference[];
  dataSourceFilter: string;
}

export const DashboardItemModal: React.FC<DashboardItemModalProps> = ({
  isOpen,
  onClose,
  formData,
  setFormData,
  editingItem,
  handleSave,
  getFilteredReferences,
  dataSourceFilter
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-zinc-100">
            {editingItem ? 'Editar Item' : 'Novo Item'}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              Título do Item
            </label>
            <input
              type="text"
              value={formData.titulo_personalizado}
              onChange={(e) => setFormData({ ...formData, titulo_personalizado: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
              placeholder="Nome que será exibido no dashboard"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              Tipo
            </label>
            <select
              value={formData.tipo}
              onChange={(e) => setFormData({
                ...formData,
                tipo: e.target.value,
                referencias_ids: [],
                dados_vinculados: []
              })}
              className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
            >
              <option value="categoria">Categorias</option>
              <option value="indicador">Indicador</option>
              <option value="conta_dre">Conta DRE</option>
              <option value="custom_sum">Soma Personalizada</option>
              <option value="grafico">Gráfico</option>
              <option value="lista">Lista</option>
            </select>
          </div>

          {formData.tipo === 'lista' && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Limite do Top
              </label>
              <input
                type="number"
                value={formData.top_limit}
                onChange={(e) => setFormData({
                  ...formData,
                  top_limit: parseInt(e.target.value) || 5
                })}
                min={1}
                max={20}
                className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
              />
            </div>
          )}

          {formData.tipo === 'grafico' && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Tipo de Gráfico
              </label>
              <select
                value={formData.tipo_grafico}
                onChange={(e) => setFormData({
                  ...formData,
                  tipo_grafico: e.target.value as 'linha' | 'barra' | 'pizza'
                })}
                className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
              >
                <option value="linha">Linha</option>
                <option value="barra">Barra</option>
                <option value="pizza">Pizza</option>
              </select>
            </div>
          )}

          {(formData.tipo === 'grafico' || formData.tipo === 'lista') && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Selecionar Dados
              </label>
              <div className="space-y-2 max-h-64 overflow-y-auto bg-zinc-800 rounded-lg p-2">
                {getFilteredReferences().map(ref => (
                  <label
                    key={ref.id}
                    className="flex items-center gap-2 p-2 hover:bg-zinc-700 rounded-lg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.dados_vinculados.some(d => d.id === ref.id)}
                      onChange={() => {
                        const isSelected = formData.dados_vinculados.some(d => d.id === ref.id);
                        setFormData({
                          ...formData,
                          dados_vinculados: isSelected
                            ? formData.dados_vinculados.filter(d => d.id !== ref.id)
                            : [...formData.dados_vinculados, {
                                id: ref.id,
                                tipo: dataSourceFilter === 'all' ? 'categoria' : dataSourceFilter,
                                nome: ref.nome
                              }]
                        });
                      }}
                      className="w-4 h-4 rounded border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-800"
                    />
                    <span className="text-zinc-300">
                      {ref.codigo ? `${ref.codigo} - ${ref.nome}` : ref.nome}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {formData.tipo !== 'grafico' && formData.tipo !== 'lista' && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Referências
              </label>
              <div className="space-y-2 max-h-64 overflow-y-auto bg-zinc-800 rounded-lg p-2">
                {getFilteredReferences().map(ref => (
                  <label
                    key={ref.id}
                    className="flex items-center gap-2 p-2 hover:bg-zinc-700 rounded-lg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.referencias_ids.includes(ref.id)}
                      onChange={() => {
                        const newIds = formData.referencias_ids.includes(ref.id)
                          ? formData.referencias_ids.filter(id => id !== ref.id)
                          : [...formData.referencias_ids, ref.id];
                        setFormData({ ...formData, referencias_ids: newIds });
                      }}
                      className="w-4 h-4 rounded border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-800"
                    />
                    <span className="text-zinc-300">
                      {ref.codigo ? `${ref.codigo} - ${ref.nome}` : ref.nome}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              Cor do Resultado
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={formData.cor_resultado === '#44FF44'}
                  onChange={() => setFormData({ ...formData, cor_resultado: '#44FF44' })}
                  className="text-green-600"
                />
                <span className="text-green-400">Verde</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={formData.cor_resultado === '#FF4444'}
                  onChange={() => setFormData({ ...formData, cor_resultado: '#FF4444' })}
                  className="text-red-600"
                />
                <span className="text-red-400">Vermelho</span>
              </label>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({
                  ...formData,
                  is_active: e.target.checked
                })}
                className="w-4 h-4 rounded border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-800"
              />
              <span className="text-zinc-400">Item Ativo</span>
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
            onClick={handleSave}
            disabled={!formData.titulo_personalizado || (
              formData.tipo !== 'grafico' && formData.tipo !== 'lista' && !formData.referencias_ids.length
            ) || (
              (formData.tipo === 'grafico' || formData.tipo === 'lista') && !formData.dados_vinculados.length
            )}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} className="inline-block mr-2" />
            {editingItem ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
};