import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme, ThemeMode } from './theme';

export type ThemePreference = 'system' | 'light' | 'dark';
interface ThemeContextValue { preference: ThemePreference; mode: ThemeMode; colors: typeof theme.light.colors | typeof theme.dark.colors; typography: typeof theme.light.typography; spacing: typeof theme.light.spacing; icons: typeof theme.light.icons; setPreference: (value: ThemePreference) => Promise<void>; }
const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = '@theme_preference';
const systemMode = (scheme: ReturnType<typeof useColorScheme>): ThemeMode => scheme === 'dark' ? 'dark' : 'light';

export const ThemeProvider = ({ children }: React.PropsWithChildren): React.JSX.Element => {
  const deviceScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const mode: ThemeMode = preference === 'system' ? systemMode(deviceScheme) : preference;
  useEffect(() => { AsyncStorage.getItem(STORAGE_KEY).then((saved) => { if (saved === 'light' || saved === 'dark' || saved === 'system') setPreferenceState(saved); }).catch((error) => console.warn('Could not load theme:', error)); }, []);
  const setPreference = useCallback(async (value: ThemePreference): Promise<void> => { setPreferenceState(value); try { await AsyncStorage.setItem(STORAGE_KEY, value); } catch (error) { console.warn('Could not save theme:', error); } }, []);
  const value = useMemo(() => ({ preference, mode, ...theme[mode], setPreference }), [preference, mode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
export const useTheme = (): ThemeContextValue => { const value = useContext(ThemeContext); if (!value) throw new Error('useTheme must be used within ThemeProvider'); return value; };
