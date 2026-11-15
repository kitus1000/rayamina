-- =======================================================
-- SCRIPT DE ACTUALIZACIÓN - MÓDULO EMPLEADOS V3 (STRICT + VALIDATIONS)
-- =======================================================

-- 1. REFORZAR CONSTRAINTS EN CATÁLOGOS EXISTENTES

DO $$
BEGIN
    -- Intentamos poner NOT NULL en Puestos (si data lo permite)
    ALTER TABLE cat_puestos 
    ALTER COLUMN tipo_personal SET NOT NULL;
EXCEPTION WHEN others THEN 
    RAISE NOTICE 'Skipping NOT NULL on cat_puestos.tipo_personal';
END $$;


-- 2. ACTUALIZAR TABLA EMPLEADOS (rh_employees)

DO $$
BEGIN
    -- A) Puesto ID (FK)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_employees' AND column_name = 'puesto_id') THEN
        ALTER TABLE rh_employees ADD COLUMN puesto_id uuid REFERENCES cat_puestos(id);
    END IF;

    -- B) Status / Activo (Definir default 'ACTIVE')
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_employees' AND column_name = 'status') THEN
        ALTER TABLE rh_employees ADD COLUMN status text DEFAULT 'ACTIVE';
    ELSE
        ALTER TABLE rh_employees ALTER COLUMN status SET DEFAULT 'ACTIVE';
    END IF;

    -- C) Mando: Supervisor
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_employees' AND column_name = 'is_supervisor') THEN
        ALTER TABLE rh_employees ADD COLUMN is_supervisor boolean DEFAULT false;
    END IF;

    -- D) Mando: Jefe de Mina
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_employees' AND column_name = 'is_jefe_mina') THEN
        ALTER TABLE rh_employees ADD COLUMN is_jefe_mina boolean DEFAULT false;
    END IF;

    -- E) Relación con Unidad
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_employees' AND column_name = 'unit_id') THEN
        ALTER TABLE rh_employees ADD COLUMN unit_id uuid REFERENCES org_units(id);
    END IF;

     -- F) Relación con Mina (Opcional)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_employees' AND column_name = 'mine_id') THEN
        ALTER TABLE rh_employees ADD COLUMN mine_id uuid REFERENCES mine_sites(id);
    END IF;

    -- G) Rol Operativo Default
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_employees' AND column_name = 'rol_operativo_default_id') THEN
        ALTER TABLE rh_employees ADD COLUMN rol_operativo_default_id uuid REFERENCES cat_roles_operativos(id);
    END IF;

END $$;


-- 3. APLICAR REGLAS DE NEGOCIO (CONSTRAINTS)

DO $$
BEGIN
    -- Regla 1: Employee Code Único
    BEGIN
        ALTER TABLE rh_employees ADD CONSTRAINT employees_code_unique UNIQUE (employee_code);
    EXCEPTION WHEN duplicate_table THEN NULL; -- Ya existe
    END;

    -- Regla 2: Si es Supervisor o Jefe, DEBE tener Unidad
    -- Check: (No es mando) O (Tiene Unidad)
    BEGIN
        ALTER TABLE rh_employees ADD CONSTRAINT check_mando_requires_unit 
        CHECK (
            (is_supervisor = false AND is_jefe_mina = false) 
            OR 
            (unit_id IS NOT NULL)
        );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;


-- 4. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_employees_puesto ON rh_employees(puesto_id);
CREATE INDEX IF NOT EXISTS idx_employees_unit ON rh_employees(unit_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON rh_employees(status);

-- 5. RELOAD
NOTIFY pgrst, 'reload config';
