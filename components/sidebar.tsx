'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Menu,
    X,
    LayoutDashboard,
    Pickaxe,
    Users,
    HardHat,
    FileText,
    Settings,
    LogOut,
    ChevronRight,
    DollarSign,
    Calendar,
    Truck,
    MessageSquare,
    MapPin,
    ShieldAlert,
    Coins,
    PlusCircle,
    ShieldCheck,
    Eye,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

interface MenuItem {
    name: string
    icon: any
    href: string
    badge?: string
}

interface MenuGroup {
    label: string
    accentColor: string
    dotColor: string
    items: MenuItem[]
}

const menuGroups: MenuGroup[] = [
    {
        label: '1. Jefatura y Dirección',
        accentColor: 'text-amber-500',
        dotColor: 'bg-amber-500',
        items: [
            { name: 'Dashboard Ejecutivo', icon: LayoutDashboard, href: '/dashboard', badge: 'Jefatura+' },
            { name: 'Pre-Nómina y Raya', icon: DollarSign, href: '/dashboard/nomina', badge: 'Confidencial' },
        ],
    },
    {
        label: '2. Planeación e Ingeniería',
        accentColor: 'text-blue-500',
        dotColor: 'bg-blue-500',
        items: [
            { name: 'Semana en Curso (Metas)', icon: Calendar, href: '/dashboard/semana', badge: 'S-38' },
            { name: 'Frentes y Ubicaciones', icon: MapPin, href: '/dashboard/catalogos/ubicaciones' },
            { name: 'Conceptos y Tarifas', icon: Coins, href: '/dashboard/catalogos/productos-mina' },
        ],
    },
    {
        label: '3. Operación Mina (Campo)',
        accentColor: 'text-emerald-500',
        dotColor: 'bg-emerald-500',
        items: [
            { name: 'Pizarra de Cuadrillas', icon: Users, href: '/dashboard/catalogos/cuadrillas', badge: 'Táctica' },
            { name: 'Fuerza Operativa (Mineros)', icon: HardHat, href: '/dashboard/catalogos/empleados' },
            { name: 'Flota de Equipos', icon: Truck, href: '/dashboard/catalogos/equipos' },
        ],
    },
    {
        label: '4. Reportes y Seguridad',
        accentColor: 'text-rose-500',
        dotColor: 'bg-rose-500',
        items: [
            { name: 'Reportes Diarios de Turno', icon: Pickaxe, href: '/dashboard/operacion/reportes-diarios' },
            { name: 'Capturar Nuevo Reporte', icon: PlusCircle, href: '/dashboard/operacion/reportes-diarios/nuevo', badge: 'Turno' },
            { name: 'Accidentes e Incidencias', icon: ShieldAlert, href: '/dashboard/operacion/reportes-diarios?tab=incidencias', badge: 'Seguridad' },
            { name: 'Bitácora y Tareas', icon: MessageSquare, href: '/dashboard/chat' },
        ],
    },
    {
        label: '5. Administración y Sistema',
        accentColor: 'text-purple-500',
        dotColor: 'bg-purple-500',
        items: [
            { name: 'Catálogos Maestros', icon: FileText, href: '/dashboard/catalogos' },
            { name: 'Configurar Visiones (Web + APK)', icon: Eye, href: '/dashboard/configuracion/visiones', badge: 'APK' },
            { name: 'Accesos y Usuarios', icon: Users, href: '/dashboard/configuracion/usuarios' },
            { name: 'Configuración General', icon: Settings, href: '/dashboard/configuracion' },
        ],
    },
]

