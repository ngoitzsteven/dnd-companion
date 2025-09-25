'use client';

import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { useNotes } from './hooks/use-notes';
import debounce from 'lodash.debounce';

interface AutoSaveNoteProps {
  noteId: string;
  campaignId: string;
  initialContent: string;
  placeholder?: string;
}

export function AutoSaveNote({ noteId, campaignId, initialContent, placeholder }: AutoSaveNoteProps) {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const { updateNote } = useNotes(campaignId);

  const debouncedSave = debounce(async (newContent: string) => {
    if (newContent !== initialContent && newContent.trim()) {
      setIsSaving(true);
      updateNote({
        noteId,
        payload: { content: newContent }
      });
      setTimeout(() => setIsSaving(false), 500);
    }
  }, 1000);

  useEffect(() => {
    debouncedSave(content);
    return () => debouncedSave.cancel();
  }, [content, debouncedSave]);

  return (
    <div className="relative">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder || "Start typing..."}
        className="min-h-[100px]"
      />
      {isSaving && (
        <div className="absolute top-2 right-2 text-xs text-slate-400">
          Saving...
        </div>
      )}
    </div>
  );
}