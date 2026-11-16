'use client'

import React, { useState, useEffect, use } from 'react'
import { Calendar, Clock, MapPin, Users, ChevronRight, FileText, CheckCircle, AlertCircle, Plus, Trash2, X, Save, ArrowLeft, Activity, Package, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import {
    pushNotification,
    getReportCreatorMeta,
    appendReportRevision,
    getSquadSupervisorsMeta,
    ReportCreatorMeta
} from '@/lib/notifications-service'
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
    estado_codigo: string
    estado_color: string
    observacion: string
}

type ActivityItem = {
    temp_id: string
    id?: string // Real ID from DB if existing
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

export default function EditDailyReportPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { user, permissions, sysRole, fullName } = useAuth()
    const [reviewApproveMode, setReviewApproveMode] = useState(false)
    const [correctionNote, setCorrectionNote] = useState('')
    const [creatorMeta, setCreatorMeta] = useState<ReportCreatorMeta | null>(null)
    const [originalSnapshot, setOriginalSnapshot] = useState<any>(null)

    const canReviewApprove = [
        'JEFE_PLANEACION',
        'GERENTE',
        'SUPERINTENDENTE',
        'DIRECTOR_OPERATIVO',
        'SUPER_ADMIN'
    ].includes(sysRole || '') || Boolean(permissions?.can_approve_reports && sysRole !== 'JEFE_MINA')

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const sp = new URLSearchParams(window.location.search)
            if (sp.get('reviewApprove') === '1') {
                setReviewApproveMode(true)
            }
        }
    }, [])
    const router = useRouter()
    const isReadOnly = sysRole === 'LECTURA'

    useEffect(() => {
        if (isReadOnly) {
            router.replace('/dashboard/operacion/reportes-diarios')
        }
    }, [isReadOnly, router])

    const [currentStep, setCurrentStep] = useState<WizardStep>('HEADER')
    const [loading, setLoading] = useState(false)
    const [initialLoading, setInitialLoading] = useState(true)
    const [isLocked, setIsLocked] = useState(false)
    const [unlockPassword, setUnlockPassword] = useState('')

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
    const [fecha, setFecha] = useState('')
    const [selectedTurno, setSelectedTurno] = useState('')
    const [selectedCuadrilla, setSelectedCuadrilla] = useState('')
    const [selectedMina, setSelectedMina] = useState('')
    const [supervisorComments, setSupervisorComments] = useState('')

    // Form Data
    const [attendanceList, setAttendanceList] = useState<AttendanceItem[]>([])
    const [activities, setActivities] = useState<ActivityItem[]>([])

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalCategory, setModalCategory] = useState('')
    const [currentActivity, setCurrentActivity] = useState<Partial<ActivityItem>>({})
    const [selectedProductVariables, setSelectedProductVariables] = useState<any[]>([])

    // Split Rules State
    const [roleSplits, setRoleSplits] = useState<any[]>([])
    const [applySplits, setApplySplits] = useState(true)

    // --- EFFECT: LOAD CATALOGS & DATA ---
    useEffect(() => {
        const init = async () => {
            setInitialLoading(true)
            await loadCatalogs()
            await loadExistingReport()
            setInitialLoading(false)
        }
        init()
    }, [id])

    const loadCatalogs = async () => {
        const [dTurnos, dCuadrillas, dMinas, dAsistencias, dRoles, dProds, dEquips, dSplits] = await Promise.all([
            supabase.from('cat_turnos').select('*').eq('activo', true).order('codigo'),
            supabase.from('cat_cuadrillas').select('*').eq('activo', true).order('nombre'),
            supabase.from('mine_sites').select('*'),
            supabase.from('cat_asistencias').select('*').eq('activo', true),
            supabase.from('cat_roles_operativos').select('*').order('nombre'),
            supabase.from('cat_productos_mina').select('*, cat_producto_variables(*)').eq('activo', true).order('nombre'),
            supabase.from('ops_equipment').select('*').eq('status', 'DISPONIBLE').order('clave'),
            supabase.from('cat_role_splits').select('*')
        ])

        if (dTurnos.data) setTurnos(dTurnos.data)
        if (dCuadrillas.data) setCuadrillas(dCuadrillas.data)
        if (dMinas.data) setMinas(dMinas.data)
        if (dAsistencias.data) setAsistenciasCatalog(dAsistencias.data)
        if (dRoles.data) setRolesOperativos(dRoles.data)
        if (dProds.data) setProducts(dProds.data)
        if (dEquips.data) setEquipments(dEquips.data)
        if (dSplits.data) setRoleSplits(dSplits.data)
    }

    const loadExistingReport = async () => {
        const { data, error } = await supabase
            .from('ops_daily_reports')
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
            .eq('id', id)
            .single()

        if (error || !data) {
            toast.error('No se pudo cargar el reporte')
            return
        }

        if (data.status === 'APROBADO' || data.estado === 'APROBADO') {
            setIsLocked(true)
        }

        // Map Header
        setFecha(data.fecha)
        setSelectedTurno(data.turno_id)
        setSelectedCuadrilla(data.cuadrilla_id)
        setSelectedMina(data.mine_site_id)
        setSupervisorComments(data.comentarios_supervisor || data.observaciones_generales || '')

        // Map Attendance
        const attList: AttendanceItem[] = (data.ops_daily_attendance || []).map((a: any) => ({
            empleado_id: a.empleado_id,
            nombre: `${a.rh_employees?.first_name || ''} ${a.rh_employees?.last_name || ''}`,
            codigo_empleado: a.rh_employees?.employee_code || '-',
            rol_default_id: a.rol_asignado_id || a.rol_dia_id || a.rh_employees?.role_id,
            rol_nombre_default: a.rh_employees?.cat_roles_operativos?.nombre || 'Operativo',
            rol_dia_id: a.rol_asignado_id || a.rol_dia_id || a.rh_employees?.role_id,
            asistencia_id: a.asistencia_tipo_id || a.asistencia_id,
            estado_codigo: a.cat_asistencias?.codigo || 'ASISTENCIA',
            estado_color: a.cat_asistencias?.color || '#10b981',
            observacion: a.observaciones || a.observacion || ''
        }))
        setAttendanceList(attList)

        // Map Activities
        const actList: ActivityItem[] = (data.ops_report_items || []).map((i: any) => ({
            temp_id: i.id,
            id: i.id,
            producto_id: i.producto_id,
            producto_nombre: i.cat_productos_mina?.nombre || 'Actividad',
            unidad: i.cat_productos_mina?.unidad_medida_default || 'und',
            equipo_id: i.equipo_id,
            equipo_nombre: i.ops_equipment?.clave,
            location_id: i.location_id,
            location_nombre: `${i.mine_locations?.codigo || ''} - ${i.mine_locations?.nombre || ''}`,
            cantidad_total: i.cantidad_total,
            variables: i.variables_capturadas || i.variables_json || {},
            participantes: (i.ops_report_personnel || []).map((p: any) => p.empleado_id)
        }))
        setActivities(actList)

        setOriginalSnapshot({
            fecha: data.fecha,
            turno_id: data.turno_id,
            cuadrilla_id: data.cuadrilla_id,
            mine_site_id: data.mine_site_id,
            observaciones: data.comentarios_supervisor || data.observaciones_generales || '',
            attendance: attList.map(a => ({
                empleado_id: a.empleado_id,
                nombre: a.nombre,
                estado_codigo: a.estado_codigo
            })),
            activities: actList.map(a => ({
                temp_id: a.temp_id,
                producto_nombre: a.producto_nombre,
                cantidad_total: Number(a.cantidad_total),
                unidad: a.unidad,
                location_id: a.location_id,
                location_nombre: a.location_nombre,
                equipo_id: a.equipo_id,
                equipo_nombre: a.equipo_nombre
            }))
        })

        const cMeta = await getReportCreatorMeta(id as string)
        setCreatorMeta(cMeta)
    }

    // Load locations when mine site changes
    useEffect(() => {
        if (!selectedMina) return
        const loadLocs = async () => {
            const { data } = await supabase.from('mine_locations').select('*').eq('mine_site_id', selectedMina)
            if (data) setUbicaciones(data)
        }
        loadLocs()
    }, [selectedMina])

    // --- HANDLERS ---
    const handleNext = () => {
        if (currentStep === 'HEADER') {
            if (!fecha || !selectedTurno || !selectedCuadrilla) return alert('Completa el encabezado')
            setCurrentStep('ATTENDANCE')
            return
        }
        if (currentStep === 'ATTENDANCE') {
            setCurrentStep('ACTIVITIES')
            return
        }
        if (currentStep === 'ACTIVITIES') {
            setCurrentStep('SUMMARY')
            return
        }
    }

    const computeReportChanges = (): string[] => {
        if (!originalSnapshot) return []
        const changes: string[] = []

        if (originalSnapshot.fecha !== fecha) {
            changes.push(`Fecha modificada: ${originalSnapshot.fecha} → ${fecha}`)
        }
        if (originalSnapshot.turno_id !== selectedTurno) {
            const oldT = turnos.find(t => t.id === originalSnapshot.turno_id)?.nombre || originalSnapshot.turno_id
            const newT = turnos.find(t => t.id === selectedTurno)?.nombre || selectedTurno
            changes.push(`Turno modificado: ${oldT} → ${newT}`)
        }
        if (originalSnapshot.cuadrilla_id !== selectedCuadrilla) {
            const oldC = cuadrillas.find(c => c.id === originalSnapshot.cuadrilla_id)?.nombre || originalSnapshot.cuadrilla_id
            const newC = cuadrillas.find(c => c.id === selectedCuadrilla)?.nombre || selectedCuadrilla
            changes.push(`Cuadrilla modificada: ${oldC} → ${newC}`)
        }
        if (originalSnapshot.mine_site_id !== selectedMina) {
            const oldM = minas.find(m => m.id === originalSnapshot.mine_site_id)?.nombre_mina || originalSnapshot.mine_site_id
            const newM = minas.find(m => m.id === selectedMina)?.nombre_mina || selectedMina
            changes.push(`Mina / Sitio modificado: ${oldM} → ${newM}`)
        }
        if ((originalSnapshot.observaciones || '').trim() !== (supervisorComments || '').trim()) {
            changes.push('Comentarios generales del turno actualizados.')
        }

        const origAttMap = new Map<string, any>(
            (originalSnapshot.attendance || []).map((a: any) => [a.empleado_id, a])
        )
        attendanceList.forEach(a => {
            const prev = origAttMap.get(a.empleado_id)
            if (prev && prev.estado_codigo !== a.estado_codigo) {
                changes.push(`Asistencia de ${a.nombre.trim()}: ${prev.estado_codigo} → ${a.estado_codigo}`)
            }
        })

        const origActs = originalSnapshot.activities || []
        const origMap = new Map<string, any>(origActs.map((a: any) => [a.temp_id, a]))
        const currMap = new Map<string, ActivityItem>(activities.map(a => [a.temp_id, a]))

        activities.forEach(act => {
            const prev = origMap.get(act.temp_id)
            if (!prev) {
                changes.push(`Actividad agregada: ${act.producto_nombre} (${act.cantidad_total} ${act.unidad})`)
            } else {
                if (Number(prev.cantidad_total) !== Number(act.cantidad_total)) {
                    changes.push(`Cantidad en "${act.producto_nombre}": ${prev.cantidad_total} → ${act.cantidad_total} ${act.unidad}`)
                }
                if (prev.location_id !== act.location_id) {
                    changes.push(`Frente en "${act.producto_nombre}": ${prev.location_nombre || '-'} → ${act.location_nombre || '-'}`)
                }
                if ((prev.equipo_id || '') !== (act.equipo_id || '')) {
                    changes.push(`Equipo en "${act.producto_nombre}": ${prev.equipo_nombre || 'Ninguno'} → ${act.equipo_nombre || 'Ninguno'}`)
                }
            }
        })

        origActs.forEach((prev: any) => {
            if (!currMap.has(prev.temp_id)) {
                changes.push(`Actividad eliminada: ${prev.producto_nombre} (${prev.cantidad_total} ${prev.unidad})`)
            }
        })

        return changes
    }

    const handleSaveReport = async (approveAfterSave: boolean = false) => {
        setLoading(true)
        try {
            const targetStatus = approveAfterSave ? 'APROBADO' : 'EN_REVISION'
            // 1. Update Header
            const { error: errH } = await supabase
                .from('ops_daily_reports')
                .update({
                    fecha,
                    estado: targetStatus,
                    status: targetStatus,
                    turno_id: selectedTurno,
                    cuadrilla_id: selectedCuadrilla,
                    mine_site_id: selectedMina,
                    observaciones_generales: supervisorComments
                })
                .eq('id', id)
            if (errH) throw errH

            // 2. Clear & Update Attendance (Re-insert is simpler for many-to-many)
            await supabase.from('ops_daily_attendance').delete().eq('report_id', id)
            const attPayload = attendanceList.map(a => ({
                report_id: id,
                empleado_id: a.empleado_id,
                asistencia_tipo_id: a.asistencia_id,
                rol_asignado_id: a.rol_dia_id,
                observaciones: a.observacion
            }))
            await supabase.from('ops_daily_attendance').insert(attPayload)

            // 3. Clear & Update Items (Cascades to personnel split in DB if configured, otherwise manual)
            // Note: ops_report_personnel usually has ON DELETE CASCADE on item_id
            await supabase.from('ops_report_items').delete().eq('report_id', id)

            for (const act of activities) {
                const { data: item, error: errI } = await supabase
                    .from('ops_report_items')
                    .insert({
                        report_id: id,
                        producto_id: act.producto_id,
                        equipo_id: act.equipo_id || null,
                        location_id: act.location_id,
                        cantidad_total: act.cantidad_total,
                        variables_capturadas: act.variables
                    })
                    .select('id')
                    .single()

                if (errI) throw errI

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
                    await supabase.from('ops_report_personnel').insert(personnelPayload)
                }
            }

            const changesList = computeReportChanges()
            const effectiveChanges = changesList.length > 0
                ? changesList
                : (correctionNote.trim() ? [`Nota de revisión: ${correctionNote.trim()}`] : ['Revisión validada y aprobada sin cambios adicionales en cantidades.'])
            const reviewerName = fullName || user?.email || sysRole || 'Revisión Operativa'
            const cuadName = cuadrillas.find(c => c.id === selectedCuadrilla)?.nombre || 'Cuadrilla'

            if (approveAfterSave || (canReviewApprove && changesList.length > 0)) {
                await appendReportRevision(id as string, {
                    edited_by_name: reviewerName,
                    edited_by_email: user?.email || null,
                    edited_by_role: sysRole || null,
                    approved_with_changes: approveAfterSave && changesList.length > 0,
                    changes: effectiveChanges,
                    note: correctionNote.trim() || undefined
                })

                const metaMap = await getSquadSupervisorsMeta()
                const sqMeta = metaMap[selectedCuadrilla]
                const targetEmails = [
                    creatorMeta?.creator_email,
                    creatorMeta?.supervisor_user_email,
                    sqMeta?.supervisor_user_email
                ].filter(Boolean) as string[]

                await pushNotification({
                    type: approveAfterSave ? (changesList.length > 0 ? 'REPORT_CORRECTED' : 'REPORT_APPROVED') : 'REPORT_CORRECTED',
                    title: approveAfterSave
                        ? (changesList.length > 0 ? `Reporte ${fecha} Corregido y Aprobado` : `Reporte ${fecha} Aprobado`)
                        : `Cambios Realizados en Reporte (${fecha})`,
                    message: approveAfterSave
                        ? `${reviewerName} (${(sysRole || 'REVISIÓN').replace(/_/g, ' ')}) ${changesList.length > 0 ? 'ajustó datos y aprobó' : 'aprobó'} el reporte de ${cuadName}.${correctionNote.trim() ? ` Nota: ${correctionNote.trim()}` : ''}`
                        : `${reviewerName} modificó datos del reporte de ${cuadName}.`,
                    details: effectiveChanges,
                    target_user_ids: creatorMeta?.creator_user_id ? [creatorMeta.creator_user_id] : undefined,
                    target_user_emails: targetEmails,
                    target_employee_id: creatorMeta?.supervisor_employee_id || sqMeta?.supervisor_employee_id || null,
                    target_employee_name: creatorMeta?.supervisor_name || sqMeta?.supervisor_employee_name || null,
                    created_by_name: reviewerName,
                    created_by_email: user?.email || null,
                    link: `/dashboard/operacion/reportes-diarios/${id}`
                })
            }

            toast.success(
                approveAfterSave
                    ? 'Reporte corregido, aprobado y notificado al supervisor'
                    : 'Reporte actualizado correctamente'
            )
            window.location.href = `/dashboard/operacion/reportes-diarios/${id}`

        } catch (error: any) {
            console.error(error)
            toast.error('Error al actualizar: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    // Reuse UI logic from nuevo/page.tsx (omitted for brevity in this draft, but I'll write the full version)
    // I'll skip the Modal render here if it's identical, but I need a working page.
    // Full implementation below.

    const updateAttendance = (index: number, field: keyof AttendanceItem, value: any) => {
        const newList = [...attendanceList]
        // @ts-ignore
        newList[index][field] = value
        setAttendanceList(newList)
    }

    const handleAddActivity = (categoria: string) => {
        setModalCategory(categoria)
        setCurrentActivity({
            temp_id: Math.random().toString(36).substr(2, 9),
            variables: {},
            participantes: attendanceList.filter(a => a.estado_codigo === 'ASISTENCIA').map(a => a.empleado_id)
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
        if (!currentActivity.producto_id || !currentActivity.location_id || !currentActivity.cantidad_total) return alert('Faltan datos')
        setActivities([...activities, currentActivity as ActivityItem])
        setIsModalOpen(false)
    }

    const handleUnlock = async () => {
        if (!unlockPassword) return toast.error('Ingresa tu contraseña')
        if (user?.email) {
            const { error } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: unlockPassword
            })
            if (!error) {
                setIsLocked(false)
                toast.success('Edición desbloqueada')
                return
            }
        }
        toast.error('Contraseña incorrecta')
    }

    if (initialLoading) return <div className="p-12 text-center text-amber-500 animate-pulse font-bold">Cargando datos del reporte...</div>

    if (isLocked) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-6">
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full text-center space-y-6 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <Lock size={120} />
                    </div>
                    <div className="w-16 h-16 bg-amber-500/10 rounded-full flex flex-col items-center justify-center mx-auto text-amber-500 border border-amber-500/20">
                        <Lock size={32} />
                    </div>
                    <div className="relative z-10">
                        <h2 className="text-xl font-bold text-white mb-2">Reporte Cerrado</h2>
                        <p className="text-slate-400 text-sm mb-6">Este reporte ya fue aprobado y cerrado. Para modificarlo, necesitas permisos especiales y confirmar tu contraseña de autorización.</p>

                        {!permissions?.can_edit_approved ? (
                            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm font-medium">
                                No tienes permisos suficientes para editar reportes cerrados.
                            </div>
                        ) : (
                            <div className="space-y-4 text-left">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Contraseña de Autorización</label>
                                    <input
                                        type="password"
                                        value={unlockPassword}
                                        onChange={(e) => setUnlockPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                                    />
                                </div>
                                <button
                                    onClick={handleUnlock}
                                    className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-amber-900/20"
                                >
                                    Desbloquear Edición
                                </button>
                            </div>
                        )}

                        <div className="mt-6">
                            <Link href={`/dashboard/operacion/reportes-diarios/${id}`} className="inline-block text-slate-500 hover:text-white text-sm font-medium transition-colors">
                                Volver al Detalle
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-2 sm:p-4 max-w-full w-full min-w-0 mx-auto">
            {/* VOLVER */}
            <div className="mb-6">
                <Link href={`/dashboard/operacion/reportes-diarios/${id}`} className="text-slate-400 hover:text-white flex items-center gap-1 text-sm">
                    <ArrowLeft size={16} /> Volver al Detalle
                </Link>
            </div>

            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">
                        {reviewApproveMode ? 'Revisión, Corrección y Aprobación de Reporte' : 'Editar Reporte de Operación'}
                    </h1>
                    <p className="text-slate-400 text-sm">
                        {reviewApproveMode
                            ? 'Ajusta los datos que no cuadren y pulsa "Guardar Correcciones y Aprobar". Quien envió el reporte recibirá todos los cambios.'
                            : 'Modifica los datos capturados previamente.'}
                    </p>
                </div>
                {/* WIZARD INDICATOR CLICKABLE */}
                <div className="flex flex-wrap gap-1.5">
                    {[
                        { id: 'HEADER', label: '1. Encabezado' },
                        { id: 'ATTENDANCE', label: '2. Asistencia' },
                        { id: 'ACTIVITIES', label: '3. Actividades' },
                        { id: 'SUMMARY', label: '4. Cierre/Aprobar' }
                    ].map(step => (
                        <button
                            key={step.id}
                            type="button"
                            onClick={() => setCurrentStep(step.id as WizardStep)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                currentStep === step.id
                                    ? 'bg-amber-500 text-slate-950 border-amber-500'
                                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                            }`}
                        >
                            {step.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <FileText size={120} />
                </div>

                {/* STEP 1: HEADER */}
                {currentStep === 'HEADER' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs uppercase font-black text-slate-500 tracking-widest">Fecha Operativa</label>
                                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-500 outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs uppercase font-black text-slate-500 tracking-widest">Turno</label>
                                <select value={selectedTurno} onChange={e => setSelectedTurno(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-500 outline-none">
                                    <option value="">Seleccione...</option>
                                    {turnos.map(t => <option key={t.id} value={t.id}>{t.codigo} - {t.nombre}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs uppercase font-black text-slate-500 tracking-widest">Cuadrilla Responsable</label>
                                <select value={selectedCuadrilla} onChange={e => setSelectedCuadrilla(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-500 outline-none">
                                    <option value="">Seleccione...</option>
                                    {cuadrillas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs uppercase font-black text-slate-500 tracking-widest">Sitio / Mina</label>
                                <select value={selectedMina} onChange={e => setSelectedMina(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-500 outline-none">
                                    <option value="">Seleccione...</option>
                                    {minas.map(m => <option key={m.id} value={m.id}>{m.nombre_mina}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end pt-4">
                            <button onClick={handleNext} className="bg-amber-600 hover:bg-amber-500 transition-all text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 group shadow-lg shadow-amber-900/20">
                                Siguiente Paso <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: ATTENDANCE */}
                {currentStep === 'ATTENDANCE' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
                            <h3 className="font-bold text-white flex items-center gap-2"><Users className="text-amber-500" /> Registro de Asistencia del Turno</h3>
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-slate-800 shadow-inner">
                            <table className="w-full text-left">
                                <thead className="bg-slate-950 text-[10px] text-slate-500 uppercase font-black tracking-widest">
                                    <tr>
                                        <th className="p-4">Personal</th>
                                        <th className="p-4">Estatus Asistencia</th>
                                        <th className="p-4">Rol en Turno</th>
                                        <th className="p-4">Observación</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-slate-800 bg-slate-900/40">
                                    {attendanceList.map((item, idx) => (
                                        <tr key={item.empleado_id} className="hover:bg-slate-800/20 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-slate-200">{item.nombre}</div>
                                                <div className="text-[10px] text-slate-500">{item.rol_nombre_default}</div>
                                            </td>
                                            <td className="p-4">
                                                <select
                                                    value={item.asistencia_id}
                                                    onChange={e => {
                                                        const asis = asistenciasCatalog.find(a => a.id === e.target.value)
                                                        if (asis) {
                                                            updateAttendance(idx, 'asistencia_id', asis.id)
                                                            updateAttendance(idx, 'estado_codigo', asis.codigo)
                                                            updateAttendance(idx, 'estado_color', asis.color)
                                                        }
                                                    }}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                                                >
                                                    {asistenciasCatalog.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                                                </select>
                                            </td>
                                            <td className="p-4">
                                                <select
                                                    value={item.rol_dia_id}
                                                    onChange={e => updateAttendance(idx, 'rol_dia_id', e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-300"
                                                    disabled={item.estado_codigo !== 'ASISTENCIA'}
                                                >
                                                    {rolesOperativos.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                                </select>
                                            </td>
                                            <td className="p-4">
                                                <input
                                                    type="text"
                                                    value={item.observacion}
                                                    onChange={e => updateAttendance(idx, 'observacion', e.target.value)}
                                                    className="w-full bg-black/20 border border-slate-800 rounded-lg p-2 text-xs text-slate-400 focus:border-amber-500/50 outline-none"
                                                    placeholder="Ej: Llegó tarde..."
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-between pt-4">
                            <button onClick={() => setCurrentStep('HEADER')} className="text-slate-500 hover:text-white font-bold transition-colors">← Anterior</button>
                            <button onClick={handleNext} className="bg-amber-600 hover:bg-amber-500 transition-all text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 group shadow-lg shadow-amber-900/20">
                                Siguiente Paso <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: ACTIVITIES */}
                {currentStep === 'ACTIVITIES' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex justify-end mb-2">
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
                        <div className="flex flex-wrap gap-4">
                            <button onClick={() => handleAddActivity('PERFORACION')} className="flex-1 min-w-[150px] p-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl transition-all group border-b-2 border-b-amber-500">
                                <FileText className="text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
                                <div className="font-bold text-slate-200">Perforación</div>
                                <div className="text-[10px] text-slate-500">Pies, Brocas, Aceros</div>
                            </button>
                            <button onClick={() => handleAddActivity('FLETE')} className="flex-1 min-w-[150px] p-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl transition-all group border-b-2 border-b-blue-500">
                                <Clock className="text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                                <div className="font-bold text-slate-200">Flete / Acarreo</div>
                                <div className="text-[10px] text-slate-500">Viajes, Toneladas</div>
                            </button>
                            <button onClick={() => handleAddActivity('SERVICIOS_OBRA_CIVIL')} className="flex-1 min-w-[150px] p-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl transition-all group border-b-2 border-b-emerald-500">
                                <Users className="text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
                                <div className="font-bold text-slate-200">Servicios</div>
                                <div className="text-[10px] text-slate-500">Ademe, Tubería, Otros</div>
                            </button>
                        </div>

                        <div className="space-y-4">
                            {activities.map(act => (
                                <div key={act.temp_id} className="bg-slate-800/40 border border-slate-700 p-5 rounded-2xl flex justify-between items-center hover:border-slate-500 transition-all group">
                                    <div>
                                        <div className="font-black text-white text-lg flex items-center gap-3">
                                            {act.producto_nombre}
                                            <span className="text-amber-500 text-2xl">{act.cantidad_total} <span className="text-xs font-normal text-slate-500 uppercase tracking-widest">{act.unidad}</span></span>
                                        </div>
                                        <div className="flex gap-4 mt-2">
                                            <div className="text-[10px] text-slate-400 flex items-center gap-1 uppercase font-bold tracking-tighter"><MapPin size={10} className="text-emerald-500" /> {act.location_nombre}</div>
                                            {act.equipo_nombre && <div className="text-[10px] text-slate-400 flex items-center gap-1 uppercase font-bold tracking-tighter"><Activity size={10} className="text-blue-500" /> {act.equipo_nombre}</div>}
                                        </div>
                                    </div>
                                    <button onClick={() => setActivities(activities.filter(a => a.temp_id !== act.temp_id))} className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white p-3 rounded-full transition-all">
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            ))}
                            {activities.length === 0 && (
                                <div className="p-12 border-2 border-dashed border-slate-800 rounded-3xl text-center text-slate-600 font-bold italic">
                                    No se han agregado actividades aún. Selecciona una categoría arriba.
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between pt-8 border-t border-slate-800">
                            <button onClick={() => setCurrentStep('ATTENDANCE')} className="text-slate-500 hover:text-white font-bold transition-colors">← Anterior</button>
                            <button onClick={handleNext} className="bg-amber-600 hover:bg-amber-500 transition-all text-white px-10 py-3 rounded-xl font-black flex items-center gap-3 group shadow-xl shadow-amber-900/40">
                                Revisar Resumen <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 4: SUMMARY */}
                {currentStep === 'SUMMARY' && (
                    <div className="space-y-8 animate-in zoom-in-95 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                                <h4 className="text-amber-500 font-black uppercase text-xs tracking-[0.3em] mb-4">Comentarios de Supervisión</h4>
                                <textarea
                                    value={supervisorComments}
                                    onChange={e => setSupervisorComments(e.target.value)}
                                    className="w-full h-40 bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-200 focus:border-amber-500 outline-none transition-all placeholder:text-slate-600 shadow-inner"
                                    placeholder="Ingrese cualquier incidencia, nota o comentario relevante del turno..."
                                />
                            </div>
                            <div className="bg-black/20 p-6 rounded-2xl border border-slate-800/50 flex flex-col justify-center text-center">
                                <div className="mb-6">
                                    <div className="text-5xl font-black text-white mb-2">{activities.length}</div>
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Actividades Registradas</div>
                                </div>
                                <div>
                                    <div className="text-5xl font-black text-emerald-500 mb-2">{attendanceList.filter(a => a.estado_codigo === 'ASISTENCIA').length}</div>
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Personal Presente</div>
                                </div>
                            </div>
                        </div>

                        {canReviewApprove && (
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 space-y-3">
                                <label className="block text-xs font-black uppercase tracking-wider text-amber-400">
                                    Nota de Revisión / Motivo de Correcciones (Se enviará al Supervisor / Emisor)
                                </label>
                                <input
                                    type="text"
                                    value={correctionNote}
                                    onChange={e => setCorrectionNote(e.target.value)}
                                    placeholder="Ej. Se ajustó tonelaje de rezaga conforme a báscula y se corrigió falta de operador..."
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                                />
                                {computeReportChanges().length > 0 && (
                                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1">
                                        <div className="text-[11px] font-black uppercase text-amber-300">
                                            Cambios detectados ({computeReportChanges().length}):
                                        </div>
                                        {computeReportChanges().map((ch, idx) => (
                                            <div key={idx} className="text-xs text-slate-300">• {ch}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex flex-wrap justify-between items-center gap-4 pt-8 border-t border-slate-800">
                            <button onClick={() => setCurrentStep('ACTIVITIES')} className="text-slate-500 hover:text-white font-bold transition-colors cursor-pointer">← Corregir Datos</button>
                            <div className="flex flex-wrap items-center gap-3">
                                <button onClick={() => handleSaveReport(false)} disabled={loading} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 cursor-pointer">
                                    <Save size={18} /> {loading ? 'Guardando...' : 'Guardar Cambios (En Revisión)'}
                                </button>
                                {canReviewApprove && (
                                    <button onClick={() => handleSaveReport(true)} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 transition-all text-white px-7 py-3.5 rounded-xl font-black flex items-center gap-2 shadow-xl shadow-emerald-900/40 cursor-pointer">
                                        <Save size={20} /> {loading ? 'Aprobando...' : 'Guardar Correcciones y Aprobar'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL ACTIVIDADES (Simplified render for brevity, identical logic to original but styled) */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950 rounded-t-3xl">
                            <h3 className="font-black text-xl text-white tracking-tight">Agregar {modalCategory.replace('_', ' ')}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors p-2 bg-slate-800 rounded-full">✕</button>
                        </div>
                        <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                            <div>
                                <label className="block text-[10px] text-slate-500 mb-2 font-black uppercase tracking-widest">Concepto Detallado</label>
                                <select className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white focus:border-amber-500 outline-none shadow-md" onChange={e => handleProductChange(e.target.value)} value={currentActivity.producto_id || ''}>
                                    <option value="">Seleccione Concepto...</option>
                                    {products.filter(p => !modalCategory || p.categoria === modalCategory).map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.unidad_medida_default})</option>)}
                                </select>
                            </div>

                            {currentActivity.producto_id && (
                                <>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="col-span-2">
                                            <label className="block text-[10px] text-slate-500 mb-2 font-black uppercase tracking-widest">Frente / Ubicación</label>
                                            <select className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-500 outline-none" onChange={e => {
                                                const u = ubicaciones.find(x => x.id === e.target.value)
                                                setCurrentActivity({ ...currentActivity, location_id: e.target.value, location_nombre: u ? `${u.codigo} - ${u.nombre}` : '' })
                                            }} value={currentActivity.location_id || ''}>
                                                <option value="">Seleccione...</option>
                                                {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.codigo} - {u.nombre}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-slate-500 mb-2 font-black uppercase tracking-widest">Equipo Auxiliar</label>
                                            <select className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-500 outline-none" onChange={e => setCurrentActivity({ ...currentActivity, equipo_id: e.target.value, equipo_nombre: equipments.find(x => x.id === e.target.value)?.clave })} value={currentActivity.equipo_id || ''} >
                                                <option value="">Ninguno</option>
                                                {equipments.map(eq => <option key={eq.id} value={eq.id}>{eq.nombre ? `${eq.clave} - ${eq.nombre}` : eq.clave}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-amber-500 mb-2 font-black uppercase tracking-widest">Cantidad ({currentActivity.unidad})</label>
                                            <input type="number" className="w-full bg-amber-950/20 border-2 border-amber-600/40 rounded-xl p-3 text-amber-500 font-black text-2xl outline-none focus:border-amber-500" placeholder="0.00" onChange={e => setCurrentActivity({ ...currentActivity, cantidad_total: parseFloat(e.target.value) })} value={currentActivity.cantidad_total || ''} />
                                        </div>
                                    </div>

                                    {/* VARIABLES */}
                                    {selectedProductVariables.length > 0 && (
                                        <div className="bg-black/40 p-6 rounded-2xl border border-slate-800 grid grid-cols-2 gap-4">
                                            {selectedProductVariables.map(v => (
                                                <div key={v.id}>
                                                    <label className="block text-[10px] text-slate-500 mb-1 font-bold uppercase">{v.label} ({v.unidad})</label>
                                                    {v.tipo_input === 'SELECT' ? (
                                                        <select
                                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-xs outline-none focus:border-amber-500"
                                                            value={currentActivity.variables?.[v.clave] || ''}
                                                            onChange={e => setCurrentActivity({ ...currentActivity, variables: { ...currentActivity.variables, [v.clave]: e.target.value } })}
                                                        >
                                                            <option value="">- Seleccionar -</option>
                                                            {(v.opciones || v.opciones_select)?.map((o: string) => (
                                                                <option key={o} value={o}>{o}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <input
                                                            type={v.tipo_input === 'NUMBER' ? 'number' : 'text'}
                                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-xs outline-none focus:border-amber-500"
                                                            onChange={e => setCurrentActivity({ ...currentActivity, variables: { ...currentActivity.variables, [v.clave]: e.target.value } })}
                                                            value={currentActivity.variables?.[v.clave] || ''}
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* PARTICIPANTES */}
                                    <div>
                                        <label className="block text-[10px] text-slate-500 mb-3 font-black uppercase tracking-widest">Asignar Personal a la Actividad</label>
                                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                            {attendanceList.filter(a => a.estado_codigo === 'ASISTENCIA').map(att => (
                                                <label key={att.empleado_id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${currentActivity.participantes?.includes(att.empleado_id) ? 'bg-amber-900/20 border-amber-500/50' : 'bg-slate-950 border-slate-800'}`}>
                                                    <input type="checkbox" checked={currentActivity.participantes?.includes(att.empleado_id)} onChange={e => {
                                                        const p = currentActivity.participantes || []
                                                        setCurrentActivity({ ...currentActivity, participantes: e.target.checked ? [...p, att.empleado_id] : p.filter(x => x !== att.empleado_id) })
                                                    }} className="w-4 h-4 accent-amber-500" />
                                                    <div>
                                                        <div className="text-white text-xs font-bold">{att.nombre}</div>
                                                        <div className="text-[10px] text-slate-500">{att.rol_nombre_default}</div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="p-6 border-t border-slate-800 bg-slate-950 rounded-b-3xl">
                            <button onClick={handleSaveActivity} className="w-full bg-amber-600 hover:bg-amber-500 text-white py-4 rounded-2xl font-black shadow-xl shadow-amber-900/40 transition-all active:scale-95">AGREGAR ACTIVIDAD AL REPORTE</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
