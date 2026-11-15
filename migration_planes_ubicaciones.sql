-- ==================================================================================
-- MIGRACIÓN 2: PLANEACIÓN SEMANAL UBICACIONES
-- ==================================================================================

BEGIN;

-- 1. Agregar columnas de seguimiento granular a cada Renglón del Plan
ALTER TABLE ops_plan_items ADD COLUMN IF NOT EXISTS mine_site_id UUID REFERENCES mine_sites(id);
ALTER TABLE ops_plan_items ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES mine_locations(id);

-- 2. Corregir restricción de unicidad para permitir la misma actividad en diferentes frentes
ALTER TABLE ops_plan_items DROP CONSTRAINT IF EXISTS ops_plan_items_plan_id_producto_id_key;

-- Ahora un "Item" del plan es único si comparte Plan, Producto y su Ubicación exacta.
-- Usaremos COALESCE en un índice único para soportar casos donde la ubicación sea nula si es general
DROP INDEX IF EXISTS idx_ops_plan_unique_item;
CREATE UNIQUE INDEX idx_ops_plan_unique_item ON ops_plan_items (
    plan_id, 
    producto_id, 
    COALESCE(location_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- 3. Notificar a PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;

DO $$ 
BEGIN 
  RAISE NOTICE 'Update de Ubicaciones en la Planeación Semanal ejecutado con éxito.'; 
END $$;
