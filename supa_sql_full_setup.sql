-- =======================================================
-- SCRIPT DE REPARACIÓN TOTAL - ESTRUCTURA BASE + EMPLEADOS
-- =======================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ASEGURAR ESTRUCTURA BASE (Catalogos Globales)
-- Si estas tablas no existen, fallan las relaciones de empleados.

-- A) Empresas
CREATE TABLE IF NOT EXISTS org_companies (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    razon_social text NOT NULL,
    rfc text,
    created_at timestamptz DEFAULT now()
);

-- B) Unidades (Centros de Costo)
CREATE TABLE IF NOT EXISTS org_units (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id uuid REFERENCES org_companies(id) ON DELETE CASCADE,
    nombre_unidad text NOT NULL,
    codigo text,
    created_at timestamptz DEFAULT now()
);

-- C) Minas (Sitios)
CREATE TABLE IF NOT EXISTS mine_sites (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    unit_id uuid REFERENCES org_units(id) ON DELETE CASCADE,
    nombre_mina text NOT NULL,
    created_at timestamptz DEFAULT now()
);


-- 2. REFORZAR CONSTRAINTS EN MODULO PUESTOS (Si ya existe)
DO $$
BEGIN
    ALTER TABLE cat_puestos ALTER COLUMN tipo_personal SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;


-- 3. ACTUALIZAR TABLA EMPLEADOS (rh_employees)
-- Agregamos las columnas necesarias con sus referencias

DO $$
BEGIN
    -- A) Puesto ID
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_employees' AND column_name = 'puesto_id') THEN
        ALTER TABLE rh_employees ADD COLUMN puesto_id uuid REFERENCES cat_puestos(id);
    END IF;

    -- B) Status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_employees' AND column_name = 'status') THEN
        ALTER TABLE rh_employees ADD COLUMN status text DEFAULT 'ACTIVE';
    END IF;

    -- C) Mando Flags
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_employees' AND column_name = 'is_supervisor') THEN
        ALTER TABLE rh_employees ADD COLUMN is_supervisor boolean DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_employees' AND column_name = 'is_jefe_mina') THEN
        ALTER TABLE rh_employees ADD COLUMN is_jefe_mina boolean DEFAULT false;
    END IF;

    -- D) Relaciones Organizacionales (AHORA SÍ EXISTEN LAS TABLAS)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_employees' AND column_name = 'unit_id') THEN
        ALTER TABLE rh_employees ADD COLUMN unit_id uuid REFERENCES org_units(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_employees' AND column_name = 'mine_id') THEN
        ALTER TABLE rh_employees ADD COLUMN mine_id uuid REFERENCES mine_sites(id);
    END IF;

    -- E) Operación
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_employees' AND column_name = 'rol_operativo_default_id') THEN
        ALTER TABLE rh_employees ADD COLUMN rol_operativo_default_id uuid REFERENCES cat_roles_operativos(id);
    END IF;

END $$;


-- 4. APLICAR REGLAS DE NEGOCIO (CONSTRAINTS)

DO $$
BEGIN
    -- Unicidad de Código
    BEGIN
        ALTER TABLE rh_employees ADD CONSTRAINT employees_code_unique UNIQUE (employee_code);
    EXCEPTION WHEN duplicate_table THEN NULL; 
    END;

    -- Regla de Mando: Supervisor requiere Unidad
    BEGIN
        ALTER TABLE rh_employees ADD CONSTRAINT check_mando_requires_unit 
        CHECK ((is_supervisor = false AND is_jefe_mina = false) OR (unit_id IS NOT NULL));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;


-- 5. POLÍTICAS RLS PARA TABLAS NUEVAS
ALTER TABLE org_companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Companies" ON org_companies;
CREATE POLICY "Public Access Companies" ON org_companies FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE org_units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Units" ON org_units;
CREATE POLICY "Public Access Units" ON org_units FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE mine_sites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Mines" ON mine_sites;
CREATE POLICY "Public Access Mines" ON mine_sites FOR ALL USING (true) WITH CHECK (true);


-- 6. DATOS SEMILLA (Si están vacías)
INSERT INTO org_companies (razon_social, rfc)
SELECT 'Minera Principal S.A. de C.V.', 'MPX999999'
WHERE NOT EXISTS (SELECT 1 FROM org_companies);

INSERT INTO org_units (company_id, nombre_unidad, codigo)
SELECT id, 'Unidad Charcas', 'CHA' 
FROM org_companies 
WHERE NOT EXISTS (SELECT 1 FROM org_units)
LIMIT 1;

NOTIFY pgrst, 'reload config';
