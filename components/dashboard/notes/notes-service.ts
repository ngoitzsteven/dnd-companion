import { deleteJson, patchJson, postJson } from "../shared";

export class NotesService {
  constructor(private campaignId: string) {}

  async createNote(payload: {
    content: string;
    session_date?: string;
    location_id: string | null;
  }): Promise<void> {
    await postJson(`/api/campaigns/${this.campaignId}/notes`, payload);
  }

  async updateNote(noteId: string, payload: {
    content: string;
    session_date: string;
    location_id: string | null;
  }): Promise<void> {
    await patchJson(`/api/campaigns/${this.campaignId}/notes/${noteId}`, payload);
  }

  async deleteNote(noteId: string): Promise<void> {
    await deleteJson(`/api/campaigns/${this.campaignId}/notes/${noteId}`);
  }

  static getToday(): string {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60_000);
    return local.toISOString().split("T")[0];
  }

  static sortNotesByDate(notes: any[]): any[] {
    return [...notes].sort((a, b) => {
      const bTime = new Date(b.created_at ?? "").getTime();
      const aTime = new Date(a.created_at ?? "").getTime();
      return bTime - aTime;
    });
  }
}