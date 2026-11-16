'use client'

import { useState, useRef, useEffect } from 'react'
import { User, ChevronDown, LogOut, Settings, ShieldCheck, Sun, Moon, Printer, Eye, Smartphone, Monitor, Users } from 'lucide-react'
import { DEFAULT_ROLE_VIEWS, resolveFirstAllowedPath, useAuth } from '@/lib/auth-context'
import NotificationBell from './notification-bell'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

const ROLES_PREVIEW_LIST = [
    { role: 'SUPER_ADMIN', label: '👑 Super Admin (Vista Total)' },
    { role: 'DIRECTOR_OPERATIVO', label: '🏛️ Director Operativo' },
    { role: 'GERENTE', label: '⭐ Gerente de Operaciones' },
    { role: 'SUPERINTENDENTE', label: '⛏️ Superintendente / Jefe Mina' },
    { role: 'JEFE_PLANEACION', label: '📐 Jefe de Planeación' },
    { role: 'SUPERVISOR', label: '📋 Supervisor de Turno' },
]

export default function Topbar() {
    const {
        user,
        sysRole,
        isRealSuperAdmin,
        previewProfile,
        setPreviewProfile,
        sysUserId,
        fullName,
        signOut,
        isViewAllowed,
    } = useAuth()
    const router = useRouter()
    const pathname = usePathname()
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [sysUsersList, setSysUsersList] = useState<any[]>([])
    const menuRef = useRef<HTMLDivElement>(null)
    const previewRef = useRef<HTMLDivElement>(null)
    const [profile, setProfile] = useState<{ nickname?: string; avatar_url?: string }>({})
    const [theme, setTheme] = useState<'light' | 'dark'>('light')

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('raya_theme') as 'light' | 'dark' | null
            const initial = saved || 'light'
            setTheme(initial)
        }
    }, [])

    const toggleTheme = () => {
        const next = theme === 'light' ? 'dark' : 'light'
        setTheme(next)
        if (typeof window !== 'undefined') {
            localStorage.setItem('raya_theme', next)
            const root = document.documentElement
            if (next === 'dark') {
                root.classList.remove('theme-light')
                root.classList.add('theme-dark')
            } else {
                root.classList.remove('theme-dark')
                root.classList.add('theme-light')
            }
        }
    }

    const titleMap: Record<string, { title: string; pillar: string; pillarColor: string }> = {
        '/dashboard': {
            title: 'Dashboard Ejecutivo & Financiero',
            pillar: '🏛️ Jefatura y Dirección',
            pillarColor: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
        },
        '/dashboard/nomina': {
            title: 'Pre-Nómina y Raya Semanal',
            pillar: '🏛️ Jefatura y Dirección',
            pillarColor: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
        },
        '/dashboard/nomina/tarifas': {
            title: 'Matriz Oficial de Tarifas y Destajos',
            pillar: '📐 Planeación e Ingeniería',
            pillarColor: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
        },
        '/dashboard/semana': {
            title: 'Planeación Semanal (Metas vs Ejecución)',
            pillar: '📐 Planeación e Ingeniería',
            pillarColor: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
        },
        '/dashboard/catalogos/ubicaciones': {
            title: 'Frentes, Rebajes y Ubicaciones',
            pillar: '📐 Planeación e Ingeniería',
            pillarColor: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
        },
        '/dashboard/catalogos/productos-mina': {
            title: 'Catálogo de Conceptos y Precios Unitarios',
            pillar: '📐 Planeación e Ingeniería',
            pillarColor: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
        },
        '/dashboard/catalogos/cuadrillas': {
            title: 'Pizarra Táctica de Cuadrillas',
            pillar: '⛏️ Operación Mina',
            pillarColor: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
        },
        '/dashboard/catalogos/empleados': {
            title: 'Fuerza Operativa y Mineros',
            pillar: '⛏️ Operación Mina',
            pillarColor: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
        },
        '/dashboard/catalogos/equipos': {
            title: 'Flota de Equipos (Scooptrams / Jumbos / Camiones)',
            pillar: '⛏️ Operación Mina',
            pillarColor: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
        },
        '/dashboard/operacion/reportes-diarios': {
            title: 'Central de Reportes Diarios e Incidencias',
            pillar: '📋 Reportes y Seguridad',
            pillarColor: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
        },
        '/dashboard/operacion/reportes-diarios/nuevo': {
            title: 'Captura de Reporte Diario de Turno',
            pillar: '📋 Reportes y Seguridad',
            pillarColor: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
        },
        '/dashboard/chat': {
            title: 'Bitácora Operativa y Blog de Tareas',
            pillar: '📋 Reportes y Seguridad',
            pillarColor: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
        },
        '/dashboard/catalogos': {
            title: 'Catálogos Maestros de Operación',
            pillar: '⚙️ Sistema y Catálogos',
            pillarColor: 'bg-purple-500/15 text-purple-500 border-purple-500/30',
        },
        '/dashboard/catalogos/minas': {
            title: 'Unidades Mineras',
            pillar: '⚙️ Sistema y Catálogos',
            pillarColor: 'bg-purple-500/15 text-purple-500 border-purple-500/30',
        },
        '/dashboard/catalogos/puestos-roles': {
            title: 'Puestos Oficiales, Roles y Splits',
            pillar: '⚙️ Sistema y Catálogos',
            pillarColor: 'bg-purple-500/15 text-purple-500 border-purple-500/30',
        },
        '/dashboard/configuracion': {
            title: 'Reglas y Configuración del Sistema',
            pillar: '⚙️ Sistema y Catálogos',
            pillarColor: 'bg-purple-500/15 text-purple-500 border-purple-500/30',
        },
        '/dashboard/configuracion/visiones': {
            title: 'Permisos y Visiones (Web + APK Android)',
            pillar: '⚙️ Sistema y Catálogos',
            pillarColor: 'bg-purple-500/15 text-purple-500 border-purple-500/30',
        },
        '/dashboard/configuracion/usuarios': {
            title: 'Control de Usuarios y Accesos',
            pillar: '⚙️ Sistema y Catálogos',
            pillarColor: 'bg-purple-500/15 text-purple-500 border-purple-500/30',
        },
    }

    const currentMeta =
        titleMap[pathname] ||
        (pathname.includes('/reportes-diarios/')
            ? {
                  title: 'Expediente de Reporte Diario',
                  pillar: '📋 Reportes y Seguridad',
                  pillarColor: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
              }
            : {
                  title: 'Panel de Control Operativo',
                  pillar: '⛏️ Operación Mina',
                  pillarColor: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
              })

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false)
            }
            if (previewRef.current && !previewRef.current.contains(event.target as Node)) {
                setIsPreviewOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        if (isRealSuperAdmin) {
            supabase
                .from('sys_users')
                .select('id, email, full_name, role, views_json, active')
                .eq('active', true)
                .order('full_name')
                .then(({ data }) => {
                    if (data) setSysUsersList(data)
                })
        }
    }, [isRealSuperAdmin])

    useEffect(() => {
        if (sysUserId) {
            supabase
                .from('sys_users')
                .select('nickname, avatar_url')
                .eq('id', sysUserId)
                .maybeSingle()
                .then(({ data }) => {
                    if (data) setProfile(data)
                })
        }
    }, [sysUserId])

    const handleSignOut = async () => {
        await signOut()
    }

    return (
        <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between pl-16 pr-3 md:px-6 z-30 sticky top-0 shadow-sm html2pdf__ignore">
            {/* Left: Dynamic Pillar Badge, Title & Verified Role Badge */}
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <span
                    className={`hidden lg:inline-flex items-center px-2.5 py-1 text-[11px] font-black uppercase tracking-wider rounded-lg border shrink-0 ${currentMeta.pillarColor}`}
                >
                    {currentMeta.pillar}
                </span>
                <h2 className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight truncate">
                    {currentMeta.title}
                </h2>
                <span className="hidden xl:inline-flex px-2.5 py-0.5 bg-amber-500/15 text-amber-400 text-xs font-bold rounded-full border border-amber-500/30 shrink-0">
                    Semana 38 (21-27 Sep)
                </span>

                {/* Insignia de Rol Verificado (Solo Lectura) */}
                <div className="hidden sm:flex items-center gap-1.5 bg-slate-950/90 border border-emerald-500/40 rounded-xl px-2.5 py-1 shadow-sm shrink-0">
                    <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
                    <span className="text-[10px] font-black text-emerald-400 uppercase">
                        {sysRole ? sysRole.replace(/_/g, ' ') : 'VERIFICADO'}
                    </span>
                </div>
            </div>

            {/* Right: Selector Modo Web / Modo APK, Simulador de Perfiles SuperAdmin, Vistas, PDF, Tema, Perfil */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Conmutador Directo Modo Web vs Modo APK (Celular) */}
                <div className="flex items-center bg-slate-950 border border-slate-700 rounded-xl p-0.5 shadow-inner">
                    <button
                        type="button"
                        onClick={() => router.push('/dashboard')}
                        title="Vista de Escritorio (Modo Web)"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 text-[11px] font-black transition-all cursor-pointer"
                    >
                        <Monitor size={13} />
                        <span className="hidden md:inline">Modo Web</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push('/mobile')}
                        title="Abrir Simulador Interactivo de Celular (Modo APK)"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-black transition-all cursor-pointer"
                    >
                        <Smartphone size={13} />
                        <span className="hidden sm:inline">Modo APK</span>
                    </button>
                </div>

                {/* Selector Exclusivo SuperAdmin: Ver Pantallas y Avances como otro Perfil / Usuario */}
                {isRealSuperAdmin && (
                    <div className="relative" ref={previewRef}>
                        <button
                            type="button"
                            onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                            title="Exclusivo SuperAdmin: Ver pantallas y avances como otro perfil o usuario"
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                                previewProfile
                                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                                    : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border-purple-500/40'
                            }`}
                        >
                            <Eye size={14} />
                            <span className="hidden lg:inline max-w-[140px] truncate">
                                {previewProfile ? `Viendo: ${previewProfile.label}` : 'Ver como Perfil'}
                            </span>
                            <ChevronDown size={13} />
                        </button>

                        {isPreviewOpen && (
                            <div className="absolute right-0 mt-2 w-72 max-h-[80vh] overflow-y-auto bg-slate-900 rounded-2xl shadow-2xl border-2 border-purple-500/50 p-2 z-50 space-y-2">
                                <div className="px-2 py-1 border-b border-slate-800">
                                    <div className="text-[10px] font-black uppercase tracking-wider text-purple-400">
                                        👁️ Inspector de Perfiles (Super Admin)
                                    </div>
                                    <p className="text-[11px] text-slate-400">
                                        Revisa qué pantallas y avances ve cada perfil o usuario en Web y APK:
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <div className="px-2 text-[10px] font-black uppercase text-slate-500">
                                        Simular por Nivel de Mando:
                                    </div>
                                    {ROLES_PREVIEW_LIST.map((r) => {
                                        const isCurrent =
                                            (!previewProfile && r.role === 'SUPER_ADMIN') ||
                                            (previewProfile?.role === r.role && !previewProfile?.userId)
                                        return (
                                            <button
                                                key={r.role}
                                                type="button"
                                                onClick={() => {
                                                    setIsPreviewOpen(false)
                                                    if (r.role === 'SUPER_ADMIN') {
                                                        setPreviewProfile(null)
                                                    } else {
                                                        const views = DEFAULT_ROLE_VIEWS[r.role] || []
                                                        setPreviewProfile({
                                                            role: r.role,
                                                            label: r.label.replace(/^[^\s]+\s/, ''),
                                                            views,
                                                        })
                                                        const first = resolveFirstAllowedPath(r.role, views)
                                                        router.push(first)
                                                    }
                                                }}
                                                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                                                    isCurrent
                                                        ? 'bg-amber-500 text-slate-950 font-black'
                                                        : 'text-slate-200 hover:bg-slate-800'
                                                }`}
                                            >
                                                <span>{r.label}</span>
                                                {isCurrent && <span className="text-[10px]">ACTIVO</span>}
                                            </button>
                                        )
                                    })}
                                </div>

                                {sysUsersList.length > 0 && (
                                    <div className="space-y-1 pt-2 border-t border-slate-800">
                                        <div className="px-2 text-[10px] font-black uppercase text-emerald-400 flex items-center gap-1">
                                            <Users size={11} /> Simular Usuario Específico:
                                        </div>
                                        {sysUsersList.map((u) => {
                                            const isUserSelected = previewProfile?.userId === u.id
                                            return (
                                                <button
                                                    key={u.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setIsPreviewOpen(false)
                                                        if (u.role === 'SUPER_ADMIN') {
                                                            setPreviewProfile(null)
                                                        } else {
                                                            const views = Array.isArray(u.views_json)
                                                                ? u.views_json
                                                                : DEFAULT_ROLE_VIEWS[u.role] || []
                                                            setPreviewProfile({
                                                                role: u.role,
                                                                label: u.full_name || u.email,
                                                                userId: u.id,
                                                                userEmail: u.email,
                                                                views,
                                                            })
                                                            const first = resolveFirstAllowedPath(u.role, views)
                                                            router.push(first)
                                                        }
                                                    }}
                                                    className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                                                        isUserSelected
                                                            ? 'bg-emerald-500 text-slate-950 font-black'
                                                            : 'text-slate-300 hover:bg-slate-800 font-semibold'
                                                    }`}
                                                >
                                                    <div className="truncate">{u.full_name}</div>
                                                    <div
                                                        className={`text-[10px] truncate ${
                                                            isUserSelected ? 'text-slate-900' : 'text-slate-500'
                                                        }`}
                                                    >
                                                        {u.role} • {u.email}
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}

                                <div className="pt-2 border-t border-slate-800 flex gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsPreviewOpen(false)
                                            router.push('/dashboard/configuracion/visiones')
                                        }}
                                        className="flex-1 py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold text-center cursor-pointer"
                                    >
                                        ⚙️ Configurar Vistas
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsPreviewOpen(false)
                                            router.push('/mobile')
                                        }}
                                        className="flex-1 py-2 px-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-black text-center cursor-pointer"
                                    >
                                        📱 Ver en APK
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Botón Universal Exportar a PDF */}
                <button
                    onClick={() => window.print()}
                    title="Exportar o Imprimir esta vista en PDF Oficial"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow-sm cursor-pointer"
                >
                    <Printer size={14} />
                    <span className="hidden sm:inline">Exportar PDF</span>
                </button>

                {/* Botón Modo Claro (Día) / Modo Oscuro (Noche) */}
                <button
                    onClick={toggleTheme}
                    title={theme === 'light' ? 'Cambiar a Modo Noche' : 'Cambiar a Modo Día (Claro)'}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        theme === 'light'
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-500 hover:bg-amber-500/25'
                            : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                    }`}
                >
                    {theme === 'light' ? (
                        <>
                            <Sun size={15} className="text-amber-500" />
                            <span className="hidden md:inline">Modo Día</span>
                        </>
                    ) : (
                        <>
                            <Moon size={15} className="text-indigo-400" />
                            <span className="hidden md:inline">Modo Noche</span>
                        </>
                    )}
                </button>

                <NotificationBell />

                {/* User Profile Dropdown */}
                <div className="relative pl-2.5 border-l border-slate-800" ref={menuRef}>
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="flex items-center gap-2.5 text-left hover:bg-slate-800/50 p-1.5 rounded-xl transition-colors"
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-bold text-white leading-tight">
                                {profile.nickname || fullName || user?.email?.split('@')[0] || 'Usuario'}
                            </p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">
                                {sysRole ? sysRole.replace(/_/g, ' ') : 'Autenticado'}
                            </p>
                        </div>
                        <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 overflow-hidden">
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User size={16} className="text-slate-400" />
                            )}
                        </div>
                        <ChevronDown
                            size={14}
                            className={`text-slate-500 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {isMenuOpen && (
                        <div className="absolute right-0 mt-2 w-52 bg-slate-900 rounded-xl shadow-xl border border-slate-700 overflow-hidden z-50">
                            <div className="p-2">
                                <button
                                    onClick={() => {
                                        setIsMenuOpen(false)
                                        router.push('/dashboard/profile')
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors font-semibold"
                                >
                                    <Settings size={16} />
                                    Ajustes de Perfil
                                </button>
                                <div className="h-px bg-slate-800 my-1"></div>
                                <button
                                    onClick={handleSignOut}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors font-semibold"
                                >
                                    <LogOut size={16} />
                                    Cerrar Sesión
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
