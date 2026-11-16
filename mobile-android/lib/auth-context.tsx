import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export type MobileRole =
  | 'SUPER_ADMIN'
  | 'DIRECTOR_OPERATIVO'
  | 'GERENTE'
  | 'SUPERINTENDENTE'
  | 'JEFE_PLANEACION'
  | 'SUPERVISOR';

export interface RoleMetadata {
  role: MobileRole;
  label: string;
  shortLabel: string;
  badgeColor: string;
  accentHex: string;
  icon: string;
  description: string;
  level: number;
}

export const ROLE_META: Record<MobileRole, RoleMetadata> = {
  SUPER_ADMIN: {
    role: 'SUPER_ADMIN',
    label: '👑 Super Admin (Control Total)',
    shortLabel: 'Super Admin',
    badgeColor: '#f59e0b',
    accentHex: '#f59e0b',
    icon: '👑',
    description: 'Autorización total en Jefatura, Planeación, Cuadrillas, Nómina, Precios y Reportes.',
    level: 100,
  },
  DIRECTOR_OPERATIVO: {
    role: 'DIRECTOR_OPERATIVO',
    label: '🏛️ Director Operativo (Finanzas & KPI)',
    shortLabel: 'Director Op.',
    badgeColor: '#d97706',
    accentHex: '#d97706',
    icon: '🏛️',
    description: 'Visualización ejecutiva de costos, toneladas, Pre-Nómina S-38 y cumplimiento de metas.',
    level: 90,
  },
  GERENTE: {
    role: 'GERENTE',
    label: '⭐ Gerente de Operaciones',
    shortLabel: 'Gerente Ops',
    badgeColor: '#3b82f6',
    accentHex: '#3b82f6',
    icon: '⭐',
    description: 'Autorizado para mover cuadrillas, aprobar reportes diarios y auditar Pre-Nómina.',
    level: 80,
  },
  SUPERINTENDENTE: {
    role: 'SUPERINTENDENTE',
    label: '⛏️ Superintendente de Mina',
    shortLabel: 'Superintendente',
    badgeColor: '#10b981',
    accentHex: '#10b981',
    icon: '⛏️',
    description: 'Autorizado para mover personal entre cuadrillas, aprobar reportes y coordinar mina.',
    level: 75,
  },
  JEFE_PLANEACION: {
    role: 'JEFE_PLANEACION',
    label: '📐 Jefe de Planeación e Ingeniería',
    shortLabel: 'Jefe Planeación',
    badgeColor: '#6366f1',
    accentHex: '#6366f1',
    icon: '📐',
    description: 'Autorizado para configurar metas semanales (Semana 38), ubicaciones y tarifas.',
    level: 65,
  },
  SUPERVISOR: {
    role: 'SUPERVISOR',
    label: '📋 Supervisor de Turno (Campo)',
    shortLabel: 'Supervisor',
    badgeColor: '#f43f5e',
    accentHex: '#f43f5e',
    icon: '📋',
    description: 'Captura de reportes diarios, pase de lista, avances Scoop/Jumbo y alertas de seguridad.',
    level: 40,
  },
};

export const DEFAULT_ROLE_VIEWS: Record<string, string[]> = {
  SUPER_ADMIN: [
    '/dashboard',
    '/dashboard/nomina',
    '/dashboard/semana',
    '/dashboard/catalogos',
    '/dashboard/catalogos/empleados',
    '/dashboard/catalogos/cuadrillas',
    '/dashboard/catalogos/ubicaciones',
    '/dashboard/catalogos/productos-mina',
    '/dashboard/operacion/reportes-diarios',
    '/dashboard/chat',
    '/dashboard/configuracion/usuarios',
    '/dashboard/configuracion/visiones',
  ],
  DIRECTOR_OPERATIVO: [
    '/dashboard',
    '/dashboard/nomina',
    '/dashboard/semana',
    '/dashboard/operacion/reportes-diarios',
    '/dashboard/chat',
  ],
  GERENTE: [
    '/dashboard',
    '/dashboard/nomina',
    '/dashboard/semana',
    '/dashboard/catalogos',
    '/dashboard/catalogos/cuadrillas',
    '/dashboard/catalogos/empleados',
    '/dashboard/operacion/reportes-diarios',
    '/dashboard/chat',
  ],
  SUPERINTENDENTE: [
    '/dashboard',
    '/dashboard/semana',
    '/dashboard/catalogos/cuadrillas',
    '/dashboard/catalogos/empleados',
    '/dashboard/operacion/reportes-diarios',
    '/dashboard/chat',
  ],
  JEFE_PLANEACION: [
    '/dashboard/semana',
    '/dashboard/catalogos/ubicaciones',
    '/dashboard/catalogos/productos-mina',
    '/dashboard/operacion/reportes-diarios',
    '/dashboard/chat',
  ],
  SUPERVISOR: [
    '/dashboard/catalogos/cuadrillas',
    '/dashboard/operacion/reportes-diarios',
    '/dashboard/chat',
  ],
};

