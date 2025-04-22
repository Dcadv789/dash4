/*
  # Dashboard Visualization Configuration

  1. New Table
    - dashboard_visual_config
      - Configuration for dashboard items per company
      - Order control for display
      - Support for multiple reference types
      - Active status tracking

  2. Security
    - RLS enabled
    - Policies for authenticated users
*/

-- Create enum for item types
CREATE TYPE dashboard_item_type AS ENUM (
  'categoria',
  'indicador', 
  'conta_dre',
  'custom_sum'
);

-- Create dashboard config table
CREATE TABLE dashboard_visual_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id text REFERENCES companies(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  titulo_personalizado text,
  tipo dashboard_item_type NOT NULL,
  referencias_ids uuid[] NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Ensure unique order per company
  UNIQUE(empresa_id, ordem)
);

-- Trigger for updated_at
CREATE TRIGGER update_dashboard_visual_config_updated_at
  BEFORE UPDATE ON dashboard_visual_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE dashboard_visual_config ENABLE ROW LEVEL SECURITY;

-- Security policies
CREATE POLICY "Authenticated users can view dashboard config"
  ON dashboard_visual_config
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage dashboard config"
  ON dashboard_visual_config
  FOR ALL
  TO authenticated
  USING (true);

-- Indexes
CREATE INDEX idx_dashboard_visual_config_empresa ON dashboard_visual_config(empresa_id);
CREATE INDEX idx_dashboard_visual_config_ordem ON dashboard_visual_config(ordem);
CREATE INDEX idx_dashboard_visual_config_tipo ON dashboard_visual_config(tipo);