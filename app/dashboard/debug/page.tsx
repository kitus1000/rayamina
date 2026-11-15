'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugPage() {
    const [status, setStatus] = useState<any>({ loading: true })
    const [envVars, setEnvVars] = useState<any>({})

    useEffect(() => {
        const checkConnection = async () => {
            const results: any = {}

            // Check Environment Variables (safely)
            results.env = {
                url_configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
                key_configured: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            }
            setEnvVars(results.env)

            try {
                // 1. COMPANIES (Base)
                const { data: companies, error: compError } = await supabase
                    .from('org_companies').select('*').limit(5)
                results.companies = {
                    count: companies?.length || 0,
                    last_record: companies?.[0] || null,
                    error: compError?.message
                }

                // 2. UNITS (Relation check)
                const { data: units, error: unitError } = await supabase
                    .from('org_units').select('*, org_companies(razon_social)').limit(5)
                results.units = {
                    count: units?.length || 0,
                    relation_check: units?.[0]?.org_companies ? 'OK' : 'FAIL/NULL',
                    last_record: units?.[0] || null,
                    error: unitError?.message
                }

                // 3. MINES (Relation check)
                const { data: mines, error: mineError } = await supabase
                    .from('mine_sites').select('*, org_units(nombre_unidad)').limit(5)
                results.mines = {
                    count: mines?.length || 0,
                    relation_check: mines?.[0]?.org_units ? 'OK' : 'FAIL/NULL',
                    last_record: mines?.[0] || null,
                    error: mineError?.message
                }

                // 4. LOCATIONS
                const { data: locs, error: locError } = await supabase
                    .from('mine_locations').select('*').limit(5)
                results.locations = {
                    count: locs?.length || 0,
                    error: locError?.message
                }

                // 5. EQUIPMENT
                const { data: equip, error: equipError } = await supabase
                    .from('ops_equipment').select('*').limit(5)
                results.equipment = {
                    count: equip?.length || 0,
                    error: equipError?.message
                }

                // 6. Auth Session
                const { data: { session }, error: authError } = await supabase.auth.getSession()
                results.auth = {
                    is_logged_in: !!session,
                    user_email: session?.user?.email,
                    error: authError?.message
                }

                // 7. SCHEMA CACHE TEST (Employees Table)
                const { data: empCheck, error: empError } = await supabase
                    .from('rh_employees')
                    .select('id, is_jefe, sueldo_diario_base')
                    .limit(1)

                results.schema_check = {
                    status: empError ? 'STALE / MISSING COLUMN' : 'OK',
                    details: empError?.message || 'Columnas is_jefe y sueldo_diario_base detectadas correctamente.',
                    column_tested: 'is_jefe, sueldo_diario_base'
                }

                // 8. VIEW TEST (Bypass Cache Strategy)
                const { data: viewCheck, error: viewError } = await supabase
                    .from('debug_employees_view')
                    .select('is_jefe_mina')
                    .limit(1)

                results.view_check = {
                    status: viewError ? 'FAIL' : 'OK',
                    details: viewError?.message || 'La VISTA sí ve la columna.',
                    advice: viewError ? 'La columna no existe ni en DB.' : 'Usa la vista o renombra la tabla.'
                }

                // 9. NEW TABLE TEST (Connectivity Check)
                const { data: newTableCheck, error: newTableError } = await supabase
                    .from('test_connectivity_v1')
                    .select('*')
                    .limit(1)

                results.new_table_check = {
                    status: newTableError ? 'FAIL' : 'OK',
                    details: newTableError?.message || 'La tabla nueva SE VE correctamente.',
                    implication: newTableError ? 'CRÍTICO: La API no ve cambios nuevos.' : 'El problema es específico de rh_employees.'
                }

            } catch (e: any) {
                results.exception = e.message
            }

            setStatus(results)
        }

        checkConnection()
    }, [])

    return (
        <div className="p-8 text-white space-y-6">
            <h1 className="text-2xl font-bold text-red-500">Diagnóstico Profundo de Datos</h1>

            <div className="bg-slate-900 p-4 rounded border border-slate-700">
                <h2 className="font-bold mb-2">Variables de Entorno</h2>
                <pre>{JSON.stringify(envVars, null, 2)}</pre>
            </div>

            <div className="bg-slate-900 p-4 rounded border border-slate-700">
                <h2 className="font-bold mb-2">Estado de Datos (Resultados)</h2>
                {status.loading ? 'Ejecutando pruebas...' : (
                    <pre className="text-xs overflow-auto max-h-[500px]">
                        {JSON.stringify(status, null, 2)}
                    </pre>
                )}
            </div>

            <div className="bg-slate-800 p-4 rounded text-sm">
                <h3 className="font-bold text-amber-500 mb-2">Guía de Interpretación:</h3>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>count: 0</strong> → La tabla está vacía. Si crees haber guardado datos, el "Insert" falló silenciosamente o RLS lo bloquea.</li>
                    <li><strong>relation_check: FAIL/NULL</strong> → Existe el dato pero no pudo traer el nombre de la empresa/unidad (Error de Foreign Key).</li>
                    <li><strong>last_record</strong> → Muestra el último dato guardado para verificar que se guardó bien.</li>
                </ul>
            </div>
        </div>
    )
}
