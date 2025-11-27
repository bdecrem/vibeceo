/**
 * Cryptocurrency Price source fetcher
 * Fetches crypto prices from CoinGecko API
 */

import type { NormalizedItem } from '@vibeceo/shared-types';

export interface CryptoPriceConfig {
  coins?: string[]; // e.g., ['bitcoin', 'ethereum', 'cardano']
  currency?: string; // e.g., 'usd', 'eur'
  maxItems?: number;
}

interface CoinData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  price_change_percentage_24h: number;
  total_volume: number;
  last_updated: string;
}

export async function fetchCryptoPrice(config: CryptoPriceConfig): Promise<NormalizedItem[]> {
  const {
    coins = ['bitcoin', 'ethereum', 'cardano', 'solana', 'polkadot'],
    currency = 'usd',
    maxItems = 10,
  } = config;

  console.log(`₿ Fetching crypto prices for ${coins.join(', ')}...`);

  try {
    const coinIds = coins.slice(0, maxItems).join(',');
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency}&ids=${coinIds}&order=market_cap_desc&sparkline=false`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.statusText}`);
    }

    const data: CoinData[] = await response.json();

    // Normalize to NormalizedItem
    const normalized: NormalizedItem[] = data.map(coin => {
      const priceChange = coin.price_change_percentage_24h;
      const arrow = priceChange > 0 ? '↑' : priceChange < 0 ? '↓' : '→';
      const color = priceChange > 0 ? '+' : '';

      return {
        id: `crypto-${coin.id}`,
        title: `${coin.name} (${coin.symbol.toUpperCase()})`,
        summary: `Price: $${coin.current_price.toLocaleString()} | 24h: ${arrow} ${color}${priceChange.toFixed(2)}% | Volume: $${(coin.total_volume / 1e9).toFixed(2)}B`,
        url: `https://www.coingecko.com/en/coins/${coin.id}`,
        publishedAt: coin.last_updated,
        author: 'CoinGecko',
        score: coin.market_cap,
        raw: coin,
      };
    });

    console.log(`✅ Fetched ${normalized.length} crypto prices`);
    return normalized;

  } catch (error: any) {
    console.error('❌ Error fetching crypto prices:', error.message);
    throw error;
  }
}
