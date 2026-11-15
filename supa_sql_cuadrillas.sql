-- =======================================================
-- SCRIPT: MÓDULO CUADRILLAS Y TURNOS
-- =======================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

BEGIN;

-- 1. TURNOS (ops_turnos)
CREATE TABLE IF NOT EXISTS ops_turnos (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    codigo text NOT NULL UNIQUE, -- 1RA, 2DA, 3RA
    nombre text NOT NULL,        -- Matutino, Vespertino, Nocturno
    orden int DEFAULT 0,
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Seed de Turnos
INSERT INTO ops_turnos (codigo, nombre, orden) VALUES
('1RA', 'Primer Turno (Día)', 1),
('2DA', 'Segundo Turno (Tarde)', 2),
('3RA', 'Tercer Turno (Noche)', 3)
ON CONFLICT (codigo) DO NOTHING;


-- 2. CUADRILLAS (ops_cuadrillas)
CREATE TABLE IF NOT EXISTS ops_cuadrillas (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    unit_id uuid REFERENCES org_units(id) ON DELETE CASCADE NOT NULL,
    turno_id uuid REFERENCES ops_turnos(id) ON DELETE RESTRICT NOT NULL,
    cuadrilla_num int NOT NULL, -- El "5" de "Cuadrilla 5"
    
    clave text,   -- Opcional: "D5"
    nombre text,  -- Opcional: "Perforación D5"
    
    supervisor_id uuid REFERENCES rh_employees(id), -- Opcional, Supervisor a cargo
    activa boolean DEFAULT true,
    
    created_at timestamptz DEFAULT now(),
    
    -- Una unidad no puede tener dos "Cuadrilla 5" en el mismo turno
    UNIQUE(unit_id, turno_id, cuadrilla_num)
);


-- 3. MIEMBROS DE CUADRILLA (ops_cuadrilla_miembros)
CREATE TABLE IF NOT EXISTS ops_cuadrilla_miembros (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    cuadrilla_id uuid REFERENCES ops_cuadrillas(id) ON DELETE CASCADE NOT NULL,
    employee_id uuid REFERENCES rh_employees(id) ON DELETE CASCADE NOT NULL,
    rol_operativo_id uuid REFERENCES cat_roles_operativos(id) NOT NULL,
    
    desde date DEFAULT current_date NOT NULL,
    hasta date, -- Si es NULL, está activo
    
    created_at timestamptz DEFAULT now()
);

-- Indice para búsquedas rápidas de "miembros actuales"
CREATE INDEX IF NOT EXISTS idx_cuadrilla_miembros_active 
ON ops_cuadrilla_miembros(cuadrilla_id, employee_id) 
WHERE hasta IS NULL;

-- 4. VIEW: VALIDACIÓN DE ROLES (Opcional, pero útil para debugging)
-- Esta vista ayudaría a saber si el rol asignado es compatible con el puesto RH del empleado
-- (Se usará lógica en Frontend, pero la BD no lo restringe estrictamente para flexibilidad)


-- 5. RLS (Row Level Security)
ALTER TABLE ops_turnos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Turnos" ON ops_turnos FOR ALL USING (true);

ALTER TABLE ops_cuadrillas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Cuadrillas" ON ops_cuadrillas FOR ALL USING (true);

ALTER TABLE ops_cuadrilla_miembros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Miembros" ON ops_cuadrilla_miembros FOR ALL USING (true);


-- 6. PERMISOS
GRANT ALL ON TABLE ops_turnos TO anon, authenticated, postgres, service_role;
GRANT ALL ON TABLE ops_cuadrillas TO anon, authenticated, postgres, service_role;
GRANT ALL ON TABLE ops_cuadrilla_miembros TO anon, authenticated, postgres, service_role;

NOTIFY pgrst, 'reload config';

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Módulo de Cuadrillas y Turnos creado exitosamente.';
END $$;
