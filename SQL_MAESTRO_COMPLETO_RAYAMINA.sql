-- =========================================================================================
-- RAYA MINA - SCRIPT SQL MAESTRO UNIFICADO (ESQUEMA COMPLETO + SEMILLA OPERATIVA)
-- =========================================================================================
-- Instrucciones:
-- 1. Copia todo el contenido de este archivo.
-- 2. Pégalo en el "SQL Editor" de tu proyecto en Supabase y haz clic en "Run".
-- 3. Este script es 100% idempotente: crea todas las tablas, columnas, relaciones,
--    políticas RLS, tiempo real y datos semilla (catálogos + plan semanal + reportes + prenómina).
-- =========================================================================================

-- 0. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. LIMPIEZA PREVIA (Orden inverso de dependencias para instalación limpia)
DROP TABLE IF EXISTS public.blog_posts CASCADE;
DROP TABLE IF EXISTS public.ops_report_personnel CASCADE;
DROP TABLE IF EXISTS public.ops_report_items CASCADE;
DROP TABLE IF EXISTS public.ops_daily_attendance CASCADE;
DROP TABLE IF EXISTS public.ops_daily_reports CASCADE;
DROP TABLE IF EXISTS public.ops_plan_items CASCADE;
DROP TABLE IF EXISTS public.ops_semanas CASCADE;
DROP TABLE IF EXISTS public.ops_planes_semanales CASCADE;
DROP TABLE IF EXISTS public.cat_producto_variables CASCADE;
DROP TABLE IF EXISTS public.cat_productos_mina CASCADE;
DROP TABLE IF EXISTS public.ops_equipment CASCADE;
DROP TABLE IF EXISTS public.cat_tipos_equipo CASCADE;
DROP TABLE IF EXISTS public.cat_cuadrillas_miembros CASCADE;
DROP TABLE IF EXISTS public.cat_cuadrillas CASCADE;
DROP TABLE IF EXISTS public.cat_turnos CASCADE;
DROP TABLE IF EXISTS public.cat_asistencias CASCADE;
DROP TABLE IF EXISTS public.rh_employees CASCADE;
DROP TABLE IF EXISTS public.cat_role_splits CASCADE;
DROP TABLE IF EXISTS public.cat_puesto_roles CASCADE;
DROP TABLE IF EXISTS public.cat_roles_operativos CASCADE;
DROP TABLE IF EXISTS public.cat_puestos CASCADE;
DROP TABLE IF EXISTS public.mine_locations CASCADE;
DROP TABLE IF EXISTS public.mine_sites CASCADE;
DROP TABLE IF EXISTS public.org_units CASCADE;
DROP TABLE IF EXISTS public.org_companies CASCADE;
DROP TABLE IF EXISTS public.sys_users CASCADE;
DROP TABLE IF EXISTS public.sys_roles_config CASCADE;
DROP TABLE IF EXISTS public.sys_roles CASCADE;
DROP TABLE IF EXISTS public.sys_config CASCADE;

-- =========================================================================================
-- 2. ESTRUCTURA ORGANIZACIONAL Y MINAS
-- =========================================================================================

