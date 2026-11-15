-- =======================================================
-- SCRIPT: PRUEBA DE CONECTIVIDAD (TABLA NUEVA)
-- =======================================================
-- Vamos a crear una tabla totalmente nueva con un nombre único.
-- Si la API no ve esto, entonces el problema es global (o de proyecto incorrecto).

BEGIN;

DROP TABLE IF EXISTS test_connectivity_v1;

CREATE TABLE test_connectivity_v1 (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre text,
    is_jefe_mina boolean DEFAULT false
);

-- Permisos
GRANT ALL ON TABLE test_connectivity_v1 TO anon, authenticated, postgres, service_role;

-- Reload
NOTIFY pgrst, 'reload config';

COMMIT;
