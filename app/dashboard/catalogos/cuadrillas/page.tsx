'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Users, Plus, Search, Filter, HardHat, Clock,
    MoreVertical, Edit2, Trash2, X, ChevronRight,
    Save, Loader2, UserPlus, UserMinus, AlertTriangle
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import TacticalPitchView from './ui/TacticalPitchView'

// --- Logic Helpers (Moved from actions.ts) ---

type ServiceResponse<T = any> = {
    success: boolean
    data?: T
    error?: string
}

async function createOrUpdateCuadrilla(
    data: {
        id?: string,
        nombre: string,
        unit_id: string,
        turno_id: string,
        supervisor_id?: string,
        activo: boolean
    }
): Promise<ServiceResponse> {
    try {
        const dbPayload = {
            nombre: data.nombre,
            mine_site_id: data.unit_id || null,
            turno_actual_id: data.turno_id || null,
            supervisor_id: data.supervisor_id || null,
            activo: data.activo
        }

        if (data.id) {
            // Update
            const { error } = await supabase
                .from('cat_cuadrillas')
                .update(dbPayload)
                .eq('id', data.id)

            if (error) throw error
        } else {
            // Create
            const { error } = await supabase
                .from('cat_cuadrillas')
                .insert(dbPayload)

            if (error) throw error
        }
        return { success: true }
    } catch (error: any) {
        console.error('Error in createOrUpdateCuadrilla:', error)
        return { success: false, error: error.message }
    }
}

async function assignMember(
    cuadrillaId: string,
    empleadoId: string
): Promise<ServiceResponse> {
    try {
        // 1. Verificar si ya está en esta cuadrilla
        const { data: current } = await supabase
            .from('cat_cuadrillas_miembros')
            .select('id, cuadrilla_id')
            .eq('empleado_id', empleadoId)
            .maybeSingle()

        if (current) {
            if (current.cuadrilla_id === cuadrillaId) {
                return { success: false, error: 'El empleado ya pertenece a esta cuadrilla.' }
            }

            // 2. Cerrar/retirar asignación anterior
            await supabase
                .from('cat_cuadrillas_miembros')
                .delete()
                .eq('id', current.id)
        }

        // 3. Crear nueva asignación
        const { error: insertError } = await supabase
            .from('cat_cuadrillas_miembros')
            .insert({
                cuadrilla_id: cuadrillaId,
                empleado_id: empleadoId
            })

        if (insertError) throw insertError

        return { success: true }

    } catch (error: any) {
        console.error('Error in assignMember:', error)
        return { success: false, error: error.message }
    }
}

async function removeMember(miembroId: string): Promise<ServiceResponse> {
    try {
        const { error } = await supabase
            .from('cat_cuadrillas_miembros')
            .delete()
            .eq('id', miembroId)

        if (error) throw error

        return { success: true }
    } catch (error: any) {
        console.error('Error in removeMember:', error)
        return { success: false, error: error.message }
    }
}


// --- Tipos Componente ---
type Cuadrilla = {
    id: string
    nombre: string
    unit_id: string
    turno_id: string
    supervisor_id?: string | null
    activo: boolean
    // Joins
    org_units?: { nombre_unidad: string }
    cat_turnos?: { codigo: string, nombre: string }
    rh_employees?: { first_name: string, last_name: string } // Supervisor
    // Count
    miembros_count?: number
}

type Employee = {
    id: string
    first_name: string
    last_name: string
    employee_code: string
    puesto?: { nombre_puesto: string }
}

type Miembro = {
    id: string // ID de la asignacion
    empleado_id: string
    rh_employees: Employee
    fecha_inicio: string
}

