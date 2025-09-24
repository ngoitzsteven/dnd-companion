export interface Note {
  id: string;
  content: string;
  session_date: string | null;
  location_id: string | null;
  created_at: string;
}

export interface NoteCreatePayload {
  content: string;
  session_date?: string;
  location_id: string | null;
}

export interface NoteUpdatePayload {
  content: string;
  session_date: string;
  location_id: string | null;
}