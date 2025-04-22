export interface Reference {
  id: string;
  nome: string;
  codigo?: string;
}

export interface DashboardItem {
  id: string;
  ordem: number;
  titulo_personalizado: string;
  tipo: string;
  referencias_ids: string[];
  is_active: boolean;
  cor_resultado: string;
  tipo_grafico?: string;
  dados_vinculados?: {
    id: string;
    tipo: string;
    nome: string;
  }[];
  top_limit?: number;
}