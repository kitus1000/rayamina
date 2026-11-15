-- ==================================================================================
-- SCRIPT EXPANDIDO (~40 EMPLEADOS): (1 Jefe, 2 Super, 37 Operativos)
-- ==================================================================================
-- Este script:
-- 1. Asegura Catálogos (Puestos, Roles).
-- 2. Inserta 1 Jefe de Mina y 2 Supervisores ESPECÍFICOS.
-- 3. Inserta ~37 Operativos distribuidos en 4 Cuadrillas (Jumbo, Jackleg, Acarreo, Civil).

BEGIN;

-- 1. ASEGURAR PUESTOS Y ROLES (Sin error si ya existen)
INSERT INTO cat_puestos (nombre, tipo_personal)
SELECT 'Jefe de Mina', 'EJECUTIVO' WHERE NOT EXISTS (SELECT 1 FROM cat_puestos WHERE nombre = 'Jefe de Mina');

INSERT INTO cat_puestos (nombre, tipo_personal)
SELECT 'Supervisor de Turno', 'EMPLEADO' WHERE NOT EXISTS (SELECT 1 FROM cat_puestos WHERE nombre = 'Supervisor de Turno');

INSERT INTO cat_puestos (nombre, tipo_personal)
SELECT 'Operador Especializado', 'OPERATIVO' WHERE NOT EXISTS (SELECT 1 FROM cat_puestos WHERE nombre = 'Operador Especializado');

INSERT INTO cat_puestos (nombre, tipo_personal)
SELECT 'Oficial', 'OPERATIVO' WHERE NOT EXISTS (SELECT 1 FROM cat_puestos WHERE nombre = 'Oficial');

INSERT INTO cat_puestos (nombre, tipo_personal)
SELECT 'Ayudante General', 'OPERATIVO' WHERE NOT EXISTS (SELECT 1 FROM cat_puestos WHERE nombre = 'Ayudante General');

-- Roles Operativos
INSERT INTO cat_roles_operativos (nombre, categoria)
SELECT 'Jumboista', 'PERFORACION' WHERE NOT EXISTS (SELECT 1 FROM cat_roles_operativos WHERE nombre = 'Jumboista');

INSERT INTO cat_roles_operativos (nombre, categoria)
SELECT 'Scooptram', 'ACARREO' WHERE NOT EXISTS (SELECT 1 FROM cat_roles_operativos WHERE nombre = 'Scooptram');

INSERT INTO cat_roles_operativos (nombre, categoria)
SELECT 'Perforista Jackleg', 'PERFORACION' WHERE NOT EXISTS (SELECT 1 FROM cat_roles_operativos WHERE nombre = 'Perforista Jackleg');

INSERT INTO cat_roles_operativos (nombre, categoria)
SELECT 'Ayudante Perforista', 'AYUDANTE' WHERE NOT EXISTS (SELECT 1 FROM cat_roles_operativos WHERE nombre = 'Ayudante Perforista');

INSERT INTO cat_roles_operativos (nombre, categoria)
SELECT 'Chofer Camion', 'ACARREO' WHERE NOT EXISTS (SELECT 1 FROM cat_roles_operativos WHERE nombre = 'Chofer Camion');

INSERT INTO cat_roles_operativos (nombre, categoria)
SELECT 'Oficial Obra Civil', 'OBRA_CIVIL' WHERE NOT EXISTS (SELECT 1 FROM cat_roles_operativos WHERE nombre = 'Oficial Obra Civil');

INSERT INTO cat_roles_operativos (nombre, categoria)
SELECT 'Ayudante Obra Civil', 'AYUDANTE' WHERE NOT EXISTS (SELECT 1 FROM cat_roles_operativos WHERE nombre = 'Ayudante Obra Civil');

INSERT INTO cat_roles_operativos (nombre, categoria)
SELECT 'Oficial Servicios', 'SERVICIOS' WHERE NOT EXISTS (SELECT 1 FROM cat_roles_operativos WHERE nombre = 'Oficial Servicios');

INSERT INTO cat_roles_operativos (nombre, categoria)
SELECT 'Ayudante Servicios', 'AYUDANTE' WHERE NOT EXISTS (SELECT 1 FROM cat_roles_operativos WHERE nombre = 'Ayudante Servicios');


-- 3. INSERTAR EMPLEADOS (~40 PAX)
DO $$
DECLARE
    v_unit_id uuid;
    
    -- IDs de Puestos
    v_p_jefe uuid;
    v_p_super uuid;
    v_p_operador uuid;
    v_p_oficial uuid;
    v_p_ayudante uuid;

    -- IDs de Roles
    v_r_jumbo uuid;
    v_r_scoop uuid;
    v_r_jackleg uuid;
    v_r_ay_perf uuid;
    v_r_chofer uuid;
    v_r_of_civil uuid;
    v_r_ay_civil uuid;
    v_r_of_serv uuid;
    v_r_ay_serv uuid;
