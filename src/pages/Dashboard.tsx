import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LineChart, BarChart, Calendar, TrendingUp, AlertCircle } from 'lucide-react';

interface DashboardItem {
  id: string;
  titulo_personalizado: string;
  tipo: 'categoria' | 'indicador' | 'conta_dre' | 'custom_sum';
  referencias_ids: string[];
  ordem: number;
  cor_resultado: string;
  valor: number;
}

interface SystemUser {
  id: string;
  company_id: string | null;
  has_all_companies_access: boolean;
  name: string;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const Dashboard = () => {
  const [companies, setCompanies] = useState<{ id: string; trading_name: string; }[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>(MONTHS[new Date().getMonth()]);
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
        setSelectedCompanyId(currentUser.company_id);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchDashboardItems();
    }
  }, [selectedCompanyId, selectedYear, selectedMonth]);

  const fetchUserData = async () => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('system_users')
        .select('id, company_id, has_all_companies_access, name')
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
      console.error('Erro ao carregar empresas:', err);
      setError('Erro ao carregar empresas');
    }
  };

  const fetchDashboardItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: configData, error: configError } = await supabase
        .from('dashboard_visual_config')
        .select('*')
        .eq('empresa_id', selectedCompanyId)
        .eq('is_active', true)
        .order('ordem');

      if (configError) throw configError;

      // Processar os dados e calcular valores
      const processedItems = await Promise.all((configData || []).map(async (item) => {
        let valor = 0;

        switch (item.tipo) {
          case 'categoria':
            const { data: catData } = await supabase
              .from('dados_brutos')
              .select('valor')
              .eq('empresa_id', selectedCompanyId)
              .eq('ano', selectedYear)
              .eq('mes', selectedMonth)
              .in('categoria_id', item.referencias_ids);
            
            valor = catData?.reduce((sum, d) => sum + d.valor, 0) || 0;
            break;

          case 'indicador':
            const { data: indData } = await supabase
              .from('dados_brutos')
              .select('valor')
              .eq('empresa_id', selectedCompanyId)
              .eq('ano', selectedYear)
              .eq('mes', selectedMonth)
              .in('indicador_id', item.referencias_ids);
            
            valor = indData?.reduce((sum, d) => sum + d.valor, 0) || 0;
            break;

          // Adicionar outros casos conforme necessário
        }

        return {
          ...item,
          valor
        };
      }));

      setItems(processedItems);
    } catch (err) {
      console.error('Erro ao carregar itens:', err);
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

  const renderCards = () => {
    const topCards = items.filter(item => item.ordem <= 4);
    const mainChart = items.find(item => item.ordem === 5);
    const bottomCards = items.filter(item => item.ordem > 5);

    return (
      <div className="space-y-6">
        {/* Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => {
            const item = topCards[index];
            return (
              <div key={index} className="bg-zinc-800 rounded-xl p-6">
                {item ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-zinc-300">{item.titulo_personalizado}</h3>
                      <div className="p-2 bg-zinc-700 rounded-lg">
                        <TrendingUp size={20} className="text-zinc-400" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold" style={{ color: item.cor_resultado }}>
                      {formatCurrency(item.valor)}
                    </p>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-zinc-500">Aguardando configuração...</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Main Chart */}
        <div className="bg-zinc-800 rounded-xl p-6 h-[400px]">
          {mainChart ? (
            <div className="flex items-center justify-center h-full">
              <LineChart className="text-zinc-400" size={32} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-zinc-500">Gráfico será implementado em breve...</p>
            </div>
          )}
        </div>

        {/* Bottom Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, index) => {
            const item = bottomCards[index];
            return (
              <div key={index} className="bg-zinc-800 rounded-xl p-6">
                {item ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-zinc-300">{item.titulo_personalizado}</h3>
                      <div className="p-2 bg-zinc-700 rounded-lg">
                        {index === 0 ? (
                          <BarChart size={20} className="text-zinc-400" />
                        ) : (
                          <Calendar size={20} className="text-zinc-400" />
                        )}
                      </div>
                    </div>
                    <p className="text-2xl font-bold" style={{ color: item.cor_resultado }}>
                      {formatCurrency(item.valor)}
                    </p>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-zinc-500">Aguardando configuração...</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1600px] mx-auto py-8">
      <div className="bg-zinc-900 rounded-xl p-8 mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
            <p className="text-zinc-400 mt-1">Visualize os principais indicadores</p>
          </div>
          <div className="flex items-center gap-4">
            {currentUser?.has_all_companies_access && (
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
              >
                <option value="">Selecione uma empresa</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.trading_name}
                  </option>
                ))}
              </select>
            )}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
            >
              {Array.from({ length: 5 }, (_, i) => selectedYear - 2 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
            >
              {MONTHS.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 flex items-center gap-2">
            <AlertCircle size={20} className="text-red-400" />
            <p className="text-red-400">{error}</p>
          </div>
        ) : loading ? (
          <div className="text-center py-8">
            <p className="text-zinc-400">Carregando dados...</p>
          </div>
        ) : (
          renderCards()
        )}
      </div>
    </div>
  );
};