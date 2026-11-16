import React, { useState, useEffect, useCallback } from 'react'
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Modal,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
    Calendar,
    Plus,
    Target,
    TrendingUp,
    Lock,
    CheckCircle2,
    MapPin,
    X,
} from 'lucide-react-native'
import { supabase } from '../../lib/supabase'
import { useMobileAuth } from '../../lib/auth-context'
import { useResponsiveLayout } from '../../lib/responsive'
import MobileShell from '../../components/MobileShell'

export default function MobilePlanningScreen() {
    const { sysRole, theme, canEditPlanning } = useMobileAuth()
    const insets = useSafeAreaInsets()
    const { height: screenHeight, isCompact, isTablet, modalMaxWidth } = useResponsiveLayout()
    const [loading, setLoading] = useState(true)
    const [planInfo, setPlanInfo] = useState<any | null>(null)
    const [comparisonRows, setComparisonRows] = useState<any[]>([])
    const [productos, setProductos] = useState<any[]>([])
    const [ubicaciones, setUbicaciones] = useState<any[]>([])

    // Modal para agregar/editar meta (Exclusivo Planeación / Jefatura)
    const [modalOpen, setModalOpen] = useState(false)
    const [selectedProdId, setSelectedProdId] = useState('')
    const [selectedLocId, setSelectedLocId] = useState('')
    const [metaQty, setMetaQty] = useState('')
    const [saving, setSaving] = useState(false)

    const isLight = theme === 'light'
    const bgCard = isLight ? '#FFFFFF' : '#0F172A'
    const bgInput = isLight ? '#FEFCE8' : '#020617'
    const borderCol = isLight ? '#CBD5E1' : '#1E293B'
    const textPrimary = isLight ? '#0F172A' : '#F8FAFC'
    const textSecondary = isLight ? '#475569' : '#94A3B8'

    const loadPlanningData = useCallback(async () => {
        setLoading(true)
        try {
            const [
                { data: planes },
                { data: repItems },
                { data: prods },
                { data: locs },
            ] = await Promise.all([
                supabase
                    .from('ops_planes_semanales')
                    .select(
                        '*, ops_plan_items(id, producto_id, location_id, meta_proyectada, cantidad_proyectada, cat_productos_mina(nombre, unidad_medida_default, tarifa_pago), mine_locations(nombre, codigo))'
                    )
                    .order('created_at', { ascending: false }),
                supabase
                    .from('ops_report_items')
                    .select('producto_id, location_id, cantidad_total, cat_productos_mina(nombre, unidad_medida_default), mine_locations(nombre, codigo)'),
                supabase.from('cat_productos_mina').select('id, nombre, unidad_medida_default, categoria').eq('activo', true).order('nombre'),
                supabase.from('mine_locations').select('id, nombre, codigo, mine_site_id').eq('activo', true).order('nombre'),
            ])

            setProductos(prods || [])
            setUbicaciones(locs || [])
            if (prods && prods.length > 0 && !selectedProdId) setSelectedProdId(prods[0].id)
            if (locs && locs.length > 0 && !selectedLocId) setSelectedLocId(locs[0].id)

            const activePlan = (planes || []).find((p: any) => (p.nombre || '').includes('38')) || (planes || [])[0]
            setPlanInfo(activePlan || null)

            const realByProd = new Map<string, number>()
            ;(repItems || []).forEach((ri: any) => {
                const prev = realByProd.get(ri.producto_id) || 0
                realByProd.set(ri.producto_id, prev + (Number(ri.cantidad_total) || 0))
            })

            const rows: any[] = []
            const planItems = activePlan?.ops_plan_items || []
            planItems.forEach((pi: any) => {
                const prod = Array.isArray(pi.cat_productos_mina)
                    ? pi.cat_productos_mina[0]
                    : pi.cat_productos_mina
                const loc = Array.isArray(pi.mine_locations)
                    ? pi.mine_locations[0]
                    : pi.mine_locations
                const meta = Number(pi.meta_proyectada ?? pi.cantidad_proyectada) || 0
                const real = realByProd.get(pi.producto_id) || 0
                const pct = meta > 0 ? Math.min(Math.round((real / meta) * 100), 150) : 100

                rows.push({
                    id: pi.id,
                    productoNombre: prod?.nombre || 'Concepto',
                    unidad: prod?.unidad_medida_default || 'und',
                    frenteNombre: loc?.nombre || loc?.codigo || 'General Mina',
                    meta,
                    real: Number(real.toFixed(1)),
                    pct,
                })
            })

            setComparisonRows(rows)
        } catch (e) {
            console.warn('Error cargando planeación móvil:', e)
        } finally {
            setLoading(false)
        }
    }, [selectedProdId, selectedLocId])

    useEffect(() => {
        loadPlanningData()
    }, [loadPlanningData])

    const handleAddTarget = async () => {
        if (!canEditPlanning) {
            Alert.alert('Acceso Restringido', 'Solo Planeación y Jefatura pueden modificar metas semanales.')
            return
        }
        const val = parseFloat(metaQty)
        if (!selectedProdId || !val || val <= 0) {
            Alert.alert('Datos incompletos', 'Ingresa una cantidad proyectada mayor a 0.')
            return
        }

        setSaving(true)
        try {
            let targetPlanId = planInfo?.id
            if (!targetPlanId) {
                const { data: newPlan, error: pErr } = await supabase
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
                if (pErr) throw pErr
                targetPlanId = newPlan.id
            }

            const locObj = ubicaciones.find((u) => u.id === selectedLocId)

            const { error: itemErr } = await supabase.from('ops_plan_items').insert([
                {
                    plan_id: targetPlanId,
                    producto_id: selectedProdId,
                    location_id: selectedLocId || null,
                    mine_site_id: locObj?.mine_site_id || null,
                    meta_proyectada: val,
                    cantidad_proyectada: val,
                },
            ])

            if (itemErr) throw itemErr

            setModalOpen(false)
            setMetaQty('')
            await loadPlanningData()
            Alert.alert('Meta Guardada', 'La meta proyectada se sincronizó en Supabase.')
        } catch (err: any) {
            Alert.alert('Error', err?.message || 'No se pudo guardar la meta.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <MobileShell
            title="Planeación vs Ejecución S-38"
            pillar="2. Planeación e Ingeniería"
            pillarHex="#3B82F6"
        >
            <ScrollView
                style={[styles.scroll, { paddingHorizontal: isCompact ? 10 : 14 }]}
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 36) }}
                showsVerticalScrollIndicator={false}
            >
                {/* CABECERA DE REGLA JERÁRQUICA DE PLANEACIÓN */}
                <View
                    style={[
                        styles.headerCard,
                        {
                            backgroundColor: isLight ? '#EFF6FF' : '#1E293B',
                            borderColor: '#3B82F6',
                        },
                    ]}
                >
                    <View style={[styles.headerTopRow, { flexWrap: 'wrap', gap: 8 }]}>
                        <View style={{ flex: 1, minWidth: 160 }}>
                            <Text style={[styles.planBadge, { color: '#2563EB' }]}>
                                📐 SIMULACIÓN SEMANA 38 (21 AL 27 SEPTIEMBRE 2026)
                            </Text>
                            <Text style={[styles.planTitle, { color: textPrimary, fontSize: isCompact ? 14 : 16 }]}>
                                {planInfo?.nombre || 'Plan Maestro Semana 38'}
                            </Text>
                        </View>
                        {canEditPlanning ? (
                            <TouchableOpacity
                                onPress={() => setModalOpen(true)}
                                style={styles.addTargetBtn}
                            >
                                <Plus size={16} color="#FFFFFF" />
                                <Text style={styles.addTargetBtnText}>Nueva Meta</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.readOnlyPill}>
                                <Lock size={12} color="#64748B" />
                                <Text style={styles.readOnlyPillText}>Solo Planeador</Text>
                            </View>
                        )}
                    </View>
                    <Text style={[styles.planSub, { color: textSecondary }]}>
                        Comparativa en vivo entre lo programado por Ingeniería y los reportes diarios capturados en mina.
                    </Text>
                </View>

                {loading ? (
                    <View style={{ paddingVertical: 50, alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#3B82F6" />
                        <Text style={{ color: textSecondary, marginTop: 10, fontWeight: '700' }}>
                            Calculando avance real vs plan...
                        </Text>
                    </View>
                ) : (
                    comparisonRows.map((row, idx) => {
                        const isComplete = row.pct >= 100
                        const barColor = isComplete
                            ? '#10B981'
                            : row.pct >= 70
                            ? '#F59E0B'
                            : '#3B82F6'

                        return (
                            <View
                                key={row.id || idx}
                                style={[
                                    styles.rowCard,
                                    { backgroundColor: bgCard, borderColor: borderCol },
                                ]}
                            >
                                <View style={styles.rowHeader}>
                                    <View style={{ flex: 1, marginRight: 8 }}>
                                        <Text style={[styles.rowTitle, { color: textPrimary }]}>
                                            {row.productoNombre}
                                        </Text>
                                        <View style={styles.locLine}>
                                            <MapPin size={12} color="#3B82F6" />
                                            <Text style={[styles.locText, { color: textSecondary }]}>
                                                Frente / Rebaje: {row.frenteNombre}
                                            </Text>
                                        </View>
                                    </View>
                                    <View
                                        style={[
                                            styles.pctBadge,
                                            { backgroundColor: barColor + '20' },
                                        ]}
                                    >
                                        <Text style={[styles.pctText, { color: barColor }]}>
                                            {row.pct}%
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.metricsRow}>
                                    <View style={styles.metricBox}>
                                        <Text style={[styles.metricLabel, { color: textSecondary }]}>
                                            META SEMANAL
                                        </Text>
                                        <Text style={[styles.metricValue, { color: textPrimary }]}>
                                            {row.meta.toLocaleString()} {row.unidad}
                                        </Text>
                                    </View>
                                    <View style={styles.metricBox}>
                                        <Text style={[styles.metricLabel, { color: textSecondary }]}>
                                            EJECUCIÓN REAL
                                        </Text>
                                        <Text style={[styles.metricValue, { color: barColor }]}>
                                            {row.real.toLocaleString()} {row.unidad}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.progressTrack}>
                                    <View
                                        style={[
                                            styles.progressFill,
                                            {
                                                width: `${Math.min(row.pct, 100)}%`,
                                                backgroundColor: barColor,
                                            },
                                        ]}
                                    />
                                </View>
                            </View>
                        )
                    })
                )}
            </ScrollView>

            {/* MODAL PARA AGREGAR META PROYECTADA (SOLO PLANEADOR / JEFATURA) */}
            <Modal visible={modalOpen} animationType="slide" transparent>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View
                        style={[
                            styles.modalCard,
                            {
                                backgroundColor: bgCard,
                                borderColor: borderCol,
                                maxHeight: screenHeight * 0.85,
                                maxWidth: isTablet ? modalMaxWidth : '100%',
                                width: '100%',
                                alignSelf: 'center',
                                paddingBottom: Math.max(insets.bottom + 14, 24),
                            },
                        ]}
                    >
                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: textPrimary }]}>
                                Agregar Meta a Semana 38
                            </Text>
                            <TouchableOpacity onPress={() => setModalOpen(false)}>
                                <X size={20} color={textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.fieldLabel, { color: textPrimary }]}>
                            CONCEPTO / PRODUCTO MINA
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                            {productos.map((p) => {
                                const active = selectedProdId === p.id
                                return (
                                    <TouchableOpacity
                                        key={p.id}
                                        onPress={() => setSelectedProdId(p.id)}
                                        style={[
                                            styles.chipBtn,
                                            {
                                                backgroundColor: active ? '#3B82F6' : bgInput,
                                                borderColor: active ? '#2563EB' : borderCol,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={{
                                                color: active ? '#FFF' : textPrimary,
                                                fontSize: 12,
                                                fontWeight: '800',
                                            }}
                                        >
                                            {p.nombre} ({p.unidad_medida_default})
                                        </Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </ScrollView>

                        <Text style={[styles.fieldLabel, { color: textPrimary }]}>
                            FRENTE / REBAJE DE TRABAJO
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                            {ubicaciones.map((loc) => {
                                const active = selectedLocId === loc.id
                                return (
                                    <TouchableOpacity
                                        key={loc.id}
                                        onPress={() => setSelectedLocId(loc.id)}
                                        style={[
                                            styles.chipBtn,
                                            {
                                                backgroundColor: active ? '#10B981' : bgInput,
                                                borderColor: active ? '#059669' : borderCol,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={{
                                                color: active ? '#022C22' : textPrimary,
                                                fontSize: 12,
                                                fontWeight: '800',
                                            }}
                                        >
                                            {loc.nombre}
                                        </Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </ScrollView>

                        <Text style={[styles.fieldLabel, { color: textPrimary }]}>
                            CANTIDAD META PROYECTADA
                        </Text>
                        <TextInput
                            value={metaQty}
                            onChangeText={setMetaQty}
                            keyboardType="numeric"
                            placeholder="Ej. 1500"
                            placeholderTextColor="#64748B"
                            style={[
                                styles.input,
                                {
                                    backgroundColor: bgInput,
                                    borderColor: '#3B82F6',
                                    color: textPrimary,
                                },
                            ]}
                        />

                        <TouchableOpacity
                            onPress={handleAddTarget}
                            disabled={saving}
                            style={styles.saveBtn}
                        >
                            {saving ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.saveBtnText}>GUARDAR META EN SUPABASE</Text>
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
        paddingHorizontal: 14,
        paddingTop: 12,
    },
    headerCard: {
        borderRadius: 18,
        borderWidth: 1.5,
        padding: 14,
        marginBottom: 14,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    planBadge: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.6,
    },
    planTitle: {
        fontSize: 16,
        fontWeight: '900',
        marginTop: 2,
    },
    planSub: {
        fontSize: 11,
        marginTop: 6,
        lineHeight: 15,
    },
    addTargetBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2563EB',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 4,
    },
    addTargetBtnText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '900',
    },
    readOnlyPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E2E8F0',
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 8,
        gap: 4,
    },
    readOnlyPillText: {
        color: '#475569',
        fontSize: 10,
        fontWeight: '800',
    },
    rowCard: {
        borderRadius: 16,
        borderWidth: 1.5,
        padding: 14,
        marginBottom: 10,
    },
    rowHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    rowTitle: {
        fontSize: 14,
        fontWeight: '900',
    },
    locLine: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 3,
        gap: 4,
    },
    locText: {
        fontSize: 11,
        fontWeight: '700',
    },
    pctBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    pctText: {
        fontSize: 12,
        fontWeight: '900',
    },
    metricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    metricBox: {
        flex: 1,
    },
    metricLabel: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.6,
    },
    metricValue: {
        fontSize: 15,
        fontWeight: '900',
        marginTop: 2,
    },
    progressTrack: {
        height: 8,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(2, 6, 23, 0.7)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderTopWidth: 2,
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '900',
    },
    fieldLabel: {
        fontSize: 11,
        fontWeight: '900',
        marginBottom: 6,
    },
    chipBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1.5,
        marginRight: 8,
    },
    input: {
        borderWidth: 1.5,
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 48,
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 16,
    },
    saveBtn: {
        backgroundColor: '#2563EB',
        height: 50,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '900',
    },
})
