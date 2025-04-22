import React, { useState, useEffect } from 'react';
import { Plus, GripVertical, X, Save, AlertCircle, Check, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface DashboardItem {
  id: string;
  empresa_id: string;
  ordem: number;
  titulo_personalizado: string;
  tipo: 'categoria' | 'indicador' | 'conta_dre' | 'custom_sum';
  tipo_categoria?: 'receita' | 'despesa' | 'ambos';
  referencias_ids: string[];
  is_active: boolean;
}

interface Reference {
  id: string;
  name: string;
  code?: string;
  type?: 'revenue' | 'expense';
}

export const DashboardConfig = () => {
  const [companies, setCompanies] = useState<{ id: string; trading_name: string; }[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [categories, setCategories] = useState<Reference[]>([]);
  const [indicators, setIndicators] = useState<Reference[]>([]);
  const [dreAccounts, setDreAccounts] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingItem, setViewingItem] = useState<DashboardItem | null>(null);
  const [editingItem, setEditingItem] = useState<DashboardItem | null>(null);

  const [formData, setFormData] = useState({
    titulo_personalizado: '',
    tipo: 'categoria' as DashboardItem['tipo'],
    tipo_categoria: 'ambos' as 'receita' | 'despesa' | 'ambos',
    referencias_ids: [] as string[],
    ordem: 0,
    is_active: true
  });

  useEffect(() => {
    fetchCompanies();
    fetchReferences();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchItems();
    }
  }, [selectedCompany]);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, trading_name')
        .eq('is_active', true)
        .order('trading_name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (err) {
      console.error('Error fetching companies:', err);
      setError('Erro ao carregar empresas');
    }
  };

  const fetchReferences = async () => {
    try {
      // Fetch categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name, code, type')
        .order('code');
      setCategories(categoriesData || []);

      // Fetch indicators
      const { data: indicatorsData } = await supabase
        .from('indicators')
        .select('id, name, code')
        .order('code');
      setIndicators(indicatorsData || []);

      // Fetch DRE accounts
      const { data: accountsData } = await supabase
        .from('contas_dre_modelo')
        .select('id, nome')
        .order('ordem_padrao');
      
      setDreAccounts(accountsData?.map(acc => ({ 
        id: acc.id, 
        name: acc.nome,
        code: '' 
      })) || []);
    } catch (err) {
      console.error('Error fetching references:', err);
      setError('Erro ao carregar referências');
    }
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('dashboard_visual_config')
        .select('*')
        .eq('empresa_id', selectedCompany)
        .order('ordem');

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Error fetching items:', err);
      setError('Erro ao carregar itens');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);

    // Update ordem for all items
    newItems.forEach((item, index) => {
      item.ordem = index;
    });

    setItems(newItems);

    try {
      const { error } = await supabase
        .from('dashboard_visual_config')
        .upsert(
          newItems.map(item => ({
            id: item.id,
            ordem: item.ordem,
            empresa_id: item.empresa_id,
            titulo_personalizado: item.titulo_personalizado,
            tipo: item.tipo,
            tipo_categoria: item.tipo_categoria,
            referencias_ids: item.referencias_ids,
            is_active: item.is_active
          }))
        );

      if (error) throw error;
    } catch (err) {
      console.error('Error updating order:', err);
      setError('Erro ao atualizar ordem dos itens');
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const payload = {
        empresa_id: selectedCompany,
        ordem: editingItem ? editingItem.ordem : items.length,
        titulo_personalizado: formData.titulo_personalizado,
        tipo: formData.tipo,
        tipo_categoria: formData.tipo === 'categoria' ? formData.tipo_categoria : null,
        referencias_ids: formData.referencias_ids,
        is_active: formData.is_active
      };

      if (editingItem) {
        const { error } = await supabase
          .from('dashboard_visual_config')
          .update(payload)
          .eq('id', editingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('dashboard_visual_config')
          .insert([payload]);

        if (error) throw error;
      }

      await fetchItems();
      setShowModal(false);
      setEditingItem(null);
      setFormData({
        titulo_personalizado: '',
        tipo: 'categoria',
        tipo_categoria: 'ambos',
        referencias_ids: [],
        ordem: 0,
        is_active: true
      });
      setSuccess('Item salvo com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving item:', err);
      setError('Erro ao salvar item');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;

    try {
      const { error } = await supabase
        .from('dashboard_visual_config')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchItems();
      setSuccess('Item excluído com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting item:', err);
      setError('Erro ao excluir item');
    }
  };

  const getReferenceOptions = () => {
    if (formData.tipo === 'categoria') {
      return categories.filter(cat => {
        if (formData.tipo_categoria === 'receita') return cat.type === 'revenue';
        if (formData.tipo_categoria === 'despesa') return cat.type === 'expense';
        return true;
      });
    }
    if (formData.tipo === 'indicador') return indicators;
    if (formData.tipo === 'conta_dre') return dreAccounts;
    return [...categories, ...indicators, ...dreAccounts];
  };

  const handleReferenceToggle = (refId: string) => {
    setFormData(prev => {
      const newIds = prev.referencias_ids.includes(refId)
        ? prev.referencias_ids.filter(id => id !== refId)
        : [...prev.referencias_ids, refId];
      return { ...prev, referencias_ids: newIds };
    });
  };

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="bg-zinc-900 rounded-xl p-8 mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Configuração do Dashboard</h1>
            <p className="text-zinc-400 mt-1">Configure os itens que serão exibidos no dashboard</p>
          </div>
          {selectedCompany && (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white flex items-center gap-2"
            >
              <Plus size={20} />
              Novo Item
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 flex items-center gap-2">
            <AlertCircle size={20} className="text-red-400" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3 flex items-center gap-2">
            <Check size={20} className="text-green-400" />
            <p className="text-green-400">{success}</p>
          </div>
        )}

        <div className="w-full md:w-96">
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Empresa
          </label>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
          >
            <option value="">Selecione uma empresa</option>
            {companies.map(company => (
              <option key={company.id} value={company.id}>
                {company.trading_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedCompany && (
        <div className="space-y-4">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="dashboard-items">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-4"
                >
                  {items.map((item, index) => (
                    <Draggable
                      key={item.id}
                      draggableId={item.id}
                      index={index}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="bg-zinc-900 rounded-xl p-6"
                        >
                          <div className="flex items-start gap-4">
                            <div
                              {...provided.dragHandleProps}
                              className="p-2 hover:bg-zinc-800 rounded-lg cursor-move"
                            >
                              <GripVertical size={20} className="text-zinc-400" />
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="text-lg font-medium text-zinc-100">
                                    {item.titulo_personalizado || `Item ${index + 1}`}
                                  </h3>
                                  <div className="flex items-center gap-4 mt-1">
                                    <p className="text-sm text-zinc-400">
                                      {item.tipo === 'categoria' && 'Soma de Categorias'}
                                      {item.tipo === 'indicador' && 'Indicador'}
                                      {item.tipo === 'conta_dre' && 'Conta DRE'}
                                      {item.tipo === 'custom_sum' && 'Soma Personalizada'}
                                    </p>
                                    {item.tipo === 'categoria' && item.tipo_categoria && (
                                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                                        item.tipo_categoria === 'receita' 
                                          ? 'bg-green-500/20 text-green-400'
                                          : item.tipo_categoria === 'despesa'
                                          ? 'bg-red-500/20 text-red-400'
                                          : 'bg-blue-500/20 text-blue-400'
                                      }`}>
                                        {item.tipo_categoria === 'receita' ? 'Receita' : 
                                         item.tipo_categoria === 'despesa' ? 'Despesa' : 'Ambos'}
                                      </span>
                                    )}
                                    <span className="text-sm text-zinc-500">
                                      Ordem: {item.ordem + 1}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setViewingItem(item);
                                      setShowViewModal(true);
                                    }}
                                    className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400"
                                    title="Ver Itens"
                                  >
                                    <Eye size={16} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingItem(item);
                                      setFormData({
                                        titulo_personalizado: item.titulo_personalizado,
                                        tipo: item.tipo,
                                        tipo_categoria: item.tipo_categoria || 'ambos',
                                        referencias_ids: item.referencias_ids,
                                        ordem: item.ordem,
                                        is_active: item.is_active
                                      });
                                      setShowModal(true);
                                    }}
                                    className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400"
                                    title="Editar"
                                  >
                                    <Save size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(item.id)}
                                    className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-red-400"
                                    title="Excluir"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      )}

      {/* Modal de Visualização */}
      {showViewModal && viewingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-zinc-100">
                {viewingItem.titulo_personalizado || 'Itens Selecionados'}
              </h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingItem(null);
                }}
                className="text-zinc-400 hover:text-zinc-100"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {viewingItem.referencias_ids.map(refId => {
                const reference = getReferenceOptions().find(r => r.id === refId);
                return reference && (
                  <div
                    key={refId}
                    className="p-3 bg-zinc-800 rounded-lg"
                  >
                    <span className="text-zinc-300">
                      {reference.code ? `${reference.code} - ${reference.name}` : reference.name}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingItem(null);
                }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-zinc-100">
                {editingItem ? 'Editar Item' : 'Novo Item'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingItem(null);
                  setFormData({
                    titulo_personalizado: '',
                    tipo: 'categoria',
                    tipo_categoria: 'ambos',
                    referencias_ids: [],
                    ordem: 0,
                    is_active: true
                  });
                }}
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
                  Ordem de Exibição
                </label>
                <input
                  type="number"
                  value={formData.ordem}
                  onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) })}
                  min={0}
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
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
                    tipo: e.target.value as DashboardItem['tipo'],
                    referencias_ids: []
                  })}
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
                >
                  <option value="categoria">Categorias</option>
                  <option value="indicador">Indicador</option>
                  <option value="conta_dre">Conta DRE</option>
                  <option value="custom_sum">Soma Personalizada</option>
                </select>
              </div>

              {formData.tipo === 'categoria' && (
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    Tipo de Categoria
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFormData({ ...formData, tipo_categoria: 'ambos' })}
                      className={`px-4 py-2 rounded-lg ${
                        formData.tipo_categoria === 'ambos'
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      Ambos
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, tipo_categoria: 'receita' })}
                      className={`px-4 py-2 rounded-lg ${
                        formData.tipo_categoria === 'receita'
                          ? 'bg-green-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      Receita
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, tipo_categoria: 'despesa' })}
                      className={`px-4 py-2 rounded-lg ${
                        formData.tipo_categoria === 'despesa'
                          ? 'bg-red-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      Despesa
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  {formData.tipo === 'categoria' ? 'Categorias' :
                    formData.tipo === 'indicador' ? 'Indicador' :
                    formData.tipo === 'conta_dre' ? 'Conta DRE' :
                    'Itens para Soma'}
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto bg-zinc-800 rounded-lg p-2">
                  {getReferenceOptions().map(ref => (
                    <label
                      key={ref.id}
                      className="flex items-center gap-2 p-2 hover:bg-zinc-700 rounded-lg cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.referencias_ids.includes(ref.id)}
                        onChange={() => handleReferenceToggle(ref.id)}
                        className="w-4 h-4 rounded border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-800"
                      />
                      <span className="text-zinc-300">
                        {ref.code ? `${ref.code} - ${ref.name}` : ref.name}
                      </span>
                      {ref.type && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          ref.type === 'revenue' 
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {ref.type === 'revenue' ? 'Receita' : 'Despesa'}
                        </span>
                      )}
                    </label>
                  ))}
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
                onClick={() => {
                  setShowModal(false);
                  setEditingItem(null);
                  setFormData({
                    titulo_personalizado: '',
                    tipo: 'categoria',
                    tipo_categoria: 'ambos',
                    referencias_ids: [],
                    ordem: 0,
                    is_active: true
                  });
                }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.referencias_ids.length}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};