import { deleteJson, patchJson, postJson } from "../shared";
import type { Note, NoteCreatePayload, NoteUpdatePayload } from "./domain/note";

export class NotesService {
  constructor(private readonly campaignId: string) {}

  async createNote(payload: NoteCreatePayload): Promise<void> {
    try {
      await postJson(`/api/campaigns/${this.campaignId}/notes`, payload);
    } catch (error) {
      throw new Error(`Failed to create note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateNote(noteId: string, payload: NoteUpdatePayload): Promise<void> {
    try {
      await patchJson(`/api/campaigns/${this.campaignId}/notes/${noteId}`, payload);
    } catch (error) {
      throw new Error(`Failed to update note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteNote(noteId: string): Promise<void> {
    try {
      await deleteJson(`/api/campaigns/${this.campaignId}/notes/${noteId}`);
    } catch (error) {
      throw new Error(`Failed to delete note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static getToday(): string {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60_000);
    return local.toISOString().split("T")[0];
  }

  static sortNotesByDate(notes: Note[]): Note[] {
    // Cache timestamps to avoid repeated Date object creation
    const notesWithTimestamps = notes.map(note => ({
      note,
      timestamp: new Date(note.created_at ?? "").getTime()
    }));
    
    return notesWithTimestamps
      .sort((a, b) => b.timestamp - a.timestamp)
      .map(item => item.note);
  }
}