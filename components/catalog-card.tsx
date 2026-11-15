import Link from 'next/link'
import { LucideIcon } from 'lucide-react'

interface CatalogCardProps {
    title: string
    description: string
    icon: LucideIcon
    href: string
    color: string
}

export function CatalogCard({ title, description, icon: Icon, href, color }: CatalogCardProps) {
    return (
        <Link href={href}>
            <div className="relative group overflow-hidden bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl p-6 transition-all duration-300 hover:border-amber-500/30 hover:shadow-2xl hover:shadow-amber-900/10 cursor-pointer">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative z-10 flex gap-4 items-start">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-lg ${color.replace('text-', 'bg-').replace('500', '500/10')} border border-white/5`}>
                        <Icon className={`w-6 h-6 ${color}`} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-amber-400 transition-colors">{title}</h3>
                        <p className="text-sm text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">{description}</p>
                    </div>
                </div>
            </div>
        </Link>
    )
}
