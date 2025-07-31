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
  if (!isFinite(baseRate) || baseRate <= 0) {
    return 1.0; // Güvenli varsayılan değer
  }
  
  const fluctuation = (Math.random() - 0.5) * 0.02; // ±%1 dalgalanma
  const newRate = baseRate * (1 + fluctuation);
  
  // Sonucun geçerli olduğundan emin ol
  return isFinite(newRate) && newRate > 0 ? newRate : baseRate;
};

// Test için kur hesaplama fonksiyonu
const calculateTestRate = (from: string, to: string): number => {
  if (from === to) return 1;
  
  try {
    if (BASE_RATES[from] && BASE_RATES[from][to]) {
      const rate = generateRandomFluctuation(BASE_RATES[from][to]);
      return isFinite(rate) && rate > 0 ? rate : 1.0;
    }
    
    // Çapraz kur hesaplama
    if (BASE_RATES[from] && BASE_RATES[to]) {
      const fromRate = BASE_RATES[from]['USD'] || (1 / (BASE_RATES['USD'][from] || 1));
      const toRate = BASE_RATES['USD'][to] || (1 / (BASE_RATES[to]['USD'] || 1));
      const throughUSD = fromRate * toRate;
      const rate = generateRandomFluctuation(throughUSD);
      return isFinite(rate) && rate > 0 ? rate : 1.0;
    }
    
    return 1.0; // Varsayılan değer
  } catch (error) {
    console.error('Test rate hesaplama hatası:', error);
    return 1.0; // Hata durumunda güvenli varsayılan değer
  }
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

export const fetchHistoricalRates = async (
  fromCurrency: string, 
  toCurrency: string, 
  days: number
): Promise<{ date: string; rate: number }[]> => {
  try {
    if (isDebugMode()) {
      console.log(`Fetching historical rates: ${fromCurrency} to ${toCurrency} for ${days} days (Test Mode: ${TEST_MODE})`);
    }

    // Periodik örnekleme: 7 veri noktası için hesaplama
    const generatePeriodicData = (baseRate: number, periodType: string, interval: number) => {
      const data = [];
      const safeBaseRate = isFinite(baseRate) && baseRate > 0 ? baseRate : 1.0;
      
      for (let i = 6; i >= 0; i--) {
        let date;
        let fluctuation;
        
        switch(periodType) {
          case 'weekly':
            date = moment().subtract(i * 7, 'days');
            break;
          case 'monthly':
            date = moment().subtract(i, 'months');
            break;
          case 'quarterly':
            date = moment().subtract(i * 3, 'months');
            break;
          case 'semiannual':
            date = moment().subtract(i * 6, 'months');
            break;
          case 'yearly':
            date = moment().subtract(i, 'years');
            break;
          default:
            date = moment().subtract(i * interval, 'days');
        }
        
        // Daha gerçekçi dalgalanmalar - uzun vadeli trendler
        fluctuation = (Math.random() - 0.5) * (0.05 + (i * 0.01));
        let rate = safeBaseRate * (1 + fluctuation);
        
        if (!isFinite(rate) || rate <= 0) {
          rate = safeBaseRate;
        }
        
        data.push({
          date: date.format('YYYY-MM-DD'),
          rate: Math.max(0.0001, Number(rate.toFixed(4)))
        });
      }
      
      return data;
    };

    if (TEST_MODE) {
      // Test modunda periodik veri üret
      await new Promise(resolve => setTimeout(resolve, 800));
      
      let periodType = 'daily';
      if (days <= 7) periodType = 'weekly';
      else if (days <= 30) periodType = 'monthly';
      else if (days <= 90) periodType = 'quarterly';
      else if (days <= 180) periodType = 'semiannual';
      else periodType = 'yearly';
      
      const baseRate = calculateTestRate(fromCurrency, toCurrency);
      const historicalData = generatePeriodicData(baseRate, periodType, days);

      if (isDebugMode()) {
        console.log(`Test periodic data generated: ${historicalData.length} points for ${periodType}`);
      }

      return historicalData;
    }

    // Live modda gerçek API'den veri çek - periodik örnekleme
    try {
      const historicalData = [];
      const today = moment();
      
      // API key kontrolü
      if (!API_KEY || API_KEY.length < 10) {
        console.warn('Invalid or missing API key, falling back to test data');
        throw new Error('Invalid API key');
      }
      
      // 7 veri noktası için tarihleri hesapla
      const targetDates = [];
      
      for (let i = 6; i >= 0; i--) {
        let targetDate;
        
        if (days <= 7) {
          // Haftalık: aynı gün, geçen haftalar
          targetDate = today.clone().subtract(i * 7, 'days');
        } else if (days <= 30) {
          // Aylık: aynı gün, geçen aylar
          targetDate = today.clone().subtract(i, 'months');
        } else if (days <= 90) {
          // 3 aylık: 3'er aylık periyodlar
          targetDate = today.clone().subtract(i * 3, 'months');
        } else if (days <= 180) {
          // 6 aylık: 6'şar aylık periyodlar
          targetDate = today.clone().subtract(i * 6, 'months');
        } else {
          // 1 yıllık: yıllık periyodlar
          targetDate = today.clone().subtract(i, 'years');
        }
        
        targetDates.push(targetDate.format('YYYY/MM/DD'));
      }
      
      // Her tarih için tek tek API çağrısı yap
      for (const targetDate of targetDates) {
        const url = `${BASE_URL}/${API_KEY}/history/${fromCurrency}/${targetDate}`;
        
        if (isDebugMode()) {
          console.log('Fetching historical data from:', url.replace(API_KEY, '***API_KEY***'));
        }
        
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 saniye timeout
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const data = await response.json();
            
            if (isDebugMode()) {
              console.log('API Response for', targetDate, ':', data);
            }
            
            if (data.conversion_rates && data.conversion_rates[toCurrency]) {
              const rate = data.conversion_rates[toCurrency];
              
              // Geçerli bir kur değeri kontrolü
              if (rate && isFinite(rate) && rate > 0) {
                historicalData.push({
                  date: targetDate.replace(/\//g, '-'),
                  rate: Math.max(0.0001, Number(Number(rate).toFixed(4)))
                });
              }
            } else if (data.result === 'error') {
              console.warn('API Error:', data['error-type']);
              // API hatası durumunda döngüden çık
              break;
            }
          } else {
            console.warn('API request failed:', response.status, response.statusText);
            // HTTP hatası durumunda döngüden çık
            break;
          }
        } catch (fetchError) {
          console.warn('Fetch error for date', targetDate, ':', fetchError);
          // Network hatası durumunda döngüden çık
          break;
        }
        
        // API rate limit için kısa bekleme
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Tarihe göre sırala (artan)
      historicalData.sort((a, b) => moment(a.date).valueOf() - moment(b.date).valueOf());
      
      if (historicalData.length === 0) {
        // Fallback: Periodik test verisi üret
        console.warn('Live data empty, falling back to periodic test data');
        console.warn('Possible causes: Invalid API key, network issues, or API limits');
        let periodType = 'daily';
        if (days <= 7) periodType = 'weekly';
        else if (days <= 30) periodType = 'monthly';
        else if (days <= 90) periodType = 'quarterly';
        else if (days <= 180) periodType = 'semiannual';
        else periodType = 'yearly';
        
        const baseRate = calculateTestRate(fromCurrency, toCurrency);
        return generatePeriodicData(baseRate, periodType, days);
      }
      
      if (isDebugMode()) {
        console.log(`Live periodic data fetched: ${historicalData.length} points`);
      }
      
      return historicalData;
    } catch (error) {
      console.warn('Live API failed, falling back to periodic test data:', error);
      let periodType = 'daily';
      if (days <= 7) periodType = 'weekly';
      else if (days <= 30) periodType = 'monthly';
      else if (days <= 90) periodType = 'quarterly';
      else if (days <= 180) periodType = 'semiannual';
      else periodType = 'yearly';
      
      const baseRate = calculateTestRate(fromCurrency, toCurrency);
      return generatePeriodicData(baseRate, periodType, days);
    }
  } catch (error) {
    console.error('Geçmiş kurlar alınamadı:', error);
    // Hata durumunda test verisi üret
    let periodType = 'daily';
    if (days <= 7) periodType = 'weekly';
    else if (days <= 30) periodType = 'monthly';
    else if (days <= 90) periodType = 'quarterly';
    else if (days <= 180) periodType = 'semiannual';
    else periodType = 'yearly';
    
    const baseRate = calculateTestRate(fromCurrency, toCurrency);
    return generatePeriodicData(baseRate, periodType, days);
  }
};

// Export edilebilir periodik test verisi üretme fonksiyonu
export const generatePeriodicData = (baseRate: number, periodType: string, interval: number): { date: string; rate: number }[] => {
  const data = [];
  const safeBaseRate = isFinite(baseRate) && baseRate > 0 ? baseRate : 1.0;
  
  for (let i = 6; i >= 0; i--) {
    let date;
    let fluctuation;
    
    switch(periodType) {
      case 'weekly':
        date = moment().subtract(i * 7, 'days');
        break;
      case 'monthly':
        date = moment().subtract(i, 'months');
        break;
      case 'quarterly':
        date = moment().subtract(i * 3, 'months');
        break;
      case 'semiannual':
        date = moment().subtract(i * 6, 'months');
        break;
      case 'yearly':
        date = moment().subtract(i, 'years');
        break;
      default:
        date = moment().subtract(i * interval, 'days');
    }
    
    // Daha gerçekçi dalgalanmalar - uzun vadeli trendler
    fluctuation = (Math.random() - 0.5) * (0.05 + (i * 0.01));
    let rate = safeBaseRate * (1 + fluctuation);
    
    if (!isFinite(rate) || rate <= 0) {
      rate = safeBaseRate;
    }
    
    data.push({
      date: date.format('YYYY-MM-DD'),
      rate: Math.max(0.0001, Number(rate.toFixed(4)))
    });
  }
  
  return data;
};

// Fallback test verisi üretme fonksiyonu - periodik yaklaşım
const generateFallbackHistoricalData = (fromCurrency: string, toCurrency: string, days: number): { date: string; rate: number }[] => {
  let periodType = 'daily';
  if (days <= 7) periodType = 'weekly';
  else if (days <= 30) periodType = 'monthly';
  else if (days <= 90) periodType = 'quarterly';
  else if (days <= 180) periodType = 'semiannual';
  else periodType = 'yearly';
  
  const baseRate = calculateTestRate(fromCurrency, toCurrency);
  return generatePeriodicData(baseRate, periodType, days);
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