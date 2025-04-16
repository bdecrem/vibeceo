let lastLocation: string | null = null;

export function getLocationAndTime(gmtHour: number, gmtMinutes: number) {
  let location: string;
  let localTime: number;
  let localMinutes: number;
  
  if (gmtHour >= 16 || gmtHour < 1) {
    // Los Angeles (GMT-7 during daylight saving time)
    location = "Los Angeles office";
    localTime = (gmtHour - 7 + 24) % 24; // GMT-7
    localMinutes = gmtMinutes;
  } else if (gmtHour >= 1 && gmtHour < 8) {
    // Singapore (GMT+8)
    location = "Singapore penthouse";
    localTime = (gmtHour + 8) % 24; // GMT+8
    localMinutes = gmtMinutes;
  } else {
    // London (GMT+0)
    location = "London office";
    localTime = gmtHour; // GMT+0
    localMinutes = gmtMinutes;
  }

  const isNewLocation = lastLocation !== location;
  lastLocation = location;

  // Format minutes to always be two digits
  const formattedMinutes = localMinutes.toString().padStart(2, '0');
  const formattedTime = localTime === 0 ? 12 : localTime > 12 ? localTime - 12 : localTime;
  const ampm = localTime >= 12 ? 'pm' : 'am';

  return {
    location,
    formattedTime: `${formattedTime}:${formattedMinutes}`,
    ampm,
    isNewLocation
  };
} 