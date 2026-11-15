-- =========================================================================================
-- SOLUCIÓN DEFINITIVA A 'schema reportes' / DUPLICIDAD DE RELACIONES (PGRST201)
-- Ejecuta este script en tu SQL Editor de Supabase para eliminar las restricciones ambiguas.
-- Las columnas (asistencia_id, rol_dia_id, rol_operativo_default_id, item_id) permanecerán,
-- pero se retira la restricción foránea duplicada para que PostgREST enlace las tablas automáticamente.
-- =========================================================================================

ALTER TABLE public.ops_daily_attendance DROP CONSTRAINT IF EXISTS ops_daily_attendance_asistencia_id_fkey;
ALTER TABLE public.ops_daily_attendance DROP CONSTRAINT IF EXISTS ops_daily_attendance_rol_dia_id_fkey;
ALTER TABLE public.rh_employees DROP CONSTRAINT IF EXISTS rh_employees_rol_operativo_default_id_fkey;
ALTER TABLE public.ops_report_personnel DROP CONSTRAINT IF EXISTS ops_report_personnel_item_id_fkey;

-- Recargar el esquema en PostgREST
NOTIFY pgrst, 'reload schema';
