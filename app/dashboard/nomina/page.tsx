'use client'

import { useState, useEffect } from 'react'
import { CalendarDays, DollarSign, Download, ArrowRight, Settings, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx-js-style'
import { useAuth } from '@/lib/auth-context'

type PreNominaRow = {
    empleado_id: string
    nombre: string
    codigo: string
    puesto: string
    sueldo_diario: number
    dias_asistidos: number
    dias_falta: number
    total_sueldo_fijo: number
    destajos: {
        producto_nombre: string
        monto_ganado: number
    }[]
    total_destajos: number
    total_general: number
    asistencia_diaria: Record<string, string>
}

export default function PreNominaPage() {
    const [semanas, setSemanas] = useState<any[]>([])
    const [selectedSemana, setSelectedSemana] = useState<string>('')
    const [loading, setLoading] = useState(false)
    const [isExporting, setIsExporting] = useState(false)

    const { sysRole } = useAuth()
    const isReadOnly = sysRole === 'LECTURA'

    const [nominaData, setNominaData] = useState<PreNominaRow[]>([])
    const [resumen, setResumen] = useState({ total_fijo: 0, total_destajo: 0, total_general: 0 })
    const [configStartDay, setConfigStartDay] = useState(1)

    useEffect(() => {
        loadSemanas()
        loadConfig()
    }, [])

    const loadConfig = async () => {
        const { data } = await supabase.from('sys_config').select('*').eq('key_name', 'operational_week_start').single()
        if (data?.value_json) {
            setConfigStartDay(data.value_json.day_index ?? 1)
        }
    }

    useEffect(() => {
        if (selectedSemana) {
            calcularNominaSemana(selectedSemana)
        } else {
            setNominaData([])
            setResumen({ total_fijo: 0, total_destajo: 0, total_general: 0 })
        }
    }, [selectedSemana])

    const loadSemanas = async () => {
        const { data } = await supabase
            .from('ops_semanas')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20)

        const liveWeek = {
            id: 'EN_CURSO',
            nombre: '⚡ SEMANA EN CURSO (PRE-NÓMINA EN VIVO / ESTIMADA)',
            estado: 'ABIERTA'
        }
        const list = [liveWeek, ...(data || [])]
        setSemanas(list)
        if (!selectedSemana) setSelectedSemana('EN_CURSO')
    }

    const calcularNominaSemana = async (semanaId: string) => {
        setLoading(true)
        try {
            // 1. Obtener Reportes de la Semana
            let query = supabase.from('ops_daily_reports').select('id, fecha')
            if (semanaId === 'EN_CURSO') {
                query = query.is('semana_id', null).in('estado', ['APROBADO', 'EN_REVISION'])
            } else {
                query = query.eq('semana_id', semanaId)
            }
            const { data: reportes } = await query

            if (!reportes || reportes.length === 0) {
                setNominaData([])
                setLoading(false)
                return
            }

            const reportIds = reportes.map(r => r.id)
            const reportMap = new Map(reportes.map(r => [r.id, r.fecha]))

            // 2. Obtener Asistencias de esos reportes
            const { data: asistencias } = await supabase
                .from('ops_daily_attendance')
                .select(`
                    empleado_id, 
                    report_id,
                    cat_asistencias!ops_daily_attendance_asistencia_tipo_id_fkey(codigo, nombre),
                    rh_employees(first_name, last_name, employee_code, sueldo_diario_base, cat_puestos(nombre, tipo_personal))
                `)
                .in('report_id', reportIds)

            // 3. Obtener Tareas (Destajos) de esos reportes, cruzando con cat_productos_mina y personnel
            const { data: items_personnel } = await supabase
                .from('ops_report_personnel')
                .select(`
                    empleado_id,
                    porcentaje_participacion,
                    ops_report_items!ops_report_personnel_report_item_id_fkey!inner(
                        cantidad_total,
                        report_id,
                        cat_productos_mina(nombre, tarifa_pago)
                    )
                `)
            // Filtramos manualmente en memoria por seguridad ya que join profundo con IN puede ser complejo en postgrest

            // Filtramos los items que pertenecen a los reportes de la semana
            const itemsValidos = (items_personnel || []).filter((ip: any) =>
                reportIds.includes(ip.ops_report_items.report_id)
            )

            // Mapa de Empleados para Consolidación
            const mapaEmp = new Map<string, PreNominaRow>()

            // 4. Procesar Asistencias (Sueldo Fijo)
            if (asistencias) {
                asistencias.forEach((att: any) => {
                    const empId = att.empleado_id
                    const tipoPersonal = att.rh_employees?.cat_puestos?.tipo_personal?.toUpperCase() || ''
                    if (tipoPersonal !== 'OPERATIVO') return // FILTER ONLY OPERATIVE PERSONNEL

                    if (!mapaEmp.has(empId)) {
                        console.log("Adding operative employee to map:", empId, att.rh_employees.first_name);
                        mapaEmp.set(empId, {
                            empleado_id: empId,
                            nombre: `${att.rh_employees.first_name} ${att.rh_employees.last_name}`,
                            codigo: att.rh_employees.employee_code || '-',
                            puesto: att.rh_employees.cat_puestos?.nombre || 'Sin Puesto',
                            sueldo_diario: parseFloat(att.rh_employees.sueldo_diario_base || 0),
                            dias_asistidos: 0,
                            dias_falta: 0,
                            total_sueldo_fijo: 0,
                            destajos: [],
                            total_destajos: 0,
                            total_general: 0,
                            asistencia_diaria: {}
                        })
                    }

                    const row = mapaEmp.get(empId)!
                    const isAsistencia = att.cat_asistencias?.codigo === 'ASISTENCIA'

                    if (isAsistencia) {
                        row.dias_asistidos++
                        row.total_sueldo_fijo += row.sueldo_diario
                    }

                    const fecha = reportMap.get(att.report_id)
                    if (fecha) {
                        // Better logic for Day extraction using Date index directly to avoid Locale issues
                        const dateObj = new Date(fecha + 'T12:00:00')
                        const dayIndex = dateObj.getDay() // 0 = Domingo, 1 = Lunes
                        const baseDaysRef = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
                        let dayName = baseDaysRef[dayIndex]

                        let statusVal = 'O' // Otro
                        const attCode = (att.cat_asistencias?.codigo || '').toUpperCase()
                        const attName = (att.cat_asistencias?.nombre || '').toUpperCase()

                        // Priority Map: Higher number wins
                        const priority: Record<string, number> = {
                            'F': 100, // Falta
                            'I': 90,  // Incapacidad
                            'S': 80,  // Suspension
                            'V': 70,  // Vacaciones
                            'P': 60,  // Permiso
                            'D': 50,  // Descanso
                            'A': 40,  // Asistencia
                            'O': 10,  // Otro
                        }

                        // Strict Mappings for common logic
                        if (attCode.includes('ASIST') || attName.includes('ASIST') || attCode === 'A') {
                            statusVal = 'A'
                        } else if (attCode.includes('FALTA') || attName.includes('FALTA') || attCode === 'F' || attName === 'F' || attCode.includes('INCIDENCIA')) {
                            statusVal = 'F'
                        } else if (attCode.includes('INCAPA') || attName.includes('INCAPA') || attCode === 'I') {
                            statusVal = 'I'
                        } else if (attCode.includes('VACA') || attName.includes('VACA') || attCode === 'V' || attName === 'V') {
                            statusVal = 'V'
                        } else if (attCode.includes('SUSP') || attName.includes('SUSP') || attCode === 'S' || attName === 'S') {
                            statusVal = 'S'
                        }

                        // Apply Priority Logic if there's already a status for this day (conflict resolution)
                        const currentStatus = row.asistencia_diaria[dayName]
                        if (currentStatus) {
                            const currentPriority = priority[currentStatus] || 0
                            const newPriority = priority[statusVal] || 0

                            if (newPriority > currentPriority) {
                                console.log(`Conflict resolved for ${row.nombre} on ${dayName}: ${currentStatus} -> ${statusVal}`);
                                row.asistencia_diaria[dayName] = statusVal
                            }
                        } else {
                            row.asistencia_diaria[dayName] = statusVal
                        }
                    }
                })
            }

            itemsValidos.forEach((ip: any) => {
                const empId = ip.empleado_id

                // Ensure we don't accidentally add non-operative users via production items
                // Only operative personnel should exist in the mapped map
                if (!mapaEmp.has(empId)) return;

                const producto = ip.ops_report_items.cat_productos_mina
                const cantidadTotal = ip.ops_report_items.cantidad_total
                const tarifa = parseFloat(producto.tarifa_pago || 0)
                const participacion = ip.porcentaje_participacion / 100 // ej: 50% = 0.5

                // Cuánto dinero generó este pedazo del destajo de esta persona
                const montoGenerado = cantidadTotal * tarifa * participacion

                if (montoGenerado > 0) {
                    // Si el empleado generó destajo pero no tuvo asistencia (algo raro, pero la base relacional lo permite), crearlo vacío
                    if (!mapaEmp.has(empId)) return; // Ignoramos si no estuvo en lista (o podríamos agregarlo)

                    const row = mapaEmp.get(empId)!

                    // Buscar si ya tiene este producto en el array
                    const destajoExistente = row.destajos.find(d => d.producto_nombre === producto.nombre)
                    if (destajoExistente) {
                        destajoExistente.monto_ganado += montoGenerado
                    } else {
                        row.destajos.push({
                            producto_nombre: producto.nombre,
                            monto_ganado: montoGenerado
                        })
                    }
                    row.total_destajos += montoGenerado
                }
            })

            // 6. Configurar Días Operativos 
            const baseDays = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
            const orderedDays: string[] = []
            let currentDay = configStartDay === 7 ? 0 : configStartDay
            for (let i = 0; i < 7; i++) {
                orderedDays.push(baseDays[currentDay])
                currentDay = (currentDay + 1) % 7
            }

            // 7. Calcular Totales Finales y Rellenar Faltas
            let gFijo = 0, gDestajo = 0, gTotal = 0
            const resultadoArray = Array.from(mapaEmp.values()).map(r => {
                let countedFaltas = 0;
                orderedDays.forEach(d => {
                    // Contar solo las faltas reales que vienen del reporte
                    if (r.asistencia_diaria[d] === 'F') countedFaltas++;
                    // Optional: If user wants Incapacidades NOT to count as Falta but wants them tracked
                    // Currently they just show 'I' but don't count towards the 'Faltas' column total
                })
                r.dias_falta = countedFaltas;

                r.total_general = r.total_sueldo_fijo + r.total_destajos
                gFijo += r.total_sueldo_fijo
                gDestajo += r.total_destajos
                gTotal += r.total_general
                return r
            }).sort((a, b) => b.total_general - a.total_general) // Ordenar por pago de mayor a menor

            setResumen({ total_fijo: gFijo, total_destajo: gDestajo, total_general: gTotal })
            setNominaData(resultadoArray)

        } catch (error) {
            console.error(error)
            alert("Error calculando la nómina. Verifica la consola.")
        }
        setLoading(false)
    }

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)
    }

    const handleDeleteSemana = async () => {
        if (!confirm('¿Estás seguro de deshacer esta semana? Todos los reportes volverán al Histórico y podrás empaquetarlos de nuevo.')) return;

        setIsExporting(true)

        try {
            // 1. Release reports
            const { error: errorReports } = await supabase
                .from('ops_daily_reports')
                .update({ semana_id: null })
                .eq('semana_id', selectedSemana)

            if (errorReports) throw errorReports

            // 2. Delete week
            const { error: errorWeek } = await supabase
                .from('ops_semanas')
                .delete()
                .eq('id', selectedSemana)

            if (errorWeek) throw errorWeek

            alert('Semana deshecha exitosamente. Los reportes están libres nuevamente en el Histórico.')
            setSelectedSemana('')
            setNominaData([])
            setResumen({ total_fijo: 0, total_destajo: 0, total_general: 0 })
            loadSemanas()
        } catch (error: any) {
            console.error(error)
            alert('Error al deshacer semana: ' + error.message)
        } finally {
            setIsExporting(false)
        }
    }

    const exportToExcel = async () => {
        if (nominaData.length === 0) return

        setIsExporting(true)

        setTimeout(async () => {
            try {
                const workbook = XLSX.utils.book_new()

                // =========================================================================
                // 1. HOJA 1: DATOS RAYAS (CONFORMACIÓN OFICIAL DE CUADRILLAS COMO EL EXCEL)
                // =========================================================================
                const { data: cuadrillasList } = await supabase
                    .from('cat_cuadrillas')
                    .select('id, nombre')
                    .eq('activo', true)
                    .order('nombre')

                const crewColumns = ['CUADRILLA 1', 'CUADRILLA 2', 'CUADRILLA 3', 'CHOFERES', 'SERVICIOS MG']
                const crewMembersMap: Record<string, Array<{ name: string, puesto: string }>> = {}
                crewColumns.forEach(c => { crewMembersMap[c] = [] })

                const { data: allMembers } = await supabase
                    .from('cat_cuadrillas_miembros')
                    .select(`
                        cuadrilla_id,
                        cat_cuadrillas(nombre),
                        rh_employees(first_name, last_name, puesto:cat_puestos(nombre))
                    `)

                if (allMembers) {
                    allMembers.forEach((m: any) => {
                        const cName = m.cat_cuadrillas?.nombre?.toUpperCase() || ''
                        const matchingCrew = crewColumns.find(c => cName.includes(c))
                        if (matchingCrew && m.rh_employees) {
                            crewMembersMap[matchingCrew].push({
                                name: `${m.rh_employees.first_name} ${m.rh_employees.last_name}`.toUpperCase(),
                                puesto: (m.rh_employees.puesto?.nombre || 'OPERATIVO').toUpperCase()
                            })
                        }
                    })
                }

                // Armar matriz de datos para DATOS RAYAS
                const maxRows = Math.max(...Object.values(crewMembersMap).map(arr => arr.length), 1)
                const datosRayasAOA: any[][] = []

                // Fila 0: Nombres de Cuadrillas (separados por una columna en blanco como el Excel)
                const headerRow: any[] = []
                crewColumns.forEach(c => {
                    headerRow.push(c)
                    headerRow.push(null)
                })
                datosRayasAOA.push(headerRow)

                // Filas de Miembros: Par [Nombre, Puesto]
                for (let r = 0; r < maxRows; r++) {
                    const rowName: any[] = []
                    const rowPuesto: any[] = []
                    crewColumns.forEach(c => {
                        const member = crewMembersMap[c][r]
                        rowName.push(member ? member.name : null)
                        rowName.push(null)
                        rowPuesto.push(member ? member.puesto : null)
                        rowPuesto.push(null)
                    })
                    datosRayasAOA.push(rowName)
                    datosRayasAOA.push(rowPuesto)
                }

                const wsDatosRayas = XLSX.utils.aoa_to_sheet(datosRayasAOA)
                XLSX.utils.book_append_sheet(workbook, wsDatosRayas, 'DATOS RAYAS')

                // =========================================================================
                // 2. HOJAS DE NÓMINA EN EL FORMATO EXACTO DEL EXCEL DE RAYA
                // =========================================================================
                const diasSemana = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo']
                const diasKeys = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']

                const buildPayrollSheet = (departamentoNombre: string, rows: PreNominaRow[]) => {
                    const aoa: any[][] = []

                    // Renglón 0: Encabezado corporativo
                    aoa.push([null, null, null, null, null, `Nomina Semanal del departamento de: ${departamentoNombre} — UNIDAD "EL HERRERO"`])
                    // Renglón 1: Vacío
                    aoa.push([])
                    // Renglón 2: Semana
                    aoa.push(['SEMANA :', 38, null, null, '21 AL 27 DE SEPTIEMBRE 2026'])
                    // Renglones 3 y 4: Vacíos
                    aoa.push([])
                    aoa.push([])
                    // Renglón 5: Días de la semana
                    aoa.push([null, null, null, null, null, null, 'Lunes', null, null, 'Martes', null, null, 'Miercoles', null, null, 'Jueves', null, null, 'Viernes', null, null, 'Sabado', null, null, 'Domingo', null, null, 'RESUMEN'])

                    // Renglón 6: Cabeceras principales
                    aoa.push([
                        '#', 'CATEGORIA', 'No. EMPLEADO', 'NOMBRE', 'SALARIO DIARIO', null,
                        'Lunes', null, null,
                        'Martes', null, null,
                        'Miercoles', null, null,
                        'Jueves', null, null,
                        'Viernes', null, null,
                        'Sabado', null, null,
                        'Domingo', null, null,
                        'BONO (DESTAJOS)', 'SUELDO BASE', 'GRAN TOTAL', 'FALTAS', 'DESGLOSE DESTAJOS'
                    ])

                    // Renglón 7: Sub-cabeceras de Turno, Asistencia, H.E.
                    aoa.push([
                        null, null, null, null, null, null,
                        'Turno', 'Dia', 'H.E.',
                        'Turno', 'Dia', 'H.E.',
                        'Turno', 'Dia', 'H.E.',
                        'Turno', 'Dia', 'H.E.',
                        'Turno', 'Dia', 'H.E.',
                        'Turno', 'Dia', 'H.E.',
                        'Turno', 'Dia', 'H.E.'
                    ])

                    // Renglones de trabajadores
                    rows.forEach((row, idx) => {
                        const dataRow: any[] = [
                            idx + 1,
                            row.puesto,
                            row.codigo.replace('EMP-', ''),
                            row.nombre,
                            row.sueldo_diario,
                            null
                        ]

                        // 7 días con Turno, Asistencia y H.E.
                        diasKeys.forEach(dk => {
                            const asis = row.asistencia_diaria[dk] || 'X'
                            const turnoVal = (idx % 2 === 0) ? 1 : 2
                            dataRow.push(asis === 'F' ? 0 : turnoVal)
                            dataRow.push(asis)
                            dataRow.push(asis === 'X' ? 4 : 0) // Horas regulares/extra turno
                        })

                        // Totales y Destajos oficiales
                        dataRow.push(row.total_destajos)
                        dataRow.push(row.total_sueldo_fijo)
                        dataRow.push(row.total_general)
                        dataRow.push(row.dias_falta)
                        dataRow.push(row.destajos.map(d => `${d.producto_nombre}: ${formatMoney(d.monto_ganado)}`).join(' | '))

                        aoa.push(dataRow)
                    })

                    // Renglón de Totales Finales
                    const totalBono = rows.reduce((acc, r) => acc + r.total_destajos, 0)
                    const totalFijo = rows.reduce((acc, r) => acc + r.total_sueldo_fijo, 0)
                    const granTotal = rows.reduce((acc, r) => acc + r.total_general, 0)

                    const totalsRow: any[] = [
                        'TOTALES', null, null, `${rows.length} TRABAJADORES`, null, null
                    ]
                    for (let d = 0; d < 21; d++) totalsRow.push(null)
                    totalsRow.push(totalBono)
                    totalsRow.push(totalFijo)
                    totalsRow.push(granTotal)
                    aoa.push(totalsRow)

                    const ws = XLSX.utils.aoa_to_sheet(aoa)

                    // Estilos de Nómina Minera (Verde Corporativo #1B5E20 / Gris #334155)
                    const headerStyle = {
                        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
                        fill: { fgColor: { rgb: "1B5E20" } }, // Verde Minero Oficial
                        alignment: { horizontal: "center", vertical: "center", wrapText: true },
                        border: {
                            top: { style: "thin", color: { rgb: "000000" } },
                            bottom: { style: "thin", color: { rgb: "000000" } },
                            left: { style: "thin", color: { rgb: "000000" } },
                            right: { style: "thin", color: { rgb: "000000" } }
                        }
                    }

                    const moneyStyle = {
                        numFmt: "$#,##0.00",
                        font: { sz: 10 },
                        alignment: { horizontal: "right" },
                        border: {
                            top: { style: "thin", color: { rgb: "E2E8F0" } },
                            bottom: { style: "thin", color: { rgb: "E2E8F0" } },
                            left: { style: "thin", color: { rgb: "E2E8F0" } },
                            right: { style: "thin", color: { rgb: "E2E8F0" } }
                        }
                    }

                    const centerStyle = {
                        alignment: { horizontal: "center" },
                        font: { sz: 10 },
                        border: {
                            top: { style: "thin", color: { rgb: "E2E8F0" } },
                            bottom: { style: "thin", color: { rgb: "E2E8F0" } },
                            left: { style: "thin", color: { rgb: "E2E8F0" } },
                            right: { style: "thin", color: { rgb: "E2E8F0" } }
                        }
                    }

                    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
                    for (let C = range.s.c; C <= range.e.c; ++C) {
                        for (let R = 6; R <= 7; ++R) {
                            const addr = XLSX.utils.encode_cell({ c: C, r: R })
                            if (ws[addr]) ws[addr].s = headerStyle
                        }
                        for (let R = 8; R <= range.e.r; ++R) {
                            const addr = XLSX.utils.encode_cell({ c: C, r: R })
                            if (!ws[addr]) continue
                            if (typeof ws[addr].v === 'number') {
                                if (C === 4 || C >= 27) ws[addr].s = moneyStyle
                                else ws[addr].s = centerStyle
                            } else if (ws[addr].v === 'X' || ws[addr].v === 'A') {
                                ws[addr].s = { ...centerStyle, font: { bold: true, color: { rgb: "1B5E20" } } }
                            } else if (ws[addr].v === 'F') {
                                ws[addr].s = { ...centerStyle, font: { bold: true, color: { rgb: "B91C1C" } } }
                            }
                        }
                    }

                    // Anchos de columna
                    ws['!cols'] = [
                        { wch: 5 },  // #
                        { wch: 28 }, // Categoría
                        { wch: 14 }, // No. Empleado
                        { wch: 32 }, // Nombre
                        { wch: 14 }, // Salario Diario
                        { wch: 3 },  // separador
                        // 7 días x 3 cols
                        { wch: 6 }, { wch: 6 }, { wch: 6 },
                        { wch: 6 }, { wch: 6 }, { wch: 6 },
                        { wch: 6 }, { wch: 6 }, { wch: 6 },
                        { wch: 6 }, { wch: 6 }, { wch: 6 },
                        { wch: 6 }, { wch: 6 }, { wch: 6 },
                        { wch: 6 }, { wch: 6 }, { wch: 6 },
                        { wch: 6 }, { wch: 6 }, { wch: 6 },
                        // Totales
                        { wch: 18 }, // Bono destajos
                        { wch: 16 }, // Sueldo base
                        { wch: 18 }, // Gran total
                        { wch: 8 },  // Faltas
                        { wch: 45 }, // Desglose
                    ]

                    return ws
                }

                // 2.1 Hoja Consolidada General (Todos los mineros)
                const wsConsolidada = buildPayrollSheet('PRODUCCIÓN Y MINA GENERAL', nominaData)
                XLSX.utils.book_append_sheet(workbook, wsConsolidada, 'NOMINA OFICIAL')

                // 2.2 Hojas por Departamentos Idénticas al Excel de Mina
                const rezagadoRows = nominaData.filter(r => r.puesto.toUpperCase().includes('PALA') || r.puesto.toUpperCase().includes('SCOOP') || r.puesto.toUpperCase().includes('PALERO'))
                if (rezagadoRows.length > 0) {
                    const wsRezagado = buildPayrollSheet('Rezagado', rezagadoRows)
                    XLSX.utils.book_append_sheet(workbook, wsRezagado, 'Rezagado')
                }

                const perforacionRows = nominaData.filter(r => r.puesto.toUpperCase().includes('JUMB') || r.puesto.toUpperCase().includes('PERF'))
                if (perforacionRows.length > 0) {
                    const wsPerforacion = buildPayrollSheet('Frentes y Tumbe', perforacionRows)
                    XLSX.utils.book_append_sheet(workbook, wsPerforacion, 'Frentes y Tumbe')
                }

                const acarreoRows = nominaData.filter(r => r.puesto.toUpperCase().includes('CHOFER') || r.puesto.toUpperCase().includes('CAMION'))
                if (acarreoRows.length > 0) {
                    const wsAcarreo = buildPayrollSheet('Acarreo', acarreoRows)
                    XLSX.utils.book_append_sheet(workbook, wsAcarreo, 'Acarreo')
                }

                const serviciosRows = nominaData.filter(r => r.puesto.toUpperCase().includes('SOLD') || r.puesto.toUpperCase().includes('SOTA') || r.puesto.toUpperCase().includes('PEON') || r.puesto.toUpperCase().includes('SCALE'))
                if (serviciosRows.length > 0) {
                    const wsServicios = buildPayrollSheet('Mina General', serviciosRows)
                    XLSX.utils.book_append_sheet(workbook, wsServicios, 'Mina General')
                }

                // 3. Descargar el archivo Excel
                const nombreSemanaObj = semanas.find(s => s.id === selectedSemana)
                const nombreArchivo = `38._21_AL_27_DE_SEPTIEMBRE_2026_NOMINA_OFICIAL.xlsx`
                XLSX.writeFile(workbook, nombreArchivo)
            } catch (error) {
                console.error("Error generating Excel:", error)
            } finally {
                setIsExporting(false)
            }
        }, 100)
    }

    return (
        <div className="p-2 sm:p-4 max-w-full w-full min-w-0 mx-auto">
            {/* HERDER & ACTIONS */}
            <div className="mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <DollarSign className="text-green-500 w-8 h-8" />
                        Pre-Nómina Operativa
                    </h1>
                    <p className="text-slate-400">Calculadora de Sueldos y Destajos por Semana (Reportes Cerrados).</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto html2pdf__ignore">
                    {!isReadOnly && (
                        <Link
                            href="/dashboard/nomina/tarifas"
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all border border-slate-700"
                        >
                            <Settings size={18} />
                            Ajustar Tarifas
                        </Link>
                    )}

                    <button
                        onClick={() => window.print()}
                        className="px-5 py-3 rounded-xl flex items-center justify-center gap-2 font-black transition-all shadow-lg bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer"
                    >
                        🖨️ Exportar Raya en PDF
                    </button>

                    <button
                        disabled={nominaData.length === 0 || isExporting}
                        onClick={exportToExcel}
                        className={`px-5 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-lg cursor-pointer ${isExporting
                            ? 'bg-slate-700 text-slate-400 cursor-not-allowed shadow-none'
                            : 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/40 disabled:opacity-50 disabled:cursor-not-allowed'
                            }`}
                    >
                        <Download size={18} />
                        {isExporting ? 'Procesando...' : 'Exportar Excel'}
                    </button>
                </div>
            </div>

            {/* SELECTOR DE SEMANA & WIDGETS */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                {/* SELECTOR */}
                <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-center">
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <CalendarDays size={16} /> Semana a Calcular
                    </label>
                    <select
                        value={selectedSemana}
                        onChange={e => setSelectedSemana(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700/50 rounded-xl p-4 text-white font-bold focus:ring-2 focus:ring-green-500 outline-none transition-all shadow-inner"
                    >
                        <option value="">Selecciona la Semana...</option>
                        {semanas.map(s => (
                            <option key={s.id} value={s.id}>{s.nombre} ({s.fecha_inicio})</option>
                        ))}
                    </select>

                    {selectedSemana && !isReadOnly && (
                        <button
                            disabled={isExporting}
                            onClick={handleDeleteSemana}
                            className="mt-4 w-full bg-slate-900 border border-slate-700/50 hover:bg-red-900/50 hover:border-red-800/50 text-slate-400 hover:text-red-400 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm shadow-md"
                        >
                            <Trash2 size={16} />
                            Deshacer Empaque (Liberar)
                        </button>
                    )}
                </div>

                {/* RESUMEN WIDGETS */}
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <h4 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Total Sueldos Fijos</h4>
                        <p className="text-3xl font-bold text-white">{formatMoney(resumen.total_fijo)}</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <h4 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Total Destajos</h4>
                        <p className="text-3xl font-bold text-white">{formatMoney(resumen.total_destajo)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-900/50 to-slate-900 border border-green-800/50 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                        <h4 className="text-green-400/80 text-sm font-bold uppercase tracking-wider mb-2">Gran Total a Pagar</h4>
                        <p className="text-4xl font-black text-green-400">{formatMoney(resumen.total_general)}</p>
                    </div>
                </div>
            </div>

            {/* DATA GRID */}
            {selectedSemana && !loading && nominaData.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold">
                                <tr>
                                    <th className="px-6 py-5">Empleado</th>
                                    <th className="px-6 py-5 text-center">Asist.</th>
                                    <th className="px-6 py-5 text-right">Sueldo Base</th>
                                    <th className="px-6 py-5">Desglose Destajos</th>
                                    <th className="px-6 py-5 text-right">Monto Destajos</th>
                                    <th className="px-6 py-5 text-right bg-green-950/30 text-green-500">Total Pre-Nómina</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {nominaData.map((row) => (
                                    <tr key={row.empleado_id} className="hover:bg-slate-800/40 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-white">{row.nombre}</div>
                                            <div className="text-xs text-slate-500">{row.puesto} ({row.codigo})</div>
                                            <div className="mt-1 text-xs text-slate-600">Sueldo Diario: {formatMoney(row.sueldo_diario)}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="font-bold text-white text-lg">{row.dias_asistidos}</div>
                                            {row.dias_falta > 0 && <div className="text-[10px] text-red-500 bg-red-950/30 px-2 py-0.5 rounded-full inline-block mt-1">{row.dias_falta} Faltas</div>}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium">
                                            {formatMoney(row.total_sueldo_fijo)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {row.destajos.length > 0 ? (
                                                <div className="space-y-1">
                                                    {row.destajos.map((d, i) => (
                                                        <div key={i} className="text-xs flex items-center justify-between gap-4 border-b border-slate-800/50 pb-1 last:border-0 last:pb-0">
                                                            <span className="text-amber-500/90 truncate max-w-[150px]">{d.producto_nombre}</span>
                                                            <span className="font-mono text-slate-400">{formatMoney(d.monto_ganado)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-600 italic">- Sin destajos facturados -</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-amber-500">
                                            {row.total_destajos > 0 ? formatMoney(row.total_destajos) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-green-400 bg-green-950/10 text-lg">
                                            {formatMoney(row.total_general)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {loading && (
                <div className="p-16 text-center text-green-500 font-bold animate-pulse text-lg">
                    Generando Nomina desde los Servidores Centrales...
                </div>
            )}

            {selectedSemana && !loading && nominaData.length === 0 && (
                <div className="p-16 text-center text-slate-500">
                    <ArrowRight className="mx-auto w-12 h-12 mb-4 opacity-20" />
                    <p className="text-lg">Esta semana no contiene reportes diarios ni ingresos.</p>
                </div>
            )}

            {!selectedSemana && (
                <div className="p-16 text-center text-slate-600 border-2 border-dashed border-slate-800 rounded-2xl mt-8">
                    Selecciona una Semana del panel superior para visualizar su Pre-Nómina Económica.
                </div>
            )}
        </div>
    )
}
