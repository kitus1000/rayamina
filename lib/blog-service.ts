import { supabase } from '@/lib/supabase'

export interface BlogMessage {
    id: string
    author_id: string
    body: string
    is_task: boolean
    task_status?: 'PENDING' | 'COMPLETED' | 'REJECTED' | null
    resolved_by?: string
    resolved_at?: string
    is_edited?: boolean
    is_deleted?: boolean
    created_at: string
    visibility?: 'PUBLIC' | 'PRIVATE'
    recipient_id?: string | null
    recipient_name?: string | null
    recipient_email?: string | null
    recipient_role?: string | null
    author_email?: string | null
    author_name?: string | null
    author?: {
        nickname: string
        avatar_url: string
        email: string
    }
}

export interface SendBlogMessageOptions {
    visibility?: 'PUBLIC' | 'PRIVATE'
    recipient_id?: string | null
    recipient_name?: string | null
    recipient_email?: string | null
    recipient_role?: string | null
    author_email?: string | null
    author_name?: string | null
}

const FALLBACK_KEY = 'ops_blog_tareas_store'
const PRIVATE_STORE_KEY = 'ops_blog_private_store'

const DEFAULT_MESSAGES: BlogMessage[] = [
    {
        id: 'task-sem38-1',
        author_id: 'sys-planeacion',
        body: '📐 PLANEACIÓN SEMANA 38: Priorizar limpieza con Scooptram ST-50 y ST-68 en rebaje 13-480 para cumplir meta de 3,500 Tons de mineral.',
        is_task: true,
        task_status: 'COMPLETED',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        author: {
            nickname: 'Jefe Planeación',
            avatar_url: '',
            email: 'planeacion@rayamina.com'
        }
    },
    {
        id: 'task-sem38-2',
        author_id: 'sys-superintendencia',
        body: '⛏️ SUPERINTENDENCIA: Verificar amacice y ventilación en frente 3-480 antes de meter Jumbo en el segundo turno.',
        is_task: true,
        task_status: 'PENDING',
        created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
        author: {
            nickname: 'Superintendente Mina',
            avatar_url: '',
            email: 'superintendente@rayamina.com'
        }
    },
    {
        id: 'task-sem38-3',
        author_id: 'sys-supervisor',
        body: '✅ Reporte de Turno: Se concluyó rezaga en 13-480 sin incidentes. Equipo ST-50 operando al 100%.',
        is_task: false,
        task_status: null,
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
        author: {
            nickname: 'Supervisor en Turno',
            avatar_url: '',
            email: 'supervisor@rayamina.com'
        }
    }
]

async function getUsersMap(): Promise<Record<string, { nickname: string; avatar_url: string; email: string }>> {
    const map: Record<string, { nickname: string; avatar_url: string; email: string }> = {}
    const { data } = await supabase.from('sys_users').select('id, nickname, avatar_url, email')
    if (data) {
        data.forEach((u: any) => {
            map[u.id] = {
                nickname: u.nickname || u.email?.split('@')[0] || 'Usuario',
                avatar_url: u.avatar_url || '',
                email: u.email || 'operaciones@rayamina.com'
            }
        })
    }
    return map
}

async function getFallbackMessages(): Promise<BlogMessage[]> {
    const { data } = await supabase
        .from('sys_config')
        .select('value_json')
        .eq('key_name', FALLBACK_KEY)
        .maybeSingle()

    if (data?.value_json && Array.isArray(data.value_json)) {
        return data.value_json as BlogMessage[]
    }

    await supabase.from('sys_config').upsert({
        key_name: FALLBACK_KEY,
        value_json: DEFAULT_MESSAGES,
        description: 'Almacén de respaldo para Blog de Tareas Operativas'
    }, { onConflict: 'key_name' })

    return DEFAULT_MESSAGES
}

async function saveFallbackMessages(messages: BlogMessage[]) {
    await supabase.from('sys_config').upsert({
        key_name: FALLBACK_KEY,
        value_json: messages,
        description: 'Almacén de respaldo para Blog de Tareas Operativas'
    }, { onConflict: 'key_name' })
}

async function getPrivateMessages(): Promise<BlogMessage[]> {
    const { data } = await supabase
        .from('sys_config')
        .select('value_json')
        .eq('key_name', PRIVATE_STORE_KEY)
        .maybeSingle()

    if (data?.value_json && Array.isArray(data.value_json)) {
        return data.value_json as BlogMessage[]
    }
    return []
}

async function savePrivateMessages(messages: BlogMessage[]) {
    await supabase.from('sys_config').upsert({
        key_name: PRIVATE_STORE_KEY,
        value_json: messages,
        description: 'Mensajes y tareas privadas de bitácora por usuario destinatario'
    }, { onConflict: 'key_name' })
}

