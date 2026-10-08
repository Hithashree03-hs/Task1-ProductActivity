import React, { useMemo, useState } from 'react';

import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { loginUser } from '../services/authService';

import {
  getLocalHistory,
  clearLocalHistory,
} from '../services/anonymousHistoryService';

import {
  mergeRecentlyViewed,
} from '../services/recentlyViewedService';

import {
  connectSocket,
} from '../services/socketService';
import { useTheme } from '../theme/ThemeProvider';

interface LoginScreenProps {
  onLoginSuccess: (token: string) => void;
}

const LoginScreen = ({
  onLoginSuccess,
}: LoginScreenProps): React.JSX.Element => {
  const { colors, spacing, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, spacing, typography), [colors, spacing, typography]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (): Promise<void> => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Step 1: Authenticate the user.
      const response = await loginUser(
        email.trim(),
        password
      );

      // Connect immediately after successful authentication.
      connectSocket(response.token);

      // Step 2: Get anonymous browsing history.
      const localHistory = await getLocalHistory();

      // Step 3: Merge anonymous history into
      // the logged-in user's server history.
      //
      // IMPORTANT:
      // We only clear local history if the merge
      // succeeds. If the merge fails, the user can
      // still log in and the local history remains
      // available for a future merge.
      if (localHistory.length > 0) {
        try {
          await mergeRecentlyViewed(
            response.token,
            localHistory
          );

          await clearLocalHistory();

          console.log(
            'Anonymous history merged successfully.'
          );
        } catch (mergeError) {
          console.error(
            'Failed to merge anonymous history:',
            mergeError
          );

          // Do not block login.
          // Do not clear local history.
        }
      }

      // Step 4: Complete login.
      onLoginSuccess(response.token);
    } catch (err) {
      console.error(
        'Login failed:',
        err
      );

      setError(
        'Login failed. Please check your email and password.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          Task 1 Product Activity
        </Text>

        <Text style={styles.subtitle}>
          Login
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error ? (
          <Text style={styles.error}>
            {error}
          </Text>
        ) : null}

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.whiteText} />
          ) : (
            <Text style={styles.loginButtonText}>
              Login
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const makeStyles = (c: ReturnType<typeof useTheme>['colors'], s: ReturnType<typeof useTheme>['spacing'], t: ReturnType<typeof useTheme>['typography']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    padding: s.lg,
  },

  title: {
    fontSize: t.title,
    fontWeight: t.weight.bold,
    color: c.text,
    textAlign: 'center',
  },

  subtitle: {
    marginTop: 8,
    marginBottom: 30,
    fontSize: t.heading,
    color: c.muted,
    textAlign: 'center',
  },

  input: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 8,
    backgroundColor: c.surface,
    color: c.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    fontSize: 16,
  },

  error: {
    marginBottom: 14,
    textAlign: 'center',
    fontSize: 14,
  },

  loginButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: c.primary,
  },

  loginButtonText: {
    color: c.whiteText,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LoginScreen;
