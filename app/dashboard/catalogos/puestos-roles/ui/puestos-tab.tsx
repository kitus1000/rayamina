'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, Users } from 'lucide-react'
import { useCatalog } from '@/hooks/use-catalog'
import { supabase } from '@/lib/supabase'

export default function PuestosTab() {
    const { data: puestos, loading, refresh } = useCatalog<any>('cat_puestos', '*')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [currentId, setCurrentId] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        nombre: '',
        tipo_personal: 'OPERATIVO',
        activo: true
    })

    const handleOpenCreate = () => {
        setIsEditMode(false)
        setFormData({
            nombre: '',
            tipo_personal: 'OPERATIVO',
            activo: true
        })
        setIsModalOpen(true)
    }

    const handleOpenEdit = (puesto: any) => {
        setIsEditMode(true)
        setCurrentId(puesto.id)
        setFormData({
            nombre: puesto.nombre,
            tipo_personal: puesto.tipo_personal || 'OPERATIVO',
            activo: puesto.activo
        })
        setIsModalOpen(true)
    }

    const handleSubmit = async () => {
        if (!formData.nombre) {
            alert('El nombre es obligatorio')
            return
        }

        let error
        if (isEditMode && currentId) {
            const { error: updateError } = await supabase
                .from('cat_puestos')
                .update(formData)
                .eq('id', currentId)
            error = updateError
        } else {
            const { error: insertError } = await supabase.from('cat_puestos').insert([formData])
            error = insertError
        }

        if (!error) {
            setIsModalOpen(false)
            refresh()
        } else {
            alert('Error: ' + error.message)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Desactivar este puesto?')) return
        // Soft delete implementation: update active status instead of deleting row
        const { error } = await supabase
            .from('cat_puestos')
            .update({ activo: false })
            .eq('id', id)

        if (!error) {
            refresh()
        } else {
            alert('Error: ' + error.message)
        }
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white">Catálogo de Puestos (RH)</h2>
                    <p className="text-slate-400 text-sm">Definición de puestos para contratación y nómina base.</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium"
                >
                    <Plus size={16} />
                    Nuevo Puesto
                </button>
            </div>

            {loading ? (
                <div className="text-slate-500">Cargando puestos...</div>
            ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[600px] text-left text-sm text-slate-400">
                        <thead className="bg-slate-950 text-slate-200 font-semibold">
                            <tr>
                                <th className="px-6 py-3">Nombre Puesto</th>
                                <th className="px-6 py-3">Tipo Personal</th>
                                <th className="px-6 py-3">Estado</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {puestos.map((puesto) => (
                                <tr key={puesto.id} className="hover:bg-slate-800/50">
                                    <td className="px-6 py-3 font-medium text-white flex items-center gap-3">
                                        <div className="p-1.5 bg-slate-800 rounded text-amber-500">
                                            <Users size={14} />
                                        </div>
                                        {puesto.nombre}
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className={`px-2 py-1 rounded text-xs ${puesto.tipo_personal === 'ADMINISTRATIVO'
                                                ? 'bg-purple-500/10 text-purple-400'
                                                : 'bg-blue-500/10 text-blue-400'
                                            }`}>
                                            {puesto.tipo_personal}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className={`w-2 h-2 rounded-full inline-block mr-2 ${puesto.activo ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                                        {puesto.activo ? 'Activo' : 'Inactivo'}
                                    </td>
                                    <td className="px-6 py-3 text-right flex justify-end gap-2">
                                        <button onClick={() => handleOpenEdit(puesto)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white">
                                            <Edit2 size={14} />
                                        </button>
                                        <button onClick={() => handleDelete(puesto.id)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400">
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {puestos.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                        No hay puestos registrados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-sm shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-4">
                            {isEditMode ? 'Editar Puesto' : 'Nuevo Puesto'}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Nombre Puesto</label>
                                <input
                                    type="text"
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                                    placeholder="Ej. Oficial Perforista"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Tipo Personal</label>
                                <select
                                    value={formData.tipo_personal}
                                    onChange={e => setFormData({ ...formData, tipo_personal: e.target.value })}
                                    className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                                >
                                    <option value="OPERATIVO">OPERATIVO</option>
                                    <option value="ADMINISTRATIVO">ADMINISTRATIVO</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="activo"
                                    checked={formData.activo}
                                    onChange={e => setFormData({ ...formData, activo: e.target.checked })}
                                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500"
                                />
                                <label htmlFor="activo" className="text-sm text-slate-400">Activo</label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
                            <button onClick={() => setIsModalOpen(false)} className="text-sm text-slate-400 hover:text-white">Cancelar</button>
                            <button onClick={handleSubmit} className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
