/**
 * Diff parser for applying git-style diffs to HTML content
 */

interface DiffHunk {
    oldStart: number;
    oldCount: number;
    newStart: number;
    newCount: number;
    lines: string[];
}

/**
 * Parse a unified diff string into structured hunks
 */
export function parseDiff(diffText: string): DiffHunk[] {
    const hunks: DiffHunk[] = [];
    const lines = diffText.split('\n');
    let currentHunk: DiffHunk | null = null;
    
    for (const line of lines) {
        // Match hunk header: @@ -17,7 +17,7 @@
        const hunkMatch = line.match(/^@@ -(\d+),(\d+) \+(\d+),(\d+) @@/);
        if (hunkMatch) {
            if (currentHunk) {
                hunks.push(currentHunk);
            }
            currentHunk = {
                oldStart: parseInt(hunkMatch[1]) - 1, // Convert to 0-based
                oldCount: parseInt(hunkMatch[2]),
                newStart: parseInt(hunkMatch[3]) - 1,
                newCount: parseInt(hunkMatch[4]),
                lines: []
            };
        } else if (currentHunk && (line.startsWith(' ') || line.startsWith('-') || line.startsWith('+'))) {
            currentHunk.lines.push(line);
        }
    }
    
    if (currentHunk) {
        hunks.push(currentHunk);
    }
    
    return hunks;
}

/**
 * Apply parsed diff hunks to original content
 */
export function applyDiff(originalContent: string, hunks: DiffHunk[]): string {
    const originalLines = originalContent.split('\n');
    const resultLines: string[] = [];
    let originalIndex = 0;
    
    // Sort hunks by oldStart to apply in order
    hunks.sort((a, b) => a.oldStart - b.oldStart);
    
    for (const hunk of hunks) {
        // Copy unchanged lines before this hunk
        while (originalIndex < hunk.oldStart) {
            resultLines.push(originalLines[originalIndex]);
            originalIndex++;
        }
        
        // Apply the hunk
        for (const line of hunk.lines) {
            if (line.startsWith('+')) {
                // Add new line (remove the + prefix)
                resultLines.push(line.substring(1));
            } else if (line.startsWith('-')) {
                // Skip old line (advance original index)
                originalIndex++;
            } else if (line.startsWith(' ')) {
                // Keep context line
                resultLines.push(originalLines[originalIndex]);
                originalIndex++;
            }
        }
    }
    
    // Copy any remaining lines
    while (originalIndex < originalLines.length) {
        resultLines.push(originalLines[originalIndex]);
        originalIndex++;
    }
    
    return resultLines.join('\n');
}

/**
 * Apply a git-style diff to HTML content
 */
export function applyDiffToHTML(htmlContent: string, diffText: string): string {
    try {
        // Extract diff from code block if present
        const diffMatch = diffText.match(/```diff\n([\s\S]*?)```/);
        const cleanDiff = diffMatch ? diffMatch[1] : diffText;
        
        const hunks = parseDiff(cleanDiff);
        if (hunks.length === 0) {
            throw new Error('No valid diff hunks found');
        }
        
        return applyDiff(htmlContent, hunks);
    } catch (error) {
        console.error('Error applying diff:', error);
        throw error;
    }
}