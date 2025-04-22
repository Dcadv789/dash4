import React from 'react';
import { PencilIcon, Trash2 } from 'lucide-react';
import { ComponentList } from './ComponentList';
import { DreContaSecundaria } from '../../types/dre';

interface SecondaryAccountListProps {
  accounts: DreContaSecundaria[];
  mainAccountId: string;
  onAddComponent: (accountId: string, secondaryId: string) => void;
  onEditSecondaryAccount: (account: DreContaSecundaria) => void;
  onDeleteSecondaryAccount: (accountId: string) => void;
  onEditComponent: (component: any, accountId: string, secondaryId: string) => void;
  onDeleteComponent: (componentId: string) => void;
}

export const SecondaryAccountList: React.FC<SecondaryAccountListProps> = ({
  accounts,
  mainAccountId,
  onAddComponent,
  onEditSecondaryAccount,
  onDeleteSecondaryAccount,
  onEditComponent,
  onDeleteComponent
}) => {
  return (
    <>
      {accounts.map(contaSecundaria => (
        <div key={contaSecundaria.id} className="bg-zinc-800/50 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-200">{contaSecundaria.nome}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onAddComponent(mainAccountId, contaSecundaria.id)}
                className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-zinc-300 text-sm"
              >
                Adicionar Componente
              </button>
              <button
                onClick={() => onEditSecondaryAccount(contaSecundaria)}
                className="p-1 hover:bg-zinc-700 rounded-lg text-zinc-400"
              >
                <PencilIcon size={16} />
              </button>
              <button
                onClick={() => onDeleteSecondaryAccount(contaSecundaria.id)}
                className="p-1 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-red-400"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <ComponentList
            components={contaSecundaria.componentes || []}
            onEdit={(component) => onEditComponent(component, mainAccountId, contaSecundaria.id)}
            onDelete={onDeleteComponent}
          />
        </div>
      ))}
    </>
  );
};