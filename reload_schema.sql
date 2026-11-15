-- Este comando fuerza a Supabase (PostgREST) a recargar su configuración
-- y detectar las nuevas tablas creadas.

NOTIFY pgrst, 'reload config';

-- Si esto no funciona, sugerimos reiniciar el proyecto desde el Dashboard:
-- Settings -> General -> Restart Project
