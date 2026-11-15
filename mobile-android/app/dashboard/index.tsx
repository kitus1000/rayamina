import React, { useEffect, useState, useCallback } from 'react'
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    StyleSheet,
} from 'react-native'
import { useRouter } from 'expo-router'
import {
    Pickaxe,
    TrendingUp,
    AlertTriangle,
    Users,
    DollarSign,
    Calendar,
    PlusCircle,
    ShieldAlert,
    MessageSquare,
    ChevronRight,
    Layers,
    Lock,
    CheckCircle2,
    Truck,
} from 'lucide-react-native'
import { supabase } from '../../lib/supabase'
import { useMobileAuth, ROLE_META } from '../../lib/auth-context'
import MobileShell from '../../components/MobileShell'

export default function DashboardScreen() {
    const router = useRouter()
    const {
        user,
        sysRole,
        theme,
        isJefaturaOrAbove,
        canMoveSquads,
        canEditPlanning,
        canViewFinancials,
    } = useMobileAuth()

    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [metrics, setMetrics] = useState({
        totalTons: 0,
        totalMeters: 0,
        activeWorkers: 0,
        activeSquads: 0,
        reportsCount: 0,
        pendingReports: 0,
        estimatedPayroll: 0,
        securityIncidents: 0,
        pendingTasks: 0,
        recentItems: [] as any[],
    })

    const isLight = theme === 'light'
    const bgCard = isLight ? '#FFFFFF' : '#0F172A'
    const bgSubtle = isLight ? '#F8FAFC' : '#1E293B'
    const borderCol = isLight ? '#CBD5E1' : '#1E293B'
    const textPrimary = isLight ? '#0F172A' : '#F8FAFC'
    const textSecondary = isLight ? '#475569' : '#94A3B8'

    const loadLiveDashboard = useCallback(async () => {
        try {
            const [
                { data: repItems },
                { data: reports },
                { data: emps },
                { data: squads },
                { data: secStore },
                { data: taskStore },
            ] = await Promise.all([
                supabase
                    .from('ops_report_items')
                    .select('id, cantidad_total, cat_productos_mina(nombre, categoria, unidad_medida_default, tarifa_pago), ops_daily_reports(fecha, mine_sites(nombre_mina))')
                    .order('created_at', { ascending: false }),
                supabase.from('ops_daily_reports').select('id, estado, status'),
                supabase.from('rh_employees').select('id, sueldo_diario_base, status'),
                supabase.from('cat_cuadrillas').select('id').eq('activo', true),
                supabase.from('sys_config').select('value_json').eq('key_name', 'ops_security_incidents_store').maybeSingle(),
                supabase.from('sys_config').select('value_json').eq('key_name', 'ops_blog_tareas_store').maybeSingle(),
            ])

            let tons = 0
            let meters = 0
            let destajoMoney = 0

            ;(repItems || []).forEach((it: any) => {
                const prod = Array.isArray(it.cat_productos_mina) ? it.cat_productos_mina[0] : it.cat_productos_mina
                const qty = Number(it.cantidad_total) || 0
                const unit = (prod?.unidad_medida_default || '').toUpperCase()
                const tarifa = Number(prod?.tarifa_pago) || 0

                if (unit.includes('TON') || (prod?.nombre || '').toUpperCase().includes('SCOOP') || (prod?.nombre || '').toUpperCase().includes('REZAGA')) {
                    tons += qty
                } else if (unit.includes('M') || (prod?.categoria || '').includes('PERFORACION')) {
                    meters += qty
                }
                destajoMoney += qty * tarifa
            })

            const activeEmps = (emps || []).filter((e: any) => e.status !== 'INACTIVE')
            const baseWeekly = activeEmps.reduce((acc: number, e: any) => acc + (Number(e.sueldo_diario_base) || 450) * 7, 0)

            const secArr = Array.isArray(secStore?.value_json) ? secStore.value_json : []
            const taskArr = Array.isArray(taskStore?.value_json) ? taskStore.value_json : []
            const pendingTasksCount = taskArr.filter((t: any) => t.is_task && t.task_status === 'PENDING' && !t.is_deleted).length

            const pendingReps = (reports || []).filter(
                (r: any) => (r.status || r.estado) === 'EN_REVISION' || (r.status || r.estado) === 'BORRADOR'
            ).length

            setMetrics({
                totalTons: Math.round(tons),
                totalMeters: Number(meters.toFixed(1)),
                activeWorkers: activeEmps.length,
                activeSquads: (squads || []).length,
                reportsCount: (reports || []).length,
                pendingReports: pendingReps,
                estimatedPayroll: Math.round(baseWeekly + destajoMoney),
                securityIncidents: secArr.length,
                pendingTasks: pendingTasksCount,
                recentItems: (repItems || []).slice(0, 5),
            })
        } catch (e) {
            console.warn('Error cargando dashboard móvil:', e)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        loadLiveDashboard()
    }, [loadLiveDashboard])

    const onRefresh = () => {
        setRefreshing(true)
        loadLiveDashboard()
    }

    const roleMeta = ROLE_META[sysRole] || ROLE_META.SUPER_ADMIN

    return (
        <MobileShell
            title={isJefaturaOrAbove ? 'Dashboard Ejecutivo' : 'Consola Operativa de Turno'}
            pillar={roleMeta.shortLabel}
            pillarHex={roleMeta.badgeColor}
        >
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={{ paddingBottom: 32 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* BANNER DE BIENVENIDA Y NIVEL DE AUTORIZACIÓN */}
                <View
                    style={[
                        styles.heroBanner,
                        {
                            backgroundColor: isLight ? '#0F172A' : '#1E293B',
                            borderColor: roleMeta.badgeColor,
                        },
                    ]}
                >
                    <View style={styles.heroTopRow}>
                        <View style={[styles.roleBadge, { backgroundColor: roleMeta.badgeColor }]}>
                            <Text style={styles.roleBadgeText}>{roleMeta.label}</Text>
                        </View>
                        <Text style={styles.weekTag}>SEMANA 38 • 21-27 SEP</Text>
                    </View>

                    <Text style={styles.heroGreeting}>
                        ¡Hola, {user?.nickname || 'Mando Operativo'}!
                    </Text>
                    <Text style={styles.heroDesc}>{roleMeta.description}</Text>

                    {/* Indicadores de Permisos Activos para este Usuario */}
                    <View style={styles.permPillsRow}>
                        <View
                            style={[
                                styles.permPill,
                                {
                                    backgroundColor: canViewFinancials
                                        ? '#10B98125'
                                        : '#64748B30',
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.permPillText,
                                    { color: canViewFinancials ? '#34D399' : '#94A3B8' },
                                ]}
                            >
                                {canViewFinancials ? '✔ Finanzas & Nómina' : '🔒 Finanzas (Jefatura+)'}
                            </Text>
                        </View>

                        <View
                            style={[
                                styles.permPill,
                                {
                                    backgroundColor: canMoveSquads ? '#F59E0B25' : '#64748B30',
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.permPillText,
                                    { color: canMoveSquads ? '#FBBF24' : '#94A3B8' },
                                ]}
                            >
                                {canMoveSquads ? '✔ Mueve Cuadrillas' : '👁️ Ver Cuadrillas'}
                            </Text>
                        </View>

                        <View
                            style={[
                                styles.permPill,
                                {
                                    backgroundColor: canEditPlanning ? '#3B82F625' : '#64748B30',
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.permPillText,
                                    { color: canEditPlanning ? '#60A5FA' : '#94A3B8' },
                                ]}
                            >
                                {canEditPlanning ? '✔ Edita Metas S-38' : '👁️ Ver Metas S-38'}
                            </Text>
                        </View>
                    </View>
                </View>

                {loading ? (
                    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#F59E0B" />
                        <Text style={{ color: textSecondary, marginTop: 10, fontWeight: '700' }}>
                            Sincronizando datos en vivo con Supabase...
                        </Text>
                    </View>
                ) : (
                    <>
                        {/* SECCIÓN 1: KPIs (ADAPTADOS AL NIVEL DE AUTORIZACIÓN) */}
                        <Text style={[styles.sectionHeader, { color: textPrimary }]}>
                            {canViewFinancials
                                ? '📊 Indicadores Ejecutivos y Operativos (Semana 38)'
                                : '⛏️ Estado Operativo de Turno (Semana 38)'}
                        </Text>

                        <View style={styles.kpiGrid}>
                            <View
                                style={[
                                    styles.kpiCard,
                                    { backgroundColor: bgCard, borderColor: borderCol },
                                ]}
                            >
                                <View style={[styles.kpiIconBox, { backgroundColor: '#F59E0B20' }]}>
                                    <Truck size={20} color="#D97706" />
                                </View>
                                <Text style={[styles.kpiValue, { color: textPrimary }]}>
                                    {metrics.totalTons.toLocaleString()} t
                                </Text>
                                <Text style={[styles.kpiTitle, { color: textSecondary }]}>
                                    Rezaga / Scooptram
                                </Text>
                                <Text style={styles.kpiSub}>Mineral + Tepetate S-38</Text>
                            </View>

                            <View
                                style={[
                                    styles.kpiCard,
                                    { backgroundColor: bgCard, borderColor: borderCol },
                                ]}
                            >
                                <View style={[styles.kpiIconBox, { backgroundColor: '#3B82F620' }]}>
                                    <Pickaxe size={20} color="#2563EB" />
                                </View>
                                <Text style={[styles.kpiValue, { color: textPrimary }]}>
                                    {metrics.totalMeters} m
                                </Text>
                                <Text style={[styles.kpiTitle, { color: textSecondary }]}>
                                    Avance Lineal
                                </Text>
                                <Text style={styles.kpiSub}>Frentes y Rebajes</Text>
                            </View>

                            {canViewFinancials ? (
                                <TouchableOpacity
                                    onPress={() => router.push('/dashboard/payroll')}
                                    style={[
                                        styles.kpiCard,
                                        { backgroundColor: bgCard, borderColor: '#10B98160' },
                                    ]}
                                >
                                    <View style={[styles.kpiIconBox, { backgroundColor: '#10B98120' }]}>
                                        <DollarSign size={20} color="#059669" />
                                    </View>
                                    <Text style={[styles.kpiValue, { color: '#059669' }]}>
                                        ${(metrics.estimatedPayroll / 1000).toFixed(1)}k
                                    </Text>
                                    <Text style={[styles.kpiTitle, { color: textSecondary }]}>
                                        Pre-Nómina S-38
                                    </Text>
                                    <Text style={styles.kpiSub}>Sueldo Base + Destajos</Text>
                                </TouchableOpacity>
                            ) : (
                                <View
                                    style={[
                                        styles.kpiCard,
                                        { backgroundColor: bgCard, borderColor: borderCol },
                                    ]}
                                >
                                    <View style={[styles.kpiIconBox, { backgroundColor: '#10B98120' }]}>
                                        <Users size={20} color="#059669" />
                                    </View>
                                    <Text style={[styles.kpiValue, { color: textPrimary }]}>
                                        {metrics.activeWorkers}
                                    </Text>
                                    <Text style={[styles.kpiTitle, { color: textSecondary }]}>
                                        Fuerza Activa
                                    </Text>
                                    <Text style={styles.kpiSub}>
                                        En {metrics.activeSquads} Cuadrillas
                                    </Text>
                                </View>
                            )}

                            <TouchableOpacity
                                onPress={() => router.push('/dashboard/tasks')}
                                style={[
                                    styles.kpiCard,
                                    { backgroundColor: bgCard, borderColor: '#F43F5E60' },
                                ]}
                            >
                                <View style={[styles.kpiIconBox, { backgroundColor: '#F43F5E20' }]}>
                                    <AlertTriangle size={20} color="#E11D48" />
                                </View>
                                <Text style={[styles.kpiValue, { color: '#E11D48' }]}>
                                    {metrics.pendingTasks} / {metrics.securityIncidents}
                                </Text>
                                <Text style={[styles.kpiTitle, { color: textSecondary }]}>
                                    Tareas / Alertas
                                </Text>
                                <Text style={styles.kpiSub}>Bitácora y Seguridad</Text>
                            </TouchableOpacity>
                        </View>

                        {/* SECCIÓN 2: ACCIONES RÁPIDAS SEGÚN JERARQUÍA */}
                        <Text style={[styles.sectionHeader, { color: textPrimary }]}>
                            🚀 Herramientas Operativas por Puesto
                        </Text>

                        {/* 1. Captura de Reporte Diario (Prioridad para Supervisor y Superintendente) */}
                        <TouchableOpacity
                            onPress={() => router.push('/dashboard/reports-new')}
                            activeOpacity={0.85}
                            style={[
                                styles.actionCard,
                                {
                                    backgroundColor: isLight ? '#FFFBEB' : '#1E293B',
                                    borderColor: '#F59E0B',
                                },
                            ]}
                        >
                            <View style={[styles.actionIconBox, { backgroundColor: '#F59E0B' }]}>
                                <PlusCircle size={24} color="#0F172A" />
                            </View>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <View style={styles.actionTitleRow}>
                                    <Text style={[styles.actionTitle, { color: textPrimary }]}>
                                        Capturar Reporte Diario de Turno
                                    </Text>
                                    <View style={[styles.pillBadge, { backgroundColor: '#F59E0B' }]}>
                                        <Text style={styles.pillBadgeText}>CAMPO</Text>
                                    </View>
                                </View>
                                <Text style={[styles.actionDesc, { color: textSecondary }]}>
                                    Pase de lista, avances de Scooptram/Perforación e incidencias de seguridad directo a Supabase.
                                </Text>
                            </View>
                            <ChevronRight size={20} color="#D97706" />
                        </TouchableOpacity>

                        {/* 2. Pizarra Táctica de Cuadrillas */}
                        <TouchableOpacity
                            onPress={() => router.push('/dashboard/squads')}
                            activeOpacity={0.85}
                            style={[
                                styles.actionCard,
                                {
                                    backgroundColor: bgCard,
                                    borderColor: '#10B981',
                                },
                            ]}
                        >
                            <View style={[styles.actionIconBox, { backgroundColor: '#10B98120' }]}>
                                <Users size={24} color="#10B981" />
                            </View>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <View style={styles.actionTitleRow}>
                                    <Text style={[styles.actionTitle, { color: textPrimary }]}>
                                        Pizarra Táctica de Cuadrillas
                                    </Text>
                                    <View
                                        style={[
                                            styles.pillBadge,
                                            { backgroundColor: canMoveSquads ? '#10B981' : '#64748B' },
                                        ]}
                                    >
                                        <Text style={[styles.pillBadgeText, { color: '#FFF' }]}>
                                            {canMoveSquads ? 'EDICIÓN ACTIVA' : 'SOLO LECTURA'}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={[styles.actionDesc, { color: textSecondary }]}>
                                    {canMoveSquads
                                        ? 'Autorizado (Superintendente/Gerente): Mueve Perforistas, Ayudantes y Operadores de Scoop entre cuadrillas.'
                                        : 'Visualiza la formación de las 5 cuadrillas e historial semanal de movimientos.'}
                                </Text>
                            </View>
                            <ChevronRight size={20} color="#10B981" />
                        </TouchableOpacity>

                        {/* 3. Planeación vs Ejecución Semana 38 */}
                        <TouchableOpacity
                            onPress={() => router.push('/dashboard/planning')}
                            activeOpacity={0.85}
                            style={[
                                styles.actionCard,
                                {
                                    backgroundColor: bgCard,
                                    borderColor: '#3B82F6',
                                },
                            ]}
                        >
                            <View style={[styles.actionIconBox, { backgroundColor: '#3B82F620' }]}>
                                <Calendar size={24} color="#3B82F6" />
                            </View>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <View style={styles.actionTitleRow}>
                                    <Text style={[styles.actionTitle, { color: textPrimary }]}>
                                        Planeación vs Ejecución (Sem 38)
                                    </Text>
                                    <View
                                        style={[
                                            styles.pillBadge,
                                            { backgroundColor: canEditPlanning ? '#3B82F6' : '#64748B' },
                                        ]}
                                    >
                                        <Text style={[styles.pillBadgeText, { color: '#FFF' }]}>
                                            {canEditPlanning ? 'PLANEADOR' : 'CONSULTA'}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={[styles.actionDesc, { color: textSecondary }]}>
                                    Compara metas proyectadas contra producción real de los frentes 3-480, 13-480, 4-500 y 9-500.
                                </Text>
                            </View>
                            <ChevronRight size={20} color="#3B82F6" />
                        </TouchableOpacity>

                        {/* 4. Bitácora, Tareas y Reporte de Accidentes / Personal Problemático */}
                        <TouchableOpacity
                            onPress={() => router.push('/dashboard/tasks')}
                            activeOpacity={0.85}
                            style={[
                                styles.actionCard,
                                {
                                    backgroundColor: bgCard,
                                    borderColor: '#F43F5E',
                                },
                            ]}
                        >
                            <View style={[styles.actionIconBox, { backgroundColor: '#F43F5E20' }]}>
                                <ShieldAlert size={24} color="#F43F5E" />
                            </View>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <View style={styles.actionTitleRow}>
                                    <Text style={[styles.actionTitle, { color: textPrimary }]}>
                                        Bitácora, Tareas y Seguridad
                                    </Text>
                                    <View style={[styles.pillBadge, { backgroundColor: '#F43F5E' }]}>
                                        <Text style={[styles.pillBadgeText, { color: '#FFF' }]}>
                                            ALERTAS
                                        </Text>
                                    </View>
                                </View>
                                <Text style={[styles.actionDesc, { color: textSecondary }]}>
                                    Reporta accidentes, condiciones inseguras, personal problemático y resuelve consignas de turno.
                                </Text>
                            </View>
                            <ChevronRight size={20} color="#F43F5E" />
                        </TouchableOpacity>

                        {/* 5. Pre-Nómina y Raya (Solo Jefatura+) */}
                        {canViewFinancials ? (
                            <TouchableOpacity
                                onPress={() => router.push('/dashboard/payroll')}
                                activeOpacity={0.85}
                                style={[
                                    styles.actionCard,
                                    {
                                        backgroundColor: bgCard,
                                        borderColor: '#D97706',
                                    },
                                ]}
                            >
                                <View style={[styles.actionIconBox, { backgroundColor: '#F59E0B20' }]}>
                                    <DollarSign size={24} color="#D97706" />
                                </View>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <View style={styles.actionTitleRow}>
                                        <Text style={[styles.actionTitle, { color: textPrimary }]}>
                                            Pre-Nómina y Raya Semanal S-38
                                        </Text>
                                        <View style={[styles.pillBadge, { backgroundColor: '#D97706' }]}>
                                            <Text style={[styles.pillBadgeText, { color: '#FFF' }]}>
                                                JEFATURA+
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.actionDesc, { color: textSecondary }]}>
                                        Desglose de raya, destajos 65%/35%, bonos de Scooptram y totales por trabajador.
                                    </Text>
                                </View>
                                <ChevronRight size={20} color="#D97706" />
                            </TouchableOpacity>
                        ) : (
                            <View
                                style={[
                                    styles.lockedCard,
                                    { backgroundColor: bgSubtle, borderColor: borderCol },
                                ]}
                            >
                                <Lock size={18} color="#E11D48" />
                                <Text style={[styles.lockedText, { color: textSecondary }]}>
                                    Módulo de Pre-Nómina y Costos Financieros reservado exclusivamente para Jefatura, Superintendencia, Gerencia y Dirección Operativa.
                                </Text>
                            </View>
                        )}

                        {/* SECCIÓN 3: FLUJO RECIENTE EN VIVO DESDE SUPABASE */}
                        <Text style={[styles.sectionHeader, { color: textPrimary, marginTop: 12 }]}>
                            ⚡ Últimos Avances Registrados en Mina
                        </Text>

                        {metrics.recentItems.map((item: any, idx: number) => {
                            const prod = Array.isArray(item.cat_productos_mina)
                                ? item.cat_productos_mina[0]
                                : item.cat_productos_mina
                            const rep = Array.isArray(item.ops_daily_reports)
                                ? item.ops_daily_reports[0]
                                : item.ops_daily_reports
                            return (
                                <View
                                    key={item.id || idx}
                                    style={[
                                        styles.feedRow,
                                        { backgroundColor: bgCard, borderColor: borderCol },
                                    ]}
                                >
                                    <View style={styles.feedIcon}>
                                        <CheckCircle2 size={18} color="#10B981" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.feedTitle, { color: textPrimary }]}>
                                            {prod?.nombre || 'Actividad Operativa'}
                                        </Text>
                                        <Text style={[styles.feedSub, { color: textSecondary }]}>
                                            Fecha: {rep?.fecha || 'Sem 38'} • Categoría:{' '}
                                            {prod?.categoria || 'MINA'}
                                        </Text>
                                    </View>
                                    <View style={styles.feedQtyBadge}>
                                        <Text style={styles.feedQtyText}>
                                            {item.cantidad_total}{' '}
                                            {prod?.unidad_medida_default || 'und'}
                                        </Text>
                                    </View>
                                </View>
                            )
                        })}
                    </>
                )}
            </ScrollView>
        </MobileShell>
    )
}

const styles = StyleSheet.create({
    scroll: {
        flex: 1,
        paddingHorizontal: 14,
        paddingTop: 14,
    },
    heroBanner: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 1.5,
        marginBottom: 18,
    },
    heroTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    roleBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    roleBadgeText: {
        color: '#0F172A',
        fontSize: 10,
        fontWeight: '900',
    },
    weekTag: {
        color: '#F59E0B',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.6,
    },
    heroGreeting: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '900',
    },
    heroDesc: {
        color: '#CBD5E1',
        fontSize: 12,
        marginTop: 4,
        lineHeight: 17,
    },
    permPillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 12,
    },
    permPill: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    permPillText: {
        fontSize: 10,
        fontWeight: '800',
    },
    sectionHeader: {
        fontSize: 14,
        fontWeight: '900',
        marginBottom: 10,
        letterSpacing: 0.2,
    },
    kpiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    kpiCard: {
        width: '48.5%',
        borderRadius: 18,
        borderWidth: 1.5,
        padding: 14,
        marginBottom: 10,
    },
    kpiIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    kpiValue: {
        fontSize: 22,
        fontWeight: '900',
    },
    kpiTitle: {
        fontSize: 12,
        fontWeight: '800',
        marginTop: 2,
    },
    kpiSub: {
        fontSize: 10,
        color: '#64748B',
        marginTop: 2,
        fontWeight: '600',
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 18,
        borderWidth: 1.5,
        padding: 14,
        marginBottom: 10,
    },
    actionIconBox: {
        width: 46,
        height: 46,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    actionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 3,
    },
    actionTitle: {
        fontSize: 14,
        fontWeight: '900',
    },
    pillBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    pillBadgeText: {
        color: '#0F172A',
        fontSize: 8,
        fontWeight: '900',
    },
    actionDesc: {
        fontSize: 11,
        lineHeight: 15,
    },
    lockedCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
        gap: 10,
    },
    lockedText: {
        flex: 1,
        fontSize: 11,
        lineHeight: 15,
        fontWeight: '600',
    },
    feedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 8,
    },
    feedIcon: {
        marginRight: 10,
    },
    feedTitle: {
        fontSize: 13,
        fontWeight: '800',
    },
    feedSub: {
        fontSize: 10,
        marginTop: 2,
    },
    feedQtyBadge: {
        backgroundColor: '#F59E0B20',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#F59E0B60',
    },
    feedQtyText: {
        color: '#D97706',
        fontSize: 11,
        fontWeight: '900',
    },
})
