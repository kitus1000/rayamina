-- ==================================================================================
-- MIGRACIÓN: PRE-NÓMINA & COSTOS OPERATIVOS (TARIFAS Y SUELDOS BASE)
-- ==================================================================================

BEGIN;

-- 1. Agregar Sueldo Diario Base a Empleados
-- Este será el salario fijo pagadero por cada día de asistencia registrada
ALTER TABLE rh_employees ADD COLUMN IF NOT EXISTS sueldo_diario_base NUMERIC(10,2) DEFAULT 0.00;

-- 2. Agregar Tarifa de Destajo a Productos/Servicios
-- Esto es lo que se pagará por cada unidad (Metro, Tonelada, Viaje) realizada
ALTER TABLE cat_productos_mina ADD COLUMN IF NOT EXISTS tarifa_pago NUMERIC(10,2) DEFAULT 0.00;

-- 3. Asegurar que PostgREST recargue el esquema para exponer las columnas
NOTIFY pgrst, 'reload schema';

COMMIT;

DO $$ 
BEGIN 
  RAISE NOTICE 'Script de Tarifas y Sueldos ejecutado exitosamente. Columnas financieras creadas.'; 
END $$;
