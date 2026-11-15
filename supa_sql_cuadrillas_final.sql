-- =======================================================
-- SCRIPT: MÓDULO CUADRILLAS Y TURNOS (ARQUITECTURA FINAL)
-- =======================================================

BEGIN;

-- 1. LIMPIEZA DE TABLAS ANTERIORES (Si existen)
DROP TABLE IF EXISTS ops_cuadrilla_miembros CASCADE;
DROP TABLE IF EXISTS ops_cuadrillas CASCADE;
DROP TABLE IF EXISTS ops_turnos CASCADE;
-- También limpiar si se crearon con prefijo cat_ en intentos previos
DROP TABLE IF EXISTS cat_cuadrillas_miembros CASCADE;
DROP TABLE IF EXISTS cat_cuadrillas CASCADE;
DROP TABLE IF EXISTS cat_turnos CASCADE;


-- 2. CATÁLOGO DE TURNOS (cat_turnos)
CREATE TABLE cat_turnos (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    codigo text NOT NULL UNIQUE CHECK (codigo IN ('1RA', '2DA', '3RA')),
    nombre text NOT NULL,
    orden int DEFAULT 0,
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Seed de Turnos
INSERT INTO cat_turnos (codigo, nombre, orden) VALUES
('1RA', 'Primer Turno', 1),
('2DA', 'Segundo Turno', 2),
('3RA', 'Tercer Turno', 3)
ON CONFLICT (codigo) DO UPDATE SET 
    nombre = EXCLUDED.nombre,
    orden = EXCLUDED.orden;


-- 3. CATÁLOGO DE CUADRILLAS (cat_cuadrillas)
CREATE TABLE cat_cuadrillas (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre text NOT NULL, -- Ej. "Cuadrilla 5"
    
    unit_id uuid NOT NULL REFERENCES org_units(id) ON DELETE CASCADE,
    turno_id uuid NOT NULL REFERENCES cat_turnos(id) ON DELETE RESTRICT,
    supervisor_id uuid REFERENCES rh_employees(id) ON DELETE SET NULL, -- Puede ser null temporalmente
    
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 4. MIEMBROS DE CUADRILLA (cat_cuadrillas_miembros)
CREATE TABLE cat_cuadrillas_miembros (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    cuadrilla_id uuid NOT NULL REFERENCES cat_cuadrillas(id) ON DELETE CASCADE,
    empleado_id uuid NOT NULL REFERENCES rh_employees(id) ON DELETE RESTRICT,
    
    fecha_inicio date DEFAULT current_date NOT NULL,
    fecha_fin date, -- NULL indica asignación vigente
    
    -- Columna generada para facilitar queries de activos
    activo boolean GENERATED ALWAYS AS (fecha_fin IS NULL) STORED,
    
    created_at timestamptz DEFAULT now()
);

-- Indices y Constraints (Reglas de Negocio)

-- Un empleado solo puede estar en UNA cuadrilla ACTIVA a la vez
CREATE UNIQUE INDEX idx_unique_active_member 
ON cat_cuadrillas_miembros (empleado_id) 
WHERE fecha_fin IS NULL;

-- Evitar duplicados de miembro dentro de la misma cuadrilla (redundante con el anterior para activos, pero bueno para histórico si cambiara lógica)
CREATE INDEX idx_cuadrilla_miembros_cuadrilla ON cat_cuadrillas_miembros(cuadrilla_id);
CREATE INDEX idx_cuadrilla_miembros_employee ON cat_cuadrillas_miembros(empleado_id);


-- 5. SEGURIDAD (RLS)
ALTER TABLE cat_turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_cuadrillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_cuadrillas_miembros ENABLE ROW LEVEL SECURITY;

-- Políticas (Simplificadas para desarrollo, ajustar para prod)
CREATE POLICY "Public Read Turnos" ON cat_turnos FOR SELECT USING (true);
CREATE POLICY "Admin Write Turnos" ON cat_turnos FOR ALL USING (true); 

CREATE POLICY "Public Read Cuadrillas" ON cat_cuadrillas FOR SELECT USING (true);
CREATE POLICY "Admin Write Cuadrillas" ON cat_cuadrillas FOR ALL USING (true);

CREATE POLICY "Public Read Miembros" ON cat_cuadrillas_miembros FOR SELECT USING (true);
CREATE POLICY "Admin Write Miembros" ON cat_cuadrillas_miembros FOR ALL USING (true);


-- 6. PERMISOS
GRANT ALL ON TABLE cat_turnos TO anon, authenticated, postgres, service_role;
GRANT ALL ON TABLE cat_cuadrillas TO anon, authenticated, postgres, service_role;
GRANT ALL ON TABLE cat_cuadrillas_miembros TO anon, authenticated, postgres, service_role;

NOTIFY pgrst, 'reload config';

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Módulo de Cuadrillas y Turnos (Final) creado exitosamente.';
END $$;
