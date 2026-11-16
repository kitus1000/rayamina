'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import {
    Calendar, Clock, MapPin, Users, Pickaxe,
    ArrowLeft, FileText, CheckCircle2,
    HardHat, Activity, Package, Edit2, ShieldCheck, Download
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import {
    pushNotification,
    getReportCreatorMeta,
    getReportRevisions,
    appendReportRevision,
    ReportCreatorMeta,
    ReportRevisionEntry
} from '@/lib/notifications-service'
import { toast } from 'sonner'

type ReportDetail = {
    id: string
    fecha: string
    status: string
    comentarios_supervisor: string
    turno: { nombre: string, codigo: string }
    cuadrilla: { nombre: string }
    mine_site: { nombre_mina: string }
    ops_daily_attendance: Array<{
        empleado_id: string
        observacion: string
        rh_employees: { first_name: string, last_name: string, employee_code: string }
        cat_asistencias: { nombre: string, color: string, codigo: string }
        cat_roles_operativos: { nombre: string }
    }>
    ops_report_items: Array<{
        id: string
        cantidad_total: number
        variables_json: any
        cat_productos_mina: { nombre: string, unidad_medida_default: string, categoria: string }
        ops_equipment: { clave: string }
        mine_locations: { nombre: string, codigo: string }
    }>
}

