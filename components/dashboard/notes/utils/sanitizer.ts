export class HtmlSanitizer {
  private static readonly ALLOWED_TAGS = ['p', 'br', 'ul', 'li', 'strong', 'em', 'u'];
  private static readonly ALLOWED_ATTRIBUTES: Record<string, string[]> = {
    ul: ['class'],
    li: [],
    p: [],
    br: [],
    strong: [],
    em: [],
    u: []
  };

  static sanitize(html: string): string {
    // Basic HTML sanitization - remove script tags and dangerous attributes
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '');
  }
}