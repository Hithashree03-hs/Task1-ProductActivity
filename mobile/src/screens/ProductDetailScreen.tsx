import React, { useEffect, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
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

import {
  addToCart,
} from '../services/cartService';

import {
  addToWishlist,
  removeFromWishlist,
} from '../services/wishlistService';
import { useTheme } from '../theme/ThemeProvider';
import { ThemeColors } from '../theme/theme';

type ProductDetailScreenProps =
  NativeStackScreenProps<
    RootStackParamList,
    'ProductDetail'
  >;

const ProductDetailScreen = ({
  route,
}: ProductDetailScreenProps): React.JSX.Element => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const {
    productId,
    token,
  } = route.params;

  const [product, setProduct] =
    useState<Product | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [cartLoading, setCartLoading] =
    useState(false);

  const [wishlistLoading, setWishlistLoading] =
    useState(false);

  const [isWishlisted, setIsWishlisted] =
    useState(false);

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
          await recordLocalView(
            productId
          );
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

  const handleAddToCart =
    async (): Promise<void> => {
      if (!token) {
        Alert.alert(
          'Login Required',
          'Please log in to add products to your cart.'
        );
        return;
      }

      try {
        setCartLoading(true);

        await addToCart(
          token,
          productId
        );

        Alert.alert(
          'Added to Cart',
          'Product was added to your cart successfully.'
        );
      } catch (error) {
        console.error(
          'Failed to add product to cart:',
          error
        );

        Alert.alert(
          'Error',
          'Failed to add product to cart.'
        );
      } finally {
        setCartLoading(false);
      }
    };

  const handleWishlistToggle =
    async (): Promise<void> => {
      if (!token) {
        Alert.alert(
          'Login Required',
          'Please log in to manage your wishlist.'
        );
        return;
      }

      try {
        setWishlistLoading(true);

        if (isWishlisted) {
          await removeFromWishlist(
            token,
            productId
          );

          setIsWishlisted(false);
        } else {
          await addToWishlist(
            token,
            productId
          );

          setIsWishlisted(true);
        }
      } catch (error) {
        console.error(
          'Wishlist toggle error:',
          error
        );

        Alert.alert(
          'Error',
          'Unable to update wishlist.'
        );
      } finally {
        setWishlistLoading(false);
      }
    };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator
          size="large"
        />

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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
      >
        <Image
          source={{
            uri: product.image,
          }}
          style={styles.productImage}
          resizeMode="contain"
        />

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

          <View
            style={
              styles.actionContainer
            }
          >
            <TouchableOpacity
              style={[
                styles.wishlistButton,
                wishlistLoading &&
                  styles.disabledButton,
              ]}
              onPress={
                handleWishlistToggle
              }
              disabled={wishlistLoading}
              activeOpacity={0.8}
            >
              <Text
                style={styles.wishlistIcon}
              >
                {isWishlisted
                  ? '♥'
                  : '♡'}
              </Text>

              <Text
                style={styles.wishlistText}
              >
                {wishlistLoading
                  ? 'Updating...'
                  : isWishlisted
                    ? 'Remove from Wishlist'
                    : 'Add to Wishlist'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.cartButton,
                cartLoading &&
                  styles.disabledButton,
              ]}
              onPress={
                handleAddToCart
              }
              disabled={cartLoading}
              activeOpacity={0.8}
            >
              <Text
                style={styles.cartIcon}
              >
                🛒
              </Text>

              <Text
                style={styles.cartText}
              >
                {cartLoading
                  ? 'Adding...'
                  : 'Add to Cart'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },

  scrollContent: {
    paddingBottom: 35,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 25,
    backgroundColor: c.background,
  },

  loadingText: {
    marginTop: 10,
    fontSize: 15,
    color: c.muted,
  },

  errorText: {
    fontSize: 16,
    color: c.primaryDark,
    fontWeight: '700',
  },

  productImage: {
    width: '100%',
    height: 340,
    backgroundColor: c.surfaceAlt,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  content: {
    marginTop: -8,
    padding: 22,
  },

  name: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    color: c.text,
  },

  category: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: c.surfaceAlt,
    color: c.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },

  description: {
    marginTop: 20,
    fontSize: 15,
    lineHeight: 24,
    color: c.muted,
  },

  price: {
    marginTop: 20,
    fontSize: 30,
    fontWeight: '900',
    color: c.primaryDark,
  },

  stock: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    color: c.primary,
  },

  actionContainer: {
    marginTop: 25,
  },

  wishlistButton: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: c.surfaceRose,
  },

  wishlistIcon: {
    fontSize: 24,
    marginRight: 9,
    color: c.danger,
  },

  wishlistText: {
    fontSize: 15,
    fontWeight: '800',
    color: c.primaryDark,
  },

  cartButton: {
    minHeight: 57,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: c.primaryDark,
  },

  cartIcon: {
    fontSize: 20,
    marginRight: 9,
  },

  cartText: {
    color: c.whiteText,
    fontSize: 16,
    fontWeight: '800',
  },

  disabledButton: {
    opacity: 0.55,
  },
});

export default ProductDetailScreen;
