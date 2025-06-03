import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, ScrollView, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import moment from 'moment';
import { convertCurrency } from '../services/api';

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
  { label: '1 Hafta', days: 7 },
  { label: '1 Ay', days: 30 },
  { label: '3 Ay', days: 90 },
  { label: '6 Ay', days: 180 },
  { label: '1 Yıl', days: 365 },
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
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, visible: false, value: 0 });

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

  const generateDates = (days: number) => {
    const dates = [];
    const today = moment();
    
    // 1 haftalık veri için günlük, diğerleri için uygun aralıklar
    const interval = days <= 7 ? 1 : Math.ceil(days / 6);
    
    for (let i = days; i >= 0; i -= interval) {
      dates.push(today.clone().subtract(i, 'days'));
    }
    return dates;
  };

  const fetchHistoricalRates = async () => {
    if (!expanded) return;
    
    setLoading(true);
    setError(null);
    try {
      const dates = generateDates(selectedRange.days);
      const rates = await Promise.all(
        dates.map(async (date) => {
          const result = await convertCurrency(
            conversionData.amount,
            conversionData.fromCurrency,
            conversionData.toCurrency,
            date,
          );
          return result;
        })
      );

      const newChartData = {
        labels: dates.map(date => date.format('DD/MM')),
        datasets: [{
          data: rates,
          color: (opacity = 1) => theme.colors.primary,
          strokeWidth: 2
        }],
        legend: [`${conversionData.fromCurrency} to ${conversionData.toCurrency}`]
      };
      
      setChartData(newChartData);
    } catch (error) {
      console.error('Geçmiş kurlar yüklenirken hata:', error);
      setError('Geçmiş kurlar yüklenirken bir hata oluştu');
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
        r: '5',
        strokeWidth: '2',
        stroke: theme.colors.primary,
        fill: theme.colors.surface,
      },
      propsForBackgroundLines: {
        strokeWidth: 0.5,
        stroke: theme.colors.text + '10',
      },
      formatYLabel: (value: string) => {
        const num = Number(value);
        if (num >= 1000) {
          return (num / 1000).toFixed(1) + 'K';
        }
        return num.toFixed(1);
      },
      propsForVerticalLabels: {
        fontSize: 10,
      },
      propsForHorizontalLabels: {
        fontSize: 10,
      },
      yAxisSuffix: '',
      yAxisInterval: 1,
      yLabelsOffset: 2,
    };

    try {
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
            fromZero={false}
            segments={3}
            yAxisInterval={1}
            getDotColor={() => theme.colors.primary}
            onDataPointClick={({ value, x, y, getColor }) => {
              setTooltipPos({
                x: x,
                y: y,
                value: value,
                visible: true,
              });

              // Hide tooltip after 2 seconds
              setTimeout(() => {
                setTooltipPos(prev => ({ ...prev, visible: false }));
              }, 2000);
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
                    setTooltipPos({
                      x: x,
                      y: y,
                      value: value,
                      visible: true,
                    });

                    setTimeout(() => {
                      setTooltipPos(prev => ({ ...prev, visible: false }));
                    }, 2000);
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
                    left: tooltipPos.x - 40,
                    top: tooltipPos.y - 35,
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.primary,
                  }
                ]}>
                  <Text style={[styles.tooltipText, { color: theme.colors.text }]}>
                    {tooltipPos.value.toLocaleString('tr-TR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Yükleniyor...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={{ color: theme.colors.error }}>{error}</Text>
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
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
    backgroundColor: 'white'
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