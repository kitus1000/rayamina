-- SCRIPT HOTFIX: Agregar columna faltante mine_id
-- Ejecutar si aparece error "Could not find the 'mine_id' column"

BEGIN;

-- 1. Agregar columna si falta
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_employees' AND column_name = 'mine_id') THEN
        ALTER TABLE rh_employees ADD COLUMN mine_id uuid REFERENCES mine_sites(id);
    END IF;
END $$;

-- 2. Recargar caché de esquema (Esencial para PostgREST)
NOTIFY pgrst, 'reload config';

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Columna mine_id asegurada y caché recargada.';
END $$;
