-- ==================================================================================
-- PASO 2: POBLADO DE DATOS (Ejecutar DESPUÉS de FIX_CONSTRAINTS)
-- ==================================================================================

BEGIN;

-- 1. ORGANIZACIÓN (Unidades y Minas)
WITH 
company AS (
    INSERT INTO org_companies (razon_social, rfc) 
    VALUES ('Minera del Norte S.A. de C.V.', 'MNO800101XYZ') 
    ON CONFLICT (rfc) DO UPDATE SET razon_social = EXCLUDED.razon_social
    RETURNING id
),
units AS (
    INSERT INTO org_units (company_id, nombre_unidad, codigo)
    SELECT id, 'Unidad Charcas', 'CHA' FROM company
    UNION ALL
    SELECT id, 'Unidad San Martín', 'SAN' FROM company
    ON CONFLICT (codigo) DO UPDATE SET nombre_unidad = EXCLUDED.nombre_unidad
    RETURNING id, nombre_unidad
),
mines AS (
    INSERT INTO mine_sites (unit_id, nombre_mina)
    SELECT id, 'Mina Tiro General' FROM units WHERE nombre_unidad = 'Unidad Charcas'
    UNION ALL
    SELECT id, 'Mina Satélite' FROM units WHERE nombre_unidad = 'Unidad San Martín'
    ON CONFLICT DO NOTHING
    RETURNING id, nombre_mina, unit_id
),
locations AS (
    INSERT INTO mine_locations (site_id, nombre, codigo, tipo, labor_factor)
    SELECT id, 'Nivel 10 - Frente 340', 'N10-F340', 'FRENTE', 1.0 FROM mines WHERE nombre_mina = 'Mina Tiro General'
    UNION ALL
    SELECT id, 'Rampa Negativa 4', 'R-NEG-4', 'RAMPA', 1.2 FROM mines WHERE nombre_mina = 'Mina Tiro General'
    UNION ALL
    SELECT id, 'Contrapozo Ventilación', 'CP-VENT', 'CONTRAPOZO', 1.5 FROM mines WHERE nombre_mina = 'Mina Satélite'
    UNION ALL
    SELECT id, 'Taller Mecánico N8', 'TALLER-N8', 'OBRA_CIVIL', 1.0 FROM mines WHERE nombre_mina = 'Mina Tiro General'
    ON CONFLICT DO NOTHING
    RETURNING id, nombre
)

-- 2. PUESTOS Y ROLES
, puestos AS (
    INSERT INTO cat_puestos (nombre, tipo_personal) VALUES
    ('Gerente de Unidad', 'EJECUTIVO'),
    ('Jefe de Mina', 'EJECUTIVO'),
    ('Supervisor de Turno', 'EMPLEADO'),
    ('Operador Especializado', 'OPERATIVO'),
    ('Oficial', 'OPERATIVO'),
    ('Ayudante General', 'OPERATIVO')
    ON CONFLICT (nombre) DO UPDATE SET tipo_personal = EXCLUDED.tipo_personal
    RETURNING id, nombre
),
roles_ops AS (
    INSERT INTO cat_roles_operativos (nombre, categoria) VALUES
    ('Jumboista', 'PERFORACION'),
    ('Scooptram', 'ACARREO'),
    ('Perforista Jackleg', 'PERFORACION'),
    ('Ayudante Perforista', 'AYUDANTE'),
    ('Chofer Camion', 'ACARREO'),
    ('Oficial Obra Civil', 'OBRA_CIVIL'),
    ('Ayudante Obra Civil', 'AYUDANTE'),
    ('Oficial Servicios', 'SERVICIOS'),
    ('Ayudante Servicios', 'AYUDANTE')
    ON CONFLICT (nombre) DO UPDATE SET categoria = EXCLUDED.categoria
    RETURNING id, nombre
)

