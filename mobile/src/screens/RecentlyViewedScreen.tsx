import React, {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useFocusEffect,
} from '@react-navigation/native';

import {
  getRecentlyViewed,
  RecentlyViewedItem,
} from '../services/recentlyViewedService';

import {
  getSocket,
} from '../services/socketService';
import { useTheme } from '../theme/ThemeProvider';

interface RecentlyViewedScreenProps {
  token: string | null;
}

const RecentlyViewedScreen = ({
  token,
}: RecentlyViewedScreenProps): React.JSX.Element => {
  const { colors } = useTheme();
  const COLORS = { background: colors.background, primary: colors.primary, primaryDark: colors.primaryDark, softGreen: colors.surfaceAlt, card: colors.surface, text: colors.text, secondaryText: colors.muted, border: colors.border, shadow: colors.shadow, whiteText: colors.whiteText };
  const styles = useMemo(() => makeStyles(COLORS), [colors]);
  const [products, setProducts] = useState<
    RecentlyViewedItem[]
  >([]);

  const [loading, setLoading] = useState(true);

  const loadRecentlyViewed = useCallback(
    async (): Promise<void> => {
      if (!token) {
        setProducts([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const data =
          await getRecentlyViewed(token);

        setProducts(data);
      } catch (error) {
        console.error(
          'Failed to load recently viewed:',
          error
        );
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useFocusEffect(
    useCallback(() => {
      loadRecentlyViewed();

      if (!token) {
        return;
      }

      const socket = getSocket();

      const handleRecentlyViewedUpdated =
        (): void => {
          loadRecentlyViewed();
        };

      socket?.on(
        'recentlyViewedUpdated',
        handleRecentlyViewedUpdated
      );

      return () => {
        socket?.off(
          'recentlyViewedUpdated',
          handleRecentlyViewedUpdated
        );
      };
    }, [token, loadRecentlyViewed])
  );

  if (!token) {
    return (
      <SafeAreaView style={styles.center}>
        <View style={styles.emptyIconContainer}>
          <Text style={styles.emptyIcon}>
            👀
          </Text>
        </View>

        <Text style={styles.emptyTitle}>
          Browse as a Guest
        </Text>

        <Text style={styles.message}>
          Your viewed products are saved locally.
        </Text>

        <Text style={styles.subMessage}>
          Log in later to merge your browsing
          history with your account.
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

        <Text style={styles.message}>
          Loading your history...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            Recently Viewed
          </Text>

          <Text style={styles.headerSubtitle}>
            Pick up where you left off
          </Text>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {products.length}
          </Text>
        </View>
      </View>

      {products.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIconContainer}>
            <Text style={styles.emptyIcon}>
              🕘
            </Text>
          </View>

          <Text style={styles.emptyTitle}>
            Nothing here yet
          </Text>

          <Text style={styles.message}>
            Products you view will appear here.
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

                <View style={styles.viewedBadge}>
                  <Text style={styles.viewedBadgeText}>
                    Viewed
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

                <Text
                  style={styles.category}
                  numberOfLines={1}
                >
                  {item.product.category}
                </Text>

                <Text style={styles.price}>
                  ₹{item.product.price}
                </Text>

                <Text style={styles.viewedAt}>
                  Recently viewed
                </Text>
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

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: COLORS.background,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primaryDark,
    letterSpacing: -0.5,
  },

  headerSubtitle: {
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
    backgroundColor: COLORS.softGreen,
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
    height: 155,
    borderRadius: 16,
    backgroundColor: COLORS.softGreen,
  },

  viewedBadge: {
    position: 'absolute',
    top: 9,
    left: 9,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: COLORS.primaryDark,
  },

  viewedBadgeText: {
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
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },

  viewedAt: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
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
  },

  message: {
    marginTop: 6,
    fontSize: 15,
    color: COLORS.secondaryText,
    textAlign: 'center',
  },

  subMessage: {
    marginTop: 10,
    maxWidth: 310,
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.secondaryText,
    textAlign: 'center',
  },
});

export default RecentlyViewedScreen;
