// weather.ts

// Define coordinates for each location
const locationCoordinates: Record<string, { lat: number; lon: number }> = {
  // Weekday locations
  "Los Angeles office": { lat: 34.0522, lon: -118.2437 },
  "Singapore penthouse": { lat: 1.3521, lon: 103.8198 },
  "London office": { lat: 51.5074, lon: -0.1278 },
  
  // Weekend locations
  "Vegas": { lat: 36.1699, lon: -115.1398 },  // Las Vegas coordinates
  "Tokyo": { lat: 35.6762, lon: 139.6503 },
  "Berlin": { lat: 52.5200, lon: 13.4050 },
  "Paris": { lat: 48.8566, lon: 2.3522 },  // Paris coordinates
  
  // Fallback to Los Angeles if location not found
  "default": { lat: 34.0522, lon: -118.2437 }
};

// Flag to avoid spamming logs with the same API key message
let hasLoggedApiKeyStatus = false;

export async function getWeatherForCity(locationName: string): Promise<string> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    if (!hasLoggedApiKeyStatus) {
      console.warn('OpenWeather API key not found in environment variables. Available env keys:', 
        Object.keys(process.env).filter(key => key.includes('WEATHER') || key.includes('API')));
      hasLoggedApiKeyStatus = true;
    }
    return 'clear';
  }
  
  // Log when API key is successfully found (first time only)
  if (!hasLoggedApiKeyStatus) {
    console.log('OpenWeather API key found, length:', apiKey.length);
    hasLoggedApiKeyStatus = true;
  }

  try {
    // Get coordinates for the location or use default if not found
    const coordinates = locationCoordinates[locationName] || locationCoordinates.default;
    
    // If using default coordinates for an unknown location, log a warning
    if (!locationCoordinates[locationName]) {
      console.warn(`No coordinates found for location: "${locationName}", using default`);
    }
    
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${coordinates.lat}&lon=${coordinates.lon}&appid=${apiKey}&units=metric`;
    
    // Log a redacted version of the URL (hide full API key)
    const apiKeyPrefix = apiKey.substring(0, 4);
    const apiKeySuffix = apiKey.substring(apiKey.length - 4);
    const redactedUrl = url.replace(apiKey, `${apiKeyPrefix}...${apiKeySuffix}`);
    console.log(`Fetching weather data from: ${redactedUrl}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Weather API error: ${response.status} ${response.statusText}. Response: ${errorText}`);
    }

    const data = await response.json() as { weather: Array<{ main: string; description: string }> };
    console.log(`Weather data received for ${locationName}: ${data.weather[0].main} (${data.weather[0].description})`);
    return data.weather[0].description.toLowerCase();
  } catch (error) {
    console.error(`Error fetching weather for ${locationName}:`, error);
    return 'clear'; // fallback weather
  }
} 