'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
    Plus, CalendarDays, Filter, ChevronRight, ChevronLeft,
    CheckCircle2, Package, ArrowRight, ChevronDown, Lock, Clock,
    Pickaxe, Edit2, Eye, Trash2, ShieldAlert, AlertTriangle,
    UserX, Wrench, Printer, HardHat, MapPin, FileText, X
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

export interface SupervisorIncident {
    id: string
    folio: string
    fecha: string
    turno: string
    tipo: 'ACCIDENTE' | 'CONDICION_INSEGURA' | 'PERSONAL_PROBLEMATICO' | 'ACONTECIMIENTO_OPERATIVO'
    gravedad: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA'
    ubicacion: string
    cuadrilla: string
    empleado_involucrado: string
    descripcion: string
    accion_tomada: string
    reportado_por: string
    estado: 'ABIERTO' | 'EN_SEGUIMIENTO' | 'CERRADO'
    created_at: string
}

const INCIDENTS_CONFIG_KEY = 'ops_supervisor_incidents_log'

const DEFAULT_INCIDENTS: SupervisorIncident[] = [
    {
        id: 'inc-s38-01',
        folio: 'ACTA-S38-001',
        fecha: '2026-09-22',
        turno: '1er Turno (Día)',
        tipo: 'CONDICION_INSEGURA',
        gravedad: 'ALTA',
        ubicacion: 'Rebaje 13-480',
        cuadrilla: 'CUADRILLA 1',
        empleado_involucrado: 'N/A (Condición de Frente)',
        descripcion: 'Se detectó bloque de roca suelta en cielo de galería de acceso a 13-480 posterior a la voladura y deficiencia en manga de ventilación secundaria.',
        accion_tomada: 'Se acordonó el área de inmediato, se detuvo acceso de Scooptram ST-50 y se ingresó equipo Scalemin para amacice mecanizado y colocación de 8 anclas adicionales.',
        reportado_por: 'Supervisor Turno Día',
        estado: 'CERRADO',
        created_at: '2026-09-22T10:30:00Z'
    },
    {
        id: 'inc-s38-02',
        folio: 'ACTA-S38-002',
        fecha: '2026-09-24',
        turno: '2do Turno (Noche)',
        tipo: 'PERSONAL_PROBLEMATICO',
        gravedad: 'MEDIA',
        ubicacion: 'Frente 3-480',
        cuadrilla: 'CUADRILLA 2',
        empleado_involucrado: 'EMP-024 — Ayudante General',
        descripcion: 'El trabajador se retiró de su frente asignado 45 minutos antes del cierre de guardia sin autorización del supervisor y discutió al solicitársele el uso completo de equipo de protección auditiva.',
        accion_tomada: 'Se levantó acta administrativa de exhorto en presencia del cabo de turno y se notificó a Superintendencia y Recursos Humanos para seguimiento en raya.',
        reportado_por: 'Supervisor Turno Noche',
        estado: 'EN_SEGUIMIENTO',
        created_at: '2026-09-24T22:15:00Z'
    },
    {
        id: 'inc-s38-03',
        folio: 'ACTA-S38-003',
        fecha: '2026-09-25',
        turno: '1er Turno (Día)',
        tipo: 'ACCIDENTE',
        gravedad: 'ALTA',
        ubicacion: 'Rampa Principal 6-390',
        cuadrilla: 'CUADRILLA 3',
        empleado_involucrado: 'EMP-011 — Operador de Pala Mecánica',
        descripcion: 'Incidente por contacto menor de cucharón de Scooptram ST-55 contra hastial derecho en curva estrecha por visibilidad reducida por polvo; sin lesión al operador, daño en manguera hidráulica auxiliar.',
        accion_tomada: 'Valoración médica preventiva al operador (sin lesiones), traslado de ST-55 a taller interior mina para reemplazo de manguera y riego de rampa 6-390.',
        reportado_por: 'Supervisor Turno Día',
        estado: 'EN_SEGUIMIENTO',
        created_at: '2026-09-25T14:20:00Z'
    },
    {
        id: 'inc-s38-04',
        folio: 'ACTA-S38-004',
        fecha: '2026-09-26',
        turno: '1er Turno (Día)',
        tipo: 'ACONTECIMIENTO_OPERATIVO',
        gravedad: 'BAJA',
        ubicacion: 'Nivel 9-400',
        cuadrilla: 'CUADRILLA 1',
        empleado_involucrado: 'Cuadrilla de Servicios',
        descripcion: 'Baja presión en línea de aire comprimido hacia nivel 9-400 durante 1.5 horas por mantenimiento programado en compresor #2 de superficie.',
        accion_tomada: 'Se reasignó al personal a limpieza y orden de estación eléctrica mientras se restableció presión óptima a las 11:00 hrs.',
        reportado_por: 'Supervisor Turno Día',
        estado: 'CERRADO',
        created_at: '2026-09-26T11:40:00Z'
    }
]

