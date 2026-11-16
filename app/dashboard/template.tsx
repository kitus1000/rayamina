'use client'

import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'

export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    return (
        <motion.div
            key={pathname}
            initial={{ opacity: 0.98 }}
            animate={{ opacity: 1 }}
            transition={{
                duration: 0.12,
                ease: 'easeOut'
            }}
            className="w-full min-w-0 relative"
        >
            {/* Indicador de destello lateral al cambiar de pantalla */}
            <motion.div
                initial={{ opacity: 0.8, scaleX: 0 }}
                animate={{ opacity: 0, scaleX: 1 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-blue-500 origin-left z-50 pointer-events-none html2pdf__ignore"
            />
            {children}
        </motion.div>
    )
}
