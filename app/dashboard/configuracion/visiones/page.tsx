'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { DEFAULT_ROLE_VIEWS, useAuth } from '@/lib/auth-context'
import { ALL_SYSTEM_MODULES } from '@/lib/system-modules'
import {
    Eye, Save, Shield, CheckSquare, Square, Users, CheckCircle2,
    RotateCcw, Smartphone, Monitor, Search, AlertTriangle, Sparkles, Lock
} from 'lucide-react'
import { motion } from 'framer-motion'

interface SysUserRow {
    id: string
    email: string
    full_name: string
    nickname?: string | null
    role: string
    views_json: string[] | null
    active: boolean
}

const ROLE_PRESETS: Array<{ id: string; label: string; paths: string[] }> = [
    {
        id: 'SUPERVISOR',
        label: 'Supervisor Campo',
        paths: [
            '/dashboard/catalogos/cuadrillas',
            '/dashboard/operacion/reportes-diarios',
            '/dashboard/operacion/reportes-diarios/nuevo',
            '/dashboard/chat'
        ]
    },
    {
        id: 'JEFE_PLANEACION',
        label: 'Planeación e Ing.',
        paths: [
            '/dashboard/semana',
            '/dashboard/catalogos/ubicaciones',
            '/dashboard/catalogos/productos-mina',
            '/dashboard/operacion/reportes-diarios',
            '/dashboard/chat'
        ]
    },
    {
        id: 'SUPERINTENDENTE',
        label: 'Superintendente / Jefe Mina',
        paths: [
            '/dashboard',
            '/dashboard/semana',
            '/dashboard/catalogos/cuadrillas',
            '/dashboard/catalogos/empleados',
            '/dashboard/catalogos/equipos',
            '/dashboard/operacion/reportes-diarios',
            '/dashboard/operacion/reportes-diarios/nuevo',
            '/dashboard/chat'
        ]
    },
    {
        id: 'GERENTE',
        label: 'Gerencia / Dirección',
        paths: [
            '/dashboard',
            '/dashboard/nomina',
            '/dashboard/nomina/tarifas',
            '/dashboard/semana',
            '/dashboard/catalogos/cuadrillas',
            '/dashboard/catalogos/empleados',
            '/dashboard/catalogos/equipos',
            '/dashboard/catalogos/ubicaciones',
            '/dashboard/catalogos/productos-mina',
            '/dashboard/operacion/reportes-diarios',
            '/dashboard/chat'
        ]
    }
]

