'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Truck, X, Settings } from 'lucide-react'
import { useCatalog } from '@/hooks/use-catalog'
import { supabase } from '@/lib/supabase'

type OrgUnit = { id: string, nombre_unidad: string }

export default function EquipmentPage() {
    const { data: equipment, loading, refresh } = useCatalog<any>('ops_equipment', '*, org_units(nombre_unidad)')

    // --- Tipos de Equipo (Dinámico) ---
    const [tiposEquipo, setTiposEquipo] = useState<{ id: string, nombre: string }[]>([])
    const [showManageTypes, setShowManageTypes] = useState(false)
    const [showNewTipoInput, setShowNewTipoInput] = useState(false)
    const [newTipoNombre, setNewTipoNombre] = useState('')

    // --- Estado Original ---
    const [units, setUnits] = useState<OrgUnit[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)

    const [formData, setFormData] = useState({
        unit_id: '',
        clave: '',
        tipo: 'JUMBO',
        marca: '',
        modelo: '',
        uso_operativo: 'NO_OPERATIVO'
    })

    const [isEditMode, setIsEditMode] = useState(false)
    const [currentId, setCurrentId] = useState<string | null>(null)

    // Fetch Catalogs
    useEffect(() => {
        const loadData = async () => {
            // Units
            const { data: uData } = await supabase.from('org_units').select('id, nombre_unidad')
            if (uData) {
                setUnits(uData)
                if (uData.length > 0) setFormData(prev => ({ ...prev, unit_id: uData[0].id }))
            }

            // Types
            fetchTipos()
        }
        loadData()
    }, [])

    const fetchTipos = async () => {
        const { data } = await supabase.from('cat_tipos_equipo').select('*').eq('activo', true).order('nombre')
        if (data) setTiposEquipo(data)
    }

    const handleCreateTipo = async () => {
        if (!newTipoNombre.trim()) return

        const nombre = newTipoNombre.trim().toUpperCase()

        try {
            const { error } = await supabase.from('cat_tipos_equipo').insert({ nombre })
            if (error) throw error

            await fetchTipos()
            setFormData(prev => ({ ...prev, tipo: nombre })) // Auto-select new type
            setNewTipoNombre('')
            setShowNewTipoInput(false)
        } catch (err: any) {
            alert('Error al crear tipo: ' + err.message)
        }
    }

    const handleDeleteTipo = async (id: string) => {
        if (!confirm('¿Eliminar este tipo de equipo? (No afectará a los equipos ya creados)')) return

        try {
            const { error } = await supabase
                .from('cat_tipos_equipo')
                .update({ activo: false })
                .eq('id', id)

            if (error) throw error
            fetchTipos()
        } catch (err: any) {
            alert('Error al eliminar tipo: ' + err.message)
        }
    }

    const handleOpenCreate = () => {
        setIsEditMode(false)
        setFormData({
            unit_id: units.length > 0 ? units[0].id : '',
            clave: '',
            tipo: tiposEquipo.length > 0 ? tiposEquipo[0].nombre : 'JUMBO',
            marca: '',
            modelo: '',
            uso_operativo: 'NO_OPERATIVO'
        })
        setIsModalOpen(true)
        setShowNewTipoInput(false)
    }

    const handleOpenEdit = (eq: any) => {
        setIsEditMode(true)
        setCurrentId(eq.id)
        setFormData({
            unit_id: eq.unit_id || (units.length > 0 ? units[0].id : ''),
            clave: eq.clave,
            tipo: eq.tipo,
            marca: eq.marca || '',
            modelo: eq.modelo || '',
            uso_operativo: eq.uso_operativo || 'NO_OPERATIVO'
        })
        setIsModalOpen(true)
        setShowNewTipoInput(false)
    }

    const handleSubmit = async () => {
        if (!formData.clave || !formData.unit_id) {
            alert('Complete clave y unidad')
            return
        }

        const { uso_operativo, ...dbPayload } = formData

        let error
        if (isEditMode && currentId) {
            const { error: updateError } = await supabase
                .from('ops_equipment')
                .update(dbPayload)
                .eq('id', currentId)
            error = updateError
        } else {
            const { error: insertError } = await supabase.from('ops_equipment').insert([{ ...dbPayload, status: 'DISPONIBLE' }])
            error = insertError
        }

        if (!error) {
            alert(isEditMode ? 'Equipo actualizado' : 'Equipo creado')
            setIsModalOpen(false)
            refresh()
        } else {
            alert('Error: ' + error.message)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este equipo?')) return
        const { error } = await supabase.from('ops_equipment').delete().eq('id', id)
        if (!error) {
            alert('Equipo eliminado')
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
                    <h1 className="text-2xl font-bold text-white">Equipos y Maquinaria</h1>
                    <p className="text-slate-400">Inventario de Jumbos, Scoops, Jacklegs, Simbas y vehículos.</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-amber-900/20"
                >
                    <Plus size={18} />
                    Nuevo Equipo
                </button>
            </div>

            {loading ? (
                <div className="text-slate-500">Cargando equipos...</div>
            ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden max-h-[600px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-950 text-slate-200 uppercase tracking-wider font-semibold">
                            <tr>
                                <th className="px-6 py-4">Clave (Económico)</th>
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4">Uso</th>
                                <th className="px-6 py-4">Marca/Modelo</th>
                                <th className="px-6 py-4">Unidad</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {equipment.map((eq) => (
                                <tr key={eq.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-white flex items-center gap-3">
                                        <div className="p-1.5 bg-slate-800 rounded text-amber-500">
                                            <Truck size={14} />
                                        </div>
                                        {eq.clave}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-xs border border-slate-700">
                                            {eq.tipo}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {eq.uso_operativo === 'PERFORACION' && <span className="text-[10px] bg-red-900/40 text-red-300 border border-red-800 px-1.5 py-0.5 rounded">Perf.</span>}
                                        {eq.uso_operativo === 'FLETE' && <span className="text-[10px] bg-blue-900/40 text-blue-300 border border-blue-800 px-1.5 py-0.5 rounded">Flete</span>}
                                        {eq.uso_operativo === 'SERVICIOS_OBRA_CIVIL' && <span className="text-[10px] bg-purple-900/40 text-purple-300 border border-purple-800 px-1.5 py-0.5 rounded">Serv.</span>}
                                        {(!eq.uso_operativo || eq.uso_operativo === 'NO_OPERATIVO') && <span className="text-[10px] text-slate-600">-</span>}
                                    </td>
                                    <td className="px-6 py-4">{eq.marca} {eq.modelo}</td>
                                    <td className="px-6 py-4 text-slate-500">{eq.org_units?.nombre_unidad}</td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button
                                            onClick={() => handleOpenEdit(eq)}
                                            className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(eq.id)}
                                            className="p-2 hover:bg-red-500/10 rounded text-slate-400 hover:text-red-500"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {equipment.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        No hay equipos registrados.
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
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl relative">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-500 hover:text-white"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-xl font-bold text-white mb-4">
                            {isEditMode ? 'Editar Equipo' : 'Nuevo Equipo'}
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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Clave (Económico)</label>
                                    <input
                                        type="text"
                                        value={formData.clave}
                                        onChange={e => setFormData({ ...formData, clave: e.target.value })}
                                        className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                        placeholder="Ej. A6"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1 flex justify-between items-center">
                                        Tipo
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setShowManageTypes(true)}
                                                className="text-slate-500 hover:text-white text-xs"
                                                title="Gestionar lista"
                                            >
                                                <Settings size={14} />
                                            </button>
                                            <button
                                                onClick={() => setShowNewTipoInput(!showNewTipoInput)}
                                                className="text-amber-500 hover:text-amber-400 text-xs flex items-center gap-1"
                                                title="Crear nuevo tipo"
                                            >
                                                <Plus size={12} /> Nuevo
                                            </button>
                                        </div>
                                    </label>

                                    {showNewTipoInput ? (
                                        <div className="flex gap-1 animate-in slide-in-from-top-2 fade-in duration-200">
                                            <input
                                                type="text"
                                                value={newTipoNombre}
                                                onChange={e => setNewTipoNombre(e.target.value)}
                                                className="w-full bg-slate-800 border-slate-700 rounded-lg p-2 text-xs text-white outline-none focus:border-amber-500"
                                                placeholder="Ej. SIMBA"
                                                autoFocus
                                            />
                                            <button
                                                onClick={handleCreateTipo}
                                                className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-500"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <select
                                            value={formData.tipo}
                                            onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                                            className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                        >
                                            {tiposEquipo.map(t => (
                                                <option key={t.id} value={t.nombre}>{t.nombre}</option>
                                            ))}
                                            {/* Fallback option if current type is not in catalog */}
                                            {!tiposEquipo.find(t => t.nombre === formData.tipo) && formData.tipo && (
                                                <option value={formData.tipo}>{formData.tipo}</option>
                                            )}
                                        </select>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Marca</label>
                                    <input
                                        type="text"
                                        value={formData.marca}
                                        onChange={e => setFormData({ ...formData, marca: e.target.value })}
                                        className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                        placeholder="Ej. Sandvik"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Modelo</label>
                                    <input
                                        type="text"
                                        value={formData.modelo}
                                        onChange={e => setFormData({ ...formData, modelo: e.target.value })}
                                        className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Uso Operativo (Categoría)</label>
                                <select
                                    value={formData.uso_operativo || 'NO_OPERATIVO'}
                                    onChange={e => setFormData({ ...formData, uso_operativo: e.target.value })}
                                    className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                >
                                    <option value="PERFORACION">PERFORACIÓN (Jumbos, Simbas)</option>
                                    <option value="FLETE">FLETE Y ACARREO (Scoops, Camiones)</option>
                                    <option value="SERVICIOS_OBRA_CIVIL">SERVICIOS / OBRA CIVIL (Pipas, Mixers)</option>
                                    <option value="NO_OPERATIVO">NO OPERATIVO / TRANSPORTE PERSONAL</option>
                                    <option value="OTROS">OTROS</option>
                                </select>
                                <p className="text-[10px] text-slate-500 mt-1">Define en qué reportes aparecerá este equipo.</p>
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
                                {isEditMode ? 'Guardar Cambios' : 'Guardar Equipo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Gestión Tipos */}
            {showManageTypes && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-sm shadow-2xl">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
                            <h3 className="text-lg font-bold text-white">Gestionar Tipos</h3>
                            <button onClick={() => setShowManageTypes(false)} className="text-slate-500 hover:text-white"><X size={18} /></button>
                        </div>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                            {tiposEquipo.map(t => (
                                <div key={t.id} className="flex justify-between items-center p-2 bg-slate-800/50 rounded hover:bg-slate-800 transition-colors group">
                                    <span className="text-sm text-slate-300">{t.nombre}</span>
                                    <button
                                        onClick={() => handleDeleteTipo(t.id)}
                                        className="text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                        title="Eliminar"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            {tiposEquipo.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No hay tipos registrados.</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
