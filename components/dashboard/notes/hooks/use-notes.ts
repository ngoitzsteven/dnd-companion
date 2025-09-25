import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NotesService } from "../notes-service";
import type { Note, NoteCreatePayload, NoteUpdatePayload } from "../domain/note";
import { createSupabaseClient } from '@/lib/supabaseClient';

export function useNotes(campaignId: string) {
  const queryClient = useQueryClient();
  const notesService = useMemo(() => new NotesService(campaignId), [campaignId]);
  
  const { data: notesResponse, isLoading, error, fetchNextPage, hasNextPage } = useQuery({
    queryKey: ['notes', campaignId],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await fetch(`/api/campaigns/${campaignId}/notes?page=${pageParam}&limit=20`);
      if (!response.ok) throw new Error('Failed to fetch notes');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const notes = notesResponse?.data || [];

  const createNoteMutation = useMutation({
    mutationFn: (payload: NoteCreatePayload) => notesService.createNote(payload),
    onMutate: async (newNote) => {
      await queryClient.cancelQueries({ queryKey: ['notes', campaignId] });
      const previousNotes = queryClient.getQueryData<Note[]>(['notes', campaignId]);
      
      const optimisticNote: Note = {
        id: `temp-${Date.now()}`,
        campaign_id: campaignId,
        content: newNote.content,
        session_date: newNote.session_date || null,
        location_id: newNote.location_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      queryClient.setQueryData<Note[]>(['notes', campaignId], old => 
        old ? [optimisticNote, ...old] : [optimisticNote]
      );
      
      return { previousNotes };
    },
    onError: (err, newNote, context) => {
      queryClient.setQueryData(['notes', campaignId], context?.previousNotes);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', campaignId] });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ noteId, payload }: { noteId: string; payload: NoteUpdatePayload }) => 
      notesService.updateNote(noteId, payload),
    onMutate: async ({ noteId, payload }) => {
      await queryClient.cancelQueries({ queryKey: ['notes', campaignId] });
      const previousNotes = queryClient.getQueryData<Note[]>(['notes', campaignId]);
      
      queryClient.setQueryData<Note[]>(['notes', campaignId], old => 
        old?.map(note => 
          note.id === noteId 
            ? { ...note, ...payload, updated_at: new Date().toISOString() }
            : note
        ) || []
      );
      
      return { previousNotes };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['notes', campaignId], context?.previousNotes);
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => notesService.deleteNote(noteId),
    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: ['notes', campaignId] });
      const previousNotes = queryClient.getQueryData<Note[]>(['notes', campaignId]);
      
      queryClient.setQueryData<Note[]>(['notes', campaignId], old => 
        old?.filter(note => note.id !== noteId) || []
      );
      
      return { previousNotes };
    },
    onError: (err, noteId, context) => {
      queryClient.setQueryData(['notes', campaignId], context?.previousNotes);
    },
  });

  const sortedNotes = useMemo(() => NotesService.sortNotesByDate(notes), [notes]);

  return {
    notes: sortedNotes,
    isLoading,
    error,
    hasNextPage: notesResponse?.pagination?.hasMore || false,
    fetchNextPage,
    createNote: createNoteMutation.mutate,
    updateNote: updateNoteMutation.mutate,
    deleteNote: deleteNoteMutation.mutate,
    notesService
  };
}

export function useNotesRealtime(campaignId: string) {
  const queryClient = useQueryClient();
  
  useMemo(() => {
    const supabase = createSupabaseClient();
    
    const subscription = supabase
      .channel(`notes-${campaignId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'notes',
          filter: `campaign_id=eq.${campaignId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notes', campaignId] });
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [campaignId, queryClient]);
}