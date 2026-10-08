import React, { useEffect, useState } from 'react';

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

  token: string | null;

  onLoginPress: () => void;

  onLogout: () => void;
}

const ProductListScreen = ({
  navigation,
  token,
  onLoginPress,
  onLogout,
}: ProductListScreenProps): React.JSX.Element => {
  const [products, setProducts] =
    useState<Product[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    const loadProducts =
      async (): Promise<void> => {
        try {
          const data =
            await getProducts();

          setProducts(data);
        } catch (err) {
          console.error(
            'Failed to load products:',
            err
          );

          setError(
            'Failed to load products'
          );
        } finally {
          setLoading(false);
        }
      };

    loadProducts();
  }, []);

  const handleProductPress = (
    productId: string
  ): void => {
    navigation.navigate(
      'ProductDetail',
      {
        productId,
        token,
      }
    );
  };

  const handleLogout = (): void => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: onLogout,
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={styles.center}
      >
        <ActivityIndicator
          size="large"
        />

        <Text
          style={styles.loadingText}
        >
          Loading products...
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        style={styles.center}
      >
        <Text style={styles.error}>
          {error}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
    >
      {/* Header */}

      <View style={styles.header}>
         <View style={styles.headerGlow} />
        <View>
          <Text
            style={styles.appTitle}
          >
            ShopEasy
          </Text>

          <Text
            style={styles.subtitle}
          >
            {token
              ? 'Welcome back 👋'
              : 'Browsing as guest'}
          </Text>
        </View>

        {!token ? (
          <TouchableOpacity
            style={styles.loginButton}
            onPress={onLoginPress}
            activeOpacity={0.8}
          >
            <Text
              style={styles.loginButtonText}
            >
              Login
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Text
              style={styles.logoutButtonText}
            >
              Logout
            </Text>
          </TouchableOpacity>
        )}
      </View>



     {/* Quick Navigation */}
     <View style={styles.quickAccessHeader}>
  <View>
    <Text style={styles.quickAccessTitle}>
      Quick Access
    </Text>

    <Text style={styles.quickAccessSubtitle}>
      Manage your shopping activity
    </Text>
  </View>

  <View style={styles.quickAccessBadge}>
    <Text style={styles.quickAccessBadgeText}>
      4 shortcuts
    </Text>
  </View>
</View>

<View style={styles.navigationContainer}>

 {/* Recently Viewed */}
  <TouchableOpacity
    style={[
      styles.navigationButton,
      styles.recentCard,
    ]}
    onPress={() =>
      navigation.navigate('RecentlyViewed')
    }
    activeOpacity={0.85}
  >
    <View
      style={[
        styles.navigationIconBubble,
        styles.recentIconBubble,
      ]}
    >
      <Text style={styles.navigationIcon}>
        🕘
      </Text>
    </View>

    <View style={styles.navigationContent}>
      <Text style={styles.navigationTitle}>
        Recently Viewed
      </Text>

      <Text style={styles.navigationSubtitle}>
        Your browsing history
      </Text>
    </View>

    <Text
      style={[
        styles.navigationArrow,
        styles.recentArrow,
      ]}
    >
      →
    </Text>
  </TouchableOpacity>


  {/* Continue Shopping */}
  <TouchableOpacity
    style={[
      styles.navigationButton,
      styles.continueCard,
    ]}
    onPress={() =>
      navigation.navigate('ContinueShopping')
    }
    activeOpacity={0.85}
  >
    <View
      style={[
        styles.navigationIconBubble,
        styles.continueIconBubble,
      ]}
    >
      <Text style={styles.navigationIcon}>
        🛍️
      </Text>
    </View>

    <View style={styles.navigationContent}>
      <Text style={styles.navigationTitle}>
        Continue Shopping
      </Text>

      <Text style={styles.navigationSubtitle}>
        Pick up where you left off
      </Text>
    </View>

    <Text
      style={[
        styles.navigationArrow,
        styles.continueArrow,
      ]}
    >
      →
    </Text>
  </TouchableOpacity>


  {/* Cart */}
  <TouchableOpacity
    style={[
      styles.navigationButton,
      styles.cartCard,
    ]}
    onPress={() =>
      navigation.navigate('Cart')
    }
    activeOpacity={0.85}
  >
    <View
      style={[
        styles.navigationIconBubble,
        styles.cartIconBubble,
      ]}
    >
      <Text style={styles.navigationIcon}>
        🛒
      </Text>
    </View>

    <View style={styles.navigationContent}>
      <Text style={styles.navigationTitle}>
        Cart
      </Text>

      <Text style={styles.navigationSubtitle}>
        Your selected products
      </Text>
    </View>

    <Text
      style={[
        styles.navigationArrow,
        styles.cartArrow,
      ]}
    >
      →
    </Text>
  </TouchableOpacity>


  {/* Wishlist */}
  <TouchableOpacity
    style={[
      styles.navigationButton,
      styles.wishlistCard,
    ]}
    onPress={() =>
      navigation.navigate('Wishlist')
    }
    activeOpacity={0.85}
  >
    <View
      style={[
        styles.navigationIconBubble,
        styles.wishlistIconBubble,
      ]}
    >
      <Text style={styles.navigationIcon}>
        ♥
      </Text>
    </View>

    <View style={styles.navigationContent}>
      <Text style={styles.navigationTitle}>
        Wishlist
      </Text>

      <Text style={styles.navigationSubtitle}>
        Your saved products
      </Text>
    </View>

    <Text
      style={[
        styles.navigationArrow,
        styles.wishlistArrow,
      ]}
    >
      →
    </Text>
  </TouchableOpacity>

