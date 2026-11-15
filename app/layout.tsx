import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  themeColor: '#f59e0b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: 'LA RAYA OS — Sistema Integral de Operaciones Mineras y Nómina',
  description: 'Plataforma de Planeación, Operación Mina, Cuadrillas, Seguridad y Pre-Nómina (Web & Android App)',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Raya Mina',
  },
  icons: {
    icon: '/icon-raya.svg',
    apple: '/icon-raya.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="theme-light" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
