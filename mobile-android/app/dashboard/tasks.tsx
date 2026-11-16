import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
    MessageSquare,
    ShieldAlert,
    Send,
    CheckCircle2,
    XCircle,
    Plus,
    Lock,
    Globe,
} from 'lucide-react-native'
import { supabase } from '../../lib/supabase'
import { useMobileAuth } from '../../lib/auth-context'
import { useResponsiveLayout } from '../../lib/responsive'
import { pushNotification } from '../../lib/notifications-service'
import MobileShell from '../../components/MobileShell'

const BLOG_STORE_KEY = 'ops_blog_tareas_store'
const PRIVATE_STORE_KEY = 'ops_blog_private_store'
const SEC_STORE_KEY = 'ops_security_incidents_store'

type MsgFilter = 'ALL' | 'PUBLIC' | 'PRIVATE' | 'TASKS' | 'PENDING'

export default function MobileTasksAndSecurityScreen() {
    const { user, sysRole, theme, isJefaturaOrAbove } = useMobileAuth()
    const insets = useSafeAreaInsets()
    const { isCompact, horizontalPadding } = useResponsiveLayout()

    const [activeTab, setActiveTab] = useState<'BITACORA' | 'SEGURIDAD'>('BITACORA')
    const [loading, setLoading] = useState(true)

    // Estado de Bitácora / Tareas (Pública + Privada)
    const [publicMessages, setPublicMessages] = useState<any[]>([])
    const [privateMessages, setPrivateMessages] = useState<any[]>([])
    const [usersList, setUsersList] = useState<any[]>([])
    const [filter, setFilter] = useState<MsgFilter>('ALL')

    const [newMsgText, setNewMsgText] = useState('')
    const [isTaskFlag, setIsTaskFlag] = useState(false)
    const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC')
    const [recipientId, setRecipientId] = useState<string>('')

    // Estado de Reportes de Seguridad / Personal Problemático
    const [incidents, setIncidents] = useState<any[]>([])
    const [incTipo, setIncTipo] = useState<'ACCIDENTE' | 'CONDICION_INSEGURA' | 'PERSONAL_PROBLEMATICO'>('CONDICION_INSEGURA')
    const [incSeveridad] = useState<'ALTA' | 'MEDIA' | 'BAJA'>('MEDIA')
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
            const [{ data: blogStore }, { data: privStore }, { data: secStore }, { data: usersData }] =
                await Promise.all([
                    supabase.from('sys_config').select('value_json').eq('key_name', BLOG_STORE_KEY).maybeSingle(),
                    supabase.from('sys_config').select('value_json').eq('key_name', PRIVATE_STORE_KEY).maybeSingle(),
                    supabase.from('sys_config').select('value_json').eq('key_name', SEC_STORE_KEY).maybeSingle(),
                    supabase
                        .from('sys_users')
                        .select('id, email, full_name, role, active')
                        .eq('active', true)
                        .order('full_name'),
                ])

            const blogList = Array.isArray(blogStore?.value_json) ? blogStore.value_json : []
            setPublicMessages(blogList.map((m: any) => ({ ...m, visibility: m.visibility || 'PUBLIC' })))

            const privList = Array.isArray(privStore?.value_json) ? privStore.value_json : []
            setPrivateMessages(privList.map((m: any) => ({ ...m, visibility: 'PRIVATE' })))

            const secList = Array.isArray(secStore?.value_json) ? secStore.value_json : []
            setIncidents(secList)

            const activeUsers = (usersData || []).filter((u: any) => u.id !== user?.id)
            setUsersList(activeUsers)
            if (activeUsers.length > 0 && !recipientId) {
                setRecipientId(activeUsers[0].id)
            }
        } catch (err) {
            console.warn('Error cargando bitácora y seguridad:', err)
        } finally {
            setLoading(false)
        }
    }, [user?.id, recipientId])

    useEffect(() => {
        loadAll()
    }, [loadAll])

    const visibleMessages = useMemo(() => {
        const myEmail = (user?.email || '').toLowerCase().trim()
        const myId = (user?.id || '').trim()

        const visiblePrivate = privateMessages.filter((m) => {
            if (m.is_deleted) return false
            const isAuthor =
                (myId && m.author_id === myId) ||
                (myEmail && (m.author_email || m.author?.email || '').toLowerCase().trim() === myEmail)
            const isRecipient =
                (myId && m.recipient_id === myId) ||
                (myEmail && (m.recipient_email || '').toLowerCase().trim() === myEmail)
            return isAuthor || isRecipient
        })

        const combined = [
            ...publicMessages.filter((m) => !m.is_deleted),
            ...visiblePrivate,
        ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

        return combined.filter((m) => {
            if (filter === 'PUBLIC') return m.visibility !== 'PRIVATE'
            if (filter === 'PRIVATE') return m.visibility === 'PRIVATE'
            if (filter === 'TASKS') return Boolean(m.is_task)
            if (filter === 'PENDING') return Boolean(m.is_task) && m.task_status === 'PENDING'
            return true
        })
    }, [publicMessages, privateMessages, filter, user?.email, user?.id])

    const handleSendMessage = async () => {
        if (!newMsgText.trim()) return

        if (visibility === 'PRIVATE') {
            const target = usersList.find((u) => u.id === recipientId)
            if (!target) {
                Alert.alert('Destinatario requerido', 'Selecciona un usuario destinatario para el mensaje privado.')
                return
            }

            const actorName = user?.full_name || user?.nickname || sysRole
            const newPrivObj = {
                id: 'priv-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                author_id: user?.id || 'mob-user',
                body: newMsgText.trim(),
                is_task: isTaskFlag,
                task_status: isTaskFlag ? 'PENDING' : null,
                created_at: new Date().toISOString(),
                visibility: 'PRIVATE',
                recipient_id: target.id,
                recipient_name: target.full_name || target.email,
                recipient_email: target.email,
                recipient_role: target.role,
                author_email: user?.email || null,
                author_name: actorName,
                author: {
                    nickname: `${actorName} (${sysRole})`,
                    avatar_url: '',
                    email: user?.email || 'operaciones@rayamina.com',
                },
            }

            const updatedPriv = [...privateMessages, newPrivObj]
            setPrivateMessages(updatedPriv)
            setNewMsgText('')
            setIsTaskFlag(false)

            await supabase.from('sys_config').upsert(
                {
                    key_name: PRIVATE_STORE_KEY,
                    value_json: updatedPriv,
                    description: 'Mensajes y tareas privadas de bitácora por usuario destinatario',
                },
                { onConflict: 'key_name' }
            )

            await pushNotification({
                type: 'PRIVATE_TASK',
                title: isTaskFlag ? '🔒 Nueva Tarea Privada Asignada' : '🔒 Nuevo Mensaje Privado',
                message: `${actorName} te envió ${isTaskFlag ? 'una tarea privada' : 'un mensaje privado'}: "${newPrivObj.body.slice(0, 90)}"`,
                target_user_ids: [target.id],
                target_user_emails: target.email ? [target.email] : [],
                created_by_name: actorName,
                created_by_email: user?.email || null,
                link: '/dashboard/blog-tareas',
            })
            return
        }

        const msgObj = {
            id: 'mob-msg-' + Date.now(),
            author_id: user?.id || 'mob-user',
            body: newMsgText.trim(),
            is_task: isTaskFlag,
            task_status: isTaskFlag ? 'PENDING' : null,
            created_at: new Date().toISOString(),
            visibility: 'PUBLIC',
            author_email: user?.email || null,
            author_name: user?.full_name || user?.nickname || sysRole,
            author: {
                nickname: `${user?.full_name || user?.nickname || 'Mando'} (${sysRole})`,
                avatar_url: '',
                email: user?.email || 'operaciones@rayamina.com',
            },
        }

        const updated = [...publicMessages, msgObj]
        setPublicMessages(updated)
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

    const handleResolveTask = async (msg: any, status: 'COMPLETED' | 'REJECTED') => {
        const resolver = user?.full_name || user?.nickname || sysRole
        if (msg.visibility === 'PRIVATE' || String(msg.id).startsWith('priv-')) {
            const updatedPriv = privateMessages.map((m) =>
                m.id === msg.id
                    ? { ...m, task_status: status, resolved_by: resolver, resolved_at: new Date().toISOString() }
                    : m
            )
            setPrivateMessages(updatedPriv)
            await supabase.from('sys_config').upsert(
                {
                    key_name: PRIVATE_STORE_KEY,
                    value_json: updatedPriv,
                    description: 'Mensajes y tareas privadas de bitácora por usuario destinatario',
                },
                { onConflict: 'key_name' }
            )
            return
        }

        const updated = publicMessages.map((m) =>
            m.id === msg.id
                ? {
                      ...m,
                      task_status: status,
                      resolved_by: resolver,
                      resolved_at: new Date().toISOString(),
                  }
                : m
        )
        setPublicMessages(updated)
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
            autor: `${user?.full_name || user?.nickname || 'Supervisor'} (${sysRole})`,
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
            {/* PESTAÑAS SUPERIORES */}
            <View style={[styles.tabRow, { backgroundColor: bgCard, borderBottomColor: borderCol }]}>
                <TouchableOpacity
                    onPress={() => setActiveTab('BITACORA')}
                    style={[
                        styles.tabBtn,
                        activeTab === 'BITACORA' && { backgroundColor: '#F59E0B' },
                    ]}
                >
                    <MessageSquare
                        size={15}
                        color={activeTab === 'BITACORA' ? '#0F172A' : textSecondary}
                    />
                    <Text
                        style={[
                            styles.tabBtnText,
                            {
                                color: activeTab === 'BITACORA' ? '#0F172A' : textSecondary,
                                fontSize: isCompact ? 11 : 12,
                            },
                        ]}
                        numberOfLines={1}
                    >
                        Bitácora ({visibleMessages.length})
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
                        size={15}
                        color={activeTab === 'SEGURIDAD' ? '#FFFFFF' : textSecondary}
                    />
                    <Text
                        style={[
                            styles.tabBtnText,
                            {
                                color: activeTab === 'SEGURIDAD' ? '#FFFFFF' : textSecondary,
                                fontSize: isCompact ? 11 : 12,
                            },
                        ]}
                        numberOfLines={1}
                    >
                        Seguridad ({incidents.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#F43F5E" />
                </View>
            ) : activeTab === 'BITACORA' ? (
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    {/* FILTROS RÁPIDOS DE PRIVACIDAD Y TAREAS */}
                    <View style={{ borderBottomWidth: 1, borderBottomColor: borderCol, paddingVertical: 8, paddingHorizontal: horizontalPadding }}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {(
                                [
                                    { id: 'ALL', label: 'Todos' },
                                    { id: 'PUBLIC', label: '🌐 Públicos' },
                                    { id: 'PRIVATE', label: '🔒 Privados' },
                                    { id: 'TASKS', label: '📌 Tareas' },
                                    { id: 'PENDING', label: '⏳ Pendientes' },
                                ] as Array<{ id: MsgFilter; label: string }>
                            ).map((f) => {
                                const active = filter === f.id
                                return (
                                    <TouchableOpacity
                                        key={f.id}
                                        onPress={() => setFilter(f.id)}
                                        style={[
                                            styles.filterChip,
                                            {
                                                backgroundColor: active ? '#F59E0B' : bgCard,
                                                borderColor: active ? '#D97706' : borderCol,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={{
                                                fontSize: 10.5,
                                                fontWeight: '900',
                                                color: active ? '#0F172A' : textSecondary,
                                            }}
                                        >
                                            {f.label}
                                        </Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </ScrollView>
                    </View>

                    <ScrollView
                        style={[styles.scroll, { paddingHorizontal: horizontalPadding }]}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {visibleMessages.map((msg) => {
                            const isPriv = msg.visibility === 'PRIVATE'
                            return (
                                <View
                                    key={msg.id}
                                    style={[
                                        styles.msgCard,
                                        {
                                            backgroundColor: isPriv
                                                ? isLight
                                                    ? '#EEF2FF'
                                                    : '#1E1B4B'
                                                : msg.is_task
                                                ? isLight
                                                    ? '#FFFBEB'
                                                    : '#1E293B'
                                                : bgCard,
                                            borderColor: isPriv ? '#6366F1' : msg.is_task ? '#F59E0B' : borderCol,
                                        },
                                    ]}
                                >
                                    <View style={styles.msgHeader}>
                                        <Text style={[styles.msgAuthor, { color: isPriv ? '#818CF8' : '#D97706', flex: 1 }]}>
                                            {msg.author?.nickname || msg.author_name || 'Operaciones'}
                                        </Text>
                                        <View style={{ flexDirection: 'row', gap: 4 }}>
                                            {isPriv ? (
                                                <View style={[styles.taskBadge, { backgroundColor: '#6366F1' }]}>
                                                    <Text style={[styles.taskBadgeText, { color: '#FFF' }]}>
                                                        🔒 PRIVADO → {msg.recipient_name || 'Directo'}
                                                    </Text>
                                                </View>
                                            ) : (
                                                <View style={[styles.taskBadge, { backgroundColor: '#10B98125' }]}>
                                                    <Text style={[styles.taskBadgeText, { color: '#10B981' }]}>
                                                        🌐 PÚBLICO
                                                    </Text>
                                                </View>
                                            )}
                                            {msg.is_task && (
                                                <View style={styles.taskBadge}>
                                                    <Text style={styles.taskBadgeText}>📌 TAREA</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    <Text style={[styles.msgBody, { color: textPrimary }]}>
                                        {msg.body}
                                    </Text>

                                    {msg.is_task && (
                                        <View style={styles.taskActionsRow}>
                                            {msg.task_status === 'PENDING' ? (
                                                <>
                                                    <TouchableOpacity
                                                        onPress={() => handleResolveTask(msg, 'COMPLETED')}
                                                        style={styles.completeTaskBtn}
                                                    >
                                                        <CheckCircle2 size={14} color="#FFF" />
                                                        <Text style={styles.completeTaskText}>
                                                            Cumplida
                                                        </Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={() => handleResolveTask(msg, 'REJECTED')}
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
                            )
                        })}
                    </ScrollView>

                    {/* COMPOSITOR PÚBLICO / PRIVADO */}
                    <View
                        style={[
                            styles.composerContainer,
                            {
                                backgroundColor: bgCard,
                                borderTopColor: borderCol,
                                paddingBottom: Math.max(insets.bottom, 8),
                            },
                        ]}
                    >
                        <View style={styles.visToggleRow}>
                            <TouchableOpacity
                                onPress={() => setVisibility('PUBLIC')}
                                style={[
                                    styles.visBtn,
                                    {
                                        backgroundColor: visibility === 'PUBLIC' ? '#10B981' : bgInput,
                                        borderColor: visibility === 'PUBLIC' ? '#059669' : borderCol,
                                    },
                                ]}
                            >
                                <Globe size={12} color={visibility === 'PUBLIC' ? '#022C22' : textSecondary} />
                                <Text
                                    style={{
                                        fontSize: 10,
                                        fontWeight: '900',
                                        color: visibility === 'PUBLIC' ? '#022C22' : textSecondary,
                                    }}
                                >
                                    Público
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setVisibility('PRIVATE')}
                                style={[
                                    styles.visBtn,
                                    {
                                        backgroundColor: visibility === 'PRIVATE' ? '#6366F1' : bgInput,
                                        borderColor: visibility === 'PRIVATE' ? '#4F46E5' : borderCol,
                                    },
                                ]}
                            >
                                <Lock size={12} color={visibility === 'PRIVATE' ? '#FFFFFF' : textSecondary} />
                                <Text
                                    style={{
                                        fontSize: 10,
                                        fontWeight: '900',
                                        color: visibility === 'PRIVATE' ? '#FFFFFF' : textSecondary,
                                    }}
                                >
                                    Privado
                                </Text>
                            </TouchableOpacity>

                            {(isJefaturaOrAbove || visibility === 'PRIVATE') && (
                                <TouchableOpacity
                                    onPress={() => setIsTaskFlag(!isTaskFlag)}
                                    style={[
                                        styles.visBtn,
                                        {
                                            backgroundColor: isTaskFlag ? '#F59E0B' : bgInput,
                                            borderColor: isTaskFlag ? '#D97706' : borderCol,
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
                                        {isTaskFlag ? '📌 TAREA' : '+ Hacer Tarea'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {visibility === 'PRIVATE' && usersList.length > 0 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                                {usersList.map((u) => {
                                    const active = u.id === recipientId
                                    return (
                                        <TouchableOpacity
                                            key={u.id}
                                            onPress={() => setRecipientId(u.id)}
                                            style={[
                                                styles.recipientChip,
                                                {
                                                    backgroundColor: active ? '#6366F1' : bgInput,
                                                    borderColor: active ? '#4F46E5' : borderCol,
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={{
                                                    fontSize: 10,
                                                    fontWeight: '800',
                                                    color: active ? '#FFFFFF' : textPrimary,
                                                }}
                                            >
                                                Para: {u.full_name || u.email} ({u.role})
                                            </Text>
                                        </TouchableOpacity>
                                    )
                                })}
                            </ScrollView>
                        )}

                        <View style={styles.composerBar}>
                            <TextInput
                                value={newMsgText}
                                onChangeText={setNewMsgText}
                                placeholder={
                                    visibility === 'PRIVATE'
                                        ? 'Escribe mensaje o tarea privada...'
                                        : 'Escribe consigna o reporte público de turno...'
                                }
                                placeholderTextColor="#64748B"
                                style={[
                                    styles.composerInput,
                                    {
                                        backgroundColor: bgInput,
                                        borderColor: visibility === 'PRIVATE' ? '#6366F1' : '#D97706',
                                        color: textPrimary,
                                    },
                                ]}
                            />

                            <TouchableOpacity
                                onPress={handleSendMessage}
                                style={[
                                    styles.sendBtn,
                                    visibility === 'PRIVATE' && { backgroundColor: '#6366F1' },
                                ]}
                            >
                                <Send size={18} color={visibility === 'PRIVATE' ? '#FFFFFF' : '#0F172A'} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            ) : (
                <ScrollView
                    style={[styles.scroll, { paddingHorizontal: horizontalPadding }]}
                    contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 24, 36) }}
                    showsVerticalScrollIndicator={false}
                >
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
                                            backgroundColor: incTipo === t.id ? '#F43F5E' : bgInput,
                                            borderColor: incTipo === t.id ? '#E11D48' : borderCol,
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
    filterChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        marginRight: 6,
    },
    scroll: {
        flex: 1,
        paddingTop: 10,
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
        flexWrap: 'wrap',
        gap: 6,
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
    composerContainer: {
        paddingHorizontal: 10,
        paddingTop: 8,
        borderTopWidth: 1,
    },
    visToggleRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 6,
    },
    visBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
    },
    recipientChip: {
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
        marginRight: 6,
    },
    composerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
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
