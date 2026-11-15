'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, CheckCheck, UserMinus, FileEdit, CheckCircle2, Lock, ExternalLink } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import {
    OpsNotification,
    fetchAllNotifications,
    doesNotificationMatchUser,
    isNotificationRead,
    markNotificationAsRead,
    markAllNotificationsAsRead
} from '@/lib/notifications-service'

export default function NotificationBell() {
    const { user, sysUserId, sysRole, fullName } = useAuth()
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [items, setItems] = useState<OpsNotification[]>([])
    const panelRef = useRef<HTMLDivElement>(null)

    const readerKey = (user?.email || sysUserId || '').toLowerCase()

    const loadNotifications = useCallback(async () => {
        if (!user && !sysUserId) return
        const all = await fetchAllNotifications()
        const mine = all.filter(n =>
            doesNotificationMatchUser(n, {
                userId: sysUserId,
                email: user?.email,
                role: sysRole,
                fullName
            })
        )
        setItems(mine.slice(0, 40))
    }, [user, sysUserId, sysRole, fullName])

    useEffect(() => {
        loadNotifications()
        const onUpdated = () => loadNotifications()
        const onVis = () => {
            if (document.visibilityState === 'visible') loadNotifications()
        }
        window.addEventListener('raya-notifications-updated', onUpdated)
        document.addEventListener('visibilitychange', onVis)
        const timer = setInterval(loadNotifications, 25000)
        return () => {
            window.removeEventListener('raya-notifications-updated', onUpdated)
            document.removeEventListener('visibilitychange', onVis)
            clearInterval(timer)
        }
    }, [loadNotifications])

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const unreadIds = items.filter(n => !isNotificationRead(n, readerKey)).map(n => n.id)
    const unreadCount = unreadIds.length

    const handleOpenItem = async (notif: OpsNotification) => {
        if (!isNotificationRead(notif, readerKey)) {
            await markNotificationAsRead(notif.id, readerKey)
        }
        setOpen(false)
        if (notif.link) {
            router.push(notif.link)
        }
    }

    const handleMarkAllRead = async () => {
        await markAllNotificationsAsRead(unreadIds, readerKey)
    }

    const getTypeMeta = (type: OpsNotification['type']) => {
        switch (type) {
            case 'CREW_REMOVED':
                return {
                    icon: <UserMinus size={15} className="text-rose-400" />,
                    badgeBg: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
                    label: 'Baja / Cambio de Cuadrilla'
                }
            case 'REPORT_SUBMITTED':
                return {
                    icon: <Bell size={15} className="text-sky-400" />,
                    badgeBg: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
                    label: 'Reporte Enviado a Revisión'
                }
            case 'REPORT_CORRECTED':
                return {
                    icon: <FileEdit size={15} className="text-amber-400" />,
                    badgeBg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
                    label: 'Corrección y Aprobación'
                }
            case 'PRIVATE_TASK':
                return {
                    icon: <Lock size={15} className="text-violet-400" />,
                    badgeBg: 'bg-violet-500/15 border-violet-500/30 text-violet-400',
                    label: 'Mensaje Privado'
                }
            default:
                return {
                    icon: <CheckCircle2 size={15} className="text-emerald-400" />,
                    badgeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
                    label: 'Reporte Aprobado'
                }
        }
    }

    const formatTime = (iso: string) => {
        try {
            const d = new Date(iso)
            return d.toLocaleString('es-MX', {
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            })
        } catch {
            return iso
        }
    }

    return (
        <div className="relative" ref={panelRef}>
            <button
                onClick={() => {
                    const next = !open
                    setOpen(next)
                    if (next) loadNotifications()
                }}
                title="Centro de Notificaciones Operativas"
                className="relative p-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition-all cursor-pointer"
            >
                <Bell size={18} className={unreadCount > 0 ? 'text-amber-400' : ''} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center shadow-lg border-2 border-slate-900">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[75vh] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50">
                    <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2">
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-white">
                                Notificaciones Operativas
                            </h3>
                            <p className="text-[11px] text-slate-400">
                                {unreadCount > 0
                                    ? `${unreadCount} sin leer`
                                    : 'Todo al día'}
                            </p>
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 cursor-pointer"
                            >
                                <CheckCheck size={13} /> Leer todas
                            </button>
                        )}
                    </div>

                    <div className="overflow-y-auto divide-y divide-slate-800/80 max-h-[60vh]">
                        {items.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-xs">
                                No tienes notificaciones recientes de cuadrillas, reportes ni mensajes privados.
                            </div>
                        ) : (
                            items.map(notif => {
                                const unread = !isNotificationRead(notif, readerKey)
                                const meta = getTypeMeta(notif.type)
                                return (
                                    <div
                                        key={notif.id}
                                        onClick={() => handleOpenItem(notif)}
                                        className={`p-3.5 transition-colors cursor-pointer hover:bg-slate-800/60 ${
                                            unread ? 'bg-slate-800/35 border-l-2 border-l-amber-500' : ''
                                        }`}
                                    >
                                        <div className="flex items-start gap-2.5">
                                            <div className={`p-1.5 rounded-lg border shrink-0 mt-0.5 ${meta.badgeBg}`}>
                                                {meta.icon}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                        {meta.label}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 shrink-0">
                                                        {formatTime(notif.created_at)}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-bold text-white mt-0.5 leading-snug">
                                                    {notif.title}
                                                </p>
                                                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                                    {notif.message}
                                                </p>
                                                {notif.details && notif.details.length > 0 && (
                                                    <ul className="mt-2 space-y-1 bg-slate-950/70 border border-slate-800 rounded-lg p-2">
                                                        {notif.details.slice(0, 5).map((d, idx) => (
                                                            <li key={idx} className="text-[11px] text-amber-300 leading-snug">
                                                                • {d}
                                                            </li>
                                                        ))}
                                                        {notif.details.length > 5 && (
                                                            <li className="text-[10px] text-slate-400 italic">
                                                                + {notif.details.length - 5} cambio(s) adicional(es)...
                                                            </li>
                                                        )}
                                                    </ul>
                                                )}
                                                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                                                    <span>Por: <strong className="text-slate-300">{notif.created_by_name}</strong></span>
                                                    <span className="flex items-center gap-1 text-amber-400 font-semibold">
                                                        {unread ? <Check size={11} /> : null}
                                                        {notif.link ? (
                                                            <>Ver <ExternalLink size={10} /></>
                                                        ) : null}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
