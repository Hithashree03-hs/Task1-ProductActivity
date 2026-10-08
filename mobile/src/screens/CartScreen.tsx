import React, { useCallback, useEffect, useMemo, useState } from 'react';

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
  CartItem,
  getCart,
  updateCartQuantity,
  validateCart,
} from '../services/cartService';

import {
  createOrder,
  createRazorpayIntent,
  verifyRazorpayPayment,
} from '../services/orderService';
import RazorpayCheckout from 'react-native-razorpay';
import { getSocket } from '../services/socketService';
import { useTheme } from '../theme/ThemeProvider';
import { ThemeColors } from '../theme/theme';

interface CartScreenProps {
  token?: string | null;
}

const CartScreen = ({
  token,
}: CartScreenProps): React.JSX.Element => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [items, setItems] = useState<CartItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [updatingProductId, setUpdatingProductId] =
    useState<string | null>(null);

  const [placingOrder, setPlacingOrder] =
    useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH_ON_DELIVERY' | 'RAZORPAY'>('CASH_ON_DELIVERY');

  const totalAmount = items.reduce(
    (total, item) =>
      total +
      (item.productId?.price || 0) *
        item.quantity,
    0
  );

  const loadCart = useCallback(async (showLoading = true): Promise<void> => {
    if (!token) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      if (showLoading) {
        setLoading(true);
      }

      const cart = await getCart(token);

      const validItems = (cart.items || []).filter(
        (item) => item.productId !== null && !item.savedForLater
      );

      setItems(validItems);
    } catch (error) {
      console.error(
        'Failed to load cart:',
        error
      );

      Alert.alert(
        'Error',
        'Failed to load cart.'
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleManualRefresh = async (): Promise<void> => {
    setRefreshing(true);
    try {
      await loadCart(false);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const socket = getSocket();
    if (!socket) {
      return undefined;
    }

    const handleCartUpdated = (): void => {
      void loadCart(false);
    };

    socket.on('cartUpdated', handleCartUpdated);
    return () => {
      socket.off('cartUpdated', handleCartUpdated);
    };
  }, [token, loadCart]);

  const changeQuantity = async (
    productId: string,
    currentQuantity: number,
    change: number
  ): Promise<void> => {
    if (!token) {
      return;
    }

    const newQuantity =
      currentQuantity + change;

    try {
      setUpdatingProductId(productId);

      await updateCartQuantity(
        token,
        productId,
        newQuantity
      );

      if (newQuantity <= 0) {
        setItems((currentItems) =>
          currentItems.filter(
            (item) =>
              item.productId?._id !== productId
          )
        );
      } else {
        setItems((currentItems) =>
          currentItems.map((item) => {
            if (
              item.productId?._id === productId
            ) {
              return {
                ...item,
                quantity: newQuantity,
              };
            }

            return item;
          })
        );
      }
    } catch (error) {
      console.error(
        'Failed to update cart quantity:',
        error
      );

      Alert.alert(
        'Error',
        'Failed to update cart quantity.'
      );
    } finally {
      setUpdatingProductId(null);
    }
  };

  const handlePlaceOrder =
    async (): Promise<void> => {
      if (!token || items.length === 0) {
        return;
      }

      try {
        setPlacingOrder(true);

        const validation = await validateCart(token);
        const currentItems = (validation.cart.items || []).filter(
          (item) => item.productId !== null && !item.savedForLater
        );
        setItems(currentItems);

        if (validation.issues.length > 0) {
          const message = validation.issues.map((issue) => {
            if (issue.type === 'price') {
              return `${issue.productName}: price changed from ₹${issue.oldPrice} to ₹${issue.newPrice}. Your cart total has been updated; review it before continuing.`;
            }
            if (issue.type === 'stock') {
              return issue.availableStock && issue.availableStock > 0
                ? `${issue.productName}: only ${issue.availableStock} available. Reduce the quantity to continue.`
                : `${issue.productName} is out of stock. Remove it to continue.`;
            }
            return `${issue.productName} is no longer available and was removed from your cart.`;
          }).join('\n\n');

          Alert.alert('Review your cart', message);
          return;
        }

        const orderItems = currentItems.map((item) => ({
            productId: item.productId!._id,
            quantity: item.quantity,
            price: item.productId!.price,
            size: item.size,
            color: item.color,
          }));

        if (paymentMethod === 'RAZORPAY') {
          const intent = await createRazorpayIntent(token);
          const payment = await RazorpayCheckout.open({
            key: intent.keyId,
            amount: String(intent.amount),
            currency: intent.currency,
            name: 'ShopEasy',
            description: 'Payment for your shopping cart',
            order_id: intent.providerOrderId,
            theme: { color: colors.primaryDark },
            retry: { enabled: true, max_count: 2 },
          });
          await verifyRazorpayPayment(token, intent.paymentIntentId, payment);
        } else {
          await createOrder(token, orderItems, paymentMethod);
        }

        setItems([]);

        Alert.alert(
          'Order Placed',
          'Your order was placed successfully.'
        );
      } catch (error) {
        console.error(
          'Failed to place order:',
          error
        );

      Alert.alert(
        'Checkout could not complete',
        (error as { response?: { data?: { message?: string } } })
          ?.response?.data?.message ||
          (error instanceof Error ? error.message : 'Failed to place order.')
      );
      } finally {
        setPlacingOrder(false);
      }
    };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Loading cart...
        </Text>
      </SafeAreaView>
    );
  }

  if (!token) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyIcon}>
          🛒
        </Text>

        <Text style={styles.emptyTitle}>
          Login Required
        </Text>

        <Text style={styles.emptyText}>
          Please log in to view your cart.
        </Text>
      </SafeAreaView>
    );
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyIcon}>
          🛒
        </Text>

        <Text style={styles.emptyTitle}>
          Your cart is empty
        </Text>

        <Text style={styles.emptyText}>
          Products you add to your cart will
          appear here.
        </Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleManualRefresh}
          disabled={refreshing}
          accessibilityRole="button"
          accessibilityLabel="Refresh cart"
        >
          <Text style={styles.refreshButtonText}>
            {refreshing ? 'Refreshing…' : '↻ Refresh Cart'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>My Cart</Text>
            <Text style={styles.count}>
              {items.length} item{items.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleManualRefresh}
            disabled={refreshing}
            accessibilityRole="button"
            accessibilityLabel="Refresh cart"
          >
            <Text style={styles.refreshButtonText}>
              {refreshing ? 'Refreshing…' : '↻ Refresh'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item, index) =>
          item._id ||
          `${item.productId?._id}-${index}`
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const product = item.productId;

          if (!product) {
            return null;
          }

          const isUpdating =
            updatingProductId ===
            product._id;

          return (
            <View style={styles.card}>
              <Image
                source={{
                  uri: product.image,
                }}
                style={styles.productImage}
                resizeMode="cover"
              />

              <View style={styles.productInfo}>
                <Text
                  style={styles.productName}
                  numberOfLines={2}
                >
                  {product.name}
                </Text>

                {product.category && (
                  <Text style={styles.category}>
                    {product.category}
                  </Text>
                )}

                <Text style={styles.price}>
                  ₹{product.price}
                </Text>

                <View style={styles.quantityRow}>
                  <Text style={styles.quantityLabel}>
                    Quantity
                  </Text>

                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={[
                        styles.quantityButton,
                        isUpdating &&
                          styles.disabledButton,
                      ]}
                      disabled={
                        isUpdating ||
                        placingOrder
                      }
                      onPress={() =>
                        changeQuantity(
                          product._id,
                          item.quantity,
                          -1
                        )
                      }
                    >
                      <Text
                        style={
                          styles.quantityButtonText
                        }
                      >
                        −
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.quantityValue}>
                      <Text
                        style={
                          styles.quantityValueText
                        }
                      >
                        {item.quantity}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.quantityButton,
                        isUpdating &&
                          styles.disabledButton,
                      ]}
                      disabled={
                        isUpdating ||
                        placingOrder
                      }
                      onPress={() =>
                        changeQuantity(
                          product._id,
                          item.quantity,
                          1
                        )
                      }
                    >
                      <Text
                        style={
                          styles.quantityButtonText
                        }
                      >
                        +
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          );
        }}
      />

      <View style={styles.checkoutContainer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>
            Total
          </Text>

          <Text style={styles.totalAmount}>
            ₹{totalAmount}
          </Text>
        </View>

        <Text style={styles.paymentLabel}>Payment method</Text>
        <View style={styles.paymentOptions}>
          <TouchableOpacity
            style={[styles.paymentOption, paymentMethod === 'CASH_ON_DELIVERY' && styles.paymentOptionSelected]}
            onPress={() => setPaymentMethod('CASH_ON_DELIVERY')}
            disabled={placingOrder}
            accessibilityRole="radio"
            accessibilityState={{ selected: paymentMethod === 'CASH_ON_DELIVERY' }}
          >
            <Text style={styles.paymentOptionTitle}>Cash on delivery</Text>
            <Text style={styles.paymentOptionDetail}>Pay when your order arrives</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.paymentOption, paymentMethod === 'RAZORPAY' && styles.paymentOptionSelected]}
            onPress={() => setPaymentMethod('RAZORPAY')}
            disabled={placingOrder}
            accessibilityRole="radio"
            accessibilityState={{ selected: paymentMethod === 'RAZORPAY' }}
          >
            <Text style={styles.paymentOptionTitle}>UPI and online payment</Text>
            <Text style={styles.paymentOptionDetail}>UPI apps, cards and wallets via Razorpay</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.placeOrderButton,
            placingOrder &&
              styles.disabledButton,
          ]}
          onPress={handlePlaceOrder}
          disabled={placingOrder}
          activeOpacity={0.8}
        >
          <Text style={styles.placeOrderText}>
            {placingOrder
              ? (paymentMethod === 'RAZORPAY' ? 'Opening secure checkout…' : 'Placing Order...')
              : (paymentMethod === 'RAZORPAY' ? 'Continue to payment' : 'Place Order')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    backgroundColor: c.background,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  refreshButton: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: c.surfaceAlt,
  },

  refreshButtonText: {
    color: c.primaryDark,
    fontSize: 14,
    fontWeight: '800',
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: c.primaryDark,
  },

  count: {
    marginTop: 5,
    fontSize: 14,
    color: c.muted,
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: 15,
  },

  card: {
    flexDirection: 'row',
    backgroundColor: c.surface,
    borderRadius: 20,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: c.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },

  productImage: {
    width: 105,
    height: 105,
    borderRadius: 16,
    backgroundColor: c.surfaceAlt,
  },

  productInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },

  productName: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
    color: c.text,
  },

  category: {
    marginTop: 5,
    fontSize: 12,
    color: c.muted,
  },

  price: {
    marginTop: 7,
    fontSize: 18,
    fontWeight: '800',
    color: c.primaryDark,
  },

  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },

  quantityLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: c.muted,
  },

  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  quantityButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceAlt,
  },

  quantityButtonText: {
    fontSize: 21,
    fontWeight: '700',
    color: c.primaryDark,
  },

  quantityValue: {
    minWidth: 42,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quantityValueText: {
    fontSize: 16,
    fontWeight: '800',
    color: c.text,
  },

  checkoutContainer: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: c.surface,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  paymentLabel: { color: c.text, fontSize: 14, fontWeight: '800', marginBottom: 8 },
  paymentOptions: { gap: 8, marginBottom: 14 },
  paymentOption: { borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: c.surface },
  paymentOptionSelected: { borderColor: c.primary, backgroundColor: c.surfaceAlt },
  paymentOptionTitle: { color: c.text, fontSize: 13, fontWeight: '800' },
  paymentOptionDetail: { color: c.muted, fontSize: 11, marginTop: 2 },

  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: c.muted,
  },

  totalAmount: {
    fontSize: 24,
    fontWeight: '900',
    color: c.primaryDark,
  },

  placeOrderButton: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.primaryDark,
  },

  placeOrderText: {
    color: c.whiteText,
    fontSize: 17,
    fontWeight: '800',
  },

  disabledButton: {
    opacity: 0.45,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: c.background,
  },

  loadingText: {
    marginTop: 10,
    fontSize: 15,
    color: c.muted,
  },

  emptyIcon: {
    fontSize: 55,
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: c.primaryDark,
    marginBottom: 8,
  },

  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    color: c.muted,
    textAlign: 'center',
  },
});

export default CartScreen;
