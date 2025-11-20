import axios from 'axios';

interface StockPriceData {
  status: string;
  from: string;
  symbol: string;
  open: number;
  high: number;
  low: number;
  close?: number;
  volume: number;
  preMarket: number;
}

class StockPriceService {
  private apiKey: string;
  private baseUrl: string = 'https://api.massive.com/v1';

  constructor() {
    this.apiKey = process.env.MASSIVE_API_KEY || 'YkYoy5TFxWSGWgO6cZmX57tjyBWSzb2p';
  }

  /**
   * Fetch stock price data for a specific date
   * @param symbol Stock symbol (default: DGXX)
   * @param date Date in YYYY-MM-DD format (default: today)
   * @returns Stock price data
   */
  async fetchStockPrice(
    symbol: string = 'DGXX',
    date?: string
  ): Promise<StockPriceData | null> {
    try {
      // If no date provided, use previous business day
      const targetDate = date || this.getPreviousBusinessDay();

      const url = `${this.baseUrl}/open-close/${symbol}/${targetDate}?adjusted=true&apiKey=${this.apiKey}`;

      console.log(`Fetching stock price for ${symbol} on ${targetDate}...`);

      const response = await axios.get<StockPriceData>(url);

      if (response.data && response.data.status === 'OK') {
        console.log(`Successfully fetched stock price for ${symbol} on ${targetDate}`);
        return response.data;
      }

      console.error(`Failed to fetch stock price: Invalid response status`);
      return null;
    } catch (error) {
      console.error('Error fetching stock price:', error.message);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Response data:', error.response.data);
      }
      return null;
    }
  }

  /**
   * Save stock price data to Strapi
   * @param stockData Stock price data from API
   * @returns Created stock price entry
   */
  async saveStockPrice(stockData: StockPriceData) {
    try {
      const entry = await strapi.entityService.create('api::stock-price.stock-price', {
        data: {
          symbol: stockData.symbol,
          date: stockData.from,
          open: stockData.open,
          high: stockData.high,
          low: stockData.low,
          close: stockData.close || stockData.high, // Use high if close not available
          volume: stockData.volume,
          preMarket: stockData.preMarket,
          publishedAt: new Date(), // Auto-publish
        },
      });

      console.log(`Stock price saved with ID: ${entry.id}`);
      return entry;
    } catch (error) {
      console.error('Error saving stock price:', error.message);
      throw error;
    }
  }

  /**
   * Fetch and save stock price for a specific date
   * @param symbol Stock symbol (default: DGXX)
   * @param date Date in YYYY-MM-DD format (default: previous business day)
   * @returns Saved stock price entry or null
   */
  async fetchAndSaveStockPrice(symbol: string = 'DGXX', date?: string) {
    const stockData = await this.fetchStockPrice(symbol, date);

    if (!stockData) {
      console.error('No stock data to save');
      return null;
    }

    // Check if stock price for this date already exists
    const existingEntries = await strapi.entityService.findMany('api::stock-price.stock-price', {
      filters: {
        symbol: stockData.symbol,
        date: stockData.from,
      },
    });

    if (existingEntries && existingEntries.length > 0) {
      console.log(`Stock price for ${stockData.symbol} on ${stockData.from} already exists`);
      return existingEntries[0];
    }

    return await this.saveStockPrice(stockData);
  }

  /**
   * Get previous business day (excluding weekends)
   * @returns Date string in YYYY-MM-DD format
   */
  private getPreviousBusinessDay(): string {
    const today = new Date();
    let daysToSubtract = 1;

    // If today is Monday (1), go back 3 days to Friday
    if (today.getDay() === 1) {
      daysToSubtract = 3;
    }
    // If today is Sunday (0), go back 2 days to Friday
    else if (today.getDay() === 0) {
      daysToSubtract = 2;
    }

    const previousDay = new Date(today);
    previousDay.setDate(today.getDate() - daysToSubtract);

    return this.formatDate(previousDay);
  }

  /**
   * Format date to YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

// Export singleton instance
export const stockPriceService = new StockPriceService();
