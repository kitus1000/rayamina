-- check_units.sql
-- Verificar si hay unidades y si son visibles

SELECT COUNT(*) as total_units FROM org_units;

SELECT * FROM org_units LIMIT 5;

-- Verificar permisos RLS
SELECT * FROM org_units WHERE true;
