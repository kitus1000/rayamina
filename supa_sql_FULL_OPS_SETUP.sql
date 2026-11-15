-- ==================================================================================
-- SCRIPT DE REPARACI"N: REPORTES DIARIOS Y ROLES DE EMPLEADOS
-- ==================================================================================
-- Instrucciones:
-- Copie y pegue este contenido en el Editor SQL de Supabase y ejecute.
-- Esto crear las tablas faltantes y asegurar que los empleados tengan columna de rol.

BEGIN;

-- 1. ASEGURAR COLUMNAS EN EMPLEADOS
-- Verifica si falta la columna o los flags de mando
DO $$ 
BEGIN
    -- Rol Operativo Default
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_employees' AND column_name = 'rol_operativo_default_id') THEN
        ALTER TABLE rh_employees ADD COLUMN rol_operativo_default_id uuid REFERENCES cat_roles_operativos(id);
    END IF;

    -- Flag Supervisor
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_employees' AND column_name = 'is_supervisor') THEN
        ALTER TABLE rh_employees ADD COLUMN is_supervisor BOOLEAN DEFAULT false;
    END IF;

    -- Flag Jefe Mina
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_employees' AND column_name = 'is_jefe_mina') THEN
        ALTER TABLE rh_employees ADD COLUMN is_jefe_mina BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. CREAR TABLAS DE REPORTES (Si no existen)

-- A. HEADER
CREATE TABLE IF NOT EXISTS ops_daily_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    turno_id UUID NOT NULL REFERENCES cat_turnos(id),
    cuadrilla_id UUID NOT NULL REFERENCES cat_cuadrillas(id),
    supervisor_id UUID NOT NULL REFERENCES rh_employees(id),
    mine_site_id UUID NOT NULL REFERENCES mine_sites(id),
    location_id UUID NOT NULL REFERENCES mine_locations(id),
    comentarios_supervisor TEXT,
    respuesta_jefe_mina TEXT,
    status TEXT DEFAULT 'BORRADOR' CHECK (status IN ('BORRADOR', 'EN_REVISION', 'APROBADO', 'CORRECCION_SOLICITADA')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- B. ASISTENCIA
CREATE TABLE IF NOT EXISTS ops_daily_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES ops_daily_reports(id) ON DELETE CASCADE,
    empleado_id UUID NOT NULL REFERENCES rh_employees(id),
    estado_asistencia TEXT NOT NULL DEFAULT 'ASISTENCIA' CHECK (estado_asistencia IN ('ASISTENCIA', 'FALTA', 'PERMISO', 'INCAPACIDAD', 'VACACIONES', 'SUSPENDIDO', 'BAJA', 'OTRO')),
    rol_dia_id UUID REFERENCES cat_roles_operativos(id),
    observacion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- C. ITEMS DE REPORTE (Produccin)
CREATE TABLE IF NOT EXISTS ops_report_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES ops_daily_reports(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES cat_productos_mina(id),
    equipo_id UUID REFERENCES ops_equipment(id),
    cantidad_total NUMERIC NOT NULL DEFAULT 0,
    variables_json JSONB DEFAULT '{}'::jsonb,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- D. PERSONAL POR ITEM (Split)
CREATE TABLE IF NOT EXISTS ops_report_personnel (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id UUID NOT NULL REFERENCES ops_report_items(id) ON DELETE CASCADE,
    empleado_id UUID NOT NULL REFERENCES rh_employees(id),
    porcentaje_participacion NUMERIC DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PERMISOS (Developer Access)
ALTER TABLE ops_daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_daily_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_report_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_report_personnel ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
    t text; 
BEGIN 
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'ops_daily_%' OR tablename LIKE 'ops_report_%' LOOP 
        EXECUTE format('DROP POLICY IF EXISTS "Public Access Ops" ON %I', t); 
        EXECUTE format('CREATE POLICY "Public Access Ops" ON %I FOR ALL USING (true) WITH CHECK (true)', t); 
    END LOOP; 
END $$;

-- 4. REFRESCAR SCHEMA CACHE
NOTIFY pgrst, 'reload config';

COMMIT;
