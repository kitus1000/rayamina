'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import {
    Menu,
    X,
    LayoutDashboard,
    DollarSign,
    Calendar,
    Users,
    HardHat,
    Pickaxe,
    PlusCircle,
    ShieldAlert,
    MessageSquare,
    Layers,
    Sun,
    Moon,
    Lock,
    Sparkles,
    ChevronRight,
    CheckCircle2,
    XCircle,
    Truck,
    AlertTriangle,
    History,
    UserPlus,
    UserMinus,
    Plus,
    Trash2,
    Save,
    Send,
    Search,
    Smartphone,
    Download,
    Monitor,
    MapPin,
} from 'lucide-react'

type MobileScreenId =
    | 'HOME'
    | 'PAYROLL'
    | 'PLANNING'
    | 'SQUADS'
    | 'PERSONNEL'
    | 'REPORTS'
    | 'REPORT_NEW'
    | 'TASKS_SECURITY'
    | 'CATALOGS'

type RoleKey =
    | 'SUPER_ADMIN'
    | 'DIRECTOR_OPERATIVO'
    | 'GERENTE'
    | 'SUPERINTENDENTE'
    | 'JEFE_PLANEACION'
    | 'SUPERVISOR'

const ROLE_CONFIG: Record<
    RoleKey,
    {
        label: string
        shortLabel: string
        badgeBg: string
        accentHex: string
        description: string
    }
> = {
    SUPER_ADMIN: {
        label: '👑 Super Admin (Control Total)',
        shortLabel: 'Super Admin',
        badgeBg: 'bg-amber-500 text-slate-950',
        accentHex: '#f59e0b',
        description: 'Autorización total en Jefatura, Planeación, Cuadrillas, Nómina y Reportes.',
    },
    DIRECTOR_OPERATIVO: {
        label: '🏛️ Director Operativo (Finanzas & KPI)',
        shortLabel: 'Director Op.',
        badgeBg: 'bg-amber-500 text-slate-950',
        accentHex: '#d97706',
        description: 'Visualización ejecutiva de costos, Pre-Nómina S-38 y cumplimiento de metas.',
    },
    GERENTE: {
        label: '⭐ Gerente de Operaciones',
        shortLabel: 'Gerente Ops',
        badgeBg: 'bg-blue-500 text-white',
        accentHex: '#3b82f6',
        description: 'Autorizado para mover cuadrillas, aprobar reportes diarios y auditar Pre-Nómina.',
    },
    SUPERINTENDENTE: {
        label: '⛏️ Superintendente de Mina',
        shortLabel: 'Superintendente',
        badgeBg: 'bg-emerald-500 text-slate-950',
        accentHex: '#10b981',
        description: 'Autorizado para mover personal entre cuadrillas, aprobar reportes y coordinar mina.',
    },
    JEFE_PLANEACION: {
        label: '📐 Jefe de Planeación e Ingeniería',
        shortLabel: 'Jefe Planeación',
        badgeBg: 'bg-indigo-500 text-white',
        accentHex: '#6366f1',
        description: 'Autorizado para configurar metas semanales (Semana 38), ubicaciones y tarifas.',
    },
    SUPERVISOR: {
        label: '📋 Supervisor de Turno (Campo)',
        shortLabel: 'Supervisor',
        badgeBg: 'bg-rose-500 text-white',
        accentHex: '#f43f5e',
        description: 'Captura de reportes diarios, pase de lista, avances Scoop/Jumbo y alertas de seguridad.',
    },
}

const SQUAD_HISTORY_KEY = 'ops_squad_history_store'
const BLOG_STORE_KEY = 'ops_blog_tareas_store'
const SEC_STORE_KEY = 'ops_security_incidents_store'

