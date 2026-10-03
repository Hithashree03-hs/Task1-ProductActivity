import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@recently_viewed';

export interface LocalViewedItem {
  productId: string;
  viewedAt: string;
};

export const getLocalHistory = async (): Promise<LocalViewedItem[]> => {
  try {
    const storedHistory = await AsyncStorage.getItem(STORAGE_KEY);

    if (!storedHistory) {
      return [];
    }

    const history: LocalViewedItem[] = JSON.parse(storedHistory);

    return history;
  } catch (error) {
    console.error('Failed to get local history:', error);
    return [];
  }
};

export const recordLocalView = async (
  productId: string
): Promise<void> => {
  try {
    const history = await getLocalHistory();

    const updatedHistory = history.filter(
      (item) => item.productId !== productId
    );

    updatedHistory.unshift({
      productId,
      viewedAt: new Date().toISOString(),
    });

    const limitedHistory = updatedHistory.slice(0, 20);

    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(limitedHistory)
    );
  } catch (error) {
    console.error('Failed to save local history:', error);
  }
};

export const clearLocalHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear local history:', error);
  }
};