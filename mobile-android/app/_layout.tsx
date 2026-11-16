import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context'
import { AuthProvider } from '../lib/auth-context'
import '../global.css'

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider initialMetrics={initialWindowMetrics}>
                <AuthProvider>
                    <StatusBar style="auto" />
                    <Stack
                        screenOptions={{
                            headerShown: false,
                            animation: 'slide_from_right',
                        }}
                    >
                        <Stack.Screen name="index" />
                        <Stack.Screen name="login" />
                        <Stack.Screen name="dashboard" />
                    </Stack>
                </AuthProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    )
}
