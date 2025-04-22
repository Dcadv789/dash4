import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Circle, ArrowUp, ArrowDown } from 'lucide-react';

interface Company {
  id: string;
  trading_name: string;
}

interface SystemUser {
  id: string;
  role: string;
  company_id: string | null;
  has_all_companies_access: boolean;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MONTH_ABBREVIATIONS: { [key: string]: string } = {
  'Janeiro': 'Jan', 'Fevereiro': 'Fev', 'Março': 'Mar',
  'Abril': 'Abr', 'Maio': 'Mai', 'Junho': 'Jun',
  'Julho': 'Jul', 'Agosto': 'Ago', 'Setembro': 'Set',
  'Outubro': 'Out', 'Novembro': 'Nov', 'Dezembro': 'Dez'
};

interface DashboardItem {
  id: string;
  titulo_personalizado: string;
  tipo: 'categoria' | 'indicador' | 'conta_dre' | 'custom_sum';
  referencias_ids: string[];
  ordem: number;
  cor_resultado: string;
  valor: number;
}

export const Dashboard = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>(MONTHS[new Date().getMonth()]);
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [loading, setLoading] = useState(false);
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
    if (selectedCompanyId && selectedYear && selectedMonth) {
      fetchDashboardItems();
    }
  }, [selectedCompanyId, selectedYear, selectedMonth]);

  const fetchUserData = async () => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('system_users')
        .select('id, role, company_id, has_all_companies_access')
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

  const getLast12Months = () => {
    const months = [];
    const currentMonthIndex = MONTHS.indexOf(selectedMonth);
    const currentYear = selectedYear;

    for (let i = 11; i >= 0; i--) {
      let monthIndex = currentMonthIndex - i;
      let year = currentYear;

      if (monthIndex < 0) {
        monthIndex += 12;
        year--;
      }

      months.push({
        month: MONTHS[monthIndex],
        year: year
      });
    }

    return months;
  };

  const fetchDashboardItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const months = getLast12Months();

      const { data: configData, error: configError } = await supabase
        .from('dashboard_visual_config')
        .select('*')
        .eq('empresa_id', selectedCompanyId)
        .eq('is_active', true)
        .order('ordem');

      if (configError) throw configError;

      const processedItems = await Promise.all((configData || []).map(async (item) => {
        let currentValue = 0;
        let previousValue = 0;

        const { data: currentData } = await supabase
          .from('dados_brutos')
          .select('valor')
          .eq('empresa_id', selectedCompanyId)
          .eq('ano', selectedYear)
          .eq('mes', selectedMonth)
          .in(item.tipo === 'categoria' ? 'categoria_id' : 'indicador_id', item.referencias_ids);

        currentValue = currentData?.reduce((sum, d) => sum + d.valor, 0) || 0;

        const prevMonth = months[1];
        const { data: previousData } = await supabase
          .from('dados_brutos')
          .select('valor')
          .eq('empresa_id', selectedCompanyId)
          .eq('ano', prevMonth.year)
          .eq('mes', prevMonth.month)
          .in(item.tipo === 'categoria' ? 'categoria_id' : 'indicador_id', item.referencias_ids);

        previousValue = previousData?.reduce((sum, d) => sum + d.valor, 0) || 0;

        return {
          ...item,
          valor: currentValue,
          valorAnterior: previousValue
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

  const calculateVariation = (currentValue: number, previousValue: number) => {
    if (previousValue === 0) return { percentage: 0, isPositive: true };
    const variation = ((currentValue - previousValue) / previousValue) * 100;
    return {
      percentage: Math.abs(variation).toFixed(1),
      isPositive: variation >= 0
    };
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
            const variation = item ? calculateVariation(item.valor, item.valorAnterior) : { percentage: 0, isPositive: true };

            return (
              <div key={index} className="bg-zinc-800 rounded-xl p-6 flex flex-col justify-between min-h-[180px]">
                {item ? (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-zinc-300">{item.titulo_personalizado}</h3>
                        <div className="p-2 bg-zinc-700 rounded-lg">
                          <Circle size={20} className="text-zinc-400" style={{ color: item.cor_resultado }} />
                        </div>
                      </div>
                      <p className="text-2xl font-bold" style={{ color: item.cor_resultado }}>
                        {formatCurrency(item.valor)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-700">
                      <p className="text-sm text-zinc-400">Variação mensal</p>
                      <div className="flex items-center gap-2">
                        {variation.isPositive ? (
                          <ArrowUp className="text-green-400" size={16} />
                        ) : (
                          <ArrowDown className="text-red-400" size={16} />
                        )}
                        <span className={variation.isPositive ? "text-green-400" : "text-red-400"}>
                          {variation.percentage}%
                        </span>
                      </div>
                    </div>
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
              <Circle className="text-zinc-400" size={32} style={{ color: mainChart.cor_resultado }} />
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
            const variation = item ? calculateVariation(item.valor, item.valorAnterior) : { percentage: 0, isPositive: true };

            return (
              <div key={index} className="bg-zinc-800 rounded-xl p-6 flex flex-col justify-between min-h-[240px]">
                {item ? (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-zinc-300">{item.titulo_personalizado}</h3>
                        <div className="p-2 bg-zinc-700 rounded-lg">
                          <Circle size={20} className="text-zinc-400" style={{ color: item.cor_resultado }} />
                        </div>
                      </div>
                      <p className="text-2xl font-bold" style={{ color: item.cor_resultado }}>
                        {formatCurrency(item.valor)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-700">
                      <p className="text-sm text-zinc-400">Variação mensal</p>
                      <div className="flex items-center gap-2">
                        {variation.isPositive ? (
                          <ArrowUp className="text-green-400" size={16} />
                        ) : (
                          <ArrowDown className="text-red-400" size={16} />
                        )}
                        <span className={variation.isPositive ? "text-green-400" : "text-red-400"}>
                          {variation.percentage}%
                        </span>
                      </div>
                    </div>
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

  if (!currentUser) {
    return (
      <div className="max-w-[1600px] mx-auto py-8">
        <div className="bg-zinc-900 rounded-xl p-8 text-center">
          <p className="text-zinc-400">Carregando dados do usuário...</p>
        </div>
      </div>
    );
  }

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
                className="px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100 appearance-none"
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
              className="px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100 appearance-none"
            >
              {Array.from({ length: 5 }, (_, i) => selectedYear - 2 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100 appearance-none"
            >
              {MONTHS.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 flex items-center gap-2">
            <p className="text-red-400">{error}</p>
          </div>
        ) : loading ? (
          <div className="text-center py-8">
            <p className="text-zinc-400">Carregando dados...</p>
          </div>
        ) : !selectedCompanyId ? (
          <div className="text-center py-8">
            <p className="text-zinc-400">Selecione uma empresa para visualizar o dashboard</p>
          </div>
        ) : (
          renderCards()
        )}
      </div>
    </div>
  );
};