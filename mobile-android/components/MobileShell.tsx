import React, { useState, useEffect, useRef } from 'react'
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Animated,
    Dimensions,
    StyleSheet,
    Modal,
    Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, usePathname } from 'expo-router'
import {
    Menu,
    X,
    LayoutDashboard,
    DollarSign,
    Calendar,
    Users,
    HardHat,
    FileText,
    PlusCircle,
    MessageSquare,
    ShieldAlert,
    Pickaxe,
    Sun,
    Moon,
    LogOut,
    ChevronRight,
    Lock,
    Sparkles,
    CheckCircle2,
    Layers,
} from 'lucide-react-native'
import { useMobileAuth, ROLE_META, SysRole } from '../lib/auth-context'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.84, 330)

interface NavItem {
    label: string
    subtitle: string
    href: string
    icon: any
    badge?: string
    requiresJefatura?: boolean
    accentColor: string
}

interface NavGroup {
    pillarTitle: string
    pillarColor: string
    items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
    {
        pillarTitle: '1. JEFATURA Y DIRECCIÓN',
        pillarColor: '#f59e0b',
        items: [
            {
                label: 'Dashboard Ejecutivo',
                subtitle: 'KPIs Financieros y Tonelaje S-38',
                href: '/dashboard',
                icon: LayoutDashboard,
                badge: 'Jefatura+',
                requiresJefatura: true,
                accentColor: '#f59e0b',
            },
            {
                label: 'Pre-Nómina y Raya',
                subtitle: 'Destajos, Bonos y Sueldos S-38',
                href: '/dashboard/payroll',
                icon: DollarSign,
                badge: 'Confidencial',
                requiresJefatura: true,
                accentColor: '#f59e0b',
            },
        ],
    },
    {
        pillarTitle: '2. PLANEACIÓN E INGENIERÍA',
        pillarColor: '#3b82f6',
        items: [
            {
                label: 'Planeación vs Ejecución',
                subtitle: 'Metas Semana 38 (21-27 Sep)',
                href: '/dashboard/planning',
                icon: Calendar,
                badge: 'S-38',
                accentColor: '#3b82f6',
            },
        ],
    },
    {
        pillarTitle: '3. OPERACIÓN MINA (CAMPO)',
        pillarColor: '#10b981',
        items: [
            {
                label: 'Pizarra de Cuadrillas',
                subtitle: 'Cancha Táctica y Reasignación',
                href: '/dashboard/squads',
                icon: Users,
                badge: 'Táctica',
                accentColor: '#10b981',
            },
            {
                label: 'Fuerza Operativa',
                subtitle: 'Plantilla de Mineros y Roles',
                href: '/dashboard/personnel',
                icon: HardHat,
                accentColor: '#10b981',
            },
        ],
    },
    {
        pillarTitle: '4. REPORTES Y SEGURIDAD',
        pillarColor: '#f43f5e',
        items: [
            {
                label: 'Reportes Diarios de Turno',
                subtitle: 'Historial y Aprobación',
                href: '/dashboard/reports',
                icon: Pickaxe,
                accentColor: '#f43f5e',
            },
            {
                label: 'Capturar Reporte Diario',
                subtitle: 'Pase de Lista, Scoop y Avances',
                href: '/dashboard/reports-new',
                icon: PlusCircle,
                badge: 'Turno',
                accentColor: '#f43f5e',
            },
            {
                label: 'Bitácora y Seguridad',
                subtitle: 'Tareas, Accidentes e Incidencias',
                href: '/dashboard/tasks',
                icon: ShieldAlert,
                badge: 'En Vivo',
                accentColor: '#f43f5e',
            },
        ],
    },
    {
        pillarTitle: '5. SISTEMA Y CATÁLOGOS',
        pillarColor: '#a855f7',
        items: [
            {
                label: 'Catálogos Maestros',
                subtitle: 'Minas, Frentes, Equipos y Puestos',
                href: '/dashboard/catalogs',
                icon: Layers,
                accentColor: '#a855f7',
            },
        ],
    },
]

