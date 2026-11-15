'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/sidebar'
import Topbar from '@/components/topbar'
import AnimatedBackground from '@/components/animated-background'
import { motion, AnimatePresence } from 'framer-motion'
import AuthPage from '../login/page'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user, loading, sysRole, allowedViews } = useAuth()
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

    useEffect(() => {
        if (!loading && user && pathname !== '/dashboard' && pathname !== '/login') {
            if (
                sysRole === 'SUPER_ADMIN' ||
                sysRole === 'DIRECTOR_OPERATIVO' ||
                sysRole === 'GERENTE' ||
                sysRole === 'SUPERINTENDENTE' ||
                sysRole === 'JEFE_PLANEACION'
            ) {
                return
            }

            if (!allowedViews || allowedViews.length === 0) {
                return
            }

            const isAllowed = allowedViews.some(av => {
                if (pathname === av) return true
                if (av !== '/dashboard' && pathname.startsWith(av + '/')) return true
                return false
            })

            if (!isAllowed) {
                router.replace('/dashboard')
            }
        }
    }, [pathname, loading, user, sysRole, allowedViews, router])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
            </div>
        )
    }

    if (!user && pathname !== '/login') {
        return <AuthPage />
    }

    if (user && pathname === '/login') {
        router.push('/dashboard')
        return null
    }

    const isAuthorized = (() => {
        if (pathname === '/dashboard' || pathname === '/login') return true
        if (
            sysRole === 'SUPER_ADMIN' ||
            sysRole === 'DIRECTOR_OPERATIVO' ||
            sysRole === 'GERENTE' ||
            sysRole === 'SUPERINTENDENTE' ||
            sysRole === 'JEFE_PLANEACION' ||
            !allowedViews ||
            allowedViews.length === 0
        ) {
            return true
        }
        return allowedViews.some(av => {
            if (pathname === av) return true
            if (av !== '/dashboard' && pathname.startsWith(av + '/')) return true
            return false
        })
    })()

    return (
        <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
            <Sidebar />

            <div className="flex-1 flex flex-col md:ml-64 transition-all duration-300 relative">
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

                <main className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6 relative">
                    <AnimatedBackground />

                    {/* Membrete Oficial para Exportación PDF / Impresión (Visible en todos los PDFs) */}
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
                                <div><strong>Fecha Impresión:</strong> {new Date().toLocaleDateString('es-MX')} {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</div>
                                <div><strong>Nivel de Mando:</strong> {sysRole || 'DIRECCIÓN'}</div>
                                <div><strong>Módulo:</strong> {pathname}</div>
                            </div>
                        </div>
                    </div>

                    {/* Contenido con plantilla de animación y validación de autorización */}
                    <div className="relative z-10">
                        {isAuthorized ? children : (
                            <div className="flex flex-col items-center justify-center h-full mt-20 text-center bg-slate-900 border border-slate-800 rounded-2xl p-10 max-w-lg mx-auto shadow-xl">
                                <div className="text-amber-500 mb-4 text-6xl">⚠️</div>
                                <h1 className="text-2xl font-bold text-white mb-2">Acceso Restringido por Nivel Jerárquico</h1>
                                <p className="text-slate-400">Tu perfil actual ({sysRole}) no cuenta con permisos para modificar o consultar esta sección.</p>
                            </div>
                        )}
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
