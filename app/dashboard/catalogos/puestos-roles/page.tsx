'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
    Users,
    Briefcase,
    GitMerge,
    BadgeDollarSign,
    Plus,
    Edit2,
    Trash2,
    CheckCircle2,
    XCircle
} from 'lucide-react'
import { useCatalog } from '@/hooks/use-catalog'
import { supabase } from '@/lib/supabase'

// --- Types ---
type Tab = 'PUESTOS' | 'ROLES' | 'COMPATIBILIDAD' | 'SPLITS'

// --- Components ---
import PuestosTab from './ui/puestos-tab'
import RolesTab from './ui/roles-tab'
import CompatibilidadTab from './ui/compatibilidad-tab'
import SplitsTab from './ui/splits-tab'

export default function PuestosRolesPage() {
    const [activeTab, setActiveTab] = useState<Tab>('PUESTOS')

    return (
        <div className="space-y-6">
            <div className="mb-2">
                <Link href="/dashboard/catalogos" className="text-sm text-slate-400 hover:text-white flex items-center gap-1 transition-colors w-fit">
                    ← Volver a Catálogos
                </Link>
            </div>

            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-white tracking-tight">Configuración de Puestos y Roles</h1>
                <p className="text-slate-400">
                    Gestión centralizada de estructura organizacional, operativa y reglas de pago.
                </p>
            </div>

            {/* Tabs Header */}
            <div className="flex border-b border-slate-800 overflow-x-auto whitespace-nowrap">
                <button
                    onClick={() => setActiveTab('PUESTOS')}
                    className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'PUESTOS'
                            ? 'border-amber-500 text-amber-500'
                            : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Users size={16} />
                        Puestos (RH)
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('ROLES')}
                    className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'ROLES'
                            ? 'border-indigo-500 text-indigo-500'
                            : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Briefcase size={16} />
                        Roles Operativos
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('COMPATIBILIDAD')}
                    className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'COMPATIBILIDAD'
                            ? 'border-emerald-500 text-emerald-500'
                            : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <GitMerge size={16} />
                        Matriz
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('SPLITS')}
                    className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'SPLITS'
                            ? 'border-rose-500 text-rose-500'
                            : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <BadgeDollarSign size={16} />
                        Splits y Tarifas
                    </div>
                </button>
            </div>

            {/* Tabs Content */}
            <div className="min-h-[400px]">
                {activeTab === 'PUESTOS' && <PuestosTab />}
                {activeTab === 'ROLES' && <RolesTab />}
                {activeTab === 'COMPATIBILIDAD' && <CompatibilidadTab />}
                {activeTab === 'SPLITS' && <SplitsTab />}
            </div>
        </div>
    )
}
