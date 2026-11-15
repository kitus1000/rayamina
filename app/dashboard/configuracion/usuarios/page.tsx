'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Shield, Lock, ShieldCheck, Mail, Users, Settings, Save, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
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
    role: string
    auth_password?: string
    active: boolean
}

export default function UsuariosConfiguracionPage() {
    const [roles, setRoles] = useState<SysRoleConfig[]>([])
    const [users, setUsers] = useState<SysUser[]>([])
    const [loading, setLoading] = useState(true)

    const [editingRole, setEditingRole] = useState<SysRoleConfig | null>(null)
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
                supabase.from('sys_users').select('*').order('email')
            ])

            if (resRoles.error) throw resRoles.error
            if (resUsers.error) throw resUsers.error

            setRoles(resRoles.data)
            setUsers(resUsers.data)
        } catch (error: any) {
            toast.error('Error al cargar datos: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    // --- ROLES HANDLERS ---
    const handleRoleToggle = async (roleObj: SysRoleConfig, field: keyof SysRoleConfig) => {
        try {
            const newValue = !roleObj[field]
            const { error } = await supabase.from('sys_roles_config').update({ [field]: newValue }).eq('role', roleObj.role)
            if (error) throw error

            setRoles(roles.map(r => r.role === roleObj.role ? { ...r, [field]: newValue } : r))
            toast.success(`Permiso actualizado para ${roleObj.nombre_mostrar}`)
        } catch (error: any) {
            toast.error('Error al actualizar permiso: ' + error.message)
        }
    }

    // --- USERS HANDLERS ---
    const handleSaveUser = async () => {
        if (!editingUser?.email || !editingUser?.role) {
            toast.error('Completa los campos obligatorios')
            return
        }

        try {
            if (editingUser.id) {
                // Update
                const { error } = await supabase.from('sys_users').update({
                    email: editingUser.email,
                    role: editingUser.role,
                    auth_password: editingUser.auth_password,
                    active: editingUser.active !== false
                }).eq('id', editingUser.id)

                if (error) throw error
                toast.success('Usuario actualizado correctamente')
            } else {
                // Insert
                const { error } = await supabase.from('sys_users').insert({
                    email: editingUser.email,
                    role: editingUser.role,
                    auth_password: editingUser.auth_password,
                    active: true,
                    views_json: [] // Initialize empty to strictly enforce permissions
                })

                if (error) throw error
                toast.success('Usuario creado correctamente')
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
            toast.success('Usuario eliminado')
            loadData()
        } catch (error: any) {
            toast.error('Error eliminando usuario: ' + error.message)
        }
    }

    if (loading) return (
        <div className="p-12 text-center text-amber-500 font-medium animate-pulse">
            Consultando configuración de accesos...
        </div>
    )

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-10">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    <ShieldCheck className="text-amber-500" size={32} />
                    Configuración de Accesos y Permisos
                </h1>
                <p className="text-slate-400 mt-2 max-w-2xl text-sm">
                    Administra quién tiene acceso a la plataforma vinculando su correo electrónico a un Nivel de Autoridad. Configura qué facultades tiene cada Nivel de Autoridad a nivel sistema.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* ROLES CONFIGURATION TABLE */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl h-fit">
                    <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-4">
                        <Settings className="text-purple-500" size={20} />
                        <h2 className="text-lg font-bold text-white">Configuración de Niveles de Autoridad</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-12 gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest px-4">
                            <div className="col-span-6">Rol / Nivel</div>
                            <div className="col-span-3 text-center" title="Puede aprobar reportes">Aprobar Rpt</div>
                            <div className="col-span-3 text-center" title="Puede editar un reporte aprobado">Editar Aprob.</div>
                        </div>

                        {roles.map(role => (
                            <div key={role.role} className="grid grid-cols-12 gap-4 items-center bg-slate-950/50 hover:bg-slate-800/50 p-4 rounded-xl border border-slate-800/50 transition-colors">
                                <div className="col-span-6">
                                    <div className="font-bold text-slate-200 text-sm">{role.nombre_mostrar}</div>
                                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">{role.role}</div>
                                </div>
                                <div className="col-span-3 flex justify-center">
                                    <button
                                        onClick={() => handleRoleToggle(role, 'can_approve_reports')}
                                        className={`w-12 h-6 rounded-full relative transition-colors ${role.can_approve_reports ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${role.can_approve_reports ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>
                                <div className="col-span-3 flex justify-center">
                                    <button
                                        onClick={() => handleRoleToggle(role, 'can_edit_approved')}
                                        className={`w-12 h-6 rounded-full relative transition-colors ${role.can_edit_approved ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${role.can_edit_approved ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        <p className="text-[10px] text-slate-500 text-center mt-4">
                            Habilita o deshabilita los permisos que tiene cada rol transversalmente en el sistema.
                        </p>
                    </div>
                </div>

                {/* USERS / ACCESSES TABLE */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl h-fit">
                    <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
                        <div className="flex items-center gap-2">
                            <Users className="text-blue-500" size={20} />
                            <h2 className="text-lg font-bold text-white">Accesos Otorgados</h2>
                        </div>
                        <button
                            onClick={() => { setEditingUser({ role: 'SUPERVISOR', active: true }); setIsUserModalOpen(true) }}
                            className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-lg shadow-amber-900/20 transition-all"
                        >
                            <Plus size={14} /> Nuevo Acceso Directo
                        </button>
                    </div>

                    <div className="space-y-3">
                        {users.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 italic text-sm">
                                No hay usuarios configurados.
                            </div>
                        ) : (
                            users.map((user) => {
                                const roleObj = roles.find(r => r.role === user.role)
                                return (
                                    <div key={user.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 hover:border-slate-700 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold uppercase ring-2 ring-slate-800 text-sm">
                                                {user.email.substring(0, 2)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-200 text-sm">{user.email}</div>
                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                    <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                                                        {roleObj?.nombre_mostrar || user.role}
                                                    </span>
                                                    {user.auth_password && (
                                                        <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded flex items-center gap-1" title="Contraseña configurada">
                                                            <Lock size={10} /> PIN
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 self-end sm:self-auto">
                                            <Link
                                                href={`/dashboard/configuracion/visiones?userId=${user.id}`}
                                                className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 rounded transition-colors"
                                                title="Personalizar Vistas (Visiones)"
                                            >
                                                <ShieldCheck size={16} />
                                            </Link>
                                            <button
                                                onClick={() => { setEditingUser(user); setIsUserModalOpen(true) }}
                                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                                                title="Editar Datos"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(user.id, user.email)}
                                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                title="Eliminar Acceso"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Usuario */}
            {isUserModalOpen && editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsUserModalOpen(false)} />
                    <div className="relative bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-6">
                            {editingUser.id ? 'Editar Acceso' : 'Nuevo Acceso'}
                        </h3>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Correo Electrónico</label>
                                <div className="relative border border-slate-700 bg-slate-950/50 rounded-lg overflow-hidden focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500 transition-all">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                                        <Mail size={16} />
                                    </div>
                                    <input
                                        type="email"
                                        value={editingUser.email || ''}
                                        onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                                        placeholder="usuario@empresa.com"
                                        className="w-full bg-transparent text-white px-3 py-2.5 pl-10 focus:outline-none text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nivel de Autoridad</label>
                                <select
                                    value={editingUser.role}
                                    onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                                    className="w-full bg-slate-950/50 text-white border border-slate-700 rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-500 text-sm font-medium"
                                >
                                    <option value="SUPER_ADMIN">SUPER_ADMIN (Acceso Total)</option>
                                    <option value="SUPERVISOR">SUPERVISOR</option>
                                    <option value="JEFE_MINA">JEFE_MINA</option>
                                    <option value="JEFE_RH">JEFE_RH</option>
                                    <option value="JEFE_PLANEACION">JEFE_PLANEACION</option>
                                    <option value="LECTURA">SOLO LECTURA</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                    Contraseña de Acceso
                                </label>
                                <div className="relative border border-slate-700 bg-slate-950/50 rounded-lg overflow-hidden focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500 transition-all">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                                        <Lock size={16} />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={editingUser.auth_password || ''}
                                        onChange={e => setEditingUser({ ...editingUser, auth_password: e.target.value })}
                                        placeholder="Escribe la contraseña aquí"
                                        className="w-full bg-transparent text-white px-3 py-2.5 pl-10 focus:outline-none text-sm font-mono"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1 italic">
                                    Esta es la contraseña que el usuario usará para entrar al sistema junto con su correo.
                                </p>
                            </div>

                            <div className="flex items-center gap-2 mt-2">
                                <input
                                    type="checkbox"
                                    id="activeChk"
                                    checked={editingUser.active !== false}
                                    onChange={e => setEditingUser({ ...editingUser, active: e.target.checked })}
                                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500"
                                />
                                <label htmlFor="activeChk" className="text-sm font-medium text-slate-300">Usuario Activo</label>
                            </div>

                        </div>

                        <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-800">
                            <button
                                onClick={() => setIsUserModalOpen(false)}
                                className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveUser}
                                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-amber-900/20 transition-all flex items-center gap-2"
                            >
                                <Save size={16} />
                                {editingUser.id ? 'Guardar Cambios' : 'Crear Acceso'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}
