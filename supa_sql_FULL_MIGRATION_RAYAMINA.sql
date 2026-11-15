-- ==================================================================================
-- SCRIPT MAESTRO DE MIGRACIÓN: RAYA MINA V1.0
-- ==================================================================================
-- Este script consolida toda la estructura necesaria para operar el sistema.
-- Ejecutar en el Editor SQL de Supabase del proyecto "rayamina".

BEGIN;

-- 1. EXTENSIONES Y UTILIDADES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ESTRUCTURA ORGANIZACIONAL BASE
CREATE TABLE IF NOT EXISTS org_companies (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    razon_social text NOT NULL,
    rfc text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_units (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id uuid REFERENCES org_companies(id) ON DELETE CASCADE,
    nombre_unidad text NOT NULL,
    codigo text,
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mine_sites (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    unit_id uuid REFERENCES org_units(id) ON DELETE CASCADE,
    nombre_mina text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Seed Data Organizacional
INSERT INTO org_companies (razon_social, rfc)
SELECT 'Minera Principal S.A. de C.V.', 'MPX999999'
WHERE NOT EXISTS (SELECT 1 FROM org_companies);

INSERT INTO org_units (company_id, nombre_unidad, codigo)
SELECT id, 'Unidad Charcas', 'CHA' FROM org_companies WHERE NOT EXISTS (SELECT 1 FROM org_units) LIMIT 1;


-- 3. CATÁLOGOS DE RRHH (PUESTOS Y ROLES)
CREATE TABLE IF NOT EXISTS cat_puestos (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre text NOT NULL,
    tipo_personal text NOT NULL, -- Eliminamos el CHECK en CREATE para evitar conflictos si ya existe
    created_at timestamptz DEFAULT now()
);

-- Intentar eliminar constraint viejo si existe para permitir nuevos valores
DO $$ BEGIN
    ALTER TABLE cat_puestos DROP CONSTRAINT IF EXISTS cat_puestos_tipo_personal_check;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Volver a agregar constraint con los valores actualizados (opcional, o dejar abierto)
-- ALTER TABLE cat_puestos ADD CONSTRAINT cat_puestos_tipo_personal_check CHECK (tipo_personal IN ('EJECUTIVO', 'EMPLEADO', 'OPERATIVO', 'ADMINISTRATIVO'));

CREATE TABLE IF NOT EXISTS cat_roles_operativos (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre text NOT NULL, -- Ej. "Minero 1", "Ayudante"
    created_at timestamptz DEFAULT now()
);

-- Seed Puestos (Básicos)
INSERT INTO cat_puestos (nombre, tipo_personal) VALUES 
('Gerente General', 'EJECUTIVO'),
('Jefe de Mina', 'EMPLEADO'),
('Supervisor', 'EMPLEADO'),
('Operador Jumbo', 'OPERATIVO'),
('Ayudante General', 'OPERATIVO')
ON CONFLICT DO NOTHING; -- (Si nombre fuera unique, pero por ahora solo inserta si tabla vacía mejor no forzar unique)


-- 4. EMPLEADOS (rh_employees)
CREATE TABLE IF NOT EXISTS rh_employees (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    first_name text NOT NULL,
    last_name text NOT NULL,
    employee_code text UNIQUE,
    email text,
    phone text,
    
    -- Relaciones
    puesto_id uuid REFERENCES cat_puestos(id),
    unit_id uuid REFERENCES org_units(id),
    mine_id uuid REFERENCES mine_sites(id),
    rol_operativo_default_id uuid REFERENCES cat_roles_operativos(id),
    
    -- Flags de Mando
    is_supervisor boolean DEFAULT false,
    is_jefe_mina boolean DEFAULT false,
    
    status text DEFAULT 'ACTIVE',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Asegurar columnas si la tabla ya existía (Migración segura)
DO $$ BEGIN
    ALTER TABLE rh_employees ADD COLUMN IF NOT EXISTS is_supervisor boolean DEFAULT false;
    ALTER TABLE rh_employees ADD COLUMN IF NOT EXISTS is_jefe_mina boolean DEFAULT false;
    ALTER TABLE rh_employees ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES org_units(id);
    ALTER TABLE rh_employees ADD COLUMN IF NOT EXISTS mine_id uuid REFERENCES mine_sites(id);
    ALTER TABLE rh_employees ADD COLUMN IF NOT EXISTS rol_operativo_default_id uuid REFERENCES cat_roles_operativos(id);
END $$;


-- 5. CATÁLOGOS DE OPERACIÓN (TURNOS Y CUADRILLAS)
CREATE TABLE IF NOT EXISTS cat_turnos (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    codigo text NOT NULL UNIQUE CHECK (codigo IN ('1RA', '2DA', '3RA')),
    nombre text NOT NULL,
    orden int DEFAULT 0,
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

INSERT INTO cat_turnos (codigo, nombre, orden) VALUES
('1RA', 'Primer Turno', 1),
('2DA', 'Segundo Turno', 2),
('3RA', 'Tercer Turno', 3)
ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre;


CREATE TABLE IF NOT EXISTS cat_cuadrillas (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre text NOT NULL,
    unit_id uuid NOT NULL REFERENCES org_units(id) ON DELETE CASCADE,
    turno_id uuid NOT NULL REFERENCES cat_turnos(id) ON DELETE RESTRICT,
    supervisor_id uuid REFERENCES rh_employees(id) ON DELETE SET NULL,
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cat_cuadrillas_miembros (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    cuadrilla_id uuid NOT NULL REFERENCES cat_cuadrillas(id) ON DELETE CASCADE,
    empleado_id uuid NOT NULL REFERENCES rh_employees(id) ON DELETE RESTRICT,
    fecha_inicio date DEFAULT current_date NOT NULL,
    fecha_fin date,
    activo boolean GENERATED ALWAYS AS (fecha_fin IS NULL) STORED,
    created_at timestamptz DEFAULT now()
);


-- 6. EQUIPOS Y MAQUINARIA
-- Catálogo Tipos
CREATE TABLE IF NOT EXISTS cat_tipos_equipo (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    baja BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO cat_tipos_equipo (nombre) VALUES 
('JUMBO'), ('SCOOP'), ('JACKLEG'), ('LONGHOLE'), ('CAMION'), ('SIMBA'), ('AMBULANCIA'), ('PICKUP'), ('OTRO')
ON CONFLICT (nombre) DO NOTHING;

-- Tabla Equipos (ops_equipment)
CREATE TABLE IF NOT EXISTS ops_equipment (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    unit_id uuid REFERENCES org_units(id),
    clave text NOT NULL, -- Económico
    tipo text NOT NULL, -- Se mantiene como texto para flexibilidad, idealmente FK a cat_tipos_equipo
    marca text,
    modelo text,
    serie text,
    uso_operativo text CHECK (uso_operativo IN ('PERFORACION', 'FLETE', 'SERVICIOS_OBRA_CIVIL', 'NO_OPERATIVO', 'OTROS')),
    status text DEFAULT 'ACTIVE',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Asegurar columna uso_operativo si ya existía la tabla
DO $$ BEGIN
    ALTER TABLE ops_equipment ADD COLUMN IF NOT EXISTS uso_operativo text CHECK (uso_operativo IN ('PERFORACION', 'FLETE', 'SERVICIOS_OBRA_CIVIL', 'NO_OPERATIVO', 'OTROS'));
EXCEPTION WHEN others THEN NULL;
END $$;


-- 7. PRODUCTOS DE MINA (CONCEPTOS OPERATIVOS)
CREATE TABLE IF NOT EXISTS cat_productos_mina (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria TEXT NOT NULL, 
    subcategoria TEXT NOT NULL,
    nombre TEXT NOT NULL,
    unidad_medida_default TEXT NOT NULL,
    modo_captura TEXT DEFAULT 'DIRECTO',
    formula_cobro TEXT,
    requiere_maquina BOOLEAN DEFAULT FALSE,
    tipos_equipo_permitidos TEXT[],
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cat_producto_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID REFERENCES cat_productos_mina(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    clave TEXT NOT NULL,
    tipo_input TEXT NOT NULL,
    opciones TEXT[],
    unidad TEXT,
    orden INTEGER DEFAULT 0,
    requerido BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. DATOS SEMILLA PRODUCTOS DE MINA (PRODUCCIÓN / SERVICIOS)
DO $$
DECLARE
    v_prod_id UUID;
BEGIN
    -- Limpiar si queremos recargar data limpia (Opcional, comentado por seguridad)
    -- DELETE FROM cat_productos_mina;

    -- A. PERFORACION - Desarrollo
    IF NOT EXISTS (SELECT 1 FROM cat_productos_mina WHERE nombre = 'Barrenación de Frente') THEN
        INSERT INTO cat_productos_mina (categoria, subcategoria, nombre, unidad_medida_default, requiere_maquina, tipos_equipo_permitidos)
        VALUES ('PERFORACION', 'Desarrollo', 'Barrenación de Frente', 'M', TRUE, ARRAY['JUMBO', 'JACKLEG'])
        RETURNING id INTO v_prod_id;

        INSERT INTO cat_producto_variables (producto_id, label, clave, tipo_input, unidad, orden) VALUES
        (v_prod_id, 'Metros Perforados', 'metros', 'NUMBER', 'm', 1),
        (v_prod_id, 'Barrenos', 'barrenos', 'NUMBER', 'pzas', 2),
        (v_prod_id, 'Longitud', 'longitud', 'SELECT', 'ft', 3),
        (v_prod_id, 'Diámetro', 'diametro', 'SELECT', 'mm', 4),
        (v_prod_id, 'Tipo de Roca', 'tipo_roca', 'SELECT', NULL, 5);

        UPDATE cat_producto_variables SET opciones = ARRAY['8', '10', '12', '14', '16'] WHERE producto_id = v_prod_id AND clave = 'longitud';
        UPDATE cat_producto_variables SET opciones = ARRAY['32', '35', '38', '45', '51'] WHERE producto_id = v_prod_id AND clave = 'diametro';
    END IF;

    -- B. FLETE - Carga
    IF NOT EXISTS (SELECT 1 FROM cat_productos_mina WHERE nombre = 'Acarreo de Mineral') THEN
        INSERT INTO cat_productos_mina (categoria, subcategoria, nombre, unidad_medida_default, requiere_maquina, tipos_equipo_permitidos)
        VALUES ('FLETE', 'Carga', 'Acarreo de Mineral', 'TON', TRUE, ARRAY['SCOOP', 'CAMION'])
        RETURNING id INTO v_prod_id;

        INSERT INTO cat_producto_variables (producto_id, label, clave, tipo_input, unidad, orden) VALUES
        (v_prod_id, 'Toneladas', 'toneladas', 'NUMBER', 'ton', 1),
        (v_prod_id, 'Viajes', 'viajes', 'NUMBER', 'viajes', 2),
        (v_prod_id, 'Origen', 'origen', 'TEXT', NULL, 3),
        (v_prod_id, 'Destino', 'destino', 'TEXT', NULL, 4);
    END IF;

    -- C. SERVICIOS - Tubería
    IF NOT EXISTS (SELECT 1 FROM cat_productos_mina WHERE nombre = 'Instalación Tubería de Agua') THEN
        INSERT INTO cat_productos_mina (categoria, subcategoria, nombre, unidad_medida_default, modo_captura, requiere_maquina)
        VALUES ('SERVICIOS_OBRA_CIVIL', 'Servicios', 'Instalación Tubería de Agua', 'ML', 'DIRECTO', FALSE)
        RETURNING id INTO v_prod_id;

        INSERT INTO cat_producto_variables (producto_id, label, clave, tipo_input, unidad, orden) VALUES
        (v_prod_id, 'Diámetro', 'diametro', 'SELECT', 'pulg', 1),
        (v_prod_id, 'Tipo Material', 'material', 'SELECT', NULL, 2);

        UPDATE cat_producto_variables SET opciones = ARRAY['2', '4', '6', '8'] WHERE producto_id = v_prod_id AND clave = 'diametro';
        UPDATE cat_producto_variables SET opciones = ARRAY['PVC', 'HDPE', 'Acero'] WHERE producto_id = v_prod_id AND clave = 'material';
    END IF;
    
    -- D. OBRA CIVIL - Muros (Calculado)
    IF NOT EXISTS (SELECT 1 FROM cat_productos_mina WHERE nombre = 'Muro de Block') THEN
        INSERT INTO cat_productos_mina (categoria, subcategoria, nombre, unidad_medida_default, modo_captura, formula_cobro, requiere_maquina)
        VALUES ('SERVICIOS_OBRA_CIVIL', 'Obra Civil', 'Muro de Block', 'M2', 'CALCULADO', 'l * h', FALSE)
        RETURNING id INTO v_prod_id;

        INSERT INTO cat_producto_variables (producto_id, label, clave, tipo_input, unidad, orden) VALUES
        (v_prod_id, 'Largo', 'l', 'NUMBER', 'm', 1),
        (v_prod_id, 'Alto', 'h', 'NUMBER', 'm', 2);
    END IF;

END $$;

-- 9. HABILITAR RLS GLOBAL
ALTER TABLE IF EXISTS org_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS org_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS mine_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cat_puestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cat_roles_operativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rh_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cat_turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cat_cuadrillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cat_cuadrillas_miembros ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cat_tipos_equipo ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ops_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cat_productos_mina ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cat_producto_variables ENABLE ROW LEVEL SECURITY;

-- Política de Acceso Total (Dev Mode)
DO $$ 
DECLARE 
    t text; 
BEGIN 
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP 
        EXECUTE format('DROP POLICY IF EXISTS "Public Access" ON %I', t); 
        EXECUTE format('CREATE POLICY "Public Access" ON %I FOR ALL USING (true) WITH CHECK (true)', t); 
    END LOOP; 
END $$;

NOTIFY pgrst, 'reload config';

COMMIT;
