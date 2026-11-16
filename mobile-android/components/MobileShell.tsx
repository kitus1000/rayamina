import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  Modal,
  Pressable,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import {
  Menu,
  X,
  LayoutDashboard,
  DollarSign,
  Calendar,
  Users,
  HardHat,
  Pickaxe,
  PlusCircle,
  ShieldAlert,
  Layers,
  Sun,
  Moon,
  Lock,
  ChevronRight,
  LogOut,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Bell,
  CheckCheck,
  ArrowRight,
} from 'lucide-react-native';
import { useMobileAuth, ROLE_META, MobileRole } from '../lib/auth-context';
import { useResponsiveLayout } from '../lib/responsive';
import {
  OpsNotification,
  doesNotificationMatchUser,
  fetchAllNotifications,
  isNotificationRead,
  mapNotificationLinkToMobileRoute,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeNotificationsUpdated,
} from '../lib/notifications-service';

interface NavItem {
  label: string;
  subtitle: string;
  href: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
  sensitive?: boolean;
}

interface NavGroup {
  pillar: string;
  color: string;
  items: NavItem[];
}

export interface MobileShellProps {
  title: string;
  pillar?: string;
  pillarHex?: string;
  pillarLabel?: string;
  pillarColor?: string;
  children: React.ReactNode;
}

