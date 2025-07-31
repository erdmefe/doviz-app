import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, ScrollView, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import moment from 'moment';
import { convertCurrency, fetchHistoricalRates as fetchHistoricalRatesAPI } from '../services/api';
import { isTestMode } from '../config/env';

interface ConversionChartProps {
  expanded: boolean;
  onToggle: () => void;
  conversionData: {
    amount: number;
    fromCurrency: string;
    toCurrency: string;
    date: string;
    result: number;
  };
  theme: any;
}

interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
    color?: (opacity: number) => string;
    strokeWidth?: number;
  }[];
  legend?: string[];
}

const TIME_RANGES = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
];

const ConversionChart: React.FC<ConversionChartProps> = ({
  expanded,
  onToggle,
  conversionData,
  theme,
}) => {
  const [selectedRange, setSelectedRange] = useState(TIME_RANGES[0]);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animation] = useState(new Animated.Value(0));
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, visible: false, value: 0, date: '' });

  useEffect(() => {
    Animated.timing(animation, {
      toValue: expanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [expanded]);

  const chartHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 260],
  });

  const fetchHistoricalRates = async () => {
    if (!expanded) return;
    
    setLoading(true);
    setError(null);
    try {
      const historicalData = await fetchHistoricalRatesAPI(
        conversionData.fromCurrency,
        conversionData.toCurrency,
        selectedRange.days
      );

      if (!historicalData || historicalData.length === 0) {
        throw new Error('Geçmiş veri bulunamadı');
      }

      // Verileri chart formatına dönüştür - 7 veri noktası için etiketler
      const labels = historicalData.map((item, index) => {
        const date = moment(item.date);
        // Kısa etiketler: 7 veri noktası için
        if (selectedRange.days <= 7) {
          return date.format('DD/MM');
        } else if (selectedRange.days <= 30) {
          return date.format('MM/DD');
        } else if (selectedRange.days <= 90) {
          return date.format('MM/YY');
        } else {
          return date.format('MM/YY');
        }
      });
      
      const rates = historicalData.map(item => {
        const rate = Number((conversionData.amount * item.rate).toFixed(2));
        // Geçersiz değerleri kontrol et (NaN, Infinity, 0)
        if (isNaN(rate) || !isFinite(rate) || rate <= 0) {
          return conversionData.amount > 0 ? conversionData.amount : 1.0; // Güvenli varsayılan değer
        }
        return Math.max(0.01, rate); // Minimum değer sınırı
      });

      // Tüm değerler geçerli mi kontrol et
      const validRates = rates.filter(rate => isFinite(rate));
      if (validRates.length === 0) {
        throw new Error('Geçerli veri bulunamadı');
      }

      // Chart için verileri normalize et - Infinity değerlerini önle
      const minRate = Math.min(...validRates);
      const maxRate = Math.max(...validRates);
      
      // Eğer tüm değerler aynıysa, küçük bir dalgalanma ekle
      let normalizedRates = rates;
      if (maxRate === minRate) {
        normalizedRates = rates.map((rate, index) => 
          rate + (Math.random() - 0.5) * 0.01 * rate
        );
      }

      const newChartData = {
        labels: labels,
        datasets: [{
          data: normalizedRates,
          color: (opacity = 1) => theme.colors.primary,
          strokeWidth: 2
        }],
        legend: [`${conversionData.fromCurrency} → ${conversionData.toCurrency}`]
      };
      
      setChartData(newChartData);
    } catch (error) {
      console.error('Geçmiş kurlar yüklenirken hata:', error);
      const errorMessage = typeof error === 'object' && error !== null && 'message' in error && (error as any).message.includes('test')
        ? 'Test modunda yapay veri kullanılıyor. Gerçek veri için API anahtarınızı kontrol edin.'
        : 'Geçmiş kurlar yüklenirken bir hata oluştu. Lütfen internet bağlantınızı kontrol edin.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (expanded) {
      fetchHistoricalRates();
    }
  }, [expanded, selectedRange]);

  const renderChart = () => {
    if (!chartData) return null;

    const screenWidth = Dimensions.get('window').width;
    const chartWidth = screenWidth - 48;

    const chartConfig = {
      backgroundColor: 'transparent',
      backgroundGradientFrom: theme.colors.surface,
      backgroundGradientTo: theme.colors.surface,
      decimalPlaces: 2,
      color: (opacity = 1) => theme.colors.primary,
      labelColor: (opacity = 1) => theme.colors.text,
      style: {
        borderRadius: 8,
        paddingRight: 0,
        paddingLeft: 0,
      },
      propsForDots: {
        r: '4',
        strokeWidth: '2',
        stroke: theme.colors.primary,
        fill: theme.colors.surface,
      },
      propsForBackgroundLines: {
        strokeWidth: 0.5,
        stroke: theme.colors.text + '20',
      },
      formatYLabel: (value: string) => {
        const num = Number(value);
        if (!isFinite(num)) {
          return '0.00'; // Geçersiz değer için güvenli fallback
        }
        if (num >= 1000000) {
          return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
          return (num / 1000).toFixed(1) + 'K';
        }
        return num.toFixed(2);
      },
      propsForVerticalLabels: {
        fontSize: 9,
      },
      propsForHorizontalLabels: {
        fontSize: 9,
      },
      yAxisSuffix: '',
      yAxisInterval: 1,
      yLabelsOffset: 2,
    };

    try {
      // Chart için güvenli veri aralığı belirle
      const safeData = chartData.datasets[0].data.filter(val => isFinite(val));
      if (safeData.length === 0) {
        return (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              Geçerli veri bulunamadı
            </Text>
          </View>
        );
      }
      
      return (
        <View style={styles.chartWrapper}>
          <LineChart
            data={chartData}
            width={chartWidth}
            height={160}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            withInnerLines={true}
            withOuterLines={true}
            withVerticalLines={true}
            withHorizontalLines={true}
            fromZero={true} // 0'dan başla, negatif değerleri önle
            segments={3}
            yAxisInterval={1}
            getDotColor={() => theme.colors.primary}
            onDataPointClick={({ value, x, y, getColor, index }) => {
              if (!isFinite(value)) return; // Geçersiz değerleri işleme
              const date = chartData.labels[index];
              setTooltipPos({
                x: x,
                y: y,
                value: value,
                date: date,
                visible: true,
              });

              // Hide tooltip after 3 seconds
              setTimeout(() => {
                setTooltipPos(prev => ({ ...prev, visible: false }));
              }, 3000);
            }}
            renderDotContent={({ x, y, index }) => {
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.touchableDot,
                    {
                      left: x - 12,
                      top: y - 12,
                    }
                  ]}
                  onPress={() => {
                    const value = chartData.datasets[0].data[index];
                    const date = chartData.labels[index];
                    setTooltipPos({
                      x: x,
                      y: y,
                      value: value,
                      date: date,
                      visible: true,
                    });

                    setTimeout(() => {
                      setTooltipPos(prev => ({ ...prev, visible: false }));
                    }, 3000);
                  }}
                />
              );
            }}
            decorator={() => {
              if (!tooltipPos.visible) return null;

              return (
                <View style={[
                  styles.tooltipContainer,
                  {
                    position: 'absolute',
                    left: tooltipPos.x - 45,
                    top: tooltipPos.y - 50,
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.primary,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                    elevation: 5,
                  }
                ]}>
                  <Text style={[styles.tooltipText, { color: theme.colors.text, fontWeight: 'bold', fontSize: 12 }]}>
                    {tooltipPos.date}
                  </Text>
                  <Text style={[styles.tooltipText, { color: theme.colors.primary, fontWeight: 'bold', fontSize: 14, marginTop: 2 }]}>
                    {isFinite(tooltipPos.value) ? tooltipPos.value.toLocaleString('tr-TR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) : '0.00'}
                  </Text>
                </View>
              );
            }}
          />
        </View>
      );
    } catch (error) {
      console.error('Chart rendering error:', error);
      return (
        <View style={styles.errorContainer}>
          <Text style={{ color: theme.colors.error }}>
            Grafik oluşturulurken bir hata oluştu
          </Text>
        </View>
      );
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={[styles.loadingContainer, { backgroundColor: theme.colors.surface }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Grafik yükleniyor...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={[styles.errorContainer, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {error}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.chartContent}>
        <View style={styles.rangeSelectorContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.rangeSelector}
            contentContainerStyle={styles.rangeSelectorContent}>
            {TIME_RANGES.map((range) => (
              <TouchableOpacity
                key={range.label}
                onPress={() => setSelectedRange(range)}
                style={[
                  styles.rangeButton,
                  {
                    backgroundColor: selectedRange.label === range.label
                      ? theme.colors.primary
                      : theme.colors.surfaceVariant,
                  },
                ]}>
                <Text
                  style={[
                    styles.rangeButtonText,
                    {
                      color: selectedRange.label === range.label
                        ? theme.colors.surface
                        : theme.colors.text,
                    },
                  ]}>
                  {range.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={styles.chartWrapper}>
          {renderChart()}
        </View>
      </View>
    );
  };

  return (
    <View>
      <TouchableOpacity onPress={onToggle} style={styles.expandButton}>
        <IconButton
          icon={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          iconColor={theme.colors.text}
        />
      </TouchableOpacity>
      <Animated.View style={[styles.container, { height: chartHeight }]}>
        {expanded && renderContent()}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  expandButton: {
    alignItems: 'center',
    paddingVertical: 0,
    height: 32,
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  testModeText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  chartContent: {
    paddingTop: 12,
    paddingBottom: 12,
  },
  rangeSelectorContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  rangeSelector: {
    backgroundColor: 'transparent',
  },
  rangeSelectorContent: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartWrapper: {
    alignItems: 'flex-start',
    marginLeft: -10,
    marginRight: -10,
  },
  chart: {
    borderRadius: 8,
    marginHorizontal: 12,
    marginTop: 4,
  },
  rangeButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 4,
    elevation: 0
  },
  rangeButtonText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  loadingContainer: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
  },
  errorContainer: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  tooltipContainer: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 100,
    alignItems: 'center',
    backgroundColor: 'white',
    zIndex: 1000,
  },
  tooltipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  touchableDot: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
});

export default ConversionChart;