function ReportesDiariosContent() {
    const { sysRole } = useAuth()
    const searchParams = useSearchParams()
    const initialSection = searchParams.get('tab') === 'incidencias' ? 'INCIDENCIAS' : 'PRODUCCION'

    const [activeSection, setActiveSection] = useState<'PRODUCCION' | 'INCIDENCIAS'>(initialSection)
    const [loading, setLoading] = useState(true)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const isReadOnly = sysRole === 'LECTURA'

    useEffect(() => {
        if (searchParams.get('tab') === 'incidencias') {
            setActiveSection('INCIDENCIAS')
        }
    }, [searchParams])

    // Pagination & Filters (Producción)
    const [page, setPage] = useState(1)
    const [pageSize] = useState(15)
    const [totalItems, setTotalItems] = useState(0)
    const [minaFilter, setMinaFilter] = useState<string>('')
    const [fechaInicioFilter, setFechaInicioFilter] = useState<string>('')
    const [fechaFinFilter, setFechaFinFilter] = useState<string>('')
    const [viewMode, setViewMode] = useState<'ACTIVOS' | 'HISTORICOS'>('ACTIVOS')

    // Data Catálogos
    const [reportes, setReportes] = useState<any[]>([])
    const [minasDest, setMinasDest] = useState<{ id: string, nombre_mina: string }[]>([])
    const [ubicacionesCat, setUbicacionesCat] = useState<any[]>([])
    const [cuadrillasCat, setCuadrillasCat] = useState<any[]>([])
    const [empleadosCat, setEmpleadosCat] = useState<any[]>([])

    // Config Semanas
    const [minDays, setMinDays] = useState(5)
    const [maxDays, setMaxDays] = useState(7)
    const [configStartDay, setConfigStartDay] = useState(1)
    const [loadingClose, setLoadingClose] = useState(false)

    // Estado de Bitácora de Incidencias / Accidentes / Personal Problemático
    const [incidents, setIncidents] = useState<SupervisorIncident[]>([])
    const [incidentTypeFilter, setIncidentTypeFilter] = useState<string>('TODOS')
    const [showIncidentModal, setShowIncidentModal] = useState(false)
    const [newIncident, setNewIncident] = useState({
        fecha: '2026-09-26',
        turno: '1er Turno (Día)',
        tipo: 'CONDICION_INSEGURA' as SupervisorIncident['tipo'],
        gravedad: 'ALTA' as SupervisorIncident['gravedad'],
        ubicacion: 'Rebaje 13-480',
        cuadrilla: 'CUADRILLA 1',
        empleado_involucrado: '',
        descripcion: '',
        accion_tomada: ''
    })

    useEffect(() => {
        loadConfig()
        loadCatalogs()
        loadIncidents()
    }, [])

    useEffect(() => {
        loadData()
    }, [page, minaFilter, fechaInicioFilter, fechaFinFilter, viewMode])

    const loadCatalogs = async () => {
        const [mRes, uRes, cRes, eRes] = await Promise.all([
            supabase.from('mine_sites').select('id, nombre_mina').eq('active', true),
            supabase.from('mine_locations').select('id, nombre').order('nombre'),
            supabase.from('cat_cuadrillas').select('id, nombre').order('nombre'),
            supabase.from('rh_employees').select('id, employee_code, first_name, last_name, cat_puestos(nombre)').order('employee_code')
        ])
        if (mRes.data) setMinasDest(mRes.data)
        if (uRes.data) setUbicacionesCat(uRes.data)
        if (cRes.data) setCuadrillasCat(cRes.data)
        if (eRes.data) setEmpleadosCat(eRes.data)
    }

    const loadIncidents = async () => {
        const { data } = await supabase
            .from('sys_config')
            .select('value_json')
            .eq('key_name', INCIDENTS_CONFIG_KEY)
            .maybeSingle()

        if (data?.value_json && Array.isArray(data.value_json) && data.value_json.length > 0) {
            setIncidents(data.value_json as SupervisorIncident[])
        } else {
            setIncidents(DEFAULT_INCIDENTS)
            await supabase.from('sys_config').upsert({
                key_name: INCIDENTS_CONFIG_KEY,
                value_json: DEFAULT_INCIDENTS,
                description: 'Bitácora de Accidentes, Condiciones Inseguras y Personal Problemático (Supervisor)'
            }, { onConflict: 'key_name' })
        }
    }

    const saveIncidentsToDb = async (updated: SupervisorIncident[]) => {
        setIncidents(updated)
        await supabase.from('sys_config').upsert({
            key_name: INCIDENTS_CONFIG_KEY,
            value_json: updated,
            description: 'Bitácora de Accidentes, Condiciones Inseguras y Personal Problemático (Supervisor)'
        }, { onConflict: 'key_name' })
    }

    const handleCreateIncident = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newIncident.descripcion.trim()) return

        const nextNum = (incidents.length + 1).toString().padStart(3, '0')
        const created: SupervisorIncident = {
            id: 'inc-' + Date.now(),
            folio: `ACTA-S38-${nextNum}`,
            fecha: newIncident.fecha,
            turno: newIncident.turno,
            tipo: newIncident.tipo,
            gravedad: newIncident.gravedad,
            ubicacion: newIncident.ubicacion || 'Interior Mina',
            cuadrilla: newIncident.cuadrilla || 'General',
            empleado_involucrado: newIncident.empleado_involucrado || 'No aplica / General',
            descripcion: newIncident.descripcion.trim(),
            accion_tomada: newIncident.accion_tomada.trim() || 'Notificado a Superintendencia y Seguridad para seguimiento inmediato.',
            reportado_por: `Supervisor (${sysRole || 'Mina'})`,
            estado: 'ABIERTO',
            created_at: new Date().toISOString()
        }

        const updated = [created, ...incidents]
        await saveIncidentsToDb(updated)
        setShowIncidentModal(false)
        setNewIncident({
            fecha: '2026-09-26',
            turno: '1er Turno (Día)',
            tipo: 'CONDICION_INSEGURA',
            gravedad: 'ALTA',
            ubicacion: ubicacionesCat[0]?.nombre || 'Rebaje 13-480',
            cuadrilla: cuadrillasCat[0]?.nombre || 'CUADRILLA 1',
            empleado_involucrado: '',
            descripcion: '',
            accion_tomada: ''
        })
    }

    const handleToggleIncidentStatus = async (id: string) => {
        const nextOrder: Record<SupervisorIncident['estado'], SupervisorIncident['estado']> = {
            'ABIERTO': 'EN_SEGUIMIENTO',
            'EN_SEGUIMIENTO': 'CERRADO',
            'CERRADO': 'ABIERTO'
        }
        const updated = incidents.map(inc =>
            inc.id === id ? { ...inc, estado: nextOrder[inc.estado] } : inc
        )
        await saveIncidentsToDb(updated)
    }

    const handleDeleteIncident = async (id: string) => {
        if (!confirm('¿Eliminar esta acta de incidencia?')) return
        const updated = incidents.filter(inc => inc.id !== id)
        await saveIncidentsToDb(updated)
    }

    const loadConfig = async () => {
        const { data } = await supabase.from('sys_config').select('*').eq('key_name', 'week_close_rules').maybeSingle()
        if (data && data.value_json) {
            setMinDays(data.value_json.min_days || 5)
            setMaxDays(data.value_json.max_days || 7)
        }

        const { data: cwData } = await supabase.from('sys_config').select('*').eq('key_name', 'operational_week_start').maybeSingle()
        if (cwData && cwData.value_json) {
            setConfigStartDay(cwData.value_json.day_index ?? 1)
        }
    }

    const loadData = async () => {
        setLoading(true)

        let query = supabase
            .from('ops_daily_reports')
            .select(`
                id, fecha, status:estado, semana_id,
                turno:cat_turnos(nombre, codigo),
                cuadrilla:cat_cuadrillas(nombre),
                mine_site:mine_sites(nombre_mina)
            `, { count: 'exact' })

        if (minaFilter) query = query.eq('mine_site_id', minaFilter)
        if (fechaInicioFilter) query = query.gte('fecha', fechaInicioFilter)
        if (fechaFinFilter) query = query.lte('fecha', fechaFinFilter)

        if (viewMode === 'ACTIVOS') {
            query = query.is('semana_id', null)
        } else {
            query = query.not('semana_id', 'is', null)
        }

        const from = (page - 1) * pageSize
        const to = from + pageSize - 1

        const { data, error, count } = await query
            .order('fecha', { ascending: false })
            .range(from, to)

        if (error) {
            console.error('Error cargando reportes:', error)
        }

        if (data) {
            setReportes(data as any)
            if (count !== null) setTotalItems(count)
        }
        setLoading(false)
    }

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds)
        if (newSet.has(id)) newSet.delete(id)
        else newSet.add(id)
        setSelectedIds(newSet)
    }

    const toggleSelectAll = () => {
        if (viewMode === 'HISTORICOS') return
        if (selectedIds.size === reportes.filter(r => !r.semana_id).length) {
            setSelectedIds(new Set())
        } else {
            const allAvailable = reportes.filter(r => !r.semana_id).map(r => r.id)
            setSelectedIds(new Set(allAvailable))
        }
    }

    const handleCloseWeek = async () => {
        const selectedCount = selectedIds.size

        if (selectedCount < minDays || selectedCount > maxDays) {
            alert(`Para cerrar la semana debes seleccionar entre ${minDays} y ${maxDays} reportes. (Has seleccionado ${selectedCount})`)
            return
        }

        const unapprovedReports = reportes.filter(r => selectedIds.has(r.id) && r.status !== 'APROBADO')
        if (unapprovedReports.length > 0) {
            alert(`No puedes cerrar la semana. Tienes ${unapprovedReports.length} reporte(s) seleccionado(s) que aún no han sido aprobados. Todos deben estar en estado APROBADO.`)
            return
        }

        const selectedReports = reportes.filter(r => selectedIds.has(r.id))
        const dates = selectedReports.map(r => new Date(r.fecha + 'T12:00:00'))

        const minDateObj = new Date(Math.min(...dates.map(d => d.getTime())))
        const minDateDayOfWeek = minDateObj.getDay()

        let daysToStart = minDateDayOfWeek - configStartDay
        if (daysToStart < 0) daysToStart += 7

        const logicalStartDate = new Date(minDateObj.getTime() - (daysToStart * 24 * 60 * 60 * 1000))
        const logicalEndDate = new Date(logicalStartDate.getTime() + (6 * 24 * 60 * 60 * 1000))

        if (!confirm(`¿Estás seguro de cerrar la semana con estos ${selectedCount} reportes? Esta acción es definitiva.`)) return

        setLoadingClose(true)

        const dateStrStart = logicalStartDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
        const dateStrEnd = logicalEndDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
        const nombreSemana = `Cierre Semanal (${dateStrStart} - ${dateStrEnd})`

        const { data: weekData, error: weekErr } = await supabase
            .from('ops_semanas')
            .insert({
                nombre: nombreSemana,
                fecha_inicio: logicalStartDate.toISOString().split('T')[0],
                fecha_fin: logicalEndDate.toISOString().split('T')[0],
                estado: 'CERRADA'
            })
            .select()
            .single()

        if (weekErr) {
            alert('Error creando semana: ' + weekErr.message)
            setLoadingClose(false)
            return
        }

        const { error: updateErr } = await supabase
            .from('ops_daily_reports')
            .update({ semana_id: weekData.id })
            .in('id', Array.from(selectedIds))

        if (updateErr) {
            alert('Error asociando reportes: ' + updateErr.message)
        } else {
            alert('Semana cerrada exitosamente.')
            setSelectedIds(new Set())
            loadData()
        }
        setLoadingClose(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este reporte? Esta acción no se puede deshacer.')) return
        setLoading(true)
        const { error } = await supabase.from('ops_daily_reports').delete().eq('id', id)
        if (error) {
            alert('Error al eliminar: ' + error.message)
        } else {
            loadData()
        }
        setLoading(false)
    }

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'BORRADOR': return 'bg-slate-800 text-slate-300 border-slate-700'
            case 'EN_REVISION': return 'bg-amber-900/50 text-amber-400 border-amber-800/50'
            case 'APROBADO': return 'bg-emerald-900/50 text-emerald-400 border-emerald-800/50'
            case 'CORRECCION_SOLICITADA': return 'bg-red-900/50 text-red-400 border-red-800/50'
            default: return 'bg-slate-800 text-slate-300 border-slate-700'
        }
    }

    const getIncidentBadge = (tipo: SupervisorIncident['tipo']) => {
        switch (tipo) {
            case 'ACCIDENTE':
                return { label: '🚨 ACCIDENTE / LESIÓN', cls: 'bg-rose-500/20 text-rose-500 border-rose-500/40' }
            case 'CONDICION_INSEGURA':
                return { label: '⚠️ CONDICIÓN O ACTO INSEGURO', cls: 'bg-amber-500/20 text-amber-500 border-amber-500/40' }
            case 'PERSONAL_PROBLEMATICO':
                return { label: '👤 PERSONAL PROBLEMÁTICO / CONDUCTA', cls: 'bg-purple-500/20 text-purple-500 border-purple-500/40' }
            default:
                return { label: '📌 ACONTECIMIENTO OPERATIVO', cls: 'bg-blue-500/20 text-blue-500 border-blue-500/40' }
        }
    }

    const filteredIncidents = incidents.filter(inc =>
        incidentTypeFilter === 'TODOS' ? true : inc.tipo === incidentTypeFilter
    )

    return (
        <div className="p-2 md:p-4 max-w-7xl mx-auto space-y-6">
            {/* ENCABEZADO Y ACCIONES */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-800 pb-5">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-500 text-[11px] font-black uppercase">
                            📋 Central de Reportes Operativos y Seguridad en Mina
                        </span>
                    </div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-3">
                        <CalendarDays className="text-amber-500" />
                        {activeSection === 'PRODUCCION'
                            ? 'Reportes Diarios de Producción y Turno'
                            : 'Bitácora de Accidentes, Condiciones Inseguras y Conducta'}
                    </h1>
                    <p className="text-slate-400 text-sm font-medium mt-1">
                        {activeSection === 'PRODUCCION'
                            ? 'Captura de destajos, asistencia, horómetros de Scooptram y cierre semanal.'
                            : 'Registro oficial del Supervisor sobre accidentes, riesgos en frentes y personal problemático.'}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 html2pdf__ignore">
                    <button
                        onClick={() => window.print()}
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black flex items-center gap-2 border border-slate-700 shadow cursor-pointer"
                    >
                        <Printer size={16} />
                        Imprimir / Exportar PDF
                    </button>

                    {!isReadOnly && (
                        <>
                            <button
                                onClick={() => {
                                    setActiveSection('INCIDENCIAS')
                                    setShowIncidentModal(true)
                                }}
                                className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-black transition-all shadow-lg cursor-pointer"
                            >
                                <ShieldAlert size={16} />
                                Reportar Accidente / Inseguridad / Conducta
                            </button>

                            <Link
                                href="/dashboard/operacion/reportes-diarios/nuevo"
                                className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2.5 rounded-xl flex items-center gap-2 text-xs font-black transition-all shadow-lg"
                            >
                                <Plus size={16} />
                                Capturar Reporte de Producción
                            </Link>
                        </>
                    )}
                </div>
            </div>

            {/* SELECTOR PRINCIPAL: PRODUCCIÓN vs INCIDENCIAS DE SUPERVISOR */}
            <div className="flex flex-wrap gap-3 bg-slate-900 p-2 rounded-2xl border-2 border-slate-800 shadow-md html2pdf__ignore">
                <button
                    onClick={() => setActiveSection('PRODUCCION')}
                    className={`flex-1 min-w-[240px] py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        activeSection === 'PRODUCCION'
                            ? 'bg-amber-500 text-slate-950 shadow-md'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                >
                    <Pickaxe size={16} />
                    1. Reportes Diarios de Producción ({totalItems})
                </button>
                <button
                    onClick={() => setActiveSection('INCIDENCIAS')}
                    className={`flex-1 min-w-[240px] py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        activeSection === 'INCIDENCIAS'
                            ? 'bg-rose-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                >
                    <ShieldAlert size={16} />
                    2. Accidentes, Condiciones Inseguras y Personal Problemático ({incidents.length})
                </button>
            </div>

            {/* ========================================================================
                VISTA 2: BITÁCORA DE ACCIDENTES, CONDICIONES INSEGURAS Y CONDUCTA
               ======================================================================== */}
            {activeSection === 'INCIDENCIAS' ? (
                <div className="space-y-6">
                    {/* Tarjetas Resumen por Categoría */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div
                            onClick={() => setIncidentTypeFilter('ACCIDENTE')}
                            className="bg-slate-900 border-2 border-rose-500/40 hover:border-rose-500 rounded-2xl p-4 cursor-pointer transition-all shadow-md"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-rose-500/20 text-rose-500">
                                    🚨 Accidentes
                                </span>
                                <AlertTriangle size={18} className="text-rose-500" />
                            </div>
                            <div className="text-2xl font-black text-white">
                                {incidents.filter(i => i.tipo === 'ACCIDENTE').length}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Incidentes con lesión o contacto de equipo</p>
                        </div>

                        <div
                            onClick={() => setIncidentTypeFilter('CONDICION_INSEGURA')}
                            className="bg-slate-900 border-2 border-amber-500/40 hover:border-amber-500 rounded-2xl p-4 cursor-pointer transition-all shadow-md"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-500">
                                    ⚠️ Actos / Cond. Inseguras
                                </span>
                                <ShieldAlert size={18} className="text-amber-500" />
                            </div>
                            <div className="text-2xl font-black text-white">
                                {incidents.filter(i => i.tipo === 'CONDICION_INSEGURA').length}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Roca suelta, ventilación, falta de EPP o riesgo</p>
                        </div>

                        <div
                            onClick={() => setIncidentTypeFilter('PERSONAL_PROBLEMATICO')}
                            className="bg-slate-900 border-2 border-purple-500/40 hover:border-purple-500 rounded-2xl p-4 cursor-pointer transition-all shadow-md"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-500">
                                    👤 Personal Problemático
                                </span>
                                <UserX size={18} className="text-purple-500" />
                            </div>
                            <div className="text-2xl font-black text-white">
                                {incidents.filter(i => i.tipo === 'PERSONAL_PROBLEMATICO').length}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Indisciplina, abandono de frente o desacato</p>
                        </div>

                        <div
                            onClick={() => setIncidentTypeFilter('ACONTECIMIENTO_OPERATIVO')}
                            className="bg-slate-900 border-2 border-blue-500/40 hover:border-blue-500 rounded-2xl p-4 cursor-pointer transition-all shadow-md"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-500">
                                    📌 Eventos Operativos
                                </span>
                                <Wrench size={18} className="text-blue-500" />
                            </div>
                            <div className="text-2xl font-black text-white">
                                {incidents.filter(i => i.tipo === 'ACONTECIMIENTO_OPERATIVO').length}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Caídos, falta de aire/agua o paros mecánicos</p>
                        </div>
                    </div>

                    {/* Filtros de categoría y botón para abrir formulario */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl html2pdf__ignore">
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'TODOS', label: '📋 Todas las Actas (' + incidents.length + ')' },
                                { id: 'ACCIDENTE', label: '🚨 Accidentes' },
                                { id: 'CONDICION_INSEGURA', label: '⚠️ Condiciones Inseguras' },
                                { id: 'PERSONAL_PROBLEMATICO', label: '👤 Personal Problemático' },
                                { id: 'ACONTECIMIENTO_OPERATIVO', label: '📌 Acontecimientos Operativos' },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setIncidentTypeFilter(tab.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                                        incidentTypeFilter === tab.id
                                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow'
                                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-amber-500/40'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setShowIncidentModal(true)}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow cursor-pointer"
                        >
                            <Plus size={15} />
                            Levantar Nueva Acta de Supervisor
                        </button>
                    </div>

                    {/* Lista de Actas de Incidencias */}
                    <div className="space-y-4">
                        {filteredIncidents.map(inc => {
                            const badge = getIncidentBadge(inc.tipo)
                            return (
                                <div key={inc.id} className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                                        <div className="flex flex-wrap items-center gap-2.5">
                                            <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-slate-950 text-white border border-slate-700">
                                                {inc.folio}
                                            </span>
                                            <span className={`text-xs font-black px-3 py-1 rounded-lg border ${badge.cls}`}>
                                                {badge.label}
                                            </span>
                                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                                                inc.gravedad === 'CRITICA' || inc.gravedad === 'ALTA'
                                                    ? 'bg-rose-500/20 text-rose-500 border border-rose-500/40'
                                                    : 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
                                            }`}>
                                                Prioridad: {inc.gravedad}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleToggleIncidentStatus(inc.id)}
                                                title="Cambiar estado de seguimiento"
                                                className={`px-3 py-1 rounded-lg text-xs font-black uppercase border cursor-pointer ${
                                                    inc.estado === 'CERRADO'
                                                        ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/40'
                                                        : inc.estado === 'EN_SEGUIMIENTO'
                                                            ? 'bg-amber-500/20 text-amber-500 border-amber-500/40'
                                                            : 'bg-rose-500/20 text-rose-500 border-rose-500/40'
                                                }`}
                                            >
                                                {inc.estado === 'CERRADO' ? '✔ Resuelto / Cerrado' : inc.estado === 'EN_SEGUIMIENTO' ? '⏳ En Seguimiento' : '🔴 Abierto'}
                                            </button>

                                            <button
                                                onClick={() => window.print()}
                                                className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 cursor-pointer html2pdf__ignore"
                                                title="Imprimir Acta en PDF"
                                            >
                                                <Printer size={15} />
                                            </button>

                                            {!isReadOnly && (
                                                <button
                                                    onClick={() => handleDeleteIncident(inc.id)}
                                                    className="p-2 bg-slate-800 hover:bg-rose-600 hover:text-white text-rose-400 rounded-lg border border-slate-700 cursor-pointer html2pdf__ignore"
                                                    title="Eliminar Acta"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                                        <div>
                                            <span className="text-[10px] font-black uppercase text-slate-400 block">Fecha y Turno</span>
                                            <strong className="text-white">{inc.fecha} • {inc.turno}</strong>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black uppercase text-slate-400 block">Ubicación / Frente</span>
                                            <strong className="text-amber-500 flex items-center gap-1"><MapPin size={12} /> {inc.ubicacion}</strong>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black uppercase text-slate-400 block">Cuadrilla</span>
                                            <strong className="text-white">{inc.cuadrilla}</strong>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black uppercase text-slate-400 block">Trabajador Involucrado / Reportado</span>
                                            <strong className="text-purple-400 flex items-center gap-1"><HardHat size={12} /> {inc.empleado_involucrado}</strong>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                                        <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
                                            <span className="text-[10px] font-black uppercase text-rose-400 block mb-1">
                                                Descripción de los Hechos / Acontecimiento:
                                            </span>
                                            <p className="text-xs text-slate-200 leading-relaxed font-medium">
                                                {inc.descripcion}
                                            </p>
                                        </div>
                                        <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
                                            <span className="text-[10px] font-black uppercase text-emerald-400 block mb-1">
                                                Acción Correctiva / Medida Aplicada por el Supervisor:
                                            </span>
                                            <p className="text-xs text-slate-200 leading-relaxed font-medium">
                                                {inc.accion_tomada}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ) : (
                /* ========================================================================
                    VISTA 1: REPORTES DIARIOS DE PRODUCCIÓN Y CIERRE SEMANAL
                   ======================================================================== */
                <>
                    {/* SUB-TABS */}
                    <div className="flex border-b border-slate-800 mb-6 gap-6 html2pdf__ignore">
                        <button
                            className={`pb-3 font-black text-sm transition-colors border-b-2 cursor-pointer ${viewMode === 'ACTIVOS' ? 'text-amber-500 border-amber-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                            onClick={() => { setViewMode('ACTIVOS'); setPage(1); setSelectedIds(new Set()) }}
                        >
                            Reportes Activos Semana 38 (Por Empaquetar)
                        </button>
                        <button
                            className={`pb-3 font-black text-sm transition-colors border-b-2 cursor-pointer ${viewMode === 'HISTORICOS' ? 'text-amber-500 border-amber-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                            onClick={() => { setViewMode('HISTORICOS'); setPage(1); setSelectedIds(new Set()) }}
                        >
                            Historial de Reportes (Semanas Cerradas)
                        </button>
                    </div>

                    {/* TOP BAR: FILTROS & WIDGET EMPAQUE */}
                    <div className="flex flex-col lg:flex-row justify-between mb-6 gap-4 items-start html2pdf__ignore">
                        {/* FILTROS */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                            <div className="relative">
                                <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <select
                                    value={minaFilter}
                                    onChange={(e) => { setMinaFilter(e.target.value); setPage(1) }}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm appearance-none"
                                >
                                    <option value="">Todas las Minas</option>
                                    {minasDest.map(mina => (
                                        <option key={mina.id} value={mina.id}>{mina.nombre_mina}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                            </div>

                            <div className="relative">
                                <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="date"
                                    value={fechaInicioFilter}
                                    onChange={(e) => { setFechaInicioFilter(e.target.value); setPage(1) }}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                                />
                            </div>

                            <div className="relative">
                                <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="date"
                                    value={fechaFinFilter}
                                    onChange={(e) => { setFechaFinFilter(e.target.value); setPage(1) }}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                                />
                            </div>
                        </div>

                        {/* EMPAQUETAR WIDGET */}
                        {!isReadOnly && viewMode === 'ACTIVOS' && (
                            <div className="bg-emerald-950/20 border-2 border-emerald-500/40 p-4 rounded-2xl flex flex-col md:flex-row items-center gap-5 shadow-lg min-w-full lg:min-w-[440px]">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500 border border-emerald-500/40">
                                        <Package size={22} />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-black leading-tight text-sm">
                                            Cerrar Semana Operativa
                                        </h4>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Seleccionados: <span className="text-amber-500 font-black">{selectedIds.size}</span> / Rango: {minDays}-{maxDays} reportes
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCloseWeek}
                                    disabled={loadingClose || selectedIds.size < minDays || selectedIds.size > maxDays}
                                    className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white transition-all px-5 py-2.5 rounded-xl text-xs font-black whitespace-nowrap md:ml-auto flex items-center gap-2 cursor-pointer"
                                >
                                    {loadingClose ? 'Procesando...' : 'Empaquetar Semana'} <ArrowRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* TABLA DE REPORTES */}
                    <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                        {loading ? (
                            <div className="p-12 text-center text-amber-500 font-bold animate-pulse">Cargando histórico de reportes...</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-300">
                                    <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-black">
                                        <tr>
                                            {!isReadOnly && (
                                                <th className="px-6 py-4 w-12 text-center html2pdf__ignore">
                                                    {viewMode === 'ACTIVOS' && (
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-500 cursor-pointer"
                                                            onChange={toggleSelectAll}
                                                            checked={selectedIds.size > 0 && selectedIds.size === reportes.filter(r => !r.semana_id).length}
                                                        />
                                                    )}
                                                </th>
                                            )}
                                            <th className="px-6 py-4">Fecha</th>
                                            <th className="px-6 py-4">Mina / Unidad</th>
                                            <th className="px-6 py-4">Turno</th>
                                            <th className="px-6 py-4">Cuadrilla</th>
                                            <th className="px-6 py-4">Estado Reporte</th>
                                            <th className="px-6 py-4">Cierre Semanal</th>
                                            <th className="px-6 py-4 text-right html2pdf__ignore">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {reportes.map((rep) => {
                                            const isSelected = selectedIds.has(rep.id)
                                            const isClosed = rep.semana_id !== null

                                            return (
                                                <tr
                                                    key={rep.id}
                                                    className={`transition-colors ${isSelected ? 'bg-amber-900/10' : 'hover:bg-slate-800/40'} ${isClosed ? 'opacity-75' : ''}`}
                                                >
                                                    {!isReadOnly && (
                                                        <td className="px-6 py-4 text-center html2pdf__ignore">
                                                            {(!rep.semana_id && viewMode === 'ACTIVOS') ? (
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedIds.has(rep.id)}
                                                                    onChange={() => toggleSelect(rep.id)}
                                                                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-500 cursor-pointer"
                                                                />
                                                            ) : (
                                                                <Lock size={14} className="text-slate-500 mx-auto" />
                                                            )}
                                                        </td>
                                                    )}
                                                    <td className="px-6 py-4 font-black text-white">{rep.fecha}</td>
                                                    <td className="px-6 py-4 font-semibold">{rep.mine_site?.nombre_mina || 'Mina El Herrero'}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md text-xs font-bold border border-slate-700">
                                                            {rep.turno?.codigo || '1ER'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 font-bold">{rep.cuadrilla?.nombre || 'Cuadrilla General'}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-black tracking-wider border uppercase ${getStatusStyle(rep.status)}`}>
                                                            {(rep.status || 'APROBADO').replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {isClosed ? (
                                                            <span className="flex items-center gap-1.5 text-emerald-500 text-xs font-black uppercase">
                                                                <CheckCircle2 size={14} /> Cerrado
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1.5 text-amber-500 text-xs font-black uppercase">
                                                                <Clock size={14} /> Semana Activa
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right html2pdf__ignore">
                                                        <div className="flex justify-end gap-2">
                                                            <Link
                                                                href={`/dashboard/operacion/reportes-diarios/${rep.id}`}
                                                                className="p-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 rounded-lg text-amber-500 transition-colors"
                                                                title="Ver Expediente Completo e Imprimir PDF"
                                                            >
                                                                <Eye size={16} />
                                                            </Link>
                                                            {!isClosed && !isReadOnly && (
                                                                <>
                                                                    <Link
                                                                        href={`/dashboard/operacion/reportes-diarios/${rep.id}/editar`}
                                                                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
                                                                        title="Editar"
                                                                    >
                                                                        <Edit2 size={16} />
                                                                    </Link>
                                                                    <button
                                                                        onClick={() => handleDelete(rep.id)}
                                                                        className="p-2 bg-slate-800 hover:bg-rose-600 hover:text-white rounded-lg text-rose-400 transition-colors cursor-pointer"
                                                                        title="Eliminar"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}

                                        {reportes.length === 0 && (
                                            <tr>
                                                <td colSpan={8} className="px-6 py-12 text-center">
                                                    <div className="flex flex-col items-center justify-center opacity-60">
                                                        <Pickaxe className="w-12 h-12 mb-3 text-slate-500" />
                                                        <p className="text-lg text-white font-bold">No hay reportes en esta vista</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* PAGINACIÓN */}
                    {!loading && totalItems > 0 && (
                        <div className="bg-slate-900 px-6 py-4 rounded-2xl flex items-center justify-between border border-slate-800 html2pdf__ignore">
                            <div className="text-sm text-slate-400">
                                Mostrando <span className="font-black text-white">{(page - 1) * pageSize + 1}</span> a <span className="font-black text-white">{Math.min(page * pageSize, totalItems)}</span> de <span className="font-black text-white">{totalItems}</span> reportes
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-50 text-slate-300 cursor-pointer"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page * pageSize >= totalItems}
                                    className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-50 text-slate-300 cursor-pointer"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ========================================================================
                MODAL PARA CAPTURAR REPORTE DE ACCIDENTE / INSEGURIDAD / PERSONAL PROBLEMÁTICO
               ======================================================================== */}
            {showIncidentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 html2pdf__ignore">
                    <div className="bg-slate-900 border-2 border-rose-500/50 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
                        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-500 border border-rose-500/40">
                                    <ShieldAlert size={22} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-white">
                                        Levantar Acta de Supervisor (Seguridad / Conducta / Operación)
                                    </h2>
                                    <p className="text-xs text-slate-400">
                                        Registro oficial de accidentes, condiciones inseguras o personal problemático en turno.
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowIncidentModal(false)} className="text-slate-400 hover:text-white p-1">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateIncident} className="p-6 space-y-4 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-300 mb-1.5">
                                        Tipo de Reporte *
                                    </label>
                                    <select
                                        value={newIncident.tipo}
                                        onChange={e => setNewIncident(prev => ({ ...prev, tipo: e.target.value as any }))}
                                        className="w-full rounded-xl px-3.5 py-2.5 text-xs"
                                    >
                                        <option value="ACCIDENTE">🚨 Accidente / Incidente de Seguridad</option>
                                        <option value="CONDICION_INSEGURA">⚠️ Condición Insegura / Acto Inseguro</option>
                                        <option value="PERSONAL_PROBLEMATICO">👤 Personal Problemático / Indisciplina</option>
                                        <option value="ACONTECIMIENTO_OPERATIVO">📌 Acontecimiento Operativo Relevante</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-300 mb-1.5">
                                        Nivel de Gravedad / Prioridad *
                                    </label>
                                    <select
                                        value={newIncident.gravedad}
                                        onChange={e => setNewIncident(prev => ({ ...prev, gravedad: e.target.value as any }))}
                                        className="w-full rounded-xl px-3.5 py-2.5 text-xs"
                                    >
                                        <option value="CRITICA">🔴 CRÍTICA (Atención Inmediata / Paro)</option>
                                        <option value="ALTA">🟠 ALTA (Riesgo Importante / Sanción)</option>
                                        <option value="MEDIA">🟡 MEDIA (Seguimiento en Turno)</option>
                                        <option value="BAJA">🟢 BAJA (Observación Preventiva)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-300 mb-1.5">
                                        Fecha del Suceso *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={newIncident.fecha}
                                        onChange={e => setNewIncident(prev => ({ ...prev, fecha: e.target.value }))}
                                        className="w-full rounded-xl px-3.5 py-2.5 text-xs"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-300 mb-1.5">
                                        Turno *
                                    </label>
                                    <select
                                        value={newIncident.turno}
                                        onChange={e => setNewIncident(prev => ({ ...prev, turno: e.target.value }))}
                                        className="w-full rounded-xl px-3.5 py-2.5 text-xs"
                                    >
                                        <option value="1er Turno (Día)">1er Turno (Día)</option>
                                        <option value="2do Turno (Noche)">2do Turno (Noche)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-300 mb-1.5">
                                        Cuadrilla Involucrada
                                    </label>
                                    <select
                                        value={newIncident.cuadrilla}
                                        onChange={e => setNewIncident(prev => ({ ...prev, cuadrilla: e.target.value }))}
                                        className="w-full rounded-xl px-3.5 py-2.5 text-xs"
                                    >
                                        {cuadrillasCat.map(c => (
                                            <option key={c.id} value={c.nombre}>{c.nombre}</option>
                                        ))}
                                        <option value="General / Servicios">General / Servicios</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-300 mb-1.5">
                                        Frente / Ubicación en Mina *
                                    </label>
                                    <select
                                        value={newIncident.ubicacion}
                                        onChange={e => setNewIncident(prev => ({ ...prev, ubicacion: e.target.value }))}
                                        className="w-full rounded-xl px-3.5 py-2.5 text-xs"
                                    >
                                        {ubicacionesCat.map(u => (
                                            <option key={u.id} value={u.nombre}>Frente / Rebaje {u.nombre}</option>
                                        ))}
                                        <option value="Rampa Principal">Rampa Principal</option>
                                        <option value="Taller Interior Mina">Taller Interior Mina</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-300 mb-1.5">
                                        Trabajador Involucrado / Reportado
                                    </label>
                                    <select
                                        value={newIncident.empleado_involucrado}
                                        onChange={e => setNewIncident(prev => ({ ...prev, empleado_involucrado: e.target.value }))}
                                        className="w-full rounded-xl px-3.5 py-2.5 text-xs"
                                    >
                                        <option value="">-- Sin trabajador específico / Condición de Frente --</option>
                                        {empleadosCat.map((emp: any) => (
                                            <option key={emp.id} value={`${emp.employee_code} — ${emp.first_name} ${emp.last_name}`}>
                                                {emp.employee_code} — {emp.first_name} {emp.last_name} ({emp.cat_puestos?.nombre || 'Operativo'})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase text-slate-300 mb-1.5">
                                    Descripción Detallada del Acontecimiento / Conducta / Riesgo *
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    value={newIncident.descripcion}
                                    onChange={e => setNewIncident(prev => ({ ...prev, descripcion: e.target.value }))}
                                    placeholder="Describe claramente qué ocurrió, quién participó, en qué frente o equipo..."
                                    className="w-full rounded-xl px-3.5 py-2.5 text-xs"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase text-slate-300 mb-1.5">
                                    Acción Correctiva o Medida Tomada por el Supervisor *
                                </label>
                                <textarea
                                    required
                                    rows={2}
                                    value={newIncident.accion_tomada}
                                    onChange={e => setNewIncident(prev => ({ ...prev, accion_tomada: e.target.value }))}
                                    placeholder="Ej. Se detuvo el equipo, se amacizó el frente, se levantó exhorto administrativo..."
                                    className="w-full rounded-xl px-3.5 py-2.5 text-xs"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowIncidentModal(false)}
                                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg cursor-pointer"
                                >
                                    Registrar Acta Oficial
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function ReportesDiariosIndex() {
    return (
        <Suspense fallback={<div className="p-10 text-center font-bold">Cargando central de reportes...</div>}>
            <ReportesDiariosContent />
        </Suspense>
    )
}
