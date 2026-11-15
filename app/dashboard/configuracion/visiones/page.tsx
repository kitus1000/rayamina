'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    Save, Shield, Users, LayoutDashboard, Pickaxe,
    DollarSign, FileText, HardHat, Settings,
    MessageSquare, Calendar, CheckCircle, AlertCircle,
    ChevronRight, Eye, EyeOff
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

// Definición de todos los módulos del sistema (debe coincidir con Sidebar)
const ALL_MODULES = [
    { label: 'Panel Principal', icon: LayoutDashboard, path: '/dashboard', name: 'Dashboard Global' },
    { label: 'Panel Principal', icon: Calendar, path: '/dashboard/semana', name: 'Semana en Curso' },
    { label: 'Panel Principal', icon: Pickaxe, path: '/dashboard/operacion/reportes-diarios', name: 'Reportes Diarios' },
    { label: 'Panel Principal', icon: MessageSquare, path: '/dashboard/chat', name: 'Blog de Tareas' },
    { label: 'Administración', icon: DollarSign, path: '/dashboard/nomina', name: 'Pre-Nómina / Nómina' },
    { label: 'Administración', icon: FileText, path: '/dashboard/catalogos', name: 'Catálogos Base' },
    { label: 'Administración', icon: Users, path: '/dashboard/catalogos/empleados', name: 'Catálogo de Empleados' },
    { label: 'Administración', icon: HardHat, path: '/dashboard/configuracion/usuarios', name: 'Accesos / Usuarios' },
    { label: 'Administración', icon: Settings, path: '/dashboard/configuracion', name: 'Configuración General' },
]

