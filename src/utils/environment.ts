/**
 * Environment Utilities
 * 
 * Environment ile ilgili yardımcı fonksiyonlar
 */

import { config, isDevelopment, isProduction, isDebugMode, isTestMode } from '../config/env';

/**
 * Environment bilgilerini konsola yazdırır
 */
export const logEnvironmentInfo = (): void => {
  if (!isDebugMode()) return;

  console.log('=== Environment Information ===');
  console.log(`Environment: ${config.NODE_ENV}`);
  console.log(`App Name: ${config.APP_NAME}`);
  console.log(`App Version: ${config.APP_VERSION}`);
  console.log(`Test Mode: ${config.TEST_MODE}`);
  console.log(`Debug Mode: ${config.DEBUG_MODE}`);
  console.log(`API URL: ${config.BASE_URL}`);
  console.log(`API Key: ${config.API_KEY ? '***SET***' : 'NOT_SET'}`);
  console.log('===============================');
};

/**
 * API anahtarının varlığını kontrol eder
 */
export const checkApiKey = (): boolean => {
  if (isTestMode()) {
    return true; // Test modunda API anahtarı gerekli değil
  }

  if (!config.API_KEY) {
    console.error('API anahtarı tanımlanmamış! Lütfen .env dosyasında EXPO_PUBLIC_API_KEY değerini ayarlayın.');
    return false;
  }

  return true;
};

/**
 * Environment'ın production için hazır olup olmadığını kontrol eder
 */
export const validateProductionEnvironment = (): boolean => {
  if (!isProduction()) {
    return true; // Production değilse doğrulama gerekli değil
  }

  const errors: string[] = [];

  if (!config.API_KEY) {
    errors.push('API_KEY is required in production');
  }

  if (config.TEST_MODE) {
    errors.push('TEST_MODE should be false in production');
  }

  if (config.DEBUG_MODE) {
    errors.push('DEBUG_MODE should be false in production');
  }

  if (errors.length > 0) {
    console.error('Production environment validation failed:');
    errors.forEach(error => console.error(`- ${error}`));
    return false;
  }

  return true;
};

/**
 * Development ortamı için uyarıları gösterir
 */
export const showDevelopmentWarnings = (): void => {
  if (!isDevelopment()) return;

  if (!config.API_KEY && !config.TEST_MODE) {
    console.warn('⚠️ API anahtarı tanımlanmamış ve test modu kapalı!');
  }

  if (config.TEST_MODE) {
    console.warn('🧪 Test modu aktif - gerçek API çağrıları yapılmayacak');
  }
};

/**
 * Environment durumunu özetler
 */
export const getEnvironmentSummary = (): string => {
  const parts = [
    config.NODE_ENV.toUpperCase(),
    config.TEST_MODE ? 'TEST' : 'LIVE',
    config.DEBUG_MODE ? 'DEBUG' : 'RELEASE'
  ];

  return parts.join(' | ');
};

/**
 * Uygulama başlatılırken environment kontrollerini yapar
 */
export const initializeEnvironment = (): void => {
  logEnvironmentInfo();
  showDevelopmentWarnings();
  
  if (!checkApiKey() && !isTestMode()) {
    throw new Error('API anahtarı gerekli! Lütfen .env dosyasını kontrol edin.');
  }

  if (!validateProductionEnvironment()) {
    throw new Error('Production environment validation failed');
  }

  if (isDebugMode()) {
    console.log(`🚀 Uygulama başlatıldı: ${getEnvironmentSummary()}`);
  }
};
