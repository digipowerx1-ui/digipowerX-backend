import axios from 'axios';
import type { Core } from '@strapi/strapi';

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
  private baseUrl: string = 'https://api.polygon.io/v1';
  private strapiInstance: Core.Strapi | null = null;

  setStrapi(strapi: Core.Strapi) {
    this.strapiInstance = strapi;
  }

  private getStrapi(): Core.Strapi {
    if (this.strapiInstance) {
      return this.strapiInstance;
    }
    // Fallback to global strapi if available
    if (typeof strapi !== 'undefined') {
      return strapi;
    }
    throw new Error('Strapi instance not available');
  }

  private getApiKey(): string {
    const apiKey = process.env.MASSIVE_API_KEY;
    if (!apiKey) {
      console.error('❌ MASSIVE_API_KEY environment variable is not set!');
      throw new Error('MASSIVE_API_KEY is required but not configured');
    }
    return apiKey;
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
      if (date) {
        console.log(`📅 Custom date provided: ${date}`);
      }
      // If no date provided, use previous business day
      const targetDate = date || this.getPreviousBusinessDay();

      console.log(`📅 Target date: ${targetDate}`);
      console.log(`📡 Fetching ${symbol} data...`);

      const url = `${this.baseUrl}/open-close/${symbol}/${targetDate}?adjusted=true&apiKey=${this.getApiKey()}`;

      const response = await axios.get<StockPriceData>(url);

      if (response.data && response.data.status === 'OK') {
        console.log(`📡 Massive API response status: ${response.status}`);
        console.log(`📊 Open: ${response.data.open}`);
        console.log(`📊 High: ${response.data.high}`);
        console.log(`📊 Low: ${response.data.low}`);
        console.log(`📊 Close: ${response.data.close}`);
        console.log(`📊 Volume BEFORE rounding: ${response.data.volume}`);
        return response.data;
      }

      console.error(`❌ Massive API returned invalid response status: ${response.data?.status}`);
      return null;
    } catch (error: any) {
      console.error(`❌ DGXX STOCK CRON FAILED`);
      console.error(`❌ Error fetching ${symbol} stock data: ${error.message}`);
      if (axios.isAxiosError(error) && error.response) {
        console.error(`📡 Massive API response status: ${error.response.status}`);
        if (error.response.data && typeof error.response.data === 'object') {
          const { status, message } = error.response.data as any;
          console.error('Response data:', { status, message });
        }
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
      const roundedVolume = Math.round(stockData.volume);
      console.log(`📊 Volume AFTER rounding: ${roundedVolume}`);
      console.log(`💾 Saving stock price for ${stockData.symbol}...`);

      const strapiInstance = this.getStrapi();
      const entry = await strapiInstance.entityService.create('api::stock-price.stock-price', {
        data: {
          symbol: stockData.symbol,
          date: stockData.from,
          open: stockData.open,
          high: stockData.high,
          low: stockData.low,
          close: stockData.close || stockData.high, // Use high if close not available
          volume: roundedVolume,
          preMarket: stockData.preMarket,
          publishedAt: new Date(), // Auto-publish
        },
      });

      console.log(`✅ Stock price saved successfully`);
      console.log(`🆕 New Stock Price created: Entry ID ${entry.id} for date ${stockData.from}`);
      return entry;
    } catch (error: any) {
      console.error(`❌ DGXX STOCK CRON FAILED`);
      console.error(`❌ Error saving stock price: ${error?.message || error}`);
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
      console.error('❌ Massive API returned no data or request failed. No stock data to save.');
      return null;
    }

    // Check if stock price for this date already exists
    const strapiInstance = this.getStrapi();
    const existingEntries = await strapiInstance.entityService.findMany('api::stock-price.stock-price', {
      filters: {
        symbol: stockData.symbol,
        date: stockData.from,
      },
    });

    if (existingEntries && existingEntries.length > 0) {
      console.log(`♻️ Stock Price already exists for ${stockData.symbol} on ${stockData.from}`);
      console.log(`🆔 Existing entry ID: ${existingEntries[0].id}`);
      return existingEntries[0];
    }

    return await this.saveStockPrice(stockData);
  }

  /**
   * Get the latest trading day based on US Eastern Time
   * Cron runs at 3:00 AM IST = 4:30 PM ET (after market close)
   * So we need to get the current US date, not IST date
   * @returns Date string in YYYY-MM-DD format
   */
  private getPreviousBusinessDay(): string {
    // Get current time in US Eastern timezone
    const now = new Date();
    const etOptions = { timeZone: 'America/New_York' };
    const etDateStr = now.toLocaleDateString('en-CA', etOptions); // en-CA gives YYYY-MM-DD format
    const etDate = new Date(etDateStr + 'T12:00:00'); // Use noon to avoid DST issues

    // Get the current hour in ET to check if market has closed (closes at 4:00 PM ET, so check 5:00 PM / 17:00 ET to be safe)
    const etTimeStr = now.toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour12: false,
      hour: '2-digit',
    });
    const etHour = parseInt(etTimeStr, 10);

    // If it's before 5:00 PM ET, today's market data is not yet available,
    // so we want to get the previous business day.
    let baseDate = new Date(etDate);
    if (etHour < 17) {
      baseDate.setDate(baseDate.getDate() - 1);
    }

    const dayOfWeek = baseDate.getDay();
    let daysToSubtract = 0;

    // If Saturday (6), go back 1 day to Friday
    if (dayOfWeek === 6) {
      daysToSubtract = 1;
    }
    // If Sunday (0), go back 2 days to Friday
    else if (dayOfWeek === 0) {
      daysToSubtract = 2;
    }

    const tradingDay = new Date(baseDate);
    tradingDay.setDate(baseDate.getDate() - daysToSubtract);

    return this.formatDate(tradingDay);
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
