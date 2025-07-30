import axios from 'axios';
import { ExchangeRateResponse } from '../types';
import moment from 'moment';
import { config, isTestMode, isDebugMode } from '../config/env';

// Environment variables'dan API konfigürasyonu
const API_KEY = config.API_KEY;
const BASE_URL = config.BASE_URL;

// Test modu environment'dan alınıyor
const TEST_MODE = isTestMode();

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
    if (!API_KEY && !TEST_MODE) {
      throw new Error('API anahtarı tanımlanmamış');
    }

    const url = `${BASE_URL}/${API_KEY}/latest/${baseCurrency}`;

    if (isDebugMode()) {
      console.log('API Request URL:', url.replace(API_KEY, '***API_KEY***'));
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API Hatası: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();

    if (isDebugMode()) {
      console.log('API Response:', data);
    }

    return data;
  } catch (error) {
    console.error('Döviz kuru API hatası:', error);
    throw new Error('Döviz kurları alınamadı. Lütfen internet bağlantınızı kontrol edin.');
  }
};

export const convertCurrency = async (
amount: number, fromCurrency: string, toCurrency: string, date: moment.Moment): Promise<number> => {
  try {
    if (isDebugMode()) {
      console.log(`Converting ${amount} ${fromCurrency} to ${toCurrency} (Test Mode: ${TEST_MODE})`);
    }

    if (TEST_MODE) {
      // Test modunda yapay gecikme ekleyelim
      await new Promise(resolve => setTimeout(resolve, 500));

      const rate = calculateTestRate(fromCurrency, toCurrency);
      const result = Number((amount * rate).toFixed(2));

      if (isDebugMode()) {
        console.log(`Test conversion: ${amount} ${fromCurrency} = ${result} ${toCurrency} (rate: ${rate})`);
      }

      return result;
    }

    // Normal API çağrısı
    const response = await fetchExchangeRates(fromCurrency);
    if (!response.conversion_rates || !response.conversion_rates[toCurrency]) {
      throw new Error('Dönüşüm oranı bulunamadı');
    }

    const result = Number((amount * response.conversion_rates[toCurrency]).toFixed(2));

    if (isDebugMode()) {
      console.log(`API conversion: ${amount} ${fromCurrency} = ${result} ${toCurrency}`);
    }

    return result;
  } catch (error) {
    console.error('Dönüşüm hatası:', error);
    throw error;
  }
};

export const getAvailableCurrencies = async (): Promise<string[]> => {
  if (TEST_MODE) {
    // Test modunda yapay gecikme ekleyelim
    await new Promise(resolve => setTimeout(resolve, 300));
    const currencies = Object.keys(BASE_RATES);

    if (isDebugMode()) {
      console.log('Available currencies (Test Mode):', currencies);
    }

    return currencies;
  }

  try {
    const response = await fetchExchangeRates('USD');
    const currencies = Object.keys(response.conversion_rates);

    if (isDebugMode()) {
      console.log('Available currencies (API):', currencies.length, 'currencies');
    }

    return currencies;
  } catch (error) {
    console.error('Para birimleri alınamadı:', error);
    throw error;
  }
};