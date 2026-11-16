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
        '/dashboard',
        '/dashboard/semana',
        '/dashboard/catalogos/ubicaciones',
        '/dashboard/catalogos/productos-mina',
        '/dashboard/catalogos/cuadrillas',
        '/dashboard/operacion/reportes-diarios',
        '/dashboard/chat',
    ],
    SUPERVISOR: [
        '/dashboard',
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
        Array.isArray(allowedViews)
            ? allowedViews
            : DEFAULT_ROLE_VIEWS[sysRole] || []

    return effectiveViews.some((av) => {
        if (cleanPath === av) return true
        if (
            av !== '/dashboard' &&
            av !== '/dashboard/catalogos' &&
            av !== '/dashboard/configuracion' &&
            cleanPath.startsWith(av + '/')
        ) {
            return true
        }
        if (
            av === '/dashboard/catalogos' &&
            [
                '/dashboard/catalogos/minas',
                '/dashboard/catalogos/unidades',
                '/dashboard/catalogos/empresas',
                '/dashboard/catalogos/turnos',
                '/dashboard/catalogos/puestos-roles',
            ].some((sub) => cleanPath === sub || cleanPath.startsWith(sub + '/'))
        ) {
            return true
        }
        return false
    })
}

export function resolveFirstAllowedPath(
    sysRole: string | null,
    allowedViews: string[] | null
): string {
    if (sysRole === 'SUPER_ADMIN') return '/dashboard'
    const effectiveViews =
        Array.isArray(allowedViews)
            ? allowedViews
            : sysRole
            ? DEFAULT_ROLE_VIEWS[sysRole] || []
            : []

    if (effectiveViews.length > 0) {
        return effectiveViews[0]
    }
    return '/dashboard/operacion/reportes-diarios'
}

export interface PreviewProfileConfig {
    role: string
    label: string
    userId?: string | null
    userEmail?: string | null
    views?: string[] | null
}

const PREVIEW_STORAGE_KEY = 'raya_superadmin_preview_v1'

interface AuthContextType {
    user: User | null
    session: Session | null
    sysRole: string | null
    realRole: string | null
    isRealSuperAdmin: boolean
    previewProfile: PreviewProfileConfig | null
    setPreviewProfile: (profile: PreviewProfileConfig | null) => void
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
    const [realRole, setRealRole] = useState<string | null>(null)
    const [sysUserId, setSysUserId] = useState<string | null>(null)
    const [realFullName, setRealFullName] = useState<string | null>(null)
    const [permissions, setPermissions] = useState<SysPermissions | null>(null)
    const [realAllowedViews, setRealAllowedViews] = useState<string[] | null>(null)
    const [previewProfile, setPreviewProfileState] = useState<PreviewProfileConfig | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const savedPreview = sessionStorage.getItem(PREVIEW_STORAGE_KEY)
                if (savedPreview) {
                    setPreviewProfileState(JSON.parse(savedPreview))
                }
            } catch {
                // ignore parse error
            }
        }
    }, [])

    const setPreviewProfile = useCallback(
        (profile: PreviewProfileConfig | null) => {
            if (realRole !== 'SUPER_ADMIN') {
                setPreviewProfileState(null)
                if (typeof window !== 'undefined') {
                    sessionStorage.removeItem(PREVIEW_STORAGE_KEY)
                }
                return
            }
            setPreviewProfileState(profile)
            if (typeof window !== 'undefined') {
                if (profile) {
                    sessionStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(profile))
                } else {
                    sessionStorage.removeItem(PREVIEW_STORAGE_KEY)
                }
            }
        },
        [realRole]
    )

    const clearSessionStorage = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('manual_user')
            localStorage.removeItem('demo_mode')
            localStorage.removeItem('demo_role')
            sessionStorage.removeItem(PREVIEW_STORAGE_KEY)
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
                setRealRole(finalUser.role)
                setSysUserId(finalUser.id)
                setRealFullName(finalUser.full_name || finalUser.nickname || finalUser.email)
                if (finalUser.role !== 'SUPER_ADMIN') {
                    setPreviewProfileState(null)
                    if (typeof window !== 'undefined') {
                        sessionStorage.removeItem(PREVIEW_STORAGE_KEY)
                    }
                }

                const configuredViews =
                    Array.isArray(finalUser.views_json)
                        ? finalUser.views_json
                        : DEFAULT_ROLE_VIEWS[finalUser.role] || []

                setRealAllowedViews(configuredViews)

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
                setRealRole(null)
                setSysUserId(null)
                setRealFullName(null)
                setRealAllowedViews(null)
                setPreviewProfileState(null)
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
                setRealRole(null)
                setSysUserId(null)
                setRealFullName(null)
                setPermissions(null)
                setRealAllowedViews(null)
                setPreviewProfileState(null)
            }
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [fetchUserConfig])

    const refreshUserConfig = useCallback(async () => {
        if (user?.email) {
            const valid = await fetchUserConfig(user.email)
            if (!valid) {
                await signOut()
            }
        }
    }, [user?.email, fetchUserConfig])

    // Sincronización en vivo cuando se actualizan las vistas desde Configuración o al volver a enfocar la pestaña
    useEffect(() => {
        const handleViewsUpdated = () => {
            if (user?.email) {
                fetchUserConfig(user.email)
            }
        }
        const handleVisibility = () => {
            if (document.visibilityState === 'visible' && user?.email) {
                fetchUserConfig(user.email)
            }
        }
        window.addEventListener('raya-views-updated', handleViewsUpdated)
        document.addEventListener('visibilitychange', handleVisibility)
        return () => {
            window.removeEventListener('raya-views-updated', handleViewsUpdated)
            document.removeEventListener('visibilitychange', handleVisibility)
        }
    }, [user?.email, fetchUserConfig])

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
        setRealRole(null)
        setSysUserId(null)
        setRealFullName(null)
        setRealAllowedViews(null)
        setPreviewProfileState(null)
        if (typeof window !== 'undefined') {
            window.location.href = '/login'
        }
    }

    // Deshabilitado por seguridad para usuarios no autenticados; solo SUPER_ADMIN puede usar setPreviewProfile
    const loginAsDemo = async (role?: string) => {
        if (realRole === 'SUPER_ADMIN' && role) {
            if (role === 'SUPER_ADMIN') {
                setPreviewProfile(null)
            } else {
                setPreviewProfile({
                    role,
                    label: role.replace(/_/g, ' '),
                    views: DEFAULT_ROLE_VIEWS[role] || [],
                })
            }
        }
    }

    const isRealSuperAdmin = realRole === 'SUPER_ADMIN'
    const sysRole = isRealSuperAdmin && previewProfile ? previewProfile.role : realRole
    const allowedViews =
        isRealSuperAdmin && previewProfile
            ? Array.isArray(previewProfile.views)
                ? previewProfile.views
                : DEFAULT_ROLE_VIEWS[previewProfile.role] || []
            : realAllowedViews
    const fullName =
        isRealSuperAdmin && previewProfile
            ? `${previewProfile.label} (Vista SuperAdmin)`
            : realFullName

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
                realRole,
                isRealSuperAdmin,
                previewProfile,
                setPreviewProfile,
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