export default function MobileShell({
  title,
  pillar,
  pillarHex,
  pillarLabel,
  pillarColor,
  children,
}: MobileShellProps) {
  const resolvedPillarLabel = pillar || pillarLabel || 'OPERACIÓN MINA S-38';
  const resolvedPillarColor = pillarHex || pillarColor || '#F59E0B';
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const {
    width: screenWidth,
    height: screenHeight,
    isCompact,
    drawerWidth,
    modalMaxWidth,
  } = useResponsiveLayout();
  const safeBottom = Math.max(insets.bottom, 6);

  const {
    user,
    sysRole,
    isRealSuperAdmin,
    previewRole,
    setPreviewRole,
    loading,
    theme: mode,
    toggleTheme,
    roleMeta,
    isJefaturaOrAbove,
    isApkRouteAllowed,
    getFirstAllowedApkRoute,
    refreshPermissions,
    signOut,
  } = useMobileAuth();

  const isLight = mode === 'light';
  const colors = {
    bgMain: isLight ? '#F8FAFC' : '#020617',
    bgCard: isLight ? '#FFFFFF' : '#0F172A',
    bgHeader: isLight ? '#FFFFFF' : '#0F172A',
    bgElevated: isLight ? '#F1F5F9' : '#1E293B',
    border: isLight ? '#CBD5E1' : '#334155',
    textPrimary: isLight ? '#0F172A' : '#F8FAFC',
    textSecondary: isLight ? '#334155' : '#CBD5E1',
    textMuted: isLight ? '#64748B' : '#94A3B8',
    overlay: 'rgba(2, 6, 23, 0.72)',
  };

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [credentialModalOpen, setCredentialModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<OpsNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [syncingViews, setSyncingViews] = useState(false);

  const readerKey = (user?.email || user?.id || '').toLowerCase();

  const loadUserNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    try {
      setLoadingNotifications(true);
      const all = await fetchAllNotifications();
      const mine = all.filter((n) =>
        doesNotificationMatchUser(n, {
          userId: user.id,
          email: user.email,
          role: user.raw_role || user.role,
          fullName: user.full_name,
        })
      );
      setNotifications(mine);
    } finally {
      setLoadingNotifications(false);
    }
  }, [user]);

  useEffect(() => {
    loadUserNotifications();
    const unsub = subscribeNotificationsUpdated(() => {
      loadUserNotifications();
    });
    const timer = setInterval(loadUserNotifications, 25000);
    return () => {
      unsub();
      clearInterval(timer);
    };
  }, [loadUserNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !isNotificationRead(n, readerKey)).length,
    [notifications, readerKey]
  );

  // Animación del menú desplegable lateral (Slide-out Drawer)
  const slideAnim = useRef(new Animated.Value(-drawerWidth)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!drawerOpen) {
      slideAnim.setValue(-drawerWidth);
    }
  }, [drawerWidth, drawerOpen, slideAnim]);

  // Animación de entrada de cada pantalla + barra láser superior
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(14)).current;
  const contentScale = useRef(new Animated.Value(0.985)).current;
  const laserWidth = useRef(new Animated.Value(0)).current;

  // Guardia de autenticación estricta
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    contentOpacity.setValue(0);
    contentTranslateY.setValue(14);
    contentScale.setValue(0.985);
    laserWidth.setValue(0);

    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(contentTranslateY, {
        toValue: 0,
        friction: 7,
        tension: 65,
        useNativeDriver: true,
      }),
      Animated.spring(contentScale, {
        toValue: 1,
        friction: 7,
        tension: 65,
        useNativeDriver: true,
      }),
      Animated.timing(laserWidth, {
        toValue: screenWidth,
        duration: 420,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();
  }, [pathname, screenWidth, contentOpacity, contentTranslateY, contentScale, laserWidth]);

  const openDrawer = () => {
    setDrawerOpen(true);
    // Sincronizar vistas en segundo plano cada vez que se abre el menú
    refreshPermissions().catch(() => {});
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDrawer = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -drawerWidth,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDrawerOpen(false);
      if (callback) callback();
    });
  };

  const ALL_NAV_GROUPS: NavGroup[] = useMemo(
    () => [
      {
        pillar: '1. JEFATURA Y DIRECCIÓN',
        color: '#D97706',
        items: [
          {
            label: isJefaturaOrAbove ? 'Dashboard Ejecutivo' : 'Consola de Turno',
            subtitle: 'KPIs, Tonelaje y Estado S-38',
            href: '/dashboard',
            icon: LayoutDashboard,
            badge: isJefaturaOrAbove ? 'Jefatura+' : 'Campo',
            badgeColor: '#F59E0B',
            sensitive: true,
          },
          {
            label: 'Pre-Nómina y Raya S-38',
            subtitle: 'Destajos, Bonos y Sueldos',
            href: '/dashboard/payroll',
            icon: DollarSign,
            badge: 'Confidencial',
            badgeColor: '#10B981',
            sensitive: true,
          },
        ],
      },
      {
        pillar: '2. PLANEACIÓN E INGENIERÍA',
        color: '#2563EB',
        items: [
          {
            label: 'Planeación Semanal S-38',
            subtitle: 'Metas vs Ejecución Real',
            href: '/dashboard/planning',
            icon: Calendar,
            badge: 'S-38',
            badgeColor: '#3B82F6',
          },
        ],
      },
      {
        pillar: '3. OPERACIÓN MINA (CAMPO)',
        color: '#059669',
        items: [
          {
            label: 'Pizarra Táctica Cuadrillas',
            subtitle: 'Perforistas, Ayudantes y Scoop',
            href: '/dashboard/squads',
            icon: Users,
            badge: 'Táctica',
            badgeColor: '#10B981',
          },
          {
            label: 'Fuerza Operativa',
            subtitle: 'Plantilla de Mineros y Puestos',
            href: '/dashboard/personnel',
            icon: HardHat,
          },
        ],
      },
      {
        pillar: '4. REPORTES Y SEGURIDAD',
        color: '#E11D48',
        items: [
          {
            label: 'Reportes Diarios de Turno',
            subtitle: 'Historial y Autorización',
            href: '/dashboard/reports',
            icon: Pickaxe,
          },
          {
            label: 'Capturar Reporte (4 Pasos)',
            subtitle: 'Asistente de Campo con Alertas',
            href: '/dashboard/reports-new',
            icon: PlusCircle,
            badge: 'Nuevo',
            badgeColor: '#F43F5E',
          },
          {
            label: 'Bitácora y Seguridad',
            subtitle: 'Tareas, Accidentes y Disciplina',
            href: '/dashboard/tasks',
            icon: ShieldAlert,
            badge: 'En Vivo',
            badgeColor: '#EF4444',
          },
        ],
      },
      {
        pillar: '5. SISTEMA Y CATÁLOGOS',
        color: '#7C3AED',
        items: [
          {
            label: 'Catálogos Maestros',
            subtitle: 'Frentes, Tarifas y Equipos',
            href: '/dashboard/catalogs',
            icon: Layers,
            sensitive: true,
          },
        ],
      },
    ],
    [isJefaturaOrAbove]
  );

  // Filtrar el menú lateral para reflejar únicamente las vistas configuradas en la Web
  const visibleNavGroups = useMemo(() => {
    return ALL_NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => isApkRouteAllowed(item.href)),
    })).filter((group) => group.items.length > 0);
  }, [ALL_NAV_GROUPS, isApkRouteAllowed]);

  const allAllowedItems = useMemo(
    () => visibleNavGroups.flatMap((g) => g.items),
    [visibleNavGroups]
  );

  const handleNavigate = (item: NavItem) => {
    if (!isApkRouteAllowed(item.href)) {
      setCredentialModalOpen(true);
      return;
    }
    closeDrawer(() => {
      if (pathname !== item.href) {
        router.push(item.href as any);
      }
    });
  };

  const handleSyncViewsNow = async () => {
    setSyncingViews(true);
    const ok = await refreshPermissions();
    setSyncingViews(false);
    if (!ok) {
      router.replace('/login');
    }
  };

  const bottomTabs = useMemo(() => {
    const candidates = [
      { label: 'Mando', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Cuadrillas', href: '/dashboard/squads', icon: Users },
      {
        label: 'Capturar',
        href: '/dashboard/reports-new',
        icon: PlusCircle,
        primary: true,
      },
      { label: 'Reportes', href: '/dashboard/reports', icon: Pickaxe },
      { label: 'Metas S-38', href: '/dashboard/planning', icon: Calendar },
      { label: 'Bitácora', href: '/dashboard/tasks', icon: ShieldAlert },
    ];
    return candidates.filter((tab) => isApkRouteAllowed(tab.href)).slice(0, 5);
  }, [isApkRouteAllowed]);

  const currentRouteAllowed = user ? isApkRouteAllowed(pathname) : false;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.bgMain }]}
      edges={['top', 'left', 'right']}
    >
      {/* BARRA LÁSER ANIMADA DE TRANSICIÓN */}
      <Animated.View
        style={[
          styles.laserBar,
          {
            width: laserWidth,
            backgroundColor: resolvedPillarColor,
          },
        ]}
      />

      {/* TOPBAR CORPORATIVO COMPACTO */}
      <View
        style={[
          styles.topbar,
          {
            backgroundColor: colors.bgHeader,
            borderBottomColor: colors.border,
            height: isCompact ? 56 : 64,
            paddingHorizontal: isCompact ? 10 : 14,
          },
        ]}
      >
        <View style={styles.topbarLeft}>
          <TouchableOpacity
            onPress={openDrawer}
            activeOpacity={0.75}
            style={[
              styles.hamburgerBtn,
              {
                backgroundColor: colors.bgElevated,
                borderColor: '#F59E0B',
                width: isCompact ? 38 : 42,
                height: isCompact ? 38 : 42,
              },
            ]}
          >
            <Menu size={isCompact ? 19 : 21} color="#D97706" />
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <View style={styles.pillarRow}>
              <View style={[styles.pillarDot, { backgroundColor: resolvedPillarColor }]} />
              <Text
                style={[styles.pillarText, { color: resolvedPillarColor }]}
                numberOfLines={1}
              >
                {resolvedPillarLabel}
              </Text>
            </View>
            <Text
              style={[
                styles.screenTitle,
                { color: colors.textPrimary, fontSize: isCompact ? 13.5 : 15 },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          </View>
        </View>

        <View style={[styles.topbarRight, { gap: isCompact ? 6 : 8 }]}>
          {/* Insignia de Credencial Verificada (Solo lectura + Sincronización) */}
          <TouchableOpacity
            onPress={() => setCredentialModalOpen(true)}
            activeOpacity={0.8}
            style={[
              styles.rolePill,
              {
                backgroundColor: roleMeta.badgeColor + '20',
                borderColor: roleMeta.badgeColor,
                maxWidth: isCompact ? 88 : 132,
                paddingHorizontal: isCompact ? 7 : 10,
              },
            ]}
          >
            <ShieldCheck size={12} color={roleMeta.badgeColor} />
            <Text
              style={[styles.rolePillText, { color: roleMeta.badgeColor }]}
              numberOfLines={1}
            >
              {roleMeta.shortLabel}
            </Text>
          </TouchableOpacity>

          {/* Campana de Notificaciones */}
          <TouchableOpacity
            onPress={() => {
              loadUserNotifications();
              setNotificationsOpen(true);
            }}
            activeOpacity={0.8}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            style={[
              styles.themeBtn,
              {
                backgroundColor: unreadCount > 0 ? 'rgba(245, 158, 11, 0.16)' : colors.bgElevated,
                borderColor: unreadCount > 0 ? '#F59E0B' : colors.border,
              },
            ]}
          >
            <Bell size={16} color={unreadCount > 0 ? '#D97706' : colors.textSecondary} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Conmutador Día / Noche */}
          <TouchableOpacity
            onPress={toggleTheme}
            activeOpacity={0.8}
            style={[
              styles.themeBtn,
              {
                backgroundColor: colors.bgElevated,
                borderColor: colors.border,
              },
            ]}
          >
            {mode === 'light' ? (
              <Sun size={17} color="#D97706" />
            ) : (
              <Moon size={17} color="#F59E0B" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* BANNER ACTIVO DE SIMULACIÓN DE PERFIL (SOLO SUPER ADMIN) */}
      {isRealSuperAdmin && previewRole && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setPreviewRole(null)}
          style={{
            backgroundColor: '#F59E0B',
            paddingHorizontal: 12,
            paddingVertical: 6,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ color: '#0F172A', fontSize: 10.5, fontWeight: '900', flex: 1 }}>
            👁️ Modo Super Admin: Viendo APK como {roleMeta.shortLabel}
          </Text>
          <Text style={{ color: '#0F172A', fontSize: 10, fontWeight: '900', textDecorationLine: 'underline' }}>
            Volver a Admin
          </Text>
        </TouchableOpacity>
      )}

      {/* CONTENIDO PRINCIPAL CON ANIMACIÓN DE ENTRADA Y BLOQUEO DE SEGURIDAD */}
      <Animated.View
        style={[
          styles.contentWrapper,
          {
            opacity: contentOpacity,
            transform: [
              { translateY: contentTranslateY },
              { scale: contentScale },
            ],
          },
        ]}
      >
        {currentRouteAllowed ? (
          children
        ) : (
          <View style={styles.restrictedContainer}>
            <View
              style={[
                styles.restrictedCard,
                {
                  backgroundColor: colors.bgCard,
                  borderColor: '#f43f5e',
                },
              ]}
            >
              <View style={styles.restrictedIconCircle}>
                <Lock size={28} color="#f43f5e" />
              </View>
              <Text style={[styles.restrictedTitle, { color: colors.textPrimary }]}>
                Vista Protegida por Configuración Central
              </Text>
              <Text style={[styles.restrictedSub, { color: colors.textSecondary }]}>
                Tu perfil ({roleMeta.shortLabel}) no tiene habilitada esta pantalla en la matriz de visiones. Los datos confidenciales de precios, toneladas y nómina están protegidos.
              </Text>
              <View style={styles.restrictedBtnRow}>
                <TouchableOpacity
                  style={styles.restrictedPrimaryBtn}
                  onPress={() => {
                    const target = getFirstAllowedApkRoute();
                    router.replace(target as any);
                  }}
                >
                  <Text style={styles.restrictedPrimaryBtnText}>
                    IR A MI VISTA AUTORIZADA
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.restrictedSyncBtn,
                    { borderColor: colors.border, backgroundColor: colors.bgElevated },
                  ]}
                  onPress={handleSyncViewsNow}
                  disabled={syncingViews}
                >
                  {syncingViews ? (
                    <ActivityIndicator size="small" color="#F59E0B" />
                  ) : (
                    <>
                      <RefreshCw size={14} color="#F59E0B" />
                      <Text style={styles.restrictedSyncBtnText}>
                        SINCRONIZAR PERMISOS
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Animated.View>

      {/* BARRA INFERIOR DE ACCESO RÁPIDO PROTEGIDA CON SAFE-AREA PARA ANDROID NAVIGATION BAR */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.bgHeader,
            borderTopColor: colors.border,
            paddingBottom: safeBottom,
            paddingTop: 6,
            minHeight: (isCompact ? 56 : 62) + safeBottom,
          },
        ]}
      >
        {bottomTabs.map((tab) => {
          const isActive = pathname === tab.href;
          const IconComp = tab.icon;

          if (tab.primary) {
            return (
              <TouchableOpacity
                key={tab.href}
                activeOpacity={0.85}
                hitSlop={{ top: 10, bottom: 8, left: 6, right: 6 }}
                onPress={() => {
                  if (pathname !== tab.href) router.push(tab.href as any);
                }}
                style={styles.primaryTabBtn}
              >
                <View
                  style={[
                    styles.primaryTabCircle,
                    {
                      width: isCompact ? 38 : 42,
                      height: isCompact ? 38 : 42,
                      borderRadius: 21,
                    },
                  ]}
                >
                  <IconComp size={isCompact ? 19 : 21} color="#0F172A" />
                </View>
                <Text
                  style={[
                    styles.primaryTabLabel,
                    { color: '#D97706', fontSize: isCompact ? 9 : 10 },
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={tab.href}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              onPress={() => {
                if (pathname !== tab.href) router.push(tab.href as any);
              }}
              style={styles.tabItem}
            >
              <IconComp
                size={isCompact ? 18 : 20}
                color={isActive ? '#D97706' : colors.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? '#D97706' : colors.textMuted,
                    fontWeight: isActive ? '900' : '600',
                    fontSize: isCompact ? 9 : 10,
                  },
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
              {isActive && <View style={styles.activeTabDot} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* MENÚ LATERAL DESPLEGABLE (SLIDE-OUT DRAWER) */}
      {drawerOpen && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: colors.overlay,
                opacity: backdropOpacity,
              },
            ]}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => closeDrawer()}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.drawerContainer,
              {
                width: drawerWidth,
                backgroundColor: colors.bgCard,
                borderRightColor: colors.border,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
              {/* Cabecera del Menú */}
              <View
                style={[
                  styles.drawerHeader,
                  { borderBottomColor: colors.border },
                ]}
              >
                <View style={styles.drawerBrandRow}>
                  <View style={styles.drawerLogoBox}>
                    <HardHat size={22} color="#0F172A" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.drawerBrandTitle,
                        { color: colors.textPrimary },
                      ]}
                    >
                      LA RAYA MINA
                    </Text>
                    <Text
                      style={[
                        styles.drawerBrandSub,
                        { color: '#10B981' },
                      ]}
                    >
                      APK PROTEGIDA • S-38
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => closeDrawer()}
                    style={[
                      styles.closeDrawerBtn,
                      {
                        backgroundColor: colors.bgElevated,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <X size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Tarjeta de Credencial Sincronizada (Solo lectura) */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setCredentialModalOpen(true)}
                  style={[
                    styles.userRoleCard,
                    {
                      backgroundColor: colors.bgElevated,
                      borderColor: roleMeta.badgeColor,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.userRoleCardLabel,
                        { color: '#10B981' },
                      ]}
                    >
                      CREDENCIAL VERIFICADA EN VIVO
                    </Text>
                    <Text
                      style={[
                        styles.userRoleCardTitle,
                        { color: colors.textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {user?.full_name || roleMeta.label}
                    </Text>
                    <Text
                      style={[
                        styles.userRoleCardDesc,
                        { color: colors.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {roleMeta.label} • {user?.email}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleSyncViewsNow}
                    disabled={syncingViews}
                    style={styles.switchRoleBadge}
                  >
                    {syncingViews ? (
                      <ActivityIndicator size="small" color="#F59E0B" />
                    ) : (
                      <View style={styles.syncBadgeRow}>
                        <RefreshCw size={10} color="#F59E0B" />
                        <Text style={styles.switchRoleBadgeText}>SYNC</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </TouchableOpacity>
              </View>

              {/* Secciones de los Pilares Autorizados */}
              <ScrollView
                style={styles.drawerScroll}
                contentContainerStyle={{ paddingBottom: 24 }}
                showsVerticalScrollIndicator={false}
              >
                {visibleNavGroups.map((group, gIdx) => (
                  <View key={gIdx} style={styles.navGroup}>
                    <View style={styles.navGroupHeader}>
                      <View
                        style={[
                          styles.navGroupDot,
                          { backgroundColor: group.color },
                        ]}
                      />
                      <Text
                        style={[
                          styles.navGroupTitle,
                          { color: group.color },
                        ]}
                      >
                        {group.pillar}
                      </Text>
                    </View>

                    {group.items.map((item) => {
                      const isActive = pathname === item.href;
                      const IconComp = item.icon;

                      return (
                        <TouchableOpacity
                          key={item.href}
                          activeOpacity={0.78}
                          onPress={() => handleNavigate(item)}
                          style={[
                            styles.drawerItem,
                            {
                              backgroundColor: isActive
                                ? '#F59E0B'
                                : colors.bgElevated,
                              borderColor: isActive
                                ? '#D97706'
                                : colors.border,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.drawerItemIconBox,
                              {
                                backgroundColor: isActive
                                  ? '#0F172A'
                                  : group.color + '18',
                              },
                            ]}
                          >
                            <IconComp
                              size={18}
                              color={isActive ? '#F59E0B' : group.color}
                            />
                          </View>

                          <View style={{ flex: 1, marginRight: 6 }}>
                            <Text
                              style={[
                                styles.drawerItemTitle,
                                {
                                  color: isActive
                                    ? '#0F172A'
                                    : colors.textPrimary,
                                },
                              ]}
                              numberOfLines={1}
                            >
                              {item.label}
                            </Text>
                            <Text
                              style={[
                                styles.drawerItemSub,
                                {
                                  color: isActive
                                    ? '#1E293B'
                                    : colors.textSecondary,
                                },
                              ]}
                              numberOfLines={1}
                            >
                              {item.subtitle}
                            </Text>
                          </View>

                          {item.badge ? (
                            <View
                              style={[
                                styles.itemBadge,
                                {
                                  backgroundColor: isActive
                                    ? '#0F172A'
                                    : (item.badgeColor || '#F59E0B') + '22',
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.itemBadgeText,
                                  {
                                    color: isActive
                                      ? '#F59E0B'
                                      : item.badgeColor || '#D97706',
                                  },
                                ]}
                              >
                                {item.badge}
                              </Text>
                            </View>
                          ) : (
                            <ChevronRight
                              size={16}
                              color={isActive ? '#0F172A' : colors.textMuted}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </ScrollView>

              {/* Pie del Menú */}
              <View
                style={[
                  styles.drawerFooter,
                  { borderTopColor: colors.border },
                ]}
              >
                <TouchableOpacity
                  onPress={toggleTheme}
                  style={[
                    styles.footerThemeBtn,
                    {
                      backgroundColor: colors.bgElevated,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {mode === 'light' ? (
                    <>
                      <Sun size={16} color="#D97706" />
                      <Text
                        style={[
                          styles.footerThemeText,
                          { color: colors.textPrimary },
                        ]}
                      >
                        Modo Día (Alto Contraste)
                      </Text>
                    </>
                  ) : (
                    <>
                      <Moon size={16} color="#F59E0B" />
                      <Text
                        style={[
                          styles.footerThemeText,
                          { color: colors.textPrimary },
                        ]}
                      >
                        Modo Noche (Interior Mina)
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    closeDrawer(async () => {
                      await signOut();
                      router.replace('/login');
                    });
                  }}
                  style={styles.logoutBtn}
                >
                  <LogOut size={16} color="#EF4444" />
                  <Text style={styles.logoutText}>Cerrar Sesión Segura</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Animated.View>
        </View>
      )}

      {/* MODAL DE CREDENCIAL VERIFICADA Y VISTAS SINCRONIZADAS (SOLO LECTURA) */}
      <Modal
        visible={credentialModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCredentialModalOpen(false)}
      >
        <View style={[styles.modalOverlay, { paddingBottom: Math.max(insets.bottom, 18) }]}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.bgCard,
                borderColor: '#10B981',
                maxWidth: modalMaxWidth,
                width: '100%',
                alignSelf: 'center',
                maxHeight: screenHeight * 0.85,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={styles.modalVerifiedPill}>
                  <ShieldCheck size={13} color="#10B981" />
                  <Text style={styles.modalVerifiedPillText}>
                    CREDENCIAL CORPORATIVA BLINDADA
                  </Text>
                </View>
                <Text
                  style={[styles.modalTitle, { color: colors.textPrimary }]}
                >
                  {user?.full_name || roleMeta.shortLabel}
                </Text>
                <Text
                  style={[styles.modalSub, { color: colors.textSecondary }]}
                >
                  {roleMeta.label} • {user?.email}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setCredentialModalOpen(false)}
                style={[
                  styles.closeDrawerBtn,
                  {
                    backgroundColor: colors.bgElevated,
                    borderColor: colors.border,
                  },
                ]}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {isRealSuperAdmin && (
              <View
                style={[
                  styles.syncExplainBox,
                  {
                    backgroundColor: colors.bgElevated,
                    borderColor: '#F59E0B',
                    marginBottom: 10,
                  },
                ]}
              >
                <Text style={styles.syncExplainTitle}>
                  👁️ EXCLUSIVO SUPER ADMIN: VER PANTALLAS Y AVANCES DE OTRO PERFIL
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {(Object.keys(ROLE_META) as MobileRole[]).map((rKey) => {
                    const m = ROLE_META[rKey];
                    const active = sysRole === rKey;
                    return (
                      <TouchableOpacity
                        key={rKey}
                        onPress={() => {
                          setPreviewRole(rKey === 'SUPER_ADMIN' ? null : rKey);
                          setCredentialModalOpen(false);
                        }}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 9,
                          borderWidth: 1,
                          backgroundColor: active ? '#F59E0B' : colors.bgCard,
                          borderColor: active ? '#D97706' : colors.border,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '900',
                            color: active ? '#0F172A' : colors.textPrimary,
                          }}
                        >
                          {m.shortLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View
              style={[
                styles.syncExplainBox,
                {
                  backgroundColor: colors.bgElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={styles.syncExplainTitle}>
                PANTALLAS REFLEJADAS DESDE LA APP CENTRAL ({allAllowedItems.length})
              </Text>
              <Text
                style={[
                  styles.syncExplainSub,
                  { color: colors.textSecondary },
                ]}
              >
                Las vistas de este APK no pueden ser alteradas desde el teléfono. Se sincronizan directamente desde el módulo de Visiones de la plataforma web:
              </Text>
            </View>

            <ScrollView
              style={{ maxHeight: 250 }}
              showsVerticalScrollIndicator={false}
            >
              {allAllowedItems.map((it) => (
                <View
                  key={it.href}
                  style={[
                    styles.allowedItemRow,
                    {
                      backgroundColor: colors.bgElevated,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <CheckCircle2 size={16} color="#10B981" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text
                      style={[
                        styles.allowedItemTitle,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {it.label}
                    </Text>
                    <Text
                      style={[
                        styles.allowedItemSub,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {it.subtitle}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalSyncBtn}
              onPress={async () => {
                await handleSyncViewsNow();
                setCredentialModalOpen(false);
              }}
              disabled={syncingViews}
            >
              {syncingViews ? (
                <ActivityIndicator size="small" color="#0F172A" />
              ) : (
                <>
                  <RefreshCw size={15} color="#0F172A" />
                  <Text style={styles.modalSyncBtnText}>
                    SINCRONIZAR VISTAS CON CENTRAL AHORA
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL CENTRO DE NOTIFICACIONES OPERATIVAS */}
      <Modal
        visible={notificationsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setNotificationsOpen(false)}
      >
        <View style={[styles.modalOverlay, { paddingBottom: Math.max(insets.bottom, 18) }]}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.bgCard,
                borderColor: '#F59E0B',
                maxWidth: modalMaxWidth,
                width: '100%',
                alignSelf: 'center',
                maxHeight: screenHeight * 0.86,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={styles.modalVerifiedPill}>
                  <Bell size={13} color="#F59E0B" />
                  <Text style={[styles.modalVerifiedPillText, { color: '#F59E0B' }]}>
                    AVISOS EN TIEMPO REAL ({unreadCount} NUEVOS)
                  </Text>
                </View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Centro de Alertas Operativas
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setNotificationsOpen(false)}
                style={[
                  styles.closeDrawerBtn,
                  { backgroundColor: colors.bgElevated, borderColor: colors.border },
                ]}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {unreadCount > 0 && (
              <TouchableOpacity
                onPress={async () => {
                  const ids = notifications.map((n) => n.id);
                  await markAllNotificationsAsRead(ids, readerKey);
                  await loadUserNotifications();
                }}
                style={[
                  styles.restrictedSyncBtn,
                  { borderColor: '#F59E0B', marginBottom: 10, paddingVertical: 8 },
                ]}
              >
                <CheckCheck size={14} color="#F59E0B" />
                <Text style={styles.restrictedSyncBtnText}>MARCAR TODAS COMO LEÍDAS</Text>
              </TouchableOpacity>
            )}

            <ScrollView
              style={{ maxHeight: Math.min(400, screenHeight * 0.55) }}
              showsVerticalScrollIndicator={false}
            >
              {loadingNotifications ? (
                <ActivityIndicator size="small" color="#F59E0B" style={{ marginVertical: 20 }} />
              ) : notifications.length === 0 ? (
                <View style={{ paddingVertical: 26, alignItems: 'center' }}>
                  <Bell size={28} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8, textAlign: 'center' }}>
                    Sin notificaciones operativas pendientes para tu usuario.
                  </Text>
                </View>
              ) : (
                notifications.map((n) => {
                  const read = isNotificationRead(n, readerKey);
                  return (
                    <TouchableOpacity
                      key={n.id}
                      activeOpacity={0.8}
                      onPress={async () => {
                        await markNotificationAsRead(n.id, readerKey);
                        setNotificationsOpen(false);
                        const target = mapNotificationLinkToMobileRoute(n.link);
                        if (isApkRouteAllowed(target)) {
                          router.push(target as any);
                        }
                      }}
                      style={[
                        styles.notifItemCard,
                        {
                          backgroundColor: read ? colors.bgElevated : 'rgba(245, 158, 11, 0.12)',
                          borderColor: read ? colors.border : '#F59E0B',
                        },
                      ]}
                    >
                      <View style={styles.notifTopRow}>
                        <Text
                          style={[
                            styles.notifTitle,
                            { color: colors.textPrimary },
                          ]}
                          numberOfLines={2}
                        >
                          {n.title}
                        </Text>
                        {!read && <View style={styles.notifUnreadDot} />}
                      </View>
                      <Text style={[styles.notifBody, { color: colors.textSecondary }]}>
                        {n.message}
                      </Text>
                      {Array.isArray(n.details) && n.details.length > 0 && (
                        <View style={styles.notifDetailsBox}>
                          {n.details.slice(0, 5).map((d, idx) => (
                            <Text key={idx} style={[styles.notifDetailLine, { color: colors.textPrimary }]}>
                              • {d}
                            </Text>
                          ))}
                        </View>
                      )}
                      <View style={styles.notifFooterRow}>
                        <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '700' }}>
                          {n.created_by_name} • {new Date(n.created_at).toLocaleString()}
                        </Text>
                        <ArrowRight size={13} color="#D97706" />
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  laserBar: {
    height: 3,
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 99,
  },
  topbar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    zIndex: 20,
  },
  topbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  hamburgerBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  titleContainer: {
    flex: 1,
  },
  pillarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 1,
  },
  pillarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  pillarText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  screenTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  topbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 5,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '900',
  },
  themeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWrapper: {
    flex: 1,
  },
  restrictedContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restrictedCard: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 22,
    alignItems: 'center',
  },
  restrictedIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(244, 63, 94, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  restrictedTitle: {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  restrictedSub: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 18,
  },
  restrictedBtnRow: {
    width: '100%',
    gap: 10,
  },
  restrictedPrimaryBtn: {
    backgroundColor: '#F59E0B',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  restrictedPrimaryBtnText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '900',
  },
  restrictedSyncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  restrictedSyncBtnText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '900',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingHorizontal: 4,
    elevation: 16,
    zIndex: 30,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
    minWidth: 0,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  activeTabDot: {
    width: 16,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#D97706',
    marginTop: 2,
  },
  primaryTabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 2,
    minWidth: 0,
  },
  primaryTabCircle: {
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
  },
  primaryTabLabel: {
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  notifItemCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  notifTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  notifTitle: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '900',
  },
  notifUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
  notifBody: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  notifDetailsBox: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.25)',
    gap: 2,
  },
  notifDetailLine: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  notifFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  drawerContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRightWidth: 1,
    zIndex: 60,
    elevation: 20,
  },
  drawerHeader: {
    padding: 16,
    borderBottomWidth: 1,
  },
  drawerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  drawerLogoBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  drawerBrandTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  drawerBrandSub: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  closeDrawerBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userRoleCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userRoleCardLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  userRoleCardTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  userRoleCardDesc: {
    fontSize: 10,
    marginTop: 2,
    lineHeight: 13,
  },
  switchRoleBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  syncBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  switchRoleBadgeText: {
    color: '#F59E0B',
    fontSize: 9,
    fontWeight: '900',
  },
  drawerScroll: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  navGroup: {
    marginBottom: 16,
  },
  navGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  navGroupDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  navGroupTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 7,
  },
  drawerItemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  drawerItemTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  drawerItemSub: {
    fontSize: 10,
    marginTop: 1,
  },
  itemBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  itemBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  drawerFooter: {
    padding: 14,
    borderTopWidth: 1,
    gap: 8,
  },
  footerThemeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  footerThemeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    gap: 8,
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.76)',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalVerifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  modalVerifiedPillText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  modalSub: {
    fontSize: 11,
    marginTop: 2,
  },
  syncExplainBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  syncExplainTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#F59E0B',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  syncExplainSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  allowedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  allowedItemTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  allowedItemSub: {
    fontSize: 10,
    marginTop: 1,
  },
  modalSyncBtn: {
    marginTop: 12,
    backgroundColor: '#F59E0B',
    paddingVertical: 13,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalSyncBtnText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
