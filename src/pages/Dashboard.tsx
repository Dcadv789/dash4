import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Circle, ArrowUp, ArrowDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

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

interface DashboardItem {
  id: string;
  titulo_personalizado: string;
  tipo: 'categoria' | 'indicador' | 'conta_dre' | 'custom_sum' | 'grafico' | 'top_lista';
  referencias_ids: string[];
  ordem: number;
  cor_resultado: string;
  valor: number;
  tipo_grafico?: 'linha' | 'barra' | 'pizza';
  dados_vinculados?: {
    id: string;
    tipo: 'categoria' | 'indicador' | 'conta_dre';
    nome: string;
  }[];
  top_limit?: number;
  monthlyValues?: { [key: string]: number };
}

interface ChartData {
  name: string;
  [key: string]: string | number;
}

interface Indicator {
  id: string;
  type: 'manual' | 'calculated';
  calculation_type?: 'category' | 'indicator';
  operation?: 'sum' | 'subtract' | 'multiply' | 'divide';
  source_ids: string[];
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

  const calculateIndicatorValue = async (
    indicatorId: string,
    month: string,
    year: number,
    processedIndicators: Set<string> = new Set()
  ): Promise<number> => {
    if (processedIndicators.has(indicatorId)) {
      console.warn('Circular reference detected in indicator:', indicatorId);
      return 0;
    }
    processedIndicators.add(indicatorId);

    try {
      const { data: indicators, error: indicatorError } = await supabase
        .from('indicators')
        .select('*')
        .eq('id', indicatorId);

      if (indicatorError) {
        console.error('Error fetching indicator:', indicatorError);
        return 0;
      }

      if (!indicators || indicators.length === 0) {
        console.warn(`No indicator found with id: ${indicatorId}`);
        return 0;
      }

      const indicator = indicators[0];
      if (indicators.length > 1) {
        console.warn(`Multiple indicators found with id: ${indicatorId}, using first one`);
      }

      if (indicator.type === 'manual') {
        const { data: values } = await supabase
          .from('dados_brutos')
          .select('valor')
          .eq('empresa_id', selectedCompanyId)
          .eq('ano', year)
          .eq('mes', month)
          .eq('indicador_id', indicatorId);

        return values?.[0]?.valor || 0;
      }

      let result = 0;
      const sourceIds = indicator.source_ids || [];

      for (const sourceId of sourceIds) {
        let sourceValue = 0;

        if (indicator.calculation_type === 'category') {
          const { data: values } = await supabase
            .from('dados_brutos')
            .select('valor, categories!inner(type)')
            .eq('empresa_id', selectedCompanyId)
            .eq('ano', year)
            .eq('mes', month)
            .eq('categoria_id', sourceId);

          if (values && values.length > 0) {
            sourceValue = values[0].categories.type === 'expense' ? -values[0].valor : values[0].valor;
          }
        } else {
          sourceValue = await calculateIndicatorValue(sourceId, month, year, processedIndicators);
        }

        if (result === 0) {
          result = sourceValue;
        } else {
          switch (indicator.operation) {
            case 'sum':
              result += sourceValue;
              break;
            case 'subtract':
              result -= sourceValue;
              break;
            case 'multiply':
              result *= sourceValue;
              break;
            case 'divide':
              result = sourceValue !== 0 ? result / sourceValue : 0;
              break;
          }
        }
      }

      return result;
    } catch (err) {
      console.error('Error calculating indicator value:', err);
      return 0;
    }
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
        if (item.tipo === 'grafico' && item.ordem === 4) {
          const chartData: { [key: string]: { [key: string]: number } } = {};

          await Promise.all(item.dados_vinculados?.map(async (vinculado) => {
            await Promise.all(months.map(async ({ month, year }) => {
              if (vinculado.tipo === 'categoria') {
                const { data } = await supabase
                  .from('dados_brutos')
                  .select('valor, categories!inner(type)')
                  .eq('empresa_id', selectedCompanyId)
                  .eq('ano', year)
                  .eq('mes', month)
                  .eq('categoria_id', vinculado.id);

                const value = data?.reduce((sum, d) => {
                  return sum + (d.categories.type === 'expense' ? -d.valor : d.valor);
                }, 0) || 0;

                if (!chartData[`${month}-${year}`]) {
                  chartData[`${month}-${year}`] = {};
                }
                chartData[`${month}-${year}`][vinculado.nome] = value;
              } else {
                const value = await calculateIndicatorValue(vinculado.id, month, year);
                
                if (!chartData[`${month}-${year}`]) {
                  chartData[`${month}-${year}`] = {};
                }
                chartData[`${month}-${year}`][vinculado.nome] = value;
              }
            }));
          }) || []);

          return {
            ...item,
            chartData
          };
        }

        let currentValue = 0;
        let previousValue = 0;

        if (item.tipo === 'categoria') {
          const { data: currentData } = await supabase
            .from('dados_brutos')
            .select('valor, categories!inner(type)')
            .eq('empresa_id', selectedCompanyId)
            .eq('ano', selectedYear)
            .eq('mes', selectedMonth)
            .in('categoria_id', item.referencias_ids);

          currentValue = currentData?.reduce((sum, d) => {
            return sum + (d.categories.type === 'expense' ? -d.valor : d.valor);
          }, 0) || 0;

          const prevMonth = months[1];
          const { data: previousData } = await supabase
            .from('dados_brutos')
            .select('valor, categories!inner(type)')
            .eq('empresa_id', selectedCompanyId)
            .eq('ano', prevMonth.year)
            .eq('mes', prevMonth.month)
            .in('categoria_id', item.referencias_ids);

          previousValue = previousData?.reduce((sum, d) => {
            return sum + (d.categories.type === 'expense' ? -d.valor : d.valor);
          }, 0) || 0;
        } else if (item.tipo === 'indicador') {
          currentValue = await Promise.all(
            item.referencias_ids.map(id => 
              calculateIndicatorValue(id, selectedMonth, selectedYear)
            )
          ).then(values => values.reduce((sum, value) => sum + value, 0));

          const prevMonth = months[1];
          previousValue = await Promise.all(
            item.referencias_ids.map(id => 
              calculateIndicatorValue(id, prevMonth.month, prevMonth.year)
            )
          ).then(values => values.reduce((sum, value) => sum + value, 0));
        }

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

  const renderChart = (item: DashboardItem) => {
    if (!item.chartData) return null;

    const months = getLast12Months();
    const data: ChartData[] = months.map(({ month, year }) => {
      const monthKey = `${month}-${year}`;
      return {
        name: `${MONTH_ABBREVIATIONS[month]}/${year.toString().slice(2)}`,
        ...item.chartData[monthKey]
      };
    });

    const lines = item.dados_vinculados?.map(vinculado => ({
      name: vinculado.nome,
      color: item.cor_resultado
    }));

    if (item.tipo_grafico === 'barra') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="name" 
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
            />
            <YAxis 
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '0.5rem'
              }}
              labelStyle={{ color: '#9CA3AF' }}
              formatter={(value: number) => formatCurrency(value)}
            />
            {lines?.map((line) => (
              <Bar
                key={line.name}
                dataKey={line.name}
                fill={line.color}
                opacity={0.8}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="name" 
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF' }}
          />
          <YAxis 
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF' }}
            tickFormatter={(value) => formatCurrency(value)}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '0.5rem'
            }}
            labelStyle={{ color: '#9CA3AF' }}
            formatter={(value: number) => formatCurrency(value)}
          />
          {lines?.map((line) => (
            <Line
              key={line.name}
              type="monotone"
              dataKey={line.name}
              stroke={line.color}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderTopList = (item: DashboardItem, months: { month: string; year: number }[]) => {
    const monthlyData: { [key: string]: { name: string; value: number }[] } = {};
    
    months.forEach(({ month, year }) => {
      const monthKey = `${month}-${year}`;
      const values = item.dados_vinculados?.map(vinculado => ({
        name: vinculado.nome,
        value: vinculado.monthlyValues?.[monthKey] || 0
      })) || [];
      
      monthlyData[monthKey] = values
        .sort((a, b) => b.value - a.value)
        .slice(0, item.top_limit || 5);
    });

    return (
      <div className="space-y-6">
        {months.map(({ month, year }) => {
          const monthKey = `${month}-${year}`;
          const values = monthlyData[monthKey];

          return (
            <div key={monthKey} className="bg-zinc-800/50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-zinc-400 mb-3">
                {month}/{year}
              </h4>
              <div className="space-y-2">
                {values.map((item, index) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-2 bg-zinc-800/30 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 text-sm">#{index + 1}</span>
                      <span className="text-zinc-200">{item.name}</span>
                    </div>
                    <span className="text-zinc-300 font-mono">
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderCards = () => {
    const topCards = items.filter(item => item.ordem <= 3);
    const mainChart = items.find(item => item.ordem === 4);
    const bottomCards = items.filter(item => item.ordem > 4);

    return (
      <div className="space-y-6">
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

        <div className="bg-zinc-800 rounded-xl p-6">
          {mainChart ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-zinc-300">{mainChart.titulo_personalizado}</h3>
              </div>
              {mainChart.tipo === 'grafico' ? (
                renderChart(mainChart)
              ) : mainChart.tipo === 'top_lista' ? (
                renderTopList(mainChart, getLast12Months())
              ) : (
                <div className="flex items-center justify-center h-[400px]">
                  <p className="text-zinc-500">Tipo de visualização não suportado</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[400px]">
              <p className="text-zinc-500">Aguardando configuração...</p>
            </div>
          )}
        </div>

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