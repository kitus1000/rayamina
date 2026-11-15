-- ==================================================================================
-- FIX: REPARACIÓN FORZADA DE REPORTE DIARIO (SUPERVISORES Y UBICACIONES)
-- ==================================================================================
-- Por favor, ejecuta este script completo en tu Supabase SQL Editor.

BEGIN;

-- 1. Asegurar que 'ops_daily_reports' existe
CREATE TABLE IF NOT EXISTS ops_daily_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    turno_id UUID NOT NULL REFERENCES cat_turnos(id),
    cuadrilla_id UUID NOT NULL REFERENCES cat_cuadrillas(id),
    supervisor_id UUID REFERENCES rh_employees(id),
    mine_site_id UUID NOT NULL REFERENCES mine_sites(id),
    comentarios_supervisor TEXT,
    respuesta_jefe_mina TEXT,
    status TEXT DEFAULT 'BORRADOR' CHECK (status IN ('BORRADOR', 'EN_REVISION', 'APROBADO', 'CORRECCION_SOLICITADA')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Eliminar columnas viejas de ubicación si aún existen
ALTER TABLE ops_daily_reports DROP COLUMN IF EXISTS location_id;

-- 3. FORZAR LA ELIMINACIÓN DE RESTRICCIÓN NOT NULL (Para evitar el error null value)
-- Incluso si la tabla se acaba de crear, esto garantiza que la columna acepte valores nulos.
ALTER TABLE ops_daily_reports ALTER COLUMN supervisor_id DROP NOT NULL;

-- 4. Asegurar que las ubicaciones en los items existan
ALTER TABLE ops_report_items ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES mine_locations(id);

COMMIT;

-- 5. Confirmación en consola
DO $$ 
BEGIN 
  RAISE NOTICE '¡Éxito! supervisor_id ya permite valores nulos y location_id está configurado.'; 
END $$;
