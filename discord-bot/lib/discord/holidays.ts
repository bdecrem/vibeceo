// holidays.ts

interface CountryMap {
  [key: string]: string;
}

interface Holiday {
  name: string;
  [key: string]: any;
}

interface HolidayResponse {
  response: {
    holidays?: Holiday[];
  };
}

const countryMap: CountryMap = {
  'London': 'GB',
  'Los Angeles': 'US',
  'Singapore': 'SG'
};

export async function getHolidaysForDateAndCity(cityName: string, date: Date): Promise<string[]> {
  const apiKey = process.env.CALENDARIFIC_API_KEY;
  if (!apiKey) {
    console.warn('Calendarific API key not found, returning no holidays');
    return [];
  }

  const country = countryMap[cityName];
  if (!country) {
    console.warn(`No country code found for city: ${cityName}`);
    return [];
  }

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  try {
    const response = await fetch(
      `https://calendarific.com/api/v2/holidays?api_key=${apiKey}&country=${country}&year=${year}&month=${month}&day=${day}`
    );

    if (!response.ok) {
      throw new Error(`Holiday API error: ${response.statusText}`);
    }

    const data: HolidayResponse = await response.json();
    return data.response.holidays?.map((holiday: Holiday) => holiday.name) || [];
  } catch (error) {
    console.error(`Error fetching holidays for ${cityName}:`, error);
    return []; // return empty array on error
  }
} 