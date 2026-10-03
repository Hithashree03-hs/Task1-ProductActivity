import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  ContinueShoppingItem,
  getContinueShopping,
} from '../services/continueShoppingService';
import { addToCart } from '../services/cartService';
import { addToWishlist } from '../services/wishlistService';

interface ContinueShoppingScreenProps {
  token?: string | null;
}

const ContinueShoppingScreen = ({
  token,
}: ContinueShoppingScreenProps): React.JSX.Element => {
   if (!token) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyText}>
          Please log in to view Continue Shopping.
        </Text>
      </SafeAreaView>
    );
  }

  
  const [products, setProducts] = useState<ContinueShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContinueShopping = async (): Promise<void> => {
      try {
        const data = await getContinueShopping(token);
        setProducts(data);
      } catch (error) {
        console.error(
          'Failed to load continue shopping:',
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadContinueShopping();
  }, [token]);

  const handleAddToCart = async (
    productId: string
  ): Promise<void> => {
    try {
      await addToCart(token, productId);

      // Remove the item from this screen after
      // successfully adding it to the cart.
      setProducts((currentProducts) =>
        currentProducts.filter(
          (item) => item.product._id !== productId
        )
      );
    } catch (error) {
      console.error(
        'Failed to add product to cart:',
        error
      );
    }
  };

  const handleAddToWishlist = async (
    productId: string
  ): Promise<void> => {
    try {
      await addToWishlist(token, productId);
    } catch (error) {
      console.error(
        'Failed to add product to wishlist:',
        error
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Loading Continue Shopping...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>
        Continue Shopping
      </Text>

      {products.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            No products to continue shopping.
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.product._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.productName}>
                {item.product.name}
              </Text>

              <Text style={styles.category}>
                {item.product.category}
              </Text>

              <Text style={styles.price}>
                ₹{item.product.price}
              </Text>

              <Text style={styles.viewedAt}>
                Viewed recently
              </Text>

              <TouchableOpacity
                style={styles.cartButton}
                onPress={() =>
                  handleAddToCart(item.product._id)
                }
              >
                <Text style={styles.buttonText}>
                  Add to Cart
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.wishlistButton}
                onPress={() =>
                  handleAddToWishlist(
                    item.product._id
                  )
                }
              >
                <Text style={styles.wishlistText}>
                  Add to Wishlist
                </Text>
              </TouchableOpacity>
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

  loadingText: {
    marginTop: 10,
  },

  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    padding: 20,
  },

  list: {
    padding: 20,
    paddingBottom: 30,
  },

  card: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
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

  viewedAt: {
    marginTop: 6,
    fontSize: 13,
  },

  cartButton: {
    marginTop: 14,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: '#222',
  },

  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  wishlistButton: {
    marginTop: 8,
    padding: 12,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
  },

  wishlistText: {
    fontWeight: 'bold',
  },
});

export default ContinueShoppingScreen;