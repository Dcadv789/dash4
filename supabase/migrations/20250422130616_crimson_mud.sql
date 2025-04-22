/*
  # Adicionar campo de cor ao dashboard

  1. Alterações
    - Adicionar coluna cor_resultado na tabela dashboard_visual_config
    - Definir valor padrão como verde
*/

ALTER TABLE dashboard_visual_config
ADD COLUMN cor_resultado text DEFAULT '#44FF44';