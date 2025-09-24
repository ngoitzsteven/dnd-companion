"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { EmptyStateMessage, formatDateLabel, patchJson, postJson, deleteJson, selectClassName } from "./shared";
import type { NotesSectionProps } from "./types";
import type { Note } from "@/types/database";

export function NotesSection({
  campaignId,
  canManage,
  notes,
  locations,
  locationLookup,
  onMutated
}: NotesSectionProps) {
  const getToday = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60_000);
    return local.toISOString().split("T")[0];
  };

  const [sessionDate, setSessionDate] = useState(() => getToday());
  const [locationId, setLocationId] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [showAllNotes, setShowAllNotes] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const sortedNotes = useMemo(
    () =>
      [...notes].sort((a, b) => {
        const bTime = new Date(b.created_at ?? "").getTime();
        const aTime = new Date(a.created_at ?? "").getTime();
        return bTime - aTime;
      }),
    [notes]
  );

  const openCreateModal = () => {
    setEditingNote(null);
    setSessionDate(getToday());
    setLocationId("");
    setContent("");
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (note: Note) => {
    setEditingNote(note);
    setSessionDate(note.session_date ?? "");
    setLocationId(note.location_id ?? "");
    setContent(note.content);
    setError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingNote(null);
    setSessionDate(getToday());
    setLocationId("");
    setContent("");
    setError(null);
  };

  const handleCancel = () => {
    if (isSubmitting) {
      return;
    }

    closeModal();
  };

  const applyFormatter = (
    formatter: (value: string, selectionStart: number, selectionEnd: number) => {
      text: string;
      selectionStart: number;
      selectionEnd: number;
    }
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const { selectionStart, selectionEnd, value } = textarea;
    const result = formatter(value, selectionStart, selectionEnd);

    setContent(result.text);

    requestAnimationFrame(() => {
      if (!textareaRef.current) {
        return;
      }
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  };

  const wrapWithMarkers = (startMarker: string, endMarker: string, placeholder: string) => {
    applyFormatter((value, selectionStart, selectionEnd) => {
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
    });
  };

  const handleFormatting = (format: "bold" | "italic" | "underline" | "bullet") => {
    switch (format) {
      case "bold":
        wrapWithMarkers("**", "**", "bold text");
        break;
      case "italic":
        wrapWithMarkers("*", "*", "italic text");
        break;
      case "underline":
        wrapWithMarkers("__", "__", "underlined text");
        break;
      case "bullet":
        applyFormatter((value, selectionStart, selectionEnd) => {
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
        });
        break;
      default:
        break;
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!content.trim()) {
      setError("Add a quick summary before saving.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const normalizedSessionDate = sessionDate.trim();

    const payload = {
      content: content.trim(),
      session_date: normalizedSessionDate || undefined,
      location_id: locationId ? locationId : null
    };

    if (editingNote) {
      payload.session_date = normalizedSessionDate || "";
    }

    try {
      if (editingNote) {
        await patchJson(`/api/campaigns/${campaignId}/notes/${editingNote.id}`, payload);
      } else {
        await postJson(`/api/campaigns/${campaignId}/notes`, payload);
      }

      onMutated();
      closeModal();
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : "Unable to save note");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm("Delete this session note? This action cannot be undone.")) {
      return;
    }

    setDeletingNoteId(noteId);
    try {
      await deleteJson(`/api/campaigns/${campaignId}/notes/${noteId}`);
      onMutated();
    } catch (deleteError) {
      alert(deleteError instanceof Error ? deleteError.message : "Unable to delete note");
    } finally {
      setDeletingNoteId(null);
    }
  };

  const isEditing = Boolean(editingNote);
  const modalTitle = isEditing ? "Edit session note" : "Log a session note";
  const modalDescription = isEditing
    ? "Update your recap with the latest developments."
    : "Capture key events, discoveries, and hooks.";
  const submitLabel = isSubmitting ? "Saving..." : isEditing ? "Update note" : "Save note";

  return (
    <>
      <Card className="bg-slate-900/60">
        <CardHeader className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Session notes</CardTitle>
            <CardDescription>Document what happened and what comes next.</CardDescription>
          </div>
          {canManage ? (
            <Button type="button" size="sm" onClick={openCreateModal}>
              New note
            </Button>
          ) : null}
        </CardHeader>

        <div className="space-y-3 text-sm text-slate-300">
          {!canManage ? (
            <p className="rounded-md border border-dashed border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-500">
              Only campaign owners and co-DMs can add notes.
            </p>
          ) : null}

          {sortedNotes.length === 0 ? (
            <EmptyStateMessage message="No notes yet? Log your first recap to get started." />
          ) : (
            <>
              {(showAllNotes ? sortedNotes : sortedNotes.slice(0, 4)).map((note) => (
                <div key={note.id} className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm font-medium text-slate-100">{formatDateLabel(note.session_date)}</p>
                      {note.location_id ? (
                        <span className="text-xs uppercase tracking-wide text-slate-500">
                          {locationLookup.get(note.location_id) ?? "Unknown location"}
                        </span>
                      ) : null}
                    </div>
                    {canManage ? (
                      <div className="flex gap-1">
                        <Button type="button" size="sm" variant="ghost" onClick={() => openEditModal(note)}>
                          Edit
                        </Button>
                        <Button 
                          type="button" 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleDelete(note.id)}
                          disabled={deletingNoteId === note.id}
                          className="text-rose-400 hover:text-rose-300"
                        >
                          {deletingNoteId === note.id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  <div
                    className="space-y-2 text-sm text-slate-300"
                    dangerouslySetInnerHTML={{ __html: formatNoteContent(note.content) }}
                  />
                </div>
              ))}
              {sortedNotes.length > 4 && (
                <div className="text-center">
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setShowAllNotes(!showAllNotes)}
                    className="text-slate-400 hover:text-slate-300"
                  >
                    {showAllNotes ? "Show less" : `Show ${sortedNotes.length - 4} more notes`}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-3xl">
            <Card className="border border-slate-800 bg-slate-900 min-h-[32rem] max-h-[80vh] overflow-y-auto">
              <CardHeader className="flex flex-col gap-1">
                <CardTitle>{modalTitle}</CardTitle>
                <CardDescription>{modalDescription}</CardDescription>
              </CardHeader>

              <form className="space-y-4 px-8 pb-8" onSubmit={handleSubmit}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1 text-sm">
                    <label htmlFor="note-session-date" className="text-xs uppercase tracking-wide text-slate-400">
                      Session date
                    </label>
                    <Input
                      id="note-session-date"
                      type="date"
                      value={sessionDate}
                      onChange={(event) => setSessionDate(event.target.value)}
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
                      onChange={(event) => setLocationId(event.target.value)}
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
                    onChange={(event) => setContent(event.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                {error ? <p className="text-xs text-rose-400">{error}</p> : null}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={handleCancel} disabled={isSubmitting}>
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
      ) : null}
    </>
  );
}

function formatNoteContent(content: string) {
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
      html += `<li>${applyInlineFormatting(text)}</li>`;
    } else {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      if (trimmed === "") {
        html += "<br />";
      } else {
        html += `<p>${applyInlineFormatting(line)}</p>`;
      }
    }
  });

  if (inList) {
    html += "</ul>";
  }

  return html || "<p></p>";
}

function applyInlineFormatting(value: string) {
  let formatted = escapeHtml(value);
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  formatted = formatted.replace(/__(.+?)__/g, "<u>$1</u>");
  formatted = formatted.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
  formatted = formatted.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, "<em>$1</em>");
  return formatted;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
