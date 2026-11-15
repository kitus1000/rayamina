import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useMobileAuth } from '../lib/auth-context';

export default function Index() {
  const { user, loading, getFirstAllowedApkRoute } = useMobileAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Verificando credencial encriptada...</Text>
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  const targetRoute = getFirstAllowedApkRoute();
  return <Redirect href={targetRoute as any} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  loadingText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
