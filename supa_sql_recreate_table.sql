-- =======================================================
-- SCRIPT "NUCLEAR" V2 - RECREAR TABLA EMPLEADOS DEFINITIVA
-- =======================================================
-- Misión: Matar la tabla vieja y crear una nueva con TODAS las columnas desde el inicio.
-- Así no hay duda de que existen.

BEGIN;

-- 0. Asegurar acceso al esquema (Vital)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- 1. Eliminar tabla (y cualquier vista o FK que dependa de ella)
DROP TABLE IF EXISTS rh_employees CASCADE;

-- 2. Crear la tabla fresca
CREATE TABLE rh_employees (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Datos básicos
    first_name text NOT NULL,
    last_name text NOT NULL,
    employee_code text,
    email text,
    phone text,
    status text DEFAULT 'ACTIVE',
    
    -- Relaciones (Foreign Keys)
    puesto_id uuid REFERENCES cat_puestos(id),
    unit_id uuid REFERENCES org_units(id),
    mine_id uuid REFERENCES mine_sites(id),
    rol_operativo_default_id uuid REFERENCES cat_roles_operativos(id),
    
    -- Columnas de Mando (Las que estaban dando problemas)
    is_supervisor boolean DEFAULT false,
    is_jefe_mina boolean DEFAULT false,
    
    -- Auditoría
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 3. Constraints
ALTER TABLE rh_employees ADD CONSTRAINT employees_code_unique UNIQUE (employee_code);

-- 4. Reactivar RLS (Seguridad)
ALTER TABLE rh_employees ENABLE ROW LEVEL SECURITY;

-- 5. Crear Política de ACCESO TOTAL (CRUD) para desarrollo
CREATE POLICY "Enable all for anon and auth" ON rh_employees 
FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- 6. PERMISOS EXPLÍCITOS (Crucial para que la API la vea)
GRANT ALL ON TABLE rh_employees TO anon, authenticated, service_role;

-- 7. NOTIFICAR RECARGA
NOTIFY pgrst, 'reload config';

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Tabla rh_employees recreada desde cero con todas las columnas.';
END $$;
