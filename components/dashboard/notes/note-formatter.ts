import { HtmlSanitizer } from "./utils/sanitizer";

export interface NoteFormatterResult {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

export class NoteFormatter {
  static wrapWithMarkers(
    value: string,
    selectionStart: number,
    selectionEnd: number,
    startMarker: string,
    endMarker: string,
    placeholder: string
  ): NoteFormatterResult {
    const selected = value.slice(selectionStart, selectionEnd);
    const textToWrap = selected || placeholder;
    const insertion = `${startMarker}${textToWrap}${endMarker}`;
    const nextValue = value.slice(0, selectionStart) + insertion + value.slice(selectionEnd);
    const newSelectionStart = selectionStart + startMarker.length;
    const newSelectionEnd = newSelectionStart + textToWrap.length;

    return {
      text: nextValue,
      selectionStart: newSelectionStart,
      selectionEnd: newSelectionEnd
    };
  }

  static formatBulletList(
    value: string,
    selectionStart: number,
    selectionEnd: number
  ): NoteFormatterResult {
    if (selectionStart === selectionEnd) {
      const needsNewline = selectionStart !== 0 && value[selectionStart - 1] !== "\n";
      const insertion = `${needsNewline ? "\n" : ""}- `;
      const nextValue = value.slice(0, selectionStart) + insertion + value.slice(selectionEnd);
      const cursor = selectionStart + insertion.length;

      return {
        text: nextValue,
        selectionStart: cursor,
        selectionEnd: cursor
      };
    }

    const selected = value.slice(selectionStart, selectionEnd);
    const formatted = selected
      .split(/\r?\n/)
      .map((line) => {
        const cleaned = line.replace(/^[-*\u2022]\s+/, "").trim();
        return cleaned ? `- ${cleaned}` : null;
      })
      .filter(Boolean)
      .join("\n");

    const nextValue = value.slice(0, selectionStart) + formatted + value.slice(selectionEnd);
    const end = selectionStart + formatted.length;

    return {
      text: nextValue,
      selectionStart,
      selectionEnd: end
    };
  }

  static formatContent(content: string): string {
    const lines = content.split(/\r?\n/);
    let html = "";
    let inList = false;

    lines.forEach((line) => {
      const trimmed = line.trim();
      const isBullet = /^[-*\u2022]\s+/.test(trimmed);

      if (isBullet) {
        if (!inList) {
          html += '<ul class="list-disc space-y-1 pl-5">';
          inList = true;
        }
        const text = trimmed.replace(/^[-*\u2022]\s+/, "");
        html += `<li>${NoteFormatter.applyInlineFormatting(text)}</li>`;
      } else {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        if (trimmed === "") {
          html += "<br />";
        } else {
          html += `<p>${NoteFormatter.applyInlineFormatting(line)}</p>`;
        }
      }
    });

    if (inList) {
      html += "</ul>";
    }

    const sanitized = HtmlSanitizer.sanitize(html || "<p></p>");
    return sanitized;
  }

  private static applyInlineFormatting(value: string): string {
    try {
      let formatted = this.escapeHtml(value);
      formatted = formatted.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      formatted = formatted.replace(/__(.+?)__/g, "<u>$1</u>");
      // Use simpler regex patterns for better compatibility
      formatted = formatted.replace(/\*([^*]+)\*/g, "<em>$1</em>");
      formatted = formatted.replace(/_([^_]+)_/g, "<em>$1</em>");
      return formatted;
    } catch {
      return this.escapeHtml(value);
    }
  }

  private static escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}