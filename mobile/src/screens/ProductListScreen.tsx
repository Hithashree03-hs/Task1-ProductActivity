import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';

import {
  getProducts,
  Product,
} from '../services/productService';

import {
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';

import {
  RootStackParamList,
} from '../navigation/AppNavigator';

interface ProductListScreenProps {
  navigation: NativeStackNavigationProp<
    RootStackParamList,
    'Products'
  >;

  token: string;
}

const ProductListScreen = ({
  navigation,
  token,
}: ProductListScreenProps): React.JSX.Element => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProducts = async (): Promise<void> => {
      try {
        const data = await getProducts();

        setProducts(data);
      } catch (err) {
        console.error(
          'Failed to load products:',
          err
        );

        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  const handleProductPress = (
    productId: string
  ): void => {
    navigation.navigate('ProductDetail', {
      productId,
      token,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />

        <Text style={styles.message}>
          Loading products...
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>
        Products
      </Text>

      <FlatList
        data={products}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.productCard}
            onPress={() =>
              handleProductPress(item._id)
            }
          >
            <Text style={styles.productName}>
              {item.name}
            </Text>

            <Text style={styles.category}>
              {item.category}
            </Text>

            <Text style={styles.price}>
              ₹{item.price}
            </Text>

            <Text style={styles.viewText}>
              Tap to view product
            </Text>
          </TouchableOpacity>
        )}
      />
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
  },

  message: {
    marginTop: 10,
  },

  error: {
    fontSize: 16,
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
    marginTop: 5,
  },

  price: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },

  viewText: {
    marginTop: 10,
    fontSize: 13,
  },
});

export default ProductListScreen;