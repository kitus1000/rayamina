-- =======================================================
-- SCRIPT: DIAGNÓSTICO VÍA VISTA (VIEW)
-- =======================================================
-- A veces la caché de TABLAS se pega, pero las VISTAS nuevas funcionan bien.
-- Vamos a crear una vista que simplemente lee la tabla.

-- 1. Eliminar vista si existe (para recrear fresca)
DROP VIEW IF EXISTS debug_employees_view;

-- 2. Crear la vista
CREATE OR REPLACE VIEW debug_employees_view AS
SELECT 
    id,
    employee_code,
    first_name,
    last_name,
    is_jefe_mina, -- Probamos explícitamente esta columna
    unit_id,
    status
FROM rh_employees;

-- 3. Dar permisos (Super Importante)
GRANT SELECT ON debug_employees_view TO anon, authenticated, service_role;

-- 4. Notificar (por costumbre)
NOTIFY pgrst, 'reload config';
