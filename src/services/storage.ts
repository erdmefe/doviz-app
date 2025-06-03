import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConversionHistory } from '../types';

const HISTORY_KEY = '@currency_converter_history';
const FAVORITES_KEY = 'favorite_currencies';

// Varsayılan favoriler
const DEFAULT_FAVORITES = ['USD', 'EUR', 'TRY', 'GBP', 'JPY'];

export const initializeFavorites = async (): Promise<string[]> => {
  try {
    console.log('Initializing favorites...');
    const favorites = await AsyncStorage.getItem(FAVORITES_KEY);
    console.log('Current stored favorites:', favorites);
    
    if (!favorites) {
      console.log('No favorites found, setting defaults:', DEFAULT_FAVORITES);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(DEFAULT_FAVORITES));
      return DEFAULT_FAVORITES;
    }

    const parsedFavorites = JSON.parse(favorites);
    console.log('Parsed favorites:', parsedFavorites);

    if (!Array.isArray(parsedFavorites)) {
      console.log('Invalid favorites format, setting defaults:', DEFAULT_FAVORITES);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(DEFAULT_FAVORITES));
      return DEFAULT_FAVORITES;
    }

    return parsedFavorites;
  } catch (error) {
    console.error('Error initializing favorites:', error);
    return DEFAULT_FAVORITES;
  }
};

export const saveConversion = async (conversion: ConversionHistory): Promise<void> => {
  try {
    const history = await getHistory();
    const updatedHistory = [conversion, ...history];
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Error saving conversion:', error);
    throw error;
  }
};

export const getHistory = async (): Promise<ConversionHistory[]> => {
  try {
    const history = await AsyncStorage.getItem(HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Error getting history:', error);
    return [];
  }
};

export const clearHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error('Error clearing history:', error);
    throw error;
  }
};

export const getFavoriteCurrencies = async (): Promise<string[]> => {
  try {
    console.log('Getting favorite currencies...');
    const favorites = await AsyncStorage.getItem(FAVORITES_KEY);
    console.log('Retrieved favorites from storage:', favorites);

    if (!favorites) {
      console.log('No favorites found, initializing...');
      return initializeFavorites();
    }

    const parsedFavorites = JSON.parse(favorites);
    console.log('Parsed favorites:', parsedFavorites);

    if (!Array.isArray(parsedFavorites)) {
      console.log('Invalid favorites format, initializing...');
      return initializeFavorites();
    }

    return parsedFavorites;
  } catch (error) {
    console.error('Error getting favorites:', error);
    return DEFAULT_FAVORITES;
  }
};

export const toggleFavoriteCurrency = async (currencyCode: string): Promise<boolean> => {
  try {
    console.log('Toggling favorite for:', currencyCode);
    let favorites = await getFavoriteCurrencies();
    console.log('Current favorites before toggle:', favorites);
    
    const isCurrentlyFavorite = favorites.includes(currencyCode);
    console.log('Is currently favorite:', isCurrentlyFavorite);
    
    if (isCurrentlyFavorite) {
      console.log('Removing from favorites');
      favorites = favorites.filter(code => code !== currencyCode);
    } else {
      console.log('Adding to favorites');
      favorites = [...favorites, currencyCode];
    }
    
    console.log('New favorites list:', favorites);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    return !isCurrentlyFavorite;
  } catch (error) {
    console.error('Error toggling favorite:', error);
    throw error;
  }
}; 