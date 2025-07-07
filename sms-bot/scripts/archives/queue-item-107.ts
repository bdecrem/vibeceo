import * as fs from 'fs';
import * as path from 'path';

async function queueItem107() {
  try {
    console.log('🎯 Manually queueing Item 107 for today...');
    
    const today = new Date().toISOString().split('T')[0];
    const usageTrackerPath = path.join(process.cwd(), 'data', 'usage-tracker.json');
    
    // Read current usage tracker
    let usageTracker;
    try {
      usageTracker = JSON.parse(fs.readFileSync(usageTrackerPath, 'utf8'));
    } catch {
      // Create default if doesn't exist
      usageTracker = {
        recent_usage: [],
        daily_selections: {}
      };
    }
    
    // Set today's selection to Item 107
    usageTracker.daily_selections[today] = 107;
    
    // Add to recent usage
    usageTracker.recent_usage.push({
      item: 107,
      used_date: today
    });
    
    // Write back to file
    fs.writeFileSync(usageTrackerPath, JSON.stringify(usageTracker, null, 2));
    
    console.log(`✅ SUCCESS! Item 107 (office chair) is now queued for ${today}`);
    console.log('📧 This will be used for both SMS and email broadcasts today.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

queueItem107(); 