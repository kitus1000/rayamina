'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    Save,
    Shield,
    Users,
    LayoutDashboard,
    Pickaxe,
    DollarSign,
    FileText,
    HardHat,
    Settings,
    MessageSquare,
    Calendar,
    ChevronRight,
    Eye,
    Smartphone,
    RotateCcw,
    CheckSquare,
    Lock,
    MapPin,
    Coins,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DEFAULT_ROLE_VIEWS } from '@/lib/auth-context'
import { toast } from 'sonner'

export const ALL_SYSTEM_MODULES = [
    {
        pillar: '1. Jefatura y Dirección (Precios, Toneladas y Nómina)',
        icon: LayoutDashboard,
        path: '/dashboard',
        name: 'Dashboard Ejecutivo & Financiero',
        apkScreen: 'APK: Mando Ejecutivo (KPIs, Tonelaje y Costos)',
        confidential: true,
    },
    {
        pillar: '1. Jefatura y Dirección (Precios, Toneladas y Nómina)',
        icon: DollarSign,
        path: '/dashboard/nomina',
        name: 'Pre-Nómina, Raya y Tarifas S-38',
        apkScreen: 'APK: Pre-Nómina y Destajos S-38',
        confidential: true,
    },
    {
        pillar: '2. Planeación e Ingeniería',
        icon: Calendar,
        path: '/dashboard/semana',
        name: 'Planeación Semanal (Metas vs Ejecución)',
        apkScreen: 'APK: Metas Semana 38 vs Ejecución',
        confidential: false,
    },
    {
        pillar: '2. Planeación e Ingeniería',
        icon: MapPin,
        path: '/dashboard/catalogos/ubicaciones',
        name: 'Frentes, Rebajes y Ubicaciones',
        apkScreen: 'APK: Catálogo de Frentes y Rebajes',
        confidential: false,
    },
    {
        pillar: '2. Planeación e Ingeniería',
        icon: Coins,
        path: '/dashboard/catalogos/productos-mina',
        name: 'Catálogo de Conceptos y Precios Unitarios',
        apkScreen: 'APK: Conceptos de Mina y Tarifas',
        confidential: true,
    },
    {
        pillar: '3. Operación Mina (Campo)',
        icon: Users,
        path: '/dashboard/catalogos/cuadrillas',
        name: 'Pizarra Táctica de Cuadrillas',
        apkScreen: 'APK: Cancha Táctica de Cuadrillas',
        confidential: false,
    },
    {
        pillar: '3. Operación Mina (Campo)',
        icon: HardHat,
        path: '/dashboard/catalogos/empleados',
        name: 'Fuerza Operativa (Plantilla de Mineros)',
        apkScreen: 'APK: Fuerza Operativa y Personal',
        confidential: false,
    },
    {
        pillar: '4. Reportes y Seguridad',
        icon: Pickaxe,
        path: '/dashboard/operacion/reportes-diarios',
        name: 'Reportes Diarios, Captura de Turno e Incidencias',
        apkScreen: 'APK: Reportes Diarios + Captura 4 Pasos',
        confidential: false,
    },
    {
        pillar: '4. Reportes y Seguridad',
        icon: MessageSquare,
        path: '/dashboard/chat',
        name: 'Bitácora Operativa, Tareas y Alertas de Seguridad',
        apkScreen: 'APK: Bitácora y Seguridad en Vivo',
        confidential: false,
    },
    {
        pillar: '5. Administración y Sistema',
        icon: FileText,
        path: '/dashboard/catalogos',
        name: 'Catálogos Maestros Completos',
        apkScreen: 'APK: Todos los Catálogos Maestros',
        confidential: false,
    },
    {
        pillar: '5. Administración y Sistema',
        icon: Users,
        path: '/dashboard/configuracion/usuarios',
        name: 'Control de Usuarios y Contraseñas',
        apkScreen: 'Solo Web Admin (Creación de Usuarios)',
        confidential: true,
    },
    {
        pillar: '5. Administración y Sistema',
        icon: Eye,
        path: '/dashboard/configuracion/visiones',
        name: 'Gestión de Visiones (Web + APK)',
        apkScreen: 'Solo Web Admin (Asignación de Vistas)',
        confidential: true,
    },
    {
        pillar: '5. Administración y Sistema',
        icon: Settings,
        path: '/dashboard/configuracion',
        name: 'Configuración General del Sistema',
        apkScreen: 'Solo Web Admin',
        confidential: true,
    },
]