function normalizeMobileRole(rawRole?: string | null): MobileRole {
  const upper = (rawRole || 'SUPERVISOR').toUpperCase().trim();
  if (upper in ROLE_META) return upper as MobileRole;
  if (upper === 'JEFE_MINA') return 'SUPERINTENDENTE';
  if (upper === 'JEFE_RH') return 'GERENTE';
  return 'SUPERVISOR';
}

export function resolveEffectiveViews(role: MobileRole, viewsJson?: string[] | null): string[] {
  if (role === 'SUPER_ADMIN') {
    return DEFAULT_ROLE_VIEWS.SUPER_ADMIN;
  }
  if (Array.isArray(viewsJson)) {
    return viewsJson;
  }
  return DEFAULT_ROLE_VIEWS[role] || DEFAULT_ROLE_VIEWS.SUPERVISOR;
}

export function checkApkRouteAllowed(
  apkHref: string,
  role: MobileRole | null,
  allowedViews: string[]
): boolean {
  if (!role) return false;
  if (role === 'SUPER_ADMIN') return true;

  const clean = apkHref.split('?')[0].replace(/\/+$/, '') || '/dashboard';
  const hasPrefix = (prefix: string) =>
    allowedViews.some((v) => v === prefix || v.startsWith(prefix + '/'));
  const hasExplicitCatalogChildren = allowedViews.some((v) =>
    v.startsWith('/dashboard/catalogos/')
  );
  const allowCatalogHubFallback =
    allowedViews.includes('/dashboard/catalogos') && !hasExplicitCatalogChildren;

  switch (clean) {
    case '/dashboard':
      return allowedViews.includes('/dashboard');
    case '/dashboard/payroll':
      return hasPrefix('/dashboard/nomina');
    case '/dashboard/planning':
      return hasPrefix('/dashboard/semana');
    case '/dashboard/squads':
      return allowCatalogHubFallback || hasPrefix('/dashboard/catalogos/cuadrillas');
    case '/dashboard/personnel':
      return allowCatalogHubFallback || hasPrefix('/dashboard/catalogos/empleados');
    case '/dashboard/reports':
    case '/dashboard/reports-new':
      return hasPrefix('/dashboard/operacion/reportes-diarios');
    case '/dashboard/tasks':
      return hasPrefix('/dashboard/chat');
    case '/dashboard/catalogs':
      return (
        allowCatalogHubFallback ||
        hasPrefix('/dashboard/catalogos/ubicaciones') ||
        hasPrefix('/dashboard/catalogos/productos-mina')
      );
    default:
      return false;
  }
}

const APK_PRIORITY_ROUTES = [
  '/dashboard',
  '/dashboard/reports',
  '/dashboard/squads',
  '/dashboard/planning',
  '/dashboard/tasks',
  '/dashboard/payroll',
  '/dashboard/personnel',
  '/dashboard/catalogs',
];

export function resolveFirstAllowedApkRoute(
  role: MobileRole | null,
  allowedViews: string[]
): string {
  if (!role) return '/login';
  for (const route of APK_PRIORITY_ROUTES) {
    if (checkApkRouteAllowed(route, role, allowedViews)) {
      return route;
    }
  }
  return '/dashboard/reports';
}

