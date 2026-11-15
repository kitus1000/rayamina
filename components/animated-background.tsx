'use client'

import { motion } from 'framer-motion'

export default function AnimatedBackground() {
    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
            {/* Esfera 1: Ámbar (Arriba Izquierda) */}
            <motion.div
                animate={{
                    x: [0, 100, 0],
                    y: [0, 50, 0],
                    scale: [1, 1.2, 1],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                }}
                className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-amber-500/10 blur-[120px]"
            />

            {/* Esfera 2: Azul/Índigo (Abajo Derecha) */}
            <motion.div
                animate={{
                    x: [0, -150, 0],
                    y: [0, -100, 0],
                    scale: [1, 1.5, 1],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "linear"
                }}
                className="absolute bottom-[-10%] right-[-5%] w-[50vw] h-[50vw] rounded-full bg-blue-600/10 blur-[150px]"
            />

            {/* Esfera 3: Púrpura (Medio) */}
            <motion.div
                animate={{
                    x: [0, 50, -50, 0],
                    y: [0, 100, 50, 0],
                    opacity: [0.3, 0.6, 0.3]
                }}
                transition={{
                    duration: 30,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute top-[20%] left-[30%] w-[30vw] h-[30vw] rounded-full bg-purple-500/5 blur-[100px]"
            />

            {/* Grid Sutil overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
        </div>
    )
}
