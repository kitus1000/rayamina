import React, { useState, useEffect, useCallback } from 'react'
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    TextInput,
    StyleSheet,
} from 'react-native'
import { DollarSign, Lock, Search, Users, Award, CheckCircle2 } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { useMobileAuth } from '../../lib/auth-context'
import { useResponsiveLayout } from '../../lib/responsive'
import MobileShell from '../../components/MobileShell'

export default function MobilePayrollScreen() {
    const { sysRole, theme, canViewFinancials } = useMobileAuth()
    const insets = useSafeAreaInsets()
    const { isCompact, horizontalPadding } = useResponsiveLayout()
    const [loading, setLoading] = useState(true)
    const [rows, setRows] = useState<any[]>([])
    const [search, setSearch] = useState('')
    const [totals, setTotals] = useState({ base: 0, destajo: 0, total: 0 })

    const isLight = theme === 'light'
    const bgCard = isLight ? '#FFFFFF' : '#0F172A'
    const bgInput = isLight ? '#FEFCE8' : '#020617'
    const borderCol = isLight ? '#CBD5E1' : '#1E293B'
    const textPrimary = isLight ? '#0F172A' : '#F8FAFC'
    const textSecondary = isLight ? '#475569' : '#94A3B8'

    const loadPayroll = useCallback(async () => {
        if (!canViewFinancials) {
            setLoading(false)
            return
        }
        setLoading(true)
        try {
            const [
                { data: emps },
                { data: mems },
                { data: persItems },
            ] = await Promise.all([
                supabase
                    .from('rh_employees')
                    .select('id, employee_code, first_name, last_name, sueldo_diario_base, status, cat_puestos(nombre)')
                    .order('first_name'),
                supabase
                    .from('cat_cuadrillas_miembros')
                    .select('empleado_id, cat_cuadrillas(nombre)'),
                supabase
                    .from('ops_report_personnel')
                    .select('empleado_id, porcentaje_participacion, ops_report_items!ops_report_personnel_report_item_id_fkey(cantidad_total, cat_productos_mina(tarifa_pago))'),
            ])

            const squadByEmp = new Map<string, string>()
            ;(mems || []).forEach((m: any) => {
                const c = Array.isArray(m.cat_cuadrillas) ? m.cat_cuadrillas[0] : m.cat_cuadrillas
                if (c?.nombre) squadByEmp.set(m.empleado_id, c.nombre)
            })

            const destajoByEmp = new Map<string, number>()
            ;(persItems || []).forEach((p: any) => {
                const item = Array.isArray(p.ops_report_items) ? p.ops_report_items[0] : p.ops_report_items
                const prod = Array.isArray(item?.cat_productos_mina)
                    ? item?.cat_productos_mina[0]
                    : item?.cat_productos_mina
                const qty = Number(item?.cantidad_total) || 0
                const tarifa = Number(prod?.tarifa_pago) || 0
                const pct = (Number(p.porcentaje_participacion) || 100) / 100
                const earned = qty * tarifa * pct
                destajoByEmp.set(p.empleado_id, (destajoByEmp.get(p.empleado_id) || 0) + earned)
            })

            let sumBase = 0
            let sumDestajo = 0

            const computed = (emps || [])
                .filter((e: any) => e.status !== 'INACTIVE')
                .map((e: any) => {
                    const puesto = Array.isArray(e.cat_puestos)
                        ? e.cat_puestos[0]?.nombre
                        : e.cat_puestos?.nombre || 'Operador'
                    const diario = Number(e.sueldo_diario_base) || 450
                    const sueldoSemanal = diario * 7 // 6 turnos + séptimo día proporcional (1.1667)
                    const destajo = Math.round(destajoByEmp.get(e.id) || 0)
                    const granTotal = Math.round(sueldoSemanal + destajo)

                    sumBase += sueldoSemanal
                    sumDestajo += destajo

                    return {
                        id: e.id,
                        code: e.employee_code || 'S/C',
                        name: `${e.first_name || ''} ${e.last_name || ''}`.trim(),
                        puesto,
                        cuadrilla: squadByEmp.get(e.id) || 'GENERAL',
                        diario,
                        sueldoSemanal: Math.round(sueldoSemanal),
                        destajo,
                        granTotal,
                    }
                })

            setRows(computed)
            setTotals({
                base: Math.round(sumBase),
                destajo: Math.round(sumDestajo),
                total: Math.round(sumBase + sumDestajo),
            })
        } catch (err) {
            console.warn('Error cargando pre-nómina móvil:', err)
        } finally {
            setLoading(false)
        }
    }, [canViewFinancials])

    useEffect(() => {
        loadPayroll()
    }, [loadPayroll])

    const filtered = rows.filter(
        (r) =>
            r.name.toLowerCase().includes(search.toLowerCase()) ||
            r.puesto.toLowerCase().includes(search.toLowerCase()) ||
            r.cuadrilla.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <MobileShell
            title="Pre-Nómina y Raya S-38"
            pillar="1. Jefatura y Dirección"
            pillarHex="#F59E0B"
        >
            {!canViewFinancials ? (
                <View style={styles.restrictedBox}>
                    <Lock size={44} color="#E11D48" />
                    <Text style={[styles.restrictedTitle, { color: textPrimary }]}>
                        Acceso Exclusivo para Jefatura y Dirección
                    </Text>
                    <Text style={[styles.restrictedSub, { color: textSecondary }]}>
                        Tu perfil actual ({sysRole}) no tiene autorización para visualizar la Pre-Nómina ni tabuladores financieros.
                    </Text>
                </View>
            ) : (
                <ScrollView
                    style={[styles.scroll, { paddingHorizontal: horizontalPadding }]}
                    contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 36) }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* RESUMEN EJECUTIVO DE RAYA SEMANA 38 */}
                    <View
                        style={[
                            styles.summaryBanner,
                            { backgroundColor: isLight ? '#0F172A' : '#1E293B' },
                        ]}
                    >
                        <Text style={styles.summaryTag}>
                            💰 CORTE PRE-NÓMINA SEMANA 38 (21-27 SEP 2026)
                        </Text>
                        <Text style={[styles.summaryTotal, isCompact && { fontSize: 22 }]}>
                            ${totals.total.toLocaleString('es-MX')} MXN
                        </Text>
                        <View style={styles.summarySplitRow}>
                            <Text style={styles.summarySplitText}>
                                Sueldo Base + 7mo Día: ${totals.base.toLocaleString('es-MX')}
                            </Text>
                            <Text style={styles.summarySplitDestajo}>
                                Destajos y Bonos: +${totals.destajo.toLocaleString('es-MX')}
                            </Text>
                        </View>
                    </View>

                    {/* BUSCADOR DE TRABAJADOR / CUADRILLA */}
                    <View
                        style={[
                            styles.searchBox,
                            { backgroundColor: bgInput, borderColor: '#D97706' },
                        ]}
                    >
                        <Search size={18} color="#D97706" />
                        <TextInput
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Buscar por nombre, puesto o cuadrilla..."
                            placeholderTextColor="#64748B"
                            style={[styles.searchInput, { color: textPrimary }]}
                        />
                    </View>

                    {loading ? (
                        <View style={{ paddingVertical: 50, alignItems: 'center' }}>
                            <ActivityIndicator size="large" color="#F59E0B" />
                        </View>
                    ) : (
                        filtered.map((emp) => (
                            <View
                                key={emp.id}
                                style={[
                                    styles.empCard,
                                    { backgroundColor: bgCard, borderColor: borderCol },
                                ]}
                            >
                                <View style={styles.empTopRow}>
                                    <View style={{ flex: 1, marginRight: 8 }}>
                                        <Text style={[styles.empName, { color: textPrimary }]}>
                                            {emp.name}
                                        </Text>
                                        <Text style={[styles.empSub, { color: textSecondary }]}>
                                            {emp.puesto} • {emp.cuadrilla}
                                        </Text>
                                    </View>
                                    <View style={styles.totalPill}>
                                        <Text style={styles.totalPillText}>
                                            ${emp.granTotal.toLocaleString('es-MX')}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.breakdownRow}>
                                    <Text style={[styles.breakdownItem, { color: textSecondary }]}>
                                        Diario: ${emp.diario}
                                    </Text>
                                    <Text style={[styles.breakdownItem, { color: textSecondary }]}>
                                        Base Sem: ${emp.sueldoSemanal.toLocaleString('es-MX')}
                                    </Text>
                                    <Text style={styles.breakdownDestajo}>
                                        Destajo: +${emp.destajo.toLocaleString('es-MX')}
                                    </Text>
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>
            )}
        </MobileShell>
    )
}

