-- ==================================================================================
-- MÓDULO: REPORTES DIARIOS DE OPERACIÓN (DESTAJOS) Y ASISTENCIAS
-- ==================================================================================

-- 1. CATÁLOGO DE ASISTENCIAS / INCIDENCIAS
CREATE TABLE IF NOT EXISTS cat_asistencias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    color VARCHAR(20) DEFAULT 'bg-slate-500', 
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS en el catálogo
ALTER TABLE cat_asistencias ENABLE ROW LEVEL SECURITY;

-- Política de acceso (simplificada) para cat_asistencias
DROP POLICY IF EXISTS "Public Access Cat Asistencias" ON cat_asistencias;
CREATE POLICY "Public Access Cat Asistencias" ON cat_asistencias FOR ALL USING (true) WITH CHECK (true);

-- Insertar valores por defecto en catálogo
INSERT INTO cat_asistencias (codigo, nombre, color, descripcion)
VALUES 
    ('ASISTENCIA', 'Asistencia', 'bg-emerald-500', 'El empleado se presentó a laborar normalmente.'),
    ('FALTA', 'Falta', 'bg-red-500', 'Falta injustificada.'),
    ('SUSPENSION', 'Suspensión', 'bg-orange-500', 'El empleado se encuentra suspendido.'),
    ('INCAPACIDAD', 'Incapacidad', 'bg-blue-500', 'Incapacidad por enfermedad o riesgo de trabajo.'),
    ('DESCANSO', 'Descanso', 'bg-slate-500', 'Día de descanso del empleado.'),
    ('PERMISO', 'Permiso', 'bg-yellow-500', 'Permiso con o sin goce de sueldo.'),
    ('VACACIONES', 'Vacaciones', 'bg-purple-500', 'Periodo vacacional.')
ON CONFLICT (codigo) DO UPDATE SET 
    nombre = EXCLUDED.nombre,
    color = EXCLUDED.color,
    descripcion = EXCLUDED.descripcion;


-- ==================================================================================

-- 2. CABECERA DEL REPORTE DIARIO
-- Representa la hoja de control de un turno en una ubicación específica.
CREATE TABLE IF NOT EXISTS ops_daily_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    turno_id UUID NOT NULL REFERENCES cat_turnos(id),
    cuadrilla_id UUID NOT NULL REFERENCES cat_cuadrillas(id),
    supervisor_id UUID REFERENCES rh_employees(id),
    mine_site_id UUID NOT NULL REFERENCES mine_sites(id),
    
    comentarios_supervisor TEXT,
    respuesta_jefe_mina TEXT,
    
    status TEXT DEFAULT 'BORRADOR' CHECK (status IN ('BORRADOR', 'EN_REVISION', 'APROBADO', 'CORRECCION_SOLICITADA')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ASISTENCIA Y ROLES DEL DÍA
-- Registro de quiénes se presentaron y qué rol jugaron en el turno.
CREATE TABLE IF NOT EXISTS ops_daily_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES ops_daily_reports(id) ON DELETE CASCADE,
    empleado_id UUID NOT NULL REFERENCES rh_employees(id),
    
    asistencia_id UUID NOT NULL REFERENCES cat_asistencias(id),
        
    rol_dia_id UUID REFERENCES cat_roles_operativos(id), -- Puede diferir del rol default del empleado
    observacion TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ACTIVIDADES REALIZADAS (PRODUCCIÓN)
-- Desglose de "Qué se hizo" (Concepto + Cantidad + Variables).
CREATE TABLE IF NOT EXISTS ops_report_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES ops_daily_reports(id) ON DELETE CASCADE,
    
    producto_id UUID NOT NULL REFERENCES cat_productos_mina(id),
    equipo_id UUID REFERENCES ops_equipment(id), -- Opcional, si el concepto lo requiere
    location_id UUID REFERENCES mine_locations(id), -- Frente/Rampa donde se realizó la actividad
    
    cantidad_total NUMERIC NOT NULL DEFAULT 0,
    variables_json JSONB DEFAULT '{}'::jsonb, -- Captura detallada (ej. barrenos, longitudes)
    
    observaciones TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PARTICIPANTES POR ACTIVIDAD (SPLITS)
-- Quiénes participaron en cada actividad específica y su % de crédito.
CREATE TABLE IF NOT EXISTS ops_report_personnel (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id UUID NOT NULL REFERENCES ops_report_items(id) ON DELETE CASCADE,
    empleado_id UUID NOT NULL REFERENCES rh_employees(id),
    
    porcentaje_participacion NUMERIC DEFAULT 100, -- Para destajos compartidos
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SEGURIDAD (RLS)
ALTER TABLE ops_daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_daily_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_report_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_report_personnel ENABLE ROW LEVEL SECURITY;

-- Política de Acceso Total (Dev Mode - Simplificado para evitar bloqueos durante desarrollo)
DO $$ 
DECLARE 
    t text; 
BEGIN 
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'ops_%' LOOP 
        EXECUTE format('DROP POLICY IF EXISTS "Public Access Ops" ON %I', t); 
        EXECUTE format('CREATE POLICY "Public Access Ops" ON %I FOR ALL USING (true) WITH CHECK (true)', t); 
    END LOOP; 
END $$;
