import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LineChart, BarChart, Calendar } from 'lucide-react';

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
  name: string;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const Dashboard = () => {
  const [companies, setCompanies] = useState<{ id: string; trading_name: string; }[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
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
      console.error('Error fetching companies:', err);
      setError('Erro ao carregar empresas');
    }
  };

  const fetchDashboardItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('dashboard_visual_config')
        .select('*')
        .eq('empresa_id', selectedCompanyId)
        .eq('is_active', true)
        .order('ordem');

      if (error) throw error;
      setItems(data || []);
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

  const firstName = currentUser?.name?.split(' ')[0] || '';

  return (
    <div className="max-w-[1600px] mx-auto py-8">
      <div className="bg-zinc-900 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl text-zinc-100">
            Olá, {firstName}
          </h2>
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

        {/* Cards superiores */}
        <div className="grid grid-cols-4 gap-6 mb-6">
          {[1, 2, 3, 4].map((_, index) => (
            <div key={index} className="bg-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-zinc-300">Card {index + 1}</h3>
                <div className="p-2 bg-zinc-700 rounded-lg">
                  <LineChart size={20} className="text-zinc-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-zinc-100">{formatCurrency(0)}</p>
              <p className="text-sm text-zinc-500 mt-2">Sem dados</p>
            </div>
          ))}
        </div>

        {/* Gráfico principal */}
        <div className="bg-zinc-800 rounded-xl p-6 mb-6 h-[400px] flex items-center justify-center">
          <p className="text-zinc-400">Gráfico será implementado aqui</p>
        </div>

        {/* Cards inferiores */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-zinc-300">Análise 1</h3>
              <div className="p-2 bg-zinc-700 rounded-lg">
                <BarChart size={20} className="text-zinc-400" />
              </div>
            </div>
            <p className="text-zinc-400">Dados serão carregados aqui</p>
          </div>
          <div className="bg-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-zinc-300">Análise 2</h3>
              <div className="p-2 bg-zinc-700 rounded-lg">
                <Calendar size={20} className="text-zinc-400" />
              </div>
            </div>
            <p className="text-zinc-400">Dados serão carregados aqui</p>
          </div>
        </div>
      </div>
    </div>
  );
};