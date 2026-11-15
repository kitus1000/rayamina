-- =======================================================
-- SCRIPT: REPARACIÓN TOTAL DE PERMISOS Y CACHÉ (ZOMBIE FIX)
-- =======================================================

BEGIN;

-- 1. Asegurar uso del esquema public para todos los roles
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- 2. Permisos para rh_employees (La tabla problemática)
--    Le damos TODO a todos los roles para descartar problemas de permisos.
GRANT ALL ON TABLE rh_employees TO postgres;
GRANT ALL ON TABLE rh_employees TO service_role;
GRANT ALL ON TABLE rh_employees TO anon;
GRANT ALL ON TABLE rh_employees TO authenticated;

-- 3. Permisos para Secuencias (Vital para inserts)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 4. Asegurar permisos en catálogos relacionados (por si las dudas)
GRANT ALL ON TABLE cat_puestos TO anon, authenticated;
GRANT ALL ON TABLE org_units TO anon, authenticated;
GRANT ALL ON TABLE mine_sites TO anon, authenticated;

-- 5. FORZAR RECARGA DE CACHÉ DE API (PGRST)
--    Esto obliga a PostgREST a refrescar su esquema interno
NOTIFY pgrst, 'reload config';

COMMIT;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Permisos aplicados y recarga de caché solicitada exitosamente.';
END $$;
