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
    
    // Get current date and time in Los Angeles timezone
    const options = { timeZone: 'America/Los_Angeles' };
    const laDate = new Date().toLocaleString('en-US', options);
    const la = new Date(laDate);
    
    const day = la.getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
    const hour = la.getHours();
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    console.log(`[LocationTime] Current LA time: ${dayNames[day]} ${hour}:${la.getMinutes()}`);
    
    // Weekend starts Friday 6pm PT (18:00 LA time)
    if (day === 5 && hour >= 18) {
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

function getWeekendLocation(): string {
    // Get current date and time in Los Angeles timezone
    const options = { timeZone: 'America/Los_Angeles' };
    const laDate = new Date().toLocaleString('en-US', options);
    const la = new Date(laDate);
    
    // Get LA hour and day
    const laDay = la.getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
    const laHour = la.getHours();
    
    // Calculate block index based on day and hour
    // Block 1: Friday 6pm-2am (18-23, 0-1)
    // Block 2: Saturday 2am-10am (2-9)
    // Block 3: Saturday 10am-6pm (10-17)
    // Block 4: Saturday 6pm-2am (18-23, 0-1)
    // Block 5: Sunday 2am-10am (2-9)
    // Block 6: Sunday 10am-end of day (10-23)
    
    let blockIndex = -1;
    
    if (laDay === 5) { // Friday
        if (laHour >= 18) blockIndex = 0; // Block 1
    } else if (laDay === 6) { // Saturday
        if (laHour >= 0 && laHour < 2) blockIndex = 0; // Block 1 overnight
        else if (laHour >= 2 && laHour < 10) blockIndex = 1; // Block 2
        else if (laHour >= 10 && laHour < 18) blockIndex = 2; // Block 3
        else if (laHour >= 18) blockIndex = 3; // Block 4
    } else if (laDay === 0) { // Sunday
        if (laHour >= 0 && laHour < 2) blockIndex = 3; // Block 4 overnight
        else if (laHour >= 2 && laHour < 10) blockIndex = 4; // Block 5
        else if (laHour >= 10) blockIndex = 5; // Block 6
    }
    
    const block = blockIndex >= 0 && blockIndex < weekendBlocks.length ? 
                  weekendBlocks[blockIndex] : null;
    
    console.log(`[LocationTime] Weekend block: ${blockIndex}, location: ${block ? block.location : 'Los Angeles'}`);
    return block ? block.location : "Los Angeles"; // Default to LA if no block found
}

export async function getLocationAndTime(gmtHour: number, gmtMinutes: number): Promise<LocationAndTime> {
    let location: string;
    let localTime: number;
    let localMinutes: number;
    let localDay: string;

    // Create Date object from provided GMT hour and minutes
    const now = new Date();
    now.setUTCHours(gmtHour, gmtMinutes, 0, 0);
    
    // Days of the week for display
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Get Los Angeles time from GMT time
    const laOptions = { timeZone: 'America/Los_Angeles' };
    const laDateStr = now.toLocaleString('en-US', laOptions);
    const laDate = new Date(laDateStr);
    
    const laHour = laDate.getHours();
    const laDay = laDate.getDay(); // 0 is Sunday, 6 is Saturday

    if (isWeekend()) {
        // Use weekend schedule
        location = getWeekendLocation();
        
        // Calculate local time and day based on location
        switch (location) {
            case "Vegas":
                // Vegas is same as LA time
                localTime = laHour;
                localMinutes = laDate.getMinutes();
                localDay = days[laDay];
                break;
            case "Tokyo": {
                // Get Tokyo time
                const tokyoOptions = { timeZone: 'Asia/Tokyo' };
                const tokyoDateStr = now.toLocaleString('en-US', tokyoOptions);
                const tokyoDate = new Date(tokyoDateStr);
                
                // Get Tokyo's hours, minutes, and day
                localTime = tokyoDate.getHours();
                localMinutes = tokyoDate.getMinutes();
                localDay = days[tokyoDate.getDay()];
                console.log(`[LocationTime] UTC input: ${gmtHour}:${gmtMinutes}, Tokyo time: ${localTime}:${localMinutes}, day: ${localDay}`);
                break;
            }
            case "Paris": {
                // Get Paris time
                const parisOptions = { timeZone: 'Europe/Paris' };
                const parisDateStr = now.toLocaleString('en-US', parisOptions);
                const parisDate = new Date(parisDateStr);
                
                // Get Paris's hours, minutes, and day
                localTime = parisDate.getHours();
                localMinutes = parisDate.getMinutes();
                localDay = days[parisDate.getDay()];
                console.log(`[LocationTime] UTC input: ${gmtHour}:${gmtMinutes}, Paris time: ${localTime}:${localMinutes}, day: ${localDay}`);
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
            localMinutes = laDate.getMinutes();
            localDay = days[laDay];
        }
        else if (laHour >= 19 || laHour < 3) {
            // 7pm PT - 3am PT: Singapore (handles overnight wrap-around)
            location = "Singapore penthouse";
            
            // Get Singapore time
            const singaporeOptions = { timeZone: 'Asia/Singapore' };
            const singaporeDateStr = now.toLocaleString('en-US', singaporeOptions);
            const singaporeDate = new Date(singaporeDateStr);
            
            localTime = singaporeDate.getHours();
            localMinutes = singaporeDate.getMinutes();
            localDay = days[singaporeDate.getDay()];
        }
        else {
            // 3am-9am PT: London
            location = "London office";
            
            // Get London time
            const londonOptions = { timeZone: 'Europe/London' };
            const londonDateStr = now.toLocaleString('en-US', londonOptions);
            const londonDate = new Date(londonDateStr);
            
            localTime = londonDate.getHours();
            localMinutes = londonDate.getMinutes();
            localDay = days[londonDate.getDay()];
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
