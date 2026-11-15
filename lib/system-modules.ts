export interface SystemModuleDef {
    path: string
    label: string
    description: string
    pillar: string
    apkModule: string
}

export const ALL_SYSTEM_MODULES: SystemModuleDef[] = [
    {
        path: '/dashboard',
        label: 'Dashboard Ejecutivo y Financiero',
        description: 'Tablero principal con costos de mina, ventas, tonelaje y KPIs globales',
        pillar: '1. Finanzas y Dirección',
        apkModule: 'Inicio (KPIs y Costos)'
    },
    {
        path: '/dashboard/nomina',
        label: 'Pre-Nómina y Raya Semanal',
        description: 'Cálculo confidencial de sueldos base, destajos y pre-nómina por semana',
        pillar: '1. Finanzas y Dirección',
        apkModule: 'Nómina'
    },
    {
        path: '/dashboard/nomina/tarifas',
        label: 'Tarifas de Pago y Destajos',
        description: 'Configuración de sueldos diarios base y tarifas pagaderas por actividad',
        pillar: '1. Finanzas y Dirección',
        apkModule: 'Solo Web'
    },
    {
        path: '/dashboard/semana',
        label: 'Planeación Semanal (Metas)',
        description: 'Control de avances, metas por frente y comparativa diaria',
        pillar: '2. Ingeniería y Planeación',
        apkModule: 'Planeación'
    },
    {
        path: '/dashboard/catalogos/ubicaciones',
        label: 'Frentes y Ubicaciones de Mina',
        description: 'Alta y edición de frentes, rebajes, niveles y zonas subterráneas',
        pillar: '2. Ingeniería y Planeación',
        apkModule: 'Catálogos (Frentes)'
    },
    {
        path: '/dashboard/catalogos/productos-mina',
        label: 'Conceptos, Precios y Destajos',
        description: 'Precios unitarios por actividad, avances, barrenación y acarreos',
        pillar: '2. Ingeniería y Planeación',
        apkModule: 'Catálogos (Conceptos)'
    },
    {
        path: '/dashboard/catalogos/cuadrillas',
        label: 'Pizarra Táctica de Cuadrillas',
        description: 'Supervisores titulares, movimiento entre cuadrillas y reglas anti-duplicados',
        pillar: '3. Supervisión y RH',
        apkModule: 'Cuadrillas'
    },
    {
        path: '/dashboard/catalogos/empleados',
        label: 'Padrón de Empleados y RH',
        description: 'Directorio de personal minero, puestos, roles operativos y estatus',
        pillar: '3. Supervisión y RH',
        apkModule: 'Personal'
    },
    {
        path: '/dashboard/catalogos/equipos',
        label: 'Flota de Equipos y Maquinaria',
        description: 'Catálogo de jumbos, scooptrams, camiones y maquinaria operativa',
        pillar: '3. Supervisión y RH',
        apkModule: 'Solo Web'
    },
    {
        path: '/dashboard/operacion/reportes-diarios',
        label: 'Reportes Diarios e Incidencias',
        description: 'Captura, revisión, corrección con historial, aprobación y actas',
        pillar: '4. Reportes y Seguridad',
        apkModule: 'Reportes (+ Capturar)'
    },
    {
        path: '/dashboard/operacion/reportes-diarios/nuevo',
        label: 'Capturar Nuevo Reporte Diario',
        description: 'Asistente rápido de captura de turno para supervisores y jefes de mina',
        pillar: '4. Reportes y Seguridad',
        apkModule: 'Reportes (Nuevo)'
    },
    {
        path: '/dashboard/chat',
        label: 'Bitácora Operativa y Tareas',
        description: 'Consignas públicas del equipo y mensajes/tareas privadas por usuario',
        pillar: '4. Reportes y Seguridad',
        apkModule: 'Bitácora / Tareas'
    },
    {
        path: '/dashboard/catalogos',
        label: 'Catálogos Maestros (Minas, Turnos, Empresas)',
        description: 'Acceso al índice general de catálogos, minas, turnos, unidades y puestos',
        pillar: '5. Administración del Sistema',
        apkModule: 'Catálogos Generales'
    },
    {
        path: '/dashboard/configuracion/usuarios',
        label: 'Gestión de Usuarios y Roles',
        description: 'Creación de cuentas Web/APK, activación/desactivación y roles',
        pillar: '5. Administración del Sistema',
        apkModule: 'Solo Web Admin'
    },
    {
        path: '/dashboard/configuracion/visiones',
        label: 'Control de Vistas (Web + APK)',
        description: 'Matriz por usuario que controla qué secciones aparecen en Web y en la APK',
        pillar: '5. Administración del Sistema',
        apkModule: 'Solo Web Admin'
    },
    {
        path: '/dashboard/configuracion',
        label: 'Configuración General del Sistema',
        description: 'Parámetros semanales y reglas globales de cierre de operaciones',
        pillar: '5. Administración del Sistema',
        apkModule: 'Solo Web Admin'
    }
]
