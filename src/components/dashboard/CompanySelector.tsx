import React from 'react';

interface Company {
  id: string;
  trading_name: string;
}

interface CompanySelectorProps {
  companies: Company[];
  selectedCompanyId: string;
  onCompanyChange: (id: string) => void;
}

export const CompanySelector: React.FC<CompanySelectorProps> = ({
  companies,
  selectedCompanyId,
  onCompanyChange
}) => {
  return (
    <div className="bg-zinc-900 rounded-xl p-8 mb-8">
      <div className="w-full md:w-96">
        <label className="block text-sm font-medium text-zinc-400 mb-2">
          Empresa
        </label>
        <select
          value={selectedCompanyId}
          onChange={(e) => onCompanyChange(e.target.value)}
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
  );
};