
'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, MapPin } from 'lucide-react'
import { useCatalog } from '@/hooks/use-catalog'
import { supabase } from '@/lib/supabase'

// Types
type MineSite = { id: string, nombre_mina: string }

export default function LocationsPage() {
    const { data: locations, loading, refresh } = useCatalog<any>('mine_locations', `
    *,
    mine_sites (nombre_mina)
  `)
    const [sites, setSites] = useState<MineSite[]>([])
    const [isEditMode, setIsEditMode] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [currentId, setCurrentId] = useState<string | null>(null)

    // Form State
    const [formData, setFormData] = useState({
        site_id: '',
        nombre: '',
        tipo: 'FRENTE',
        labor_factor: '1.00',
        codigo: ''
    })

    // Fetch Sites for Dropdown
    useEffect(() => {
        supabase.from('mine_sites').select('id, nombre_mina').then(({ data }) => {
            if (data) {
                setSites(data)
                if (data.length > 0) setFormData(prev => ({ ...prev, site_id: data[0].id }))
            }
        })
    }, [])

    const handleOpenCreate = () => {
        setIsEditMode(false)
        setFormData({
            site_id: sites.length > 0 ? sites[0].id : '',
            nombre: '',
            tipo: 'FRENTE',
            labor_factor: '1.00',
            codigo: ''
        })
        setIsModalOpen(true)
    }

    const handleOpenEdit = (loc: any) => {
        setIsEditMode(true)
        setCurrentId(loc.id)
        setFormData({
            site_id: loc.mine_site_id || loc.site_id || (sites.length > 0 ? sites[0].id : ''),
            nombre: loc.nombre,
            tipo: loc.tipo,
            labor_factor: loc.labor_factor || '1.00',
            codigo: loc.codigo || ''
        })
        setIsModalOpen(true)
    }

    const handleSubmit = async () => {
        if (!formData.nombre || !formData.site_id) {
            alert('Complete nombre y mina')
            return
        }

        const dbPayload = {
            mine_site_id: formData.site_id,
            nombre: formData.nombre,
            tipo: formData.tipo,
            codigo: formData.codigo || null,
            activo: true
        }

        let error
        if (isEditMode && currentId) {
            const { error: updateError } = await supabase
                .from('mine_locations')
                .update(dbPayload)
                .eq('id', currentId)
            error = updateError
        } else {
            const { error: insertError } = await supabase.from('mine_locations').insert([dbPayload])
            error = insertError
        }

        if (!error) {
            alert(isEditMode ? 'Ubicación actualizada' : 'Ubicación creada')
            setIsModalOpen(false)
            refresh()
        } else {
            alert('Error: ' + error.message)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta ubicación?')) return
        const { error } = await supabase.from('mine_locations').delete().eq('id', id)
        if (!error) {
            alert('Ubicación eliminada')
            refresh()
        } else {
            alert('Error al eliminar: ' + error.message)
        }
    }

    const getTypeColor = (tipo: string) => {
        switch (tipo) {
            case 'CONTRAPOZO': return 'text-purple-400 bg-purple-500/10'
            case 'RAMPA': return 'text-blue-400 bg-blue-500/10'
            case 'FRENTE': return 'text-amber-400 bg-amber-500/10'
            default: return 'text-slate-400 bg-slate-800'
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
                    <h1 className="text-2xl font-bold text-white">Ubicaciones (Frentes)</h1>
                    <p className="text-slate-400">Lugares de trabajo activos y factores de labor.</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-amber-900/20"
                >
                    <Plus size={18} />
                    Nueva Ubicación
                </button>
            </div>

            {loading ? (
                <div className="text-slate-500">Cargando ubicaciones...</div>
            ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-950 text-slate-200 uppercase tracking-wider font-semibold">
                            <tr>
                                <th className="px-6 py-4">Nombre / Código</th>
                                <th className="px-6 py-4">Mina</th>
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4">Factor Labor</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {locations.map((loc) => (
                                <tr key={loc.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                                        <MapPin size={16} className="text-slate-500" />
                                        {loc.nombre}
                                        {loc.codigo && <span className="text-xs bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">{loc.codigo}</span>}
                                    </td>
                                    <td className="px-6 py-4">{loc.mine_sites?.nombre_mina || '-'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${getTypeColor(loc.tipo)}`}>
                                            {loc.tipo}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-slate-300">
                                        x{loc.labor_factor}
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button
                                            onClick={() => handleOpenEdit(loc)}
                                            className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(loc.id)}
                                            className="p-2 hover:bg-red-500/10 rounded text-slate-400 hover:text-red-500"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {locations.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        No hay ubicaciones registradas.
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
                            {isEditMode ? 'Editar Ubicación' : 'Nueva Ubicación'}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Mina</label>
                                <select
                                    value={formData.site_id}
                                    onChange={e => setFormData({ ...formData, site_id: e.target.value })}
                                    className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                >
                                    <option value="" disabled>Seleccione una mina</option>
                                    {sites.map(s => <option key={s.id} value={s.id}>{s.nombre_mina}</option>)}
                                </select>
                                {sites.length === 0 && <p className="text-xs text-red-400 mt-1">Primero crea una "Mina" en base de datos.</p>}
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Nombre</label>
                                    <input
                                        type="text"
                                        value={formData.nombre}
                                        onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                        className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                        placeholder="Ej. Frente 305 Nivel 10"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Código</label>
                                    <input
                                        type="text"
                                        value={formData.codigo}
                                        onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                                        className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                        placeholder="Ej. F305"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Tipo</label>
                                    <select
                                        value={formData.tipo}
                                        onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                                        className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                    >
                                        <option value="FRENTE">Frente</option>
                                        <option value="CONTRAPOZO">Contrapozo</option>
                                        <option value="RAMPA">Rampa</option>
                                        <option value="CARCAMO">Cárcamo</option>
                                        <option value="CRUCERO">Crucero</option>
                                        <option value="OTRO">Otro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Factor Labor</label>
                                    <input
                                        type="number"
                                        step="0.05"
                                        value={formData.labor_factor}
                                        onChange={e => setFormData({ ...formData, labor_factor: e.target.value })}
                                        className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                    />
                                </div>
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
                                {isEditMode ? 'Guardar Cambios' : 'Guardar Ubicación'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
