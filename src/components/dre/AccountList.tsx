import React from 'react';
import { ChevronDown, ChevronRight, Plus, Minus, Equal } from 'lucide-react';
import { DreConta } from '../../types/dre';
import { SecondaryAccountList } from './SecondaryAccountList';
import { ComponentList } from './ComponentList';

interface AccountListProps {
  conta: DreConta;
  expandedAccounts: Set<string>;
  onToggleExpand: (accountId: string) => void;
  onAddSecondaryAccount: (accountId: string) => void;
  onAddComponent: (accountId: string, secondaryId: string | null) => void;
  onEditAccount: (account: DreConta) => void;
  onDeleteAccount: (accountId: string) => void;
}

export const AccountList: React.FC<AccountListProps> = ({
  conta,
  expandedAccounts,
  onToggleExpand,
  onAddSecondaryAccount,
  onAddComponent,
  onEditAccount,
  onDeleteAccount
}) => {
  const getSymbolIcon = (simbolo: string | null) => {
    switch (simbolo) {
      case '+': return <Plus size={16} className="text-green-400" />;
      case '-': return <Minus size={16} className="text-red-400" />;
      default: return <Equal size={16} className="text-blue-400" />;
    }
  };

  return (
    <div key={conta.id} className="mb-4">
      <div className="flex items-center justify-between bg-zinc-800 p-4 rounded-lg">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleExpand(conta.id)}
            className="p-1 hover:bg-zinc-700 rounded-lg"
          >
            {expandedAccounts.has(conta.id) ? (
              <ChevronDown size={20} className="text-zinc-400" />
            ) : (
              <ChevronRight size={20} className="text-zinc-400" />
            )}
          </button>
          <div className="flex items-center gap-2">
            {getSymbolIcon(conta.simbolo)}
            <span className="text-zinc-100 font-medium">{conta.nome}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAddSecondaryAccount(conta.id)}
            className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-zinc-300 text-sm"
          >
            Adicionar Conta Secundária
          </button>
          <button
            onClick={() => onAddComponent(conta.id, null)}
            className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-zinc-300 text-sm"
          >
            Adicionar Componente
          </button>
          <button
            onClick={() => onEditAccount(conta)}
            className="p-1 hover:bg-zinc-700 rounded-lg text-zinc-400"
          >
            <PencilIcon size={16} />
          </button>
          <button
            onClick={() => onDeleteAccount(conta.id)}
            className="p-1 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-red-400"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {expandedAccounts.has(conta.id) && (
        <div className="ml-8 mt-2 space-y-2">
          <ComponentList 
            components={conta.componentes?.filter(comp => !comp.dre_conta_secundaria_id) || []}
            onEdit={(component) => onEditComponent(component, conta.id)}
            onDelete={(componentId) => onDeleteComponent(componentId)}
          />

          <SecondaryAccountList
            accounts={conta.contas_secundarias || []}
            mainAccountId={conta.id}
            onAddComponent={onAddComponent}
            onEditSecondaryAccount={onEditSecondaryAccount}
            onDeleteSecondaryAccount={onDeleteSecondaryAccount}
            onEditComponent={onEditComponent}
            onDeleteComponent={onDeleteComponent}
          />
        </div>
      )}
    </div>
  );
};