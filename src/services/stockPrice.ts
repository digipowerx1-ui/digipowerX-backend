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
  /**
   * Fetch stock price data for a specific date from Massive/Polygon API
   * Logs details safely without leaking API keys
   */
  private async fetchDateStockPrice(
    symbol: string,
    targetDate: string
  ): Promise<{
    data: StockPriceData | null;
    httpStatus?: number;
    responseStatus?: string;
    message?: string;
  }> {
    console.log(`📡 Fetching ${symbol} stock data...`);
    console.log(`📅 Target date: ${targetDate}`);
    console.log(`📡 API endpoint type: open-close`);

    try {
      const url = `${this.baseUrl}/open-close/${symbol}/${targetDate}?adjusted=true&apiKey=${this.getApiKey()}`;
      const response = await axios.get<StockPriceData>(url);

      const httpStatus = response.status;
      const responseStatus = response.data?.status || 'UNKNOWN';

      console.log(`📡 Massive API status: ${httpStatus}`);
      console.log(`📊 Massive API response status: ${responseStatus}`);

      if (response.data && responseStatus === 'OK') {
        const rawVolume = Number(response.data.volume);
        if (!Number.isFinite(rawVolume)) {
          throw new Error(`Invalid stock volume received: ${response.data.volume}`);
        }
        const roundedVolume = Math.round(rawVolume);

        console.log(`📊 Close: ${response.data.close ?? response.data.high}`);
        console.log(`📊 Open: ${response.data.open}`);
        console.log(`📊 High: ${response.data.high}`);
        console.log(`📊 Low: ${response.data.low}`);
        console.log(`📊 Raw volume: ${response.data.volume}`);
        console.log(`📊 Rounded volume: ${roundedVolume}`);

        return {
          data: response.data,
          httpStatus,
          responseStatus,
        };
      }

      console.warn(`⚠️ Massive API returned non-OK response status: ${responseStatus}`);
      return {
        data: null,
        httpStatus,
        responseStatus,
        message: 'Non-OK response status',
      };
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        const httpStatus = error.response.status;
        const responseData = error.response.data as any;
        const responseStatus = responseData?.status || 'ERROR';
        const message = responseData?.message || error.message;

        console.log(`📡 Massive API status: ${httpStatus}`);
        console.log(`📊 Massive API response status: ${responseStatus}`);

        if (httpStatus === 404 || responseStatus === 'NOT_FOUND') {
          console.log(`ℹ️ Massive API: No market data found for ${symbol} on ${targetDate} (${message})`);
        } else {
          console.error(`❌ Massive API error for ${symbol} on ${targetDate}: HTTP ${httpStatus} - ${message}`);
        }

        return {
          data: null,
          httpStatus,
          responseStatus,
          message,
        };
      }

      console.error(`❌ Error fetching ${symbol} stock data: ${error?.message || error}`);
      return {
        data: null,
        message: error?.message || String(error),
      };
    }
  }

  /**
   * Fetch stock price data for a specific date, or the latest available trading day.
   * Handles non-trading days (weekends, holidays) by searching previous trading day.
   * @param symbol Stock symbol (default: DGXX)
   * @param date Date in YYYY-MM-DD format (default: calculated business day)
   * @returns Stock price data or null
   */
  async fetchStockPrice(
    symbol: string = 'DGXX',
    date?: string
  ): Promise<StockPriceData | null> {
    const requestedDate = date || this.getPreviousBusinessDay();
    console.log(`📅 Requested date: ${requestedDate}`);

    // First attempt the requested date
    const initialResult = await this.fetchDateStockPrice(symbol, requestedDate);
    if (initialResult.data) {
      return initialResult.data;
    }

    // If requested date has no market data (holiday or weekend), search previous trading day
    console.warn(`⚠️ No ${symbol} market data available for ${requestedDate}`);
    console.log(`📅 Searching previous trading day...`);

    let candidateDate = requestedDate;
    const maxLookbackDays = 7;
    for (let i = 0; i < maxLookbackDays; i++) {
      candidateDate = this.getPreviousTradingDay(candidateDate);
      console.log(`📅 Checking previous trading date candidate: ${candidateDate}...`);
      const candidateResult = await this.fetchDateStockPrice(symbol, candidateDate);
      if (candidateResult.data) {
        console.log(`📅 Using trading date: ${candidateDate}`);
        return candidateResult.data;
      }
    }

    console.error(`❌ DGXX STOCK CRON: No market data found for ${symbol} within ${maxLookbackDays} days prior to ${requestedDate}`);
    return null;
  }

  /**
   * Save stock price data to Strapi
   * @param stockData Stock price data from API
   * @returns Created stock price entry
   */
  async saveStockPrice(stockData: StockPriceData) {
    try {
      const rawVolume = Number(stockData.volume);
      if (!Number.isFinite(rawVolume)) {
        throw new Error(`Invalid stock volume received: ${stockData.volume}`);
      }
      const roundedVolume = Math.round(rawVolume);

      console.log(`💾 Saving ${stockData.symbol} stock price...`);
      console.log(`📅 Date: ${stockData.from}`);
      console.log(`💰 Open: ${stockData.open}`);
      console.log(`💰 High: ${stockData.high}`);
      console.log(`💰 Low: ${stockData.low}`);
      console.log(`💰 Close: ${stockData.close ?? stockData.high}`);
      console.log(`📊 Volume: ${stockData.volume} → ${roundedVolume}`);

      const strapiInstance = this.getStrapi();
      const entry = await strapiInstance.entityService.create('api::stock-price.stock-price', {
        data: {
          symbol: stockData.symbol,
          date: stockData.from,
          open: stockData.open,
          high: stockData.high,
          low: stockData.low,
          close: stockData.close ?? stockData.high,
          volume: roundedVolume,
          preMarket: stockData.preMarket,
          publishedAt: new Date(), // Auto-publish
        },
      });

      console.log(`✅ Stock price saved successfully`);
      if ((entry as any).documentId) {
        console.log(`📈 New Stock Price created: ${(entry as any).documentId}`);
      }
      console.log(`🆔 Entry ID: ${entry.id}`);
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
      console.log(`ℹ️ Stock price already exists for ${stockData.from}`);
      console.log(`No duplicate entry created.`);
      console.log(`🆔 Entry ID: ${existingEntries[0].id}`);
      return existingEntries[0];
    }

    return await this.saveStockPrice(stockData);
  }

  /**
   * Given a date string (YYYY-MM-DD), find the previous calendar trading day (skipping weekends)
   */
  private getPreviousTradingDay(dateStr: string): string {
    const date = new Date(dateStr + 'T12:00:00');
    date.setDate(date.getDate() - 1);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0) {
      // Sunday -> step back to Friday
      date.setDate(date.getDate() - 2);
    } else if (dayOfWeek === 6) {
      // Saturday -> step back to Friday
      date.setDate(date.getDate() - 1);
    }
    return this.formatDate(date);
  }

  /**
   * Get the latest trading day based on US Eastern Time
   * Cron runs at 6:00 PM ET (after NASDAQ market close, Monday-Friday)
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
