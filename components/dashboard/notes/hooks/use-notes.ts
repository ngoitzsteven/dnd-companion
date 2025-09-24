import { useMemo } from "react";
import { NotesService } from "../notes-service";
import type { Note } from "../domain/note";

export function useNotes(campaignId: string, notes: Note[]) {
  const notesService = useMemo(() => new NotesService(campaignId), [campaignId]);
  const sortedNotes = useMemo(() => NotesService.sortNotesByDate(notes), [notes]);

  return {
    notesService,
    sortedNotes
  };
}