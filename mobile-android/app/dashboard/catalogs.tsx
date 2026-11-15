import React, { useState } from 'react'
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    ScrollView,
    StyleSheet,
} from 'react-native'
import { Pickaxe, MapPin, Building2, Users, Truck, Coins } from 'lucide-react-native'
import { useCatalog } from '../../hooks/use-catalog'
import { useMobileAuth } from '../../lib/auth-context'
import MobileShell from '../../components/MobileShell'

const TABS = [
    { id: 'ubicaciones', label: 'Frentes / Rebajes', table: 'mine_locations', icon: MapPin },
    { id: 'productos', label: 'Conceptos y Tarifas', table: 'cat_productos_mina', icon: Coins },
    { id: 'equipos', label: 'Flota Equipos', table: 'ops_equipment', icon: Truck },
    { id: 'puestos', label: 'Puestos Oficiales', table: 'cat_puestos', icon: Users },
    { id: 'minas', label: 'Minas', table: 'mine_sites', icon: Pickaxe },
    { id: 'unidades', label: 'Unidades', table: 'org_units', icon: Building2 },
]

export default function CatalogsScreen() {
    const { theme } = useMobileAuth()
    const [activeTab, setActiveTab] = useState(TABS[0])
    const { data: records, loading, refresh } = useCatalog<any>(activeTab.table, '*')

    const isLight = theme === 'light'
    const bgCard = isLight ? '#FFFFFF' : '#0F172A'
    const borderCol = isLight ? '#CBD5E1' : '#1E293B'
    const textPrimary = isLight ? '#0F172A' : '#F8FAFC'
    const textSecondary = isLight ? '#475569' : '#94A3B8'

    const renderItem = ({ item }: { item: any }) => {
        const title =
            item.nombre ||
            item.nombre_unidad ||
            item.nombre_mina ||
            item.clave ||
            item.codigo ||
            'Registro'
        const sub =
            item.tarifa_pago !== undefined
                ? `Tarifa: $${item.tarifa_pago} / ${item.unidad_medida_default || 'und'} • ${item.categoria || ''}`
                : item.marca
                ? `${item.tipo || 'Equipo'} • ${item.marca} ${item.modelo || ''}`
                : item.tipo || item.tipo_personal || item.codigo || 'Activo en sistema'
        const IconComp = activeTab.icon

        return (
            <View
                style={[
                    styles.card,
                    { backgroundColor: bgCard, borderColor: borderCol },
                ]}
            >
                <View style={styles.iconBox}>
                    <IconComp color="#A855F7" size={20} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: textPrimary }]}>{title}</Text>
                    <Text style={[styles.sub, { color: textSecondary }]}>{sub}</Text>
                </View>
            </View>
        )
    }

    return (
        <MobileShell
            title="Catálogos Maestros"
            pillar="5. Sistema y Catálogos"
            pillarHex="#A855F7"
        >
            <View style={{ flex: 1 }}>
                <View style={[styles.tabsWrap, { borderBottomColor: borderCol }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {TABS.map((tab) => {
                            const isSel = activeTab.id === tab.id
                            return (
                                <TouchableOpacity
                                    key={tab.id}
                                    onPress={() => setActiveTab(tab)}
                                    style={[
                                        styles.tabBtn,
                                        {
                                            backgroundColor: isSel ? '#A855F7' : bgCard,
                                            borderColor: isSel ? '#9333EA' : borderCol,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            fontWeight: '900',
                                            color: isSel ? '#FFFFFF' : textSecondary,
                                        }}
                                    >
                                        {tab.label}
                                    </Text>
                                </TouchableOpacity>
                            )
                        })}
                    </ScrollView>
                </View>

                <View style={styles.listWrap}>
                    {loading ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator size="large" color="#A855F7" />
                        </View>
                    ) : (
                        <FlatList
                            data={records}
                            keyExtractor={(item: any) => item.id}
                            renderItem={renderItem}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 24 }}
                            refreshing={loading}
                            onRefresh={refresh}
                        />
                    )}
                </View>
            </View>
        </MobileShell>
    )
}

const styles = StyleSheet.create({
    tabsWrap: {
        paddingVertical: 10,
        paddingLeft: 14,
        borderBottomWidth: 1,
    },
    tabBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.5,
        marginRight: 8,
    },
    listWrap: {
        flex: 1,
        paddingHorizontal: 14,
        paddingTop: 12,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1,
        padding: 13,
        marginBottom: 8,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#A855F720',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    title: {
        fontSize: 14,
        fontWeight: '900',
    },
    sub: {
        fontSize: 11,
        marginTop: 2,
    },
})
