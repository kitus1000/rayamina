'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { BlogService, BlogMessage } from '@/lib/blog-service'
import { supabase } from '@/lib/supabase'
import { Users, User, Send, CheckCircle, XCircle, Clock, MessageSquare, Loader2, Info, Printer, ShieldAlert, Pickaxe, Calendar } from 'lucide-react'

export default function BlogTareasPage() {
    const { user, sysRole, sysUserId } = useAuth()

    const [messages, setMessages] = useState<BlogMessage[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [isSendingTask, setIsSendingTask] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
    const [filterType, setFilterType] = useState<'ALL' | 'TASKS' | 'PENDING'>('ALL')

    const messagesEndRef = useRef<HTMLDivElement>(null)

    const effectiveUserId = sysUserId || user?.id || 'demo-user-123'

    // Initial Load
    useEffect(() => {
        loadInitialData()
    }, [effectiveUserId])

    // Subscription to new messages
    useEffect(() => {
        const channel = supabase
            .channel('blog_tareas_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'blog_tareas' },
                () => {
                    loadInitialData()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [effectiveUserId])

    // Auto scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages.length])

    const loadInitialData = async () => {
        try {
            setIsLoading(true)
            setErrorMsg(null)
            const msgs = await BlogService.getMessages()
            setMessages(msgs || [])
        } catch (error: any) {
            console.error('Error loading blog data', error)
            setErrorMsg(null)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim()) return

        const body = newMessage
        const isTask = isSendingTask
        setNewMessage('')
        setIsSendingTask(false)

        try {
            if (editingMessageId) {
                await BlogService.editMessage(editingMessageId, body)
                setEditingMessageId(null)
            } else {
                await BlogService.sendMessage(effectiveUserId, body, isTask)
            }
            await loadInitialData()
        } catch (error) {
            console.error('Error saving message', error)
        }
    }

    const handleDeleteMessage = async (msgId: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este mensaje? Quedará tachado permanentemente.')) return
        try {
            await BlogService.deleteMessage(msgId)
            await loadInitialData()
        } catch (error) {
            console.error('Error deleting message', error)
        }
    }

    const handleEditClick = (msg: BlogMessage) => {
        setEditingMessageId(msg.id)
        setNewMessage(msg.body)
        setIsSendingTask(msg.is_task)
    }

    const handleTaskAction = async (msgId: string, status: 'COMPLETED' | 'REJECTED') => {
        const accion = status === 'COMPLETED' ? 'completar' : 'rechazar'
        const justificacion = window.prompt(`Ingresa un comentario para ${accion} la tarea (opcional pero recomendado):`)
        if (justificacion === null) return

        try {
            await BlogService.resolveTask(msgId, status, effectiveUserId)
            const prefix = status === 'COMPLETED' ? '✅ Tarea Completada:' : '❌ Tarea Rechazada:'
            await BlogService.sendMessage(effectiveUserId, `${prefix} ${justificacion || 'Confirmado en turno'}`, false)
            await loadInitialData()
        } catch (error) {
            console.error('Error resolving task', error)
        }
    }

    // Role helpers
    const canCreateTasks = ['SUPER_ADMIN', 'DIRECTOR_OPERATIVO', 'GERENTE', 'SUPERINTENDENTE', 'JEFE_MINA', 'JEFE_PLANEACION', 'JEFE_RH'].includes(sysRole || 'SUPER_ADMIN')
    const canResolveTasks = ['SUPERVISOR', 'SUPERINTENDENTE', 'GERENTE', 'JEFE_MINA', 'SUPER_ADMIN'].includes(sysRole || 'SUPER_ADMIN')

    const filteredMessages = messages.filter(m => {
        if (filterType === 'TASKS') return m.is_task
        if (filterType === 'PENDING') return m.is_task && m.task_status === 'PENDING'
        return true
    })

    const pendingCount = messages.filter(m => m.is_task && m.task_status === 'PENDING' && !m.is_deleted).length
    const completedCount = messages.filter(m => m.is_task && m.task_status === 'COMPLETED' && !m.is_deleted).length

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6">
            {/* Sidebar de Resumen y Filtros */}
            <div className="w-full md:w-80 flex flex-col gap-4 shrink-0">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500">
                            <MessageSquare size={24} />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-base">Bitácora y Tareas</h3>
                            <p className="text-xs text-slate-400">Coordinación Jefatura ↔ Mina</p>
                        </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                        Muro oficial de consignas operativas entre Planeación, Superintendencia y Supervisores de Turno.
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
                            <div className="text-xl font-black text-amber-500">{pendingCount}</div>
                            <div className="text-[10px] font-bold uppercase text-slate-400">Tareas Pendientes</div>
                        </div>
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
                            <div className="text-xl font-black text-emerald-500">{completedCount}</div>
                            <div className="text-[10px] font-bold uppercase text-slate-400">Completadas</div>
                        </div>
                    </div>

                    {/* Filtros rápidos */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-800">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Filtrar vista:</span>
                        <div className="flex flex-col gap-1.5">
                            {[
                                { id: 'ALL', label: '📋 Todos los Mensajes y Consignas' },
                                { id: 'TASKS', label: '📌 Solo Tareas Operativas' },
                                { id: 'PENDING', label: '⏳ Tareas Pendientes de Turno' },
                            ].map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => setFilterType(f.id as any)}
                                    className={`text-left px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                                        filterType === f.id
                                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md'
                                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-amber-500/40'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={() => window.print()}
                        className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition-all shadow-sm html2pdf__ignore"
                    >
                        <Printer size={15} />
                        Imprimir / Exportar Bitácora PDF
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden relative shadow-xl">

                {/* Header */}
                <div className="h-16 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 bg-slate-950/50">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Pickaxe className="text-amber-500" size={20} /> Muro General de Consignas Operativas — Semana 38
                    </h2>
                    <span className="text-xs font-mono font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                        En Línea • Unidad El Herrero
                    </span>
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 custom-scrollbar bg-slate-950/30">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                        </div>
                    ) : filteredMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500">
                            <MessageSquare size={48} className="mb-4 opacity-50 text-slate-600" />
                            <p className="font-bold">No hay mensajes con este filtro.</p>
                        </div>
                    ) : (
                        filteredMessages.map((msg, idx) => {
                            const isMe = msg.author_id === effectiveUserId
                            const showAvatar = idx === 0 || filteredMessages[idx - 1].author_id !== msg.author_id
                            const isDeleted = msg.is_deleted

                            return (
                                <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                    {showAvatar ? (
                                        <div className="w-9 h-9 rounded-full bg-slate-800 flex-shrink-0 border border-slate-700 flex items-center justify-center overflow-hidden shadow">
                                            {msg.author?.avatar_url ? (
                                                <img src={msg.author.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={16} className="text-amber-500" />
                                            )}
                                        </div>
                                    ) : <div className="w-9 h-9 flex-shrink-0" />}

                                    <div className={`flex flex-col max-w-[82%] ${isMe ? 'items-end' : 'items-start'}`}>
                                        {showAvatar && (
                                            <span className="text-xs font-bold text-slate-400 mb-1 ml-1 mr-1">
                                                {isMe ? 'Tú (' + (sysRole || 'Operaciones') + ')' : (msg.author?.nickname || msg.author?.email?.split('@')[0] || 'Mando Operativo')}
                                            </span>
                                        )}

                                        <div className={`p-4 rounded-2xl text-sm shadow-md relative group ${msg.is_task
                                            ? 'bg-amber-500/15 border-amber-500/40 border-2 text-white'
                                            : isMe
                                                ? 'bg-blue-600 text-white rounded-tr-sm'
                                                : 'bg-slate-800 text-slate-100 rounded-tl-sm border border-slate-700'
                                            } ${isDeleted ? 'opacity-50' : ''}`}>

                                            {/* Acciones del mensaje (Editar/Borrar) */}
                                            {isMe && !isDeleted && (
                                                <div className="absolute top-1 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 rounded-md px-2 py-0.5 flex gap-2 shadow border border-slate-700 -mt-5">
                                                    <button onClick={() => handleEditClick(msg)} className="text-xs text-slate-300 hover:text-amber-400 font-bold" type="button">Editar</button>
                                                    <button onClick={() => handleDeleteMessage(msg.id)} className="text-xs text-rose-400 hover:text-rose-300 font-bold" type="button">Borrar</button>
                                                </div>
                                            )}

                                            {msg.is_task && !isDeleted && (
                                                <div className="flex items-center gap-1.5 text-xs font-black text-amber-500 mb-2 uppercase tracking-wider bg-slate-950/80 w-fit px-2.5 py-1 rounded-md border border-amber-500/30">
                                                    <Info size={13} />
                                                    Consigna / Tarea Operativa
                                                </div>
                                            )}

                                            <p className={`whitespace-pre-wrap leading-relaxed font-medium ${isDeleted ? 'line-through text-slate-500 italic' : ''}`}>
                                                {isDeleted ? 'Este mensaje fue eliminado.' : msg.body}
                                            </p>
                                            {msg.is_edited && !isDeleted && (
                                                <span className="text-[10px] opacity-70 italic ml-2">(editado)</span>
                                            )}

                                            {msg.is_task && !isDeleted && (
                                                <div className="mt-4 pt-3 border-t border-slate-700/60 flex flex-wrap items-center gap-2">
                                                    {msg.task_status === 'PENDING' ? (
                                                        <>
                                                            <div className="flex items-center gap-1 text-xs font-bold text-amber-400 mr-auto bg-slate-950/70 px-2.5 py-1 rounded-lg border border-amber-500/30">
                                                                <Clock size={12} /> Pendiente de Ejecución
                                                            </div>
                                                            {canResolveTasks && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleTaskAction(msg.id, 'COMPLETED')}
                                                                        className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-500 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow"
                                                                    >
                                                                        <CheckCircle size={14} /> Marcar Cumplida
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleTaskAction(msg.id, 'REJECTED')}
                                                                        className="px-3 py-1.5 bg-rose-600 text-white hover:bg-rose-500 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow"
                                                                    >
                                                                        <XCircle size={14} /> Reportar Impedimento
                                                                    </button>
                                                                </>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className={`flex w-full items-center gap-1.5 text-xs font-bold p-2 rounded-lg bg-slate-950/80 ${msg.task_status === 'COMPLETED' ? 'text-emerald-400 border border-emerald-500/30' : 'text-rose-400 border border-rose-500/30'}`}>
                                                            {msg.task_status === 'COMPLETED' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                                            {msg.task_status === 'COMPLETED' ? 'Tarea Cumplida en Turno ✔' : 'Impedimento Reportado ✖'}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-slate-500 mt-1 mr-1 ml-1 font-semibold">
                                            {new Date(msg.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            )
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-slate-800 bg-slate-950/60 shrink-0 html2pdf__ignore">
                    <form onSubmit={handleSendMessage} className="flex gap-3">
                        <div className="flex-1 bg-slate-900 border-2 border-slate-700 rounded-xl flex items-center px-2 focus-within:border-amber-500 transition-all">

                            {editingMessageId && (
                                <div className="text-[10px] text-amber-500 whitespace-nowrap px-2 font-bold uppercase tracking-wider hidden md:block">
                                    Editando
                                </div>
                            )}

                            {canCreateTasks && !editingMessageId && (
                                <button
                                    type="button"
                                    onClick={() => setIsSendingTask(!isSendingTask)}
                                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors border flex items-center gap-1.5 shrink-0 ${isSendingTask
                                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow'
                                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                                        }`}
                                    title={isSendingTask ? "Modo Tarea Activado" : "Asignar como Tarea"}
                                >
                                    <Info size={14} />
                                    <span className="hidden sm:inline">{isSendingTask ? '📌 Es Tarea Oficial' : '¿Asignar Tarea?'}</span>
                                </button>
                            )}

                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder={
                                    editingMessageId
                                        ? "Edita tu mensaje..."
                                        : isSendingTask ? "Escribe la consigna o tarea para el turno..." : "Escribe un reporte rápido o comentario en la bitácora..."
                                }
                                className="flex-1 bg-transparent border-none outline-none px-3 py-3 text-sm text-white placeholder:text-slate-400"
                            />
                            {editingMessageId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingMessageId(null)
                                        setNewMessage('')
                                    }}
                                    className="text-slate-400 hover:text-white px-2 py-1 text-xs font-bold"
                                >
                                    Cancelar
                                </button>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="px-5 h-12 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shrink-0 shadow-lg"
                        >
                            <Send size={18} />
                            <span className="hidden sm:inline text-xs font-black uppercase">Enviar</span>
                        </button>
                    </form>
                </div>

            </div>
        </div>
    )
}
