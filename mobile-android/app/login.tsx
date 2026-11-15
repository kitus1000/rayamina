import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  HardHat,
  Lock,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react-native';
import { useMobileAuth } from '../lib/auth-context';

export default function LoginScreen() {
  const { user, theme, loginWithCredentials, getFirstAllowedApkRoute } = useMobileAuth();
  const isLight = theme === 'light';
  const colors = {
    bgMain: isLight ? '#F8FAFC' : '#020617',
    bgCard: isLight ? '#FFFFFF' : '#0F172A',
    bgInput: isLight ? '#F1F5F9' : '#1E293B',
    border: isLight ? '#CBD5E1' : '#334155',
    textPrimary: isLight ? '#0F172A' : '#F8FAFC',
    textSecondary: isLight ? '#334155' : '#CBD5E1',
    textMuted: isLight ? '#64748B' : '#94A3B8',
  };
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Animaciones de entrada y escudo de seguridad
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;
  const shieldPulse = useRef(new Animated.Value(1)).current;
  const laserSweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(shieldPulse, {
          toValue: 1.07,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shieldPulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(laserSweep, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(laserSweep, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim, slideAnim, shieldPulse, laserSweep]);

  useEffect(() => {
    if (user) {
      const target = getFirstAllowedApkRoute();
      router.replace(target as any);
    }
  }, [user, getFirstAllowedApkRoute, router]);

  const handleLogin = async () => {
    setErrorMsg('');
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Ingresa tu correo corporativo y tu contraseña asignada en el sistema.');
      return;
    }

    setLoading(true);
    const res = await loginWithCredentials(email, password);
    setLoading(false);

    if (res.ok) {
      const target = getFirstAllowedApkRoute();
      router.replace(target as any);
    } else {
      setErrorMsg(res.error || 'Credenciales no autorizadas.');
    }
  };

  const laserTranslateX = laserSweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 240],
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.bgMain }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* CABECERA CORPORATIVA BLINDADA */}
          <View style={styles.brandBox}>
            <Animated.View
              style={[
                styles.logoShieldWrap,
                { transform: [{ scale: shieldPulse }] },
              ]}
            >
              <View style={styles.logoCircle}>
                <HardHat color="#0f172a" size={34} />
              </View>
              <View style={styles.shieldCornerBadge}>
                <ShieldCheck color="#022c22" size={14} />
              </View>
            </Animated.View>

            <View style={styles.securityPill}>
              <View style={styles.securityDot} />
              <Text style={styles.securityPillText}>
                ACCESO ENCRIPTADO • CONTROL DE VISTAS ACTIVO
              </Text>
            </View>

            <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>
              LA RAYA MINA
            </Text>
            <Text style={styles.brandSub}>
              PLATAFORMA MÓVIL OFICIAL • SEMANA 38
            </Text>
          </View>

          {/* TARJETA DE ACCESO CORPORATIVO */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.bgCard,
                borderColor: colors.border,
              },
            ]}
          >
            {/* Barra láser animada superior */}
            <View style={styles.laserTrack}>
              <Animated.View
                style={[
                  styles.laserBeam,
                  { transform: [{ translateX: laserTranslateX }] },
                ]}
              />
            </View>

            <View style={styles.cardHeaderRow}>
              <ShieldCheck color="#10b981" size={18} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Credenciales de Usuario Autorizado
              </Text>
            </View>

            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
              Ingresa únicamente con la cuenta creada por el Administrador en el sistema central.
            </Text>

            {errorMsg ? (
              <View style={styles.errorBanner}>
                <AlertTriangle color="#f43f5e" size={16} />
                <Text style={styles.errorBannerText}>{errorMsg}</Text>
              </View>
            ) : null}

            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
              CORREO CORPORATIVO REGISTRADO
            </Text>
            <View
              style={[
                styles.inputRow,
                {
                  backgroundColor: colors.bgInput,
                  borderColor: colors.border,
                },
              ]}
            >
              <Mail color={colors.textMuted} size={18} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="usuario@rayamina.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={(txt) => {
                  setEmail(txt);
                  if (errorMsg) setErrorMsg('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
            </View>

            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
              CONTRASEÑA DE SEGURIDAD
            </Text>
            <View
              style={[
                styles.inputRow,
                {
                  backgroundColor: colors.bgInput,
                  borderColor: colors.border,
                },
              ]}
            >
              <Lock color={colors.textMuted} size={18} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={(txt) => {
                  setPassword(txt);
                  if (errorMsg) setErrorMsg('');
                }}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showPassword ? (
                  <EyeOff color={colors.textMuted} size={18} />
                ) : (
                  <Eye color={colors.textMuted} size={18} />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <View style={styles.btnContentRow}>
                  <ActivityIndicator color="#0f172a" size="small" />
                  <Text style={styles.primaryBtnText}>
                    VERIFICANDO AUTORIZACIÓN...
                  </Text>
                </View>
              ) : (
                <View style={styles.btnContentRow}>
                  <ShieldCheck color="#0f172a" size={18} />
                  <Text style={styles.primaryBtnText}>
                    INGRESAR A OPERACIÓN MINA
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* SELLO DE PROTECCIÓN DE PRECIOS, TONELAJE Y VISTAS */}
          <View
            style={[
              styles.securityFooterCard,
              {
                backgroundColor: colors.bgCard,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.securityFooterHeader}>
              <CheckCircle2 color="#10b981" size={15} />
              <Text style={styles.securityFooterTitle}>
                SINCRONIZACIÓN CENTRALIZADA WEB → APK
              </Text>
            </View>
            <Text style={[styles.securityFooterText, { color: colors.textSecondary }]}>
              Las pantallas visibles, precios unitarios, toneladas y Pre-Nómina se reflejan automáticamente de acuerdo con los permisos asignados a tu usuario en la aplicación central.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingVertical: 36,
  },
  brandBox: { alignItems: 'center', marginBottom: 22 },
  logoShieldWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
  },
  shieldCornerBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    marginBottom: 8,
  },
  securityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  securityPillText: {
    color: '#10b981',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  brandSub: {
    fontSize: 11,
    fontWeight: '800',
    color: '#f59e0b',
    marginTop: 3,
    letterSpacing: 1,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    overflow: 'hidden',
  },
  laserTrack: {
    height: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 2,
    marginBottom: 14,
    overflow: 'hidden',
  },
  laserBeam: {
    width: 110,
    height: 3,
    backgroundColor: '#f59e0b',
    borderRadius: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(244, 63, 94, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.45)',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorBannerText: {
    flex: 1,
    color: '#fda4af',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  primaryBtn: {
    backgroundColor: '#f59e0b',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    elevation: 4,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#0f172a',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  securityFooterCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  securityFooterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  securityFooterTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#10b981',
    letterSpacing: 0.6,
  },
  securityFooterText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
});
