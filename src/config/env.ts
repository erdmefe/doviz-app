/**
 * Environment Configuration
 *
 * Bu dosya environment variables'ları yönetir ve tip güvenliği sağlar.
 * Expo'da environment variables Constants.expoConfig.extra üzerinden alınır.
 */

import Constants from 'expo-constants';

export interface AppConfig {
  // Environment
  NODE_ENV: 'development' | 'production' | 'test';

  // API Configuration
  API_KEY: string;
  BASE_URL: string;

  // App Configuration
  TEST_MODE: boolean;
  APP_NAME: string;
  APP_VERSION: string;

  // Debug Configuration
  DEBUG_MODE: boolean;
}

/**
 * Expo Constants'tan environment variable'ı güvenli bir şekilde alır
 */
const getEnvVar = (key: string, defaultValue?: string): string => {
  const extra = Constants.expoConfig?.extra;
  const value = extra?.[key];

  if (!value && !defaultValue) {
    console.warn(`Environment variable ${key} is not defined`);
    return '';
  }

  return value || defaultValue || '';
};

/**
 * Boolean environment variable'ı güvenli bir şekilde alır
 */
const getBooleanEnvVar = (key: string, defaultValue: boolean = false): boolean => {
  const extra = Constants.expoConfig?.extra;
  const value = extra?.[key];

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }

  return defaultValue;
};

/**
 * Uygulama konfigürasyonu
 */
export const config: AppConfig = {
  // Environment
  NODE_ENV: (getEnvVar('nodeEnv', 'development') as AppConfig['NODE_ENV']),

  // API Configuration
  API_KEY: getEnvVar('apiKey'),
  BASE_URL: getEnvVar('baseUrl', 'https://v6.exchangerate-api.com/v6'),

  // App Configuration
  TEST_MODE: getBooleanEnvVar('testMode', true),
  APP_NAME: getEnvVar('appName', 'Döviz Çevirici'),
  APP_VERSION: getEnvVar('appVersion', '1.0.0'),

  // Debug Configuration
  DEBUG_MODE: getBooleanEnvVar('debugMode', false),
};

/**
 * Development ortamında mı kontrol eder
 */
export const isDevelopment = (): boolean => {
  return config.NODE_ENV === 'development';
};

/**
 * Production ortamında mı kontrol eder
 */
export const isProduction = (): boolean => {
  return config.NODE_ENV === 'production';
};

/**
 * Test ortamında mı kontrol eder
 */
export const isTest = (): boolean => {
  return config.NODE_ENV === 'test';
};

/**
 * Debug modu aktif mi kontrol eder
 */
export const isDebugMode = (): boolean => {
  return config.DEBUG_MODE || isDevelopment();
};

/**
 * Test modu aktif mi kontrol eder
 */
export const isTestMode = (): boolean => {
  return config.TEST_MODE;
};

/**
 * Konfigürasyon doğrulaması
 */
export const validateConfig = (): void => {
  const errors: string[] = [];
  
  if (!config.API_KEY && !config.TEST_MODE) {
    errors.push('API_KEY is required when TEST_MODE is false');
  }
  
  if (!config.BASE_URL) {
    errors.push('BASE_URL is required');
  }
  
  if (errors.length > 0) {
    console.error('Configuration validation failed:');
    errors.forEach(error => console.error(`- ${error}`));
    
    if (isProduction()) {
      throw new Error('Invalid configuration in production environment');
    }
  }
};

// Uygulama başlatılırken konfigürasyonu doğrula
validateConfig();

// Development ortamında konfigürasyonu logla
if (isDevelopment() && isDebugMode()) {
  console.log('App Configuration:', {
    ...config,
    API_KEY: config.API_KEY ? '***HIDDEN***' : 'NOT_SET'
  });
}
