import React, { useState, useEffect } from 'react';
import './src/i18n';
import { useTranslation } from 'react-i18next';
import {
  SafeAreaView,
  StyleSheet,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  StatusBar,
  Platform,
  Dimensions,
  useColorScheme,
  Modal,
  TouchableOpacity,
  FlatList,
  Pressable,
  Text,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useDerivedValue,
  interpolate,
  Extrapolate,
  FadeIn,
  FadeInDown,
  FadeInLeft,
  Layout,
  SharedValue,
  useSharedValue,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import {
  Button,
  Dialog,
  Portal,
  Snackbar,
  IconButton,
  TextInput,
  TouchableRipple,
  Card,
  Provider as PaperProvider,
  MD3DarkTheme,
  MD3LightTheme,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MotiView } from 'moti';
import { ConversionHistory, Currency } from './src/types';
import { convertCurrency } from './src/services/api';
import { saveConversion, getHistory, clearHistory, getFavoriteCurrencies, toggleFavoriteCurrency, initializeFavorites } from './src/services/storage';
import { getAvailableCurrencies } from './src/services/api';
import { currencyNames } from './src/data/currencyData';
import ConversionChart from './src/components/ConversionChart';
import CalculatorKeyboard from './src/components/CalculatorKeyboard';
import { useCalculator } from './src/hooks/useCalculator';
import { config, isDebugMode, isTestMode } from './src/config/env';
import { initializeEnvironment } from './src/utils/environment';
import moment from 'moment';

interface ToastProps {
  visible: boolean;
  message: string;
  onHide: () => void;
  type?: 'success' | 'error';
}

const Toast: React.FC<ToastProps> = ({ visible, message, onHide, type = 'success' }) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: withSpring(visible ? 0 : -100, {
            damping: 15,
            stiffness: 100,
          }),
        },
      ],
      opacity: withTiming(visible ? 1 : 0, {
        duration: 200,
      }),
    };
  });

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onHide();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible, onHide]);

  if (!message) return null;

  return (
    <Animated.View style={[
      styles.toast,
      animatedStyle,
      { backgroundColor: type === 'success' ? '#4CAF50' : '#F44336' }
    ]}>
      <View style={styles.toastContent}>
        <IconButton
          icon={type === 'success' ? "check-circle" : "alert-circle"}
          size={18}
          iconColor="#fff"
          style={styles.toastIcon}
        />
        <Text style={styles.toastText}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
};

const switchStyles = StyleSheet.create({
  container: {
    width: 56,
    height: 32,
    borderRadius: 16,
    padding: 4,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  toggle: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  }
});

