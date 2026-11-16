import * as XLSX from 'xlsx-js-style'

export interface OfficialIncidenceSpec {
    codigo: string
    nombre: string
    worksShift: boolean
    paidBaseDay: boolean
    sundayPremium: boolean
    isFalta: boolean
    isPermisoCount: boolean
    isVacacion: boolean
    isDescansoTrabajado: boolean
    isComisionSindical: boolean
    isDescansoRol: boolean
    badgeClass: string
}

export const OFFICIAL_INCIDENCES: OfficialIncidenceSpec[] = [
    { codigo: 'X', nombre: 'ASISTENCIA', worksShift: true, paidBaseDay: true, sundayPremium: true, isFalta: false, isPermisoCount: false, isVacacion: false, isDescansoTrabajado: false, isComisionSindical: false, isDescansoRol: false, badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    { codigo: 'F', nombre: 'FALTA', worksShift: false, paidBaseDay: false, sundayPremium: false, isFalta: true, isPermisoCount: false, isVacacion: false, isDescansoTrabajado: false, isComisionSindical: false, isDescansoRol: false, badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
    { codigo: 'P', nombre: 'PERMISO', worksShift: false, paidBaseDay: false, sundayPremium: false, isFalta: false, isPermisoCount: true, isVacacion: false, isDescansoTrabajado: false, isComisionSindical: false, isDescansoRol: false, badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
    { codigo: 'PP', nombre: 'PERMISO CON GOCE DE SUELDO POR PATERNIDAD', worksShift: false, paidBaseDay: true, sundayPremium: false, isFalta: false, isPermisoCount: false, isVacacion: false, isDescansoTrabajado: false, isComisionSindical: false, isDescansoRol: false, badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
    { codigo: 'PD', nombre: 'PERMISO CON GOCE DE SUELDO POR DEFUNCION', worksShift: false, paidBaseDay: true, sundayPremium: false, isFalta: false, isPermisoCount: false, isVacacion: false, isDescansoTrabajado: false, isComisionSindical: false, isDescansoRol: false, badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
    { codigo: 'C/S', nombre: 'COMISION SINDICAL', worksShift: false, paidBaseDay: true, sundayPremium: false, isFalta: false, isPermisoCount: false, isVacacion: false, isDescansoTrabajado: false, isComisionSindical: true, isDescansoRol: false, badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
    { codigo: 'V', nombre: 'VACACIONES', worksShift: false, paidBaseDay: true, sundayPremium: false, isFalta: false, isPermisoCount: false, isVacacion: true, isDescansoTrabajado: false, isComisionSindical: false, isDescansoRol: false, badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
    { codigo: 'CE', nombre: 'COMISION EJIDAL', worksShift: false, paidBaseDay: true, sundayPremium: false, isFalta: false, isPermisoCount: false, isVacacion: false, isDescansoTrabajado: false, isComisionSindical: false, isDescansoRol: false, badgeClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },
    { codigo: 'DO', nombre: 'DESCANSO OBLIGATORIO', worksShift: false, paidBaseDay: true, sundayPremium: false, isFalta: false, isPermisoCount: false, isVacacion: false, isDescansoTrabajado: false, isComisionSindical: false, isDescansoRol: false, badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
    { codigo: 'DOX', nombre: 'DESCANSO OBLIGATORIO LABORADO', worksShift: true, paidBaseDay: true, sundayPremium: true, isFalta: false, isPermisoCount: false, isVacacion: false, isDescansoTrabajado: false, isComisionSindical: false, isDescansoRol: false, badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    { codigo: 'DX', nombre: 'DESCANSO LABORADO', worksShift: true, paidBaseDay: true, sundayPremium: true, isFalta: false, isPermisoCount: false, isVacacion: false, isDescansoTrabajado: true, isComisionSindical: false, isDescansoRol: false, badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    { codigo: 'TC', nombre: 'TERMINO DE CONTRATO', worksShift: false, paidBaseDay: false, sundayPremium: false, isFalta: false, isPermisoCount: false, isVacacion: false, isDescansoTrabajado: false, isComisionSindical: false, isDescansoRol: false, badgeClass: 'bg-slate-600/20 text-slate-300 border-slate-500/40' },
    { codigo: 'I', nombre: 'INCAPACIDAD', worksShift: false, paidBaseDay: false, sundayPremium: false, isFalta: false, isPermisoCount: false, isVacacion: false, isDescansoTrabajado: false, isComisionSindical: false, isDescansoRol: false, badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
    { codigo: 'IRT', nombre: 'INCAPACIDAD POR RIESGO DE TRABAJO', worksShift: false, paidBaseDay: false, sundayPremium: false, isFalta: false, isPermisoCount: false, isVacacion: false, isDescansoTrabajado: false, isComisionSindical: false, isDescansoRol: false, badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
    { codigo: 'D', nombre: 'DESCANSO', worksShift: false, paidBaseDay: true, sundayPremium: false, isFalta: false, isPermisoCount: false, isVacacion: false, isDescansoTrabajado: false, isComisionSindical: false, isDescansoRol: true, badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
    { codigo: 'PM', nombre: 'PASE MEDICO', worksShift: false, paidBaseDay: true, sundayPremium: false, isFalta: false, isPermisoCount: false, isVacacion: false, isDescansoTrabajado: false, isComisionSindical: false, isDescansoRol: false, badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
    { codigo: 'APM', nombre: 'ACOMPAÑANTE DE PASE MEDICO', worksShift: false, paidBaseDay: true, sundayPremium: false, isFalta: false, isPermisoCount: false, isVacacion: false, isDescansoTrabajado: false, isComisionSindical: false, isDescansoRol: false, badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
    { codigo: 'B', nombre: 'BAJA', worksShift: false, paidBaseDay: false, sundayPremium: false, isFalta: false, isPermisoCount: false, isVacacion: false, isDescansoTrabajado: false, isComisionSindical: false, isDescansoRol: false, badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
]

export const OFFICIAL_CODE_MAP = new Map<string, OfficialIncidenceSpec>(
    OFFICIAL_INCIDENCES.map(i => [i.codigo, i])
)

export function normalizeIncidenceCode(rawCode?: string | null, rawName?: string | null): string {
    const c = (rawCode || '').trim().toUpperCase()
    const n = (rawName || '').trim().toUpperCase()

    if (OFFICIAL_CODE_MAP.has(c)) return c

    if (c === 'ASISTENCIA' || c === 'A' || n === 'ASISTENCIA' || n === 'ASISTENCIA NORMAL') return 'X'
    if (c === 'FALTA' || n.includes('FALTA')) return 'F'
    if (c === 'INCAPACIDAD' || (n.includes('INCAPACIDAD') && !n.includes('RIESGO'))) return 'I'
    if (c.includes('RIESGO') || n.includes('RIESGO DE TRABAJO')) return 'IRT'
    if (c === 'PERMISO_S_GOCE' || n === 'PERMISO' || n.includes('SIN GOCE')) return 'P'
    if (c === 'PERMISO_C_GOCE' || n.includes('PATERNIDAD')) return 'PP'
    if (n.includes('DEFUNCION')) return 'PD'
    if (c === 'CS' || n.includes('SINDICAL')) return 'C/S'
    if (c === 'VACACIONES' || n.includes('VACACION')) return 'V'
    if (n.includes('EJIDAL')) return 'CE'
    if (n.includes('OBLIGATORIO LABORADO')) return 'DOX'
    if (n.includes('OBLIGATORIO')) return 'DO'
    if (n.includes('DESCANSO LABORADO')) return 'DX'
    if (n.includes('TERMINO')) return 'TC'
    if (c === 'DESCANSO' || n === 'DESCANSO' || n.includes('ROL 14')) return 'D'
    if (n.includes('ACOMPAÑANTE') || n.includes('ACOMPANANTE')) return 'APM'
    if (n.includes('PASE MEDICO')) return 'PM'
    if (n === 'BAJA') return 'B'

    return c || 'X'
}

export function getIncidenceSpec(code: string): OfficialIncidenceSpec {
    return OFFICIAL_CODE_MAP.get(normalizeIncidenceCode(code)) || OFFICIAL_INCIDENCES[0]
}

export function isWorkingIncidence(code?: string | null): boolean {
    const norm = normalizeIncidenceCode(code)
    return norm === 'X' || norm === 'DX' || norm === 'DOX'
}

export function resolveShiftNumber(turnoCodigo?: string | null, incidenceCode?: string | null): number {
    if (!isWorkingIncidence(incidenceCode)) return 0
    const t = (turnoCodigo || '').trim().toUpperCase()
    if (t === '1' || t === 'T1' || t.includes('PRIMERA') || t.includes('DIA') || t.includes('DÍA')) return 1
    if (t === '2' || t === 'T2' || t.includes('SEGUNDA') || t.includes('NOCHE')) return 2
    if (t === '3' || t === 'T3' || t.includes('TERCERA') || t.includes('MIXTO')) return 3
    if (t === 'DESC' || t === '0') return 0
    return 1
}

export type ExcelDepartmentName =
    | 'Tumbe sobre Rellene'
    | 'Rezagado'
    | 'Frentes, Cruceros y Rampas'
    | 'Acarreo'
    | 'Mina General'

export const EXCEL_DEPARTMENTS: ExcelDepartmentName[] = [
    'Tumbe sobre Rellene',
    'Rezagado',
    'Frentes, Cruceros y Rampas',
    'Acarreo',
    'Mina General',
]

export function resolveExcelDepartment(
    empCode: string,
    fullName: string,
    puestoNombre: string,
    excelConfig?: { deptMap?: Record<string, { depto?: string }> } | null
): ExcelDepartmentName {
    const map = excelConfig?.deptMap || {}
    const upperName = (fullName || '').trim().toUpperCase()
    const cleanCode = (empCode || '').trim().toUpperCase()

    const byName = map[upperName]?.depto
    if (byName && (EXCEL_DEPARTMENTS as string[]).includes(byName)) {
        return byName as ExcelDepartmentName
    }
    const byCode = map[cleanCode]?.depto
    if (byCode && (EXCEL_DEPARTMENTS as string[]).includes(byCode)) {
        return byCode as ExcelDepartmentName
    }

    const p = (puestoNombre || '').toUpperCase()
    if (p.includes('PALA MECANICA') || p.includes('SCOOP') || p.includes('CARGADOR')) return 'Rezagado'
    if (p.includes('CHOFER') || p.includes('CAMION') || p.includes('CAMIÓN')) return 'Acarreo'
    if (p.includes('FRENTE') || p.includes('CRUCERO') || p.includes('RAMPA')) return 'Frentes, Cruceros y Rampas'
    if (p.includes('JUMBERO') || p.includes('PERFORISTA') || p.includes('SCALEMIN')) return 'Tumbe sobre Rellene'
    return 'Mina General'
}

export function resolveRestingBonusForPosition(
    puestoNombre: string,
    excelConfig?: { bonoDescansoTable?: Record<string, number> } | null
): number {
    const table = excelConfig?.bonoDescansoTable || {}
    const upper = (puestoNombre || '').trim().toUpperCase()
    if (table[upper] !== undefined) return Number(table[upper]) || 0

    for (const [k, v] of Object.entries(table)) {
        if (upper.includes(k) || k.includes(upper)) {
            return Number(v) || 0
        }
    }
    if (upper.includes('JUMBERO') && upper.includes('AYUDANTE')) return 6514.99
    if (upper.includes('JUMBERO')) return 8966.53
    if (upper.includes('PERFORISTA') && upper.includes('AYUDANTE')) return 2858.17
    if (upper.includes('PERFORISTA')) return 4461.63
    if (upper.includes('PALA') || upper.includes('SCOOP')) return 6356.46
    if (upper.includes('CHOFER') || upper.includes('CAMION')) return 3430.65
    if (upper.includes('SOTAMINERO') || upper.includes('PALERO')) return 2914.81
    if (upper.includes('COMPRESORISTA') || upper.includes('LAMPARERO')) return 807.53
    if (upper.includes('SOLDADOR') && upper.includes('AYUDANTE')) return 1441.51
    if (upper.includes('SOLDADOR')) return 1652.69
    if (upper.includes('SCALEMIN')) return 2862.00
    if (upper.includes('PEON')) return 2100.00
    return 0
}

export function jsDateToExcelSerial(dateStr: string): number {
    const clean = (dateStr || '').slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return 46286
    const d = new Date(`${clean}T12:00:00Z`)
    const epoch = new Date(Date.UTC(1899, 11, 30, 12, 0, 0))
    return Math.round((d.getTime() - epoch.getTime()) / 86400000)
}

export type DayKey = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'

export const DAY_KEYS_ORDER: DayKey[] = [
    'lunes',
    'martes',
    'miercoles',
    'jueves',
    'viernes',
    'sabado',
    'domingo',
]

export const DAY_LABELS: Record<DayKey, string> = {
    lunes: 'Lunes',
    martes: 'Martes',
    miercoles: 'Miercoles',
    jueves: 'Jueves',
    viernes: 'Viernes',
    sabado: 'Sabado',
    domingo: 'Domingo',
}

export interface DayCellData {
    turno: number // 1, 2, 3, 0
    dia: string   // X, F, P, PP, PD, C/S, V, CE, DO, DOX, DX, TC, I, IRT, D, PM, APM, B
    he: number    // Horas extra numéricas (ej. 0, 2, 4, 5)
}

export interface OfficialPayrollRow {
    empleado_id: string
    nombre: string
    codigo: string
    puesto: string
    departamento: ExcelDepartmentName
    sueldo_diario: number
    cuadrilla_nombre: string
    guardia_14x7: 'DIA' | 'NOCHE' | 'DESCANSO'
    dias_pagados: number
    total_sueldo_fijo: number
    dias: Record<DayKey, DayCellData>
    bono_bruto: number
    bono_descuento_faltas: number
    bono_neto: number
    faltas: number
    permisos: number
    vacaciones: number
    descanso_trabajado: number
    prima_dominical: number
    horas_extra: number
    horas_extra_dobles: number
    horas_extra_triples: number
    comision_sindical: number
    observaciones: string
    destajos: { producto_nombre: string; monto_ganado: number }[]
    total_general: number
}

const DEPT_TITLES: Record<ExcelDepartmentName, string> = {
    'Tumbe sobre Rellene': 'TUMBE SOBRE RELLENE',
    'Rezagado': 'REZAGADO',
    'Frentes, Cruceros y Rampas': 'FRENTES, CRUCEROS Y RAMPAS PERFORADORAS',
    'Acarreo': 'ACARREO',
    'Mina General': 'MINA GENERAL',
}

const THIN_BORDER = {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } },
}

const HEADER_FILL_STYLE = {
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '0F766E' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: THIN_BORDER,
}

const SUBHEADER_FILL_STYLE = {
    font: { name: 'Calibri', sz: 9, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E293B' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: THIN_BORDER,
}

export function buildConsultaWorksheet(): XLSX.WorkSheet {
    const ws: XLSX.WorkSheet = {}
    const aoa: any[][] = [
        ['semana', null, null, null, null, null, null],
        [1, 46027, 46033, null, null, 'CATALOGO DE CONCEPTOS', null],
    ]

    for (let i = 0; i < OFFICIAL_INCIDENCES.length; i++) {
        const spec = OFFICIAL_INCIDENCES[i]
        const semNum = i + 2
        const start = 46027 + (semNum - 1) * 7
        aoa.push([semNum, start, start + 6, null, null, spec.codigo, spec.nombre])
    }

    const baseDate38 = 46286
    for (let w = OFFICIAL_INCIDENCES.length + 2; w <= 53; w++) {
        const s = 46027 + (w - 1) * 7
        aoa.push([w, w === 38 ? baseDate38 : s, (w === 38 ? baseDate38 : s) + 6])
    }

    const sheet = XLSX.utils.aoa_to_sheet(aoa)
    sheet['!cols'] = [
        { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 4 }, { wch: 4 }, { wch: 10 }, { wch: 46 },
    ]
    sheet['!merges'] = [{ s: { r: 1, c: 5 }, e: { r: 1, c: 6 } }]
    return sheet
}

export function buildOfficialDepartmentWorksheet(
    dept: ExcelDepartmentName,
    rows: OfficialPayrollRow[],
    weekNum: number,
    startDateStr: string
): XLSX.WorkSheet {
    const ws: XLSX.WorkSheet = {}
    const startSerial = jsDateToExcelSerial(startDateStr)
    const isRow4Layout = dept === 'Acarreo' || dept === 'Mina General'
    const isMinaGeneral = dept === 'Mina General'
    const delRowNum = isRow4Layout ? 4 : 3 // 1-based Excel row for DEL:/AL:
    const dataStartRow0 = isMinaGeneral ? 9 : 8 // 0-based (Row 10 for Mina General, Row 9 for others)

    const setCell = (r: number, c: number, cell: XLSX.CellObject) => {
        const addr = XLSX.utils.encode_cell({ r, c })
        ws[addr] = cell
    }

    // Row 1 (r=0): Title Banner
    const titleCol0 = isMinaGeneral ? 6 : 5
    const deptCol0 = isMinaGeneral ? 14 : 13
    setCell(0, titleCol0, {
        t: 's',
        v: 'Nomina Semanal del departamento de:',
        s: { font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: '0F172A' } }, alignment: { horizontal: 'right', vertical: 'center' } },
    })
    setCell(0, deptCol0, {
        t: 's',
        v: DEPT_TITLES[dept],
        s: { font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: '0F766E' } }, alignment: { horizontal: 'left', vertical: 'center' } },
    })

    // Row 3 / 4: SEMANA :, DEL:, AL:
    setCell(2, 0, { t: 's', v: 'SEMANA :', s: { font: { bold: true } } })
    setCell(2, 1, { t: 'n', v: weekNum, s: { font: { bold: true, sz: 12 }, alignment: { horizontal: 'center' } } })

    const delRow0 = delRowNum - 1
    setCell(delRow0, 10, { t: 's', v: 'DEL:', s: { font: { bold: true }, alignment: { horizontal: 'right' } } })
    setCell(delRow0, 11, {
        t: 'n',
        v: startSerial,
        z: 'dd/mm/yyyy',
        s: { font: { bold: true }, alignment: { horizontal: 'center' } },
    })
    setCell(delRow0, 19, { t: 's', v: 'AL:', s: { font: { bold: true }, alignment: { horizontal: 'right' } } })
    setCell(delRow0, 20, {
        t: 'n',
        v: startSerial + 6,
        f: `L${delRowNum}+6`,
        z: 'dd/mm/yyyy',
        s: { font: { bold: true }, alignment: { horizontal: 'center' } },
    })

    // Row 6 (r=5): Day Dates (G6, J6, M6, P6, S6, V6, Y6)
    const merges: XLSX.Range[] = [
        { s: { r: 0, c: titleCol0 }, e: { r: 0, c: deptCol0 - 1 } },
        { s: { r: 0, c: deptCol0 }, e: { r: 0, c: 24 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 37 } },
        { s: { r: delRow0, c: 11 }, e: { r: delRow0, c: 15 } },
        { s: { r: delRow0, c: 20 }, e: { r: delRow0, c: 24 } },
    ]

    for (let d = 0; d < 7; d++) {
        const col = 6 + d * 3
        const prevColLetter = d > 0 ? XLSX.utils.encode_col(6 + (d - 1) * 3) : ''
        const formula = d === 0 ? `L${delRowNum}` : `${prevColLetter}6+1`
        setCell(5, col, {
            t: 'n',
            v: startSerial + d,
            f: formula,
            z: 'dd/mm/yy;@',
            s: { font: { bold: true, sz: 9 }, alignment: { horizontal: 'center', vertical: 'center' }, border: THIN_BORDER },
        })
        merges.push({ s: { r: 5, c: col }, e: { r: 5, c: col + 2 } })
    }

    // Row 7 (r=6) & Row 8 (r=7): Column Headers (EXACT A7..AL8)
    const fixedHeaders: Array<[number, string]> = [
        [0, '#'],
        [1, 'CATEGORIA'],
        [2, 'No. EMPLEADO'],
        [3, 'NOMBRE'],
        [4, 'SALARIO DIARIO'],
    ]
    fixedHeaders.forEach(([col, title]) => {
        setCell(6, col, { t: 's', v: title, s: HEADER_FILL_STYLE })
        setCell(7, col, { t: 's', v: '', s: HEADER_FILL_STYLE })
        merges.push({ s: { r: 6, c: col }, e: { r: 7, c: col } })
    })

    DAY_KEYS_ORDER.forEach((dk, d) => {
        const col = 6 + d * 3
        setCell(6, col, { t: 's', v: DAY_LABELS[dk], s: HEADER_FILL_STYLE })
        setCell(6, col + 1, { t: 's', v: '', s: HEADER_FILL_STYLE })
        setCell(6, col + 2, { t: 's', v: '', s: HEADER_FILL_STYLE })
        merges.push({ s: { r: 6, c: col }, e: { r: 6, c: col + 2 } })

        setCell(7, col, { t: 's', v: 'Turno', s: SUBHEADER_FILL_STYLE })
        setCell(7, col + 1, { t: 's', v: 'Dia', s: SUBHEADER_FILL_STYLE })
        setCell(7, col + 2, { t: 's', v: 'H.E.', s: SUBHEADER_FILL_STYLE })
    })

    const summaryHeaders: Array<[number, string]> = [
        [27, 'BONO'],
        [28, 'FALTAS'],
        [29, 'PERMISOS'],
        [30, 'VACACIONES'],
        [31, 'DESCANSO TRABAJADO'],
        [32, 'PRIMA DOMINICAL'],
        [33, 'HORAS EXTRA'],
        [34, 'HORAS EXTRAS DOBLES'],
        [35, 'HORAS EXTRA TRIPLES'],
        [36, 'COMISIÓN SINDICAL'],
        [37, 'OBSERVACIONES'],
    ]
    summaryHeaders.forEach(([col, title]) => {
        setCell(6, col, { t: 's', v: title, s: HEADER_FILL_STYLE })
        setCell(7, col, { t: 's', v: '', s: HEADER_FILL_STYLE })
        merges.push({ s: { r: 6, c: col }, e: { r: 7, c: col } })
    })

    // Template row 9 on Mina General (so employee #1 starts on Row 10, exact match to .xlsm)
    if (isMinaGeneral) {
        setCell(8, 4, { t: 'n', v: 275.78, z: '_-* #,##0.00_-;\\-* #,##0.00_-;_-* "-"??_-;_-@_-' })
        for (let c = 6; c <= 36; c++) {
            setCell(8, c, { t: 'n', v: 0 })
        }
    }

    // Data Rows
    const firstExcelRow = dataStartRow0 + 1
    rows.forEach((row, idx) => {
        const r = dataStartRow0 + idx
        const r1 = r + 1
        const zebraBg = idx % 2 === 0 ? 'FFFFFF' : 'F8FAFC'
        const baseCellStyle = {
            font: { name: 'Calibri', sz: 10, color: { rgb: '0F172A' } },
            fill: { fgColor: { rgb: zebraBg } },
            border: THIN_BORDER,
        }

        const empNumClean = Number(String(row.codigo || '').replace(/[^0-9]/g, '')) || row.codigo || (idx + 1)

        setCell(r, 0, { t: 'n', v: idx + 1, s: { ...baseCellStyle, alignment: { horizontal: 'center' } } })
        setCell(r, 1, { t: 's', v: row.puesto, s: { ...baseCellStyle, alignment: { horizontal: 'left' } } })
        setCell(r, 2, {
            t: typeof empNumClean === 'number' ? 'n' : 's',
            v: empNumClean,
            s: { ...baseCellStyle, alignment: { horizontal: 'center' } },
        })
        setCell(r, 3, { t: 's', v: row.nombre.toUpperCase(), s: { ...baseCellStyle, font: { ...baseCellStyle.font, bold: true } } })
        setCell(r, 4, {
            t: 'n',
            v: Number(row.sueldo_diario || 0),
            z: '_-* #,##0.00_-;\\-* #,##0.00_-;_-* "-"??_-;_-@_-',
            s: { ...baseCellStyle, alignment: { horizontal: 'right' } },
        })

        DAY_KEYS_ORDER.forEach((dk, d) => {
            const col = 6 + d * 3
            const cell = row.dias[dk] || { turno: 0, dia: 'D', he: 0 }
            const incColor =
                cell.dia === 'F' ? 'FEE2E2'
                : cell.dia === 'D' ? 'E0F2FE'
                : cell.dia === 'I' || cell.dia === 'IRT' ? 'FEF3C7'
                : cell.dia === 'V' ? 'F3E8FF'
                : zebraBg

            setCell(r, col, { t: 'n', v: Number(cell.turno || 0), s: { ...baseCellStyle, fill: { fgColor: { rgb: incColor } }, alignment: { horizontal: 'center' } } })
            setCell(r, col + 1, { t: 's', v: cell.dia, s: { ...baseCellStyle, fill: { fgColor: { rgb: incColor } }, font: { ...baseCellStyle.font, bold: true }, alignment: { horizontal: 'center' } } })
            setCell(r, col + 2, { t: 'n', v: Number(cell.he || 0), s: { ...baseCellStyle, fill: { fgColor: { rgb: incColor } }, alignment: { horizontal: 'center' } } })
        })

        // Exact Excel formulas matching columns AB..AK
        setCell(r, 27, {
            t: 'n',
            v: Number(row.bono_neto || 0),
            z: '_-"$"* #,##0.00_-;\\-"$"* #,##0.00_-;_-"$"* "-"??_-;_-@_-',
            s: { ...baseCellStyle, font: { ...baseCellStyle.font, bold: true }, alignment: { horizontal: 'right' } },
        })
        setCell(r, 28, { t: 'n', v: row.faltas, f: `COUNTIF(G${r1}:AA${r1},"F")`, z: '#,##0', s: { ...baseCellStyle, alignment: { horizontal: 'center' } } })
        setCell(r, 29, { t: 'n', v: row.permisos, f: `COUNTIF(G${r1}:AA${r1},"P")`, z: '#,##0', s: { ...baseCellStyle, alignment: { horizontal: 'center' } } })
        setCell(r, 30, { t: 'n', v: row.vacaciones, f: `COUNTIF(G${r1}:AA${r1},"V")`, z: '#,##0', s: { ...baseCellStyle, alignment: { horizontal: 'center' } } })
        setCell(r, 31, { t: 'n', v: row.descanso_trabajado, f: `COUNTIF(G${r1}:AA${r1},"DX")`, z: '#,##0', s: { ...baseCellStyle, alignment: { horizontal: 'center' } } })
        setCell(r, 32, {
            t: 'n',
            v: row.prima_dominical,
            f: `COUNTIF(Y${r1}:AA${r1},"X")+COUNTIF(Y${r1}:AA${r1},"DX")+COUNTIF(Y${r1}:AA${r1},"DOX")`,
            z: '#,##0',
            s: { ...baseCellStyle, alignment: { horizontal: 'center' } },
        })
        setCell(r, 33, {
            t: 'n',
            v: row.horas_extra,
            f: `I${r1}+L${r1}+O${r1}+R${r1}+U${r1}+X${r1}+AA${r1}`,
            z: '#,##0',
            s: { ...baseCellStyle, alignment: { horizontal: 'center' } },
        })
        setCell(r, 34, {
            t: 'n',
            v: row.horas_extra_dobles,
            f: `IF(AH${r1}>9,9,AH${r1})`,
            z: '#,##0',
            s: { ...baseCellStyle, alignment: { horizontal: 'center' } },
        })
        setCell(r, 35, {
            t: 'n',
            v: row.horas_extra_triples,
            f: `AH${r1}-AI${r1}`,
            z: '#,##0',
            s: { ...baseCellStyle, alignment: { horizontal: 'center' } },
        })
        setCell(r, 36, {
            t: 'n',
            v: row.comision_sindical,
            f: `COUNTIF(G${r1}:AA${r1},"C/S")`,
            z: '#,##0',
            s: { ...baseCellStyle, alignment: { horizontal: 'center' } },
        })
        setCell(r, 37, { t: 's', v: row.observaciones || '', s: { ...baseCellStyle, alignment: { horizontal: 'left' } } })
    })

    // Totals Row
    const lastDataRow0 = rows.length > 0 ? dataStartRow0 + rows.length - 1 : dataStartRow0
    const lastExcelRow = lastDataRow0 + 1
    const totalRow0 = dataStartRow0 + rows.length
    const totalStyle = {
        font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '0F172A' } },
        border: THIN_BORDER,
        alignment: { horizontal: 'center' as const, vertical: 'center' as const },
    }

    const sumCols: Array<{ c: number; letter: string; val: number; isMoney?: boolean }> = [
        { c: 27, letter: 'AB', val: rows.reduce((s, r) => s + r.bono_neto, 0), isMoney: true },
        { c: 28, letter: 'AC', val: rows.reduce((s, r) => s + r.faltas, 0) },
        { c: 29, letter: 'AD', val: rows.reduce((s, r) => s + r.permisos, 0) },
        { c: 30, letter: 'AE', val: rows.reduce((s, r) => s + r.vacaciones, 0) },
        { c: 31, letter: 'AF', val: rows.reduce((s, r) => s + r.descanso_trabajado, 0) },
        { c: 32, letter: 'AG', val: rows.reduce((s, r) => s + r.prima_dominical, 0) },
        { c: 33, letter: 'AH', val: rows.reduce((s, r) => s + r.horas_extra, 0) },
        { c: 34, letter: 'AI', val: rows.reduce((s, r) => s + r.horas_extra_dobles, 0) },
        { c: 35, letter: 'AJ', val: rows.reduce((s, r) => s + r.horas_extra_triples, 0) },
        { c: 36, letter: 'AK', val: rows.reduce((s, r) => s + r.comision_sindical, 0) },
    ]
    sumCols.forEach(sc => {
        setCell(totalRow0, sc.c, {
            t: 'n',
            v: sc.val,
            f: rows.length > 0 ? `SUM(${sc.letter}${firstExcelRow}:${sc.letter}${lastExcelRow})` : undefined,
            z: sc.isMoney ? '_-"$"* #,##0.00_-;\\-"$"* #,##0.00_-;_-"$"* "-"??_-;_-@_-' : '#,##0',
            s: { ...totalStyle, alignment: { horizontal: sc.isMoney ? 'right' : 'center', vertical: 'center' } },
        })
    })

    // Signature Block (Elaboro / Reviso / Autorizo) matching original template spacing
    const elabRow0 = totalRow0 + 3
    const signRow0 = totalRow0 + 6
    setCell(elabRow0, 6, { t: 's', v: 'Elaboro:', s: { font: { bold: true, sz: 10 }, alignment: { horizontal: 'center' } } })
    setCell(elabRow0, 11, { t: 's', v: 'Reviso:', s: { font: { bold: true, sz: 10 }, alignment: { horizontal: 'center' } } })
    setCell(elabRow0, 16, { t: 's', v: 'Autorizo:', s: { font: { bold: true, sz: 10 }, alignment: { horizontal: 'center' } } })

    merges.push(
        { s: { r: elabRow0, c: 6 }, e: { r: elabRow0, c: 9 } },
        { s: { r: elabRow0, c: 11 }, e: { r: elabRow0, c: 14 } },
        { s: { r: elabRow0, c: 16 }, e: { r: elabRow0, c: 19 } },
        { s: { r: signRow0, c: 6 }, e: { r: signRow0, c: 9 } },
        { s: { r: signRow0, c: 11 }, e: { r: signRow0, c: 14 } },
        { s: { r: signRow0, c: 16 }, e: { r: signRow0, c: 19 } }
    )

    setCell(signRow0, 7, { t: 's', v: 'Control de Operaciones', s: { font: { bold: true, sz: 10 }, alignment: { horizontal: 'center' } } })
    setCell(signRow0, 12, { t: 's', v: 'Superintendencia de Mina', s: { font: { bold: true, sz: 10 }, alignment: { horizontal: 'center' } } })
    setCell(signRow0, 17, { t: 's', v: 'Gerencia de Operaciones', s: { font: { bold: true, sz: 10 }, alignment: { horizontal: 'center' } } })

    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: signRow0 + 2, c: 37 } })
    ws['!merges'] = merges

    const cols: XLSX.ColInfo[] = [
        { wch: 6 },   // A #
        { wch: 30 },  // B CATEGORIA
        { wch: 13 },  // C No. EMPLEADO
        { wch: 38 },  // D NOMBRE
        { wch: 13 },  // E SALARIO DIARIO
        { wch: 3 },   // F Spacer
    ]
    for (let i = 0; i < 21; i++) cols.push({ wch: 6.5 }) // G..AA (Turno, Dia, H.E. x 7)
    cols.push(
        { wch: 16 }, // AB BONO
        { wch: 9 },  // AC FALTAS
        { wch: 10 }, // AD PERMISOS
        { wch: 12 }, // AE VACACIONES
        { wch: 14 }, // AF DESCANSO TRABAJADO
        { wch: 13 }, // AG PRIMA DOMINICAL
        { wch: 12 }, // AH HORAS EXTRA
        { wch: 14 }, // AI HORAS EXTRAS DOBLES
        { wch: 14 }, // AJ HORAS EXTRA TRIPLES
        { wch: 14 }, // AK COMISIÓN SINDICAL
        { wch: 28 }  // AL OBSERVACIONES
    )
    ws['!cols'] = cols
    ws['!rows'] = [{ hpt: 30 }, { hpt: 15 }, { hpt: 18 }, { hpt: 16 }, { hpt: 12 }, { hpt: 18 }, { hpt: 24 }, { hpt: 18 }]

    return ws
}
