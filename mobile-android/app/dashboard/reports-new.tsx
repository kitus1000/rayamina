import React, { useState, useEffect } from 'react'
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    StyleSheet,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
    Calendar as CalendarIcon,
    Users,
    Pickaxe,
    Clock,
    Save,
    ChevronRight,
    ChevronLeft,
    X,
    Plus,
    Trash2,
    ShieldAlert,
} from 'lucide-react-native'
import { supabase } from '../../lib/supabase'
import { useMobileAuth } from '../../lib/auth-context'
import { useResponsiveLayout } from '../../lib/responsive'
import {
    getSquadSupervisorsMeta,
    saveReportCreatorMeta,
    appendReportRevision,
    pushNotification,
} from '../../lib/notifications-service'
import MobileShell from '../../components/MobileShell'

type WizardStep = 'HEADER' | 'ATTENDANCE' | 'ACTIVITIES' | 'SUMMARY'

type AttendanceItem = {
    empleado_id: string
    nombre: string
    codigo_empleado: string
    rol_default_id: string | null
    rol_nombre_default: string
    rol_dia_id: string | null
    asistencia_id: string
    estado_codigo: string
    horas_extra?: number
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

export default function NewReportWizard() {
    const router = useRouter()
    const { user, sysRole, theme } = useMobileAuth()
    const insets = useSafeAreaInsets()
    const { height: screenHeight, isTablet, modalMaxWidth } = useResponsiveLayout()
    const [currentStep, setCurrentStep] = useState<WizardStep>('HEADER')
    const [loading, setLoading] = useState(false)

    // Catálogos
    const [turnos, setTurnos] = useState<any[]>([])
    const [cuadrillas, setCuadrillas] = useState<any[]>([])
    const [minas, setMinas] = useState<any[]>([])
    const [ubicaciones, setUbicaciones] = useState<any[]>([])
    const [products, setProducts] = useState<any[]>([])
    const [equipments, setEquipments] = useState<any[]>([])
    const [asistenciasCatalog, setAsistenciasCatalog] = useState<any[]>([])

    // Paso 1: Datos Generales
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
    const [selectedTurno, setSelectedTurno] = useState<string>('')
    const [selectedCuadrilla, setSelectedCuadrilla] = useState<string>('')
    const [selectedMina, setSelectedMina] = useState<string>('')
    const [supervisorComments, setSupervisorComments] = useState('')

    // Paso 2 y 3: Asistencia y Actividades
    const [attendanceList, setAttendanceList] = useState<AttendanceItem[]>([])
    const [activities, setActivities] = useState<ActivityItem[]>([])

    // Paso 4: Alerta rápida de Seguridad / Personal Problemático opcional
    const [hasSecurityEvent, setHasSecurityEvent] = useState(false)
    const [secTipo, setSecTipo] = useState<'ACCIDENTE' | 'CONDICION_INSEGURA' | 'PERSONAL_PROBLEMATICO'>('CONDICION_INSEGURA')
    const [secDesc, setSecDesc] = useState('')

    // Modal de Nueva Actividad
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [currentActivity, setCurrentActivity] = useState<Partial<ActivityItem>>({})
    const [qtyText, setQtyText] = useState('')

    const isLight = theme === 'light'
    const bgCard = isLight ? '#FFFFFF' : '#0F172A'
    const bgInput = isLight ? '#FEFCE8' : '#020617'
    const borderCol = isLight ? '#CBD5E1' : '#1E293B'
    const textPrimary = isLight ? '#0F172A' : '#F8FAFC'
    const textSecondary = isLight ? '#475569' : '#94A3B8'

    useEffect(() => {
        loadCatalogs()
    }, [])

    const loadCatalogs = async () => {
        setLoading(true)
        try {
            const [
                { data: dTurnos },
                { data: dCuadrillas },
                { data: dMinas },
                { data: dAsist },
                { data: dProds },
                { data: dEquips },
            ] = await Promise.all([
                supabase.from('cat_turnos').select('*').eq('activo', true).order('codigo'),
                supabase.from('cat_cuadrillas').select('*').eq('activo', true).order('nombre'),
                supabase.from('mine_sites').select('*'),
                supabase.from('cat_asistencias').select('*').eq('activo', true).order('orden'),
                supabase.from('cat_productos_mina').select('*, cat_producto_variables(*)').eq('activo', true).order('nombre'),
                supabase.from('ops_equipment').select('*').order('clave'),
            ])

            if (dTurnos && dTurnos.length > 0) {
                setTurnos(dTurnos)
                setSelectedTurno(dTurnos[0].id)
            }
            if (dCuadrillas && dCuadrillas.length > 0) {
                setCuadrillas(dCuadrillas)
                setSelectedCuadrilla(dCuadrillas[0].id)
            }
            if (dMinas && dMinas.length > 0) {
                setMinas(dMinas)
                setSelectedMina(dMinas[0].id)
            }
            if (dAsist) setAsistenciasCatalog(dAsist)
            if (dProds) setProducts(dProds)
            if (dEquips) setEquipments(dEquips)
        } catch (err) {
            console.warn('Error cargando catálogos en asistente móvil:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!selectedMina) return
        supabase
            .from('mine_locations')
            .select('*')
            .eq('mine_site_id', selectedMina)
            .eq('activo', true)
            .then(({ data }) => {
                if (data) setUbicaciones(data)
            })
    }, [selectedMina])

    const loadSquadMembers = async () => {
        if (!selectedCuadrilla) return
        setLoading(true)
        try {
            const { data } = await supabase
                .from('cat_cuadrillas_miembros')
                .select(
                    `
                    *,
                    rh_employees (
                        *,
                        cat_roles_operativos ( id, nombre )
                    )
                `
                )
                .eq('cuadrilla_id', selectedCuadrilla)

            const defaultAsist =
                asistenciasCatalog.find((a) => a.codigo === 'X' || a.codigo === 'ASISTENCIA' || a.codigo === 'A') ||
                asistenciasCatalog[0]

            if (data && defaultAsist) {
                const uniqueMap = new Map<string, any>()
                data.forEach((item: any) => {
                    const emp = Array.isArray(item.rh_employees)
                        ? item.rh_employees[0]
                        : item.rh_employees
                    if (emp && !uniqueMap.has(item.empleado_id)) {
                        const rolObj = Array.isArray(emp.cat_roles_operativos)
                            ? emp.cat_roles_operativos[0]
                            : emp.cat_roles_operativos
                        const rId =
                            item.rol_operativo_id ||
                            emp.role_id ||
                            emp.rol_operativo_default_id ||
                            null

                        uniqueMap.set(item.empleado_id, {
                            empleado_id: item.empleado_id,
                            nombre: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
                            codigo_empleado: emp.employee_code || 'S/C',
                            rol_default_id: rId,
                            rol_nombre_default: rolObj?.nombre || 'Operador Mina',
                            rol_dia_id: rId,
                            asistencia_id: defaultAsist.id,
                            estado_codigo: defaultAsist.codigo,
                            horas_extra: ['X', 'ASISTENCIA', 'DX', 'DOX'].includes(defaultAsist.codigo) ? 4 : 0,
                        })
                    }
                })
                setAttendanceList(Array.from(uniqueMap.values()))
            }
        } catch (err) {
            console.warn('Error cargando integrantes de cuadrilla:', err)
        } finally {
            setLoading(false)
        }
    }

    const openActivityModal = () => {
        const firstProd = products[0]
        const firstLoc = ubicaciones[0]
        const presentIds = attendanceList
            .filter((a) => ['X', 'ASISTENCIA', 'A', 'DX', 'DOX'].includes(a.estado_codigo))
            .map((a) => a.empleado_id)

        setCurrentActivity({
            temp_id: 'act-' + Date.now(),
            producto_id: firstProd?.id || '',
            producto_nombre: firstProd?.nombre || '',
            unidad: firstProd?.unidad_medida_default || 'und',
            location_id: firstLoc?.id || '',
            location_nombre: firstLoc?.nombre || '',
            equipo_id: undefined,
            equipo_nombre: undefined,
            cantidad_total: 0,
            variables: {},
            participantes: presentIds.slice(0, 2),
        })
        setQtyText('')
        setIsModalOpen(true)
    }

    const saveActivity = () => {
        const qty = parseFloat(qtyText)
        if (!currentActivity.producto_id || !currentActivity.location_id || !qty || qty <= 0) {
            Alert.alert('Datos incompletos', 'Selecciona Concepto, Frente de trabajo y una Cantidad válida.')
            return
        }
        setActivities([
            ...activities,
            {
                ...(currentActivity as ActivityItem),
                cantidad_total: qty,
            },
        ])
        setIsModalOpen(false)
    }

    const submitReportToSupabase = async () => {
        setLoading(true)
        try {
            const squadRow = cuadrillas.find((c) => c.id === selectedCuadrilla)
            const supMetaMap = await getSquadSupervisorsMeta()
            const squadSupMeta = supMetaMap[selectedCuadrilla]
            const resolvedSupId = squadRow?.supervisor_id || squadSupMeta?.supervisor_employee_id || null

            // 1. Insertar Reporte Diario Maestro
            const { data: repData, error: repError } = await supabase
                .from('ops_daily_reports')
                .insert([
                    {
                        fecha,
                        turno_id: selectedTurno,
                        cuadrilla_id: selectedCuadrilla,
                        mine_site_id: selectedMina,
                        supervisor_id: resolvedSupId,
                        estado: 'EN_REVISION',
                        status: 'EN_REVISION',
                        observaciones_generales: supervisorComments,
                        comentarios_supervisor: supervisorComments,
                    },
                ])
                .select()
                .single()

            if (repError) throw repError
            const reportId = repData.id

            // 2. Insertar Pase de Lista (ops_daily_attendance)
            if (attendanceList.length > 0) {
                const attPayload = attendanceList.map((item) => {
                    const working = ['X', 'ASISTENCIA', 'DX', 'DOX'].includes(item.estado_codigo)
                    return {
                        report_id: reportId,
                        empleado_id: item.empleado_id,
                        asistencia_tipo_id: item.asistencia_id,
                        asistencia_id: item.asistencia_id,
                        rol_asignado_id: item.rol_dia_id,
                        rol_dia_id: item.rol_dia_id,
                        horas_trabajadas: working ? 8 + Math.max(0, Number(item.horas_extra) || 0) : 0,
                        observaciones: '',
                        observacion: '',
                    }
                })
                const { error: attError } = await supabase
                    .from('ops_daily_attendance')
                    .insert(attPayload)
                if (attError) throw attError
            }

            // 3. Insertar Actividades y Participantes (ops_report_items + ops_report_personnel)
            for (const act of activities) {
                const { data: itemData, error: itemErr } = await supabase
                    .from('ops_report_items')
                    .insert([
                        {
                            report_id: reportId,
                            producto_id: act.producto_id,
                            location_id: act.location_id,
                            equipo_id: act.equipo_id || null,
                            cantidad_total: act.cantidad_total,
                            variables_capturadas: act.variables || {},
                            variables_json: act.variables || {},
                        },
                    ])
                    .select()
                    .single()

                if (itemErr) throw itemErr

                if (act.participantes && act.participantes.length > 0) {
                    const pct = Number((100 / act.participantes.length).toFixed(2))
                    const persPayload = act.participantes.map((empId) => ({
                        report_item_id: itemData.id,
                        item_id: itemData.id,
                        empleado_id: empId,
                        porcentaje_participacion: pct,
                    }))
                    const { error: persErr } = await supabase
                        .from('ops_report_personnel')
                        .insert(persPayload)
                    if (persErr) throw persErr
                }
            }

            // 4. Si se reportó incidente de seguridad o personal problemático, sincronizarlo
            if (hasSecurityEvent && secDesc.trim()) {
                const { data: secStore } = await supabase
                    .from('sys_config')
                    .select('value_json')
                    .eq('key_name', 'ops_security_incidents_store')
                    .maybeSingle()

                const currentSec = Array.isArray(secStore?.value_json) ? secStore.value_json : []
                const cuadObj = cuadrillas.find((c) => c.id === selectedCuadrilla)
                const turnoObj = turnos.find((t) => t.id === selectedTurno)

                const newSec = {
                    id: 'inc-rep-' + Date.now(),
                    report_id: reportId,
                    fecha,
                    turno: turnoObj?.nombre || 'TURNO',
                    cuadrilla: cuadObj?.nombre || 'CUADRILLA',
                    mina: 'EL HERRERO',
                    tipo: secTipo,
                    severidad: 'ALTA',
                    involucrado: cuadObj?.nombre || 'En Turno',
                    descripcion: secDesc.trim(),
                    autor: `${user?.nickname || 'Supervisor'} (${sysRole})`,
                    created_at: new Date().toISOString(),
                }

                await supabase.from('sys_config').upsert(
                    {
                        key_name: 'ops_security_incidents_store',
                        value_json: [newSec, ...currentSec],
                        description: 'Registro oficial de accidentes, condiciones inseguras y personal problemático',
                    },
                    { onConflict: 'key_name' }
                )
            }

            const actorName = user?.full_name || user?.nickname || sysRole
            const cuadObjNotif = cuadrillas.find((c) => c.id === selectedCuadrilla)
            const turnoObjNotif = turnos.find((t) => t.id === selectedTurno)

            await saveReportCreatorMeta(reportId, {
                creator_user_id: user?.id || null,
                creator_email: user?.email || null,
                creator_name: actorName,
                creator_role: user?.raw_role || sysRole,
                cuadrilla_id: selectedCuadrilla,
                supervisor_employee_id: resolvedSupId,
                supervisor_name: squadSupMeta?.supervisor_employee_name || actorName,
                supervisor_user_email: squadSupMeta?.supervisor_user_email || user?.email || null,
            })

            await appendReportRevision(reportId, {
                edited_by_name: actorName,
                edited_by_email: user?.email || null,
                edited_by_role: user?.raw_role || sysRole,
                approved_with_changes: false,
                changes: [`Reporte capturado y enviado a revisión desde APK (${activities.length} avances, ${attendanceList.length} asistencias)`],
                note: supervisorComments.trim() || undefined,
            })

            await pushNotification({
                type: 'REPORT_SUBMITTED',
                title: `📋 Nuevo Reporte para Revisión (${fecha})`,
                message: `${actorName} envió reporte de ${cuadObjNotif?.nombre || 'Cuadrilla'} (${turnoObjNotif?.nombre || 'Turno'}) para aprobación.`,
                details: [
                    `Fecha: ${fecha}`,
                    `Asistencia: ${attendanceList.length} integrantes`,
                    `Actividades: ${activities.length} registros de avance`,
                ],
                target_roles: ['JEFE_PLANEACION', 'GERENTE', 'SUPERINTENDENTE', 'DIRECTOR_OPERATIVO', 'SUPER_ADMIN'],
                created_by_name: actorName,
                created_by_email: user?.email || null,
                link: `/dashboard/operacion/reportes-diarios/${reportId}`,
            })

            Alert.alert(
                '¡Reporte Subido a Supabase!',
                'El reporte diario, asistencia y avances ya fueron enviados para revisión y aprobación en Planeación/Gerencia.'
            )
            router.replace('/dashboard/reports')
        } catch (err: any) {
            Alert.alert('Error al guardar', err?.message || 'Verifica tu conexión.')
        } finally {
            setLoading(false)
        }
    }

    const handleNextStep = async () => {
        if (currentStep === 'HEADER') {
            if (!selectedTurno || !selectedCuadrilla || !selectedMina) {
                Alert.alert('Incompleto', 'Selecciona Turno, Cuadrilla y Mina.')
                return
            }
            if (attendanceList.length === 0) {
                await loadSquadMembers()
            }
            setCurrentStep('ATTENDANCE')
        } else if (currentStep === 'ATTENDANCE') {
            setCurrentStep('ACTIVITIES')
        } else if (currentStep === 'ACTIVITIES') {
            setCurrentStep('SUMMARY')
        } else {
            await submitReportToSupabase()
        }
    }

    const handleBackStep = () => {
        if (currentStep === 'SUMMARY') setCurrentStep('ACTIVITIES')
        else if (currentStep === 'ACTIVITIES') setCurrentStep('ATTENDANCE')
        else if (currentStep === 'ATTENDANCE') setCurrentStep('HEADER')
        else router.back()
    }

    return (
        <MobileShell
            title="Capturar Reporte de Turno"
            pillar={`Paso ${
                currentStep === 'HEADER'
                    ? '1: Turno y Cuadrilla'
                    : currentStep === 'ATTENDANCE'
                    ? '2: Pase de Lista'
                    : currentStep === 'ACTIVITIES'
                    ? '3: Scoop y Avances'
                    : '4: Cierre y Seguridad'
            }`}
            pillarHex="#F59E0B"
        >
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* INDICADOR VISUAL DE 4 PASOS */}
                <View style={styles.stepperRow}>
                    {(['HEADER', 'ATTENDANCE', 'ACTIVITIES', 'SUMMARY'] as WizardStep[]).map(
                        (st, idx) => {
                            const active = currentStep === st
                            return (
                                <TouchableOpacity
                                    key={st}
                                    onPress={() => setCurrentStep(st)}
                                    style={[
                                        styles.stepPill,
                                        {
                                            backgroundColor: active ? '#F59E0B' : bgCard,
                                            borderColor: active ? '#D97706' : borderCol,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={{
                                            fontSize: 11,
                                            fontWeight: '900',
                                            color: active ? '#0F172A' : textSecondary,
                                        }}
                                    >
                                        {idx + 1}.{' '}
                                        {st === 'HEADER'
                                            ? 'Datos'
                                            : st === 'ATTENDANCE'
                                            ? 'Lista'
                                            : st === 'ACTIVITIES'
                                            ? 'Avances'
                                            : 'Subir'}
                                    </Text>
                                </TouchableOpacity>
                            )
                        }
                    )}
                </View>

                {loading ? (
                    <View style={{ paddingVertical: 50, alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#F59E0B" />
                        <Text style={{ color: textSecondary, marginTop: 10, fontWeight: '700' }}>
                            Sincronizando con Supabase...
                        </Text>
                    </View>
                ) : currentStep === 'HEADER' ? (
                    <View style={[styles.formCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                        <Text style={[styles.label, { color: textPrimary }]}>FECHA OPERATIVA</Text>
                        <TextInput
                            value={fecha}
                            onChangeText={setFecha}
                            style={[
                                styles.input,
                                { backgroundColor: bgInput, borderColor: '#D97706', color: textPrimary },
                            ]}
                        />

                        <Text style={[styles.label, { color: textPrimary }]}>SELECCIONA TURNO</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                            {turnos.map((t) => {
                                const active = selectedTurno === t.id
                                return (
                                    <TouchableOpacity
                                        key={t.id}
                                        onPress={() => setSelectedTurno(t.id)}
                                        style={[
                                            styles.choiceBtn,
                                            {
                                                backgroundColor: active ? '#F59E0B' : bgInput,
                                                borderColor: active ? '#D97706' : borderCol,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={{
                                                fontWeight: '900',
                                                fontSize: 12,
                                                color: active ? '#0F172A' : textPrimary,
                                            }}
                                        >
                                            {t.codigo} • {t.nombre}
                                        </Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </ScrollView>

                        <Text style={[styles.label, { color: textPrimary }]}>SELECCIONA CUADRILLA</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                            {cuadrillas.map((c) => {
                                const active = selectedCuadrilla === c.id
                                return (
                                    <TouchableOpacity
                                        key={c.id}
                                        onPress={() => {
                                            setSelectedCuadrilla(c.id)
                                            setAttendanceList([])
                                        }}
                                        style={[
                                            styles.choiceBtn,
                                            {
                                                backgroundColor: active ? '#10B981' : bgInput,
                                                borderColor: active ? '#059669' : borderCol,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={{
                                                fontWeight: '900',
                                                fontSize: 12,
                                                color: active ? '#022C22' : textPrimary,
                                            }}
                                        >
                                            {c.nombre}
                                        </Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </ScrollView>

                        <Text style={[styles.label, { color: textPrimary }]}>UNIDAD MINERA</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {minas.map((m) => {
                                const active = selectedMina === m.id
                                return (
                                    <TouchableOpacity
                                        key={m.id}
                                        onPress={() => setSelectedMina(m.id)}
                                        style={[
                                            styles.choiceBtn,
                                            {
                                                backgroundColor: active ? '#3B82F6' : bgInput,
                                                borderColor: active ? '#2563EB' : borderCol,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={{
                                                fontWeight: '900',
                                                fontSize: 12,
                                                color: active ? '#FFFFFF' : textPrimary,
                                            }}
                                        >
                                            {m.nombre_mina}
                                        </Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </ScrollView>
                    </View>
                ) : currentStep === 'ATTENDANCE' ? (
                    <View>
                        <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                            👷 Pase de Lista ({attendanceList.length} integrantes)
                        </Text>
                        {attendanceList.map((item, idx) => (
                            <View
                                key={item.empleado_id}
                                style={[
                                    styles.attCard,
                                    { backgroundColor: bgCard, borderColor: borderCol },
                                ]}
                            >
                                <Text style={[styles.attName, { color: textPrimary }]}>
                                    {item.nombre}
                                </Text>
                                <Text style={[styles.attSub, { color: textSecondary }]}>
                                    {item.rol_nombre_default} • {item.codigo_empleado}
                                </Text>

                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={{ marginTop: 8 }}
                                >
                                    {asistenciasCatalog.map((a) => {
                                        const isSel = item.asistencia_id === a.id
                                        return (
                                            <TouchableOpacity
                                                key={a.id}
                                                onPress={() => {
                                                    const working = ['X', 'ASISTENCIA', 'DX', 'DOX'].includes(a.codigo)
                                                    const copy = [...attendanceList]
                                                    copy[idx].asistencia_id = a.id
                                                    copy[idx].estado_codigo = a.codigo
                                                    copy[idx].horas_extra = working ? (copy[idx].horas_extra || 4) : 0
                                                    setAttendanceList(copy)
                                                }}
                                                style={[
                                                    styles.attOptionBtn,
                                                    {
                                                        backgroundColor: isSel
                                                            ? '#10B981'
                                                            : bgInput,
                                                        borderColor: isSel
                                                            ? '#059669'
                                                            : borderCol,
                                                    },
                                                ]}
                                            >
                                                <Text
                                                    style={{
                                                        fontSize: 11,
                                                        fontWeight: '900',
                                                        color: isSel ? '#022C22' : textPrimary,
                                                    }}
                                                >
                                                    {a.codigo} — {a.nombre}
                                                </Text>
                                            </TouchableOpacity>
                                        )
                                    })}
                                </ScrollView>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: borderCol }}>
                                    <Text style={{ fontSize: 10, fontWeight: '800', color: textSecondary }}>
                                        H.E. (Horas Extra):
                                    </Text>
                                    <View style={{ flexDirection: 'row', gap: 6 }}>
                                        {[0, 2, 4, 5].map((hv) => {
                                            const heSel = (item.horas_extra ?? 0) === hv
                                            const isWorking = ['X', 'ASISTENCIA', 'DX', 'DOX'].includes(item.estado_codigo)
                                            return (
                                                <TouchableOpacity
                                                    key={hv}
                                                    disabled={!isWorking}
                                                    onPress={() => {
                                                        const copy = [...attendanceList]
                                                        copy[idx].horas_extra = hv
                                                        setAttendanceList(copy)
                                                    }}
                                                    style={{
                                                        paddingHorizontal: 8,
                                                        paddingVertical: 4,
                                                        borderRadius: 8,
                                                        borderWidth: 1,
                                                        opacity: isWorking ? 1 : 0.35,
                                                        backgroundColor: heSel ? '#06B6D4' : bgInput,
                                                        borderColor: heSel ? '#0891B2' : borderCol,
                                                    }}
                                                >
                                                    <Text style={{ fontSize: 10, fontWeight: '900', color: heSel ? '#022C22' : textPrimary }}>
                                                        {hv}h
                                                    </Text>
                                                </TouchableOpacity>
                                            )
                                        })}
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                ) : currentStep === 'ACTIVITIES' ? (
                    <View>
                        <View style={styles.actHeaderRow}>
                            <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                                🚜 Avances de Scooptram y Perforación
                            </Text>
                            <TouchableOpacity
                                onPress={openActivityModal}
                                style={styles.addActBtn}
                            >
                                <Plus size={16} color="#0F172A" />
                                <Text style={styles.addActBtnText}>Agregar Avance</Text>
                            </TouchableOpacity>
                        </View>

                        {activities.length === 0 ? (
                            <View
                                style={[
                                    styles.emptyActCard,
                                    { backgroundColor: bgCard, borderColor: borderCol },
                                ]}
                            >
                                <Text style={{ color: textSecondary, fontWeight: '700' }}>
                                    Toca "Agregar Avance" para registrar Toneladas de Scooptram o Metros de Avance.
                                </Text>
                            </View>
                        ) : (
                            activities.map((act) => (
                                <View
                                    key={act.temp_id}
                                    style={[
                                        styles.actItemCard,
                                        { backgroundColor: bgCard, borderColor: borderCol },
                                    ]}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.attName, { color: textPrimary }]}>
                                            {act.producto_nombre}{' '}
                                            <Text style={{ color: '#D97706' }}>
                                                ({act.cantidad_total} {act.unidad})
                                            </Text>
                                        </Text>
                                        <Text style={[styles.attSub, { color: textSecondary }]}>
                                            Frente: {act.location_nombre} •{' '}
                                            {act.participantes.length} participantes
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() =>
                                            setActivities(
                                                activities.filter((a) => a.temp_id !== act.temp_id)
                                            )
                                        }
                                        style={styles.trashBtn}
                                    >
                                        <Trash2 size={16} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            ))
                        )}
                    </View>
                ) : (
                    <View style={[styles.formCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                        <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                            ✅ Resumen y Eventos de Seguridad
                        </Text>

                        <Text style={[styles.label, { color: textPrimary, marginTop: 8 }]}>
                            OBSERVACIONES DEL SUPERVISOR DE TURNO
                        </Text>
                        <TextInput
                            value={supervisorComments}
                            onChangeText={setSupervisorComments}
                            placeholder="Ej. Se limpió rebaje 13-480 con Scoop ST-50 sin novedad..."
                            placeholderTextColor="#64748B"
                            multiline
                            style={[
                                styles.input,
                                {
                                    backgroundColor: bgInput,
                                    borderColor: '#D97706',
                                    color: textPrimary,
                                    height: 76,
                                    textAlignVertical: 'top',
                                },
                            ]}
                        />

                        {/* Switch rápido para reportar accidente o personal problemático */}
                        <TouchableOpacity
                            onPress={() => setHasSecurityEvent(!hasSecurityEvent)}
                            style={[
                                styles.secToggleBox,
                                {
                                    backgroundColor: hasSecurityEvent
                                        ? '#FFE4E6'
                                        : bgInput,
                                    borderColor: '#F43F5E',
                                },
                            ]}
                        >
                            <ShieldAlert size={18} color="#E11D48" />
                            <Text style={styles.secToggleText}>
                                {hasSecurityEvent
                                    ? '🚨 Reportando Incidencia de Seguridad / Disciplina en este Turno'
                                    : '¿Ocurrió un Accidente, Condición Insegura o Personal Problemático? (Toca aquí)'}
                            </Text>
                        </TouchableOpacity>

                        {hasSecurityEvent && (
                            <View style={{ marginTop: 10 }}>
                                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                                    {(
                                        [
                                            'ACCIDENTE',
                                            'CONDICION_INSEGURA',
                                            'PERSONAL_PROBLEMATICO',
                                        ] as const
                                    ).map((t) => (
                                        <TouchableOpacity
                                            key={t}
                                            onPress={() => setSecTipo(t)}
                                            style={{
                                                paddingHorizontal: 8,
                                                paddingVertical: 6,
                                                borderRadius: 8,
                                                backgroundColor:
                                                    secTipo === t ? '#E11D48' : bgInput,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    fontSize: 10,
                                                    fontWeight: '900',
                                                    color: secTipo === t ? '#FFF' : textPrimary,
                                                }}
                                            >
                                                {t.replace('_', ' ')}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <TextInput
                                    value={secDesc}
                                    onChangeText={setSecDesc}
                                    placeholder="Describe el evento de seguridad o personal problemático..."
                                    placeholderTextColor="#64748B"
                                    style={[
                                        styles.input,
                                        {
                                            backgroundColor: bgInput,
                                            borderColor: '#E11D48',
                                            color: textPrimary,
                                        },
                                    ]}
                                />
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* BARRA FLOTANTE INFERIOR DEL ASISTENTE */}
            <View
                style={[
                    styles.footerBar,
                    {
                        backgroundColor: bgCard,
                        borderTopColor: borderCol,
                        paddingBottom: Math.max(insets.bottom, 10),
                    },
                ]}
            >
                <TouchableOpacity onPress={handleBackStep} style={styles.backBtn}>
                    <ChevronLeft size={18} color={textPrimary} />
                    <Text style={[styles.backBtnText, { color: textPrimary }]}>Atrás</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleNextStep} style={styles.nextBtn}>
                    <Text style={styles.nextBtnText} numberOfLines={1}>
                        {currentStep === 'SUMMARY'
                            ? 'ENVIAR A REVISIÓN'
                            : 'Siguiente Paso'}
                    </Text>
                    {currentStep === 'SUMMARY' ? (
                        <Save size={18} color="#0F172A" />
                    ) : (
                        <ChevronRight size={18} color="#0F172A" />
                    )}
                </TouchableOpacity>
            </View>

            {/* MODAL PARA AGREGAR AVANCE DE SCOOPTRAM / PERFORACIÓN */}
            <Modal visible={isModalOpen} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
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
                            <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                                Registrar Avance Operativo
                            </Text>
                            <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                                <X size={20} color={textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.label, { color: textPrimary }]}>
                            CONCEPTO / PRODUCTO MINA
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                            {products.map((p) => {
                                const active = currentActivity.producto_id === p.id
                                return (
                                    <TouchableOpacity
                                        key={p.id}
                                        onPress={() =>
                                            setCurrentActivity({
                                                ...currentActivity,
                                                producto_id: p.id,
                                                producto_nombre: p.nombre,
                                                unidad: p.unidad_medida_default || 'und',
                                            })
                                        }
                                        style={[
                                            styles.choiceBtn,
                                            {
                                                backgroundColor: active ? '#F59E0B' : bgInput,
                                                borderColor: active ? '#D97706' : borderCol,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={{
                                                fontSize: 12,
                                                fontWeight: '900',
                                                color: active ? '#0F172A' : textPrimary,
                                            }}
                                        >
                                            {p.nombre} ({p.unidad_medida_default})
                                        </Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </ScrollView>

                        <Text style={[styles.label, { color: textPrimary }]}>
                            FRENTE / REBAJE
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                            {ubicaciones.map((u) => {
                                const active = currentActivity.location_id === u.id
                                return (
                                    <TouchableOpacity
                                        key={u.id}
                                        onPress={() =>
                                            setCurrentActivity({
                                                ...currentActivity,
                                                location_id: u.id,
                                                location_nombre: u.nombre,
                                            })
                                        }
                                        style={[
                                            styles.choiceBtn,
                                            {
                                                backgroundColor: active ? '#10B981' : bgInput,
                                                borderColor: active ? '#059669' : borderCol,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={{
                                                fontSize: 12,
                                                fontWeight: '900',
                                                color: active ? '#022C22' : textPrimary,
                                            }}
                                        >
                                            {u.nombre}
                                        </Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </ScrollView>

                        <Text style={[styles.label, { color: textPrimary }]}>
                            CANTIDAD TOTAL ({currentActivity.unidad || 'und'})
                        </Text>
                        <TextInput
                            value={qtyText}
                            onChangeText={setQtyText}
                            keyboardType="numeric"
                            placeholder="Ej. 240"
                            placeholderTextColor="#64748B"
                            style={[
                                styles.input,
                                {
                                    backgroundColor: bgInput,
                                    borderColor: '#D97706',
                                    color: textPrimary,
                                },
                            ]}
                        />

                        <TouchableOpacity onPress={saveActivity} style={styles.saveActBtn}>
                            <Text style={styles.saveActBtnText}>AGREGAR AL REPORTE</Text>
                        </TouchableOpacity>
                        </ScrollView>
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
    stepperRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 14,
        gap: 6,
    },
    stepPill: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1.5,
        alignItems: 'center',
    },
    formCard: {
        borderRadius: 18,
        borderWidth: 1.5,
        padding: 16,
    },
    label: {
        fontSize: 11,
        fontWeight: '900',
        marginBottom: 6,
        letterSpacing: 0.5,
    },
    input: {
        borderWidth: 1.5,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 46,
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 14,
    },
    choiceBtn: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1.5,
        marginRight: 8,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '900',
        marginBottom: 10,
    },
    attCard: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 12,
        marginBottom: 8,
    },
    attName: {
        fontSize: 13,
        fontWeight: '900',
    },
    attSub: {
        fontSize: 11,
        marginTop: 2,
    },
    attOptionBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        marginRight: 6,
    },
    actHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    addActBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F59E0B',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        gap: 4,
    },
    addActBtnText: {
        color: '#0F172A',
        fontSize: 11,
        fontWeight: '900',
    },
    emptyActCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 20,
        alignItems: 'center',
    },
    actItemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: 1,
        padding: 12,
        marginBottom: 8,
    },
    trashBtn: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#FEE2E2',
    },
    secToggleBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        gap: 8,
    },
    secToggleText: {
        flex: 1,
        color: '#9F1239',
        fontSize: 11,
        fontWeight: '800',
    },
    footerBar: {
        flexDirection: 'row',
        padding: 12,
        borderTopWidth: 1,
        gap: 10,
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#94A3B8',
    },
    backBtnText: {
        fontSize: 13,
        fontWeight: '800',
        marginLeft: 4,
    },
    nextBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F59E0B',
        borderRadius: 12,
        paddingVertical: 12,
        gap: 6,
    },
    nextBtnText: {
        color: '#0F172A',
        fontSize: 13,
        fontWeight: '900',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(2, 6, 23, 0.72)',
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
        marginBottom: 14,
    },
    saveActBtn: {
        backgroundColor: '#F59E0B',
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveActBtnText: {
        color: '#0F172A',
        fontSize: 13,
        fontWeight: '900',
    },
})
