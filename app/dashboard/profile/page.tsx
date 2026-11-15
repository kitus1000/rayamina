'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, Camera, Save, ArrowLeft, Loader2, Info } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

export default function ProfilePage() {
    const router = useRouter()
    const { user, sysRole, sysUserId } = useAuth()

    const [nickname, setNickname] = useState('')
    const [avatarUrl, setAvatarUrl] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState({ text: '', type: '' })

    useEffect(() => {
        if (sysUserId) {
            loadProfile()
        }
    }, [sysUserId])

    const loadProfile = async () => {
        try {
            setIsLoading(true)
            const { data, error } = await supabase
                .from('sys_users')
                .select('nickname, avatar_url')
                .eq('id', sysUserId)
                .single()

            if (error) throw error

            if (data) {
                setNickname(data.nickname || '')
                setAvatarUrl(data.avatar_url || '')
            }
        } catch (error) {
            console.error('Error cargando perfil:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const saveProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setIsSaving(true)
            setMessage({ text: '', type: '' })

            const { error } = await supabase
                .from('sys_users')
                .update({
                    nickname: nickname.trim() === '' ? null : nickname.trim(),
                    avatar_url: avatarUrl.trim() === '' ? null : avatarUrl.trim(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', sysUserId)

            if (error) throw error

            setMessage({ text: 'Perfil actualizado exitosamente.', type: 'success' })

            // Refrescar para que el topbar coja el cambio (o confiar en context)
            setTimeout(() => {
                window.location.reload()
            }, 1500)

        } catch (error: any) {
            console.error('Error guardando:', error)
            setMessage({ text: error.message || 'Error al guardar el perfil.', type: 'error' })
        } finally {
            setIsSaving(false)
        }
    }

    // Simplificamos la foto usando avatares de DiceBear por defecto si no quieren subir archivo.
    const generateRandomAvatar = () => {
        const seed = Math.random().toString(36).substring(7)
        setAvatarUrl(`https://api.dicebear.com/9.x/bottts/svg?seed=${seed}`)
    }

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Ajustes de Perfil</h1>
                    <p className="text-slate-400 mt-1 text-sm">Personaliza tu información visible en el sistema y en el chat.</p>
                </div>
            </div>

            <form onSubmit={saveProfile} className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 md:p-8 space-y-8">

                {message.text && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${message.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                        <Info size={18} />
                        {message.text}
                    </div>
                )}

                {/* Avatar Section */}
                <div className="flex flex-col md:flex-row items-center gap-6 pb-8 border-b border-slate-800/50">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center border-2 border-slate-700 overflow-hidden">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User size={40} className="text-slate-500" />
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={generateRandomAvatar}
                            className="absolute -bottom-2 -right-2 p-2 bg-amber-500 text-slate-950 rounded-full hover:bg-amber-400 hover:scale-105 transition-all shadow-lg"
                            title="Generar avatar aleatorio"
                        >
                            <Camera size={16} />
                        </button>
                    </div>

                    <div className="flex-1 space-y-3 text-center md:text-left">
                        <div>
                            <h3 className="text-sm font-medium text-white mb-1">Foto de Perfil</h3>
                            <p className="text-xs text-slate-400">Puedes usar una URL de imagen o generar un avatar robot aleatorio presionando el botón de la cámara.</p>
                        </div>
                        <input
                            type="text"
                            value={avatarUrl}
                            onChange={(e) => setAvatarUrl(e.target.value)}
                            placeholder="URL de imagen (opcional)"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all placeholder:text-slate-600"
                        />
                    </div>
                </div>

                {/* General Info Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-white mb-4">Información General</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Correo Electrónico</label>
                            <input
                                type="email"
                                value={user?.email || ''}
                                disabled
                                className="w-full bg-slate-950/50 border border-slate-800/50 rounded-lg px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Rol en el Sistema</label>
                            <input
                                type="text"
                                value={sysRole || 'Desconocido'}
                                disabled
                                className="w-full bg-slate-950/50 border border-slate-800/50 rounded-lg px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed font-medium"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Apodo (Nickname)</label>
                        <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="Ej. El Jefe, Juanito, etc."
                            maxLength={30}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all placeholder:text-slate-600"
                        />
                        <p className="text-xs text-slate-500 mt-2">Este apodo se mostrará en los chats grupales y privados. Si lo dejas vacío, se usará tu correo.</p>
                    </div>
                </div>

                <div className="pt-6 flex justify-end">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-xl text-sm font-bold transition-all shadow-lg shadow-amber-900/20"
                    >
                        {isSaving ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Save size={16} />
                        )}
                        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </form>
        </div>
    )
}