export default function MobileShell({
    title,
    pillar,
    pillarHex = '#f59e0b',
    children,
}: {
    title: string
    pillar: string
    pillarHex?: string
    children: React.ReactNode
}) {
    const router = useRouter()
    const pathname = usePathname()
    const {
        user,
        sysRole,
        theme,
        isJefaturaOrAbove,
        toggleTheme,
        loginAsRole,
        signOut,
    } = useMobileAuth()

    const [drawerOpen, setDrawerOpen] = useState(false)
    const [roleModalOpen, setRoleModalOpen] = useState(false)

    // Animaciones del Drawer Desplegable
    const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current
    const backdropAnim = useRef(new Animated.Value(0)).current

    // Animación de Transición de Página (Fade + Slide + Laser Bar)
    const contentOpacity = useRef(new Animated.Value(0)).current
    const contentTranslateY = useRef(new Animated.Value(18)).current
    const laserWidth = useRef(new Animated.Value(0)).current
    const laserOpacity = useRef(new Animated.Value(1)).current

    useEffect(() => {
        // Disparar animación de transición al entrar a cada pantalla
        contentOpacity.setValue(0)
        contentTranslateY.setValue(16)
        laserWidth.setValue(0)
        laserOpacity.setValue(1)

        Animated.parallel([
            Animated.timing(contentOpacity, {
                toValue: 1,
                duration: 280,
                useNativeDriver: true,
            }),
            Animated.spring(contentTranslateY, {
                toValue: 0,
                damping: 18,
                stiffness: 140,
                useNativeDriver: true,
            }),
            Animated.sequence([
                Animated.timing(laserWidth, {
                    toValue: SCREEN_WIDTH,
                    duration: 360,
                    useNativeDriver: false,
                }),
                Animated.timing(laserOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: false,
                }),
            ]),
        ]).start()
    }, [pathname])

    const openDrawer = () => {
        setDrawerOpen(true)
        Animated.parallel([
            Animated.spring(drawerAnim, {
                toValue: 0,
                damping: 20,
                stiffness: 150,
                useNativeDriver: true,
            }),
            Animated.timing(backdropAnim, {
                toValue: 1,
                duration: 220,
                useNativeDriver: true,
            }),
        ]).start()
    }

    const closeDrawer = (cb?: () => void) => {
        Animated.parallel([
            Animated.timing(drawerAnim, {
                toValue: -DRAWER_WIDTH,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(backdropAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setDrawerOpen(false)
            if (cb) cb()
        })
    }

    const navigateTo = (href: string, locked: boolean) => {
        if (locked) {
            setRoleModalOpen(true)
            return
        }
        closeDrawer(() => {
            if (pathname !== href) {
                router.push(href as any)
            }
        })
    }

    const handleLogout = () => {
        closeDrawer(async () => {
            await signOut()
            router.replace('/login')
        })
    }

    const isLight = theme === 'light'
    const bgMain = isLight ? '#F1F5F9' : '#020617'
    const bgSurface = isLight ? '#FFFFFF' : '#0F172A'
    const bgElevated = isLight ? '#F8FAFC' : '#1E293B'
    const borderCol = isLight ? '#CBD5E1' : '#1E293B'
    const textPrimary = isLight ? '#0F172A' : '#F8FAFC'
    const textSecondary = isLight ? '#475569' : '#94A3B8'

    const currentRoleMeta = ROLE_META[sysRole] || ROLE_META.SUPER_ADMIN

    const bottomTabs = [
        { label: 'Mando', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Cuadrillas', href: '/dashboard/squads', icon: Users },
        { label: 'Capturar', href: '/dashboard/reports-new', icon: PlusCircle, isPrimary: true },
        { label: 'Metas S-38', href: '/dashboard/planning', icon: Calendar },
        { label: 'Bitácora', href: '/dashboard/tasks', icon: MessageSquare },
    ]

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: bgMain }]}>
            {/* Barra Láser Superior de Transición entre Pantallas */}
            <Animated.View
                style={[
                    styles.laserBar,
                    {
                        width: laserWidth,
                        opacity: laserOpacity,
                        backgroundColor: pillarHex,
                    },
                ]}
            />

            {/* TOPBAR PROFESIONAL CON MENÚ DESPLEGABLE Y SELECTOR DE ROL */}
            <View
                style={[
                    styles.topbar,
                    {
                        backgroundColor: bgSurface,
                        borderBottomColor: borderCol,
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
                                backgroundColor: isLight ? '#0F172A' : '#1E293B',
                                borderColor: pillarHex,
                            },
                        ]}
                    >
                        <Menu size={20} color="#F59E0B" />
                    </TouchableOpacity>

                    <View style={styles.titleContainer}>
                        <View style={styles.pillarRow}>
                            <View style={[styles.pillarDot, { backgroundColor: pillarHex }]} />
                            <Text style={[styles.pillarText, { color: pillarHex }]} numberOfLines={1}>
                                {pillar}
                            </Text>
                        </View>
                        <Text style={[styles.screenTitle, { color: textPrimary }]} numberOfLines={1}>
                            {title}
                        </Text>
                    </View>
                </View>

                <View style={styles.topbarRight}>
                    {/* Botón Selector de Nivel de Autorización / Rol */}
                    <TouchableOpacity
                        onPress={() => setRoleModalOpen(true)}
                        activeOpacity={0.8}
                        style={[
                            styles.rolePill,
                            {
                                backgroundColor: currentRoleMeta.badgeColor + '18',
                                borderColor: currentRoleMeta.badgeColor,
                            },
                        ]}
                    >
                        <Sparkles size={12} color={currentRoleMeta.badgeColor} />
                        <Text
                            style={[styles.rolePillText, { color: isLight ? '#0F172A' : '#F8FAFC' }]}
                            numberOfLines={1}
                        >
                            {currentRoleMeta.shortLabel}
                        </Text>
                    </TouchableOpacity>

                    {/* Botón Modo Día / Modo Noche */}
                    <TouchableOpacity
                        onPress={toggleTheme}
                        activeOpacity={0.8}
                        style={[
                            styles.themeBtn,
                            {
                                backgroundColor: bgElevated,
                                borderColor: borderCol,
                            },
                        ]}
                    >
                        {isLight ? (
                            <Sun size={17} color="#D97706" />
                        ) : (
                            <Moon size={17} color="#818CF8" />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* CONTENIDO ANIMADO DE LA PANTALLA */}
            <Animated.View
                style={[
                    styles.contentWrapper,
                    {
                        opacity: contentOpacity,
                        transform: [{ translateY: contentTranslateY }],
                    },
                ]}
            >
                {children}
            </Animated.View>

            {/* BARRA INFERIOR DE ACCESO RÁPIDO MÓVIL */}
            <View
                style={[
                    styles.bottomBar,
                    {
                        backgroundColor: bgSurface,
                        borderTopColor: borderCol,
                    },
                ]}
            >
                {bottomTabs.map((tab) => {
                    const isActive = pathname === tab.href
                    const IconComp = tab.icon

                    if (tab.isPrimary) {
                        return (
                            <TouchableOpacity
                                key={tab.href}
                                onPress={() => router.push(tab.href as any)}
                                activeOpacity={0.85}
                                style={styles.primaryTabBtn}
                            >
                                <View style={styles.primaryTabCircle}>
                                    <IconComp size={24} color="#0F172A" />
                                </View>
                                <Text style={[styles.primaryTabLabel, { color: textPrimary }]}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        )
                    }

                    return (
                        <TouchableOpacity
                            key={tab.href}
                            onPress={() => router.push(tab.href as any)}
                            activeOpacity={0.75}
                            style={styles.tabItem}
                        >
                            <IconComp
                                size={20}
                                color={isActive ? '#D97706' : textSecondary}
                            />
                            <Text
                                style={[
                                    styles.tabLabel,
                                    {
                                        color: isActive ? '#D97706' : textSecondary,
                                        fontWeight: isActive ? '900' : '600',
                                    },
                                ]}
                            >
                                {tab.label}
                            </Text>
                            {isActive && <View style={styles.activeTabDot} />}
                        </TouchableOpacity>
                    )
                })}
            </View>

            {/* MENÚ LATERAL DESPLEGABLE (DRAWER) */}
            {drawerOpen && (
                <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                    <Animated.View
                        style={[
                            StyleSheet.absoluteFill,
                            {
                                backgroundColor: 'rgba(2, 6, 23, 0.65)',
                                opacity: backdropAnim,
                            },
                        ]}
                    >
                        <TouchableOpacity
                            style={StyleSheet.absoluteFill}
                            activeOpacity={1}
                            onPress={() => closeDrawer()}
                        />
                    </Animated.View>

                    <Animated.View
                        style={[
                            styles.drawerContainer,
                            {
                                width: DRAWER_WIDTH,
                                backgroundColor: bgSurface,
                                borderRightColor: borderCol,
                                transform: [{ translateX: drawerAnim }],
                            },
                        ]}
                    >
                        {/* Cabecera del Menú Desplegable */}
                        <View style={[styles.drawerHeader, { borderBottomColor: borderCol }]}>
                            <View style={styles.drawerBrandRow}>
                                <View style={styles.drawerLogoBox}>
                                    <HardHat size={22} color="#0F172A" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.drawerBrandTitle, { color: textPrimary }]}>
                                        LA RAYA MINA
                                    </Text>
                                    <Text style={[styles.drawerBrandSub, { color: textSecondary }]}>
                                        UNIDAD EL HERRERO • SEM 38
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => closeDrawer()}
                                    style={[styles.closeDrawerBtn, { backgroundColor: bgElevated, borderColor: borderCol }]}
                                >
                                    <X size={18} color={textPrimary} />
                                </TouchableOpacity>
                            </View>

                            {/* Tarjeta de Usuario y Nivel de Autorización Actual */}
                            <TouchableOpacity
                                onPress={() => setRoleModalOpen(true)}
                                activeOpacity={0.85}
                                style={[
                                    styles.userRoleCard,
                                    {
                                        backgroundColor: isLight ? '#FEF3C7' : '#1E293B',
                                        borderColor: currentRoleMeta.badgeColor,
                                    },
                                ]}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.userRoleCardLabel, { color: '#D97706' }]}>
                                        NIVEL DE AUTORIZACIÓN ACTIVO
                                    </Text>
                                    <Text style={[styles.userRoleCardTitle, { color: textPrimary }]}>
                                        {currentRoleMeta.label}
                                    </Text>
                                    <Text style={[styles.userRoleCardDesc, { color: textSecondary }]} numberOfLines={2}>
                                        {currentRoleMeta.description}
                                    </Text>
                                </View>
                                <View style={styles.switchRoleBadge}>
                                    <Text style={styles.switchRoleBadgeText}>CAMBIAR</Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Lista de Pilares y Módulos según Autorización */}
                        <ScrollView
                            style={styles.drawerScroll}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 24 }}
                        >
                            {NAV_GROUPS.map((group, gIdx) => (
                                <View key={gIdx} style={styles.navGroup}>
                                    <View style={styles.navGroupHeader}>
                                        <View style={[styles.navGroupDot, { backgroundColor: group.pillarColor }]} />
                                        <Text style={[styles.navGroupTitle, { color: group.pillarColor }]}>
                                            {group.pillarTitle}
                                        </Text>
                                    </View>

                                    {group.items.map((item) => {
                                        const isActive = pathname === item.href
                                        const isLocked = Boolean(item.requiresJefatura && !isJefaturaOrAbove)
                                        const IconComp = item.icon

                                        return (
                                            <TouchableOpacity
                                                key={item.href}
                                                onPress={() => navigateTo(item.href, isLocked)}
                                                activeOpacity={0.75}
                                                style={[
                                                    styles.drawerItem,
                                                    {
                                                        backgroundColor: isActive
                                                            ? '#F59E0B'
                                                            : isLight
                                                            ? '#F8FAFC'
                                                            : '#020617',
                                                        borderColor: isActive
                                                            ? '#D97706'
                                                            : borderCol,
                                                        opacity: isLocked ? 0.65 : 1,
                                                    },
                                                ]}
                                            >
                                                <View
                                                    style={[
                                                        styles.drawerItemIconBox,
                                                        {
                                                            backgroundColor: isActive
                                                                ? '#0F172A'
                                                                : item.accentColor + '18',
                                                        },
                                                    ]}
                                                >
                                                    <IconComp
                                                        size={18}
                                                        color={isActive ? '#F59E0B' : item.accentColor}
                                                    />
                                                </View>

                                                <View style={{ flex: 1, marginRight: 8 }}>
                                                    <Text
                                                        style={[
                                                            styles.drawerItemTitle,
                                                            {
                                                                color: isActive ? '#0F172A' : textPrimary,
                                                            },
                                                        ]}
                                                    >
                                                        {item.label}
                                                    </Text>
                                                    <Text
                                                        style={[
                                                            styles.drawerItemSub,
                                                            {
                                                                color: isActive ? '#1E293B' : textSecondary,
                                                            },
                                                        ]}
                                                        numberOfLines={1}
                                                    >
                                                        {item.subtitle}
                                                    </Text>
                                                </View>

                                                {isLocked ? (
                                                    <View style={styles.lockedBadge}>
                                                        <Lock size={11} color="#E11D48" />
                                                        <Text style={styles.lockedBadgeText}>Jefatura</Text>
                                                    </View>
                                                ) : item.badge ? (
                                                    <View
                                                        style={[
                                                            styles.itemBadge,
                                                            {
                                                                backgroundColor: isActive
                                                                    ? '#0F172A'
                                                                    : item.accentColor + '20',
                                                            },
                                                        ]}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.itemBadgeText,
                                                                {
                                                                    color: isActive ? '#F59E0B' : item.accentColor,
                                                                },
                                                            ]}
                                                        >
                                                            {item.badge}
                                                        </Text>
                                                    </View>
                                                ) : (
                                                    <ChevronRight
                                                        size={16}
                                                        color={isActive ? '#0F172A' : textSecondary}
                                                    />
                                                )}
                                            </TouchableOpacity>
                                        )
                                    })}
                                </View>
                            ))}
                        </ScrollView>

                        {/* Pie del Menú Desplegable */}
                        <View style={[styles.drawerFooter, { borderTopColor: borderCol }]}>
                            <TouchableOpacity
                                onPress={toggleTheme}
                                style={[
                                    styles.footerThemeBtn,
                                    { backgroundColor: bgElevated, borderColor: borderCol },
                                ]}
                            >
                                {isLight ? <Sun size={16} color="#D97706" /> : <Moon size={16} color="#818CF8" />}
                                <Text style={[styles.footerThemeText, { color: textPrimary }]}>
                                    {isLight ? 'Modo Día (Claro Activo)' : 'Modo Noche (Oscuro Activo)'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                                <LogOut size={16} color="#EF4444" />
                                <Text style={styles.logoutText}>Cerrar Sesión ({user?.nickname || 'Activo'})</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            )}

            {/* MODAL DE CAMBIO DE NIVEL JERÁRQUICO / AUTORIZACIÓN */}
            <Modal visible={roleModalOpen} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View
                        style={[
                            styles.modalCard,
                            { backgroundColor: bgSurface, borderColor: borderCol },
                        ]}
                    >
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={[styles.modalTitle, { color: textPrimary }]}>
                                    Nivel de Autorización
                                </Text>
                                <Text style={[styles.modalSub, { color: textSecondary }]}>
                                    Selecciona el perfil jerárquico para adaptar permisos y vistas
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setRoleModalOpen(false)}
                                style={[styles.closeDrawerBtn, { backgroundColor: bgElevated, borderColor: borderCol }]}
                            >
                                <X size={18} color={textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                            {(Object.keys(ROLE_META) as SysRole[]).map((rKey) => {
                                const meta = ROLE_META[rKey]
                                const isCurrent = sysRole === rKey
                                return (
                                    <TouchableOpacity
                                        key={rKey}
                                        onPress={async () => {
                                            await loginAsRole(rKey)
                                            setRoleModalOpen(false)
                                        }}
                                        style={[
                                            styles.roleOptionCard,
                                            {
                                                backgroundColor: isCurrent
                                                    ? meta.badgeColor + '18'
                                                    : bgElevated,
                                                borderColor: isCurrent ? meta.badgeColor : borderCol,
                                            },
                                        ]}
                                    >
                                        <View style={{ flex: 1, marginRight: 8 }}>
                                            <Text style={[styles.roleOptionTitle, { color: textPrimary }]}>
                                                {meta.label}
                                            </Text>
                                            <Text style={[styles.roleOptionDesc, { color: textSecondary }]}>
                                                {meta.description}
                                            </Text>
                                        </View>
                                        {isCurrent && <CheckCircle2 size={20} color={meta.badgeColor} />}
                                    </TouchableOpacity>
                                )
                            })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    )
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
        paddingVertical: 5,
        borderRadius: 8,
        marginLeft: 8,
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
    lockedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFE4E6',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
        gap: 3,
    },
    lockedBadgeText: {
        color: '#E11D48',
        fontSize: 9,
        fontWeight: '900',
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
        backgroundColor: 'rgba(2, 6, 23, 0.7)',
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
        marginBottom: 14,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '900',
    },
    modalSub: {
        fontSize: 11,
        marginTop: 2,
    },
    roleOptionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 13,
        borderRadius: 14,
        borderWidth: 1.5,
        marginBottom: 8,
    },
    roleOptionTitle: {
        fontSize: 13,
        fontWeight: '900',
    },
    roleOptionDesc: {
        fontSize: 11,
        marginTop: 3,
        lineHeight: 15,
    },
})
