-- =======================================================
-- SCRIPT: FIX EMPRESAS INACTIVAS
-- =======================================================
-- Agrega la columna 'activo' a las empresas para que el dashboard las muestre en verde.

BEGIN;

-- 1. AGREGAR COLUMNA ACTIVO SI NO EXISTE
DO $$
BEGIN
    -- Empresas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'org_companies' AND column_name = 'activo') THEN
        ALTER TABLE org_companies ADD COLUMN activo boolean DEFAULT true;
    END IF;
    
    -- Unidades (Por si acaso se usa igual)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'org_units' AND column_name = 'activo') THEN
        ALTER TABLE org_units ADD COLUMN activo boolean DEFAULT true;
    END IF;
END $$;

-- 2. ASEGURAR QUE LOS DATOS EXISTENTES SEAN ACTIVOS
UPDATE org_companies SET activo = true WHERE activo IS NULL;
UPDATE org_units SET activo = true WHERE activo IS NULL;

-- 3. RECARGAR CACHÉ
NOTIFY pgrst, 'reload config';

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Columna activo agregada y seteada a TRUE en empresas.';
END $$;
