'use client'

import React, { useState, useEffect } from 'react'
import {
    Plus,
    Edit2,
    Trash2,
    Lock,
    ShieldCheck,
    Mail,
    Users,
    Settings,
    Save,
    Eye,
    Smartphone,
    UserCheck,
} from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DEFAULT_ROLE_VIEWS } from '@/lib/auth-context'
import { ALL_SYSTEM_MODULES } from '@/lib/system-modules'
import { toast } from 'sonner'

type SysRoleConfig = {
    role: string
    nombre_mostrar: string
    can_approve_reports: boolean
    can_edit_approved: boolean
}

type SysUser = {
    id: string
    email: string
    full_name?: string
    nickname?: string
    role: string
    auth_password?: string
    views_json?: string[]
    active: boolean
}

export default function UsuariosConfiguracionPage() {
    const [roles, setRoles] = useState<SysRoleConfig[]>([])
    const [users, setUsers] = useState<SysUser[]>([])
    const [loading, setLoading] = useState(true)

    const [editingUser, setEditingUser] = useState<Partial<SysUser> | null>(null)
    const [isUserModalOpen, setIsUserModalOpen] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const [resRoles, resUsers] = await Promise.all([
                supabase.from('sys_roles_config').select('*').order('nombre_mostrar'),
                supabase.from('sys_users').select('*').order('email'),
            ])

            if (resRoles.error) throw resRoles.error
            if (resUsers.error) throw resUsers.error

            setRoles(resRoles.data || [])
            setUsers(resUsers.data || [])
        } catch (error: any) {
            toast.error('Error al cargar datos: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleRoleToggle = async (roleObj: SysRoleConfig, field: keyof SysRoleConfig) => {
        try {
            const newValue = !roleObj[field]
            const { error } = await supabase
                .from('sys_roles_config')
                .update({ [field]: newValue })
                .eq('role', roleObj.role)
            if (error) throw error

            setRoles(roles.map((r) => (r.role === roleObj.role ? { ...r, [field]: newValue } : r)))
            toast.success(`Permiso actualizado para ${roleObj.nombre_mostrar}`)
        } catch (error: any) {
            toast.error('Error al actualizar permiso: ' + error.message)
        }
    }

    const openNewUserModal = () => {
        const defaultRole = 'SUPERVISOR'
        setEditingUser({
            role: defaultRole,
            active: true,
            views_json: DEFAULT_ROLE_VIEWS[defaultRole] || [
                '/dashboard/catalogos/cuadrillas',
                '/dashboard/operacion/reportes-diarios',
                '/dashboard/chat',
            ],
        })
        setIsUserModalOpen(true)
    }

    const openEditUserModal = (u: SysUser) => {
        setEditingUser({
            ...u,
            views_json:
                Array.isArray(u.views_json)
                    ? u.views_json
                    : DEFAULT_ROLE_VIEWS[u.role] || [],
        })
        setIsUserModalOpen(true)
    }

    const handleRoleChangeInModal = (newRole: string) => {
        if (!editingUser) return
        setEditingUser({
            ...editingUser,
            role: newRole,
            views_json: DEFAULT_ROLE_VIEWS[newRole] || editingUser.views_json || [],
        })
    }

    const toggleViewInModal = (path: string) => {
        if (!editingUser) return
        const current = Array.isArray(editingUser.views_json) ? editingUser.views_json : []
        const next = current.includes(path)
            ? current.filter((p) => p !== path)
            : [...current, path]
        setEditingUser({ ...editingUser, views_json: next })
    }

    const handleSaveUser = async () => {
        if (!editingUser?.email || !editingUser?.role || !editingUser?.auth_password) {
            toast.error('Completa correo, nivel de autoridad y contraseña de acceso.')
            return
        }

        const cleanEmail = editingUser.email.trim().toLowerCase()
        const viewsToSave =
            Array.isArray(editingUser.views_json)
                ? editingUser.views_json
                : DEFAULT_ROLE_VIEWS[editingUser.role] || []

        try {
            if (editingUser.id) {
                const { error } = await supabase
                    .from('sys_users')
                    .update({
                        email: cleanEmail,
                        full_name: editingUser.full_name || editingUser.nickname || cleanEmail.split('@')[0],
                        nickname: editingUser.nickname || editingUser.full_name || cleanEmail.split('@')[0],
                        role: editingUser.role,
                        auth_password: editingUser.auth_password,
                        views_json: viewsToSave,
                        active: editingUser.active !== false,
                    })
                    .eq('id', editingUser.id)

                if (error) throw error
                toast.success('Usuario y vistas APK actualizados correctamente')
            } else {
                const { error } = await supabase.from('sys_users').insert({
                    email: cleanEmail,
                    full_name: editingUser.full_name || editingUser.nickname || cleanEmail.split('@')[0],
                    nickname: editingUser.nickname || editingUser.full_name || cleanEmail.split('@')[0],
                    role: editingUser.role,
                    auth_password: editingUser.auth_password,
                    active: editingUser.active !== false,
                    views_json: viewsToSave,
                })

                if (error) throw error
                toast.success('Usuario creado y habilitado para Web y APK Android')
            }
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('raya-views-updated'))
            }
            setIsUserModalOpen(false)
            loadData()
        } catch (error: any) {
            toast.error('Error guardando usuario: ' + error.message)
        }
    }

    const handleDeleteUser = async (id: string, email: string) => {
        if (!confirm(`¿Estás seguro de ELIMINAR el acceso de ${email}?`)) return
        try {
            const { error } = await supabase.from('sys_users').delete().eq('id', id)
            if (error) throw error
            toast.success('Usuario eliminado del sistema')
            loadData()
        } catch (error: any) {
            toast.error('Error eliminando usuario: ' + error.message)
        }
    }

    if (loading)
        return (
            <div className="p-12 text-center text-amber-500 font-bold animate-pulse">
                Consultando usuarios autorizados y configuración de seguridad...
            </div>
        )

    return (
        <div className="p-2 sm:p-4 max-w-full w-full min-w-0 mx-auto space-y-8">
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <ShieldCheck className="text-amber-500" size={32} />
                        Usuarios Autorizados, Contraseñas y Permisos (Web + APK)
                    </h1>
                    <p className="text-slate-400 mt-1.5 max-w-3xl text-sm">
                        Solo los usuarios activos registrados aquí pueden iniciar sesión en la página Web y en el APK de Android. Las vistas asignadas a cada usuario se reflejan automáticamente en su celular.
                    </p>
                </div>

                <Link
                    href="/dashboard/configuracion/visiones"
                    className="px-4 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-black uppercase tracking-wider flex items-center gap-2 self-start md:self-center"
                >
                    <Smartphone size={15} /> Matriz Completa de Vistas APK / Web
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* TABLA DE USUARIOS Y ACCESOS (7 cols) */}
                <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl h-fit">
                    <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
                        <div className="flex items-center gap-2">
                            <Users className="text-amber-500" size={20} />
                            <h2 className="text-lg font-black text-white">
                                Usuarios con Acceso ({users.length})
                            </h2>
                        </div>
                        <button
                            onClick={openNewUserModal}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"
                        >
                            <Plus size={15} /> Crear Nuevo Usuario
                        </button>
                    </div>

                    <div className="space-y-3">
                        {users.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 italic text-sm">
                                No hay usuarios configurados.
                            </div>
                        ) : (
                            users.map((u) => {
                                const roleObj = roles.find((r) => r.role === u.role)
                                const viewCount = Array.isArray(u.views_json)
                                    ? u.views_json.length
                                    : (DEFAULT_ROLE_VIEWS[u.role] || []).length
                                return (
                                    <div
                                        key={u.id}
                                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black uppercase text-sm shrink-0">
                                                {(u.full_name || u.email).substring(0, 2)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-black text-white text-sm truncate">
                                                    {u.full_name || u.nickname || u.email.split('@')[0]}
                                                </div>
                                                <div className="text-xs text-slate-400 font-mono truncate">
                                                    {u.email}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                    <span className="text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded uppercase font-black tracking-wider">
                                                        {roleObj?.nombre_mostrar || u.role}
                                                    </span>
                                                    <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-black flex items-center gap-1">
                                                        <Smartphone size={10} />{' '}
                                                        {u.role === 'SUPER_ADMIN'
                                                            ? 'Todas las vistas'
                                                            : `${viewCount} vistas APK`}
                                                    </span>
                                                    {u.active === false && (
                                                        <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-black uppercase">
                                                            Inactivo
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-1.5 self-end sm:self-auto shrink-0">
                                            <Link
                                                href={`/dashboard/configuracion/visiones?userId=${u.id}`}
                                                className="px-2.5 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                                title="Configurar qué vistas se reflejan en su APK y Web"
                                            >
                                                <Eye size={14} /> Vistas
                                            </Link>
                                            <button
                                                onClick={() => openEditUserModal(u)}
                                                className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                                title="Editar Usuario, Contraseña y Vistas"
                                            >
                                                <Edit2 size={15} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(u.id, u.email)}
                                                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                                title="Eliminar Acceso"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* FACULTADES POR NIVEL DE AUTORIDAD (5 cols) */}
                <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl h-fit">
                    <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-4">
                        <Settings className="text-purple-500" size={20} />
                        <h2 className="text-lg font-black text-white">
                            Facultades por Nivel de Autoridad
                        </h2>
                    </div>

                    <div className="space-y-3">
                        <div className="grid grid-cols-12 gap-2 text-[10px] font-black text-slate-400 uppercase tracking-wider px-3">
                            <div className="col-span-6">Nivel Jerárquico</div>
                            <div className="col-span-3 text-center">Aprobar Rpt</div>
                            <div className="col-span-3 text-center">Editar Aprob.</div>
                        </div>

                        {roles.map((role) => (
                            <div
                                key={role.role}
                                className="grid grid-cols-12 gap-2 items-center bg-slate-950/50 p-3.5 rounded-xl border border-slate-800"
                            >
                                <div className="col-span-6">
                                    <div className="font-black text-slate-200 text-xs">
                                        {role.nombre_mostrar}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                        {role.role}
                                    </div>
                                </div>
                                <div className="col-span-3 flex justify-center">
                                    <button
                                        onClick={() => handleRoleToggle(role, 'can_approve_reports')}
                                        className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer ${
                                            role.can_approve_reports ? 'bg-emerald-500' : 'bg-slate-700'
                                        }`}
                                    >
                                        <div
                                            className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                                                role.can_approve_reports ? 'left-6' : 'left-1'
                                            }`}
                                        />
                                    </button>
                                </div>
                                <div className="col-span-3 flex justify-center">
                                    <button
                                        onClick={() => handleRoleToggle(role, 'can_edit_approved')}
                                        className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer ${
                                            role.can_edit_approved ? 'bg-emerald-500' : 'bg-slate-700'
                                        }`}
                                    >
                                        <div
                                            className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                                                role.can_edit_approved ? 'left-6' : 'left-1'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Modal de Creación / Edición de Usuario + Vistas APK */}
            {isUserModalOpen && editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div
                        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
                        onClick={() => setIsUserModalOpen(false)}
                    />
                    <div className="relative bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-black text-white mb-1 flex items-center gap-2">
                            <UserCheck className="text-amber-500" size={22} />
                            {editingUser.id ? 'Editar Usuario y Vistas APK' : 'Crear Nuevo Usuario Autorizado'}
                        </h3>
                        <p className="text-xs text-slate-400 mb-5">
                            Este usuario podrá iniciar sesión con su correo y contraseña tanto en la Web como en el APK Android, viendo únicamente los módulos marcados abajo.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1">
                                    Nombre Completo / Cargo
                                </label>
                                <input
                                    type="text"
                                    value={editingUser.full_name || ''}
                                    onChange={(e) =>
                                        setEditingUser({
                                            ...editingUser,
                                            full_name: e.target.value,
                                            nickname: e.target.value,
                                        })
                                    }
                                    placeholder="Ej. Ing. Roberto Sánchez (Turno A)"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1">
                                    Correo Corporativo (Login)
                                </label>
                                <div className="relative">
                                    <Mail
                                        size={15}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                    />
                                    <input
                                        type="email"
                                        value={editingUser.email || ''}
                                        onChange={(e) =>
                                            setEditingUser({ ...editingUser, email: e.target.value })
                                        }
                                        placeholder="usuario@rayamina.com"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1">
                                    Nivel de Autoridad
                                </label>
                                <select
                                    value={editingUser.role || 'SUPERVISOR'}
                                    onChange={(e) => handleRoleChangeInModal(e.target.value)}
                                    className="w-full bg-slate-950 text-white border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold"
                                >
                                    <option value="SUPER_ADMIN">👑 SUPER_ADMIN (Control Total)</option>
                                    <option value="DIRECTOR_OPERATIVO">🏛️ DIRECTOR_OPERATIVO (Ejecutivo & KPIs)</option>
                                    <option value="GERENTE">⭐ GERENTE (Gerencia de Operaciones)</option>
                                    <option value="SUPERINTENDENTE">⛏️ SUPERINTENDENTE (Mina y Cuadrillas)</option>
                                    <option value="JEFE_PLANEACION">📐 JEFE_PLANEACION (Metas S-38 e Ingeniería)</option>
                                    <option value="SUPERVISOR">📋 SUPERVISOR (Captura de Turno y Campo)</option>
                                    <option value="JEFE_MINA">⛏️ JEFE_MINA</option>
                                    <option value="JEFE_RH">👥 JEFE_RH (Recursos Humanos y Nómina)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1">
                                    Contraseña / Clave de Acceso
                                </label>
                                <div className="relative">
                                    <Lock
                                        size={15}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                    />
                                    <input
                                        type="text"
                                        required
                                        value={editingUser.auth_password || ''}
                                        onChange={(e) =>
                                            setEditingUser({
                                                ...editingUser,
                                                auth_password: e.target.value,
                                            })
                                        }
                                        placeholder="Contraseña para Web y APK"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white font-mono"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Selección de Vistas que se reflejarán en el APK y Web */}
                        <div className="mt-5 pt-4 border-t border-slate-800">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-black text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Smartphone size={14} /> Vistas Autorizadas (Se reflejan en APK Android y Web)
                                </label>
                                <span className="text-[11px] font-bold text-slate-400">
                                    {(editingUser.views_json || []).length} seleccionadas
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                                {ALL_SYSTEM_MODULES.map((mod) => {
                                    const checked =
                                        editingUser.role === 'SUPER_ADMIN' ||
                                        (editingUser.views_json || []).includes(mod.path)
                                    return (
                                        <div
                                            key={mod.path}
                                            onClick={() => {
                                                if (editingUser.role === 'SUPER_ADMIN') return
                                                toggleViewInModal(mod.path)
                                            }}
                                            className={`p-2.5 rounded-xl border text-left cursor-pointer flex items-center justify-between gap-2 ${
                                                checked
                                                    ? 'bg-emerald-500/15 border-emerald-500/40 text-white'
                                                    : 'bg-slate-950 border-slate-800 text-slate-400'
                                            }`}
                                        >
                                            <div className="min-w-0">
                                                <div className="text-xs font-bold truncate">{mod.label}</div>
                                                <div className="text-[10px] text-amber-400 truncate">
                                                    APK: {mod.apkModule}
                                                </div>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                readOnly
                                                className="w-4 h-4 accent-emerald-500 shrink-0"
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mt-4">
                            <input
                                type="checkbox"
                                id="activeChk"
                                checked={editingUser.active !== false}
                                onChange={(e) =>
                                    setEditingUser({ ...editingUser, active: e.target.checked })
                                }
                                className="w-4 h-4 rounded accent-amber-500"
                            />
                            <label htmlFor="activeChk" className="text-xs font-bold text-slate-300">
                                Usuario Activo (Si se desmarca, se bloquea inmediatamente su entrada en Web y APK)
                            </label>
                        </div>

                        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-800">
                            <button
                                onClick={() => setIsUserModalOpen(false)}
                                className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveUser}
                                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black uppercase shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                            >
                                <Save size={15} />
                                {editingUser.id ? 'Guardar y Sincronizar APK' : 'Crear Usuario Autorizado'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