CREATE TABLE public.org_companies (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    razon_social text NOT NULL,
    rfc text NOT NULL UNIQUE,
    direccion_fiscal text,
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.org_units (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id uuid REFERENCES public.org_companies(id) ON DELETE CASCADE,
    nombre_unidad text NOT NULL,
    ubicacion_geografica text,
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.mine_sites (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
    nombre_mina text NOT NULL,
    tipo_mina text CHECK (tipo_mina IN ('SUBTERRANEA', 'TAJO_ABIERTO')),
    centro_costos text,
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.mine_locations (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    mine_site_id uuid REFERENCES public.mine_sites(id) ON DELETE CASCADE,
    nombre text NOT NULL,
    tipo text NOT NULL, -- 'NIVEL', 'RAMPA', 'REBAJE', 'CRUCERO', 'FRENTE', 'TIRO', 'GALERIA', 'OTRO'
    codigo text,
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- =========================================================================================
-- 3. PUESTOS, ROLES OPERATIVOS, MATRIZ Y SPLITS
-- =========================================================================================

CREATE TABLE public.cat_puestos (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre text NOT NULL UNIQUE,
    tipo_personal text CHECK (tipo_personal IN ('OPERATIVO', 'ADMINISTRATIVO', 'EJECUTIVO', 'EMPLEADO')) DEFAULT 'OPERATIVO',
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.cat_roles_operativos (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre text NOT NULL UNIQUE,
    categoria text DEFAULT 'PERFORACION',
    descripcion text,
    orden int DEFAULT 0,
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.cat_puesto_roles (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    puesto_id uuid REFERENCES public.cat_puestos(id) ON DELETE CASCADE,
    rol_operativo_id uuid REFERENCES public.cat_roles_operativos(id) ON DELETE CASCADE,
    UNIQUE(puesto_id, rol_operativo_id)
);

CREATE TABLE public.cat_role_splits (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    rol_operativo_id uuid REFERENCES public.cat_roles_operativos(id) ON DELETE CASCADE,
    concepto_nomina_id uuid,
    concepto_ref text DEFAULT 'DESTAJO_METROS',
    porcentaje numeric(5,4) NOT NULL,
    vigencia_desde date DEFAULT CURRENT_DATE,
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- =========================================================================================
-- 4. CAPITAL HUMANO (EMPLEADOS)
-- =========================================================================================

CREATE TABLE public.rh_employees (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_code text UNIQUE,
    numero_empleado text,
    first_name text NOT NULL,
    last_name text NOT NULL,
    curp text UNIQUE,
    nss text,
    rfc text,
    fecha_ingreso date DEFAULT CURRENT_DATE,
    tipo_personal text CHECK (tipo_personal IN ('OPERATIVO', 'ADMINISTRATIVO', 'EJECUTIVO', 'EMPLEADO')) DEFAULT 'OPERATIVO',
    puesto_id uuid REFERENCES public.cat_puestos(id) ON DELETE SET NULL,
    role_id uuid REFERENCES public.cat_roles_operativos(id) ON DELETE SET NULL,
    sueldo_diario_base numeric(12,2) DEFAULT 350.00,
    is_jefe boolean DEFAULT false,
    supervisor_id uuid REFERENCES public.rh_employees(id) ON DELETE SET NULL,
    company_id uuid REFERENCES public.org_companies(id) ON DELETE SET NULL,
    unit_id uuid REFERENCES public.org_units(id) ON DELETE SET NULL,
    mine_id uuid REFERENCES public.mine_sites(id) ON DELETE SET NULL,
    status text DEFAULT 'ACTIVO',
    created_at timestamptz DEFAULT now()
);

-- =========================================================================================
-- 5. TURNOS, ASISTENCIAS, CUADRILLAS Y EQUIPOS
-- =========================================================================================

CREATE TABLE public.cat_turnos (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre text NOT NULL,
    codigo text NOT NULL,
    hora_inicio time NOT NULL,
    hora_fin time NOT NULL,
    cruza_dia boolean DEFAULT false,
    tolerancia_minutos integer DEFAULT 15,
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.cat_asistencias (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    codigo text NOT NULL UNIQUE,
    nombre text NOT NULL,
    descripcion text,
    efecto_nomina text NOT NULL DEFAULT 'PAGA_NORMAL', -- 'PAGA_NORMAL', 'DESCUENTA_DIA', 'PAGA_PARCIAL', 'INCAPACIDAD'
    color text NOT NULL DEFAULT 'emerald',
    orden integer DEFAULT 10,
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.cat_cuadrillas (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre text NOT NULL,
    codigo text,
    supervisor_id uuid REFERENCES public.rh_employees(id) ON DELETE SET NULL,
    mine_site_id uuid REFERENCES public.mine_sites(id) ON DELETE SET NULL,
    turno_actual_id uuid REFERENCES public.cat_turnos(id) ON DELETE SET NULL,
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.cat_cuadrillas_miembros (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    cuadrilla_id uuid REFERENCES public.cat_cuadrillas(id) ON DELETE CASCADE,
    empleado_id uuid REFERENCES public.rh_employees(id) ON DELETE CASCADE,
    rol_operativo_id uuid REFERENCES public.cat_roles_operativos(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(cuadrilla_id, empleado_id)
);

CREATE TABLE public.cat_tipos_equipo (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre text NOT NULL UNIQUE,
    Prefijo text,
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.ops_equipment (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    clave text NOT NULL UNIQUE,
    nombre text,
    tipo text NOT NULL,
    marca text,
    modelo text,
    serie text,
    anio integer,
    company_id uuid REFERENCES public.org_companies(id) ON DELETE SET NULL,
    unit_id uuid REFERENCES public.org_units(id) ON DELETE SET NULL,
    mine_id uuid REFERENCES public.mine_sites(id) ON DELETE SET NULL,
    horometro_actual numeric(10, 2) DEFAULT 0,
    status text DEFAULT 'DISPONIBLE',
    created_at timestamptz DEFAULT now()
);

-- =========================================================================================
-- 6. PRODUCTOS DE MINA (CONCEPTOS DE OBRA Y DESTAJO)
-- =========================================================================================

CREATE TABLE public.cat_productos_mina (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre text NOT NULL,
    categoria text CHECK (categoria IN ('PERFORACION', 'FLETE', 'SERVICIOS_OBRA_CIVIL')) NOT NULL,
    unidad_medida_default text NOT NULL,
    modo_captura text CHECK (modo_captura IN ('SIMPLE', 'CALCULADO')) DEFAULT 'SIMPLE',
    formula_cobro text,
    tarifa_pago numeric(12,2) DEFAULT 0.00,
    tipos_equipo_permitidos text[] DEFAULT '{}',
    roles_compatibles uuid[] DEFAULT '{}',
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.cat_producto_variables (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    producto_id uuid REFERENCES public.cat_productos_mina(id) ON DELETE CASCADE,
    clave text NOT NULL,
    label text NOT NULL,
    unidad text NOT NULL,
    tipo_input text CHECK (tipo_input IN ('NUMBER', 'TEXT', 'SELECT')) DEFAULT 'NUMBER',
    opciones_select text[],
    obligatorio boolean DEFAULT true,
    orden integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    UNIQUE(producto_id, clave)
);

-- =========================================================================================
-- 7. SISTEMA, CONFIGURACIÓN, USUARIOS Y VISIONES
-- =========================================================================================

CREATE TABLE public.sys_config (
    key_name text PRIMARY KEY,
    value_json jsonb NOT NULL,
    description text,
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.sys_roles_config (
    role text PRIMARY KEY,
    nombre_mostrar text NOT NULL,
    can_approve_reports boolean DEFAULT false,
    can_edit_approved boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.sys_roles (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre text NOT NULL UNIQUE,
    descripcion text,
    views_json jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.sys_users (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    auth_user_id uuid UNIQUE,
    email text NOT NULL UNIQUE,
    full_name text NOT NULL,
    nickname text,
    avatar_url text,
    auth_password text DEFAULT '123456',
    role text NOT NULL DEFAULT 'SUPERVISOR',
    views_json jsonb DEFAULT '["/dashboard"]'::jsonb,
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =========================================================================================
-- 8. PLANEACIÓN SEMANAL, EMPAQUE DE SEMANAS Y REPORTES DIARIOS DE OPERACIÓN
-- =========================================================================================

CREATE TABLE public.ops_planes_semanales (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre text NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    estado text DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'CERRADO')),
    notas text,
    created_at timestamptz DEFAULT now(),
    created_by uuid
);

CREATE TABLE public.ops_plan_items (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    plan_id uuid REFERENCES public.ops_planes_semanales(id) ON DELETE CASCADE,
    producto_id uuid REFERENCES public.cat_productos_mina(id) ON DELETE CASCADE,
    mine_site_id uuid REFERENCES public.mine_sites(id) ON DELETE SET NULL,
    location_id uuid REFERENCES public.mine_locations(id) ON DELETE SET NULL,
    meta_proyectada numeric(12,2) NOT NULL DEFAULT 0,
    notas text,
    created_at timestamptz DEFAULT now(),
    UNIQUE(plan_id, producto_id, mine_site_id, location_id)
);

CREATE TABLE public.ops_semanas (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    numero_semana integer,
    anio integer,
    nombre text NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    estado text DEFAULT 'CERRADA', -- 'ABIERTA', 'CERRADA', 'PROCESADA'
    plan_id uuid REFERENCES public.ops_planes_semanales(id) ON DELETE SET NULL,
    total_reportes integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    closed_at timestamptz DEFAULT now(),
    closed_by uuid
);

CREATE TABLE public.ops_daily_reports (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    folio serial,
    fecha date NOT NULL DEFAULT CURRENT_DATE,
    turno_id uuid REFERENCES public.cat_turnos(id) ON DELETE SET NULL,
    mine_site_id uuid REFERENCES public.mine_sites(id) ON DELETE SET NULL,
    cuadrilla_id uuid REFERENCES public.cat_cuadrillas(id) ON DELETE SET NULL,
    supervisor_id uuid REFERENCES public.rh_employees(id) ON DELETE SET NULL,
    semana_id uuid REFERENCES public.ops_semanas(id) ON DELETE SET NULL,
    estado text DEFAULT 'BORRADOR' CHECK (estado IN ('BORRADOR', 'EN_REVISION', 'APROBADO', 'RECHAZADO', 'CORRECCION_SOLICITADA', 'CERRADO')),
    observaciones_generales text,
    motivo_rechazo text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.ops_daily_attendance (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    report_id uuid REFERENCES public.ops_daily_reports(id) ON DELETE CASCADE,
    empleado_id uuid REFERENCES public.rh_employees(id) ON DELETE CASCADE,
    asistencia_tipo_id uuid REFERENCES public.cat_asistencias(id) ON DELETE SET NULL,
    rol_asignado_id uuid REFERENCES public.cat_roles_operativos(id) ON DELETE SET NULL,
    horas_trabajadas numeric(5,2) DEFAULT 8,
    observaciones text,
    created_at timestamptz DEFAULT now(),
    UNIQUE(report_id, empleado_id)
);

CREATE TABLE public.ops_report_items (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    report_id uuid REFERENCES public.ops_daily_reports(id) ON DELETE CASCADE,
    producto_id uuid REFERENCES public.cat_productos_mina(id) ON DELETE SET NULL,
    equipo_id uuid REFERENCES public.ops_equipment(id) ON DELETE SET NULL,
    location_id uuid REFERENCES public.mine_locations(id) ON DELETE SET NULL,
    cantidad_total numeric(12,2) NOT NULL DEFAULT 0,
    variables_capturadas jsonb DEFAULT '{}'::jsonb,
    observaciones text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.ops_report_personnel (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    report_item_id uuid REFERENCES public.ops_report_items(id) ON DELETE CASCADE,
    empleado_id uuid REFERENCES public.rh_employees(id) ON DELETE CASCADE,
    rol_ejercido_id uuid REFERENCES public.cat_roles_operativos(id) ON DELETE SET NULL,
    porcentaje_participacion numeric(5,2) DEFAULT 100.00,
    created_at timestamptz DEFAULT now()
);

-- =========================================================================================
-- 9. MURO OPERATIVO / BITÁCORA EN TIEMPO REAL
-- =========================================================================================

CREATE TABLE public.blog_posts (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    content text NOT NULL,
    type text CHECK (type IN ('POST', 'TASK', 'ALERT')) DEFAULT 'POST',
    status text CHECK (status IN ('OPEN', 'COMPLETED')) DEFAULT 'OPEN',
    author_name text NOT NULL,
    author_role text DEFAULT 'Operador',
    likes integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- =========================================================================================
-- 10. SEGURIDAD (RLS PERMISIVO PARA OPERACIÓN Y DEMO) + REALTIME
-- =========================================================================================

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
        EXECUTE format('DROP POLICY IF EXISTS "Acceso Total Publico" ON public.%I;', t);
        EXECUTE format('CREATE POLICY "Acceso Total Publico" ON public.%I FOR ALL USING (true) WITH CHECK (true);', t);
    END LOOP;
END $$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Activar Realtime para Muro Operativo y Reportes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.blog_posts;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.ops_daily_reports;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;

-- =========================================================================================
-- 11. SEMILLA DE DATOS MAESTRA (CATÁLOGOS + OPERACIÓN REALISTA + PRENÓMINA)
-- =========================================================================================

DO $$
DECLARE
    -- Empresas y Unidades
    v_comp_main uuid;
    v_comp_cont uuid;
    v_unit_norte uuid;
    v_unit_sur uuid;

    -- Minas
    v_mina_sj uuid;
    v_mina_esp uuid;
    v_mina_roble uuid;

    -- Ubicaciones / Frentes
    v_loc_rampa100 uuid;
    v_loc_rebaje450 uuid;
    v_loc_crucero200 uuid;
    v_loc_veta uuid;
    v_loc_galeria300 uuid;
    v_loc_tiro uuid;

    -- Puestos RH
    v_puesto_gte uuid;
    v_puesto_sup uuid;
    v_puesto_jefe_piso uuid;
    v_puesto_perf uuid;
    v_puesto_ayu uuid;
    v_puesto_scoop uuid;
    v_puesto_camion uuid;
    v_puesto_alba uuid;
    v_puesto_mec uuid;

    -- Roles Operativos
    v_rol_sup uuid;
    v_rol_jumbo uuid;
    v_rol_ayu_jumbo uuid;
    v_rol_pierna uuid;
    v_rol_ayu_pierna uuid;
    v_rol_scoop uuid;
    v_rol_camion uuid;
    v_rol_serv uuid;
    v_rol_civil uuid;
    v_rol_lanzador uuid;

    -- Empleados
    v_emp_director uuid;
    v_emp_sup1 uuid;
    v_emp_sup2 uuid;
    v_emp_sup3 uuid;
    v_emp_op1 uuid;
    v_emp_op2 uuid;
    v_emp_op3 uuid;
    v_emp_op4 uuid;
    v_emp_op5 uuid;
    v_emp_op6 uuid;
    v_emp_op7 uuid;
    v_emp_op8 uuid;
    v_emp_op9 uuid;
    v_emp_op10 uuid;
    v_emp_op11 uuid;
    v_emp_op12 uuid;

    -- Turnos
    v_turno_dia uuid;
    v_turno_noche uuid;
    v_turno_mixto uuid;

    -- Asistencias
    v_asist_ok uuid;
    v_asist_falta uuid;
    v_asist_incap uuid;
    v_asist_perm_cg uuid;
    v_asist_perm_sg uuid;
    v_asist_vac uuid;

    -- Cuadrillas
    v_cuad_alfa uuid;
    v_cuad_bravo uuid;
    v_cuad_charlie uuid;
    v_cuad_delta uuid;

    -- Equipos
    v_eq_jm01 uuid;
    v_eq_jm02 uuid;
    v_eq_sc01 uuid;
    v_eq_sc02 uuid;
    v_eq_cm01 uuid;
    v_eq_cm02 uuid;
    v_eq_rb01 uuid;
    v_eq_lz01 uuid;

    -- Productos Mina
    v_prod_avance_jumbo uuid;
    v_prod_anclaje_resina uuid;
    v_prod_anclaje_friccion uuid;
    v_prod_barreno_largo uuid;
    v_prod_avance_pierna uuid;
    v_prod_flete_mineral uuid;
    v_prod_flete_tepetate uuid;
    v_prod_rezaga_scoop uuid;
    v_prod_malla uuid;
    v_prod_zarpeo uuid;
    v_prod_servicios uuid;
    v_prod_cuneta uuid;
    v_prod_plantilla uuid;
    v_prod_muro uuid;

    -- Planes y Semanas
    v_semana_cerrada uuid;
    v_plan_cerrado uuid;
    v_plan_activo uuid;

    -- Reportes
    v_rep1 uuid;
    v_rep2 uuid;
    v_rep3 uuid;
    v_rep4 uuid;
    v_rep5 uuid;
    v_rep_act1 uuid;
    v_rep_act2 uuid;
    v_rep_act3 uuid;
    v_rep_act4 uuid;

    -- Items de Reporte
    v_item_id uuid;
BEGIN
    -- =====================================================================================
    -- 11.1 CONFIGURACIÓN GLOBAL Y ROLES DE SISTEMA
    -- =====================================================================================
    INSERT INTO public.sys_config (key_name, value_json, description) VALUES
    ('week_close_rules', '{"min_days": 5, "max_days": 7}'::jsonb, 'Reglas para permitir el cierre de una semana operativa agrupando reportes diarios'),
    ('operational_week_start', '{"day_index": 1}'::jsonb, 'Día oficial de inicio de la semana operativa (1 = Lunes)')
    ON CONFLICT (key_name) DO UPDATE SET value_json = EXCLUDED.value_json;

    INSERT INTO public.sys_roles_config (role, nombre_mostrar, can_approve_reports, can_edit_approved) VALUES
    ('SUPER_ADMIN', 'Administrador Principal', true, true),
    ('JEFE_MINA', 'Jefe de Mina', true, true),
    ('JEFE_RH', 'Jefe de Recursos Humanos', true, false),
    ('JEFE_PLANEACION', 'Jefe de Planeación', true, true),
    ('SUPERVISOR', 'Supervisor de Turno', false, false),
    ('LECTURA', 'Solo Lectura', false, false)
    ON CONFLICT (role) DO UPDATE SET can_approve_reports = EXCLUDED.can_approve_reports, can_edit_approved = EXCLUDED.can_edit_approved;

    INSERT INTO public.sys_roles (nombre, descripcion, views_json) VALUES
    ('SUPER_ADMIN', 'Acceso total a todos los módulos operativos, financieros y de configuración', '["/dashboard", "/dashboard/semana", "/dashboard/operacion/reportes-diarios", "/dashboard/nomina", "/dashboard/chat", "/dashboard/catalogos", "/dashboard/configuracion", "/dashboard/configuracion/usuarios", "/dashboard/configuracion/visiones"]'::jsonb),
    ('JEFE_MINA', 'Supervisión general de mina, aprobación de reportes diarios, metas semanales y pre-nómina', '["/dashboard", "/dashboard/semana", "/dashboard/operacion/reportes-diarios", "/dashboard/nomina", "/dashboard/chat", "/dashboard/catalogos"]'::jsonb),
    ('JEFE_PLANEACION', 'Control de metas semanales, análisis de avance y bitácora operativa', '["/dashboard", "/dashboard/semana", "/dashboard/operacion/reportes-diarios", "/dashboard/chat"]'::jsonb),
    ('SUPERVISOR', 'Captura de reportes diarios de operación, pase de lista y bitácora de turno', '["/dashboard", "/dashboard/operacion/reportes-diarios", "/dashboard/chat"]'::jsonb);

    INSERT INTO public.sys_users (email, full_name, nickname, role, auth_password, views_json) VALUES
    ('jesus12398@gmail.com', 'Ing. Jesús Administrador', 'Ing. Jesús (Admin)', 'SUPER_ADMIN', '123456', '["/dashboard", "/dashboard/semana", "/dashboard/operacion/reportes-diarios", "/dashboard/nomina", "/dashboard/chat", "/dashboard/catalogos", "/dashboard/configuracion", "/dashboard/configuracion/usuarios", "/dashboard/configuracion/visiones"]'::jsonb),
    ('kikus_100@hotmail.com', 'Ing. Carlos Planeación', 'Jefe Planeación', 'JEFE_PLANEACION', '123456', '["/dashboard", "/dashboard/semana", "/dashboard/operacion/reportes-diarios", "/dashboard/chat"]'::jsonb),
    ('jesus@gmail.com', 'Sup. Roberto Sánchez', 'Sup. Turno A', 'SUPERVISOR', '123456', '["/dashboard", "/dashboard/operacion/reportes-diarios", "/dashboard/chat"]'::jsonb);

    -- =====================================================================================
    -- 11.2 EMPRESAS, UNIDADES, MINAS Y UBICACIONES
    -- =====================================================================================
    INSERT INTO public.org_companies (razon_social, rfc, direccion_fiscal, activo)
    VALUES ('Minera del Norte S.A. de C.V.', 'MNO950101AAA', 'Av. Industrial #405, Zacatecas, Zac.', true)
    RETURNING id INTO v_comp_main;

    INSERT INTO public.org_companies (razon_social, rfc, direccion_fiscal, activo)
    VALUES ('Contratistas Mineros Unidos S.A.', 'CMU010203BBB', 'Blvd. Minero #102, Durango, Dgo.', true)
    RETURNING id INTO v_comp_cont;

    INSERT INTO public.org_units (company_id, nombre_unidad, ubicacion_geografica, activo)
    VALUES (v_comp_main, 'Unidad Fresnillo - Plateros', 'Fresnillo, Zacatecas', true)
    RETURNING id INTO v_unit_norte;

    INSERT INTO public.org_units (company_id, nombre_unidad, ubicacion_geografica, activo)
    VALUES (v_comp_main, 'Unidad Sombrerete Sur', 'Sombrerete, Zacatecas', true)
    RETURNING id INTO v_unit_sur;

    INSERT INTO public.mine_sites (unit_id, nombre_mina, tipo_mina, centro_costos, active)
    VALUES (v_unit_norte, 'Mina San José', 'SUBTERRANEA', 'CC-SJ-101', true)
    RETURNING id INTO v_mina_sj;

    INSERT INTO public.mine_sites (unit_id, nombre_mina, tipo_mina, centro_costos, active)
    VALUES (v_unit_norte, 'Mina La Esperanza', 'SUBTERRANEA', 'CC-ESP-102', true)
    RETURNING id INTO v_mina_esp;

    INSERT INTO public.mine_sites (unit_id, nombre_mina, tipo_mina, centro_costos, active)
    VALUES (v_unit_sur, 'Mina El Roble', 'TAJO_ABIERTO', 'CC-ROB-201', true)
    RETURNING id INTO v_mina_roble;

    INSERT INTO public.mine_locations (mine_site_id, nombre, tipo, codigo, activo)
    VALUES (v_mina_sj, 'Nivel 100 - Rampa Principal', 'RAMPA', 'NV100-RP', true)
    RETURNING id INTO v_loc_rampa100;

    INSERT INTO public.mine_locations (mine_site_id, nombre, tipo, codigo, activo)
    VALUES (v_mina_sj, 'Rebaje 450 Norte', 'REBAJE', 'RB-450N', true)
    RETURNING id INTO v_loc_rebaje450;

    INSERT INTO public.mine_locations (mine_site_id, nombre, tipo, codigo, activo)
    VALUES (v_mina_sj, 'Crucero 200 Sur', 'CRUCERO', 'CR-200S', true)
    RETURNING id INTO v_loc_crucero200;

    INSERT INTO public.mine_locations (mine_site_id, nombre, tipo, codigo, activo)
    VALUES (v_mina_sj, 'Frente Veta Madre 320', 'FRENTE', 'FR-VM320', true)
    RETURNING id INTO v_loc_veta;

    INSERT INTO public.mine_locations (mine_site_id, nombre, tipo, codigo, activo)
    VALUES (v_mina_esp, 'Nivel 300 - Galería Este', 'GALERIA', 'NV300-GE', true)
    RETURNING id INTO v_loc_galeria300;

    INSERT INTO public.mine_locations (mine_site_id, nombre, tipo, codigo, activo)
    VALUES (v_mina_esp, 'Tiro General Esperanza', 'TIRO', 'TG-ESP', true)
    RETURNING id INTO v_loc_tiro;

    -- =====================================================================================
    -- 11.3 PUESTOS, ROLES, MATRIZ Y SPLITS
    -- =====================================================================================
    INSERT INTO public.cat_puestos (nombre, tipo_personal) VALUES ('Gerente de Operaciones', 'ADMINISTRATIVO') RETURNING id INTO v_puesto_gte;
    INSERT INTO public.cat_puestos (nombre, tipo_personal) VALUES ('Supervisor de Mina', 'ADMINISTRATIVO') RETURNING id INTO v_puesto_sup;
    INSERT INTO public.cat_puestos (nombre, tipo_personal) VALUES ('Jefe de Piso / Turno', 'OPERATIVO') RETURNING id INTO v_puesto_jefe_piso;
    INSERT INTO public.cat_puestos (nombre, tipo_personal) VALUES ('Perforista / Jumbero', 'OPERATIVO') RETURNING id INTO v_puesto_perf;
    INSERT INTO public.cat_puestos (nombre, tipo_personal) VALUES ('Ayudante General Mina', 'OPERATIVO') RETURNING id INTO v_puesto_ayu;
    INSERT INTO public.cat_puestos (nombre, tipo_personal) VALUES ('Operador de Scooptram', 'OPERATIVO') RETURNING id INTO v_puesto_scoop;
    INSERT INTO public.cat_puestos (nombre, tipo_personal) VALUES ('Operador de Camión Bajo Perfil', 'OPERATIVO') RETURNING id INTO v_puesto_camion;
    INSERT INTO public.cat_puestos (nombre, tipo_personal) VALUES ('Oficial Obra Civil / Albañil', 'OPERATIVO') RETURNING id INTO v_puesto_alba;
    INSERT INTO public.cat_puestos (nombre, tipo_personal) VALUES ('Mecánico de Mina', 'OPERATIVO') RETURNING id INTO v_puesto_mec;

    INSERT INTO public.cat_roles_operativos (nombre, categoria, orden, descripcion) VALUES ('Supervisor Operativo', 'SERVICIOS', 1, 'Supervisión de seguridad y avance') RETURNING id INTO v_rol_sup;
    INSERT INTO public.cat_roles_operativos (nombre, categoria, orden, descripcion) VALUES ('Oficial Jumbero', 'PERFORACION', 2, 'Operador titular de Jumbo electrohidráulico') RETURNING id INTO v_rol_jumbo;
    INSERT INTO public.cat_roles_operativos (nombre, categoria, orden, descripcion) VALUES ('Ayudante de Jumbo', 'PERFORACION', 3, 'Auxiliar de barrenación y cables en Jumbo') RETURNING id INTO v_rol_ayu_jumbo;
    INSERT INTO public.cat_roles_operativos (nombre, categoria, orden, descripcion) VALUES ('Oficial Máquina de Pierna', 'PERFORACION', 4, 'Perforista con máquina neumática de pierna') RETURNING id INTO v_rol_pierna;
    INSERT INTO public.cat_roles_operativos (nombre, categoria, orden, descripcion) VALUES ('Ayudante Máquina de Pierna', 'PERFORACION', 5, 'Auxiliar de perforación manual y anclaje') RETURNING id INTO v_rol_ayu_pierna;
    INSERT INTO public.cat_roles_operativos (nombre, categoria, orden, descripcion) VALUES ('Operador Scoop', 'SCOOP', 6, 'Rezaga y carga de mineral/tepetate') RETURNING id INTO v_rol_scoop;
    INSERT INTO public.cat_roles_operativos (nombre, categoria, orden, descripcion) VALUES ('Operador Camión / Dumper', 'ACARREO', 7, 'Acarreo de mineral y tepetate a superficie') RETURNING id INTO v_rol_camion;
    INSERT INTO public.cat_roles_operativos (nombre, categoria, orden, descripcion) VALUES ('Oficial Servicios Mina', 'SERVICIOS', 8, 'Instalación de tubería, ventilación y malla') RETURNING id INTO v_rol_serv;
    INSERT INTO public.cat_roles_operativos (nombre, categoria, orden, descripcion) VALUES ('Oficial Obra Civil', 'OBRA_CIVIL', 9, 'Construcción de cunetas, muros y plantillas') RETURNING id INTO v_rol_civil;
    INSERT INTO public.cat_roles_operativos (nombre, categoria, orden, descripcion) VALUES ('Operador Lanzadora Shotcrete', 'OBRA_CIVIL', 10, 'Zarpeo de concreto lanzado en mina') RETURNING id INTO v_rol_lanzador;

    -- Matriz de Compatibilidad Puesto <-> Rol
    INSERT INTO public.cat_puesto_roles (puesto_id, rol_operativo_id) VALUES
    (v_puesto_sup, v_rol_sup),
    (v_puesto_jefe_piso, v_rol_sup),
    (v_puesto_perf, v_rol_jumbo),
    (v_puesto_perf, v_rol_pierna),
    (v_puesto_perf, v_rol_serv),
    (v_puesto_ayu, v_rol_ayu_jumbo),
    (v_puesto_ayu, v_rol_ayu_pierna),
    (v_puesto_ayu, v_rol_serv),
    (v_puesto_ayu, v_rol_civil),
    (v_puesto_scoop, v_rol_scoop),
    (v_puesto_scoop, v_rol_camion),
    (v_puesto_camion, v_rol_camion),
    (v_puesto_alba, v_rol_civil),
    (v_puesto_alba, v_rol_lanzador),
    (v_puesto_alba, v_rol_serv);

    -- Splits de Pago por Rol
    INSERT INTO public.cat_role_splits (rol_operativo_id, concepto_ref, porcentaje) VALUES
    (v_rol_jumbo, 'DESTAJO_PERFORACION', 0.65),
    (v_rol_ayu_jumbo, 'DESTAJO_PERFORACION', 0.35),
    (v_rol_pierna, 'DESTAJO_PERFORACION', 0.60),
    (v_rol_ayu_pierna, 'DESTAJO_PERFORACION', 0.40),
    (v_rol_scoop, 'DESTAJO_REZAGA', 1.00),
    (v_rol_camion, 'DESTAJO_FLETE', 1.00),
    (v_rol_civil, 'DESTAJO_OBRA_CIVIL', 0.60),
    (v_rol_lanzador, 'DESTAJO_ZARPEO', 0.70);

    -- =====================================================================================
    -- 11.4 EMPLEADOS (CON SUELDO BASE Y JERARQUÍA)
    -- =====================================================================================
    INSERT INTO public.rh_employees (employee_code, numero_empleado, first_name, last_name, curp, fecha_ingreso, tipo_personal, puesto_id, role_id, sueldo_diario_base, is_jefe, company_id, unit_id, mine_id, status)
    VALUES ('EMP-001', 'EMP-001', 'Carlos', 'Mendoza Ríos', 'MERC800101HZS', '2020-01-15', 'ADMINISTRATIVO', v_puesto_gte, v_rol_sup, 1500.00, true, v_comp_main, v_unit_norte, v_mina_sj, 'ACTIVO')
    RETURNING id INTO v_emp_director;

    INSERT INTO public.rh_employees (employee_code, numero_empleado, first_name, last_name, curp, fecha_ingreso, tipo_personal, puesto_id, role_id, sueldo_diario_base, is_jefe, supervisor_id, company_id, unit_id, mine_id, status)
    VALUES ('EMP-002', 'EMP-002', 'Roberto', 'Sánchez Vega', 'SAVR850312HZS', '2021-03-10', 'ADMINISTRATIVO', v_puesto_sup, v_rol_sup, 950.00, true, v_emp_director, v_comp_main, v_unit_norte, v_mina_sj, 'ACTIVO')
    RETURNING id INTO v_emp_sup1;

    INSERT INTO public.rh_employees (employee_code, numero_empleado, first_name, last_name, curp, fecha_ingreso, tipo_personal, puesto_id, role_id, sueldo_diario_base, is_jefe, supervisor_id, company_id, unit_id, mine_id, status)
    VALUES ('EMP-003', 'EMP-003', 'Miguel Ángel', 'Torres Luna', 'TOLM870722HZS', '2021-06-01', 'ADMINISTRATIVO', v_puesto_sup, v_rol_sup, 950.00, true, v_emp_director, v_comp_main, v_unit_norte, v_mina_sj, 'ACTIVO')
    RETURNING id INTO v_emp_sup2;

    INSERT INTO public.rh_employees (employee_code, numero_empleado, first_name, last_name, curp, fecha_ingreso, tipo_personal, puesto_id, role_id, sueldo_diario_base, is_jefe, supervisor_id, company_id, unit_id, mine_id, status)
    VALUES ('EMP-004', 'EMP-004', 'Fernando', 'Herrera Díaz', 'HEDF841105HZS', '2021-08-15', 'OPERATIVO', v_puesto_jefe_piso, v_rol_sup, 800.00, true, v_emp_director, v_comp_main, v_unit_norte, v_mina_esp, 'ACTIVO')
    RETURNING id INTO v_emp_sup3;

    -- Cuadrilla Alfa (Perforación Jumbo y Anclaje)
    INSERT INTO public.rh_employees (employee_code, numero_empleado, first_name, last_name, curp, fecha_ingreso, tipo_personal, puesto_id, role_id, sueldo_diario_base, is_jefe, supervisor_id, company_id, unit_id, mine_id, status)
    VALUES ('EMP-101', 'EMP-101', 'Juan', 'Pérez García', 'PEGJ900514HZS', '2022-02-01', 'OPERATIVO', v_puesto_perf, v_rol_jumbo, 650.00, false, v_emp_sup1, v_comp_main, v_unit_norte, v_mina_sj, 'ACTIVO')
    RETURNING id INTO v_emp_op1;

    INSERT INTO public.rh_employees (employee_code, numero_empleado, first_name, last_name, curp, fecha_ingreso, tipo_personal, puesto_id, role_id, sueldo_diario_base, is_jefe, supervisor_id, company_id, unit_id, mine_id, status)
    VALUES ('EMP-102', 'EMP-102', 'Pedro', 'Gómez Hernández', 'GOHP940819HZS', '2022-04-12', 'OPERATIVO', v_puesto_ayu, v_rol_ayu_jumbo, 450.00, false, v_emp_sup1, v_comp_main, v_unit_norte, v_mina_sj, 'ACTIVO')
    RETURNING id INTO v_emp_op2;

    INSERT INTO public.rh_employees (employee_code, numero_empleado, first_name, last_name, curp, fecha_ingreso, tipo_personal, puesto_id, role_id, sueldo_diario_base, is_jefe, supervisor_id, company_id, unit_id, mine_id, status)
    VALUES ('EMP-103', 'EMP-103', 'Luis Alberto', 'Ramírez Cruz', 'RACL911203HZS', '2022-05-20', 'OPERATIVO', v_puesto_perf, v_rol_pierna, 600.00, false, v_emp_sup1, v_comp_main, v_unit_norte, v_mina_sj, 'ACTIVO')
    RETURNING id INTO v_emp_op3;

    INSERT INTO public.rh_employees (employee_code, numero_empleado, first_name, last_name, curp, fecha_ingreso, tipo_personal, puesto_id, role_id, sueldo_diario_base, is_jefe, supervisor_id, company_id, unit_id, mine_id, status)
    VALUES ('EMP-104', 'EMP-104', 'Brian', 'Vázquez Morales', 'VAMB960328HZS', '2023-01-10', 'OPERATIVO', v_puesto_ayu, v_rol_ayu_pierna, 450.00, false, v_emp_sup1, v_comp_main, v_unit_norte, v_mina_sj, 'ACTIVO')
    RETURNING id INTO v_emp_op4;

    -- Cuadrilla Bravo (Producción, Rezaga y Flete)
    INSERT INTO public.rh_employees (employee_code, numero_empleado, first_name, last_name, curp, fecha_ingreso, tipo_personal, puesto_id, role_id, sueldo_diario_base, is_jefe, supervisor_id, company_id, unit_id, mine_id, status)
    VALUES ('EMP-105', 'EMP-105', 'Jorge', 'Hernández Solís', 'HESJ890915HZS', '2022-03-01', 'OPERATIVO', v_puesto_scoop, v_rol_scoop, 620.00, false, v_emp_sup2, v_comp_main, v_unit_norte, v_mina_sj, 'ACTIVO')
    RETURNING id INTO v_emp_op5;

    INSERT INTO public.rh_employees (employee_code, numero_empleado, first_name, last_name, curp, fecha_ingreso, tipo_personal, puesto_id, role_id, sueldo_diario_base, is_jefe, supervisor_id, company_id, unit_id, mine_id, status)
    VALUES ('EMP-106', 'EMP-106', 'Ricardo', 'Castillo Ortiz', 'CAOR920711HZS', '2022-07-15', 'OPERATIVO', v_puesto_camion, v_rol_camion, 580.00, false, v_emp_sup2, v_comp_main, v_unit_norte, v_mina_sj, 'ACTIVO')
    RETURNING id INTO v_emp_op6;

    INSERT INTO public.rh_employees (employee_code, numero_empleado, first_name, last_name, curp, fecha_ingreso, tipo_personal, puesto_id, role_id, sueldo_diario_base, is_jefe, supervisor_id, company_id, unit_id, mine_id, status)
    VALUES ('EMP-107', 'EMP-107', 'Eduardo', 'Morales Pineda', 'MOPE931125HZS', '2022-09-01', 'OPERATIVO', v_puesto_camion, v_rol_camion, 580.00, false, v_emp_sup2, v_comp_main, v_unit_norte, v_mina_sj, 'ACTIVO')
    RETURNING id INTO v_emp_op7;

    INSERT INTO public.rh_employees (employee_code, numero_empleado, first_name, last_name, curp, fecha_ingreso, tipo_personal, puesto_id, role_id, sueldo_diario_base, is_jefe, supervisor_id, company_id, unit_id, mine_id, status)
    VALUES ('EMP-108', 'EMP-108', 'Daniel', 'Reyes Aguilar', 'READ950417HZS', '2023-02-14', 'OPERATIVO', v_puesto_perf, v_rol_jumbo, 650.00, false, v_emp_sup2, v_comp_main, v_unit_norte, v_mina_sj, 'ACTIVO')
    RETURNING id INTO v_emp_op8;

    -- Cuadrilla Charlie (Servicios y Obra Civil)
    INSERT INTO public.rh_employees (employee_code, numero_empleado, first_name, last_name, curp, fecha_ingreso, tipo_personal, puesto_id, role_id, sueldo_diario_base, is_jefe, supervisor_id, company_id, unit_id, mine_id, status)
    VALUES ('EMP-109', 'EMP-109', 'Arturo', 'Domínguez Lara', 'DOLA880630HZS', '2021-11-10', 'OPERATIVO', v_puesto_alba, v_rol_civil, 560.00, false, v_emp_sup3, v_comp_cont, v_unit_norte, v_mina_sj, 'ACTIVO')
    RETURNING id INTO v_emp_op9;

    INSERT INTO public.rh_employees (employee_code, numero_empleado, first_name, last_name, curp, fecha_ingreso, tipo_personal, puesto_id, role_id, sueldo_diario_base, is_jefe, supervisor_id, company_id, unit_id, mine_id, status)
    VALUES ('EMP-110', 'EMP-110', 'Sergio', 'Navarro Peña', 'NAPS910209HZS', '2022-08-22', 'OPERATIVO', v_puesto_alba, v_rol_lanzador, 600.00, false, v_emp_sup3, v_comp_cont, v_unit_norte, v_mina_sj, 'ACTIVO')
    RETURNING id INTO v_emp_op10;

    INSERT INTO public.rh_employees (employee_code, numero_empleado, first_name, last_name, curp, fecha_ingreso, tipo_personal, puesto_id, role_id, sueldo_diario_base, is_jefe, supervisor_id, company_id, unit_id, mine_id, status)
    VALUES ('EMP-111', 'EMP-111', 'Héctor', 'Flores Vargas', 'FOVH970119HZS', '2023-04-05', 'OPERATIVO', v_puesto_ayu, v_rol_serv, 450.00, false, v_emp_sup3, v_comp_cont, v_unit_norte, v_mina_sj, 'ACTIVO')
    RETURNING id INTO v_emp_op11;

    INSERT INTO public.rh_employees (employee_code, numero_empleado, first_name, last_name, curp, fecha_ingreso, tipo_personal, puesto_id, role_id, sueldo_diario_base, is_jefe, supervisor_id, company_id, unit_id, mine_id, status)
    VALUES ('EMP-112', 'EMP-112', 'Gustavo', 'Salazar Medina', 'SAMG941012HZS', '2023-05-18', 'OPERATIVO', v_puesto_ayu, v_rol_serv, 450.00, false, v_emp_sup3, v_comp_cont, v_unit_norte, v_mina_esp, 'ACTIVO')
    RETURNING id INTO v_emp_op12;

    -- =====================================================================================
    -- 11.5 TURNOS, TIPOS DE ASISTENCIA Y CUADRILLAS
    -- =====================================================================================
    INSERT INTO public.cat_turnos (nombre, codigo, hora_inicio, hora_fin, cruza_dia, tolerancia_minutos)
    VALUES ('Primer Turno (Día)', 'T1', '07:00:00', '15:30:00', false, 15)
    RETURNING id INTO v_turno_dia;

    INSERT INTO public.cat_turnos (nombre, codigo, hora_inicio, hora_fin, cruza_dia, tolerancia_minutos)
    VALUES ('Segundo Turno (Noche)', 'T2', '19:00:00', '03:30:00', true, 15)
    RETURNING id INTO v_turno_noche;

    INSERT INTO public.cat_turnos (nombre, codigo, hora_inicio, hora_fin, cruza_dia, tolerancia_minutos)
    VALUES ('Tercer Turno (Mixto)', 'T3', '15:00:00', '23:00:00', false, 15)
    RETURNING id INTO v_turno_mixto;

    INSERT INTO public.cat_asistencias (codigo, nombre, descripcion, efecto_nomina, color, orden)
    VALUES ('ASISTENCIA', 'Asistencia Normal', 'Jornada completa trabajada en turno', 'PAGA_NORMAL', 'emerald', 1)
    RETURNING id INTO v_asist_ok;

    INSERT INTO public.cat_asistencias (codigo, nombre, descripcion, efecto_nomina, color, orden)
    VALUES ('FALTA', 'Falta Injustificada', 'Ausencia sin aviso ni justificante', 'DESCUENTA_DIA', 'rose', 2)
    RETURNING id INTO v_asist_falta;

    INSERT INTO public.cat_asistencias (codigo, nombre, descripcion, efecto_nomina, color, orden)
    VALUES ('INCAPACIDAD', 'Incapacidad IMSS', 'Incapacidad médica oficial', 'INCAPACIDAD', 'amber', 3)
    RETURNING id INTO v_asist_incap;

    INSERT INTO public.cat_asistencias (codigo, nombre, descripcion, efecto_nomina, color, orden)
    VALUES ('PERMISO_C_GOCE', 'Permiso con Goce', 'Permiso autorizado con pago de día base', 'PAGA_NORMAL', 'blue', 4)
    RETURNING id INTO v_asist_perm_cg;

    INSERT INTO public.cat_asistencias (codigo, nombre, descripcion, efecto_nomina, color, orden)
    VALUES ('PERMISO_S_GOCE', 'Permiso sin Goce', 'Permiso autorizado sin pago de día base', 'DESCUENTA_DIA', 'slate', 5)
    RETURNING id INTO v_asist_perm_sg;

    INSERT INTO public.cat_asistencias (codigo, nombre, descripcion, efecto_nomina, color, orden)
    VALUES ('VACACIONES', 'Vacaciones', 'Periodo vacacional programado', 'PAGA_NORMAL', 'purple', 6)
    RETURNING id INTO v_asist_vac;

    -- Cuadrillas
    INSERT INTO public.cat_cuadrillas (nombre, codigo, supervisor_id, mine_site_id, turno_actual_id)
    VALUES ('Cuadrilla Alfa - Desarrollo', 'C-ALFA', v_emp_sup1, v_mina_sj, v_turno_dia)
    RETURNING id INTO v_cuad_alfa;

    INSERT INTO public.cat_cuadrillas (nombre, codigo, supervisor_id, mine_site_id, turno_actual_id)
    VALUES ('Cuadrilla Bravo - Producción y Acarreo', 'C-BRAVO', v_emp_sup2, v_mina_sj, v_turno_noche)
    RETURNING id INTO v_cuad_bravo;

    INSERT INTO public.cat_cuadrillas (nombre, codigo, supervisor_id, mine_site_id, turno_actual_id)
    VALUES ('Cuadrilla Charlie - Obra Civil y Fortificación', 'C-CHARLIE', v_emp_sup3, v_mina_sj, v_turno_dia)
    RETURNING id INTO v_cuad_charlie;

    INSERT INTO public.cat_cuadrillas (nombre, codigo, supervisor_id, mine_site_id, turno_actual_id)
    VALUES ('Cuadrilla Delta - Esperanza', 'C-DELTA', v_emp_sup3, v_mina_esp, v_turno_mixto)
    RETURNING id INTO v_cuad_delta;

    -- Miembros de Cuadrillas
    INSERT INTO public.cat_cuadrillas_miembros (cuadrilla_id, empleado_id, rol_operativo_id) VALUES
    (v_cuad_alfa, v_emp_op1, v_rol_jumbo),
    (v_cuad_alfa, v_emp_op2, v_rol_ayu_jumbo),
    (v_cuad_alfa, v_emp_op3, v_rol_pierna),
    (v_cuad_alfa, v_emp_op4, v_rol_ayu_pierna),
    (v_cuad_bravo, v_emp_op5, v_rol_scoop),
    (v_cuad_bravo, v_emp_op6, v_rol_camion),
    (v_cuad_bravo, v_emp_op7, v_rol_camion),
    (v_cuad_bravo, v_emp_op8, v_rol_jumbo),
    (v_cuad_charlie, v_emp_op9, v_rol_civil),
    (v_cuad_charlie, v_emp_op10, v_rol_lanzador),
    (v_cuad_charlie, v_emp_op11, v_rol_serv),
    (v_cuad_delta, v_emp_op12, v_rol_serv);

    -- =====================================================================================
    -- 11.6 TIPOS DE EQUIPO Y FLOTA DE EQUIPOS (STATUS 'DISPONIBLE')
    -- =====================================================================================
    INSERT INTO public.cat_tipos_equipo (nombre, Prefijo) VALUES
    ('JUMBO', 'JM'),
    ('SCOOPTRAM', 'SC'),
    ('CAMION_BAJO_PERFIL', 'CM'),
    ('ROBOFOR / SIMBA', 'RB'),
    ('LANZADORA_SHOTCRETE', 'LZ'),
    ('RETROEXCAVADORA', 'RT'),
    ('CAMIONETA_MINA', 'PU'),
    ('COMPRESOR', 'CP');

    INSERT INTO public.ops_equipment (clave, nombre, tipo, marca, modelo, serie, anio, company_id, unit_id, mine_id, horometro_actual, status)
    VALUES ('JM-01', 'JM-01 - Epiroc Boomer S2', 'JUMBO', 'Epiroc', 'Boomer S2', 'EP-98101', 2022, v_comp_main, v_unit_norte, v_mina_sj, 3420.5, 'DISPONIBLE')
    RETURNING id INTO v_eq_jm01;

    INSERT INTO public.ops_equipment (clave, nombre, tipo, marca, modelo, serie, anio, company_id, unit_id, mine_id, horometro_actual, status)
    VALUES ('JM-02', 'JM-02 - Sandvik DD321', 'JUMBO', 'Sandvik', 'DD321', 'SV-77412', 2021, v_comp_main, v_unit_norte, v_mina_sj, 4890.0, 'DISPONIBLE')
    RETURNING id INTO v_eq_jm02;

    INSERT INTO public.ops_equipment (clave, nombre, tipo, marca, modelo, serie, anio, company_id, unit_id, mine_id, horometro_actual, status)
    VALUES ('SC-01', 'SC-01 - Epiroc Scooptram ST1030', 'SCOOPTRAM', 'Epiroc', 'ST1030', 'EP-55120', 2022, v_comp_main, v_unit_norte, v_mina_sj, 5120.8, 'DISPONIBLE')
    RETURNING id INTO v_eq_sc01;

    INSERT INTO public.ops_equipment (clave, nombre, tipo, marca, modelo, serie, anio, company_id, unit_id, mine_id, horometro_actual, status)
    VALUES ('SC-02', 'SC-02 - CAT R1600H', 'SCOOPTRAM', 'Caterpillar', 'R1600H', 'CAT-33901', 2020, v_comp_main, v_unit_norte, v_mina_esp, 6750.2, 'DISPONIBLE')
    RETURNING id INTO v_eq_sc02;

    INSERT INTO public.ops_equipment (clave, nombre, tipo, marca, modelo, serie, anio, company_id, unit_id, mine_id, horometro_actual, status)
    VALUES ('CM-01', 'CM-01 - Epiroc Minetruck MT42', 'CAMION_BAJO_PERFIL', 'Epiroc', 'MT42', 'EP-66201', 2023, v_comp_main, v_unit_norte, v_mina_sj, 2150.0, 'DISPONIBLE')
    RETURNING id INTO v_eq_cm01;

    INSERT INTO public.ops_equipment (clave, nombre, tipo, marca, modelo, serie, anio, company_id, unit_id, mine_id, horometro_actual, status)
    VALUES ('CM-02', 'CM-02 - Sandvik TH430', 'CAMION_BAJO_PERFIL', 'Sandvik', 'TH430', 'SV-88304', 2022, v_comp_main, v_unit_norte, v_mina_sj, 3890.4, 'DISPONIBLE')
    RETURNING id INTO v_eq_cm02;

    INSERT INTO public.ops_equipment (clave, nombre, tipo, marca, modelo, serie, anio, company_id, unit_id, mine_id, horometro_actual, status)
    VALUES ('RB-01', 'RB-01 - Epiroc Simba S7', 'ROBOFOR / SIMBA', 'Epiroc', 'Simba S7', 'EP-44910', 2023, v_comp_main, v_unit_norte, v_mina_sj, 1840.0, 'DISPONIBLE')
    RETURNING id INTO v_eq_rb01;

    INSERT INTO public.ops_equipment (clave, nombre, tipo, marca, modelo, serie, anio, company_id, unit_id, mine_id, horometro_actual, status)
    VALUES ('LZ-01', 'LZ-01 - Putzmeister Wetkret 4', 'LANZADORA_SHOTCRETE', 'Putzmeister', 'Wetkret 4', 'PM-11029', 2022, v_comp_cont, v_unit_norte, v_mina_sj, 2310.5, 'DISPONIBLE')
    RETURNING id INTO v_eq_lz01;

    -- =====================================================================================
    -- 11.7 CATÁLOGO DE PRODUCTOS DE MINA Y TARIFAS DE DESTAJO
    -- =====================================================================================
    -- PERFORACION
    INSERT INTO public.cat_productos_mina (nombre, categoria, unidad_medida_default, modo_captura, tarifa_pago, tipos_equipo_permitidos)
    VALUES ('Avance Lineal con Jumbo (4.5 x 4.5m)', 'PERFORACION', 'METROS_LINEALES', 'SIMPLE', 480.00, ARRAY['JUMBO'])
    RETURNING id INTO v_prod_avance_jumbo;

    INSERT INTO public.cat_producto_variables (producto_id, clave, label, unidad, tipo_input, orden) VALUES
    (v_prod_avance_jumbo, 'num_barrenos', 'Núm. Barrenos Dados', 'PZA', 'NUMBER', 1),
    (v_prod_avance_jumbo, 'longitud_barreno', 'Longitud Promedio', 'MTS', 'NUMBER', 2);

    INSERT INTO public.cat_productos_mina (nombre, categoria, unidad_medida_default, modo_captura, tarifa_pago, tipos_equipo_permitidos)
    VALUES ('Anclaje Sistemático con Resina (8 pies)', 'PERFORACION', 'PIEZAS', 'SIMPLE', 45.00, ARRAY['JUMBO'])
    RETURNING id INTO v_prod_anclaje_resina;

    INSERT INTO public.cat_producto_variables (producto_id, clave, label, unidad, tipo_input, orden) VALUES
    (v_prod_anclaje_resina, 'cartuchos_resina', 'Cartuchos Utilizados', 'PZA', 'NUMBER', 1);

    INSERT INTO public.cat_productos_mina (nombre, categoria, unidad_medida_default, modo_captura, tarifa_pago, tipos_equipo_permitidos)
    VALUES ('Anclaje Split Set / Fricción (7 pies)', 'PERFORACION', 'PIEZAS', 'SIMPLE', 38.00, ARRAY['JUMBO'])
    RETURNING id INTO v_prod_anclaje_friccion;

    INSERT INTO public.cat_productos_mina (nombre, categoria, unidad_medida_default, modo_captura, tarifa_pago, tipos_equipo_permitidos)
    VALUES ('Barrenación Larga de Producción (Simba)', 'PERFORACION', 'METROS_BARRENADOS', 'SIMPLE', 85.00, ARRAY['ROBOFOR / SIMBA'])
    RETURNING id INTO v_prod_barreno_largo;

    INSERT INTO public.cat_productos_mina (nombre, categoria, unidad_medida_default, modo_captura, tarifa_pago, tipos_equipo_permitidos)
    VALUES ('Avance Frente con Máquina de Pierna', 'PERFORACION', 'METROS_LINEALES', 'SIMPLE', 620.00, ARRAY[]::text[])
    RETURNING id INTO v_prod_avance_pierna;

    -- FLETE Y ACARREO
    INSERT INTO public.cat_productos_mina (nombre, categoria, unidad_medida_default, modo_captura, tarifa_pago, tipos_equipo_permitidos)
    VALUES ('Acarreo de Mineral a Tolva / Superficie', 'FLETE', 'TONELADAS', 'SIMPLE', 14.50, ARRAY['CAMION_BAJO_PERFIL'])
    RETURNING id INTO v_prod_flete_mineral;

    INSERT INTO public.cat_producto_variables (producto_id, clave, label, unidad, tipo_input, orden) VALUES
    (v_prod_flete_mineral, 'viajes', 'Viajes Realizados', 'VIAJES', 'NUMBER', 1),
    (v_prod_flete_mineral, 'distancia_km', 'Distancia (Km)', 'KM', 'NUMBER', 2);

    INSERT INTO public.cat_productos_mina (nombre, categoria, unidad_medida_default, modo_captura, tarifa_pago, tipos_equipo_permitidos)
    VALUES ('Acarreo de Tepetate a Relleno / Terrero', 'FLETE', 'TONELADAS', 'SIMPLE', 11.00, ARRAY['CAMION_BAJO_PERFIL'])
    RETURNING id INTO v_prod_flete_tepetate;

    INSERT INTO public.cat_producto_variables (producto_id, clave, label, unidad, tipo_input, orden) VALUES
    (v_prod_flete_tepetate, 'viajes', 'Viajes Realizados', 'VIAJES', 'NUMBER', 1);

    INSERT INTO public.cat_productos_mina (nombre, categoria, unidad_medida_default, modo_captura, tarifa_pago, tipos_equipo_permitidos)
    VALUES ('Rezaga y Limpieza de Frente con Scooptram', 'FLETE', 'CUCHARONES', 'SIMPLE', 22.00, ARRAY['SCOOPTRAM'])
    RETURNING id INTO v_prod_rezaga_scoop;

    -- SERVICIOS Y OBRA CIVIL
    INSERT INTO public.cat_productos_mina (nombre, categoria, unidad_medida_default, modo_captura, formula_cobro, tarifa_pago, tipos_equipo_permitidos)
    VALUES ('Instalación de Malla Electrosoldada', 'SERVICIOS_OBRA_CIVIL', 'METROS_CUADRADOS', 'CALCULADO', 'l * h', 32.00, ARRAY['JUMBO'])
    RETURNING id INTO v_prod_malla;

    INSERT INTO public.cat_producto_variables (producto_id, clave, label, unidad, tipo_input, orden) VALUES
    (v_prod_malla, 'l', 'Largo Instalado', 'MTS', 'NUMBER', 1),
    (v_prod_malla, 'h', 'Ancho / Altura', 'MTS', 'NUMBER', 2);

    INSERT INTO public.cat_productos_mina (nombre, categoria, unidad_medida_default, modo_captura, tarifa_pago, tipos_equipo_permitidos)
    VALUES ('Zarpeo de Concreto Lanzado (Shotcrete)', 'SERVICIOS_OBRA_CIVIL', 'METROS_CUBICOS', 'SIMPLE', 140.00, ARRAY['LANZADORA_SHOTCRETE'])
    RETURNING id INTO v_prod_zarpeo;

    INSERT INTO public.cat_productos_mina (nombre, categoria, unidad_medida_default, modo_captura, tarifa_pago, tipos_equipo_permitidos)
    VALUES ('Tendido de Servicios (Agua, Aire y Ventilación)', 'SERVICIOS_OBRA_CIVIL', 'METROS_LINEALES', 'SIMPLE', 55.00, ARRAY[]::text[])
    RETURNING id INTO v_prod_servicios;

    INSERT INTO public.cat_productos_mina (nombre, categoria, unidad_medida_default, modo_captura, tarifa_pago, tipos_equipo_permitidos)
    VALUES ('Construcción de Cuneta de Drenaje', 'SERVICIOS_OBRA_CIVIL', 'METROS_LINEALES', 'SIMPLE', 95.00, ARRAY[]::text[])
    RETURNING id INTO v_prod_cuneta;

    INSERT INTO public.cat_productos_mina (nombre, categoria, unidad_medida_default, modo_captura, formula_cobro, tarifa_pago, tipos_equipo_permitidos)
    VALUES ('Colado de Plantilla Hidráulica', 'SERVICIOS_OBRA_CIVIL', 'METROS_CUBICOS', 'CALCULADO', 'l * a * e', 180.00, ARRAY[]::text[])
    RETURNING id INTO v_prod_plantilla;

    INSERT INTO public.cat_producto_variables (producto_id, clave, label, unidad, tipo_input, orden) VALUES
    (v_prod_plantilla, 'l', 'Largo', 'MTS', 'NUMBER', 1),
    (v_prod_plantilla, 'a', 'Ancho', 'MTS', 'NUMBER', 2),
    (v_prod_plantilla, 'e', 'Espesor', 'MTS', 'NUMBER', 3);

    INSERT INTO public.cat_productos_mina (nombre, categoria, unidad_medida_default, modo_captura, formula_cobro, tarifa_pago, tipos_equipo_permitidos)
    VALUES ('Muro de Contención / Ventilación', 'SERVICIOS_OBRA_CIVIL', 'METROS_CUADRADOS', 'CALCULADO', 'l * h', 125.00, ARRAY[]::text[])
    RETURNING id INTO v_prod_muro;

    INSERT INTO public.cat_producto_variables (producto_id, clave, label, unidad, tipo_input, orden) VALUES
    (v_prod_muro, 'l', 'Largo del Muro', 'MTS', 'NUMBER', 1),
    (v_prod_muro, 'h', 'Altura del Muro', 'MTS', 'NUMBER', 2);

    -- =====================================================================================
    -- 11.8 SEMANA HISTÓRICA CERRADA (PARA DEMOSTRAR PRE-NÓMINA COMPLETA)
    -- =====================================================================================
    INSERT INTO public.ops_planes_semanales (nombre, fecha_inicio, fecha_fin, estado, notas)
    VALUES ('Plan Semanal S-44 (Cerrado)', CURRENT_DATE - INTERVAL '12 days', CURRENT_DATE - INTERVAL '6 days', 'CERRADO', 'Semana concluida al 96% de cumplimiento de avance.')
    RETURNING id INTO v_plan_cerrado;

    INSERT INTO public.ops_semanas (numero_semana, anio, nombre, fecha_inicio, fecha_fin, estado, plan_id, total_reportes)
    VALUES (44, EXTRACT(YEAR FROM CURRENT_DATE)::int, 'Semana 44 - Cierre Operativo Mina San José', (CURRENT_DATE - INTERVAL '11 days')::date, (CURRENT_DATE - INTERVAL '7 days')::date, 'CERRADA', v_plan_cerrado, 5)
    RETURNING id INTO v_semana_cerrada;

    -- 5 Reportes Aprobados y Empaquetados en v_semana_cerrada
    INSERT INTO public.ops_daily_reports (fecha, turno_id, mine_site_id, cuadrilla_id, supervisor_id, semana_id, estado, observaciones_generales)
    VALUES ((CURRENT_DATE - INTERVAL '11 days')::date, v_turno_dia, v_mina_sj, v_cuad_alfa, v_emp_sup1, v_semana_cerrada, 'APROBADO', 'Avance limpio en Rampa 100. Roca competente.')
    RETURNING id INTO v_rep1;

    INSERT INTO public.ops_daily_reports (fecha, turno_id, mine_site_id, cuadrilla_id, supervisor_id, semana_id, estado, observaciones_generales)
    VALUES ((CURRENT_DATE - INTERVAL '10 days')::date, v_turno_noche, v_mina_sj, v_cuad_bravo, v_emp_sup2, v_semana_cerrada, 'APROBADO', 'Acarreo continuo en Rebaje 450 Norte.')
    RETURNING id INTO v_rep2;

    INSERT INTO public.ops_daily_reports (fecha, turno_id, mine_site_id, cuadrilla_id, supervisor_id, semana_id, estado, observaciones_generales)
    VALUES ((CURRENT_DATE - INTERVAL '9 days')::date, v_turno_dia, v_mina_sj, v_cuad_charlie, v_emp_sup3, v_semana_cerrada, 'APROBADO', 'Fortificación con malla y zarpeo en Crucero 200 Sur.')
    RETURNING id INTO v_rep3;

    INSERT INTO public.ops_daily_reports (fecha, turno_id, mine_site_id, cuadrilla_id, supervisor_id, semana_id, estado, observaciones_generales)
    VALUES ((CURRENT_DATE - INTERVAL '8 days')::date, v_turno_dia, v_mina_sj, v_cuad_alfa, v_emp_sup1, v_semana_cerrada, 'APROBADO', 'Doble disparo en Rampa 100 y Frente Veta Madre.')
    RETURNING id INTO v_rep4;

    INSERT INTO public.ops_daily_reports (fecha, turno_id, mine_site_id, cuadrilla_id, supervisor_id, semana_id, estado, observaciones_generales)
    VALUES ((CURRENT_DATE - INTERVAL '7 days')::date, v_turno_noche, v_mina_sj, v_cuad_bravo, v_emp_sup2, v_semana_cerrada, 'APROBADO', 'Cierre de rezaga y acarreo semanal.')
    RETURNING id INTO v_rep5;

    -- Asistencias para los 5 reportes de la semana cerrada
    INSERT INTO public.ops_daily_attendance (report_id, empleado_id, asistencia_tipo_id, rol_asignado_id, horas_trabajadas) VALUES
    -- Día 1 (rep1)
    (v_rep1, v_emp_op1, v_asist_ok, v_rol_jumbo, 8),
    (v_rep1, v_emp_op2, v_asist_ok, v_rol_ayu_jumbo, 8),
    (v_rep1, v_emp_op3, v_asist_ok, v_rol_pierna, 8),
    (v_rep1, v_emp_op4, v_asist_ok, v_rol_ayu_pierna, 8),
    (v_rep1, v_emp_op5, v_asist_ok, v_rol_scoop, 8),
    (v_rep1, v_emp_op6, v_asist_ok, v_rol_camion, 8),
    (v_rep1, v_emp_op9, v_asist_ok, v_rol_civil, 8),
    (v_rep1, v_emp_op10, v_asist_ok, v_rol_lanzador, 8),
    -- Día 2 (rep2)
    (v_rep2, v_emp_op1, v_asist_ok, v_rol_jumbo, 8),
    (v_rep2, v_emp_op2, v_asist_ok, v_rol_ayu_jumbo, 8),
    (v_rep2, v_emp_op3, v_asist_ok, v_rol_pierna, 8),
    (v_rep2, v_emp_op4, v_asist_falta, v_rol_ayu_pierna, 0),
    (v_rep2, v_emp_op5, v_asist_ok, v_rol_scoop, 8),
    (v_rep2, v_emp_op6, v_asist_ok, v_rol_camion, 8),
    (v_rep2, v_emp_op7, v_asist_ok, v_rol_camion, 8),
    (v_rep2, v_emp_op9, v_asist_ok, v_rol_civil, 8),
    -- Día 3 (rep3)
    (v_rep3, v_emp_op1, v_asist_ok, v_rol_jumbo, 8),
    (v_rep3, v_emp_op2, v_asist_ok, v_rol_ayu_jumbo, 8),
    (v_rep3, v_emp_op3, v_asist_ok, v_rol_pierna, 8),
    (v_rep3, v_emp_op4, v_asist_ok, v_rol_ayu_pierna, 8),
    (v_rep3, v_emp_op5, v_asist_ok, v_rol_scoop, 8),
    (v_rep3, v_emp_op6, v_asist_ok, v_rol_camion, 8),
    (v_rep3, v_emp_op9, v_asist_ok, v_rol_civil, 8),
    (v_rep3, v_emp_op10, v_asist_ok, v_rol_lanzador, 8),
    (v_rep3, v_emp_op11, v_asist_ok, v_rol_serv, 8),
    -- Día 4 (rep4)
    (v_rep4, v_emp_op1, v_asist_ok, v_rol_jumbo, 8),
    (v_rep4, v_emp_op2, v_asist_ok, v_rol_ayu_jumbo, 8),
    (v_rep4, v_emp_op3, v_asist_ok, v_rol_pierna, 8),
    (v_rep4, v_emp_op4, v_asist_ok, v_rol_ayu_pierna, 8),
    (v_rep4, v_emp_op5, v_asist_ok, v_rol_scoop, 8),
    (v_rep4, v_emp_op6, v_asist_ok, v_rol_camion, 8),
    (v_rep4, v_emp_op7, v_asist_ok, v_rol_camion, 8),
    (v_rep4, v_emp_op9, v_asist_ok, v_rol_civil, 8),
    (v_rep4, v_emp_op10, v_asist_ok, v_rol_lanzador, 8),
    -- Día 5 (rep5)
    (v_rep5, v_emp_op1, v_asist_ok, v_rol_jumbo, 8),
    (v_rep5, v_emp_op2, v_asist_ok, v_rol_ayu_jumbo, 8),
    (v_rep5, v_emp_op3, v_asist_ok, v_rol_pierna, 8),
    (v_rep5, v_emp_op4, v_asist_ok, v_rol_ayu_pierna, 8),
    (v_rep5, v_emp_op5, v_asist_ok, v_rol_scoop, 8),
    (v_rep5, v_emp_op6, v_asist_ok, v_rol_camion, 8),
    (v_rep5, v_emp_op7, v_asist_ok, v_rol_camion, 8),
    (v_rep5, v_emp_op9, v_asist_ok, v_rol_civil, 8),
    (v_rep5, v_emp_op10, v_asist_ok, v_rol_lanzador, 8),
    (v_rep5, v_emp_op11, v_asist_ok, v_rol_serv, 8);

    -- Actividades de producción para la semana cerrada + Participantes (Destajos)
    -- Item 1: Avance Jumbo (rep1)
    INSERT INTO public.ops_report_items (report_id, producto_id, equipo_id, location_id, cantidad_total, variables_capturadas)
    VALUES (v_rep1, v_prod_avance_jumbo, v_eq_jm01, v_loc_rampa100, 12.50, '{"num_barrenos": 48, "longitud_barreno": 3.8}'::jsonb)
    RETURNING id INTO v_item_id;
    INSERT INTO public.ops_report_personnel (report_item_id, empleado_id, rol_ejercido_id, porcentaje_participacion) VALUES
    (v_item_id, v_emp_op1, v_rol_jumbo, 65.00),
    (v_item_id, v_emp_op2, v_rol_ayu_jumbo, 35.00);

    -- Item 2: Anclaje Resina (rep1)
    INSERT INTO public.ops_report_items (report_id, producto_id, equipo_id, location_id, cantidad_total, variables_capturadas)
    VALUES (v_rep1, v_prod_anclaje_resina, v_eq_jm01, v_loc_rampa100, 60.00, '{"cartuchos_resina": 180}'::jsonb)
    RETURNING id INTO v_item_id;
    INSERT INTO public.ops_report_personnel (report_item_id, empleado_id, rol_ejercido_id, porcentaje_participacion) VALUES
    (v_item_id, v_emp_op3, v_rol_pierna, 60.00),
    (v_item_id, v_emp_op4, v_rol_ayu_pierna, 40.00);

    -- Item 3: Acarreo Mineral (rep2)
    INSERT INTO public.ops_report_items (report_id, producto_id, equipo_id, location_id, cantidad_total, variables_capturadas)
    VALUES (v_rep2, v_prod_flete_mineral, v_eq_cm01, v_loc_rebaje450, 420.00, '{"viajes": 14, "distancia_km": 3.5}'::jsonb)
    RETURNING id INTO v_item_id;
    INSERT INTO public.ops_report_personnel (report_item_id, empleado_id, rol_ejercido_id, porcentaje_participacion) VALUES
    (v_item_id, v_emp_op6, v_rol_camion, 50.00),
    (v_item_id, v_emp_op7, v_rol_camion, 50.00);

    -- Item 4: Rezaga Scoop (rep2)
    INSERT INTO public.ops_report_items (report_id, producto_id, equipo_id, location_id, cantidad_total, variables_capturadas)
    VALUES (v_rep2, v_prod_rezaga_scoop, v_eq_sc01, v_loc_rebaje450, 145.00, '{}'::jsonb)
    RETURNING id INTO v_item_id;
    INSERT INTO public.ops_report_personnel (report_item_id, empleado_id, rol_ejercido_id, porcentaje_participacion) VALUES
    (v_item_id, v_emp_op5, v_rol_scoop, 100.00);

    -- Item 5: Zarpeo Concreto (rep3)
    INSERT INTO public.ops_report_items (report_id, producto_id, equipo_id, location_id, cantidad_total, variables_capturadas)
    VALUES (v_rep3, v_prod_zarpeo, v_eq_lz01, v_loc_crucero200, 28.00, '{}'::jsonb)
    RETURNING id INTO v_item_id;
    INSERT INTO public.ops_report_personnel (report_item_id, empleado_id, rol_ejercido_id, porcentaje_participacion) VALUES
    (v_item_id, v_emp_op10, v_rol_lanzador, 60.00),
    (v_item_id, v_emp_op9, v_rol_civil, 40.00);

    -- Item 6: Malla Electrosoldada (rep3)
    INSERT INTO public.ops_report_items (report_id, producto_id, equipo_id, location_id, cantidad_total, variables_capturadas)
    VALUES (v_rep3, v_prod_malla, v_eq_jm02, v_loc_crucero200, 95.00, '{"l": 19, "h": 5}'::jsonb)
    RETURNING id INTO v_item_id;
    INSERT INTO public.ops_report_personnel (report_item_id, empleado_id, rol_ejercido_id, porcentaje_participacion) VALUES
    (v_item_id, v_emp_op9, v_rol_civil, 50.00),
    (v_item_id, v_emp_op11, v_rol_serv, 50.00);

    -- Item 7: Avance Jumbo (rep4)
    INSERT INTO public.ops_report_items (report_id, producto_id, equipo_id, location_id, cantidad_total, variables_capturadas)
    VALUES (v_rep4, v_prod_avance_jumbo, v_eq_jm01, v_loc_veta, 14.00, '{"num_barrenos": 52, "longitud_barreno": 4.0}'::jsonb)
    RETURNING id INTO v_item_id;
    INSERT INTO public.ops_report_personnel (report_item_id, empleado_id, rol_ejercido_id, porcentaje_participacion) VALUES
    (v_item_id, v_emp_op1, v_rol_jumbo, 65.00),
    (v_item_id, v_emp_op2, v_rol_ayu_jumbo, 35.00);

    -- Item 8: Acarreo Tepetate (rep5)
    INSERT INTO public.ops_report_items (report_id, producto_id, equipo_id, location_id, cantidad_total, variables_capturadas)
    VALUES (v_rep5, v_prod_flete_tepetate, v_eq_cm02, v_loc_rampa100, 360.00, '{"viajes": 12}'::jsonb)
    RETURNING id INTO v_item_id;
    INSERT INTO public.ops_report_personnel (report_item_id, empleado_id, rol_ejercido_id, porcentaje_participacion) VALUES
    (v_item_id, v_emp_op6, v_rol_camion, 50.00),
    (v_item_id, v_emp_op7, v_rol_camion, 50.00);

    -- =====================================================================================
    -- 11.9 SEMANA EN CURSO ACTIVA (PLANEACIÓN + REPORTES DIARIOS DE LA SEMANA ACTUAL)
    -- =====================================================================================
    INSERT INTO public.ops_planes_semanales (nombre, fecha_inicio, fecha_fin, estado, notas)
    VALUES (
        'Semana en Curso - Plan Maestro de Producción',
        (CURRENT_DATE - INTERVAL '3 days')::date,
        (CURRENT_DATE + INTERVAL '3 days')::date,
        'ACTIVO',
        'Prioridad operativa en Rampa Principal Nivel 100 y acarreo de mineral en Rebaje 450 Norte.'
    )
    RETURNING id INTO v_plan_activo;

    -- Metas Semanales Proyectadas (ops_plan_items)
    INSERT INTO public.ops_plan_items (plan_id, producto_id, mine_site_id, location_id, meta_proyectada, notas) VALUES
    (v_plan_activo, v_prod_avance_jumbo, v_mina_sj, v_loc_rampa100, 45.00, 'Meta crítica de desarrollo en rampa'),
    (v_plan_activo, v_prod_anclaje_resina, v_mina_sj, v_loc_rampa100, 220.00, 'Fortificación sistemática obligatoria'),
    (v_plan_activo, v_prod_barreno_largo, v_mina_sj, v_loc_rebaje450, 350.00, 'Barrenación de producción con Simba'),
    (v_plan_activo, v_prod_flete_mineral, v_mina_sj, v_loc_rebaje450, 1500.00, 'Acarreo de mineral a tolva principal'),
    (v_plan_activo, v_prod_rezaga_scoop, v_mina_sj, v_loc_rebaje450, 400.00, 'Limpieza de frentes de producción'),
    (v_plan_activo, v_prod_malla, v_mina_sj, v_loc_crucero200, 250.00, 'Instalación de malla en Crucero 200'),
    (v_plan_activo, v_prod_zarpeo, v_mina_sj, v_loc_crucero200, 60.00, 'Concreto lanzado de sostenimiento'),
    (v_plan_activo, v_prod_cuneta, v_mina_esp, v_loc_galeria300, 80.00, 'Obra civil para drenaje en Galería Este');

    -- Reportes Diarios de la Semana en Curso (sin semana_id aún, listos para revisión/empaque)
    INSERT INTO public.ops_daily_reports (fecha, turno_id, mine_site_id, cuadrilla_id, supervisor_id, estado, observaciones_generales)
    VALUES ((CURRENT_DATE - INTERVAL '3 days')::date, v_turno_dia, v_mina_sj, v_cuad_alfa, v_emp_sup1, 'APROBADO', 'Inicio de semana con buen ritmo en Rampa 100. 2 disparos efectivos.')
    RETURNING id INTO v_rep_act1;

    INSERT INTO public.ops_daily_reports (fecha, turno_id, mine_site_id, cuadrilla_id, supervisor_id, estado, observaciones_generales)
    VALUES ((CURRENT_DATE - INTERVAL '2 days')::date, v_turno_noche, v_mina_sj, v_cuad_bravo, v_emp_sup2, 'APROBADO', 'Acarreo de mineral de alta ley en Rebaje 450 Norte y barrenación Simba.')
    RETURNING id INTO v_rep_act2;

    INSERT INTO public.ops_daily_reports (fecha, turno_id, mine_site_id, cuadrilla_id, supervisor_id, estado, observaciones_generales)
    VALUES ((CURRENT_DATE - INTERVAL '1 day')::date, v_turno_dia, v_mina_sj, v_cuad_charlie, v_emp_sup3, 'APROBADO', 'Sostenimiento completo con malla y concreto lanzado en Crucero 200 Sur.')
    RETURNING id INTO v_rep_act3;

    INSERT INTO public.ops_daily_reports (fecha, turno_id, mine_site_id, cuadrilla_id, supervisor_id, estado, observaciones_generales)
    VALUES (CURRENT_DATE, v_turno_dia, v_mina_sj, v_cuad_alfa, v_emp_sup1, 'EN_REVISION', 'Reporte del turno de hoy pendiente de visto bueno de Jefatura de Mina.')
    RETURNING id INTO v_rep_act4;

    -- Pase de Lista Semana en Curso
    INSERT INTO public.ops_daily_attendance (report_id, empleado_id, asistencia_tipo_id, rol_asignado_id, horas_trabajadas) VALUES
    (v_rep_act1, v_emp_op1, v_asist_ok, v_rol_jumbo, 8),
    (v_rep_act1, v_emp_op2, v_asist_ok, v_rol_ayu_jumbo, 8),
    (v_rep_act1, v_emp_op3, v_asist_ok, v_rol_pierna, 8),
    (v_rep_act1, v_emp_op4, v_asist_ok, v_rol_ayu_pierna, 8),
    (v_rep_act2, v_emp_op5, v_asist_ok, v_rol_scoop, 8),
    (v_rep_act2, v_emp_op6, v_asist_ok, v_rol_camion, 8),
    (v_rep_act2, v_emp_op7, v_asist_ok, v_rol_camion, 8),
    (v_rep_act2, v_emp_op8, v_asist_ok, v_rol_jumbo, 8),
    (v_rep_act3, v_emp_op9, v_asist_ok, v_rol_civil, 8),
    (v_rep_act3, v_emp_op10, v_asist_ok, v_rol_lanzador, 8),
    (v_rep_act3, v_emp_op11, v_asist_ok, v_rol_serv, 8),
    (v_rep_act4, v_emp_op1, v_asist_ok, v_rol_jumbo, 8),
    (v_rep_act4, v_emp_op2, v_asist_ok, v_rol_ayu_jumbo, 8),
    (v_rep_act4, v_emp_op3, v_asist_ok, v_rol_pierna, 8),
    (v_rep_act4, v_emp_op4, v_asist_ok, v_rol_ayu_pierna, 8);

    -- Actividades Semana en Curso (Para alimentar Dashboard, Semana en Curso y Pre-Nómina en Vivo)
    -- Reporte Activo 1 (Perforación)
    INSERT INTO public.ops_report_items (report_id, producto_id, equipo_id, location_id, cantidad_total, variables_capturadas)
    VALUES (v_rep_act1, v_prod_avance_jumbo, v_eq_jm01, v_loc_rampa100, 18.50, '{"num_barrenos": 64, "longitud_barreno": 3.9}'::jsonb)
    RETURNING id INTO v_item_id;
    INSERT INTO public.ops_report_personnel (report_item_id, empleado_id, rol_ejercido_id, porcentaje_participacion) VALUES
    (v_item_id, v_emp_op1, v_rol_jumbo, 65.00),
    (v_item_id, v_emp_op2, v_rol_ayu_jumbo, 35.00);

    INSERT INTO public.ops_report_items (report_id, producto_id, equipo_id, location_id, cantidad_total, variables_capturadas)
    VALUES (v_rep_act1, v_prod_anclaje_resina, v_eq_jm01, v_loc_rampa100, 95.00, '{"cartuchos_resina": 285}'::jsonb)
    RETURNING id INTO v_item_id;
    INSERT INTO public.ops_report_personnel (report_item_id, empleado_id, rol_ejercido_id, porcentaje_participacion) VALUES
    (v_item_id, v_emp_op3, v_rol_pierna, 60.00),
    (v_item_id, v_emp_op4, v_rol_ayu_pierna, 40.00);

    -- Reporte Activo 2 (Flete y Simba)
    INSERT INTO public.ops_report_items (report_id, producto_id, equipo_id, location_id, cantidad_total, variables_capturadas)
    VALUES (v_rep_act2, v_prod_flete_mineral, v_eq_cm01, v_loc_rebaje450, 980.00, '{"viajes": 32, "distancia_km": 3.5}'::jsonb)
    RETURNING id INTO v_item_id;
    INSERT INTO public.ops_report_personnel (report_item_id, empleado_id, rol_ejercido_id, porcentaje_participacion) VALUES
    (v_item_id, v_emp_op6, v_rol_camion, 50.00),
    (v_item_id, v_emp_op7, v_rol_camion, 50.00);

    INSERT INTO public.ops_report_items (report_id, producto_id, equipo_id, location_id, cantidad_total, variables_capturadas)
    VALUES (v_rep_act2, v_prod_rezaga_scoop, v_eq_sc01, v_loc_rebaje450, 290.00, '{}'::jsonb)
    RETURNING id INTO v_item_id;
    INSERT INTO public.ops_report_personnel (report_item_id, empleado_id, rol_ejercido_id, porcentaje_participacion) VALUES
    (v_item_id, v_emp_op5, v_rol_scoop, 100.00);

    INSERT INTO public.ops_report_items (report_id, producto_id, equipo_id, location_id, cantidad_total, variables_capturadas)
    VALUES (v_rep_act2, v_prod_barreno_largo, v_eq_rb01, v_loc_rebaje450, 240.00, '{}'::jsonb)
    RETURNING id INTO v_item_id;
    INSERT INTO public.ops_report_personnel (report_item_id, empleado_id, rol_ejercido_id, porcentaje_participacion) VALUES
    (v_item_id, v_emp_op8, v_rol_jumbo, 100.00);

    -- Reporte Activo 3 (Obra Civil y Servicios)
    INSERT INTO public.ops_report_items (report_id, producto_id, equipo_id, location_id, cantidad_total, variables_capturadas)
    VALUES (v_rep_act3, v_prod_malla, v_eq_jm02, v_loc_crucero200, 180.00, '{"l": 36, "h": 5}'::jsonb)
    RETURNING id INTO v_item_id;
    INSERT INTO public.ops_report_personnel (report_item_id, empleado_id, rol_ejercido_id, porcentaje_participacion) VALUES
    (v_item_id, v_emp_op9, v_rol_civil, 50.00),
    (v_item_id, v_emp_op11, v_rol_serv, 50.00);

    INSERT INTO public.ops_report_items (report_id, producto_id, equipo_id, location_id, cantidad_total, variables_capturadas)
    VALUES (v_rep_act3, v_prod_zarpeo, v_eq_lz01, v_loc_crucero200, 44.00, '{}'::jsonb)
    RETURNING id INTO v_item_id;
    INSERT INTO public.ops_report_personnel (report_item_id, empleado_id, rol_ejercido_id, porcentaje_participacion) VALUES
    (v_item_id, v_emp_op10, v_rol_lanzador, 65.00),
    (v_item_id, v_emp_op9, v_rol_civil, 35.00);

    INSERT INTO public.ops_report_items (report_id, producto_id, equipo_id, location_id, cantidad_total, variables_capturadas)
    VALUES (v_rep_act3, v_prod_cuneta, NULL, v_loc_galeria300, 55.00, '{}'::jsonb)
    RETURNING id INTO v_item_id;
    INSERT INTO public.ops_report_personnel (report_item_id, empleado_id, rol_ejercido_id, porcentaje_participacion) VALUES
    (v_item_id, v_emp_op9, v_rol_civil, 50.00),
    (v_item_id, v_emp_op11, v_rol_serv, 50.00);

    -- Reporte Activo 4 (Hoy - En Revisión)
    INSERT INTO public.ops_report_items (report_id, producto_id, equipo_id, location_id, cantidad_total, variables_capturadas)
    VALUES (v_rep_act4, v_prod_avance_jumbo, v_eq_jm01, v_loc_rampa100, 14.50, '{"num_barrenos": 50, "longitud_barreno": 3.8}'::jsonb)
    RETURNING id INTO v_item_id;
    INSERT INTO public.ops_report_personnel (report_item_id, empleado_id, rol_ejercido_id, porcentaje_participacion) VALUES
    (v_item_id, v_emp_op1, v_rol_jumbo, 65.00),
    (v_item_id, v_emp_op2, v_rol_ayu_jumbo, 35.00);

    INSERT INTO public.ops_report_items (report_id, producto_id, equipo_id, location_id, cantidad_total, variables_capturadas)
    VALUES (v_rep_act4, v_prod_anclaje_resina, v_eq_jm01, v_loc_rampa100, 75.00, '{"cartuchos_resina": 225}'::jsonb)
    RETURNING id INTO v_item_id;
    INSERT INTO public.ops_report_personnel (report_item_id, empleado_id, rol_ejercido_id, porcentaje_participacion) VALUES
    (v_item_id, v_emp_op3, v_rol_pierna, 60.00),
    (v_item_id, v_emp_op4, v_rol_ayu_pierna, 40.00);

    -- =====================================================================================
    -- 11.10 PUBLICACIONES EN EL MURO OPERATIVO (BLOG / BITÁCORA DE TURNO)
    -- =====================================================================================
    INSERT INTO public.blog_posts (content, type, status, author_name, author_role, likes, created_at) VALUES
    ('Inspección de ventilación completada en Nivel 100 - Rampa Principal. Flujo de aire óptimo para operación de Jumbo JM-01.', 'POST', 'OPEN', 'Sup. Roberto Sánchez', 'SUPERVISOR', 4, now() - INTERVAL '4 hours'),
    ('Revisar presión hidráulica en brazo izquierdo de Jumbo JM-02 al cambio de turno.', 'TASK', 'OPEN', 'Ing. Miguel Ángel Torres', 'SUPERVISOR', 2, now() - INTERVAL '2 hours'),
    ('PRECAUCIÓN: Trabajos de zarpeo de concreto lanzado en Crucero 200 Sur durante el primer turno. Tránsito restringido a camiones.', 'ALERT', 'OPEN', 'Fernando Herrera', 'JEFE_MINA', 6, now() - INTERVAL '1 hour'),
    ('Cierre de Semana 44 conciliado y disponible para descarga en módulo de Pre-Nómina.', 'TASK', 'COMPLETED', 'Ing. Jesús Administrador', 'SUPER_ADMIN', 5, now() - INTERVAL '30 minutes');

END $$;

-- Recargar caché del esquema en PostgREST
NOTIFY pgrst, 'reload schema';
