import React, { useState, useEffect } from 'react';
import { Plus, PencilIcon, Trash2, Save, X, Eye, BarChart2, ArrowUp, ArrowDown, List } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Company {
  id: string;
  trading_name: string;
}

interface Reference {
  id: string;
  name: string;
  code?: string;
  type?: 'revenue' | 'expense';
}

type CategoryFilter = 'all' | 'revenue' | 'expense';
type DataSourceFilter = 'all' | 'categoria' | 'indicador' | 'conta_dre';

interface DashboardItem {
  id: string;
  empresa_id: string;
  ordem: number;
  titulo_personalizado: string;
  tipo: 'categoria' | 'indicador' | 'conta_dre' | 'custom_sum' | 'grafico' | 'lista';
  referencias_ids: string[];
  is_active: boolean;
  cor_resultado: string;
  tipo_grafico?: 'linha' | 'barra' | 'pizza';
  dados_vinculados?: {
    id: string;
    tipo: 'categoria' | 'indicador' | 'conta_dre';
    nome: string;
  }[];
  top_limit?: number;
}

export const DashboardConfig = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [categories, setCategories] = useState<Reference[]>([]);
  const [indicators, setIndicators] = useState<Reference[]>([]);
  const [dreAccounts, setDreAccounts] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingItem, setViewingItem] = useState<DashboardItem | null>(null);
  const [editingItem, setEditingItem] = useState<DashboardItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [dataSourceFilter, setDataSourceFilter] = useState<DataSourceFilter>('all');

  const [formData, setFormData] = useState({
    titulo_personalizado: '',
    tipo: 'categoria' as DashboardItem['tipo'],
    referencias_ids: [] as string[],
    ordem: 0,
    is_active: true,
    cor_resultado: '#44FF44',
    tipo_grafico: 'linha' as 'linha' | 'barra' | 'pizza',
    dados_vinculados: [] as { id: string; tipo: 'categoria' | 'indicador' | 'conta_dre'; nome: string; }[],
    top_limit: 5
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchItems();
      fetchReferences();
    }
  }, [selectedCompanyId]);

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
        .eq('empresa_id', selectedCompanyId)
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

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const payload = {
        empresa_id: selectedCompanyId,
        ordem: editingItem ? editingItem.ordem : items.length,
        titulo_personalizado: formData.titulo_personalizado,
        tipo: formData.tipo,
        referencias_ids: formData.tipo === 'grafico' || formData.tipo === 'lista' ? [] : formData.referencias_ids,
        is_active: formData.is_active,
        cor_resultado: formData.cor_resultado,
        tipo_grafico: formData.tipo === 'grafico' ? formData.tipo_grafico : null,
        dados_vinculados: (formData.tipo === 'grafico' || formData.tipo === 'lista') ? formData.dados_vinculados : null,
        top_limit: formData.tipo === 'lista' ? formData.top_limit : null
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
        referencias_ids: [],
        ordem: 0,
        is_active: true,
        cor_resultado: '#44FF44',
        tipo_grafico: 'linha',
        dados_vinculados: [],
        top_limit: 5
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

  const getFilteredReferences = () => {
    if (formData.tipo === 'categoria') {
      return categories.filter(cat => {
        if (categoryFilter === 'all') return true;
        return cat.type === categoryFilter;
      });
    }
    if (formData.tipo === 'indicador') return indicators;
    if (formData.tipo === 'conta_dre') return dreAccounts;
    if (formData.tipo === 'grafico' || formData.tipo === 'lista') {
      let refs = [];
      if (dataSourceFilter === 'all' || dataSourceFilter === 'categoria') {
        refs = [...refs, ...categories];
      }
      if (dataSourceFilter === 'all' || dataSourceFilter === 'indicador') {
        refs = [...refs, ...indicators];
      }
      if (dataSourceFilter === 'all' || dataSourceFilter === 'conta_dre') {
        refs = [...refs, ...dreAccounts];
      }
      return refs;
    }
    return [];
  };

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Configuração do Dashboard</h1>
          <p className="text-zinc-400 mt-1">Configure os itens que serão exibidos no dashboard</p>
        </div>
        {selectedCompanyId && (
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
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3">
          <p className="text-green-400">{success}</p>
        </div>
      )}

      <div className="bg-zinc-900 rounded-xl p-8 mb-8">
        <div className="w-full md:w-96">
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Empresa
          </label>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
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

      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={item.id} className="bg-zinc-900 rounded-xl p-6">
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
                      referencias_ids: item.referencias_ids,
                      ordem: item.ordem,
                      is_active: item.is_active,
                      cor_resultado: item.cor_resultado,
                      tipo_grafico: item.tipo_grafico || 'linha',
                      dados_vinculados: item.dados_vinculados || [],
                      top_limit: item.top_limit || 5
                    });
                    setShowModal(true);
                  }}
                  className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400"
                  title="Editar"
                >
                  <PencilIcon size={16} />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-red-400"
                  title="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

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
              {(viewingItem.tipo === 'grafico' || viewingItem.tipo === 'lista') ? (
                viewingItem.dados_vinculados?.map(item => (
                  <div
                    key={item.id}
                    className="p-3 bg-zinc-800 rounded-lg"
                  >
                    <span className="text-zinc-300">{item.nome}</span>
                  </div>
                ))
              ) : (
                viewingItem.referencias_ids.map(refId => {
                  const reference = viewingItem.tipo === 'categoria' 
                    ? categories.find(c => c.id === refId)
                    : viewingItem.tipo === 'indicador'
                    ? indicators.find(i => i.id === refId)
                    : dreAccounts.find(a => a.id === refId);

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
                })
              )}
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
                    referencias_ids: [],
                    ordem: 0,
                    is_active: true,
                    cor_resultado: '#44FF44',
                    tipo_grafico: 'linha',
                    dados_vinculados: [],
                    top_limit: 5
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
                  Tipo
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({
                    ...formData,
                    tipo: e.target.value as DashboardItem['tipo'],
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
                    Tipo de Dados
                  </label>
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setDataSourceFilter('all')}
                      className={`px-4 py-2 rounded-lg ${
                        dataSourceFilter === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setDataSourceFilter('categoria')}
                      className={`px-4 py-2 rounded-lg ${
                        dataSourceFilter === 'categoria'
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      Categorias
                    </button>
                    <button
                      onClick={() => setDataSourceFilter('indicador')}
                      className={`px-4 py-2 rounded-lg ${
                        dataSourceFilter === 'indicador'
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      Indicadores
                    </button>
                    <button
                      onClick={() => setDataSourceFilter('conta_dre')}
                      className={`px-4 py-2 rounded-lg ${
                        dataSourceFilter === 'conta_dre'
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      Contas DRE
                    </button>
                  </div>
                </div>
              )}

              {formData.tipo !== 'grafico' && formData.tipo !== 'lista' && (
                <div>
                  {formData.tipo === 'categoria' && (
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => setCategoryFilter('all')}
                        className={`px-4 py-2 rounded-lg ${
                          categoryFilter === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        Ambos
                      </button>
                      <button
                        onClick={() => setCategoryFilter('revenue')}
                        className={`px-4 py-2 rounded-lg ${
                          categoryFilter === 'revenue'
                            ? 'bg-green-600 text-white'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        Receita
                      </button>
                      <button
                        onClick={() => setCategoryFilter('expense')}
                        className={`px-4 py-2 rounded-lg ${
                          categoryFilter === 'expense'
                            ? 'bg-red-600 text-white'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        Despesa
                      </button>
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
                                    nome: ref.name
                                  }]
                            });
                          }}
                          className="w-4 h-4 rounded border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-800"
                        />
                        <span className="text-zinc-300">
                          {ref.code ? `${ref.code} - ${ref.name}` : ref.name}
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
                onClick={() => {
                  setShowModal(false);
                  setEditingItem(null);
                  setFormData({
                    titulo_personalizado: '',
                    tipo: 'categoria',
                    referencias_ids: [],
                    ordem: 0,
                    is_active: true,
                    cor_resultado: '#44FF44',
                    tipo_grafico: 'linha',
                    dados_vinculados: [],
                    top_limit: 5
                
                  });
                }}
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
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};