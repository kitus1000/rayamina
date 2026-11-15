const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dmlhmgnkmdjujhefzrmz.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_gM9gIe8-qjOpO-3aKNHokw_uM7Sw5DJ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
    console.log('====================================================');
    console.log('🧪 AUDITORÍA EXHAUSTIVA DE TODAS LAS HERRAMIENTAS Y CONSULTAS');
    console.log('====================================================\n');

    const failures = [];
    const successes = [];

    async function testQuery(name, fn) {
        try {
            const res = await fn();
            if (res.error) {
                console.error(`❌ [FAIL] ${name}:`, res.error.message);
                failures.push({ name, error: res.error.message });
            } else {
                const count = Array.isArray(res.data) ? res.data.length : (res.data ? 1 : 0);
                console.log(`✅ [PASS] ${name} (${count} registros)`);
                successes.push(name);
            }
        } catch (e) {
            console.error(`❌ [EXCEPTION] ${name}:`, e.message);
            failures.push({ name, error: e.message });
        }
    }

    // 1. Inspect actual columns of key tables
    const tablesToInspect = [
        'org_companies',
        'org_units',
        'mine_sites',
        'mine_locations',
        'cat_turnos',
        'cat_puestos',
        'cat_roles_operativos',
        'cat_puesto_roles',
        'cat_role_splits',
        'cat_asistencias',
        'cat_tipos_equipo',
        'ops_equipment',
        'cat_productos_mina',
        'cat_producto_variables',
        'rh_employees',
        'cat_cuadrillas',
        'cat_cuadrillas_miembros',
        'ops_daily_reports',
        'ops_daily_attendance',
        'ops_report_items',
        'ops_report_personnel',
        'ops_planes_semanales',
        'ops_plan_items',
        'ops_semanas',
        'sys_config',
        'sys_users',
        'sys_roles_config',
        'blog_tareas'
    ];

    console.log('--- 1. INSPECCIÓN DE TABLAS Y ESQUEMA EN SUPABASE ---');
    for (const t of tablesToInspect) {
        const { data, error } = await supabase.from(t).select('*').limit(1);
        if (error) {
            console.error(`❌ Tabla [${t}]: ERROR -> ${error.message}`);
            failures.push({ name: `Tabla ${t}`, error: error.message });
        } else {
            const cols = data && data[0] ? Object.keys(data[0]) : ['(tabla vacía)'];
            console.log(`✅ Tabla [${t}]: cols = ${cols.join(', ')}`);
            successes.push(`Tabla ${t}`);
        }
    }

    console.log('\n--- 2. PRUEBA DE CONSULTAS EXACTAS DE CADA MÓDULO ---');

    // Dashboard Page
    await testQuery('Dashboard: ops_report_items feed', () =>
        supabase.from('ops_report_items')
            .select('id, cantidad_total, cat_productos_mina(nombre, categoria), ops_daily_reports(fecha, mine_sites(nombre_mina))')
            .order('created_at', { ascending: false })
            .limit(5)
    );

    await testQuery('Dashboard: ops_report_personnel leaderboard', () =>
        supabase.from('ops_report_personnel')
            .select('empleado_id, porcentaje_participacion, rh_employees(first_name, last_name, cat_puestos(nombre)), ops_report_items!ops_report_personnel_report_item_id_fkey(cantidad_total, cat_productos_mina(categoria))')
            .limit(10)
    );

    // Semana Page
    await testQuery('Semana: ops_planes_semanales + ops_plan_items', () =>
        supabase.from('ops_planes_semanales')
            .select('*, ops_plan_items(producto_id, cantidad_proyectada:meta_proyectada, cat_productos_mina(nombre, unidad_medida_default, tarifa_pago), mine_locations(nombre), mine_sites(nombre_mina))')
    );

    await testQuery('Semana: ops_daily_reports vivos', () =>
        supabase.from('ops_daily_reports')
            .select('id, fecha, ops_report_items(cantidad_total, cat_productos_mina(id, nombre, unidad_medida_default, tarifa_pago), mine_locations(id, nombre)), ops_daily_attendance(empleado_id, cat_asistencias!ops_daily_attendance_asistencia_tipo_id_fkey(codigo), rh_employees(sueldo_diario_base))')
            .limit(5)
    );

    await testQuery('Semana: mine_locations (mine_site_id)', () =>
        supabase.from('mine_locations')
            .select('id, nombre, codigo, mine_site_id')
            .eq('activo', true)
    );

    // Nomina & Tarifas Pages
    await testQuery('Nomina: rh_employees + cat_puestos + cat_roles_operativos', () =>
        supabase.from('rh_employees')
            .select('id, first_name, last_name, employee_code, sueldo_diario_base, puesto:cat_puestos(nombre), rol:cat_roles_operativos(nombre)')
            .limit(10)
    );

    await testQuery('Tarifas: cat_productos_mina (sin subcategoria)', () =>
        supabase.from('cat_productos_mina')
            .select('id, nombre, categoria, unidad_medida_default, tarifa_pago, activo')
            .order('categoria')
            .order('nombre')
    );

    // Empleados Page
    await testQuery('Empleados: useCatalog rh_employees', () =>
        supabase.from('rh_employees')
            .select('*, cat_puestos(nombre, tipo_personal), org_units(nombre_unidad), cat_roles_operativos(nombre)')
            .limit(5)
    );

    await testQuery('Empleados: cat_cuadrillas_miembros (actual)', () =>
        supabase.from('cat_cuadrillas_miembros')
            .select('empleado_id, cat_cuadrillas(id, nombre)')
    );

    // Cuadrillas Page (Traditional view & TacticalPitchView)
    await testQuery('Cuadrillas (Vista Tradicional): cat_cuadrillas query', () =>
        supabase.from('cat_cuadrillas')
            .select('*, mine_sites(nombre_mina), cat_turnos(codigo, nombre), rh_employees(first_name, last_name)')
    );

    await testQuery('Cuadrillas (Pizarra Táctica): cat_cuadrillas + miembros', () =>
        supabase.from('cat_cuadrillas')
            .select('id, nombre, activo, turno_actual_id, mine_site_id, supervisor_id, cat_turnos(nombre, codigo), mine_sites(nombre_mina)')
            .eq('activo', true)
    );

    // Turnos & Ubicaciones & Unidades
    await testQuery('Turnos: cat_turnos ordenados por codigo', () =>
        supabase.from('cat_turnos').select('*').order('codigo', { ascending: true })
    );

    await testQuery('Ubicaciones: mine_locations + mine_sites', () =>
        supabase.from('mine_locations').select('*, mine_sites(nombre_mina, org_units(nombre_unidad))')
    );

    await testQuery('Unidades: org_units + org_companies', () =>
        supabase.from('org_units').select('*, org_companies(razon_social)')
    );

    // Reportes Diarios List
    await testQuery('Reportes Diarios: listado paginado', () =>
        supabase.from('ops_daily_reports')
            .select('id, fecha, status:estado, semana_id, turno:cat_turnos(nombre, codigo), cuadrilla:cat_cuadrillas(nombre), mine_site:mine_sites(nombre_mina)', { count: 'exact' })
            .limit(5)
    );

    // Reportes Diarios Nuevo - Squad members
    const { data: firstCuad } = await supabase.from('cat_cuadrillas').select('id').eq('activo', true).limit(1).single();
    if (firstCuad) {
        await testQuery('Reportes Diarios Nuevo: loadSquadMembers', () =>
            supabase.from('cat_cuadrillas_miembros')
                .select('empleado_id, rol_operativo_id, rh_employees(id, first_name, last_name, employee_code, role_id, cat_roles_operativos(id, nombre))')
                .eq('cuadrilla_id', firstCuad.id)
        );
    }

    // Reportes Diarios Detalle & Editar
    const { data: firstRep } = await supabase.from('ops_daily_reports').select('id').limit(1).single();
    if (firstRep) {
        await testQuery('Reportes Diarios Detalle [id]', () =>
            supabase.from('ops_daily_reports')
                .select(`
                    id, fecha, status:estado, comentarios_supervisor:observaciones_generales,
                    turno:cat_turnos(nombre, codigo),
                    cuadrilla:cat_cuadrillas(nombre),
                    mine_site:mine_sites(nombre_mina),
                    ops_daily_attendance(
                        empleado_id, observacion:observaciones,
                        rh_employees(first_name, last_name, employee_code),
                        cat_asistencias!ops_daily_attendance_asistencia_tipo_id_fkey(nombre, color, codigo),
                        cat_roles_operativos!ops_daily_attendance_rol_asignado_id_fkey(nombre)
                    ),
                    ops_report_items(
                        id, cantidad_total, variables_json:variables_capturadas,
                        cat_productos_mina(nombre, unidad_medida_default, categoria),
                        ops_equipment(clave),
                        mine_locations(nombre, codigo)
                    )
                `)
                .eq('id', firstRep.id)
                .single()
        );

        await testQuery('Reportes Diarios Editar [id]/editar', () =>
            supabase.from('ops_daily_reports')
                .select(`
                    *,
                    ops_daily_attendance(
                        *,
                        rh_employees(id, first_name, last_name, employee_code, role_id, cat_roles_operativos!rh_employees_role_id_fkey(nombre)),
                        cat_asistencias!ops_daily_attendance_asistencia_tipo_id_fkey(*)
                    ),
                    ops_report_items(
                        *,
                        cat_productos_mina(nombre, unidad_medida_default, categoria),
                        ops_equipment(clave),
                        mine_locations(nombre, codigo),
                        ops_report_personnel!ops_report_personnel_report_item_id_fkey(empleado_id)
                    )
                `)
                .eq('id', firstRep.id)
                .single()
        );
    }

    // Equipos Page
    await testQuery('Equipos: ops_equipment + org_units', () =>
        supabase.from('ops_equipment').select('*, org_units(nombre_unidad)')
    );
    await testQuery('Equipos: cat_tipos_equipo (activo=true)', () =>
        supabase.from('cat_tipos_equipo').select('*').eq('activo', true)
    );

    // Productos Mina Page
    await testQuery('Productos Mina: cat_productos_mina + variables', () =>
        supabase.from('cat_productos_mina').select('*, cat_producto_variables(*)')
    );

    // Puestos y Roles Tabs
    await testQuery('Puestos y Roles: cat_puestos', () =>
        supabase.from('cat_puestos').select('*')
    );
    await testQuery('Puestos y Roles: cat_roles_operativos', () =>
        supabase.from('cat_roles_operativos').select('*')
    );
    await testQuery('Puestos y Roles: cat_puesto_roles', () =>
        supabase.from('cat_puesto_roles').select('*')
    );
    await testQuery('Puestos y Roles: cat_role_splits', () =>
        supabase.from('cat_role_splits').select('*, cat_roles_operativos(nombre)').eq('activo', true)
    );

    // Usuarios & Visiones & Blog Tareas (BlogService)
    await testQuery('Configuracion Usuarios: sys_roles_config', () =>
        supabase.from('sys_roles_config').select('*')
    );
    await testQuery('Configuracion Usuarios: sys_users', () =>
        supabase.from('sys_users').select('*')
    );
    await testQuery('Blog Tareas (BlogService): blog_tareas', () =>
        supabase.from('blog_tareas').select('*').order('created_at', { ascending: true })
    );
    await testQuery('Blog Tareas (Fallback store): sys_config ops_blog_tareas_store', () =>
        supabase.from('sys_config').select('value_json').eq('key_name', 'ops_blog_tareas_store').maybeSingle()
    );

    console.log('\n--- 3. PRUEBA DE SERVIDOR HTTP LOCALHOST:3000 (TODAS LAS PÁGINAS) ---');
    const routes = [
        '/',
        '/login',
        '/dashboard',
        '/dashboard/chat',
        '/dashboard/semana',
        '/dashboard/nomina',
        '/dashboard/nomina/tarifas',
        '/dashboard/operacion/reportes-diarios',
        '/dashboard/operacion/reportes-diarios/nuevo',
        ...(firstRep ? [
            `/dashboard/operacion/reportes-diarios/${firstRep.id}`,
            `/dashboard/operacion/reportes-diarios/${firstRep.id}/editar`
        ] : []),
        '/dashboard/catalogos',
        '/dashboard/catalogos/asistencias',
        '/dashboard/catalogos/cuadrillas',
        '/dashboard/catalogos/empleados',
        '/dashboard/catalogos/empresas',
        '/dashboard/catalogos/equipos',
        '/dashboard/catalogos/minas',
        '/dashboard/catalogos/productos-mina',
        '/dashboard/catalogos/puestos-roles',
        '/dashboard/catalogos/turnos',
        '/dashboard/catalogos/ubicaciones',
        '/dashboard/catalogos/unidades',
        '/dashboard/configuracion',
        '/dashboard/configuracion/usuarios',
        '/dashboard/configuracion/visiones',
        '/dashboard/profile',
        '/dashboard/debug'
    ];

    for (const route of routes) {
        try {
            const resp = await fetch(`http://localhost:3000${route}`);
            if (resp.status === 200) {
                console.log(`✅ [HTTP 200] ${route}`);
                successes.push(`HTTP ${route}`);
            } else {
                console.error(`❌ [HTTP ${resp.status}] ${route}`);
                failures.push({ name: `HTTP ${route}`, error: `Status ${resp.status}` });
            }
        } catch (err) {
            console.error(`❌ [HTTP ERROR] ${route}:`, err.message);
            failures.push({ name: `HTTP ${route}`, error: err.message });
        }
    }

    console.log('\n====================================================');
    console.log(`📊 RESUMEN FINAL: ${successes.length} pruebas exitosas | ${failures.length} con errores`);
    if (failures.length > 0) {
        console.log('Detalle de fallos:');
        failures.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
        process.exit(1);
    }
    console.log('====================================================');
}

runTests();
