import React from 'react';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import ProductListScreen from '../screens/ProductListScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import RecentlyViewedScreen from '../screens/RecentlyViewedScreen';
import ContinueShoppingScreen from '../screens/ContinueShoppingScreen';

export type RootStackParamList = {
  Products: undefined;

  ProductDetail: {
    productId: string;
    token: string;
  };

  RecentlyViewed: undefined;

  ContinueShopping: undefined;
};

interface AppNavigatorProps {
  token: string;
}

const Stack =
  createNativeStackNavigator<RootStackParamList>();

const AppNavigator = ({
  token,
}: AppNavigatorProps): React.JSX.Element => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Products"
        options={{
          title: 'Products',
        }}
      >
        {(props) => (
          <ProductListScreen
            navigation={props.navigation}
            token={token}
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
    </Stack.Navigator>
  );
};

export default AppNavigator;