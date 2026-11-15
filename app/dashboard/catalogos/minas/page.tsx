'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Mountain } from 'lucide-react'
import { useCatalog } from '@/hooks/use-catalog'
import { supabase } from '@/lib/supabase'

type Unit = { id: string, nombre_unidad: string }

export default function MinesPage() {
    const { data: mines, loading, refresh } = useCatalog<any>('mine_sites', '*, org_units(nombre_unidad)')
    const [units, setUnits] = useState<Unit[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [currentId, setCurrentId] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        unit_id: '',
        nombre_mina: ''
    })

    // Fetch Units
    useEffect(() => {
        supabase.from('org_units').select('id, nombre_unidad').then(({ data }) => {
            if (data) {
                setUnits(data)
                if (data.length > 0) setFormData(prev => ({ ...prev, unit_id: data[0].id }))
            }
        })
    }, [])

    const handleOpenCreate = () => {
        setIsEditMode(false)
        setFormData({
            unit_id: units.length > 0 ? units[0].id : '',
            nombre_mina: ''
        })
        setIsModalOpen(true)
    }

    const handleOpenEdit = (mine: any) => {
        setIsEditMode(true)
        setCurrentId(mine.id)
        setFormData({
            unit_id: mine.unit_id || (units.length > 0 ? units[0].id : ''),
            nombre_mina: mine.nombre_mina
        })
        setIsModalOpen(true)
    }

    const handleSubmit = async () => {
        if (!formData.nombre_mina || !formData.unit_id) {
            alert('Por favor complete todos los campos obligatorios')
            return
        }

        let error
        if (isEditMode && currentId) {
            const { error: updateError } = await supabase
                .from('mine_sites')
                .update(formData)
                .eq('id', currentId)
            error = updateError
        } else {
            const { error: insertError } = await supabase.from('mine_sites').insert([formData])
            error = insertError
        }

        if (!error) {
            alert(isEditMode ? 'Mina actualizada correctamente' : 'Mina creada correctamente')
            setIsModalOpen(false)
            refresh()
        } else {
            alert('Error: ' + error.message)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta mina?')) return
        const { error } = await supabase.from('mine_sites').delete().eq('id', id)
        if (!error) {
            alert('Mina eliminada')
            refresh()
        } else {
            alert('Error al eliminar: ' + error.message)
        }
    }

    return (
        <div>
            <div className="mb-6">
                <Link href="/dashboard/catalogos" className="text-sm text-slate-400 hover:text-white flex items-center gap-1 transition-colors w-fit">
                    ← Volver a Catálogos
                </Link>
            </div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Minas</h1>
                    <p className="text-slate-400">Yacimientos y sitios de extracción.</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-amber-900/20"
                >
                    <Plus size={18} />
                    Nueva Mina
                </button>
            </div>

            {loading ? (
                <div className="text-slate-500">Cargando minas...</div>
            ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden max-h-[600px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-950 text-slate-200 uppercase tracking-wider font-semibold">
                            <tr>
                                <th className="px-6 py-4">Nombre Mina</th>
                                <th className="px-6 py-4">Unidad</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {mines.map((mine) => (
                                <tr key={mine.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                                        <Mountain size={16} className="text-slate-500" />
                                        {mine.nombre_mina}
                                    </td>
                                    <td className="px-6 py-4">{mine.org_units?.nombre_unidad || '-'}</td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button
                                            onClick={() => handleOpenEdit(mine)}
                                            className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(mine.id)}
                                            className="p-2 hover:bg-red-500/10 rounded text-slate-400 hover:text-red-500"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {mines.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                                        No hay minas registradas.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-4">
                            {isEditMode ? 'Editar Mina' : 'Nueva Mina'}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Unidad</label>
                                <select
                                    value={formData.unit_id}
                                    onChange={e => setFormData({ ...formData, unit_id: e.target.value })}
                                    className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                >
                                    <option value="" disabled>Seleccione unidad</option>
                                    {units.map(u => <option key={u.id} value={u.id}>{u.nombre_unidad}</option>)}
                                </select>
                                {units.length === 0 && <p className="text-xs text-red-400 mt-1">Requiere registrar una Unidad primero.</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Nombre Mina</label>
                                <input
                                    type="text"
                                    value={formData.nombre_mina}
                                    onChange={e => setFormData({ ...formData, nombre_mina: e.target.value })}
                                    className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                    placeholder="Ej. Mina Profunda"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-800">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-amber-900/20"
                            >
                                {isEditMode ? 'Guardar Cambios' : 'Crear Mina'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
