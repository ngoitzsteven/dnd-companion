import { deleteJson, patchJson, postJson } from "../shared";
import type { Note, NoteCreatePayload, NoteUpdatePayload } from "./domain/note";

export class NotesService {
  constructor(private readonly campaignId: string) {
    if (!campaignId?.trim()) throw new Error('Campaign ID is required');
  }

  async createNote(payload: NoteCreatePayload): Promise<void> {
    if (!payload?.content?.trim()) throw new Error('Note content is required');
    try {
      await postJson(`/api/campaigns/${this.campaignId}/notes`, payload);
    } catch (error) {
      throw new Error(`Failed to create note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateNote(noteId: string, payload: NoteUpdatePayload): Promise<void> {
    if (!noteId?.trim()) throw new Error('Note ID is required');
    if (!payload?.content?.trim()) throw new Error('Note content is required');
    try {
      await patchJson(`/api/campaigns/${this.campaignId}/notes/${noteId}`, payload);
    } catch (error) {
      throw new Error(`Failed to update note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteNote(noteId: string): Promise<void> {
    if (!noteId?.trim()) throw new Error('Note ID is required');
    try {
      await deleteJson(`/api/campaigns/${this.campaignId}/notes/${noteId}`);
    } catch (error) {
      throw new Error(`Failed to delete note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static getToday(): string {
    const now = new Date();
    return now.toLocaleDateString('sv-SE');
  }

  static sortNotesByDate(notes: Note[]): Note[] {
    return notes.sort((a, b) => {
      const aTime = a.created_at ? Date.parse(a.created_at) : 0;
      const bTime = b.created_at ? Date.parse(b.created_at) : 0;
      return bTime - aTime;
    });
  }
}