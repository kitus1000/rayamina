'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { Save, Loader2, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

// Tipos
type Turno = {
    id: string
    codigo: string
    nombre: string
    orden: number
    activo: boolean
}

export default function TurnosPage() {
    const [turnos, setTurnos] = useState<Turno[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null) // ID del turno guardándose
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    // Cambios locales antes de guardar
    const [edits, setEdits] = useState<{ [id: string]: { nombre: string, activo: boolean } }>({})

    // const supabase = createClientComponentClient() // Usamos la instancia importada globalmente

    useEffect(() => {
        fetchTurnos()
    }, [])

    const fetchTurnos = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('cat_turnos')
            .select('*')
            .order('codigo', { ascending: true })

        if (error) {
            console.error('Error fetching turnos:', error)
            setMessage({ type: 'error', text: 'Error al cargar turnos.' })
        } else {
            setTurnos(data || [])
        }
        setLoading(false)
    }

    const handleEditChange = (id: string, field: 'nombre' | 'activo', value: any) => {
        setEdits(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                // Si ya había edits, los mantiene, sino toma el valor original del turno
                nombre: prev[id]?.nombre ?? turnos.find(t => t.id === id)?.nombre,
                activo: prev[id]?.activo ?? turnos.find(t => t.id === id)?.activo,
                [field]: value
            }
        }))
        // Limpiar mensaje al editar
        if (message) setMessage(null)
    }

    const saveTurno = async (turnoId: string) => {
        const changes = edits[turnoId]
        if (!changes) return

        setSaving(turnoId)
        setMessage(null)

        try {
            const { error } = await supabase
                .from('cat_turnos')
                .update({
                    nombre: changes.nombre,
                    activo: changes.activo,
                    updated_at: new Date().toISOString()
                })
                .eq('id', turnoId)

            if (error) throw error

            // Actualizar estado local oficial
            setTurnos(prev => prev.map(t =>
                t.id === turnoId ? { ...t, ...changes } : t
            ))

            // Limpiar edits de este turno
            setEdits(prev => {
                const newEdits = { ...prev }
                delete newEdits[turnoId]
                return newEdits
            })

            setMessage({ type: 'success', text: 'Turno actualizado correctamente.' })
        } catch (error) {
            console.error('Error saving turno:', error)
            setMessage({ type: 'error', text: 'Error al guardar cambios.' })
        } finally {
            setSaving(null)
        }
    }

    // Helpers UI
    const getTurnoColor = (codigo: string) => {
        switch (codigo) {
            case '1RA': return 'text-amber-400 bg-amber-400/10 border-amber-400/20'
            case '2DA': return 'text-blue-400 bg-blue-400/10 border-blue-400/20'
            case '3RA': return 'text-purple-400 bg-purple-400/10 border-purple-400/20'
            default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20'
        }
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <div className="mb-2">
                    <Link href="/dashboard/catalogos" className="text-sm text-slate-400 hover:text-white flex items-center gap-1 transition-colors w-fit">
                        ← Volver a Catálogos
                    </Link>
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    <Clock className="text-amber-500" size={32} />
                    Turnos Operativos
                </h1>
                <p className="text-slate-400 max-w-2xl">
                    Gestión de los horarios base del sistema. Los códigos son fijos (1RA, 2DA, 3RA) pero puedes personalizar sus nombres descriptivos.
                </p>
            </div>

            {/* Feedback Message */}
            {message && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl border flex items-center gap-3 ${message.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                        }`}
                >
                    {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <p>{message.text}</p>
                </motion.div>
            )}

            {/* List */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl overflow-hidden shadow-xl">
                {loading ? (
                    <div className="p-12 flex justify-center">
                        <Loader2 className="animate-spin text-amber-500" size={32} />
                    </div>
                ) : (
                    <div className="divide-y divide-slate-800/50">
                        {turnos.map((turno) => {
                            const isEditing = !!edits[turno.id]
                            const currentNombre = edits[turno.id]?.nombre ?? turno.nombre
                            const currentActivo = edits[turno.id]?.activo ?? turno.activo

                            return (
                                <div key={turno.id} className="p-6 flex flex-col md:flex-row md:items-center gap-6 group hover:bg-slate-800/30 transition-colors">
                                    {/* Codigo Badge */}
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold border ${getTurnoColor(turno.codigo)} shrink-0`}>
                                        {turno.codigo}
                                    </div>

                                    {/* Info Editable */}
                                    <div className="flex-1 space-y-3">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Nombre Descriptivo</label>
                                            <input
                                                type="text"
                                                value={currentNombre}
                                                onChange={(e) => handleEditChange(turno.id, 'nombre', e.target.value)}
                                                className="bg-transparent text-lg font-medium text-white border-b border-slate-700 focus:border-amber-500 outline-none py-1 w-full max-w-md transition-colors placeholder:text-slate-600"
                                                placeholder="Ej. Matutino"
                                            />
                                        </div>
                                    </div>

                                    {/* Toggles & Actions */}
                                    <div className="flex items-center gap-6 md:pl-6 md:border-l border-slate-800/50">
                                        <div className="flex items-center gap-3">
                                            <label className="text-sm font-medium text-slate-400">Estado</label>
                                            <button
                                                onClick={() => handleEditChange(turno.id, 'activo', !currentActivo)}
                                                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${currentActivo ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                            >
                                                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${currentActivo ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => saveTurno(turno.id)}
                                            disabled={!isEditing || saving === turno.id}
                                            className={`p-3 rounded-xl flex items-center gap-2 transition-all ${isEditing
                                                ? 'bg-amber-500 text-white shadow-lg shadow-amber-900/20 hover:bg-amber-600 hover:scale-105 active:scale-95'
                                                : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                                                }`}
                                        >
                                            {saving === turno.id ? (
                                                <Loader2 className="animate-spin" size={20} />
                                            ) : (
                                                <Save size={20} />
                                            )}
                                            <span className="hidden md:inline font-medium">Guardar</span>
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
