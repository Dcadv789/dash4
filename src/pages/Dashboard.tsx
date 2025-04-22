import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface DashboardItem {
  id: string;
  titulo_personalizado: string;
  tipo: 'categoria' | 'indicador' | 'conta_dre' | 'custom_sum';
  referencias_ids: string[];
  valor: number;
}

interface SystemUser {
  id: string;
  company_id: string | null;
  has_all_companies_access: boolean;
}

export const Dashboard = () => {
  const [companies, setCompanies] = useState<{ id: string; trading_name: string; }[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.has_all_companies_access) {
        fetchCompanies();
      } else if (currentUser.company_id) {
        setSelectedCompany(currentUser.company_id);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedCompany) {
      fetchDashboardItems();
    }
  }, [selectedCompany]);

  const fetchUserData = async () => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('system_users')
        .select('id, company_id, has_all_companies_access')
        .eq('auth_user_id', user?.id)
        .single();

      if (userError) throw userError;
      setCurrentUser(userData);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Erro ao carregar dados do usuário');
    }
  };

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

  const fetchDashboardItems = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard configuration
      const { data: configData, error: configError } = await supabase
        .from('dashboard_visual_config')
        .select('*')
        .eq('empresa_id', selectedCompany)
        .eq('is_active', true)
        .order('ordem');

      if (configError) throw configError;

      // Process each item
      const processedItems = await Promise.all(
        (configData || []).map(async (item) => {
          let valor = 0;

          // Fetch and sum values based on item type
          if (item.tipo === 'categoria') {
            const { data: rawData } = await supabase
              .from('dados_brutos')
              .select('valor, category:categories(type)')
              .eq('empresa_id', selectedCompany)
              .in('categoria_id', item.referencias_ids);

            valor = (rawData || []).reduce((sum, d) => {
              // Adjust value based on category type
              const adjustedValue = d.category?.type === 'expense' ? -d.valor : d.valor;
              return sum + adjustedValue;
            }, 0);
          } else if (item.tipo === 'indicador') {
            const { data: rawData } = await supabase
              .from('dados_brutos')
              .select('valor')
              .eq('empresa_id', selectedCompany)
              .in('indicador_id', item.referencias_ids);

            valor = (rawData || []).reduce((sum, d) => sum + d.valor, 0);
          } else if (item.tipo === 'conta_dre') {
            // TODO: Implement DRE account calculation
            valor = 0;
          } else if (item.tipo === 'custom_sum') {
            const { data: rawData } = await supabase
              .from('dados_brutos')
              .select('valor, category:categories(type)')
              .eq('empresa_id', selectedCompany)
              .or(`categoria_id.in.(${item.referencias_ids}),indicador_id.in.(${item.referencias_ids})`);

            valor = (rawData || []).reduce((sum, d) => {
              // Adjust value based on category type if it's a category
              const adjustedValue = d.category?.type === 'expense' ? -d.valor : d.valor;
              return sum + adjustedValue;
            }, 0);
          }

          return {
            ...item,
            valor
          };
        })
      );

      setItems(processedItems);
    } catch (err) {
      console.error('Error fetching dashboard items:', err);
      setError('Erro ao carregar itens do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  if (!currentUser) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <div className="bg-zinc-900 rounded-xl p-8 text-center">
          <p className="text-zinc-400">Carregando dados do usuário...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="bg-zinc-900 rounded-xl p-8 mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
            <p className="text-zinc-400 mt-1">Visualize os principais indicadores</p>
          </div>
        </div>

        {currentUser.has_all_companies_access && (
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
        )}
      </div>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          <p className="text-red-400">{error}</p>
        </div>
      ) : loading ? (
        <div className="bg-zinc-900 rounded-xl p-8 text-center">
          <p className="text-zinc-400">Carregando dados...</p>
        </div>
      ) : !selectedCompany ? (
        <div className="bg-zinc-900 rounded-xl p-8 text-center">
          <p className="text-zinc-400">Selecione uma empresa para visualizar o dashboard</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl p-8 text-center">
          <p className="text-zinc-400">Nenhum item configurado para esta empresa</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div key={item.id} className="bg-zinc-900 rounded-xl p-6">
              <h3 className="text-lg font-medium text-zinc-200 mb-2">
                {item.titulo_personalizado || `Item ${item.ordem + 1}`}
              </h3>
              <p className={`text-2xl font-bold ${
                item.valor >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {formatCurrency(item.valor)}
              </p>
              <p className="text-sm text-zinc-500 mt-1">
                {item.tipo === 'categoria' && 'Soma de Categorias'}
                {item.tipo === 'indicador' && 'Soma de Indicadores'}
                {item.tipo === 'conta_dre' && 'Conta DRE'}
                {item.tipo === 'custom_sum' && 'Soma Personalizada'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};