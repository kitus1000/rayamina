-- ==================================================================================
-- MIGRACIÓN: CATÁLOGO DE ASISTENCIAS / INCIDENCIAS
-- ==================================================================================

-- 1. Crear el nuevo catálogo de tipos de asistencias e incidencias
CREATE TABLE IF NOT EXISTS cat_asistencias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    color VARCHAR(20) DEFAULT 'bg-slate-500', -- Para usar en React/Tailwind (ej. 'bg-emerald-500', 'bg-red-500')
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS en el catálogo
ALTER TABLE cat_asistencias ENABLE ROW LEVEL SECURITY;

-- Política de acceso (simplificada)
DROP POLICY IF EXISTS "Public Access Cat Asistencias" ON cat_asistencias;
CREATE POLICY "Public Access Cat Asistencias" ON cat_asistencias FOR ALL USING (true) WITH CHECK (true);


-- 2. Insertar valores por defecto (Los que se manejaban hardcodeados + nuevos requeridos)
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


-- 3. Actualizar la tabla de Reportes Diarios (ops_daily_attendance)

-- a) Agregar la nueva columna nullable temporalmente
ALTER TABLE ops_daily_attendance 
ADD COLUMN IF NOT EXISTS asistencia_id UUID REFERENCES cat_asistencias(id);

-- b) Actualizar los registros existentes consultando el código que tenían
UPDATE ops_daily_attendance oda
SET asistencia_id = ca.id
FROM cat_asistencias ca
WHERE oda.estado_asistencia = ca.codigo;

-- Validar si hay registros sin mapear (por ejemplo 'OTRO' o 'BAJA')
-- y asignarles algo por defecto si fuese necesario. Por si acaso, si es NULL:
UPDATE ops_daily_attendance oda
SET asistencia_id = (SELECT id FROM cat_asistencias WHERE codigo = 'ASISTENCIA')
WHERE oda.asistencia_id IS NULL;


-- c) Eliminar la columna antigua y el constraint
-- Primero quitamos the CHECK constraint (nombre por defecto en supabase generalmente no es obvio si no le pusimos nombre)
-- Buscamos el nombre del constraint y lo tiramos (Usaremos DO para no fallar si no existe)
DO $$
DECLARE 
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'ops_daily_attendance'::regclass AND contype = 'c' 
    AND pg_get_constraintdef(oid) LIKE '%estado_asistencia%';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE ops_daily_attendance DROP CONSTRAINT "' || constraint_name || '"';
    END IF;
END $$;

ALTER TABLE ops_daily_attendance DROP COLUMN IF EXISTS estado_asistencia;

-- d) Hacer obligatoria la nueva columna
ALTER TABLE ops_daily_attendance 
ALTER COLUMN asistencia_id SET NOT NULL;
