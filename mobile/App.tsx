import React, { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  StatusBar,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  NavigationContainer,
} from '@react-navigation/native';

import AppNavigator from './src/navigation/AppNavigator';

import LoginScreen from './src/screens/LoginScreen';

import {
  connectSocket,
  disconnectSocket,
} from './src/services/socketService';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { registerExpoPushToken } from './src/services/notificationService';
import { loadPreferences } from './src/services/preferencesService';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { DefaultTheme, DarkTheme } from '@react-navigation/native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: true, shouldShowBanner: true, shouldShowList: true }),
});

const TOKEN_KEY = '@auth_token';

const AppContent = (): React.JSX.Element => {
  const { mode, colors, setPreference } = useTheme();
  const [token, setToken] =
    useState<string | null>(null);

  const [showLogin, setShowLogin] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const loadToken = async (): Promise<void> => {
      try {
        const storedToken =
          await AsyncStorage.getItem(
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

  useEffect(() => {
    if (!token) return;
    loadPreferences(token).then(async (preferences) => {
      if (preferences.themePreference) await setPreference(preferences.themePreference);
    }).catch((error) => console.warn('Could not synchronize account preferences:', error));
  }, [token, setPreference]);

  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    let received: Notifications.EventSubscription | undefined;
    let response: Notifications.EventSubscription | undefined;
    const setupPush = async (): Promise<void> => {
      try {
        if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('default', { name: 'ShopEasy alerts', importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 250, 250, 250], lightColor: '#6B8F71' });
        const existing = await Notifications.getPermissionsAsync();
        const permission = existing.status === 'granted' ? existing : await Notifications.requestPermissionsAsync();
        if (permission.status !== 'granted') return;
        const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId || process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
        if (!projectId) { console.warn('Set EXPO_PUBLIC_EAS_PROJECT_ID to enable push registration.'); return; }
        const expoToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        if (active) await registerExpoPushToken(token, expoToken);
      } catch (error) { console.warn('Push notification setup failed:', error); }
    };
    void setupPush();
    received = Notifications.addNotificationReceivedListener((notification) => console.log('Notification received:', notification.request.content.data));
    response = Notifications.addNotificationResponseReceivedListener((notificationResponse) => console.log('Notification opened:', notificationResponse.notification.request.content.data));
    return () => { active = false; received?.remove(); response?.remove(); };
  }, [token]);

  const handleLoginSuccess = async (
    newToken: string
  ): Promise<void> => {
    try {
      await AsyncStorage.setItem(
        TOKEN_KEY,
        newToken
      );

      connectSocket(newToken);

      setToken(newToken);
      setShowLogin(false);
    } catch (error) {
      console.error(
        'Failed to save authentication token:',
        error
      );
    }
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(
        TOKEN_KEY
      );

      disconnectSocket();
      setToken(null);
      setShowLogin(false);
    } catch (error) {
      console.error(
        'Failed to logout:',
        error
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.loadingContainer, { backgroundColor: colors.background }]}
      >
        <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" />

        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading...
        </Text>
      </SafeAreaView>
    );
  }

  if (showLogin) {
    return (
      <>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      <LoginScreen
        onLoginSuccess={
          handleLoginSuccess
        }
      />
      </>
    );
  }

  return (
    <NavigationContainer theme={{ ...(mode === 'dark' ? DarkTheme : DefaultTheme), colors: { ...(mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors), primary: colors.primary, background: colors.background, card: colors.surface, text: colors.text, border: colors.border, notification: colors.accent } }}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      <AppNavigator
        token={token}
        onLoginPress={() =>
          setShowLogin(true)
        }
        onLogout={handleLogout}
      />
    </NavigationContainer>
  );
};

const App = (): React.JSX.Element => <ThemeProvider><AppContent /></ThemeProvider>;

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
