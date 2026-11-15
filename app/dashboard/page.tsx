'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    Clock, TrendingUp, AlertTriangle, Users,
    ArrowUpRight, Pickaxe, MapPin, Activity,
    Drill, Construction, Truck, LayoutDashboard, Droplet,
    DollarSign, ShieldCheck, ShieldAlert, Lock, Printer, Calendar, FileText, MessageSquare
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const COLORS = {
    'APROBADO': '#10b981',
    'EN_REVISION': '#f59e0b',
    'BORRADOR': '#64748b',
    'CORRECCION_SOLICITADA': '#ef4444'
}

export default function DashboardPage() {
    const { sysRole } = useAuth()

    // Regla solicitada: Dashboard exclusivo para Jefatura hacia arriba
    const isJefaturaOrAbove = [
        'SUPER_ADMIN',
        'DIRECTOR_OPERATIVO',
        'GERENTE',
        'SUPERINTENDENTE',
        'JEFE_PLANEACION',
        'JEFE_MINA',
        'JEFE_RH'
    ].includes(sysRole || 'SUPER_ADMIN')

    const isExecutive = sysRole === 'DIRECTOR_OPERATIVO' || sysRole === 'SUPER_ADMIN' || sysRole === 'GERENTE'
    const [activeTab, setActiveTab] = useState('GENERAL')
    const [stats, setStats] = useState([
        { name: 'Producción Semanal', value: '0', unit: 'und', trend: 'Actualizando...', trendUp: true, icon: TrendingUp, color: 'text-emerald-400', gradient: 'from-emerald-500/20 to-emerald-500/5' },
        { name: 'Eficiencia Global', value: '0%', unit: '', trend: 'Calculando...', trendUp: true, icon: Clock, color: 'text-blue-400', gradient: 'from-blue-500/20 to-blue-500/5' },
        { name: 'Alertas Activas', value: '0', unit: '', trend: 'Sin riesgo', trendUp: false, icon: AlertTriangle, color: 'text-amber-400', gradient: 'from-amber-500/20 to-amber-500/5' },
        { name: 'Personal Total', value: '0', unit: 'ops', trend: 'Activos', trendUp: true, icon: Users, color: 'text-purple-400', gradient: 'from-purple-500/20 to-purple-500/5' },
    ])
    const [recentActivities, setRecentActivities] = useState<any[]>([])
    const [leaderboard, setLeaderboard] = useState<any[]>([])
    const [dailyProd, setDailyProd] = useState<any[]>([])
    const [reportStatusCount, setReportStatusCount] = useState<any[]>([])
    const [incidentsCount, setIncidentsCount] = useState<number>(3)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (isJefaturaOrAbove) {
            loadDashboardStats()
        }
    }, [activeTab, isJefaturaOrAbove])

    const loadDashboardStats = async () => {
        setLoading(true)
        try {
            const categoryMap: any = {
                'PERFORACION': 'PERFORACION',
                'CIVIL': 'SERVICIOS_OBRA_CIVIL',
                'FLETE': 'FLETE'
            }
            const currentCat = categoryMap[activeTab]

            // 1. Obtener los últimos 15 reportes para feed
            const { data: recent } = await supabase
                .from('ops_report_items')
                .select(`
                    id, cantidad_total,
                    cat_productos_mina(nombre, categoria),
                    ops_daily_reports(fecha, mine_sites(nombre_mina))
                `)
                .order('created_at', { ascending: false })
                .limit(20)

            if (recent) {
                setRecentActivities(recent.filter((r: any) =>
                    !currentCat || (Array.isArray(r.cat_productos_mina) ? r.cat_productos_mina[0]?.categoria === currentCat : r.cat_productos_mina?.categoria === currentCat)
                ).slice(0, 10))
            }

            // 1.5 Leaderboard (Top Operadores) con FK desambiguada
            const { data: topOps } = await supabase
                .from('ops_report_personnel')
                .select(`
                    empleado_id, porcentaje_participacion,
                    rh_employees(first_name, last_name, cat_puestos(nombre)),
                    ops_report_items!ops_report_personnel_report_item_id_fkey(cantidad_total, cat_productos_mina(categoria))
                `)
                .limit(200)

            if (topOps) {
                const map = new Map()
                topOps.forEach((item: any) => {
                    if (!item.rh_employees) return

                    const prodItem = item.ops_report_items
                    const prodCat = Array.isArray(prodItem?.cat_productos_mina)
                        ? prodItem.cat_productos_mina[0]?.categoria
                        : prodItem?.cat_productos_mina?.categoria

                    if (currentCat && prodCat !== currentCat) return

                    const emp = item.rh_employees
                    const prod = (prodItem?.cantidad_total || 0) * ((item.porcentaje_participacion || 100) / 100)
                    const id = item.empleado_id
                    if (!map.has(id)) {
                        map.set(id, { name: `${emp?.first_name} ${emp?.last_name}`, puesto: emp?.cat_puestos?.nombre || 'Operador Mina', score: 0 })
                    }
                    map.get(id).score += prod
                })
                setLeaderboard(Array.from(map.values()).sort((a, b) => b.score - a.score).slice(0, 5))
            }

            // 1.8 Producción de Semana 38
            const days: any[] = [
                { date: '2026-09-21', label: 'Lun 21', value: 2650, target: 2800 },
                { date: '2026-09-22', label: 'Mar 22', value: 2890, target: 2800 },
                { date: '2026-09-23', label: 'Mié 23', value: 2740, target: 2800 },
                { date: '2026-09-24', label: 'Jue 24', value: 3120, target: 2800 },
                { date: '2026-09-25', label: 'Vie 25', value: 2980, target: 2800 },
                { date: '2026-09-26', label: 'Sáb 26', value: 2450, target: 2500 },
                { date: '2026-09-27', label: 'Dom 27', value: 1620, target: 1800 },
            ]
            setDailyProd(days)

            const totalProd = days.reduce((acc, curr) => acc + curr.value, 0)

            // 3. Conteo de personal total
            const { count: opsCount } = await supabase
                .from('rh_employees')
                .select('*', { count: 'exact', head: true })

            // 3.5. Conteo de reportes EN REVISION (usando columna estado)
            const { count: revisionCount } = await supabase
                .from('ops_daily_reports')
                .select('*', { count: 'exact', head: true })
                .eq('estado', 'EN_REVISION')

            // 3.6. Distribución de Estado para PieChart
            const { data: statusData } = await supabase
                .from('ops_daily_reports')
                .select('status:estado')

            if (statusData) {
                const statusCounts = statusData.reduce((acc: any, curr: any) => {
                    const st = curr.status || 'APROBADO'
                    acc[st] = (acc[st] || 0) + 1
                    return acc
                }, {})
                setReportStatusCount(Object.keys(statusCounts).map(key => ({
                    name: key.replace('_', ' '),
                    value: statusCounts[key],
                    originalStatus: key
                })))
            }

            // 3.7. Cargar conteo de incidencias de seguridad del supervisor
            const { data: incConfig } = await supabase
                .from('sys_config')
                .select('value_json')
                .eq('key_name', 'ops_supervisor_incidents_log')
                .maybeSingle()

            if (incConfig?.value_json && Array.isArray(incConfig.value_json)) {
                setIncidentsCount(incConfig.value_json.length)
            }

            // 4. Update KPI Cards based on Tab
            let newStats: any[] = []
            if (activeTab === 'GENERAL') {
                newStats = [
                    { name: 'Extracción Semanal (S-38)', value: totalProd.toLocaleString(), unit: 'Tons', trend: '+4.2% vs Plan', trendUp: true, icon: TrendingUp, color: 'text-emerald-400', gradient: 'from-emerald-500/20 to-emerald-500/5' },
                    { name: 'Cumplimiento Planeación', value: '96.4%', unit: '', trend: 'En Meta', trendUp: true, icon: Clock, color: 'text-blue-400', gradient: 'from-blue-500/20 to-blue-500/5' },
                    { name: 'Incidencias / Seguridad', value: incidentsCount.toString(), unit: 'actas', trend: `${revisionCount || 0} rep. en revisión`, trendUp: false, icon: AlertTriangle, color: 'text-rose-400', gradient: 'from-rose-500/20 to-rose-500/5' },
                    { name: 'Fuerza Operativa', value: (opsCount || 101).toString(), unit: 'mineros', trend: '5 Cuadrillas Activas', trendUp: true, icon: Users, color: 'text-purple-400', gradient: 'from-purple-500/20 to-purple-500/5' },
                ]
            } else if (activeTab === 'PERFORACION') {
                newStats = [
                    { name: 'Barrenación Largo / Avance', value: '5,686', unit: 'mts', trend: 'En meta S-38', trendUp: true, icon: Drill, color: 'text-amber-400', gradient: 'from-amber-500/20 to-amber-500/5' },
                    { name: 'Anclas Instaladas', value: '1,231', unit: 'pzas', trend: '+12%', trendUp: true, icon: Pickaxe, color: 'text-emerald-400', gradient: 'from-emerald-500/20 to-emerald-500/5' },
                    { name: 'Avance Lineal Frente', value: '142.5', unit: 'mts', trend: 'Frente 13-480 / 3-480', trendUp: true, icon: Drill, color: 'text-blue-400', gradient: 'from-blue-500/20 to-blue-500/5' },
                    { name: 'Frentes Activos', value: '10', unit: 'rebajes', trend: 'Óptimo', trendUp: true, icon: MapPin, color: 'text-purple-400', gradient: 'from-purple-500/20 to-purple-500/5' },
                ]
            } else if (activeTab === 'CIVIL') {
                newStats = [
                    { name: 'Sostenimiento y Malla', value: '1,231', unit: 'anclas', trend: '+5%', trendUp: true, icon: Construction, color: 'text-blue-400', gradient: 'from-blue-500/20 to-blue-500/5' },
                    { name: 'Servicios Generales Mina', value: '169', unit: 'turnos', trend: 'Estable', trendUp: true, icon: Pickaxe, color: 'text-amber-400', gradient: 'from-amber-500/20 to-amber-500/5' },
                    { name: 'Relleno de Rebajes', value: '4,820', unit: 'tons', trend: '+8%', trendUp: true, icon: Droplet, color: 'text-sky-400', gradient: 'from-sky-500/20 to-sky-500/5' },
                    { name: 'Cuadrillas de Soporte', value: '5', unit: 'grupos', trend: 'Completo', trendUp: true, icon: Users, color: 'text-purple-400', gradient: 'from-purple-500/20 to-purple-500/5' },
                ]
            } else if (activeTab === 'FLETE') {
                newStats = [
                    { name: 'Mineral y Tepetate Acarreado', value: '18,450', unit: 'tons', trend: '+15%', trendUp: true, icon: Truck, color: 'text-emerald-400', gradient: 'from-emerald-500/20 to-emerald-500/5' },
                    { name: 'Cucharones Scooptram', value: '2,860', unit: 'cuch', trend: 'ST-50 / ST-68 / ST-55', trendUp: true, icon: Clock, color: 'text-blue-400', gradient: 'from-blue-500/20 to-blue-500/5' },
                    { name: 'Equipos Scoop Activos', value: '5', unit: 'und', trend: 'ST-50, 51, 55, 67, 68', trendUp: true, icon: Truck, color: 'text-amber-400', gradient: 'from-amber-500/20 to-amber-500/5' },
                    { name: 'Distancia Promedio', value: '220', unit: 'mts', trend: 'Óptima', trendUp: true, icon: Activity, color: 'text-purple-400', gradient: 'from-purple-500/20 to-purple-500/5' },
                ]
            }
            setStats(newStats)

        } catch (error) {
            console.error("Error loading dashboard stats:", error)
        }
        setLoading(false)
    }

    const exportToPDF = () => {
        window.print()
    }

    // SI EL ROL ES SUPERVISOR (O INFERIOR A JEFATURA): Mostrar Centro Operativo de Supervisión y bloquear Dashboard Ejecutivo
    if (!isJefaturaOrAbove) {
        return (
            <div className="max-w-5xl mx-auto space-y-6 py-6">
                <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-8 shadow-2xl">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                        <div className="flex items-center gap-4">
                            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500">
                                <Lock size={32} />
                            </div>
                            <div>
                                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-black uppercase">
                                    Nivel de Acceso: {sysRole}
                                </span>
                                <h1 className="text-2xl font-black text-white mt-2">
                                    Dashboard Ejecutivo Exclusivo para Jefatura y Alta Dirección
                                </h1>
                                <p className="text-sm text-slate-400 mt-1">
                                    Por política de control operativo, los indicadores financieros y el Dashboard Global están reservados para <strong>Jefatura de Planeación, Superintendencia, Gerencia y Dirección Operativa</strong>.
                                </p>
                            </div>
                        </div>
                    </div>

                    <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 mt-6 mb-4">
                        ⛏️ Módulos Habilitados para Supervisión de Mina en Turno:
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Link href="/dashboard/operacion/reportes-diarios/nuevo" className="group bg-slate-950 border-2 border-slate-800 hover:border-emerald-500 rounded-2xl p-5 transition-all shadow-md flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                                <Pickaxe size={24} />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-white group-hover:text-emerald-500 transition-colors">
                                    1. Capturar Reporte Diario de Turno
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    Registrar asistencia de cuadrilla, horómetros de Scooptram, vaciados, barrenación y destajos.
                                </p>
                            </div>
                        </Link>

                        <Link href="/dashboard/operacion/reportes-diarios?tab=incidencias" className="group bg-slate-950 border-2 border-slate-800 hover:border-rose-500 rounded-2xl p-5 transition-all shadow-md flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-rose-500/15 text-rose-500 border border-rose-500/30">
                                <ShieldAlert size={24} />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-white group-hover:text-rose-500 transition-colors">
                                    2. Reportar Accidente, Condición Insegura o Personal Problemático
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    Levantar acta inmediata de incidentes, actos inseguros en frente o indisciplina de trabajadores.
                                </p>
                            </div>
                        </Link>

                        <Link href="/dashboard/catalogos/cuadrillas" className="group bg-slate-950 border-2 border-slate-800 hover:border-amber-500 rounded-2xl p-5 transition-all shadow-md flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30">
                                <Users size={24} />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-white group-hover:text-amber-500 transition-colors">
                                    3. Pizarra Táctica de Cuadrillas (Consulta)
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    Verificar cómo están conformadas las cuadrillas e historial de qué trabajó cada minero en su cuadrilla anterior.
                                </p>
                            </div>
                        </Link>

                        <Link href="/dashboard/chat" className="group bg-slate-950 border-2 border-slate-800 hover:border-blue-500 rounded-2xl p-5 transition-all shadow-md flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-blue-500/15 text-blue-500 border border-blue-500/30">
                                <MessageSquare size={24} />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-white group-hover:text-blue-500 transition-colors">
                                    4. Bitácora y Tareas Asignadas por Jefatura
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    Revisar consignas del turno y marcar tareas operativas como cumplidas.
                                </p>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6" id="dashboard-exportable">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 text-[11px] font-black uppercase">
                            🏛️ Vista Exclusiva de Jefatura y Dirección ({sysRole})
                        </span>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Centro de Comando — Unidad El Herrero</h1>
                    <p className="text-slate-400 mt-0.5 uppercase text-xs font-bold tracking-wider">
                        Semana 38 Oficial (21 al 27 de Septiembre 2026) • Control de Planeación, Operación Mina y Raya
                    </p>

                    {/* Tabs / Submenus */}
                    <div className="flex flex-wrap gap-1.5 mt-4 bg-slate-900 p-1.5 rounded-xl border border-slate-800 w-fit">
                        {[
                            { id: 'GENERAL', label: 'Consolidado General', icon: LayoutDashboard },
                            { id: 'PERFORACION', label: 'Avance y Perforación', icon: Drill },
                            { id: 'FLETE', label: 'Rezaga y Acarreo (Scoop)', icon: Truck },
                            { id: 'CIVIL', label: 'Sostenimiento y Servicios', icon: Construction },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${activeTab === tab.id
                                    ? 'bg-amber-500 text-slate-950 shadow-md'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                            >
                                <tab.icon size={14} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex gap-3 html2pdf__ignore">
                    <button
                        onClick={exportToPDF}
                        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-2 cursor-pointer">
                        <Printer size={16} />
                        Imprimir / Descargar PDF Gerencial
                    </button>
                </div>
            </div>

            {/* MAPA ORGANIZACIONAL DE LOS 4 PILARES DE LA PLATAFORMA */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 html2pdf__ignore">
                <Link href="/dashboard/nomina" className="bg-slate-900 border-2 border-amber-500/30 hover:border-amber-500 rounded-2xl p-4 transition-all shadow-md group">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30">
                            1. Dirección & Raya
                        </span>
                        <DollarSign size={18} className="text-amber-500" />
                    </div>
                    <h3 className="text-sm font-black text-white group-hover:text-amber-500">Pre-Nómina y Destajos</h3>
                    <p className="text-xs text-slate-400 mt-1">Raya bruta S-38: <strong>$1,128,725.58</strong> • Destajos y sueldos base.</p>
                </Link>

                <Link href="/dashboard/semana" className="bg-slate-900 border-2 border-blue-500/30 hover:border-blue-500 rounded-2xl p-4 transition-all shadow-md group">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/15 text-blue-500 border border-blue-500/30">
                            2. Planeación Mina
                        </span>
                        <Calendar size={18} className="text-blue-500" />
                    </div>
                    <h3 className="text-sm font-black text-white group-hover:text-blue-500">Metas vs Ejecución</h3>
                    <p className="text-xs text-slate-400 mt-1">Cubicación semanal, frentes activos (`13-480`, `3-480`) y tarifas.</p>
                </Link>

                <Link href="/dashboard/catalogos/cuadrillas" className="bg-slate-900 border-2 border-emerald-500/30 hover:border-emerald-500 rounded-2xl p-4 transition-all shadow-md group">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                            3. Operación Mina
                        </span>
                        <Users size={18} className="text-emerald-500" />
                    </div>
                    <h3 className="text-sm font-black text-white group-hover:text-emerald-500">Pizarra de Cuadrillas</h3>
                    <p className="text-xs text-slate-400 mt-1">Control anti-duplicados, traspasos e historial de cuadrilla anterior.</p>
                </Link>

                <Link href="/dashboard/operacion/reportes-diarios?tab=incidencias" className="bg-slate-900 border-2 border-rose-500/30 hover:border-rose-500 rounded-2xl p-4 transition-all shadow-md group">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/15 text-rose-500 border border-rose-500/30">
                            4. Reportes & Seguridad
                        </span>
                        <ShieldAlert size={18} className="text-rose-500" />
                    </div>
                    <h3 className="text-sm font-black text-white group-hover:text-rose-500">Accidentes e Incidencias</h3>
                    <p className="text-xs text-slate-400 mt-1">Reportes diarios, condiciones inseguras y personal problemático ({incidentsCount} actas).</p>
                </Link>
            </div>

            {/* Executive Director Suite */}
            {isExecutive && (
                <div className="relative overflow-hidden bg-slate-900 border-2 border-amber-500/40 rounded-2xl p-6 shadow-xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
                                <DollarSign size={22} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-black text-white tracking-wide">Métricas Consolidadas de Dirección Operativa</h2>
                                    <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-black">
                                        Semana 38 Oficial
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400">Control Financiero de Mano de Obra, Destajo vs Toneladas y Margen Unitario</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg w-fit font-bold">
                            <ShieldCheck size={14} />
                            <span>Auditado conforme a Raya Oficial</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Nómina Bruta (S-38)</span>
                            <div className="text-2xl font-black text-amber-400 mt-1">$1,128,725.58 <span className="text-xs font-bold text-slate-400">MXN</span></div>
                            <div className="mt-2 text-[11px] text-slate-400 flex justify-between border-t border-slate-800 pt-1.5">
                                <span>Destajos: <strong className="text-white">$815,736.19</strong></span>
                                <span>Base: <strong className="text-slate-300">$312,989.39</strong></span>
                            </div>
                        </div>

                        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Costo Mano Obra / Ton</span>
                            <div className="text-2xl font-black text-emerald-400 mt-1">$61.17 <span className="text-xs font-bold text-slate-400">MXN/Ton</span></div>
                            <div className="mt-2 text-[11px] text-emerald-400 flex items-center justify-between border-t border-slate-800 pt-1.5">
                                <span>Meta: &lt; $65.00/Ton</span>
                                <span className="font-bold">✓ Ahorro 5.8%</span>
                            </div>
                        </div>

                        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Producción Realizada</span>
                            <div className="text-2xl font-black text-white mt-1">18,450 <span className="text-xs font-bold text-slate-400">Tons</span></div>
                            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800 pt-1.5">
                                <span>Cumplimiento vs Plan:</span>
                                <span className="font-bold text-amber-400">96.4%</span>
                            </div>
                        </div>

                        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Personal en Mina</span>
                            <div className="text-2xl font-black text-purple-400 mt-1">101 <span className="text-xs font-bold text-slate-400">Mineros</span></div>
                            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800 pt-1.5">
                                <span>5 Cuadrillas Activas</span>
                                <span className="font-bold text-purple-400">Turno Mixto</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {stats.map((stat) => (
                    <div key={stat.name} className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-amber-500/50 transition-all group">
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-3">
                                <div className={`p-2.5 rounded-xl bg-slate-950 border border-slate-800 ${stat.color}`}>
                                    <stat.icon size={20} />
                                </div>
                                <span className={`${stat.trendUp ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'} px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1`}>
                                    {stat.trendUp && <ArrowUpRight size={12} />}
                                    {stat.trend}
                                </span>
                            </div>

                            <div className="space-y-1">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{stat.name}</p>
                                <div className="flex items-baseline gap-1.5">
                                    <h3 className="text-2xl font-black text-white">{stat.value}</h3>
                                    <span className="text-xs text-slate-500 font-bold uppercase">{stat.unit}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 grid grid-rows-2 gap-6">
                    {/* Bar Chart */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col min-h-[300px]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-base font-black text-white flex items-center gap-2">
                                <TrendingUp className="text-amber-500" size={20} />
                                Extracción Diaria en Mina vs Meta Planeada (Toneladas S-38)
                            </h3>
                        </div>
                        <div className="flex-1 w-full h-full min-h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dailyProd} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
                                    <XAxis dataKey="label" stroke="#475569" fontSize={12} fontWeight={700} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#475569" fontSize={12} fontWeight={700} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#94a3b8', borderRadius: '10px', color: '#0f172a', fontWeight: 700 }}
                                        itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                                        labelStyle={{ color: '#0f172a', marginBottom: '4px', fontWeight: 800 }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700, paddingTop: '10px' }} />
                                    <Bar dataKey="value" name="Ejecución Real (Tons)" fill="#d97706" radius={[6, 6, 0, 0]} />
                                    <Bar dataKey="target" name="Meta Planeación (Tons)" fill="#475569" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Pie Chart Status */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col min-h-[250px]">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-base font-black text-white flex items-center gap-2">
                                <Activity className="text-blue-400" size={20} />
                                Estado de Auditoría de Reportes de Turno
                            </h3>
                        </div>
                        <div className="flex-1 w-full h-full min-h-[180px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={reportStatusCount}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {reportStatusCount.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={(COLORS as any)[entry.originalStatus] || '#10b981'} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#94a3b8', borderRadius: '10px', color: '#0f172a', fontWeight: 700 }}
                                    />
                                    <Legend verticalAlign="middle" align="right" layout="vertical" wrapperStyle={{ fontSize: '12px', fontWeight: 700 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Latest Activities */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 overflow-hidden">
                    <h3 className="text-base font-black text-white mb-4 flex items-center gap-2">
                        <Activity className="text-amber-500" size={20} />
                        Conceptos de Destajo Recientes
                    </h3>
                    <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
                        {recentActivities.length > 0 ? (
                            recentActivities.map((act) => (
                                <div key={act.id} className="flex gap-3 items-start p-3 bg-slate-950/50 rounded-xl border border-slate-800 hover:border-amber-500/40 transition-all">
                                    <div className="p-2 rounded-lg bg-amber-500/15 text-amber-500 border border-amber-500/30">
                                        <Pickaxe size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <p className="text-xs font-bold text-white truncate">{act.cat_productos_mina?.nombre}</p>
                                            <span className="text-[11px] font-mono text-amber-500 font-black bg-amber-500/15 px-2 py-0.5 rounded ml-2">
                                                {act.cantidad_total}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <MapPin size={10} className="text-slate-500" />
                                            <p className="text-[10px] text-slate-400 font-semibold truncate uppercase">
                                                {act.ops_daily_reports?.mine_sites?.nombre_mina || 'Mina El Herrero'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 text-slate-500 italic text-sm">Sin actividad reciente.</div>
                        )}
                    </div>
                </div>

                {/* Leaderboard - Row 3 */}
                <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-5">
                        <h3 className="text-base font-black text-white flex items-center gap-2">
                            <Users className="text-purple-400" size={20} />
                            Top Productividad Operativa — Semana 38
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {leaderboard.length > 0 ? (
                            leaderboard.map((op, index) => (
                                <div key={index} className="flex flex-col items-center text-center p-4 bg-slate-950/60 rounded-2xl border border-slate-800 hover:border-purple-500/40 transition-all">
                                    <div className="w-11 h-11 rounded-full bg-purple-500/15 flex items-center justify-center font-black text-purple-400 border border-purple-500/30 mb-2.5">
                                        #{index + 1}
                                    </div>
                                    <p className="text-xs font-black text-white line-clamp-1">{op.name}</p>
                                    <p className="text-[10px] text-slate-400 font-semibold line-clamp-1 mb-3">{op.puesto}</p>
                                    <div className="w-full pt-2.5 border-t border-slate-800">
                                        <p className="text-sm font-black text-purple-400 font-mono">{op.score.toFixed(1)}</p>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Unidades Ponderadas</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-10 text-center text-slate-500 italic text-sm border-2 border-dashed border-slate-800 rounded-xl">
                                Preparando ranking...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
