-- =======================================================
-- SCRIPT: RECARGAR CACHÉ DE ESQUEMA (PGRST)
-- =======================================================

-- Este comando le dice a Supabase (PostgREST) que actualice su "mapa" de la base de datos.
-- ES NECESARIO CORRER ESTO DESPUÉS DE CUALQUIER ALTER TABLE O CREATE TABLE.

NOTIFY pgrst, 'reload config';

-- Para verificar que se ejecuta, imprimimos un mensaje (visible en logs de Supabase)
DO $$
BEGIN
    RAISE NOTICE 'Se envió la señal de recarga de configuración a PostgREST';
END $$;
