import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { Product } from '../services/productService';
import { getRecommendations } from '../services/recommendationService';

export default function RecommendationsScreen({ token, navigation }: { token: string | null; navigation: any }): React.JSX.Element {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getRecommendations(token).then(setProducts).catch((e) => console.warn('Recommendations unavailable', e)).finally(() => setLoading(false)); }, [token]);
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F6F1' }}>
    <Text style={{ fontSize: 25, fontWeight: '800', color: '#294936', margin: 18 }}>You May Also Like</Text>
    {loading ? <ActivityIndicator /> : <FlatList data={products} numColumns={2} keyExtractor={(p) => p._id} renderItem={({ item }) => <TouchableOpacity onPress={() => navigation.navigate('ProductDetail', { productId: item._id, token })} style={{ flex: 1, margin: 8, padding: 10, backgroundColor: 'white', borderRadius: 16 }}><Image source={{ uri: item.image }} style={{ height: 150, borderRadius: 12 }} /><Text style={{ fontWeight: '700', marginTop: 8 }}>{item.name}</Text><Text>₹{item.price}</Text></TouchableOpacity>} ListEmptyComponent={<View style={{ padding: 20 }}><Text>No recommendations available yet.</Text></View>} />}
  </SafeAreaView>;
}
