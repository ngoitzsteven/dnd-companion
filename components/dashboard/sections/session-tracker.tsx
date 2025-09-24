"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { postJson } from "@/lib/api";
import { formatDateLabel, getNoteSortValue } from "@/lib/campaign-utils";
import type { Location, Note } from "@/types/database";

import { EmptyStateMessage } from "../empty-state-message";

import { selectClassName } from "./shared";

interface SessionTrackerProps {
  campaignId: string;
  canManage: boolean;
  notes: Note[];
  locations: Location[];
  locationLookup: Map<string, string>;
  onMutated: () => void;
}

export function SessionTracker({
  campaignId,
  canManage,
  notes,
  locations,
  locationLookup,
  onMutated
}: SessionTrackerProps) {
  const [sessionDate, setSessionDate] = useState("");
  const [locationId, setLocationId] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const sortedNotes = [...notes].sort((a, b) => getNoteSortValue(a) - getNoteSortValue(b));

  const resetForm = () => {
    setSessionDate("");
    setLocationId("");
    setContent("");
    setError(null);
  };

  const handleModalClose = () => {
    if (isSubmitting) {
      return;
    }
    setIsModalOpen(false);
    resetForm();
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
      setIsModalOpen(false);
      resetForm();
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : "Unable to save note");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card className="bg-slate-900/60">
        <CardHeader className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Session tracker</CardTitle>
            <CardDescription>Log each session recap and follow your campaign&apos;s momentum.</CardDescription>
          </div>
          {canManage ? (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setError(null);
                setIsModalOpen(true);
              }}
            >
              Add session recap
            </Button>
          ) : null}
        </CardHeader>
        <div className="space-y-4">
          {canManage ? null : (
            <p className="rounded-md border border-dashed border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-500">
              Only campaign owners and co-DMs can add session recaps.
            </p>
          )}
          {sortedNotes.length === 0 ? (
            <EmptyStateMessage message="No sessions logged yet—add your first recap to start the timeline." />
          ) : (
            <ol className="list-decimal space-y-4 pl-5 text-sm text-slate-300 marker:text-brand-light">
              {sortedNotes.map((note, index) => (
                <li key={note.id} className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">Session {index + 1}</p>
                    <span className="text-xs uppercase tracking-wide text-slate-500">
                      {formatDateLabel(note.session_date)}
                    </span>
                  </div>
                  {note.location_id ? (
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Location: {locationLookup.get(note.location_id) ?? "Unknown location"}
                    </p>
                  ) : null}
                  <p className="whitespace-pre-line text-sm text-slate-300">{note.content}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </Card>
      <Modal open={isModalOpen} onClose={handleModalClose} title="Log session recap">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
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
            <Textarea
              id="note-content"
              placeholder="Summarize key events, discoveries, and hooks."
              value={content}
              onChange={(event) => setContent(event.target.value)}
              disabled={isSubmitting}
            />
          </div>
          {error ? <p className="text-xs text-rose-400">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={handleModalClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save recap"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
