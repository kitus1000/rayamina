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
    author?: {
        nickname: string
        avatar_url: string
        email: string
    }
}

const FALLBACK_KEY = 'ops_blog_tareas_store'

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

export const BlogService = {
    // 1. Obtener todos los mensajes del blog (con recuperación automática si falta FK o tabla)
    async getMessages(): Promise<BlogMessage[]> {
        try {
            const { data, error } = await supabase
                .from('blog_tareas')
                .select('*')
                .order('created_at', { ascending: true })

            if (!error && data) {
                const usersMap = await getUsersMap()
                if (data.length === 0) {
                    const fallback = await getFallbackMessages()
                    return fallback
                }
                return data.map((row: any) => ({
                    ...row,
                    author: usersMap[row.author_id] || {
                        nickname: 'Operaciones Mina',
                        avatar_url: '',
                        email: 'mina@rayamina.com'
                    }
                })) as BlogMessage[]
            }
        } catch (e) {
            console.warn('Usando almacén de respaldo para blog_tareas:', e)
        }

        return await getFallbackMessages()
    },

    // 2. Enviar Mensaje Normal o Tarea
    async sendMessage(authorId: string, body: string, isTask: boolean = false) {
        const usersMap = await getUsersMap()
        const authorInfo = usersMap[authorId] || {
            nickname: 'Supervisor / Jefe',
            avatar_url: '',
            email: 'operaciones@rayamina.com'
        }

        // Intentar insertar en tabla primaria si es UUID válido
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
                return { ...data, author: authorInfo }
            }
        }

        // Fallback en sys_config
        const current = await getFallbackMessages()
        const newMsg: BlogMessage = {
            id: 'msg-' + Date.now(),
            author_id: authorId,
            body: body.trim(),
            is_task: isTask,
            task_status: isTask ? 'PENDING' : null,
            created_at: new Date().toISOString(),
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
