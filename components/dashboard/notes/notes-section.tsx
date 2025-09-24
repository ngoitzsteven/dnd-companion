"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyStateMessage } from "../shared";
import { NoteList } from "./note-list";
import { NoteModal } from "./note-modal";
import { useNotes } from "./hooks/use-notes";
import { NotesService } from "./notes-service";
import type { NotesProps, NotesState } from "./types";
import type { Note } from "./domain/note";

export function NotesSection({
  campaignId,
  canManage,
  notes,
  locations,
  locationLookup,
  onMutated
}: NotesProps) {
  const { notesService, sortedNotes } = useNotes(campaignId, notes);
  
  const [state, setState] = useState<NotesState>({
    sessionDate: NotesService.getToday(),
    locationId: "",
    content: "",
    error: null,
    isSubmitting: false,
    isModalOpen: false,
    editingNote: null,
    deletingNoteId: null,
    showAllNotes: false
  });

  const openCreateModal = () => {
    setState(prev => ({
      ...prev,
      editingNote: null,
      sessionDate: NotesService.getToday(),
      locationId: "",
      content: "",
      error: null,
      isModalOpen: true
    }));
  };

  const openEditModal = (note: Note) => {
    setState(prev => ({
      ...prev,
      editingNote: note,
      sessionDate: note.session_date ?? "",
      locationId: note.location_id ?? "",
      content: note.content,
      error: null,
      isModalOpen: true
    }));
  };

  const closeModal = () => {
    setState(prev => ({
      ...prev,
      isModalOpen: false,
      editingNote: null,
      sessionDate: NotesService.getToday(),
      locationId: "",
      content: "",
      error: null
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!state.content.trim()) {
      setState(prev => ({ ...prev, error: "Add a quick summary before saving." }));
      return;
    }

    setState(prev => ({ ...prev, isSubmitting: true, error: null }));

    const normalizedSessionDate = state.sessionDate.trim();
    const payload = {
      content: state.content.trim(),
      session_date: normalizedSessionDate || undefined,
      location_id: state.locationId ? state.locationId : null
    };

    try {
      if (state.editingNote) {
        await notesService.updateNote(state.editingNote.id, {
          ...payload,
          session_date: normalizedSessionDate || ""
        });
      } else {
        await notesService.createNote(payload);
      }

      onMutated();
      closeModal();
    } catch (noteError) {
      setState(prev => ({
        ...prev,
        error: noteError instanceof Error ? noteError.message : "Unable to save note"
      }));
    } finally {
      setState(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm("Delete this session note? This action cannot be undone.")) {
      return;
    }

    setState(prev => ({ ...prev, deletingNoteId: noteId }));
    try {
      await notesService.deleteNote(noteId);
      onMutated();
    } catch (deleteError) {
      alert(deleteError instanceof Error ? deleteError.message : "Unable to delete note");
    } finally {
      setState(prev => ({ ...prev, deletingNoteId: null }));
    }
  };

  const toggleShowAll = () => {
    setState(prev => ({ ...prev, showAllNotes: !prev.showAllNotes }));
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
            <NoteList
              notes={sortedNotes}
              locationLookup={locationLookup}
              canManage={canManage}
              showAllNotes={state.showAllNotes}
              deletingNoteId={state.deletingNoteId}
              onEdit={openEditModal}
              onDelete={handleDelete}
              onToggleShowAll={toggleShowAll}
            />
          )}
        </div>
      </Card>

      <NoteModal
        isOpen={state.isModalOpen}
        editingNote={state.editingNote}
        sessionDate={state.sessionDate}
        locationId={state.locationId}
        content={state.content}
        error={state.error}
        isSubmitting={state.isSubmitting}
        locations={locations}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onSessionDateChange={(value) => setState(prev => ({ ...prev, sessionDate: value }))}
        onLocationIdChange={(value) => setState(prev => ({ ...prev, locationId: value }))}
        onContentChange={(value) => setState(prev => ({ ...prev, content: value }))}
      />
    </>
  );
}