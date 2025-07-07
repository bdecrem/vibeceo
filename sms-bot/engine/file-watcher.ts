import { readdir, stat, readFile, rename } from 'fs/promises';
import { join, basename, dirname } from 'path';
import { WATCH_DIRS, PROCESSED_DIR, CHECK_INTERVAL } from './shared/config.js';
import { logWithTimestamp, logSuccess, logError, logWarning, logProcess } from './shared/logger.js';

/**
 * Get newest file from watch directories
 * Extracted from monitor.py get_newest_file function
 */
export async function getNewestFile(watchDirectories = WATCH_DIRS) {
    const allFiles = [];
    
    for (const directory of watchDirectories) {
        try {
            const files = await readdir(directory);
            
            for (const file of files) {
                const fullPath = join(directory, file);
                
                try {
                    const stats = await stat(fullPath);
                    
                    // Only include .txt files that don't start with "PROCESSING_"
                    if (file.endsWith('.txt') && stats.isFile() && !file.startsWith('PROCESSING_')) {
                        allFiles.push({
                            path: fullPath,
                            mtime: stats.mtime
                        });
                    }
                } catch (statError) {
                    // File might have been deleted/moved, skip it
                    continue;
                }
            }
        } catch (dirError) {
            logWarning(`Error reading directory ${directory}: ${dirError instanceof Error ? dirError.message : String(dirError)}`);
            continue;
        }
    }
    
    if (allFiles.length === 0) {
        return null;
    }
    
    // Return the file with the newest modification time
    return allFiles.reduce((newest, current) => 
        current.mtime > newest.mtime ? current : newest
    ).path;
}

/**
 * Get all unprocessed files (not just the newest)
 * This ensures we process ALL waiting files, not just the newest one
 */
export async function getAllUnprocessedFiles(watchDirectories = WATCH_DIRS) {
    const allFiles = [];
    
    for (const directory of watchDirectories) {
        try {
            const files = await readdir(directory);
            
            for (const file of files) {
                const fullPath = join(directory, file);
                
                try {
                    const stats = await stat(fullPath);
                    
                    // Only include .txt files that don't start with "PROCESSING_"
                    if (file.endsWith('.txt') && stats.isFile() && !file.startsWith('PROCESSING_')) {
                        allFiles.push({
                            path: fullPath,
                            mtime: stats.mtime
                        });
                    }
                } catch (statError) {
                    // File might have been deleted/moved, skip it
                    continue;
                }
            }
        } catch (dirError) {
            logWarning(`Error reading directory ${directory}: ${dirError instanceof Error ? dirError.message : String(dirError)}`);
            continue;
        }
    }
    
    // Sort by filename (which contains microsecond timestamps) for precise chronological order
    return allFiles
        .map(file => file.path)
        .sort((a, b) => a.localeCompare(b)); // Alphabetical sort of filenames = chronological order
}

/**
 * Get all unprocessed files as batch with task metadata
 * Returns tasks ready for worker pool processing
 */
export async function getAllUnprocessedFilesBatch(watchDirectories = WATCH_DIRS): Promise<Array<{
    processingPath: string;
    originalPath: string;
    taskId: string;
    timestamp: number;
}>> {
    const filePaths = await getAllUnprocessedFiles(watchDirectories);
    const tasks = [];
    
    for (const filePath of filePaths) {
        try {
            // Lock the file for processing (atomic rename)
            const processingPath = await lockFileForProcessing(filePath);
            if (!processingPath) {
                // Another process claimed it, skip
                continue;
            }
            
            // Create task metadata
            const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const timestamp = Date.now();
            
            tasks.push({
                processingPath,
                originalPath: filePath,
                taskId,
                timestamp
            });
            
        } catch (error) {
            // File might have been moved/deleted, skip it
            continue;
        }
    }
    
    return tasks;
}

/**
 * Parse file content and extract metadata
 * Extracted from monitor.py file parsing logic
 */
