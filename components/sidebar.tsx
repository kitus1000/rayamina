'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
    Menu, X, LayoutDashboard, Pickaxe,
    Users, HardHat, FileText, Settings,
    LogOut, ChevronRight, DollarSign, Calendar,
    Truck, MessageSquare, MapPin, ShieldAlert, Coins, Lock
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

interface MenuItem {
    name: string
    icon: any
    href: string
    badge?: string
    requiresJefatura?: boolean
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
            { name: 'Dashboard Ejecutivo', icon: LayoutDashboard, href: '/dashboard', badge: 'Jefatura+', requiresJefatura: true },
            { name: 'Pre-Nómina y Raya', icon: DollarSign, href: '/dashboard/nomina', badge: 'S-38', requiresJefatura: true },
        ]
    },
    {
        label: '2. Planeación e Ingeniería',
        accentColor: 'text-blue-500',
        dotColor: 'bg-blue-500',
        items: [
            { name: 'Semana en Curso (Metas)', icon: Calendar, href: '/dashboard/semana' },
            { name: 'Frentes y Ubicaciones', icon: MapPin, href: '/dashboard/catalogos/ubicaciones' },
            { name: 'Conceptos y Tarifas', icon: Coins, href: '/dashboard/catalogos/productos-mina' },
        ]
    },
    {
        label: '3. Operación Mina (Campo)',
        accentColor: 'text-emerald-500',
        dotColor: 'bg-emerald-500',
        items: [
            { name: 'Pizarra de Cuadrillas', icon: Users, href: '/dashboard/catalogos/cuadrillas', badge: 'Táctica' },
            { name: 'Fuerza Operativa (Mineros)', icon: HardHat, href: '/dashboard/catalogos/empleados' },
            { name: 'Flota de Equipos', icon: Truck, href: '/dashboard/catalogos/equipos' },
        ]
    },
    {
        label: '4. Reportes y Seguridad',
        accentColor: 'text-rose-500',
        dotColor: 'bg-rose-500',
        items: [
            { name: 'Reportes Diarios de Turno', icon: Pickaxe, href: '/dashboard/operacion/reportes-diarios' },
            { name: 'Accidentes e Incidencias', icon: ShieldAlert, href: '/dashboard/operacion/reportes-diarios?tab=incidencias', badge: 'Seguridad' },
            { name: 'Bitácora y Tareas', icon: MessageSquare, href: '/dashboard/chat' },
        ]
    },
    {
        label: '5. Administración y Sistema',
        accentColor: 'text-purple-500',
        dotColor: 'bg-purple-500',
        items: [
            { name: 'Catálogos Maestros', icon: FileText, href: '/dashboard/catalogos' },
            { name: 'Accesos y Usuarios', icon: Users, href: '/dashboard/configuracion/usuarios' },
            { name: 'Configuración General', icon: Settings, href: '/dashboard/configuracion' },
        ]
    }
]

export default function Sidebar() {
    const [isOpen, setIsOpen] = useState(true)
    const pathname = usePathname()
    const { signOut, sysRole } = useAuth()

    const isJefaturaOrAbove = [
        'SUPER_ADMIN',
        'DIRECTOR_OPERATIVO',
        'GERENTE',
        'SUPERINTENDENTE',
        'JEFE_PLANEACION',
        'JEFE_MINA',
        'JEFE_RH'
    ].includes(sysRole || 'SUPER_ADMIN')

    return (
        <>
            {/* Mobile Toggle */}
            <div className="md:hidden fixed top-4 left-4 z-50 html2pdf__ignore">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 bg-slate-800 text-white rounded-lg shadow-lg border border-slate-700"
                >
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Sidebar Container */}
            <motion.aside
                initial={{ width: isOpen ? 260 : 80 }}
                animate={{ width: isOpen ? 260 : 80 }}
                transition={{ duration: 0.3, type: 'spring', stiffness: 100, damping: 20 }}
                className={`fixed left-0 top-0 h-full bg-slate-900 border-r border-slate-800 z-40 ${isOpen ? 'flex' : 'hidden'} md:flex flex-col shadow-2xl html2pdf__ignore`}
            >
                {/* Brand Header */}
                <div className="h-16 flex items-center px-4 border-b border-slate-800">
                    <div className="flex items-center gap-3 overflow-hidden w-full">
                        <div className="min-w-[38px] h-[38px] bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl flex items-center justify-center shadow-md">
                            <HardHat className="text-white" size={20} />
                        </div>
                        {isOpen && (
                            <div className="flex flex-col min-w-0">
                                <h1 className="text-base font-black text-white tracking-wide leading-tight truncate">LA RAYA MINA</h1>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold truncate">Unidad El Herrero</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Menu Items Organized by Functional Pillar */}
                <div className="flex-1 py-4 px-3 space-y-5 overflow-y-auto overflow-x-hidden custom-scrollbar">
                    {menuGroups.map((group, gIdx) => (
                        <div key={gIdx} className="space-y-1">
                            {isOpen && (
                                <div className="px-3 flex items-center gap-2 mb-1.5">
                                    <span className={`w-2 h-2 rounded-full ${group.dotColor}`} />
                                    <p className={`text-[10px] font-black uppercase tracking-wider ${group.accentColor}`}>
                                        {group.label}
                                    </p>
                                </div>
                            )}
                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const baseHref = item.href.split('?')[0]
                                    const isIncidenceLink = item.href.includes('tab=incidencias')
                                    const isActive = !isIncidenceLink && (pathname === baseHref || (baseHref !== '/dashboard' && pathname.startsWith(baseHref + '/')))
                                    const lockedForSupervisor = item.requiresJefatura && !isJefaturaOrAbove

                                    return (
                                        <Link key={item.name} href={item.href}>
                                            <div className={`relative flex items-center justify-between h-9 px-3 rounded-xl transition-all duration-200 group ${
                                                isActive
                                                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white font-semibold'
                                            }`}>
                                                <div className="flex items-center min-w-0">
                                                    <item.icon
                                                        size={16}
                                                        className={`min-w-[16px] transition-colors ${
                                                            isActive ? 'text-slate-950' : group.accentColor
                                                        }`}
                                                    />

                                                    {isOpen && (
                                                        <span className="ml-3 text-xs truncate">
                                                            {item.name}
                                                        </span>
                                                    )}
                                                </div>

                                                {isOpen && (
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {lockedForSupervisor ? (
                                                            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9px] font-black flex items-center gap-0.5">
                                                                <Lock size={9} /> Jefatura
                                                            </span>
                                                        ) : item.badge ? (
                                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                                                isActive
                                                                    ? 'bg-slate-950/20 text-slate-950'
                                                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                                            }`}>
                                                                {item.badge}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                )}
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Actions */}
                <div className="p-3 border-t border-slate-800 bg-slate-950/40">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="w-full flex items-center justify-center p-1.5 text-slate-400 hover:text-white transition-colors mb-1.5 rounded-lg hover:bg-slate-800"
                    >
                        <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
                            <ChevronRight size={16} />
                        </motion.div>
                    </button>

                    <button
                        onClick={signOut}
                        className={`flex items-center w-full px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/15 transition-all font-bold ${!isOpen && 'justify-center'}`}
                    >
                        <LogOut size={16} />
                        {isOpen && <span className="ml-3 text-xs">Cerrar Sesión</span>}
                    </button>
                </div>
            </motion.aside>
        </>
    )
}
