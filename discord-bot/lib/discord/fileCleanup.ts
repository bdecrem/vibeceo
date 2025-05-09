import fs from "fs";
import path from "path";

/**
 * Keeps only the most recent N files in a directory that match a specific pattern
 * @param directory Path to the directory containing the files
 * @param filePattern Regular expression to match files (e.g. /^meeting-.*\.json$/)
 * @param keepCount Number of most recent files to keep
 * @returns Object with counts of kept and deleted files
 */
export function cleanupFiles(
  directory: string,
  filePattern: RegExp,
  keepCount: number = 3
): { kept: number; deleted: number } {
  try {
    console.log(`Cleaning up ${directory} - keeping ${keepCount} most recent files matching ${filePattern}`);
    
    // Ensure directory exists
    if (!fs.existsSync(directory)) {
      console.warn(`Directory ${directory} does not exist, skipping cleanup`);
      return { kept: 0, deleted: 0 };
    }
    
    // Get all files that match the pattern, sort by modification time (newest first)
    const files = fs
      .readdirSync(directory)
      .filter(file => filePattern.test(file))
      .map(file => ({
        name: file,
        path: path.join(directory, file),
        timestamp: fs.statSync(path.join(directory, file)).mtime.getTime(),
      }))
      .sort((a, b) => b.timestamp - a.timestamp); // Sort newest first
    
    if (files.length <= keepCount) {
      console.log(`Only ${files.length} files found, all kept (limit: ${keepCount})`);
      return { kept: files.length, deleted: 0 };
    }
    
    // Keep the first 'keepCount' files, delete the rest
    const filesToKeep = files.slice(0, keepCount);
    const filesToDelete = files.slice(keepCount);
    
    console.log(`Found ${files.length} files. Keeping ${filesToKeep.length}, deleting ${filesToDelete.length}.`);
    
    // Delete the older files
    let deletedCount = 0;
    for (const file of filesToDelete) {
      try {
        fs.unlinkSync(file.path);
        console.log(`Deleted old file: ${file.name}`);
        deletedCount++;
      } catch (error) {
        console.error(`Error deleting file ${file.path}:`, error);
      }
    }
    
    return { kept: filesToKeep.length, deleted: deletedCount };
  } catch (error) {
    console.error(`Error in cleanupFiles for ${directory}:`, error);
    return { kept: 0, deleted: 0 };
  }
}

// Convenience functions for common use cases
export function cleanupStaffMeetings(keepCount: number = 3): { kept: number; deleted: number } {
  const directory = path.join(process.cwd(), "data", "staff-meetings");
  return cleanupFiles(directory, /^meeting-.*\.json$/, keepCount);
}

export function cleanupWeekendConversations(keepCount: number = 3): { kept: number; deleted: number } {
  const directory = path.join(process.cwd(), "data", "weekend-conversations");
  return cleanupFiles(directory, /^weekend-.*\.json$/, keepCount);
} 