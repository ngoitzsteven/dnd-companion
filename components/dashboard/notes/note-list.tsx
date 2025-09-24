import { Button } from "@/components/ui/button";
import { formatDateLabel } from "../shared";
import { NoteFormatter } from "./note-formatter";
import type { Note } from "@/types/database";

interface NoteListProps {
  notes: Note[];
  locationLookup: Map<string, string>;
  canManage: boolean;
  showAllNotes: boolean;
  deletingNoteId: string | null;
  onEdit: (note: Note) => void;
  onDelete: (noteId: string) => void;
  onToggleShowAll: () => void;
}

export function NoteList({
  notes,
  locationLookup,
  canManage,
  showAllNotes,
  deletingNoteId,
  onEdit,
  onDelete,
  onToggleShowAll
}: NoteListProps) {
  const displayedNotes = showAllNotes ? notes : notes.slice(0, 4);

  return (
    <>
      {displayedNotes.map((note) => (
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
                <Button type="button" size="sm" variant="ghost" onClick={() => onEdit(note)}>
                  Edit
                </Button>
                <Button 
                  type="button" 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => onDelete(note.id)}
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
            dangerouslySetInnerHTML={{ __html: NoteFormatter.formatContent(note.content) }}
          />
        </div>
      ))}
      {notes.length > 4 && (
        <div className="text-center">
          <Button 
            type="button" 
            size="sm" 
            variant="ghost" 
            onClick={onToggleShowAll}
            className="text-slate-400 hover:text-slate-300"
          >
            {showAllNotes ? "Show less" : `Show ${notes.length - 4} more notes`}
          </Button>
        </div>
      )}
    </>
  );
}