export interface MobileUser {
  id: string;
  email: string;
  full_name: string;
  nickname: string;
  role: MobileRole;
  raw_role: string;
  active: boolean;
  views_json: string[];
  permissions: {
    can_approve_reports: boolean;
    can_edit_approved: boolean;
  };
}

interface AuthContextType {
  user: MobileUser | null;
  sysRole: MobileRole;
  roleMeta: RoleMetadata;
  loading: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => Promise<void>;
  allowedViews: string[];
  isJefaturaOrAbove: boolean;
  canMoveSquads: boolean;
  canEditPlanning: boolean;
  canApproveReports: boolean;
  canViewFinancials: boolean;
  isApkRouteAllowed: (apkHref: string) => boolean;
  getFirstAllowedApkRoute: () => string;
  refreshPermissions: () => Promise<boolean>;
  loginWithCredentials: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const STORAGE_KEY = 'raya_mobile_auth_user_v3';
const THEME_STORAGE_KEY = 'raya_mobile_theme_v1';

const AuthContext = createContext<AuthContextType>({
  user: null,
  sysRole: 'SUPERVISOR',
  roleMeta: ROLE_META.SUPERVISOR,
  loading: true,
  theme: 'light',
  toggleTheme: async () => {},
  allowedViews: [],
  isJefaturaOrAbove: false,
  canMoveSquads: false,
  canEditPlanning: false,
  canApproveReports: false,
  canViewFinancials: false,
  isApkRouteAllowed: () => false,
  getFirstAllowedApkRoute: () => '/login',
  refreshPermissions: async () => false,
  loginWithCredentials: async () => ({ ok: false }),
  signOut: async () => {},
});

export const MobileAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const fetchUserFromCentral = useCallback(
    async (emailToFetch: string): Promise<MobileUser | null> => {
      try {
        const cleanEmail = emailToFetch.trim().toLowerCase();
        const { data: sysData, error } = await supabase
          .from('sys_users')
          .select('*')
          .ilike('email', cleanEmail)
          .eq('active', true)
          .maybeSingle();

        if (error || !sysData) {
          return null;
        }

        const mappedRole = normalizeMobileRole(sysData.role);
        const effectiveViews = resolveEffectiveViews(
          mappedRole,
          Array.isArray(sysData.views_json) ? sysData.views_json : null
        );

        let perms = {
          can_approve_reports: [
            'SUPER_ADMIN',
            'DIRECTOR_OPERATIVO',
            'GERENTE',
            'SUPERINTENDENTE',
            'JEFE_PLANEACION',
          ].includes(mappedRole),
          can_edit_approved: ['SUPER_ADMIN', 'GERENTE', 'DIRECTOR_OPERATIVO'].includes(mappedRole),
        };

        const { data: roleCfg } = await supabase
          .from('sys_roles_config')
          .select('can_approve_reports, can_edit_approved')
          .eq('role', sysData.role)
          .maybeSingle();

        if (roleCfg) {
          perms = {
            can_approve_reports: !!roleCfg.can_approve_reports,
            can_edit_approved: !!roleCfg.can_edit_approved,
          };
        }

        return {
          id: sysData.id,
          email: sysData.email,
          full_name: sysData.full_name || sysData.email,
          nickname: sysData.full_name || sysData.email,
          role: mappedRole,
          raw_role: sysData.role || mappedRole,
          active: true,
          views_json: effectiveViews,
          permissions: perms,
        };
      } catch {
        return null;
      }
    },
    []
  );

