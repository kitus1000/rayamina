'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Edit2, Trash2, Settings, Box, Truck, Hammer, X, Save, AlertTriangle, List } from 'lucide-react'
import { useCatalog } from '@/hooks/use-catalog'
import { supabase } from '@/lib/supabase'

// --- TYPES ---
type ProductVariable = {
    id?: string
    label: string
    clave: string
    tipo_input: 'NUMBER' | 'TEXT' | 'SELECT' | 'BOOLEAN'
    opciones?: string[] // Para UI manejaremos array de strings
    unidad?: string
    orden: number
    requerido: boolean
}

type Product = {
    id: string
    categoria: 'PERFORACION' | 'FLETE' | 'SERVICIOS_OBRA_CIVIL'
    subcategoria: string
    nombre: string
    unidad_medida_default: string
    modo_captura: 'DIRECTO' | 'CALCULADO'
    formula_cobro?: string
    requiere_maquina: boolean
    tipos_equipo_permitidos: string[]
    activo: boolean
    // Join
    cat_producto_variables?: ProductVariable[]
}

const TABS = [
    { id: 'PERFORACION', label: 'Perforación', icon: <Box size={18} /> },
    { id: 'FLETE', label: 'Flete y Acarreo', icon: <Truck size={18} /> },
    { id: 'SERVICIOS_OBRA_CIVIL', label: 'Servicios y Obra Civil', icon: <Hammer size={18} /> },
]

