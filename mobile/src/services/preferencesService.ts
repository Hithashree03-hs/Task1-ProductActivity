import apiClient from '../api/client';

export type ThemePreference = 'system' | 'light' | 'dark';
export interface Preferences { themePreference: ThemePreference; notificationPreferences: Record<string, boolean>; favoriteCategories: string[]; }
const defaults: Preferences = { themePreference: 'system', notificationPreferences: { order: true, payment: true, shipping: true, wishlist: true, promotions: true, cart: true }, favoriteCategories: [] };
const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });
export const loadPreferences = async (token: string): Promise<Preferences> => (await apiClient.get<{preferences: Preferences}>('/preferences', auth(token))).data.preferences;
export const savePreferences = async (token: string, data: Partial<Preferences>): Promise<Preferences> => (await apiClient.patch<{preferences: Preferences}>('/preferences', data, auth(token))).data.preferences;
export { defaults };
