import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { defaults, loadPreferences, Preferences, savePreferences, ThemePreference } from '../services/preferencesService';
import { getProducts } from '../services/productService';
import { useTheme } from '../theme/ThemeProvider';

const categories = [['order', 'Order confirmations'], ['payment', 'Payment updates'], ['shipping', 'Shipping and delivery'], ['wishlist', 'Wishlist price and stock alerts'], ['promotions', 'Promotional campaigns'], ['cart', 'Abandoned cart reminders']];

export default function PreferencesScreen({ token }: { token: string | null }): React.JSX.Element {
  const { colors, preference, setPreference, spacing, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, spacing, typography), [colors, spacing, typography]);
  const [prefs, setPrefs] = useState<Preferences>(defaults);
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(!!token);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    void getProducts().then((products) => { if (active) setProductCategories(Array.from(new Set(products.map((product) => product.category)).values()).sort()); }).catch((error) => console.warn('Could not load categories', error));
    if (!token) { setLoading(false); return () => { active = false; }; }
    void loadPreferences(token).then(async (remote) => { if (!active) return; setPrefs(remote); await setPreference(remote.themePreference); }).catch((error) => console.warn('Could not sync preferences', error)).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, setPreference]);

  const update = async (delta: Partial<Preferences>) => {
    const next = { ...prefs, ...delta }; setPrefs(next);
    if (delta.themePreference) await setPreference(delta.themePreference);
    if (!token) return;
    setSaving(true);
    try { setPrefs(await savePreferences(token, delta)); }
    catch (error) { console.warn('Preference sync failed', error); }
    finally { setSaving(false); }
  };
  const toggleCategory = (category: string) => {
    const selected = new Set(prefs.favoriteCategories || []);
    selected.has(category) ? selected.delete(category) : selected.add(category);
    void update({ favoriteCategories: Array.from(selected) });
  };

  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.title}>Personalization</Text><Text style={styles.subtitle}>Choose your appearance, favorite categories, and shopping alerts.</Text>
    <View style={styles.section}><Text style={styles.heading}>Appearance</Text><Text style={styles.helper}>System follows your device setting on first launch.</Text><View style={styles.choiceRow}>{(['system', 'light', 'dark'] as ThemePreference[]).map((value) => <TouchableOpacity key={value} onPress={() => void update({ themePreference: value })} style={[styles.choice, preference === value && styles.choiceSelected]}><Text style={[styles.choiceLabel, preference === value && styles.choiceLabelSelected]}>{value[0].toUpperCase() + value.slice(1)}</Text></TouchableOpacity>)}</View></View>
    <View style={styles.section}><Text style={styles.heading}>Favorite categories</Text><Text style={styles.helper}>Recommendations will give these categories extra weight.</Text><View style={styles.choiceRow}>{productCategories.map((category) => <TouchableOpacity key={category} onPress={() => toggleCategory(category)} style={[styles.choice, prefs.favoriteCategories?.includes(category) && styles.choiceSelected]}><Text style={[styles.choiceLabel, prefs.favoriteCategories?.includes(category) && styles.choiceLabelSelected]}>{category}</Text></TouchableOpacity>)}</View></View>
    <View style={styles.section}><Text style={styles.heading}>Notifications</Text><Text style={styles.helper}>Changes sync to your account when you are signed in.</Text>{categories.map(([key, label]) => <View key={key} style={styles.preferenceRow}><Text style={styles.preferenceLabel}>{label}</Text><Switch value={prefs.notificationPreferences[key] !== false} onValueChange={(value) => void update({ notificationPreferences: { ...prefs.notificationPreferences, [key]: value } })} trackColor={{ true: colors.primary }} thumbColor={colors.surface} /></View>)}</View>
    {loading || saving ? <ActivityIndicator color={colors.primary} style={{ margin: spacing.md }} /> : null}{!token && <Text style={styles.helper}>Sign in to sync settings across devices.</Text>}
  </ScrollView></SafeAreaView>;
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors'], s: ReturnType<typeof useTheme>['spacing'], t: ReturnType<typeof useTheme>['typography']) => StyleSheet.create({ screen: { flex: 1, backgroundColor: c.background }, content: { padding: s.md, paddingBottom: s.xl }, title: { fontSize: t.title, fontWeight: t.weight.bold, color: c.text }, subtitle: { color: c.muted, fontSize: t.body, marginTop: s.xs, marginBottom: s.md }, section: { padding: s.md, marginBottom: s.md, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }, heading: { color: c.text, fontSize: t.heading, fontWeight: t.weight.bold }, helper: { color: c.muted, fontSize: t.caption, marginTop: s.xs, marginBottom: s.sm }, choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: s.sm, marginTop: s.sm }, choice: { paddingHorizontal: s.md, paddingVertical: s.sm, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.background }, choiceSelected: { backgroundColor: c.primary, borderColor: c.primary }, choiceLabel: { color: c.text, fontSize: t.caption, fontWeight: t.weight.medium }, choiceLabelSelected: { color: c.surface }, preferenceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: c.border, paddingVertical: s.sm }, preferenceLabel: { flex: 1, color: c.text, fontSize: t.body } });
