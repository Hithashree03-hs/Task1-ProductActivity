import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';

import AppNavigator from './src/navigation/AppNavigator';
import LoginScreen from './src/screens/LoginScreen';
import { connectSocket } from './src/services/socketService';


const TOKEN_KEY = '@auth_token';

const App = (): React.JSX.Element => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadToken = async (): Promise<void> => {
      try {
        const storedToken = await AsyncStorage.getItem(
          TOKEN_KEY
        );

        if (storedToken) {
  connectSocket(storedToken);
}

setToken(storedToken);

      } catch (error) {
        console.error(
          'Failed to load authentication token:',
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadToken();
  }, []);

  const handleLoginSuccess = async (
    newToken: string
  ): Promise<void> => {
    try {
      await AsyncStorage.setItem(
        TOKEN_KEY,
        newToken
      );

      setToken(newToken);
    } catch (error) {
      console.error(
        'Failed to save authentication token:',
        error
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Loading...
        </Text>
      </SafeAreaView>
    );
  }

  if (!token) {
    return (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <NavigationContainer>
      <AppNavigator token={token} />
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 10,
  },
});

export default App;