export default function ProductsMinaPage() {
    // --- STATE ---
    const [activeTab, setActiveTab] = useState('PERFORACION')
    const [products, setProducts] = useState<Product[]>([])
    const [equipmentTypes, setEquipmentTypes] = useState<string[]>([])
    const [loading, setLoading] = useState(true)

    // Form State
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [currentId, setCurrentId] = useState<string | null>(null)
    const [formError, setFormError] = useState<string | null>(null)

    // Initial Form State
    const initialFormState: Partial<Product> & { variables: ProductVariable[] } = {
        categoria: 'PERFORACION',
        subcategoria: '',
        nombre: '',
        unidad_medida_default: 'M',
        modo_captura: 'DIRECTO',
        formula_cobro: '',
        requiere_maquina: false,
        tipos_equipo_permitidos: [],
        activo: true,
        variables: []
    }
    const [formData, setFormData] = useState(initialFormState)

    // --- DATA FETCHING ---
    const fetchProducts = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('cat_productos_mina')
            .select('*, cat_producto_variables(*)')
            .order('nombre')

        if (data) setProducts(data)

        // Fetch Equipment Types
        const { data: typesData } = await supabase
            .from('cat_tipos_equipo')
            .select('nombre')
            .eq('activo', true)
            .order('nombre')

        if (typesData) {
            setEquipmentTypes(typesData.map(t => t.nombre))
        }

        setLoading(false)
    }

    useEffect(() => {
        fetchProducts()
    }, [])

    // --- FILTERED DATA ---
    const filteredProducts = useMemo(() => {
        return products.filter(p => p.categoria === activeTab)
    }, [products, activeTab])

    // --- HANDLERS ---
    const handleOpenCreate = () => {
        setIsEditMode(false)
        setFormError(null)
        setFormData({ ...initialFormState, categoria: activeTab as any }) // Set category to active tab
        setIsModalOpen(true)
    }

    const handleOpenEdit = (prod: Product) => {
        setIsEditMode(true)
        setCurrentId(prod.id)
        setFormError(null)
        // Map DB variables to Form variables
        const vars = (prod.cat_producto_variables || []).sort((a, b) => a.orden - b.orden)

        setFormData({
            ...prod,
            variables: vars
        })
        setIsModalOpen(true)
    }

    // --- VARIABLE BUILDER HANDLERS ---
    const addVariable = () => {
        const newVar: ProductVariable = {
            label: 'Nueva Variable',
            clave: `var_${Date.now()}`,
            tipo_input: 'NUMBER',
            unidad: '',
            orden: formData.variables.length + 1,
            requerido: true
        }
        setFormData({ ...formData, variables: [...formData.variables, newVar] })
    }

    const updateVariable = (index: number, field: keyof ProductVariable, value: any) => {
        const newVars = [...formData.variables]
        newVars[index] = { ...newVars[index], [field]: value }
        // Auto-generate key from label if key is default or empty? Maybe too magic.
        setFormData({ ...formData, variables: newVars })
    }

    const removeVariable = (index: number) => {
        const newVars = formData.variables.filter((_, i) => i !== index)
        setFormData({ ...formData, variables: newVars })
    }

    // --- SUBMIT ---
    const handleSubmit = async () => {
        if (!formData.nombre) {
            setFormError('El nombre del concepto es obligatorio.')
            return
        }

        try {
            // 1. Upsert Product
            const productPayload = {
                categoria: formData.categoria,
                nombre: formData.nombre,
                unidad_medida_default: formData.unidad_medida_default,
                modo_captura: formData.modo_captura,
                formula_cobro: formData.formula_cobro,
                tipos_equipo_permitidos: formData.tipos_equipo_permitidos,
                activo: formData.activo
            }

            let productId = currentId

            if (isEditMode && currentId) {
                const { error } = await supabase.from('cat_productos_mina').update(productPayload).eq('id', currentId)
                if (error) throw error
            } else {
                const { data, error } = await supabase.from('cat_productos_mina').insert(productPayload).select('id').single()
                if (error) throw error
                productId = data.id
            }

            // 2. Handle Variables (Sync)
            if (productId) {
                // Delete old
                await supabase.from('cat_producto_variables').delete().eq('producto_id', productId)

                // Insert new
                if (formData.variables.length > 0) {
                    const varsPayload = formData.variables.map((v, idx) => ({
                        producto_id: productId,
                        label: v.label,
                        clave: v.clave || v.label.toLowerCase().replace(/\s+/g, '_'),
                        tipo_input: v.tipo_input,
                        opciones_select: v.opciones || [],
                        unidad: v.unidad,
                        orden: idx + 1,
                        obligatorio: v.requerido ?? true
                    }))

                    const { error: varError } = await supabase.from('cat_producto_variables').insert(varsPayload)
                    if (varError) throw varError
                }
            }

            alert('Concepto guardado exitosamente.')
            setIsModalOpen(false)
            fetchProducts()

        } catch (err: any) {
            console.error(err)
            setFormError('Error al guardar: ' + err.message)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar este concepto? Se eliminarán también sus variables configuradas.')) return
        const { error } = await supabase.from('cat_productos_mina').delete().eq('id', id)
        if (error) alert('Error: ' + error.message)
        else fetchProducts()
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
            {/* --- HEADER --- */}
            <div className="mb-6">
                <Link href="/dashboard/catalogos" className="text-sm text-slate-400 hover:text-white flex items-center gap-1 transition-colors w-fit">
                    ← Volver a Catálogos
                </Link>
            </div>

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Catálogo de Productos de Mina</h1>
                    <p className="text-slate-400">Configuración de actividades, variables de captura y operación.</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-lg shadow-amber-900/20"
                >
                    <Plus size={18} /> Nuevo Concepto
                </button>
            </div>

            {/* --- TABS --- */}
            <div className="flex gap-2 mb-6 border-b border-slate-800">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === tab.id
                            ? 'text-amber-400'
                            : 'text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]"></div>
                        )}
                    </button>
                ))}
            </div>

            {/* --- TABLE --- */}
            {loading ? (
                <div className="text-slate-500 py-10 text-center animate-pulse">Cargando catálogo...</div>
            ) : (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold">
                            <tr>
                                <th className="px-6 py-4">Concepto</th>
                                <th className="px-6 py-4">Unidad</th>
                                <th className="px-6 py-4">Modo Captura</th>
                                <th className="px-6 py-4">Variables</th>
                                <th className="px-6 py-4">Máquina?</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredProducts.map(prod => (
                                <tr key={prod.id} className="hover:bg-slate-800/40 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-white">{prod.nombre}</div>
                                        <div className="text-xs text-slate-500">{prod.subcategoria}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-xs border border-slate-700">
                                            {prod.unidad_medida_default}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {prod.modo_captura === 'CALCULADO' ? (
                                            <span className="text-purple-400 text-xs font-bold flex items-center gap-1">
                                                <Settings size={12} /> Calculado
                                            </span>
                                        ) : (
                                            <span className="text-emerald-400 text-xs font-bold">Directo</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {prod.cat_producto_variables && prod.cat_producto_variables.length > 0 ? (
                                                prod.cat_producto_variables.map(v => (
                                                    <span key={v.id} className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                                                        {v.label} ({v.unidad || '-'})
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-slate-600 text-xs italic">N/A</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {prod.requiere_maquina ? (
                                            <div className="text-amber-500 text-xs flex items-center gap-1">
                                                <Truck size={12} /> Sí
                                                <span className="text-slate-600 ml-1">
                                                    ({prod.tipos_equipo_permitidos?.length || 0})
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-600">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleOpenEdit(prod)} className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(prod.id)} className="p-2 hover:bg-red-900/20 rounded text-slate-400 hover:text-red-500 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredProducts.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        No hay conceptos registrados en esta categoría.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* --- MODAL --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start justify-center z-50 p-4 md:pl-72 pt-16">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950 rounded-t-xl">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                {isEditMode ? <Edit2 size={20} /> : <Plus size={20} />}
                                {isEditMode ? 'Editar Concepto' : 'Nuevo Concepto Operativo'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                            {/* ERROR ALERT */}
                            {formError && (
                                <div className="bg-red-950/50 border border-red-800 text-red-300 p-4 rounded-lg text-sm flex items-center gap-2">
                                    <AlertTriangle size={16} /> {formError}
                                </div>
                            )}

                            {/* SECCION 1: GENERAL */}
                            <section>
                                <h4 className="text-sm font-bold text-amber-500 uppercase mb-4 tracking-wider">Información Básica</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Categoría</label>
                                        <select
                                            value={formData.categoria}
                                            onChange={e => setFormData({ ...formData, categoria: e.target.value as any })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-amber-500 outline-none"
                                        >
                                            {TABS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Subcategoría *</label>
                                        <input
                                            type="text"
                                            value={formData.subcategoria}
                                            onChange={e => setFormData({ ...formData, subcategoria: e.target.value })}
                                            placeholder="Ej. Desarrollo, Producción"
                                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-amber-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Nombre del Concepto *</label>
                                        <input
                                            type="text"
                                            value={formData.nombre}
                                            onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                            placeholder="Ej. Barrenación Frente"
                                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-amber-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Unidad Medida Default *</label>
                                        <input
                                            type="text"
                                            value={formData.unidad_medida_default}
                                            onChange={e => setFormData({ ...formData, unidad_medida_default: e.target.value })}
                                            placeholder="Ej. M, M3, TON, PZA"
                                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-amber-500 outline-none"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 pt-6">
                                        <input
                                            type="checkbox"
                                            checked={formData.activo}
                                            onChange={e => setFormData({ ...formData, activo: e.target.checked })}
                                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-offset-0 focus:ring-0"
                                        />
                                        <label className="text-sm text-slate-300">Activo en Catálogo</label>
                                    </div>
                                </div>
                            </section>

                            <div className="h-px bg-slate-800" />

                            {/* SECCION 2: CONFIGURACIÓN DE VARIABLES */}
                            <section>
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-sm font-bold text-amber-500 uppercase tracking-wider">Configuración de Captura</h4>
                                    <div className="flex bg-slate-800 rounded p-1 border border-slate-700">
                                        <button
                                            onClick={() => setFormData({ ...formData, modo_captura: 'DIRECTO' })}
                                            className={`px-3 py-1 text-xs rounded transition-colors ${formData.modo_captura === 'DIRECTO' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                        >
                                            Directo
                                        </button>
                                        <button
                                            onClick={() => setFormData({ ...formData, modo_captura: 'CALCULADO' })}
                                            className={`px-3 py-1 text-xs rounded transition-colors ${formData.modo_captura === 'CALCULADO' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                        >
                                            Calculado
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-slate-950/50 rounded-lg p-5 border border-slate-800">
                                    <div className="flex justify-between items-center mb-3">
                                        <h5 className="text-sm font-medium text-slate-300">Variables Requeridas</h5>
                                        <button onClick={addVariable} className="text-xs flex items-center gap-1 text-amber-400 hover:text-amber-300">
                                            <Plus size={14} /> Agregar Variable
                                        </button>
                                    </div>

                                    {formData.variables.length === 0 ? (
                                        <p className="text-center text-slate-600 text-sm py-4 italic border border-dashed border-slate-800 rounded">
                                            No hay variables extra. Se capturará solo la Cantidad ({formData.unidad_medida_default}).
                                        </p>
                                    ) : (
                                        <div className="space-y-3">
                                            {formData.variables.map((v, idx) => (
                                                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-900 p-2 rounded border border-slate-800">
                                                    <div className="col-span-3">
                                                        <input
                                                            type="text"
                                                            value={v.label}
                                                            onChange={e => updateVariable(idx, 'label', e.target.value)}
                                                            className="w-full bg-transparent text-sm text-white placeholder-slate-600 border-none focus:ring-0 p-0"
                                                            placeholder="Etiqueta (Ej. Largo)"
                                                        />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <input
                                                            type="text"
                                                            value={v.clave || ''}
                                                            onChange={e => updateVariable(idx, 'clave', e.target.value)}
                                                            className="w-full bg-slate-950/50 text-xs text-amber-500 font-mono placeholder-slate-700 border border-slate-800 rounded px-2 py-1 focus:border-amber-500 outline-none"
                                                            placeholder="Var (x, y)"
                                                            title="Nombre de la variable para la fórmula"
                                                        />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <select
                                                            value={v.tipo_input}
                                                            onChange={e => updateVariable(idx, 'tipo_input', e.target.value)}
                                                            className="w-full bg-slate-800 text-xs text-slate-300 border-none rounded focus:ring-0 py-1"
                                                        >
                                                            <option value="NUMBER">Número</option>
                                                            <option value="TEXT">Texto</option>
                                                            <option value="SELECT">Lista</option>
                                                        </select>
                                                    </div>
                                                    <div className="col-span-1">
                                                        <input
                                                            type="text"
                                                            value={v.unidad || ''}
                                                            onChange={e => updateVariable(idx, 'unidad', e.target.value)}
                                                            className="w-full bg-transparent text-xs text-slate-400 placeholder-slate-700 border-b border-slate-800 focus:border-amber-500 outline-none text-center"
                                                            placeholder="UOM"
                                                        />
                                                    </div>
                                                    <div className="col-span-3 flex items-center gap-2">
                                                        {v.tipo_input === 'SELECT' && (
                                                            <input
                                                                type="text"
                                                                placeholder="Opciones (sep. coma)"
                                                                className="w-full bg-slate-800 text-xs text-slate-300 rounded px-2 py-1 border border-slate-700"
                                                                value={v.opciones?.join(',') || ''}
                                                                onChange={e => updateVariable(idx, 'opciones', e.target.value.split(','))}
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="col-span-1 text-right">
                                                        <button onClick={() => removeVariable(idx)} className="text-slate-600 hover:text-red-500 transition-colors">
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {formData.modo_captura === 'CALCULADO' && (
                                        <div className="mt-4 pt-4 border-t border-slate-800">
                                            <div className="flex justify-between items-end mb-2">
                                                <label className="block text-xs text-slate-400">Fórmula de Cálculo</label>
                                                <div className="flex gap-1">
                                                    {['+', '-', '*', '/', '(', ')'].map(op => (
                                                        <button
                                                            key={op}
                                                            onClick={() => setFormData(prev => ({ ...prev, formula_cobro: (prev.formula_cobro || '') + ' ' + op + ' ' }))}
                                                            className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-400 text-xs font-bold rounded border border-slate-700 transition-colors"
                                                            title={`Insertar ${op}`}
                                                        >
                                                            {op}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] text-amber-500">Variables disponibles: {formData.variables.map(v => v.clave || '?').join(', ')}</span>
                                            </div>
                                            <input
                                                type="text"
                                                value={formData.formula_cobro || ''}
                                                onChange={e => setFormData({ ...formData, formula_cobro: e.target.value })}
                                                placeholder="Ej. largo * ancho * profundidad"
                                                className="w-full bg-slate-900 font-mono text-sm text-purple-300 border border-slate-800 rounded p-2 focus:border-purple-500 outline-none mb-4"
                                            />

                                            {/* PREVIEW CALCULATOR */}
                                            <div className="bg-slate-950 p-3 rounded border border-slate-800/50">
                                                <p className="text-[10px] uppercase text-slate-500 font-bold mb-2">Probador de Fórmula</p>
                                                <div className="flex flex-wrap gap-4 items-end">
                                                    {formData.variables.filter(v => v.tipo_input === 'NUMBER').map((v, i) => (
                                                        <div key={i}>
                                                            <label className="text-[10px] text-slate-400 block mb-1">{v.clave || '?'}</label>
                                                            <input
                                                                type="number"
                                                                className="w-20 bg-slate-800 text-xs text-white border border-slate-700 rounded px-2 py-1"
                                                                placeholder="0"
                                                                id={`test_var_${v.clave}`}
                                                                onChange={() => {
                                                                    // Simple calc logic trigger
                                                                    const formula = formData.formula_cobro || '';
                                                                    const vars = formData.variables.filter(vv => vv.tipo_input === 'NUMBER');
                                                                    let evalstring = formula;
                                                                    vars.forEach(vv => {
                                                                        const val = (document.getElementById(`test_var_${vv.clave}`) as HTMLInputElement)?.value || '0';
                                                                        // Replace all occurrences of the var name with value
                                                                        // Simple regex to match whole words only to avoid replacing 'largo' when var is 'l'
                                                                        if (vv.clave) {
                                                                            const regex = new RegExp(`\\b${vv.clave}\\b`, 'g');
                                                                            evalstring = evalstring.replace(regex, val);
                                                                        }
                                                                    });
                                                                    try {
                                                                        // Safe-ish eval for preview only
                                                                        const result = Function(`"use strict"; return (${evalstring})`)();
                                                                        const resEl = document.getElementById('calc_preview_result');
                                                                        if (resEl) resEl.innerText = isNaN(result) ? 'Error' : Number(result).toFixed(2);
                                                                    } catch (e) {
                                                                        const resEl = document.getElementById('calc_preview_result');
                                                                        if (resEl) resEl.innerText = '...';
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    ))}
                                                    <div className="pb-1 text-slate-400">=</div>
                                                    <div className="pb-1 text-lg font-bold text-purple-400" id="calc_preview_result">0.00</div>
                                                    <div className="pb-1 text-xs text-slate-500">{formData.unidad_medida_default}</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <div className="h-px bg-slate-800" />

                            {/* SECCION 3: RESTRICCIONES */}
                            <section>
                                <h4 className="text-sm font-bold text-amber-500 uppercase mb-4 tracking-wider">Restricciones Operativas</h4>
                                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-8 h-4 rounded-full p-0.5 flex transition-colors ${formData.requiere_maquina ? 'bg-amber-600 justify-end' : 'bg-slate-700 justify-start'}`}>
                                                <button onClick={() => setFormData({ ...formData, requiere_maquina: !formData.requiere_maquina })} className="w-3 h-3 bg-white rounded-full shadow-sm"></button>
                                            </div>
                                            <label className="text-sm text-slate-300 cursor-pointer" onClick={() => setFormData({ ...formData, requiere_maquina: !formData.requiere_maquina })}>
                                                Requiere Equipo/Maquinaria
                                            </label>
                                        </div>
                                    </div>

                                    {formData.requiere_maquina && (
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-2">Tipos de Equipo Permitidos</label>
                                            <div className="flex flex-wrap gap-2">
                                                {equipmentTypes.map(type => (
                                                    <button
                                                        key={type}
                                                        onClick={() => {
                                                            const current = formData.tipos_equipo_permitidos || []
                                                            const exists = current.includes(type)
                                                            const newTypes = exists ? current.filter(t => t !== type) : [...current, type]
                                                            setFormData({ ...formData, tipos_equipo_permitidos: newTypes })
                                                        }}
                                                        className={`px-2 py-1 text-xs rounded border transition-all ${formData.tipos_equipo_permitidos?.includes(type)
                                                            ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                                                            : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600'
                                                            }`}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-800 bg-slate-950 rounded-b-xl flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-slate-400 hover:text-white transition-colors">Cancelar</button>
                            <button onClick={handleSubmit} className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-amber-900/20 flex items-center gap-2">
                                <Save size={18} /> Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