export default function AndroidMobileAppPage() {
    const { user, sysRole, loginAsDemo } = useAuth()
    const rawRole = (sysRole || 'SUPER_ADMIN') as RoleKey
    const activeRole: RoleKey = rawRole in ROLE_CONFIG ? rawRole : 'SUPER_ADMIN'

    const [activeScreen, setActiveScreen] = useState<MobileScreenId>('HOME')
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [roleModalOpen, setRoleModalOpen] = useState(false)
    const [installModalOpen, setInstallModalOpen] = useState(false)
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
    const [theme, setTheme] = useState<'light' | 'dark'>('light')
    const [laserTrigger, setLaserTrigger] = useState(0)

    // Permisos jerárquicos en vivo
    const isJefaturaOrAbove = [
        'SUPER_ADMIN',
        'DIRECTOR_OPERATIVO',
        'GERENTE',
        'SUPERINTENDENTE',
    ].includes(activeRole)
    const canMoveSquads = ['SUPER_ADMIN', 'GERENTE', 'SUPERINTENDENTE'].includes(activeRole)
    const canEditPlanning = [
        'SUPER_ADMIN',
        'JEFE_PLANEACION',
        'SUPERINTENDENTE',
        'GERENTE',
    ].includes(activeRole)
    const canApproveReports = ['SUPER_ADMIN', 'SUPERINTENDENTE', 'GERENTE'].includes(activeRole)
    const canViewFinancials = [
        'SUPER_ADMIN',
        'DIRECTOR_OPERATIVO',
        'GERENTE',
        'SUPERINTENDENTE',
    ].includes(activeRole)

    // Estado de datos en vivo desde Supabase
    const [loading, setLoading] = useState(true)
    const [cuadrillas, setCuadrillas] = useState<any[]>([])
    const [selectedSquadId, setSelectedSquadId] = useState<string>('')
    const [membersBySquad, setMembersBySquad] = useState<Record<string, any[]>>({})
    const [benchEmployees, setBenchEmployees] = useState<any[]>([])
    const [allEmployees, setAllEmployees] = useState<any[]>([])
    const [squadHistory, setSquadHistory] = useState<Record<string, any>>({})

    const [reports, setReports] = useState<any[]>([])
    const [reportItems, setReportItems] = useState<any[]>([])
    const [planItems, setPlanItems] = useState<any[]>([])
    const [planHeader, setPlanHeader] = useState<any | null>(null)
    const [turnos, setTurnos] = useState<any[]>([])
    const [minas, setMinas] = useState<any[]>([])
    const [ubicaciones, setUbicaciones] = useState<any[]>([])
    const [productos, setProductos] = useState<any[]>([])
    const [equipos, setEquipos] = useState<any[]>([])
    const [asistenciasCat, setAsistenciasCat] = useState<any[]>([])
    const [blogMessages, setBlogMessages] = useState<any[]>([])
    const [securityIncidents, setSecurityIncidents] = useState<any[]>([])

    // Estado para Pizarra de Cuadrillas Móvil
    const [selectedWorkerForTransfer, setSelectedWorkerForTransfer] = useState<any | null>(null)
    const [transferAnimationState, setTransferAnimationState] = useState<{
        active: boolean
        text: string
        target: string
        specialtyCode: string
    } | null>(null)

    // Estado para Planeación S-38
    const [newMetaProdId, setNewMetaProdId] = useState('')
    const [newMetaLocId, setNewMetaLocId] = useState('')
    const [newMetaQty, setNewMetaQty] = useState('')

    // Estado para Asistente de Nuevo Reporte Diario (4 Pasos)
    const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1)
    const [repFecha, setRepFecha] = useState(new Date().toISOString().split('T')[0])
    const [repTurnoId, setRepTurnoId] = useState('')
    const [repCuadrillaId, setRepCuadrillaId] = useState('')
    const [repMinaId, setRepMinaId] = useState('')
    const [repComments, setRepComments] = useState('')
    const [repAttendance, setRepAttendance] = useState<any[]>([])
    const [repActivities, setRepActivities] = useState<any[]>([])
    const [actProdId, setActProdId] = useState('')
    const [actLocId, setActLocId] = useState('')
    const [actEquipId, setActEquipId] = useState('')
    const [actQty, setActQty] = useState('')
    const [repHasIncident, setRepHasIncident] = useState(false)
    const [repIncTipo, setRepIncTipo] = useState<'ACCIDENTE' | 'CONDICION_INSEGURA' | 'PERSONAL_PROBLEMATICO'>('CONDICION_INSEGURA')
    const [repIncDesc, setRepIncDesc] = useState('')
    const [savingReport, setSavingReport] = useState(false)

    // Estado para Bitácora y Seguridad
    const [tasksSubTab, setTasksSubTab] = useState<'BITACORA' | 'SEGURIDAD'>('BITACORA')
    const [newBlogText, setNewBlogText] = useState('')
    const [newBlogIsTask, setNewBlogIsTask] = useState(false)
    const [secTipoForm, setSecTipoForm] = useState<'ACCIDENTE' | 'CONDICION_INSEGURA' | 'PERSONAL_PROBLEMATICO'>('CONDICION_INSEGURA')
    const [secTargetForm, setSecTargetForm] = useState('')
    const [secDescForm, setSecDescForm] = useState('')

    // Buscador general
    const [searchQuery, setSearchQuery] = useState('')

    // Capturar evento nativo de instalación PWA en Android Chrome + Registrar Service Worker WebAPK
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => {})
        }
        const handler = (e: any) => {
            e.preventDefault()
            setDeferredPrompt(e)
        }
        window.addEventListener('beforeinstallprompt', handler)
        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    useEffect(() => {
        const saved = localStorage.getItem('raya_theme') as 'light' | 'dark' | null
        const resolved: 'light' | 'dark' = saved === 'dark' ? 'dark' : 'light'
        setTheme(resolved)
        const root = document.documentElement
        if (resolved === 'dark') {
            root.classList.remove('theme-light')
            root.classList.add('theme-dark')
        } else {
            root.classList.remove('theme-dark')
            root.classList.add('theme-light')
        }
    }, [])

    const toggleTheme = () => {
        const next = theme === 'light' ? 'dark' : 'light'
        setTheme(next)
        localStorage.setItem('raya_theme', next)
        const root = document.documentElement
        if (next === 'dark') {
            root.classList.remove('theme-light')
            root.classList.add('theme-dark')
        } else {
            root.classList.remove('theme-dark')
            root.classList.add('theme-light')
        }
    }

    const classifyWorkerSpecialty = (puesto: string, rol: string) => {
        const text = `${puesto} ${rol}`.toUpperCase()
        if (text.includes('SCOOP') || text.includes('CARGADOR') || text.includes('CAMION')) {
            return {
                code: 'SCOOP',
                badge: '🚜 OPERADOR SCOOP',
                colorClass: 'bg-amber-500 text-slate-950 border-amber-400',
                animMessage: '🚜 Desplazando Operador de Scooptram con animación de carga...',
            }
        }
        if (text.includes('AYUDANTE')) {
            return {
                code: 'AYUDANTE',
                badge: '🛡️ AYUDANTE PERF.',
                colorClass: 'bg-cyan-500 text-slate-950 border-cyan-400',
                animMessage: '🛡️ Reubicando Ayudante de Perforista en frente...',
            }
        }
        if (
            text.includes('PERFORISTA') ||
            text.includes('JUMBO') ||
            text.includes('STOPPER') ||
            text.includes('BARRENADOR')
        ) {
            return {
                code: 'PERFORISTA',
                badge: '⛏️ PERFORISTA',
                colorClass: 'bg-rose-500 text-white border-rose-400',
                animMessage: '⛏️ Perforista en acción cambiando de cuadrilla...',
            }
        }
        return {
            code: 'GENERAL',
            badge: '🔧 SERVICIOS MINA',
            colorClass: 'bg-emerald-500 text-slate-950 border-emerald-400',
            animMessage: '⛏️ Moviendo personal operativo a nueva cuadrilla...',
        }
    }

    const loadAllSupabaseData = useCallback(async () => {
        setLoading(true)
        try {
            const [
                { data: sqData },
                { data: memData },
                { data: empData },
                { data: repData },
                { data: repItemsData },
                { data: planesData },
                { data: turnosData },
                { data: minasData },
                { data: locsData },
                { data: prodsData },
                { data: equipsData },
                { data: asistData },
                { data: histConfig },
                { data: blogConfig },
                { data: secConfig },
            ] = await Promise.all([
                supabase
                    .from('cat_cuadrillas')
                    .select('id, nombre, codigo, activo, cat_turnos(nombre, codigo), mine_sites(nombre_mina)')
                    .eq('activo', true)
                    .order('nombre'),
                supabase
                    .from('cat_cuadrillas_miembros')
                    .select('id, cuadrilla_id, empleado_id, rol_operativo_id, activo'),
                supabase
                    .from('rh_employees')
                    .select(
                        'id, employee_code, first_name, last_name, sueldo_diario_base, is_jefe, status, role_id, rol_operativo_default_id, cat_puestos(nombre), cat_roles_operativos(nombre)'
                    )
                    .order('first_name'),
                supabase
                    .from('ops_daily_reports')
                    .select(
                        'id, fecha, estado, status, observaciones_generales, comentarios_supervisor, turno:cat_turnos(nombre, codigo), cuadrilla:cat_cuadrillas(nombre), mine_site:mine_sites(nombre_mina), ops_report_items(id, cantidad_total, cat_productos_mina(nombre, unidad_medida_default))'
                    )
                    .order('fecha', { ascending: false })
                    .limit(30),
                supabase
                    .from('ops_report_items')
                    .select(
                        'id, producto_id, location_id, cantidad_total, cat_productos_mina(id, nombre, categoria, unidad_medida_default, tarifa_pago), ops_daily_reports(fecha, mine_sites(nombre_mina))'
                    )
                    .order('created_at', { ascending: false }),
                supabase
                    .from('ops_planes_semanales')
                    .select(
                        '*, ops_plan_items(id, producto_id, location_id, meta_proyectada, cantidad_proyectada, cat_productos_mina(nombre, unidad_medida_default, tarifa_pago), mine_locations(nombre, codigo))'
                    )
                    .order('created_at', { ascending: false }),
                supabase.from('cat_turnos').select('*').eq('activo', true).order('codigo'),
                supabase.from('mine_sites').select('*'),
                supabase.from('mine_locations').select('*').eq('activo', true).order('nombre'),
                supabase.from('cat_productos_mina').select('*').eq('activo', true).order('nombre'),
                supabase.from('ops_equipment').select('*').order('clave'),
                supabase.from('cat_asistencias').select('*').eq('activo', true),
                supabase.from('sys_config').select('value_json').eq('key_name', SQUAD_HISTORY_KEY).maybeSingle(),
                supabase.from('sys_config').select('value_json').eq('key_name', BLOG_STORE_KEY).maybeSingle(),
                supabase.from('sys_config').select('value_json').eq('key_name', SEC_STORE_KEY).maybeSingle(),
            ])

            const activeSquads = sqData || []
            setCuadrillas(activeSquads)
            if (activeSquads.length > 0 && !selectedSquadId) {
                setSelectedSquadId(activeSquads[0].id)
                setRepCuadrillaId(activeSquads[0].id)
            }

            if (turnosData && turnosData.length > 0 && !repTurnoId) {
                setTurnos(turnosData)
                setRepTurnoId(turnosData[0].id)
            } else if (turnosData) {
                setTurnos(turnosData)
            }

            if (minasData && minasData.length > 0 && !repMinaId) {
                setMinas(minasData)
                setRepMinaId(minasData[0].id)
            } else if (minasData) {
                setMinas(minasData)
            }

            if (locsData && locsData.length > 0) {
                setUbicaciones(locsData)
                if (!newMetaLocId) setNewMetaLocId(locsData[0].id)
                if (!actLocId) setActLocId(locsData[0].id)
            }

            if (prodsData && prodsData.length > 0) {
                setProductos(prodsData)
                if (!newMetaProdId) setNewMetaProdId(prodsData[0].id)
                if (!actProdId) setActProdId(prodsData[0].id)
            }

            if (equipsData) setEquipos(equipsData)
            if (asistData) setAsistenciasCat(asistData)
            if (repData) setReports(repData)
            if (repItemsData) setReportItems(repItemsData)

            const activePlan =
                (planesData || []).find((p: any) => (p.nombre || '').includes('38')) ||
                (planesData || [])[0]
            setPlanHeader(activePlan || null)
            setPlanItems(activePlan?.ops_plan_items || [])

            const hMap =
                histConfig?.value_json && typeof histConfig.value_json === 'object'
                    ? (histConfig.value_json as Record<string, any>)
                    : {}
            setSquadHistory(hMap)

            setBlogMessages(Array.isArray(blogConfig?.value_json) ? blogConfig.value_json : [])
            setSecurityIncidents(Array.isArray(secConfig?.value_json) ? secConfig.value_json : [])

            // Mapear empleados y cuadrillas sin duplicados
            const empMap = new Map<string, any>()
            const enrichedEmps: any[] = []
            ;(empData || []).forEach((e: any) => {
                if (e.status === 'INACTIVE') return
                const puesto = Array.isArray(e.cat_puestos)
                    ? e.cat_puestos[0]?.nombre
                    : e.cat_puestos?.nombre || 'Operador'
                const rol = Array.isArray(e.cat_roles_operativos)
                    ? e.cat_roles_operativos[0]?.nombre
                    : e.cat_roles_operativos?.nombre || puesto
                const obj = {
                    ...e,
                    fullName: `${e.first_name || ''} ${e.last_name || ''}`.trim(),
                    puestoNombre: puesto,
                    rolNombre: rol,
                    specialty: classifyWorkerSpecialty(puesto, rol),
                }
                empMap.set(e.id, obj)
                enrichedEmps.push(obj)
            })
            setAllEmployees(enrichedEmps)

            const assignedIds = new Set<string>()
            const grouped: Record<string, any[]> = {}
            activeSquads.forEach((s: any) => {
                grouped[s.id] = []
            })

            ;(memData || []).forEach((m: any) => {
                if (m.activo === false) return
                const emp = empMap.get(m.empleado_id)
                if (emp && grouped[m.cuadrilla_id] && !assignedIds.has(m.empleado_id)) {
                    assignedIds.add(m.empleado_id)
                    grouped[m.cuadrilla_id].push(emp)
                }
            })

            const bench: any[] = []
            empMap.forEach((emp, id) => {
                if (!assignedIds.has(id)) bench.push(emp)
            })

            setMembersBySquad(grouped)
            setBenchEmployees(bench)
        } catch (err) {
            console.error('Error sincronizando app móvil con Supabase:', err)
        } finally {
            setLoading(false)
        }
    }, [selectedSquadId, repTurnoId, repMinaId, newMetaLocId, newMetaProdId, actLocId, actProdId])

    useEffect(() => {
        loadAllSupabaseData()
    }, [loadAllSupabaseData])

    const navigateToScreen = (screen: MobileScreenId, requiresJefatura = false) => {
        if (requiresJefatura && !isJefaturaOrAbove) {
            toast.error('Acceso restringido: Esta vista es exclusiva de Jefatura hacia arriba.')
            setRoleModalOpen(true)
            return
        }
        setDrawerOpen(false)
        setLaserTrigger((prev) => prev + 1)
        setActiveScreen(screen)
    }

    // Cargar integrantes cuando cambia la cuadrilla en el asistente de captura
    useEffect(() => {
        if (!repCuadrillaId || asistenciasCat.length === 0) return
        const members = membersBySquad[repCuadrillaId] || []
        const defAsist =
            asistenciasCat.find((a) => a.codigo === 'ASISTENCIA' || a.codigo === 'A') ||
            asistenciasCat[0]
        if (!defAsist) return

        setRepAttendance(
            members.map((m: any) => ({
                empleado_id: m.id,
                nombre: m.fullName,
                puesto: m.puestoNombre,
                specialty: m.specialty,
                rol_id: m.role_id || m.rol_operativo_default_id || null,
                asistencia_id: defAsist.id,
                codigo: defAsist.codigo,
            }))
        )
    }, [repCuadrillaId, membersBySquad, asistenciasCat])

    // Acción: Mover trabajador entre cuadrillas (con animación de Perforista / Ayudante / Scooptram)
    const handleTransferWorker = async (worker: any, targetSquadId: string | 'BENCH') => {
        if (!canMoveSquads) {
            toast.error('Solo Superintendente y Gerente están autorizados para mover cuadrillas.')
            return
        }

        const currentSquadObj = cuadrillas.find((c) =>
            (membersBySquad[c.id] || []).some((m) => m.id === worker.id)
        )
        const targetSquadObj =
            targetSquadId === 'BENCH'
                ? { nombre: 'Banca / Reserva Disponible' }
                : cuadrillas.find((c) => c.id === targetSquadId)

        setTransferAnimationState({
            active: true,
            text: worker.specialty.animMessage,
            target: targetSquadObj?.nombre || 'Destino',
            specialtyCode: worker.specialty.code,
        })

        setTimeout(async () => {
            try {
                await supabase.from('cat_cuadrillas_miembros').delete().eq('empleado_id', worker.id)

                if (targetSquadId !== 'BENCH') {
                    await supabase.from('cat_cuadrillas_miembros').insert([
                        {
                            cuadrilla_id: targetSquadId,
                            empleado_id: worker.id,
                            activo: true,
                        },
                    ])
                }

                const updatedHist = {
                    ...squadHistory,
                    [worker.id]: {
                        previousSquad: currentSquadObj?.nombre || 'Reserva',
                        currentSquad: targetSquadObj?.nombre || 'Reserva',
                        movedBy: activeRole,
                        week: 'Semana 38 (21-27 Sep 2026)',
                        updatedAt: new Date().toISOString(),
                    },
                }
                setSquadHistory(updatedHist)

                await supabase.from('sys_config').upsert(
                    {
                        key_name: SQUAD_HISTORY_KEY,
                        value_json: updatedHist,
                        description: 'Historial semanal de movimientos de cuadrillas',
                    },
                    { onConflict: 'key_name' }
                )

                toast.success(`${worker.fullName} asignado a ${targetSquadObj?.nombre}`)
                setSelectedWorkerForTransfer(null)
                setTransferAnimationState(null)
                await loadAllSupabaseData()
            } catch (e: any) {
                setTransferAnimationState(null)
                toast.error(e?.message || 'Error al mover trabajador')
            }
        }, 850)
    }

    // Acción: Guardar nueva meta semanal (Exclusivo Planeador / Jefatura)
    const handleAddPlanningTarget = async () => {
        if (!canEditPlanning) {
            toast.error('Solo el Jefe de Planeación o Jefatura pueden modificar metas.')
            return
        }
        const val = parseFloat(newMetaQty)
        if (!newMetaProdId || !val || val <= 0) {
            toast.error('Ingresa una cantidad proyectada válida.')
            return
        }

        try {
            let planId = planHeader?.id
            if (!planId) {
                const { data: created, error: cErr } = await supabase
                    .from('ops_planes_semanales')
                    .insert([
                        {
                            nombre: 'SEMANA 38 (21 AL 27 DE SEPTIEMBRE 2026)',
                            fecha_inicio: '2026-09-21',
                            fecha_fin: '2026-09-27',
                            estado: 'ACTIVO',
                        },
                    ])
                    .select()
                    .single()
                if (cErr) throw cErr
                planId = created.id
            }

            const locObj = ubicaciones.find((u) => u.id === newMetaLocId)
            const { error } = await supabase.from('ops_plan_items').insert([
                {
                    plan_id: planId,
                    producto_id: newMetaProdId,
                    location_id: newMetaLocId || null,
                    mine_site_id: locObj?.mine_site_id || null,
                    meta_proyectada: val,
                    cantidad_proyectada: val,
                },
            ])
            if (error) throw error

            setNewMetaQty('')
            toast.success('Meta proyectada guardada en Supabase.')
            await loadAllSupabaseData()
        } catch (err: any) {
            toast.error(err?.message || 'Error al guardar meta')
        }
    }

    // Acción: Subir Reporte Diario Completo desde Celular a Supabase
    const handleSubmitMobileReport = async () => {
        if (!repTurnoId || !repCuadrillaId || !repMinaId) {
            toast.error('Selecciona Turno, Cuadrilla y Mina.')
            return
        }
        setSavingReport(true)
        try {
            const { data: repRow, error: repErr } = await supabase
                .from('ops_daily_reports')
                .insert([
                    {
                        fecha: repFecha,
                        turno_id: repTurnoId,
                        cuadrilla_id: repCuadrillaId,
                        mine_site_id: repMinaId,
                        supervisor_id: null,
                        estado: 'EN_REVISION',
                        status: 'EN_REVISION',
                        observaciones_generales: repComments,
                        comentarios_supervisor: repComments,
                    },
                ])
                .select()
                .single()

            if (repErr) throw repErr
            const reportId = repRow.id

            if (repAttendance.length > 0) {
                const attPayload = repAttendance.map((a) => ({
                    report_id: reportId,
                    empleado_id: a.empleado_id,
                    asistencia_tipo_id: a.asistencia_id,
                    asistencia_id: a.asistencia_id,
                    rol_asignado_id: a.rol_id,
                    rol_dia_id: a.rol_id,
                    horas_trabajadas: 8,
                    observaciones: '',
                    observacion: '',
                }))
                const { error: attErr } = await supabase.from('ops_daily_attendance').insert(attPayload)
                if (attErr) throw attErr
            }

            const presentEmpIds = repAttendance
                .filter((a) => a.codigo === 'ASISTENCIA' || a.codigo === 'A')
                .map((a) => a.empleado_id)

            for (const act of repActivities) {
                const { data: itemRow, error: itemErr } = await supabase
                    .from('ops_report_items')
                    .insert([
                        {
                            report_id: reportId,
                            producto_id: act.producto_id,
                            location_id: act.location_id,
                            equipo_id: act.equipo_id || null,
                            cantidad_total: act.cantidad_total,
                            variables_capturadas: {},
                            variables_json: {},
                        },
                    ])
                    .select()
                    .single()

                if (itemErr) throw itemErr

                if (presentEmpIds.length > 0) {
                    const pct = Number((100 / presentEmpIds.length).toFixed(2))
                    const persPayload = presentEmpIds.map((empId) => ({
                        report_item_id: itemRow.id,
                        item_id: itemRow.id,
                        empleado_id: empId,
                        porcentaje_participacion: pct,
                    }))
                    await supabase.from('ops_report_personnel').insert(persPayload)
                }
            }

            if (repHasIncident && repIncDesc.trim()) {
                const cuadObj = cuadrillas.find((c) => c.id === repCuadrillaId)
                const turnoObj = turnos.find((t) => t.id === repTurnoId)
                const newInc = {
                    id: 'inc-mob-' + Date.now(),
                    report_id: reportId,
                    fecha: repFecha,
                    turno: turnoObj?.nombre || 'TURNO',
                    cuadrilla: cuadObj?.nombre || 'CUADRILLA',
                    mina: 'EL HERRERO',
                    tipo: repIncTipo,
                    severidad: 'ALTA',
                    involucrado: cuadObj?.nombre || 'Turno Activo',
                    descripcion: repIncDesc.trim(),
                    autor: `${user?.email?.split('@')[0] || 'Supervisor'} (${activeRole})`,
                    created_at: new Date().toISOString(),
                }
                const updatedSec = [newInc, ...securityIncidents]
                await supabase.from('sys_config').upsert(
                    {
                        key_name: SEC_STORE_KEY,
                        value_json: updatedSec,
                        description: 'Registro oficial de accidentes, condiciones inseguras y personal problemático',
                    },
                    { onConflict: 'key_name' }
                )
            }

            toast.success('¡Reporte Diario subido exitosamente a Supabase!')
            setRepActivities([])
            setRepComments('')
            setRepIncDesc('')
            setRepHasIncident(false)
            setWizardStep(1)
            await loadAllSupabaseData()
            navigateToScreen('REPORTS')
        } catch (err: any) {
            toast.error(err?.message || 'Error al subir reporte')
        } finally {
            setSavingReport(false)
        }
    }

    // Acción: Aprobar / Rechazar Reporte (Superintendente / Gerente)
    const handleReportApproval = async (reportId: string, status: 'APROBADO' | 'CORRECCION_SOLICITADA') => {
        if (!canApproveReports) {
            toast.error('Solo Superintendente y Gerente pueden aprobar reportes.')
            return
        }
        const { error } = await supabase
            .from('ops_daily_reports')
            .update({ estado: status, status })
            .eq('id', reportId)

        if (error) {
            toast.error(error.message)
        } else {
            toast.success(`Reporte marcado como ${status}`)
            await loadAllSupabaseData()
        }
    }

    // Acción: Enviar mensaje / consigna en Bitácora
    const handleSendBlogMsg = async () => {
        if (!newBlogText.trim()) return
        const msg = {
            id: 'mob-task-' + Date.now(),
            author_id: user?.id || 'mob-user',
            body: newBlogText.trim(),
            is_task: newBlogIsTask,
            task_status: newBlogIsTask ? 'PENDING' : null,
            created_at: new Date().toISOString(),
            author: {
                nickname: `${user?.email?.split('@')[0] || 'Mando'} (${activeRole})`,
                avatar_url: '',
                email: user?.email || 'operaciones@rayamina.com',
            },
        }
        const updated = [...blogMessages, msg]
        setBlogMessages(updated)
        setNewBlogText('')
        setNewBlogIsTask(false)

        await supabase.from('sys_config').upsert(
            {
                key_name: BLOG_STORE_KEY,
                value_json: updated,
                description: 'Almacén sincronizado de Bitácora y Tareas Operativas',
            },
            { onConflict: 'key_name' }
        )
        toast.success('Consigna publicada en vivo.')
    }

    // Acción: Resolver tarea en turno
    const handleResolveTask = async (msgId: string, status: 'COMPLETED' | 'REJECTED') => {
        const updated = blogMessages.map((m) =>
            m.id === msgId ? { ...m, task_status: status } : m
        )
        setBlogMessages(updated)
        await supabase.from('sys_config').upsert(
            {
                key_name: BLOG_STORE_KEY,
                value_json: updated,
                description: 'Almacén sincronizado de Bitácora y Tareas Operativas',
            },
            { onConflict: 'key_name' }
        )
        toast.success(status === 'COMPLETED' ? 'Tarea marcada como cumplida' : 'Impedimento reportado')
    }

    // Acción: Registrar Alerta de Seguridad / Personal Problemático
    const handleSaveSecurityAlert = async () => {
        if (!secDescForm.trim()) {
            toast.error('Escribe la descripción del accidente, condición insegura o reporte disciplinario.')
            return
        }
        const newAlert = {
            id: 'inc-mob-' + Date.now(),
            fecha: new Date().toISOString().split('T')[0],
            turno: 'TURNO EN CURSO',
            cuadrilla: 'OPERACIÓN MINA',
            mina: 'EL HERRERO',
            tipo: secTipoForm,
            severidad: 'ALTA',
            involucrado: secTargetForm.trim() || 'Frente General',
            descripcion: secDescForm.trim(),
            autor: `${user?.email?.split('@')[0] || 'Supervisor'} (${activeRole})`,
            created_at: new Date().toISOString(),
        }
        const updated = [newAlert, ...securityIncidents]
        setSecurityIncidents(updated)
        setSecTargetForm('')
        setSecDescForm('')

        await supabase.from('sys_config').upsert(
            {
                key_name: SEC_STORE_KEY,
                value_json: updated,
                description: 'Registro oficial de accidentes, condiciones inseguras y personal problemático',
            },
            { onConflict: 'key_name' }
        )
        toast.success('Alerta subida a Supabase y notificada a Jefatura.')
    }

    // Cálculo de KPIs en vivo
    const kpiSummary = React.useMemo(() => {
        let tons = 0
        let meters = 0
        let destajoTotal = 0

        reportItems.forEach((it: any) => {
            const prod = Array.isArray(it.cat_productos_mina)
                ? it.cat_productos_mina[0]
                : it.cat_productos_mina
            const qty = Number(it.cantidad_total) || 0
            const unit = (prod?.unidad_medida_default || '').toUpperCase()
            const tarifa = Number(prod?.tarifa_pago) || 0
            if (
                unit.includes('TON') ||
                (prod?.nombre || '').toUpperCase().includes('SCOOP') ||
                (prod?.nombre || '').toUpperCase().includes('REZAGA')
            ) {
                tons += qty
            } else if (unit.includes('M') || (prod?.categoria || '').includes('PERFORACION')) {
                meters += qty
            }
            destajoTotal += qty * tarifa
        })

        const baseSemanal = allEmployees.reduce(
            (acc, e) => acc + (Number(e.sueldo_diario_base) || 450) * 7,
            0
        )

        return {
            tons: Math.round(tons),
            meters: Number(meters.toFixed(1)),
            payroll: Math.round(baseSemanal + destajoTotal),
            baseSemanal: Math.round(baseSemanal),
            destajoTotal: Math.round(destajoTotal),
            pendingTasks: blogMessages.filter((m) => m.is_task && m.task_status === 'PENDING').length,
        }
    }, [reportItems, allEmployees, blogMessages])

    const handleTriggerInstall = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt()
            await deferredPrompt.userChoice
            setDeferredPrompt(null)
        } else {
            setInstallModalOpen(true)
        }
    }

    const currentRoleInfo = ROLE_CONFIG[activeRole] || ROLE_CONFIG.SUPER_ADMIN
    const currentSquad = cuadrillas.find((c) => c.id === selectedSquadId) || cuadrillas[0]
    const currentSquadMembers = currentSquad ? membersBySquad[currentSquad.id] || [] : []

    const menuSections = [
        {
            pillar: '1. Jefatura y Dirección',
            color: 'text-amber-500',
            dot: 'bg-amber-500',
            items: [
                {
                    id: 'HOME' as MobileScreenId,
                    label: isJefaturaOrAbove ? 'Dashboard Ejecutivo' : 'Consola de Turno',
                    sub: 'KPIs y Estado Operativo S-38',
                    icon: LayoutDashboard,
                    badge: isJefaturaOrAbove ? 'Jefatura+' : 'Campo',
                    requiresJefatura: false,
                },
                {
                    id: 'PAYROLL' as MobileScreenId,
                    label: 'Pre-Nómina y Raya S-38',
                    sub: 'Destajos, Bonos y Sueldos',
                    icon: DollarSign,
                    badge: 'Confidencial',
                    requiresJefatura: true,
                },
            ],
        },
        {
            pillar: '2. Planeación e Ingeniería',
            color: 'text-blue-500',
            dot: 'bg-blue-500',
            items: [
                {
                    id: 'PLANNING' as MobileScreenId,
                    label: 'Planeación vs Ejecución',
                    sub: 'Metas Semana 38 (21-27 Sep)',
                    icon: Calendar,
                    badge: 'S-38',
                    requiresJefatura: false,
                },
            ],
        },
        {
            pillar: '3. Operación Mina (Campo)',
            color: 'text-emerald-500',
            dot: 'bg-emerald-500',
            items: [
                {
                    id: 'SQUADS' as MobileScreenId,
                    label: 'Pizarra Táctica Cuadrillas',
                    sub: 'Perforistas, Ayudantes y Scoop',
                    icon: Users,
                    badge: 'Táctica',
                    requiresJefatura: false,
                },
                {
                    id: 'PERSONNEL' as MobileScreenId,
                    label: 'Fuerza Operativa',
                    sub: 'Plantilla de Mineros y Puestos',
                    icon: HardHat,
                    requiresJefatura: false,
                },
            ],
        },
        {
            pillar: '4. Reportes y Seguridad',
            color: 'text-rose-500',
            dot: 'bg-rose-500',
            items: [
                {
                    id: 'REPORTS' as MobileScreenId,
                    label: 'Reportes Diarios de Turno',
                    sub: 'Historial y Autorización',
                    icon: Pickaxe,
                    requiresJefatura: false,
                },
                {
                    id: 'REPORT_NEW' as MobileScreenId,
                    label: 'Capturar Reporte Diario',
                    sub: 'Asistente de 4 Pasos (Campo)',
                    icon: PlusCircle,
                    badge: 'Nuevo',
                    requiresJefatura: false,
                },
                {
                    id: 'TASKS_SECURITY' as MobileScreenId,
                    label: 'Bitácora y Seguridad',
                    sub: 'Tareas, Accidentes y Disciplina',
                    icon: ShieldAlert,
                    badge: 'En Vivo',
                    requiresJefatura: false,
                },
            ],
        },
        {
            pillar: '5. Sistema y Catálogos',
            color: 'text-purple-500',
            dot: 'bg-purple-500',
            items: [
                {
                    id: 'CATALOGS' as MobileScreenId,
                    label: 'Catálogos Maestros',
                    sub: 'Frentes, Precios y Equipos',
                    icon: Layers,
                    requiresJefatura: false,
                },
            ],
        },
    ]

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col max-w-md mx-auto shadow-2xl border-x border-slate-800 relative overflow-hidden">
            {/* BARRA LÁSER ANIMADA EN CADA CAMBIO DE PANTALLA */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={laserTrigger}
                    initial={{ width: '0%', opacity: 1 }}
                    animate={{ width: '100%', opacity: 0 }}
                    transition={{ duration: 0.55, ease: 'easeOut' }}
                    className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-blue-500 z-50"
                />
            </AnimatePresence>

            {/* CABECERA SUPERIOR ANDROID CON MENÚ DESPLEGABLE Y SELECTOR DE ROL */}
            <header className="h-16 bg-slate-900 border-b border-slate-800 px-3 flex items-center justify-between sticky top-0 z-30 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    <button
                        onClick={() => setDrawerOpen(true)}
                        aria-label="Abrir menú desplegable"
                        className="w-10 h-10 rounded-xl bg-slate-950 border-2 border-amber-500/70 flex items-center justify-center text-amber-500 active:scale-95 transition-transform shrink-0 shadow"
                    >
                        <Menu size={20} />
                    </button>

                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 truncate">
                                LA RAYA ANDROID • S-38
                            </span>
                        </div>
                        <h1 className="text-sm font-black text-white truncate">
                            {activeScreen === 'HOME' &&
                                (isJefaturaOrAbove ? 'Dashboard Ejecutivo' : 'Consola de Turno')}
                            {activeScreen === 'PAYROLL' && 'Pre-Nómina y Raya S-38'}
                            {activeScreen === 'PLANNING' && 'Planeación vs Ejecución'}
                            {activeScreen === 'SQUADS' && 'Cancha Táctica Cuadrillas'}
                            {activeScreen === 'PERSONNEL' && 'Fuerza Operativa'}
                            {activeScreen === 'REPORTS' && 'Reportes Diarios'}
                            {activeScreen === 'REPORT_NEW' && 'Captura de Turno (4 Pasos)'}
                            {activeScreen === 'TASKS_SECURITY' && 'Bitácora y Seguridad'}
                            {activeScreen === 'CATALOGS' && 'Catálogos Maestros'}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {/* Botón Selector de Nivel de Autorización */}
                    <button
                        onClick={() => setRoleModalOpen(true)}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 shadow-sm ${currentRoleInfo.badgeBg}`}
                    >
                        <Sparkles size={12} />
                        <span className="truncate max-w-[92px]">{currentRoleInfo.shortLabel}</span>
                    </button>

                    {/* Botón Modo Día / Modo Noche */}
                    <button
                        onClick={toggleTheme}
                        className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400"
                        title="Cambiar Modo Día / Modo Noche"
                    >
                        {theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
                    </button>

                    {/* Botón Instalar App en Android (Sin Expo Go) */}
                    <button
                        onClick={handleTriggerInstall}
                        className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow"
                        title="Instalar App directamente en tu Android"
                    >
                        <Download size={16} />
                    </button>
                </div>
            </header>

            {/* CONTENIDO PRINCIPAL CON ANIMACIÓN DE TRANSICIÓN ENTRE PANTALLAS */}
            <main className="flex-1 overflow-y-auto p-3.5 pb-24 space-y-4">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeScreen + '-' + activeRole}
                        initial={{ opacity: 0, y: 14, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.99 }}
                        transition={{ duration: 0.24, ease: 'easeOut' }}
                        className="space-y-4"
                    >
                        {/* =========================================================
                            PANTALLA 1: CENTRO DE MANDO / DASHBOARD (ADAPTATIVO POR ROL)
                           ========================================================= */}
                        {activeScreen === 'HOME' && (
                            <>
                                {/* Tarjeta de Jerarquía Activa */}
                                <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl p-4 shadow-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase ${currentRoleInfo.badgeBg}`}>
                                            {currentRoleInfo.label}
                                        </span>
                                        <button
                                            onClick={() => setRoleModalOpen(true)}
                                            className="text-[11px] font-black text-amber-500 underline"
                                        >
                                            Cambiar Rol
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-300 leading-relaxed">
                                        {currentRoleInfo.description}
                                    </p>

                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${canViewFinancials ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                                            {canViewFinancials ? '✔ Finanzas & Nómina' : '🔒 Finanzas (Solo Jefatura+)'}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${canMoveSquads ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-400'}`}>
                                            {canMoveSquads ? '✔ Mueve Cuadrillas' : '👁️ Cuadrillas (Lectura)'}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${canEditPlanning ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-slate-800 text-slate-400'}`}>
                                            {canEditPlanning ? '✔ Edita Metas S-38' : '👁️ Metas S-38 (Lectura)'}
                                        </span>
                                    </div>
                                </div>

                                {/* KPIs en Vivo desde Supabase */}
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center mb-2">
                                            <Truck size={18} />
                                        </div>
                                        <div className="text-xl font-black text-white">
                                            {kpiSummary.tons.toLocaleString()} t
                                        </div>
                                        <div className="text-[11px] font-bold text-slate-400">
                                            Rezaga Scooptram S-38
                                        </div>
                                    </div>

                                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-500 flex items-center justify-center mb-2">
                                            <Pickaxe size={18} />
                                        </div>
                                        <div className="text-xl font-black text-white">
                                            {kpiSummary.meters} m
                                        </div>
                                        <div className="text-[11px] font-bold text-slate-400">
                                            Avance Lineal S-38
                                        </div>
                                    </div>

                                    {canViewFinancials ? (
                                        <button
                                            onClick={() => navigateToScreen('PAYROLL', true)}
                                            className="bg-slate-900 border-2 border-emerald-500/40 rounded-2xl p-3.5 text-left"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center mb-2">
                                                <DollarSign size={18} />
                                            </div>
                                            <div className="text-xl font-black text-emerald-400">
                                                ${(kpiSummary.payroll / 1000).toFixed(1)}k
                                            </div>
                                            <div className="text-[11px] font-bold text-slate-400">
                                                Pre-Nómina Semana 38
                                            </div>
                                        </button>
                                    ) : (
                                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center mb-2">
                                                <Users size={18} />
                                            </div>
                                            <div className="text-xl font-black text-white">
                                                {allEmployees.length}
                                            </div>
                                            <div className="text-[11px] font-bold text-slate-400">
                                                Mineros Activos
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => navigateToScreen('TASKS_SECURITY')}
                                        className="bg-slate-900 border-2 border-rose-500/40 rounded-2xl p-3.5 text-left"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-500 flex items-center justify-center mb-2">
                                            <AlertTriangle size={18} />
                                        </div>
                                        <div className="text-xl font-black text-rose-400">
                                            {kpiSummary.pendingTasks} / {securityIncidents.length}
                                        </div>
                                        <div className="text-[11px] font-bold text-slate-400">
                                            Tareas / Alertas Seg.
                                        </div>
                                    </button>
                                </div>

                                {/* Accesos Rápidos por Pilar */}
                                <div className="space-y-2.5">
                                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">
                                        Módulos Operativos Móviles
                                    </h2>

                                    <button
                                        onClick={() => navigateToScreen('REPORT_NEW')}
                                        className="w-full bg-amber-500/15 border-2 border-amber-500 rounded-2xl p-3.5 flex items-center justify-between text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                                                <PlusCircle size={22} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-white">
                                                    Capturar Reporte Diario de Turno
                                                </div>
                                                <div className="text-[11px] text-slate-300">
                                                    Pase de lista, Scooptram, Perforación y Seguridad
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight size={18} className="text-amber-500 shrink-0" />
                                    </button>

                                    <button
                                        onClick={() => navigateToScreen('SQUADS')}
                                        className="w-full bg-slate-900 border border-emerald-500/50 rounded-2xl p-3.5 flex items-center justify-between text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                                                <Users size={22} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-white">
                                                    Pizarra Táctica de Cuadrillas
                                                </div>
                                                <div className="text-[11px] text-slate-400">
                                                    {canMoveSquads
                                                        ? 'Edición Activa: Mueve Perforistas, Ayudantes y Scoop'
                                                        : 'Vista de formación táctica e historial semanal'}
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight size={18} className="text-emerald-400 shrink-0" />
                                    </button>

                                    <button
                                        onClick={() => navigateToScreen('PLANNING')}
                                        className="w-full bg-slate-900 border border-blue-500/50 rounded-2xl p-3.5 flex items-center justify-between text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                                                <Calendar size={22} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-white">
                                                    Planeación vs Ejecución (Sem 38)
                                                </div>
                                                <div className="text-[11px] text-slate-400">
                                                    Metas vs Avance real en rebajes 13-480, 3-480 y 4-500
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight size={18} className="text-blue-400 shrink-0" />
                                    </button>

                                    <button
                                        onClick={() => navigateToScreen('TASKS_SECURITY')}
                                        className="w-full bg-slate-900 border border-rose-500/50 rounded-2xl p-3.5 flex items-center justify-between text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                                                <ShieldAlert size={22} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-white">
                                                    Bitácora, Accidentes y Disciplina
                                                </div>
                                                <div className="text-[11px] text-slate-400">
                                                    Reporta accidentes, condiciones inseguras o personal problemático
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight size={18} className="text-rose-400 shrink-0" />
                                    </button>
                                </div>
                            </>
                        )}

                        {/* =========================================================
                            PANTALLA 2: CANCHA TÁCTICA DE CUADRILLAS MÓVIL
                           ========================================================= */}
                        {activeScreen === 'SQUADS' && (
                            <>
                                <div
                                    className={`p-3 rounded-2xl border-2 flex items-center gap-2.5 ${
                                        canMoveSquads
                                            ? 'bg-emerald-500/15 border-emerald-500/60'
                                            : 'bg-amber-500/15 border-amber-500/60'
                                    }`}
                                >
                                    {canMoveSquads ? (
                                        <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                                    ) : (
                                        <Lock size={18} className="text-amber-500 shrink-0" />
                                    )}
                                    <div className="text-xs">
                                        <div className="font-black text-white">
                                            {canMoveSquads
                                                ? `Modo Táctico Activo (${activeRole}): Toca un minero para moverlo de cuadrilla`
                                                : `Modo Lectura (${activeRole}): Solo Superintendente y Gerente mueven cuadrillas`}
                                        </div>
                                        <div className="text-[10px] text-slate-300">
                                            Regla anti-duplicados activa • Historial Semana 38 sincronizado
                                        </div>
                                    </div>
                                </div>

                                {/* Selector de las 5 Cuadrillas */}
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {cuadrillas.map((sq) => {
                                        const isSel = currentSquad?.id === sq.id
                                        const count = (membersBySquad[sq.id] || []).length
                                        return (
                                            <button
                                                key={sq.id}
                                                onClick={() => setSelectedSquadId(sq.id)}
                                                className={`px-3.5 py-2 rounded-xl border text-xs font-black shrink-0 flex items-center gap-2 transition-all ${
                                                    isSel
                                                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow'
                                                        : 'bg-slate-900 text-slate-300 border-slate-800'
                                                }`}
                                            >
                                                <span>{sq.nombre}</span>
                                                <span className="px-1.5 py-0.5 rounded bg-slate-950/30 text-[10px]">
                                                    {count}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>

                                {/* Cancha de Fútbol / Mina */}
                                <div className="bg-emerald-950/90 border-2 border-emerald-500 rounded-2xl p-3.5 shadow-xl">
                                    <div className="flex items-center justify-between border-b border-emerald-700/60 pb-2.5 mb-3">
                                        <div>
                                            <div className="text-xs font-black text-white uppercase">
                                                ⚽ CANCHA TÁCTICA: {currentSquad?.nombre}
                                            </div>
                                            <div className="text-[10px] text-emerald-300 font-bold">
                                                {currentSquadMembers.length} Integrantes en Formación • Semana 38
                                            </div>
                                        </div>
                                        <span className="px-2 py-0.5 rounded bg-emerald-400 text-slate-950 text-[10px] font-black">
                                            EN TURNO
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2.5">
                                        {currentSquadMembers.map((emp: any) => {
                                            const hist = squadHistory[emp.id]
                                            return (
                                                <motion.button
                                                    key={emp.id}
                                                    whileTap={{ scale: 0.96 }}
                                                    onClick={() => setSelectedWorkerForTransfer(emp)}
                                                    className="bg-slate-950/90 border border-emerald-500/40 rounded-xl p-2.5 text-left flex flex-col justify-between shadow"
                                                >
                                                    <div>
                                                        <span
                                                            className={`inline-block px-2 py-0.5 rounded text-[9px] font-black border mb-1.5 ${emp.specialty.colorClass}`}
                                                        >
                                                            {emp.specialty.badge}
                                                        </span>
                                                        <div className="text-xs font-black text-white leading-tight">
                                                            {emp.fullName}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate">
                                                            {emp.puestoNombre}
                                                        </div>
                                                    </div>

                                                    {hist?.previousSquad && (
                                                        <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center gap-1 text-[9px] font-bold text-amber-400">
                                                            <History size={10} />
                                                            <span className="truncate">
                                                                Ant: {hist.previousSquad}
                                                            </span>
                                                        </div>
                                                    )}
                                                </motion.button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Banca de Reserva */}
                                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
                                    <div className="text-xs font-black text-amber-500 uppercase mb-1">
                                        Banca / Personal Disponible ({benchEmployees.length})
                                    </div>
                                    <p className="text-[11px] text-slate-400 mb-2.5">
                                        Toca un trabajador disponible para insertarlo en una cuadrilla:
                                    </p>
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                        {benchEmployees.slice(0, 25).map((emp: any) => (
                                            <button
                                                key={emp.id}
                                                onClick={() => setSelectedWorkerForTransfer(emp)}
                                                className="min-w-[140px] bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-left shrink-0"
                                            >
                                                <span
                                                    className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black mb-1 ${emp.specialty.colorClass}`}
                                                >
                                                    {emp.specialty.badge}
                                                </span>
                                                <div className="text-xs font-bold text-white truncate">
                                                    {emp.fullName}
                                                </div>
                                                <div className="text-[10px] text-slate-400 truncate">
                                                    {emp.puestoNombre}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* =========================================================
                            PANTALLA 3: PLANEACIÓN VS EJECUCIÓN SEMANA 38
                           ========================================================= */}
                        {activeScreen === 'PLANNING' && (
                            <>
                                <div className="bg-slate-900 border-2 border-blue-500/50 rounded-2xl p-4">
                                    <div className="text-[10px] font-black text-blue-400 uppercase tracking-wider">
                                        📐 PLANEACIÓN VS EJECUCIÓN • SEMANA 38 (21-27 SEP 2026)
                                    </div>
                                    <div className="text-base font-black text-white mt-0.5">
                                        {planHeader?.nombre || 'Plan Operativo Semana 38'}
                                    </div>

                                    {canEditPlanning ? (
                                        <div className="mt-3 pt-3 border-t border-slate-800 space-y-2.5">
                                            <div className="text-xs font-black text-amber-400">
                                                + Agregar / Ajustar Meta Semanal ({activeRole})
                                            </div>
                                            <select
                                                value={newMetaProdId}
                                                onChange={(e) => setNewMetaProdId(e.target.value)}
                                                className="w-full rounded-xl px-3 py-2 text-xs font-bold"
                                            >
                                                {productos.map((p) => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.nombre} ({p.unidad_medida_default})
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="flex gap-2">
                                                <select
                                                    value={newMetaLocId}
                                                    onChange={(e) => setNewMetaLocId(e.target.value)}
                                                    className="flex-1 rounded-xl px-3 py-2 text-xs font-bold"
                                                >
                                                    {ubicaciones.map((l) => (
                                                        <option key={l.id} value={l.id}>
                                                            {l.nombre}
                                                        </option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="number"
                                                    value={newMetaQty}
                                                    onChange={(e) => setNewMetaQty(e.target.value)}
                                                    placeholder="Meta"
                                                    className="w-24 rounded-xl px-3 py-2 text-xs font-bold"
                                                />
                                            </div>
                                            <button
                                                onClick={handleAddPlanningTarget}
                                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase shadow"
                                            >
                                                Guardar Meta en Supabase
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
                                            <Lock size={12} className="text-amber-500" />
                                            Solo el Jefe de Planeación y Jefatura pueden modificar metas.
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2.5">
                                    {planItems.map((pi: any) => {
                                        const prod = Array.isArray(pi.cat_productos_mina)
                                            ? pi.cat_productos_mina[0]
                                            : pi.cat_productos_mina
                                        const loc = Array.isArray(pi.mine_locations)
                                            ? pi.mine_locations[0]
                                            : pi.mine_locations
                                        const meta =
                                            Number(pi.meta_proyectada ?? pi.cantidad_proyectada) || 0
                                        const real = reportItems
                                            .filter((ri) => ri.producto_id === pi.producto_id)
                                            .reduce(
                                                (acc, ri) => acc + (Number(ri.cantidad_total) || 0),
                                                0
                                            )
                                        const pct =
                                            meta > 0
                                                ? Math.min(Math.round((real / meta) * 100), 150)
                                                : 100

                                        return (
                                            <div
                                                key={pi.id}
                                                className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5"
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <div className="text-xs font-black text-white">
                                                            {prod?.nombre || 'Concepto'}
                                                        </div>
                                                        <div className="text-[10px] text-blue-400 font-bold flex items-center gap-1 mt-0.5">
                                                            <MapPin size={11} /> Frente:{' '}
                                                            {loc?.nombre || 'General Mina'}
                                                        </div>
                                                    </div>
                                                    <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-black">
                                                        {pct}%
                                                    </span>
                                                </div>

                                                <div className="flex justify-between text-xs font-bold mb-1.5">
                                                    <span className="text-slate-400">
                                                        Meta: {meta.toLocaleString()}{' '}
                                                        {prod?.unidad_medida_default}
                                                    </span>
                                                    <span className="text-emerald-400">
                                                        Real: {real.toLocaleString()}{' '}
                                                        {prod?.unidad_medida_default}
                                                    </span>
                                                </div>

                                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all"
                                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </>
                        )}

                        {/* =========================================================
                            PANTALLA 4: ASISTENTE DE CAPTURA DE REPORTE DIARIO (4 PASOS)
                           ========================================================= */}
                        {activeScreen === 'REPORT_NEW' && (
                            <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl p-4 space-y-4">
                                <div className="flex justify-between gap-1.5">
                                    {[1, 2, 3, 4].map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => setWizardStep(s as any)}
                                            className={`flex-1 py-2 rounded-xl text-[11px] font-black border ${
                                                wizardStep === s
                                                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                                                    : 'bg-slate-950 text-slate-400 border-slate-800'
                                            }`}
                                        >
                                            Paso {s}
                                        </button>
                                    ))}
                                </div>

                                {wizardStep === 1 && (
                                    <div className="space-y-3">
                                        <div className="text-xs font-black text-amber-500 uppercase">
                                            Paso 1: Datos de Turno y Cuadrilla
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">
                                                Fecha del Reporte
                                            </label>
                                            <input
                                                type="date"
                                                value={repFecha}
                                                onChange={(e) => setRepFecha(e.target.value)}
                                                className="w-full rounded-xl px-3 py-2.5 text-xs font-bold mt-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">
                                                Turno Operativo
                                            </label>
                                            <select
                                                value={repTurnoId}
                                                onChange={(e) => setRepTurnoId(e.target.value)}
                                                className="w-full rounded-xl px-3 py-2.5 text-xs font-bold mt-1"
                                            >
                                                {turnos.map((t) => (
                                                    <option key={t.id} value={t.id}>
                                                        {t.codigo} — {t.nombre}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">
                                                Cuadrilla en Turno
                                            </label>
                                            <select
                                                value={repCuadrillaId}
                                                onChange={(e) => setRepCuadrillaId(e.target.value)}
                                                className="w-full rounded-xl px-3 py-2.5 text-xs font-bold mt-1"
                                            >
                                                {cuadrillas.map((c) => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.nombre}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <button
                                            onClick={() => setWizardStep(2)}
                                            className="w-full py-3 bg-amber-500 text-slate-950 rounded-xl text-xs font-black uppercase"
                                        >
                                            Siguiente: Pase de Lista →
                                        </button>
                                    </div>
                                )}

                                {wizardStep === 2 && (
                                    <div className="space-y-3">
                                        <div className="text-xs font-black text-amber-500 uppercase">
                                            Paso 2: Pase de Lista ({repAttendance.length} mineros)
                                        </div>
                                        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                                            {repAttendance.map((att, idx) => (
                                                <div
                                                    key={att.empleado_id}
                                                    className="bg-slate-950 border border-slate-800 rounded-xl p-2.5"
                                                >
                                                    <div className="text-xs font-black text-white">
                                                        {att.nombre}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 mb-2">
                                                        {att.puesto}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {asistenciasCat.map((a) => {
                                                            const active = att.asistencia_id === a.id
                                                            return (
                                                                <button
                                                                    key={a.id}
                                                                    onClick={() => {
                                                                        const copy = [...repAttendance]
                                                                        copy[idx].asistencia_id = a.id
                                                                        copy[idx].codigo = a.codigo
                                                                        setRepAttendance(copy)
                                                                    }}
                                                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${
                                                                        active
                                                                            ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                                                                            : 'bg-slate-900 text-slate-400 border-slate-800'
                                                                    }`}
                                                                >
                                                                    {a.nombre}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => setWizardStep(3)}
                                            className="w-full py-3 bg-amber-500 text-slate-950 rounded-xl text-xs font-black uppercase"
                                        >
                                            Siguiente: Capturar Scoop y Avances →
                                        </button>
                                    </div>
                                )}

                                {wizardStep === 3 && (
                                    <div className="space-y-3">
                                        <div className="text-xs font-black text-amber-500 uppercase">
                                            Paso 3: Avances de Scooptram y Perforación
                                        </div>
                                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2.5">
                                            <select
                                                value={actProdId}
                                                onChange={(e) => setActProdId(e.target.value)}
                                                className="w-full rounded-xl px-3 py-2 text-xs font-bold"
                                            >
                                                {productos.map((p) => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.nombre} ({p.unidad_medida_default})
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="flex gap-2">
                                                <select
                                                    value={actLocId}
                                                    onChange={(e) => setActLocId(e.target.value)}
                                                    className="flex-1 rounded-xl px-3 py-2 text-xs font-bold"
                                                >
                                                    {ubicaciones.map((u) => (
                                                        <option key={u.id} value={u.id}>
                                                            {u.nombre}
                                                        </option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="number"
                                                    value={actQty}
                                                    onChange={(e) => setActQty(e.target.value)}
                                                    placeholder="Cantidad"
                                                    className="w-28 rounded-xl px-3 py-2 text-xs font-bold"
                                                />
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const val = parseFloat(actQty)
                                                    if (!val || val <= 0) {
                                                        toast.error('Ingresa una cantidad mayor a 0')
                                                        return
                                                    }
                                                    const pObj = productos.find((p) => p.id === actProdId)
                                                    const lObj = ubicaciones.find((l) => l.id === actLocId)
                                                    setRepActivities([
                                                        ...repActivities,
                                                        {
                                                            temp_id: 'act-' + Date.now(),
                                                            producto_id: actProdId,
                                                            producto_nombre: pObj?.nombre || 'Concepto',
                                                            unidad: pObj?.unidad_medida_default || 'und',
                                                            location_id: actLocId,
                                                            location_nombre: lObj?.nombre || 'Frente',
                                                            equipo_id: actEquipId || null,
                                                            cantidad_total: val,
                                                        },
                                                    ])
                                                    setActQty('')
                                                }}
                                                className="w-full py-2 bg-emerald-500 text-slate-950 rounded-xl text-xs font-black uppercase"
                                            >
                                                + Añadir Avance a la Lista
                                            </button>
                                        </div>

                                        {repActivities.map((act) => (
                                            <div
                                                key={act.temp_id}
                                                className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between"
                                            >
                                                <div>
                                                    <div className="text-xs font-black text-white">
                                                        {act.producto_nombre}{' '}
                                                        <span className="text-amber-500">
                                                            ({act.cantidad_total} {act.unidad})
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">
                                                        Frente: {act.location_nombre}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() =>
                                                        setRepActivities(
                                                            repActivities.filter(
                                                                (a) => a.temp_id !== act.temp_id
                                                            )
                                                        )
                                                    }
                                                    className="p-1.5 text-rose-400"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        ))}

                                        <button
                                            onClick={() => setWizardStep(4)}
                                            className="w-full py-3 bg-amber-500 text-slate-950 rounded-xl text-xs font-black uppercase"
                                        >
                                            Siguiente: Seguridad y Envío →
                                        </button>
                                    </div>
                                )}

                                {wizardStep === 4 && (
                                    <div className="space-y-3">
                                        <div className="text-xs font-black text-amber-500 uppercase">
                                            Paso 4: Observaciones y Eventos de Seguridad
                                        </div>
                                        <textarea
                                            value={repComments}
                                            onChange={(e) => setRepComments(e.target.value)}
                                            placeholder="Observaciones del turno (ej. Scoop ST-50 operando al 100%)..."
                                            rows={3}
                                            className="w-full rounded-xl p-3 text-xs font-bold"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => setRepHasIncident(!repHasIncident)}
                                            className={`w-full p-3 rounded-xl border text-left text-xs font-black flex items-center gap-2 ${
                                                repHasIncident
                                                    ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                                                    : 'bg-slate-950 border-slate-800 text-slate-300'
                                            }`}
                                        >
                                            <ShieldAlert size={16} className="text-rose-500 shrink-0" />
                                            <span>
                                                {repHasIncident
                                                    ? '🚨 Reportando Accidente / Personal Problemático'
                                                    : '¿Reportar Accidente, Condición Insegura o Personal Problemático?'}
                                            </span>
                                        </button>

                                        {repHasIncident && (
                                            <div className="space-y-2 bg-rose-950/20 border border-rose-500/40 rounded-xl p-3">
                                                <select
                                                    value={repIncTipo}
                                                    onChange={(e) =>
                                                        setRepIncTipo(e.target.value as any)
                                                    }
                                                    className="w-full rounded-xl px-3 py-2 text-xs font-bold"
                                                >
                                                    <option value="CONDICION_INSEGURA">
                                                        ⚠️ Condición / Acto Inseguro
                                                    </option>
                                                    <option value="ACCIDENTE">
                                                        🚑 Accidente en Turno
                                                    </option>
                                                    <option value="PERSONAL_PROBLEMATICO">
                                                        👷 Personal Problemático / Indisciplina
                                                    </option>
                                                </select>
                                                <input
                                                    type="text"
                                                    value={repIncDesc}
                                                    onChange={(e) => setRepIncDesc(e.target.value)}
                                                    placeholder="Describe el incidente y personal involucrado..."
                                                    className="w-full rounded-xl px-3 py-2 text-xs font-bold"
                                                />
                                            </div>
                                        )}

                                        <button
                                            onClick={handleSubmitMobileReport}
                                            disabled={savingReport}
                                            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 shadow-lg"
                                        >
                                            <Save size={16} />
                                            {savingReport
                                                ? 'Subiendo a Supabase...'
                                                : 'SUBIR REPORTE OFICIAL A SUPABASE'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* =========================================================
                            PANTALLA 5: HISTORIAL Y APROBACIÓN DE REPORTES DIARIOS
                           ========================================================= */}
                        {activeScreen === 'REPORTS' && (
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <div className="text-xs font-black text-white">
                                        Reportes Diarios Semana 38 ({reports.length})
                                    </div>
                                    <button
                                        onClick={() => navigateToScreen('REPORT_NEW')}
                                        className="px-3 py-1.5 bg-amber-500 text-slate-950 rounded-xl text-xs font-black"
                                    >
                                        + Nuevo Reporte
                                    </button>
                                </div>

                                {reports.map((r: any) => {
                                    const st = r.status || r.estado || 'EN_REVISION'
                                    const turno = Array.isArray(r.turno) ? r.turno[0] : r.turno
                                    const cuad = Array.isArray(r.cuadrilla)
                                        ? r.cuadrilla[0]
                                        : r.cuadrilla
                                    return (
                                        <div
                                            key={r.id}
                                            className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-black text-white">
                                                    📅 {r.fecha} • {turno?.codigo || 'TURNO'}
                                                </span>
                                                <span
                                                    className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                                        st === 'APROBADO'
                                                            ? 'bg-emerald-500/20 text-emerald-400'
                                                            : 'bg-amber-500/20 text-amber-400'
                                                    }`}
                                                >
                                                    {st}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-300 font-bold">
                                                ⛏️ {cuad?.nombre || 'Cuadrilla'}
                                            </div>

                                            {canApproveReports && st !== 'APROBADO' && (
                                                <div className="flex gap-2 pt-2 border-t border-slate-800">
                                                    <button
                                                        onClick={() =>
                                                            handleReportApproval(r.id, 'APROBADO')
                                                        }
                                                        className="flex-1 py-1.5 bg-emerald-600 text-white rounded-lg text-[11px] font-black"
                                                    >
                                                        ✔ Aprobar
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            handleReportApproval(
                                                                r.id,
                                                                'CORRECCION_SOLICITADA'
                                                            )
                                                        }
                                                        className="flex-1 py-1.5 bg-rose-600 text-white rounded-lg text-[11px] font-black"
                                                    >
                                                        ✖ Pedir Corrección
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* =========================================================
                            PANTALLA 6: BITÁCORA, TAREAS Y ALERTAS DE SEGURIDAD
                           ========================================================= */}
                        {activeScreen === 'TASKS_SECURITY' && (
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setTasksSubTab('BITACORA')}
                                        className={`flex-1 py-2.5 rounded-xl text-xs font-black ${
                                            tasksSubTab === 'BITACORA'
                                                ? 'bg-amber-500 text-slate-950'
                                                : 'bg-slate-900 text-slate-400 border border-slate-800'
                                        }`}
                                    >
                                        📋 Bitácora y Tareas ({blogMessages.length})
                                    </button>
                                    <button
                                        onClick={() => setTasksSubTab('SEGURIDAD')}
                                        className={`flex-1 py-2.5 rounded-xl text-xs font-black ${
                                            tasksSubTab === 'SEGURIDAD'
                                                ? 'bg-rose-500 text-white'
                                                : 'bg-slate-900 text-slate-400 border border-slate-800'
                                        }`}
                                    >
                                        🚨 Accidentes / Disciplina ({securityIncidents.length})
                                    </button>
                                </div>

                                {tasksSubTab === 'BITACORA' ? (
                                    <>
                                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newBlogText}
                                                    onChange={(e) => setNewBlogText(e.target.value)}
                                                    placeholder="Escribe consigna o comentario de turno..."
                                                    className="flex-1 rounded-xl px-3 py-2 text-xs font-bold"
                                                />
                                                <button
                                                    onClick={handleSendBlogMsg}
                                                    className="px-3.5 bg-amber-500 text-slate-950 rounded-xl font-black flex items-center justify-center"
                                                >
                                                    <Send size={15} />
                                                </button>
                                            </div>
                                            {isJefaturaOrAbove && (
                                                <label className="flex items-center gap-2 text-[11px] font-bold text-amber-400 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={newBlogIsTask}
                                                        onChange={(e) =>
                                                            setNewBlogIsTask(e.target.checked)
                                                        }
                                                    />
                                                    Marcar como Tarea Oficial para el Turno
                                                </label>
                                            )}
                                        </div>

                                        {blogMessages.map((msg) => (
                                            <div
                                                key={msg.id}
                                                className={`rounded-2xl p-3.5 border ${
                                                    msg.is_task
                                                        ? 'bg-amber-500/10 border-amber-500/50'
                                                        : 'bg-slate-900 border-slate-800'
                                                }`}
                                            >
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[11px] font-black text-amber-400">
                                                        {msg.author?.nickname || 'Operaciones'}
                                                    </span>
                                                    {msg.is_task && (
                                                        <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[9px] font-black">
                                                            📌 TAREA
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs font-semibold text-white">
                                                    {msg.body}
                                                </p>

                                                {msg.is_task && (
                                                    <div className="mt-2.5 pt-2 border-t border-slate-800 flex gap-2">
                                                        {msg.task_status === 'PENDING' ? (
                                                            <>
                                                                <button
                                                                    onClick={() =>
                                                                        handleResolveTask(
                                                                            msg.id,
                                                                            'COMPLETED'
                                                                        )
                                                                    }
                                                                    className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-black"
                                                                >
                                                                    ✔ Marcar Cumplida
                                                                </button>
                                                                <button
                                                                    onClick={() =>
                                                                        handleResolveTask(
                                                                            msg.id,
                                                                            'REJECTED'
                                                                        )
                                                                    }
                                                                    className="px-3 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-black"
                                                                >
                                                                    ✖ Impedimento
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <span className="text-[10px] font-black text-emerald-400">
                                                                {msg.task_status === 'COMPLETED'
                                                                    ? '✔ Cumplida en Turno'
                                                                    : '✖ Impedimento Reportado'}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    <>
                                        <div className="bg-slate-900 border-2 border-rose-500/60 rounded-2xl p-3.5 space-y-2.5">
                                            <div className="text-xs font-black text-rose-400 uppercase">
                                                🚨 Registrar Accidente, Condición Insegura o Personal Problemático
                                            </div>
                                            <select
                                                value={secTipoForm}
                                                onChange={(e) =>
                                                    setSecTipoForm(e.target.value as any)
                                                }
                                                className="w-full rounded-xl px-3 py-2 text-xs font-bold"
                                            >
                                                <option value="CONDICION_INSEGURA">
                                                    ⚠️ Condición o Acto Inseguro
                                                </option>
                                                <option value="ACCIDENTE">
                                                    🚑 Accidente o Lesión en Mina
                                                </option>
                                                <option value="PERSONAL_PROBLEMATICO">
                                                    👷 Personal Problemático / Indisciplina
                                                </option>
                                            </select>
                                            <input
                                                type="text"
                                                value={secTargetForm}
                                                onChange={(e) => setSecTargetForm(e.target.value)}
                                                placeholder="Trabajador involucrado o frente (ej. Rebaje 13-480)"
                                                className="w-full rounded-xl px-3 py-2 text-xs font-bold"
                                            />
                                            <textarea
                                                value={secDescForm}
                                                onChange={(e) => setSecDescForm(e.target.value)}
                                                placeholder="Describe lo ocurrido y acciones tomadas..."
                                                rows={2}
                                                className="w-full rounded-xl p-3 text-xs font-bold"
                                            />
                                            <button
                                                onClick={handleSaveSecurityAlert}
                                                className="w-full py-2.5 bg-rose-600 text-white rounded-xl text-xs font-black uppercase shadow"
                                            >
                                                Subir Reporte de Seguridad a Supabase
                                            </button>
                                        </div>

                                        {securityIncidents.map((inc) => (
                                            <div
                                                key={inc.id}
                                                className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5"
                                            >
                                                <div className="flex justify-between text-[10px] font-black text-rose-400 mb-1">
                                                    <span>{inc.tipo}</span>
                                                    <span>{inc.fecha}</span>
                                                </div>
                                                <div className="text-xs font-black text-white">
                                                    Involucrado / Frente: {inc.involucrado}
                                                </div>
                                                <p className="text-xs text-slate-300 mt-1">
                                                    {inc.descripcion}
                                                </p>
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        )}

                        {/* =========================================================
                            PANTALLA 7: PRE-NÓMINA Y RAYA SEMANA 38 (SOLO JEFATURA+)
                           ========================================================= */}
                        {activeScreen === 'PAYROLL' && canViewFinancials && (
                            <div className="space-y-3">
                                <div className="bg-slate-900 border-2 border-amber-500 rounded-2xl p-4">
                                    <div className="text-[10px] font-black text-amber-500 uppercase">
                                        💰 CORTE PRE-NÓMINA SEMANA 38 (21-27 SEP 2026)
                                    </div>
                                    <div className="text-2xl font-black text-white mt-1">
                                        ${kpiSummary.payroll.toLocaleString('es-MX')} MXN
                                    </div>
                                    <div className="flex justify-between text-[11px] font-bold text-slate-300 mt-2">
                                        <span>
                                            Base + 7mo Día: $
                                            {kpiSummary.baseSemanal.toLocaleString('es-MX')}
                                        </span>
                                        <span className="text-emerald-400">
                                            Destajos: +$
                                            {kpiSummary.destajoTotal.toLocaleString('es-MX')}
                                        </span>
                                    </div>
                                </div>

                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar minero o puesto en la raya..."
                                    className="w-full rounded-xl px-3.5 py-2.5 text-xs font-bold"
                                />

                                <div className="space-y-2">
                                    {allEmployees
                                        .filter((e) =>
                                            e.fullName
                                                .toLowerCase()
                                                .includes(searchQuery.toLowerCase())
                                        )
                                        .slice(0, 40)
                                        .map((emp) => {
                                            const diario = Number(emp.sueldo_diario_base) || 450
                                            const semBase = Math.round(diario * 7)
                                            return (
                                                <div
                                                    key={emp.id}
                                                    className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between"
                                                >
                                                    <div>
                                                        <div className="text-xs font-black text-white">
                                                            {emp.fullName}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400">
                                                            {emp.puestoNombre} • Diario: ${diario}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs font-black text-emerald-400">
                                                            ${semBase.toLocaleString('es-MX')}
                                                        </div>
                                                        <div className="text-[9px] text-slate-400">
                                                            Base 7 días
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                </div>
                            </div>
                        )}

                        {/* =========================================================
                            PANTALLA 8 Y 9: PERSONAL Y CATÁLOGOS MAESTROS
                           ========================================================= */}
                        {(activeScreen === 'PERSONNEL' || activeScreen === 'CATALOGS') && (
                            <div className="space-y-2.5">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar en el catálogo..."
                                    className="w-full rounded-xl px-3.5 py-2.5 text-xs font-bold"
                                />
                                {activeScreen === 'PERSONNEL'
                                    ? allEmployees
                                          .filter((e) =>
                                              e.fullName
                                                  .toLowerCase()
                                                  .includes(searchQuery.toLowerCase())
                                          )
                                          .map((emp) => (
                                              <div
                                                  key={emp.id}
                                                  className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between"
                                              >
                                                  <div>
                                                      <div className="text-xs font-black text-white">
                                                          {emp.fullName}
                                                      </div>
                                                      <div className="text-[10px] text-slate-400">
                                                          {emp.employee_code} • {emp.puestoNombre}
                                                      </div>
                                                  </div>
                                                  <span
                                                      className={`px-2 py-0.5 rounded text-[9px] font-black ${emp.specialty.colorClass}`}
                                                  >
                                                      {emp.specialty.badge}
                                                  </span>
                                              </div>
                                          ))
                                    : productos.map((prod) => (
                                          <div
                                              key={prod.id}
                                              className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between"
                                          >
                                              <div>
                                                  <div className="text-xs font-black text-white">
                                                      {prod.nombre}
                                                  </div>
                                                  <div className="text-[10px] text-slate-400">
                                                      {prod.categoria} • Unidad:{' '}
                                                      {prod.unidad_medida_default}
                                                  </div>
                                              </div>
                                              <span className="text-xs font-black text-amber-500">
                                                  ${prod.tarifa_pago || 0}
                                              </span>
                                          </div>
                                      ))}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* BARRA INFERIOR DE NAVEGACIÓN ESTILO ANDROID NATIVO */}
            <nav className="h-16 bg-slate-900 border-t border-slate-800 fixed bottom-0 left-0 right-0 max-w-md mx-auto z-30 flex items-center justify-around px-2 shadow-2xl">
                {[
                    { id: 'HOME' as MobileScreenId, label: 'Mando', icon: LayoutDashboard },
                    { id: 'SQUADS' as MobileScreenId, label: 'Cuadrillas', icon: Users },
                    {
                        id: 'REPORT_NEW' as MobileScreenId,
                        label: 'Capturar',
                        icon: PlusCircle,
                        primary: true,
                    },
                    { id: 'PLANNING' as MobileScreenId, label: 'Metas S-38', icon: Calendar },
                    { id: 'TASKS_SECURITY' as MobileScreenId, label: 'Bitácora', icon: ShieldAlert },
                ].map((tab) => {
                    const isActive = activeScreen === tab.id
                    const IconComp = tab.icon
                    if (tab.primary) {
                        return (
                            <button
                                key={tab.id}
                                onClick={() => navigateToScreen(tab.id)}
                                className="flex flex-col items-center justify-center -mt-5"
                            >
                                <div className="w-12 h-12 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg border-2 border-white">
                                    <IconComp size={22} />
                                </div>
                                <span className="text-[10px] font-black text-amber-500 mt-0.5">
                                    {tab.label}
                                </span>
                            </button>
                        )
                    }
                    return (
                        <button
                            key={tab.id}
                            onClick={() => navigateToScreen(tab.id)}
                            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl ${
                                isActive
                                    ? 'text-amber-500 font-black'
                                    : 'text-slate-400 font-semibold'
                            }`}
                        >
                            <IconComp size={19} />
                            <span className="text-[10px] mt-0.5">{tab.label}</span>
                        </button>
                    )
                })}
            </nav>

            {/* MENÚ LATERAL DESPLEGABLE ANIMADO (SLIDE-OUT DRAWER) */}
            <AnimatePresence>
                {drawerOpen && (
                    <>
                        <motion.div
                            key="drawer-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setDrawerOpen(false)}
                            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-40"
                        />
                        <motion.aside
                            key="drawer-panel"
                            initial={{ x: -320 }}
                            animate={{ x: 0 }}
                            exit={{ x: -320 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                            className="fixed left-0 top-0 bottom-0 w-[300px] bg-slate-900 border-r border-slate-800 z-50 flex flex-col shadow-2xl"
                        >
                            <div className="p-4 border-b border-slate-800">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                                            <HardHat size={20} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-white">
                                                LA RAYA MINA
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase">
                                                App Android • Semana 38
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setDrawerOpen(false)}
                                        className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Selector de Jerarquía / Autorización en el Menú */}
                                <div className="bg-slate-950 border border-amber-500/40 rounded-xl p-2.5">
                                    <div className="text-[9px] font-black text-amber-400 uppercase mb-1">
                                        NIVEL DE AUTORIZACIÓN ACTIVO
                                    </div>
                                    <select
                                        value={activeRole}
                                        onChange={(e) => loginAsDemo(e.target.value)}
                                        className="w-full rounded-lg px-2 py-1.5 text-xs font-bold"
                                    >
                                        <option value="SUPER_ADMIN">👑 Super Admin (Total)</option>
                                        <option value="DIRECTOR_OPERATIVO">
                                            🏛️ Director Operativo (Finanzas)
                                        </option>
                                        <option value="GERENTE">
                                            ⭐ Gerente Operaciones (Jefatura)
                                        </option>
                                        <option value="SUPERINTENDENTE">
                                            ⛏️ Superintendente (Mueve Cuadrillas)
                                        </option>
                                        <option value="JEFE_PLANEACION">
                                            📐 Jefe Planeación (Metas S-38)
                                        </option>
                                        <option value="SUPERVISOR">
                                            📋 Supervisor (Reportes & Seguridad)
                                        </option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                                {menuSections.map((sec, idx) => (
                                    <div key={idx} className="space-y-1.5">
                                        <div className="flex items-center gap-1.5 px-2">
                                            <span className={`w-2 h-2 rounded-full ${sec.dot}`} />
                                            <span
                                                className={`text-[10px] font-black uppercase tracking-wider ${sec.color}`}
                                            >
                                                {sec.pillar}
                                            </span>
                                        </div>
                                        {sec.items.map((item) => {
                                            const isAct = activeScreen === item.id
                                            const locked = item.requiresJefatura && !isJefaturaOrAbove
                                            const IconComp = item.icon
                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() =>
                                                        navigateToScreen(
                                                            item.id,
                                                            item.requiresJefatura
                                                        )
                                                    }
                                                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                                                        isAct
                                                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                                                            : 'bg-slate-950/60 text-slate-200 border-slate-800/80'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <IconComp
                                                            size={17}
                                                            className={
                                                                isAct ? 'text-slate-950' : sec.color
                                                            }
                                                        />
                                                        <div className="min-w-0">
                                                            <div className="text-xs font-bold truncate">
                                                                {item.label}
                                                            </div>
                                                            <div
                                                                className={`text-[10px] truncate ${
                                                                    isAct
                                                                        ? 'text-slate-900'
                                                                        : 'text-slate-400'
                                                                }`}
                                                            >
                                                                {item.sub}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {locked ? (
                                                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[9px] font-black flex items-center gap-0.5 shrink-0">
                                                            <Lock size={9} /> Jefatura
                                                        </span>
                                                    ) : item.badge ? (
                                                        <span
                                                            className={`px-1.5 py-0.5 rounded text-[9px] font-black shrink-0 ${
                                                                isAct
                                                                    ? 'bg-slate-950 text-amber-400'
                                                                    : 'bg-slate-800 text-slate-300'
                                                            }`}
                                                        >
                                                            {item.badge}
                                                        </span>
                                                    ) : null}
                                                </button>
                                            )
                                        })}
                                    </div>
                                ))}
                            </div>

                            <div className="p-3 border-t border-slate-800 space-y-2">
                                <Link
                                    href="/dashboard"
                                    className="w-full py-2.5 px-3 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold flex items-center justify-center gap-2"
                                >
                                    <Monitor size={15} /> Ir a Vista Escritorio Completa
                                </Link>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* MODAL DE REASIGNACIÓN TÁCTICA DE CUADRILLA CON ANIMACIÓN */}
            <AnimatePresence>
                {selectedWorkerForTransfer && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-950/80 z-50 flex items-end justify-center p-3"
                    >
                        <motion.div
                            initial={{ y: 200 }}
                            animate={{ y: 0 }}
                            exit={{ y: 200 }}
                            className="w-full max-w-md bg-slate-900 border-2 border-emerald-500 rounded-3xl p-5 space-y-4"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <span
                                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-black mb-1 ${selectedWorkerForTransfer.specialty.colorClass}`}
                                    >
                                        {selectedWorkerForTransfer.specialty.badge}
                                    </span>
                                    <h3 className="text-base font-black text-white">
                                        {selectedWorkerForTransfer.fullName}
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        {selectedWorkerForTransfer.puestoNombre} • Código:{' '}
                                        {selectedWorkerForTransfer.employee_code}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedWorkerForTransfer(null)}
                                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {transferAnimationState?.active ? (
                                <motion.div
                                    initial={{ scale: 0.9 }}
                                    animate={{ scale: [0.95, 1.03, 0.98, 1] }}
                                    transition={{ repeat: Infinity, duration: 0.6 }}
                                    className="p-4 rounded-2xl bg-emerald-950 border-2 border-emerald-400 text-center space-y-1"
                                >
                                    <div className="text-sm font-black text-emerald-300">
                                        {transferAnimationState.text}
                                    </div>
                                    <div className="text-xs font-bold text-white">
                                        Destino: {transferAnimationState.target} • Sincronizando Supabase...
                                    </div>
                                </motion.div>
                            ) : canMoveSquads ? (
                                <>
                                    <div className="text-xs font-black text-amber-400 uppercase">
                                        Selecciona Cuadrilla Destino:
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {cuadrillas.map((sq) => (
                                            <button
                                                key={sq.id}
                                                onClick={() =>
                                                    handleTransferWorker(
                                                        selectedWorkerForTransfer,
                                                        sq.id
                                                    )
                                                }
                                                className="p-3 rounded-xl bg-emerald-950 border border-emerald-500 text-xs font-black text-white flex items-center gap-2"
                                            >
                                                <UserPlus size={15} className="text-emerald-400" />
                                                {sq.nombre}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() =>
                                            handleTransferWorker(selectedWorkerForTransfer, 'BENCH')
                                        }
                                        className="w-full p-3 rounded-xl bg-rose-500/20 border border-rose-500 text-rose-300 text-xs font-black flex items-center justify-center gap-2"
                                    >
                                        <UserMinus size={15} /> Enviar a Banca / Reserva
                                    </button>
                                </>
                            ) : (
                                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300 font-bold">
                                    🔒 Solo el Superintendente y el Gerente tienen autorización para mover personal entre cuadrillas.
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MODAL DE SELECCIÓN DE ROL / NIVEL DE AUTORIZACIÓN */}
            <AnimatePresence>
                {roleModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4"
                    >
                        <div className="w-full max-w-sm bg-slate-900 border-2 border-amber-500 rounded-3xl p-5 space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="text-base font-black text-white">
                                    Nivel de Autorización
                                </h3>
                                <button
                                    onClick={() => setRoleModalOpen(false)}
                                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <p className="text-xs text-slate-400">
                                Selecciona el puesto para adaptar inmediatamente los módulos y permisos en el celular:
                            </p>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {(Object.keys(ROLE_CONFIG) as RoleKey[]).map((rk) => {
                                    const cfg = ROLE_CONFIG[rk]
                                    const isCur = activeRole === rk
                                    return (
                                        <button
                                            key={rk}
                                            onClick={() => {
                                                loginAsDemo(rk)
                                                setRoleModalOpen(false)
                                                toast.success(`Perfil cambiado a ${cfg.shortLabel}`)
                                            }}
                                            className={`w-full p-3 rounded-xl border text-left transition-all ${
                                                isCur
                                                    ? 'bg-amber-500/20 border-amber-500'
                                                    : 'bg-slate-950 border-slate-800'
                                            }`}
                                        >
                                            <div className="text-xs font-black text-white">
                                                {cfg.label}
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">
                                                {cfg.description}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MODAL DE INSTALACIÓN DIRECTA EN ANDROID (SIN EXPO GO) */}
            <AnimatePresence>
                {installModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4"
                    >
                        <div className="w-full max-w-sm bg-slate-900 border-2 border-emerald-500 rounded-3xl p-5 space-y-3">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Smartphone size={20} className="text-emerald-400" />
                                    <h3 className="text-base font-black text-white">
                                        Instalar en Android (Sin Expo Go)
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setInstallModalOpen(false)}
                                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                Esta aplicación funciona con tecnología <strong>PWA Nativa vía GitHub + Vercel</strong>. No necesitas instalar Expo Go ni preocuparte por versiones SDK 54/58:
                            </p>
                            <ol className="text-xs text-slate-300 space-y-2 list-decimal pl-4 font-semibold">
                                <li>
                                    Abre el enlace de tu proyecto en <strong>Chrome en tu celular Android</strong> (ruta <code>/mobile</code>).
                                </li>
                                <li>
                                    Toca el menú de 3 puntos <strong>(⋮)</strong> arriba a la derecha en Chrome.
                                </li>
                                <li>
                                    Selecciona <strong>&ldquo;Instalar aplicación&rdquo;</strong> o <strong>&ldquo;Agregar a la pantalla principal&rdquo;</strong>.
                                </li>
                            </ol>
                            <button
                                onClick={() => setInstallModalOpen(false)}
                                className="w-full py-2.5 bg-emerald-500 text-slate-950 rounded-xl text-xs font-black uppercase"
                            >
                                ¡Entendido!
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
