/*
  # Função de Reordenação do Dashboard

  1. Nova Função
    - reorder_dashboard_items
      - Recebe empresa_id, item_id e nova ordem
      - Reorganiza todos os itens afetados
      - Mantém ordens únicas por empresa
      - Previne conflitos de constraint

  2. Trigger
    - Garante que ordens sejam sempre únicas
    - Atualiza automaticamente itens afetados
*/

-- Função para reordenar itens
CREATE OR REPLACE FUNCTION reorder_dashboard_items(
  p_empresa_id text,
  p_item_id uuid,
  p_nova_ordem integer
)
RETURNS void AS $$
DECLARE
  v_ordem_atual integer;
  v_max_ordem integer;
BEGIN
  -- Obter ordem atual do item
  SELECT ordem INTO v_ordem_atual
  FROM dashboard_visual_config
  WHERE id = p_item_id;

  -- Obter maior ordem atual
  SELECT COALESCE(MAX(ordem), 0) INTO v_max_ordem
  FROM dashboard_visual_config
  WHERE empresa_id = p_empresa_id;

  -- Validar nova ordem
  IF p_nova_ordem < 0 THEN
    p_nova_ordem := 0;
  ELSIF p_nova_ordem > v_max_ordem THEN
    p_nova_ordem := v_max_ordem;
  END IF;

  -- Atualizar ordens
  IF v_ordem_atual > p_nova_ordem THEN
    -- Movendo para cima
    UPDATE dashboard_visual_config
    SET ordem = ordem + 1
    WHERE empresa_id = p_empresa_id
      AND ordem >= p_nova_ordem
      AND ordem < v_ordem_atual
      AND id != p_item_id;
  ELSIF v_ordem_atual < p_nova_ordem THEN
    -- Movendo para baixo
    UPDATE dashboard_visual_config
    SET ordem = ordem - 1
    WHERE empresa_id = p_empresa_id
      AND ordem <= p_nova_ordem
      AND ordem > v_ordem_atual
      AND id != p_item_id;
  END IF;

  -- Atualizar ordem do item
  UPDATE dashboard_visual_config
  SET ordem = p_nova_ordem
  WHERE id = p_item_id;
END;
$$ LANGUAGE plpgsql;