import React, { useState, useEffect } from 'react';
import { Plus, GripVertical, X, Save, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface DashboardItem {
  id: string;
  empresa_id: string;
  ordem: number;
  titulo_personalizado: string;
  tipo: 'categoria' | 'indicador' | 'conta_dre' | 'custom_sum';
  referencias_ids: string[];
  is_active: boolean;
}

interface Reference {
  id: string;
  name: string;
  code?: string;
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
        .select('id, name, code')
        .order('code');
      setCategories(categoriesData || []);

      // Fetch indicators
      const { data: indicatorsData } = await supabase
        .from('indicators')
        .select('id, name, code')
        .order('code');
      setIndicators(indicatorsData || []);

      // Fetch DRE accounts - using the correct column name 'nome'
      const { data: accountsData } = await supabase
        .from('contas_dre_modelo')
        .select('id, nome')
        .order('ordem_padrao');
      
      // Transform the data to match our Reference interface
      setDreAccounts(accountsData?.map(acc => ({ 
        id: acc.id, 
        name: acc.nome, // Map 'nome' to 'name'
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

  const handleAddItem = () => {
    const newItem: DashboardItem = {
      id: crypto.randomUUID(),
      empresa_id: selectedCompany,
      ordem: items.length,
      titulo_personalizado: '',
      tipo: 'categoria',
      referencias_ids: [],
      is_active: true
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    newItems.forEach((item, idx) => {
      item.ordem = idx;
    });
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof DashboardItem, value: any) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
      // Reset references when changing type
      referencias_ids: field === 'tipo' ? [] : newItems[index].referencias_ids
    };
    setItems(newItems);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);

    // Update ordem for all items
    newItems.forEach((item, index) => {
      item.ordem = index;
    });

    setItems(newItems);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      // Delete existing items
      const { error: deleteError } = await supabase
        .from('dashboard_visual_config')
        .delete()
        .eq('empresa_id', selectedCompany);

      if (deleteError) throw deleteError;

      // Insert new items
      const { error: insertError } = await supabase
        .from('dashboard_visual_config')
        .insert(items.map(({ id, ...item }) => item));

      if (insertError) throw insertError;

      setSuccess('Configurações salvas com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving config:', err);
      setError('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  const getReferenceOptions = (tipo: string) => {
    switch (tipo) {
      case 'categoria':
        return categories;
      case 'indicador':
        return indicators;
      case 'conta_dre':
        return dreAccounts;
      default:
        return [...categories, ...indicators, ...dreAccounts];
    }
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
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={20} />
              Salvar Configurações
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

                            <div className="flex-1 space-y-4">
                              <input
                                type="text"
                                value={item.titulo_personalizado}
                                onChange={(e) => handleItemChange(index, 'titulo_personalizado', e.target.value)}
                                placeholder="Título personalizado"
                                className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
                              />

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    Tipo
                                  </label>
                                  <select
                                    value={item.tipo}
                                    onChange={(e) => handleItemChange(index, 'tipo', e.target.value)}
                                    className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
                                  >
                                    <option value="categoria">Categoria</option>
                                    <option value="indicador">Indicador</option>
                                    <option value="conta_dre">Conta DRE</option>
                                    <option value="custom_sum">Soma Personalizada</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    Referências
                                  </label>
                                  <select
                                    multiple
                                    value={item.referencias_ids}
                                    onChange={(e) => handleItemChange(
                                      index,
                                      'referencias_ids',
                                      Array.from(e.target.selectedOptions, option => option.value)
                                    )}
                                    className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
                                    size={4}
                                  >
                                    {getReferenceOptions(item.tipo).map(ref => (
                                      <option key={ref.id} value={ref.id}>
                                        {ref.code ? `${ref.code} - ${ref.name}` : ref.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => handleRemoveItem(index)}
                              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-red-400"
                            >
                              <X size={20} />
                            </button>
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

          <button
            onClick={handleAddItem}
            className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-zinc-400 flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Adicionar Novo Item
          </button>
        </div>
      )}
    </div>
  );
};