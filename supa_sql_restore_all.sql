-- =======================================================
-- SCRIPT: RESTAURACIÓN CORREGIDA (V2)
-- =======================================================
-- Corregimos las tablas para que coincidan EXACTAMENTE con lo que pide el Código.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

BEGIN;

-- 1. LIMPIEZA (Borrar versiones incorrectas anteriores)
DROP TABLE IF EXISTS mine_locations CASCADE;
DROP TABLE IF EXISTS ops_equipment CASCADE;

-- 2. ASEGURAR PADRES
CREATE TABLE IF NOT EXISTS mine_sites (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre_mina text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 3. CREAR TABLA UBICACIONES (mine_locations)
-- El código pide: site_id, nombre, codigo, tipo, labor_factor
CREATE TABLE mine_locations (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    site_id uuid REFERENCES mine_sites(id), -- Ojo: en el código se usa site_id
    nombre text NOT NULL,
    codigo text,          -- FALTABA ESTE
    tipo text,
    labor_factor numeric(5,2) DEFAULT 1.00,
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- 4. CREAR TABLA MAQUINARIA (ops_equipment)
-- El código pide: unit_id, clave, tipo, marca, modelo
CREATE TABLE ops_equipment (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    unit_id uuid REFERENCES org_units(id), -- Ojo: referencia a UNIDAD, no a MINA
    clave text,           -- "Económico"
    tipo text,            -- JUMBO, SCOOP...
    marca text,
    modelo text,
    status text DEFAULT 'OPERATIVO',
    created_at timestamptz DEFAULT now()
);

-- 5. SEGURIDAD (RLS)
ALTER TABLE mine_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Locations" ON mine_locations;
CREATE POLICY "Public Access Locations" ON mine_locations FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE ops_equipment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Equipment" ON ops_equipment;
CREATE POLICY "Public Access Equipment" ON ops_equipment FOR ALL USING (true) WITH CHECK (true);

-- 6. PERMISOS
GRANT ALL ON TABLE mine_locations TO anon, authenticated, postgres, service_role;
GRANT ALL ON TABLE ops_equipment TO anon, authenticated, postgres, service_role;

-- 7. RELOAD
NOTIFY pgrst, 'reload config';

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Tablas recreadas con las columnas correctas (codigo, clave, etc).';
END $$;
