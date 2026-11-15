
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { useCatalog } from '@/hooks/use-catalog'
import { supabase } from '@/lib/supabase'

export default function CompaniesPage() {
    const { data: companies, loading, refresh } = useCatalog<any>('org_companies', '*')
    const [isEditMode, setIsEditMode] = useState(false)
    const [currentId, setCurrentId] = useState<string | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    // Form State now includes 'activo'
    const [formData, setFormData] = useState({
        razon_social: '',
        rfc: '',
        activo: true
    })

    const handleOpenCreate = () => {
        setIsEditMode(false)
        setFormData({ razon_social: '', rfc: '', activo: true })
        setIsModalOpen(true)
    }

    const handleOpenEdit = (company: any) => {
        setIsEditMode(true)
        setCurrentId(company.id)
        setFormData({
            razon_social: company.razon_social,
            rfc: company.rfc || '',
            activo: company.activo ?? true
        })
        setIsModalOpen(true)
    }

    const handleSubmit = async () => {
        if (!formData.razon_social) return

        let error
        if (isEditMode && currentId) {
            const { error: updateError } = await supabase
                .from('org_companies')
                .update(formData)
                .eq('id', currentId)
            error = updateError
        } else {
            const { error: insertError } = await supabase.from('org_companies').insert([formData])
            error = insertError
        }

        if (!error) {
            // alert(isEditMode ? 'Empresa actualizada correctamente' : 'Empresa creada correctamente')
            setIsModalOpen(false)
            setFormData({ razon_social: '', rfc: '', activo: true })
            refresh()
        } else {
            alert('Error: ' + error.message)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta empresa?')) return
        const { error } = await supabase.from('org_companies').delete().eq('id', id)
        if (!error) {
            // alert('Empresa eliminada')
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
                    <h1 className="text-2xl font-bold text-white">Empresas</h1>
                    <p className="text-slate-400">Gestión de razones sociales y contratistas.</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-amber-900/20"
                >
                    <Plus size={18} />
                    Nueva Empresa
                </button>
            </div>

            {loading ? (
                <div className="text-slate-500">Cargando empresas...</div>
            ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-950 text-slate-200 uppercase tracking-wider font-semibold">
                            <tr>
                                <th className="px-6 py-4">Razón Social</th>
                                <th className="px-6 py-4">RFC</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {companies.map((company) => (
                                <tr key={company.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-white">{company.razon_social}</td>
                                    <td className="px-6 py-4">{company.rfc || '-'}</td>
                                    <td className="px-6 py-4">
                                        <div className={`flex items-center gap-2 px-2 py-1 rounded w-fit text-xs font-medium ${company.activo ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                            {company.activo ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                            {company.activo ? 'Activo' : 'Inactivo'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button
                                            onClick={() => handleOpenEdit(company)}
                                            className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(company.id)}
                                            className="p-2 hover:bg-red-500/10 rounded text-slate-400 hover:text-red-500"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {companies.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        No hay empresas registradas.
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
                        <h3 className="text-xl font-bold text-white mb-6">
                            {isEditMode ? 'Editar Empresa' : 'Nueva Empresa'}
                        </h3>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1.5">Razón Social <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={formData.razon_social}
                                    onChange={e => setFormData({ ...formData, razon_social: e.target.value })}
                                    className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-amber-500 outline-none placeholder:text-slate-600"
                                    placeholder="Ej. Minera Principal S.A. de C.V."
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1.5">RFC</label>
                                <input
                                    type="text"
                                    value={formData.rfc}
                                    onChange={e => setFormData({ ...formData, rfc: e.target.value })}
                                    className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-amber-500 outline-none placeholder:text-slate-600"
                                    placeholder="XAXX010101000"
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.activo}
                                        onChange={e => setFormData({ ...formData, activo: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                    <span className="ml-3 text-sm font-medium text-slate-300">
                                        {formData.activo ? 'Estátus: Activo' : 'Estátus: Inactivo'}
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-800">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-slate-400 hover:text-white transition-colors hover:bg-slate-800 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-amber-900/20 transition-all hover:scale-[1.02]"
                            >
                                {isEditMode ? 'Guardar Cambios' : 'Guardar Empresa'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
