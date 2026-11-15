-- ==================================================================================
-- MÓDULO: CONFIGURACIÓN DE SEGURIDAD Y USUARIOS (AUTORIDADES)
-- ==================================================================================

BEGIN;

-- 1. TABLA DE CONFIGURACIÓN DE ROLES (PERMISOS DINÁMICOS)
CREATE TABLE IF NOT EXISTS sys_roles_config (
    role VARCHAR(50) PRIMARY KEY,
    nombre_mostrar VARCHAR(100) NOT NULL,
    can_approve_reports BOOLEAN DEFAULT false,
    can_edit_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE sys_roles_config ENABLE ROW LEVEL SECURITY;

-- Política de Acceso Total (simplificada para desarrollo)
DROP POLICY IF EXISTS "Public Access Roles Config" ON sys_roles_config;
CREATE POLICY "Public Access Roles Config" ON sys_roles_config FOR ALL USING (true) WITH CHECK (true);

-- Insertar roles base (Semilla)
INSERT INTO sys_roles_config (role, nombre_mostrar, can_approve_reports, can_edit_approved)
VALUES 
    ('SUPER_ADMIN', 'Administrador Principal', true, true),
    ('JEFE_MINA', 'Jefe de Mina', true, true),
    ('JEFE_RH', 'Jefe de Recursos Humanos', true, false),
    ('JEFE_PLANEACION', 'Jefe de Planeación', true, true),
    ('SUPERVISOR', 'Supervisor de Turno', false, false),
    ('LECTURA', 'Solo Lectura', false, false)
ON CONFLICT (role) DO UPDATE SET 
    nombre_mostrar = EXCLUDED.nombre_mostrar,
    can_approve_reports = EXCLUDED.can_approve_reports,
    can_edit_approved = EXCLUDED.can_edit_approved;


-- 2. TABLA DE USUARIOS DEL SISTEMA (ACCESOS Y CONTRASEÑAS DE AUTORIZACIÓN)
-- Nota: Esta tabla vincula el email del usuario de Supabase Auth con su nivel de autoridad
CREATE TABLE IF NOT EXISTS sys_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL REFERENCES sys_roles_config(role),
    
    -- Contraseña encriptada o en texto plano si la encripción se maneja en el cliente (simplificado para MVP)
    -- Para producción esto debería ser un hash (bcrypt/argon2).
    auth_password VARCHAR(255), 
    
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE sys_users ENABLE ROW LEVEL SECURITY;

-- Política de Acceso Total (simplificada para desarrollo)
DROP POLICY IF EXISTS "Public Access Sys Users" ON sys_users;
CREATE POLICY "Public Access Sys Users" ON sys_users FOR ALL USING (true) WITH CHECK (true);

-- Insertar usuario Admin por defecto
INSERT INTO sys_users (email, role, auth_password)
VALUES 
    ('admin@rayamina.com', 'SUPER_ADMIN', 'admin123'),
    ('demo@rayamina.com', 'SUPERVISOR', NULL)
ON CONFLICT (email) DO NOTHING;

COMMIT;
