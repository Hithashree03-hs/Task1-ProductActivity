import React from 'react';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import ProductListScreen from '../screens/ProductListScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import RecentlyViewedScreen from '../screens/RecentlyViewedScreen';
import ContinueShoppingScreen from '../screens/ContinueShoppingScreen';
import CartScreen from '../screens/CartScreen';
import WishlistScreen from '../screens/WishlistScreen';
import RecommendationsScreen from '../screens/RecommendationsScreen';
import PreferencesScreen from '../screens/PreferencesScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';

export type RootStackParamList = {
  Products: undefined;

  ProductDetail: {
    productId: string;
    token: string | null;
  };

  RecentlyViewed: undefined;

  ContinueShopping: undefined;

  Cart: undefined;

  Wishlist: undefined;
  Recommendations: undefined;
  Preferences: undefined;
  Orders: undefined;
};

interface AppNavigatorProps {
  token: string | null;
  onLoginPress: () => void;
  onLogout: () => Promise<void>;
}

const Stack =
  createNativeStackNavigator<RootStackParamList>();

const AppNavigator = ({
  token,
  onLoginPress,
  onLogout,
}: AppNavigatorProps): React.JSX.Element => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Products"
        options={{
          headerShown: false,
        }}
      >
        {(props) => (
          <ProductListScreen
            navigation={props.navigation}
            token={token}
            onLoginPress={onLoginPress}
            onLogout={onLogout}
          />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{
          title: 'Product Details',
        }}
      />

      <Stack.Screen
        name="RecentlyViewed"
        options={{
          title: 'Recently Viewed',
        }}
      >
        {() => (
          <RecentlyViewedScreen
            token={token}
          />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="ContinueShopping"
        options={{
          title: 'Continue Shopping',
        }}
      >
        {() => (
          <ContinueShoppingScreen
            token={token}
          />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="Cart"
        options={{
          title: 'Cart',
        }}
      >
        {() => (
          <CartScreen
            token={token}
          />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="Wishlist"
        options={{
          title: 'Wishlist',
        }}
      >
        {(props) => (
          <WishlistScreen
            navigation={props.navigation}
            token={token}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Recommendations" options={{ title: 'For You' }}>
        {(props) => <RecommendationsScreen navigation={props.navigation} token={token} />}
      </Stack.Screen>
      <Stack.Screen name="Preferences" options={{ title: 'Personalization' }}>
        {() => <PreferencesScreen token={token} />}
      </Stack.Screen>
      <Stack.Screen name="Orders" options={{ title: 'Order history' }}>
        {() => <OrderHistoryScreen token={token} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

export default AppNavigator;
