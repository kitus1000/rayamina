'use client'

import { useState, useEffect } from 'react'
import { GitMerge, Check, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function CompatibilidadTab() {
    const [puestos, setPuestos] = useState<any[]>([])
    const [roles, setRoles] = useState<any[]>([])
    const [relations, setRelations] = useState<Record<string, string[]>>({}) // puestoId -> [rolId, rolId]
    const [selectedPuesto, setSelectedPuesto] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        // 1. Fetch Puestos
        const { data: pData } = await supabase.from('cat_puestos').select('*').eq('activo', true).order('nombre')
        // 2. Fetch Roles
        const { data: rData } = await supabase.from('cat_roles_operativos').select('*').eq('activo', true).order('categoria').order('orden')
        // 3. Fetch Existing Relations
        const { data: rRel } = await supabase.from('cat_puesto_roles').select('*')

        if (pData) setPuestos(pData)
        if (rData) setRoles(rData)

        // Process relations into a map
        const map: Record<string, string[]> = {}
        if (rRel) {
            rRel.forEach((item: any) => {
                if (!map[item.puesto_id]) map[item.puesto_id] = []
                map[item.puesto_id].push(item.rol_operativo_id)
            })
        }
        setRelations(map)

        // Auto-select first puesto
        if (pData && pData.length > 0) setSelectedPuesto(pData[0].id)

        setLoading(false)
    }

    const toggleRelation = async (rolId: string) => {
        if (!selectedPuesto) return
        if (saving) return

        const currentRoles = relations[selectedPuesto] || []
        const exists = currentRoles.includes(rolId)
        const newRoles = exists
            ? currentRoles.filter(id => id !== rolId)
            : [...currentRoles, rolId]

        // Optimistic update
        setRelations(prev => ({ ...prev, [selectedPuesto]: newRoles }))

        // DB Update
        if (exists) {
            // Delete
            await supabase
                .from('cat_puesto_roles')
                .delete()
                .match({ puesto_id: selectedPuesto, rol_operativo_id: rolId })
        } else {
            // Insert
            await supabase
                .from('cat_puesto_roles')
                .insert([{ puesto_id: selectedPuesto, rol_operativo_id: rolId }])
        }
    }

    if (loading) return <div className="text-slate-500 flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Cargando matriz...</div>

    return (
        <div className="flex gap-6 h-[500px]">
            {/* Sidebar: Puestos */}
            <div className="w-1/3 border-r border-slate-800 pr-4 overflow-y-auto custom-scrollbar">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Puestos (RH)</h3>
                <div className="space-y-1">
                    {puestos.map(puesto => (
                        <button
                            key={puesto.id}
                            onClick={() => setSelectedPuesto(puesto.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex justify-between items-center ${selectedPuesto === puesto.id
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                }`}
                        >
                            {puesto.nombre}
                            {relations[puesto.id]?.length > 0 && (
                                <span className="bg-slate-800 text-xs px-1.5 py-0.5 rounded text-slate-500">
                                    {relations[puesto.id].length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content: Roles */}
            <div className="w-2/3 overflow-y-auto custom-scrollbar">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <GitMerge size={14} />
                    Roles Permitidos para: <span className="text-white">{puestos.find(p => p.id === selectedPuesto)?.nombre}</span>
                </h3>

                <div className="grid grid-cols-2 gap-3">
                    {roles.map(rol => {
                        const isSelected = relations[selectedPuesto!]?.includes(rol.id)
                        return (
                            <button
                                key={rol.id}
                                onClick={() => toggleRelation(rol.id)}
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isSelected
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-900/10'
                                        : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400'
                                    }`}
                            >
                                <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-800 border border-slate-700'
                                    }`}>
                                    {isSelected && <Check size={12} />}
                                </div>
                                <div className="text-left">
                                    <div className="font-medium text-sm">{rol.nombre}</div>
                                    <div className="text-[10px] opacity-70 uppercase tracking-wide">{rol.categoria}</div>
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
