/*
  # Atualizar Dashboard Visual Config

  1. Alterações
    - Adicionar tipo 'grafico' ao enum dashboard_item_type
    - Adicionar campo dados_vinculados para armazenar referências do gráfico
    - Adicionar campo tipo_grafico para configuração visual
*/

-- Criar novo tipo com opção adicional
CREATE TYPE dashboard_item_type_new AS ENUM (
  'categoria',
  'indicador', 
  'conta_dre',
  'custom_sum',
  'grafico'
);

-- Alterar a tabela para usar o novo tipo
ALTER TABLE dashboard_visual_config 
  ALTER COLUMN tipo TYPE dashboard_item_type_new 
  USING (tipo::text::dashboard_item_type_new);

-- Remover o tipo antigo
DROP TYPE dashboard_item_type;

-- Renomear o novo tipo
ALTER TYPE dashboard_item_type_new RENAME TO dashboard_item_type;

-- Adicionar campos para gráficos
ALTER TABLE dashboard_visual_config
ADD COLUMN tipo_grafico text,
ADD COLUMN dados_vinculados jsonb;