import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
import { useTheme } from '../theme/ThemeProvider';

interface ContinueShoppingScreenProps {
  token?: string | null;
}

const ContinueShoppingScreen = ({
  token,
}: ContinueShoppingScreenProps): React.JSX.Element => {
  const { colors } = useTheme();
  const COLORS = { background: colors.background, primary: colors.primary, primaryDark: colors.primaryDark, softGreen: colors.surfaceAlt, softRose: colors.surfaceRose, card: colors.surface, text: colors.text, secondaryText: colors.muted, border: colors.border, shadow: colors.shadow, whiteText: colors.whiteText };
  const styles = useMemo(() => makeStyles(COLORS), [colors]);
  const [products, setProducts] = useState<
    ContinueShoppingItem[]
  >([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const loadContinueShopping =
      async (): Promise<void> => {
        try {
          const data =
            await getContinueShopping(token);

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
    if (!token) {
      Alert.alert(
        'Login Required',
        'Please log in to add products to your cart.'
      );
      return;
    }

    try {
      await addToCart(token, productId);

      Alert.alert(
        'Added to Cart',
        'Product added to your cart.'
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
    }
  };

  const handleAddToWishlist = async (
    productId: string
  ): Promise<void> => {
    if (!token) {
      Alert.alert(
        'Login Required',
        'Please log in to add products to your wishlist.'
      );
      return;
    }

    try {
      await addToWishlist(token, productId);

      Alert.alert(
        'Saved',
        'Product added to your wishlist.'
      );
    } catch (error) {
      console.error(
        'Failed to add product to wishlist:',
        error
      );

      Alert.alert(
        'Error',
        'Failed to add product to wishlist.'
      );
    }
  };

  if (!token) {
    return (
      <SafeAreaView style={styles.center}>
        <View style={styles.emptyIconContainer}>
          <Text style={styles.emptyIcon}>
            🛍️
          </Text>
        </View>

        <Text style={styles.emptyTitle}>
          Continue Shopping
        </Text>

        <Text style={styles.emptyText}>
          Please log in to continue shopping.
        </Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />

        <Text style={styles.loadingText}>
          Finding products for you...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            Continue Shopping
          </Text>

          <Text style={styles.subtitle}>
            Pick up where you left off
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Text style={styles.headerEmoji}>
            🛍️
          </Text>
        </View>
      </View>

      {products.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIconContainer}>
            <Text style={styles.emptyIcon}>
              ✨
            </Text>
          </View>

          <Text style={styles.emptyTitle}>
            You're all caught up
          </Text>

          <Text style={styles.emptyText}>
            Products you view without purchasing
            will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) =>
            item.product._id
          }
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.imageContainer}>
                <Image
                  source={{
                    uri: item.product.image,
                  }}
                  style={styles.productImage}
                  resizeMode="cover"
                />

                <View style={styles.continueBadge}>
                  <Text style={styles.continueBadgeText}>
                    Continue
                  </Text>
                </View>
              </View>

              <View style={styles.productInfo}>
                <Text
                  style={styles.productName}
                  numberOfLines={2}
                >
                  {item.product.name}
                </Text>

                <Text style={styles.category}>
                  {item.product.category}
                </Text>

                <Text style={styles.price}>
                  ₹{item.product.price}
                </Text>

                <TouchableOpacity
                  style={styles.cartButton}
                  onPress={() =>
                    handleAddToCart(
                      item.product._id
                    )
                  }
                  activeOpacity={0.8}
                >
                  <Text style={styles.cartButtonText}>
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
                  activeOpacity={0.8}
                >
                  <Text style={styles.wishlistButtonText}>
                    ♡ Wishlist
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const makeStyles = (COLORS: Record<string, string>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },

  subtitle: {
    marginTop: 5,
    fontSize: 14,
    color: COLORS.secondaryText,
  },

  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.softGreen,
  },

  headerEmoji: {
    fontSize: 25,
  },

  list: {
    paddingHorizontal: 15,
    paddingBottom: 30,
  },

  row: {
    justifyContent: 'space-between',
  },

  card: {
    flex: 1,
    marginHorizontal: 5,
    marginBottom: 16,
    padding: 10,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },

  imageContainer: {
    position: 'relative',
  },

  productImage: {
    width: '100%',
    height: 150,
    borderRadius: 16,
    backgroundColor: COLORS.softGreen,
  },

  continueBadge: {
    position: 'absolute',
    top: 9,
    left: 9,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: COLORS.primaryDark,
  },

  continueBadgeText: {
    color: COLORS.whiteText,
    fontSize: 10,
    fontWeight: '700',
  },

  productInfo: {
    paddingHorizontal: 4,
    paddingTop: 10,
  },

  productName: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
    color: COLORS.text,
  },

  category: {
    marginTop: 5,
    fontSize: 12,
    color: COLORS.secondaryText,
  },

  price: {
    marginTop: 8,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },

  cartButton: {
    minHeight: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },

  cartButtonText: {
    color: COLORS.whiteText,
    fontSize: 12,
    fontWeight: '800',
  },

  wishlistButton: {
    minHeight: 38,
    marginTop: 7,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.softRose,
  },

  wishlistButtonText: {
    color: COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: COLORS.background,
  },

  loadingText: {
    marginTop: 10,
    fontSize: 15,
    color: COLORS.secondaryText,
  },

  emptyIconContainer: {
    width: 82,
    height: 82,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: COLORS.softGreen,
  },

  emptyIcon: {
    fontSize: 38,
  },

  emptyTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginBottom: 8,
    textAlign: 'center',
  },

  emptyText: {
    maxWidth: 310,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.secondaryText,
    textAlign: 'center',
  },
});

export default ContinueShoppingScreen;