-- 3. EMPLEADOS
, employees AS (
    INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, is_supervisor, is_jefe_mina, status)
    
    -- --- MANDO ---
    SELECT 'Roberto', 'Gómez (Jefe)', 'J-001', p.id, NULL::uuid, u.id, false, true, 'ACTIVE'
    FROM puestos p, units u WHERE p.nombre = 'Jefe de Mina' AND u.nombre_unidad = 'Unidad Charcas'
    UNION ALL
    SELECT 'Juan', 'Pérez (Sup A)', 'S-001', p.id, NULL::uuid, u.id, true, false, 'ACTIVE'
    FROM puestos p, units u WHERE p.nombre = 'Supervisor de Turno' AND u.nombre_unidad = 'Unidad Charcas'
    UNION ALL
    SELECT 'Carlos', 'López (Sup B)', 'S-002', p.id, NULL::uuid, u.id, true, false, 'ACTIVE'
    FROM puestos p, units u WHERE p.nombre = 'Supervisor de Turno' AND u.nombre_unidad = 'Unidad Charcas'
    UNION ALL
    SELECT 'Miguel', 'Angel (Sup C)', 'S-003', p.id, NULL::uuid, u.id, true, false, 'ACTIVE'
    FROM puestos p, units u WHERE p.nombre = 'Supervisor de Turno' AND u.nombre_unidad = 'Unidad Charcas'
    UNION ALL
    SELECT 'Luis', 'Torres (Sup D)', 'S-004', p.id, NULL::uuid, u.id, true, false, 'ACTIVE'
    FROM puestos p, units u WHERE p.nombre = 'Supervisor de Turno' AND u.nombre_unidad = 'Unidad Charcas'

    -- --- OPERATIVOS CUADRILLA A (DESARROLLO JUMBO) ---
    UNION ALL
    SELECT 'Pedro', 'Picapiedra', 'OP-J01', p.id, r.id, u.id, false, false, 'ACTIVE'
    FROM puestos p, roles_ops r, units u WHERE p.nombre = 'Operador Especializado' AND r.nombre = 'Jumboista' AND u.nombre_unidad = 'Unidad Charcas'
    UNION ALL
    SELECT 'Pablo', 'Mármol', 'OP-S01', p.id, r.id, u.id, false, false, 'ACTIVE'
    FROM puestos p, roles_ops r, units u WHERE p.nombre = 'Operador Especializado' AND r.nombre = 'Scooptram' AND u.nombre_unidad = 'Unidad Charcas'
    UNION ALL
    SELECT 'Dino', 'Sauri', 'AY-001', p.id, r.id, u.id, false, false, 'ACTIVE'
    FROM puestos p, roles_ops r, units u WHERE p.nombre = 'Ayudante General' AND r.nombre = 'Ayudante Perforista' AND u.nombre_unidad = 'Unidad Charcas'
    UNION ALL
    SELECT 'Bamm', 'Bamm', 'AY-002', p.id, r.id, u.id, false, false, 'ACTIVE'
    FROM puestos p, roles_ops r, units u WHERE p.nombre = 'Ayudante General' AND r.nombre = 'Ayudante Perforista' AND u.nombre_unidad = 'Unidad Charcas'

    -- --- OPERATIVOS CUADRILLA B (DESARROLLO CONVENCIONAL/JACKLEG) ---
    UNION ALL
    SELECT 'Hugo', 'Paco', 'OP-JK1', p.id, r.id, u.id, false, false, 'ACTIVE'
    FROM puestos p, roles_ops r, units u WHERE p.nombre = 'Oficial' AND r.nombre = 'Perforista Jackleg' AND u.nombre_unidad = 'Unidad Charcas'
    UNION ALL
    SELECT 'Luis', 'Duck', 'OP-JK2', p.id, r.id, u.id, false, false, 'ACTIVE'
    FROM puestos p, roles_ops r, units u WHERE p.nombre = 'Oficial' AND r.nombre = 'Perforista Jackleg' AND u.nombre_unidad = 'Unidad Charcas'
    UNION ALL
    SELECT 'Donald', 'Duck', 'AY-003', p.id, r.id, u.id, false, false, 'ACTIVE'
    FROM puestos p, roles_ops r, units u WHERE p.nombre = 'Ayudante General' AND r.nombre = 'Ayudante Perforista' AND u.nombre_unidad = 'Unidad Charcas'

    -- --- OPERATIVOS CUADRILLA C (ACARREO Y SERVICIOS) ---
    UNION ALL
    SELECT 'Toretto', 'Fast', 'CH-001', p.id, r.id, u.id, false, false, 'ACTIVE'
    FROM puestos p, roles_ops r, units u WHERE p.nombre = 'Operador Especializado' AND r.nombre = 'Chofer Camion' AND u.nombre_unidad = 'Unidad Charcas'
    UNION ALL
    SELECT 'Brian', 'Oconner', 'CH-002', p.id, r.id, u.id, false, false, 'ACTIVE'
    FROM puestos p, roles_ops r, units u WHERE p.nombre = 'Operador Especializado' AND r.nombre = 'Chofer Camion' AND u.nombre_unidad = 'Unidad Charcas'
    UNION ALL
    SELECT 'Han', 'Seoul', 'OF-S01', p.id, r.id, u.id, false, false, 'ACTIVE'
    FROM puestos p, roles_ops r, units u WHERE p.nombre = 'Oficial' AND r.nombre = 'Oficial Servicios' AND u.nombre_unidad = 'Unidad Charcas'
    UNION ALL
    SELECT 'Roman', 'Pierce', 'AY-S01', p.id, r.id, u.id, false, false, 'ACTIVE'
    FROM puestos p, roles_ops r, units u WHERE p.nombre = 'Ayudante General' AND r.nombre = 'Ayudante Servicios' AND u.nombre_unidad = 'Unidad Charcas'

    -- --- OPERATIVOS CUADRILLA D (OBRA CIVIL) ---
    UNION ALL
    SELECT 'Bob', 'Constructor', 'OC-001', p.id, r.id, u.id, false, false, 'ACTIVE'
    FROM puestos p, roles_ops r, units u WHERE p.nombre = 'Oficial' AND r.nombre = 'Oficial Obra Civil' AND u.nombre_unidad = 'Unidad Charcas'
    UNION ALL
    SELECT 'Wendy', 'Worker', 'AY-OC1', p.id, r.id, u.id, false, false, 'ACTIVE'
    FROM puestos p, roles_ops r, units u WHERE p.nombre = 'Ayudante General' AND r.nombre = 'Ayudante Obra Civil' AND u.nombre_unidad = 'Unidad Charcas'
    UNION ALL
    SELECT 'Scoop', 'Machine', 'AY-OC2', p.id, r.id, u.id, false, false, 'ACTIVE'
    FROM puestos p, roles_ops r, units u WHERE p.nombre = 'Ayudante General' AND r.nombre = 'Ayudante Obra Civil' AND u.nombre_unidad = 'Unidad Charcas'
    
    ON CONFLICT (employee_code) DO NOTHING
    RETURNING id, first_name, employee_code, is_supervisor
)

