/*
  # Add Top List Visualization Type

  1. Changes
    - Add 'top_lista' to dashboard_item_type enum
    - Add top_limit column to dashboard_visual_config table
    - Update existing data
*/

-- Create new type with additional option
CREATE TYPE dashboard_item_type_new AS ENUM (
  'categoria',
  'indicador', 
  'conta_dre',
  'custom_sum',
  'grafico',
  'top_lista'
);

-- Alter the table to use the new type
ALTER TABLE dashboard_visual_config 
  ALTER COLUMN tipo TYPE dashboard_item_type_new 
  USING (tipo::text::dashboard_item_type_new);

-- Remove old type
DROP TYPE dashboard_item_type;

-- Rename new type
ALTER TYPE dashboard_item_type_new RENAME TO dashboard_item_type;

-- Add top_limit column with default value
ALTER TABLE dashboard_visual_config
ADD COLUMN top_limit integer DEFAULT 5;