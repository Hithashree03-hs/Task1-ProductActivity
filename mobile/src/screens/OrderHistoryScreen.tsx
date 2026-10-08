import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getOrders, invoiceUrl, orderAction, OrderFilters, OrderSummary, reorder } from '../services/orderService';
import { useTheme } from '../theme/ThemeProvider';

const statuses = ['ALL', 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED'];
const methods = ['ALL', 'CASH_ON_DELIVERY', 'CARD', 'UPI', 'WALLET'];

export default function OrderHistoryScreen({ token }: { token: string | null }): React.JSX.Element {
  const { colors, spacing, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, spacing, typography), [colors, spacing, typography]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [page, setPage] = useState(1); const [pages, setPages] = useState(1);
  const [filters, setFilters] = useState<OrderFilters>({ status: 'ALL', paymentMethod: 'ALL', sort: 'newest' });
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false); const [busyOrder, setBusyOrder] = useState<string | null>(null);

  const load = useCallback(async (nextPage = 1, activeFilters = filters) => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getOrders(token, nextPage, activeFilters);
      setOrders((old) => nextPage === 1 ? data.orders : [...old, ...data.orders]); setPage(data.page); setPages(data.pages);
    } catch (error) { Alert.alert('Orders unavailable', error instanceof Error ? error.message : 'Could not load order history.'); }
    finally { setLoading(false); }
  }, [token, filters]);
  useEffect(() => { void load(1); }, [load]);
  const applyFilter = (delta: Partial<OrderFilters>) => { const next = { ...filters, ...delta }; setFilters(next); setOrders([]); setPage(1); void load(1, next); };

  const downloadInvoice = async (order: OrderSummary) => {
    if (!token) return;
    setBusyOrder(order._id);
    try {
      const file = new File(Paths.cache, `${order.invoiceNumber || order._id}.pdf`);
      const downloaded = await File.downloadFileAsync(invoiceUrl(order._id), file, { headers: { Authorization: `Bearer ${token}` }, idempotent: true });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(downloaded.uri, { mimeType: 'application/pdf', dialogTitle: `Invoice ${order.invoiceNumber || ''}` });
      else Alert.alert('Invoice downloaded', downloaded.uri);
    } catch (error) { Alert.alert('Invoice unavailable', error instanceof Error ? error.message : 'Could not download invoice.'); }
    finally { setBusyOrder(null); }
  };

  const runOrderAction = (order: OrderSummary, action: 'cancel' | 'return') => {
    const title = action === 'cancel' ? 'Cancel this order?' : 'Request a return?';
    Alert.alert(title, action === 'cancel' ? 'Eligible items will be returned to inventory.' : 'A return request will be sent for review.', [
      { text: 'Keep order', style: 'cancel' },
      { text: action === 'cancel' ? 'Cancel order' : 'Request return', style: action === 'cancel' ? 'destructive' : 'default', onPress: async () => {
        if (!token) return; setBusyOrder(order._id);
        try { await orderAction(token, order._id, action); await load(1); Alert.alert('Updated', action === 'cancel' ? 'Order cancelled.' : 'Return request submitted.'); }
        catch (error) { Alert.alert('Could not update order', error instanceof Error ? error.message : 'Please try again.'); }
        finally { setBusyOrder(null); }
      } },
    ]);
  };

  const reorderItems = async (order: OrderSummary) => {
    if (!token) return; setBusyOrder(order._id);
    try { const result = await reorder(token, order._id); Alert.alert('Added to cart', result.message || 'Available items were added to your cart.'); }
    catch (error) { Alert.alert('Could not reorder', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setBusyOrder(null); }
  };

  const renderOrder = ({ item }: { item: OrderSummary }) => <View style={styles.orderCard}>
    <View style={styles.cardHeading}><View><Text style={styles.orderId}>{item.invoiceNumber || `Order ${item._id.slice(-8)}`}</Text><Text style={styles.meta}>{new Date(item.createdAt).toLocaleDateString()} · {item.status.replaceAll('_', ' ')}</Text></View><Text style={styles.total}>₹{item.totalAmount.toFixed(2)}</Text></View>
    <View style={styles.paymentStrip}><Text style={styles.paymentText}>Payment: {item.paymentMethod.replaceAll('_', ' ')} · {item.paymentStatus}</Text></View>
    {item.items.map((line, index) => <View key={`${item._id}-${index}`} style={styles.itemRow}>{line.productId?.image ? <Image source={{ uri: line.productId.image }} style={styles.productImage} /> : null}<View style={{ flex: 1 }}><Text style={styles.itemName}>{line.productId?.name || 'Product'}</Text><Text style={styles.meta}>{line.productId?.category || 'Product'} · Qty {line.quantity}{line.size ? ` · Size ${line.size}` : ''}{line.color ? ` · ${line.color}` : ''}</Text></View><Text style={styles.itemPrice}>₹{(line.price * line.quantity).toFixed(2)}</Text></View>)}
    {!!item.deliveryTimeline?.length && <View style={styles.timeline}><Text style={styles.sectionTitle}>Delivery timeline</Text>{item.deliveryTimeline.map((entry, i) => <View key={`${entry.status}-${i}`} style={styles.timelineRow}><View style={styles.timelineDot} /><View style={{ flex: 1 }}><Text style={styles.timelineTitle}>{entry.status.replaceAll('_', ' ')}</Text><Text style={styles.meta}>{entry.note} · {new Date(entry.at).toLocaleString()}</Text></View></View>)}</View>}
    <View style={styles.actions}><TouchableOpacity style={styles.secondaryButton} onPress={() => downloadInvoice(item)} disabled={busyOrder === item._id}><Text style={styles.secondaryButtonText}>{busyOrder === item._id ? 'Working…' : 'Download invoice PDF'}</Text></TouchableOpacity><TouchableOpacity style={styles.primaryButton} onPress={() => reorderItems(item)} disabled={busyOrder === item._id}><Text style={styles.primaryButtonText}>Reorder</Text></TouchableOpacity></View>
    {['PENDING', 'PROCESSING'].includes(item.status) && <TouchableOpacity onPress={() => runOrderAction(item, 'cancel')} style={styles.cancelButton} disabled={busyOrder === item._id}><Text style={styles.cancelText}>Request cancellation</Text></TouchableOpacity>}
    {['DELIVERED', 'COMPLETED'].includes(item.status) && <TouchableOpacity onPress={() => runOrderAction(item, 'return')} style={styles.returnButton} disabled={busyOrder === item._id}><Text style={styles.returnText}>Request return</Text></TouchableOpacity>}
  </View>;

  return <SafeAreaView style={styles.screen}><Text style={styles.title}>Order history</Text><Text style={styles.subtitle}>Invoices, payment details, delivery progress, and reorder actions.</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{statuses.map((status) => <TouchableOpacity key={status} onPress={() => applyFilter({ status })} style={[styles.chip, filters.status === status && styles.chipSelected]}><Text style={[styles.chipText, filters.status === status && styles.chipTextSelected]}>{status.replaceAll('_', ' ')}</Text></TouchableOpacity>)}</ScrollView>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{methods.map((method) => <TouchableOpacity key={method} onPress={() => applyFilter({ paymentMethod: method })} style={[styles.chip, filters.paymentMethod === method && styles.chipSelected]}><Text style={[styles.chipText, filters.paymentMethod === method && styles.chipTextSelected]}>{method.replaceAll('_', ' ')}</Text></TouchableOpacity>)}</ScrollView>
    <View style={styles.dateFilters}><TextInput placeholder="From YYYY-MM-DD" placeholderTextColor={colors.muted} value={from} onChangeText={setFrom} style={styles.dateInput} /><TextInput placeholder="To YYYY-MM-DD" placeholderTextColor={colors.muted} value={to} onChangeText={setTo} style={styles.dateInput} /><TouchableOpacity onPress={() => applyFilter({ from: from || undefined, to: to || undefined })} style={styles.dateButton}><Text style={styles.primaryButtonText}>Apply dates</Text></TouchableOpacity></View>
    <View style={styles.sortRow}><Text style={styles.meta}>{orders.length} orders loaded</Text><TouchableOpacity onPress={() => applyFilter({ sort: filters.sort === 'oldest' ? 'newest' : 'oldest' })}><Text style={styles.sortText}>Sort: {filters.sort === 'oldest' ? 'Oldest first' : 'Newest first'}</Text></TouchableOpacity></View>
    {loading && orders.length === 0 ? <ActivityIndicator color={colors.primary} /> : <FlatList data={orders} keyExtractor={(order) => order._id} renderItem={renderOrder} contentContainerStyle={styles.list} onEndReached={() => { if (!loading && page < pages) void load(page + 1); }} ListFooterComponent={loading ? <ActivityIndicator color={colors.primary} /> : undefined} ListEmptyComponent={<Text style={styles.empty}>No orders match these filters.</Text>} />}
  </SafeAreaView>;
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors'], s: ReturnType<typeof useTheme>['spacing'], t: ReturnType<typeof useTheme>['typography']) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background, paddingTop: s.md }, title: { color: c.text, fontSize: t.title, fontWeight: t.weight.bold, marginHorizontal: s.md }, subtitle: { color: c.muted, fontSize: t.body, marginHorizontal: s.md, marginTop: s.xs, marginBottom: s.md },
  filters: { paddingHorizontal: s.md, gap: s.sm, paddingBottom: s.sm }, chip: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, paddingHorizontal: s.md, paddingVertical: s.sm, borderRadius: 999 }, chipSelected: { backgroundColor: c.primary, borderColor: c.primary }, chipText: { color: c.text, fontSize: t.caption, fontWeight: t.weight.medium }, chipTextSelected: { color: c.surface },
  dateFilters: { flexDirection: 'row' as const, gap: s.xs, paddingHorizontal: s.md, alignItems: 'center' as const }, dateInput: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: c.border, borderRadius: 10, backgroundColor: c.surface, color: c.text, paddingHorizontal: s.sm, paddingVertical: s.sm }, dateButton: { backgroundColor: c.primary, paddingHorizontal: s.sm, paddingVertical: 12, borderRadius: 10 },
  sortRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: s.md }, sortText: { color: c.info, fontWeight: t.weight.bold }, list: { paddingHorizontal: s.md, paddingBottom: s.xl }, orderCard: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: s.md, marginBottom: s.md, elevation: 2 }, cardHeading: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'flex-start' as const }, orderId: { color: c.primaryDark, fontSize: t.heading, fontWeight: t.weight.bold }, meta: { color: c.muted, fontSize: t.caption, marginTop: s.xs }, total: { color: c.success, fontSize: t.heading, fontWeight: t.weight.bold }, paymentStrip: { backgroundColor: c.surfaceAlt, borderRadius: 10, padding: s.sm, marginTop: s.md }, paymentText: { color: c.text, fontSize: t.caption, fontWeight: t.weight.medium }, productImage: { width: 52, height: 64, borderRadius: 8, marginRight: s.sm, backgroundColor: c.surfaceAlt }, itemRow: { flexDirection: 'row' as const, paddingVertical: s.sm, borderBottomWidth: 1, borderBottomColor: c.border, alignItems: 'center' as const }, itemName: { color: c.text, fontSize: t.body, fontWeight: t.weight.bold }, itemPrice: { color: c.text, fontWeight: t.weight.bold }, timeline: { marginTop: s.md, padding: s.md, borderRadius: 12, backgroundColor: c.background }, sectionTitle: { color: c.text, fontWeight: t.weight.bold, marginBottom: s.sm }, timelineRow: { flexDirection: 'row' as const, gap: s.sm, marginBottom: s.sm }, timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary, marginTop: 4 }, timelineTitle: { color: c.text, fontWeight: t.weight.bold }, actions: { flexDirection: 'row' as const, gap: s.sm, marginTop: s.md }, primaryButton: { flex: 1, alignItems: 'center' as const, backgroundColor: c.primary, padding: s.md, borderRadius: 12 }, primaryButtonText: { color: c.surface, fontWeight: t.weight.bold, textAlign: 'center' as const }, secondaryButton: { flex: 1, alignItems: 'center' as const, borderWidth: 1, borderColor: c.info, padding: s.md, borderRadius: 12 }, secondaryButtonText: { color: c.info, fontWeight: t.weight.bold, textAlign: 'center' as const }, cancelButton: { alignSelf: 'flex-start' as const, paddingVertical: s.md }, cancelText: { color: c.danger, fontWeight: t.weight.bold }, returnButton: { alignSelf: 'flex-start' as const, paddingVertical: s.md }, returnText: { color: c.info, fontWeight: t.weight.bold }, empty: { color: c.muted, textAlign: 'center' as const, padding: s.xl },
});
