'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Building2 } from 'lucide-react'
import { useCatalog } from '@/hooks/use-catalog'
import { supabase } from '@/lib/supabase'

type Company = { id: string, razon_social: string }

export default function UnitsPage() {
    const { data: units, loading, refresh } = useCatalog<any>('org_units', '*, org_companies(razon_social)')
    const [companies, setCompanies] = useState<Company[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [currentId, setCurrentId] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        company_id: '',
        nombre_unidad: '',
        codigo: ''
    })

    // Fetch Companies
    useEffect(() => {
        supabase.from('org_companies').select('id, razon_social').then(({ data }) => {
            if (data) {
                setCompanies(data)
                if (data.length > 0) setFormData(prev => ({ ...prev, company_id: data[0].id }))
            }
        })
    }, [])

    const handleOpenCreate = () => {
        setIsEditMode(false)
        setFormData({
            company_id: companies.length > 0 ? companies[0].id : '',
            nombre_unidad: '',
            codigo: ''
        })
        setIsModalOpen(true)
    }

    const handleOpenEdit = (unit: any) => {
        setIsEditMode(true)
        setCurrentId(unit.id)
        setFormData({
            company_id: unit.company_id || (companies.length > 0 ? companies[0].id : ''),
            nombre_unidad: unit.nombre_unidad,
            codigo: unit.codigo || unit.nombre || ''
        })
        setIsModalOpen(true)
    }

    const handleSubmit = async () => {
        if (!formData.nombre_unidad || !formData.company_id) {
            alert('Por favor complete todos los campos obligatorios')
            return
        }

        const dbPayload = {
            company_id: formData.company_id,
            nombre_unidad: formData.nombre_unidad,
            nombre: formData.codigo || formData.nombre_unidad,
            activo: true
        }

        let error
        if (isEditMode && currentId) {
            const { error: updateError } = await supabase
                .from('org_units')
                .update(dbPayload)
                .eq('id', currentId)
            error = updateError
        } else {
            const { error: insertError } = await supabase.from('org_units').insert([dbPayload])
            error = insertError
        }

        if (!error) {
            alert(isEditMode ? 'Unidad actualizada correctamente' : 'Unidad creada correctamente')
            setIsModalOpen(false)
            refresh()
        } else {
            alert('Error: ' + error.message)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta unidad?')) return
        const { error } = await supabase.from('org_units').delete().eq('id', id)
        if (!error) {
            alert('Unidad eliminada')
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
                    <h1 className="text-2xl font-bold text-white">Unidades Mineras</h1>
                    <p className="text-slate-400">Centros de costo y operación.</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-amber-900/20"
                >
                    <Plus size={18} />
                    Nueva Unidad
                </button>
            </div>

            {loading ? (
                <div className="text-slate-500">Cargando unidades...</div>
            ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-950 text-slate-200 uppercase tracking-wider font-semibold">
                            <tr>
                                <th className="px-6 py-4">Código</th>
                                <th className="px-6 py-4">Nombre Unidad</th>
                                <th className="px-6 py-4">Empresa</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {units.map((unit) => (
                                <tr key={unit.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-amber-500 font-bold">{unit.codigo}</td>
                                    <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                                        <Building2 size={16} className="text-slate-500" />
                                        {unit.nombre_unidad}
                                    </td>
                                    <td className="px-6 py-4">{unit.org_companies?.razon_social || '-'}</td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button
                                            onClick={() => handleOpenEdit(unit)}
                                            className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(unit.id)}
                                            className="p-2 hover:bg-red-500/10 rounded text-slate-400 hover:text-red-500"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {units.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        No hay unidades registradas.
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
                            {isEditMode ? 'Editar Unidad' : 'Nueva Unidad'}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Empresa</label>
                                <select
                                    value={formData.company_id}
                                    onChange={e => setFormData({ ...formData, company_id: e.target.value })}
                                    className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                >
                                    <option value="" disabled>Seleccione empresa</option>
                                    {companies.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
                                </select>
                                {companies.length === 0 && <p className="text-xs text-red-400 mt-1">Requiere registrar una Empresa primero.</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Nombre Unidad</label>
                                <input
                                    type="text"
                                    value={formData.nombre_unidad}
                                    onChange={e => setFormData({ ...formData, nombre_unidad: e.target.value })}
                                    className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                    placeholder="Ej. Unidad Charcas"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Código</label>
                                <input
                                    type="text"
                                    value={formData.codigo}
                                    onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                                    className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                    placeholder="Ej. CHA"
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
                                {isEditMode ? 'Guardar Cambios' : 'Crear Unidad'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
