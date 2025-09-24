import type { NoteFormatterResult } from "./types";

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
        const cleaned = line.replace(/^[-*\u2022]\s+/, "");
        return `- ${cleaned || ""}`;
      })
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
        html += `<li>${this.applyInlineFormatting(text)}</li>`;
      } else {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        if (trimmed === "") {
          html += "<br />";
        } else {
          html += `<p>${this.applyInlineFormatting(line)}</p>`;
        }
      }
    });

    if (inList) {
      html += "</ul>";
    }

    return html || "<p></p>";
  }

  private static applyInlineFormatting(value: string): string {
    let formatted = this.escapeHtml(value);
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    formatted = formatted.replace(/__(.+?)__/g, "<u>$1</u>");
    formatted = formatted.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
    formatted = formatted.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, "<em>$1</em>");
    return formatted;
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