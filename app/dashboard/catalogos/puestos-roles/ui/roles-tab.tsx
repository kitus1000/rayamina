'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, Briefcase } from 'lucide-react'
import { useCatalog } from '@/hooks/use-catalog'
import { supabase } from '@/lib/supabase'

export default function RolesTab() {
    const { data: roles, loading, refresh } = useCatalog<any>('cat_roles_operativos', '*')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [currentId, setCurrentId] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        nombre: '',
        categoria: 'PERFORACION',
        orden: 0,
        activo: true
    })

    const handleOpenCreate = () => {
        setIsEditMode(false)
        setFormData({
            nombre: '',
            categoria: 'PERFORACION',
            orden: 0,
            activo: true
        })
        setIsModalOpen(true)
    }

    const handleOpenEdit = (rol: any) => {
        setIsEditMode(true)
        setCurrentId(rol.id)
        setFormData({
            nombre: rol.nombre,
            categoria: rol.categoria || 'PERFORACION',
            orden: rol.orden || 0,
            activo: rol.activo
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
                .from('cat_roles_operativos')
                .update(formData)
                .eq('id', currentId)
            error = updateError
        } else {
            const { error: insertError } = await supabase.from('cat_roles_operativos').insert([formData])
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
        if (!confirm('¿Desactivar este rol?')) return
        const { error } = await supabase
            .from('cat_roles_operativos')
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
                    <h2 className="text-xl font-bold text-white">Catálogo de Roles Operativos</h2>
                    <p className="text-slate-400 text-sm">Roles funcionales en la operación (Mina) para asignación en cuadrillas.</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium"
                >
                    <Plus size={16} />
                    Nuevo Rol
                </button>
            </div>

            {loading ? (
                <div className="text-slate-500">Cargando roles...</div>
            ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-left text-sm text-slate-400">
                        <thead className="bg-slate-950 text-slate-200 font-semibold">
                            <tr>
                                <th className="px-6 py-3">Nombre Rol</th>
                                <th className="px-6 py-3">Categoría</th>
                                <th className="px-6 py-3">Orden</th>
                                <th className="px-6 py-3">Estado</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {roles.sort((a, b) => (a.orden || 0) - (b.orden || 0)).map((rol) => (
                                <tr key={rol.id} className="hover:bg-slate-800/50">
                                    <td className="px-6 py-3 font-medium text-white flex items-center gap-3">
                                        <div className="p-1.5 bg-slate-800 rounded text-indigo-500">
                                            <Briefcase size={14} />
                                        </div>
                                        {rol.nombre}
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className="bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded text-xs uppercase tracking-wider">
                                            {rol.categoria}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3">{rol.orden}</td>
                                    <td className="px-6 py-3">
                                        <span className={`w-2 h-2 rounded-full inline-block mr-2 ${rol.activo ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                                        {rol.activo ? 'Activo' : 'Inactivo'}
                                    </td>
                                    <td className="px-6 py-3 text-right flex justify-end gap-2">
                                        <button onClick={() => handleOpenEdit(rol)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white">
                                            <Edit2 size={14} />
                                        </button>
                                        <button onClick={() => handleDelete(rol.id)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400">
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {roles.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        No hay roles registrados.
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
                            {isEditMode ? 'Editar Rol' : 'Nuevo Rol'}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Nombre Rol</label>
                                <input
                                    type="text"
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    placeholder="Ej. Oficial Jumbo"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Categoría</label>
                                <select
                                    value={formData.categoria}
                                    onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                                    className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                >
                                    <option value="PERFORACION">PERFORACION</option>
                                    <option value="SCOOP">SCOOP</option>
                                    <option value="ACARREO">ACARREO</option>
                                    <option value="SERVICIOS">SERVICIOS</option>
                                    <option value="OBRA_CIVIL">OBRA CIVIL</option>
                                    <option value="MANTENIMIENTO">MANTENIMIENTO</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Orden (Jerarquía)</label>
                                <input
                                    type="number"
                                    value={formData.orden}
                                    onChange={e => setFormData({ ...formData, orden: parseInt(e.target.value) })}
                                    className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="activo_rol"
                                    checked={formData.activo}
                                    onChange={e => setFormData({ ...formData, activo: e.target.checked })}
                                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                                />
                                <label htmlFor="activo_rol" className="text-sm text-slate-400">Activo</label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
                            <button onClick={() => setIsModalOpen(false)} className="text-sm text-slate-400 hover:text-white">Cancelar</button>
                            <button onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
