-- ==================================================================================
-- MÓDULO: BLOG DE TAREAS Y COMUNICACIÓN MINA
-- Copia y pega este código en tu Supabase SQL Editor y presiona RUN.
-- ==================================================================================

-- 1. Eliminar la versión previa si existía con columnas diferentes
DROP TABLE IF EXISTS public.blog_tareas CASCADE;

-- 2. Asegurar campos en sys_users
ALTER TABLE public.sys_users 
ADD COLUMN IF NOT EXISTS nickname VARCHAR(100),
ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255);

-- 3. Crear la tabla blog_tareas con la relación author_id exacta
CREATE TABLE public.blog_tareas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    author_id UUID NOT NULL REFERENCES public.sys_users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    
    -- Campos para Tareas Operativas
    is_task BOOLEAN DEFAULT false,
    task_status VARCHAR(20) CHECK (task_status IN ('PENDING', 'COMPLETED', 'REJECTED')),
    resolved_by UUID REFERENCES public.sys_users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    
    -- Metadatos
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Habilitar Seguridad por Fila (RLS)
ALTER TABLE public.blog_tareas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Blog Tareas" ON public.blog_tareas;
CREATE POLICY "Public Access Blog Tareas" ON public.blog_tareas FOR ALL USING (true) WITH CHECK (true);

-- 5. Habilitar Tiempo Real (Realtime)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'blog_tareas'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE blog_tareas;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Realtime ya configurado.';
END $$;

-- 6. Recargar esquema PostgREST
NOTIFY pgrst, 'reload schema';
