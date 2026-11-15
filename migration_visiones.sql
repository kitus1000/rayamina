-- ==================================================================================
-- MIGRACIÓN: SISTEMA DE VISIONES (PERMISOS DINÁMICOS)
-- ==================================================================================

-- 1. Agregar views_json a sys_users para controlar el sidebar dinámico
ALTER TABLE sys_users ADD COLUMN IF NOT EXISTS views_json JSONB DEFAULT 'null';

-- 2. Agregar is_jefe a rh_employees para identificar personal con mando
ALTER TABLE rh_employees ADD COLUMN IF NOT EXISTS is_jefe BOOLEAN DEFAULT false;

-- 3. Actualizar la API de Supabase
NOTIFY pgrst, 'reload schema';

COMMENT ON COLUMN sys_users.views_json IS 'Lista de rutas permitidas para el usuario (ej. ["/dashboard/nomina", "/dashboard/chat"])';
COMMENT ON COLUMN rh_employees.is_jefe IS 'Indica si el empleado tiene rango de jefe o supervisor';
