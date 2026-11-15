'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Pickaxe, ShieldCheck, Lock, Mail, Eye, EyeOff, KeyRound, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [mode, setMode] = useState<'password' | 'otp'>('password')
    const { signInWithPassword, signInWithOtp, user, getFirstAllowedPath } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (user) {
            router.replace(getFirstAllowedPath())
        }
    }, [user, router, getFirstAllowedPath])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        const { error: loginError } = await signInWithPassword(email, password)

        if (loginError) {
            setError(loginError)
            setLoading(false)
        }
    }

    const handleOtpRequest = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        const { error: otpError } = await signInWithOtp(email)

        if (otpError) {
            setError(otpError)
            setLoading(false)
        } else {
            setSent(true)
            setLoading(false)
        }
    }

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 px-4 py-8">
            {/* Barra Láser Superior de Seguridad */}
            <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
                className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-blue-500 z-50 shadow-[0_0_15px_rgba(245,158,11,0.8)]"
            />

            {/* Fondo Animado Corporativo */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/mining_finance_abstract.png"
                    alt="Background"
                    fill
                    priority
                    className="object-cover opacity-35 mix-blend-overlay"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-slate-900/50" />

                <motion.div
                    animate={{ scale: [1, 1.08, 1], opacity: [0.25, 0.45, 0.25] }}
                    transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute top-[15%] left-[18%] w-[42%] h-[42%] bg-amber-600/15 rounded-full blur-[110px]"
                />
                <motion.div
                    animate={{ scale: [1, 1.12, 1], opacity: [0.2, 0.35, 0.2] }}
                    transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                    className="absolute bottom-[15%] right-[18%] w-[42%] h-[42%] bg-emerald-700/10 rounded-full blur-[110px]"
                />
            </div>

            <motion.div
                initial={{ y: 28, opacity: 0, scale: 0.97 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                className="relative z-10 w-full max-w-md bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            >
                {/* Cabecera de Seguridad Corporativa */}
                <div className="bg-slate-950/70 p-6 flex flex-col items-center border-b border-slate-800 relative">
                    <motion.div
                        animate={{
                            boxShadow: [
                                '0 0 15px rgba(245,158,11,0.2)',
                                '0 0 28px rgba(245,158,11,0.5)',
                                '0 0 15px rgba(245,158,11,0.2)',
                            ],
                        }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="p-3 bg-amber-500/15 rounded-2xl mb-3 ring-1 ring-amber-500/40"
                    >
                        <Pickaxe className="w-7 h-7 text-amber-500" />
                    </motion.div>

                    <h1 className="text-2xl font-black tracking-tight text-white">
                        LA RAYA <span className="text-amber-500">MINA</span>
                    </h1>
                    <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mt-1">
                        Unidad Minera El Herrero • Sistema Blindado
                    </p>

                    <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                        <ShieldCheck size={13} />
                        Acceso Restringido a Usuarios Autorizados
                    </div>
                </div>

                <div className="p-6">
                    <AnimatePresence mode="wait">
                        {sent ? (
                            <motion.div
                                key="sent"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="text-center py-4"
                            >
                                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                                    <ShieldCheck className="text-emerald-500" size={32} />
                                </div>
                                <h3 className="text-white font-black text-lg">¡Enlace de Seguridad Enviado!</h3>
                                <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                                    Revisa tu bandeja de correo corporativo autorizado para ingresar.
                                </p>
                                <button
                                    onClick={() => setSent(false)}
                                    className="mt-6 text-amber-500 text-xs font-black uppercase tracking-widest hover:underline"
                                >
                                    Volver al inicio de sesión
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key={mode}
                                initial={{ opacity: 0, x: 15 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -15 }}
                                transition={{ duration: 0.25 }}
                                className="space-y-5"
                            >
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-rose-500/15 border border-rose-500/50 p-3.5 rounded-xl text-rose-400 text-xs flex items-start gap-2.5 font-semibold"
                                    >
                                        <ShieldAlert size={16} className="shrink-0 mt-0.5 text-rose-500" />
                                        <span>{error}</span>
                                    </motion.div>
                                )}

                                {mode === 'password' ? (
                                    <form onSubmit={handleLogin} className="space-y-4">
                                        <div>
                                            <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                                                Correo Corporativo Autorizado
                                            </label>
                                            <div className="relative">
                                                <Mail
                                                    size={16}
                                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none"
                                                />
                                                <input
                                                    type="email"
                                                    required
                                                    autoComplete="username"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="usuario@rayamina.com"
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                                                Contraseña / Clave de Seguridad
                                            </label>
                                            <div className="relative">
                                                <KeyRound
                                                    size={16}
                                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none"
                                                />
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    required
                                                    autoComplete="current-password"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    placeholder="••••••••"
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-mono"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500 p-1"
                                                    tabIndex={-1}
                                                >
                                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </div>

                                        <motion.button
                                            whileHover={{ scale: 1.015 }}
                                            whileTap={{ scale: 0.985 }}
                                            disabled={loading}
                                            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-sm font-black py-3.5 rounded-xl shadow-lg shadow-amber-900/30 disabled:opacity-70 flex justify-center items-center gap-2 uppercase tracking-wider cursor-pointer"
                                        >
                                            <Lock size={16} />
                                            {loading ? 'Verificando Credenciales...' : 'Ingresar con Credencial'}
                                        </motion.button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setError(null)
                                                setMode('otp')
                                            }}
                                            className="w-full text-center text-[11px] text-slate-400 hover:text-amber-400 font-bold uppercase tracking-wider transition-colors pt-1"
                                        >
                                            ¿Olvidaste tu clave? Solicitar enlace al correo registrado
                                        </button>
                                    </form>
                                ) : (
                                    <form onSubmit={handleOtpRequest} className="space-y-4">
                                        <div>
                                            <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                                                Correo Registrado en el Sistema
                                            </label>
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="usuario@rayamina.com"
                                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                                            />
                                        </div>

                                        <motion.button
                                            whileHover={{ scale: 1.015 }}
                                            whileTap={{ scale: 0.985 }}
                                            disabled={loading}
                                            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-black py-3.5 rounded-xl shadow-lg disabled:opacity-70 flex justify-center items-center gap-2 uppercase tracking-wider"
                                        >
                                            {loading ? 'Verificando Registro...' : 'Enviar Enlace de Acceso'}
                                        </motion.button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setError(null)
                                                setMode('password')
                                            }}
                                            className="w-full text-center text-[11px] text-slate-400 hover:text-white font-bold uppercase tracking-wider transition-colors"
                                        >
                                            ← Volver a Contraseña
                                        </button>
                                    </form>
                                )}

                                {/* Nota de Seguridad Operativa */}
                                <div className="pt-3 border-t border-slate-800/80 text-center space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        🔒 Protección de Tonelajes, Precios Unitarios y Pre-Nómina
                                    </p>
                                    <p className="text-[10px] text-slate-500 leading-relaxed">
                                        El acceso y las vistas habilitadas (Web y APK Android) dependen exclusivamente de los usuarios y permisos configurados por el Administrador en el sistema.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    )
}
