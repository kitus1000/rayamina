import React, { useState, useEffect, useCallback } from 'react'
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Modal,
    Alert,
    Animated,
    StyleSheet,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
    Users,
    Pickaxe,
    Shield,
    History,
    Lock,
    CheckCircle2,
    UserPlus,
    UserMinus,
    UserCheck,
    X,
} from 'lucide-react-native'
import { supabase } from '../../lib/supabase'
import { useMobileAuth } from '../../lib/auth-context'
import { useResponsiveLayout } from '../../lib/responsive'
import {
    getSquadSupervisorsMeta,
    saveSquadSupervisorMeta,
    pushNotification,
    SquadSupervisorMeta,
} from '../../lib/notifications-service'
import MobileShell from '../../components/MobileShell'

const SQUAD_HISTORY_KEY = 'ops_squad_history_store'

export default function MobileSquadsScreen() {
    const { sysRole, user, theme, canMoveSquads } = useMobileAuth()
    const insets = useSafeAreaInsets()
    const { height: screenHeight, isCompact, isTablet, cardWidth, modalMaxWidth } = useResponsiveLayout()
    const playerColWidth = isTablet ? cardWidth(10, 3) : '48.5%'

    const [loading, setLoading] = useState(true)
    const [cuadrillas, setCuadrillas] = useState<any[]>([])
    const [selectedSquadId, setSelectedSquadId] = useState<string>('')
    const [membersBySquad, setMembersBySquad] = useState<Record<string, any[]>>({})
    const [benchEmployees, setBenchEmployees] = useState<any[]>([])
    const [allEmployees, setAllEmployees] = useState<any[]>([])
    const [sysUsers, setSysUsers] = useState<any[]>([])
    const [supervisorsMeta, setSupervisorsMeta] = useState<Record<string, SquadSupervisorMeta>>({})
    const [workerSquadMap, setWorkerSquadMap] = useState<
        Record<string, { squadId: string; squadName: string; supervisorName: string }>
    >({})
    const [historyLog, setHistoryLog] = useState<Record<string, any>>({})

    // Modal de Transferencia Táctica & Selector de Supervisor Titular
    const [selectedWorker, setSelectedWorker] = useState<any | null>(null)
    const [supervisorModalOpen, setSupervisorModalOpen] = useState(false)
    const [savingSupervisor, setSavingSupervisor] = useState(false)
    const [transferAnim] = useState(new Animated.Value(0))
    const [transferringTo, setTransferringTo] = useState<string | null>(null)

    const isLight = theme === 'light'
    const bgCard = isLight ? '#FFFFFF' : '#0F172A'
    const bgPitch = isLight ? '#064E3B' : '#022C22'
    const borderCol = isLight ? '#CBD5E1' : '#1E293B'
    const textPrimary = isLight ? '#0F172A' : '#F8FAFC'
    const textSecondary = isLight ? '#475569' : '#94A3B8'

    const classifySpecialty = (puesto: string, rol: string) => {
        const combined = `${puesto} ${rol}`.toUpperCase()
        if (combined.includes('SCOOP') || combined.includes('CARGADOR') || combined.includes('CAMION')) {
            return {
                code: 'SCOOP',
                label: '🚜 OPERADOR SCOOP',
                bg: '#F59E0B',
                text: '#0F172A',
                animText: '🚜 Desplazando Operador de Scooptram...',
            }
        }
        if (combined.includes('AYUDANTE')) {
            return {
                code: 'AYUDANTE',
                label: '🛡️ AYUDANTE PERF.',
                bg: '#06B6D4',
                text: '#0F172A',
                animText: '🛡️ Reubicando Ayudante de Perforista...',
            }
        }
        if (
            combined.includes('PERFORISTA') ||
            combined.includes('JUMBO') ||
            combined.includes('STOPPER') ||
            combined.includes('BARRENADOR')
        ) {
            return {
                code: 'PERFORISTA',
                label: '⛏️ PERFORISTA',
                bg: '#F43F5E',
                text: '#FFFFFF',
                animText: '⛏️ Perforando cambio de frente...',
            }
        }
        return {
            code: 'GENERAL',
            label: '🔧 SERVICIOS MINA',
            bg: '#10B981',
            text: '#0F172A',
            animText: '⛏️ Moviendo personal operativo...',
        }
    }

    const resolveSupervisorFromData = (
        squad: any,
        metaMap: Record<string, SquadSupervisorMeta>,
        empList: any[],
        usersList: any[]
    ) => {
        const meta = metaMap[squad?.id]
        const joinedSup = Array.isArray(squad?.rh_employees)
            ? squad?.rh_employees[0]
            : squad?.rh_employees
        const joinedSupName = joinedSup
            ? `${joinedSup.first_name || ''} ${joinedSup.last_name || ''}`.trim()
            : ''
        const supEmp =
            empList.find((e) => e.id === (squad?.supervisor_id || meta?.supervisor_employee_id)) || null
        const empName = supEmp ? supEmp.fullName : joinedSupName || meta?.supervisor_employee_name || ''
        const userMatch =
            usersList.find((u) => u.id === meta?.supervisor_user_id) ||
            usersList.find(
                (u) =>
                    meta?.supervisor_user_email &&
                    (u.email || '').toLowerCase() === meta.supervisor_user_email.toLowerCase()
            ) ||
            usersList.find((u) => {
                const cleanSup = (empName || '').toLowerCase().trim()
                const cleanUser = (u.full_name || '').toLowerCase().trim()
                return cleanSup && cleanUser && (cleanUser.includes(cleanSup) || cleanSup.includes(cleanUser))
            }) ||
            null
        return {
            employeeId: supEmp?.id || squad?.supervisor_id || meta?.supervisor_employee_id || null,
            employeeName: empName || userMatch?.full_name || 'Sin Supervisor Asignado',
            userId: userMatch?.id || meta?.supervisor_user_id || null,
            userEmail: userMatch?.email || meta?.supervisor_user_email || null,
        }
    }

    const getSquadSupervisorInfo = (squad: any) =>
        resolveSupervisorFromData(squad, supervisorsMeta, allEmployees, sysUsers)

    const loadSquadsData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true)
        try {
            const [
                sqRes,
                memRes,
                empRes,
                histRes,
                usersRes,
                supMeta,
            ] = await Promise.all([
                supabase
                    .from('cat_cuadrillas')
                    .select('*, cat_turnos(nombre, codigo), mine_sites(nombre_mina), rh_employees(id, first_name, last_name, employee_code)')
                    .eq('activo', true)
                    .order('nombre'),
                supabase
                    .from('cat_cuadrillas_miembros')
                    .select('*'),
                supabase
                    .from('rh_employees')
                    .select('*, cat_puestos(nombre), cat_roles_operativos(nombre)')
                    .order('first_name'),
                supabase
                    .from('sys_config')
                    .select('value_json')
                    .eq('key_name', SQUAD_HISTORY_KEY)
                    .maybeSingle(),
                supabase
                    .from('sys_users')
                    .select('id, email, full_name, role, active')
                    .eq('active', true)
                    .order('full_name'),
                getSquadSupervisorsMeta(),
            ])

            let sqData = sqRes.data
            if (!sqData) {
                const fallbackSq = await supabase
                    .from('cat_cuadrillas')
                    .select('*')
                    .eq('activo', true)
                    .order('nombre')
                sqData = fallbackSq.data || []
            }

            let memData = memRes.data
            if (!memData) {
                const fallbackMem = await supabase.from('cat_cuadrillas_miembros').select('*')
                memData = fallbackMem.data || []
            }

            const empData = empRes.data || []
            const histData = histRes.data
            const usersData = usersRes.data || []

            const activeSquads = sqData || []
            setCuadrillas(activeSquads)
            if (activeSquads.length > 0) {
                setSelectedSquadId((prev) =>
                    prev && activeSquads.some((s: any) => s.id === prev) ? prev : activeSquads[0].id
                )
            }

            const hMap =
                histData?.value_json && typeof histData.value_json === 'object'
                    ? (histData.value_json as Record<string, any>)
                    : {}
            setHistoryLog(hMap)
            setSupervisorsMeta(supMeta || {})
            setSysUsers(usersData || [])

            const empMap = new Map<string, any>()
            const activeEmps: any[] = []
            ;(empData || []).forEach((e: any) => {
                if (e.status !== 'INACTIVE') {
                    const puesto = Array.isArray(e.cat_puestos)
                        ? e.cat_puestos[0]?.nombre
                        : e.cat_puestos?.nombre || 'Operador'
                    const rol = Array.isArray(e.cat_roles_operativos)
                        ? e.cat_roles_operativos[0]?.nombre
                        : e.cat_roles_operativos?.nombre || puesto
                    const enriched = {
                        ...e,
                        fullName: `${e.first_name || ''} ${e.last_name || ''}`.trim(),
                        puestoNombre: puesto,
                        rolNombre: rol,
                        specialty: classifySpecialty(puesto, rol),
                    }
                    empMap.set(e.id, enriched)
                    activeEmps.push(enriched)
                }
            })
            setAllEmployees(activeEmps)

            const assignedSet = new Set<string>()
            const grouped: Record<string, any[]> = {}
            const wSquadMap: Record<string, { squadId: string; squadName: string; supervisorName: string }> = {}
            activeSquads.forEach((s: any) => {
                grouped[s.id] = []
            })

            ;(memData || []).forEach((m: any) => {
                if (m.activo === false) return
                const emp = empMap.get(m.empleado_id)
                const sqObj = activeSquads.find((s: any) => s.id === m.cuadrilla_id)
                if (emp && sqObj && grouped[m.cuadrilla_id] && !assignedSet.has(m.empleado_id)) {
                    assignedSet.add(m.empleado_id)
                    grouped[m.cuadrilla_id].push(emp)
                    const supInfo = resolveSupervisorFromData(sqObj, supMeta || {}, activeEmps, usersData || [])
                    wSquadMap[emp.id] = {
                        squadId: sqObj.id,
                        squadName: sqObj.nombre,
                        supervisorName: supInfo.employeeName,
                    }
                }
            })

            const bench: any[] = []
            empMap.forEach((emp, id) => {
                if (!assignedSet.has(id)) {
                    bench.push(emp)
                }
            })

            setMembersBySquad(grouped)
            setBenchEmployees(bench)
            setWorkerSquadMap(wSquadMap)
        } catch (e) {
            console.warn('Error cargando cuadrillas móviles:', e)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadSquadsData(false)
    }, [loadSquadsData])

    const executeMoveWorker = (worker: any, currentSquadObj: any, targetSquadId: string | 'BENCH') => {
        const targetSquadObj =
            targetSquadId === 'BENCH'
                ? { nombre: 'Banca / Reserva' }
                : cuadrillas.find((c) => c.id === targetSquadId)

        setTransferringTo(targetSquadObj?.nombre || 'Destino')
        transferAnim.setValue(0)

        Animated.timing(transferAnim, {
            toValue: 1,
            duration: 550,
            useNativeDriver: true,
        }).start(async () => {
            try {
                // 1. Eliminar asignación previa para garantizar 0 duplicados
                await supabase
                    .from('cat_cuadrillas_miembros')
                    .delete()
                    .eq('empleado_id', worker.id)

                // 2. Si va a una cuadrilla activa, insertarlo
                if (targetSquadId !== 'BENCH') {
                    await supabase.from('cat_cuadrillas_miembros').insert([
                        {
                            cuadrilla_id: targetSquadId,
                            empleado_id: worker.id,
                        },
                    ])
                }

                // 3. Guardar historial semanal de cuadrilla anterior
                const updatedHistory = {
                    ...historyLog,
                    [worker.id]: {
                        previousSquad: currentSquadObj?.nombre || 'Reserva',
                        currentSquad: targetSquadObj?.nombre || 'Reserva',
                        movedBy: user?.full_name || user?.nickname || sysRole,
                        week: 'Semana 38 (21-27 Sep 2026)',
                        updatedAt: new Date().toISOString(),
                    },
                }
                setHistoryLog(updatedHistory)

                await supabase.from('sys_config').upsert(
                    {
                        key_name: SQUAD_HISTORY_KEY,
                        value_json: updatedHistory,
                        description: 'Historial semanal de movimientos de cuadrillas',
                    },
                    { onConflict: 'key_name' }
                )

                // 4. Notificar al Supervisor Titular afectado si se retiró personal de su cuadrilla
                if (currentSquadObj && currentSquadObj.id !== targetSquadId) {
                    const prevSup = getSquadSupervisorInfo(currentSquadObj)
                    const actorLabel = user?.full_name || user?.nickname || sysRole
                    await pushNotification({
                        type: 'CREW_REMOVED',
                        title: `👷 Cambio en ${currentSquadObj.nombre}`,
                        message: `${actorLabel} reubicó a ${worker.fullName} de ${currentSquadObj.nombre} → ${targetSquadObj?.nombre || 'Reserva'}.`,
                        details: [
                            `Trabajador: ${worker.fullName} (${worker.puestoNombre})`,
                            `Origen: ${currentSquadObj.nombre} (Sup: ${prevSup.employeeName})`,
                            `Destino: ${targetSquadObj?.nombre || 'Reserva'}`,
                        ],
                        target_employee_id: prevSup.employeeId,
                        target_employee_name: prevSup.employeeName,
                        target_user_ids: prevSup.userId ? [prevSup.userId] : [],
                        target_user_emails: prevSup.userEmail ? [prevSup.userEmail] : [],
                        target_roles: ['JEFE_MINA', 'SUPER_ADMIN'],
                        created_by_name: actorLabel,
                        created_by_email: user?.email || null,
                        link: '/dashboard/catalogos/cuadrillas',
                    })
                }

                setSelectedWorker(null)
                setTransferringTo(null)
                await loadSquadsData(true)
            } catch (err: any) {
                setTransferringTo(null)
                Alert.alert('Error', err?.message || 'No se pudo completar el movimiento.')
            }
        })
    }

    const handleMoveWorker = (worker: any, targetSquadId: string | 'BENCH') => {
        if (!canMoveSquads) {
            Alert.alert(
                'Permiso Restringido',
                'Por regla jerárquica, solo Superintendente, Gerente, Jefe de Mina o Dirección Operativa pueden mover personal entre cuadrillas.'
            )
            return
        }

        const currentSquadObj = cuadrillas.find((c) =>
            (membersBySquad[c.id] || []).some((m) => m.id === worker.id)
        )
        if (currentSquadObj && currentSquadObj.id === targetSquadId) {
            Alert.alert('Sin Cambios', `${worker.fullName} ya pertenece a ${currentSquadObj.nombre}.`)
            return
        }

        if (currentSquadObj) {
            const supInfo = getSquadSupervisorInfo(currentSquadObj)
            const targetLabel =
                targetSquadId === 'BENCH'
                    ? 'Banca / Reserva'
                    : cuadrillas.find((c) => c.id === targetSquadId)?.nombre || 'Destino'
            Alert.alert(
                'Confirmar Reubicación de Personal',
                `${worker.fullName} actualmente está en ${currentSquadObj.nombre} (Supervisor: ${supInfo.employeeName}).\n\n¿Mover a "${targetLabel}"? Se notificará automáticamente al supervisor titular.`,
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Confirmar y Notificar',
                        onPress: () => executeMoveWorker(worker, currentSquadObj, targetSquadId),
                    },
                ]
            )
            return
        }

        executeMoveWorker(worker, null, targetSquadId)
    }

    const handleAssignSquadSupervisor = async (squad: any, supEmp: any | null, supUser: any | null) => {
        if (!squad) return
        setSavingSupervisor(true)
        try {
            if (supEmp?.id) {
                await supabase
                    .from('cat_cuadrillas')
                    .update({ supervisor_id: supEmp.id })
                    .eq('id', squad.id)
            }
            await saveSquadSupervisorMeta(squad.id, {
                supervisor_employee_id: supEmp?.id || null,
                supervisor_employee_name: supEmp?.fullName || supUser?.full_name || null,
                supervisor_user_id: supUser?.id || null,
                supervisor_user_email: supUser?.email || null,
                supervisor_user_name: supUser?.full_name || null,
            })
            setSupervisorModalOpen(false)
            await loadSquadsData(true)
        } catch (err: any) {
            Alert.alert('Error', err?.message || 'No se pudo asignar el supervisor titular.')
        } finally {
            setSavingSupervisor(false)
        }
    }

    const activeSquad = cuadrillas.find((c) => c.id === selectedSquadId) || cuadrillas[0]
    const currentMembers = activeSquad ? membersBySquad[activeSquad.id] || [] : []
    const activeSupervisor = activeSquad ? getSquadSupervisorInfo(activeSquad) : null
    const selectedWorkerCurrent = selectedWorker ? workerSquadMap[selectedWorker.id] : null

    const supervisorCandidatesEmp = allEmployees.filter((e) => {
        const txt = `${e.puestoNombre} ${e.rolNombre}`.toUpperCase()
        return txt.includes('SUPERV') || txt.includes('JEFE') || txt.includes('CAPIT') || txt.includes('SUPERINT')
    })

    return (
        <MobileShell
            title="Pizarra Táctica de Cuadrillas"
            pillar="3. Operación Mina (Campo)"
            pillarHex="#10B981"
        >
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={{ paddingBottom: 36 }}
                showsVerticalScrollIndicator={false}
            >
                {/* BANNER DE REGLA JERÁRQUICA */}
                <View
                    style={[
                        styles.ruleBanner,
                        {
                            backgroundColor: canMoveSquads ? '#10B98118' : '#F59E0B18',
                            borderColor: canMoveSquads ? '#10B981' : '#F59E0B',
                        },
                    ]}
                >
                    {canMoveSquads ? (
                        <CheckCircle2 size={18} color="#10B981" />
                    ) : (
                        <Lock size={18} color="#D97706" />
                    )}
                    <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[styles.ruleTitle, { color: textPrimary }]}>
                            {canMoveSquads
                                ? `Modo Táctico Activo (${sysRole}): Toca cualquier minero para moverlo de cuadrilla`
                                : `Modo Consulta (${sysRole}): Solo Superintendente y Gerente pueden mover cuadrillas`}
                        </Text>
                        <Text style={[styles.ruleSub, { color: textSecondary }]}>
                            Regla anti-duplicados activa • Historial Semanal Semana 38 sincronizado
                        </Text>
                    </View>
                </View>

                {/* SELECTOR HORIZONTAL DE LAS 5 CUADRILLAS */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.squadTabsScroll}
                >
                    {cuadrillas.map((sq) => {
                        const isSelected = activeSquad?.id === sq.id
                        const count = (membersBySquad[sq.id] || []).length
                        return (
                            <TouchableOpacity
                                key={sq.id}
                                onPress={() => setSelectedSquadId(sq.id)}
                                style={[
                                    styles.squadTab,
                                    {
                                        backgroundColor: isSelected ? '#10B981' : bgCard,
                                        borderColor: isSelected ? '#059669' : borderCol,
                                    },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.squadTabName,
                                        { color: isSelected ? '#022C22' : textPrimary },
                                    ]}
                                >
                                    {sq.nombre}
                                </Text>
                                <View
                                    style={[
                                        styles.squadCountPill,
                                        {
                                            backgroundColor: isSelected
                                                ? '#022C22'
                                                : '#10B98120',
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.squadCountText,
                                            { color: isSelected ? '#34D399' : '#10B981' },
                                        ]}
                                    >
                                        {count} mineros
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )
                    })}
                </ScrollView>

                {loading ? (
                    <View style={{ paddingVertical: 50, alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#10B981" />
                        <Text style={{ color: textSecondary, marginTop: 10, fontWeight: '700' }}>
                            Cargando formación táctica de Semana 38...
                        </Text>
                    </View>
                ) : (
                    <>
                        {/* CANCHA TÁCTICA DE LA CUADRILLA SELECCIONADA */}
                        <View style={[styles.pitchContainer, { backgroundColor: bgPitch }]}>
                            {/* Líneas de Cancha */}
                            <View style={styles.pitchHeader}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={styles.pitchTitle}>
                                        ⚽ CANCHA TÁCTICA: {activeSquad?.nombre || 'CUADRILLA'}
                                    </Text>
                                    <Text style={styles.pitchSub}>
                                        Semana 38 • {currentMembers.length} Integrantes Asignados
                                    </Text>
                                </View>
                                <View style={styles.pitchBadge}>
                                    <Text style={styles.pitchBadgeText}>EN TURNO</Text>
                                </View>
                            </View>

                            {/* Supervisor Titular de esta Cuadrilla */}
                            <View style={styles.supBannerRow}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 }}>
                                    <UserCheck size={15} color="#34D399" />
                                    <Text style={styles.supBannerText} numberOfLines={2}>
                                        Supervisor Titular:{' '}
                                        <Text style={{ fontWeight: '900', color: '#FFFFFF' }}>
                                            {activeSupervisor?.employeeName || 'Sin Supervisor Asignado'}
                                        </Text>
                                    </Text>
                                </View>
                                {canMoveSquads && activeSquad && (
                                    <TouchableOpacity
                                        onPress={() => setSupervisorModalOpen(true)}
                                        style={styles.supChangeBtn}
                                    >
                                        <Text style={styles.supChangeBtnText}>Cambiar</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {currentMembers.length === 0 ? (
                                <View style={styles.emptyPitch}>
                                    <Text style={styles.emptyPitchText}>
                                        Sin jugadores asignados en esta cuadrilla.
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.playersGrid}>
                                    {currentMembers.map((emp: any) => {
                                        const hist = historyLog[emp.id]
                                        const curSq = workerSquadMap[emp.id]
                                        return (
                                            <TouchableOpacity
                                                key={emp.id}
                                                onPress={() => setSelectedWorker(emp)}
                                                activeOpacity={0.85}
                                                style={[
                                                    styles.playerCard,
                                                    { width: playerColWidth as any },
                                                ]}
                                            >
                                                {/* Etiqueta de Especialidad Animada (Perforista / Ayudante / Scoop) */}
                                                <View
                                                    style={[
                                                        styles.specialtyPill,
                                                        { backgroundColor: emp.specialty.bg },
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.specialtyText,
                                                            { color: emp.specialty.text },
                                                        ]}
                                                    >
                                                        {emp.specialty.label}
                                                    </Text>
                                                </View>

                                                <Text style={styles.playerName} numberOfLines={2}>
                                                    {emp.fullName}
                                                </Text>
                                                <Text style={styles.playerPuesto} numberOfLines={1}>
                                                    {emp.puestoNombre}
                                                </Text>

                                                {hist?.previousSquad && (
                                                    <View style={styles.historyTag}>
                                                        <History size={10} color="#FBBF24" />
                                                        <Text
                                                            style={styles.historyTagText}
                                                            numberOfLines={1}
                                                        >
                                                            Ant: {hist.previousSquad}
                                                        </Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        )
                                    })}
                                </View>
                            )}
                        </View>

                        {/* BANCA DE RESERVA / PERSONAL DISPONIBLE PARA INSERTAR */}
                        <View
                            style={[
                                styles.benchSection,
                                { backgroundColor: bgCard, borderColor: borderCol },
                            ]}
                        >
                            <View style={styles.benchHeader}>
                                <Users size={18} color="#F59E0B" />
                                <Text style={[styles.benchTitle, { color: textPrimary }]}>
                                    Banca / Personal Disponible ({benchEmployees.length})
                                </Text>
                            </View>
                            <Text style={[styles.benchSub, { color: textSecondary }]}>
                                Toca cualquier trabajador de la banca para insertarlo en una cuadrilla sin duplicar:
                            </Text>

                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={{ marginTop: 10 }}
                            >
                                {benchEmployees.slice(0, 25).map((emp) => (
                                    <TouchableOpacity
                                        key={emp.id}
                                        onPress={() => setSelectedWorker(emp)}
                                        style={[
                                            styles.benchCard,
                                            {
                                                backgroundColor: isLight ? '#F8FAFC' : '#1E293B',
                                                borderColor: borderCol,
                                            },
                                        ]}
                                    >
                                        <View
                                            style={[
                                                styles.specialtyPill,
                                                { backgroundColor: emp.specialty.bg },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.specialtyText,
                                                    { color: emp.specialty.text },
                                                ]}
                                            >
                                                {emp.specialty.label}
                                            </Text>
                                        </View>
                                        <Text
                                            style={[styles.benchName, { color: textPrimary }]}
                                            numberOfLines={2}
                                        >
                                            {emp.fullName}
                                        </Text>
                                        <Text
                                            style={[styles.benchRole, { color: textSecondary }]}
                                            numberOfLines={1}
                                        >
                                            {emp.puestoNombre}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </>
                )}
            </ScrollView>

            {/* MODAL TÁCTICO DE REASIGNACIÓN CON ANIMACIÓN DE ESPECIALIDAD */}
            <Modal visible={Boolean(selectedWorker)} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View
                        style={[
                            styles.modalCard,
                            {
                                backgroundColor: bgCard,
                                borderColor: borderCol,
                                maxHeight: screenHeight * 0.86,
                                maxWidth: isTablet ? modalMaxWidth : '100%',
                                width: '100%',
                                alignSelf: 'center',
                                paddingBottom: Math.max(insets.bottom + 14, 24),
                            },
                        ]}
                    >
                        {selectedWorker && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.modalHeader}>
                                    <View style={{ flex: 1 }}>
                                        <View
                                            style={[
                                                styles.specialtyPill,
                                                {
                                                    backgroundColor: selectedWorker.specialty.bg,
                                                    alignSelf: 'flex-start',
                                                    marginBottom: 6,
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.specialtyText,
                                                    { color: selectedWorker.specialty.text },
                                                ]}
                                            >
                                                {selectedWorker.specialty.label}
                                            </Text>
                                        </View>
                                        <Text style={[styles.modalTitle, { color: textPrimary }]}>
                                            {selectedWorker.fullName}
                                        </Text>
                                        <Text style={[styles.modalSub, { color: textSecondary }]}>
                                            Puesto Oficial: {selectedWorker.puestoNombre} • Código:{' '}
                                            {selectedWorker.employee_code}
                                        </Text>
                                        {selectedWorkerCurrent && (
                                            <Text style={[styles.modalSub, { color: '#059669', fontWeight: '800', marginTop: 4 }]}>
                                                Asignación Actual: {selectedWorkerCurrent.squadName} • Sup: {selectedWorkerCurrent.supervisorName}
                                            </Text>
                                        )}
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setSelectedWorker(null)}
                                        style={styles.closeModalBtn}
                                    >
                                        <X size={18} color={textPrimary} />
                                    </TouchableOpacity>
                                </View>

                                {/* Historial Semanal del Trabajador */}
                                <View style={styles.historyBox}>
                                    <History size={16} color="#D97706" />
                                    <View style={{ flex: 1, marginLeft: 8 }}>
                                        <Text style={styles.historyBoxTitle}>
                                            HISTORIAL SEMANA 38 (21-27 SEP 2026)
                                        </Text>
                                        <Text style={styles.historyBoxDesc}>
                                            {historyLog[selectedWorker.id]
                                                ? `Cuadrilla Anterior: ${historyLog[selectedWorker.id].previousSquad} → Actual: ${historyLog[selectedWorker.id].currentSquad} (Movido por ${historyLog[selectedWorker.id].movedBy})`
                                                : 'Asignación base de inicio de Semana 38 sin cambios registrados.'}
                                        </Text>
                                    </View>
                                </View>

                                {transferringTo ? (
                                    <Animated.View
                                        style={[
                                            styles.animTransferBox,
                                            {
                                                transform: [
                                                    {
                                                        translateX: transferAnim.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [-30, 30],
                                                        }),
                                                    },
                                                ],
                                            },
                                        ]}
                                    >
                                        <Text style={styles.animTransferTitle}>
                                            {selectedWorker.specialty.animText}
                                        </Text>
                                        <Text style={styles.animTransferSub}>
                                            Destino: {transferringTo} • Guardando en Supabase...
                                        </Text>
                                    </Animated.View>
                                ) : canMoveSquads ? (
                                    <>
                                        <Text
                                            style={[
                                                styles.transferSectionTitle,
                                                { color: textPrimary },
                                            ]}
                                        >
                                            Selecciona Cuadrilla Destino (Traspaso Directo):
                                        </Text>
                                        <View style={styles.targetGrid}>
                                            {cuadrillas.map((sq) => {
                                                const sqSup = getSquadSupervisorInfo(sq)
                                                const isHere = selectedWorkerCurrent?.squadId === sq.id
                                                return (
                                                    <TouchableOpacity
                                                        key={sq.id}
                                                        disabled={isHere}
                                                        onPress={() =>
                                                            handleMoveWorker(selectedWorker, sq.id)
                                                        }
                                                        style={[
                                                            styles.targetSquadBtn,
                                                            isHere && { opacity: 0.45, borderColor: '#64748B' },
                                                        ]}
                                                    >
                                                        <UserPlus size={15} color="#10B981" />
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={styles.targetSquadText} numberOfLines={1}>
                                                                {sq.nombre}
                                                            </Text>
                                                            <Text style={{ color: '#A7F3D0', fontSize: 9, fontWeight: '700' }} numberOfLines={1}>
                                                                Sup: {sqSup.employeeName}
                                                            </Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                )
                                            })}

                                            <TouchableOpacity
                                                onPress={() =>
                                                    handleMoveWorker(selectedWorker, 'BENCH')
                                                }
                                                style={styles.targetBenchBtn}
                                            >
                                                <UserMinus size={16} color="#F43F5E" />
                                                <Text style={styles.targetBenchText}>
                                                    Enviar a Banca / Quitar de Cuadrilla
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                ) : (
                                    <View style={styles.restrictedNotice}>
                                        <Lock size={18} color="#E11D48" />
                                        <Text style={styles.restrictedNoticeText}>
                                            Tu perfil ({sysRole}) es de consulta en cuadrillas. Solo Superintendente, Gerente, Jefe de Mina o Dirección Operativa pueden mover trabajadores.
                                        </Text>
                                    </View>
                                )}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* MODAL PARA ASIGNAR SUPERVISOR TITULAR DE LA CUADRILLA */}
            <Modal visible={supervisorModalOpen} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View
                        style={[
                            styles.modalCard,
                            {
                                backgroundColor: bgCard,
                                borderColor: '#10B981',
                                maxHeight: screenHeight * 0.8,
                                maxWidth: isTablet ? modalMaxWidth : '100%',
                                width: '100%',
                                alignSelf: 'center',
                                paddingBottom: Math.max(insets.bottom + 14, 24),
                            },
                        ]}
                    >
                        <View style={styles.modalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.modalTitle, { color: textPrimary }]}>
                                    Supervisor Titular ({activeSquad?.nombre})
                                </Text>
                                <Text style={[styles.modalSub, { color: textSecondary }]}>
                                    Selecciona al supervisor de campo y/o usuario web encargado de esta cuadrilla:
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setSupervisorModalOpen(false)}
                                style={styles.closeModalBtn}
                            >
                                <X size={18} color={textPrimary} />
                            </TouchableOpacity>
                        </View>

                        {savingSupervisor ? (
                            <ActivityIndicator size="large" color="#10B981" style={{ marginVertical: 20 }} />
                        ) : (
                            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: screenHeight * 0.52 }}>
                                {(supervisorCandidatesEmp.length > 0 ? supervisorCandidatesEmp : allEmployees.slice(0, 20)).map(
                                    (emp) => {
                                        const matchedUser = sysUsers.find((u) => {
                                            const a = (emp.fullName || '').toLowerCase()
                                            const b = (u.full_name || '').toLowerCase()
                                            return a && b && (b.includes(a) || a.includes(b))
                                        })
                                        return (
                                            <TouchableOpacity
                                                key={emp.id}
                                                onPress={() =>
                                                    handleAssignSquadSupervisor(activeSquad, emp, matchedUser || null)
                                                }
                                                style={{
                                                    padding: 12,
                                                    borderRadius: 12,
                                                    borderWidth: 1,
                                                    borderColor: borderCol,
                                                    marginBottom: 8,
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                }}
                                            >
                                                <View style={{ flex: 1, marginRight: 8 }}>
                                                    <Text style={{ color: textPrimary, fontWeight: '900', fontSize: 13 }}>
                                                        {emp.fullName}
                                                    </Text>
                                                    <Text style={{ color: textSecondary, fontSize: 10 }}>
                                                        {emp.puestoNombre} {matchedUser ? `• ${matchedUser.email}` : ''}
                                                    </Text>
                                                </View>
                                                <UserCheck size={16} color="#10B981" />
                                            </TouchableOpacity>
                                        )
                                    }
                                )}
                                {sysUsers
                                    .filter((u) => (u.role || '').toUpperCase().includes('SUPERV') || (u.role || '').toUpperCase().includes('JEFE'))
                                    .map((u) => (
                                        <TouchableOpacity
                                            key={u.id}
                                            onPress={() => handleAssignSquadSupervisor(activeSquad, null, u)}
                                            style={{
                                                padding: 12,
                                                borderRadius: 12,
                                                borderWidth: 1,
                                                borderColor: '#3B82F680',
                                                marginBottom: 8,
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <View style={{ flex: 1, marginRight: 8 }}>
                                                <Text style={{ color: textPrimary, fontWeight: '900', fontSize: 13 }}>
                                                    {u.full_name} ({u.role})
                                                </Text>
                                                <Text style={{ color: textSecondary, fontSize: 10 }}>
                                                    Usuario Web/APK: {u.email}
                                                </Text>
                                            </View>
                                            <Shield size={16} color="#3B82F6" />
                                        </TouchableOpacity>
                                    ))}
                            </ScrollView>
                        )}
                    </View>
                </View>
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
    ruleBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1.5,
        marginBottom: 12,
    },
    ruleTitle: {
        fontSize: 12,
        fontWeight: '900',
    },
    ruleSub: {
        fontSize: 10,
        marginTop: 2,
    },
    squadTabsScroll: {
        marginBottom: 14,
    },
    squadTab: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1.5,
        marginRight: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    squadTabName: {
        fontSize: 13,
        fontWeight: '900',
    },
    squadCountPill: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 8,
    },
    squadCountText: {
        fontSize: 10,
        fontWeight: '900',
    },
    pitchContainer: {
        borderRadius: 22,
        padding: 14,
        borderWidth: 2,
        borderColor: '#10B981',
        marginBottom: 16,
    },
    pitchHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.18)',
        paddingBottom: 10,
        marginBottom: 12,
    },
    pitchTitle: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '900',
    },
    pitchSub: {
        color: '#A7F3D0',
        fontSize: 11,
        fontWeight: '700',
        marginTop: 2,
    },
    pitchBadge: {
        backgroundColor: '#10B981',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    pitchBadgeText: {
        color: '#022C22',
        fontSize: 9,
        fontWeight: '900',
    },
    emptyPitch: {
        paddingVertical: 30,
        alignItems: 'center',
    },
    emptyPitchText: {
        color: '#A7F3D0',
        fontSize: 12,
        fontWeight: '700',
    },
    playersGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    playerCard: {
        width: '48.5%',
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        borderRadius: 16,
        padding: 11,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    specialtyPill: {
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginBottom: 6,
    },
    specialtyText: {
        fontSize: 9,
        fontWeight: '900',
    },
    playerName: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '900',
        lineHeight: 16,
    },
    playerPuesto: {
        color: '#94A3B8',
        fontSize: 10,
        fontWeight: '700',
        marginTop: 3,
    },
    historyTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.18)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
        marginTop: 6,
        gap: 4,
    },
    historyTagText: {
        color: '#FBBF24',
        fontSize: 9,
        fontWeight: '800',
    },
    benchSection: {
        borderRadius: 18,
        borderWidth: 1.5,
        padding: 14,
    },
    benchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    benchTitle: {
        fontSize: 14,
        fontWeight: '900',
    },
    benchSub: {
        fontSize: 11,
        marginTop: 3,
    },
    benchCard: {
        width: 145,
        padding: 10,
        borderRadius: 14,
        borderWidth: 1,
        marginRight: 8,
    },
    benchName: {
        fontSize: 12,
        fontWeight: '800',
    },
    benchRole: {
        fontSize: 10,
        marginTop: 2,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(2, 6, 23, 0.72)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        borderTopLeftRadius: 26,
        borderTopRightRadius: 26,
        borderTopWidth: 2,
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 14,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '900',
    },
    modalSub: {
        fontSize: 11,
        marginTop: 2,
    },
    closeModalBtn: {
        padding: 8,
        borderRadius: 10,
        backgroundColor: '#E2E8F030',
    },
    historyBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        borderColor: '#F59E0B',
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        marginBottom: 16,
    },
    historyBoxTitle: {
        color: '#92400E',
        fontSize: 10,
        fontWeight: '900',
    },
    historyBoxDesc: {
        color: '#78350F',
        fontSize: 11,
        fontWeight: '700',
        marginTop: 2,
    },
    animTransferBox: {
        backgroundColor: '#064E3B',
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginVertical: 14,
        borderWidth: 1.5,
        borderColor: '#10B981',
    },
    animTransferTitle: {
        color: '#34D399',
        fontSize: 14,
        fontWeight: '900',
    },
    animTransferSub: {
        color: '#FFFFFF',
        fontSize: 11,
        marginTop: 4,
        fontWeight: '700',
    },
    transferSectionTitle: {
        fontSize: 13,
        fontWeight: '900',
        marginBottom: 10,
    },
    targetGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    supBannerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(6, 78, 59, 0.72)',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(52, 211, 153, 0.35)',
        gap: 8,
    },
    supBannerText: {
        color: '#D1FAE5',
        fontSize: 11,
        fontWeight: '700',
        flex: 1,
    },
    supChangeBtn: {
        backgroundColor: '#10B981',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    supChangeBtnText: {
        color: '#022C22',
        fontSize: 10,
        fontWeight: '900',
    },
    targetSquadBtn: {
        width: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#064E3B',
        borderColor: '#10B981',
        borderWidth: 1.5,
        padding: 12,
        borderRadius: 12,
        gap: 8,
    },
    targetSquadText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '900',
    },
    targetBenchBtn: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFE4E6',
        borderColor: '#F43F5E',
        borderWidth: 1.5,
        padding: 12,
        borderRadius: 12,
        marginTop: 4,
        gap: 8,
    },
    targetBenchText: {
        color: '#E11D48',
        fontSize: 12,
        fontWeight: '900',
    },
    restrictedNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFE4E6',
        padding: 14,
        borderRadius: 14,
        gap: 10,
    },
    restrictedNoticeText: {
        flex: 1,
        color: '#9F1239',
        fontSize: 11,
        fontWeight: '700',
    },
})
