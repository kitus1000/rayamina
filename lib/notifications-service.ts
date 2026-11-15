import { supabase } from './supabase'

export type OpsNotificationType =
    | 'CREW_REMOVED'
    | 'REPORT_SUBMITTED'
    | 'REPORT_CORRECTED'
    | 'REPORT_APPROVED'
    | 'PRIVATE_TASK'

export interface OpsNotification {
    id: string
    type: OpsNotificationType
    title: string
    message: string
    details?: string[]
    target_user_ids?: string[]
    target_user_emails?: string[]
    target_employee_id?: string | null
    target_employee_name?: string | null
    target_roles?: string[]
    created_by_name: string
    created_by_email?: string | null
    created_at: string
    link?: string
    read_by: string[]
}

export interface SquadSupervisorMeta {
    cuadrilla_id: string
    supervisor_employee_id?: string | null
    supervisor_employee_name?: string | null
    supervisor_user_id?: string | null
    supervisor_user_email?: string | null
    supervisor_user_name?: string | null
    updated_at?: string
}

export interface ReportRevisionEntry {
    id: string
    edited_at: string
    edited_by_name: string
    edited_by_email?: string | null
    edited_by_role?: string | null
    approved_with_changes: boolean
    changes: string[]
    note?: string
}

const NOTIFICATIONS_KEY = 'ops_notifications_store'
const SQUAD_SUPERVISORS_KEY = 'ops_squad_supervisors_meta'
const REPORT_REVISIONS_KEY = 'ops_report_revisions_log'
const REPORT_CREATORS_KEY = 'ops_report_creators_log'

export interface ReportCreatorMeta {
    report_id: string
    creator_user_id?: string | null
    creator_email?: string | null
    creator_name?: string | null
    creator_role?: string | null
    cuadrilla_id?: string | null
    supervisor_employee_id?: string | null
    supervisor_name?: string | null
    supervisor_user_email?: string | null
    created_at?: string
}

function normalizeText(value?: string | null): string {
    return (value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\bsup\.?\b/g, '')
        .trim()
}

async function readSysConfigJson<T>(keyName: string, fallback: T): Promise<T> {
    try {
        const { data, error } = await supabase
            .from('sys_config')
            .select('value_json')
            .eq('key_name', keyName)
            .maybeSingle()
        if (error || !data || data.value_json == null) return fallback
        return data.value_json as T
    } catch {
        return fallback
    }
}

async function writeSysConfigJson(keyName: string, valueJson: unknown, description: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('sys_config')
            .upsert(
                {
                    key_name: keyName,
                    value_json: valueJson,
                    description,
                    updated_at: new Date().toISOString()
                },
                { onConflict: 'key_name' }
            )
        return !error
    } catch {
        return false
    }
}

export async function fetchAllNotifications(): Promise<OpsNotification[]> {
    const raw = await readSysConfigJson<OpsNotification[]>(NOTIFICATIONS_KEY, [])
    return Array.isArray(raw) ? raw : []
}

export async function pushNotification(
    input: Omit<OpsNotification, 'id' | 'created_at' | 'read_by'>
): Promise<OpsNotification | null> {
    const existing = await fetchAllNotifications()
    const item: OpsNotification = {
        ...input,
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        created_at: new Date().toISOString(),
        read_by: []
    }
    const nextList = [item, ...existing].slice(0, 150)
    const ok = await writeSysConfigJson(
        NOTIFICATIONS_KEY,
        nextList,
        'Notificaciones operativas de cuadrillas, aprobaciones con cambios y bitácora privada'
    )
    if (ok && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('raya-notifications-updated'))
    }
    return ok ? item : null
}

export function doesNotificationMatchUser(
    notif: OpsNotification,
    params: { userId?: string | null; email?: string | null; role?: string | null; fullName?: string | null }
): boolean {
    const email = (params.email || '').toLowerCase().trim()
    const userId = (params.userId || '').trim()
    const role = (params.role || '').trim()
    const normFull = normalizeText(params.fullName)

    if (userId && notif.target_user_ids?.some(id => id === userId)) return true
    if (email && notif.target_user_emails?.some(e => e.toLowerCase().trim() === email)) return true
    if (role && notif.target_roles?.includes(role)) return true

    const normEmpName = normalizeText(notif.target_employee_name)
    if (normEmpName && normFull) {
        const tokens = normEmpName.split(/\s+/).filter(t => t.length >= 3)
        if (tokens.length >= 2 && tokens.every(t => normFull.includes(t))) {
            return true
        }
        if (normFull === normEmpName) return true
    }

    // Never expose PRIVATE_TASK to admins unless they were explicitly targeted above
    if (notif.type === 'PRIVATE_TASK') {
        return false
    }

    // Let JEFE_MINA / SUPER_ADMIN audit crew-removal alerts even if a supervisor didn't have a linked email yet
    if (notif.type === 'CREW_REMOVED' && (role === 'SUPER_ADMIN' || role === 'JEFE_MINA')) {
        return true
    }

    return false
}

