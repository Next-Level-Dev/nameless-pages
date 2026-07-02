// Server-side input sanitization
// Strips HTML tags and script content to prevent XSS

// Remove all HTML tags
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '')
}

// Remove script tags and their content
export function stripScripts(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
}

// Remove event handler attributes
export function stripEventHandlers(input: string): string {
  return input.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
}

// Remove data: URLs and other dangerous protocols
export function stripDangerousUrls(input: string): string {
  return input.replace(/data:[^,\s]*/gi, '')
}

// Main sanitization function - strips HTML/scripts from plain text fields
export function sanitizePlainText(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  let result = stripScripts(input)
  result = stripEventHandlers(result)
  result = stripDangerousUrls(result)
  // For plain text fields, also strip any remaining HTML tags
  result = stripHtml(result)
  
  return result.trim()
}

// For the rich text body - we allow our custom markup but ensure no HTML escapes through
export function sanitizeRichText(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  // First strip any HTML that isn't our custom markup
  // Remove script tags completely
  let result = stripScripts(input)
  // Remove event handlers
  result = stripEventHandlers(result)
  // Remove data URLs
  result = stripDangerousUrls(result)
  
  // Convert HTML entities that could be used to bypass our parser
  // e.g., &lt;script&gt; would render as <script>
  result = result
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&#x27;/gi, "'")
  
  return result
}