interface WeatherEmoji {
  description: string;
  emoji: string;
}

// Map OpenWeatherMap API weather descriptions to emojis
export const WEATHER_EMOJIS: WeatherEmoji[] = [
  // Clear conditions
  { description: "clear sky", emoji: "☀️" },
  { description: "clear", emoji: "☀️" },
  
  // Cloud conditions
  { description: "few clouds", emoji: "🌤️" },
  { description: "scattered clouds", emoji: "⛅" },
  { description: "broken clouds", emoji: "🌥️" },
  { description: "overcast clouds", emoji: "☁️" },
  { description: "clouds", emoji: "☁️" },
  
  // Rain conditions
  { description: "light rain", emoji: "🌦️" },
  { description: "moderate rain", emoji: "🌧️" },
  { description: "heavy rain", emoji: "🌧️" },
  { description: "rain", emoji: "🌧️" },
  { description: "shower rain", emoji: "🌧️" },
  
  // Thunderstorm conditions
  { description: "thunderstorm", emoji: "⛈️" },
  { description: "thunder", emoji: "⛈️" },
  { description: "lightning", emoji: "🌩️" },
  
  // Snow conditions
  { description: "snow", emoji: "❄️" },
  { description: "light snow", emoji: "🌨️" },
  { description: "heavy snow", emoji: "❄️" },
  
  // Atmosphere conditions
  { description: "mist", emoji: "🌫️" },
  { description: "fog", emoji: "🌫️" },
  { description: "haze", emoji: "🌫️" },
  { description: "smoke", emoji: "🌫️" },
  { description: "dust", emoji: "🌫️" },
  { description: "sand", emoji: "🌫️" },
  
  // Other
  { description: "drizzle", emoji: "🌦️" },
  { description: "sunny", emoji: "☀️" }
];

/**
 * Returns the appropriate emoji for a weather description.
 * 
 * @param weatherDescription The weather description from OpenWeatherMap API
 * @returns An emoji representing the weather
 */
export function getWeatherEmoji(weatherDescription: string): string {
  if (!weatherDescription) return "☀️"; // Default to sun
  
  const lowerDescription = weatherDescription.toLowerCase();
  
  // Find the closest matching weather description
  const match = WEATHER_EMOJIS.find(w => 
    lowerDescription.includes(w.description.toLowerCase())
  );
  
  // For debugging
  if (!match) {
    console.log(`No emoji match found for weather: "${weatherDescription}"`);
  }
  
  // Return the emoji if found, otherwise return a default sun emoji
  return match?.emoji || "☀️";
} 