export function isNotificationRead(notif: OpsNotification, readerKey: string): boolean {
    if (!readerKey) return false
    return Array.isArray(notif.read_by) && notif.read_by.includes(readerKey.toLowerCase())
}

export async function markNotificationAsRead(notificationId: string, readerKey: string): Promise<void> {
    if (!readerKey) return
    const key = readerKey.toLowerCase()
    const all = await fetchAllNotifications()
    const next = all.map(n =>
        n.id === notificationId && !n.read_by.includes(key)
            ? { ...n, read_by: [...n.read_by, key] }
            : n
    )
    await writeSysConfigJson(
        NOTIFICATIONS_KEY,
        next,
        'Notificaciones operativas de cuadrillas, aprobaciones con cambios y bitácora privada'
    )
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('raya-notifications-updated'))
    }
}

export async function markAllNotificationsAsRead(notificationIds: string[], readerKey: string): Promise<void> {
    if (!readerKey || notificationIds.length === 0) return
    const key = readerKey.toLowerCase()
    const idSet = new Set(notificationIds)
    const all = await fetchAllNotifications()
    const next = all.map(n =>
        idSet.has(n.id) && !n.read_by.includes(key)
            ? { ...n, read_by: [...n.read_by, key] }
            : n
    )
    await writeSysConfigJson(
        NOTIFICATIONS_KEY,
        next,
        'Notificaciones operativas de cuadrillas, aprobaciones con cambios y bitácora privada'
    )
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('raya-notifications-updated'))
    }
}

// --- Squad Supervisors Metadata ---
export async function getSquadSupervisorsMeta(): Promise<Record<string, SquadSupervisorMeta>> {
    const raw = await readSysConfigJson<Record<string, SquadSupervisorMeta>>(SQUAD_SUPERVISORS_KEY, {})
    return raw && typeof raw === 'object' ? raw : {}
}

export async function saveSquadSupervisorMeta(
    cuadrillaId: string,
    meta: Omit<SquadSupervisorMeta, 'cuadrilla_id' | 'updated_at'>
): Promise<Record<string, SquadSupervisorMeta>> {
    const current = await getSquadSupervisorsMeta()
    const next: Record<string, SquadSupervisorMeta> = {
        ...current,
        [cuadrillaId]: {
            ...current[cuadrillaId],
            ...meta,
            cuadrilla_id: cuadrillaId,
            updated_at: new Date().toISOString()
        }
    }
    await writeSysConfigJson(
        SQUAD_SUPERVISORS_KEY,
        next,
        'Mapeo extendido de supervisor operativo y usuario web asignado a cada cuadrilla'
    )
    return next
}

// --- Daily Report Revision / Correction Logs ---
export async function getAllReportRevisions(): Promise<Record<string, ReportRevisionEntry[]>> {
    const raw = await readSysConfigJson<Record<string, ReportRevisionEntry[]>>(REPORT_REVISIONS_KEY, {})
    return raw && typeof raw === 'object' ? raw : {}
}

export async function getReportRevisions(reportId: string): Promise<ReportRevisionEntry[]> {
    const all = await getAllReportRevisions()
    return Array.isArray(all[reportId]) ? all[reportId] : []
}

export async function appendReportRevision(
    reportId: string,
    entry: Omit<ReportRevisionEntry, 'id' | 'edited_at'>
): Promise<ReportRevisionEntry[]> {
    const all = await getAllReportRevisions()
    const prev = Array.isArray(all[reportId]) ? all[reportId] : []
    const newEntry: ReportRevisionEntry = {
        ...entry,
        id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        edited_at: new Date().toISOString()
    }
    const updatedList = [newEntry, ...prev]
    await writeSysConfigJson(
        REPORT_REVISIONS_KEY,
        { ...all, [reportId]: updatedList },
        'Historial de revisiones, correcciones y aprobaciones de reportes diarios'
    )
    return updatedList
}

export async function saveReportCreatorMeta(
    reportId: string,
    meta: Omit<ReportCreatorMeta, 'report_id' | 'created_at'>
): Promise<void> {
    const all = await readSysConfigJson<Record<string, ReportCreatorMeta>>(REPORT_CREATORS_KEY, {})
    const next = {
        ...(all && typeof all === 'object' ? all : {}),
        [reportId]: {
            ...meta,
            report_id: reportId,
            created_at: new Date().toISOString()
        }
    }
    await writeSysConfigJson(
        REPORT_CREATORS_KEY,
        next,
        'Registro de quién envió cada reporte diario para notificaciones de revisión y aprobación'
    )
}

export async function getReportCreatorMeta(reportId: string): Promise<ReportCreatorMeta | null> {
    const all = await readSysConfigJson<Record<string, ReportCreatorMeta>>(REPORT_CREATORS_KEY, {})
    return all && typeof all === 'object' ? (all[reportId] || null) : null
}
