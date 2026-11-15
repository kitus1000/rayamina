'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type SysPermissions = {
    can_approve_reports: boolean
    can_edit_approved: boolean
}

export const DEFAULT_ROLE_VIEWS: Record<string, string[]> = {
    SUPER_ADMIN: [
        '/dashboard',
        '/dashboard/nomina',
        '/dashboard/semana',
        '/dashboard/catalogos/cuadrillas',
        '/dashboard/catalogos/empleados',
        '/dashboard/operacion/reportes-diarios',
        '/dashboard/chat',
        '/dashboard/catalogos',
        '/dashboard/configuracion',
        '/dashboard/configuracion/usuarios',
        '/dashboard/configuracion/visiones',
    ],
    DIRECTOR_OPERATIVO: [
        '/dashboard',
        '/dashboard/nomina',
        '/dashboard/semana',
        '/dashboard/catalogos/cuadrillas',
        '/dashboard/operacion/reportes-diarios',
        '/dashboard/chat',
    ],
    GERENTE: [
        '/dashboard',
        '/dashboard/nomina',
        '/dashboard/semana',
        '/dashboard/catalogos/cuadrillas',
        '/dashboard/catalogos/empleados',
        '/dashboard/operacion/reportes-diarios',
        '/dashboard/chat',
        '/dashboard/catalogos',
    ],
    SUPERINTENDENTE: [
        '/dashboard',
        '/dashboard/semana',
        '/dashboard/catalogos/cuadrillas',
        '/dashboard/catalogos/empleados',
        '/dashboard/operacion/reportes-diarios',
        '/dashboard/chat',
        '/dashboard/catalogos',
    ],
    JEFE_PLANEACION: [
        '/dashboard/semana',
        '/dashboard/catalogos/ubicaciones',
        '/dashboard/catalogos/productos-mina',
        '/dashboard/catalogos/cuadrillas',
        '/dashboard/operacion/reportes-diarios',
        '/dashboard/chat',
    ],
    SUPERVISOR: [
        '/dashboard/catalogos/cuadrillas',
        '/dashboard/operacion/reportes-diarios',
        '/dashboard/chat',
    ],
}

export function checkPathAllowed(
    pathname: string,
    sysRole: string | null,
    allowedViews: string[] | null
): boolean {
    if (!sysRole || sysRole === 'GUEST') return false
    if (sysRole === 'SUPER_ADMIN') return true

    const cleanPath = (pathname || '').split('?')[0]
    if (cleanPath === '/dashboard/profile') return true

    const effectiveViews =
        Array.isArray(allowedViews) && allowedViews.length > 0
            ? allowedViews
            : DEFAULT_ROLE_VIEWS[sysRole] || []

    return effectiveViews.some((av) => {
        if (cleanPath === av) return true
        if (av !== '/dashboard' && cleanPath.startsWith(av + '/')) return true
        return false
    })
}

export function resolveFirstAllowedPath(
    sysRole: string | null,
    allowedViews: string[] | null
): string {
    if (sysRole === 'SUPER_ADMIN') return '/dashboard'
    const effectiveViews =
        Array.isArray(allowedViews) && allowedViews.length > 0
            ? allowedViews
            : sysRole
            ? DEFAULT_ROLE_VIEWS[sysRole] || []
            : []

    if (effectiveViews.length > 0) {
        return effectiveViews[0]
    }
    return '/dashboard/operacion/reportes-diarios'
}

interface AuthContextType {
    user: User | null
    session: Session | null
    sysRole: string | null
    sysUserId: string | null
    fullName: string | null
    permissions: SysPermissions | null
    allowedViews: string[] | null
    loading: boolean
    isViewAllowed: (path: string) => boolean
    getFirstAllowedPath: () => string
    refreshUserConfig: () => Promise<void>
    signInWithGoogle: () => Promise<void>
    signInWithPassword: (email: string, password: string) => Promise<{ error?: string }>
    signInWithOtp: (email: string) => Promise<{ error?: string }>
    signOut: () => Promise<void>
    loginAsDemo: (role?: string) => Promise<void> | void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [sysRole, setSysRole] = useState<string | null>(null)
    const [sysUserId, setSysUserId] = useState<string | null>(null)
    const [fullName, setFullName] = useState<string | null>(null)
    const [permissions, setPermissions] = useState<SysPermissions | null>(null)
    const [allowedViews, setAllowedViews] = useState<string[] | null>(null)
    const [loading, setLoading] = useState(true)

