'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Users, AlertTriangle, Search, CheckCircle2,
    X, ArrowRightLeft, Lock, Unlock,
    Pickaxe, HardHat, Drill, Truck, Wrench, MessageSquarePlus, ShieldCheck, Printer,
    Calendar, Sparkles, ChevronDown
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

interface Employee {
    id: string
    employee_code: string
    first_name: string
    last_name: string
    puesto?: { nombre: string }
    role?: { nombre: string, categoria: string }
    sueldo_diario_base?: number
}

interface MiembroCuadrilla {
    id: string
    empleado_id: string
    cuadrilla_id: string
    rh_employees: Employee
    zona?: 'AVANCE' | 'REZAGA' | 'ACARREO' | 'SERVICIOS'
}

interface Cuadrilla {
    id: string
    nombre: string
    codigo?: string
}

interface CrewHistoryNote {
    previous_crew: string
    worked_on: string
    updated_at: string
    updated_by: string
    zone?: 'AVANCE' | 'REZAGA' | 'ACARREO' | 'SERVICIOS'
}

const HISTORY_CONFIG_KEY = 'ops_crew_history_notes'
const WEEKS_HISTORY_KEY = 'ops_crew_history_by_week'

const PRESET_ACTIVITIES = [
    'Operó Scooptram ST-50 en rezaga de rebaje 13-480 (entrega equipo al 100%)',
    'Barrenación de avance y anclaje con Jumbo en frente 3-480',
    'Apoyo directo a Perforista en cambio de barrenas y cargado de frente',
    'Acarreo de mineral y tepetate hacia tolva en rampa 6-390',
    'Amacice manual, colocación de malla y servicios en nivel 9-400',
    'Relleno de rebaje y extensión de ventilación / tubería'
]

const WEEKS_LIST = [
    { id: 'SEMANA_38', label: 'Semana 38 (21 al 27 de Septiembre 2026) [Activa]' },
    { id: 'SEMANA_37', label: 'Semana 37 (14 al 20 de Septiembre 2026) [Histórico]' },
    { id: 'SEMANA_36', label: 'Semana 36 (07 al 13 de Septiembre 2026) [Histórico]' }
]

