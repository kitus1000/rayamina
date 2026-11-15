-- =======================================================
-- SCRIPT DE DIAGNÓSTICO - LISTAR COLUMNAS
-- =======================================================

-- Ejecuta esto y mira la pestaña "Results" (abajo a la derecha).
-- Deberías ver una lista con: id, first_name, ... unit_id, is_jefe_mina.

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'rh_employees'
ORDER BY column_name;