export default function ControlVisionesPage() {
    const { refreshUserConfig, user: currentAuthUser, sysRole: currentRole } = useAuth()
    const [users, setUsers] = useState<SysUserRow[]>([])
    const [selectedUserId, setSelectedUserId] = useState<string>('')
    const [allowedPaths, setAllowedPaths] = useState<string[]>([])
    const [userSearch, setUserSearch] = useState('')
    const [moduleSearch, setModuleSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saveStatus, setSaveStatus] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async (preserveSelectedId?: string) => {
        setLoading(true)
        const { data, error } = await supabase
            .from('sys_users')
            .select('id, email, full_name, nickname, role, views_json, active')
            .order('full_name')

        if (error) {
            setSaveStatus({ type: 'err', text: 'Error cargando usuarios: ' + error.message })
        } else if (data) {
            const rows = data as SysUserRow[]
            setUsers(rows)
            if (rows.length > 0) {
                const targetId = preserveSelectedId || selectedUserId || rows[0].id
                const target = rows.find(u => u.id === targetId) || rows[0]
                setSelectedUserId(target.id)
                setAllowedPaths(
                    Array.isArray(target.views_json)
                        ? target.views_json
                        : DEFAULT_ROLE_VIEWS[target.role] || []
                )
            }
        }
        setLoading(false)
    }

    const handleSelectUser = (u: SysUserRow) => {
        setSelectedUserId(u.id)
        setSaveStatus(null)
        const views = Array.isArray(u.views_json)
            ? u.views_json
            : DEFAULT_ROLE_VIEWS[u.role] || []
        setAllowedPaths(views)
    }

    const selectedUser = users.find(u => u.id === selectedUserId)
    const isSuperAdminTarget = selectedUser?.role === 'SUPER_ADMIN'

    const hasUnsavedChanges = useMemo(() => {
        if (!selectedUser) return false
        const baseline = Array.isArray(selectedUser.views_json)
            ? selectedUser.views_json
            : DEFAULT_ROLE_VIEWS[selectedUser.role] || []
        const a = [...baseline].sort().join('|')
        const b = [...allowedPaths].sort().join('|')
        return a !== b
    }, [selectedUser, allowedPaths])

    const togglePath = (path: string) => {
        if (isSuperAdminTarget) return
        setSaveStatus(null)
        setAllowedPaths(prev =>
            prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
        )
    }

    const togglePillar = (pillarModsPaths: string[]) => {
        if (isSuperAdminTarget) return
        setSaveStatus(null)
        const allEnabled = pillarModsPaths.every(p => allowedPaths.includes(p))
        if (allEnabled) {
            setAllowedPaths(prev => prev.filter(p => !pillarModsPaths.includes(p)))
        } else {
            setAllowedPaths(prev => Array.from(new Set([...prev, ...pillarModsPaths])))
        }
    }

    const handleRestoreRoleDefaults = () => {
        if (!selectedUser || isSuperAdminTarget) return
        setSaveStatus(null)
        const defaults = DEFAULT_ROLE_VIEWS[selectedUser.role] || []
        setAllowedPaths(defaults)
    }

    const handleSelectAll = () => {
        if (isSuperAdminTarget) return
        setSaveStatus(null)
        setAllowedPaths(ALL_SYSTEM_MODULES.map(m => m.path))
    }

    const handleClearAll = () => {
        if (isSuperAdminTarget) return
        setSaveStatus(null)
        setAllowedPaths([])
    }

    const handleSave = async () => {
        if (!selectedUserId || !selectedUser) return
        if (isSuperAdminTarget) {
            setSaveStatus({ type: 'ok', text: 'SUPER_ADMIN mantiene acceso completo en Web y APK.' })
            return
        }

        setSaving(true)
        setSaveStatus(null)

        const { data: updatedRow, error } = await supabase
            .from('sys_users')
            .update({ views_json: allowedPaths })
            .eq('id', selectedUserId)
            .select('id, views_json')
            .maybeSingle()

        if (error || !updatedRow) {
            setSaveStatus({
                type: 'err',
                text: 'No se pudo guardar en Supabase: ' + (error?.message || 'Sin permisos o fila no actualizada.')
            })
        } else {
            const savedViews = Array.isArray(updatedRow.views_json) ? updatedRow.views_json : allowedPaths
            setUsers(prev =>
                prev.map(u => (u.id === selectedUserId ? { ...u, views_json: savedViews } : u))
            )
            setAllowedPaths(savedViews)

            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('raya-views-updated'))
            }
            if (currentAuthUser?.email && selectedUser.email.toLowerCase() === currentAuthUser.email.toLowerCase()) {
                await refreshUserConfig()
            }

            setSaveStatus({
                type: 'ok',
                text: `Vistas guardadas para ${selectedUser.full_name} (${savedViews.length} módulos activos en Web y APK).`
            })
        }
        setSaving(false)
    }

    const filteredUsers = users.filter(u =>
        `${u.full_name} ${u.email} ${u.role}`.toLowerCase().includes(userSearch.toLowerCase())
    )

    const filteredModules = ALL_SYSTEM_MODULES.filter(m =>
        `${m.label} ${m.description} ${m.pillar} ${m.apkModule} ${m.path}`
            .toLowerCase()
            .includes(moduleSearch.toLowerCase())
    )

    const pillars = Array.from(new Set(filteredModules.map(m => m.pillar)))

    // Vista previa de pestañas que se reflejarán en la APK MobileRaya
    const apkPreviewTabs = useMemo(() => {
        const effective = isSuperAdminTarget
            ? ALL_SYSTEM_MODULES.map(m => m.path)
            : allowedPaths
        const hasPrefix = (prefix: string) =>
            effective.some(v => v === prefix || v.startsWith(prefix + '/'))
        const tabs: string[] = []
        if (effective.includes('/dashboard')) tabs.push('Inicio (KPIs)')
        if (hasPrefix('/dashboard/operacion/reportes-diarios')) tabs.push('Reportes Diarios')
        if (effective.includes('/dashboard/catalogos') || hasPrefix('/dashboard/catalogos/cuadrillas')) tabs.push('Cuadrillas')
        if (hasPrefix('/dashboard/semana')) tabs.push('Planeación')
        if (hasPrefix('/dashboard/chat')) tabs.push('Bitácora / Tareas')
        if (hasPrefix('/dashboard/nomina')) tabs.push('Pre-Nómina')
        if (effective.includes('/dashboard/catalogos') || hasPrefix('/dashboard/catalogos/empleados')) tabs.push('Personal RH')
        if (effective.includes('/dashboard/catalogos') || hasPrefix('/dashboard/catalogos/ubicaciones') || hasPrefix('/dashboard/catalogos/productos-mina')) tabs.push('Catálogos')
        return tabs
    }, [allowedPaths, isSuperAdminTarget])

    if (currentRole && currentRole !== 'SUPER_ADMIN') {
        return (
            <div className="max-w-xl mx-auto mt-12 p-8 bg-slate-900 border border-rose-500/30 rounded-2xl text-center space-y-3">
                <Lock className="w-10 h-10 text-rose-400 mx-auto" />
                <h2 className="text-lg font-black text-white">Acceso Exclusivo de Administración</h2>
                <p className="text-sm text-slate-400">
                    Solo el usuario SUPER_ADMIN puede modificar la matriz de vistas Web y APK.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto w-full min-w-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
                        <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-500">
                            <Eye className="w-6 h-6" />
                        </div>
                        Control Centralizado de Vistas (Web + APK)
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Lo que habilites aquí para cada usuario se sincroniza en tiempo real en la página Web y se refleja automáticamente en la APK móvil.
                    </p>
                </div>
            </div>

            {saveStatus && (
                <div
                    className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2.5 ${
                        saveStatus.type === 'ok'
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                            : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                    }`}
                >
                    {saveStatus.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    <span>{saveStatus.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Columna Izquierda: Lista de Usuarios */}
                <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-300">
                            <Users className="w-4 h-4 text-amber-500" />
                            Usuarios ({filteredUsers.length})
                        </div>
                    </div>

                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                        <input
                            type="text"
                            value={userSearch}
                            onChange={e => setUserSearch(e.target.value)}
                            placeholder="Buscar usuario o rol..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                        />
                    </div>

                    {loading ? (
                        <div className="py-10 text-center text-slate-500 text-xs animate-pulse">
                            Cargando usuarios...
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                            {filteredUsers.map(u => {
                                const isSelected = u.id === selectedUserId
                                const isCustom = Array.isArray(u.views_json)
                                const viewCount = isCustom
                                    ? u.views_json!.length
                                    : (DEFAULT_ROLE_VIEWS[u.role] || []).length

                                return (
                                    <button
                                        key={u.id}
                                        type="button"
                                        onClick={() => handleSelectUser(u)}
                                        className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                            isSelected
                                                ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-900/10'
                                                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                                        }`}
                                    >
                                        <div className="min-w-0">
                                            <div className="font-bold text-white text-sm truncate flex items-center gap-2">
                                                <span className="truncate">{u.full_name}</span>
                                                {!u.active && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400">
                                                        Inactivo
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-slate-400 truncate">{u.email}</div>
                                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                                                    {u.role.replace(/_/g, ' ')}
                                                </span>
                                                <span
                                                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                                        isCustom
                                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                            : 'bg-slate-900 text-slate-400 border-slate-700'
                                                    }`}
                                                >
                                                    {isCustom ? 'Personalizado' : 'Por defecto'} • {u.role === 'SUPER_ADMIN' ? 'Todas' : `${viewCount}`}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Columna Derecha: Matriz de Módulos + Vista Previa */}
                <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 space-y-5">
                    {selectedUser ? (
                        <>
                            {/* Barra Usuario Seleccionado + Botón Guardar */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                                <div>
                                    <span className="text-[11px] uppercase tracking-wider font-black text-amber-500">
                                        Configurando Acceso Web + APK de:
                                    </span>
                                    <h2 className="text-xl font-black text-white flex flex-wrap items-center gap-2 mt-0.5">
                                        {selectedUser.full_name}
                                        <span className="text-xs px-2.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-full font-bold">
                                            {selectedUser.role.replace(/_/g, ' ')}
                                        </span>
                                    </h2>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    {hasUnsavedChanges && (
                                        <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
                                            Cambios sin guardar
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleSave}
                                        disabled={saving || isSuperAdminTarget}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-black shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
                                    >
                                        <Save className="w-4 h-4" />
                                        {saving ? 'Guardando...' : 'Guardar Vistas'}
                                    </button>
                                </div>
                            </div>

                            {isSuperAdminTarget && (
                                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 font-semibold flex items-center gap-2">
                                    <Shield size={16} className="shrink-0" />
                                    <span>
                                        SUPER_ADMIN siempre tiene acceso completo a todas las vistas en Web y APK por seguridad administrativa.
                                    </span>
                                </div>
                            )}

                            {/* Vista Previa en Vivo (Web + APK) */}
                            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white">
                                        <Smartphone className="w-4 h-4 text-emerald-400" />
                                        Vista Previa en APK Móvil ({apkPreviewTabs.length} pantallas visibles):
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                        <Monitor className="w-3.5 h-3.5 text-sky-400" />
                                        <span>
                                            Web: {isSuperAdminTarget ? ALL_SYSTEM_MODULES.length : allowedPaths.length} módulos activos
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {apkPreviewTabs.length === 0 ? (
                                        <span className="text-xs text-rose-400 italic">
                                            Ninguna pantalla móvil habilitada para este usuario.
                                        </span>
                                    ) : (
                                        apkPreviewTabs.map(tab => (
                                            <span
                                                key={tab}
                                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                            >
                                                📱 {tab}
                                            </span>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Plantillas Rápidas + Buscador de Módulos */}
                            {!isSuperAdminTarget && (
                                <div className="space-y-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-1">
                                            <Sparkles size={13} className="text-amber-400" /> Plantillas rápidas:
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleRestoreRoleDefaults}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> Por defecto de su rol
                                        </button>
                                        {ROLE_PRESETS.map(p => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => {
                                                    setSaveStatus(null)
                                                    setAllowedPaths(p.paths)
                                                }}
                                                className="px-3 py-1.5 bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-500/40 text-slate-300 border border-slate-700 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={handleSelectAll}
                                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                                        >
                                            Marcar Todas
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleClearAll}
                                            className="px-3 py-1.5 bg-slate-800 hover:bg-rose-500/20 text-rose-400 border border-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                                        >
                                            Limpiar
                                        </button>
                                    </div>

                                    <div className="relative">
                                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                                        <input
                                            type="text"
                                            value={moduleSearch}
                                            onChange={e => setModuleSearch(e.target.value)}
                                            placeholder="Filtrar módulo por nombre, ruta Web o pantalla APK..."
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Matriz por Pilares */}
                            <div className="space-y-5">
                                {pillars.map(pillar => {
                                    const mods = filteredModules.filter(m => m.pillar === pillar)
                                    const modPaths = mods.map(m => m.path)
                                    const allChecked = modPaths.every(p => isSuperAdminTarget || allowedPaths.includes(p))

                                    return (
                                        <div key={pillar} className="space-y-2.5">
                                            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                                    <Shield className="w-3.5 h-3.5 text-amber-500" />
                                                    {pillar}
                                                </h3>
                                                {!isSuperAdminTarget && (
                                                    <button
                                                        type="button"
                                                        onClick={() => togglePillar(modPaths)}
                                                        className="text-[11px] font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
                                                    >
                                                        {allChecked ? 'Quitar todo el pilar' : 'Activar todo el pilar'}
                                                    </button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {mods.map(mod => {
                                                    const isEnabled = isSuperAdminTarget || allowedPaths.includes(mod.path)
                                                    return (
                                                        <motion.div
                                                            key={mod.path}
                                                            whileTap={isSuperAdminTarget ? undefined : { scale: 0.99 }}
                                                            onClick={() => togglePath(mod.path)}
                                                            className={`p-3.5 rounded-xl border-2 transition-all flex items-start gap-3 ${
                                                                isSuperAdminTarget ? 'cursor-default opacity-80' : 'cursor-pointer'
                                                            } ${
                                                                isEnabled
                                                                    ? 'bg-amber-500/10 border-amber-500/50'
                                                                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                                                            }`}
                                                        >
                                                            <div className="mt-0.5 shrink-0">
                                                                {isEnabled ? (
                                                                    <CheckSquare className="w-5 h-5 text-amber-500" />
                                                                ) : (
                                                                    <Square className="w-5 h-5 text-slate-600" />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="text-sm font-bold text-white leading-snug">
                                                                    {mod.label}
                                                                </div>
                                                                <div className="text-xs text-slate-400 mt-0.5 leading-snug">
                                                                    {mod.description}
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                                                    <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 truncate max-w-full">
                                                                        {mod.path}
                                                                    </span>
                                                                    <span
                                                                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                                                            mod.apkModule.startsWith('Solo Web')
                                                                                ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                                                                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                                        }`}
                                                                    >
                                                                        APK: {mod.apkModule}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="py-20 text-center text-slate-500 text-sm">
                            Selecciona un usuario para configurar sus vistas Web y APK.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
