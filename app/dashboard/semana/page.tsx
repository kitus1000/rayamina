'use client'

import { useState, useEffect } from 'react'
import { CalendarDays, BarChart3, Plus, Target, Pickaxe, TrendingUp, AlertTriangle, Trash2, MapPin, CheckCircle2, History, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

export default function SemanaEnCursoPage() {
    const [loading, setLoading] = useState(true)
    const [isCreatingPlan, setIsCreatingPlan] = useState(false)
    const [planActivo, setPlanActivo] = useState<any>(null)
    const [planesHistoricos, setPlanesHistoricos] = useState<any[]>([])
    const [selectedPlanId, setSelectedPlanId] = useState<string | 'ACTUAL'>('ACTUAL')
    const [matriz, setMatriz] = useState<any[]>([])

    // KPIs en tiempo real
    const [noticiasZonas, setNoticiasZonas] = useState<string[]>(['Esperando reportes...'])
    const [noticiaIndex, setNoticiaIndex] = useState(0)
    const [kpiExtraccion, setKpiExtraccion] = useState(0)
    const [avancePlaneacionGlobal, setAvancePlaneacionGlobal] = useState(0)

    // Catálogos para el Form Dinámico
    const [catalogoProductos, setCatalogoProductos] = useState<any[]>([])
    const [catalogoMinas, setCatalogoMinas] = useState<any[]>([])
    const [catalogoUbicaciones, setCatalogoUbicaciones] = useState<any[]>([])

    // Estado del Plan Dinámico (Líneas agregadas por el usuario)
    const [lineasPlan, setLineasPlan] = useState<{ id: string, producto_id: string, categoria: string, mine_site_id: string, location_id: string, meta: string }[]>([])

    // Estado para las fechas del constructor
    const [fechaInicioPlan, setFechaInicioPlan] = useState<string>('')
    const [fechaFinPlan, setFechaFinPlan] = useState<string>('')

    const { sysRole } = useAuth()
    const canEditPlan = sysRole === 'SUPER_ADMIN' || sysRole === 'JEFE_PLANEACION' || sysRole === 'GERENTE'

    // Referencia de fechas
    const [diasSemana, setDiasSemana] = useState<{ nombre: string, fecha: string }[]>([])

    useEffect(() => {
        loadDashboardData()
    }, [selectedPlanId])

    useEffect(() => {
        const interval = setInterval(() => {
            setNoticiaIndex(prev => (prev + 1) % Math.max(noticiasZonas.length, 1))
        }, 4000)
        return () => clearInterval(interval)
    }, [noticiasZonas.length])

    const getFechasRango = (inicio: string, fin: string) => {
        const start = new Date(inicio + 'T12:00:00')
        const end = new Date(fin + 'T12:00:00')
        const dates = []
        let curr = new Date(start)

        // Limitar a máximo 14 días por seguridad visual, aunque usualmente sean 7
        let protect = 0
        while (curr <= end && protect < 14) {
            const diaMap = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
            dates.push({
                nombre: diaMap[curr.getDay()],
                fecha: curr.toISOString().split('T')[0]
            })
            curr.setDate(curr.getDate() + 1)
            protect++
        }
        return dates
    }

    const getInicioSemanaConfig = (configDay: number) => {
        const now = new Date()
        // Forzamos mediodía local para evitar saltos de día por zona horaria al convertir a ISO
        const curr = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0)
        const day = curr.getDay()

        // Calcular cuántos días restar para llegar al inicio de semana deseado
        const diff = (day - configDay + 7) % 7

        const inicio = new Date(curr)
        inicio.setDate(curr.getDate() - diff)
        return inicio.toISOString().split('T')[0]
    }

    const getFinSemanaConfig = (inicioStr: string) => {
        if (!inicioStr) return ''
        const inicio = new Date(inicioStr + 'T12:00:00')
        const fin = new Date(inicio)
        fin.setDate(inicio.getDate() + 6)
        return fin.toISOString().split('T')[0]
    }

    const loadDashboardData = async () => {
        setLoading(true)

        // 1. Buscar Configuración de Inicio de Semana
        const { data: configData } = await supabase
            .from('sys_config')
            .select('*')
            .eq('key_name', 'operational_week_start')
            .single()

        const configStartDay = configData?.value_json?.day_index ?? 1 // Lunes por defecto

        // 2. Buscar Todos los Planes (Activos e Históricos)
        const { data: todosPlanes, error: planesError } = await supabase
            .from('ops_planes_semanales')
            .select(`
                *, 
                ops_plan_items(
                    producto_id, cantidad_proyectada:meta_proyectada, 
                    cat_productos_mina(nombre, unidad_medida_default, tarifa_pago),
                    mine_locations(nombre),
                    mine_sites(nombre_mina)
                )
            `)
            .order('created_at', { ascending: false })

        if (planesError) console.error("Error al cargar planes: ", planesError)

        const planAct = todosPlanes?.find(p => p.estado === 'ACTIVO')
        const planHist = todosPlanes?.filter(p => p.estado === 'CERRADO') || []

        setPlanActivo(planAct || null)
        setPlanesHistoricos(planHist)

        // Determinar qué plan visualizar
        let planAVisualizar = null
        if (selectedPlanId === 'ACTUAL') {
            planAVisualizar = planAct || null
        } else {
            planAVisualizar = planHist.find(p => p.id === selectedPlanId) || null
        }

        // Inicializar Matrix Headers basado en Plan a visualizar o Fechas default
        let dSemana: { nombre: string, fecha: string }[] = []
        if (planAVisualizar) {
            dSemana = getFechasRango(planAVisualizar.fecha_inicio, planAVisualizar.fecha_fin)
        } else {
            const inicio = getInicioSemanaConfig(configStartDay)
            const fin = getFinSemanaConfig(inicio)
            dSemana = getFechasRango(inicio, fin)
        }
        setDiasSemana(dSemana)

        // Inicializar creador de plan con las fechas de la semana actual por default (Solo UI creador)
        if (!planAct) {
            const inicio = getInicioSemanaConfig(configStartDay)
            const fin = getFinSemanaConfig(inicio)
            setFechaInicioPlan(inicio)
            setFechaFinPlan(fin)
        }

        // 3. Extraer Reportes Vivos (Filtro por fechas del plan a visualizar)
        let repsQuery = supabase
            .from('ops_daily_reports')
            .select(`
                id, fecha,
                ops_report_items(cantidad_total, cat_productos_mina(id, nombre, unidad_medida_default, tarifa_pago), mine_locations(id, nombre)),
                ops_daily_attendance(empleado_id, cat_asistencias!ops_daily_attendance_asistencia_tipo_id_fkey(codigo), rh_employees(sueldo_diario_base))
            `)

        if (planAVisualizar) {
            repsQuery = repsQuery
                .gte('fecha', planAVisualizar.fecha_inicio)
                .lte('fecha', planAVisualizar.fecha_fin)
        } else {
            repsQuery = repsQuery.is('semana_id', null)
        }

        const { data: reportesVivos, error: repsError } = await repsQuery

        if (repsError) {
            console.error("Error al cargar reportes: ", repsError)
            alert("Error crítico de Base de Datos al intentar cargar los Avances Diarios:\n\n" + repsError.message + "\n\nPor favor ejecuta 'NOTIFY pgrst, reload_schema;' en tu SQL Editor.")
        }

        // ==========================================
        // A. CONSTRUIR MATRIZ DE PLANEACIÓN
        // Clave única para filas: producto_id + location_id (o 'general' si no tiene)
        // ==========================================
        const mapaMatriz = new Map<string, any>()

        if (planAVisualizar) {
            planAVisualizar.ops_plan_items.forEach((item: any) => {
                const prod = item.cat_productos_mina
                const locId = item.mine_locations?.nombre || 'General'
                const key = `${item.producto_id}-${locId}`

                // Inicializar objeto de días con 0 para cada fecha del rango
                const diasObj: Record<string, number> = {}
                dSemana.forEach((d: any) => { diasObj[d.fecha] = 0 })

                mapaMatriz.set(key, {
                    producto_id: item.producto_id,
                    ubicacion: locId,
                    mina: item.mine_sites?.nombre_mina || '',
                    nombre: prod.nombre,
                    unidad: prod.unidad_medida_default,
                    meta: parseFloat(item.cantidad_proyectada || item.meta_proyectada || 0),
                    dias: diasObj,
                    total: 0,
                    porcentaje: 0
                })
            })
        }

        // ==========================================
        // B. CALCULAR NÓMINA EN VIVO & RELLENAR MATRIZ
        // ==========================================
        let tFijo = 0, tDestajo = 0

        if (reportesVivos) {
            reportesVivos.forEach((rep: any) => {
                // Prevenir el Timezone Shift (añadir hora media previene retrocesos por uso horario UTC vs Local)
                const fechaObj = new Date(rep.fecha + 'T12:00:00')
                let dayIndex = fechaObj.getDay() - 1
                if (dayIndex === -1) dayIndex = 6
                const diaNombre = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][dayIndex]

                if (rep.ops_report_items) {
                    rep.ops_report_items.forEach((ritem: any) => {
                        const pid = ritem.cat_productos_mina.id
                        const locName = ritem.mine_locations?.nombre || 'General'
                        const key = `${pid}-${locName}`
                        const cantidad = ritem.cantidad_total

                        // Rellenar Fila
                        if (mapaMatriz.has(key)) {
                            const fila = mapaMatriz.get(key)!
                            // Solo sumar si la fecha del reporte cae dentro de las columnas visibles
                            if (fila.dias.hasOwnProperty(rep.fecha)) {
                                fila.dias[rep.fecha] += cantidad
                                fila.total += cantidad
                            }
                        } else {
                            // Extra no planeado en esa ubicación
                            const diasObj: Record<string, number> = {}
                            dSemana.forEach((d: any) => { diasObj[d.fecha] = 0 })

                            if (diasObj.hasOwnProperty(rep.fecha)) {
                                diasObj[rep.fecha] = cantidad
                            }

                            mapaMatriz.set(key, {
                                producto_id: pid,
                                ubicacion: locName,
                                mina: '-',
                                nombre: ritem.cat_productos_mina.nombre,
                                unidad: ritem.cat_productos_mina.unidad_medida_default || '-',
                                meta: 0,
                                dias: diasObj,
                                total: cantidad,
                                porcentaje: 0
                            })
                        }

                        // Destajos
                        const tarifa = parseFloat(ritem.cat_productos_mina.tarifa_pago || 0)
                        tDestajo += (cantidad * tarifa)
                    })
                }

                if (rep.ops_daily_attendance) {
                    rep.ops_daily_attendance.forEach((att: any) => {
                        if (att.cat_asistencias?.codigo === 'ASISTENCIA' && att.rh_employees) {
                            tFijo += parseFloat(att.rh_employees.sueldo_diario_base || 0)
                        }
                    })
                }
            })
        }

        const arrayMatriz = Array.from(mapaMatriz.values()).map(fila => {
            if (fila.meta > 0) {
                fila.porcentaje = Math.round((fila.total / fila.meta) * 100)
            } else {
                fila.porcentaje = fila.total > 0 ? 100 : 0
            }
            return fila
        }).sort((a, b) => b.meta - a.meta)

        setMatriz(arrayMatriz)

        // ==========================================
        // C. CALCULAR KPIs OPERATIVOS (REEMPLAZO DE NOMINA)
        // ==========================================
        let totalTonMetro = 0
        const newsTicker: string[] = []

        let sumPorcentajes = 0
        let itemsPlaneados = 0

        arrayMatriz.forEach(m => {
            if (m.meta > 0) {
                sumPorcentajes += Math.min(m.porcentaje, 100)
                itemsPlaneados++
            }
            if (m.total > 0) {
                totalTonMetro += m.total

                // Extraer el avance más reciente para las noticias diarias
                const fechasConAvance = Object.keys(m.dias).filter(f => m.dias[f] > 0).sort().reverse()
                if (fechasConAvance.length > 0) {
                    const ultFecha = fechasConAvance[0]
                    const qty = m.dias[ultFecha]
                    // Formatear el día
                    const dObj = new Date(ultFecha + 'T12:00:00')
                    const diaNombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
                    const diaStr = diaNombres[dObj.getDay()]

                    newsTicker.push(`Avance el ${diaStr} en ${m.ubicacion}: ${qty} ${m.unidad} de ${m.nombre}`)
                }
            }
        })

        setKpiExtraccion(totalTonMetro)
        setAvancePlaneacionGlobal(itemsPlaneados > 0 ? Math.round(sumPorcentajes / itemsPlaneados) : 0)
        if (newsTicker.length > 0) {
            setNoticiasZonas(newsTicker)
        } else {
            setNoticiasZonas(["Sin avances reportados hoy en las Zonas Activas."])
        }

        // Cargar catálogos
        const [rProd, rMinas, rUbic] = await Promise.all([
            supabase.from('cat_productos_mina').select('id, categoria, nombre, unidad_medida_default').eq('activo', true),
            supabase.from('mine_sites').select('id, nombre_mina'),
            supabase.from('mine_locations').select('id, nombre, mine_site_id')
        ])
        if (rProd.data) setCatalogoProductos(rProd.data)
        if (rMinas.data) setCatalogoMinas(rMinas.data.map(m => ({ id: m.id, name: m.nombre_mina })))
        if (rUbic.data) setCatalogoUbicaciones(rUbic.data.map(u => ({ id: u.id, name: u.nombre, site_id: u.mine_site_id })))

        setLoading(false)
    }

    const agregarLineaPlan = (categoria: string) => {
        setLineasPlan(prev => [
            ...prev,
            { id: Date.now().toString(), producto_id: '', categoria, mine_site_id: '', location_id: '', meta: '' }
        ])
    }

    const modificarLinea = (id: string, campo: string, valor: string) => {
        setLineasPlan(prev => prev.map(linea => {
            if (linea.id === id) {
                // Si cambiamos mina, resetear la ubicacion
                if (campo === 'mine_site_id') {
                    return { ...linea, [campo]: valor, location_id: '' }
                }
                return { ...linea, [campo]: valor }
            }
            return linea
        }))
    }

    const eliminarLinea = (id: string) => {
        setLineasPlan(prev => prev.filter(l => l.id !== id))
    }

    const guardarNuevoPlan = async () => {
        const lineasSanas = lineasPlan.filter(l => l.producto_id && parseFloat(l.meta) > 0)

        if (lineasSanas.length === 0) {
            alert("Añade al menos una actividad con meta mayor a cero.")
            return
        }

        let currentPlanId = planActivo?.id

        if (!currentPlanId) {
            if (!fechaInicioPlan || !fechaFinPlan) {
                alert("Selecciona la fecha de inicio y fin para el plan de la semana.")
                return
            }

            setLoading(true)
            const { data: nPlan, error: errP } = await supabase.from('ops_planes_semanales')
                .insert({ fecha_inicio: fechaInicioPlan, fecha_fin: fechaFinPlan, estado: 'ACTIVO' })
                .select().single()

            if (errP) { alert(errP.message); setLoading(false); return }
            currentPlanId = nPlan.id
        } else {
            setLoading(true)
        }

        const itemsToInsert = lineasSanas.map(l => ({
            plan_id: currentPlanId,
            producto_id: l.producto_id,
            mine_site_id: l.mine_site_id || null, // Opcional
            location_id: l.location_id || null, // Opcional
            meta_proyectada: parseFloat(l.meta),
            cantidad_proyectada: parseFloat(l.meta)
        }))

        const { error: errorItems } = await supabase.from('ops_plan_items').insert(itemsToInsert)
        if (errorItems) {
            alert("Algunas filas son duplicadas o causaron conflicto. Verifica tu plan.\nError: " + errorItems.message)
        }

        setIsCreatingPlan(false)
        setLineasPlan([])
        loadDashboardData()
    }

    const eliminarPlanActivo = async () => {
        if (!planActivo) return
        if (!confirm("¿ESTÁS SEGURO? Se eliminarán todas las metas planeadas para este periodo. Los reportes de avance diario NO se borrarán, pero se verán como 'No Planeados' en la matriz.")) return

        setLoading(true)
        // 1. Borrar items (cascada opcional, pero mejor ser explícitos)
        const { error: err1 } = await supabase.from('ops_plan_items').delete().eq('plan_id', planActivo.id)
        if (err1) { alert(err1.message); setLoading(false); return }

        // 2. Borrar plan
        const { error: err2 } = await supabase.from('ops_planes_semanales').delete().eq('id', planActivo.id)

        if (!err2) {
            setPlanActivo(null)
            loadDashboardData()
        } else {
            alert(err2.message)
            setLoading(false)
        }
    }

    const finalizarSemanaActual = async () => {
        if (!planActivo) return
        if (!confirm("¿ESTÁS SEGURO DE CERRAR LA SEMANA DE PLANEACIÓN? Esto pasará el plan a estado HISTORICO para no mezclarse con tus futuras planeaciones. Los datos de operación seguirán seguros.")) return

        setLoading(true)
        const { error } = await supabase.from('ops_planes_semanales').update({ estado: 'CERRADO' }).eq('id', planActivo.id)

        if (!error) {
            setPlanActivo(null)
            setSelectedPlanId('ACTUAL') // Refrescar y dejar la pantalla en limpio
            loadDashboardData()
        } else {
            alert("Error al finalizar: " + error.message)
            setLoading(false)
        }
    }

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)
    }

    const categoriasDisponibles = Array.from(new Set(catalogoProductos.map(p => p.categoria)))

    if (loading) {
        return <div className="p-16 text-center text-amber-500 font-bold animate-pulse">Analizando Operación en Vivo...</div>
    }

    return (
        <div className="p-6 max-w-[1400px] mx-auto">
            {/* HEADER */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Target className="text-amber-500 w-8 h-8" />
                        Semana en Curso
                        {selectedPlanId === 'ACTUAL' ? (
                            <span className="text-sm font-normal bg-amber-500/20 text-amber-500 px-3 py-1 rounded-full border border-amber-500/30">En Vivo</span>
                        ) : (
                            <span className="text-sm font-normal bg-slate-700 text-slate-300 px-3 py-1 rounded-full border border-slate-600">Histórico</span>
                        )}
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Centro de Control de Planeación vs Ejecución.
                        {diasSemana.length > 0 && (
                            <> ({diasSemana[0]?.fecha} al {diasSemana[diasSemana.length - 1]?.fecha})</>
                        )}
                    </p>
                </div>

                {/* FILTRO HISTORICO + PDF */}
                <div className="flex items-center gap-2 html2pdf__ignore">
                    <button
                        onClick={() => window.print()}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer"
                    >
                        🖨️ Exportar Plan a PDF
                    </button>
                    <div className="flex bg-slate-800 p-1.5 rounded-xl border border-slate-700">
                        <select
                            value={selectedPlanId}
                            onChange={(e) => setSelectedPlanId(e.target.value)}
                            className="bg-transparent text-white font-bold px-3 py-1 outline-none text-sm cursor-pointer"
                        >
                            <option value="ACTUAL">💥 Plan Actual (En Vivo)</option>
                            {planesHistoricos.length > 0 && <optgroup label="Historial Cerrado" />}
                            {planesHistoricos.map(ph => (
                                <option key={ph.id} value={ph.id}>
                                    Histórico ({ph.fecha_inicio} - {ph.fecha_fin})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {canEditPlan && !isCreatingPlan && selectedPlanId === 'ACTUAL' ? (
                    <div className="flex gap-2">
                        {planActivo && (
                            <>
                                <button
                                    onClick={finalizarSemanaActual}
                                    className="bg-slate-800 hover:bg-emerald-900 border border-slate-700 text-slate-400 hover:text-emerald-400 px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2"
                                    title="Dar por terminada la semana operativa (Pasará a Histórico)"
                                >
                                    <CheckCircle size={18} /> Finalizar Plan
                                </button>
                                <button
                                    onClick={eliminarPlanActivo}
                                    className="bg-slate-800 hover:bg-red-900 border border-slate-700 text-slate-400 hover:text-white px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2"
                                    title="Borrar toda la planeación actual de base de datos"
                                >
                                    <Trash2 size={18} /> Borrar
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => setIsCreatingPlan(true)}
                            className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-amber-900/40 flex items-center gap-2 transition-colors"
                        >
                            <Plus size={18} /> {planActivo ? 'Expandir Plan' : 'Planear Semana'}
                        </button>
                    </div>
                ) : !canEditPlan && selectedPlanId === 'ACTUAL' ? (
                    <div className="flex items-center gap-2.5 bg-slate-900 border border-slate-800 text-slate-400 text-xs px-4 py-2.5 rounded-xl font-mono">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        <span>🔒 Modo Consulta: Planificación y metas reservadas a <strong>Jefatura de Planeación</strong></span>
                    </div>
                ) : null}
            </div>

            {/* WIDGETS DE OPERACIÓN EN VIVO (NEWS TICKER Y KPIs) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* 1. Ticker de Noticias de Avances diarios */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent pointer-events-none" />
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-blue-400 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping absolute" />
                            <span className="w-2 h-2 rounded-full bg-blue-500 relative" />
                            Reportes en Tiempo Real
                        </h4>
                        <MapPin className="text-slate-600" size={20} />
                    </div>
                    <div className="h-16 relative overflow-hidden flex items-center">
                        <p
                            key={noticiaIndex}
                            className="text-sm md:text-base font-bold text-slate-300 animate-slide-up absolute w-full pr-4 leading-snug"
                        >
                            {noticiasZonas[noticiaIndex]}
                        </p>
                    </div>
                </div>

                {/* 2. KPI Total Producción Mixta (Toneladas y Metros) */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-emerald-500 text-sm font-bold uppercase tracking-wider">Volumen Acumulado</h4>
                        <Pickaxe className="text-slate-600" size={20} />
                    </div>
                    <p className="text-4xl font-extrabold text-white mt-2">
                        {kpiExtraccion.toLocaleString()} <span className="text-xl font-medium text-slate-500">Uds</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-2">Suma de TMB, Metros y Servicios Extr.</p>
                </div>

                {/* 3. Avance vs Planeación */}
                <div className="bg-gradient-to-br from-amber-900/40 to-slate-900 border border-amber-800/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Target size={100} />
                    </div>
                    <div className="flex items-center justify-between mb-2 relative z-10">
                        <h4 className="text-amber-500/80 text-sm font-bold uppercase tracking-wider">Avance Global vs Plan</h4>
                        <TrendingUp className="text-amber-500/50" size={20} />
                    </div>
                    <div className="flex items-baseline gap-2 relative z-10 mt-2">
                        <p className="text-5xl font-black text-amber-500">{avancePlaneacionGlobal}%</p>
                    </div>

                    <div className="w-full bg-slate-950/50 rounded-full h-2 mt-4 relative z-10 overflow-hidden">
                        <div
                            className="bg-amber-500 h-2 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${avancePlaneacionGlobal}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* CREACIÓN DE PLAN DINÁMICO */}
            {isCreatingPlan && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl mb-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-800 pb-4 gap-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Pickaxe className="text-amber-500" /> {planActivo ? 'Expandir Plan Semanal' : 'Constructor del Plan Semanal'}
                        </h2>

                        {!planActivo ? (
                            <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Desde:</span>
                                    <input
                                        type="date"
                                        className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-sm text-amber-400 font-medium outline-none"
                                        value={fechaInicioPlan}
                                        onChange={e => setFechaInicioPlan(e.target.value)}
                                    />
                                </div>
                                <span className="text-slate-600">-</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Hasta:</span>
                                    <input
                                        type="date"
                                        className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-sm text-amber-400 font-medium outline-none"
                                        value={fechaFinPlan}
                                        onChange={e => setFechaFinPlan(e.target.value)}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 bg-slate-950 p-2 px-4 rounded-xl border border-amber-900/50 text-amber-500/80 text-sm font-medium">
                                <span>Añadiendo metas al plan del <b className="text-amber-500">{planActivo.fecha_inicio}</b> al <b className="text-amber-500">{planActivo.fecha_fin}</b></span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-8 mb-6">
                        {categoriasDisponibles.map(cat => {
                            const lineasCat = lineasPlan.filter(l => l.categoria === cat)
                            return (
                                <div key={cat} className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-sm font-bold text-amber-500 uppercase tracking-widest bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 shadow-sm">
                                            {cat}
                                        </h3>
                                        <button
                                            onClick={() => agregarLineaPlan(cat)}
                                            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 transition-colors"
                                        >
                                            <Plus size={14} /> Añadir Meta a {cat}
                                        </button>
                                    </div>

                                    {lineasCat.length === 0 ? (
                                        <p className="text-center py-6 text-slate-600 text-sm italic bg-slate-900/30 rounded-xl border border-dashed border-slate-800">No hay metas activas. Haz click en añadir.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {lineasCat.map((linea, index) => {
                                                const prods = catalogoProductos.filter(p => p.categoria === cat)
                                                const ubics = catalogoUbicaciones.filter(u => u.site_id === linea.mine_site_id)
                                                // Descubrir unidad si seleccionó prod
                                                const uMedida = catalogoProductos.find(p => p.id === linea.producto_id)?.unidad_medida_default || 'UD'

                                                return (
                                                    <div key={linea.id} className="grid grid-cols-12 gap-3 items-center bg-slate-900 p-3 rounded-xl border border-slate-700 shadow-sm transition-all hover:border-slate-600">
                                                        {/* Num */}
                                                        <div className="col-span-1 flex justify-center text-slate-500 font-mono text-xs">
                                                            {(index + 1).toString().padStart(2, '0')}
                                                        </div>
                                                        {/* Producto */}
                                                        <div className="col-span-3">
                                                            <select
                                                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white focus:border-amber-500 outline-none"
                                                                value={linea.producto_id} onChange={(e) => modificarLinea(linea.id, 'producto_id', e.target.value)}
                                                            >
                                                                <option value="">-- Seleccionar Actividad --</option>
                                                                {prods.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                                            </select>
                                                        </div>
                                                        {/* Mina */}
                                                        <div className="col-span-2">
                                                            <select
                                                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-300 focus:border-amber-500 outline-none"
                                                                value={linea.mine_site_id} onChange={(e) => modificarLinea(linea.id, 'mine_site_id', e.target.value)}
                                                            >
                                                                <option value="">-- Elegir Mina --</option>
                                                                {catalogoMinas.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                                            </select>
                                                        </div>
                                                        {/* Ubicacion */}
                                                        <div className="col-span-3">
                                                            <select
                                                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-300 focus:border-amber-500 outline-none"
                                                                value={linea.location_id} onChange={(e) => modificarLinea(linea.id, 'location_id', e.target.value)}
                                                                disabled={!linea.mine_site_id}
                                                            >
                                                                <option value="">-- Zona / Frente exacto --</option>
                                                                {ubics.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                            </select>
                                                        </div>
                                                        {/* Meta */}
                                                        <div className="col-span-2 relative">
                                                            <input
                                                                type="number"
                                                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-amber-400 font-bold focus:border-amber-500 outline-none pr-8"
                                                                placeholder="Meta..."
                                                                value={linea.meta} onChange={(e) => modificarLinea(linea.id, 'meta', e.target.value)}
                                                            />
                                                            <span className="absolute right-3 top-2.5 text-xs text-slate-500">{uMedida}</span>
                                                        </div>
                                                        {/* Acción */}
                                                        <div className="col-span-1 flex justify-center">
                                                            <button
                                                                onClick={() => eliminarLinea(linea.id)}
                                                                className="p-1.5 text-red-500/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                        <button onClick={() => setIsCreatingPlan(false)} className="px-5 py-2 text-slate-400 hover:text-white transition-colors">Abortar</button>
                        <button onClick={guardarNuevoPlan} className="bg-amber-600 hover:bg-amber-500 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-amber-900/30 flex items-center gap-2">
                            <CheckCircle2 size={18} /> {planActivo ? 'Guardar y Expandir Plan Activo' : 'Iniciar Plan Semanal'}
                        </button>
                    </div>
                </div>
            )}

            {/* MATRIZ DÍA POR DÍA */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <BarChart3 className="text-indigo-400" size={20} />
                        Matriz de Ejecución e Impacto
                    </h3>
                    {!planActivo && !isCreatingPlan && (
                        <span className="flex items-center gap-2 text-amber-500 text-sm font-medium bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
                            <AlertTriangle size={16} /> Operando A Ciegas (Sin Plan)
                        </span>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300 whitespace-nowrap">
                        <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-slate-800">
                            <tr>
                                <th className="px-5 py-4 w-72">Actividad & Ubicación</th>
                                <th className="px-3 py-4 text-center border-l-2 border-slate-800 text-amber-500">Meta</th>
                                {diasSemana.map(d => (
                                    <th key={d.fecha} className="px-3 py-4 text-center border-l border-slate-800/50">
                                        <div className="font-bold">{d.nombre}</div>
                                        <div className="text-[10px] text-slate-600 font-normal">{d.fecha.slice(5)}</div>
                                    </th>
                                ))}
                                <th className="px-3 py-4 text-center border-l-2 border-slate-800 text-white">Avance</th>
                                <th className="px-4 py-4 text-right border-l border-slate-800">Estatus</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {matriz.length === 0 ? (
                                <tr>
                                    <td colSpan={diasSemana.length + 4} className="p-12 text-center text-slate-500 italic">
                                        No hay incidentes reportados ni planeación para inyectar en la matriz.
                                    </td>
                                </tr>
                            ) : (
                                matriz.map((fila, i) => (
                                    <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                                        <td className="px-5 py-4 border-r border-slate-800/50">
                                            <div className="font-bold text-white mb-1">{fila.nombre}</div>
                                            <div className="flex items-center gap-1.5 text-[11px] text-indigo-400 font-medium">
                                                <MapPin size={10} />
                                                <span className="truncate">{fila.mina ? `${fila.mina} - ` : ''}{fila.ubicacion}</span>
                                            </div>
                                        </td>

                                        <td className="px-3 py-4 text-center border-r-2 border-slate-800 font-bold text-amber-500/80 bg-amber-950/10">
                                            {fila.meta > 0 ? fila.meta : '-'} <span className="font-normal text-[10px] ml-1">{fila.meta > 0 ? fila.unidad : ''}</span>
                                        </td>

                                        {diasSemana.map(d => (
                                            <td key={d.fecha} className="px-3 py-4 text-center border-r border-slate-800/50 font-mono text-slate-400">
                                                {fila.dias[d.fecha] > 0 ? <span className="text-white bg-slate-800 px-2 py-1 rounded">{fila.dias[d.fecha]}</span> : <span className="text-slate-700/50">-</span>}
                                            </td>
                                        ))}

                                        <td className="px-3 py-4 text-center font-bold text-white border-l-2 border-slate-800 bg-slate-800/20">
                                            {fila.total}
                                        </td>

                                        <td className="px-4 py-4 border-l border-slate-800 bg-slate-900/50 w-32">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex justify-between items-center text-[10px]">
                                                    <span className="text-slate-400">Progreso</span>
                                                    <span className={`font-bold ${fila.porcentaje >= 100 ? 'text-green-400' : 'text-slate-300'}`}>
                                                        {fila.porcentaje}%
                                                    </span>
                                                </div>
                                                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${fila.porcentaje >= 100 ? 'bg-green-500' : fila.porcentaje > 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                        style={{ width: `${Math.min(fila.porcentaje, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    )
}
