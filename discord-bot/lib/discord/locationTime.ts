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
    localDay: string;
}

// Weekend schedule blocks - UPDATED TO MATCH PROVIDED SCHEDULE
const weekendBlocks = [
    { startHour: 18, location: "Vegas", duration: 8 },    // Block 1: Fri 6pm-2am PT
    { startHour: 2, location: "Tokyo", duration: 8 },     // Block 2: Sat 2am PT = Sat 6pm JST
    { startHour: 10, location: "Paris", duration: 8 },    // Block 3: Sat 10am PT = Sat 7pm CET (Paris)
    { startHour: 18, location: "Vegas", duration: 8 },    // Block 4: Sat 6pm-2am PT
    { startHour: 2, location: "Tokyo", duration: 8 },     // Block 5: Sun 2am PT = Sun 6pm JST
    { startHour: 10, location: "Paris", duration: 8 }     // Block 6: Sun 10am PT = Sun 7pm CET (Paris)
];

export function isWeekend(): boolean {
    // Check for weekend mode override first
    if (process.env.WEEKEND_MODE_OVERRIDE === 'ON') {
        console.log('[LocationTime] Weekend mode override is ON - forcing weekend mode');
        return true;
    }
    
    // WEEKEND MODE ENABLED
    console.log('[LocationTime] Checking weekend mode...');
    
    // Get current date in LA timezone (UTC-7)
    const now = new Date();
    // Convert to LA time (GMT-7)
    const utcHour = now.getUTCHours();
    const laHour = (utcHour - 7 + 24) % 24;
    const day = now.getUTCDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
    
    // Weekend starts Friday 6pm PT (18:00 LA time)
    if (day === 5 && laHour >= 18) {
        console.log('[LocationTime] Weekend mode: Friday evening - ACTIVE');
        return true;
    }
    
    // All day Saturday is weekend
    if (day === 6) {
        console.log('[LocationTime] Weekend mode: Saturday - ACTIVE');
        return true;
    }
    
    // All day Sunday is weekend  
    if (day === 0) {
        console.log('[LocationTime] Weekend mode: Sunday - ACTIVE');
        return true;
    }
    
    // Weekend mode only active Friday evening through Sunday
    
    console.log('[LocationTime] Weekend mode: DISABLED');
    return false;
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
    let localDay: string;

    // Get current date in UTC
    const now = new Date();
    const utcDay = now.getUTCDay(); // 0 is Sunday, 6 is Saturday
    
    // Days of the week for display
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Convert GMT to LA time (GMT-7 during daylight saving time)
    const laHour = (gmtHour - 7 + 24) % 24;
    
    // Calculate LA day (may be different from UTC day if crossing midnight)
    let laDay = utcDay;
    if (gmtHour < 7) { // If it's before 7am GMT, it's still the previous day in LA
        laDay = (utcDay + 6) % 7; // Subtract 1 day, handle wrap around
    }

    if (isWeekend()) {
        // Use weekend schedule
        location = getWeekendLocation(laHour);
        
        // Calculate local time and day based on location
        switch (location) {
            case "Vegas":
                localTime = laHour; // Same as LA time
                localMinutes = gmtMinutes;
                localDay = days[laDay];
                break;
            case "Tokyo": {
                // Tokyo is UTC+9, LA is UTC-7, so Tokyo is 16 hours ahead of LA
                localTime = (laHour + 16) % 24; // LA + 16 hours (GMT+9)
                localMinutes = gmtMinutes;
                
                // Calculate Tokyo's day based on UTC timestamp directly
                // Create a Date object for the current time
                const nowUtc = new Date();
                
                // Create a new date for Tokyo (UTC+9)
                const tokyoDate = new Date(nowUtc.getTime());
                tokyoDate.setHours(tokyoDate.getHours() + 9); // UTC+9
                
                // Get Tokyo's day of week (0-6, where 0 is Sunday)
                const tokyoDay = tokyoDate.getDay();
                
                localDay = days[tokyoDay];
                console.log(`[LocationTime] LA day: ${days[laDay]}, Tokyo day: ${localDay} (direct calculation)`);
                console.log(`[LocationTime] LA time: ${laHour}:${localMinutes}, Tokyo time: ${localTime}:${localMinutes}`);
                break;
            }
            case "Paris": {
                localTime = (laHour + 9) % 24; // LA + 9 hours (GMT+2)
                localMinutes = gmtMinutes;
                // If local time < LA time, we've crossed into next day
                let parisDay = laDay;
                if (localTime < laHour) {
                    parisDay = (laDay + 1) % 7;
                }
                localDay = days[parisDay];
                break;
            }
            default:
                localTime = laHour;
                localMinutes = gmtMinutes;
                localDay = days[laDay];
        }
    } else {
        // Use weekday schedule - CORRECTED TIMES
        if (laHour >= 9 && laHour < 19) {
            // 9am-7pm PT: Los Angeles
            location = "Los Angeles office";
            localTime = laHour;
            localMinutes = gmtMinutes;
            localDay = days[laDay];
        }
        else if (laHour >= 19 || laHour < 3) {
            // 7pm PT - 3am PT: Singapore (handles overnight wrap-around)
            location = "Singapore penthouse";
            localTime = (laHour + 15) % 24; // LA + 15 hours (Singapore is GMT+8)
            localMinutes = gmtMinutes;
            
            // Calculate Singapore day
            let singaporeDay = laDay;
            if (localTime < laHour) {
                singaporeDay = (laDay + 1) % 7; // Next day in Singapore
            }
            localDay = days[singaporeDay];
        }
        else {
            // 3am-9am PT: London
            location = "London office";
            localTime = (laHour + 8) % 24; // LA + 8 hours (London is GMT+1)
            localMinutes = gmtMinutes;
            
            // Calculate London day
            let londonDay = laDay;
            if (localTime < laHour) {
                londonDay = (laDay + 1) % 7; // Next day in London
            }
            localDay = days[londonDay];
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
    const weatherEmoji = getWeatherEmoji(weather, localTime);

    return {
        location,
        formattedTime: `${formattedTime}:${formattedMinutes}`,
        ampm,
        isNewLocation,
        weather,
        weatherEmoji,
        localDay
    };
}
