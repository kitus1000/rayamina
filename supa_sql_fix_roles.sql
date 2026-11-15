-- SCRIPT HOTFIX: Agregar columna faltante rol_operativo_default_id
-- Ejecutar si aparece error "Could not find the 'rol_operativo_default_id' column"

BEGIN;

-- 1. Agregar columna si falta
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_employees' AND column_name = 'rol_operativo_default_id') THEN
        ALTER TABLE rh_employees ADD COLUMN rol_operativo_default_id uuid REFERENCES cat_roles_operativos(id);
    END IF;
END $$;

-- 2. Recargar caché de esquema (Esencial para PostgREST)
NOTIFY pgrst, 'reload config';

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Columna rol_operativo_default_id asegurada y caché recargada.';
END $$;
