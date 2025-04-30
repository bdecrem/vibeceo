interface WeatherEmoji {
  description: string;
  emoji: string;
}

export const WEATHER_EMOJIS: WeatherEmoji[] = [
  { description: "partly cloudy", emoji: "☁️" },
  { description: "clear blue", emoji: "☀️" },
  { description: "misty gray", emoji: "🌫️" },
  { description: "golden sunny", emoji: "🌞" },
  { description: "drizzly wet", emoji: "🌧️" },
  { description: "stormy dark", emoji: "⛈️" },
  { description: "crisp clear", emoji: "🌤️" },
  { description: "foggy soft", emoji: "🌫️" },
  { description: "rainy gray", emoji: "🌦️" },
  { description: "sunny bright", emoji: "🌅" }
];

export function getWeatherEmoji(weatherDescription: string): string {
  // Find the closest matching weather description
  const match = WEATHER_EMOJIS.find(w => 
    weatherDescription.toLowerCase().includes(w.description.toLowerCase())
  );
  
  // Return the emoji if found, otherwise return a default sun emoji
  return match?.emoji || "☀️";
} 