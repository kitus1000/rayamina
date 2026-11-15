-- =======================================================
-- SCRIPT DE INICIALIZACIÓN - PUESTOS & ROLES
-- =======================================================

-- 1. LIMPIEZA DE TABLAS ANTERIORES (Solo catálogos nuevos)
-- Precaución: Esto borrará datos de configuración si ya existen.
DROP TABLE IF EXISTS cat_role_splits CASCADE;
DROP TABLE IF EXISTS cat_puesto_roles CASCADE;
DROP TABLE IF EXISTS cat_roles_operativos CASCADE;
DROP TABLE IF EXISTS cat_puestos CASCADE;

-- No borramos rh_employees para no perder datos de empleados si ya existen.

-- 2. CREACIÓN DE CATÁLOGOS BASE

-- A) Puestos (RH)
CREATE TABLE cat_puestos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL UNIQUE,
  tipo_personal text CHECK (tipo_personal IN ('OPERATIVO', 'ADMINISTRATIVO')),
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- B) Roles Operativos (Mina)
CREATE TABLE cat_roles_operativos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL UNIQUE,
  categoria text, -- 'PERFORACION', 'SCOOP', 'SERVICIOS', etc.
  activo boolean DEFAULT true,
  orden int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- C) Matriz de Compatibilidad
CREATE TABLE cat_puesto_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  puesto_id uuid REFERENCES cat_puestos(id) ON DELETE CASCADE,
  rol_operativo_id uuid REFERENCES cat_roles_operativos(id) ON DELETE CASCADE,
  UNIQUE(puesto_id, rol_operativo_id)
);

-- D) Splits de Pago
CREATE TABLE cat_role_splits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  rol_operativo_id uuid REFERENCES cat_roles_operativos(id) ON DELETE CASCADE,
  concepto_nomina_id uuid, -- Referencia a conceptos (si existe la tabla) o null
  concepto_ref text, -- Referencia texto por ahora (ej. 'DESTAJO_METROS')
  porcentaje numeric(5,2), -- 0.70
  monto_fijo numeric(10,2), -- Opcional
  vigencia_desde date DEFAULT current_date,
  vigencia_hasta date,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);


-- 3. CREACIÓN Y ACTUALIZACIÓN DE EMPLEADOS

-- Crear tabla rh_employees si no existe
CREATE TABLE IF NOT EXISTS rh_employees (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name text NOT NULL,
  last_name text NOT NULL,
  position text, -- Mantenemos por compatibilidad temporal
  employee_code text,
  status text DEFAULT 'ACTIVE',
  created_at timestamptz DEFAULT now()
);

-- Agregar columnas nuevas si no existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_employees' AND column_name = 'puesto_id') THEN
        ALTER TABLE rh_employees ADD COLUMN puesto_id uuid REFERENCES cat_puestos(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_employees' AND column_name = 'is_supervisor') THEN
        ALTER TABLE rh_employees ADD COLUMN is_supervisor boolean DEFAULT false;
    END IF;
END $$;


-- 4. POLÍTICAS DE SEGURIDAD (RLS)
ALTER TABLE cat_puestos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Puestos" ON cat_puestos FOR ALL USING (true);

ALTER TABLE cat_roles_operativos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Roles" ON cat_roles_operativos FOR ALL USING (true);

ALTER TABLE cat_puesto_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Puesto Roles" ON cat_puesto_roles FOR ALL USING (true);

ALTER TABLE cat_role_splits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Splits" ON cat_role_splits FOR ALL USING (true);

ALTER TABLE rh_employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Employees" ON rh_employees FOR ALL USING (true);

-- 5. DATOS INICIALES DE EJEMPLO (Seeds)
INSERT INTO cat_puestos (nombre, tipo_personal) VALUES
('Perforista', 'OPERATIVO'),
('Ayudante Perforista', 'OPERATIVO'),
('Operador Scoop', 'OPERATIVO'),
('Supervisor de Mina', 'ADMINISTRATIVO')
ON CONFLICT DO NOTHING;

INSERT INTO cat_roles_operativos (nombre, categoria, orden) VALUES
('Oficial Perforación', 'PERFORACION', 1),
('Ayudante Perforación', 'PERFORACION', 2),
('Chofer Scoop', 'SCOOP', 3),
('Maestro de Obra', 'OBRA_CIVIL', 4)
ON CONFLICT DO NOTHING;
