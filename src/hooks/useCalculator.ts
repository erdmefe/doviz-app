import { useState, useCallback } from 'react';

interface CalculatorState {
  display: string;
  previousValue: number | null;
  operation: string | null;
  waitingForNewValue: boolean;
  hasDecimal: boolean;
}

export const useCalculator = (onResultChange?: (value: string) => void) => {
  const [state, setState] = useState<CalculatorState>({
    display: '',
    previousValue: null,
    operation: null,
    waitingForNewValue: false,
    hasDecimal: false,
  });

  const formatNumber = (num: number): string => {
    // Türkiye formatında sayı formatla (nokta binlik ayırıcı, virgül ondalık)
    const parts = num.toString().split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const decimalPart = parts[1] ? ',' + parts[1] : '';
    return integerPart + decimalPart;
  };

  const parseDisplayValue = (display: string): number => {
    // Türkiye formatından sayıya çevir
    return parseFloat(display.replace(/\./g, '').replace(',', '.')) || 0;
  };

  const updateDisplay = useCallback((newDisplay: string, isResult: boolean = false) => {
    setState(prev => ({ ...prev, display: newDisplay }));
    // Sadece sonuç olduğunda callback'i çağır
    if (isResult && onResultChange) {
      onResultChange(newDisplay);
    }
  }, [onResultChange]);

  const handleNumber = useCallback((num: string) => {
    setState(prev => {
      if (prev.waitingForNewValue) {
        const newDisplay = num;
        return {
          ...prev,
          display: newDisplay,
          waitingForNewValue: false,
          hasDecimal: false,
        };
      }

      const newDisplay = prev.display === '' ? num : prev.display + num;
      return {
        ...prev,
        display: newDisplay,
      };
    });
  }, []);

  const handleDecimal = useCallback(() => {
    setState(prev => {
      if (prev.hasDecimal) return prev;

      if (prev.waitingForNewValue) {
        const newDisplay = '0,';
        return {
          ...prev,
          display: newDisplay,
          waitingForNewValue: false,
          hasDecimal: true,
        };
      }

      const newDisplay = prev.display === '' ? '0,' : prev.display + ',';
      return {
        ...prev,
        display: newDisplay,
        hasDecimal: true,
      };
    });
  }, []);

  const handleOperator = useCallback((operator: string) => {
    setState(prev => {
      const currentValue = parseDisplayValue(prev.display);

      if (operator === '±') {
        const newValue = currentValue * -1;
        const newDisplay = formatNumber(newValue);
        return {
          ...prev,
          display: newDisplay,
        };
      }

      if (operator === '%') {
        const newValue = currentValue / 100;
        const newDisplay = formatNumber(newValue);
        return {
          ...prev,
          display: newDisplay,
        };
      }

      if (prev.previousValue !== null && prev.operation && !prev.waitingForNewValue) {
        const result = calculate(prev.previousValue, currentValue, prev.operation);
        const newDisplay = formatNumber(result);
        return {
          ...prev,
          display: newDisplay,
          previousValue: result,
          operation: operator,
          waitingForNewValue: true,
          hasDecimal: false,
        };
      }

      return {
        ...prev,
        previousValue: currentValue,
        operation: operator,
        waitingForNewValue: true,
        hasDecimal: false,
      };
    });
  }, []);

  const calculate = (prev: number, current: number, operation: string): number => {
    switch (operation) {
      case '+':
        return prev + current;
      case '−':
        return prev - current;
      case '×':
        return prev * current;
      case '÷':
        return current !== 0 ? prev / current : prev;
      default:
        return current;
    }
  };

  const handleEquals = useCallback(() => {
    setState(prev => {
      if (prev.previousValue === null || prev.operation === null) {
        return prev;
      }

      const currentValue = parseDisplayValue(prev.display);
      const result = calculate(prev.previousValue, currentValue, prev.operation);
      const newDisplay = formatNumber(result);

      // Artık otomatik olarak callback çağırmıyoruz

      return {
        display: newDisplay,
        previousValue: null,
        operation: null,
        waitingForNewValue: true,
        hasDecimal: false,
      };
    });
  }, []);

  const handleClear = useCallback(() => {
    const newDisplay = '';
    setState({
      display: newDisplay,
      previousValue: null,
      operation: null,
      waitingForNewValue: false,
      hasDecimal: false,
    });
  }, []);

  const handleBackspace = useCallback(() => {
    setState(prev => {
      if (prev.display.length <= 1) {
        const newDisplay = '';
        return {
          ...prev,
          display: newDisplay,
          hasDecimal: false,
        };
      }

      const newDisplay = prev.display.slice(0, -1);
      const hasDecimal = newDisplay.includes(',');

      return {
        ...prev,
        display: newDisplay,
        hasDecimal,
      };
    });
  }, []);

  return {
    display: state.display,
    handleNumber,
    handleOperator,
    handleEquals,
    handleDecimal,
    handleClear,
    handleBackspace,
  };
};
