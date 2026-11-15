import React, { useState } from 'react'
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { HardHat, ShieldCheck, ChevronRight, Lock, Mail, Sparkles } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { useMobileAuth, ROLE_META, SysRole } from '../lib/auth-context'

export default function LoginScreen() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const router = useRouter()
    const { signInWithCredentials, loginAsRole, theme } = useMobileAuth()

    const isLight = theme === 'light'
    const bgMain = isLight ? '#F1F5F9' : '#020617'
    const bgCard = isLight ? '#FFFFFF' : '#0F172A'
    const bgInput = isLight ? '#FEFCE8' : '#020617'
    const borderInput = isLight ? '#D97706' : '#334155'
    const textPrimary = isLight ? '#0F172A' : '#F8FAFC'
    const textSecondary = isLight ? '#475569' : '#94A3B8'

    const handleSignIn = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Campos requeridos', 'Ingresa tu correo corporativo y contraseña.')
            return
        }
        setSubmitting(true)
        const res = await signInWithCredentials(email, password)
        setSubmitting(false)

        if (!res.ok) {
            Alert.alert('Acceso Denegado', res.error || 'No se pudo iniciar sesión.')
            return
        }
        router.replace('/dashboard')
    }

    const handleQuickRole = async (role: SysRole) => {
        setSubmitting(true)
        await loginAsRole(role)
        setSubmitting(false)
        router.replace(ROLE_META[role].defaultRoute as any)
    }

    const quickRoles: SysRole[] = [
        'DIRECTOR_OPERATIVO',
        'GERENTE',
        'SUPERINTENDENTE',
        'JEFE_PLANEACION',
        'SUPERVISOR',
        'SUPER_ADMIN',
    ]

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bgMain }]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Identidad Corporativa */}
                <View style={styles.brandSection}>
                    <View style={styles.logoBadge}>
                        <HardHat size={34} color="#0F172A" />
                    </View>
                    <Text style={[styles.brandTitle, { color: textPrimary }]}>
                        LA RAYA <Text style={{ color: '#D97706' }}>MINA</Text>
                    </Text>
                    <View style={styles.unitPill}>
                        <ShieldCheck size={13} color="#10B981" />
                        <Text style={styles.unitPillText}>
                            UNIDAD EL HERRERO • SEMANA 38 CONECTADA
                        </Text>
                    </View>
                </View>

                {/* Tarjeta de Acceso con Credenciales */}
                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: bgCard,
                            borderColor: isLight ? '#CBD5E1' : '#1E293B',
                        },
                    ]}
                >
                    <View style={styles.cardAccentBar} />
                    <Text style={[styles.cardTitle, { color: textPrimary }]}>
                        Acceso Corporativo Móvil
                    </Text>
                    <Text style={[styles.cardSubtitle, { color: textSecondary }]}>
                        Sincronizado en tiempo real con Supabase y Pre-Nómina Web
                    </Text>

                    <View style={styles.fieldGroup}>
                        <Text style={[styles.fieldLabel, { color: textPrimary }]}>
                            CORREO CORPORATIVO
                        </Text>
                        <View
                            style={[
                                styles.inputWrapper,
                                { backgroundColor: bgInput, borderColor: borderInput },
                            ]}
                        >
                            <Mail size={18} color="#D97706" />
                            <TextInput
                                value={email}
                                onChangeText={setEmail}
                                placeholder="usuario@rayamina.com"
                                placeholderTextColor="#64748B"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                style={[styles.input, { color: textPrimary }]}
                            />
                        </View>
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={[styles.fieldLabel, { color: textPrimary }]}>
                            CONTRASEÑA DE ACCESO
                        </Text>
                        <View
                            style={[
                                styles.inputWrapper,
                                { backgroundColor: bgInput, borderColor: borderInput },
                            ]}
                        >
                            <Lock size={18} color="#D97706" />
                            <TextInput
                                value={password}
                                onChangeText={setPassword}
                                placeholder="••••••••"
                                placeholderTextColor="#64748B"
                                secureTextEntry
                                autoCapitalize="none"
                                style={[styles.input, { color: textPrimary }]}
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={handleSignIn}
                        disabled={submitting}
                        activeOpacity={0.85}
                        style={styles.submitBtn}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#0F172A" />
                        ) : (
                            <>
                                <Text style={styles.submitBtnText}>INGRESAR AL SISTEMA</Text>
                                <ChevronRight size={20} color="#0F172A" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Selector Directo por Nivel de Autorización */}
                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: bgCard,
                            borderColor: isLight ? '#CBD5E1' : '#1E293B',
                            marginTop: 16,
                        },
                    ]}
                >
                    <View style={styles.quickHeader}>
                        <Sparkles size={16} color="#D97706" />
                        <Text style={[styles.quickTitle, { color: textPrimary }]}>
                            ACCESO DIRECTO POR NIVEL DE AUTORIZACIÓN
                        </Text>
                    </View>
                    <Text style={[styles.quickSub, { color: textSecondary }]}>
                        Selecciona tu puesto para entrar con las herramientas y reglas correspondientes a tu jerarquía:
                    </Text>

                    {quickRoles.map((roleKey) => {
                        const meta = ROLE_META[roleKey]
                        return (
                            <TouchableOpacity
                                key={roleKey}
                                onPress={() => handleQuickRole(roleKey)}
                                activeOpacity={0.8}
                                style={[
                                    styles.roleBtn,
                                    {
                                        backgroundColor: isLight ? '#F8FAFC' : '#020617',
                                        borderColor: meta.badgeColor + '60',
                                    },
                                ]}
                            >
                                <View
                                    style={[
                                        styles.roleDot,
                                        { backgroundColor: meta.badgeColor },
                                    ]}
                                />
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={[styles.roleBtnTitle, { color: textPrimary }]}>
                                        {meta.label}
                                    </Text>
                                    <Text
                                        style={[styles.roleBtnDesc, { color: textSecondary }]}
                                        numberOfLines={2}
                                    >
                                        {meta.description}
                                    </Text>
                                </View>
                                <ChevronRight size={18} color={meta.badgeColor} />
                            </TouchableOpacity>
                        )
                    })}
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 18,
        paddingBottom: 40,
    },
    brandSection: {
        alignItems: 'center',
        marginVertical: 16,
    },
    logoBadge: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: '#F59E0B',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        elevation: 6,
    },
    brandTitle: {
        fontSize: 26,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    unitPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0F172A',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        marginTop: 6,
        gap: 6,
    },
    unitPillText: {
        color: '#F8FAFC',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.6,
    },
    card: {
        borderRadius: 22,
        borderWidth: 1.5,
        padding: 18,
        overflow: 'hidden',
    },
    cardAccentBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 5,
        backgroundColor: '#F59E0B',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '900',
        marginTop: 4,
    },
    cardSubtitle: {
        fontSize: 12,
        marginTop: 2,
        marginBottom: 16,
    },
    fieldGroup: {
        marginBottom: 14,
    },
    fieldLabel: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.8,
        marginBottom: 6,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 14,
        paddingHorizontal: 12,
        height: 48,
    },
    input: {
        flex: 1,
        marginLeft: 10,
        fontSize: 14,
        fontWeight: '700',
    },
    submitBtn: {
        backgroundColor: '#F59E0B',
        height: 50,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 6,
        gap: 8,
    },
    submitBtnText: {
        color: '#0F172A',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 0.8,
    },
    quickHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    quickTitle: {
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    quickSub: {
        fontSize: 11,
        marginTop: 4,
        marginBottom: 12,
        lineHeight: 15,
    },
    roleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1.5,
        marginBottom: 8,
    },
    roleDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 10,
    },
    roleBtnTitle: {
        fontSize: 13,
        fontWeight: '900',
    },
    roleBtnDesc: {
        fontSize: 10,
        marginTop: 2,
        lineHeight: 14,
    },
})
