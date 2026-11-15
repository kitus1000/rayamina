import { Stack } from 'expo-router'
import { View } from 'react-native'

export default function DashboardLayout() {
    return (
        <View style={{ flex: 1 }}>
            <Stack
                screenOptions={{
                    headerShown: false,
                    animation: 'fade_from_bottom',
                    contentStyle: { backgroundColor: 'transparent' },
                }}
            >
                <Stack.Screen name="index" />
                <Stack.Screen name="squads" />
                <Stack.Screen name="planning" />
                <Stack.Screen name="payroll" />
                <Stack.Screen name="reports" />
                <Stack.Screen name="reports-new" />
                <Stack.Screen name="tasks" />
                <Stack.Screen name="personnel" />
                <Stack.Screen name="catalogs" />
            </Stack>
        </View>
    )
}