</View>

      <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => navigation.navigate('Recommendations')} style={{ flex: 1, padding: 13, marginRight: 6, borderRadius: 14, backgroundColor: '#294936' }}><Text style={{ color: 'white', fontWeight: '700', textAlign: 'center' }}>You May Also Like</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate(token ? 'Orders' : 'Preferences')} style={{ flex: 1, padding: 13, marginHorizontal: 4, borderRadius: 14, backgroundColor: '#E8F0E9' }}><Text style={{ color: '#294936', fontWeight: '700', textAlign: 'center' }}>{token ? 'Order History' : 'Personalization'}</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Preferences')} style={{ flex: 1, padding: 13, marginLeft: 6, borderRadius: 14, backgroundColor: '#F0E0CC' }}><Text style={{ color: '#294936', fontWeight: '700', textAlign: 'center' }}>Settings</Text></TouchableOpacity>
      </View>

      {/* Product list */}

      <FlatList
        data={products}
        keyExtractor={(item) =>
          item._id
        }
        contentContainerStyle={
          styles.list
        }
        showsVerticalScrollIndicator={
          false}
           numColumns={2}
           columnWrapperStyle={styles.productRow}
          renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.productCard}
            onPress={() =>
              handleProductPress(
                item._id
              )
            }
            activeOpacity={0.8}
          >
            <Image
              source={{
                uri: item.image,
              }}
              style={
                styles.productImage
              }
              resizeMode="cover"
            />

            <View
              style={styles.productInfo}
            >
              <Text
                style={
                  styles.productName
                }
                numberOfLines={2}
              >
                {item.name}
              </Text>

              <Text
                style={styles.category}
              >
                {item.category}
              </Text>

              <Text
                style={styles.price}
              >
                ₹{item.price}
              </Text>

              <Text
                style={styles.viewText}
              >
                Tap to view product →
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
};

const COLORS = {
  background: '#F8F6F1',
  primary: '#6B8F71',
  primaryDark: '#294936',
  secondary: '#C98F8F',
  softGreen: '#E8F0E9',
  card: '#FFFFFF',
  text: '#243027',
  secondaryText: '#718078',
  border: '#E3E8E3',
  muted: '#A2ADA5',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },

  error: {
    fontSize: 16,
  },

 headerGlow: {
  position: 'absolute',
  width: 180,
  height: 180,
  borderRadius: 90,
  backgroundColor: '#E2EEE4',
  top: -95,
  right: -45,
  opacity: 0.8,
},

header: {
  position: 'relative',
  overflow: 'hidden',
  paddingHorizontal: 20,
  paddingTop: 22,
  paddingBottom: 22,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: COLORS.background,
},
  

 appTitle: {
  fontSize: 32,
  fontWeight: '800',
  color: COLORS.primaryDark,
  letterSpacing: -1,
},

subtitle: {
  marginTop: 5,
  fontSize: 14,
  color: COLORS.secondaryText,
  fontWeight: '500',
},

  loginButton: {
  paddingVertical: 11,
  paddingHorizontal: 20,
  borderRadius: 24,
  backgroundColor: COLORS.primary,
  shadowColor: '#294936',
  shadowOffset: {
    width: 0,
    height: 3,
  },
  shadowOpacity: 0.15,
  shadowRadius: 6,
  elevation: 3,
},

loginButtonText: {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: '700',
},

logoutButton: {
  paddingVertical: 11,
  paddingHorizontal: 20,
  borderRadius: 24,
  backgroundColor: COLORS.primaryDark,
  shadowColor: '#294936',
  shadowOffset: {
    width: 0,
    height: 3,
  },
  shadowOpacity: 0.15,
  shadowRadius: 6,
  elevation: 3,
},

