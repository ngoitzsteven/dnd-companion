import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
});

// Cache invalidation helpers
export const invalidateNotes = (campaignId: string) => {
  queryClient.invalidateQueries({ queryKey: ['notes', campaignId] });
};

export const invalidateCampaign = (campaignId: string) => {
  queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
};

// Prefetch helpers
export const prefetchNotes = (campaignId: string) => {
  queryClient.prefetchQuery({
    queryKey: ['notes', campaignId],
    queryFn: async () => {
      const response = await fetch(`/api/campaigns/${campaignId}/notes?page=1&limit=20`);
      if (!response.ok) throw new Error('Failed to fetch notes');
      return response.json();
    },
  });
};

// Background sync for offline support
export const syncOfflineChanges = async () => {
  const offlineChanges = localStorage.getItem('offline-changes');
  if (!offlineChanges) return;

  try {
    const changes = JSON.parse(offlineChanges);
    for (const change of changes) {
      await fetch(change.url, {
        method: change.method,
        headers: change.headers,
        body: change.body,
      });
    }
    localStorage.removeItem('offline-changes');
  } catch (error) {
    console.error('Failed to sync offline changes:', error);
  }
};