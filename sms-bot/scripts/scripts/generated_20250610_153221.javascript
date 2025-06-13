// Display current time
function displayCurrentTime() {
    const now = new Date();
    
    // Format time as HH:MM:SS
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    
    const timeString = `${hours}:${minutes}:${seconds}`;
    
    console.log(`Current time: ${timeString}`);
}

// Display time once
displayCurrentTime();

// Optional: Update every second
setInterval(displayCurrentTime, 1000);