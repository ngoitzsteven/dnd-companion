import { useRef, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { selectClassName } from "../shared";
import { NoteFormatter } from "./note-formatter";
import type { Location, Note } from "@/types/database";

interface NoteModalProps {
  isOpen: boolean;
  editingNote: Note | null;
  sessionDate: string;
  locationId: string;
  content: string;
  error: string | null;
  isSubmitting: boolean;
  locations: Location[];
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSessionDateChange: (value: string) => void;
  onLocationIdChange: (value: string) => void;
  onContentChange: (value: string) => void;
}

export function NoteModal({
  isOpen,
  editingNote,
  sessionDate,
  locationId,
  content,
  error,
  isSubmitting,
  locations,
  onClose,
  onSubmit,
  onSessionDateChange,
  onLocationIdChange,
  onContentChange
}: NoteModalProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  if (!isOpen) return null;

  const isEditing = Boolean(editingNote);
  const modalTitle = isEditing ? "Edit session note" : "Log a session note";
  const modalDescription = isEditing
    ? "Update your recap with the latest developments."
    : "Capture key events, discoveries, and hooks.";
  const submitLabel = isSubmitting ? "Saving..." : isEditing ? "Update note" : "Save note";

  const applyFormatter = (formatter: (value: string, selectionStart: number, selectionEnd: number) => any) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;
    const result = formatter(value, selectionStart, selectionEnd);

    onContentChange(result.text);

    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  };

  const handleFormatting = (format: "bold" | "italic" | "underline" | "bullet") => {
    switch (format) {
      case "bold":
        applyFormatter((value, start, end) => 
          NoteFormatter.wrapWithMarkers(value, start, end, "**", "**", "bold text"));
        break;
      case "italic":
        applyFormatter((value, start, end) => 
          NoteFormatter.wrapWithMarkers(value, start, end, "*", "*", "italic text"));
        break;
      case "underline":
        applyFormatter((value, start, end) => 
          NoteFormatter.wrapWithMarkers(value, start, end, "__", "__", "underlined text"));
        break;
      case "bullet":
        applyFormatter(NoteFormatter.formatBulletList);
        break;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl">
        <Card className="border border-slate-800 bg-slate-900 min-h-[32rem] max-h-[80vh] overflow-y-auto">
          <CardHeader className="flex flex-col gap-1">
            <CardTitle>{modalTitle}</CardTitle>
            <CardDescription>{modalDescription}</CardDescription>
          </CardHeader>

          <form className="space-y-4 px-8 pb-8" onSubmit={onSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 text-sm">
                <label htmlFor="note-session-date" className="text-xs uppercase tracking-wide text-slate-400">
                  Session date
                </label>
                <Input
                  id="note-session-date"
                  type="date"
                  value={sessionDate}
                  onChange={(event) => onSessionDateChange(event.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-1 text-sm">
                <label htmlFor="note-location" className="text-xs uppercase tracking-wide text-slate-400">
                  Location (optional)
                </label>
                <select
                  id="note-location"
                  className={selectClassName}
                  value={locationId}
                  onChange={(event) => onLocationIdChange(event.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="">No location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <label htmlFor="note-content" className="text-xs uppercase tracking-wide text-slate-400">
                Session recap
              </label>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wide">Format</span>
                <Button type="button" size="sm" variant="ghost" onClick={() => handleFormatting("bold")} aria-label="Bold">
                  <span className="font-semibold">B</span>
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => handleFormatting("italic")} aria-label="Italic">
                  <span className="italic">I</span>
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => handleFormatting("underline")} aria-label="Underline">
                  <span className="underline">U</span>
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => handleFormatting("bullet")} aria-label="Bullet list">
                  {"\u2022"}
                </Button>
              </div>
              <Textarea
                ref={textareaRef}
                className="min-h-[12rem]"
                id="note-content"
                placeholder="Summarize key events, discoveries, and hooks."
                value={content}
                onChange={(event) => onContentChange(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            {error ? <p className="text-xs text-rose-400">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {submitLabel}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}