export const BlogService = {
    // 1. Obtener todos los mensajes del blog (combinando tabla pública y almacén privado/respaldo)
    async getMessages(): Promise<BlogMessage[]> {
        let publicRows: BlogMessage[] = []
        try {
            const { data, error } = await supabase
                .from('blog_tareas')
                .select('*')
                .order('created_at', { ascending: true })

            if (!error && data && data.length > 0) {
                const usersMap = await getUsersMap()
                publicRows = data.map((row: any) => ({
                    ...row,
                    visibility: row.visibility || 'PUBLIC',
                    author: usersMap[row.author_id] || {
                        nickname: row.author_name || 'Operaciones Mina',
                        avatar_url: '',
                        email: row.author_email || 'mina@rayamina.com'
                    }
                })) as BlogMessage[]
            }
        } catch (e) {
            console.warn('Usando almacén de respaldo para blog_tareas:', e)
        }

        const [fallback, privateMsgs] = await Promise.all([
            getFallbackMessages(),
            getPrivateMessages()
        ])

        const mergedMap = new Map<string, BlogMessage>()
        publicRows.forEach(m => mergedMap.set(m.id, m))
        fallback.forEach(m => {
            if (!mergedMap.has(m.id)) mergedMap.set(m.id, m)
        })
        privateMsgs.forEach(m => {
            mergedMap.set(m.id, { ...m, visibility: 'PRIVATE' })
        })
        return Array.from(mergedMap.values()).sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
    },

    // 2. Enviar Mensaje Normal o Tarea (Público o Privado)
    async sendMessage(
        authorId: string,
        body: string,
        isTask: boolean = false,
        options?: SendBlogMessageOptions
    ) {
        const usersMap = await getUsersMap()
        const visibility = options?.visibility || 'PUBLIC'
        const authorInfo = usersMap[authorId] || {
            nickname: options?.author_name || 'Supervisor / Jefe',
            avatar_url: '',
            email: options?.author_email || 'operaciones@rayamina.com'
        }

        // Mensajes privados se guardan en almacén privado aislado (ops_blog_private_store)
        if (visibility === 'PRIVATE') {
            const currentPriv = await getPrivateMessages()
            const newPrivMsg: BlogMessage = {
                id: 'priv-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                author_id: authorId,
                body: body.trim(),
                is_task: isTask,
                task_status: isTask ? 'PENDING' : null,
                created_at: new Date().toISOString(),
                visibility: 'PRIVATE',
                recipient_id: options?.recipient_id || null,
                recipient_name: options?.recipient_name || null,
                recipient_email: options?.recipient_email || null,
                recipient_role: options?.recipient_role || null,
                author_email: options?.author_email || authorInfo.email,
                author_name: options?.author_name || authorInfo.nickname,
                author: authorInfo
            }
            await savePrivateMessages([...currentPriv, newPrivMsg])
            return newPrivMsg
        }

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authorId)
        if (isUuid) {
            const { data, error } = await supabase
                .from('blog_tareas')
                .insert([{
                    author_id: authorId,
                    body: body.trim(),
                    is_task: isTask,
                    task_status: isTask ? 'PENDING' : null
                }])
                .select()
                .single()

            if (!error && data) {
                return { ...data, visibility: 'PUBLIC', author: authorInfo }
            }
        }

        // Almacén JSON público (ops_blog_tareas_store)
        const current = await getFallbackMessages()
        const newMsg: BlogMessage = {
            id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            author_id: authorId,
            body: body.trim(),
            is_task: isTask,
            task_status: isTask ? 'PENDING' : null,
            created_at: new Date().toISOString(),
            visibility: 'PUBLIC',
            author_email: options?.author_email || authorInfo.email,
            author_name: options?.author_name || authorInfo.nickname,
            author: authorInfo
        }
        const updated = [...current, newMsg]
        await saveFallbackMessages(updated)
        return newMsg
    },

    // 3. Marcar tarea como Completada o Rechazada
    async resolveTask(messageId: string, status: 'COMPLETED' | 'REJECTED', resolverId: string) {
        const { data, error } = await supabase
            .from('blog_tareas')
            .update({
                task_status: status,
                resolved_by: resolverId,
                resolved_at: new Date().toISOString()
            })
            .eq('id', messageId)
            .select()
            .single()

        if (!error && data) return data

        if (messageId.startsWith('priv-')) {
            const priv = await getPrivateMessages()
            const updatedPriv = priv.map(m =>
                m.id === messageId
                    ? { ...m, task_status: status, resolved_by: resolverId, resolved_at: new Date().toISOString() }
                    : m
            )
            await savePrivateMessages(updatedPriv)
            return updatedPriv.find(m => m.id === messageId)
        }

        const current = await getFallbackMessages()
        const updated = current.map(m =>
            m.id === messageId
                ? { ...m, task_status: status, resolved_by: resolverId, resolved_at: new Date().toISOString() }
                : m
        )
        await saveFallbackMessages(updated)
        return updated.find(m => m.id === messageId)
    },

    // 4. Editar mensaje
    async editMessage(messageId: string, newBody: string) {
        if (messageId.startsWith('priv-')) {
            const priv = await getPrivateMessages()
            const updatedPriv = priv.map(m =>
                m.id === messageId ? { ...m, body: newBody.trim(), is_edited: true } : m
            )
            await savePrivateMessages(updatedPriv)
            return updatedPriv.find(m => m.id === messageId)
        }

        const { data, error } = await supabase
            .from('blog_tareas')
            .update({
                body: newBody.trim(),
                is_edited: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', messageId)
            .select()
            .single()

        if (!error && data) return data

        const current = await getFallbackMessages()
        const updated = current.map(m =>
            m.id === messageId ? { ...m, body: newBody.trim(), is_edited: true } : m
        )
        await saveFallbackMessages(updated)
        return updated.find(m => m.id === messageId)
    },

    // 5. Borrado lógico de mensaje/tarea (Tachado)
    async deleteMessage(messageId: string) {
        if (messageId.startsWith('priv-')) {
            const priv = await getPrivateMessages()
            const updatedPriv = priv.map(m =>
                m.id === messageId ? { ...m, is_deleted: true } : m
            )
            await savePrivateMessages(updatedPriv)
            return updatedPriv.find(m => m.id === messageId)
        }

        const { data, error } = await supabase
            .from('blog_tareas')
            .update({
                is_deleted: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', messageId)
            .select()
            .single()

        if (!error && data) return data

        const current = await getFallbackMessages()
        const updated = current.map(m =>
            m.id === messageId ? { ...m, is_deleted: true } : m
        )
        await saveFallbackMessages(updated)
        return updated.find(m => m.id === messageId)
    }
}
