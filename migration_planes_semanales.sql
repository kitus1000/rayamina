-- ==================================================================================
-- MIGRACIÓN: PLANEACIÓN SEMANAL VS EJECUCIÓN (CENTRO DE CONTROL)
-- ==================================================================================

BEGIN;

-- 1. Cabecera del Plan Semanal (Un plan rige la semana operativa actual)
CREATE TABLE IF NOT EXISTS ops_planes_semanales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado TEXT DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'CERRADO')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Restricción para evitar empalme de semanas activas (solo puede haber una por fechas)
    UNIQUE(fecha_inicio, fecha_fin)
);

-- 2. Detalles del Plan (Metas de Producción por cada Actividad/Producto)
CREATE TABLE IF NOT EXISTS ops_plan_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id UUID REFERENCES ops_planes_semanales(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES cat_productos_mina(id) ON DELETE CASCADE,
    cantidad_proyectada NUMERIC(15,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Un producto solo puede aparecer una vez por plan
    UNIQUE(plan_id, producto_id)
);

-- 3. Seguridad RLS
ALTER TABLE ops_planes_semanales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Planes" ON ops_planes_semanales;
CREATE POLICY "Public Planes" ON ops_planes_semanales FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE ops_plan_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Plan Items" ON ops_plan_items;
CREATE POLICY "Public Plan Items" ON ops_plan_items FOR ALL USING (true) WITH CHECK (true);

-- Permisos
GRANT ALL ON TABLE ops_planes_semanales TO anon, authenticated, postgres, service_role;
GRANT ALL ON TABLE ops_plan_items TO anon, authenticated, postgres, service_role;

-- 4. Notificar a PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;

DO $$ 
BEGIN 
  RAISE NOTICE 'Migración de Planeación Semanal ejecutada con éxito.'; 
END $$;
