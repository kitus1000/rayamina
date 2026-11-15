-- SCRIPT DE MIGRACIÓN: Actualización de Reportes Diarios
-- Ejecuta esto en el SQL Editor de Supabase para aplicar los cambios de esquema del Reporte Diario.

BEGIN;

-- 1. Eliminar la ubicación global del reporte (ahora es por actividad)
ALTER TABLE ops_daily_reports DROP COLUMN IF EXISTS location_id;

-- 2. Permitir que el supervisor sea opcional (evita el error de guardado 0000)
ALTER TABLE ops_daily_reports ALTER COLUMN supervisor_id DROP NOT NULL;

-- 3. Añadir la ubicación específica a cada actividad individual referenciando la tabla correcta (mine_locations)
ALTER TABLE ops_report_items ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES mine_locations(id);

COMMIT;
