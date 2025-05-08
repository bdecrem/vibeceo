// Test script for the weather service
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getWeatherForCity } from '../dist/lib/discord/weather.js';
import { getWeatherEmoji } from '../dist/lib/discord/weatherEmojis.js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '../.env.local');
console.log('Loading environment from:', envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('Error loading .env.local:', result.error);
  process.exit(1);
}

// Check if API key was loaded
console.log('API Key found:', process.env.OPENWEATHER_API_KEY ? 'Yes' : 'No');
if (process.env.OPENWEATHER_API_KEY) {
  console.log('API Key length:', process.env.OPENWEATHER_API_KEY.length);
}

async function testWeather() {
  console.log('=== WEATHER API TEST ===');
  
  // Test all location names
  const locations = [
    'Los Angeles office',
    'Singapore penthouse',
    'London office',
    'Vegas',
    'Tokyo',
    'Berlin'
  ];
  
  for (const location of locations) {
    try {
      console.log(`\nTesting location: ${location}`);
      const weather = await getWeatherForCity(location);
      const emoji = getWeatherEmoji(weather);
      console.log(`Weather for ${location}: ${weather} ${emoji}`);
    } catch (error) {
      console.error(`Error testing weather for ${location}:`, error);
    }
  }
  
  console.log('\n=== TESTING EMOJI MAPPING ===');
  // Test various weather descriptions to ensure emojis are correctly mapped
  const weatherTypes = [
    'clear sky',
    'few clouds',
    'scattered clouds',
    'broken clouds',
    'overcast clouds',
    'light rain',
    'moderate rain',
    'heavy rain',
    'thunderstorm',
    'snow',
    'mist',
    'fog'
  ];
  
  for (const weather of weatherTypes) {
    const emoji = getWeatherEmoji(weather);
    console.log(`${weather}: ${emoji}`);
  }
  
  console.log('\n=== TEST COMPLETE ===');
}

testWeather().catch(console.error); 