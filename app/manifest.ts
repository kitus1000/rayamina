import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        id: '/mobile',
        name: 'LA RAYA MINA — App Operativa Android',
        short_name: 'Raya Mina',
        description: 'Sistema Operativo Móvil de Mina, Cuadrillas, Reportes Diarios y Pre-Nómina — Unidad El Herrero',
        start_url: '/mobile',
        scope: '/',
        display: 'standalone',
        background_color: '#020617',
        theme_color: '#f59e0b',
        orientation: 'portrait',
        icons: [
            {
                src: '/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: '/icon-raya.svg',
                sizes: 'any',
                type: 'image/svg+xml',
                purpose: 'any',
            },
        ],
    }
}
