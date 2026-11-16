"use client"

import React, { useState, useEffect } from 'react'
import { Plus, Edit2, CheckCircle2, XCircle, Search, HelpCircle, Save, X, Circle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

type Asistencia = {
    id: string
    codigo: string
    nombre: string
    descripcion: string | null
    color: string
    activo: boolean
}

// Opciones de color predefinidas para Tailwind
const COLOR_OPTIONS = [
    { value: 'bg-emerald-500', name: 'Verde', border: 'border-emerald-500' },
    { value: 'bg-red-500', name: 'Rojo', border: 'border-red-500' },
    { value: 'bg-blue-500', name: 'Azul', border: 'border-blue-500' },
    { value: 'bg-amber-500', name: 'Ámbar', border: 'border-amber-500' },
    { value: 'bg-orange-500', name: 'Naranja', border: 'border-orange-500' },
    { value: 'bg-purple-500', name: 'Morado', border: 'border-purple-500' },
    { value: 'bg-cyan-500', name: 'Cyan', border: 'border-cyan-500' },
    { value: 'bg-slate-500', name: 'Gris', border: 'border-slate-500' },
    { value: 'bg-pink-500', name: 'Rosa', border: 'border-pink-500' },
]

export default function AsistenciasCatalog() {
    const [asistencias, setAsistencias] = useState<Asistencia[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<Asistencia | null>(null)
    const [formData, setFormData] = useState<Partial<Asistencia>>({})

    const fetchAsistencias = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('cat_asistencias')
            .select('*')
            .order('codigo')

        if (error) {
            toast.error('Error al cargar catálogo')
            console.error(error)
        } else {
            setAsistencias(data || [])
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchAsistencias()
    }, [])

    const handleOpenModal = (item?: Asistencia) => {
        if (item) {
            setEditingItem(item)
            setFormData({ ...item })
        } else {
            setEditingItem(null)
            setFormData({
                codigo: '',
                nombre: '',
                descripcion: '',
                color: 'bg-slate-500',
                activo: true
            })
        }
        setIsModalOpen(true)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.codigo || !formData.nombre) {
            toast.error('Código y Nombre son obligatorios')
            return
        }

        // Formatear código a mayúsculas y sin espacios
        const dataToSave = {
            ...formData,
            codigo: formData.codigo.toUpperCase().replace(/\s+/g, '_')
        }

        try {
            if (editingItem) {
                const { error } = await supabase
                    .from('cat_asistencias')
                    .update(dataToSave)
                    .eq('id', editingItem.id)
                if (error) throw error
                toast.success('Registro actualizado exitosamente')
            } else {
                const { error } = await supabase
                    .from('cat_asistencias')
                    .insert(dataToSave)
                if (error) throw error
                toast.success('Nueva incidencia creada')
            }
            setIsModalOpen(false)
            fetchAsistencias()
        } catch (error: any) {
            console.error('Error saving:', error)
            if (error.code === '23505') { // Unique violation
                toast.error('El código ya existe')
            } else {
                toast.error('Error al guardar el registro')
            }
        }
    }

    const toggleStatus = async (item: Asistencia) => {
        try {
            const { error } = await supabase
                .from('cat_asistencias')
                .update({ activo: !item.activo })
                .eq('id', item.id)

            if (error) throw error

            toast.success(`Estatus actualizado a ${!item.activo ? 'Activo' : 'Inactivo'}`)
            fetchAsistencias()
        } catch (error) {
            console.error('Status toggle error:', error)
            toast.error('No se pudo actualizar el estatus')
        }
    }

    const filteredAsistencias = asistencias.filter(a =>
        a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="p-2 sm:p-4 max-w-full w-full min-w-0 mx-auto space-y-6">
            {/* Header Módulo */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link href="/dashboard/catalogos" className="text-amber-500 hover:text-amber-400 text-sm font-medium transition-colors">
                            Catálogos
                        </Link>
                        <span className="text-slate-600">/</span>
                        <span className="text-slate-300 text-sm">Operaciones</span>
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        Tipos de Asistencia
                    </h1>
                    <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                        <HelpCircle size={14} className="text-amber-500/70" />
                        Estados de asistencia e incidencias para el Diario de Operación
                    </p>
                </div>

                <button
                    onClick={() => handleOpenModal()}
                    className="group relative px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold rounded-xl shadow-lg shadow-amber-900/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
                    <Plus size={20} className="relative z-10" />
                    <span className="relative z-10">Crear Nueva</span>
                </button>
            </div>

            {/* Buscador */}
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-500 group-focus-within:text-amber-500 transition-colors" />
                </div>
                <input
                    type="text"
                    placeholder="Buscar por código o nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-4 bg-slate-900/50 border border-slate-800 focus:border-amber-500/50 rounded-xl text-white outline-none transition-all placeholder:text-slate-600 focus:ring-4 focus:ring-amber-500/10"
                />
            </div>

            {/* Listado Grilla */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-40 bg-slate-900/50 rounded-2xl border border-slate-800 animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAsistencias.map(item => (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={item.id}
                            className={`group bg-slate-900/80 backdrop-blur-sm rounded-2xl border ${item.activo ? 'border-slate-800 hover:border-slate-600' : 'border-red-900/30 opacity-75'
                                } p-5 transition-all hover:shadow-xl relative overflow-hidden`}
                        >
                            {/* Accent line based on dynamic color */}
                            <div className={`absolute top-0 left-0 w-full h-1 ${item.color} opacity-80`} />

                            <div className="flex justify-between items-start mb-4 mt-2">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${item.color} shadow-[0_0_10px_rgba(0,0,0,0.5)] ${item.color.replace('bg-', 'shadow-')}`} />
                                    <div>
                                        <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                                            {item.nombre}
                                        </h3>
                                        <span className="text-xs font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                            {item.codigo}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleOpenModal(item)}
                                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <p className="text-sm text-slate-400 mb-6 line-clamp-2 h-10">
                                {item.descripcion || <span className="italic opacity-50">Sin descripción</span>}
                            </p>

                            <div className="flex justify-between items-center pt-4 border-t border-slate-800/50">
                                <button
                                    onClick={() => toggleStatus(item)}
                                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full transition-colors ${item.activo
                                            ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                            : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                        }`}
                                >
                                    {item.activo ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                    {item.activo ? 'Activo' : 'Inactivo'}
                                </button>
                            </div>
                        </motion.div>
                    ))}

                    {filteredAsistencias.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/20 rounded-2xl border border-slate-800 border-dashed">
                            No se encontraron tipos de asistencia.
                        </div>
                    )}
                </div>
            )}

            {/* Modal CRUD */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col"
                            style={{ maxHeight: '90vh' }}
                        >
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <div className={`w-2 h-6 rounded-full ${formData.color || 'bg-slate-500'}`} />
                                    {editingItem ? 'Editar Tipo de Asistencia' : 'Nuevo Tipo de Asistencia'}
                                </h2>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Código</label>
                                        <input
                                            type="text"
                                            value={formData.codigo || ''}
                                            onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white uppercase font-mono focus:border-amber-500 outline-none transition-colors"
                                            placeholder="EJ: FALTA_INJ"
                                            disabled={!!editingItem} // Generalmente no se cambia el código si se usa de llave
                                        />
                                        {!!editingItem && <span className="text-[10px] text-amber-500/70">El código no puede modificarse.</span>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre Abreviado</label>
                                        <input
                                            type="text"
                                            value={formData.nombre || ''}
                                            onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-500 outline-none transition-colors"
                                            placeholder="Ej: Falta Injustificada"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Color Etiqueta</label>
                                    <div className="grid grid-cols-5 gap-3">
                                        {COLOR_OPTIONS.map(color => (
                                            <button
                                                key={color.value}
                                                type="button"
                                                title={color.name}
                                                onClick={() => setFormData({ ...formData, color: color.value })}
                                                className={`h-10 rounded-lg flex items-center justify-center transition-all ${color.value} ${formData.color === color.value
                                                        ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110 shadow-lg'
                                                        : 'opacity-50 hover:opacity-100 hover:scale-105'
                                                    }`}
                                            >
                                                {formData.color === color.value && <Circle size={14} className="fill-white text-white" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Descripción (Opcional)</label>
                                    <textarea
                                        value={formData.descripcion || ''}
                                        onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-500 outline-none transition-colors h-24 resize-none"
                                        placeholder="Reglas de aplicación, detalles..."
                                    />
                                </div>

                                <label className="flex items-center gap-3 p-4 bg-slate-950/50 rounded-xl border border-slate-800 cursor-pointer group hover:border-slate-700 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={formData.activo ?? true}
                                        onChange={e => setFormData({ ...formData, activo: e.target.checked })}
                                        className="w-5 h-5 rounded border-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 bg-slate-900"
                                    />
                                    <div>
                                        <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">Estado Activo</div>
                                        <div className="text-xs text-slate-500">Disponible para selección en reportes diarios</div>
                                    </div>
                                </label>
                            </div>

                            <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2.5 text-slate-400 hover:text-white font-medium hover:bg-slate-800 rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold rounded-xl shadow-lg shadow-amber-900/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                                >
                                    <Save size={18} />
                                    Guardar Registro
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