export default function Sidebar() {
    const [isDesktopOpen, setIsDesktopOpen] = useState(true)
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const pathname = usePathname()
    const { signOut, sysRole, user, fullName, isViewAllowed } = useAuth()

    useEffect(() => {
        setIsMobileOpen(false)
    }, [pathname])

    const renderMenuContent = (expanded: boolean, isMobileDrawer = false) => (
        <>
            {/* Brand Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="min-w-[38px] h-[38px] bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl flex items-center justify-center shadow-md">
                        <HardHat className="text-white" size={20} />
                    </div>
                    {expanded && (
                        <div className="flex flex-col min-w-0">
                            <h1 className="text-base font-black text-white tracking-wide leading-tight truncate">
                                LA RAYA MINA
                            </h1>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold truncate">
                                Unidad El Herrero • S-38
                            </p>
                        </div>
                    )}
                </div>

                {isMobileDrawer && (
                    <button
                        onClick={() => setIsMobileOpen(false)}
                        className="p-2 rounded-xl bg-slate-800 text-slate-200 hover:text-white border border-slate-700"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Credencial Verificada (Solo Lectura — Sin Selector Demo) */}
            {expanded && (
                <div className="mx-3 mt-3 p-3 rounded-xl bg-slate-950 border border-emerald-500/30 shadow-inner">
                    <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                            <ShieldCheck size={12} /> Credencial Verificada
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[9px] font-black uppercase">
                            {sysRole || 'AUTORIZADO'}
                        </span>
                    </div>
                    <p className="text-xs font-bold text-white truncate mt-1">
                        {fullName || user?.email}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                </div>
            )}

            {/* Menu Items Filtrados Estrictamente por las Vistas Autorizadas del Usuario */}
            <div className="flex-1 py-4 px-3 space-y-5 overflow-y-auto overflow-x-hidden custom-scrollbar">
                {menuGroups.map((group, gIdx) => {
                    const visibleItems = group.items.filter((it) => isViewAllowed(it.href))
                    if (visibleItems.length === 0) return null

                    return (
                        <div key={gIdx} className="space-y-1">
                            {expanded && (
                                <div className="px-3 flex items-center gap-2 mb-1.5">
                                    <span className={`w-2 h-2 rounded-full ${group.dotColor}`} />
                                    <p className={`text-[10px] font-black uppercase tracking-wider ${group.accentColor}`}>
                                        {group.label}
                                    </p>
                                </div>
                            )}
                            <div className="space-y-1">
                                {visibleItems.map((item) => {
                                    const baseHref = item.href.split('?')[0]
                                    const isIncidenceLink = item.href.includes('tab=incidencias')
                                    const isActive =
                                        !isIncidenceLink &&
                                        (pathname === baseHref ||
                                            (baseHref !== '/dashboard' && pathname.startsWith(baseHref + '/')))

                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            onClick={() => {
                                                if (isMobileDrawer) setIsMobileOpen(false)
                                            }}
                                        >
                                            <div
                                                className={`relative flex items-center justify-between h-10 px-3 rounded-xl transition-all duration-200 group ${
                                                    isActive
                                                        ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                                                        : 'text-slate-300 hover:bg-slate-800 hover:text-white font-semibold'
                                                }`}
                                            >
                                                <div className="flex items-center min-w-0">
                                                    <item.icon
                                                        size={17}
                                                        className={`min-w-[17px] transition-colors ${
                                                            isActive ? 'text-slate-950' : group.accentColor
                                                        }`}
                     
                                                    />

                                                    {expanded && (
                                                        <span className="ml-3 text-xs truncate">{item.name}</span>
                                                    )}
                                                </div>

                                                {expanded && item.badge && (
                                                    <span
                                                        className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                                            isActive
                                                                ? 'bg-slate-950/20 text-slate-950'
                                                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                                                        }`}
                                                    >
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Footer Actions */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/40 shrink-0">
                {!isMobileDrawer && (
                    <button
                        onClick={() => setIsDesktopOpen(!isDesktopOpen)}
                        className="w-full flex items-center justify-center p-1.5 text-slate-400 hover:text-white transition-colors mb-1.5 rounded-lg hover:bg-slate-800"
                    >
                        <motion.div animate={{ rotate: isDesktopOpen ? 180 : 0 }}>
                            <ChevronRight size={16} />
                        </motion.div>
                    </button>
                )}

                <button
                    onClick={signOut}
                    className={`flex items-center w-full px-3 py-2.5 rounded-xl text-rose-400 hover:bg-rose-500/15 transition-all font-bold ${
                        !expanded && 'justify-center'
                    }`}
                >
                    <LogOut size={16} />
                    {expanded && <span className="ml-3 text-xs">Cerrar Sesión Segura</span>}
                </button>
            </div>
        </>
    )

    const mobileBottomItems = [
        { label: 'Mando', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Cuadrillas', href: '/dashboard/catalogos/cuadrillas', icon: Users },
        { label: 'Capturar', href: '/dashboard/operacion/reportes-diarios/nuevo', icon: PlusCircle, primary: true },
        { label: 'Semana 38', href: '/dashboard/semana', icon: Calendar },
        { label: 'Bitácora', href: '/dashboard/chat', icon: MessageSquare },
    ].filter((tab) => isViewAllowed(tab.href))

    return (
        <>
            {/* Botón Flotante Hamburguesa en Celular */}
            <button
                onClick={() => setIsMobileOpen(true)}
                aria-label="Abrir menú de navegación"
                className="md:hidden fixed top-3 left-3 z-50 w-10 h-10 bg-slate-900 text-amber-500 rounded-xl border-2 border-amber-500/60 shadow-lg flex items-center justify-center active:scale-95 transition-transform html2pdf__ignore"
            >
                <Menu size={20} />
            </button>

            {/* Drawer Móvil Desplegable con Animación */}
            <AnimatePresence>
                {isMobileOpen && (
                    <>
                        <motion.div
                            key="mobile-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileOpen(false)}
                            className="md:hidden fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-40 html2pdf__ignore"
                        />
                        <motion.aside
                            key="mobile-drawer"
                            initial={{ x: -300 }}
                            animate={{ x: 0 }}
                            exit={{ x: -300 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                            className="md:hidden fixed left-0 top-0 bottom-0 w-[285px] bg-slate-900 border-r border-slate-800 z-50 flex flex-col shadow-2xl html2pdf__ignore"
                        >
                            {renderMenuContent(true, true)}
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Sidebar Fijo en Escritorio */}
            <motion.aside
                initial={false}
                animate={{ width: isDesktopOpen ? 256 : 76 }}
                className="hidden md:flex fixed left-0 top-0 bottom-0 bg-slate-900 border-r border-slate-800 z-40 flex-col transition-colors duration-300 shadow-xl html2pdf__ignore"
            >
                {renderMenuContent(isDesktopOpen, false)}
            </motion.aside>

            {/* Barra Inferior Móvil Filtrada por Permisos */}
            {mobileBottomItems.length > 0 && (
                <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-30 flex items-center justify-around px-2 shadow-2xl html2pdf__ignore">
                    {mobileBottomItems.map((tab) => {
                        const isActive =
                            pathname === tab.href ||
                            (tab.href !== '/dashboard' && pathname.startsWith(tab.href))
                        const IconComp = tab.icon

                        if (tab.primary) {
                            return (
                                <Link
                                    key={tab.href}
                                    href={tab.href}
                                    className="flex flex-col items-center justify-center -mt-5"
                                >
                                    <div className="w-12 h-12 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg border-2 border-white">
                                        <IconComp size={22} />
                                    </div>
                                    <span className="text-[10px] font-black text-amber-500 mt-0.5">
                                        {tab.label}
                                    </span>
                                </Link>
                            )
                        }

                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors ${
                                    isActive ? 'text-amber-500 font-black' : 'text-slate-400 font-semibold'
                                }`}
                            >
                                <IconComp size={19} />
                                <span className="text-[10px] mt-0.5">{tab.label}</span>
                            </Link>
                        )
                    })}
                </nav>
            )}
        </>
    )
}
