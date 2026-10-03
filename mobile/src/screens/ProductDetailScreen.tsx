import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import {
  RootStackParamList,
} from '../navigation/AppNavigator';

import {
  getProductById,
  Product,
} from '../services/productService';

import {
  recordLocalView,
} from '../services/anonymousHistoryService';

import {
  recordProductView,
} from '../services/recentlyViewedService';

type ProductDetailScreenProps =
  NativeStackScreenProps<
    RootStackParamList,
    'ProductDetail'
  >;

const ProductDetailScreen = ({
  route,
}: ProductDetailScreenProps): React.JSX.Element => {
  const { productId, token } = route.params;

  const [product, setProduct] =
    useState<Product | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const loadProduct = async (): Promise<void> => {
      try {
        const data =
          await getProductById(productId);

        setProduct(data);

        if (token) {
          await recordProductView(
            token,
            productId
          );
        } else {
          await recordLocalView(productId);
        }
      } catch (error) {
        console.error(
          'Failed to load product:',
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [productId, token]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Loading product...
        </Text>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>
          Product not found
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.name}>
          {product.name}
        </Text>

        <Text style={styles.category}>
          {product.category}
        </Text>

        <Text style={styles.description}>
          {product.description}
        </Text>

        <Text style={styles.price}>
          ₹{product.price}
        </Text>

        <Text style={styles.stock}>
          Stock: {product.stock}
        </Text>
      </View>
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

  loadingText: {
    marginTop: 10,
  },

  errorText: {
    fontSize: 16,
  },

  content: {
    padding: 20,
  },

  name: {
    fontSize: 28,
    fontWeight: 'bold',
  },

  category: {
    marginTop: 8,
    fontSize: 16,
  },

  description: {
    marginTop: 20,
    fontSize: 16,
    lineHeight: 24,
  },

  price: {
    marginTop: 20,
    fontSize: 24,
    fontWeight: 'bold',
  },

  stock: {
    marginTop: 10,
    fontSize: 16,
  },
});

export default ProductDetailScreen;