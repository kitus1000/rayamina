'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, User, ChevronDown, LogOut, Settings, Sparkles, Sun, Moon, Printer } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

export default function Topbar() {
    const { user, sysRole, sysUserId, signOut, loginAsDemo } = useAuth()
    const router = useRouter()
    const pathname = usePathname()
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const [profile, setProfile] = useState<{ nickname?: string, avatar_url?: string }>({})
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

    const titleMap: Record<string, { title: string, pillar: string, pillarColor: string }> = {
        '/dashboard': { title: 'Dashboard Ejecutivo & Financiero', pillar: '🏛️ Jefatura y Dirección', pillarColor: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
        '/dashboard/nomina': { title: 'Pre-Nómina y Raya Semanal', pillar: '🏛️ Jefatura y Dirección', pillarColor: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
        '/dashboard/nomina/tarifas': { title: 'Matriz Oficial de Tarifas y Destajos', pillar: '📐 Planeación e Ingeniería', pillarColor: 'bg-blue-500/15 text-blue-500 border-blue-500/30' },
        '/dashboard/semana': { title: 'Planeación Semanal (Metas vs Ejecución)', pillar: '📐 Planeación e Ingeniería', pillarColor: 'bg-blue-500/15 text-blue-500 border-blue-500/30' },
        '/dashboard/catalogos/ubicaciones': { title: 'Frentes, Rebajes y Ubicaciones', pillar: '📐 Planeación e Ingeniería', pillarColor: 'bg-blue-500/15 text-blue-500 border-blue-500/30' },
        '/dashboard/catalogos/productos-mina': { title: 'Catálogo de Conceptos y Precios Unitarios', pillar: '📐 Planeación e Ingeniería', pillarColor: 'bg-blue-500/15 text-blue-500 border-blue-500/30' },
        '/dashboard/catalogos/cuadrillas': { title: 'Pizarra Táctica de Cuadrillas', pillar: '⛏️ Operación Mina', pillarColor: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' },
        '/dashboard/catalogos/empleados': { title: 'Fuerza Operativa y Mineros', pillar: '⛏️ Operación Mina', pillarColor: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' },
        '/dashboard/catalogos/equipos': { title: 'Flota de Equipos (Scooptrams / Jumbos / Camiones)', pillar: '⛏️ Operación Mina', pillarColor: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' },
        '/dashboard/operacion/reportes-diarios': { title: 'Central de Reportes Diarios e Incidencias', pillar: '📋 Reportes y Seguridad', pillarColor: 'bg-rose-500/15 text-rose-500 border-rose-500/30' },
        '/dashboard/operacion/reportes-diarios/nuevo': { title: 'Captura de Reporte Diario de Turno', pillar: '📋 Reportes y Seguridad', pillarColor: 'bg-rose-500/15 text-rose-500 border-rose-500/30' },
        '/dashboard/chat': { title: 'Bitácora Operativa y Blog de Tareas', pillar: '📋 Reportes y Seguridad', pillarColor: 'bg-rose-500/15 text-rose-500 border-rose-500/30' },
        '/dashboard/catalogos': { title: 'Catálogos Maestros de Operación', pillar: '⚙️ Sistema y Catálogos', pillarColor: 'bg-purple-500/15 text-purple-500 border-purple-500/30' },
        '/dashboard/catalogos/minas': { title: 'Unidades Mineras', pillar: '⚙️ Sistema y Catálogos', pillarColor: 'bg-purple-500/15 text-purple-500 border-purple-500/30' },
        '/dashboard/catalogos/puestos-roles': { title: 'Puestos Oficiales, Roles y Splits', pillar: '⚙️ Sistema y Catálogos', pillarColor: 'bg-purple-500/15 text-purple-500 border-purple-500/30' },
        '/dashboard/configuracion': { title: 'Reglas y Configuración del Sistema', pillar: '⚙️ Sistema y Catálogos', pillarColor: 'bg-purple-500/15 text-purple-500 border-purple-500/30' },
        '/dashboard/configuracion/visiones': { title: 'Permisos y Visiones Jerárquicas', pillar: '⚙️ Sistema y Catálogos', pillarColor: 'bg-purple-500/15 text-purple-500 border-purple-500/30' },
        '/dashboard/configuracion/usuarios': { title: 'Control de Usuarios y Accesos', pillar: '⚙️ Sistema y Catálogos', pillarColor: 'bg-purple-500/15 text-purple-500 border-purple-500/30' }
    }

    const currentMeta = titleMap[pathname] || (
        pathname.includes('/reportes-diarios/')
            ? { title: 'Expediente de Reporte Diario', pillar: '📋 Reportes y Seguridad', pillarColor: 'bg-rose-500/15 text-rose-500 border-rose-500/30' }
            : { title: 'Panel de Control Operativo', pillar: '⛏️ Operación Mina', pillarColor: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' }
    )

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        if (sysUserId && !sysUserId.startsWith('demo-')) {
            supabase.from('sys_users')
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
        <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 z-30 sticky top-0 shadow-sm html2pdf__ignore">
            {/* Left: Dynamic Pillar Badge, Title & Role Switcher */}
            <div className="flex items-center gap-3 min-w-0">
                <span className={`hidden lg:inline-flex items-center px-2.5 py-1 text-[11px] font-black uppercase tracking-wider rounded-lg border shrink-0 ${currentMeta.pillarColor}`}>
                    {currentMeta.pillar}
                </span>
                <h2 className="text-base md:text-lg font-black text-white tracking-tight truncate">{currentMeta.title}</h2>
                <span className="hidden xl:inline-flex px-2.5 py-0.5 bg-amber-500/15 text-amber-400 text-xs font-bold rounded-full border border-amber-500/30 shrink-0">
                    Semana 38 (21-27 Sep)
                </span>

                {/* Selector de Jerarquía / Rol en Vivo */}
                <div className="flex items-center gap-1.5 bg-slate-950/90 border border-indigo-500/40 rounded-xl px-2.5 py-1 shadow-sm shrink-0">
                    <Sparkles size={13} className="text-indigo-400 shrink-0" />
                    <span className="text-[10px] font-black text-indigo-400 uppercase hidden md:inline">Rol Activo:</span>
                    <select
                        value={sysRole || 'SUPER_ADMIN'}
                        onChange={e => {
                            loginAsDemo(e.target.value)
                        }}
                        className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer !border-0 !p-0 !shadow-none"
                    >
                        <option value="SUPER_ADMIN">👑 Super Admin (Total)</option>
                        <option value="DIRECTOR_OPERATIVO">🏛️ Director Operativo (Finanzas & KPI)</option>
                        <option value="GERENTE">⭐ Gerente Operaciones (Jefatura)</option>
                        <option value="SUPERINTENDENTE">⛏️ Superintendente (Mueve Cuadrillas)</option>
                        <option value="JEFE_PLANEACION">📐 Jefe Planeación (Metas & Cubicación)</option>
                        <option value="SUPERVISOR">📋 Supervisor (Reportes & Seguridad)</option>
                    </select>
                </div>
            </div>

            {/* Right: PDF Export, Theme Toggle (Modo Día / Noche), Profile */}
            <div className="flex items-center gap-2.5 shrink-0">
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

                {/* User Profile Dropdown */}
                <div className="relative pl-2.5 border-l border-slate-800" ref={menuRef}>
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="flex items-center gap-2.5 text-left hover:bg-slate-800/50 p-1.5 rounded-xl transition-colors"
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-bold text-white leading-tight">{profile.nickname || user?.email?.split('@')[0] || 'Mando Activo'}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">{sysRole ? sysRole.replace('_', ' ') : 'Cargando...'}</p>
                        </div>
                        <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 overflow-hidden">
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User size={16} className="text-slate-400" />
                            )}
                        </div>
                        <ChevronDown size={14} className={`text-slate-500 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {isMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-slate-900 rounded-xl shadow-xl border border-slate-700 overflow-hidden z-50">
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