// --- Componente Principal ---
export default function CuadrillasPage() {

    // Data Lists
    const [cuadrillas, setCuadrillas] = useState<Cuadrilla[]>([])
    const [turnos, setTurnos] = useState<any[]>([])
    const [unidades, setUnidades] = useState<any[]>([])

    // Estado UI
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<'TACTICO' | 'TARJETAS'>('TACTICO')
    const [filters, setFilters] = useState({ search: '', unit: '', turn: '' })
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showMembersModal, setShowMembersModal] = useState(false)

    // Selección
    const [selectedCuadrilla, setSelectedCuadrilla] = useState<Cuadrilla | null>(null)

    // --- Carga Inicial ---
    const fetchCatalogos = useCallback(async () => {
        const [turnosRes, minesRes] = await Promise.all([
            supabase.from('cat_turnos').select('*').eq('activo', true),
            supabase.from('mine_sites').select('id, nombre_mina').order('nombre_mina')
        ])
        if (turnosRes.data) setTurnos(turnosRes.data)
        if (minesRes.data) setUnidades(minesRes.data.map(m => ({ id: m.id, nombre_unidad: m.nombre_mina })))
    }, [])

    const fetchCuadrillas = useCallback(async () => {
        setLoading(true)
        let query = supabase
            .from('cat_cuadrillas')
            .select(`
                *,
                mine_sites (nombre_mina),
                cat_turnos (codigo, nombre),
                rh_employees (first_name, last_name)
            `)
            .eq('activo', true)
            .order('nombre')

        if (filters.unit) query = query.eq('mine_site_id', filters.unit)
        if (filters.turn) query = query.eq('turno_actual_id', filters.turn)
        if (filters.search) query = query.ilike('nombre', `%${filters.search}%`)

        const { data, error } = await query

        if (data) {
            // Simple count via separate query for active members
            const { data: activeMembers } = await supabase
                .from('cat_cuadrillas_miembros')
                .select('cuadrilla_id')

            const countMap: Record<string, number> = {}
            activeMembers?.forEach(m => {
                countMap[m.cuadrilla_id] = (countMap[m.cuadrilla_id] || 0) + 1
            })

            const processed = data.map((c: any) => ({
                ...c,
                unit_id: c.mine_site_id,
                turno_id: c.turno_actual_id,
                org_units: { nombre_unidad: c.mine_sites?.nombre_mina || 'Mina El Herrero' },
                miembros_count: countMap[c.id] || 0
            }))
            setCuadrillas(processed)
        }
        setLoading(false)
    }, [filters])

    useEffect(() => {
        fetchCatalogos()
    }, [fetchCatalogos])

    useEffect(() => {
        fetchCuadrillas()
    }, [fetchCuadrillas])


    // --- Handlers ---
    const handleEdit = (cuadrilla: Cuadrilla) => {
        setSelectedCuadrilla(cuadrilla)
        setShowCreateModal(true)
    }

    const handleManageMembers = (cuadrilla: Cuadrilla) => {
        setSelectedCuadrilla(cuadrilla)
        setShowMembersModal(true)
    }

    const handleSaveSuccess = () => {
        fetchCuadrillas()
        setShowCreateModal(false)
    }

    // --- Render ---
    return (
        <div className="space-y-6 pb-20">
            {/* Header nav */}
            <div className="mb-2">
                <Link href="/dashboard/catalogos" className="text-sm text-slate-400 hover:text-white flex items-center gap-1 transition-colors w-fit">
                    ← Volver a Catálogos
                </Link>
            </div>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <Users className="text-purple-500" size={32} />
                        Cuadrillas de Trabajo
                    </h1>
                    <p className="text-slate-400">Gestión de equipos operativos y asignación de personal.</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Switcher Táctico vs Tarjetas */}
                    <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl shadow-inner">
                        <button
                            onClick={() => setViewMode('TACTICO')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                viewMode === 'TACTICO'
                                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            🎯 Pizarra Táctica Operativa
                        </button>
                        <button
                            onClick={() => setViewMode('TARJETAS')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                viewMode === 'TARJETAS'
                                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            📋 Vista Tradicional
                        </button>
                    </div>

                    <button
                        onClick={() => window.print()}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-slate-700 shadow cursor-pointer html2pdf__ignore"
                    >
                        🖨️ Exportar PDF
                    </button>

                    <button
                        onClick={() => { setSelectedCuadrilla(null); setShowCreateModal(true) }}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-purple-900/20 cursor-pointer html2pdf__ignore"
                    >
                        <Plus size={16} />
                        Nueva Cuadrilla
                    </button>
                </div>
            </div>

            {/* Vista Condicional: Campo Táctico vs Tarjetas */}
            {viewMode === 'TACTICO' ? (
                <TacticalPitchView />
            ) : (
                <>
                    {/* Filters */}
                    <div className="flex flex-wrap gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800/50 backdrop-blur-md">
                        <div className="flex-1 min-w-[200px] relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar cuadrilla..."
                                value={filters.search}
                                onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2 text-white focus:border-purple-500 outline-none transition-colors"
                            />
                        </div>
                        <select
                            value={filters.unit}
                            onChange={e => setFilters(prev => ({ ...prev, unit: e.target.value }))}
                            className="bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-2 text-white focus:border-purple-500 outline-none"
                        >
                            <option value="">Todas las Unidades</option>
                            {unidades.map(u => <option key={u.id} value={u.id}>{u.nombre_unidad}</option>)}
                        </select>
                        <select
                            value={filters.turn}
                            onChange={e => setFilters(prev => ({ ...prev, turn: e.target.value }))}
                            className="bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-2 text-white focus:border-purple-500 outline-none"
                        >
                            <option value="">Todos los Turnos</option>
                            {turnos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                        </select>
                    </div>

                    {/* Grid */}
                    {loading ? (
                        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-500" size={40} /></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {cuadrillas.map(cuadrilla => (
                                <CuadrillaCard
                                    key={cuadrilla.id}
                                    cuadrilla={cuadrilla}
                                    onEdit={() => handleEdit(cuadrilla)}
                                    onMembers={() => handleManageMembers(cuadrilla)}
                                />
                            ))}
                            {cuadrillas.length === 0 && (
                                <div className="col-span-full text-center py-20 text-slate-500">
                                    No se encontraron cuadrillas con los filtros actuales.
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Modales */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreateEditModal
                        cuadrilla={selectedCuadrilla}
                        onClose={() => setShowCreateModal(false)}
                        onSuccess={handleSaveSuccess}
                        unidades={unidades}
                        turnos={turnos}
                    />
                )}
                {showMembersModal && selectedCuadrilla && (
                    <MembersModal
                        cuadrilla={selectedCuadrilla}
                        onClose={() => setShowMembersModal(false)}
                        onUpdate={() => fetchCuadrillas()} // Para actualizar contador
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

// --- Subcomponentes ---

function CuadrillaCard({ cuadrilla, onEdit, onMembers }: { cuadrilla: Cuadrilla, onEdit: () => void, onMembers: () => void }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group bg-slate-900/50 border border-slate-800/50 hover:border-purple-500/30 rounded-2xl p-6 relative overflow-hidden transition-all hover:bg-slate-800/50 hover:shadow-xl hover:shadow-purple-900/10"
        >
            <div className="flex justify-between items-start mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cuadrilla.activo ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                            {cuadrilla.activo ? 'ACTIVA' : 'INACTIVA'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-purple-300 border border-purple-500/20">
                            {cuadrilla.cat_turnos?.codigo}
                        </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1 group-hover:text-purple-300 transition-colors">{cuadrilla.nombre}</h3>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <HardHat size={14} className="text-amber-500" />
                        <span>{cuadrilla.org_units?.nombre_unidad}</span>
                    </div>
                </div>
                <div className="p-2 bg-slate-800 rounded-lg">
                    <Users size={20} className="text-purple-400" />
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-slate-950/50 rounded-xl border border-slate-800/50">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                        {cuadrilla.rh_employees ?
                            (cuadrilla.rh_employees.first_name[0] + cuadrilla.rh_employees.last_name[0]) :
                            'N/A'}
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 uppercase font-medium">Supervisor</div>
                        <div className="text-sm text-slate-200">
                            {cuadrilla.rh_employees ?
                                `${cuadrilla.rh_employees.first_name} ${cuadrilla.rh_employees.last_name}` :
                                'Sin Asignar'}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Miembros Activos</span>
                    <span className="font-bold text-white bg-purple-500/20 px-2 py-0.5 rounded text-purple-300">
                        {cuadrilla.miembros_count}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                        onClick={onMembers}
                        className="flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
                    >
                        <Users size={16} />
                        Personal
                    </button>
                    <button
                        onClick={onEdit}
                        className="flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
                    >
                        <Edit2 size={16} />
                        Editar
                    </button>
                </div>
            </div>
        </motion.div>
    )
}

// --- Modal de Creación/Edición ---

function CreateEditModal({ cuadrilla, onClose, onSuccess, unidades, turnos }: any) {
    const [formData, setFormData] = useState({
        nombre: cuadrilla?.nombre || '',
        unit_id: cuadrilla?.unit_id || '',
        turno_id: cuadrilla?.turno_id || '',
        supervisor_id: cuadrilla?.supervisor_id || '',
        activo: cuadrilla?.activo ?? true
    })
    const [submitting, setSubmitting] = useState(false)
    const [supervisors, setSupervisors] = useState<any[]>([])

    // Cargar supervisores (podría optimizarse para cargar solo al abrir o buscar)
    useEffect(() => {
        const fetchSups = async () => {
            const { data } = await supabase
                .from('rh_employees')
                .select('id, first_name, last_name, employee_code')
                .eq('status', 'ACTIVE')
                .order('first_name')
            if (data) setSupervisors(data)
        }
        fetchSups()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        const res = await createOrUpdateCuadrilla({ ...formData, id: cuadrilla?.id })
        setSubmitting(false)
        if (res.success) onSuccess()
        else alert('Error: ' + res.error)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]"
            >
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">
                        {cuadrilla ? 'Editar Cuadrilla' : 'Nueva Cuadrilla'}
                    </h2>
                    <button onClick={onClose}><X className="text-slate-500 hover:text-white" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Nombre de la Cuadrilla</label>
                        <input
                            required
                            type="text"
                            value={formData.nombre}
                            onChange={e => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-purple-500 outline-none"
                            placeholder="Ej. Cuadrilla 5 - Perforación"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Unidad</label>
                            <select
                                required
                                value={formData.unit_id}
                                onChange={e => setFormData(prev => ({ ...prev, unit_id: e.target.value }))}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-purple-500 outline-none"
                            >
                                <option value="">Seleccionar...</option>
                                {unidades.map((u: any) => <option key={u.id} value={u.id}>{u.nombre_unidad}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Turno</label>
                            <select
                                required
                                value={formData.turno_id}
                                onChange={e => setFormData(prev => ({ ...prev, turno_id: e.target.value }))}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-purple-500 outline-none"
                            >
                                <option value="">Seleccionar...</option>
                                {turnos.map((t: any) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Supervisor a Cargo</label>
                        <select
                            value={formData.supervisor_id}
                            onChange={e => setFormData(prev => ({ ...prev, supervisor_id: e.target.value }))}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-purple-500 outline-none"
                        >
                            <option value="">Sin supervisor asignado</option>
                            {supervisors.map((s: any) => (
                                <option key={s.id} value={s.id}>{s.employee_code} - {s.first_name} {s.last_name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <input
                            type="checkbox"
                            checked={formData.activo}
                            onChange={e => setFormData(prev => ({ ...prev, activo: e.target.checked }))}
                            id="activoCheck"
                            className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500"
                        />
                        <label htmlFor="activoCheck" className="text-white font-medium">Cuadrilla Activa</label>
                    </div>
                </form>

                <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50">
                    <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Cancelar</button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting && <Loader2 className="animate-spin" size={18} />}
                        Guardar
                    </button>
                </div>
            </motion.div>
        </div>
    )
}

// --- Modal de Gestión de Miembros ---

function MembersModal({ cuadrilla, onClose, onUpdate }: { cuadrilla: Cuadrilla, onClose: () => void, onUpdate: () => void }) {
    const [miembros, setMiembros] = useState<Miembro[]>([])
    const [loadingMiembros, setLoadingMiembros] = useState(true)

    // Search Panel State
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Employee[]>([])
    const [searching, setSearching] = useState(false)

    useEffect(() => {
        fetchMiembros()
    }, [])

    const fetchMiembros = async () => {
        setLoadingMiembros(true)
        const { data } = await supabase
            .from('cat_cuadrillas_miembros')
            .select(`
                id, created_at, empleado_id,
                rh_employees (id, first_name, last_name, employee_code, puesto_id)
            `)
            .eq('cuadrilla_id', cuadrilla.id)

        if (data) {
            setMiembros(data.map((m: any) => ({
                ...m,
                fecha_inicio: m.created_at
            })) as any)
        }
        setLoadingMiembros(false)
    }

    const handleSearch = async (query: string) => {
        setSearchQuery(query)
        if (query.length < 2) {
            setSearchResults([])
            return
        }

        setSearching(true)
        // Buscar empleados que NO estén ya en ESTA cuadrilla
        const { data } = await supabase
            .from('rh_employees')
            .select('id, first_name, last_name, employee_code')
            .ilike('first_name', `%${query}%`)
            .limit(10)

        if (data) {
            // Filtrar los que ya están en la lista actual
            const currentIds = new Set(miembros.map(m => m.empleado_id))
            setSearchResults(data.filter(d => !currentIds.has(d.id)))
        }
        setSearching(false)
    }

    const handleAddMember = async (emp: Employee) => {
        // Optimistic UI could be added here, but for safety we'll wait
        const res = await assignMember(cuadrilla.id, emp.id)
        if (res.success) {
            fetchMiembros()
            setSearchQuery('')
            setSearchResults([])
            onUpdate() // Update parent count
        } else {
            alert(res.error)
        }
    }

    const handleRemoveMember = async (miembroId: string) => {
        if (!confirm('¿Desvincular a este empleado de la cuadrilla?')) return
        const res = await removeMember(miembroId)
        if (res.success) {
            fetchMiembros()
            onUpdate()
        } else {
            alert(res.error)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col h-[85vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Users className="text-purple-500" />
                            Gestión de Personal
                        </h2>
                        <p className="text-slate-400 text-sm">
                            {cuadrilla.nombre} • {cuadrilla.cat_turnos?.nombre}
                        </p>
                    </div>
                    <button onClick={onClose}><X className="text-slate-500 hover:text-white" /></button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-800">

                    {/* Panel Izquierdo: Buscador y Disponibles */}
                    <div className="flex-1 flex flex-col p-4 bg-slate-900/30">
                        <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 tracking-wider">Agregar Empleados</h3>
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => handleSearch(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-purple-500 outline-none"
                                placeholder="Buscar por nombre..."
                                autoFocus
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                            {searching ? (
                                <div className="text-center py-10 text-slate-500"><Loader2 className="animate-spin inline mr-2" /> Buscando...</div>
                            ) : searchResults.length > 0 ? (
                                searchResults.map(emp => (
                                    <div key={emp.id} className="p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl flex justify-between items-center group transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                                                {emp.first_name[0]}{emp.last_name[0]}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-white">{emp.first_name} {emp.last_name}</div>
                                                <div className="text-xs text-slate-500">{emp.employee_code}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleAddMember(emp)}
                                            className="p-2 bg-purple-600/10 text-purple-400 hover:bg-purple-600 hover:text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <UserPlus size={18} />
                                        </button>
                                    </div>
                                ))
                            ) : searchQuery.length > 1 ? (
                                <div className="text-center py-10 text-slate-500">No se encontraron empleados.</div>
                            ) : (
                                <div className="text-center py-10 text-slate-600 text-sm">
                                    Escribe para buscar empleados <br /> y agregarlos a la cuadrilla.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Panel Derecho: Miembros Actuales */}
                    <div className="flex-1 flex flex-col p-4 bg-slate-950/30">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Miembros Actuales ({miembros.length})</h3>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                            {loadingMiembros ? (
                                <div className="text-center py-10"><Loader2 className="animate-spin text-purple-500 inline" /></div>
                            ) : miembros.length > 0 ? (
                                miembros.map(m => (
                                    <div key={m.id} className="p-3 bg-slate-800/80 border border-slate-700/50 rounded-xl flex justify-between items-center group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-900 to-indigo-900 flex items-center justify-center text-xs font-bold text-white border border-white/10">
                                                {m.rh_employees.first_name[0]}{m.rh_employees.last_name[0]}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-white">{m.rh_employees.first_name} {m.rh_employees.last_name}</div>
                                                <div className="text-xs text-slate-500 flex gap-2">
                                                    <span>{m.rh_employees.employee_code}</span>
                                                    <span className="text-slate-600">•</span>
                                                    <span>Desde {new Date(m.fecha_inicio).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveMember(m.id)}
                                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/50 rounded-lg transition-colors"
                                            title="Remover de cuadrilla"
                                        >
                                            <UserMinus size={18} />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
                                    <Users size={32} className="opacity-20" />
                                    <p>Esta cuadrilla no tiene miembros activos.</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </motion.div>
        </div>
    )
}
