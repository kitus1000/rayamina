-- PATCH: Asegurar columna uso_operativo en ops_equipment

DO $$ 
BEGIN
    -- 1. Agregar columna si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ops_equipment' AND column_name = 'uso_operativo') THEN
        ALTER TABLE ops_equipment ADD COLUMN uso_operativo text DEFAULT 'NO_OPERATIVO';
        -- Agregar constraint de validación
        ALTER TABLE ops_equipment ADD CONSTRAINT check_uso_operativo 
        CHECK (uso_operativo IN ('PERFORACION', 'FLETE', 'SERVICIOS_OBRA_CIVIL', 'NO_OPERATIVO', 'OTROS'));
    END IF;
END $$;

-- 2. Recargar caché de esquema (Importante para PostgREST)
NOTIFY pgrst, 'reload config';
