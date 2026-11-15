-- =========================================================================================
-- RAYA MINA: PARCHE MAESTRO DE TABLAS, COLUMNAS Y COMPATIBILIDAD SQL
-- Ejecuta este script en Supabase SQL Editor para resolver al 100% las advertencias de tablas
-- y columnas faltantes en todas las pantallas.
-- =========================================================================================

-- 1. OPS_DAILY_REPORTS: Sincronizar status <-> estado y comentarios_supervisor <-> observaciones_generales
ALTER TABLE public.ops_daily_reports ADD COLUMN IF NOT EXISTS status text DEFAULT 'BORRADOR';
UPDATE public.ops_daily_reports SET status = estado WHERE status IS NULL;

ALTER TABLE public.ops_daily_reports ADD COLUMN IF NOT EXISTS comentarios_supervisor text;
UPDATE public.ops_daily_reports SET comentarios_supervisor = observaciones_generales WHERE comentarios_supervisor IS NULL;

-- 2. RH_EMPLOYEES: Añadir rol_operativo_default_id <-> role_id
ALTER TABLE public.rh_employees ADD COLUMN IF NOT EXISTS rol_operativo_default_id uuid REFERENCES public.cat_roles_operativos(id);
UPDATE public.rh_employees SET rol_operativo_default_id = role_id WHERE rol_operativo_default_id IS NULL;

-- 3. CAT_CUADRILLAS_MIEMBROS: Añadir activo boolean
ALTER TABLE public.cat_cuadrillas_miembros ADD COLUMN IF NOT EXISTS activo boolean DEFAULT true;
UPDATE public.cat_cuadrillas_miembros SET activo = true WHERE activo IS NULL;

-- 4. OPS_DAILY_ATTENDANCE: Añadir observacion <-> observaciones, asistencia_id <-> asistencia_tipo_id, rol_dia_id <-> rol_asignado_id
ALTER TABLE public.ops_daily_attendance ADD COLUMN IF NOT EXISTS observacion text;
UPDATE public.ops_daily_attendance SET observacion = observaciones WHERE observacion IS NULL;

ALTER TABLE public.ops_daily_attendance ADD COLUMN IF NOT EXISTS asistencia_id uuid REFERENCES public.cat_asistencias(id) ON DELETE SET NULL;
UPDATE public.ops_daily_attendance SET asistencia_id = asistencia_tipo_id WHERE asistencia_id IS NULL;

ALTER TABLE public.ops_daily_attendance ADD COLUMN IF NOT EXISTS rol_dia_id uuid REFERENCES public.cat_roles_operativos(id) ON DELETE SET NULL;
UPDATE public.ops_daily_attendance SET rol_dia_id = rol_asignado_id WHERE rol_dia_id IS NULL;

-- 5. OPS_REPORT_ITEMS: Añadir variables_json <-> variables_capturadas
ALTER TABLE public.ops_report_items ADD COLUMN IF NOT EXISTS variables_json jsonb DEFAULT '{}'::jsonb;
UPDATE public.ops_report_items SET variables_json = variables_capturadas WHERE variables_json IS NULL;

-- 6. OPS_REPORT_PERSONNEL: Añadir item_id <-> report_item_id
ALTER TABLE public.ops_report_personnel ADD COLUMN IF NOT EXISTS item_id uuid REFERENCES public.ops_report_items(id) ON DELETE CASCADE;
UPDATE public.ops_report_personnel SET item_id = report_item_id WHERE item_id IS NULL;

-- 7. OPS_PLAN_ITEMS: Añadir cantidad_proyectada <-> meta_proyectada
ALTER TABLE public.ops_plan_items ADD COLUMN IF NOT EXISTS cantidad_proyectada numeric(12,2) DEFAULT 0;
UPDATE public.ops_plan_items SET cantidad_proyectada = meta_proyectada WHERE cantidad_proyectada IS NULL;

-- 8. ORG_COMPANIES: Añadir nombre_comercial <-> razon_social
ALTER TABLE public.org_companies ADD COLUMN IF NOT EXISTS nombre_comercial text;
UPDATE public.org_companies SET nombre_comercial = razon_social WHERE nombre_comercial IS NULL;

-- 9. ORG_UNITS: Añadir nombre <-> nombre_unidad
ALTER TABLE public.org_units ADD COLUMN IF NOT EXISTS nombre text;
UPDATE public.org_units SET nombre = nombre_unidad WHERE nombre IS NULL;

-- 10. CREAR TABLA BLOG_TAREAS (Requerida por el módulo de Chat / Tareas)
CREATE TABLE IF NOT EXISTS public.blog_tareas (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    titulo text NOT NULL,
    descripcion text,
    estado text DEFAULT 'PENDIENTE',
    prioridad text DEFAULT 'MEDIA',
    asignado_a uuid REFERENCES public.sys_users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 11. CREAR TABLA TEST_CONNECTIVITY_V1 (Requerida por el módulo de Debug)
CREATE TABLE IF NOT EXISTS public.test_connectivity_v1 (
    id serial PRIMARY KEY,
    test_message text DEFAULT 'Conexión exitosa a Supabase RAYA MINA',
    tested_at timestamptz DEFAULT now()
);
INSERT INTO public.test_connectivity_v1 (test_message) 
SELECT 'Conexión verificada OK' 
WHERE NOT EXISTS (SELECT 1 FROM public.test_connectivity_v1);

-- 12. CREAR VISTA DEBUG_EMPLOYEES_VIEW (Requerida por el módulo de Debug)
CREATE OR REPLACE VIEW public.debug_employees_view AS
SELECT 
    e.id,
    e.employee_code,
    e.numero_empleado,
    e.first_name,
    e.last_name,
    p.nombre AS puesto_nombre,
    r.nombre AS rol_nombre,
    m.nombre_mina,
    e.sueldo_diario_base,
    e.status
FROM public.rh_employees e
LEFT JOIN public.cat_puestos p ON e.puesto_id = p.id
LEFT JOIN public.cat_roles_operativos r ON COALESCE(e.rol_operativo_default_id, e.role_id) = r.id
LEFT JOIN public.mine_sites m ON e.mine_id = m.id;

-- 13. TRIGGERS AUTOMÁTICOS DE SINCRONIZACIÓN BI-DIRECCIONAL
CREATE OR REPLACE FUNCTION sync_ops_daily_reports_fields()
RETURNS trigger AS $$
BEGIN
    IF NEW.status IS NOT NULL AND NEW.estado IS NULL THEN
        NEW.estado := NEW.status;
    ELSIF NEW.estado IS NOT NULL AND NEW.status IS NULL THEN
        NEW.status := NEW.estado;
    ELSIF NEW.status IS NOT NULL AND NEW.estado IS NOT NULL THEN
        NEW.estado := NEW.status;
    END IF;

    IF NEW.comentarios_supervisor IS NOT NULL AND NEW.observaciones_generales IS NULL THEN
        NEW.observaciones_generales := NEW.comentarios_supervisor;
    ELSIF NEW.observaciones_generales IS NOT NULL AND NEW.comentarios_supervisor IS NULL THEN
        NEW.comentarios_supervisor := NEW.observaciones_generales;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_ops_daily_reports ON public.ops_daily_reports;
CREATE TRIGGER trg_sync_ops_daily_reports
BEFORE INSERT OR UPDATE ON public.ops_daily_reports
FOR EACH ROW EXECUTE FUNCTION sync_ops_daily_reports_fields();

-- Recargar caché de esquema de PostgREST
NOTIFY pgrst, 'reload schema';
