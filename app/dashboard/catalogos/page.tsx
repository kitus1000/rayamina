
import {
    Building2, MapPin, HardHat, Hammer,
    Settings2, Truck, Ruler, Shield, Users, Clock, CalendarX
} from 'lucide-react'
import { CatalogCard } from '@/components/catalog-card'

const catalogs = [
    {
        title: 'Tipos de Asistencia',
        description: 'Catálogo de incidencias, faltas y justificaciones.',
        icon: CalendarX,
        href: '/dashboard/catalogos/asistencias',
        color: 'text-rose-500'
    },
    {
        title: 'Empresas',
        description: 'Gestión de razones sociales y contratistas.',
        icon: Building2,
        href: '/dashboard/catalogos/empresas',
        color: 'text-blue-500' // Icon color
    },
    {
        title: 'Unidades Mineras',
        description: 'Centros de costo y operación (ej. Charcas, San Martín).',
        icon: Building2,
        href: '/dashboard/catalogos/unidades',
        color: 'text-indigo-500'
    },
    {
        title: 'Minas',
        description: 'Yacimientos específicos dentro de las unidades.',
        icon: HardHat,
        href: '/dashboard/catalogos/minas',
        color: 'text-emerald-500'
    },
    {
        title: 'Ubicaciones (Frentes)',
        description: 'Lugares de trabajo específicos (Frentes, Rampas, etc).',
        icon: MapPin,
        href: '/dashboard/catalogos/ubicaciones',
        color: 'text-amber-500'
    },
    {
        title: 'Puestos & Roles',
        description: 'Matriz de compatibilidad, estructura organizacional y splits de pago.',
        icon: Users,
        href: '/dashboard/catalogos/puestos-roles',
        color: 'text-cyan-500'
    },
    {
        title: 'Turnos Operativos',
        description: 'Gestión de horarios base (1RA, 2DA, 3RA) y su estado activo.',
        icon: Clock,
        href: '/dashboard/catalogos/turnos',
        color: 'text-orange-500'
    },
    {
        title: 'Cuadrillas de Trabajo',
        description: 'Conformación de equipos, asignación de supervisores y personal.',
        icon: Users,
        href: '/dashboard/catalogos/cuadrillas',
        color: 'text-purple-500'
    }
]

const operations = [
    {
        title: 'Flota de Equipos',
        description: 'Inventario técnico de Jumbos, Scoops, Jacklegs y Vehículos auxiliares.',
        icon: Truck,
        href: '/dashboard/catalogos/equipos',
        color: 'text-orange-500'
    },
    {
        title: 'Conceptos de Mina',
        description: 'Estándares de barrenación, fletes, servicios y variables de captura.',
        icon: Ruler,
        href: '/dashboard/catalogos/productos-mina',
        color: 'text-cyan-500'
    },
    {
        title: 'Conceptos de Nómina',
        description: 'Tarifas, mapeo de actividades a pagos y reglas de bonificación.',
        icon: Settings2,
        href: '/dashboard/nomina/tarifas',
        color: 'text-purple-500'
    }
]

export default function CatalogsPage() {
    return (
        <div className="space-y-10">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-white tracking-tight">Catálogos Maestros</h1>
                <p className="text-slate-400 max-w-2xl text-lg">
                    Administración centralizada de los datos fundamentales del sistema.
                </p>
            </div>

            <div className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-800/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Organización & Estructura</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {catalogs.map((cat) => (
                        <CatalogCard key={cat.title} {...cat} />
                    ))}
                </div>
            </div>

            <div className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-800/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Operación & Finanzas</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {operations.map((op) => (
                        <CatalogCard key={op.title} {...op} />
                    ))}
                </div>
            </div>
        </div>
    )
}
