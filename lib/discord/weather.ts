// weather.ts

export async function getWeatherForCity(cityName: string): Promise<string> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    console.warn('OpenWeather API key not found, returning placeholder weather');
    return 'clear';
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${apiKey}&units=metric`
    );
    
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.weather[0].description.toLowerCase();
  } catch (error) {
    console.error(`Error fetching weather for ${cityName}:`, error);
    return 'clear'; // fallback weather
  }
} 