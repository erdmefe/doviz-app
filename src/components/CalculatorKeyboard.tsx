import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  Vibration,
  Platform,
} from 'react-native';
import { IconButton } from 'react-native-paper';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface CalculatorKeyboardProps {
  onNumberPress: (number: string) => void;
  onOperatorPress: (operator: string) => void;
  onClear: () => void;
  onBackspace: () => void;
  onEquals: () => void;
  onDecimal: () => void;
  onConfirm: () => void;
  theme: any;
  isDarkMode: boolean;
  display: string;
}

interface KeyProps {
  value: string;
  onPress: () => void;
  type?: 'number' | 'operator' | 'action' | 'equals' | 'confirm';
  flex?: number;
  theme: any;
  isDarkMode: boolean;
  icon?: string;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const Key: React.FC<KeyProps> = ({ 
  value, 
  onPress, 
  type = 'number', 
  flex = 1, 
  theme, 
  isDarkMode,
  icon 
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    // Haptic feedback
    if (Platform.OS === 'ios') {
      Vibration.vibrate(1);
    }

    // Animation
    scale.value = withSequence(
      withTiming(0.95, { duration: 50 }),
      withSpring(1, { damping: 15, stiffness: 300 })
    );

    onPress();
  };

  const getKeyStyle = () => {
    const baseStyle = [styles.key, { flex }];
    
    switch (type) {
      case 'operator':
        return [
          ...baseStyle,
          {
            backgroundColor: isDarkMode ? '#FF9500' : '#FF9500',
          }
        ];
      case 'action':
        return [
          ...baseStyle,
          {
            backgroundColor: isDarkMode ? '#505050' : '#D4D4D2',
          }
        ];
      case 'equals':
        return [
          ...baseStyle,
          {
            backgroundColor: isDarkMode ? '#FF9500' : '#FF9500',
          }
        ];
      case 'confirm':
        return [
          ...baseStyle,
          {
            backgroundColor: isDarkMode ? '#34C759' : '#34C759',
          }
        ];
      default:
        return [
          ...baseStyle,
          {
            backgroundColor: isDarkMode ? '#333333' : '#FFFFFF',
            borderWidth: 1,
            borderColor: isDarkMode ? '#444444' : '#E0E0E0',
          }
        ];
    }
  };

  const getTextStyle = () => {
    const baseStyle = [styles.keyText];

    switch (type) {
      case 'operator':
      case 'equals':
        return [
          ...baseStyle,
          {
            color: '#FFFFFF',
            fontWeight: '600' as const,
          }
        ];
      case 'confirm':
        return [
          ...baseStyle,
          {
            color: '#FFFFFF',
            fontWeight: '600' as const,
            fontSize: 18,
          }
        ];
      case 'action':
        return [
          ...baseStyle,
          {
            color: isDarkMode ? '#FFFFFF' : '#000000',
            fontWeight: '500' as const,
          }
        ];
      default:
        return [
          ...baseStyle,
          {
            color: isDarkMode ? '#FFFFFF' : '#000000',
            fontWeight: '400' as const,
          }
        ];
    }
  };

  return (
    <AnimatedTouchable
      style={[getKeyStyle(), animatedStyle]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {icon ? (
        <IconButton
          icon={icon}
          size={20}
          iconColor={type === 'operator' || type === 'equals' ? '#FFFFFF' : theme.colors.text}
          style={{ margin: 0 }}
        />
      ) : (
        <Text style={getTextStyle()}>{value}</Text>
      )}
    </AnimatedTouchable>
  );
};

const CalculatorKeyboard: React.FC<CalculatorKeyboardProps> = ({
  onNumberPress,
  onOperatorPress,
  onClear,
  onBackspace,
  onEquals,
  onDecimal,
  onConfirm,
  theme,
  isDarkMode,
  display,
}) => {
  const { t } = useTranslation();
  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#1C1C1E' : '#F2F2F7' }]}>
      {/* Display */}
      <View style={[styles.display, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.displayText, { color: theme.colors.text }]}>
          {display || '0'}
        </Text>
      </View>

      {/* Row 1 */}
      <View style={styles.row}>
        <Key
          value="C"
          onPress={onClear}
          type="action"
          theme={theme}
          isDarkMode={isDarkMode}
        />
        <Key
          value="±"
          onPress={() => onOperatorPress('±')}
          type="action"
          theme={theme}
          isDarkMode={isDarkMode}
        />
        <Key
          value="%"
          onPress={() => onOperatorPress('%')}
          type="action"
          theme={theme}
          isDarkMode={isDarkMode}
        />
        <Key
          value="÷"
          onPress={() => onOperatorPress('÷')}
          type="operator"
          theme={theme}
          isDarkMode={isDarkMode}
        />
      </View>

      {/* Row 2 */}
      <View style={styles.row}>
        <Key
          value="7"
          onPress={() => onNumberPress('7')}
          theme={theme}
          isDarkMode={isDarkMode}
        />
        <Key
          value="8"
          onPress={() => onNumberPress('8')}
          theme={theme}
          isDarkMode={isDarkMode}
        />
        <Key
          value="9"
          onPress={() => onNumberPress('9')}
          theme={theme}
          isDarkMode={isDarkMode}
        />
        <Key
          value="×"
          onPress={() => onOperatorPress('×')}
          type="operator"
          theme={theme}
          isDarkMode={isDarkMode}
        />
      </View>

      {/* Row 3 */}
      <View style={styles.row}>
        <Key
          value="4"
          onPress={() => onNumberPress('4')}
          theme={theme}
          isDarkMode={isDarkMode}
        />
        <Key
          value="5"
          onPress={() => onNumberPress('5')}
          theme={theme}
          isDarkMode={isDarkMode}
        />
        <Key
          value="6"
          onPress={() => onNumberPress('6')}
          theme={theme}
          isDarkMode={isDarkMode}
        />
        <Key
          value="−"
          onPress={() => onOperatorPress('−')}
          type="operator"
          theme={theme}
          isDarkMode={isDarkMode}
        />
      </View>

      {/* Row 4 */}
      <View style={styles.row}>
        <Key
          value="1"
          onPress={() => onNumberPress('1')}
          theme={theme}
          isDarkMode={isDarkMode}
        />
        <Key
          value="2"
          onPress={() => onNumberPress('2')}
          theme={theme}
          isDarkMode={isDarkMode}
        />
        <Key
          value="3"
          onPress={() => onNumberPress('3')}
          theme={theme}
          isDarkMode={isDarkMode}
        />
        <Key
          value="+"
          onPress={() => onOperatorPress('+')}
          type="operator"
          theme={theme}
          isDarkMode={isDarkMode}
        />
      </View>

      {/* Row 5 */}
      <View style={styles.row}>
        <Key
          value="0"
          onPress={() => onNumberPress('0')}
          flex={2}
          theme={theme}
          isDarkMode={isDarkMode}
        />
        <Key
          value=","
          onPress={onDecimal}
          theme={theme}
          isDarkMode={isDarkMode}
        />
        <Key
          value=""
          onPress={onBackspace}
          type="action"
          theme={theme}
          isDarkMode={isDarkMode}
          icon="backspace-outline"
        />
      </View>

      {/* Row 6 - Equals & Confirm */}
      <View style={styles.row}>
        <Key
          value="="
          onPress={onEquals}
          type="equals"
          flex={2}
          theme={theme}
          isDarkMode={isDarkMode}
        />
        <Key
          value={t('calculator.confirm')}
          onPress={onConfirm}
          type="confirm"
          flex={2}
          theme={theme}
          isDarkMode={isDarkMode}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 40,
  },
  display: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 20,
    borderRadius: 12,
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  displayText: {
    fontSize: 32,
    fontWeight: '300',
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  key: {
    flex: 1,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  keyText: {
    fontSize: 24,
    textAlign: 'center',
  },
});

export default CalculatorKeyboard;
