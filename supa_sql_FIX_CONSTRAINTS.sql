-- ==================================================================================
-- PASO 1: REPARACIÓN DE ESQUEMA Y CONSTRAINTS (Ejecutar PRIMERO)
-- ==================================================================================
-- Este script prepara la base de datos para recibir los datos de prueba.
-- 1. Crea columnas faltantes.
-- 2. Elimina duplicados limpiamente reasignando referencias.
-- 3. Crea los índices únicos necesarios para ON CONFLICT.

BEGIN;

-- A. ASEGURAR COLUMNAS NECESARIAS
DO $$ 
BEGIN
    -- ops_equipment: status y uso_operativo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ops_equipment' AND column_name = 'status') THEN
        ALTER TABLE ops_equipment ADD COLUMN status text DEFAULT 'DISPONIBLE';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ops_equipment' AND column_name = 'uso_operativo') THEN
        ALTER TABLE ops_equipment ADD COLUMN uso_operativo text DEFAULT 'OTROS';
    END IF;

    -- TIMESTAMPS (Para deduplicación)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'org_units' AND column_name = 'created_at') THEN
        ALTER TABLE org_units ADD COLUMN created_at timestamptz DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cat_puestos' AND column_name = 'created_at') THEN
        ALTER TABLE cat_puestos ADD COLUMN created_at timestamptz DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cat_roles_operativos' AND column_name = 'created_at') THEN
        ALTER TABLE cat_roles_operativos ADD COLUMN created_at timestamptz DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ops_equipment' AND column_name = 'created_at') THEN
        ALTER TABLE ops_equipment ADD COLUMN created_at timestamptz DEFAULT now();
    END IF;
END $$;


-- B. LIMPIEZA INTELIGENTE DE DUPLICADOS (Reasignando Referencias)
DO $$ 
DECLARE
    rec RECORD;
BEGIN
    -- 1. Deduplicar ORG_UNITS
    FOR rec IN 
        SELECT code_group.codigo, (SELECT id FROM org_units WHERE codigo = code_group.codigo ORDER BY created_at DESC LIMIT 1) as keeper_id
        FROM (SELECT codigo FROM org_units GROUP BY codigo HAVING count(*) > 1) as code_group
    LOOP
        -- Mover referencias al nuevo ID
        UPDATE ops_equipment SET unit_id = rec.keeper_id WHERE unit_id IN (SELECT id FROM org_units WHERE codigo = rec.codigo AND id != rec.keeper_id);
        UPDATE rh_employees SET unit_id = rec.keeper_id WHERE unit_id IN (SELECT id FROM org_units WHERE codigo = rec.codigo AND id != rec.keeper_id);
        UPDATE mine_sites SET unit_id = rec.keeper_id WHERE unit_id IN (SELECT id FROM org_units WHERE codigo = rec.codigo AND id != rec.keeper_id);
        UPDATE cat_cuadrillas SET unit_id = rec.keeper_id WHERE unit_id IN (SELECT id FROM org_units WHERE codigo = rec.codigo AND id != rec.keeper_id);
        -- Borrar viejos
        DELETE FROM org_units WHERE codigo = rec.codigo AND id != rec.keeper_id;
    END LOOP;

    -- 2. Deduplicar PUESTOS
    FOR rec IN 
        SELECT name_group.nombre, (SELECT id FROM cat_puestos WHERE nombre = name_group.nombre ORDER BY created_at DESC LIMIT 1) as keeper_id
        FROM (SELECT nombre FROM cat_puestos GROUP BY nombre HAVING count(*) > 1) as name_group
    LOOP
        UPDATE rh_employees SET puesto_id = rec.keeper_id WHERE puesto_id IN (SELECT id FROM cat_puestos WHERE nombre = rec.nombre AND id != rec.keeper_id);
        DELETE FROM cat_puestos WHERE nombre = rec.nombre AND id != rec.keeper_id;
    END LOOP;
    
    -- 3. Deduplicar ROLES OPERATIVOS
    FOR rec IN 
        SELECT name_group.nombre, (SELECT id FROM cat_roles_operativos WHERE nombre = name_group.nombre ORDER BY created_at DESC LIMIT 1) as keeper_id
        FROM (SELECT nombre FROM cat_roles_operativos GROUP BY nombre HAVING count(*) > 1) as name_group
    LOOP
        UPDATE rh_employees SET rol_operativo_default_id = rec.keeper_id WHERE rol_operativo_default_id IN (SELECT id FROM cat_roles_operativos WHERE nombre = rec.nombre AND id != rec.keeper_id);
        -- UPDATE cat_cuadrillas_miembros: Omitido porque rol_operativo_id no existe en esta versión
        DELETE FROM cat_roles_operativos WHERE nombre = rec.nombre AND id != rec.keeper_id;
    END LOOP;
    
    -- 4. Deduplicar EQUIPOS
    FOR rec IN 
        SELECT key_group.clave, (SELECT id FROM ops_equipment WHERE clave = key_group.clave ORDER BY created_at DESC LIMIT 1) as keeper_id
        FROM (SELECT clave FROM ops_equipment GROUP BY clave HAVING count(*) > 1) as key_group
    LOOP
        DELETE FROM ops_equipment WHERE clave = rec.clave AND id != rec.keeper_id;
    END LOOP;
END $$;


-- C. CREAR ÍNDICES ÚNICOS (Requeridos para seed data)
-- Usamos to_regclass para verificar existencia de forma segura
DO $$
BEGIN
    IF to_regclass('public.idx_org_companies_rfc') IS NULL THEN
        CREATE UNIQUE INDEX idx_org_companies_rfc ON org_companies(rfc);
    END IF;

    IF to_regclass('public.idx_org_units_codigo') IS NULL THEN
        CREATE UNIQUE INDEX idx_org_units_codigo ON org_units(codigo);
    END IF;

    IF to_regclass('public.idx_cat_puestos_nombre') IS NULL THEN
        CREATE UNIQUE INDEX idx_cat_puestos_nombre ON cat_puestos(nombre);
    END IF;

    IF to_regclass('public.idx_cat_roles_operativos_nombre') IS NULL THEN
        CREATE UNIQUE INDEX idx_cat_roles_operativos_nombre ON cat_roles_operativos(nombre);
    END IF;

    IF to_regclass('public.idx_ops_equipment_clave') IS NULL THEN
        CREATE UNIQUE INDEX idx_ops_equipment_clave ON ops_equipment(clave);
    END IF;
    
    IF to_regclass('public.idx_mine_sites_unit_nombre') IS NULL THEN
        CREATE UNIQUE INDEX idx_mine_sites_unit_nombre ON mine_sites(unit_id, nombre_mina);
    END IF;
END $$;

COMMIT;
