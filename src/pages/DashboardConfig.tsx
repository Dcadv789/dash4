import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { CompanySelector } from '../components/dashboard/CompanySelector';
import { DashboardItem } from '../components/dashboard/DashboardItem';
import { DashboardItemModal } from '../components/dashboard/DashboardItemModal';
import { Reference, DashboardItem as DashboardItemType } from '../types/dashboard';

type DataSourceFilter = 'all' | 'categoria' | 'indicador' | 'conta_dre';

export const DashboardConfig = () => {
  const [companies, setCompanies] = useState<{ id: string; trading_name: string; }[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [items, setItems] = useState<DashboardItemType[]>([]);
  const [categories, setCategories] = useState<Reference[]>([]);
  const [indicators, setIndicators] = useState<Reference[]>([]);
  const [dreAccounts, setDreAccounts] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<DashboardItemType | null>(null);
  const [dataSourceFilter, setDataSourceFilter] = useState<DataSourceFilter>('all');

  const [formData, setFormData] = useState({
    titulo_personalizado: '',
    tipo: 'categoria' as string,
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
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name, code')
        .order('code');
      setCategories(categoriesData?.map(c => ({ id: c.id, nome: c.name, codigo: c.code })) || []);

      const { data: indicatorsData } = await supabase
        .from('indicators')
        .select('id, name, code')
        .order('code');
      setIndicators(indicatorsData?.map(i => ({ id: i.id, nome: i.name, codigo: i.code })) || []);

      const { data: accountsData } = await supabase
        .from('contas_dre_modelo')
        .select('id, nome')
        .order('ordem_padrao');
      setDreAccounts(accountsData?.map(a => ({ id: a.id, nome: a.nome })) || []);
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
      resetFormData();
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
    } catch (err) {
      console.error('Error deleting item:', err);
      setError('Erro ao excluir item');
    }
  };

  const getFilteredReferences = () => {
    if (formData.tipo === 'categoria') {
      return categories;
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

  const resetFormData = () => {
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
  };

  return (
    <div className="max-w-6xl mx-auto py-8">
      <DashboardHeader onNewItem={() => setShowModal(true)} />

      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <CompanySelector
        companies={companies}
        selectedCompanyId={selectedCompanyId}
        onCompanyChange={setSelectedCompanyId}
      />

      {loading ? (
        <div className="bg-zinc-900 rounded-xl p-8 text-center">
          <p className="text-zinc-400">Carregando...</p>
        </div>
      ) : selectedCompanyId ? (
        <div className="space-y-4">
          {items.map(item => (
            <DashboardItem
              key={item.id}
              item={item}
              onEdit={() => {
                setEditingItem(item);
                setFormData({
                  titulo_personalizado: item.titulo_personalizado,
                  tipo: item.tipo,
                  referencias_ids: item.referencias_ids,
                  ordem: item.ordem,
                  is_active: item.is_active,
                  cor_resultado: item.cor_resultado,
                  tipo_grafico: item.tipo_grafico as 'linha' | 'barra' | 'pizza',
                  dados_vinculados: item.dados_vinculados || [],
                  top_limit: item.top_limit || 5
                });
                setShowModal(true);
              }}
              onDelete={() => handleDelete(item.id)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-xl p-8 text-center">
          <p className="text-zinc-400">Selecione uma empresa para configurar o dashboard</p>
        </div>
      )}

      <DashboardItemModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingItem(null);
          resetFormData();
        }}
        formData={formData}
        setFormData={setFormData}
        editingItem={editingItem}
        handleSave={handleSave}
        getFilteredReferences={getFilteredReferences}
        dataSourceFilter={dataSourceFilter}
      />
    </div>
  );
};