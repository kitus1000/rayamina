'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/sidebar'
import Topbar from '@/components/topbar'
import AnimatedBackground from '@/components/animated-background'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldAlert, ArrowRight, RefreshCw, Eye, Smartphone, RotateCcw } from 'lucide-react'
import AuthPage from '../login/page'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const {
        user,
        loading,
        sysRole,
        isRealSuperAdmin,
        previewProfile,
        setPreviewProfile,
        isViewAllowed,
        getFirstAllowedPath,
        refreshUserConfig,
    } = useAuth()
    const router = useRouter()
    const pathname = usePathname()
    const [routeChanging, setRouteChanging] = useState(false)

    // Inicializar Modo Claro / Modo Día por defecto
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedTheme = localStorage.getItem('raya_theme') || 'light'
            const root = document.documentElement
            if (savedTheme === 'dark') {
                root.classList.remove('theme-light')
                root.classList.add('theme-dark')
            } else {
                root.classList.remove('theme-dark')
                root.classList.add('theme-light')
            }
        }
    }, [])

    // Efecto visual de barrido superior en cada cambio de página
    useEffect(() => {
        setRouteChanging(true)
        const timer = setTimeout(() => setRouteChanging(false), 450)
        return () => clearTimeout(timer)
    }, [pathname])

    const isAuthorized = !loading && user ? isViewAllowed(pathname) : false

    // Redirección automática si el usuario entra a una vista no autorizada (ej. Supervisor entrando a /dashboard financiero)
    useEffect(() => {
        if (!loading && user && pathname !== '/login') {
            if (!isViewAllowed(pathname)) {
                const target = getFirstAllowedPath()
                if (target && target !== pathname) {
                    router.replace(target)
                }
            }
        }
    }, [pathname, loading, user, isViewAllowed, getFirstAllowedPath, router])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 gap-3">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
                <p className="text-xs font-black uppercase tracking-widest text-amber-500">
                    Verificando Credencial y Vistas Autorizadas...
                </p>
            </div>
        )
    }

    if (!user && pathname !== '/login') {
        return <AuthPage />
    }

    if (user && pathname === '/login') {
        router.replace(getFirstAllowedPath())
        return null
    }

    return (
        <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
            <Sidebar />

            <div className="flex-1 min-w-0 w-full flex flex-col overflow-hidden transition-all duration-300 relative">
                {/* Barra láser de transición entre páginas */}
                <AnimatePresence>
                    {routeChanging && (
                        <motion.div
                            key="route-laser-bar"
                            initial={{ width: '0%', opacity: 1 }}
                            animate={{ width: '100%', opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                            className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-blue-500 to-emerald-500 z-50 shadow-[0_0_12px_rgba(245,158,11,0.8)] html2pdf__ignore"
                        />
                    )}
                </AnimatePresence>

                <Topbar />

                {/* Banner activo cuando el Super Admin está inspeccionando las pantallas de otro perfil o usuario */}
                {isRealSuperAdmin && previewProfile && (
                    <div className="bg-amber-500/15 border-b border-amber-500/40 px-4 py-2 flex flex-wrap items-center justify-between gap-2 z-20 html2pdf__ignore">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                            <Eye size={15} className="text-amber-400 shrink-0" />
                            <span>
                                <strong>Modo Inspección Super Admin:</strong> Estás viendo pantallas, avances y permisos como{' '}
                                <span className="underline font-black text-white">{previewProfile.label}</span> ({sysRole})
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => router.push('/mobile')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-black flex items-center gap-1 cursor-pointer"
                            >
                                <Smartphone size={12} /> Ver este perfil en Modo APK (Celular)
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreviewProfile(null)}
                                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-black flex items-center gap-1 cursor-pointer"
                            >
                                <RotateCcw size={12} /> Volver a Super Admin
                            </button>
                        </div>
                    </div>
                )}

                <main className="flex-1 min-w-0 overflow-x-auto overflow-y-auto p-3 sm:p-4 md:p-6 pb-24 md:pb-6 relative">
                    <AnimatedBackground />

                    {/* Membrete Oficial para Exportación PDF / Impresión */}
                    <div className="hidden print-only-block mb-6 pb-4 border-b-2 border-slate-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">
                                    GRUPO MINERO S.A. DE C.V. — UNIDAD MINERA EL HERRERO
                                </h1>
                                <p className="text-xs font-bold text-slate-700 mt-0.5">
                                    SISTEMA INTEGRAL LA RAYA OS • REPORTE OFICIAL AUDITABLE • SEMANA 38 (21 AL 27 DE SEPTIEMBRE 2026)
                                </p>
                            </div>
                            <div className="text-right text-xs text-slate-700 font-mono">
                                <div>
                                    <strong>Fecha Impresión:</strong>{' '}
                                    {new Date().toLocaleDateString('es-MX')}{' '}
                                    {new Date().toLocaleTimeString('es-MX', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </div>
                                <div>
                                    <strong>Nivel de Mando:</strong> {sysRole || 'AUTORIZADO'}
                                </div>
                                <div>
                                    <strong>Módulo:</strong> {pathname}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contenido con animación de transición y validación estricta de vistas */}
                    <div className="relative z-10 w-full min-w-0">
                        <motion.div
                            key={pathname}
                            initial={{ opacity: 0.92, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.16, ease: 'easeOut' }}
                            className="w-full min-w-0"
                        >
                            {isAuthorized ? (
                                    children
                                ) : (
                                    <div className="flex flex-col items-center justify-center mt-16 text-center bg-slate-900 border border-rose-500/40 rounded-2xl p-8 max-w-lg mx-auto shadow-2xl">
                                        <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-4">
                                            <ShieldAlert size={34} />
                                        </div>
                                        <h1 className="text-xl font-black text-white mb-2">
                                            Vista Restringida por Configuración de Seguridad
                                        </h1>
                                        <p className="text-sm text-slate-400 leading-relaxed mb-6">
                                            Tu usuario (<span className="font-bold text-amber-500">{user?.email}</span> • Rol:{' '}
                                            <span className="font-bold text-white">{sysRole}</span>) no tiene habilitada esta vista en el módulo de{' '}
                                            <strong>Gestión de Visiones</strong>. Los datos de precios unitarios, tonelaje y nómina están protegidos.
                                        </p>
                                        <div className="flex flex-wrap items-center justify-center gap-3">
                                            <button
                                                onClick={() => router.replace(getFirstAllowedPath())}
                                                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase flex items-center gap-1.5 shadow-lg cursor-pointer"
                                            >
                                                Ir a mi Vista Autorizada <ArrowRight size={15} />
                                            </button>
                                            <button
                                                onClick={() => refreshUserConfig()}
                                                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                                            >
                                                <RefreshCw size={14} /> Sincronizar Permisos
                                            </button>
                                        </div>
                                    </div>
                                )}
                        </motion.div>
                    </div>

                    {/* Pie de Firmas Oficiales para Exportación PDF */}
                    <div className="hidden print-only-block mt-12 pt-8 border-t-2 border-slate-400 break-inside-avoid">
                        <div className="grid grid-cols-3 gap-8 text-center text-xs text-slate-800">
                            <div className="pt-8 border-t border-slate-600">
                                <p className="font-bold uppercase">Elaboró / Capturó</p>
                                <p className="text-[10px] text-slate-600 mt-0.5">Supervisión de Turno / Ingeniería</p>
                            </div>
                            <div className="pt-8 border-t border-slate-600">
                                <p className="font-bold uppercase">Revisó y Validó</p>
                                <p className="text-[10px] text-slate-600 mt-0.5">Superintendencia de Mina / Planeación</p>
                            </div>
                            <div className="pt-8 border-t border-slate-600">
                                <p className="font-bold uppercase">Autorizó</p>
                                <p className="text-[10px] text-slate-600 mt-0.5">Gerencia de Operaciones / Dirección</p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