  useEffect(() => {
    (async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme === 'dark' || savedTheme === 'light') {
          setTheme(savedTheme);
        }

        // Limpiar llaves antiguas de sesiones demo si existían
        await AsyncStorage.removeItem('raya_mobile_auth_user_v2');

        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as MobileUser;
          if (parsed?.email) {
            const freshUser = await fetchUserFromCentral(parsed.email);
            if (freshUser) {
              setUser(freshUser);
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(freshUser));
            } else {
              await AsyncStorage.removeItem(STORAGE_KEY);
              setUser(null);
            }
          }
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchUserFromCentral]);

  const refreshPermissions = useCallback(async (): Promise<boolean> => {
    if (!user?.email) return false;
    const freshUser = await fetchUserFromCentral(user.email);
    if (!freshUser) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setUser(null);
      return false;
    }
    setUser(freshUser);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(freshUser));
    return true;
  }, [user?.email, fetchUserFromCentral]);

  const loginWithCredentials = async (
    email: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      return { ok: false, error: 'Ingresa tu correo corporativo y contraseña asignada.' };
    }

    try {
      const { data, error } = await supabase
        .from('sys_users')
        .select('*')
        .ilike('email', cleanEmail)
        .eq('active', true)
        .maybeSingle();

      if (error || !data) {
        return {
          ok: false,
          error: 'Acceso denegado: este usuario no existe o está inactivo en el sistema central.',
        };
      }

      if (String(data.auth_password || '').trim() !== cleanPass) {
        return {
          ok: false,
          error: 'Contraseña incorrecta. Verifica tus credenciales con el Administrador.',
        };
      }

      const freshUser = await fetchUserFromCentral(cleanEmail);
      if (!freshUser) {
        return {
          ok: false,
          error: 'No fue posible sincronizar las vistas autorizadas del usuario.',
        };
      }

      setUser(freshUser);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(freshUser));
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: 'Error de conexión al validar credenciales con el servidor central.',
      };
    }
  };

  const signOut = async () => {
    setUser(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
    await AsyncStorage.removeItem('raya_mobile_auth_user_v2');
  };

  const toggleTheme = async () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, next);
  };

  const sysRole: MobileRole = user?.role || 'SUPERVISOR';
  const roleMeta = ROLE_META[sysRole] || ROLE_META.SUPERVISOR;
  const allowedViews = user?.views_json || [];

  const isApkRouteAllowed = useCallback(
    (apkHref: string): boolean => {
      if (!user) return false;
      return checkApkRouteAllowed(apkHref, user.role, user.views_json);
    },
    [user]
  );

  const getFirstAllowedApkRoute = useCallback((): string => {
    if (!user) return '/login';
    return resolveFirstAllowedApkRoute(user.role, user.views_json);
  }, [user]);

  const isJefaturaOrAbove = [
    'SUPER_ADMIN',
    'DIRECTOR_OPERATIVO',
    'GERENTE',
    'SUPERINTENDENTE',
  ].includes(sysRole);

  const canMoveSquads = [
    'SUPER_ADMIN',
    'DIRECTOR_OPERATIVO',
    'GERENTE',
    'SUPERINTENDENTE',
  ].includes(sysRole);
  const canEditPlanning = [
    'SUPER_ADMIN',
    'JEFE_PLANEACION',
    'SUPERINTENDENTE',
    'GERENTE',
  ].includes(sysRole);
  const canApproveReports =
    [
      'SUPER_ADMIN',
      'DIRECTOR_OPERATIVO',
      'GERENTE',
      'SUPERINTENDENTE',
      'JEFE_PLANEACION',
    ].includes(sysRole) || !!user?.permissions?.can_approve_reports;

  // Protección estricta de precios, toneladas financieras y nómina según vistas asignadas
  const canViewFinancials =
    sysRole === 'SUPER_ADMIN' ||
    isApkRouteAllowed('/dashboard/payroll') ||
    (isJefaturaOrAbove && isApkRouteAllowed('/dashboard'));

  return (
    <AuthContext.Provider
      value={{
        user,
        sysRole,
        roleMeta,
        loading,
        theme,
        toggleTheme,
        allowedViews,
        isJefaturaOrAbove,
        canMoveSquads,
        canEditPlanning,
        canApproveReports,
        canViewFinancials,
        isApkRouteAllowed,
        getFirstAllowedApkRoute,
        refreshPermissions,
        loginWithCredentials,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const AuthProvider = MobileAuthProvider;
export const useMobileAuth = () => useContext(AuthContext);
export const useAuth = useMobileAuth;
