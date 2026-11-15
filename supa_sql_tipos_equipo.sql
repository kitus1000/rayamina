-- Crear tabla de catálogo de tipos de equipo
CREATE TABLE IF NOT EXISTS public.cat_tipos_equipo (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    baja BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security) - Opcional pero recomendado
ALTER TABLE public.cat_tipos_equipo ENABLE ROW LEVEL SECURITY;

-- Crear política de acceso total (para desarrollo/MVP)
CREATE POLICY "Acceso total a tipos de equipo" ON public.cat_tipos_equipo
    FOR ALL USING (true) WITH CHECK (true);

-- Insertar datos iniciales (Semilla)
INSERT INTO public.cat_tipos_equipo (nombre) VALUES 
    ('JUMBO'),
    ('SCOOP'),
    ('JACKLEG'),
    ('LONGHOLE'),
    ('CAMION'),
    ('SIMBA'),
    ('AMBULANCIA'),
    ('PICKUP'),
    ('OTRO')
ON CONFLICT (nombre) DO NOTHING;

-- (Opcional) Si quieres migrar datos existentes de ops_equipment a la nueva tabla, 
-- primero asegúrate de que existen en el catálogo y luego podrías hacer un update si ops_equipment usara FK.
-- Por ahora, ops_equipment usa un string directo en 'tipo', así que funcionará transparente.
