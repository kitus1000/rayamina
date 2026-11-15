
'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type SysPermissions = {
    can_approve_reports: boolean
    can_edit_approved: boolean
}

interface AuthContextType {
    user: User | null
    session: Session | null
    sysRole: string | null
    sysUserId: string | null
    permissions: SysPermissions | null
    allowedViews: string[] | null // New field for dynamic views
    loading: boolean
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
    const [permissions, setPermissions] = useState<SysPermissions | null>(null)
    const [allowedViews, setAllowedViews] = useState<string[] | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchUserConfig = async (email: string) => {
        try {
            // First attempt to fetch the user with all potential columns
            const { data: sysUser, error: errU } = await supabase
                .from('sys_users')
                .select('id, role, views_json')
                .ilike('email', email)
                .eq('active', true)
                .single()

            console.log('[Auth Debug] fetchUserConfig response:', { sysUser, errU });

            let finalUser: any = sysUser
            let isLegacy = false

            // If it fails because of missing column, retry without views_json
            if (errU && errU.message.includes('views_json')) {
                const { data: retryUser } = await supabase
                    .from('sys_users')
                    .select('id, role')
                    .ilike('email', email)
                    .eq('active', true)
                    .single()

                finalUser = retryUser
                isLegacy = true
            }

            if (finalUser) {
                setSysRole(finalUser.role)
                setSysUserId(finalUser.id)

                // If isLegacy is true, we show all (fallback). 
                // BUT if isLegacy is false and views_json is null/empty, we should strictly follow that.
                // For non-SUPER_ADMIN, null views_json will now be treated as [] (no views allowed)
                const views = isLegacy ? null : (finalUser.views_json || [])
                setAllowedViews(views)

                const { data: roleCfg } = await supabase.from('sys_roles_config').select('*').eq('role', finalUser.role).single()
                if (roleCfg) {
                    setPermissions({
                        can_approve_reports: roleCfg.can_approve_reports,
                        can_edit_approved: roleCfg.can_edit_approved
                    })
                }
            } else {
                setSysRole('GUEST')
                setSysUserId(null)
                setAllowedViews(null)
                setPermissions({ can_approve_reports: false, can_edit_approved: false })
            }
        } catch (error) {
            console.error("Error loading permissions", error)
        }
    }

    useEffect(() => {
        // Check demo mode first
        const isDemo = typeof window !== 'undefined' && localStorage.getItem('demo_mode') === 'true'
        if (isDemo) {
            const demoRole = localStorage.getItem('demo_role') || 'SUPER_ADMIN'
            let demoEmail = 'jesus12398@gmail.com'
            if (demoRole === 'DIRECTOR_OPERATIVO') demoEmail = 'director@rayamina.com'
            else if (demoRole === 'GERENTE') demoEmail = 'gerente@rayamina.com'
            else if (demoRole === 'SUPERINTENDENTE') demoEmail = 'superintendente@rayamina.com'
            else if (demoRole === 'JEFE_PLANEACION') demoEmail = 'kikus_100@hotmail.com'
            else if (demoRole === 'SUPERVISOR') demoEmail = 'jesus@gmail.com'

            const demoUser = {
                id: 'demo-user-123',
                app_metadata: {},
                user_metadata: {},
                aud: 'authenticated',
                created_at: new Date().toISOString(),
                email: demoEmail,
                role: 'authenticated'
            } as User
            setUser(demoUser)
            fetchUserConfig(demoEmail).then(() => setLoading(false))
            return
        }

        // Check manual login
        const manual = typeof window !== 'undefined' ? localStorage.getItem('manual_user') : null
        if (manual) {
            const { email, password } = JSON.parse(manual)
            signInWithPassword(email, password).then(() => setLoading(false))
            return
        }

        // Check initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            const u = session?.user ?? null
            setUser(u)
            if (u?.email) {
                fetchUserConfig(u.email).then(() => setLoading(false))
            } else {
                setLoading(false)
            }
        }).catch((err) => {
            console.error("Auth initialization error:", err)
            setLoading(false)
        })

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (localStorage.getItem('demo_mode') === 'true') return
            setSession(session)
            const u = session?.user ?? null
            setUser(u)
            if (u?.email) {
                fetchUserConfig(u.email).then(() => setLoading(false))
            } else {
                setSysRole(null)
                setSysUserId(null)
                setPermissions(null)
                setAllowedViews(null)
                setLoading(false)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const signInWithGoogle = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/dashboard`
            }
        })
    }

    const signInWithPassword = async (email: string, password: string) => {
        try {
            const { data, error } = await supabase
                .from('sys_users')
                .select('*')
                .ilike('email', email)
                .eq('auth_password', password)
                .eq('active', true)
                .single()

            if (error || !data) {
                return { error: 'Credenciales inválidas o usuario inactivo' }
            }

            // Create a mock user/session
            const mockUser = {
                id: data.id,
                email: data.email,
                role: 'authenticated',
                app_metadata: {},
                user_metadata: {},
                aud: 'authenticated',
                created_at: new Date().toISOString()
            } as User

            // Persist manual login
            localStorage.setItem('manual_user', JSON.stringify({ email: data.email, password: data.auth_password }))

            setSession(null) // No real Supabase session
            setUser(mockUser)
            await fetchUserConfig(data.email)

            return {}
        } catch (err: any) {
            return { error: err.message }
        }
    }

    const signInWithOtp = async (email: string) => {
        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/dashboard`
                }
            })
            if (error) return { error: error.message }
            return {}
        } catch (err: any) {
            return { error: err.message }
        }
    }

    const signOut = async () => {
        localStorage.removeItem('manual_user')
        localStorage.removeItem('demo_mode')
        localStorage.removeItem('demo_role')
        await supabase.auth.signOut()
        setUser(null)
        setSession(null)
        setSysRole(null)
        setSysUserId(null)
        setAllowedViews(null)
        window.location.href = '/login'
    }

    const loginAsDemo = async (role: string = 'SUPER_ADMIN') => {
        localStorage.setItem('demo_mode', 'true')
        localStorage.setItem('demo_role', role)
        let demoEmail = 'jesus12398@gmail.com'
        if (role === 'DIRECTOR_OPERATIVO') demoEmail = 'director@rayamina.com'
        else if (role === 'GERENTE') demoEmail = 'gerente@rayamina.com'
        else if (role === 'SUPERINTENDENTE') demoEmail = 'superintendente@rayamina.com'
        else if (role === 'JEFE_PLANEACION') demoEmail = 'kikus_100@hotmail.com'
        else if (role === 'SUPERVISOR') demoEmail = 'jesus@gmail.com'

        const demoUser = {
            id: 'demo-user-123',
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            email: demoEmail,
            role: 'authenticated'
        } as User
        setUser(demoUser)
        await fetchUserConfig(demoEmail)
    }

    return (
        <AuthContext.Provider value={{
            user, session, sysRole, sysUserId, permissions, allowedViews, loading,
            signInWithGoogle, signInWithPassword, signInWithOtp, signOut, loginAsDemo
        }}>
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
