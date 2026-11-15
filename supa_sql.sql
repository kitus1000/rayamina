-- 1. Catálogo de Puestos (RH)
create table if not exists cat_puestos (
  id uuid default gen_random_uuid() primary key,
  nombre text not null unique,
  tipo_personal text check (tipo_personal in ('OPERATIVO', 'ADMINISTRATIVO')),
  activo boolean default true,
  created_at timestamptz default now()
);

-- 2. Catálogo de Roles Operativos (Mina)
create table if not exists cat_roles_operativos (
  id uuid default gen_random_uuid() primary key,
  nombre text not null unique,
  categoria text, -- 'PERFORACION', 'SCOOP', 'SERVICIOS', etc.
  activo boolean default true,
  orden int default 0,
  created_at timestamptz default now()
);

-- 3. Matriz de Compatibilidad (Puesto -> Roles Permitidos)
create table if not exists cat_puesto_roles (
  id uuid default gen_random_uuid() primary key,
  puesto_id uuid references cat_puestos(id) on delete cascade,
  rol_operativo_id uuid references cat_roles_operativos(id) on delete cascade,
  unique(puesto_id, rol_operativo_id)
);

-- 4. Splits de Pago y Tarifas por Rol
create table if not exists cat_role_splits (
  id uuid default gen_random_uuid() primary key,
  rol_operativo_id uuid references cat_roles_operativos(id) on delete cascade,
  concepto_nomina_id uuid, -- Referencia a conceptos (si existe la tabla) o null
  concepto_ref text, -- Referencia texto por ahora (ej. 'DESTAJO_METROS')
  porcentaje numeric(5,2), -- 0.70
  monto_fijo numeric(10,2), -- Opcional
  vigencia_desde date default current_date,
  vigencia_hasta date,
  activo boolean default true,
  created_at timestamptz default now()
);

-- 5. Actualización de Empleados (Agregar referencia a Puesto)
-- Nota: Si la tabla ya tiene datos, esto podría requerir manejo especial.
alter table rh_employees
add column if not exists puesto_id uuid references cat_puestos(id);

alter table rh_employees
add column if not exists is_supervisor boolean default false;

-- Politicas RLS (Seguridad Básica - Permitir todo por ahora en dev)
alter table cat_puestos enable row level security;
create policy "Public Access Puestos" on cat_puestos for all using (true);

alter table cat_roles_operativos enable row level security;
create policy "Public Access Roles" on cat_roles_operativos for all using (true);

alter table cat_puesto_roles enable row level security;
create policy "Public Access Puesto Roles" on cat_puesto_roles for all using (true);

alter table cat_role_splits enable row level security;
create policy "Public Access Splits" on cat_role_splits for all using (true);