export default function ReportDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { permissions, sysRole, user, fullName } = useAuth()
    const [creatorMeta, setCreatorMeta] = useState<ReportCreatorMeta | null>(null)
    const [revisions, setRevisions] = useState<ReportRevisionEntry[]>([])

    const canReviewApprove = [
        'JEFE_PLANEACION',
        'GERENTE',
        'SUPERINTENDENTE',
        'DIRECTOR_OPERATIVO',
        'SUPER_ADMIN'
    ].includes(sysRole || '') || Boolean(permissions?.can_approve_reports && sysRole !== 'JEFE_MINA')
    const [report, setReport] = useState<ReportDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [isExporting, setIsExporting] = useState(false)

    useEffect(() => {
        loadData()
    }, [id])

    const loadData = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('ops_daily_reports')
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
            .eq('id', id)
            .single()

        if (error) {
            console.error('Error cargando detalle:', error)
        } else {
            setReport(data as any)
            const [cMeta, revs] = await Promise.all([
                getReportCreatorMeta(id as string),
                getReportRevisions(id as string)
            ])
            setCreatorMeta(cMeta)
            setRevisions(revs)
        }
        setLoading(false)
    }

    const handleApprove = async () => {
        if (!confirm('¿Confirmas que los datos cuadran y deseas APROBAR este reporte?')) return
        try {
            const { error } = await supabase
                .from('ops_daily_reports')
                .update({ estado: 'APROBADO', status: 'APROBADO' })
                .eq('id', id)
            if (error) throw error

            const reviewerName = fullName || user?.email || sysRole || 'Revisión Operativa'
            await appendReportRevision(id as string, {
                edited_by_name: reviewerName,
                edited_by_email: user?.email || null,
                edited_by_role: sysRole || null,
                approved_with_changes: false,
                changes: ['Datos verificados y aprobados sin modificaciones.']
            })

            await pushNotification({
                type: 'REPORT_APPROVED',
                title: `Reporte Aprobado (${report?.fecha || ''})`,
                message: `Tus datos cuadraron correctamente. ${reviewerName} aprobó el reporte de ${report?.cuadrilla?.nombre || 'tu cuadrilla'}.`,
                details: ['Estado actualizado a APROBADO sin modificaciones.'],
                target_user_ids: creatorMeta?.creator_user_id ? [creatorMeta.creator_user_id] : undefined,
                target_user_emails: [creatorMeta?.creator_email, creatorMeta?.supervisor_user_email].filter(Boolean) as string[],
                target_employee_id: creatorMeta?.supervisor_employee_id || null,
                target_employee_name: creatorMeta?.supervisor_name || null,
                created_by_name: reviewerName,
                created_by_email: user?.email || null,
                link: `/dashboard/operacion/reportes-diarios/${id}`
            })

            toast.success('Reporte aprobado y enviado a supervisión')
            loadData()
        } catch (error: any) {
            toast.error('Error al aprobar: ' + error.message)
        }
    }

    const handleRequestCorrection = async () => {
        const motivo = prompt('Por favor, indica la Razón de la corrección:')
        if (!motivo) return

        try {
            const currentComments = report?.comentarios_supervisor || ''
            const newComments = currentComments
                ? `${currentComments}\n\n[SISTEMA - Solicitud de Corrección]: ${motivo}`
                : `[SISTEMA - Solicitud de Corrección]: ${motivo}`

            const { error } = await supabase.from('ops_daily_reports')
                .update({
                    estado: 'CORRECCION_SOLICITADA',
                    status: 'CORRECCION_SOLICITADA',
                    observaciones_generales: newComments
                })
                .eq('id', id)

            if (error) throw error

            const reviewerName = fullName || user?.email || sysRole || 'Revisión Operativa'
            await appendReportRevision(id as string, {
                edited_by_name: reviewerName,
                edited_by_email: user?.email || null,
                edited_by_role: sysRole || null,
                approved_with_changes: false,
                changes: [`Se solicitó corrección al supervisor/emisor: ${motivo}`],
                note: motivo
            })

            await pushNotification({
                type: 'REPORT_CORRECTED',
                title: `Corrección Solicitada en Reporte (${report?.fecha || ''})`,
                message: `${reviewerName} devolvió el reporte para revisión: "${motivo}"`,
                details: [`Observación: ${motivo}`],
                target_user_ids: creatorMeta?.creator_user_id ? [creatorMeta.creator_user_id] : undefined,
                target_user_emails: [creatorMeta?.creator_email, creatorMeta?.supervisor_user_email].filter(Boolean) as string[],
                target_employee_id: creatorMeta?.supervisor_employee_id || null,
                target_employee_name: creatorMeta?.supervisor_name || null,
                created_by_name: reviewerName,
                created_by_email: user?.email || null,
                link: `/dashboard/operacion/reportes-diarios/${id}/editar`
            })

            toast.success('Reporte enviado a corrección')
            loadData()
        } catch (error: any) {
            toast.error('Error al solicitar corrección: ' + error.message)
        }
    }

    if (loading) return (
        <div className="p-12 text-center text-amber-500 font-medium animate-pulse">
            Consultando detalles del reporte...
        </div>
    )

    if (!report) return (
        <div className="p-12 text-center text-red-500 font-medium">
            No se encontró el reporte solicitado.
        </div>
    )

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'BORRADOR': return 'bg-slate-800 text-slate-300 border-slate-700'
            case 'EN_REVISION': return 'bg-amber-900/50 text-amber-400 border-amber-800/50'
            case 'APROBADO': return 'bg-emerald-900/50 text-emerald-400 border-emerald-800/50'
            case 'CORRECCION_SOLICITADA': return 'bg-rose-900/50 text-rose-400 border-rose-800/50'
            default: return 'bg-slate-800 text-slate-300 border-slate-700'
        }
    }

    const handlePrintPDF = () => {
        window.print();
    }

    return (
        <div id="report-content" className="p-2 sm:p-4 md:p-6 max-w-6xl w-full min-w-0 mx-auto space-y-8 bg-slate-950">
            {/* BACK BUTTON & HEADER */}
            <div className="flex flex-col gap-4">
                <Link
                    href="/dashboard/operacion/reportes-diarios"
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors w-fit group html2pdf__ignore"
                >
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    Volver al Histórico
                </Link>
                <div className="flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold text-white">Detalle de Reporte</h1>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase ${getStatusStyle(report.status)}`}>
                                {report.status.replace('_', ' ')}
                            </span>
                        </div>
                        <p className="text-slate-400">ID de Sistema: <span className="font-mono text-xs">{report.id}</span></p>
                    </div>

                    <div className="flex gap-3 html2pdf__ignore flex-wrap justify-end">
                        <button
                            onClick={handlePrintPDF}
                            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors border font-bold bg-slate-800 hover:bg-slate-700 text-white border-slate-700`}
                        >
                            <Download size={18} className="text-blue-400" />
                            PDF
                        </button>

                        <Link
                            href={`/dashboard/operacion/reportes-diarios/${report.id}/editar`}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors border border-slate-700 font-bold"
                        >
                            <Edit2 size={18} className="text-amber-500" />
                            Editar Reporte
                        </Link>

                        {(report.status === 'EN_REVISION' || report.status === 'BORRADOR' || report.status === 'CORRECCION_SOLICITADA') && canReviewApprove && (
                            <>
                                <Link
                                    href={`/dashboard/operacion/reportes-diarios/${report.id}/editar?reviewApprove=1`}
                                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg font-black"
                                >
                                    <Edit2 size={16} />
                                    Corregir Datos y Aprobar
                                </Link>
                                {report.status !== 'CORRECCION_SOLICITADA' && (
                                    <button
                                        onClick={handleRequestCorrection}
                                        className="bg-rose-950/50 border border-rose-900/50 hover:bg-rose-900/60 text-rose-400 px-4 py-2 rounded-lg flex items-center gap-2 transition-all font-bold cursor-pointer"
                                    >
                                        Devolver
                                    </button>
                                )}
                                <button
                                    onClick={handleApprove}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20 font-black cursor-pointer"
                                >
                                    <ShieldCheck size={18} />
                                    Datos Cuadran — Aprobar
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* HEADER GRID */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Fecha', value: report.fecha, icon: Calendar },
                    { label: 'Turno', value: `${report.turno?.codigo} - ${report.turno?.nombre}`, icon: Clock },
                    { label: 'Cuadrilla', value: report.cuadrilla?.nombre, icon: Users },
                    { label: 'Mina', value: report.mine_site?.nombre_mina, icon: MapPin },
                ].map((item, idx) => (
                    <div key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                        <div className="flex items-center gap-2 text-slate-500 mb-1 text-xs uppercase tracking-wider font-bold">
                            <item.icon size={14} className="text-amber-500" />
                            {item.label}
                        </div>
                        <div className="text-white font-semibold">{item.value || '-'}</div>
                    </div>
                ))}
            </div>

            {/* SECTIONS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT: ATTENDANCE */}
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                        <HardHat className="text-amber-500" size={20} /> Personal y Asistencia
                    </h3>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="divide-y divide-slate-800">
                            {report.ops_daily_attendance.map((att) => (
                                <div key={att.empleado_id} className="p-4 hover:bg-slate-800/30 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="font-bold text-slate-200">{att.rh_employees.first_name} {att.rh_employees.last_name}</div>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${att.cat_asistencias.color.replace('bg-', 'text-').replace('500', '400')}`}>
                                            {att.cat_asistencias.nombre}
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5">
                                            <Activity size={10} className="text-amber-500/50" />
                                            Rol: {att.cat_roles_operativos?.nombre || 'General'}
                                        </div>
                                        {att.observacion && (
                                            <div className="italic text-slate-400 bg-black/20 p-1.5 rounded mt-1 border border-slate-800/50">
                                                "{att.observacion}"
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT: ACTIVITIES */}
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                        <Pickaxe className="text-amber-500" size={20} /> Producción y Actividades
                    </h3>

                    {report.ops_report_items.length === 0 ? (
                        <div className="bg-slate-950/50 border border-dashed border-slate-800 p-12 rounded-xl text-center text-slate-500 italic">
                            No se registraron actividades productivas en este turno.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {report.ops_report_items.map((act) => (
                                <div key={act.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                                    <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Package size={16} className="text-amber-500" />
                                            <span className="font-bold text-white">{act.cat_productos_mina.nombre}</span>
                                        </div>
                                        <span className="text-xs text-slate-500 font-mono">#{act.id.slice(0, 8)}</span>
                                    </div>
                                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-4">
                                            <div>
                                                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Cantidad Alcanzada</div>
                                                <div className="text-3xl font-black text-amber-500">
                                                    {act.cantidad_total} <span className="text-sm font-normal text-slate-400">{act.cat_productos_mina.unidad_medida_default}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <div className="bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2">
                                                    <MapPin size={14} className="text-emerald-500" />
                                                    <span className="text-xs text-slate-200 font-medium">Frente: {act.mine_locations?.codigo || 'General'}</span>
                                                </div>
                                                {act.ops_equipment && (
                                                    <div className="bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2">
                                                        <Activity size={14} className="text-blue-500" />
                                                        <span className="text-xs text-slate-200 font-medium">Equipo: {act.ops_equipment.clave}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="bg-black/20 p-3 rounded-lg border border-slate-800/50">
                                            <div className="text-[10px] uppercase font-bold text-slate-500 mb-2 border-b border-slate-800 pb-1">Variables y Detalles</div>
                                            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                                                {Object.entries(act.variables_json || {}).map(([key, val]) => (
                                                    <div key={key}>
                                                        <div className="text-[10px] text-slate-500">{key}</div>
                                                        <div className="text-xs text-slate-300 font-bold">{val as any}</div>
                                                    </div>
                                                ))}
                                                {Object.keys(act.variables_json || {}).length === 0 && (
                                                    <div className="col-span-2 text-xs text-slate-600 italic">Sin variables adicionales</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* SUPERVISOR COMMENTS */}
                    <div className="mt-8">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                            <FileText className="text-amber-500" size={20} /> Comentarios de Supervisión
                        </h3>
                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl relative">
                            <div className="absolute top-4 right-4 opacity-10">
                                <FileText size={48} />
                            </div>
                            <p className="text-slate-300 leading-relaxed italic whitespace-pre-wrap">
                                {report.comentarios_supervisor || 'Sin comentarios registrados por el supervisor.'}
                            </p>
                        </div>
                    </div>

                    {/* REVISION & CORRECTIONS AUDIT LOG */}
                    {(creatorMeta || revisions.length > 0) && (
                        <div className="mt-8">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                                <ShieldCheck className="text-emerald-400" size={20} /> Trazabilidad y Correcciones de Revisión
                            </h3>
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                                {creatorMeta && (
                                    <div className="text-xs text-slate-300 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 flex flex-wrap gap-4">
                                        <span><strong>Enviado por:</strong> {creatorMeta.creator_name || creatorMeta.creator_email || 'Supervisión'} ({creatorMeta.creator_role || 'CAMPO'})</span>
                                        {creatorMeta.supervisor_name && (
                                            <span><strong>Supervisor de cuadrilla:</strong> {creatorMeta.supervisor_name}</span>
                                        )}
                                    </div>
                                )}
                                {revisions.map(rev => (
                                    <div key={rev.id} className="border-l-2 border-amber-500 pl-3.5 py-1 space-y-1.5">
                                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                            <span className="font-bold text-white">
                                                {rev.edited_by_name} {rev.edited_by_role ? `(${rev.edited_by_role.replace(/_/g, ' ')})` : ''}
                                                {rev.approved_with_changes && (
                                                    <span className="ml-2 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase">
                                                        Corregido y Aprobado
                                                    </span>
                                                )}
                                            </span>
                                            <span className="text-slate-500">{new Date(rev.edited_at).toLocaleString('es-MX')}</span>
                                        </div>
                                        {rev.note && (
                                            <p className="text-xs text-amber-300 italic">Nota: {rev.note}</p>
                                        )}
                                        <ul className="space-y-1">
                                            {rev.changes.map((c, idx) => (
                                                <li key={idx} className="text-xs text-slate-300">• {c}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
