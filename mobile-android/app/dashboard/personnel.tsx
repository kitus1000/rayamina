import React, { useState } from 'react'
import {
    View,
    Text,
    FlatList,
    ActivityIndicator,
    TextInput,
    StyleSheet,
} from 'react-native'
import { UserCircle2, Search } from 'lucide-react-native'
import { useCatalog } from '../../hooks/use-catalog'
import { useMobileAuth } from '../../lib/auth-context'
import MobileShell from '../../components/MobileShell'

export default function PersonnelScreen() {
    const { theme } = useMobileAuth()
    const [search, setSearch] = useState('')
    const { data: employees, loading, refresh } = useCatalog<any>(
        'rh_employees',
        '*, cat_puestos(nombre), cat_roles_operativos(nombre)'
    )

    const isLight = theme === 'light'
    const bgCard = isLight ? '#FFFFFF' : '#0F172A'
    const bgInput = isLight ? '#FEFCE8' : '#020617'
    const borderCol = isLight ? '#CBD5E1' : '#1E293B'
    const textPrimary = isLight ? '#0F172A' : '#F8FAFC'
    const textSecondary = isLight ? '#475569' : '#94A3B8'

    const filtered = (employees || []).filter((item: any) => {
        const fullName = `${item.first_name || ''} ${item.last_name || ''}`.toLowerCase()
        const puesto = (item.cat_puestos?.nombre || '').toLowerCase()
        return (
            fullName.includes(search.toLowerCase()) ||
            puesto.includes(search.toLowerCase())
        )
    })

    const renderItem = ({ item }: { item: any }) => {
        const isJefe = Boolean(item.is_jefe)
        const puesto = Array.isArray(item.cat_puestos)
            ? item.cat_puestos[0]?.nombre
            : item.cat_puestos?.nombre || 'Operador'

        return (
            <View
                style={[
                    styles.card,
                    {
                        backgroundColor: bgCard,
                        borderColor: isJefe ? '#F59E0B' : borderCol,
                    },
                ]}
            >
                <View
                    style={[
                        styles.avatarBox,
                        { backgroundColor: isJefe ? '#F59E0B20' : '#10B98120' },
                    ]}
                >
                    <UserCircle2 color={isJefe ? '#D97706' : '#10B981'} size={28} />
                </View>

                <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.name, { color: textPrimary }]}>
                        {item.first_name} {item.last_name}
                    </Text>
                    <Text style={[styles.sub, { color: textSecondary }]}>
                        {item.employee_code || 'S/C'} • {puesto}
                    </Text>
                </View>

                <View
                    style={[
                        styles.badge,
                        { backgroundColor: isJefe ? '#F59E0B20' : '#10B98120' },
                    ]}
                >
                    <Text
                        style={{
                            fontSize: 9,
                            fontWeight: '900',
                            color: isJefe ? '#D97706' : '#059669',
                        }}
                    >
                        {isJefe ? 'MANDO / JEFE' : 'OPERATIVO'}
                    </Text>
                </View>
            </View>
        )
    }

    return (
        <MobileShell
            title={`Fuerza Operativa (${filtered.length})`}
            pillar="3. Operación Mina"
            pillarHex="#10B981"
        >
            <View style={styles.container}>
                <View
                    style={[
                        styles.searchBox,
                        { backgroundColor: bgInput, borderColor: '#10B981' },
                    ]}
                >
                    <Search size={18} color="#10B981" />
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Buscar minero o puesto oficial..."
                        placeholderTextColor="#64748B"
                        style={[styles.searchInput, { color: textPrimary }]}
                    />
                </View>

                {loading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#10B981" />
                    </View>
                ) : (
                    <FlatList
                        data={filtered}
                        keyExtractor={(item: any) => item.id}
                        renderItem={renderItem}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 24 }}
                        refreshing={loading}
                        onRefresh={refresh}
                    />
                )}
            </View>
        </MobileShell>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 14,
        paddingTop: 12,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 14,
        paddingHorizontal: 12,
        height: 46,
        marginBottom: 12,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 13,
        fontWeight: '700',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1.5,
        padding: 12,
        marginBottom: 8,
    },
    avatarBox: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    name: {
        fontSize: 13,
        fontWeight: '900',
    },
    sub: {
        fontSize: 11,
        marginTop: 2,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
})
