-- =======================================================
-- SCRIPT: REPARACIÓN DE EMERGENCIA (DUMMY COLUMN TRICK)
-- =======================================================
-- Si el NOTIFY simple no funciona, a veces PostgREST necesita ver un cambio real
-- en la estructura de la tabla para "despertar" y recargar la caché.

BEGIN;

-- 1. Agregar una columna tonta (dummy)
ALTER TABLE rh_employees ADD COLUMN _force_cache_reload text;

-- 2. Notificar reload
NOTIFY pgrst, 'reload config';

-- 3. Borrar la columna tonta inmediatamente
ALTER TABLE rh_employees DROP COLUMN _force_cache_reload;

-- 4. Notificar reload de nuevo por si acaso
NOTIFY pgrst, 'reload config';

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Se aplicó el truco de columna dummy para forzar la recarga del caché.';
END $$;