const styles = StyleSheet.create({
    scroll: {
        flex: 1,
        paddingHorizontal: 14,
        paddingTop: 12,
    },
    restrictedBox: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 28,
    },
    restrictedTitle: {
        fontSize: 18,
        fontWeight: '900',
        textAlign: 'center',
        marginTop: 12,
    },
    restrictedSub: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 6,
        lineHeight: 18,
    },
    summaryBanner: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 1.5,
        borderColor: '#F59E0B',
        marginBottom: 14,
    },
    summaryTag: {
        color: '#F59E0B',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.6,
    },
    summaryTotal: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: '900',
        marginTop: 4,
    },
    summarySplitRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        flexWrap: 'wrap',
        gap: 6,
    },
    summarySplitText: {
        color: '#CBD5E1',
        fontSize: 11,
        fontWeight: '700',
    },
    summarySplitDestajo: {
        color: '#34D399',
        fontSize: 11,
        fontWeight: '900',
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 14,
        paddingHorizontal: 12,
        height: 46,
        marginBottom: 12,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 13,
        fontWeight: '700',
    },
    empCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 13,
        marginBottom: 8,
    },
    empTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    empName: {
        fontSize: 13,
        fontWeight: '900',
    },
    empSub: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 2,
    },
    totalPill: {
        backgroundColor: '#10B98120',
        borderColor: '#10B981',
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    totalPillText: {
        color: '#059669',
        fontSize: 13,
        fontWeight: '900',
    },
    breakdownRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 6,
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F030',
    },
    breakdownItem: {
        fontSize: 10,
        fontWeight: '700',
    },
    breakdownDestajo: {
        color: '#D97706',
        fontSize: 10,
        fontWeight: '900',
    },
})
