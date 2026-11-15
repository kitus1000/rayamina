'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Calendar, BadgeDollarSign } from 'lucide-react'
import { useCatalog } from '@/hooks/use-catalog'
import { supabase } from '@/lib/supabase'

export default function SplitsTab() {
    const { data: roles } = useCatalog<any>('cat_roles_operativos', '*')
    // For now we mock concepts, later fetch from payroll catalog
    const [splits, setSplits] = useState<any[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)

    // Form Data
    const [formData, setFormData] = useState({
        rol_id: '',
        concepto: 'DESTAJO_METROS', // Example hardcoded concept for now
        porcentaje: 0.00,
        vigencia_desde: new Date().toISOString().split('T')[0]
    })

    useEffect(() => {
        loadSplits()
    }, [])

    const loadSplits = async () => {
        const { data } = await supabase.from('cat_role_splits')
            .select('*, cat_roles_operativos(nombre)')
            .eq('activo', true)
        if (data) setSplits(data)
    }

    const handleSubmit = async () => {
        if (!formData.rol_id) return alert('Seleccione un rol')

        const { error } = await supabase.from('cat_role_splits').insert([{
            rol_operativo_id: formData.rol_id,
            concepto_nomina_id: null, // Placeholder
            concepto_ref: formData.concepto, // Store text ref for now
            porcentaje: formData.porcentaje,
            vigencia_desde: formData.vigencia_desde
        }])

        if (!error) {
            setIsModalOpen(false)
            loadSplits()
        } else {
            alert('Error: ' + error.message)
        }
    }

    const handleDeleteSplit = async (id: string) => {
        if (!confirm('¿Eliminar esta regla de split?')) return
        const { error } = await supabase.from('cat_role_splits').delete().eq('id', id)
        if (!error) {
            loadSplits()
        } else {
            alert('Error: ' + error.message)
        }
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white">Splits de Pago por Rol</h2>
                    <p className="text-slate-400 text-sm">Definición de porcentajes de participación en destajos.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium"
                >
                    <Plus size={16} />
                    Nuevo Split
                </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-950 text-slate-200 font-semibold">
                        <tr>
                            <th className="px-6 py-3">Rol Operativo</th>
                            <th className="px-6 py-3">Concepto</th>
                            <th className="px-6 py-3">Split (%)</th>
                            <th className="px-6 py-3">Vigencia Desde</th>
                            <th className="px-6 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {splits.map((split) => (
                            <tr key={split.id} className="hover:bg-slate-800/50">
                                <td className="px-6 py-3 font-medium text-white">
                                    {split.cat_roles_operativos?.nombre}
                                </td>
                                <td className="px-6 py-3">
                                    <span className="bg-slate-800 px-2 py-1 rounded text-xs font-mono">{split.concepto_ref || 'GENERAL'}</span>
                                </td>
                                <td className="px-6 py-3 text-rose-400 font-bold">
                                    {(split.porcentaje * 100).toFixed(0)}%
                                </td>
                                <td className="px-6 py-3 flex items-center gap-2">
                                    <Calendar size={14} />
                                    {split.vigencia_desde}
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <button onClick={() => handleDeleteSplit(split.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {splits.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                    No hay reglas definidas.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-sm shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-4">Nuevo Split</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Rol Operativo</label>
                                <select
                                    value={formData.rol_id}
                                    onChange={e => setFormData({ ...formData, rol_id: e.target.value })}
                                    className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-rose-500 outline-none text-sm"
                                >
                                    <option value="">Seleccione Rol</option>
                                    {roles.map((r: any) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Porcentaje (0.0 - 1.0)</label>
                                <input
                                    type="number"
                                    step="0.05"
                                    min="0"
                                    max="1"
                                    value={formData.porcentaje}
                                    onChange={e => setFormData({ ...formData, porcentaje: parseFloat(e.target.value) })}
                                    className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-rose-500 outline-none text-sm"
                                />
                                <p className="text-xs text-rose-400 mt-1">Ejemplo: 0.70 para 70%</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
                            <button onClick={() => setIsModalOpen(false)} className="text-sm text-slate-400 hover:text-white">Cancelar</button>
                            <button onClick={handleSubmit} className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