-- 4. EQUIPOS (Maquinaria)
, equipment AS (
    INSERT INTO ops_equipment (clave, tipo, marca, modelo, status, unit_id)
    SELECT 'DD-311-01', 'JUMBO', 'Sandvik', 'DD311', 'DISPONIBLE', u.id FROM units u WHERE u.nombre_unidad = 'Unidad Charcas'
    UNION ALL
    SELECT 'DD-421-02', 'JUMBO', 'Sandvik', 'DD421', 'MANTENIMIENTO', u.id FROM units u WHERE u.nombre_unidad = 'Unidad Charcas'
    UNION ALL
    SELECT 'ST-7-01', 'SCOOP', 'Epiroc', 'ST7', 'DISPONIBLE', u.id FROM units u WHERE u.nombre_unidad = 'Unidad Charcas'
    UNION ALL
    SELECT 'ST-1030-02', 'SCOOP', 'Epiroc', 'ST1030', 'DISPONIBLE', u.id FROM units u WHERE u.nombre_unidad = 'Unidad Charcas'
    UNION ALL
    SELECT 'MT-436-01', 'CAMION', 'Epiroc', 'MT436', 'DISPONIBLE', u.id FROM units u WHERE u.nombre_unidad = 'Unidad Charcas'
    UNION ALL
    SELECT 'VOL-05', 'CAMION', 'Volvo', 'FMX', 'DISPONIBLE', u.id FROM units u WHERE u.nombre_unidad = 'Unidad Charcas'
    UNION ALL
    SELECT 'JL-100', 'JACKLEG', 'Seco', 'S250', 'DISPONIBLE', u.id FROM units u WHERE u.nombre_unidad = 'Unidad Charcas'
    UNION ALL
    SELECT 'JL-101', 'JACKLEG', 'Seco', 'S250', 'DISPONIBLE', u.id FROM units u WHERE u.nombre_unidad = 'Unidad Charcas'
    UNION ALL
    SELECT 'SERV-01', 'UTILITARIO', 'Toyota', 'Hilux', 'DISPONIBLE', u.id FROM units u WHERE u.nombre_unidad = 'Unidad Charcas'
    ON CONFLICT (clave) DO NOTHING
)

