import React, { useEffect, useState, useCallback } from 'react'
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    StyleSheet,
} from 'react-native'
import { useRouter } from 'expo-router'
import {
    CalendarDays,
    Plus,
    CheckCircle2,
    XCircle,
    Clock,
    Pickaxe,
} from 'lucide-react-native'
import { supabase } from '../../lib/supabase'
import { useMobileAuth } from '../../lib/auth-context'
import MobileShell from '../../components/MobileShell'

export default function MobileReportsListScreen() {
    const router = useRouter()
    const { sysRole, theme, canApproveReports } = useMobileAuth()
    const [reportes, setReportes] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const isLight = theme === 'light'
    const bgCard = isLight ? '#FFFFFF' : '#0F172A'
    const borderCol = isLight ? '#CBD5E1' : '#1E293B'
    const textPrimary = isLight ? '#0F172A' : '#F8FAFC'
    const textSecondary = isLight ? '#475569' : '#94A3B8'

    const loadReports = useCallback(async () => {
        setLoading(true)
        try {
            const { data } = await supabase
                .from('ops_daily_reports')
                .select(
                    `
                    id, fecha, estado, status, observaciones_generales, comentarios_supervisor,
                    turno:cat_turnos(nombre, codigo),
                    cuadrilla:cat_cuadrillas(nombre),
                    mine_site:mine_sites(nombre_mina),
                    ops_report_items(id, cantidad_total, cat_productos_mina(nombre, unidad_medida_default))
                `
                )
                .order('fecha', { ascending: false })
                .limit(25)

            setReportes(data || [])
        } catch (err) {
            console.warn('Error cargando reportes móviles:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadReports()
    }, [loadReports])

    const handleChangeStatus = async (reportId: string, nextStatus: 'APROBADO' | 'CORRECCION_SOLICITADA') => {
        if (!canApproveReports) {
            Alert.alert('Sin Permiso', 'Solo Superintendente y Gerente pueden aprobar o rechazar reportes.')
            return
        }
        const { error } = await supabase
            .from('ops_daily_reports')
            .update({ estado: nextStatus, status: nextStatus })
            .eq('id', reportId)

        if (error) {
            Alert.alert('Error', error.message)
        } else {
            await loadReports()
        }
    }

    return (
        <MobileShell
            title="Reportes Diarios de Turno"
            pillar="4. Reportes y Seguridad"
            pillarHex="#F43F5E"
        >
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={{ paddingBottom: 36 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.topActionRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.topTitle, { color: textPrimary }]}>
                            Historial Operativo Semana 38
                        </Text>
                        <Text style={[styles.topSub, { color: textSecondary }]}>
                            {canApproveReports
                                ? `Autorización Activa (${sysRole}): Puedes aprobar reportes directamente.`
                                : `Perfil ${sysRole}: Consulta y captura de reportes de turno.`}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={() => router.push('/dashboard/reports-new')}
                        style={styles.newBtn}
                    >
                        <Plus size={18} color="#0F172A" />
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

                        const isApproved = st === 'APROBADO'
                        const badgeBg = isApproved ? '#10B98120' : '#F59E0B20'
                        const badgeText = isApproved ? '#059669' : '#D97706'

                        return (
                            <View
                                key={item.id}
                                style={[
                                    styles.reportCard,
                                    { backgroundColor: bgCard, borderColor: borderCol },
                                ]}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={styles.dateRow}>
                                        <CalendarDays size={18} color="#D97706" />
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
                                        {itemsList.slice(0, 3).map((act: any, idx: number) => {
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

                                {/* Botones de Aprobación Jerárquica (Solo Superintendente / Gerente) */}
                                {canApproveReports && !isApproved && (
                                    <View style={styles.approvalRow}>
                                        <TouchableOpacity
                                            onPress={() =>
                                                handleChangeStatus(item.id, 'APROBADO')
                                            }
                                            style={styles.approveBtn}
                                        >
                                            <CheckCircle2 size={14} color="#FFF" />
                                            <Text style={styles.approveBtnText}>
                                                Aprobar Reporte
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() =>
                                                handleChangeStatus(
                                                    item.id,
                                                    'CORRECCION_SOLICITADA'
                                                )
                                            }
                                            style={styles.rejectBtn}
                                        >
                                            <XCircle size={14} color="#FFF" />
                                            <Text style={styles.approveBtnText}>
                                                Pedir Corrección
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        )
                    })
                )}
            </ScrollView>
        </MobileShell>
    )
}

const styles = StyleSheet.create({
    scroll: {
        flex: 1,
        paddingHorizontal: 14,
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
    approvalRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F030',
    },
    approveBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#059669',
        paddingVertical: 9,
        borderRadius: 10,
        gap: 6,
    },
    rejectBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E11D48',
        paddingVertical: 9,
        borderRadius: 10,
        gap: 6,
    },
    approveBtnText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '900',
    },
})
