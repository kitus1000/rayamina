'use client'

import { useState, useEffect } from 'react'
import { CalendarDays, DollarSign, Download, ArrowRight, Settings, Trash2, FileSpreadsheet, Table as TableIcon } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx-js-style'
import { useAuth } from '@/lib/auth-context'
import {
    OfficialPayrollRow,
    ExcelDepartmentName,
    EXCEL_DEPARTMENTS,
    DAY_KEYS_ORDER,
    DAY_LABELS,
    DayCellData,
    DayKey,
    normalizeIncidenceCode,
    getIncidenceSpec,
    isWorkingIncidence,
    resolveShiftNumber,
    resolveExcelDepartment,
    resolveRestingBonusForPosition,
    buildConsultaWorksheet,
    buildOfficialDepartmentWorksheet,
    OFFICIAL_INCIDENCES,
} from '@/lib/nomina-oficial'

export default function PreNominaPage() {
    const [semanas, setSemanas] = useState<any[]>([])
    const [selectedSemana, setSelectedSemana] = useState<string>('')
    const [loading, setLoading] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [guardiaFilter, setGuardiaFilter] = useState<'TODAS' | 'MINA' | 'DESCANSO'>('TODAS')
    const [deptFilter, setDeptFilter] = useState<'TODOS' | ExcelDepartmentName>('TODOS')
    const [viewMode, setViewMode] = useState<'EXCEL' | 'RESUMEN'>('EXCEL')
    const [excelConfig, setExcelConfig] = useState<any>(null)

    const { sysRole } = useAuth()
    const isReadOnly = sysRole === 'LECTURA'

    const [nominaData, setNominaData] = useState<OfficialPayrollRow[]>([])
    const [resumen, setResumen] = useState({
        total_fijo: 0,
        total_destajo: 0,
        total_descuentos: 0,
        total_general: 0,
        total_he_dobles: 0,
        total_he_triples: 0,
    })

    useEffect(() => {
        loadSemanas()
        loadConfigs()
    }, [])

    const loadConfigs = async () => {
        const { data: excelCfg } = await supabase
            .from('sys_config')
            .select('value_json')
            .eq('key_name', 'ops_nomina_excel_config_v1')
            .maybeSingle()
        if (excelCfg?.value_json) {
            setExcelConfig(excelCfg.value_json)
        }
    }

    useEffect(() => {
        if (selectedSemana) {
            calcularNominaSemana(selectedSemana)
        } else {
            setNominaData([])
            setResumen({
                total_fijo: 0,
                total_destajo: 0,
                total_descuentos: 0,
                total_general: 0,
                total_he_dobles: 0,
                total_he_triples: 0,
            })
        }
    }, [selectedSemana, excelConfig])

    const loadSemanas = async () => {
        const { data } = await supabase
            .from('ops_semanas')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20)

        const liveWeek = {
            id: 'EN_CURSO',
            nombre: '⚡ SEMANA EN CURSO (PRE-NÓMINA EN VIVO / ESTIMADA)',
            numero_semana: 38,
            fecha_inicio: '2026-09-21',
            estado: 'ABIERTA',
        }
        const list = [liveWeek, ...(data || [])]
        setSemanas(list)
        if (!selectedSemana) setSelectedSemana('EN_CURSO')
    }

    const createEmptyDays = (): Record<DayKey, DayCellData> => ({
        lunes: { turno: 0, dia: 'X', he: 0 },
        martes: { turno: 0, dia: 'X', he: 0 },
        miercoles: { turno: 0, dia: 'X', he: 0 },
        jueves: { turno: 0, dia: 'X', he: 0 },
        viernes: { turno: 0, dia: 'X', he: 0 },
        sabado: { turno: 0, dia: 'X', he: 0 },
        domingo: { turno: 0, dia: 'X', he: 0 },
    })

    const calcularNominaSemana = async (semanaId: string) => {
        setLoading(true)
        try {
            // 1. Reportes de la semana incluyendo turno
            let query = supabase
                .from('ops_daily_reports')
                .select('id, fecha, cat_turnos(codigo, nombre)')
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
            const reportMap = new Map(
                reportes.map(r => {
                    const tObj = Array.isArray((r as any).cat_turnos) ? (r as any).cat_turnos[0] : (r as any).cat_turnos
                    return [r.id, { fecha: r.fecha, turnoCodigo: tObj?.codigo || 'T1' }]
                })
            )

            // 2. Asistencias e Incidencias Oficiales (incluyendo horas trabajadas y observaciones)
            const { data: asistencias } = await supabase
                .from('ops_daily_attendance')
                .select(`
                    empleado_id,
                    report_id,
                    horas_trabajadas,
                    observaciones,
                    observacion,
                    cat_asistencias!ops_daily_attendance_asistencia_tipo_id_fkey(codigo, nombre),
                    rh_employees(id, first_name, last_name, employee_code, sueldo_diario_base, cat_puestos(nombre, tipo_personal))
                `)
                .in('report_id', reportIds)

            // 3. Destajos de reportes válidos
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

            const itemsValidos = (items_personnel || []).filter((ip: any) =>
                reportIds.includes(ip.ops_report_items.report_id)
            )

            // 4. Cuadrillas y Turno Actual 14x7
            const { data: squadMembersData } = await supabase
                .from('cat_cuadrillas_miembros')
                .select(`
                    empleado_id,
                    cuadrilla_id,
                    cat_cuadrillas(id, nombre, codigo, turno_actual_id, cat_turnos(codigo, nombre)),
                    rh_employees(id, first_name, last_name, employee_code, sueldo_diario_base, status, cat_puestos(nombre, tipo_personal))
                `)

            const empSquadMeta = new Map<
                string,
                { cuadrilla_nombre: string; guardia_14x7: 'DIA' | 'NOCHE' | 'DESCANSO'; emp?: any }
            >()
            if (squadMembersData) {
                squadMembersData.forEach((sm: any) => {
                    const cuad = Array.isArray(sm.cat_cuadrillas) ? sm.cat_cuadrillas[0] : sm.cat_cuadrillas
                    const turnoObj = cuad?.cat_turnos ? (Array.isArray(cuad.cat_turnos) ? cuad.cat_turnos[0] : cuad.cat_turnos) : null
                    const tCode = (turnoObj?.codigo || 'T1').toUpperCase()
                    const guardia: 'DIA' | 'NOCHE' | 'DESCANSO' =
                        tCode === 'DESC' ? 'DESCANSO' : tCode === 'T2' ? 'NOCHE' : 'DIA'
                    empSquadMeta.set(sm.empleado_id, {
                        cuadrilla_nombre: cuad?.nombre || 'Cuadrilla General',
                        guardia_14x7: guardia,
                        emp: Array.isArray(sm.rh_employees) ? sm.rh_employees[0] : sm.rh_employees,
                    })
                })
            }

            const mapaEmp = new Map<string, OfficialPayrollRow>()
            const obsNotesMap = new Map<string, Set<string>>()

            const baseDaysRef: DayKey[] = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

            // 5. Procesar Asistencias e Incidencias (18 conceptos oficiales)
            if (asistencias) {
                asistencias.forEach((att: any) => {
                    const empId = att.empleado_id
                    const tipoPersonal = att.rh_employees?.cat_puestos?.tipo_personal?.toUpperCase() || ''
                    if (tipoPersonal !== 'OPERATIVO') return

                    const sqMeta = empSquadMeta.get(empId)
                    const fullName = `${att.rh_employees.first_name || ''} ${att.rh_employees.last_name || ''}`.trim()
                    const empCode = att.rh_employees.employee_code || '-'
                    const puestoNombre = att.rh_employees.cat_puestos?.nombre || 'Sin Puesto'
                    const depto = resolveExcelDepartment(empCode, fullName, puestoNombre, excelConfig)

                    if (!mapaEmp.has(empId)) {
                        mapaEmp.set(empId, {
                            empleado_id: empId,
                            nombre: fullName,
                            codigo: empCode,
                            puesto: puestoNombre,
                            departamento: depto,
                            sueldo_diario: parseFloat(att.rh_employees.sueldo_diario_base || 0),
                            cuadrilla_nombre: sqMeta?.cuadrilla_nombre || 'Guardia Mina',
                            guardia_14x7: sqMeta?.guardia_14x7 || 'DIA',
                            dias_pagados: 0,
                            total_sueldo_fijo: 0,
                            dias: createEmptyDays(),
                            bono_bruto: 0,
                            bono_descuento_faltas: 0,
                            bono_neto: 0,
                            faltas: 0,
                            permisos: 0,
                            vacaciones: 0,
                            descanso_trabajado: 0,
                            prima_dominical: 0,
                            horas_extra: 0,
                            horas_extra_dobles: 0,
                            horas_extra_triples: 0,
                            comision_sindical: 0,
                            observaciones: '',
                            destajos: [],
                            total_general: 0,
                        })
                    }

                    const row = mapaEmp.get(empId)!
                    const repInfo = reportMap.get(att.report_id)
                    if (!repInfo) return

                    const incCode = normalizeIncidenceCode(att.cat_asistencias?.codigo, att.cat_asistencias?.nombre)
                    const spec = getIncidenceSpec(incCode)

                    const dateObj = new Date(repInfo.fecha + 'T12:00:00')
                    const dayKey: DayKey = baseDaysRef[dateObj.getDay()]
                    const turnoNum = resolveShiftNumber(repInfo.turnoCodigo, incCode)
                    const heHours = spec.worksShift
                        ? Math.max(0, Number(att.horas_trabajadas ?? 8) - 8)
                        : 0

                    row.dias[dayKey] = {
                        turno: turnoNum,
                        dia: incCode,
                        he: heHours,
                    }

                    const obsTxt = (att.observaciones || att.observacion || '').trim()
                    if (obsTxt) {
                        if (!obsNotesMap.has(empId)) obsNotesMap.set(empId, new Set())
                        obsNotesMap.get(empId)!.add(obsTxt)
                    } else if (['PP', 'PD', 'CE', 'DO', 'DOX', 'TC', 'IRT', 'PM', 'APM', 'B'].includes(incCode)) {
                        if (!obsNotesMap.has(empId)) obsNotesMap.set(empId, new Set())
                        obsNotesMap.get(empId)!.add(`${incCode}: ${spec.nombre}`)
                    }
                })
            }

            // 6. Incorporar Cuadrilla en Descanso (Rol 14x7)
            empSquadMeta.forEach((meta, empId) => {
                if (meta.guardia_14x7 === 'DESCANSO' && meta.emp && !mapaEmp.has(empId)) {
                    const empObj = meta.emp
                    const puestoObj = Array.isArray(empObj.cat_puestos) ? empObj.cat_puestos[0] : empObj.cat_puestos
                    const tipoPersonal = (puestoObj?.tipo_personal || 'OPERATIVO').toUpperCase()
                    if (tipoPersonal !== 'OPERATIVO') return

                    const fullName = `${empObj.first_name || ''} ${empObj.last_name || ''}`.trim()
                    const empCode = empObj.employee_code || '-'
                    const puestoNombre = puestoObj?.nombre || 'Operativo Mina'
                    const depto = resolveExcelDepartment(empCode, fullName, puestoNombre, excelConfig)

                    const restDays: Record<DayKey, DayCellData> = {
                        lunes: { turno: 0, dia: 'D', he: 0 },
                        martes: { turno: 0, dia: 'D', he: 0 },
                        miercoles: { turno: 0, dia: 'D', he: 0 },
                        jueves: { turno: 0, dia: 'D', he: 0 },
                        viernes: { turno: 0, dia: 'D', he: 0 },
                        sabado: { turno: 0, dia: 'D', he: 0 },
                        domingo: { turno: 0, dia: 'D', he: 0 },
                    }

                    mapaEmp.set(empId, {
                        empleado_id: empId,
                        nombre: fullName,
                        codigo: empCode,
                        puesto: puestoNombre,
                        departamento: depto,
                        sueldo_diario: parseFloat(empObj.sueldo_diario_base || 0),
                        cuadrilla_nombre: meta.cuadrilla_nombre,
                        guardia_14x7: 'DESCANSO',
                        dias_pagados: 7,
                        total_sueldo_fijo: 0,
                        dias: restDays,
                        bono_bruto: 0,
                        bono_descuento_faltas: 0,
                        bono_neto: 0,
                        faltas: 0,
                        permisos: 0,
                        vacaciones: 0,
                        descanso_trabajado: 0,
                        prima_dominical: 0,
                        horas_extra: 0,
                        horas_extra_dobles: 0,
                        horas_extra_triples: 0,
                        comision_sindical: 0,
                        observaciones: 'DESCANSO ROL 14x7',
                        destajos: [],
                        total_general: 0,
                    })
                }
            })

            // 7. Destajos de Producción
            itemsValidos.forEach((ip: any) => {
                const empId = ip.empleado_id
                if (!mapaEmp.has(empId)) return

                const producto = ip.ops_report_items.cat_productos_mina
                const cantidadTotal = ip.ops_report_items.cantidad_total
                const tarifa = parseFloat(producto.tarifa_pago || 0)
                const participacion = ip.porcentaje_participacion / 100
                const montoGenerado = cantidadTotal * tarifa * participacion

                if (montoGenerado > 0) {
                    const row = mapaEmp.get(empId)!
                    const existing = row.destajos.find(d => d.producto_nombre === producto.nombre)
                    if (existing) {
                        existing.monto_ganado += montoGenerado
                    } else {
                        row.destajos.push({ producto_nombre: producto.nombre, monto_ganado: montoGenerado })
                    }
                    row.bono_bruto += montoGenerado
                }
            })

            // 8. Calcular Fórmulas Exactas del Excel y Reglas de NOTAS
            let gFijo = 0
            let gDestajo = 0
            let gDescuentos = 0
            let gTotal = 0
            let gHeDobles = 0
            let gHeTriples = 0

            const lackDiscountRate = Number(excelConfig?.faltaDiscountPct ?? 0.15)

            const resultadoArray = Array.from(mapaEmp.values()).map(r => {
                let paidDays = 0
                let faltas = 0
                let permisos = 0
                let vacaciones = 0
                let descTrab = 0
                let comSindical = 0
                let horasExtraTotal = 0
                let dDays = 0
                let hasIncapGeneralOrPermOrVac = false
                let hasIRT = false

                DAY_KEYS_ORDER.forEach(dk => {
                    const c = r.dias[dk]
                    const code = c.dia
                    const spec = getIncidenceSpec(code)
                    if (spec.paidBaseDay) paidDays++
                    if (code === 'F') faltas++
                    if (code === 'P') {
                        permisos++
                        hasIncapGeneralOrPermOrVac = true
                    }
                    if (code === 'V') {
                        vacaciones++
                        hasIncapGeneralOrPermOrVac = true
                    }
                    if (code === 'I') {
                        hasIncapGeneralOrPermOrVac = true
                    }
                    if (code === 'IRT') hasIRT = true
                    if (code === 'DX') descTrab++
                    if (code === 'C/S') comSindical++
                    if (code === 'D') dDays++
                    horasExtraTotal += Number(c.he || 0)
                })

                const primaDom = isWorkingIncidence(r.dias.domingo.dia) ? 1 : 0
                const heDobles = Math.min(9, horasExtraTotal)
                const heTriples = Math.max(0, horasExtraTotal - 9)

                // Regla de Bono de Descanso / Bono Fijo (Hoja NOTAS & BONO FIJO & BONOS ST)
                if (r.bono_bruto === 0 && (dDays > 0 || r.guardia_14x7 === 'DESCANSO')) {
                    if (!hasIncapGeneralOrPermOrVac || hasIRT) {
                        const baseRestBonus = resolveRestingBonusForPosition(r.puesto, excelConfig)
                        if (baseRestBonus > 0) {
                            const ratio = hasIRT ? 1 : dDays / 7
                            const calcRest = Number((baseRestBonus * ratio).toFixed(2))
                            r.bono_bruto = calcRest
                            r.destajos.push({
                                producto_nombre: hasIRT
                                    ? 'Bono Promedio Riesgo de Trabajo (IRT)'
                                    : 'Bono de Descanso / Fijo 14×7',
                                monto_ganado: calcRest,
                            })
                        }
                    } else {
                        if (!r.observaciones) {
                            r.observaciones = 'Sin bono de descanso (Incap./Permiso/Vacaciones)'
                        }
                    }
                }

                // Regla NOTAS Fila 5: Descuento 15% del bono por cada Falta ('F')
                const pctDesc = Math.min(1, faltas * lackDiscountRate)
                const discountAmt = Number((r.bono_bruto * pctDesc).toFixed(2))
                const bonoNeto = Math.max(0, Number((r.bono_bruto - discountAmt).toFixed(2)))

                r.dias_pagados = paidDays
                r.total_sueldo_fijo = Number((paidDays * r.sueldo_diario).toFixed(2))
                r.bono_descuento_faltas = discountAmt
                r.bono_neto = bonoNeto
                r.faltas = faltas
                r.permisos = permisos
                r.vacaciones = vacaciones
                r.descanso_trabajado = descTrab
                r.prima_dominical = primaDom
                r.horas_extra = horasExtraTotal
                r.horas_extra_dobles = heDobles
                r.horas_extra_triples = heTriples
                r.comision_sindical = comSindical

                const obsSet = obsNotesMap.get(r.empleado_id)
                if (obsSet && obsSet.size > 0) {
                    r.observaciones = Array.from(obsSet).join(' | ')
                }

                r.total_general = Number((r.total_sueldo_fijo + bonoNeto).toFixed(2))

                gFijo += r.total_sueldo_fijo
                gDestajo += bonoNeto
                gDescuentos += discountAmt
                gTotal += r.total_general
                gHeDobles += heDobles
                gHeTriples += heTriples

                return r
            }).sort((a, b) => a.nombre.localeCompare(b.nombre))

            setResumen({
                total_fijo: gFijo,
                total_destajo: gDestajo,
                total_descuentos: gDescuentos,
                total_general: gTotal,
                total_he_dobles: gHeDobles,
                total_he_triples: gHeTriples,
            })
            setNominaData(resultadoArray)
        } catch (error) {
            console.error(error)
            alert('Error calculando la nómina. Verifica la consola.')
        }
        setLoading(false)
    }

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)
    }

    const handleDeleteSemana = async () => {
        if (!confirm('¿Estás seguro de deshacer esta semana? Todos los reportes volverán al Histórico y podrás empaquetarlos de nuevo.')) return
        setIsExporting(true)
        try {
            const { error: errorReports } = await supabase
                .from('ops_daily_reports')
                .update({ semana_id: null })
                .eq('semana_id', selectedSemana)
            if (errorReports) throw errorReports

            const { error: errorWeek } = await supabase
                .from('ops_semanas')
                .delete()
                .eq('id', selectedSemana)
            if (errorWeek) throw errorWeek

            alert('Semana deshecha exitosamente.')
            setSelectedSemana('')
            setNominaData([])
            loadSemanas()
        } catch (error: any) {
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
                const semObj = semanas.find(s => s.id === selectedSemana)
                const weekNum = Number(semObj?.numero_semana || 38)
                const startDateStr = semObj?.fecha_inicio || '2026-09-21'

                // 1. Hoja 'consulta' (Catálogo de Conceptos + Semanas exacto al .xlsm)
                const wsConsulta = buildConsultaWorksheet()
                XLSX.utils.book_append_sheet(workbook, wsConsulta, 'consulta')

                // 2. Las 5 Hojas Departamentales Oficiales con celdas y fórmulas exactas (A..AL)
                for (const dept of EXCEL_DEPARTMENTS) {
                    const deptRows = nominaData.filter(r => r.departamento === dept)
                    const wsDept = buildOfficialDepartmentWorksheet(dept, deptRows, weekNum, startDateStr)
                    XLSX.utils.book_append_sheet(workbook, wsDept, dept)
                }

                // 3. Hoja 'DATOS RAYAS' (Conformación de Cuadrillas)
                const crewColumns = ['CUADRILLA 1', 'CUADRILLA 2', 'CUADRILLA 3', 'CHOFERES', 'SERVICIOS MG']
                const crewMembersMap: Record<string, Array<{ name: string; puesto: string }>> = {}
                crewColumns.forEach(c => { crewMembersMap[c] = [] })

                const { data: allMembers } = await supabase
                    .from('cat_cuadrillas_miembros')
                    .select('cuadrilla_id, cat_cuadrillas(nombre), rh_employees(first_name, last_name, puesto:cat_puestos(nombre))')

                if (allMembers) {
                    allMembers.forEach((m: any) => {
                        const cName = m.cat_cuadrillas?.nombre?.toUpperCase() || ''
                        const matchingCrew = crewColumns.find(c => cName.includes(c))
                        if (matchingCrew && m.rh_employees) {
                            crewMembersMap[matchingCrew].push({
                                name: `${m.rh_employees.first_name} ${m.rh_employees.last_name}`.toUpperCase(),
                                puesto: (m.rh_employees.puesto?.nombre || 'OPERATIVO').toUpperCase(),
                            })
                        }
                    })
                }

                const maxRows = Math.max(...Object.values(crewMembersMap).map(arr => arr.length), 1)
                const datosRayasAOA: any[][] = []
                const headerRow: any[] = []
                crewColumns.forEach(c => { headerRow.push(c, null) })
                datosRayasAOA.push(headerRow)

                for (let r = 0; r < maxRows; r++) {
                    const rowName: any[] = []
                    const rowPuesto: any[] = []
                    crewColumns.forEach(c => {
                        const member = crewMembersMap[c][r]
                        rowName.push(member ? member.name : null, null)
                        rowPuesto.push(member ? member.puesto : null, null)
                    })
                    datosRayasAOA.push(rowName, rowPuesto)
                }
                const wsDatosRayas = XLSX.utils.aoa_to_sheet(datosRayasAOA)
                wsDatosRayas['!cols'] = crewColumns.flatMap(() => [{ wch: 36 }, { wch: 4 }])
                XLSX.utils.book_append_sheet(workbook, wsDatosRayas, 'DATOS RAYAS')

                // 4. Descargar Workbook
                const fileName = `${weekNum}._NOMINA_OFICIAL_EL_HERRERO_${startDateStr}.xlsx`
                XLSX.writeFile(workbook, fileName)
            } catch (error) {
                console.error('Error generating Excel:', error)
                alert('Error generando Excel oficial.')
            } finally {
                setIsExporting(false)
            }
        }, 100)
    }

    const filteredRows = nominaData.filter(r => {
        if (guardiaFilter === 'MINA' && r.guardia_14x7 === 'DESCANSO') return false
        if (guardiaFilter === 'DESCANSO' && r.guardia_14x7 !== 'DESCANSO') return false
        if (deptFilter !== 'TODOS' && r.departamento !== deptFilter) return false
        return true
    })

    return (
        <div className="p-2 sm:p-4 max-w-full w-full min-w-0 mx-auto">
            {/* HEADER & ACTIONS */}
            <div className="mb-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 flex items-center gap-3">
                        <DollarSign className="text-green-500 w-7 h-7 sm:w-8 sm:h-8" />
                        Pre-Nómina Operativa (Formato Oficial Excel)
                    </h1>
                    <p className="text-slate-400 text-xs sm:text-sm">
                        Compatibilidad 100% de celdas (A–AL), 18 Incidencias Oficiales, Turnos (1/2/3/0), H.E. Dobles/Triples, Prima Dominical y Rol 14×7.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2.5 w-full lg:w-auto html2pdf__ignore">
                    {!isReadOnly && (
                        <Link
                            href="/dashboard/nomina/tarifas"
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold text-xs transition-all border border-slate-700"
                        >
                            <Settings size={16} />
                            Ajustar Tarifas
                        </Link>
                    )}

                    <button
                        onClick={() => window.print()}
                        className="px-4 py-2.5 rounded-xl flex items-center gap-2 font-black text-xs transition-all shadow-lg bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer"
                    >
                        🖨️ Exportar PDF
                    </button>

                    <button
                        disabled={nominaData.length === 0 || isExporting}
                        onClick={exportToExcel}
                        className={`px-4 py-2.5 rounded-xl flex items-center gap-2 font-black text-xs transition-all shadow-lg cursor-pointer ${
                            isExporting
                                ? 'bg-slate-700 text-slate-400 cursor-not-allowed shadow-none'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40 disabled:opacity-50'
                        }`}
                    >
                        <Download size={16} />
                        {isExporting ? 'Generando Plantilla Exacta...' : 'Exportar Excel Oficial (.xlsx)'}
                    </button>
                </div>
            </div>

            {/* SELECTOR DE SEMANA & WIDGETS */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-center">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <CalendarDays size={15} /> Semana a Calcular
                    </label>
                    <select
                        value={selectedSemana}
                        onChange={e => setSelectedSemana(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700/50 rounded-xl p-3 text-xs text-white font-bold focus:ring-2 focus:ring-green-500 outline-none"
                    >
                        <option value="">Selecciona la Semana...</option>
                        {semanas.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.nombre} {s.fecha_inicio ? `(${s.fecha_inicio})` : ''}
                            </option>
                        ))}
                    </select>

                    {selectedSemana && selectedSemana !== 'EN_CURSO' && !isReadOnly && (
                        <button
                            disabled={isExporting}
                            onClick={handleDeleteSemana}
                            className="mt-3 w-full bg-slate-900 border border-slate-700/50 hover:bg-red-900/50 text-slate-400 hover:text-red-400 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-xs"
                        >
                            <Trash2 size={14} />
                            Deshacer Empaque
                        </button>
                    )}
                </div>

                <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
                        <h4 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Sueldos Base (L-D)</h4>
                        <p className="text-xl sm:text-2xl font-black text-white">{formatMoney(resumen.total_fijo)}</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
                        <h4 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Bonos / Destajos Netos</h4>
                        <p className="text-xl sm:text-2xl font-black text-amber-400">{formatMoney(resumen.total_destajo)}</p>
                        {resumen.total_descuentos > 0 && (
                            <div className="text-[10px] text-rose-400 font-bold mt-0.5">
                                -{formatMoney(resumen.total_descuentos)} (-15% faltas)
                            </div>
                        )}
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
                        <h4 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Horas Extra Semana</h4>
                        <p className="text-xl sm:text-2xl font-black text-cyan-400">
                            {resumen.total_he_dobles + resumen.total_he_triples}h
                        </p>
                        <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                            {resumen.total_he_dobles}h Dobles • {resumen.total_he_triples}h Triples
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-900/50 to-slate-900 border border-emerald-700/50 rounded-2xl p-4 shadow-xl">
                        <h4 className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-1">Gran Total a Pagar</h4>
                        <p className="text-xl sm:text-2xl font-black text-emerald-400">{formatMoney(resumen.total_general)}</p>
                    </div>
                </div>
            </div>

            {/* BARRA DE DEPARTAMENTOS EXCEL, FILTRO 14x7 Y MODO DE VISTA */}
            {selectedSemana && !loading && nominaData.length > 0 && (
                <div className="mb-4 bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 space-y-3">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                        {/* Tabs Departamentos Exactos */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            <button
                                onClick={() => setDeptFilter('TODOS')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                                    deptFilter === 'TODOS'
                                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                                }`}
                            >
                                Todos ({nominaData.length})
                            </button>
                            {EXCEL_DEPARTMENTS.map(dept => {
                                const cnt = nominaData.filter(r => r.departamento === dept).length
                                return (
                                    <button
                                        key={dept}
                                        onClick={() => setDeptFilter(dept)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                                            deptFilter === dept
                                                ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                                                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                                        }`}
                                    >
                                        {dept} ({cnt})
                                    </button>
                                )
                            })}
                        </div>

                        {/* Switcher Vista Excel Exacta vs Resumen Financiero + Guardia 14x7 */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                                {[
                                    { id: 'TODAS', label: 'Todas Guardias' },
                                    { id: 'MINA', label: '☀️🌙 Mina' },
                                    { id: 'DESCANSO', label: '🏠 Descanso 14×7' },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setGuardiaFilter(tab.id as any)}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                                            guardiaFilter === tab.id
                                                ? 'bg-cyan-500 text-slate-950'
                                                : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                                <button
                                    onClick={() => setViewMode('EXCEL')}
                                    className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                                        viewMode === 'EXCEL' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    <FileSpreadsheet size={14} />
                                    Vista Formato Excel (A–AL)
                                </button>
                                <button
                                    onClick={() => setViewMode('RESUMEN')}
                                    className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                                        viewMode === 'RESUMEN' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    <TableIcon size={14} />
                                    Resumen Raya Neta
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* DATA GRID */}
            {selectedSemana && !loading && filteredRows.length > 0 && viewMode === 'EXCEL' && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px] text-slate-300 border-collapse">
                            <thead className="bg-slate-950 text-slate-300 uppercase font-black">
                                <tr>
                                    <th rowSpan={2} className="px-2.5 py-2 border border-slate-800 text-center">#</th>
                                    <th rowSpan={2} className="px-3 py-2 border border-slate-800 min-w-[160px]">CATEGORIA</th>
                                    <th rowSpan={2} className="px-2.5 py-2 border border-slate-800 text-center">No. EMP</th>
                                    <th rowSpan={2} className="px-3 py-2 border border-slate-800 min-w-[200px]">NOMBRE / DEPTO</th>
                                    <th rowSpan={2} className="px-2.5 py-2 border border-slate-800 text-right">SAL. DIARIO</th>
                                    {DAY_KEYS_ORDER.map(dk => (
                                        <th key={dk} colSpan={3} className="px-2 py-1 border border-slate-800 text-center text-amber-400 bg-slate-900">
                                            {DAY_LABELS[dk]}
                                        </th>
                                    ))}
                                    <th rowSpan={2} className="px-3 py-2 border border-slate-800 text-right bg-emerald-950/40 text-emerald-400">BONO</th>
                                    <th rowSpan={2} className="px-2 py-2 border border-slate-800 text-center">FALTAS</th>
                                    <th rowSpan={2} className="px-2 py-2 border border-slate-800 text-center">PERM.</th>
                                    <th rowSpan={2} className="px-2 py-2 border border-slate-800 text-center">VAC.</th>
                                    <th rowSpan={2} className="px-2 py-2 border border-slate-800 text-center">DESC. TRAB</th>
                                    <th rowSpan={2} className="px-2 py-2 border border-slate-800 text-center">PRIMA DOM.</th>
                                    <th rowSpan={2} className="px-2 py-2 border border-slate-800 text-center">H.E.</th>
                                    <th rowSpan={2} className="px-2 py-2 border border-slate-800 text-center">H.E. DOB</th>
                                    <th rowSpan={2} className="px-2 py-2 border border-slate-800 text-center">H.E. TRI</th>
                                    <th rowSpan={2} className="px-2 py-2 border border-slate-800 text-center">C/S</th>
                                    <th rowSpan={2} className="px-3 py-2 border border-slate-800 min-w-[160px]">OBSERVACIONES</th>
                                </tr>
                                <tr className="text-[9px] text-slate-400 bg-slate-950">
                                    {DAY_KEYS_ORDER.map(dk => (
                                        <FragmentDaySubHeaders key={dk} />
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {filteredRows.map((row, idx) => (
                                    <tr key={row.empleado_id} className="hover:bg-slate-800/40 transition-colors">
                                        <td className="px-2.5 py-2 border border-slate-800/70 text-center text-slate-400 font-bold">{idx + 1}</td>
                                        <td className="px-3 py-2 border border-slate-800/70 text-[10px] font-semibold text-slate-300">{row.puesto}</td>
                                        <td className="px-2.5 py-2 border border-slate-800/70 text-center font-mono text-slate-400">{row.codigo.replace('EMP-', '')}</td>
                                        <td className="px-3 py-2 border border-slate-800/70">
                                            <div className="font-black text-white text-xs">{row.nombre}</div>
                                            <div className="text-[9px] text-cyan-400 font-bold">
                                                {row.departamento} • {row.guardia_14x7}
                                            </div>
                                        </td>
                                        <td className="px-2.5 py-2 border border-slate-800/70 text-right font-mono">{formatMoney(row.sueldo_diario)}</td>

                                        {DAY_KEYS_ORDER.map(dk => {
                                            const c = row.dias[dk]
                                            const spec = getIncidenceSpec(c.dia)
                                            return (
                                                <FragmentDayCells key={dk} cell={c} badgeClass={spec.badgeClass} />
                                            )
                                        })}

                                        <td className="px-3 py-2 border border-slate-800/70 text-right font-black text-emerald-400 bg-emerald-950/15">
                                            {formatMoney(row.bono_neto)}
                                        </td>
                                        <td className="px-2 py-2 border border-slate-800/70 text-center font-bold text-rose-400">{row.faltas}</td>
                                        <td className="px-2 py-2 border border-slate-800/70 text-center">{row.permisos}</td>
                                        <td className="px-2 py-2 border border-slate-800/70 text-center">{row.vacaciones}</td>
                                        <td className="px-2 py-2 border border-slate-800/70 text-center">{row.descanso_trabajado}</td>
                                        <td className="px-2 py-2 border border-slate-800/70 text-center font-bold text-amber-400">{row.prima_dominical}</td>
                                        <td className="px-2 py-2 border border-slate-800/70 text-center font-bold">{row.horas_extra}</td>
                                        <td className="px-2 py-2 border border-slate-800/70 text-center text-cyan-300">{row.horas_extra_dobles}</td>
                                        <td className="px-2 py-2 border border-slate-800/70 text-center text-amber-300">{row.horas_extra_triples}</td>
                                        <td className="px-2 py-2 border border-slate-800/70 text-center">{row.comision_sindical}</td>
                                        <td className="px-3 py-2 border border-slate-800/70 text-[10px] text-slate-400">{row.observaciones || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* LEYENDA DEL CATÁLOGO DE CONCEPTOS */}
                    <div className="bg-slate-950 border-t border-slate-800 p-3 flex flex-wrap gap-1.5">
                        <span className="text-[10px] font-black text-amber-500 uppercase mr-2 self-center">Catálogo Oficial:</span>
                        {OFFICIAL_INCIDENCES.map(spec => (
                            <span key={spec.codigo} className={`px-2 py-0.5 rounded border text-[9px] font-bold ${spec.badgeClass}`}>
                                {spec.codigo}: {spec.nombre}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* VISTA RESUMEN FINANCIERO */}
            {selectedSemana && !loading && filteredRows.length > 0 && viewMode === 'RESUMEN' && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Empleado / Departamento</th>
                                    <th className="px-6 py-4 text-center">Días Pagados</th>
                                    <th className="px-6 py-4 text-right">Sueldo Base</th>
                                    <th className="px-6 py-4">Desglose Bono / Destajos</th>
                                    <th className="px-6 py-4 text-right">Bono Neto</th>
                                    <th className="px-6 py-4 text-right bg-green-950/30 text-green-500">Total Pre-Nómina</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {filteredRows.map(row => (
                                    <tr key={row.empleado_id} className="hover:bg-slate-800/40 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-bold text-white">{row.nombre}</span>
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                                    row.guardia_14x7 === 'DESCANSO'
                                                        ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                                                        : row.guardia_14x7 === 'NOCHE'
                                                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                                                        : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                                                }`}>
                                                    {row.departamento} • {row.guardia_14x7}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-500 mt-0.5">
                                                {row.puesto} ({row.codigo}) • Salario Diario: {formatMoney(row.sueldo_diario)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="font-bold text-white text-lg">{row.dias_pagados}</div>
                                            {row.faltas > 0 && (
                                                <div className="text-[10px] text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded-full inline-block mt-1">
                                                    {row.faltas} Faltas (-{Math.min(100, row.faltas * 15)}% Bono)
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium">{formatMoney(row.total_sueldo_fijo)}</td>
                                        <td className="px-6 py-4">
                                            {row.destajos.length > 0 ? (
                                                <div className="space-y-1">
                                                    {row.destajos.map((d, i) => (
                                                        <div key={i} className="text-xs flex items-center justify-between gap-4 border-b border-slate-800/50 pb-1 last:border-0">
                                                            <span className="text-amber-500/90 truncate max-w-[180px]">{d.producto_nombre}</span>
                                                            <span className="font-mono text-slate-400">{formatMoney(d.monto_ganado)}</span>
                                                        </div>
                                                    ))}
                                                    {row.bono_descuento_faltas > 0 && (
                                                        <div className="text-xs flex items-center justify-between gap-4 text-rose-400 font-bold">
                                                            <span>Penalización Faltas (15%/F)</span>
                                                            <span>-{formatMoney(row.bono_descuento_faltas)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-600 italic">- Sin bonos generados -</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-amber-400">
                                            {row.bono_neto > 0 ? formatMoney(row.bono_neto) : '-'}
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
                    Calculando Pre-Nómina y Cuadrando Celdas Oficiales...
                </div>
            )}

            {selectedSemana && !loading && filteredRows.length === 0 && (
                <div className="p-16 text-center text-slate-500">
                    <ArrowRight className="mx-auto w-12 h-12 mb-4 opacity-20" />
                    <p className="text-lg">No hay registros en este filtro/semana.</p>
                </div>
            )}
        </div>
    )
}

function FragmentDaySubHeaders() {
    return (
        <>
            <th className="px-1.5 py-1 border border-slate-800 text-center">T</th>
            <th className="px-1.5 py-1 border border-slate-800 text-center">Dia</th>
            <th className="px-1.5 py-1 border border-slate-800 text-center">H.E.</th>
        </>
    )
}

function FragmentDayCells({ cell, badgeClass }: { cell: DayCellData; badgeClass: string }) {
    return (
        <>
            <td className="px-1.5 py-2 border border-slate-800/60 text-center font-mono text-slate-400">{cell.turno}</td>
            <td className="px-1 py-1.5 border border-slate-800/60 text-center">
                <span className={`px-1.5 py-0.5 rounded border text-[9px] font-black ${badgeClass}`}>
                    {cell.dia}
                </span>
            </td>
            <td className="px-1.5 py-2 border border-slate-800/60 text-center font-mono text-cyan-300">{cell.he}</td>
        </>
    )
}
