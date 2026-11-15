import React, { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabase'

export type SysRole =
    | 'SUPER_ADMIN'
    | 'DIRECTOR_OPERATIVO'
    | 'GERENTE'
    | 'SUPERINTENDENTE'
    | 'JEFE_PLANEACION'
    | 'SUPERVISOR'

export interface MobileUser {
    id: string
    email: string
    full_name: string
    nickname: string
    role: SysRole
}

export const ROLE_META: Record<SysRole, {
    label: string
    shortLabel: string
    badgeColor: string
    accentHex: string
    description: string
    defaultRoute: string
}> = {
    SUPER_ADMIN: {
        label: '👑 Super Admin (Control Total)',
        shortLabel: 'Super Admin',
        badgeColor: '#f59e0b',
        accentHex: '#f59e0b',
        description: 'Acceso absoluto a Jefatura, Planeación, Cuadrillas, Nómina y Configuración.',
        defaultRoute: '/dashboard',
    },
    DIRECTOR_OPERATIVO: {
        label: '🏛️ Director Operativo (Ejecutivo & KPI)',
        shortLabel: 'Director Operativo',
        badgeColor: '#f59e0b',
        accentHex: '#d97706',
        description: 'Visualización ejecutiva de costos, Pre-Nómina, cumplimiento de metas y rentabilidad.',
        defaultRoute: '/dashboard',
    },
    GERENTE: {
        label: '⭐ Gerente de Operaciones',
        shortLabel: 'Gerente Ops',
        badgeColor: '#3b82f6',
        accentHex: '#2563eb',
        description: 'Autorización de reportes, Pre-Nómina, movimiento de cuadrillas y supervisión general.',
        defaultRoute: '/dashboard',
    },
    SUPERINTENDENTE: {
        label: '⛏️ Superintendente de Mina',
        shortLabel: 'Superintendente',
        badgeColor: '#10b981',
        accentHex: '#059669',
        description: 'Autorizado para mover cuadrillas, aprobar reportes diarios y coordinar frentes.',
        defaultRoute: '/dashboard',
    },
    JEFE_PLANEACION: {
        label: '📐 Jefe de Planeación e Ingeniería',
        shortLabel: 'Jefe Planeación',
        badgeColor: '#6366f1',
        accentHex: '#4f46e5',
        description: 'Autorizado para configurar metas semanales (Semana 38), ubicaciones y cubicación.',
        defaultRoute: '/dashboard/planning',
    },
    SUPERVISOR: {
        label: '📋 Supervisor de Turno (Campo)',
        shortLabel: 'Supervisor Turno',
        badgeColor: '#f43f5e',
        accentHex: '#e11d48',
        description: 'Captura de reportes diarios, pase de lista, avances Scoop/Jumbo y alertas de seguridad.',
        defaultRoute: '/dashboard/reports',
    },
}

interface AuthContextType {
    user: MobileUser | null
    sysRole: SysRole
    theme: 'light' | 'dark'
    loading: boolean
    isJefaturaOrAbove: boolean
    canMoveSquads: boolean
    canEditPlanning: boolean
    canApproveReports: boolean
    canViewFinancials: boolean
    toggleTheme: () => void
    signInWithCredentials: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
    loginAsRole: (role: SysRole) => Promise<void>
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    sysRole: 'SUPER_ADMIN',
    theme: 'light',
    loading: true,
    isJefaturaOrAbove: true,
    canMoveSquads: true,
    canEditPlanning: true,
    canApproveReports: true,
    canViewFinancials: true,
    toggleTheme: () => {},
    signInWithCredentials: async () => ({ ok: false }),
    loginAsRole: async () => {},
    signOut: async () => {},
})