BEGIN
    -- Obtener Unit ID (La primera que encuentre, o NULL si no hay)
    SELECT id INTO v_unit_id FROM org_units LIMIT 1;
    
    -- Si no hay unidad, creamos una dummy
    IF v_unit_id IS NULL THEN
        INSERT INTO org_companies (razon_social) VALUES ('Minera Default') RETURNING id INTO v_unit_id; 
        INSERT INTO org_units (company_id, nombre_unidad, codigo) VALUES (v_unit_id, 'Unidad Principal', 'UNI01') RETURNING id INTO v_unit_id;
    END IF;

    -- Obtener Puestos
    SELECT id INTO v_p_jefe FROM cat_puestos WHERE nombre = 'Jefe de Mina' LIMIT 1;
    SELECT id INTO v_p_super FROM cat_puestos WHERE nombre = 'Supervisor de Turno' LIMIT 1;
    SELECT id INTO v_p_operador FROM cat_puestos WHERE nombre = 'Operador Especializado' LIMIT 1;
    SELECT id INTO v_p_oficial FROM cat_puestos WHERE nombre = 'Oficial' LIMIT 1;
    SELECT id INTO v_p_ayudante FROM cat_puestos WHERE nombre = 'Ayudante General' LIMIT 1;

    -- Obtener Roles
    SELECT id INTO v_r_jumbo FROM cat_roles_operativos WHERE nombre = 'Jumboista' LIMIT 1;
    SELECT id INTO v_r_scoop FROM cat_roles_operativos WHERE nombre = 'Scooptram' LIMIT 1;
    SELECT id INTO v_r_jackleg FROM cat_roles_operativos WHERE nombre = 'Perforista Jackleg' LIMIT 1;
    SELECT id INTO v_r_ay_perf FROM cat_roles_operativos WHERE nombre = 'Ayudante Perforista' LIMIT 1;
    SELECT id INTO v_r_chofer FROM cat_roles_operativos WHERE nombre = 'Chofer Camion' LIMIT 1;
    SELECT id INTO v_r_of_civil FROM cat_roles_operativos WHERE nombre = 'Oficial Obra Civil' LIMIT 1;
    SELECT id INTO v_r_ay_civil FROM cat_roles_operativos WHERE nombre = 'Ayudante Obra Civil' LIMIT 1;
    SELECT id INTO v_r_of_serv FROM cat_roles_operativos WHERE nombre = 'Oficial Servicios' LIMIT 1;
    SELECT id INTO v_r_ay_serv FROM cat_roles_operativos WHERE nombre = 'Ayudante Servicios' LIMIT 1;

    -- --- MANDO (1 Jefe, 2 Supervisores) ---
    
    -- Jefe (Roberto)
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'J-001') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, unit_id, is_jefe_mina, is_supervisor, status)
        VALUES ('Roberto', 'Gómez (Jefe)', 'J-001', v_p_jefe, v_unit_id, true, false, 'ACTIVE');
    END IF;

    -- Supervisor 1 (Juan - Cuadrilla A/D)
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'S-001') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, unit_id, is_jefe_mina, is_supervisor, status)
        VALUES ('Juan', 'Pérez (Sup A)', 'S-001', v_p_super, v_unit_id, false, true, 'ACTIVE');
    END IF;

    -- Supervisor 2 (Carlos - Cuadrilla B/C)
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'S-002') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, unit_id, is_jefe_mina, is_supervisor, status)
        VALUES ('Carlos', 'López (Sup B)', 'S-002', v_p_super, v_unit_id, false, true, 'ACTIVE');
    END IF;


    -- --- OPERATIVOS (~37 Personas) ---

    -- CUADRILLA A: JUMBO (Desarrollo Mecanizado) - ~9 Pax
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'OP-J01') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status)
        VALUES ('Pedro', 'Picapiedra', 'OP-J01', v_p_operador, v_r_jumbo, v_unit_id, 'ACTIVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'OP-J02') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status)
        VALUES ('Jorge', 'Jetson', 'OP-J02', v_p_operador, v_r_jumbo, v_unit_id, 'ACTIVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'OP-S01') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status)
        VALUES ('Pablo', 'Mármol', 'OP-S01', v_p_operador, v_r_scoop, v_unit_id, 'ACTIVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'OP-S02') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status)
        VALUES ('Cosmo', 'Spacely', 'OP-S02', v_p_operador, v_r_scoop, v_unit_id, 'ACTIVE');
    END IF;
    -- Ayudantes Jumbo
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'AY-A01') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Dino', 'Sauri', 'AY-A01', v_p_ayudante, v_r_ay_perf, v_unit_id, 'ACTIVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'AY-A02') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Bamm', 'Bamm', 'AY-A02', v_p_ayudante, v_r_ay_perf, v_unit_id, 'ACTIVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'AY-A03') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Pebbles', 'Flintstone', 'AY-A03', v_p_ayudante, v_r_ay_perf, v_unit_id, 'ACTIVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'AY-A04') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Elroy', 'Jetson', 'AY-A04', v_p_ayudante, v_r_ay_perf, v_unit_id, 'ACTIVE');
    END IF;
    -- Servicios Cuadrilla A
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'OF-A01') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Astro', 'TheDog', 'OF-A01', v_p_oficial, v_r_of_serv, v_unit_id, 'ACTIVE');
    END IF;


    -- CUADRILLA B: JACKLEG (Desarrollo Convencional) - ~9 Pax
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'OP-JK1') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Hugo', 'Duck', 'OP-JK1', v_p_oficial, v_r_jackleg, v_unit_id, 'ACTIVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'OP-JK2') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Paco', 'Duck', 'OP-JK2', v_p_oficial, v_r_jackleg, v_unit_id, 'ACTIVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'OP-JK3') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Luis', 'Duck', 'OP-JK3', v_p_oficial, v_r_jackleg, v_unit_id, 'ACTIVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'OP-JK4') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Donald', 'Duck', 'OP-JK4', v_p_oficial, v_r_jackleg, v_unit_id, 'ACTIVE');
    END IF;
    -- Ayudantes Jackleg
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'AY-B01') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Daisy', 'Duck', 'AY-B01', v_p_ayudante, v_r_ay_perf, v_unit_id, 'ACTIVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'AY-B02') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Minnie', 'Mouse', 'AY-B02', v_p_ayudante, v_r_ay_perf, v_unit_id, 'ACTIVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'AY-B03') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Mickey', 'Mouse', 'AY-B03', v_p_ayudante, v_r_ay_perf, v_unit_id, 'ACTIVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'AY-B04') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Goofy', 'Goof', 'AY-B04', v_p_ayudante, v_r_ay_perf, v_unit_id, 'ACTIVE');
    END IF;
    -- Tubero
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'OF-B01') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Pluto', 'Dog', 'OF-B01', v_p_oficial, v_r_of_serv, v_unit_id, 'ACTIVE');
    END IF;


    -- CUADRILLA C: ACARREO (Transporte) - ~10 Pax
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'CH-C01') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Dominic', 'Toretto', 'CH-C01', v_p_operador, v_r_chofer, v_unit_id, 'ACTIVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'CH-C02') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Brian', 'OConner', 'CH-C02', v_p_operador, v_r_chofer, v_unit_id, 'ACTIVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'CH-C03') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Letty', 'Ortiz', 'CH-C03', v_p_operador, v_r_chofer, v_unit_id, 'ACTIVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'CH-C04') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Roman', 'Pearce', 'CH-C04', v_p_operador, v_r_chofer, v_unit_id, 'ACTIVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'CH-C05') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Tej', 'Parker', 'CH-C05', v_p_operador, v_r_chofer, v_unit_id, 'ACTIVE');
    END IF;
    -- Operadores Scoop (Carga)
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'OP-C01') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Han', 'Lue', 'OP-C01', v_p_operador, v_r_scoop, v_unit_id, 'ACTIVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'OP-C02') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Mia', 'Toretto', 'OP-C02', v_p_operador, v_r_scoop, v_unit_id, 'ACTIVE');
    END IF;
    -- Servicios
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'OF-C01') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Luke', 'Hobbs', 'OF-C01', v_p_oficial, v_r_of_serv, v_unit_id, 'ACTIVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'AY-C01') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Deckard', 'Shaw', 'AY-C01', v_p_ayudante, v_r_ay_serv, v_unit_id, 'ACTIVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'AY-C02') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Ramsey', 'Hacker', 'AY-C02', v_p_ayudante, v_r_ay_serv, v_unit_id, 'ACTIVE');
    END IF;


    -- CUADRILLA D: OBRA CIVIL (Mantenimiento) - ~9 Pax
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'OC-D01') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Bob', 'Builder', 'OC-D01', v_p_oficial, v_r_of_civil, v_unit_id, 'ACTIVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'OC-D02') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Wendy', 'Worker', 'OC-D02', v_p_oficial, v_r_of_civil, v_unit_id, 'ACTIVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'OC-D03') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Scoop', 'Digger', 'OC-D03', v_p_oficial, v_r_of_civil, v_unit_id, 'ACTIVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'AY-D01') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Muck', 'Dumper', 'AY-D01', v_p_ayudante, v_r_ay_civil, v_unit_id, 'ACTIVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'AY-D02') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Dizzy', 'Mixer', 'AY-D02', v_p_ayudante, v_r_ay_civil, v_unit_id, 'ACTIVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'AY-D03') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Roley', 'Roller', 'AY-D03', v_p_ayudante, v_r_ay_civil, v_unit_id, 'ACTIVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'AY-D04') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Lofty', 'Crane', 'AY-D04', v_p_ayudante, v_r_ay_civil, v_unit_id, 'ACTIVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'AY-D05') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Spud', 'Scarecrow', 'AY-D05', v_p_ayudante, v_r_ay_civil, v_unit_id, 'ACTIVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rh_employees WHERE employee_code = 'AY-D06') THEN
        INSERT INTO rh_employees (first_name, last_name, employee_code, puesto_id, rol_operativo_default_id, unit_id, status) VALUES 
        ('Pilchard', 'Cat', 'AY-D06', v_p_ayudante, v_r_ay_civil, v_unit_id, 'ACTIVE');
    END IF;

END $$;

COMMIT;