-- 5. CUADRILLAS
, crews AS (
    INSERT INTO cat_cuadrillas (nombre, supervisor_id, turno_id, unit_id, activo)
    SELECT 
        'Cuadrilla A (Jumbo) - ' || e.first_name, 
        e.id, 
        (SELECT id FROM cat_turnos WHERE codigo = '1RA' LIMIT 1), 
        (SELECT id FROM org_units WHERE nombre_unidad = 'Unidad Charcas' LIMIT 1),
        true
    FROM employees e WHERE e.employee_code = 'S-001'
    UNION ALL
    SELECT 
        'Cuadrilla B (Jackleg) - ' || e.first_name, 
        e.id, 
        (SELECT id FROM cat_turnos WHERE codigo = '2DA' LIMIT 1), 
        (SELECT id FROM org_units WHERE nombre_unidad = 'Unidad Charcas' LIMIT 1),
        true
    FROM employees e WHERE e.employee_code = 'S-002'
    UNION ALL
    SELECT 
        'Cuadrilla C (Acarreo) - ' || e.first_name, 
        e.id, 
        (SELECT id FROM cat_turnos WHERE codigo = '3RA' LIMIT 1), 
        (SELECT id FROM org_units WHERE nombre_unidad = 'Unidad Charcas' LIMIT 1),
        true
    FROM employees e WHERE e.employee_code = 'S-003'
    UNION ALL
    SELECT 
        'Cuadrilla D (Civil) - ' || e.first_name, 
        e.id, 
        (SELECT id FROM cat_turnos WHERE codigo = '1RA' LIMIT 1), 
        (SELECT id FROM org_units WHERE nombre_unidad = 'Unidad Charcas' LIMIT 1),
        true
    FROM employees e WHERE e.employee_code = 'S-004'

    ON CONFLICT DO NOTHING
    RETURNING id, supervisor_id
)

-- 6. ASIGNACIÓN DE MIEMBROS
INSERT INTO cat_cuadrillas_miembros (cuadrilla_id, empleado_id, fecha_inicio)
-- Cuadrilla A (Juan - S-001)
SELECT c.id, e.id, CURRENT_DATE FROM crews c, employees e 
WHERE c.supervisor_id = (SELECT id FROM employees WHERE employee_code = 'S-001') 
AND e.employee_code IN ('OP-J01', 'OP-S01', 'AY-001', 'AY-002')
UNION ALL
-- Cuadrilla B (Carlos - S-002)
SELECT c.id, e.id, CURRENT_DATE FROM crews c, employees e 
WHERE c.supervisor_id = (SELECT id FROM employees WHERE employee_code = 'S-002') 
AND e.employee_code IN ('OP-JK1', 'OP-JK2', 'AY-003')
UNION ALL
-- Cuadrilla C (Miguel - S-003)
SELECT c.id, e.id, CURRENT_DATE FROM crews c, employees e 
WHERE c.supervisor_id = (SELECT id FROM employees WHERE employee_code = 'S-003') 
AND e.employee_code IN ('CH-001', 'CH-002', 'OF-S01', 'AY-S01')
UNION ALL
-- Cuadrilla D (Luis - S-004)
SELECT c.id, e.id, CURRENT_DATE FROM crews c, employees e 
WHERE c.supervisor_id = (SELECT id FROM employees WHERE employee_code = 'S-004') 
AND e.employee_code IN ('OC-001', 'AY-OC1', 'AY-OC2');


COMMIT;
