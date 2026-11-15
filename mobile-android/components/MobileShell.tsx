import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
  Modal,
  Pressable,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
} from 'lucide-react-native';
import { useMobileAuth } from '../lib/auth-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(315, SCREEN_WIDTH * 0.84);

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
  const {
    user,
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
  const [syncingViews, setSyncingViews] = useState(false);

  // Animación del menú desplegable lateral (Slide-out Drawer)
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

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
        toValue: SCREEN_WIDTH,
        duration: 420,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();
  }, [pathname, contentOpacity, contentTranslateY, contentScale, laserWidth]);

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
        toValue: -DRAWER_WIDTH,
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
              },
            ]}
          >
            <Menu size={21} color="#D97706" />
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
              style={[styles.screenTitle, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {title}
            </Text>
          </View>
        </View>

        <View style={styles.topbarRight}>
          {/* Insignia de Credencial Verificada (Solo lectura + Sincronización) */}
          <TouchableOpacity
            onPress={() => setCredentialModalOpen(true)}
            activeOpacity={0.8}
            style={[
              styles.rolePill,
              {
                backgroundColor: roleMeta.badgeColor + '20',
                borderColor: roleMeta.badgeColor,
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

      {/* BARRA INFERIOR DE ACCESO RÁPIDO (SOLO VISTAS AUTORIZADAS) */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.bgHeader,
            borderTopColor: colors.border,
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
                onPress={() => {
                  if (pathname !== tab.href) router.push(tab.href as any);
                }}
                style={styles.primaryTabBtn}
              >
                <View style={styles.primaryTabCircle}>
                  <IconComp size={23} color="#0F172A" />
                </View>
                <Text style={[styles.primaryTabLabel, { color: '#D97706' }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={tab.href}
              activeOpacity={0.75}
              onPress={() => {
                if (pathname !== tab.href) router.push(tab.href as any);
              }}
              style={styles.tabItem}
            >
              <IconComp
                size={20}
                color={isActive ? '#D97706' : colors.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? '#D97706' : colors.textMuted,
                    fontWeight: isActive ? '900' : '600',
                  },
                ]}
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
                width: DRAWER_WIDTH,
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
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.bgCard,
                borderColor: '#10B981',
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
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingHorizontal: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 3,
  },
  activeTabDot: {
    width: 16,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#D97706',
    marginTop: 2,
  },
  primaryTabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
  },
  primaryTabCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 6,
  },
  primaryTabLabel: {
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
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
