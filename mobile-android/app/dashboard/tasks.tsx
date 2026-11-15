import React, { useState, useEffect, useCallback } from 'react'
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Alert,
    StyleSheet,
} from 'react-native'
import {
    MessageSquare,
    ShieldAlert,
    Send,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Plus,
} from 'lucide-react-native'
import { supabase } from '../../lib/supabase'
import { useMobileAuth } from '../../lib/auth-context'
import MobileShell from '../../components/MobileShell'

const BLOG_STORE_KEY = 'ops_blog_tareas_store'
const SEC_STORE_KEY = 'ops_security_incidents_store'

export default function MobileTasksAndSecurityScreen() {
    const { user, sysRole, theme, isJefaturaOrAbove } = useMobileAuth()
    const [activeTab, setActiveTab] = useState<'BITACORA' | 'SEGURIDAD'>('BITACORA')
    const [loading, setLoading] = useState(true)

    // Estado de Bitácora / Tareas
    const [messages, setMessages] = useState<any[]>([])
    const [newMsgText, setNewMsgText] = useState('')
    const [isTaskFlag, setIsTaskFlag] = useState(false)

    // Estado de Reportes de Seguridad / Personal Problemático
    const [incidents, setIncidents] = useState<any[]>([])
    const [incTipo, setIncTipo] = useState<'ACCIDENTE' | 'CONDICION_INSEGURA' | 'PERSONAL_PROBLEMATICO'>('CONDICION_INSEGURA')
    const [incSeveridad, setIncSeveridad] = useState<'ALTA' | 'MEDIA' | 'BAJA'>('MEDIA')
    const [incInvolucrado, setIncInvolucrado] = useState('')
    const [incDesc, setIncDesc] = useState('')

    const isLight = theme === 'light'
    const bgCard = isLight ? '#FFFFFF' : '#0F172A'
    const bgInput = isLight ? '#FEFCE8' : '#020617'
    const borderCol = isLight ? '#CBD5E1' : '#1E293B'
    const textPrimary = isLight ? '#0F172A' : '#F8FAFC'
    const textSecondary = isLight ? '#475569' : '#94A3B8'

    const loadAll = useCallback(async () => {
        setLoading(true)
        try {
            const [{ data: blogStore }, { data: secStore }] = await Promise.all([
                supabase.from('sys_config').select('value_json').eq('key_name', BLOG_STORE_KEY).maybeSingle(),
                supabase.from('sys_config').select('value_json').eq('key_name', SEC_STORE_KEY).maybeSingle(),
            ])

            const blogList = Array.isArray(blogStore?.value_json) ? blogStore.value_json : []
            setMessages(blogList)

            const secList = Array.isArray(secStore?.value_json) ? secStore.value_json : []
            setIncidents(secList)
        } catch (err) {
            console.warn('Error cargando bitácora y seguridad:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadAll()
    }, [loadAll])

    const handleSendMessage = async () => {
        if (!newMsgText.trim()) return
        const msgObj = {
            id: 'mob-msg-' + Date.now(),
            author_id: user?.id || 'mob-user',
            body: newMsgText.trim(),
            is_task: isTaskFlag,
            task_status: isTaskFlag ? 'PENDING' : null,
            created_at: new Date().toISOString(),
            author: {
                nickname: `${user?.nickname || 'Mando'} (${sysRole})`,
                avatar_url: '',
                email: user?.email || 'operaciones@rayamina.com',
            },
        }

        const updated = [...messages, msgObj]
        setMessages(updated)
        setNewMsgText('')
        setIsTaskFlag(false)

        await supabase.from('sys_config').upsert(
            {
                key_name: BLOG_STORE_KEY,
                value_json: updated,
                description: 'Almacén sincronizado de Bitácora y Tareas Operativas',
            },
            { onConflict: 'key_name' }
        )
    }

    const handleResolveTask = async (msgId: string, status: 'COMPLETED' | 'REJECTED') => {
        const updated = messages.map((m) =>
            m.id === msgId
                ? {
                      ...m,
                      task_status: status,
                      resolved_by: user?.nickname || sysRole,
                      resolved_at: new Date().toISOString(),
                  }
                : m
        )
        setMessages(updated)
        await supabase.from('sys_config').upsert(
            {
                key_name: BLOG_STORE_KEY,
                value_json: updated,
                description: 'Almacén sincronizado de Bitácora y Tareas Operativas',
            },
            { onConflict: 'key_name' }
        )
    }

    const handleSaveIncident = async () => {
        if (!incDesc.trim()) {
            Alert.alert('Descripción requerida', 'Describe el accidente, condición insegura o reporte disciplinario.')
            return
        }

        const newInc = {
            id: 'inc-mob-' + Date.now(),
            fecha: new Date().toISOString().split('T')[0],
            turno: 'TURNO EN CURSO',
            cuadrilla: 'OPERACIÓN CAMPO',
            mina: 'EL HERRERO',
            tipo: incTipo,
            severidad: incSeveridad,
            involucrado: incInvolucrado.trim() || 'General / Frente',
            descripcion: incDesc.trim(),
            autor: `${user?.nickname || 'Supervisor'} (${sysRole})`,
            created_at: new Date().toISOString(),
        }

        const updated = [newInc, ...incidents]
        setIncidents(updated)
        setIncInvolucrado('')
        setIncDesc('')

        await supabase.from('sys_config').upsert(
            {
                key_name: SEC_STORE_KEY,
                value_json: updated,
                description: 'Registro oficial de accidentes, condiciones inseguras y personal problemático',
            },
            { onConflict: 'key_name' }
        )

        Alert.alert('Alerta Registrada', 'El evento de seguridad se subió a Supabase y ya es visible en Jefatura.')
    }

    return (
        <MobileShell
            title="Bitácora, Tareas y Seguridad"
            pillar="4. Reportes y Seguridad"
            pillarHex="#F43F5E"
        >
            {/* PESTAÑAS SUPERIORES: BITÁCORA VS SEGURIDAD / PERSONAL PROBLEMÁTICO */}
            <View style={[styles.tabRow, { backgroundColor: bgCard, borderBottomColor: borderCol }]}>
                <TouchableOpacity
                    onPress={() => setActiveTab('BITACORA')}
                    style={[
                        styles.tabBtn,
                        activeTab === 'BITACORA' && { backgroundColor: '#F59E0B' },
                    ]}
                >
                    <MessageSquare
                        size={16}
                        color={activeTab === 'BITACORA' ? '#0F172A' : textSecondary}
                    />
                    <Text
                        style={[
                            styles.tabBtnText,
                            {
                                color: activeTab === 'BITACORA' ? '#0F172A' : textSecondary,
                            },
                        ]}
                    >
                        Bitácora y Tareas ({messages.length})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setActiveTab('SEGURIDAD')}
                    style={[
                        styles.tabBtn,
                        activeTab === 'SEGURIDAD' && { backgroundColor: '#F43F5E' },
                    ]}
                >
                    <ShieldAlert
                        size={16}
                        color={activeTab === 'SEGURIDAD' ? '#FFFFFF' : textSecondary}
                    />
                    <Text
                        style={[
                            styles.tabBtnText,
                            {
                                color: activeTab === 'SEGURIDAD' ? '#FFFFFF' : textSecondary,
                            },
                        ]}
                    >
                        Accidentes y Disciplina ({incidents.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#F43F5E" />
                </View>
            ) : activeTab === 'BITACORA' ? (
                <View style={{ flex: 1 }}>
                    <ScrollView
                        style={styles.scroll}
                        contentContainerStyle={{ paddingBottom: 24 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {messages.map((msg) => (
                            <View
                                key={msg.id}
                                style={[
                                    styles.msgCard,
                                    {
                                        backgroundColor: msg.is_task
                                            ? isLight
                                                ? '#FFFBEB'
                                                : '#1E293B'
                                            : bgCard,
                                        borderColor: msg.is_task ? '#F59E0B' : borderCol,
                                    },
                                ]}
                            >
                                <View style={styles.msgHeader}>
                                    <Text style={[styles.msgAuthor, { color: '#D97706' }]}>
                                        {msg.author?.nickname || 'Operaciones'}
                                    </Text>
                                    {msg.is_task && (
                                        <View style={styles.taskBadge}>
                                            <Text style={styles.taskBadgeText}>📌 CONSIGNA / TAREA</Text>
                                        </View>
                                    )}
                                </View>

                                <Text style={[styles.msgBody, { color: textPrimary }]}>
                                    {msg.body}
                                </Text>

                                {msg.is_task && (
                                    <View style={styles.taskActionsRow}>
                                        {msg.task_status === 'PENDING' ? (
                                            <>
                                                <TouchableOpacity
                                                    onPress={() =>
                                                        handleResolveTask(msg.id, 'COMPLETED')
                                                    }
                                                    style={styles.completeTaskBtn}
                                                >
                                                    <CheckCircle2 size={14} color="#FFF" />
                                                    <Text style={styles.completeTaskText}>
                                                        Marcar Cumplida
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() =>
                                                        handleResolveTask(msg.id, 'REJECTED')
                                                    }
                                                    style={styles.rejectTaskBtn}
                                                >
                                                    <XCircle size={14} color="#FFF" />
                                                    <Text style={styles.completeTaskText}>
                                                        Impedimento
                                                    </Text>
                                                </TouchableOpacity>
                                            </>
                                        ) : (
                                            <Text
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: '900',
                                                    color:
                                                        msg.task_status === 'COMPLETED'
                                                            ? '#10B981'
                                                            : '#F43F5E',
                                                }}
                                            >
                                                {msg.task_status === 'COMPLETED'
                                                    ? '✔ Tarea Cumplida en Turno'
                                                    : '✖ Impedimento Reportado'}
                                            </Text>
                                        )}
                                    </View>
                                )}
                            </View>
                        ))}
                    </ScrollView>

                    {/* Barra Inferior de Envío de Consigna / Mensaje */}
                    <View
                        style={[
                            styles.composerBar,
                            { backgroundColor: bgCard, borderTopColor: borderCol },
                        ]}
                    >
                        {isJefaturaOrAbove && (
                            <TouchableOpacity
                                onPress={() => setIsTaskFlag(!isTaskFlag)}
                                style={[
                                    styles.taskToggleBtn,
                                    {
                                        backgroundColor: isTaskFlag ? '#F59E0B' : '#E2E8F040',
                                    },
                                ]}
                            >
                                <Text
                                    style={{
                                        fontSize: 10,
                                        fontWeight: '900',
                                        color: isTaskFlag ? '#0F172A' : textSecondary,
                                    }}
                                >
                                    {isTaskFlag ? '📌 TAREA' : 'Nota'}
                                </Text>
                            </TouchableOpacity>
                        )}

                        <TextInput
                            value={newMsgText}
                            onChangeText={setNewMsgText}
                            placeholder="Escribe consigna o reporte de turno..."
                            placeholderTextColor="#64748B"
                            style={[
                                styles.composerInput,
                                {
                                    backgroundColor: bgInput,
                                    borderColor: '#D97706',
                                    color: textPrimary,
                                },
                            ]}
                        />

                        <TouchableOpacity onPress={handleSendMessage} style={styles.sendBtn}>
                            <Send size={18} color="#0F172A" />
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={{ paddingBottom: 36 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* FORMULARIO PARA QUE EL SUPERVISOR REPORTE ACCIDENTES, ACTOS INSEGUROS O PERSONAL PROBLEMÁTICO */}
                    <View
                        style={[
                            styles.secFormCard,
                            { backgroundColor: bgCard, borderColor: '#F43F5E' },
                        ]}
                    >
                        <Text style={[styles.secFormTitle, { color: textPrimary }]}>
                            🚨 Nuevo Reporte de Seguridad o Disciplina
                        </Text>
                        <Text style={[styles.secFormSub, { color: textSecondary }]}>
                            Registra accidentes, condiciones inseguras o personal problemático en el turno:
                        </Text>

                        <View style={styles.typeChipsRow}>
                            {(
                                [
                                    { id: 'ACCIDENTE', label: '🚑 Accidente' },
                                    { id: 'CONDICION_INSEGURA', label: '⚠️ Acto Inseguro' },
                                    { id: 'PERSONAL_PROBLEMATICO', label: '👷 Personal Problemático' },
                                ] as const
                            ).map((t) => (
                                <TouchableOpacity
                                    key={t.id}
                                    onPress={() => setIncTipo(t.id)}
                                    style={[
                                        styles.typeChip,
                                        {
                                            backgroundColor:
                                                incTipo === t.id ? '#F43F5E' : bgInput,
                                            borderColor:
                                                incTipo === t.id ? '#E11D48' : borderCol,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={{
                                            fontSize: 11,
                                            fontWeight: '900',
                                            color: incTipo === t.id ? '#FFF' : textPrimary,
                                        }}
                                    >
                                        {t.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TextInput
                            value={incInvolucrado}
                            onChangeText={setIncInvolucrado}
                            placeholder="Trabajador involucrado o frente (ej. Rebaje 13-480)"
                            placeholderTextColor="#64748B"
                            style={[
                                styles.secInput,
                                {
                                    backgroundColor: bgInput,
                                    borderColor: borderCol,
                                    color: textPrimary,
                                },
                            ]}
                        />

                        <TextInput
                            value={incDesc}
                            onChangeText={setIncDesc}
                            placeholder="Describe qué ocurrió y las medidas aplicadas..."
                            placeholderTextColor="#64748B"
                            multiline
                            style={[
                                styles.secInput,
                                {
                                    backgroundColor: bgInput,
                                    borderColor: borderCol,
                                    color: textPrimary,
                                    height: 76,
                                    textAlignVertical: 'top',
                                },
                            ]}
                        />

                        <TouchableOpacity onPress={handleSaveIncident} style={styles.saveIncBtn}>
                            <Plus size={18} color="#FFF" />
                            <Text style={styles.saveIncBtnText}>
                                SUBIR ALERTA A SUPABASE
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* HISTORIAL DE EVENTOS DE SEGURIDAD Y DISCIPLINA */}
                    {incidents.map((inc) => (
                        <View
                            key={inc.id}
                            style={[
                                styles.incCard,
                                { backgroundColor: bgCard, borderColor: borderCol },
                            ]}
                        >
                            <View style={styles.incTopRow}>
                                <Text style={styles.incTypeTag}>{inc.tipo}</Text>
                                <Text style={[styles.incDate, { color: textSecondary }]}>
                                    {inc.fecha} • {inc.autor}
                                </Text>
                            </View>
                            <Text style={[styles.incTarget, { color: textPrimary }]}>
                                Involucrado / Frente: {inc.involucrado}
                            </Text>
                            <Text style={[styles.incDesc, { color: textSecondary }]}>
                                {inc.descripcion}
                            </Text>
                        </View>
                    ))}
                </ScrollView>
            )}
        </MobileShell>
    )
}

const styles = StyleSheet.create({
    tabRow: {
        flexDirection: 'row',
        padding: 10,
        gap: 8,
        borderBottomWidth: 1,
    },
    tabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 12,
        gap: 6,
    },
    tabBtnText: {
        fontSize: 12,
        fontWeight: '900',
    },
    scroll: {
        flex: 1,
        paddingHorizontal: 14,
        paddingTop: 12,
    },
    msgCard: {
        borderRadius: 16,
        borderWidth: 1.5,
        padding: 13,
        marginBottom: 10,
    },
    msgHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    msgAuthor: {
        fontSize: 11,
        fontWeight: '900',
    },
    taskBadge: {
        backgroundColor: '#F59E0B',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    taskBadgeText: {
        color: '#0F172A',
        fontSize: 9,
        fontWeight: '900',
    },
    msgBody: {
        fontSize: 13,
        fontWeight: '700',
        lineHeight: 19,
    },
    taskActionsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F030',
    },
    completeTaskBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#059669',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 5,
    },
    rejectTaskBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E11D48',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 5,
    },
    completeTaskText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '900',
    },
    composerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderTopWidth: 1,
        gap: 8,
    },
    taskToggleBtn: {
        paddingHorizontal: 10,
        paddingVertical: 10,
        borderRadius: 10,
    },
    composerInput: {
        flex: 1,
        borderWidth: 1.5,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        fontSize: 13,
        fontWeight: '700',
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#F59E0B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    secFormCard: {
        borderRadius: 18,
        borderWidth: 1.5,
        padding: 14,
        marginBottom: 16,
    },
    secFormTitle: {
        fontSize: 15,
        fontWeight: '900',
    },
    secFormSub: {
        fontSize: 11,
        marginTop: 2,
        marginBottom: 10,
    },
    typeChipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 10,
    },
    typeChip: {
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 10,
        borderWidth: 1,
    },
    secInput: {
        borderWidth: 1.5,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 10,
    },
    saveIncBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E11D48',
        height: 46,
        borderRadius: 12,
        gap: 6,
    },
    saveIncBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '900',
    },
    incCard: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 12,
        marginBottom: 8,
    },
    incTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    incTypeTag: {
        color: '#E11D48',
        fontSize: 10,
        fontWeight: '900',
    },
    incDate: {
        fontSize: 10,
        fontWeight: '700',
    },
    incTarget: {
        fontSize: 13,
        fontWeight: '900',
    },
    incDesc: {
        fontSize: 12,
        marginTop: 3,
        lineHeight: 16,
    },
})
