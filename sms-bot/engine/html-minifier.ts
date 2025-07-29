/**
 * Simple HTML minifier to reduce size for ZAD remixes
 */

export function minifyHTML(html: string): string {
    // Remove comments (except IE conditionals)
    html = html.replace(/<!--(?!\[if).*?-->/gs, '');
    
    // Remove unnecessary whitespace between tags
    html = html.replace(/>\s+</g, '><');
    
    // Collapse multiple spaces to single space
    html = html.replace(/\s{2,}/g, ' ');
    
    // Remove whitespace around tag boundaries
    html = html.replace(/\s*(<[^>]+>)\s*/g, '$1');
    
    // Preserve whitespace in <pre> and <script> tags
    const preScriptPattern = /(<(pre|script|style)[^>]*>)([\s\S]*?)(<\/\2>)/gi;
    const preserved: string[] = [];
    html = html.replace(preScriptPattern, (match, open, tag, content, close) => {
        preserved.push(content);
        return `${open}__PRESERVED_${preserved.length - 1}__${close}`;
    });
    
    // Restore preserved content
    preserved.forEach((content, index) => {
        html = html.replace(`__PRESERVED_${index}__`, content);
    });
    
    return html.trim();
}

export function expandHTML(html: string): string {
    // Re-expand minified HTML for readability
    // Add newlines after closing tags for major elements
    html = html.replace(/<\/(div|section|article|header|footer|main|nav|aside|p|h[1-6]|ul|ol|li|table|tr|form)>/gi, '$&\n');
    
    // Add newlines before opening tags for major elements
    html = html.replace(/<(div|section|article|header|footer|main|nav|aside|p|h[1-6]|ul|ol|li|table|tr|form)(\s|>)/gi, '\n<$1$2');
    
    // Format script and style tags
    html = html.replace(/<(script|style)([^>]*)>([\s\S]*?)<\/\1>/gi, (match, tag, attrs, content) => {
        return `\n<${tag}${attrs}>\n${content}\n</${tag}>\n`;
    });
    
    // Clean up extra newlines
    html = html.replace(/\n{3,}/g, '\n\n');
    
    return html.trim();
}