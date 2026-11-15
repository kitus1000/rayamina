'use client'

import { useState, useEffect } from 'react'
import { Save, Settings2, AlertCircle, Shield, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ConfiguracionPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [configUrl, setConfigUrl] = useState('')

    // Form inputs
    const [minDays, setMinDays] = useState(5)
    const [maxDays, setMaxDays] = useState(7)
    const [startDay, setStartDay] = useState(1) // 1 = Lunes default

    const diasSemana = [
        { id: 1, name: 'Lunes' },
        { id: 2, name: 'Martes' },
        { id: 3, name: 'Miércoles' },
        { id: 4, name: 'Jueves' },
        { id: 5, name: 'Viernes' },
        { id: 6, name: 'Sábado' },
        { id: 0, name: 'Domingo' },
    ]

    useEffect(() => {
        loadConfig()
    }, [])

    const loadConfig = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('sys_config')
            .select('*')
            .eq('key_name', 'week_close_rules')
            .single()

        if (data && data.value_json) {
            setMinDays(data.value_json.min_days || 5)
            setMaxDays(data.value_json.max_days || 7)
        }

        // Cargar inicio de semana
        const { data: startData } = await supabase
            .from('sys_config')
            .select('*')
            .eq('key_name', 'operational_week_start')
            .single()

        if (startData && startData.value_json) {
            setStartDay(startData.value_json.day_index ?? 1)
        }
        setLoading(false)
    }

    const handleSave = async () => {
        setSaving(true)

        // 1. Guardar reglas de cierre
        const { error: err1 } = await supabase
            .from('sys_config')
            .upsert({
                key_name: 'week_close_rules',
                value_json: { min_days: minDays, max_days: maxDays },
                description: 'Reglas para permitir el cierre de una semana operativa agrupando reportes diarios',
                updated_at: new Date().toISOString()
            }, { onConflict: 'key_name' })

        // 2. Guardar inicio de semana
        const { error: err2 } = await supabase
            .from('sys_config')
            .upsert({
                key_name: 'operational_week_start',
                value_json: { day_index: startDay },
                description: 'Día oficial de inicio de la semana operativa (0-6)',
                updated_at: new Date().toISOString()
            }, { onConflict: 'key_name' })

        setSaving(false)
        if (!err1 && !err2) {
            alert('Configuración guardada correctamente.')
        } else {
            alert('Error al guardar: ' + (err1?.message || err2?.message))
        }
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8 flex items-center gap-3">
                <Settings2 className="text-amber-500 w-8 h-8" />
                <div>
                    <h1 className="text-3xl font-bold text-white">Configuración del Sistema</h1>
                    <p className="text-slate-400">Administración de parámetros globales de la aplicación.</p>
                </div>
            </div>

            {loading ? (
                <div className="text-amber-500 animate-pulse">Cargando configuración...</div>
            ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                    <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-800 pb-4">
                        Reglas de Operación (Semanas)
                    </h2>

                    <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl p-4 mb-6 flex gap-3 text-blue-200">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-400" />
                        <p className="text-sm leading-relaxed">
                            Establece el rango de días requeridos para poder cerrar una semana de operación. El sistema no permitirá a los usuarios agrupar reportes si la cantidad seleccionada está fuera de estos límites.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div className="space-y-3">
                            <label className="block text-sm font-bold text-slate-300 uppercase tracking-wide">
                                Días Mínimos por Semana
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={14}
                                value={minDays}
                                onChange={e => setMinDays(parseInt(e.target.value) || 1)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-500 outline-none font-bold text-lg"
                            />
                            <p className="text-xs text-slate-500">Mínimo sugerido: 5 días de reportes para validar una semana.</p>
                        </div>
                        <div className="space-y-3">
                            <label className="block text-sm font-bold text-slate-300 uppercase tracking-wide">
                                Días Máximos por Semana
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={14}
                                value={maxDays}
                                onChange={e => setMaxDays(parseInt(e.target.value) || 7)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-500 outline-none font-bold text-lg"
                            />
                            <p className="text-xs text-slate-500">Máximo permitido: 7 días estándar para un corte de raya.</p>
                        </div>
                    </div>

                    <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-800 pb-4 mt-12">
                        Seguridad y Permisos
                    </h2>

                    <div className="grid grid-cols-1 gap-6 mb-8">
                        <Link href="/dashboard/configuracion/visiones">
                            <div className="group bg-slate-950/50 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 transition-all cursor-pointer flex items-center justify-between">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                        <Shield size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white group-hover:text-amber-500 transition-colors">Visiones (Permisos Dinámicos)</h3>
                                        <p className="text-sm text-slate-400 max-w-md">Personaliza qué módulos y vistas puede ver cada jefe o supervisor en el menú lateral.</p>
                                    </div>
                                </div>
                                <div className="text-slate-600 group-hover:text-amber-500 transition-all group-hover:translate-x-1">
                                    <ChevronRight size={24} />
                                </div>
                            </div>
                        </Link>
                    </div>

                    <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-800 pb-4 mt-12">
                        Calendario Operativo
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        {/* Start Day */}
                        <div className="space-y-3">
                            <label className="block text-sm font-bold text-slate-300 uppercase tracking-wide">
                                Día de Inicio de Semana
                            </label>
                            <select
                                value={startDay}
                                onChange={e => setStartDay(parseInt(e.target.value))}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white text-lg focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                            >
                                {diasSemana.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-500">Define qué día de la semana inician oficialmente tus cortes de nómina y planeación.</p>
                        </div>

                        {/* Info actual */}
                        <div className="bg-slate-950/50 rounded-xl p-6 border border-slate-800 shadow-inner">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                                Diagnóstico en Tiempo Real
                            </h4>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                                    <span className="text-slate-400 text-sm">Día Calendario:</span>
                                    <span className="text-white font-medium text-sm">{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                                    <span className="text-slate-400 text-sm">Semana del Año:</span>
                                    <span className="text-amber-500 font-bold font-mono">#{getWeekNumber(new Date())}</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                                    <span className="text-slate-400 text-sm">Inició Operativamente:</span>
                                    <span className="text-white font-bold text-sm bg-slate-800 px-2 py-1 rounded">{getOperativeStart(startDay)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-6 border-t border-slate-800">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold shadow-lg transition-all ${saving ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20'}`}
                        >
                            <Save size={20} />
                            {saving ? 'Guardando...' : 'Guardar Configuración'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

function getWeekNumber(d: Date) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    return weekNo
}

function getOperativeStart(configDay: number) {
    const curr = new Date()
    const day = curr.getDay()
    let diff = day - configDay
    if (diff < 0) diff += 7

    const inicio = new Date(curr)
    inicio.setDate(curr.getDate() - diff)
    return inicio.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}
