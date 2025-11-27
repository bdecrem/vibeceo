/**
 * Weather source fetcher
 * Fetches weather forecasts and alerts
 */

import type { NormalizedItem } from '@vibeceo/shared-types';

export interface WeatherConfig {
  location: string; // City name or coordinates
  units?: 'metric' | 'imperial';
  maxItems?: number; // Number of forecast days
}

interface WeatherData {
  list: Array<{
    dt: number;
    main: {
      temp: number;
      feels_like: number;
      temp_min: number;
      temp_max: number;
      humidity: number;
    };
    weather: Array<{
      main: string;
      description: string;
      icon: string;
    }>;
    dt_txt: string;
  }>;
  city: {
    name: string;
    country: string;
  };
}

export async function fetchWeather(config: WeatherConfig): Promise<NormalizedItem[]> {
  const {
    location,
    units = 'metric',
    maxItems = 5,
  } = config;

  console.log(`🌤️ Fetching weather for ${location}...`);

  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!apiKey) {
      console.warn('⚠️ OPENWEATHER_API_KEY not set, using mock data');
      return getMockWeatherData(location, maxItems);
    }

    // OpenWeatherMap 5-day forecast API
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location)}&units=${units}&appid=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`OpenWeather API error: ${response.statusText}`);
    }

    const data: WeatherData = await response.json();

    // Group by day and take one forecast per day
    const dailyForecasts = new Map<string, typeof data.list[0]>();

    for (const forecast of data.list) {
      const date = forecast.dt_txt.split(' ')[0];
      if (!dailyForecasts.has(date) && dailyForecasts.size < maxItems) {
        dailyForecasts.set(date, forecast);
      }
    }

    // Normalize to NormalizedItem
    const unitSymbol = units === 'metric' ? '°C' : '°F';
    const normalized: NormalizedItem[] = Array.from(dailyForecasts.values()).map(forecast => {
      const weather = forecast.weather[0];
      const date = new Date(forecast.dt * 1000);

      return {
        id: `weather-${location}-${forecast.dt}`,
        title: `${data.city.name} - ${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`,
        summary: `${weather.main}: ${weather.description} | Temp: ${forecast.main.temp.toFixed(1)}${unitSymbol} (feels like ${forecast.main.feels_like.toFixed(1)}${unitSymbol}) | Humidity: ${forecast.main.humidity}%`,
        url: `https://openweathermap.org/city/${location}`,
        publishedAt: new Date(forecast.dt * 1000).toISOString(),
        author: 'OpenWeather',
        raw: forecast,
      };
    });

    console.log(`✅ Fetched ${normalized.length} weather forecasts for ${location}`);
    return normalized;

  } catch (error: any) {
    console.error('❌ Error fetching weather:', error.message);
    console.log('   Falling back to mock data...');
    return getMockWeatherData(location, maxItems);
  }
}

function getMockWeatherData(location: string, maxItems: number): NormalizedItem[] {
  const mockForecasts = [];
  const now = new Date();

  for (let i = 0; i < Math.min(maxItems, 5); i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);

    mockForecasts.push({
      id: `weather-mock-${i}`,
      title: `${location} - ${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`,
      summary: `Partly Cloudy | Temp: ${20 + Math.random() * 10}°C | Humidity: ${50 + Math.random() * 30}%`,
      url: `https://openweathermap.org/`,
      publishedAt: date.toISOString(),
      author: 'OpenWeather',
    });
  }

  return mockForecasts;
}