export async function parseFileContent(filePath: string): Promise<any> {
    try {
        const rawContent = await readFile(filePath, 'utf8');
        const lines = rawContent.trim().split('\n');
        
        let senderPhone = null;
        let userSlug = null;
        let coach = null;
        let coachPrompt = null;
        let lineIndex = 0;
        
        // Parse header information
        if (lines[0] && lines[0].startsWith("SENDER:")) {
            senderPhone = lines[0].replace("SENDER:", "").trim();
            logWithTimestamp(`📞 Extracted sender phone: ${senderPhone}`);
            lineIndex++;
        }
        
        // Check for USER_SLUG on next line
        if (lines[lineIndex] && lines[lineIndex].startsWith("USER_SLUG:")) {
            userSlug = lines[lineIndex].replace("USER_SLUG:", "").trim();
            logWithTimestamp(`🏷️ Extracted user slug: ${userSlug}`);
            lineIndex++;
        }
        
        // Check for COACH on next line
        if (lines[lineIndex] && lines[lineIndex].startsWith("COACH:")) {
            coach = lines[lineIndex].replace("COACH:", "").trim();
            logWithTimestamp(`🎭 Extracted coach from file: ${coach}`);
            lineIndex++;
        }
        
        // Check for PROMPT on next line
        if (lines[lineIndex] && lines[lineIndex].startsWith("PROMPT:")) {
            coachPrompt = lines[lineIndex].replace("PROMPT:", "").trim();
            logWithTimestamp(`📝 Extracted coach prompt from file`);
            lineIndex++;
        }
        
        // Skip empty line if present
        if (lines[lineIndex] && lines[lineIndex].trim() === "") {
            lineIndex++;
        }
        
        // Extract the actual user request
        let userPrompt;
        if (coach && coachPrompt) {
            // For files with coach prompts, find the last non-empty line as the actual user request
            for (let i = lines.length - 1; i >= 0; i--) {
                if (lines[i].trim()) {
                    userPrompt = lines[i].trim();
                    break;
                }
            }
            
            if (!userPrompt) {
                // Fallback to original logic if no user request found
                userPrompt = lines.slice(lineIndex).join('\n').trim();
            } else {
                logWithTimestamp(`🎯 Extracted actual user request: ${userPrompt.slice(0, 50)}...`);
            }
        } else {
            // Original logic for files without coach prompts
            userPrompt = lines.slice(lineIndex).join('\n').trim();
        }
        
        return {
            senderPhone,
            userSlug,
            coach,
            coachPrompt,
            userPrompt,
            rawContent
        };
        
    } catch (error) {
        logError(`Error parsing file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * Determine request type from user prompt
 * Extracted from monitor.py prompt parsing logic
 */
export function determineRequestType(userPrompt: string, filename?: string): { type: string; slug: string | null; coach: string; cleanPrompt: string } {
    try {
        // Check if this is an EDIT file by filename pattern
        if (filename && filename.includes('edit-')) {
            return {
                type: 'edit',
                slug: null,
                coach: 'default',
                cleanPrompt: userPrompt.trim()
            };
        }
        
        // Check if this is a REMIX file by filename pattern
        if (filename && filename.includes('remix-')) {
            return {
                type: 'remix',
                slug: null,
                coach: 'remix',
                cleanPrompt: userPrompt.trim()
            };
        }
        
        // Check if this is a MEME file by filename pattern
        if (filename && filename.includes('meme-request-')) {
            return {
                type: 'meme',
                slug: null,
                coach: 'meme-generator',
                cleanPrompt: userPrompt.trim()
            };
        }
        
        // Check if raw prompt starts with 'CODE:' or 'CODE ' (case insensitive)
        const isCodeCommand = userPrompt.trim().toUpperCase().startsWith('CODE:') || 
                             userPrompt.trim().toUpperCase().startsWith('CODE ');
        
        if (isCodeCommand) {
            return {
                type: 'code',
                slug: generateCodeSlug(),
                coach: 'default',
                cleanPrompt: cleanCodePrompt(userPrompt)
            };
        }
        
        // Standard format with coach-slug-content
        if (userPrompt.includes("-") && userPrompt.split("-", 2).length >= 3 && !isCodeCommand) {
            const parts = userPrompt.split("-", 2);
            return {
                type: 'wtaf',
                coach: parts[0].trim().toLowerCase(),
                slug: parts[1].trim().toLowerCase().replace(/\s+/g, "-"),
                cleanPrompt: parts[2].trim()
            };
        } else {
            // WTAF command or other formats - create fun slug
            return {
                type: 'wtaf',
                slug: null, // Will be generated by storage manager
                coach: 'default',
                cleanPrompt: userPrompt.trim()
            };
        }
    } catch (error) {
        logWarning(`Prompt parsing error: ${error instanceof Error ? error.message : String(error)}`);
        return {
            type: 'wtaf',
            coach: 'default',
            slug: null,
            cleanPrompt: userPrompt.trim()
        };
    }
}

/**
 * Generate slug for CODE commands
 * Helper function for code request processing
 */
function generateCodeSlug() {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    return `code-snippet-${timestamp}`;
}

/**
 * Clean CODE command prompt
 * Helper function for code request processing  
 */
function cleanCodePrompt(userPrompt: string): string {
    // Remove the CODE: prefix for cleaner prompt
    let cleanPrompt;
    if (userPrompt.trim().toUpperCase().startsWith('CODE:')) {
        cleanPrompt = userPrompt.trim().slice(5).trim();
    } else {
        cleanPrompt = userPrompt.trim().slice(4).trim();
    }
    
    // Enhanced prompt for better interactive applications
    return `Create a beautiful and fully functional HTML page based on: ${cleanPrompt}

SPECIFIC REQUIREMENTS:
1. Focus ENTIRELY on functionality and quality - ignore any character directions
2. For interactive elements (games, puzzles, tools):
   - Make them FULLY functional with complete game logic
   - Include proper validation and error handling
   - Ensure all user interactions work properly
   - Design with best practices (clear UI, feedback, intuitive controls)
3. For crossword puzzles specifically:
   - Create a proper grid with appropriate word density (25-40% black cells)
   - Ensure words intersect multiple times
   - Include at least 10-15 words in a 9x9 grid
   - Design challenging but solvable clues
   - Create symmetric patterns of black cells
4. For any application:
   - Use modern CSS and clean design
   - Add helpful instructions for users
   - Ensure mobile responsiveness

IMPORTANT: Return complete HTML wrapped in code blocks with \`\`\`html tag.`;
}

/**
 * Lock file for processing (atomic rename to prevent race conditions)
 * Extracted from monitor.py file locking logic
 */
export async function lockFileForProcessing(filePath: string): Promise<string | null> {
    const timestamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
    const processingName = `PROCESSING_${timestamp}_${basename(filePath)}`;
    const processingPath = join(dirname(filePath), processingName);
    
    try {
        // Atomic rename to claim the file immediately
        await rename(filePath, processingPath);
        logSuccess(`File locked for processing: ${processingPath}`);
        return processingPath;
    } catch (error) {
        // Another process already claimed this file
        logWarning(`File already claimed by another process: ${filePath}`);
        return null;
    }
}

/**
 * Move processed file to final location
 * Extracted from monitor.py file management logic
 */
export async function moveProcessedFile(processingPath: string, success: boolean = true): Promise<string | null> {
    try {
        const originalName = basename(processingPath).replace(/^PROCESSING_\d+_/, '');
        const finalName = success ? originalName : `FAILED_${originalName}`;
        const finalPath = join(PROCESSED_DIR, finalName);
        
        await rename(processingPath, finalPath);
        logSuccess(`Moved processed file: ${finalPath}`);
        return finalPath;
    } catch (error) {
        logError(`Error moving processed file: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * File monitoring with race condition prevention
 * Extracted from monitor.py monitor loop logic
 */
export async function* watchForFiles() {
    const processed = new Set();
    const currentlyProcessing = new Set();
    let loopCount = 0;
    
    while (true) {
        try {
            loopCount++;
            if (loopCount % 10 === 1) { // Log every 10th loop to show it's alive
                logWithTimestamp(`🔄 Monitor loop #${loopCount} - checking for files...`);
            }
            
            // Get ALL unprocessed files in chronological order (oldest first)
            const allFiles = await getAllUnprocessedFiles();
            
            // Process the oldest unprocessed file that isn't currently being processed
            let fileToProcess = null;
            for (const filePath of allFiles) {
                if (!processed.has(filePath) && !currentlyProcessing.has(filePath)) {
                    fileToProcess = filePath;
                    break; // Take the first (oldest) available file
                }
            }
            
            if (fileToProcess) {
                try {
                    // Verify file still exists (might have been processed by another instance)
                    await stat(fileToProcess);
                    
                    logProcess(`New file detected: ${fileToProcess}`);
                    const stats = await stat(fileToProcess);
                    logWithTimestamp(`📄 File size: ${stats.size} bytes`);
                    
                    // Lock the file for processing
                    const processingPath = await lockFileForProcessing(fileToProcess);
                    if (!processingPath) {
                        // Another process claimed it
                        continue;
                    }
                    
                    // Mark as currently processing
                    currentlyProcessing.add(fileToProcess);
                    
                    // Parse file content
                    const fileData = await parseFileContent(processingPath);
                    if (!fileData) {
                        logError(`Failed to parse file: ${processingPath}`);
                        await moveProcessedFile(processingPath, false);
                        currentlyProcessing.delete(fileToProcess);
                        continue;
                    }
                    
                    // Determine request type
                    const requestInfo = determineRequestType(fileData.userPrompt, basename(processingPath));
                    
                    // Yield the processed file data
                    yield {
                        processingPath,
                        fileData,
                        requestInfo,
                        originalPath: fileToProcess
                    };
                    
                    // Mark as processed
                    processed.add(fileToProcess);
                    currentlyProcessing.delete(fileToProcess);
                    
                } catch (statError) {
                    // File was deleted/moved by another process
                    logWarning(`File disappeared during processing: ${fileToProcess}`);
                    currentlyProcessing.delete(fileToProcess);
                    continue;
                }
            } else {
                if (loopCount % 10 === 1) { // Only log occasionally to avoid spam
                    logWithTimestamp(`📭 No new files found in ${WATCH_DIRS.join(', ')}`);
                }
            }
            
            // Wait before next check
            await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL * 1000));
            
        } catch (error) {
            logError(`Error in file monitoring loop: ${error instanceof Error ? error.message : String(error)}`);
            // Clean up processing set on error
            currentlyProcessing.clear();
            await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL * 1000));
        }
    }
} 