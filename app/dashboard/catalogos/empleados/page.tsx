'use client'

import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { Plus, Edit2, Trash2, HardHat, UserCheck, Shield, MapPin, Briefcase, AlertTriangle } from 'lucide-react'
import { useCatalog } from '@/hooks/use-catalog'
import { supabase } from '@/lib/supabase'

// --- TYPES ---
type Puesto = { id: string, nombre: string, tipo_personal: string }
type Unit = { id: string, nombre_unidad: string }
type Mine = { id: string, nombre_mina: string, unit_id: string }
type Role = { id: string, nombre: string, categoria: string }
type PuestoRol = { puesto_id: string, rol_operativo_id: string }

export default function EmployeesPage() {
    // --- CATALOGS & DATA ---
    const { data: employees, loading, refresh } = useCatalog<any>('rh_employees', '*, cat_puestos(nombre, tipo_personal), org_units(nombre_unidad), cat_roles_operativos(nombre)')

    // Local State for Catalogs
    const [puestos, setPuestos] = useState<Puesto[]>([])
    const [units, setUnits] = useState<Unit[]>([])
    const [mines, setMines] = useState<Mine[]>([])
    const [roles, setRoles] = useState<Role[]>([])
    const [puestoRoles, setPuestoRoles] = useState<PuestoRol[]>([])
    const [cuadrillas, setCuadrillas] = useState<{ id: string, nombre: string }[]>([])

    // Assignments Map (EmployeeID -> Cuadrilla Name)
    const [assignments, setAssignments] = useState<Record<string, string>>({})

    // Load Catalogs on Mount
    useEffect(() => {
        const loadCatalogs = async () => {
            const [pReq, uReq, mReq, rReq, prReq, cReq] = await Promise.all([
                supabase.from('cat_puestos').select('id, nombre, tipo_personal').eq('activo', true),
                supabase.from('org_units').select('id, nombre_unidad'),
                supabase.from('mine_sites').select('id, nombre_mina, unit_id'),
                supabase.from('cat_roles_operativos').select('id, nombre, categoria').eq('activo', true),
                supabase.from('cat_puesto_roles').select('puesto_id, rol_operativo_id'),
                supabase.from('cat_cuadrillas').select('id, nombre').eq('activo', true).order('nombre')
            ])

            if (pReq.data) setPuestos(pReq.data)
            if (uReq.data) setUnits(uReq.data)
            if (mReq.data) setMines(mReq.data)
            if (rReq.data) setRoles(rReq.data)
            if (prReq.data) setPuestoRoles(prReq.data)
            if (cReq.data) setCuadrillas(cReq.data)

            // Load Active Cuadrillas
            const { data: activeAssignments } = await supabase
                .from('cat_cuadrillas_miembros')
                .select('empleado_id, cuadrilla_id, cat_cuadrillas(id, nombre)')

            if (activeAssignments) {
                const map: Record<string, string> = {}
                const idMap: Record<string, string> = {} // New map for ID lookup
                activeAssignments.forEach((a: any) => {
                    if (a.cat_cuadrillas?.nombre) {
                        map[a.empleado_id] = a.cat_cuadrillas.nombre
                        idMap[a.empleado_id] = a.cat_cuadrillas.id || a.cuadrilla_id // Store ID for form default value
                    }
                })
                setAssignments(map)
                setAssignmentsIds(idMap)
            }
        }
        loadCatalogs()
    }, [])

    // Helper state for IDs
    const [assignmentsIds, setAssignmentsIds] = useState<Record<string, string>>({})

    // --- FORM STATE ---
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [currentId, setCurrentId] = useState<string | null>(null)
    const [formError, setFormError] = useState<string | null>(null)

    const initialFormState = {
        first_name: '',
        last_name: '',
        employee_code: '',
        status: 'ACTIVE',
        puesto_id: '',
        unit_id: '',
        mine_id: '',
        rol_operativo_default_id: '',
        is_supervisor: false,
        is_jefe_mina: false,
        is_jefe: false, // New field
        cuadrilla_id: '' // New Field
    }

    const [formData, setFormData] = useState(initialFormState)

    // --- DERIVED STATE ---

    // Filtered Mines based on selected Unit
    const filteredMines = useMemo(() => {
        if (!formData.unit_id) return []
        return mines.filter(m => m.unit_id === formData.unit_id)
    }, [formData.unit_id, mines])

    // Filtered Roles based on selected Puesto (Compatibility Matrix)
    const permittedRoles = useMemo(() => {
        if (!formData.puesto_id) return []
        const allowedRoleIds = new Set(puestoRoles.filter(pr => pr.puesto_id === formData.puesto_id).map(pr => pr.rol_operativo_id))
        return roles.filter(r => allowedRoleIds.has(r.id))
    }, [formData.puesto_id, puestoRoles, roles])

    // Detect Tipo Personal from selected Puesto
    const selectedPuestoType = useMemo(() => {
        return puestos.find(p => p.id === formData.puesto_id)?.tipo_personal || '-'
    }, [formData.puesto_id, puestos])

    // --- HANDLERS ---

    const handleOpenCreate = () => {
        setIsEditMode(false)
        setFormData(initialFormState)
        setFormError(null)
        setIsModalOpen(true)
    }

    const handleOpenEdit = (emp: any) => {
        setIsEditMode(true)
        setCurrentId(emp.id)
        setFormError(null)
        setFormData({
            first_name: emp.first_name,
            last_name: emp.last_name,
            employee_code: emp.employee_code || '',
            status: emp.status || 'ACTIVE',
            puesto_id: emp.puesto_id || '',
            unit_id: emp.unit_id || '',
            mine_id: emp.mine_id || '',
            rol_operativo_default_id: emp.rol_operativo_default_id || '',
            is_supervisor: emp.is_supervisor || false,
            is_jefe_mina: emp.is_jefe_mina || false,
            is_jefe: emp.is_jefe || false,
            cuadrilla_id: assignmentsIds[emp.id] || '' // Load current assignment
        })
        setIsModalOpen(true)
    }

    const validateForm = (): boolean => {
        // Required Fields (Basic)
        if (!formData.first_name || !formData.last_name || !formData.puesto_id) {
            setFormError('Nombre, Apellidos y Puesto son obligatorios.')
            return false
        }

        // UNIQUE CODE check is done by DB constraint, we handle error on submit

        // COMMAND VALIDATION: Check constraint (Supervisor/Jefe -> Requires Unit)
        if ((formData.is_supervisor || formData.is_jefe_mina || formData.is_jefe) && !formData.unit_id) {
            setFormError('⚠️ REQUERIDO: Si es Supervisor, Jefe de Mina o Jefe de Área, debe asignar una UNIDAD obligatoriamente.')
            return false
        }

        return true
    }

    const handleSubmit = async () => {
        if (!validateForm()) return

        let error
        // Extract fields for rh_employees (exclude cuadrilla_id and legacy UI flags)
        const { cuadrilla_id, is_supervisor, is_jefe_mina, ...employeeData } = formData

        const payload = {
            ...employeeData,
            is_jefe: formData.is_jefe || formData.is_supervisor || formData.is_jefe_mina,
            unit_id: formData.unit_id || null,
            mine_id: formData.mine_id || null,
            role_id: formData.rol_operativo_default_id || null,
            rol_operativo_default_id: formData.rol_operativo_default_id || null
        }

        try {
            let empId = currentId

            if (isEditMode && currentId) {
                const { error: updateError } = await supabase
                    .from('rh_employees')
                    .update(payload)
                    .eq('id', currentId)
                if (updateError) throw updateError
            } else {
                const { data: newEmp, error: insertError } = await supabase
                    .from('rh_employees')
                    .insert([payload])
                    .select('id')
                    .single()

                if (insertError) throw insertError
                empId = newEmp.id
            }

            // --- MANEJO DE CUADRILLA (Si cambió) ---
            if (empId) {
                const currentCuadrillaId = assignmentsIds[empId] || ''
                if (cuadrilla_id !== currentCuadrillaId) {
                    // 1. Retirar anterior si existe
                    await supabase
                        .from('cat_cuadrillas_miembros')
                        .delete()
                        .eq('empleado_id', empId)

                    // 2. Crear nueva si se seleccionó una
                    if (cuadrilla_id) {
                        const { error: assignError } = await supabase
                            .from('cat_cuadrillas_miembros')
                            .insert({
                                cuadrilla_id: cuadrilla_id,
                                empleado_id: empId,
                                activo: true
                            })
                        if (assignError) throw assignError
                    }
                }
            }

            alert(isEditMode ? 'Empleado actualizado' : 'Empleado creado')
            setIsModalOpen(false)
            // Reload page to refresh assignments completely (simpler than complex state update)
            window.location.reload()

        } catch (err: any) {
            console.error(err)
            if (err.code === '23505') {
                setFormError('Error: El Código de Empleado ya existe.')
            } else if (err.code === '23514') {
                setFormError('Error de Validación: Regla de Mando no cumplida.')
            } else {
                setFormError('Error al guardar: ' + err.message)
            }
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Desactivar este empleado? (Status pasará a INACTIVE)')) return
        const { error } = await supabase.from('rh_employees').update({ status: 'INACTIVE' }).eq('id', id)
        if (!error) {
            refresh()
        } else {
            alert('Error: ' + error.message)
        }
    }

    // --- UI COMPONENTS ---

    // Status Badge
    const StatusBadge = ({ status }: { status: string }) => (
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${status === 'ACTIVE'
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-slate-700 text-slate-400'
            }`}>
            {status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
        </span>
    )

    // Role Badge
    const MandoBadge = ({ isJefeMina, isSup, isJefe }: { isJefeMina: boolean, isSup: boolean, isJefe: boolean }) => {
        return (
            <div className="flex flex-wrap gap-1">
                {isJefeMina && <span className="bg-purple-500/20 text-purple-300 text-[10px] px-2 py-0.5 rounded border border-purple-500/30 flex items-center gap-1"><Shield size={10} /> Jefe Mina</span>}
                {isSup && <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1"><UserCheck size={10} /> Supervisor</span>}
                {isJefe && <span className="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-0.5 rounded border border-blue-500/30 flex items-center gap-1"><Shield size={10} /> Jefe Área</span>}
            </div>
        )
    }

    return (
        <div>
            {/* --- HEADER --- */}
            <div className="mb-6">
                <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white flex items-center gap-1 transition-colors w-fit">
                    ← Volver al Dashboard
                </Link>
            </div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Directorio de Empleados</h1>
                    <p className="text-slate-400">Gestión de personal, asignación de roles y mandos.</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-amber-900/20"
                >
                    <Plus size={18} />
                    Nuevo Empleado
                </button>
            </div>

            {/* --- TABLE --- */}
            {loading ? (
                <div className="text-slate-500 animate-pulse">Cargando directorio...</div>
            ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden max-h-[650px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-950 text-slate-200 uppercase tracking-wider font-semibold sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4">Empleado</th>
                                <th className="px-6 py-4">Puesto / Mando</th>
                                <th className="px-6 py-4">Unidad</th>
                                <th className="px-6 py-4">Cuadrilla</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {employees.map((emp) => (
                                <tr key={emp.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${emp.is_jefe_mina ? 'bg-purple-900/50 text-purple-400' : 'bg-slate-800 text-slate-400'}`}>
                                                {emp.is_jefe_mina ? <Shield size={18} /> : <HardHat size={18} />}
                                            </div>
                                            <div>
                                                <div className="font-medium text-white text-base">{emp.first_name} {emp.last_name}</div>
                                                <div className="text-xs font-mono text-slate-500">{emp.employee_code || 'Sin Código'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex flex-col items-start gap-1">
                                            <span className="text-slate-300 font-medium">{emp.cat_puestos?.nombre}</span>
                                            {emp.cat_roles_operativos?.nombre && (
                                                <span className="text-emerald-400 text-xs px-2 py-0.5 bg-emerald-900/30 rounded border border-emerald-500/30">
                                                    {emp.cat_roles_operativos.nombre}
                                                </span>
                                            )}
                                            {emp.cat_roles_operativos?.nombre && (
                                                <span className="text-emerald-400 text-xs px-2 py-0.5 bg-emerald-900/30 rounded border border-emerald-500/30">
                                                    {emp.cat_roles_operativos.nombre}
                                                </span>
                                            )}
                                            <MandoBadge isJefeMina={emp.is_jefe_mina} isSup={emp.is_supervisor} isJefe={emp.is_jefe} />
                                        </div>
                                    </td>
                                    <td className="px-6 py-3">
                                        {emp.org_units?.nombre_unidad ? (
                                            <span className="flex items-center gap-1 text-slate-400">
                                                <MapPin size={12} /> {emp.org_units.nombre_unidad}
                                            </span>
                                        ) : (
                                            <span className="text-slate-600 italic">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3">
                                        {assignments[emp.id] ? (
                                            <span className="bg-slate-800 text-purple-300 text-xs px-2 py-1 rounded border border-purple-500/20 font-medium whitespace-nowrap">
                                                {assignments[emp.id]}
                                            </span>
                                        ) : (
                                            <span className="text-slate-600 text-xs italic">Sin Asignar</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3">
                                        <StatusBadge status={emp.status} />
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleOpenEdit(emp)} className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors" title="Editar">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(emp.id)} className="p-2 hover:bg-red-500/10 rounded text-slate-400 hover:text-red-500 transition-colors" title="Desactivar">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {employees.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        No hay empleados registrados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* --- MODAL FORM --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950 rounded-t-xl">
                            <h3 className="text-xl font-bold text-white">
                                {isEditMode ? 'Editar Perfil de Empleado' : 'Registrar Nuevo Empleado'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">

                            {/* ERROR ALERT */}
                            {formError && (
                                <div className="bg-red-950/50 border border-red-800 text-red-300 p-3 rounded-lg flex items-start gap-2 text-sm">
                                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                                    <span>{formError}</span>
                                </div>
                            )}

                            {/* SECCIÓN A: IDENTIDAD */}
                            <section>
                                <h4 className="text-sm uppercase tracking-wider text-amber-500 font-bold mb-4 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs">A</span>
                                    Identidad
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Nombre(s) *</label>
                                        <input type="text" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className="w-full bg-slate-800 border-slate-700 rounded p-2 text-white focus:border-amber-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Apellidos *</label>
                                        <input type="text" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className="w-full bg-slate-800 border-slate-700 rounded p-2 text-white focus:border-amber-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Código de Empleado (Único)</label>
                                        <input type="text" value={formData.employee_code} onChange={e => setFormData({ ...formData, employee_code: e.target.value })} className="w-full bg-slate-800 border-slate-700 rounded p-2 text-white font-mono focus:border-amber-500 outline-none" placeholder="COD-000" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Estado</label>
                                        <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full bg-slate-800 border-slate-700 rounded p-2 text-white focus:border-amber-500 outline-none">
                                            <option value="ACTIVE">Activo</option>
                                            <option value="INACTIVE">Inactivo (Baja)</option>
                                        </select>
                                    </div>
                                </div>
                            </section>

                            <div className="h-px bg-slate-800" />

                            {/* SECCIÓN B: CONTRATO */}
                            <section>
                                <h4 className="text-sm uppercase tracking-wider text-amber-500 font-bold mb-4 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs">B</span>
                                    Contrato RH
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-1">
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Puesto Oficial *</label>
                                        <select value={formData.puesto_id} onChange={e => setFormData({ ...formData, puesto_id: e.target.value, rol_operativo_default_id: '' })} className="w-full bg-slate-800 border-slate-700 rounded p-2 text-white focus:border-amber-500 outline-none">
                                            <option value="">Seleccione Puesto...</option>
                                            {puestos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Tipo de Personal</label>
                                        <div className="p-2 bg-black/20 rounded border border-slate-800 text-slate-300 text-sm">
                                            {selectedPuestoType}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <div className="h-px bg-slate-800" />

                            {/* SECCIÓN C: OPERACIÓN */}
                            <section>
                                <h4 className="text-sm uppercase tracking-wider text-amber-500 font-bold mb-4 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs">C</span>
                                    Operación y Mando
                                </h4>
                                <div className="col-span-2 bg-slate-800/50 p-3 rounded border border-slate-700/50 grid grid-cols-2 gap-4">
                                    {/* MANDO FLAGS */}
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input type="checkbox" checked={formData.is_supervisor} onChange={e => setFormData({ ...formData, is_supervisor: e.target.checked })} className="peer sr-only" />
                                            <div className="w-5 h-5 border-2 border-slate-600 rounded peer-checked:bg-amber-600 peer-checked:border-amber-600 transition-all"></div>
                                            <UserCheck size={12} className="absolute left-1 top-1 text-white opacity-0 peer-checked:opacity-100" />
                                        </div>
                                        <span className="text-sm font-medium text-slate-300 group-hover:text-amber-500 transition-colors">Es Supervisor</span>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input type="checkbox" checked={formData.is_jefe_mina} onChange={e => setFormData({ ...formData, is_jefe_mina: e.target.checked })} className="peer sr-only" />
                                            <div className="w-5 h-5 border-2 border-slate-600 rounded peer-checked:bg-purple-600 peer-checked:border-purple-600 transition-all"></div>
                                            <Shield size={12} className="absolute left-1 top-1 text-white opacity-0 peer-checked:opacity-100" />
                                        </div>
                                        <span className="text-sm font-medium text-slate-300 group-hover:text-purple-400 transition-colors">Es Jefe de Mina</span>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input type="checkbox" checked={formData.is_jefe} onChange={e => setFormData({ ...formData, is_jefe: e.target.checked })} className="peer sr-only" />
                                            <div className="w-5 h-5 border-2 border-slate-600 rounded peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all"></div>
                                            <Shield size={12} className="absolute left-1 top-1 text-white opacity-0 peer-checked:opacity-100" />
                                        </div>
                                        <span className="text-sm font-medium text-slate-300 group-hover:text-blue-400 transition-colors">Es Jefe de Área</span>
                                    </label>
                                </div>

                                {/* ROL OPERATIVO SELECTOR */}
                                <div className="mb-4">
                                    <label className="block text-xs font-medium text-slate-400 mb-1">
                                        Rol Operativo Específico (Campo) {permittedRoles.length > 0 && <span className="text-emerald-500 text-[10px] ml-2">Filtrado por matriz de Puestos</span>}
                                    </label>
                                    <select
                                        value={formData.rol_operativo_default_id}
                                        onChange={e => setFormData({ ...formData, rol_operativo_default_id: e.target.value })}
                                        className="w-full bg-slate-800 border-slate-700 rounded p-2 text-white focus:border-amber-500 outline-none"
                                        disabled={!formData.puesto_id}
                                    >
                                        <option value="">{formData.puesto_id ? 'Seleccione Rol...' : 'Seleccione Puesto primero'}</option>
                                        {permittedRoles.length > 0
                                            ? permittedRoles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)
                                            : roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>) // Fallback to all roles if no matrix
                                        }
                                    </select>
                                    <p className="text-[10px] text-slate-500 mt-1">Este será el rol por defecto en el pase de lista.</p>
                                </div>


                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">
                                            Unidad {(formData.is_supervisor || formData.is_jefe_mina || formData.is_jefe) && <span className="text-amber-500">* (Requerido por Mando)</span>}
                                        </label>
                                        <select value={formData.unit_id} onChange={e => setFormData({ ...formData, unit_id: e.target.value, mine_id: '' })} className={`w-full bg-slate-800 border rounded p-2 text-white outline-none ${(formData.is_supervisor || formData.is_jefe_mina) && !formData.unit_id ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-amber-500'}`}>
                                            <option value="">Seleccione Unidad...</option>
                                            {units.map(u => <option key={u.id} value={u.id}>{u.nombre_unidad}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Mina (Opcional)</label>
                                        <select value={formData.mine_id} onChange={e => setFormData({ ...formData, mine_id: e.target.value })} className="w-full bg-slate-800 border-slate-700 rounded p-2 text-white focus:border-amber-500 outline-none" disabled={!formData.unit_id}>
                                            <option value="">{formData.unit_id ? 'Seleccione Mina...' : 'Seleccione Unidad primero'}</option>
                                            {filteredMines.map(m => <option key={m.id} value={m.id}>{m.nombre_mina}</option>)}
                                        </select>
                                    </div>



                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-slate-400 mb-1">
                                            Asignar a Cuadrilla (Opcional)
                                        </label>
                                        <select
                                            value={formData.cuadrilla_id}
                                            onChange={e => setFormData({ ...formData, cuadrilla_id: e.target.value })}
                                            className="w-full bg-slate-800 border-slate-700 rounded p-2 text-white focus:border-amber-500 outline-none"
                                        >
                                            <option value="">Sin Asignación</option>
                                            {cuadrillas.map(c => (
                                                <option key={c.id} value={c.id}>{c.nombre}</option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-slate-500 mt-1">
                                            * Al cambiar esto, se cerrará cualquier asignación previa y se creará una nueva.
                                        </p>
                                    </div>
                                </div>
                            </section>

                        </div>

                        {/* Footer Buttons */}
                        <div className="p-6 border-t border-slate-800 bg-slate-950 rounded-b-xl flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-slate-400 hover:text-white transition-colors">
                                Cancelar
                            </button>
                            <button onClick={handleSubmit} className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-amber-900/20 flex items-center gap-2">
                                <Briefcase size={18} />
                                {isEditMode ? 'Guardar Cambios' : 'Registrar Empleado'}
                            </button>
                        </div>
                    </div>
                </div >
            )
            }
        </div >
    )
}
