"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { EmptyStateMessage, formatDateLabel, postJson, selectClassName } from "./shared";
import type { NotesSectionProps } from "./types";

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

    const resetForm = () => {
    setSessionDate(getToday());
    setLocationId("");
    setContent("");
    setError(null);
  };

  const openModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    resetForm();
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    if (isSubmitting) {
      return;
    }

    closeModal();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!content.trim()) {
      setError("Add a quick summary before saving.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await postJson(`/api/campaigns/${campaignId}/notes`, {
        content: content.trim(),
        session_date: sessionDate || undefined,
        location_id: locationId ? locationId : null
      });

      onMutated();
      closeModal();
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : "Unable to save note");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card className="bg-slate-900/60">
        <CardHeader className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Session notes</CardTitle>
            <CardDescription>Document what happened and what comes next.</CardDescription>
          </div>
          {canManage ? (
            <Button type="button" size="sm" onClick={openModal}>
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

          {notes.length === 0 ? (
            <EmptyStateMessage message="No notes yet? Log your first recap to get started." />
          ) : (
            notes.map((note) => (
              <div key={note.id} className="space-y-1 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-100">{formatDateLabel(note.session_date)}</p>
                  {note.location_id ? (
                    <span className="text-xs uppercase tracking-wide text-slate-500">
                      {locationLookup.get(note.location_id) ?? "Unknown location"}
                    </span>
                  ) : null}
                </div>
                <p className="whitespace-pre-line text-sm text-slate-300">{note.content}</p>
              </div>
            ))
          )}
        </div>
      </Card>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-3xl">
            <Card className="border border-slate-800 bg-slate-900 min-h-[32rem] max-h-[80vh] overflow-y-auto">
              <CardHeader className="flex flex-col gap-1">
                <CardTitle>Log a session note</CardTitle>
                <CardDescription>Capture key events, discoveries, and hooks.</CardDescription>
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
                  <Textarea className="min-h-[12rem]"
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
                    {isSubmitting ? "Saving..." : "Save note"}
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