logoutButtonText: {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: '700',
},
quickAccessHeader: {
  paddingHorizontal: 20,
  paddingTop: 6,
  paddingBottom: 12,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: '#F8F6F1',
},

quickAccessTitle: {
  fontSize: 19,
  fontWeight: '900',
  color: '#294936',
},

quickAccessSubtitle: {
  marginTop: 3,
  fontSize: 12,
  color: '#718078',
},

quickAccessBadge: {
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 12,
  backgroundColor: '#E8F0E9',
},

quickAccessBadgeText: {
  fontSize: 11,
  fontWeight: '800',
  color: '#294936',
},
 navigationContainer: {
  paddingHorizontal: 16,
  paddingTop: 14,
  paddingBottom: 4,
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  backgroundColor: '#F8F6F1',
},

navigationButton: {
  width: '48%',
  minHeight: 155,
  borderRadius: 24,
  padding: 16,
  marginBottom: 14,
  borderWidth: 1,
  borderColor: '#E3E8E3',
  justifyContent: 'space-between',
  shadowColor: '#294936',
  shadowOffset: {
    width: 0,
    height: 5,
  },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 4,
},

recentCard: {
  backgroundColor: '#EEF5F0',
},

continueCard: {
  backgroundColor: '#F7EFE6',
},

cartCard: {
  backgroundColor: '#EDF3F7',
},

wishlistCard: {
  backgroundColor: '#F8ECEC',
},

navigationIconBubble: {
  width: 54,
  height: 54,
  borderRadius: 18,
  alignItems: 'center',
  justifyContent: 'center',
},

recentIconBubble: {
  backgroundColor: '#DDEBE0',
},

continueIconBubble: {
  backgroundColor: '#F0E0CC',
},

cartIconBubble: {
  backgroundColor: '#DDEAF2',
},

wishlistIconBubble: {
  backgroundColor: '#F3DADA',
},

navigationIcon: {
  fontSize: 27,
},

navigationContent: {
  marginTop: 12,
  paddingRight: 4,
},

navigationTitle: {
  fontSize: 16,
  fontWeight: '800',
  color: '#243027',
},

navigationSubtitle: {
  marginTop: 5,
  fontSize: 12,
  lineHeight: 17,
  color: '#718078',
},

navigationArrow: {
  position: 'absolute',
  right: 16,
  bottom: 15,
  fontSize: 20,
  fontWeight: '800',
},

recentArrow: {
  color: '#294936',
},

continueArrow: {
  color: '#8B5E34',
},

cartArrow: {
  color: '#496A7A',
},

wishlistArrow: {
  color: '#A34B52',
},
sectionHeader: {
  marginTop: 8,
  paddingHorizontal: 20,
  paddingTop: 22,
  paddingBottom: 14,
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-end',
  borderTopWidth: 1,
  borderTopColor: '#E1E5DF',
  backgroundColor: '#F8F6F1',
},

 sectionTitle: {
  fontSize: 24,
  fontWeight: '800',
  color: COLORS.text,
  letterSpacing: -0.4,
},

  productCount: {
  fontSize: 13,
  fontWeight: '600',
  color: COLORS.secondaryText,
},
 
list: {
  paddingHorizontal: 10,
  paddingBottom: 30,
},

  
productCard: {
  flex: 1,
  margin: 6,
  padding: 10,
  borderRadius: 22,
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#E3E8E3',
  shadowColor: '#294936',
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowOpacity: 0.08,
  shadowRadius: 10,
  elevation: 3,
},

productRow: {
  justifyContent: 'space-between',
},
 productImage: {
  width: '100%',
  height: 155,
  borderRadius: 16,
  backgroundColor: COLORS.softGreen,
},
  imagePlaceholder: {
    width: 105,
    height: 105,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eeeeee',
  },

  productEmoji: {
    fontSize: 42,
  },

 productInfo: {
  marginTop: 10,
  paddingHorizontal: 4,
},

 productName: {
  fontSize: 16,
  fontWeight: '800',
  color: COLORS.text,
  lineHeight: 21,
},

category: {
  marginTop: 5,
  fontSize: 12,
  fontWeight: '500',
  color: COLORS.secondaryText,
},

price: {
  marginTop: 8,
  fontSize: 18,
  fontWeight: '800',
  color: COLORS.primaryDark,
},

  viewText: {
  marginTop: 8,
  fontSize: 11,
  fontWeight: '600',
  color: COLORS.primary,
},
});

export default ProductListScreen;
