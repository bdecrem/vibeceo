import { getWeatherForCity } from './weather.js';
import { getWeatherEmoji } from './weatherEmojis.js';

let lastLocation: string | null = null;

interface LocationAndTime {
    location: string;
    formattedTime: string;
    ampm: string;
    isNewLocation: boolean;
    weather: string;
    weatherEmoji: string;
}

// Weekend schedule blocks
const weekendBlocks = [
    { startHour: 18, location: "Vegas", duration: 8 },    // Fri 6pm
    { startHour: 2, location: "Tokyo", duration: 8 },     // Sat 2am
    { startHour: 10, location: "Berlin", duration: 8 },   // Sat 10am
    { startHour: 18, location: "Vegas", duration: 8 },    // Sat 6pm
    { startHour: 2, location: "Tokyo", duration: 8 },     // Sun 2am
    { startHour: 10, location: "Berlin", duration: 8 }    // Sun 10am
];

export function isWeekend(): boolean {
    const day = new Date().getDay();
    return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
}

function getWeekendLocation(laHour: number): string {
    // Find the current block based on LA time
    const block = weekendBlocks.find(block => {
        const endHour = (block.startHour + block.duration) % 24;
        if (block.startHour < endHour) {
            return laHour >= block.startHour && laHour < endHour;
        } else {
            // Handle overnight blocks
            return laHour >= block.startHour || laHour < endHour;
        }
    });

    return block ? block.location : "Los Angeles"; // Default to LA if no block found
}

export async function getLocationAndTime(gmtHour: number, gmtMinutes: number): Promise<LocationAndTime> {
    let location: string;
    let localTime: number;
    let localMinutes: number;

    // Convert GMT to LA time (GMT-7 during daylight saving time)
    const laHour = (gmtHour - 7 + 24) % 24;

    if (isWeekend()) {
        // Use weekend schedule
        location = getWeekendLocation(laHour);
        
        // Calculate local time based on location
        switch (location) {
            case "Vegas":
                localTime = laHour; // Same as LA time
                localMinutes = gmtMinutes;
                break;
            case "Tokyo":
                localTime = (laHour + 15) % 24; // LA + 15 hours
                localMinutes = gmtMinutes;
                break;
            case "Berlin":
                localTime = (laHour + 9) % 24; // LA + 9 hours
                localMinutes = gmtMinutes;
                break;
            default:
                localTime = laHour;
                localMinutes = gmtMinutes;
        }
    } else {
        // Use weekday schedule
        if (laHour >= 16 || laHour < 1) {
        location = "Los Angeles office";
            localTime = laHour;
        localMinutes = gmtMinutes;
    }
        else if (laHour >= 1 && laHour < 8) {
        location = "Singapore penthouse";
            localTime = (laHour + 15) % 24; // LA + 15 hours
        localMinutes = gmtMinutes;
    }
    else {
        location = "London office";
            localTime = (laHour + 8) % 24; // LA + 8 hours
        localMinutes = gmtMinutes;
        }
    }

    const isNewLocation = lastLocation !== location;
    lastLocation = location;

    // Format minutes to always be two digits
    const formattedMinutes = localMinutes.toString().padStart(2, '0');
    const formattedTime = localTime === 0 ? 12 : localTime > 12 ? localTime - 12 : localTime;
    const ampm = localTime >= 12 ? 'pm' : 'am';

    // Get weather for the current location
    const weather = await getWeatherForCity(location);
    const weatherEmoji = getWeatherEmoji(weather);

    return {
        location,
        formattedTime: `${formattedTime}:${formattedMinutes}`,
        ampm,
        isNewLocation,
        weather,
        weatherEmoji
    };
}
