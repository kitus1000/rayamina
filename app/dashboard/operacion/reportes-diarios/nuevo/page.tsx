'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, Users, ChevronRight, FileText, CheckCircle, AlertCircle, Plus, Trash2, X, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
    pushNotification,
    saveReportCreatorMeta,
    appendReportRevision,
    getSquadSupervisorsMeta
} from '@/lib/notifications-service'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'

// --- TYPES ---
type WizardStep = 'HEADER' | 'ATTENDANCE' | 'ACTIVITIES' | 'SUMMARY'

type AttendanceItem = {
    empleado_id: string
    nombre: string
    codigo_empleado: string
    rol_default_id: string
    rol_nombre_default: string
    rol_dia_id: string
    asistencia_id: string
    estado_codigo: string // Para lógica UI (ej. pintar de rojo si es falta)
    estado_color: string
    horas_extra: number // H.E. para Excel oficial (Dobles/Triples)
    observacion: string
}

type ActivityItem = {
    temp_id: string
    producto_id: string
    producto_nombre: string
    unidad: string
    equipo_id?: string
    equipo_nombre?: string
    location_id: string
    location_nombre: string
    cantidad_total: number
    variables: Record<string, any>
    participantes: string[]
}

export default function DailyReportsPage() {
    const { sysRole } = useAuth()
    const router = useRouter()
    const isReadOnly = sysRole === 'LECTURA'

    useEffect(() => {
        if (isReadOnly) {
            router.replace('/dashboard/operacion/reportes-diarios')
        }
    }, [isReadOnly, router])

    // --- STATE ---
    const [currentStep, setCurrentStep] = useState<WizardStep>('HEADER')
    const [loading, setLoading] = useState(false)

    // Catalogs
    const [turnos, setTurnos] = useState<any[]>([])
    const [cuadrillas, setCuadrillas] = useState<any[]>([])
    const [minas, setMinas] = useState<any[]>([])
    const [ubicaciones, setUbicaciones] = useState<any[]>([])
    const [rolesOperativos, setRolesOperativos] = useState<any[]>([])
    const [asistenciasCatalog, setAsistenciasCatalog] = useState<any[]>([])

    // Activity Catalogs
    const [products, setProducts] = useState<any[]>([])
    const [equipments, setEquipments] = useState<any[]>([])

    // Header State
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
    const [selectedTurno, setSelectedTurno] = useState('')
    const [selectedCuadrilla, setSelectedCuadrilla] = useState('')
    const [selectedMina, setSelectedMina] = useState('')
    const [supervisorComments, setSupervisorComments] = useState('')
    const [configStartDay, setConfigStartDay] = useState(1) // Lunes default

    // Form Data (Attendance)
    const [attendanceList, setAttendanceList] = useState<AttendanceItem[]>([])

    // Form Data (Activities)
    const [activities, setActivities] = useState<ActivityItem[]>([])

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalCategory, setModalCategory] = useState('')
    const [currentActivity, setCurrentActivity] = useState<Partial<ActivityItem>>({})
    const [selectedProductVariables, setSelectedProductVariables] = useState<any[]>([])

    // Split Rules State
    const [roleSplits, setRoleSplits] = useState<any[]>([])
    const [applySplits, setApplySplits] = useState(true)


    // --- EFFECT: LOAD BASE CATALOGS ---
    useEffect(() => {
        const loadCatalogs = async () => {
            setLoading(true)

            // 1. Turnos
            const { data: dTurnos } = await supabase.from('cat_turnos').select('*').eq('activo', true).order('codigo')
            if (dTurnos) setTurnos(dTurnos)

            // 2. Cuadrillas
            const { data: dCuadrillas } = await supabase.from('cat_cuadrillas').select('*').eq('activo', true).order('nombre')
            if (dCuadrillas) setCuadrillas(dCuadrillas)

            // 3. Minas / Sitios
            const { data: dMinas } = await supabase.from('mine_sites').select('*')
            if (dMinas) {
                setMinas(dMinas)
                if (dMinas.length > 0) setSelectedMina(dMinas[0].id)
            }

            // 3.5 Asistencias Catalog (18 Conceptos Oficiales de Nómina)
            const { data: dAsistencias } = await supabase.from('cat_asistencias').select('*').eq('activo', true).order('orden')
            if (dAsistencias) {
                setAsistenciasCatalog(dAsistencias)
            }

            // 3.6 Operational Week Config
            const { data: configData } = await supabase
                .from('sys_config')
                .select('*')
                .eq('key_name', 'operational_week_start')
                .single()
            if (configData?.value_json) {
                setConfigStartDay(configData.value_json.day_index ?? 1)
            }

            // 4. Roles Operativos
            const { data: dRoles } = await supabase.from('cat_roles_operativos').select('*').order('nombre')
            if (dRoles) setRolesOperativos(dRoles)

            // 5. Products with Variables
            const { data: dProds } = await supabase
                .from('cat_productos_mina')
                .select(`
                   *,
                   cat_producto_variables ( * )
               `)
                .eq('activo', true)
                .order('nombre')
            if (dProds) setProducts(dProds)

            // 6. Equipment
            const { data: dEquips } = await supabase
                .from('ops_equipment')
                .select('*')
                .eq('status', 'DISPONIBLE')
                .order('clave')
            if (dEquips) setEquipments(dEquips)

            // 7. Role Splits
            const { data: dSplits, error } = await supabase.from('cat_role_splits').select('*')
            if (dSplits) setRoleSplits(dSplits)
            else console.log('No splits config table found', error)

            setLoading(false)
        }

        loadCatalogs()
    }, [])

    // --- EFFECT: LOAD LOCATIONS WHEN MINE CHANGES ---
    useEffect(() => {
        if (!selectedMina) return
        const loadLocations = async () => {
            const { data } = await supabase.from('mine_locations').select('*').eq('mine_site_id', selectedMina)
            if (data) setUbicaciones(data)
        }
        loadLocations()
    }, [selectedMina])

    // --- HELPER: LOAD MEMBERS ---
    const loadSquadMembers = async () => {
        if (!selectedCuadrilla) return

        setLoading(true)
        const { data, error } = await supabase
            .from('cat_cuadrillas_miembros')
            .select(`
                empleado_id, rol_operativo_id,
                rh_employees (
                    id, first_name, last_name, employee_code,
                    role_id,
                    cat_roles_operativos ( id, nombre )
                )
            `)
            .eq('cuadrilla_id', selectedCuadrilla)

        if (data && asistenciasCatalog.length > 0) {
            const defaultAsist = asistenciasCatalog.find(a => a.codigo === 'X' || a.codigo === 'ASISTENCIA') || asistenciasCatalog[0]

            const list: AttendanceItem[] = data.map((item: any) => ({
                empleado_id: item.empleado_id,
                nombre: `${item.rh_employees?.first_name || ''} ${item.rh_employees?.last_name || ''}`,
                codigo_empleado: item.rh_employees?.employee_code || '-',
                rol_default_id: item.rol_operativo_id || item.rh_employees?.role_id,
                rol_nombre_default: item.rh_employees?.cat_roles_operativos?.nombre || 'Operativo',
                rol_dia_id: item.rol_operativo_id || item.rh_employees?.role_id,
                asistencia_id: defaultAsist.id,
                estado_codigo: defaultAsist.codigo,
                estado_color: defaultAsist.color,
                horas_extra: ['X', 'ASISTENCIA', 'DX', 'DOX'].includes(defaultAsist.codigo) ? 4 : 0,
                observacion: ''
            }))
            list.sort((a, b) => a.rol_nombre_default.localeCompare(b.rol_nombre_default))
            setAttendanceList(list)
        } else {
            console.error(error)
            toast.error('Error al cargar miembros o catálogo de asistencias no disponible')
        }
        setLoading(false)
    }

    // --- HANDLERS: NAVIGATION ---
    const handleNext = () => {
        if (currentStep === 'HEADER') {
            if (!fecha || !selectedTurno || !selectedCuadrilla) {
                alert('Por favor completa todos los campos del encabezado.')
                return
            }
            if (attendanceList.length === 0) loadSquadMembers()
            setCurrentStep('ATTENDANCE')
            return
        }

        if (currentStep === 'ATTENDANCE') {
            const hasAttendance = attendanceList.some(a => ['X', 'ASISTENCIA', 'DX', 'DOX'].includes(a.estado_codigo))
            if (!hasAttendance) {
                if (!confirm('¿Nadie asistió a laborar? Se marcará el reporte sin personal en frente.')) return
            }
            setCurrentStep('ACTIVITIES')
            return
        }

        if (currentStep === 'ACTIVITIES') {
            setCurrentStep('SUMMARY')
            return
        }
    }

    // --- HANDLERS: ATTENDANCE ---
    const updateAttendance = (index: number, field: keyof AttendanceItem, value: any) => {
        const newList = [...attendanceList]
        // @ts-ignore
        newList[index][field] = value
        setAttendanceList(newList)
    }

    // --- HANDLERS: ACTIVITIES ---
    const handleAddActivity = (categoria: string) => {
        setModalCategory(categoria)
        setCurrentActivity({
            temp_id: Math.random().toString(36).substr(2, 9),
            variables: {},
            participantes: attendanceList.filter(a => ['X', 'ASISTENCIA', 'DX', 'DOX'].includes(a.estado_codigo)).map(a => a.empleado_id)
        })
        setSelectedProductVariables([])
        setIsModalOpen(true)
    }

    const handleProductChange = (prodId: string) => {
        const prod = products.find(p => p.id === prodId)
        if (!prod) return

        setCurrentActivity({
            ...currentActivity,
            producto_id: prodId,
            producto_nombre: prod.nombre,
            unidad: prod.unidad_medida_default,
            variables: {}
        })

        const vars = prod.cat_producto_variables || []
        vars.sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0))
        setSelectedProductVariables(vars)
    }

    const handleSaveActivity = () => {
        if (!currentActivity.producto_id) return alert('Selecciona un concepto')
        if (!currentActivity.location_id) return alert('Selecciona una ubicación / frente para esta actividad')
        if (!currentActivity.cantidad_total) return alert('Ingresa la cantidad total')

        setActivities([...activities, currentActivity as ActivityItem])
        setIsModalOpen(false)
    }

    // --- HANDLERS: SUBMIT ---
    const handleSaveReport = async () => {
        if (!supervisorComments && !confirm('¿Seguro que quieres cerrar sin comentarios?')) return

        setLoading(true)
        try {
            const matchedCuad = cuadrillas.find(c => c.id === selectedCuadrilla)
            const metaMap = await getSquadSupervisorsMeta()
            const squadMeta = metaMap[selectedCuadrilla]
            const effectiveSupId = matchedCuad?.supervisor_id || squadMeta?.supervisor_employee_id || null

            // 1. CREATE REPORT
            const { data: report, error: errReport } = await supabase
                .from('ops_daily_reports')
                .insert({
                    fecha,
                    turno_id: selectedTurno,
                    cuadrilla_id: selectedCuadrilla,
                    supervisor_id: effectiveSupId,
                    mine_site_id: selectedMina,
                    observaciones_generales: supervisorComments,
                    estado: 'EN_REVISION',
                    status: 'EN_REVISION'
                })
                .select()
                .single()

            if (errReport) throw errReport

            // 2. ATTENDANCE
            const attendancePayload = attendanceList.map(a => {
                const working = ['X', 'ASISTENCIA', 'DX', 'DOX'].includes(a.estado_codigo)
                return {
                    report_id: report.id,
                    empleado_id: a.empleado_id,
                    asistencia_tipo_id: a.asistencia_id,
                    rol_asignado_id: a.rol_dia_id,
                    horas_trabajadas: working ? 8 + Math.max(0, Number(a.horas_extra) || 0) : 0,
                    observaciones: a.observacion
                }
            })
            const { error: errAtt } = await supabase.from('ops_daily_attendance').insert(attendancePayload)
            if (errAtt) throw errAtt

            // 3. ACTIVITIES
            for (const act of activities) {
                const { data: item, error: errItem } = await supabase
                    .from('ops_report_items')
                    .insert({
                        report_id: report.id,
                        producto_id: act.producto_id,
                        equipo_id: act.equipo_id || null,
                        location_id: act.location_id,
                        cantidad_total: act.cantidad_total,
                        variables_capturadas: act.variables
                    })
                    .select()
                    .single()

                if (errItem) throw errItem

                // 4. PERSONNEL SPLIT
                let personnelPayload: any[] = []

                if (applySplits && roleSplits.length > 0) {
                    let totalAssigned = 0;
                    let remainingParticipants: string[] = [];
                    let initialPayload: any[] = [];

                    for (const pid of act.participantes) {
                        const att = attendanceList.find(a => a.empleado_id === pid)
                        const roleSplit = roleSplits.find(rs => rs.rol_operativo_id === att?.rol_dia_id)

                        // We check if the split defines > 0 or < 1 percentage.
                        if (roleSplit) {
                            // Convert percentage 0.7 to 70
                            const pct = roleSplit.porcentaje > 1 ? roleSplit.porcentaje : roleSplit.porcentaje * 100
                            totalAssigned += pct
                            initialPayload.push({
                                report_item_id: item.id,
                                empleado_id: pid,
                                porcentaje_participacion: pct
                            })
                        } else {
                            remainingParticipants.push(pid)
                        }
                    }

                    // Distribute remainder
                    const remainingPct = Math.max(0, 100 - totalAssigned)
                    if (remainingParticipants.length > 0) {
                        const pctPerPerson = remainingPct / remainingParticipants.length
                        for (const pid of remainingParticipants) {
                            initialPayload.push({
                                report_item_id: item.id,
                                empleado_id: pid,
                                porcentaje_participacion: pctPerPerson
                            })
                        }
                    } else if (totalAssigned < 100 && initialPayload.length > 0) {
                        // If no remaining people but we haven't reached 100%, scale up proportionally
                        for (let p of initialPayload) {
                            p.porcentaje_participacion = p.porcentaje_participacion * (100 / totalAssigned)
                        }
                    } else if (totalAssigned > 100) {
                        // Scale down to 100% proportionally
                        for (let p of initialPayload) {
                            p.porcentaje_participacion = p.porcentaje_participacion * (100 / totalAssigned)
                        }
                    }
                    personnelPayload = initialPayload
                } else {
                    // Equal Split
                    personnelPayload = act.participantes.map(pid => ({
                        report_item_id: item.id,
                        empleado_id: pid,
                        porcentaje_participacion: 100 / act.participantes.length
                    }))
                }

                if (personnelPayload.length > 0) {
                    const { error: errPers } = await supabase.from('ops_report_personnel').insert(personnelPayload)

                    if (errPers) throw errPers
                }
            }

            const { data: authInfo } = await supabase.auth.getUser()
            const currentEmail = authInfo?.user?.email || null
            const { data: sysSender } = currentEmail
                ? await supabase.from('sys_users').select('id, email, full_name, role').eq('email', currentEmail).maybeSingle()
                : { data: null }
            const senderName = sysSender?.full_name || currentEmail || 'Supervisión'

            await saveReportCreatorMeta(report.id, {
                creator_user_id: sysSender?.id || null,
                creator_email: currentEmail,
                creator_name: senderName,
                creator_role: sysSender?.role || 'SUPERVISOR',
                cuadrilla_id: selectedCuadrilla,
                supervisor_employee_id: matchedCuad?.supervisor_id || squadMeta?.supervisor_employee_id || null,
                supervisor_name: squadMeta?.supervisor_employee_name || squadMeta?.supervisor_user_name || null,
                supervisor_user_email: squadMeta?.supervisor_user_email || null
            })

            await appendReportRevision(report.id, {
                edited_by_name: senderName,
                edited_by_email: currentEmail,
                edited_by_role: sysSender?.role || 'SUPERVISOR',
                approved_with_changes: false,
                changes: [`Reporte enviado a revisión (${activities.length} actividad(es), ${attendanceList.length} elemento(s)).`]
            })

            await pushNotification({
                type: 'REPORT_SUBMITTED',
                title: `Nuevo Reporte por Revisar (${fecha})`,
                message: `${senderName} envió reporte diario de ${matchedCuad?.nombre || 'Cuadrilla'} para revisión y aprobación.`,
                details: activities.slice(0, 4).map(a => `${a.producto_nombre}: ${a.cantidad_total} ${a.unidad}`),
                target_roles: ['JEFE_PLANEACION', 'GERENTE', 'SUPERINTENDENTE', 'DIRECTOR_OPERATIVO'],
                created_by_name: senderName,
                created_by_email: currentEmail,
                link: `/dashboard/operacion/reportes-diarios/${report.id}`
            })

            toast.success('Reporte Guardado Correctamente y Enviado a Revisión')
            window.location.href = '/dashboard/operacion/reportes-diarios'

        } catch (error: any) {
            console.error(error)
            toast.error('Error al guardar reporte: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const renderActivityGroup = (title: string, catKey: string) => {
        const groupActivities = activities.filter(a => products.find(p => p.id === a.producto_id)?.categoria === catKey)
        return (
            <div className="bg-slate-900 border border-slate-700/50 p-5 rounded-xl mb-6 shadow-inner">
                <h4 className="text-amber-500 font-bold mb-4 uppercase tracking-wider flex items-center gap-2">
                    <FileText size={18} /> {title}
                </h4>
                <div className="space-y-4">
                    {groupActivities.map(act => (
                        <div key={act.temp_id} className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex justify-between items-center relative group">
                            <div>
                                <div className="font-bold text-white text-lg flex flex-wrap items-center gap-2">
                                    {act.producto_nombre}
                                    {act.equipo_nombre && <span className="px-2 py-0.5 bg-blue-900/50 text-blue-300 text-xs rounded border border-blue-800">{act.equipo_nombre}</span>}
                                    {act.location_nombre && <span className="px-2 py-0.5 bg-emerald-900/50 text-emerald-300 text-xs rounded border border-emerald-800">{act.location_nombre}</span>}
                                </div>
                                <div className="text-amber-400 font-bold text-xl mt-1">
                                    {act.cantidad_total} <span className="text-sm font-normal text-slate-400">{act.unidad}</span>
                                </div>
                                <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-2">
                                    {Object.entries(act.variables || {}).map(([k, v]) => (
                                        <span key={k} className="bg-slate-900 px-1 rounded border border-slate-800">{k}: {v as any}</span>
                                    ))}
                                </div>
                                <div className="mt-2 flex -space-x-2">
                                    {act.participantes.map(pid => {
                                        const att = attendanceList.find(a => a.empleado_id === pid)
                                        return (
                                            <div key={pid} className="w-6 h-6 rounded-full bg-slate-600 border border-slate-800 flex items-center justify-center text-[10px] text-white font-bold" title={att?.nombre}>
                                                {att?.nombre?.charAt(0)}
                                            </div>
                                        )
                                    })}
                                    <span className="text-xs text-slate-500 ml-4 self-center">{act.participantes.length} ops</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setActivities(activities.filter(a => a.temp_id !== act.temp_id))}
                                className="text-slate-600 hover:text-red-400 p-2 transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={() => handleAddActivity(catKey)}
                        className="w-full py-4 rounded-xl border-2 border-dashed border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:border-amber-500 hover:text-amber-500 transition-all font-bold flex justify-center items-center gap-2"
                    >
                        <Plus size={20} />
                        Agregar Actividad a {title}
                    </button>
                </div>
            </div>
        )
    }

    // --- RENDER ---
    return (
        <div className="p-2 sm:p-4 max-w-full w-full min-w-0 mx-auto">
            {/* HEADER */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-2">Reporte Diario de Operación</h1>
                        <p className="text-slate-400">Captura de producción y asistencia por turno.</p>
                    </div>
                    <button
                        onClick={() => window.location.href = '/dashboard/operacion/reportes-diarios'}
                        className="px-4 py-2 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors font-medium text-sm shrink-0"
                    >
                        Cancelar y Volver
                    </button>
                </div>

                {/* WIZARD STEPS */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-6 text-sm">
                    <div className={`flex items-center gap-2 ${currentStep === 'HEADER' ? 'text-amber-500 font-bold' : 'text-slate-500'}`}>
                        <div className="w-6 h-6 rounded-full border border-current flex items-center justify-center">1</div>
                        <span>Encabezado</span>
                    </div>
                    <div className="w-8 h-px bg-slate-700" />
                    <div className={`flex items-center gap-2 ${currentStep === 'ATTENDANCE' ? 'text-amber-500 font-bold' : 'text-slate-500'}`}>
                        <div className="w-6 h-6 rounded-full border border-current flex items-center justify-center">2</div>
                        <span>Asistencia</span>
                    </div>
                    <div className="w-8 h-px bg-slate-700" />
                    <div className={`flex items-center gap-2 ${currentStep === 'ACTIVITIES' ? 'text-amber-500 font-bold' : 'text-slate-500'}`}>
                        <div className="w-6 h-6 rounded-full border border-current flex items-center justify-center">3</div>
                        <span>Actividades</span>
                    </div>
                    <div className="w-8 h-px bg-slate-700" />
                    <div className={`flex items-center gap-2 ${currentStep === 'SUMMARY' ? 'text-amber-500 font-bold' : 'text-slate-500'}`}>
                        <div className="w-6 h-6 rounded-full border border-current flex items-center justify-center">4</div>
                        <span>Cierre</span>
                    </div>
                </div>
            </div>

            {loading && <div className="text-amber-500 mb-4 animate-pulse">Procesando...</div>}

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">

                {/* STEP 1: HEADER */}
                {currentStep === 'HEADER' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                                    <Calendar size={16} className="text-amber-500" /> Fecha
                                </label>
                                <input
                                    type="date"
                                    value={fecha}
                                    onChange={e => setFecha(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                />
                                <div className="flex gap-2 text-[10px] uppercase font-bold tracking-wider">
                                    <span className="text-slate-500">Semana: <span className="text-amber-500">#{getWeekNumber(new Date(fecha + 'T12:00:00'))}</span></span>
                                    <span className="text-slate-500">Día: <span className="text-indigo-400">{new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long' })}</span></span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                                    <Clock size={16} className="text-amber-500" /> Turno
                                </label>
                                <select
                                    value={selectedTurno}
                                    onChange={e => setSelectedTurno(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                >
                                    <option value="">Seleccione Turno...</option>
                                    {turnos.map(t => <option key={t.id} value={t.id}>{t.codigo} - {t.nombre}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                                    <Users size={16} className="text-amber-500" /> Cuadrilla
                                </label>
                                <select
                                    value={selectedCuadrilla}
                                    onChange={e => {
                                        setSelectedCuadrilla(e.target.value)
                                        setAttendanceList([])
                                    }}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                >
                                    <option value="">Seleccione...</option>
                                    {cuadrillas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                                    <MapPin size={16} className="text-amber-500" /> Ubicación (Mina)
                                </label>
                                <select
                                    value={selectedMina}
                                    onChange={e => setSelectedMina(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-amber-500"
                                >
                                    <option value="">-- Seleccionar Mina --</option>
                                    {minas.map(m => (
                                        <option key={m.id} value={m.id}>{m.nombre_mina}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2: ATTENDANCE */}
                {currentStep === 'ATTENDANCE' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Users className="text-amber-500" size={20} /> Pase de Lista
                            </h3>
                            <button
                                onClick={() => {
                                    const defaultAsist = asistenciasCatalog.find(a => a.codigo === 'X' || a.codigo === 'ASISTENCIA') || asistenciasCatalog[0];
                                    if (defaultAsist) {
                                        const allRefreshed = attendanceList.map((a: any) => ({
                                            ...a,
                                            asistencia_id: defaultAsist.id,
                                            estado_codigo: defaultAsist.codigo,
                                            estado_color: defaultAsist.color
                                        }))
                                        setAttendanceList(allRefreshed)
                                    }
                                }}
                                className="text-xs text-amber-500 hover:text-amber-400 underline"
                            >
                                Marcar todos X (Asistencia)
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase">
                                        <th className="p-3">Empleado</th>
                                        <th className="p-3">Incidencia Oficial (Catálogo)</th>
                                        <th className="p-3 w-20 text-center">H.E. (Hrs)</th>
                                        <th className="p-3">Rol del Día</th>
                                        <th className="p-3">Observaciones</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {attendanceList.map((item, idx) => (
                                        <tr key={item.empleado_id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                            <td className="p-3">
                                                <div className="font-medium text-white">{item.nombre}</div>
                                                <div className="text-xs text-slate-500">{item.rol_nombre_default} ({item.codigo_empleado})</div>
                                            </td>
                                            <td className="p-3">
                                                <select
                                                    value={item.asistencia_id}
                                                    onChange={e => {
                                                        const asis = asistenciasCatalog.find(a => a.id === e.target.value)
                                                        if (asis) {
                                                            const working = ['X', 'ASISTENCIA', 'DX', 'DOX'].includes(asis.codigo)
                                                            updateAttendance(idx, 'asistencia_id', asis.id)
                                                            updateAttendance(idx, 'estado_codigo', asis.codigo)
                                                            updateAttendance(idx, 'estado_color', asis.color)
                                                            updateAttendance(idx, 'horas_extra', working ? (item.horas_extra || 4) : 0)
                                                        }
                                                    }}
                                                    className={`rounded px-2 py-1 text-xs border bg-slate-800/50 border-slate-700 text-white font-bold
                                                        ${item.estado_color.replace('bg-', 'text-').replace('500', '400')}
                                                        ${item.estado_color.replace('bg-', 'border-').replace('500', '800/50')}
                                                    `}
                                                >
                                                    {asistenciasCatalog.map(a => (
                                                        <option key={a.id} value={a.id}>{a.codigo} — {a.nombre}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="p-3 text-center">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={16}
                                                    step={1}
                                                    disabled={!['X', 'ASISTENCIA', 'DX', 'DOX'].includes(item.estado_codigo)}
                                                    value={item.horas_extra ?? 0}
                                                    onChange={e => updateAttendance(idx, 'horas_extra', parseFloat(e.target.value) || 0)}
                                                    className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-center text-cyan-300 font-bold text-xs disabled:opacity-40"
                                                />
                                            </td>
                                            <td className="p-3">
                                                <select
                                                    value={item.rol_dia_id || ''}
                                                    onChange={e => updateAttendance(idx, 'rol_dia_id', e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-300 text-xs"
                                                    disabled={!['X', 'ASISTENCIA', 'DX', 'DOX'].includes(item.estado_codigo)}
                                                >
                                                    {rolesOperativos.map(r => (
                                                        <option key={r.id} value={r.id}>{r.nombre}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="p-3">
                                                <input
                                                    type="text"
                                                    value={item.observacion}
                                                    onChange={e => updateAttendance(idx, 'observacion', e.target.value)}
                                                    className="w-full bg-transparent border-b border-slate-800 focus:border-amber-500 outline-none text-slate-400 text-xs"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* STEP 3: ACTIVITIES */}
                {currentStep === 'ACTIVITIES' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-bold text-white">Actividades Realizadas</h3>
                            <label className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-4 py-2 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors">
                                <span className="text-sm font-medium text-slate-300">Aplicar Reglas de Split</span>
                                <input
                                    type="checkbox"
                                    checked={applySplits}
                                    onChange={e => setApplySplits(e.target.checked)}
                                    className="w-4 h-4 accent-amber-500"
                                />
                            </label>
                        </div>


                        <div className="space-y-4">
                            {renderActivityGroup('Perforación', 'PERFORACION')}
                            {renderActivityGroup('Flete y Acarreo', 'FLETE')}
                            {renderActivityGroup('Servicios y Obra Civil', 'SERVICIOS_OBRA_CIVIL')}
                        </div>

                        {/* MODAL */}
                        {isModalOpen && (
                            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                                <div className="bg-slate-900 w-full max-w-2xl rounded-xl border border-slate-700 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
                                    <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                                        <h3 className="font-bold text-white flex items-center gap-2">
                                            <FileText className="text-amber-500" size={18} /> Nueva Actividad
                                        </h3>
                                        <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                                    </div>

                                    <div className="p-6 overflow-y-auto space-y-6 flex-1">
                                        {/* CONCEPTO */}
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1 uppercase font-bold tracking-wider">Concepto</label>
                                            <select
                                                className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                                onChange={e => handleProductChange(e.target.value)}
                                                value={currentActivity.producto_id || ''}
                                            >
                                                <option value="">Seleccionar Concepto...</option>
                                                {products.filter(p => !modalCategory || p.categoria === modalCategory).map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.unidad_medida_default})</option>)}
                                            </select>
                                        </div>

                                        {currentActivity.producto_id && (
                                            <>
                                                {/* GRID: UBICACION, EQUIPO & CANTIDAD */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="md:col-span-2 space-y-2">
                                                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Frente / Ubicación</label>
                                                        <select
                                                            className="w-full bg-slate-900 border border-slate-700/50 rounded-xl p-3 text-white focus:border-amber-500/50 outline-none transition-all shadow-inner"
                                                            onChange={e => {
                                                                const ubi = ubicaciones.find(u => u.id === e.target.value)
                                                                setCurrentActivity({
                                                                    ...currentActivity,
                                                                    location_id: e.target.value,
                                                                    location_nombre: ubi ? `${ubi.codigo} - ${ubi.nombre}` : ''
                                                                })
                                                            }}
                                                            value={currentActivity.location_id || ''}
                                                        >
                                                            <option value="">-- Seleccionar --</option>
                                                            {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.codigo} - {u.nombre}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Equipo (Opcional)</label>
                                                        <select
                                                            className="w-full bg-slate-900 border border-slate-700/50 rounded-xl p-3 text-white focus:border-amber-500/50 outline-none transition-all shadow-inner"
                                                            onChange={e => {
                                                                const eq = equipments.find(x => x.id === e.target.value)
                                                                setCurrentActivity({
                                                                    ...currentActivity,
                                                                    equipo_id: e.target.value,
                                                                    equipo_nombre: eq ? (eq.nombre || eq.clave) : ''
                                                                })
                                                            }}
                                                            value={currentActivity.equipo_id || ''}
                                                        >
                                                            <option value="">Ninguno</option>
                                                            {equipments.map(e => <option key={e.id} value={e.id}>{e.nombre ? `${e.clave} - ${e.nombre}` : e.clave}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-amber-500 mb-1 font-bold">CANTIDAD TOTAL ({currentActivity.unidad})</label>
                                                        <input
                                                            type="number"
                                                            className="w-full bg-slate-800 border-2 border-amber-500/50 rounded p-2 text-white text-lg font-bold outline-none focus:border-amber-500"
                                                            placeholder="0.00"
                                                            value={currentActivity.cantidad_total || ''}
                                                            onChange={e => setCurrentActivity({ ...currentActivity, cantidad_total: parseFloat(e.target.value) || 0 })}
                                                        />
                                                    </div>
                                                </div>

                                                {/* VARIABLES DINAMICAS */}
                                                {selectedProductVariables.length > 0 && (
                                                    <div className="bg-slate-950/50 p-4 rounded border border-slate-800">
                                                        <div className="flex justify-between items-center mb-3 border-b border-slate-800 pb-1">
                                                            <label className="text-xs text-slate-400 font-bold uppercase">VARIABLES DE DETALLE</label>
                                                            {products.find(p => p.id === currentActivity.producto_id)?.modo_captura === 'CALCULADO' && (
                                                                <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-mono font-bold">
                                                                    Fórmula: {products.find(p => p.id === currentActivity.producto_id)?.formula_cobro}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            {selectedProductVariables.map(v => (
                                                                <div key={v.id}>
                                                                    <label className="block text-xs text-slate-300 mb-1">{v.label} <span className="text-slate-500">({v.unidad})</span></label>
                                                                    {v.tipo_input === 'SELECT' ? (
                                                                        <select
                                                                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
                                                                            value={currentActivity.variables?.[v.clave] || ''}
                                                                            onChange={e => {
                                                                                const newVars = { ...currentActivity.variables, [v.clave]: e.target.value }
                                                                                let newQty = currentActivity.cantidad_total
                                                                                const prod = products.find(p => p.id === currentActivity.producto_id)
                                                                                if (prod?.modo_captura === 'CALCULADO' && prod.formula_cobro) {
                                                                                    try {
                                                                                        const keys = Object.keys(newVars)
                                                                                        const vals = keys.map(k => parseFloat((newVars as any)[k]) || 0)
                                                                                        const fn = new Function(...keys, `return ${prod.formula_cobro};`)
                                                                                        const res = fn(...vals)
                                                                                        if (!isNaN(res) && isFinite(res) && res > 0) newQty = parseFloat(res.toFixed(2))
                                                                                    } catch (_) {}
                                                                                }
                                                                                setCurrentActivity({
                                                                                    ...currentActivity,
                                                                                    variables: newVars,
                                                                                    cantidad_total: newQty
                                                                                })
                                                                            }}
                                                                        >
                                                                            <option value="">-</option>
                                                                            {(v.opciones || v.opciones_select)?.map((o: string) => <option key={o} value={o}>{o}</option>)}
                                                                        </select>
                                                                    ) : (
                                                                        <input
                                                                            type={v.tipo_input === 'NUMBER' ? 'number' : 'text'}
                                                                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
                                                                            value={currentActivity.variables?.[v.clave] || ''}
                                                                            onChange={e => {
                                                                                const newVars = { ...currentActivity.variables, [v.clave]: e.target.value }
                                                                                let newQty = currentActivity.cantidad_total
                                                                                const prod = products.find(p => p.id === currentActivity.producto_id)
                                                                                if (prod?.modo_captura === 'CALCULADO' && prod.formula_cobro) {
                                                                                    try {
                                                                                        const keys = Object.keys(newVars)
                                                                                        const vals = keys.map(k => parseFloat((newVars as any)[k]) || 0)
                                                                                        const fn = new Function(...keys, `return ${prod.formula_cobro};`)
                                                                                        const res = fn(...vals)
                                                                                        if (!isNaN(res) && isFinite(res) && res > 0) newQty = parseFloat(res.toFixed(2))
                                                                                    } catch (_) {}
                                                                                }
                                                                                setCurrentActivity({
                                                                                    ...currentActivity,
                                                                                    variables: newVars,
                                                                                    cantidad_total: newQty
                                                                                })
                                                                            }}
                                                                        />
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* PARTICIPANTES */}
                                                <div>
                                                    <label className="block text-xs text-slate-400 mb-2">Personal Involucrado (Check)</label>
                                                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2">
                                                        {attendanceList.filter(a => ['X', 'ASISTENCIA', 'DX', 'DOX'].includes(a.estado_codigo)).map(att => (
                                                            <label key={att.empleado_id} className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-all ${currentActivity.participantes?.includes(att.empleado_id)
                                                                ? 'bg-amber-900/20 border-amber-500/50'
                                                                : 'bg-slate-950 border-slate-800 hover:border-slate-600'
                                                                }`}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={currentActivity.participantes?.includes(att.empleado_id)}
                                                                    onChange={e => {
                                                                        const parts = currentActivity.participantes || []
                                                                        if (e.target.checked) {
                                                                            setCurrentActivity({ ...currentActivity, participantes: [...parts, att.empleado_id] })
                                                                        } else {
                                                                            setCurrentActivity({ ...currentActivity, participantes: parts.filter(id => id !== att.empleado_id) })
                                                                        }
                                                                    }}
                                                                    className="accent-amber-500 w-4 h-4"
                                                                />
                                                                <div className="text-xs">
                                                                    <div className="text-white font-medium">{att.nombre}</div>
                                                                    <div className="text-slate-500">{att.rol_nombre_default}</div>
                                                                </div>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end gap-3">
                                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white font-medium">Cancelar</button>
                                        <button
                                            onClick={handleSaveActivity}
                                            className="px-6 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-lg font-bold shadow-lg shadow-amber-900/40"
                                        >
                                            <Save size={18} className="inline mr-2" /> Guardar Actividad
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 4: SUMMARY */}
                {currentStep === 'SUMMARY' && (
                    <div className="space-y-6">
                        <div className="bg-emerald-900/20 border border-emerald-900/50 p-6 rounded-xl text-center">
                            <CheckCircle className="text-emerald-500 mx-auto mb-2" size={48} />
                            <h3 className="text-xl font-bold text-white">Resumen del Turno</h3>
                            <p className="text-slate-400">Verifica los totales antes de cerrar.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* ASISTENCIA SUMMARY */}
                            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                                <h4 className="font-bold text-white mb-4 border-b border-slate-800 pb-2">Personal</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Total Cuadrilla:</span>
                                        <span className="text-white font-bold">{attendanceList.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-emerald-400">Asistencia (X / DX / DOX):</span>
                                        <span className="text-emerald-400 font-bold">{attendanceList.filter(a => ['X', 'ASISTENCIA', 'DX', 'DOX'].includes(a.estado_codigo)).length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-red-400">Faltas/Incidencias:</span>
                                        <span className="text-red-400 font-bold">{attendanceList.filter(a => !['X', 'ASISTENCIA', 'DX', 'DOX'].includes(a.estado_codigo)).length}</span>
                                    </div>
                                </div>
                            </div>

                            {/* PRODUCTION SUMMARY */}
                            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                                <h4 className="font-bold text-white mb-4 border-b border-slate-800 pb-2">Producción</h4>
                                <div className="space-y-2 text-sm max-h-40 overflow-y-auto">
                                    {activities.map((act, i) => (
                                        <div key={i} className="flex justify-between border-b border-slate-800/50 pb-1 last:border-0">
                                            <span className="text-slate-300">{act.producto_nombre}</span>
                                            <span className="text-amber-500 font-bold">{act.cantidad_total} {act.unidad}</span>
                                        </div>
                                    ))}
                                    {activities.length === 0 && <span className="text-slate-500 italic">Sin producción registrada</span>}
                                </div>
                            </div>
                        </div>

                        {/* COMMENTS */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                                <FileText size={16} className="text-amber-500" /> Comentarios Generales del Turno
                            </label>
                            <textarea
                                value={supervisorComments}
                                onChange={e => setSupervisorComments(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-amber-500 outline-none h-32"
                                placeholder="Incidencias, fallas de equipo, bloqueos, etc..."
                            />
                        </div>

                        {/* FINAL BUTTON */}
                        <button
                            onClick={handleSaveReport}
                            disabled={loading}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-900/20 text-lg flex justify-center items-center gap-2 transition-all hover:scale-[1.02]"
                        >
                            {loading ? 'Guardando...' : 'CERRAR REPORTE Y ENVIAR'}
                        </button>
                    </div>
                )}

                {/* NAVIGATION FOOTER (Hidden in Summary) */}
                {currentStep !== 'SUMMARY' && (
                    <div className="mt-8 pt-6 border-t border-slate-800 flex justify-end">
                        <button
                            onClick={handleNext}
                            className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-amber-900/20 flex items-center gap-2 transition-all hover:scale-105"
                        >
                            Siguiente Paso <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </div>
        </div >
    )
}

function getWeekNumber(d: Date) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    return weekNo
}
