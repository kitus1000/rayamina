import React, { useEffect, useState, useCallback } from 'react'
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
    CalendarDays,
    Plus,
    CheckCircle2,
    XCircle,
    Edit3,
    History,
    X,
    Save,
} from 'lucide-react-native'
import { supabase } from '../../lib/supabase'
import { useMobileAuth } from '../../lib/auth-context'
import { useResponsiveLayout } from '../../lib/responsive'
import {
    getAllReportRevisions,
    appendReportRevision,
    getReportCreatorMeta,
    getSquadSupervisorsMeta,
    pushNotification,
    ReportRevisionEntry,
} from '../../lib/notifications-service'
import MobileShell from '../../components/MobileShell'

export default function MobileReportsListScreen() {
    const router = useRouter()
    const { user, sysRole, theme, canApproveReports } = useMobileAuth()
    const insets = useSafeAreaInsets()
    const { height: screenHeight, isCompact, isTablet, modalMaxWidth } = useResponsiveLayout()

    const [reportes, setReportes] = useState<any[]>([])
    const [revisionsMap, setRevisionsMap] = useState<Record<string, ReportRevisionEntry[]>>({})
    const [asistenciasCat, setAsistenciasCat] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Modal de Corrección y Aprobación Inline
    const [editingReport, setEditingReport] = useState<any | null>(null)
    const [editFecha, setEditFecha] = useState('')
    const [editComments, setEditComments] = useState('')
    const [editItems, setEditItems] = useState<Array<{ id: string; nombre: string; unidad: string; qty: string; origQty: number }>>([])
    const [editAttendance, setEditAttendance] = useState<Array<{ id: string; name: string; asistenciaId: string; origAsistenciaId: string }>>([])
    const [savingCorrection, setSavingCorrection] = useState(false)

    const isLight = theme === 'light'
    const bgCard = isLight ? '#FFFFFF' : '#0F172A'
    const bgInput = isLight ? '#FEFCE8' : '#020617'
    const borderCol = isLight ? '#CBD5E1' : '#1E293B'
    const textPrimary = isLight ? '#0F172A' : '#F8FAFC'
    const textSecondary = isLight ? '#475569' : '#94A3B8'

    const loadReports = useCallback(async () => {
        setLoading(true)
        try {
            const [{ data }, revs, { data: asistData }] = await Promise.all([
                supabase
                    .from('ops_daily_reports')
                    .select(
                        `
                        id, fecha, estado, status, cuadrilla_id, supervisor_id, observaciones_generales, comentarios_supervisor,
                        turno:cat_turnos(nombre, codigo),
                        cuadrilla:cat_cuadrillas(nombre, supervisor_id),
                        mine_site:mine_sites(nombre_mina),
                        ops_report_items(id, cantidad_total, cat_productos_mina(nombre, unidad_medida_default)),
                        ops_daily_attendance(id, empleado_id, asistencia_id, asistencia_tipo_id, rh_employees(first_name, last_name))
                    `
                    )
                    .order('fecha', { ascending: false })
                    .limit(25),
                getAllReportRevisions(),
                supabase.from('cat_asistencias').select('id, nombre, codigo, orden').order('orden'),
            ])

            setReportes(data || [])
            setRevisionsMap(revs || {})
            setAsistenciasCat(asistData || [])
        } catch (err) {
            console.warn('Error cargando reportes móviles:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadReports()
    }, [loadReports])

    const notifyReportOutcome = async (
        report: any,
        actionType: 'REPORT_APPROVED' | 'REPORT_CORRECTED',
        title: string,
        message: string,
        details: string[]
    ) => {
        const actorName = user?.full_name || user?.nickname || sysRole
        const [creatorMeta, supMetaMap] = await Promise.all([
            getReportCreatorMeta(report.id),
            getSquadSupervisorsMeta(),
        ])
        const cuadMeta = report.cuadrilla_id ? supMetaMap[report.cuadrilla_id] : null
        const targetIds: string[] = []
        const targetEmails: string[] = []

        if (creatorMeta?.creator_user_id) targetIds.push(creatorMeta.creator_user_id)
        if (creatorMeta?.creator_email) targetEmails.push(creatorMeta.creator_email)
        if (creatorMeta?.supervisor_user_email) targetEmails.push(creatorMeta.supervisor_user_email)
        if (cuadMeta?.supervisor_user_id) targetIds.push(cuadMeta.supervisor_user_id)
        if (cuadMeta?.supervisor_user_email) targetEmails.push(cuadMeta.supervisor_user_email)

        await pushNotification({
            type: actionType,
            title,
            message,
            details,
            target_user_ids: Array.from(new Set(targetIds)),
            target_user_emails: Array.from(new Set(targetEmails)),
            target_employee_id: creatorMeta?.supervisor_employee_id || cuadMeta?.supervisor_employee_id || null,
            target_employee_name: creatorMeta?.supervisor_name || cuadMeta?.supervisor_employee_name || creatorMeta?.creator_name || null,
            target_roles: ['SUPERVISOR', 'JEFE_MINA'],
            created_by_name: actorName,
            created_by_email: user?.email || null,
            link: `/dashboard/operacion/reportes-diarios/${report.id}`,
        })
    }

    const handleChangeStatus = async (report: any, nextStatus: 'APROBADO' | 'CORRECCION_SOLICITADA') => {
        if (!canApproveReports) {
            Alert.alert(
                'Sin Permiso',
                'Solo Planeación, Gerente, Superintendente o Dirección Operativa pueden aprobar o solicitar correcciones.'
            )
            return
        }
        const { error } = await supabase
            .from('ops_daily_reports')
            .update({ estado: nextStatus, status: nextStatus })
            .eq('id', report.id)

        if (error) {
            Alert.alert('Error', error.message)
            return
        }

        const actorName = user?.full_name || user?.nickname || sysRole
        const cuad = Array.isArray(report.cuadrilla) ? report.cuadrilla[0] : report.cuadrilla
        const labelStatus = nextStatus === 'APROBADO' ? 'Aprobado sin cambios' : 'Se solicitó corrección al supervisor'

        await appendReportRevision(report.id, {
            edited_by_name: actorName,
            edited_by_email: user?.email || null,
            edited_by_role: user?.raw_role || sysRole,
            approved_with_changes: nextStatus === 'CORRECCION_SOLICITADA',
            changes: [labelStatus],
        })

        await notifyReportOutcome(
            report,
            nextStatus === 'APROBADO' ? 'REPORT_APPROVED' : 'REPORT_CORRECTED',
            nextStatus === 'APROBADO'
                ? `✅ Reporte Aprobado (${report.fecha})`
                : `⚠️ Corrección Solicitada (${report.fecha})`,
            `${actorName} marcó el reporte de ${cuad?.nombre || 'Cuadrilla'} como ${nextStatus}.`,
            [labelStatus]
        )

        await loadReports()
    }

    const openCorrectionModal = (report: any) => {
        if (!canApproveReports) {
            Alert.alert('Sin Permiso', 'No cuentas con permisos de revisión y aprobación.')
            return
        }
        setEditingReport(report)
        setEditFecha(report.fecha || '')
        setEditComments(report.comentarios_supervisor || report.observaciones_generales || '')

        const items = (report.ops_report_items || []).map((it: any) => {
            const prod = Array.isArray(it.cat_productos_mina) ? it.cat_productos_mina[0] : it.cat_productos_mina
            return {
                id: it.id,
                nombre: prod?.nombre || 'Avance',
                unidad: prod?.unidad_medida_default || 'und',
                qty: String(it.cantidad_total ?? 0),
                origQty: Number(it.cantidad_total ?? 0),
            }
        })
        setEditItems(items)

        const att = (report.ops_daily_attendance || []).map((a: any) => {
            const emp = Array.isArray(a.rh_employees) ? a.rh_employees[0] : a.rh_employees
            const currentAsistId = a.asistencia_id || a.asistencia_tipo_id || ''
            return {
                id: a.id,
                name: emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() : 'Trabajador',
                asistenciaId: currentAsistId,
                origAsistenciaId: currentAsistId,
            }
        })
        setEditAttendance(att)
    }

    const handleSaveCorrectionsAndApprove = async () => {
        if (!editingReport) return
        setSavingCorrection(true)
        try {
            const changes: string[] = []
            if (editFecha.trim() && editFecha.trim() !== (editingReport.fecha || '')) {
                changes.push(`Fecha: ${editingReport.fecha || '-'} → ${editFecha.trim()}`)
            }
            const origObs = editingReport.comentarios_supervisor || editingReport.observaciones_generales || ''
            if (editComments.trim() !== origObs.trim()) {
                changes.push(`Comentarios ajustados`)
            }

            // 1. Actualizar cabecera y aprobar
            const { error: hdrErr } = await supabase
                .from('ops_daily_reports')
                .update({
                    fecha: editFecha.trim() || editingReport.fecha,
                    observaciones_generales: editComments,
                    comentarios_supervisor: editComments,
                    estado: 'APROBADO',
                    status: 'APROBADO',
                })
                .eq('id', editingReport.id)
            if (hdrErr) throw hdrErr

            // 2. Actualizar cantidades de actividades corregidas
            for (const item of editItems) {
                const nextNum = parseFloat(item.qty) || 0
                if (nextNum !== item.origQty) {
                    changes.push(`${item.nombre}: ${item.origQty} → ${nextNum} ${item.unidad}`)
                    const { error: itemErr } = await supabase
                        .from('ops_report_items')
                        .update({ cantidad_total: nextNum })
                        .eq('id', item.id)
                    if (itemErr) throw itemErr
                }
            }

            // 3. Actualizar asistencias corregidas
            const catById = new Map(asistenciasCat.map((c: any) => [c.id, c.codigo ? `${c.codigo} (${c.nombre})` : c.nombre]))
            for (const att of editAttendance) {
                if (att.asistenciaId && att.asistenciaId !== att.origAsistenciaId) {
                    const prevCode = catById.get(att.origAsistenciaId) || 'Anterior'
                    const nextCode = catById.get(att.asistenciaId) || 'Nuevo'
                    changes.push(`Asistencia ${att.name}: ${prevCode} → ${nextCode}`)
                    const { error: attErr } = await supabase
                        .from('ops_daily_attendance')
                        .update({ asistencia_id: att.asistenciaId, asistencia_tipo_id: att.asistenciaId })
                        .eq('id', att.id)
                    if (attErr) throw attErr
                }
            }

            const hadDiffs = changes.length > 0
            const actorName = user?.full_name || user?.nickname || sysRole
            const cuad = Array.isArray(editingReport.cuadrilla) ? editingReport.cuadrilla[0] : editingReport.cuadrilla

            await appendReportRevision(editingReport.id, {
                edited_by_name: actorName,
                edited_by_email: user?.email || null,
                edited_by_role: user?.raw_role || sysRole,
                approved_with_changes: hadDiffs,
                changes: hadDiffs ? changes : ['Aprobado tras revisión sin cambios'],
            })

            await notifyReportOutcome(
                editingReport,
                hadDiffs ? 'REPORT_CORRECTED' : 'REPORT_APPROVED',
                hadDiffs
                    ? `🛠️ Reporte Corregido y Aprobado (${editFecha.trim()})`
                    : `✅ Reporte Aprobado (${editFecha.trim()})`,
                hadDiffs
                    ? `${actorName} ajustó datos en el reporte de ${cuad?.nombre || 'Cuadrilla'} y lo aprobó:`
                    : `${actorName} aprobó el reporte de ${cuad?.nombre || 'Cuadrilla'}.`,
                hadDiffs ? changes : ['Datos verificados y aprobados sin cambios']
            )

            setEditingReport(null)
            Alert.alert(
                hadDiffs ? 'Corregido y Aprobado' : 'Reporte Aprobado',
                hadDiffs
                    ? 'Se guardaron las correcciones, se aprobó el reporte y se envió el detalle al supervisor que lo capturó.'
                    : 'El reporte quedó aprobado y notificado.'
            )
            await loadReports()
        } catch (err: any) {
            Alert.alert('Error al guardar corrección', err?.message || 'Verifica tu conexión.')
        } finally {
            setSavingCorrection(false)
        }
    }

    return (
        <MobileShell
            title="Reportes Diarios de Turno"
            pillar="4. Reportes y Seguridad"
            pillarHex="#F43F5E"
        >
            <ScrollView
                style={[styles.scroll, { paddingHorizontal: isCompact ? 10 : 14 }]}
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 24, 36) }}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.topActionRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={[styles.topTitle, { color: textPrimary, fontSize: isCompact ? 14 : 16 }]}>
                            Historial Operativo Semana 38
                        </Text>
                        <Text style={[styles.topSub, { color: textSecondary }]}>
                            {canApproveReports
                                ? `Revisor (${sysRole}): Aprueba o corrige datos antes de autorizar.`
                                : `Perfil ${sysRole}: Consulta, trazabilidad y captura de turno.`}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={() => router.push('/dashboard/reports-new')}
                        style={styles.newBtn}
                    >
                        <Plus size={17} color="#0F172A" />
                        <Text style={styles.newBtnText}>Capturar</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={{ paddingVertical: 50, alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#F59E0B" />
                    </View>
                ) : (
                    reportes.map((item) => {
                        const st = item.status || item.estado || 'EN_REVISION'
                        const turno = Array.isArray(item.turno) ? item.turno[0] : item.turno
                        const cuad = Array.isArray(item.cuadrilla)
                            ? item.cuadrilla[0]
                            : item.cuadrilla
                        const mina = Array.isArray(item.mine_site)
                            ? item.mine_site[0]
                            : item.mine_site
                        const itemsList = item.ops_report_items || []
                        const revs = revisionsMap[item.id] || []
                        const lastRev = revs[0]

                        const isApproved = st === 'APROBADO'
                        const badgeBg = isApproved ? '#10B98120' : st === 'CORRECCION_SOLICITADA' ? '#F43F5E20' : '#F59E0B20'
                        const badgeText = isApproved ? '#059669' : st === 'CORRECCION_SOLICITADA' ? '#E11D48' : '#D97706'

                        return (
                            <View
                                key={item.id}
                                style={[
                                    styles.reportCard,
                                    { backgroundColor: bgCard, borderColor: borderCol },
                                ]}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={[styles.dateRow, { flex: 1, flexWrap: 'wrap' }]}>
                                        <CalendarDays size={17} color="#D97706" />
                                        <Text style={[styles.dateText, { color: textPrimary }]}>
                                            {item.fecha}
                                        </Text>
                                        <View style={styles.turnoBadge}>
                                            <Text style={styles.turnoBadgeText}>
                                                {turno?.codigo || turno?.nombre || 'TURNO'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View
                                        style={[
                                            styles.statusBadge,
                                            { backgroundColor: badgeBg },
                                        ]}
                                    >
                                        <Text style={[styles.statusText, { color: badgeText }]}>
                                            {st}
                                        </Text>
                                    </View>
                                </View>

                                <Text style={[styles.squadLine, { color: textSecondary }]}>
                                    ⛏️ {mina?.nombre_mina || 'El Herrero'} •{' '}
                                    {cuad?.nombre || 'Cuadrilla General'}
                                </Text>

                                {/* Avances capturados en este reporte */}
                                {itemsList.length > 0 && (
                                    <View style={styles.itemsBox}>
                                        {itemsList.slice(0, 4).map((act: any, idx: number) => {
                                            const prod = Array.isArray(act.cat_productos_mina)
                                                ? act.cat_productos_mina[0]
                                                : act.cat_productos_mina
                                            return (
                                                <Text
                                                    key={act.id || idx}
                                                    style={[
                                                        styles.itemBullet,
                                                        { color: textPrimary },
                                                    ]}
                                                >
                                                    • {prod?.nombre || 'Avance'}:{' '}
                                                    <Text style={{ color: '#D97706', fontWeight: '900' }}>
                                                        {act.cantidad_total}{' '}
                                                        {prod?.unidad_medida_default || 'und'}
                                                    </Text>
                                                </Text>
                                            )
                                        })}
                                    </View>
                                )}

                                {/* Trazabilidad y Cambios de Revisión */}
                                {lastRev && (
                                    <View
                                        style={[
                                            styles.revBox,
                                            {
                                                backgroundColor: lastRev.approved_with_changes
                                                    ? 'rgba(245, 158, 11, 0.12)'
                                                    : 'rgba(16, 185, 129, 0.1)',
                                                borderColor: lastRev.approved_with_changes
                                                    ? '#F59E0B60'
                                                    : '#10B98150',
                                            },
                                        ]}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                                            <History size={12} color={lastRev.approved_with_changes ? '#D97706' : '#059669'} />
                                            <Text style={{ fontSize: 10, fontWeight: '900', color: textPrimary }}>
                                                {lastRev.approved_with_changes ? 'Revisión con Ajustes' : 'Última Revisión'} ({revs.length}) • {lastRev.edited_by_name}
                                            </Text>
                                        </View>
                                        {lastRev.changes.slice(0, 3).map((ch, idx) => (
                                            <Text key={idx} style={{ fontSize: 10, color: textSecondary }}>
                                                - {ch}
                                            </Text>
                                        ))}
                                    </View>
                                )}

                                {/* Botones de Aprobación / Corrección Jerárquica */}
                                {canApproveReports && (
                                    <View style={styles.approvalRow}>
                                        {!isApproved && (
                                            <TouchableOpacity
                                                onPress={() => handleChangeStatus(item, 'APROBADO')}
                                                style={styles.approveBtn}
                                            >
                                                <CheckCircle2 size={14} color="#FFF" />
                                                <Text style={styles.approveBtnText}>Aprobar</Text>
                                            </TouchableOpacity>
                                        )}

                                        <TouchableOpacity
                                            onPress={() => openCorrectionModal(item)}
                                            style={styles.correctBtn}
                                        >
                                            <Edit3 size={14} color="#0F172A" />
                                            <Text style={[styles.approveBtnText, { color: '#0F172A' }]}>
                                                Corregir y Aprobar
                                            </Text>
                                        </TouchableOpacity>

                                        {!isApproved && (
                                            <TouchableOpacity
                                                onPress={() =>
                                                    handleChangeStatus(item, 'CORRECCION_SOLICITADA')
                                                }
                                                style={styles.rejectBtn}
                                            >
                                                <XCircle size={14} color="#FFF" />
                                                <Text style={styles.approveBtnText}>Devolver</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                            </View>
                        )
                    })
                )}
            </ScrollView>

            {/* MODAL PARA CORREGIR DATOS Y APROBAR REPORTE */}
            <Modal visible={Boolean(editingReport)} animationType="slide" transparent>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View
                        style={[
                            styles.modalCard,
                            {
                                backgroundColor: bgCard,
                                borderColor: '#F59E0B',
                                maxHeight: screenHeight * 0.88,
                                maxWidth: isTablet ? modalMaxWidth : '100%',
                                width: '100%',
                                alignSelf: 'center',
                                paddingBottom: Math.max(insets.bottom + 14, 24),
                            },
                        ]}
                    >
                        <View style={styles.modalHeader}>
                            <View style={{ flex: 1, paddingRight: 8 }}>
                                <Text style={[styles.topTitle, { color: textPrimary }]}>
                                    Corregir Datos y Aprobar Reporte
                                </Text>
                                <Text style={[styles.topSub, { color: textSecondary }]}>
                                    Todos los cambios quedarán registrados y se notificarán al supervisor que envió el reporte.
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setEditingReport(null)} style={{ padding: 6 }}>
                                <X size={20} color={textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <Text style={[styles.fieldLabel, { color: textPrimary }]}>FECHA DEL REPORTE</Text>
                            <TextInput
                                value={editFecha}
                                onChangeText={setEditFecha}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor="#64748B"
                                style={[styles.input, { backgroundColor: bgInput, borderColor: borderCol, color: textPrimary }]}
                            />

                            <Text style={[styles.fieldLabel, { color: textPrimary }]}>OBSERVACIONES DE TURNO</Text>
                            <TextInput
                                value={editComments}
                                onChangeText={setEditComments}
                                multiline
                                placeholder="Notas u observaciones corregidas..."
                                placeholderTextColor="#64748B"
                                style={[
                                    styles.input,
                                    { backgroundColor: bgInput, borderColor: borderCol, color: textPrimary, minHeight: 62 },
                                ]}
                            />

                            {editItems.length > 0 && (
                                <>
                                    <Text style={[styles.fieldLabel, { color: '#D97706', marginTop: 4 }]}>
                                        AVANCES / TONELADAS CAPTURADAS
                                    </Text>
                                    {editItems.map((it, idx) => (
                                        <View key={it.id} style={[styles.editRowCard, { borderColor: borderCol }]}>
                                            <Text style={{ flex: 1, color: textPrimary, fontSize: 12, fontWeight: '800' }}>
                                                {it.nombre} ({it.unidad})
                                            </Text>
                                            <TextInput
                                                value={it.qty}
                                                onChangeText={(txt) =>
                                                    setEditItems((prev) =>
                                                        prev.map((row, i) => (i === idx ? { ...row, qty: txt } : row))
                                                    )
                                                }
                                                keyboardType="numeric"
                                                style={[
                                                    styles.qtyInput,
                                                    { backgroundColor: bgInput, borderColor: '#F59E0B', color: textPrimary },
                                                ]}
                                            />
                                        </View>
                                    ))}
                                </>
                            )}

                            {editAttendance.length > 0 && asistenciasCat.length > 0 && (
                                <>
                                    <Text style={[styles.fieldLabel, { color: '#10B981', marginTop: 10 }]}>
                                        PASE DE LISTA ({editAttendance.length})
                                    </Text>
                                    {editAttendance.map((att, idx) => (
                                        <View key={att.id} style={[styles.editAttCard, { borderColor: borderCol }]}>
                                            <Text style={{ color: textPrimary, fontSize: 12, fontWeight: '800', marginBottom: 6 }}>
                                                {att.name}
                                            </Text>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                                {asistenciasCat.map((cat: any) => {
                                                    const selected = att.asistenciaId === cat.id
                                                    return (
                                                        <TouchableOpacity
                                                            key={cat.id}
                                                            onPress={() =>
                                                                setEditAttendance((prev) =>
                                                                    prev.map((r, i) =>
                                                                        i === idx ? { ...r, asistenciaId: cat.id } : r
                                                                    )
                                                                )
                                                            }
                                                            style={[
                                                                styles.asistChip,
                                                                {
                                                                    backgroundColor: selected ? '#10B981' : bgInput,
                                                                    borderColor: selected ? '#059669' : borderCol,
                                                                },
                                                            ]}
                                                        >
                                                            <Text
                                                                style={{
                                                                    fontSize: 10,
                                                                    fontWeight: '900',
                                                                    color: selected ? '#022C22' : textPrimary,
                                                                }}
                                                            >
                                                                {cat.codigo ? `${cat.codigo} — ${cat.nombre}` : cat.nombre}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    )
                                                })}
                                            </ScrollView>
                                        </View>
                                    ))}
                                </>
                            )}

                            <TouchableOpacity
                                disabled={savingCorrection}
                                onPress={handleSaveCorrectionsAndApprove}
                                style={[styles.saveCorrectionBtn, savingCorrection && { opacity: 0.6 }]}
                            >
                                {savingCorrection ? (
                                    <ActivityIndicator size="small" color="#0F172A" />
                                ) : (
                                    <>
                                        <Save size={16} color="#0F172A" />
                                        <Text style={styles.saveCorrectionBtnText}>
                                            GUARDAR CORRECCIONES Y APROBAR
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </MobileShell>
    )
}

const styles = StyleSheet.create({
    scroll: {
        flex: 1,
        paddingTop: 12,
    },
    topActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    topTitle: {
        fontSize: 16,
        fontWeight: '900',
    },
    topSub: {
        fontSize: 11,
        marginTop: 2,
    },
    newBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F59E0B',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 6,
    },
    newBtnText: {
        color: '#0F172A',
        fontSize: 12,
        fontWeight: '900',
    },
    reportCard: {
        borderRadius: 18,
        borderWidth: 1.5,
        padding: 14,
        marginBottom: 10,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dateText: {
        fontSize: 15,
        fontWeight: '900',
    },
    turnoBadge: {
        backgroundColor: '#1E293B',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    turnoBadgeText: {
        color: '#F8FAFC',
        fontSize: 9,
        fontWeight: '900',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '900',
    },
    squadLine: {
        fontSize: 12,
        fontWeight: '700',
        marginTop: 6,
    },
    itemsBox: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F030',
        gap: 3,
    },
    itemBullet: {
        fontSize: 12,
        fontWeight: '700',
    },
    revBox: {
        marginTop: 8,
        padding: 9,
        borderRadius: 10,
        borderWidth: 1,
    },
    approvalRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F030',
    },
    approveBtn: {
        flex: 1,
        minWidth: 95,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#059669',
        paddingVertical: 9,
        paddingHorizontal: 8,
        borderRadius: 10,
        gap: 5,
    },
    correctBtn: {
        flex: 1.3,
        minWidth: 125,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F59E0B',
        paddingVertical: 9,
        paddingHorizontal: 8,
        borderRadius: 10,
        gap: 5,
    },
    rejectBtn: {
        flex: 1,
        minWidth: 90,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E11D48',
        paddingVertical: 9,
        paddingHorizontal: 8,
        borderRadius: 10,
        gap: 5,
    },
    approveBtnText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '900',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(2, 6, 23, 0.74)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderTopWidth: 2,
        padding: 18,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    fieldLabel: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.6,
        marginBottom: 6,
    },
    input: {
        borderWidth: 1.5,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 10,
    },
    editRowCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        padding: 10,
        marginBottom: 8,
        gap: 10,
    },
    qtyInput: {
        width: 84,
        height: 40,
        borderWidth: 1.5,
        borderRadius: 10,
        textAlign: 'center',
        fontWeight: '900',
        fontSize: 14,
    },
    editAttCard: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 10,
        marginBottom: 8,
    },
    asistChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        marginRight: 6,
    },
    saveCorrectionBtn: {
        marginTop: 12,
        backgroundColor: '#F59E0B',
        height: 48,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    saveCorrectionBtnText: {
        color: '#0F172A',
        fontSize: 12,
        fontWeight: '900',
    },
})