    const clearSessionStorage = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('manual_user')
            localStorage.removeItem('demo_mode')
            localStorage.removeItem('demo_role')
        }
    }

    const fetchUserConfig = useCallback(async (email: string): Promise<boolean> => {
        try {
            const cleanEmail = email.trim().toLowerCase()
            const { data: sysUser, error: errU } = await supabase
                .from('sys_users')
                .select('id, email, full_name, nickname, role, views_json, active')
                .ilike('email', cleanEmail)
                .eq('active', true)
                .maybeSingle()

            let finalUser: any = sysUser

            if (errU && errU.message.includes('views_json')) {
                const { data: retryUser } = await supabase
                    .from('sys_users')
                    .select('id, email, full_name, nickname, role, active')
                    .ilike('email', cleanEmail)
                    .eq('active', true)
                    .maybeSingle()
                finalUser = retryUser
            }

            if (finalUser && finalUser.active !== false) {
                setSysRole(finalUser.role)
                setSysUserId(finalUser.id)
                setFullName(finalUser.full_name || finalUser.nickname || finalUser.email)

                const configuredViews =
                    Array.isArray(finalUser.views_json) && finalUser.views_json.length > 0
                        ? finalUser.views_json
                        : DEFAULT_ROLE_VIEWS[finalUser.role] || []

                setAllowedViews(configuredViews)

                const { data: roleCfg } = await supabase
                    .from('sys_roles_config')
                    .select('*')
                    .eq('role', finalUser.role)
                    .maybeSingle()

                if (roleCfg) {
                    setPermissions({
                        can_approve_reports: Boolean(roleCfg.can_approve_reports),
                        can_edit_approved: Boolean(roleCfg.can_edit_approved),
                    })
                } else {
                    setPermissions({
                        can_approve_reports: ['SUPER_ADMIN', 'DIRECTOR_OPERATIVO', 'GERENTE', 'SUPERINTENDENTE'].includes(finalUser.role),
                        can_edit_approved: ['SUPER_ADMIN', 'DIRECTOR_OPERATIVO', 'GERENTE'].includes(finalUser.role),
                    })
                }
                return true
            } else {
                setSysRole(null)
                setSysUserId(null)
                setFullName(null)
                setAllowedViews(null)
                setPermissions({ can_approve_reports: false, can_edit_approved: false })
                return false
            }
        } catch (error) {
            console.error('Error loading user security config:', error)
            return false
        }
    }, [])

    useEffect(() => {
        // Limpiar cualquier rastro antiguo de modo demo no autorizado
        if (typeof window !== 'undefined') {
            localStorage.removeItem('demo_mode')
            localStorage.removeItem('demo_role')
        }

        const initAuth = async () => {
            try {
                const manual = typeof window !== 'undefined' ? localStorage.getItem('manual_user') : null
                if (manual) {
                    const parsed = JSON.parse(manual)
                    if (parsed?.email && parsed?.password) {
                        const res = await signInWithPassword(parsed.email, parsed.password)
                        if (res.error) {
                            clearSessionStorage()
                            setUser(null)
                        }
                        setLoading(false)
                        return
                    }
                }

                const { data: { session: supaSession } } = await supabase.auth.getSession()
                setSession(supaSession)
                const u = supaSession?.user ?? null
                if (u?.email) {
                    const valid = await fetchUserConfig(u.email)
                    if (valid) {
                        setUser(u)
                    } else {
                        await supabase.auth.signOut()
                        setUser(null)
                    }
                } else {
                    setUser(null)
                }
            } catch (err) {
                console.error('Auth initialization error:', err)
                setUser(null)
            } finally {
                setLoading(false)
            }
        }

        initAuth()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, supaSession) => {
            if (typeof window !== 'undefined' && localStorage.getItem('manual_user')) return
            setSession(supaSession)
            const u = supaSession?.user ?? null
            if (u?.email) {
                const valid = await fetchUserConfig(u.email)
                if (valid) {
                    setUser(u)
                } else {
                    setUser(null)
                }
            } else {
                setUser(null)
                setSysRole(null)
                setSysUserId(null)
                setFullName(null)
                setPermissions(null)
                setAllowedViews(null)
            }
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [fetchUserConfig])

    const refreshUserConfig = async () => {
        if (user?.email) {
            const valid = await fetchUserConfig(user.email)
            if (!valid) {
                await signOut()
            }
        }
    }

    const signInWithGoogle = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/dashboard`,
            },
        })
    }

    const signInWithPassword = async (email: string, password: string) => {
        const cleanEmail = email.trim().toLowerCase()
        try {
            const { data, error } = await supabase
                .from('sys_users')
                .select('*')
                .ilike('email', cleanEmail)
                .eq('auth_password', password)
                .eq('active', true)
                .maybeSingle()

            if (error || !data) {
                return { error: 'Acceso denegado: correo o contraseña inválidos, o usuario desactivado en el sistema.' }
            }

            const authenticatedUser = {
                id: data.id,
                email: data.email,
                role: 'authenticated',
                app_metadata: {},
                user_metadata: {
                    full_name: data.full_name || data.nickname || data.email,
                },
                aud: 'authenticated',
                created_at: new Date().toISOString(),
            } as User

            if (typeof window !== 'undefined') {
                localStorage.setItem(
                    'manual_user',
                    JSON.stringify({ email: data.email, password: data.auth_password })
                )
            }

            setSession(null)
            setUser(authenticatedUser)
            await fetchUserConfig(data.email)

            return {}
        } catch (err: any) {
            return { error: err.message || 'Error al verificar credenciales.' }
        }
    }

    const signInWithOtp = async (email: string) => {
        const cleanEmail = email.trim().toLowerCase()
        try {
            // Verificar primero que el correo exista y esté activo en sys_users
            const { data: existingUser } = await supabase
                .from('sys_users')
                .select('id, active')
                .ilike('email', cleanEmail)
                .eq('active', true)
                .maybeSingle()

            if (!existingUser) {
                return { error: 'Este correo no está registrado como usuario autorizado en LA RAYA.' }
            }

            const { error } = await supabase.auth.signInWithOtp({
                email: cleanEmail,
                options: {
                    emailRedirectTo: `${window.location.origin}/dashboard`,
                },
            })
            if (error) return { error: error.message }
            return {}
        } catch (err: any) {
            return { error: err.message }
        }
    }

    const signOut = async () => {
        clearSessionStorage()
        try {
            await supabase.auth.signOut()
        } catch {}
        setUser(null)
        setSession(null)
        setSysRole(null)
        setSysUserId(null)
        setFullName(null)
        setAllowedViews(null)
        if (typeof window !== 'undefined') {
            window.location.href = '/login'
        }
    }

    // Deshabilitado por seguridad: no se permite cambio de rol ni acceso demo sin autenticación real
    const loginAsDemo = async () => {
        console.warn('Acceso demo deshabilitado por políticas de seguridad corporativa.')
    }

    const isViewAllowed = useCallback(
        (path: string) => checkPathAllowed(path, sysRole, allowedViews),
        [sysRole, allowedViews]
    )

    const getFirstAllowedPath = useCallback(
        () => resolveFirstAllowedPath(sysRole, allowedViews),
        [sysRole, allowedViews]
    )

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                sysRole,
                sysUserId,
                fullName,
                permissions,
                allowedViews,
                loading,
                isViewAllowed,
                getFirstAllowedPath,
                refreshUserConfig,
                signInWithGoogle,
                signInWithPassword,
                signInWithOtp,
                signOut,
                loginAsDemo,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
