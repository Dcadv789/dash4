export interface DreConta {
  id: string;
  nome: string;
  tipo: 'simples' | 'composta' | 'formula' | 'indicador' | 'soma_indicadores';
  simbolo: '+' | '-' | '=' | null;
  ordem_padrao: number;
  visivel: boolean;
  contas_secundarias?: DreContaSecundaria[];
  componentes?: DreComponente[];
}

export interface DreContaSecundaria {
  id: string;
  nome: string;
  ordem: number;
  componentes?: DreComponente[];
}

export interface DreComponente {
  id: string;
  referencia_tipo: 'categoria' | 'indicador';
  referencia_id: string;
  peso: number;
  ordem: number;
  nome_exibicao?: string;
  categoria?: {
    name: string;
    code: string;
  };
  indicador?: {
    name: string;
    code: string;
  };
}