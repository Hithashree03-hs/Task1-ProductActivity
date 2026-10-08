import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Product } from '../services/productService';
import { getRecommendations } from '../services/recommendationService';
import { useTheme } from '../theme/ThemeProvider';
import { getSocket } from '../services/socketService';

export default function RecommendationsScreen({ token, navigation }: { token: string | null; navigation: any }): React.JSX.Element {
  const { colors, spacing, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, spacing, typography), [colors, spacing, typography]);
  const [products, setProducts] = useState<Product[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const refresh = () => { getRecommendations(token).then((items) => { if (active) setProducts(items); }).catch((error) => console.warn('Recommendations unavailable', error)).finally(() => { if (active) setLoading(false); }); };
    refresh();
    const socket = getSocket(); socket?.on('recommendationsUpdated', refresh); socket?.on('recentlyViewedUpdated', refresh);
    return () => { active = false; socket?.off('recommendationsUpdated', refresh); socket?.off('recentlyViewedUpdated', refresh); };
  }, [token]);
  return <SafeAreaView style={styles.screen}><Text style={styles.title}>You May Also Like</Text><Text style={styles.subtitle}>A selection based on what you browse and save.</Text>
    {loading ? <ActivityIndicator color={colors.primary} /> : <FlatList data={products} numColumns={2} keyExtractor={(product) => product._id} contentContainerStyle={styles.list} columnWrapperStyle={styles.row} renderItem={({ item }) => <TouchableOpacity onPress={() => navigation.navigate('ProductDetail', { productId: item._id, token })} style={styles.card}><Image source={{ uri: item.image }} style={styles.image} /><View style={styles.cardContent}><Text style={styles.category}>{item.category}</Text><Text style={styles.productName} numberOfLines={2}>{item.name}</Text><Text style={styles.price}>₹{item.price}</Text></View></TouchableOpacity>} ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No recommendations available yet.</Text></View>} />}
  </SafeAreaView>;
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors'], s: ReturnType<typeof useTheme>['spacing'], t: ReturnType<typeof useTheme>['typography']) => StyleSheet.create({ screen: { flex: 1, backgroundColor: c.background }, title: { fontSize: t.title, fontWeight: t.weight.bold, color: c.text, margin: s.md }, subtitle: { color: c.muted, fontSize: t.body, marginHorizontal: s.md, marginTop: -s.sm, marginBottom: s.md }, list: { paddingHorizontal: s.sm, paddingBottom: s.xl }, row: { gap: s.sm }, card: { flex: 1, marginBottom: s.sm, overflow: 'hidden', borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, elevation: 2 }, image: { width: '100%', height: 170, backgroundColor: c.surfaceAlt }, cardContent: { padding: s.md }, category: { color: c.info, fontSize: t.caption, fontWeight: t.weight.medium }, productName: { color: c.text, fontSize: t.body, fontWeight: t.weight.bold, marginTop: s.xs }, price: { color: c.success, fontSize: t.heading, fontWeight: t.weight.bold, marginTop: s.sm }, empty: { padding: s.xl, alignItems: 'center' }, emptyText: { color: c.muted } });
