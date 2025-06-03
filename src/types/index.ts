export interface ConversionHistory {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  result: number;
  date: string;
}

export interface Currency {
  code: string;
  name: string;
}

export interface ExchangeRateResponse {
  success: boolean;
  rates: {
    [key: string]: number;
  };
} 