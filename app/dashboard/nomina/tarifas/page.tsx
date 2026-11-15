'use client'

import { useState, useEffect } from 'react'
import { DollarSign, Save, Search, Settings } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function TarifasConfigPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [activeTab, setActiveTab] = useState<'EMPLEADOS' | 'PRODUCTOS'>('EMPLEADOS')
    const [searchTerm, setSearchTerm] = useState('')

    const [empleados, setEmpleados] = useState<any[]>([])
    const [productos, setProductos] = useState<any[]>([])

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        // 1. Empleados con sueldo_diario_base
        const { data: dEmp } = await supabase
            .from('rh_employees')
            .select(`
                id, first_name, last_name, employee_code, sueldo_diario_base,
                puesto:cat_puestos(nombre),
                rol:cat_roles_operativos(nombre)
            `)
            .order('first_name')

        if (dEmp) setEmpleados(dEmp)

        // 2. Productos con tarifa_pago
        const { data: dProd } = await supabase
            .from('cat_productos_mina')
            .select('id, categoria, nombre, unidad_medida_default, tarifa_pago')
            .eq('activo', true)
            .order('categoria')
            .order('nombre')

        if (dProd) setProductos(dProd)

        setLoading(false)
    }

    const handleEmployeeChange = (id: string, prop: string, val: string) => {
        setEmpleados(empleados.map(e => e.id === id ? { ...e, [prop]: val } : e))
    }

    const handleProductChange = (id: string, prop: string, val: string) => {
        setProductos(productos.map(p => p.id === id ? { ...p, [prop]: val } : p))
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            if (activeTab === 'EMPLEADOS') {
                const upserts = empleados.map(e => ({
                    id: e.id,
                    first_name: e.first_name,
                    last_name: e.last_name,
                    employee_code: e.employee_code,
                    sueldo_diario_base: parseFloat(e.sueldo_diario_base) || 0
                }))
                const { error } = await supabase.from('rh_employees').upsert(upserts)
                if (error) throw error
            } else {
                const upserts = productos.map(p => ({
                    id: p.id,
                    categoria: p.categoria,
                    nombre: p.nombre,
                    unidad_medida_default: p.unidad_medida_default,
                    tarifa_pago: parseFloat(p.tarifa_pago) || 0
                }))
                const { error } = await supabase.from('cat_productos_mina').upsert(upserts)
                if (error) throw error
            }

            alert('Tarifas Guardadas Exitosamente')
        } catch (error: any) {
            console.error(error)
            alert('Error al guardar: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const filteredEmpleados = empleados.filter(e =>
        `${e.first_name} ${e.last_name} ${e.employee_code}`.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const filteredProductos = productos.filter(p =>
        `${p.nombre} ${p.categoria}`.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Settings className="text-green-500 w-8 h-8" /> Configuración Financiera
                    </h1>
                    <p className="text-slate-400 mt-1">Sueldos base por empleado y tarifas de destajo por actividad.</p>
                </div>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex gap-4 mb-6">
                <button
                    onClick={() => setActiveTab('EMPLEADOS')}
                    className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'EMPLEADOS' ? 'bg-green-600 text-white shadow-lg shadow-green-900/40' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
                >
                    <DollarSign size={18} /> Salaries Fijos (Empleados)
                </button>
                <button
                    onClick={() => setActiveTab('PRODUCTOS')}
                    className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'PRODUCTOS' ? 'bg-green-600 text-white shadow-lg shadow-green-900/40' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
                >
                    <DollarSign size={18} /> Destajos (Producción)
                </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    {/* SEARCHBAR */}
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-green-500 outline-none"
                        />
                    </div>
                    {/* BUTTON */}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`px-6 py-2.5 rounded-lg flex items-center gap-2 font-bold shadow-lg transition-all ${saving ? 'bg-slate-800 text-slate-500' : 'bg-gradient-to-r from-green-500 to-green-400 hover:from-green-400 hover:to-green-300 text-white shadow-green-900/30'}`}
                    >
                        <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-green-500 font-bold animate-pulse">Cargando catálogo financiero...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold">
                                {activeTab === 'EMPLEADOS' ? (
                                    <tr>
                                        <th className="px-4 py-3">Código</th>
                                        <th className="px-4 py-3">Nombre del Empleado</th>
                                        <th className="px-4 py-3">Puesto / Rol</th>
                                        <th className="px-4 py-3 text-right">Sueldo Diario Fijo ($)</th>
                                    </tr>
                                ) : (
                                    <tr>
                                        <th className="px-4 py-3">Categoría</th>
                                        <th className="px-4 py-3">Concepto Base</th>
                                        <th className="px-4 py-3">U. Medida</th>
                                        <th className="px-4 py-3 text-right">Tarifa Pagadera ($)</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {activeTab === 'EMPLEADOS' && filteredEmpleados.map(emp => (
                                    <tr key={emp.id} className="hover:bg-slate-800/40 transition-colors">
                                        <td className="px-4 py-3 font-mono text-slate-400">{emp.employee_code}</td>
                                        <td className="px-4 py-3 text-white font-medium">{emp.first_name} {emp.last_name}</td>
                                        <td className="px-4 py-3 text-xs">{emp.puesto?.nombre} / {emp.rol?.nombre}</td>
                                        <td className="px-4 py-3 text-right">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={emp.sueldo_diario_base || 0}
                                                onChange={e => handleEmployeeChange(emp.id, 'sueldo_diario_base', e.target.value)}
                                                className="w-32 bg-slate-950 border border-slate-700/50 rounded p-2 text-green-400 text-right font-bold focus:border-green-500 outline-none"
                                            />
                                        </td>
                                    </tr>
                                ))}

                                {activeTab === 'PRODUCTOS' && filteredProductos.map(prod => (
                                    <tr key={prod.id} className="hover:bg-slate-800/40 transition-colors">
                                        <td className="px-4 py-3">
                                            <span className="bg-slate-800 text-slate-400 text-xs px-2 py-1 rounded border border-slate-700">
                                                {prod.categoria}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-white font-medium">{prod.nombre}</td>
                                        <td className="px-4 py-3 text-slate-500">{prod.unidad_medida_default}</td>
                                        <td className="px-4 py-3 text-right">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={prod.tarifa_pago || 0}
                                                onChange={e => handleProductChange(prod.id, 'tarifa_pago', e.target.value)}
                                                className="w-32 bg-slate-950 border border-slate-700/50 rounded p-2 text-green-400 text-right font-bold focus:border-green-500 outline-none"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {((activeTab === 'EMPLEADOS' && filteredEmpleados.length === 0) ||
                            (activeTab === 'PRODUCTOS' && filteredProductos.length === 0)) && (
                                <div className="p-8 text-center text-slate-500 italic">No se encontraron resultados para la búsqueda.</div>
                            )}
                    </div>
                )}
            </div>
        </div>
    )
}
