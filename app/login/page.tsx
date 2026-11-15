'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Pickaxe, ShieldCheck, PlayCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [mode, setMode] = useState<'password' | 'otp'>('password')
    const { loginAsDemo, signInWithPassword, signInWithOtp, user } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (user) {
            router.push('/dashboard')
        }
    }, [user, router])

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

    const handleDemoLogin = () => {
        loginAsDemo()
    }

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 px-4">

            {/* Background Image & Effects */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/mining_finance_abstract.png"
                    alt="Background"
                    fill
                    priority
                    className="object-cover opacity-40 mix-blend-overlay"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-900/40" />

                <motion.div
                    animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[20%] left-[20%] w-[40%] h-[40%] bg-amber-600/10 rounded-full blur-[100px]"
                />
                <motion.div
                    animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute bottom-[20%] right-[20%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[100px]"
                />
            </div>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative z-10 w-full max-w-sm bg-slate-900/80 backdrop-blur-xl border border-slate-800/50 rounded-xl shadow-2xl overflow-hidden"
            >
                {/* Header Compacto */}
                <div className="bg-slate-950/50 p-6 flex flex-col items-center border-b border-slate-800/50">
                    <div className="p-2 bg-amber-500/10 rounded-lg mb-3 ring-1 ring-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                        <Pickaxe className="w-6 h-6 text-amber-500" />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-white">LA RAYA</h1>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-1">Mining Ops System</p>
                </div>

                <div className="p-6">
                    <AnimatePresence mode="wait">
                        {sent ? (
                            <motion.div
                                key="sent"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-4"
                            >
                                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                                    <ShieldCheck className="text-green-500" size={32} />
                                </div>
                                <h3 className="text-white font-bold text-lg">¡Enlace Enviado!</h3>
                                <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                                    Revisa tu correo corporativo para acceder directamente.
                                </p>
                                <button
                                    onClick={() => setSent(false)}
                                    className="mt-6 text-amber-500 text-xs font-bold uppercase tracking-widest hover:underline"
                                >
                                    Volver al inicio
                                </button>
                            </motion.div>
                        ) : (
                            <div className="space-y-5">
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-red-500/10 border border-red-500/50 p-3 rounded-xl text-red-500 text-xs text-center font-medium"
                                    >
                                        {error}
                                    </motion.div>
                                )}

                                {mode === 'password' ? (
                                    <form onSubmit={handleLogin} className="space-y-4" key="form-pwd">
                                        <motion.div
                                            initial={{ x: -20, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                        >
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email Corporativo</label>
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="usuario@tuempresa.com"
                                                className="w-full bg-slate-950/50 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-inner"
                                            />
                                        </motion.div>

                                        <motion.div
                                            initial={{ x: -20, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            transition={{ delay: 0.1 }}
                                        >
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Contraseña / PIN</label>
                                            <input
                                                type="password"
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full bg-slate-950/50 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-inner font-mono"
                                            />
                                        </motion.div>

                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            disabled={loading}
                                            className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-sm font-bold py-3 rounded-xl shadow-lg shadow-amber-900/30 disabled:opacity-70 flex justify-center items-center gap-2"
                                        >
                                            {loading ? 'Validando...' : 'Entrar al Sistema'}
                                        </motion.button>

                                        <button
                                            type="button"
                                            onClick={() => setMode('otp')}
                                            className="w-full text-center text-[10px] text-slate-500 hover:text-amber-500 font-bold uppercase tracking-widest transition-colors"
                                        >
                                            ¿Eres Admin? Usa Link Mágico
                                        </button>
                                    </form>
                                ) : (
                                    <form onSubmit={handleOtpRequest} className="space-y-4" key="form-otp">
                                        <motion.div
                                            initial={{ x: -20, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                        >
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email de Administrador</label>
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="admin@tuempresa.com"
                                                className="w-full bg-slate-950/50 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-inner"
                                            />
                                        </motion.div>

                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            disabled={loading}
                                            className="w-full bg-slate-100 hover:bg-white text-slate-950 text-sm font-bold py-3 rounded-xl shadow-lg disabled:opacity-70 flex justify-center items-center gap-2"
                                        >
                                            {loading ? 'Enviando...' : 'Recibir Link Mágico'}
                                        </motion.button>

                                        <button
                                            type="button"
                                            onClick={() => setMode('password')}
                                            className="w-full text-center text-[10px] text-slate-500 hover:text-white font-bold uppercase tracking-widest transition-colors"
                                        >
                                            Volver a Password
                                        </button>
                                    </form>
                                )}

                                <div className="relative py-3">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-slate-800" />
                                    </div>
                                    <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                                        <span className="bg-slate-900 px-3 text-slate-500 rounded-full border border-slate-800">Opciones</span>
                                    </div>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleDemoLogin}
                                    className="w-full bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 hover:text-white text-sm font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-slate-700/50 hover:border-slate-500/50"
                                >
                                    <PlayCircle className="w-5 h-5 text-amber-500" />
                                    Ingresar Modo Explorador (Escritorio)
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="button"
                                    onClick={() => {
                                        loginAsDemo()
                                        router.push('/mobile')
                                    }}
                                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
                                >
                                    📱 Abrir App Celular Android (Sin Expo Go)
                                </motion.button>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    )
}
