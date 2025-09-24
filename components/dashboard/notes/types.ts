import type { Location } from "@/types/database";
import type { Note } from "./domain/note";

export interface NotesState {
  sessionDate: string;
  locationId: string;
  content: string;
  error: string | null;
  isSubmitting: boolean;
  isModalOpen: boolean;
  editingNote: Note | null;
  deletingNoteId: string | null;
  showAllNotes: boolean;
}

export interface NotesProps {
  campaignId: string;
  canManage: boolean;
  notes: Note[];
  locations: Location[];
  locationLookup: Map<string, string>;
  onMutated: () => void;
}

