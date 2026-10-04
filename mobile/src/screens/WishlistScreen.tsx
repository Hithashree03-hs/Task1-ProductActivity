import React, {
  useEffect,
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
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';

import {
  getWishlist,
  removeFromWishlist,
} from '../services/wishlistService';

import {
  RootStackParamList,
} from '../navigation/AppNavigator';

interface WishlistProduct {
  _id: string;
  name: string;
  price: number;
  image: string;
  category?: string;
}

interface WishlistScreenProps {
  token?: string | null;

  navigation: NativeStackNavigationProp<
    RootStackParamList,
    'Wishlist'
  >;
}

const COLORS = {
  background: '#F8F6F1',
  primary: '#6B8F71',
  primaryDark: '#294936',
  softGreen: '#E8F0E9',
  softRose: '#F3E4E2',
  card: '#FFFFFF',
  text: '#243027',
  secondaryText: '#718078',
  border: '#E3E8E3',
};

const WishlistScreen = ({
  token,
  navigation,
}: WishlistScreenProps): React.JSX.Element => {
  const [products, setProducts] = useState<
    WishlistProduct[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [removingProductId, setRemovingProductId] =
    useState<string | null>(null);

  const loadWishlist = async (): Promise<void> => {
    if (!token) {
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const data = await getWishlist(token);

      setProducts(data);
    } catch (error) {
      console.error(
        'Failed to load wishlist:',
        error
      );

      Alert.alert(
        'Error',
        'Failed to load wishlist.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWishlist();
  }, [token]);

  const handleRemoveFromWishlist = async (
    productId: string
  ): Promise<void> => {
    if (!token) {
      return;
    }

    try {
      setRemovingProductId(productId);

      await removeFromWishlist(
        token,
        productId
      );

      setProducts((currentProducts) =>
        currentProducts.filter(
          (product) =>
            product._id !== productId
        )
      );
    } catch (error) {
      console.error(
        'Failed to remove product from wishlist:',
        error
      );

      Alert.alert(
        'Error',
        'Failed to remove product from wishlist.'
      );
    } finally {
      setRemovingProductId(null);
    }
  };

  const handleProductPress = (
    productId: string
  ): void => {
    navigation.navigate(
      'ProductDetail',
      {
        productId,
        token: token ?? null,
      }
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />

        <Text style={styles.loadingText}>
          Loading your wishlist...
        </Text>
      </SafeAreaView>
    );
  }

  if (!token) {
    return (
      <SafeAreaView style={styles.center}>
        <View style={styles.emptyIconContainer}>
          <Text style={styles.emptyIcon}>
            ♡
          </Text>
        </View>

        <Text style={styles.emptyTitle}>
          Your Wishlist
        </Text>

        <Text style={styles.emptyText}>
          Please log in to view your saved products.
        </Text>
      </SafeAreaView>
    );
  }

  if (products.length === 0) {
    return (
      <SafeAreaView style={styles.center}>
        <View style={styles.emptyIconContainer}>
          <Text style={styles.emptyIcon}>
            ♡
          </Text>
        </View>

        <Text style={styles.emptyTitle}>
          Your wishlist is empty
        </Text>

        <Text style={styles.emptyText}>
          Save products you love and find them here
          whenever you're ready.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            My Wishlist
          </Text>

          <Text style={styles.subtitle}>
            Products saved for later
          </Text>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {products.length}
          </Text>
        </View>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item._id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isRemoving =
            removingProductId === item._id;

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                handleProductPress(item._id)
              }
              activeOpacity={0.85}
            >
              <View style={styles.imageContainer}>
                <Image
                  source={{
                    uri: item.image,
                  }}
                  style={styles.productImage}
                  resizeMode="cover"
                />

                <TouchableOpacity
                  style={[
                    styles.heartBadge,
                    isRemoving &&
                      styles.heartDisabled,
                  ]}
                  onPress={() =>
                    handleRemoveFromWishlist(
                      item._id
                    )
                  }
                  disabled={isRemoving}
                  activeOpacity={0.8}
                >
                  <Text style={styles.heartText}>
                    ♥
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.productInfo}>
                <Text
                  style={styles.productName}
                  numberOfLines={2}
                >
                  {item.name}
                </Text>

                {item.category && (
                  <Text
                    style={styles.category}
                    numberOfLines={1}
                  >
                    {item.category}
                  </Text>
                )}

                <Text style={styles.price}>
                  ₹{item.price}
                </Text>

                <Text style={styles.savedText}>
                  Saved to wishlist
                </Text>

                <Text style={styles.viewProductText}>
                  Tap to view & buy →
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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

  countBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.softRose,
  },

  countText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primaryDark,
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
    shadowColor: '#294936',
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
    height: 155,
    borderRadius: 16,
    backgroundColor: COLORS.softGreen,
  },

  heartBadge: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  heartDisabled: {
    opacity: 0.5,
  },

  heartText: {
    fontSize: 18,
    color: '#C95C61',
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
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },

  savedText: {
    marginTop: 7,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },

  viewProductText: {
    marginTop: 7,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: COLORS.background,
  },

  emptyIconContainer: {
    width: 82,
    height: 82,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: COLORS.softRose,
  },

  emptyIcon: {
    fontSize: 40,
    color: '#C95C61',
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

  loadingText: {
    marginTop: 10,
    fontSize: 15,
    color: COLORS.secondaryText,
  },
});

export default WishlistScreen;