export default function TacticalPitchView() {
    const { sysRole } = useAuth()
    const canEdit = sysRole === 'SUPER_ADMIN' || sysRole === 'GERENTE' || sysRole === 'SUPERINTENDENTE'

    const [selectedWeek, setSelectedWeek] = useState<string>('SEMANA_38')
    const [cuadrillas, setCuadrillas] = useState<Cuadrilla[]>([])
    const [selectedCuadrillaId, setSelectedCuadrillaId] = useState<string>('')
    const [miembros, setMiembros] = useState<MiembroCuadrilla[]>([])
    const [bancoPersonal, setBancoPersonal] = useState<Employee[]>([])
    const [globalAssignments, setGlobalAssignments] = useState<Record<string, { cuadrilla_id: string, cuadrilla_nombre: string }>>({})
    const [historyNotes, setHistoryNotes] = useState<Record<string, CrewHistoryNote>>({})

    const [searchTerm, setSearchTerm] = useState('')
    const [areaFilter, setAreaFilter] = useState<string>('TODAS')
    const [availabilityFilter, setAvailabilityFilter] = useState<'TODOS' | 'LIBRES' | 'OTRA_CUADRILLA'>('TODOS')
    const [loading, setLoading] = useState(true)
    const [draggedEmployeeId, setDraggedEmployeeId] = useState<string | null>(null)
    const [actionMessage, setActionMessage] = useState<string | null>(null)

    // Modal para registrar lo que trabajó en la cuadrilla anterior
    const [transferModal, setTransferModal] = useState<{
        open: boolean
        emp: Employee | null
        targetZone: 'AVANCE' | 'REZAGA' | 'ACARREO' | 'SERVICIOS'
        previousCrewName: string
        workedOnComment: string
        isExistingMemberEdit: boolean
    }>({
        open: false,
        emp: null,
        targetZone: 'REZAGA',
        previousCrewName: '',
        workedOnComment: '',
        isExistingMemberEdit: false
    })

    useEffect(() => {
        loadInitialData()
    }, [])

    useEffect(() => {
        if (selectedCuadrillaId) {
            loadMiembrosCuadrilla(selectedCuadrillaId)
        }
    }, [selectedCuadrillaId, selectedWeek])

    const loadInitialData = async () => {
        setLoading(true)

        // 1. Cargar las 5 Cuadrillas Oficiales Activas de Mina
        const { data: cData } = await supabase
            .from('cat_cuadrillas')
            .select('id, nombre, codigo')
            .eq('activo', true)
            .order('nombre')

        const cuadMap: Record<string, string> = {}
        if (cData && cData.length > 0) {
            setCuadrillas(cData)
            cData.forEach(c => { cuadMap[c.id] = c.nombre })
            setSelectedCuadrillaId(cData[0].id)
        }

        // 2. Cargar Todo el Personal con su Puesto Oficial
        const { data: eData } = await supabase
            .from('rh_employees')
            .select(`
                id, employee_code, first_name, last_name, sueldo_diario_base,
                puesto:cat_puestos(nombre)
            `)
            .eq('status', 'ACTIVO')
            .order('employee_code')

        if (eData) {
            setBancoPersonal(eData as any)
        }

        await refreshGlobalAssignments(cuadMap)

        // 3. Cargar notas de historial desde sys_config
        const { data: histData } = await supabase
            .from('sys_config')
            .select('value_json')
            .eq('key_name', HISTORY_CONFIG_KEY)
            .maybeSingle()

        if (histData?.value_json && typeof histData.value_json === 'object') {
            setHistoryNotes(histData.value_json as Record<string, CrewHistoryNote>)
        }

        setLoading(false)
    }

    const refreshGlobalAssignments = async (cuadNameMap?: Record<string, string>) => {
        const mapToUse = cuadNameMap || cuadrillas.reduce((acc, c) => ({ ...acc, [c.id]: c.nombre }), {} as Record<string, string>)
        const { data: allM } = await supabase
            .from('cat_cuadrillas_miembros')
            .select('id, empleado_id, cuadrilla_id')

        const gMap: Record<string, { cuadrilla_id: string, cuadrilla_nombre: string }> = {}
        if (allM) {
            allM.forEach((m: any) => {
                gMap[m.empleado_id] = {
                    cuadrilla_id: m.cuadrilla_id,
                    cuadrilla_nombre: mapToUse[m.cuadrilla_id] || 'Otra Cuadrilla'
                }
            })
        }
        setGlobalAssignments(gMap)
    }

    const inferZoneFromPosition = (puestoNombre?: string): 'AVANCE' | 'REZAGA' | 'ACARREO' | 'SERVICIOS' => {
        const p = (puestoNombre || '').toUpperCase()
        if (p.includes('JUMBERO') || p.includes('PERFORISTA')) return 'AVANCE'
        if (p.includes('PALA') || p.includes('SCOOP') || p.includes('PALERO')) return 'REZAGA'
        if (p.includes('CHOFER') || p.includes('CAMION')) return 'ACARREO'
        return 'SERVICIOS'
    }

    const loadMiembrosCuadrilla = async (cuadId: string) => {
        const { data: mData } = await supabase
            .from('cat_cuadrillas_miembros')
            .select(`
                id, empleado_id, cuadrilla_id,
                rh_employees (
                    id, employee_code, first_name, last_name, sueldo_diario_base,
                    puesto:cat_puestos(nombre)
                )
            `)
            .eq('cuadrilla_id', cuadId)

        if (mData) {
            const seen = new Set<string>()
            const uniqueRows = mData.filter((m: any) => {
                if (seen.has(m.empleado_id)) return false
                seen.add(m.empleado_id)
                return true
            })

            const mapped = uniqueRows.map((m: any) => {
                const savedZone = historyNotes[m.empleado_id]?.zone
                const zona = savedZone || inferZoneFromPosition(m.rh_employees?.puesto?.nombre)
                return { ...m, zona }
            })
            setMiembros(mapped)
        }
    }

    const saveHistoryNoteToDb = async (empId: string, note: CrewHistoryNote) => {
        const updated = { ...historyNotes, [empId]: note }
        setHistoryNotes(updated)
        await supabase.from('sys_config').upsert({
            key_name: HISTORY_CONFIG_KEY,
            value_json: updated,
            description: 'Bitácora de trabajo realizado en cuadrilla anterior por minero'
        }, { onConflict: 'key_name' })
    }

    // Drag handlers
    const handleDragStart = (e: React.DragEvent, empId: string) => {
        if (!canEdit) {
            e.preventDefault()
            return
        }
        setDraggedEmployeeId(empId)
        e.dataTransfer.setData('text/plain', empId)
    }

    const handleDragEnd = () => {
        setDraggedEmployeeId(null)
    }

    const initiateAssignOrTransfer = (emp: Employee, targetZone: 'AVANCE' | 'REZAGA' | 'ACARREO' | 'SERVICIOS') => {
        if (!canEdit) return

        const existsInCurrent = miembros.find(m => m.empleado_id === emp.id)
        if (existsInCurrent) {
            if (existsInCurrent.zona === targetZone) {
                triggerActionNotice(`⚠️ Regla Activa: ${emp.first_name} ${emp.last_name} ya pertenece a esta cuadrilla y sección.`)
                return
            }
            setMiembros(prev => prev.map(m => m.empleado_id === emp.id ? { ...m, zona: targetZone } : m))
            const existingNote = historyNotes[emp.id]
            if (existingNote) {
                saveHistoryNoteToDb(emp.id, { ...existingNote, zone: targetZone })
            }
            triggerActionNotice(`✅ Minero reubicado a la sección ${targetZone}`)
            return
        }

        const prevAssignment = globalAssignments[emp.id]
        const existingHist = historyNotes[emp.id]

        setTransferModal({
            open: true,
            emp,
            targetZone,
            previousCrewName: prevAssignment?.cuadrilla_nombre || existingHist?.previous_crew || 'Sin Cuadrilla Previa (Reserva)',
            workedOnComment: existingHist?.worked_on || PRESET_ACTIVITIES[0],
            isExistingMemberEdit: false
        })
    }

    const handleDropOnZone = async (e: React.DragEvent, targetZone: 'AVANCE' | 'REZAGA' | 'ACARREO' | 'SERVICIOS') => {
        e.preventDefault()
        if (!canEdit) return
        const empId = e.dataTransfer.getData('text/plain') || draggedEmployeeId
        setDraggedEmployeeId(null)
        if (!empId || !selectedCuadrillaId) return

        const emp = bancoPersonal.find(b => b.id === empId) || miembros.find(m => m.empleado_id === empId)?.rh_employees
        if (!emp) return

        initiateAssignOrTransfer(emp, targetZone)
    }

    const confirmTransferAndSave = async (e: React.FormEvent) => {
        e.preventDefault()
        const { emp, targetZone, previousCrewName, workedOnComment, isExistingMemberEdit } = transferModal
        if (!emp || !selectedCuadrillaId) return

        const newNote: CrewHistoryNote = {
            previous_crew: previousCrewName.trim() || 'Cuadrilla Anterior',
            worked_on: workedOnComment.trim() || 'Operación general en turno previo',
            updated_at: new Date().toISOString(),
            updated_by: sysRole || 'SUPERINTENDENTE',
            zone: targetZone
        }

        if (isExistingMemberEdit) {
            await saveHistoryNoteToDb(emp.id, newNote)
            setTransferModal(prev => ({ ...prev, open: false }))
            triggerActionNotice(`✅ Bitácora de cuadrilla anterior actualizada para ${emp.first_name} ${emp.last_name}`)
            return
        }

        // Cero duplicados: retirar de cualquier cuadrilla previa
        await supabase.from('cat_cuadrillas_miembros').delete().eq('empleado_id', emp.id)

        const { data, error } = await supabase
            .from('cat_cuadrillas_miembros')
            .insert({
                cuadrilla_id: selectedCuadrillaId,
                empleado_id: emp.id,
                activo: true
            })
            .select(`
                id, empleado_id, cuadrilla_id,
                rh_employees (
                    id, employee_code, first_name, last_name, sueldo_diario_base,
                    puesto:cat_puestos(nombre)
                )
            `)
            .single()

        if (!error && data) {
            await saveHistoryNoteToDb(emp.id, newNote)
            await refreshGlobalAssignments()
            setMiembros(prev => [...prev.filter(m => m.empleado_id !== emp.id), { ...data as any, zona: targetZone }])
            setTransferModal(prev => ({ ...prev, open: false }))
            triggerActionNotice(`✅ ${emp.first_name} ${emp.last_name} asignado a ${targetZone}`)
        } else {
            alert('Error al asignar: ' + (error?.message || 'Error desconocido'))
        }
    }

    const handleRemoveFromPitch = async (empleadoId: string) => {
        if (!canEdit) return
        const miembro = miembros.find(m => m.empleado_id === empleadoId)
        if (!miembro) return

        const activeCuadrillaName = cuadrillas.find(c => c.id === selectedCuadrillaId)?.nombre || 'Cuadrilla Anterior'

        const { error } = await supabase
            .from('cat_cuadrillas_miembros')
            .delete()
            .eq('cuadrilla_id', selectedCuadrillaId)
            .eq('empleado_id', empleadoId)

        if (!error) {
            const prevNote = historyNotes[empleadoId]
            await saveHistoryNoteToDb(empleadoId, {
                previous_crew: activeCuadrillaName,
                worked_on: prevNote?.worked_on || `Trabajó en ${miembro.zona} de ${activeCuadrillaName}`,
                updated_at: new Date().toISOString(),
                updated_by: sysRole || 'SUPERINTENDENTE'
            })
            setMiembros(prev => prev.filter(m => m.empleado_id !== empleadoId))
            await refreshGlobalAssignments()
            triggerActionNotice('Trabajador retirado de la cuadrilla (Queda disponible en banco de personal)')
        }
    }

    const openEditNoteModal = (miembro: MiembroCuadrilla) => {
        const emp = miembro.rh_employees
        const existingHist = historyNotes[emp.id]
        setTransferModal({
            open: true,
            emp,
            targetZone: miembro.zona || 'REZAGA',
            previousCrewName: existingHist?.previous_crew || 'Cuadrilla Anterior',
            workedOnComment: existingHist?.worked_on || '',
            isExistingMemberEdit: true
        })
    }

    const triggerActionNotice = (msg: string) => {
        setActionMessage(msg)
        setTimeout(() => setActionMessage(null), 4000)
    }

    // Filtrar personal disponible
    const miembrosIds = new Set(miembros.map(m => m.empleado_id))
    const personalDisponible = bancoPersonal.filter(emp => {
        if (miembrosIds.has(emp.id)) return false

        const otherCrew = globalAssignments[emp.id]
        const isFree = !otherCrew

        if (availabilityFilter === 'LIBRES' && !isFree) return false
        if (availabilityFilter === 'OTRA_CUADRILLA' && isFree) return false

        const matchesSearch = `${emp.first_name} ${emp.last_name} ${emp.employee_code} ${emp.puesto?.nombre}`.toLowerCase().includes(searchTerm.toLowerCase())
        if (!matchesSearch) return false

        const pUpper = (emp.puesto?.nombre || '').toUpperCase()
        if (areaFilter === 'PERFORACION') return pUpper.includes('JUMB') || pUpper.includes('PERF')
        if (areaFilter === 'REZAGA') return pUpper.includes('PALA') || pUpper.includes('SCOOP') || pUpper.includes('PALERO')
        if (areaFilter === 'ACARREO') return pUpper.includes('CHOFER') || pUpper.includes('CAMION')
        if (areaFilter === 'SERVICIOS') return pUpper.includes('SOLD') || pUpper.includes('SOTA') || pUpper.includes('PEON') || pUpper.includes('SCALE') || pUpper.includes('MOLIN')
        return true
    })

    const personalAvance = miembros.filter(m => m.zona === 'AVANCE')
    const personalRezaga = miembros.filter(m => m.zona === 'REZAGA')
    const personalAcarreo = miembros.filter(m => m.zona === 'ACARREO')
    const personalServicios = miembros.filter(m => m.zona === 'SERVICIOS')

    const activeCuadrilla = cuadrillas.find(c => c.id === selectedCuadrillaId)

    // Detectar si el empleado arrastrado es operador de Scoop
    const draggedEmp = bancoPersonal.find(b => b.id === draggedEmployeeId) || miembros.find(m => m.empleado_id === draggedEmployeeId)?.rh_employees
    const isDraggedScoop = draggedEmp && ((draggedEmp.puesto?.nombre || '').toUpperCase().includes('PALA') || (draggedEmp.puesto?.nombre || '').toUpperCase().includes('SCOOP') || (draggedEmp.puesto?.nombre || '').toUpperCase().includes('PALERO'))

    return (
        <div className="space-y-4">
            {/* OVERLAY ANIMADO AL DESPLAZAR UN OPERADOR DE SCOOPTRAM */}
            <AnimatePresence>
                {draggedEmployeeId && isDraggedScoop && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.85, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85, y: 20 }}
                        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 p-4 rounded-2xl shadow-2xl border-2 border-slate-950 flex items-center gap-4 pointer-events-none"
                    >
                        {/* Gráfico animado del Scooptram con cucharon basculante */}
                        <div className="relative w-16 h-12 bg-slate-950 rounded-xl flex items-center justify-center overflow-hidden border border-amber-300">
                            {/* Faros delanteros */}
                            <motion.div
                                animate={{ opacity: [0.6, 1, 0.6] }}
                                transition={{ repeat: Infinity, duration: 0.8 }}
                                className="absolute top-2 right-1 w-2.5 h-2.5 bg-yellow-300 rounded-full shadow-[0_0_8px_#fde047]"
                            />
                            {/* Cucharón oscilante */}
                            <motion.div
                                animate={{ rotate: [0, -22, 0], y: [0, -4, 0] }}
                                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                                className="text-xl"
                            >
                                🚜
                            </motion.div>
                            {/* Orugas / Ruedas */}
                            <motion.div
                                animate={{ x: [-2, 2, -2] }}
                                transition={{ repeat: Infinity, duration: 0.3 }}
                                className="absolute bottom-0 text-[10px]"
                            >
                                ⚙️⚙️
                            </motion.div>
                        </div>

                        <div>
                            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-950">
                                <span className="animate-ping inline-block w-2 h-2 rounded-full bg-slate-950" />
                                🚜 DESPLAZANDO SCOOPTRAM ST-50
                            </div>
                            <p className="text-xs font-bold text-slate-900 mt-0.5">
                                Operador: <u>{draggedEmp?.first_name} {draggedEmp?.last_name}</u>
                            </p>
                            <p className="text-[10px] font-semibold text-slate-800">
                                Suelta en Línea de Rezaga para asignar al acarreo de mineral
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Top Bar: Selector de Cuadrilla, Historial por Semana y Autoridad */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border-2 border-slate-800 p-4 rounded-2xl shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                        <Pickaxe size={22} />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-black text-white">
                                Pizarra Táctica Operativa de Cuadrillas Oficiales
                            </h2>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-[10px] font-black uppercase flex items-center gap-1">
                                <ShieldCheck size={12} /> Cero Duplicados
                            </span>
                        </div>
                        <p className="text-xs text-slate-400">
                            Cuadrillas reales sincronizadas de nómina • Animación en Perforistas y Operadores de Scooptram en movimiento.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Selector de Historial por Semana */}
                    <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-700">
                        <Calendar size={14} className="text-amber-500" />
                        <span className="text-xs font-black text-slate-400 uppercase">Semana:</span>
                        <select
                            value={selectedWeek}
                            onChange={e => {
                                setSelectedWeek(e.target.value)
                                triggerActionNotice(`📅 Visualizando conformación de ${e.target.options[e.target.selectedIndex].text}`)
                            }}
                            className="bg-transparent text-white font-black text-xs outline-none cursor-pointer"
                        >
                            {WEEKS_LIST.map(w => (
                                <option key={w.id} value={w.id} className="bg-slate-900 text-white font-bold">
                                    {w.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Selector de Cuadrilla Activa */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-400 uppercase">Cuadrilla:</span>
                        <select
                            value={selectedCuadrillaId}
                            onChange={e => setSelectedCuadrillaId(e.target.value)}
                            className="bg-slate-950 border-2 border-slate-700 text-amber-500 font-black text-sm rounded-xl px-4 py-2 outline-none focus:border-amber-500 shadow-inner cursor-pointer"
                        >
                            {cuadrillas.map(c => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                        </select>
                    </div>

                    {/* Badge de Autoridad */}
                    <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-black ${
                        canEdit
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500'
                            : 'bg-amber-500/15 border-amber-500/40 text-amber-500'
                    }`}>
                        {canEdit ? (
                            <>
                                <Unlock size={14} />
                                <span>Mando Habilitado ({sysRole})</span>
                            </>
                        ) : (
                            <>
                                <Lock size={14} />
                                <span>Solo Lectura</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Notification Toast */}
            <AnimatePresence>
                {actionMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-emerald-500 text-slate-950 px-5 py-2.5 rounded-xl text-xs font-black shadow-lg flex items-center gap-2 w-fit mx-auto border border-emerald-600"
                    >
                        <CheckCircle2 size={16} />
                        {actionMessage}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Layout Principal: Personal disponible a la izquierda, Pizarra Operativa a la derecha */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* PANEL DE PERSONAL DISPONIBLE / EN OTRAS CUADRILLAS (4 cols) */}
                <div className="lg:col-span-4 bg-slate-900 border-2 border-slate-800 rounded-2xl p-4 flex flex-col h-[790px] html2pdf__ignore">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div>
                            <h3 className="text-sm font-black text-white flex items-center gap-2">
                                <Users size={16} className="text-amber-500" />
                                Fuerza Operativa en Mina ({personalDisponible.length})
                            </h3>
                            <span className="text-[11px] text-slate-400 font-semibold">
                                Arrastra o pulsa <strong>+ Asignar</strong> para transferir
                            </span>
                        </div>
                    </div>

                    {/* Buscador & Filtros */}
                    <div className="mt-3 space-y-2.5">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-3 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, puesto o clave..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                            />
                        </div>

                        {/* Filtro de Disponibilidad */}
                        <div className="grid grid-cols-3 gap-1">
                            {[
                                { id: 'TODOS', label: 'Todos' },
                                { id: 'LIBRES', label: '🟢 Libres' },
                                { id: 'OTRA_CUADRILLA', label: '🔄 En Otra Cuad.' }
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setAvailabilityFilter(f.id as any)}
                                    className={`px-2 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer border ${
                                        availabilityFilter === f.id
                                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {/* Filtros de Especialidad Operativa */}
                        <div className="flex flex-wrap gap-1">
                            {[
                                { id: 'TODAS', label: 'Todas' },
                                { id: 'PERFORACION', label: 'Perforación / Jumbo' },
                                { id: 'REZAGA', label: 'Rezaga / Scoop' },
                                { id: 'ACARREO', label: 'Acarreo' },
                                { id: 'SERVICIOS', label: 'Servicios' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setAreaFilter(tab.id)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                                        areaFilter === tab.id
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-slate-800 text-slate-400 hover:text-white'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Lista de Mineros Arrastrables */}
                    <div className="mt-3 flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
                        {personalDisponible.map(emp => {
                            const currentCrew = globalAssignments[emp.id]
                            const prevHistory = historyNotes[emp.id]
                            const suggestedZone = inferZoneFromPosition(emp.puesto?.nombre)
                            const pUpper = (emp.puesto?.nombre || '').toUpperCase()
                            const isAyudante = pUpper.includes('AYUDANTE')
                            const isPerforista = (pUpper.includes('JUMB') || pUpper.includes('PERF')) && !isAyudante
                            const isScoop = pUpper.includes('PALA') || pUpper.includes('SCOOP') || pUpper.includes('PALERO')

                            return (
                                <div
                                    key={emp.id}
                                    draggable={canEdit}
                                    onDragStart={e => handleDragStart(e, emp.id)}
                                    onDragEnd={handleDragEnd}
                                    className={`p-3 rounded-xl border-2 transition-all flex flex-col gap-2 ${
                                        canEdit
                                            ? 'bg-slate-950 border-slate-800 hover:border-amber-500 cursor-grab active:cursor-grabbing shadow-sm'
                                            : 'bg-slate-950/60 border-slate-800/60 opacity-80 cursor-not-allowed'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center font-mono text-[10px] font-black text-amber-500 shrink-0">
                                                {isPerforista ? (
                                                    <Drill size={14} className="text-amber-500" />
                                                ) : isAyudante ? (
                                                    <Wrench size={14} className="text-sky-400" />
                                                ) : isScoop ? (
                                                    <span className="text-xs">🚜</span>
                                                ) : (
                                                    <HardHat size={14} className="text-slate-400" />
                                                )}
                                                <span>{emp.employee_code.replace('EMP-', '')}</span>
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-white text-xs font-black truncate">
                                                    {emp.first_name} {emp.last_name}
                                                </div>
                                                <div className="text-[10px] text-slate-400 truncate font-bold">
                                                    {emp.puesto?.nombre || 'OPERATIVO MINA'}
                                                </div>
                                            </div>
                                        </div>

                                        {canEdit && (
                                            <button
                                                type="button"
                                                onClick={() => initiateAssignOrTransfer(emp, suggestedZone)}
                                                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black uppercase shrink-0 shadow cursor-pointer"
                                                title="Asignar a esta cuadrilla"
                                            >
                                                + Asignar
                                            </button>
                                        )}
                                    </div>

                                    {/* Indicadores de Rol / Puesto Específico */}
                                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                        {isAyudante ? (
                                            <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/40 font-black flex items-center gap-1">
                                                🤝 AYUDANTE DE PERFORISTA
                                            </span>
                                        ) : isPerforista ? (
                                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 font-black flex items-center gap-1">
                                                ⚡ PERFORISTA OFICIAL
                                            </span>
                                        ) : isScoop ? (
                                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-black flex items-center gap-1">
                                                🚜 OPERADOR SCOOPTRAM
                                            </span>
                                        ) : null}

                                        {currentCrew ? (
                                            <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30 font-black flex items-center gap-1">
                                                <ArrowRightLeft size={10} /> En: {currentCrew.cuadrilla_nombre}
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 font-black">
                                                🟢 Libre
                                            </span>
                                        )}
                                    </div>

                                    {prevHistory?.worked_on && (
                                        <div className="text-[10px] bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 text-slate-300 leading-snug">
                                            <strong className="text-amber-500">Ant. ({prevHistory.previous_crew}):</strong> {prevHistory.worked_on}
                                        </div>
                                    )}
                                </div>
                            )
                        })}

                        {personalDisponible.length === 0 && (
                            <div className="text-center py-12 text-slate-500 text-xs font-bold">
                                No hay trabajadores disponibles con este filtro.
                            </div>
                        )}
                    </div>

                    {/* Zona para desasignar arrastrando */}
                    {canEdit && (
                        <div
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => {
                                e.preventDefault()
                                const empId = e.dataTransfer.getData('text/plain')
                                if (empId) handleRemoveFromPitch(empId)
                            }}
                            className="mt-3 border-2 border-dashed border-rose-500/40 hover:border-rose-500 bg-rose-500/10 rounded-xl p-3 text-center text-xs text-rose-500 font-black transition-all cursor-pointer"
                        >
                            🗑️ Arrastra aquí a un trabajador para retirarlo de esta cuadrilla
                        </div>
                    )}
                </div>

                {/* PIZARRA TÁCTICA DE OPERACIONES (8 cols) */}
                <div className="lg:col-span-8 bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl flex flex-col justify-between min-h-[790px]">

                    {/* Header de la Cuadrilla Activa */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b-2 border-slate-800 mb-3">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-mono font-black uppercase bg-amber-500 text-slate-950 px-3.5 py-1 rounded-full shadow">
                                {activeCuadrilla?.nombre || 'CUADRILLA 1'}
                            </span>
                            <span className="text-xs font-bold text-slate-400">
                                Fuerza Asignada: <strong className="text-white">{miembros.length} Mineros</strong>
                            </span>
                            <span className="text-xs font-mono text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-lg font-bold">
                                {WEEKS_LIST.find(w => w.id === selectedWeek)?.label}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-xs font-mono font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-xl">
                                Sueldo Base Turno: <strong>${miembros.reduce((acc, curr) => acc + (curr.rh_employees?.sueldo_diario_base || 0), 0).toLocaleString()} MXN</strong>
                            </div>
                            <button
                                onClick={() => window.print()}
                                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer html2pdf__ignore"
                            >
                                <Printer size={14} /> PDF Cuadrilla
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4 flex-1 flex flex-col justify-between">
                        {/* SECCIÓN 1: FRENTES DE AVANCE (Perforación, Jumbos, Ayudantes) */}
                        <div
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => handleDropOnZone(e, 'AVANCE')}
                            className="relative bg-slate-950/70 border-2 border-amber-500/40 rounded-2xl p-3.5 transition-all hover:border-amber-500 shadow-md"
                        >
                            <div className="flex items-center justify-between mb-2.5 px-1">
                                <span className="text-xs font-black uppercase tracking-wider text-amber-500 flex items-center gap-2">
                                    <Drill size={16} />
                                    1. FRENTE DE AVANCE Y PERFORACIÓN (PERFORISTAS Y AYUDANTES DE PERFORISTA)
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono font-black bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-800">
                                    {personalAvance.length} asignados
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 min-h-[90px] items-start p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                                {personalAvance.map(m => (
                                    <MinerTacticalCard
                                        key={m.id}
                                        miembro={m}
                                        canEdit={canEdit}
                                        historyNote={historyNotes[m.empleado_id]}
                                        onDragStart={e => handleDragStart(e, m.empleado_id)}
                                        onDragEnd={handleDragEnd}
                                        onEditNote={() => openEditNoteModal(m)}
                                        onRemove={() => handleRemoveFromPitch(m.empleado_id)}
                                    />
                                ))}
                                {personalAvance.length === 0 && (
                                    <div className="col-span-full text-slate-500 text-xs font-semibold italic px-3 py-4 text-center">
                                        Arrastra aquí a Jumberos, Perforistas o Ayudantes de Perforista encargados del frente.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* SECCIÓN 2: LÍNEA DE REZAGA (Scooptrams / Palas Mecánicas) */}
                        <div
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => handleDropOnZone(e, 'REZAGA')}
                            className="relative bg-slate-950/70 border-2 border-emerald-500/40 rounded-2xl p-3.5 transition-all hover:border-emerald-500 shadow-md"
                        >
                            <div className="flex items-center justify-between mb-2.5 px-1">
                                <span className="text-xs font-black uppercase tracking-wider text-emerald-500 flex items-center gap-2">
                                    <Pickaxe size={16} />
                                    2. LÍNEA DE REZAGA (OPERADORES DE SCOOPTRAM / PALA MECÁNICA)
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono font-black bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-800">
                                    {personalRezaga.length} asignados
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 min-h-[90px] items-start p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                                {personalRezaga.map(m => (
                                    <MinerTacticalCard
                                        key={m.id}
                                        miembro={m}
                                        canEdit={canEdit}
                                        historyNote={historyNotes[m.empleado_id]}
                                        onDragStart={e => handleDragStart(e, m.empleado_id)}
                                        onDragEnd={handleDragEnd}
                                        onEditNote={() => openEditNoteModal(m)}
                                        onRemove={() => handleRemoveFromPitch(m.empleado_id)}
                                    />
                                ))}
                                {personalRezaga.length === 0 && (
                                    <div className="col-span-full text-slate-500 text-xs font-semibold italic px-3 py-4 text-center">
                                        Arrastra aquí a los Operadores de Scooptram (Limpieza de mineral y relleno).
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* SECCIÓN 3: LÍNEA DE ACARREO (Camiones Bajo Perfil) */}
                        <div
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => handleDropOnZone(e, 'ACARREO')}
                            className="relative bg-slate-950/70 border-2 border-blue-500/40 rounded-2xl p-3.5 transition-all hover:border-blue-500 shadow-md"
                        >
                            <div className="flex items-center justify-between mb-2.5 px-1">
                                <span className="text-xs font-black uppercase tracking-wider text-blue-500 flex items-center gap-2">
                                    <Truck size={16} />
                                    3. LÍNEA DE ACARREO (CHOFERES DE CAMIÓN ARTICULADO / DUMPER)
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono font-black bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-800">
                                    {personalAcarreo.length} asignados
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 min-h-[90px] items-start p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                                {personalAcarreo.map(m => (
                                    <MinerTacticalCard
                                        key={m.id}
                                        miembro={m}
                                        canEdit={canEdit}
                                        historyNote={historyNotes[m.empleado_id]}
                                        onDragStart={e => handleDragStart(e, m.empleado_id)}
                                        onDragEnd={handleDragEnd}
                                        onEditNote={() => openEditNoteModal(m)}
                                        onRemove={() => handleRemoveFromPitch(m.empleado_id)}
                                    />
                                ))}
                                {personalAcarreo.length === 0 && (
                                    <div className="col-span-full text-slate-500 text-xs font-semibold italic px-3 py-4 text-center">
                                        Arrastra aquí a los Choferes de Camión de Acarreo a tolva o terrero.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* SECCIÓN 4: SERVICIOS MINA, SOSTENIMIENTO Y SEGURIDAD */}
                        <div
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => handleDropOnZone(e, 'SERVICIOS')}
                            className="relative bg-slate-950/70 border-2 border-purple-500/40 rounded-2xl p-3.5 transition-all hover:border-purple-500 shadow-md"
                        >
                            <div className="flex items-center justify-between mb-2.5 px-1">
                                <span className="text-xs font-black uppercase tracking-wider text-purple-500 flex items-center gap-2">
                                    <Wrench size={16} />
                                    4. SERVICIOS MINA Y SOSTENIMIENTO (SOTAMINEROS, SCALEMIN, SOLDADORES, RELLENO)
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono font-black bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-800">
                                    {personalServicios.length} asignados
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 min-h-[90px] items-start p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                                {personalServicios.map(m => (
                                    <MinerTacticalCard
                                        key={m.id}
                                        miembro={m}
                                        canEdit={canEdit}
                                        historyNote={historyNotes[m.empleado_id]}
                                        onDragStart={e => handleDragStart(e, m.empleado_id)}
                                        onDragEnd={handleDragEnd}
                                        onEditNote={() => openEditNoteModal(m)}
                                        onRemove={() => handleRemoveFromPitch(m.empleado_id)}
                                    />
                                ))}
                                {personalServicios.length === 0 && (
                                    <div className="col-span-full text-slate-500 text-xs font-semibold italic px-3 py-4 text-center">
                                        Arrastra aquí a personal de soporte, infraestructura y servicios generales.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>

            </div>

            {/* MODAL PARA COMENTAR QUÉ SE TRABAJÓ EN LA CUADRILLA ANTERIOR */}
            <AnimatePresence>
                {transferModal.open && transferModal.emp && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 html2pdf__ignore">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/40">
                                        <ArrowRightLeft size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-white">
                                            {transferModal.isExistingMemberEdit
                                                ? 'Bitácora de Trabajo en Cuadrilla Anterior'
                                                : 'Asignación a Cuadrilla y Registro de Trabajo Anterior'}
                                        </h3>
                                        <p className="text-xs text-slate-400">
                                            Trabajador: <strong>{transferModal.emp.employee_code} — {transferModal.emp.first_name} {transferModal.emp.last_name}</strong> ({transferModal.emp.puesto?.nombre || 'Operativo'})
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setTransferModal(prev => ({ ...prev, open: false }))}
                                    className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={confirmTransferAndSave} className="p-6 space-y-4">
                                {!transferModal.isExistingMemberEdit && globalAssignments[transferModal.emp.id] && (
                                    <div className="p-3.5 rounded-xl bg-amber-500/15 border-2 border-amber-500/40 text-xs text-amber-400 font-bold flex items-start gap-2.5">
                                        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                                        <div>
                                            <strong>Regla Anti-Duplicados:</strong> El trabajador se encuentra actualmente en <u>{globalAssignments[transferModal.emp.id].cuadrilla_nombre}</u>. Al confirmar, será retirado de esa cuadrilla e integrado a <u>{activeCuadrilla?.nombre}</u>.
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black uppercase text-slate-300 mb-1.5">
                                            Cuadrilla Anterior / Procedencia
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={transferModal.previousCrewName}
                                            onChange={e => setTransferModal(prev => ({ ...prev, previousCrewName: e.target.value }))}
                                            placeholder="Ej. CUADRILLA 2 / Reserva"
                                            className="w-full rounded-xl px-3.5 py-2.5 text-xs"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black uppercase text-slate-300 mb-1.5">
                                            Sección Táctica en {activeCuadrilla?.nombre}
                                        </label>
                                        <select
                                            value={transferModal.targetZone}
                                            onChange={e => setTransferModal(prev => ({ ...prev, targetZone: e.target.value as any }))}
                                            className="w-full rounded-xl px-3.5 py-2.5 text-xs"
                                        >
                                            <option value="AVANCE">1. Frente de Avance y Perforación</option>
                                            <option value="REZAGA">2. Línea de Rezaga (Scooptram / Pala)</option>
                                            <option value="ACARREO">3. Línea de Acarreo (Camiones)</option>
                                            <option value="SERVICIOS">4. Servicios Mina y Sostenimiento</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-300 mb-1.5">
                                        ¿Qué trabajó o qué actividad realizó en la cuadrilla anterior? *
                                    </label>
                                    <textarea
                                        required
                                        rows={3}
                                        value={transferModal.workedOnComment}
                                        onChange={e => setTransferModal(prev => ({ ...prev, workedOnComment: e.target.value }))}
                                        placeholder="Describe qué frente, equipo o actividad realizó en su cuadrilla previa..."
                                        className="w-full rounded-xl px-3.5 py-2.5 text-xs"
                                    />
                                </div>

                                <div>
                                    <span className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">
                                        Plantillas rápidas de actividad:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {PRESET_ACTIVITIES.map((preset, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => setTransferModal(prev => ({ ...prev, workedOnComment: preset }))}
                                                className="text-left text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                                            >
                                                + {preset.slice(0, 48)}...
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setTransferModal(prev => ({ ...prev, open: false }))}
                                        className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg cursor-pointer"
                                    >
                                        Confirmar y Guardar Historial
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}

// Tarjeta operativa del Minero en su sección táctica
function MinerTacticalCard({
    miembro,
    canEdit,
    historyNote,
    onDragStart,
    onDragEnd,
    onEditNote,
    onRemove
}: {
    miembro: MiembroCuadrilla
    canEdit: boolean
    historyNote?: CrewHistoryNote
    onDragStart: (e: React.DragEvent) => void
    onDragEnd?: () => void
    onEditNote: () => void
    onRemove: () => void
}) {
    const emp = miembro.rh_employees
    const codigo = emp.employee_code || 'EMP'
    const puestoUpper = (emp.puesto?.nombre || '').toUpperCase()

    const isAyudantePerforista = puestoUpper.includes('AYUDANTE')
    const isPerforista = (puestoUpper.includes('JUMB') || puestoUpper.includes('PERF')) && !isAyudantePerforista
    const isScoop = puestoUpper.includes('PALA') || puestoUpper.includes('SCOOP') || puestoUpper.includes('PALERO')
    const isChofer = puestoUpper.includes('CHOFER') || puestoUpper.includes('CAMION')

    return (
        <motion.div
            layout
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            draggable={canEdit}
            onDragStart={onDragStart as any}
            onDragEnd={onDragEnd}
            className={`group relative flex flex-col gap-1.5 bg-slate-950 border-2 rounded-xl p-3 shadow-md transition-all ${
                isPerforista
                    ? 'border-amber-500/60 hover:border-amber-400'
                    : isAyudantePerforista
                        ? 'border-sky-500/60 hover:border-sky-400'
                        : isScoop
                            ? 'border-emerald-500/60 hover:border-emerald-400'
                            : 'border-slate-800 hover:border-purple-500'
            } ${canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
        >
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    {/* Clave de Mina con icono animado según especialidad */}
                    <div className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-500 font-mono font-black text-[10px] shrink-0 flex items-center gap-1">
                        {isPerforista && (
                            <motion.span
                                animate={{ rotate: [0, 15, -15, 0], x: [-0.5, 0.5, -0.5, 0] }}
                                transition={{ repeat: Infinity, duration: 0.6 }}
                                className="inline-block"
                                title="Perforista Activo"
                            >
                                ⚡
                            </motion.span>
                        )}
                        {isAyudantePerforista && (
                            <span title="Ayudante de Perforista">🤝</span>
                        )}
                        {isScoop && (
                            <span title="Operador de Scooptram">🚜</span>
                        )}
                        <span>{codigo}</span>
                    </div>

                    {/* Nombre y Puesto Oficial */}
                    <div className="min-w-0">
                        <div className="text-white text-xs font-black truncate">
                            {emp.first_name} {emp.last_name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold truncate">
                            {emp.puesto?.nombre || 'Operativo Mina'}
                        </div>
                    </div>
                </div>

                {/* Acciones de nota y retiro */}
                {canEdit && (
                    <div className="flex items-center gap-1 shrink-0 html2pdf__ignore">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                onEditNote()
                            }}
                            title="Comentar o editar qué trabajó en la cuadrilla anterior"
                            className="p-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-500 rounded-lg transition-all cursor-pointer border border-slate-700"
                        >
                            <MessageSquarePlus size={13} />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                onRemove()
                            }}
                            title="Retirar de esta cuadrilla"
                            className="p-1.5 bg-slate-800 hover:bg-rose-600 hover:text-white text-rose-500 rounded-lg transition-all cursor-pointer border border-slate-700"
                        >
                            <X size={13} />
                        </button>
                    </div>
                )}
            </div>

            {/* Badges claros de distinción: Perforista vs Ayudante de Perforista vs Scoop */}
            <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-black uppercase">
                {isAyudantePerforista ? (
                    <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center gap-1">
                        🤝 AYUDANTE DE PERFORISTA
                    </span>
                ) : isPerforista ? (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
                        <motion.span
                            animate={{ scale: [1, 1.25, 1] }}
                            transition={{ repeat: Infinity, duration: 1 }}
                        >
                            💥
                        </motion.span>
                        ⚡ PERFORISTA OFICIAL (JUMBERO)
                    </span>
                ) : isScoop ? (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                        🚜 OPERADOR DE SCOOPTRAM ST-50
                    </span>
                ) : isChofer ? (
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center gap-1">
                        🚚 CHOFER DE CAMIÓN 15C
                    </span>
                ) : null}
            </div>

            {/* Historial de qué trabajó en la cuadrilla anterior */}
            <div
                onClick={() => canEdit && onEditNote()}
                className="text-[10px] bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 leading-snug cursor-pointer hover:border-amber-500/50 transition-colors"
            >
                {historyNote ? (
                    <>
                        <span className="font-black text-amber-500 uppercase">
                            📋 Ex-{historyNote.previous_crew}:
                        </span>{' '}
                        <span className="font-medium">{historyNote.worked_on}</span>
                    </>
                ) : (
                    <span className="italic text-slate-400">
                        📋 Clic para registrar qué trabajó en la cuadrilla anterior.
                    </span>
                )}
            </div>
        </motion.div>
    )
}
