import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import {
  getRecentlyViewed,
  RecentlyViewedItem,
} from '../services/recentlyViewedService';

const RecentlyViewedScreen = (): React.JSX.Element => {
  const [products, setProducts] = useState<RecentlyViewedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Temporary token for testing.
  // We will replace this with the real login token later.
  const token = 'TEMP_TOKEN';

  const loadRecentlyViewed = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError('');

      const data = await getRecentlyViewed(token);

      setProducts(data);
    } catch (err) {
      console.error(
        'Failed to load recently viewed products:',
        err
      );

      setError('Failed to load recently viewed products');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadRecentlyViewed();
    }, [loadRecentlyViewed])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />

        <Text style={styles.message}>
          Loading recently viewed products...
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>
          {error}
        </Text>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadRecentlyViewed}
        >
          <Text style={styles.retryText}>
            Try Again
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>
        Recently Viewed
      </Text>

      {products.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            You haven't viewed any products yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.product._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.productCard}>
              <Text style={styles.productName}>
                {item.product.name}
              </Text>

              <Text style={styles.category}>
                {item.product.category}
              </Text>

              <Text style={styles.price}>
                ₹{item.product.price}
              </Text>

              <Text style={styles.viewedText}>
                Recently viewed
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  message: {
    marginTop: 10,
    textAlign: 'center',
  },

  error: {
    fontSize: 16,
    textAlign: 'center',
  },

  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },

  retryButton: {
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
  },

  retryText: {
    fontWeight: 'bold',
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    padding: 20,
  },

  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  productCard: {
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 8,
  },

  productName: {
    fontSize: 18,
    fontWeight: 'bold',
  },

  category: {
    marginTop: 6,
    fontSize: 14,
  },

  price: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: 'bold',
  },

  viewedText: {
    marginTop: 8,
    fontSize: 13,
  },
});

export default RecentlyViewedScreen;