const STORAGE_USER_KEY = 'raya_mobile_user_v2'
const STORAGE_THEME_KEY = 'raya_mobile_theme_v2'

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<MobileUser | null>(null)
    const [theme, setTheme] = useState<'light' | 'dark'>('light')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const init = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem(STORAGE_THEME_KEY)
                if (savedTheme === 'dark' || savedTheme === 'light') {
                    setTheme(savedTheme)
                }
                const savedUser = await AsyncStorage.getItem(STORAGE_USER_KEY)
                if (savedUser) {
                    setUser(JSON.parse(savedUser))
                }
            } catch (e) {
                console.warn('Error loading mobile auth session:', e)
            } finally {
                setLoading(false)
            }
        }
        init()
    }, [])

    const toggleTheme = async () => {
        const next = theme === 'light' ? 'dark' : 'light'
        setTheme(next)
        await AsyncStorage.setItem(STORAGE_THEME_KEY, next)
    }

    const normalizeRole = (raw?: string | null): SysRole => {
        const r = (raw || '').toUpperCase().trim()
        if (r === 'DIRECTOR_OPERATIVO' || r === 'DIRECTOR') return 'DIRECTOR_OPERATIVO'
        if (r === 'GERENTE') return 'GERENTE'
        if (r === 'SUPERINTENDENTE' || r === 'JEFE_MINA') return 'SUPERINTENDENTE'
        if (r === 'JEFE_PLANEACION' || r === 'PLANEADOR') return 'JEFE_PLANEACION'
        if (r === 'SUPERVISOR') return 'SUPERVISOR'
        return 'SUPER_ADMIN'
    }

    const signInWithCredentials = async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
        const cleanEmail = email.trim().toLowerCase()
        try {
            // 1. Verificar en sys_users (tabla de control de usuarios de Raya Mina)
            const { data: sysUser } = await supabase
                .from('sys_users')
                .select('*')
                .ilike('email', cleanEmail)
                .maybeSingle()

            if (sysUser) {
                if (sysUser.auth_password && sysUser.auth_password !== password) {
                    // Intentar también con Supabase Auth por si cambió allá
                    const { error: supaErr } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
                    if (supaErr) {
                        return { ok: false, error: 'Contraseña incorrecta para este usuario.' }
                    }
                }
                const role = normalizeRole(sysUser.role)
                const mobileUser: MobileUser = {
                    id: sysUser.id,
                    email: sysUser.email,
                    full_name: sysUser.full_name || sysUser.nickname || cleanEmail.split('@')[0],
                    nickname: sysUser.nickname || sysUser.full_name || cleanEmail.split('@')[0],
                    role,
                }
                setUser(mobileUser)
                await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(mobileUser))
                return { ok: true }
            }

            // 2. Fallback: autenticar contra Supabase Auth directamente
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: cleanEmail,
                password,
            })

            if (authError || !authData.user) {
                return { ok: false, error: authError?.message || 'Credenciales inválidas.' }
            }

            const mobileUser: MobileUser = {
                id: authData.user.id,
                email: cleanEmail,
                full_name: cleanEmail.split('@')[0].toUpperCase(),
                nickname: cleanEmail.split('@')[0].toUpperCase(),
                role: 'SUPER_ADMIN',
            }
            setUser(mobileUser)
            await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(mobileUser))
            return { ok: true }
        } catch (err: any) {
            return { ok: false, error: err?.message || 'Error de conexión con Supabase.' }
        }
    }

    const loginAsRole = async (role: SysRole) => {
        // Buscar si existe un usuario real con ese rol en sys_users para vincular su ID real
        let realId = `demo-${role.toLowerCase()}`
        let realEmail = `${role.toLowerCase()}@rayamina.com`
        let realName = ROLE_META[role].shortLabel

        try {
            const { data } = await supabase
                .from('sys_users')
                .select('id, email, full_name, nickname')
                .eq('role', role)
                .limit(1)
                .maybeSingle()

            if (data) {
                realId = data.id
                realEmail = data.email || realEmail
                realName = data.nickname || data.full_name || realName
            }
        } catch {
            // Usar datos locales del rol
        }

        const mobileUser: MobileUser = {
            id: realId,
            email: realEmail,
            full_name: realName,
            nickname: realName,
            role,
        }
        setUser(mobileUser)
        await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(mobileUser))
    }

    const signOut = async () => {
        try {
            await supabase.auth.signOut()
        } catch {}
        setUser(null)
        await AsyncStorage.removeItem(STORAGE_USER_KEY)
    }

    const sysRole: SysRole = user?.role || 'SUPER_ADMIN'
    const isJefaturaOrAbove = ['SUPER_ADMIN', 'DIRECTOR_OPERATIVO', 'GERENTE', 'SUPERINTENDENTE'].includes(sysRole)
    const canMoveSquads = ['SUPER_ADMIN', 'GERENTE', 'SUPERINTENDENTE'].includes(sysRole)
    const canEditPlanning = ['SUPER_ADMIN', 'JEFE_PLANEACION', 'SUPERINTENDENTE', 'GERENTE'].includes(sysRole)
    const canApproveReports = ['SUPER_ADMIN', 'SUPERINTENDENTE', 'GERENTE'].includes(sysRole)
    const canViewFinancials = ['SUPER_ADMIN', 'DIRECTOR_OPERATIVO', 'GERENTE', 'SUPERINTENDENTE'].includes(sysRole)

    return (
        <AuthContext.Provider
            value={{
                user,
                sysRole,
                theme,
                loading,
                isJefaturaOrAbove,
                canMoveSquads,
                canEditPlanning,
                canApproveReports,
                canViewFinancials,
                toggleTheme,
                signInWithCredentials,
                loginAsRole,
                signOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export const useMobileAuth = () => useContext(AuthContext)