export default function VisionesPage() {
    const [users, setUsers] = useState<any[]>([])
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
    const [allowedPaths, setAllowedPaths] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('sys_users')
            .select('id, email, role') // Select only safe columns first
            .eq('active', true)
            .order('email')

        if (data) {
            // Try to fetch views_json separately to see if it exists
            const { data: viewsData } = await supabase.from('sys_users').select('id, views_json').eq('active', true)

            let finalUsers: any[] = data;

            if (viewsData) {
                finalUsers = data.map(u => ({
                    ...u,
                    views_json: viewsData.find(v => v.id === u.id)?.views_json
                }))
                setUsers(finalUsers)
            } else {
                setUsers(finalUsers)
            }

            // Auto-select user if URL has userId
            const params = new URLSearchParams(window.location.search);
            const urlUserId = params.get('userId');
            if (urlUserId) {
                const toSelect = finalUsers.find(u => u.id === urlUserId);
                if (toSelect) {
                    setSelectedUserId(toSelect.id);
                    setAllowedPaths(Array.isArray(toSelect.views_json) ? toSelect.views_json : []);
                }
            }
        }
        setLoading(false)
    }

    const handleSelectUser = (user: any) => {
        setSelectedUserId(user.id)
        setAllowedPaths(Array.isArray(user.views_json) ? user.views_json : [])
        setMessage(null)
    }

    const togglePath = (path: string) => {
        if (allowedPaths.includes(path)) {
            setAllowedPaths(allowedPaths.filter(p => p !== path))
        } else {
            setAllowedPaths([...allowedPaths, path])
        }
    }

    const handleSave = async () => {
        if (!selectedUserId) return
        setSaving(true)
        setMessage(null)

        const { error } = await supabase
            .from('sys_users')
            .update({ views_json: allowedPaths })
            .eq('id', selectedUserId)

        if (error) {
            if (error.message.includes('views_json')) {
                setMessage({ type: 'error', text: '⚠️ ERROR CRÍTICO: La columna "views_json" no existe en la base de datos. Debes ejecutar la migración SQL en Supabase primero.' })
            } else {
                setMessage({ type: 'error', text: 'Error al ahorrar: ' + error.message })
            }
        } else {
            setMessage({ type: 'success', text: 'Visiones actualizadas correctamente' })
            fetchUsers() // Refresh list to update local state
        }
        setSaving(false)
    }

    const selectedUser = users.find(u => u.id === selectedUserId)

    return (
        <div className="max-w-6xl mx-auto pb-10">
            {/* Header */}
            <div className="mb-8">
                <Link href="/dashboard/configuracion" className="text-sm text-slate-400 hover:text-white flex items-center gap-1 mb-4 w-fit transition-colors">
                    ← Volver a Configuración
                </Link>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Shield className="text-amber-500" size={32} />
                    Gestión de Visiones
                </h1>
                <p className="text-slate-400 mt-2">Configura el acceso granular a los módulos del sistema para Jefes y Supervisores.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* Panel Izquierdo: Lista de Usuarios */}
                <div className="md:col-span-4 space-y-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center gap-2">
                            <Users size={18} className="text-amber-500" />
                            <h2 className="font-bold text-white">Usuarios Activos</h2>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                            {loading ? (
                                <div className="p-10 text-center text-slate-500 animate-pulse">Cargando...</div>
                            ) : (
                                users.map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => handleSelectUser(user)}
                                        className={`w-full text-left p-4 border-b border-slate-800/50 transition-all flex items-center justify-between group ${selectedUserId === user.id ? 'bg-amber-500/10 border-l-4 border-l-amber-500' : 'hover:bg-slate-800/50'}`}
                                    >
                                        <div className="overflow-hidden">
                                            <div className={`font-medium ${selectedUserId === user.id ? 'text-amber-500' : 'text-slate-200'}`}>
                                                {user.email.split('@')[0]}
                                            </div>
                                            <div className="text-xs text-slate-500 truncate">{user.email}</div>
                                            <div className="flex gap-2 mt-1">
                                                <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 uppercase font-bold">{user.role}</span>
                                                {user.views_json && user.views_json.length > 0 && (
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded font-bold">
                                                        {user.views_json.length} Vistas
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className={`text-slate-600 transition-transform ${selectedUserId === user.id ? 'translate-x-1 text-amber-500' : 'group-hover:translate-x-1'}`} />
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Panel Derecho: Configuración de Visiones */}
                <div className="md:col-span-8">
                    {selectedUserId ? (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col h-full shadow-2xl">
                            {/* Header Panel Derecho */}
                            <div className="p-6 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-bold text-white">Personalizar Visiones</h3>
                                    <p className="text-sm text-slate-400">Usuario: <span className="text-amber-500 font-mono">{selectedUser?.email}</span></p>
                                </div>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${saving ? 'bg-slate-700 text-slate-500' : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/30'}`}
                                >
                                    {saving ? 'Guardando...' : <><Save size={18} /> Guardar Cambios</>}
                                </button>
                            </div>

                            {/* Alertas */}
                            {message && (
                                <div className={`m-6 p-4 rounded-lg border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-red-500/10 border-red-500/50 text-red-400'}`}>
                                    {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                                    <span className="font-medium">{message.text}</span>
                                </div>
                            )}

                            {/* Lista de Módulos */}
                            <div className="p-6 space-y-6 overflow-y-auto max-h-[600px] custom-scrollbar">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {ALL_MODULES.map((module, idx) => {
                                        const isAllowed = allowedPaths.includes(module.path)
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => togglePath(module.path)}
                                                className={`flex items-center gap-4 p-4 rounded-xl border transition-all text-left group ${isAllowed
                                                    ? 'bg-amber-500/5 border-amber-500/30 text-white ring-1 ring-amber-500/10'
                                                    : 'bg-slate-800/30 border-slate-800 text-slate-500 hover:border-slate-700 hover:bg-slate-800/50'}`}
                                            >
                                                <div className={`p-2.5 rounded-lg transition-colors ${isAllowed ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-600 group-hover:text-slate-400'}`}>
                                                    <module.icon size={20} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-xs font-bold uppercase tracking-tighter opacity-50 mb-0.5">{module.label}</div>
                                                    <div className="font-semibold">{module.name}</div>
                                                </div>
                                                <div className={`p-1 rounded-full transition-colors ${isAllowed ? 'text-amber-500' : 'text-slate-700'}`}>
                                                    {isAllowed ? <Eye size={18} /> : <EyeOff size={18} />}
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="p-6 bg-slate-950/50 border-t border-slate-800 rounded-b-xl">
                                <p className="text-xs text-slate-500 flex items-start gap-2 italic">
                                    <AlertCircle size={14} className="mt-0.5" />
                                    Nota: Si el usuario tiene el rol 'SUPER_ADMIN', podrá ver todos los módulos independientemente de esta configuración.
                                    Los cambios surtirán efecto la próxima vez que el usuario inicie sesión o recargue la página.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-xl h-full flex flex-col items-center justify-center p-10 text-center">
                            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-600">
                                <Shield size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-400">Seleccione un Usuario</h3>
                            <p className="text-slate-500 max-w-xs mt-2">Elige un usuario de la lista de la izquierda para comenzar a personalizar sus visiones del sistema.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
