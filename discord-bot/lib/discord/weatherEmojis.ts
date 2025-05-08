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
 * Returns the appropriate emoji for a weather description, considering time of day.
 * 
 * @param weatherDescription The weather description from OpenWeatherMap API
 * @param hour Optional hour of day (0-23) to determine day/night emoji variants
 * @returns An emoji representing the weather
 */
export function getWeatherEmoji(weatherDescription: string, hour?: number): string {
  if (!weatherDescription) return "☀️"; // Default to sun
  
  const lowerDescription = weatherDescription.toLowerCase();
  
  // Find the closest matching weather description
  const match = WEATHER_EMOJIS.find(w => 
    lowerDescription.includes(w.description.toLowerCase())
  );
  
  // For debugging
  if (!match) {
    console.log(`No emoji match found for weather: "${weatherDescription}"`);
    return "☀️"; // Default to sun
  }
  
  // Apply time of day adjustments
  if (hour !== undefined) {
    const isNight = hour < 6 || hour >= 20; // Consider 8pm-6am as night
    
    // Apply nighttime variants for specific weather conditions
    if (isNight) {
      if (match.description === "clear sky" || match.description === "clear" || match.description === "sunny") {
        return "🌙"; // Moon for clear night
      }
      if (match.description === "few clouds") {
        return "🌙"; // Moon with few clouds at night
      }
      if (match.description === "scattered clouds") {
        return "☁️"; // Clouds are less visible at night
      }
    }
  }
  
  // Return the emoji
  return match.emoji;
} 