export default function VisionesPage() {
    const [users, setUsers] = useState<any[]>([])
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
    const [allowedPaths, setAllowedPaths] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('sys_users')
            .select('id, email, full_name, nickname, role, views_json, active')
            .eq('active', true)
            .order('email')

        if (data) {
            setUsers(data)
            const params = new URLSearchParams(window.location.search)
            const urlUserId = params.get('userId')
            const targetUser = urlUserId ? data.find((u) => u.id === urlUserId) : data[0]
            if (targetUser) {
                setSelectedUserId(targetUser.id)
                setAllowedPaths(
                    Array.isArray(targetUser.views_json) && targetUser.views_json.length > 0
                        ? targetUser.views_json
                        : DEFAULT_ROLE_VIEWS[targetUser.role] || []
                )
            }
        }
        setLoading(false)
    }

    const handleSelectUser = (u: any) => {
        setSelectedUserId(u.id)
        setAllowedPaths(
            Array.isArray(u.views_json) && u.views_json.length > 0
                ? u.views_json
                : DEFAULT_ROLE_VIEWS[u.role] || []
        )
    }

    const togglePath = (path: string) => {
        if (allowedPaths.includes(path)) {
            setAllowedPaths(allowedPaths.filter((p) => p !== path))
        } else {
            setAllowedPaths([...allowedPaths, path])
        }
    }

    const handleRestoreRoleDefaults = () => {
        if (!selectedUser) return
        const defaults = DEFAULT_ROLE_VIEWS[selectedUser.role] || []
        setAllowedPaths(defaults)
        toast.info(`Vistas recomendadas cargadas para ${selectedUser.role}. Presiona Guardar para aplicar.`)
    }

    const handleSelectAll = () => {
        setAllowedPaths(ALL_SYSTEM_MODULES.map((m) => m.path))
    }

    const handleSave = async () => {
        if (!selectedUserId) return
        setSaving(true)

        const { error } = await supabase
            .from('sys_users')
            .update({ views_json: allowedPaths })
            .eq('id', selectedUserId)

        if (error) {
            toast.error('Error al guardar visiones: ' + error.message)
        } else {
            toast.success('Vistas actualizadas y sincronizadas con Web y APK Android')
            setUsers(
                users.map((u) =>
                    u.id === selectedUserId ? { ...u, views_json: allowedPaths } : u
                )
            )
        }
        setSaving(false)
    }

    const selectedUser = users.find((u) => u.id === selectedUserId)
    const pillars = Array.from(new Set(ALL_SYSTEM_MODULES.map((m) => m.pillar)))

    return (
        <div className="max-w-7xl mx-auto pb-12 space-y-6">
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div>
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-500 mb-1">
                        <Smartphone size={15} /> Sincronización en Tiempo Real Web + APK Android
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
                        <Shield className="text-amber-500" size={30} />
                        Control de Vistas por Usuario (App Web y APK)
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Define exactamente qué pantallas puede ver cada usuario. En el APK Android solo se reflejarán las vistas que actives aquí, protegiendo precios unitarios, tonelaje y nómina.
                    </p>
                </div>

                <Link
                    href="/dashboard/configuracion/usuarios"
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-wider border border-slate-700 shrink-0 self-start md:self-center"
                >
                    Administrar Usuarios y Claves →
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Columna Izquierda: Lista de Usuarios */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users size={18} className="text-amber-500" />
                                <h2 className="font-black text-white text-sm uppercase tracking-wider">
                                    Usuarios Registrados
                                </h2>
                            </div>
                            <span className="text-xs font-bold text-slate-400">{users.length} activos</span>
                        </div>
                        <div className="max-h-[580px] overflow-y-auto custom-scrollbar divide-y divide-slate-800/60">
                            {loading ? (
                                <div className="p-10 text-center text-slate-500 animate-pulse font-bold">
                                    Cargando usuarios...
                                </div>
                            ) : (
                                users.map((u) => {
                                    const isSelected = selectedUserId === u.id
                                    const viewCount = Array.isArray(u.views_json)
                                        ? u.views_json.length
                                        : (DEFAULT_ROLE_VIEWS[u.role] || []).length
                                    return (
                                        <button
                                            key={u.id}
                                            onClick={() => handleSelectUser(u)}
                                            className={`w-full text-left p-4 transition-all flex items-center justify-between group cursor-pointer ${
                                                isSelected
                                                    ? 'bg-amber-500/15 border-l-4 border-l-amber-500'
                                                    : 'hover:bg-slate-800/50'
                                            }`}
                                        >
                                            <div className="min-w-0 pr-2">
                                                <div
                                                    className={`font-black text-sm truncate ${
                                                        isSelected ? 'text-amber-500' : 'text-white'
                                                    }`}
                                                >
                                                    {u.full_name || u.nickname || u.email.split('@')[0]}
                                                </div>
                                                <div className="text-xs text-slate-400 truncate font-mono">
                                                    {u.email}
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    <span className="text-[10px] px-2 py-0.5 bg-slate-800 rounded text-amber-400 uppercase font-black border border-slate-700">
                                                        {u.role}
                                                    </span>
                                                    <span className="text-[10px] px-2 py-0.5 bg-emerald-500/15 text-emerald-400 rounded font-black border border-emerald-500/30">
                                                        {u.role === 'SUPER_ADMIN'
                                                            ? 'Acceso Total'
                                                            : `${viewCount} Vistas Web/APK`}
                                                    </span>
                                                </div>
                                            </div>
                                            <ChevronRight
                                                size={18}
                                                className={`shrink-0 transition-transform ${
                                                    isSelected
                                                        ? 'translate-x-1 text-amber-500'
                                                        : 'text-slate-600 group-hover:translate-x-1'
                                                }`}
                                            />
                                        </button>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Columna Derecha: Matriz de Vistas Web + APK */}
                <div className="lg:col-span-8">
                    {selectedUser ? (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
                            {/* Cabecera del Usuario Seleccionado */}
                            <div className="p-5 border-b border-slate-800 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-black text-white">
                                            {selectedUser.full_name || selectedUser.email}
                                        </h3>
                                        <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase">
                                            {selectedUser.role}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                                        {selectedUser.email} • Las vistas marcadas se reflejan inmediatamente en su APK Android.
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleRestoreRoleDefaults}
                                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                                        title="Cargar las vistas recomendadas para su nivel de autoridad"
                                    >
                                        <RotateCcw size={14} /> Por Defecto del Rol
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSelectAll}
                                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                                    >
                                        <CheckSquare size={14} /> Todas
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase flex items-center gap-1.5 shadow-lg cursor-pointer disabled:opacity-60"
                                    >
                                        <Save size={15} />
                                        {saving ? 'Sincronizando...' : 'Guardar y Reflejar en APK'}
                                    </button>
                                </div>
                            </div>

                            {/* Lista de Módulos por Pilar */}
                            <div className="p-5 space-y-6">
                                {pillars.map((pillar) => {
                                    const mods = ALL_SYSTEM_MODULES.filter((m) => m.pillar === pillar)
                                    return (
                                        <div key={pillar} className="space-y-2.5">
                                            <h4 className="text-xs font-black uppercase tracking-wider text-amber-500 border-b border-slate-800 pb-1.5">
                                                {pillar}
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {mods.map((mod) => {
                                                    const isChecked =
                                                        selectedUser.role === 'SUPER_ADMIN' ||
                                                        allowedPaths.includes(mod.path)
                                                    const IconComp = mod.icon
                                                    return (
                                                        <div
                                                            key={mod.path}
                                                            onClick={() => {
                                                                if (selectedUser.role === 'SUPER_ADMIN') {
                                                                    toast.info(
                                                                        'El rol SUPER_ADMIN siempre conserva acceso total por seguridad.'
                                                                    )
                                                                    return
                                                                }
                                                                togglePath(mod.path)
                                                            }}
                                                            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                                                                isChecked
                                                                    ? 'bg-emerald-500/10 border-emerald-500/50 shadow-sm'
                                                                    : 'bg-slate-950/60 border-slate-800 opacity-75 hover:opacity-100'
                                                            }`}
                                                        >
                                                            <div className="flex items-start gap-3 min-w-0">
                                                                <div
                                                                    className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                                                                        isChecked
                                                                            ? 'bg-emerald-500 text-slate-950'
                                                                            : 'bg-slate-800 text-slate-400'
                                                                    }`}
                                                                >
                                                                    <IconComp size={16} />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="text-xs font-black text-white flex items-center gap-1.5 flex-wrap">
                                                                        <span>{mod.name}</span>
                                                                        {mod.confidential && (
                                                                            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9px] font-black uppercase flex items-center gap-0.5">
                                                                                <Lock size={9} /> Sensible
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[11px] font-bold text-amber-400 mt-0.5 flex items-center gap-1">
                                                                        <Smartphone size={11} /> {mod.apkScreen}
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-500 font-mono truncate">
                                                                        {mod.path}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div
                                                                className={`w-11 h-6 rounded-full relative transition-colors shrink-0 mt-1 ${
                                                                    isChecked ? 'bg-emerald-500' : 'bg-slate-700'
                                                                }`}
                                                            >
                                                                <div
                                                                    className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                                                                        isChecked ? 'left-6' : 'left-1'
                                                                    }`}
                                                                />
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                            Selecciona un usuario a la izquierda para configurar sus vistas en Web y APK Android.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
