-- ==================================================================================
-- SCRIPT FINAL: CREACIÓN DE TABLAS DE CONFIGURACIÓN Y SEMANAS
-- ==================================================================================
-- Por favor ejecuta este script completo en Supabase SQL Editor

-- 1. Crear tabla de configuración global (sys_config)
CREATE TABLE IF NOT EXISTS sys_config (
    key_name TEXT PRIMARY KEY,
    value_json JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar configuración por defecto para cierre de semanas (mínimo 5, máximo 7 días)
INSERT INTO sys_config (key_name, value_json, description)
VALUES (
    'week_close_rules',
    '{"min_days": 5, "max_days": 7}',
    'Reglas para permitir el cierre de una semana operativa agrupando reportes diarios'
) ON CONFLICT (key_name) DO NOTHING;

-- 2. Crear tabla de Semanas Operativas (ops_semanas)
CREATE TABLE IF NOT EXISTS ops_semanas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,          -- Ej. "Semana 34 - 2024"
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado TEXT DEFAULT 'CERRADA' CHECK (estado IN ('ABIERTA', 'CERRADA')),
    cerrado_por UUID REFERENCES rh_employees(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Vincular los reportes diarios a una semana (ESTA ES LA COLUMNA QUE FALTA)
ALTER TABLE ops_daily_reports ADD COLUMN IF NOT EXISTS semana_id UUID REFERENCES ops_semanas(id);

-- 4. Seguridad de Vistas RLS
ALTER TABLE sys_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Sys Config" ON sys_config;
CREATE POLICY "Public Sys Config" ON sys_config FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE ops_semanas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Ops Semanas" ON ops_semanas;
CREATE POLICY "Public Ops Semanas" ON ops_semanas FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON TABLE sys_config TO anon, authenticated, postgres, service_role;
GRANT ALL ON TABLE ops_semanas TO anon, authenticated, postgres, service_role;

-- 5. Recargar la API de Supabase para que reconozca los nuevos campos
NOTIFY pgrst, 'reload schema';
