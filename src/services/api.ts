import axios from 'axios';
import { ExchangeRateResponse } from '../types';
import moment from 'moment';

// ExchangeRate-API Integration
const API_KEY = 'aca8fff2224a7a95db5647bd';
const BASE_URL = 'https://v6.exchangerate-api.com/v6';

// Test modu aktif/pasif
const TEST_MODE = true;

// Sabit döviz kurları (test için)
const BASE_RATES: { [key: string]: { [key: string]: number } } = {
  'USD': {
    'TRY': 31.5,
    'EUR': 0.92,
    'GBP': 0.79,
    'JPY': 151.50
  },
  'EUR': {
    'TRY': 34.2,
    'USD': 1.09,
    'GBP': 0.86,
    'JPY': 164.85
  },
  'TRY': {
    'USD': 0.032,
    'EUR': 0.029,
    'GBP': 0.025,
    'JPY': 4.82
  },
  'GBP': {
    'USD': 1.27,
    'EUR': 1.16,
    'TRY': 39.8,
    'JPY': 192.45
  },
  'JPY': {
    'USD': 0.0066,
    'EUR': 0.0061,
    'GBP': 0.0052,
    'TRY': 0.21
  }
};

// Rastgele dalgalanma oluşturmak için yardımcı fonksiyon
const generateRandomFluctuation = (baseRate: number): number => {
  const fluctuation = (Math.random() - 0.5) * 0.02; // ±%1 dalgalanma
  return baseRate * (1 + fluctuation);
};

// Test için kur hesaplama fonksiyonu
const calculateTestRate = (from: string, to: string): number => {
  if (from === to) return 1;
  
  if (BASE_RATES[from] && BASE_RATES[from][to]) {
    return generateRandomFluctuation(BASE_RATES[from][to]);
  }
  
  // Çapraz kur hesaplama
  if (BASE_RATES[from] && BASE_RATES[to]) {
    const throughUSD = (BASE_RATES[from]['USD'] || (1 / BASE_RATES['USD'][from])) *
                      (BASE_RATES['USD'][to] || (1 / BASE_RATES[to]['USD']));
    return generateRandomFluctuation(throughUSD);
  }
  
  throw new Error('Geçersiz para birimi çifti');
};

export const fetchExchangeRates = async (baseCurrency: string): Promise<ExchangeRateResponse> => {
  try {
    const response = await fetch(`${BASE_URL}/${API_KEY}/latest/${baseCurrency}`);
    
    if (!response.ok) {
      throw new Error('Döviz kurları alınamadı');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Döviz kuru API hatası:', error);
    throw new Error('Döviz kurları alınamadı. Lütfen internet bağlantınızı kontrol edin.');
  }
};

export const convertCurrency = async (
amount: number, fromCurrency: string, toCurrency: string, date: moment.Moment): Promise<number> => {
  try {    if (TEST_MODE) {
      // Test modunda yapay gecikme ekleyelim
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const rate = calculateTestRate(fromCurrency, toCurrency);
      return Number((amount * rate).toFixed(2));
    }

    // Normal API çağrısı (şu an devre dışı)
    const response = await fetchExchangeRates(fromCurrency);
    if (!response.conversion_rates || !response.conversion_rates[toCurrency]) {
      throw new Error('Dönüşüm oranı bulunamadı');
    }
    return Number((amount * response.conversion_rates[toCurrency]).toFixed(2));
  } catch (error) {
    console.error('Dönüşüm hatası:', error);
    throw error;
  }
};

export const getAvailableCurrencies = async (): Promise<string[]> => {
  if (TEST_MODE) {
    // Test modunda yapay gecikme ekleyelim
    await new Promise(resolve => setTimeout(resolve, 300));
    return Object.keys(BASE_RATES);
  }

  try {
    const response = await fetchExchangeRates('USD');
    return Object.keys(response.conversion_rates);
  } catch (error) {
    console.error('Para birimleri alınamadı:', error);
    throw error;
  }
};