const ThemeSwitch: React.FC<{ value: boolean; onValueChange: (value: boolean) => void }> = ({ 
  value, 
  onValueChange 
}) => {
  const offset = useDerivedValue(() => {
    return withSpring(value ? 28 : 4, {
      damping: 15,
      stiffness: 120,
    });
  });

  const containerStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: value ? '#2196F3' : '#E0E0E0',
      transform: [{ scale: withSpring(value ? 1.02 : 1) }],
    };
  });

  const toggleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: offset.value }],
    };
  });

  return (
    <TouchableOpacity 
      activeOpacity={0.8} 
      onPress={() => onValueChange(!value)}
    >
      <Animated.View style={[switchStyles.container, containerStyle]}>
        <Animated.View style={[switchStyles.toggle, toggleStyle]}>
          <View style={switchStyles.iconContainer}>
            <IconButton
              icon={value ? "weather-night" : "white-balance-sunny"}
              size={16}
              iconColor={value ? "#2196F3" : "#FFA000"}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const formatInputNumber = (text: string): string => {
  // Remove all non-numeric characters except comma
  const cleanNumber = text.replace(/[^0-9,]/g, '');
  
  // If empty, return empty string
  if (!cleanNumber) return '';

  // Split by comma
  const parts = cleanNumber.split(',');
  
  // Handle the integer part (before comma)
  let integerPart = parts[0];
  
  // Add thousand separators to integer part
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  // Handle decimal part if exists
  if (parts.length > 1) {
    // Take only first two digits after comma
    const decimalPart = parts[1].slice(0, 2);
    return `${integerPart},${decimalPart}`;
  }
  
  return integerPart;
};

const parseFormattedNumber = (formattedNumber: string): number => {
  // Remove all thousand separators and replace comma with dot
  const numberStr = formattedNumber.replace(/\./g, '').replace(',', '.');
  return parseFloat(numberStr) || 0;
};

// Varsayılan sık kullanılan para birimleri
const DEFAULT_FAVORITES = ['USD', 'EUR', 'TRY', 'GBP', 'JPY'];

const CurrencyDropdown: React.FC<{
  value: string;
  onSelect: (currency: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  currencies: Currency[];
  theme: any;
  favorites: string[];
  onToggleFavorite: (code: string) => void;
}> = ({ value, onSelect, isOpen, onToggle, currencies, theme, favorites, onToggleFavorite }) => {
  const renderItem = ({ item: currency }: { item: Currency }) => {
    // Ayırıcı öğe için özel render
    if (currency.code === 'separator') {
      return (
        <View style={[
          styles.dropdownSeparator,
          {
            borderBottomColor: theme.colors.border,
            marginVertical: 8,
          }
        ]} />
      );
    }

    const isFavorite = favorites.includes(currency.code);

    return (
      <Pressable
        onPress={() => {
          onSelect(currency.code);
          onToggle();
        }}
        style={({ pressed }) => [
          styles.dropdownItem,
          {
            backgroundColor: pressed 
              ? theme.colors.primary + '30'
              : currency.code === value
                ? theme.colors.primary + '15'
                : 'transparent',
          },
        ]}>
        <View style={styles.dropdownItemContent}>
          <View style={styles.currencyInfo}>
            <Text
              style={[
                styles.currencyCode,
                {
                  color: currency.code === value ? theme.colors.primary : theme.colors.text,
                  fontWeight: currency.code === value ? '600' : '400',
                },
              ]}>
              {currency.code}
            </Text>
            <Text
              style={[
                styles.currencyName,
                {
                  color: theme.colors.textSecondary,
                },
              ]}>
              {currency.name}
            </Text>
          </View>
          {currency.code !== 'TEST' && (
            <IconButton
              icon={isFavorite ? "star" : "star-outline"}
              size={20}
              iconColor={isFavorite ? "#FFC107" : theme.colors.textSecondary}
              onPress={(e) => {
                e.stopPropagation();
                onToggleFavorite(currency.code);
              }}
              style={styles.favoriteIcon}
            />
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.dropdownContainer}>
      <TouchableRipple
        onPress={onToggle}
        style={[
          styles.dropdownButton,
          {
            backgroundColor: theme.colors.surface,
            borderColor: isOpen ? theme.colors.primary : theme.colors.border,
          },
        ]}
        rippleColor={theme.colors.primary + '20'}>
        <View style={styles.dropdownButtonContent}>
          <Text style={[styles.dropdownButtonText, { color: theme.colors.text }]}>
            {value}
          </Text>
          <IconButton
            icon={isOpen ? 'chevron-up' : 'chevron-down'}
            size={20}
            iconColor={isOpen ? theme.colors.primary : theme.colors.text}
            style={styles.dropdownIcon}
          />
        </View>
      </TouchableRipple>

      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={onToggle}>
        <Pressable style={styles.modalOverlay} onPress={onToggle}>
          <Pressable>
            <View style={[
              styles.modalContent,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                ...Platform.select({
                  ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 4,
                  },
                  android: {
                    elevation: 4,
                  },
                }),
              }
            ]}>
              <FlatList
                data={currencies}
                renderItem={renderItem}
                keyExtractor={(item) => item.code}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.dropdownScrollContent}
                style={styles.dropdownScroll}
                scrollEventThrottle={16}
                windowSize={5}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                removeClippedSubviews={true}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default function App() {
  const { t, i18n } = useTranslation();
  // Environment initialization
  React.useEffect(() => {
    try {
      initializeEnvironment();
    } catch (error) {
      console.error('Environment initialization failed:', error);
    }
  }, []);

  const [amount, setAmount] = useState('');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('TRY');
  const [result, setResult] = useState<number | null>(null);
  const [history, setHistory] = useState<ConversionHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const systemColorScheme = useColorScheme();
  const [showToast, setShowToast] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorEnabled, setCalculatorEnabled] = useState(true);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [availableCurrencies, setAvailableCurrencies] = useState<Currency[]>([]);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', message: string, visible: boolean } | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedConversion, setSelectedConversion] = useState<ConversionHistory | null>(null);
  const [showChartModal, setShowChartModal] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [language, setLanguage] = useState(i18n.language || 'tr');
  const [showWidgets, setShowWidgets] = useState(true);

  // Calculator hook - artık otomatik olarak miktar alanını güncellemez
  const calculator = useCalculator();

  // Hesap makinesi onay fonksiyonu
  const handleCalculatorConfirm = () => {
    if (calculator.display && calculator.display !== '') {
      setAmount(calculator.display);
      setResult(null);
      setShowCalculator(false);
    }
  };

  const theme = {
    ...(isDarkMode ? MD3DarkTheme : MD3LightTheme),
    colors: {
      ...(isDarkMode ? MD3DarkTheme.colors : MD3LightTheme.colors),
      background: isDarkMode ? '#121212' : '#f5f5f5',
      surface: isDarkMode ? '#1e1e1e' : 'white',
      surfaceVariant: isDarkMode ? '#2d2d2d' : '#f0f0f0',
      cardBackground: isDarkMode ? '#262626' : '#ffffff',
      text: isDarkMode ? '#ffffff' : '#1a1a1a',
      textSecondary: isDarkMode ? '#9e9e9e' : '#666666',
      primary: isDarkMode ? '#4dabf5' : '#2196F3',
      secondary: isDarkMode ? '#64b5f6' : '#1976D2',
      border: isDarkMode ? '#333333' : '#e0e0e0',
      error: '#f44336',
      success: '#4caf50',
    },
  };
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language, i18n]);

  useEffect(() => {
    setResult(null);
  }, [fromCurrency, toCurrency]);

  useEffect(() => {
    if (fromOpen) {
      setToOpen(false);
    }
  }, [fromOpen]);

  useEffect(() => {
    if (toOpen) {
      setFromOpen(false);
    }
  }, [toOpen]);

  useEffect(() => {
    const loadInitialFavorites = async () => {
      try {
        await AsyncStorage.clear(); // Geçici olarak storage'ı temizle
        const initialFavorites = await initializeFavorites();
        console.log('Initial favorites loaded:', initialFavorites);
        setFavorites(initialFavorites);
      } catch (error) {
        console.error('Error loading initial favorites:', error);
        setToastMessage({
          type: 'error',
          message: 'Sık kullanılanlar yüklenirken hata oluştu',
          visible: true
        });
      }
    };

    loadInitialFavorites();
  }, []);

  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        const codes = await getAvailableCurrencies();
        const currentFavorites = await getFavoriteCurrencies();
        console.log('Current favorites:', currentFavorites);
        
        // Sık kullanılanlar ve diğerleri olarak ayır
        const favoriteCurrencies = currentFavorites
          .filter(code => codes.includes(code) || code === 'TEST')
          .map(code => ({
            code,
            name: currencyNames[code] || (code === 'TEST' ? 'Test Currency (Hata Testi)' : code)
          }));

        const otherCurrencies = codes
          .filter(code => !currentFavorites.includes(code))
          .map(code => ({
            code,
            name: currencyNames[code] || code
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        // Test para birimini favorilerde değilse diğer para birimleri arasına ekle
        if (!currentFavorites.includes('TEST')) {
          otherCurrencies.unshift({
            code: 'TEST',
            name: 'Test Currency (Hata Testi)'
          });
        }

        // Güncel favorileri state'e kaydet
        setFavorites(currentFavorites);
        console.log('Updated favorites state:', currentFavorites);

        // Tüm para birimlerini ayırıcı ile birleştir
        setAvailableCurrencies([
          ...favoriteCurrencies,
          { code: 'separator', name: '──────────────' },
          ...otherCurrencies
        ]);
      } catch (error) {
        console.error('Para birimleri yüklenirken hata:', error);
        setToastMessage({
          type: 'error',
          message: 'Döviz kurları alınamadı. Lütfen internet bağlantınızı kontrol edin.',
          visible: true
        });
      }
    };

    loadCurrencies();
  }, []);

  useEffect(() => {
    const updateCurrencies = async () => {
      try {
        const codes = await getAvailableCurrencies();
        console.log('Updating currencies with favorites:', favorites);
        
        // Favori para birimleri
        const favoriteCurrencies = favorites
          .filter(code => codes.includes(code) || code === 'TEST')
          .map(code => ({
            code,
            name: currencyNames[code] || (code === 'TEST' ? 'Test Currency (Hata Testi)' : code)
          }));

        // Diğer para birimleri
        const otherCurrencies = codes
          .filter(code => !favorites.includes(code))
          .map(code => ({
            code,
            name: currencyNames[code] || code
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        if (!favorites.includes('TEST')) {
          otherCurrencies.unshift({
            code: 'TEST',
            name: 'Test Currency (Hata Testi)'
          });
        }

        // Eğer favori varsa ayırıcı ekle, yoksa direkt diğer para birimlerini göster
        const currenciesList = favoriteCurrencies.length > 0
          ? [
              ...favoriteCurrencies,
              { code: 'separator', name: '──────────────' },
              ...otherCurrencies
            ]
          : otherCurrencies;

        setAvailableCurrencies(currenciesList);
      } catch (error) {
        console.error('Para birimleri güncellenirken hata:', error);
      }
    };

    updateCurrencies();
  }, [favorites]);

  const loadHistory = async () => {
    const savedHistory = await getHistory();
    setHistory(savedHistory);
  };

  const handleClearHistory = async () => {
    try {
      await clearHistory();
      await loadHistory();
      setShowClearDialog(false);
      setToastMessage({
        type: 'success',
        message: 'Geçmiş başarıyla temizlendi',
        visible: true
      });
    } catch (error) {
      console.error('Clear history error:', error);
      setToastMessage({
        type: 'error',
        message: 'Geçmiş temizlenirken bir hata oluştu',
        visible: true
      });
    }
  };

  const handleFromCurrencyChange = (value: string | null) => {
    if (value) {
      console.log('From currency changed to:', value);
      setFromCurrency(value);
      setResult(null);
    }
  };

  const handleToCurrencyChange = (value: string | null) => {
    if (value) {
      console.log('To currency changed to:', value);
      setToCurrency(value);
      setResult(null);
    }
  };

  const handleAmountChange = (text: string) => {
    // If the text is empty, reset the amount
    if (!text) {
      setAmount('');
      return;
    }

    // Format the input
    const formattedNumber = formatInputNumber(text);
    setAmount(formattedNumber);
  };

  const handleToastHide = () => {
    if (toastMessage) {
      setToastMessage({ ...toastMessage, visible: false });
      setTimeout(() => {
        setToastMessage(null);
      }, 300);
    }
  };

  const handleConversion = async () => {
    if (!amount) {
      setToastMessage({
        type: 'error',
        message: 'Lütfen geçerli bir miktar girin',
        visible: true
      });
      return;
    }

    const numericAmount = parseFormattedNumber(amount);
    
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setToastMessage({
        type: 'error',
        message: 'Lütfen geçerli bir miktar girin',
        visible: true
      });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const convertedAmount = await convertCurrency(
        numericAmount,
        fromCurrency,
        toCurrency,
        moment()
      );
      setResult(convertedAmount);

      const historyItem: ConversionHistory = {
        id: Date.now().toString(),
        fromCurrency,
        toCurrency,
        amount: numericAmount,
        result: convertedAmount,
        date: new Date().toISOString(),
      };

      await saveConversion(historyItem);
      await loadHistory();
    } catch (error) {
      console.error('Conversion error:', error);
      setToastMessage({
        type: 'error',
        message: error instanceof Error
          ? `Döviz çevirme hatası: ${error.message}`
          : 'Döviz çevirme işlemi başarısız oldu. Lütfen tekrar deneyin.',
        visible: true
      });
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleOutsidePress = () => {
    if (!fromOpen && !toOpen) {
      Keyboard.dismiss();
    }
  };

  const handleToggleFavorite = async (currencyCode: string) => {
    try {
      const isNowFavorite = await toggleFavoriteCurrency(currencyCode);
      const newFavorites = await getFavoriteCurrencies();
      console.log('New favorites after toggle:', newFavorites);
      setFavorites(newFavorites);
      
      setToastMessage({
        type: 'success',
        message: isNowFavorite 
          ? `${currencyCode} sık kullanılanlara eklendi`
          : `${currencyCode} sık kullanılanlardan kaldırıldı`,
        visible: true
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setToastMessage({
        type: 'error',
        message: 'Sık kullanılanlar güncellenirken bir hata oluştu',
        visible: true
      });
    }
  };

  const swapAnimationValue = useSharedValue(0);

  const swapIconStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotate: `${swapAnimationValue.value * 360}deg`,
        },
        {
          scale: interpolate(
            swapAnimationValue.value,
            [0, 0.5, 1],
            [1, 1.2, 1]
          ),
        },
      ],
    };
  });

  const handleSwapPress = () => {
    swapAnimationValue.value = withSequence(
      withSpring(1, { damping: 10, stiffness: 100 }),
      withTiming(0, { duration: 0 })
    );
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
    setResult(null);
    setFromOpen(false);
    setToOpen(false);
  };

  // --- Modern, kompakt ve animasyonlu Dönüştür butonu ---
  // Basit animasyon: butona basınca kısa bir scale efekti
  const scale = useSharedValue(1);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleSimplePress = () => {
    if (loading || !amount) return;
    scale.value = withSequence(
      withTiming(0.96, { duration: 80 }),
      withTiming(1, { duration: 120 })
    );
    handleConversion();
  };

  return (
    <PaperProvider theme={theme}>
      <StatusBar
        backgroundColor={isDarkMode ? '#121212' : 'transparent'}
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        translucent={true}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Toast
          visible={toastMessage?.visible || false}
          message={toastMessage?.message || ''}
          onHide={handleToastHide}
          type={toastMessage?.type || 'success'}
        />
        <View style={[styles.contentContainer, { paddingTop: statusBarHeight }]}>
          {/* Converter Container Background */}
          <LinearGradient
            colors={[
              isDarkMode ? '#1a237e' : '#e3f2fd',
              isDarkMode ? '#121212' : '#ffffff'
            ]}
            style={[styles.converterContainer]}
          >
            <BlurView
              intensity={100}
              tint={isDarkMode ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.headerContainer}>
              <View style={styles.titleContainer}>
                <Text style={[styles.title, { color: theme.colors.text }]}>
                  {t('currency.converter')}
                </Text>
                {isDebugMode() && (
                  <Text style={[styles.debugInfo, { color: theme.colors.textSecondary }]}>
                    v{config.APP_VERSION} • {isTestMode() ? 'Test' : 'Live'} Mode
                  </Text>
                )}
              </View>
              <View style={styles.themeContainer}>
                <IconButton
                  icon="cog"
                  size={24}
                  iconColor={theme.colors.text}
                  onPress={() => setShowSettings(true)}
                  style={styles.settingsButton}
                  accessibilityLabel={t('settings.title')}
                />
                <ThemeSwitch
                  value={isDarkMode}
                  onValueChange={setIsDarkMode}
                />
              </View>
            </View>
            
            <View style={styles.inputSection}>
              <View style={[styles.currencyInputContainer, styles.topContainer]}>
                <TextInput
                  style={[
                    styles.amountInput,
                    {
                      backgroundColor: theme.colors.surface,
                      color: theme.colors.text,
                    }
                  ]}
                  outlineStyle={{
                    borderRadius: 16,
                    borderWidth: 1,
                  }}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={handleAmountChange}
                  onFocus={() => {
                    setIsInputFocused(true);
                    if (calculatorEnabled) {
                      setShowCalculator(true);
                      Keyboard.dismiss();
                    }
                    // When calculator is disabled, let native keyboard open normally
                  }}
                  onBlur={() => {
                    setIsInputFocused(false);
                  }}
                  placeholder="0,00"
                  placeholderTextColor={theme.colors.textSecondary}
                  mode="outlined"
                  label={t('calculator.amount')}
                  outlineColor={theme.colors.border}
                  activeOutlineColor={theme.colors.primary}
                  textColor={theme.colors.text}
                  right={amount ? (
                    <TextInput.Icon
                      icon="close-circle"
                      onPress={() => {
                        setAmount('');
                        setResult(null);
                        calculator.handleClear();
                      }}
                      style={styles.clearIcon}
                      color={theme.colors.textSecondary}
                    />
                  ) : calculatorEnabled ? (
                    <TextInput.Icon
                      icon="calculator"
                      onPress={() => {
                        setShowCalculator(!showCalculator);
                        if (!showCalculator) {
                          Keyboard.dismiss();
                        }
                      }}
                      style={styles.clearIcon}
                      color={theme.colors.primary}
                    />
                  ) : null}
                />
                <View style={styles.currencySelector}>
                  <CurrencyDropdown
                    value={fromCurrency}
                    onSelect={handleFromCurrencyChange}
                    isOpen={fromOpen}
                    onToggle={() => {
                      setFromOpen(!fromOpen);
                      setToOpen(false);
                    }}
                    currencies={availableCurrencies}
                    theme={theme}
                    favorites={favorites}
                    onToggleFavorite={handleToggleFavorite}
                  />
                </View>
              </View>

              <View style={[styles.swapButtonContainer, styles.middleContainer]}>
                <Animated.View style={swapIconStyle}>
                  <LinearGradient
                    colors={[theme.colors.primary, theme.colors.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.swapButton}
                  >
                    <IconButton
                      icon="swap-horizontal"
                      size={24}
                      iconColor="#ffffff"
                      onPress={handleSwapPress}
                    />
                  </LinearGradient>
                </Animated.View>
                <View style={[styles.swapLine, { backgroundColor: theme.colors.border }]} />
              </View>

              <View style={[styles.currencyInputContainer, styles.bottomContainer]}>
                <TextInput
                  style={[
                    styles.resultInput,
                    {
                      backgroundColor: isDarkMode ? theme.colors.surfaceVariant : theme.colors.surface,
                      color: theme.colors.text,
                    }
                  ]}
                  outlineStyle={{
                    borderRadius: 16,
                    borderWidth: 1,
                  }}
                  value={result ? formatNumber(result) : ''}
                  editable={false}
                  placeholder="0,00"
                  placeholderTextColor={theme.colors.textSecondary}
                  mode="outlined"
                  label={t('calculator.result')}
                  outlineColor={theme.colors.border}
                  activeOutlineColor={theme.colors.primary}
                  textColor={theme.colors.text}
                />
                <View style={styles.currencySelector}>
                  <CurrencyDropdown
                    value={toCurrency}
                    onSelect={handleToCurrencyChange}
                    isOpen={toOpen}
                    onToggle={() => {
                      setToOpen(!toOpen);
                      setFromOpen(false);
                    }}
                    currencies={availableCurrencies}
                    theme={theme}
                    favorites={favorites}
                    onToggleFavorite={handleToggleFavorite}
                  />
                </View>
              </View>
            </View>

            <Animated.View
              entering={FadeIn}
              style={[
                styles.convertButtonWrapper,
                { opacity: loading || !amount ? 0.7 : 1 }
              ]}
            >
              {/* --- Modern, kompakt ve basit animasyonlı Dönüştür butonu --- */}
              <Pressable
                onPress={handleSimplePress}
                disabled={loading || !amount}
                style={({ pressed }) => [
                  {
                    width: 160,
                    height: 48,
                    borderRadius: 12,
                    alignSelf: 'center',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'transparent',
                    opacity: loading || !amount ? 0.7 : pressed ? 0.85 : 1,
                    marginTop: 0,
                    overflow: 'hidden',
                  },
                ]}
              >
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    ...StyleSheet.absoluteFillObject,
                    borderRadius: 12,
                  }}
                />
                <BlurView
                  intensity={18}
                  tint={isDarkMode ? 'dark' : 'light'}
                  style={StyleSheet.absoluteFill}
                />
                {(loading || !amount) && (
                  <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(180,180,180,0.25)', borderRadius: 12, zIndex: 2 }} pointerEvents="none" />
                )}
                {loading ? (
                  <ActivityIndicator color="#fff" size={20} />
                ) : (
                  <>
                    <IconButton icon="arrow-right" size={18} iconColor="#fff" style={{ margin: 0, marginRight: 2, padding: 0 }} />
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', marginLeft: 6, letterSpacing: 0.1 }}>{t('calculator.convert')}</Text>
                  </>
                )}
              </Pressable>
            </Animated.View>
          </LinearGradient>

          <View style={styles.historyContainer}>
            <View style={styles.historyHeader}>
              <Text style={[styles.historyTitle, { color: theme.colors.text }]}>
                {t('currency.history')}
              </Text>
              <IconButton
                icon="delete"
                size={24}
                onPress={() => setShowClearDialog(true)}
                disabled={history.length === 0}
                iconColor={theme.colors.text}
              />
            </View>
            <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
            <View style={styles.historyScrollContainer}>
              <ScrollView
                style={styles.historyList}
                contentContainerStyle={styles.historyListContent}
                showsVerticalScrollIndicator={false}>
                {history.map((item, index) => (
                  <Animated.View
                    key={item.id}
                    entering={FadeInLeft.delay(index * 50).duration(300).withInitialValues({
                      opacity: 0,
                      transform: [{ translateX: -20 }],
                    })}>
                    <View style={[
                      styles.historyCardContainer,
                      { 
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border
                      }
                    ]}>
                      <TouchableOpacity
                        onPress={() => {
                          if (expandedCardId === item.id) {
                            setExpandedCardId(null);
                          } else {
                            setExpandedCardId(item.id);
                          }
                        }}
                        activeOpacity={0.9}>
                        <View style={styles.historyCard}>
                          <Card.Content style={styles.historyCardContent}>
                            <View style={styles.historyCardHeader}>
                              <View style={styles.currencyContainer}>
                                <Text style={[styles.fromAmount, { color: theme.colors.primary }]}>
                                  {formatNumber(item.amount)}
                                </Text>
                                <Text style={[styles.currencyCode, { color: theme.colors.text }]}>
                                  {item.fromCurrency}
                                </Text>
                              </View>
                              <IconButton
                                icon="arrow-right"
                                size={20}
                                style={[styles.arrowIcon, { backgroundColor: theme.colors.background }]}
                                iconColor={theme.colors.text}
                              />
                              <View style={styles.currencyContainer}>
                                <Text style={[styles.toAmount, { color: theme.colors.primary }]}>
                                  {formatNumber(item.result)}
                                </Text>
                                <Text style={[styles.currencyCode, { color: theme.colors.text }]}>
                                  {item.toCurrency}
                                </Text>
                              </View>
                            </View>
                            <Text style={[styles.historyDate, { color: theme.colors.text }]}>
                              {new Date(item.date).toLocaleString('tr-TR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Text>
                          </Card.Content>
                        </View>
                      </TouchableOpacity>
                      {showWidgets && (
                        <ConversionChart
                          expanded={expandedCardId === item.id}
                          onToggle={() => {
                            if (expandedCardId === item.id) {
                              setExpandedCardId(null);
                            } else {
                              setExpandedCardId(item.id);
                            }
                          }}
                          conversionData={item}
                          theme={theme}
                        />
                      )}
                    </View>
                  </Animated.View>
                ))}
              </ScrollView>
            </View>
          </View>
    </View>

        <Portal>
          <Dialog visible={showClearDialog} onDismiss={() => setShowClearDialog(false)}>
            <Dialog.Title>{t('currency.clearHistoryTitle')}</Dialog.Title>
            <Dialog.Content>
              <Text>{t('currency.clearHistoryConfirm')}</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowClearDialog(false)}>{t('currency.cancel')}</Button>
              <Button onPress={handleClearHistory}>{t('currency.clear')}</Button>
            </Dialog.Actions>
          </Dialog>

          <Dialog visible={showSettings} onDismiss={() => setShowSettings(false)} style={styles.settingsDialog}>
            <Dialog.Title>{t('settings.title')}</Dialog.Title>
            <Dialog.Content>
              <View style={styles.settingsSection}>
                <Text style={[styles.settingsLabel, { color: theme.colors.text }]}>{t('settings.languageSettings')}</Text>
                <TouchableRipple
                  onPress={() => {
                    const newLanguage = language === 'tr' ? 'en' : 'tr';
                    setLanguage(newLanguage);
                    setToastMessage({
                      type: 'success',
                      message: t('settings.languageChanged'),
                      visible: true
                    });
                  }}
                  style={[styles.settingsItem, { backgroundColor: theme.colors.surface }]}>
                  <View style={styles.settingsRow}>
                    <Text style={[styles.settingsText, { color: theme.colors.text }]}>
                      {language === 'tr' ? 'Türkçe' : 'English'}
                    </Text>
                    <IconButton
                      icon="chevron-right"
                      size={20}
                      iconColor={theme.colors.textSecondary}
                    />
                  </View>
                </TouchableRipple>
              </View>

              <View style={styles.settingsSection}>
                <Text style={[styles.settingsLabel, { color: theme.colors.text }]}>{t('settings.widgetSettings')}</Text>
                <TouchableRipple
                  onPress={() => {
                    const newShowWidgets = !showWidgets;
                    setShowWidgets(newShowWidgets);
                    setToastMessage({
                      type: 'success',
                      message: newShowWidgets ? t('settings.widgetShown') : t('settings.widgetHidden'),
                      visible: true
                    });
                  }}
                  style={[styles.settingsItem, { backgroundColor: theme.colors.surface }]}>
                  <View style={styles.settingsRow}>
                    <Text style={[styles.settingsText, { color: theme.colors.text }]}>
                      {showWidgets ? t('settings.hideWidget') : t('settings.showWidget')}
                    </Text>
                    <View style={[styles.switchContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                      <View style={[styles.switchToggle, { 
                        transform: [{ translateX: showWidgets ? 20 : 4 }],
                        backgroundColor: showWidgets ? theme.colors.primary : theme.colors.border
                      }]} />
                    </View>
                  </View>
                </TouchableRipple>
              </View>

              <View style={styles.settingsSection}>
                <Text style={[styles.settingsLabel, { color: theme.colors.text }]}>{t('settings.calculatorSettings')}</Text>
                <TouchableRipple
                  onPress={() => {
                    const newCalculatorEnabled = !calculatorEnabled;
                    setCalculatorEnabled(newCalculatorEnabled);
                    setToastMessage({
                      type: 'success',
                      message: newCalculatorEnabled ? t('settings.calculatorShown') : t('settings.calculatorHidden'),
                      visible: true
                    });
                  }}
                  style={[styles.settingsItem, { backgroundColor: theme.colors.surface }]}>
                  <View style={styles.settingsRow}>
                    <Text style={[styles.settingsText, { color: theme.colors.text }]}>
                      {calculatorEnabled ? t('settings.hideCalculator') : t('settings.showCalculator')}
                    </Text>
                    <View style={[styles.switchContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                      <View style={[styles.switchToggle, { 
                        transform: [{ translateX: calculatorEnabled ? 20 : 4 }],
                        backgroundColor: calculatorEnabled ? theme.colors.primary : theme.colors.border
                      }]} />
                    </View>
                  </View>
                </TouchableRipple>
              </View>

            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowSettings(false)}>{t('common.close')}</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        {/* Calculator Keyboard Overlay */}
        {calculatorEnabled && showCalculator && (
          <View style={styles.calculatorOverlay}>
            <TouchableWithoutFeedback onPress={() => setShowCalculator(false)}>
              <View style={styles.calculatorBackdrop} />
            </TouchableWithoutFeedback>

            <Animated.View
              entering={FadeIn.duration(200)}
              style={[
                styles.calculatorContainer,
                {
                  backgroundColor: theme.colors.surface,
                }
              ]}
            >
              <View style={[
                styles.calculatorHeader,
                {
                  borderBottomColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                }
              ]}>
                <Text style={[styles.calculatorTitle, { color: theme.colors.text }]}>
                  {t('calculator.title')}
                </Text>
                <IconButton
                  icon="close"
                  size={24}
                  onPress={() => setShowCalculator(false)}
                  iconColor={theme.colors.text}
                />
              </View>
              <CalculatorKeyboard
                onNumberPress={calculator.handleNumber}
                onOperatorPress={calculator.handleOperator}
                onClear={calculator.handleClear}
                onBackspace={calculator.handleBackspace}
                onEquals={calculator.handleEquals}
                onDecimal={calculator.handleDecimal}
                onConfirm={handleCalculatorConfirm}
                theme={theme}
                isDarkMode={isDarkMode}
                display={calculator.display}
              />
            </Animated.View>
          </View>
        )}

        <Snackbar
          visible={!!error}
          onDismiss={() => setError(null)}
          duration={3000}
          action={{
            label: t('common.close'),
            onPress: () => {
              setError(null);
            },
          }}
          style={[styles.snackbar, { backgroundColor: theme.colors.error }]}>
          {error}
        </Snackbar>
      </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  converterContainer: {
    padding: 20,
    borderRadius: 24,
    margin: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.15)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 16,
      },
    }),
    transform: [{ scale: 1 }],
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: Platform.OS === 'ios' ? '700' : 'bold',
  },
  debugInfo: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.8,
  },
  themeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputSection: {
    position: 'relative',
    zIndex: 2,
  },
  currencyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    position: 'relative',
    zIndex: 2,
    marginVertical: 10,
    backgroundColor: 'transparent',
    padding: 8,
    borderRadius:16,
    height: 72,
  },
  amountInput: {
    flex: 1,
    minWidth: 120,
    borderRadius: 16,
    fontSize: 14,
    marginBottom:5,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  resultInput: {
    flex: 1,
    marginBottom:5,
    minWidth: 120,
    borderRadius: 12,
  },
  currencySelector: {
    width: 50,
    flex: 1,
    borderRadius: 16,
  },
  swapButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 24,
    overflow: 'visible',
    zIndex: 1,
  },
  swapButton: {
    margin: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 0,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    transform: [{ rotate: '0deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: '#E0E0E0',
    zIndex: -1,
  },
  convertButtonWrapper: {
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 1,
  },
  convertButton: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  historyContainer: {
    flex: 1,
    padding: 10,
    position: 'relative',
    zIndex: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 8,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    marginHorizontal: 8,
    marginBottom: 15,
  },
  historyScrollContainer: {
    flex: 1,
  },
  historyList: {
    flex: 1,
  },
  historyListContent: {
    paddingHorizontal: 8,
    paddingBottom: 20,
  },
  historyCardContainer: {
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)'
  },
  historyCard: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent'
  },
  historyCardContent: {
    padding: 16,
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  currencyContainer: {
    flex: 1,
    alignItems: 'center',
  },
  fromAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  toAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  currencyCode: {
    fontSize: 14,
    marginBottom: 2,
  },
  currencyName: {
    fontSize: 13,
  },
  arrowIcon: {
    margin: 0,
    width: 32,
    height: 32,
  },
  historyDate: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  topContainer: {
    zIndex: 3,
  },
  middleContainer: {
    zIndex: 2,
  },
  bottomContainer: {
    zIndex: 1,
  },
  snackbar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 20 : 0,
  },
  dropdownContainer: {
    position: 'relative',
    width: '100%',
    zIndex: 3,
  },
  dropdownButton: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    height: 56,
  },
  dropdownButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 12,
    height: 56,
  },
  dropdownButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  dropdownIcon: {
    margin: 0,
    padding: 0,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    maxHeight: 280,
    zIndex: 999,
    overflow: 'hidden',
    elevation: Platform.select({
      android: 999,
      default: 0,
    }),
  },
  dropdownScroll: {
    maxHeight: 280,
  },
  dropdownScrollContent: {
    paddingVertical: 4,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 0) + 20,
    alignSelf: 'center',
    width: 'auto',
    maxWidth: '80%',
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    zIndex: 9999,
    elevation: 9999,
    transform: [{ translateY: -100 }],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 9999,
      },
    }),
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    flexWrap: 'nowrap',
  },
  toastIcon: {
    margin: 0,
    marginRight: 4,
  },
  toastText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '400',
    flexShrink: 1,
  },
  clearIcon: {
    marginRight: 4,
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 100 : 60,
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  modalContent: {
    borderRadius: 8,
    borderWidth: 1,
    maxHeight: 300,
    width: '100%',
    overflow: 'hidden',
    zIndex: 1001,
  },
  dropdownSeparator: {
    borderBottomWidth: 1,
    marginHorizontal: 16,
  },
  currencyInfo: {
    flex: 1,
  },
  favoriteIcon: {
    margin: 0,
    marginLeft: 8,
  },
  modernConvertButton: {
    marginTop: 0,
    borderRadius: 12,
    alignSelf: 'center',
    width: 200, // Genişlik artırıldı
    height: 44,
    // Remove shadow from here, move to inner for pressed effect
  },
  modernConvertButtonInner: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernConvertButtonGradient: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernConvertButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },
  modernConvertButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 0,
    letterSpacing: 0.1,
  },
  modernConvertButtonIcon: {
    margin: 0,
    marginRight: 0,
    padding: 0,
  },
  disabledOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(180,180,180,0.25)',
    borderRadius: 12,
    zIndex: 2,
  },
  calculatorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'flex-end',
  },
  calculatorBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  calculatorContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  calculatorModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  calculatorModalBackdrop: {
    flex: 1,
  },
  calculatorModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  calculatorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  calculatorTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  settingsButton: {
    marginRight: 8,
  },
  settingsDialog: {
    width: 400,
    alignSelf: 'center',
  },
  settingsSection: {
    marginBottom: 20,
  },
  settingsLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  settingsItem: {
    borderRadius: 12,
    marginVertical: 4,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingsText: {
    fontSize: 16,
    flex: 1,
  },
  switchContainer: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  switchToggle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    position: 'absolute',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
});
