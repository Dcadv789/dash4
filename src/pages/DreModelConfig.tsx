import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AccountList } from '../components/dre/AccountList';
import { AccountModal } from '../components/dre/modals/AccountModal';
import { SecondaryAccountModal } from '../components/dre/modals/SecondaryAccountModal';
import { ComponentModal } from '../components/dre/modals/ComponentModal';
import { DreConta, DreContaSecundaria, DreComponente } from '../types/dre';
import { Reference } from '../types/dashboard';

export const DreModelConfig = () => {
  const [contas, setContas] = useState<DreConta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [categorias, setCategorias] = useState<Reference[]>([]);
  const [indicadores, setIndicadores] = useState<Reference[]>([]);

  // Modais
  const [showModal, setShowModal] = useState(false);
  const [showSecundariaModal, setShowSecundariaModal] = useState(false);
  const [showComponenteModal, setShowComponenteModal] = useState(false);

  // Estados de edição
  const [editingConta, setEditingConta] = useState<DreConta | null>(null);
  const [editingContaSecundaria, setEditingContaSecundaria] = useState<DreContaSecundaria | null>(null);
  const [editingComponente, setEditingComponente] = useState<DreComponente | null>(null);
  const [selectedContaId, setSelectedContaId] = useState<string | null>(null);
  const [selectedContaSecundariaId, setSelectedContaSecundariaId] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'simples' as DreConta['tipo'],
    simbolo: '+' as '+' | '-' | '=' | null,
    ordem_padrao: 0,
    visivel: true
  });

  const [secundariaData, setSecundariaData] = useState({
    nome: '',
    ordem: 0,
    empresa_ids: [] as string[]
  });

  const [componenteData, setComponenteData] = useState({
    referencia_tipo: 'categoria' as 'categoria' | 'indicador',
    referencia_id: '',
    peso: 1,
    ordem: 0,
    nome_exibicao: ''
  });

  useEffect(() => {
    fetchContas();
    fetchCategorias();
    fetchIndicadores();
  }, []);

  const fetchContas = async () => {
    try {
      const { data: mainAccounts, error: mainError } = await supabase
        .from('contas_dre_modelo')
        .select(`
          *,
          contas_secundarias:dre_contas_secundarias(
            id,
            nome,
            ordem,
            componentes:contas_dre_componentes(
              id,
              referencia_tipo,
              referencia_id,
              peso,
              ordem,
              nome_exibicao,
              categoria:categories!contas_dre_componentes_referencia_id_fkey(name, code),
              indicador:indicators(name, code)
            )
          ),
          componentes:contas_dre_componentes(
            id,
            referencia_tipo,
            referencia_id,
            peso,
            ordem,
            nome_exibicao,
            categoria:categories!contas_dre_componentes_referencia_id_fkey(name, code),
            indicador:indicators(name, code)
          )
        `)
        .order('ordem_padrao');

      if (mainError) throw mainError;
      setContas(mainAccounts || []);
    } catch (err) {
      console.error('Erro ao carregar contas:', err);
      setError('Erro ao carregar contas do DRE');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, code')
        .order('code');

      if (error) throw error;
      setCategorias(data.map(cat => ({ id: cat.id, nome: cat.name, codigo: cat.code })));
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
    }
  };

  const fetchIndicadores = async () => {
    try {
      const { data, error } = await supabase
        .from('indicators')
        .select('id, name, code')
        .order('code');

      if (error) throw error;
      setIndicadores(data.map(ind => ({ id: ind.id, nome: ind.name, codigo: ind.code })));
    } catch (err) {
      console.error('Erro ao carregar indicadores:', err);
    }
  };

  const handleSaveConta = async () => {
    try {
      const { error } = await supabase
        .from('contas_dre_modelo')
        .upsert([{
          id: editingConta?.id,
          ...formData
        }]);

      if (error) throw error;

      await fetchContas();
      setShowModal(false);
      setEditingConta(null);
      setFormData({
        nome: '',
        tipo: 'simples',
        simbolo: '+',
        ordem_padrao: 0,
        visivel: true
      });
    } catch (err) {
      console.error('Erro ao salvar conta:', err);
      setError('Erro ao salvar conta');
    }
  };

  const handleSaveContaSecundaria = async () => {
    if (!selectedContaId) return;

    try {
      const contaSecundariaPayload = {
        nome: secundariaData.nome,
        dre_conta_principal_id: selectedContaId,
        ordem: secundariaData.ordem,
        empresa_ids: secundariaData.empresa_ids
      };

      if (editingContaSecundaria) {
        const { error } = await supabase
          .from('dre_contas_secundarias')
          .update(contaSecundariaPayload)
          .eq('id',editingContaSecundaria.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('dre_contas_secundarias')
          .insert([contaSecundariaPayload]);

        if (error) throw error;
      }

      await fetchContas();
      setShowSecundariaModal(false);
      setEditingContaSecundaria(null);
      setSecundariaData({
        nome: '',
        ordem: 0,
        empresa_ids: []
      });
    } catch (err) {
      console.error('Erro ao salvar conta secundária:', err);
      setError('Erro ao salvar conta secundária');
    }
  };

  const handleSaveComponente = async () => {
    if (!selectedContaId) return;

    try {
      const componentePayload = {
        conta_dre_modelo_id: selectedContaId,
        dre_conta_secundaria_id: selectedContaSecundariaId,
        referencia_tipo: componenteData.referencia_tipo,
        referencia_id: componenteData.referencia_id,
        peso: componenteData.peso,
        ordem: componenteData.ordem,
        nome_exibicao: componenteData.nome_exibicao || null
      };

      if (editingComponente) {
        const { error } = await supabase
          .from('contas_dre_componentes')
          .update(componentePayload)
          .eq('id', editingComponente.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('contas_dre_componentes')
          .insert([componentePayload]);

        if (error) throw error;
      }

      await fetchContas();
      setShowComponenteModal(false);
      setEditingComponente(null);
      setComponenteData({
        referencia_tipo: 'categoria',
        referencia_id: '',
        peso: 1,
        ordem: 0,
        nome_exibicao: ''
      });
    } catch (err) {
      console.error('Erro ao salvar componente:', err);
      setError('Erro ao salvar componente');
    }
  };

  const handleDeleteConta = async (contaId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta conta?')) return;

    try {
      const { error } = await supabase
        .from('contas_dre_modelo')
        .delete()
        .eq('id', contaId);

      if (error) throw error;

      await fetchContas();
    } catch (err) {
      console.error('Erro ao excluir conta:', err);
      setError('Erro ao excluir conta');
    }
  };

  const handleDeleteContaSecundaria = async (contaSecundariaId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta conta secundária?')) return;

    try {
      const { error } = await supabase
        .from('dre_contas_secundarias')
        .delete()
        .eq('id', contaSecundariaId);

      if (error) throw error;

      await fetchContas();
    } catch (err) {
      console.error('Erro ao excluir conta secundária:', err);
      setError('Erro ao excluir conta secundária');
    }
  };

  const handleDeleteComponente = async (componenteId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este componente?')) return;

    try {
      const { error } = await supabase
        .from('contas_dre_componentes')
        .delete()
        .eq('id', componenteId);

      if (error) throw error;

      await fetchContas();
    } catch (err) {
      console.error('Erro ao excluir componente:', err);
      setError('Erro ao excluir componente');
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <div className="bg-zinc-900 rounded-xl p-8 text-center">
          <p className="text-zinc-400">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Configuração do DRE</h1>
          <p className="text-zinc-400 mt-1">Configure as contas e componentes do DRE</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white flex items-center gap-2"
        >
          <Plus size={20} />
          Nova Conta Principal
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <div className="bg-zinc-900 rounded-xl p-6">
        {contas.map(conta => (
          <AccountList
            key={conta.id}
            conta={conta}
            expandedAccounts={expandedAccounts}
            onToggleExpand={(accountId) => {
              setExpandedAccounts(prev => {
                const next = new Set(prev);
                if (next.has(accountId)) {
                  next.delete(accountId);
                } else {
                  next.add(accountId);
                }
                return next;
              });
            }}
            onAddSecondaryAccount={(accountId) => {
              setSelectedContaId(accountId);
              setShowSecundariaModal(true);
            }}
            onAddComponent={(accountId, secondaryId) => {
              setSelectedContaId(accountId);
              setSelectedContaSecundariaId(secondaryId);
              setShowComponenteModal(true);
            }}
            onEditAccount={(account) => {
              setEditingConta(account);
              setFormData({
                nome: account.nome,
                tipo: account.tipo,
                simbolo: account.simbolo,
                ordem_padrao: account.ordem_padrao,
                visivel: account.visivel
              });
              setShowModal(true);
            }}
            onDeleteAccount={handleDeleteConta}
          />
        ))}
      </div>

      <AccountModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingConta(null);
          setFormData({
            nome: '',
            tipo: 'simples',
            simbolo: '+',
            ordem_padrao: 0,
            visivel: true
          });
        }}
        formData={formData}
        setFormData={setFormData}
        editingConta={editingConta}
        onSave={handleSaveConta}
      />

      <SecondaryAccountModal
        isOpen={showSecundariaModal}
        onClose={() => {
          setShowSecundariaModal(false);
          setEditingContaSecundaria(null);
          setSecundariaData({
            nome: '',
            ordem: 0,
            empresa_ids: []
          });
        }}
        formData={secundariaData}
        setFormData={setSecundariaData}
        editingContaSecundaria={editingContaSecundaria}
        onSave={handleSaveContaSecundaria}
      />

      <ComponentModal
        isOpen={showComponenteModal}
        onClose={() => {
          setShowComponenteModal(false);
          setEditingComponente(null);
          setComponenteData({
            referencia_tipo: 'categoria',
            referencia_id: '',
            peso: 1,
            ordem: 0,
            nome_exibicao: ''
          });
        }}
        formData={componenteData}
        setFormData={setComponenteData}
        editingComponente={editingComponente}
        onSave={handleSaveComponente}
        categorias={categorias}
        indicadores={indicadores}
      />
    </div>
  );
};