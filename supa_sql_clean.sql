CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DROP TABLE IF EXISTS cat_role_splits CASCADE;
DROP TABLE IF EXISTS cat_puesto_roles CASCADE;
DROP TABLE IF EXISTS cat_roles_operativos CASCADE;
DROP TABLE IF EXISTS cat_puestos CASCADE;

CREATE TABLE cat_puestos (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  nombre text NOT NULL UNIQUE,
  tipo_personal text CHECK (tipo_personal IN ('OPERATIVO', 'ADMINISTRATIVO')),
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE cat_roles_operativos (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  nombre text NOT NULL,
  categoria text NOT NULL,
  activo boolean DEFAULT true,
  orden int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(nombre, categoria)
);

CREATE TABLE cat_puesto_roles (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  puesto_id uuid REFERENCES cat_puestos(id) ON DELETE CASCADE,
  rol_operativo_id uuid REFERENCES cat_roles_operativos(id) ON DELETE CASCADE,
  UNIQUE(puesto_id, rol_operativo_id)
);

CREATE TABLE cat_role_splits (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  rol_operativo_id uuid REFERENCES cat_roles_operativos(id) ON DELETE CASCADE,
  concepto_nomina_id uuid,
  concepto_ref text,
  porcentaje numeric(6,4) CHECK (porcentaje >= 0 AND porcentaje <= 1),
  monto_fijo numeric(10,2),
  vigencia_desde date DEFAULT current_date,
  vigencia_hasta date,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rh_employees (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  first_name text NOT NULL,
  last_name text NOT NULL,
  position text,
  employee_code text,
  status text DEFAULT 'ACTIVE',
  created_at timestamptz DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_employees' AND column_name = 'puesto_id') THEN
        ALTER TABLE rh_employees ADD COLUMN puesto_id uuid REFERENCES cat_puestos(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_employees' AND column_name = 'is_supervisor') THEN
        ALTER TABLE rh_employees ADD COLUMN is_supervisor boolean DEFAULT false;
    END IF;
END $$;

ALTER TABLE cat_puestos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Puestos" ON cat_puestos;
CREATE POLICY "Public Access Puestos" ON cat_puestos FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE cat_roles_operativos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Roles" ON cat_roles_operativos;
CREATE POLICY "Public Access Roles" ON cat_roles_operativos FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE cat_puesto_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Puesto Roles" ON cat_puesto_roles;
CREATE POLICY "Public Access Puesto Roles" ON cat_puesto_roles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE cat_role_splits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Splits" ON cat_role_splits;
CREATE POLICY "Public Access Splits" ON cat_role_splits FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE rh_employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Employees" ON rh_employees;
CREATE POLICY "Public Access Employees" ON rh_employees FOR ALL USING (true) WITH CHECK (true);

INSERT INTO cat_puestos (nombre, tipo_personal) VALUES
('Perforista', 'OPERATIVO'),
('Ayudante Perforista', 'OPERATIVO'),
('Operador Scoop', 'OPERATIVO'),
('Supervisor de Mina', 'ADMINISTRATIVO')
ON CONFLICT DO NOTHING;

INSERT INTO cat_roles_operativos (nombre, categoria, orden) VALUES
('Oficial', 'PERFORACION', 1),
('Ayudante', 'PERFORACION', 2),
('Oficial', 'OBRA_CIVIL', 3), 
('Ayudante', 'OBRA_CIVIL', 4), 
('Chofer', 'SCOOP', 5)
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload config';
