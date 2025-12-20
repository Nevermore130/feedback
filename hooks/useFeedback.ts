import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedbackApi, DateRange, FeedbackFilters, PaginationInfo, DashboardSummary } from '../services/api';
import { FeedbackItem } from '../types';

// Query keys factory
export const feedbackKeys = {
  all: ['feedback'] as const,
  lists: () => [...feedbackKeys.all, 'list'] as const,
  list: (dateRange?: DateRange, filters?: FeedbackFilters) =>
    [...feedbackKeys.lists(), { dateRange, filters }] as const,
  infinite: (dateRange?: DateRange, filters?: FeedbackFilters) =>
    [...feedbackKeys.all, 'infinite', { dateRange, filters }] as const,
  details: () => [...feedbackKeys.all, 'detail'] as const,
  detail: (id: string) => [...feedbackKeys.details(), id] as const,
  summary: (dateRange?: DateRange) => [...feedbackKeys.all, 'summary', { dateRange }] as const,
};

// Hook for fetching all feedback (legacy)
export function useFeedbackList(dateRange?: DateRange) {
  return useQuery({
    queryKey: feedbackKeys.list(dateRange),
    queryFn: () => feedbackApi.getAll(dateRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
  });
}

// Hook for infinite scrolling feedback list
export function useInfiniteFeedback(
  dateRange?: DateRange,
  pageSize: number = 20,
  filters?: FeedbackFilters
) {
  return useInfiniteQuery({
    queryKey: feedbackKeys.infinite(dateRange, filters),
    queryFn: async ({ pageParam = 1 }) => {
      return feedbackApi.getPaginated(dateRange, pageParam, pageSize, filters);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasMore) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Hook for dashboard summary
export function useDashboardSummary(dateRange?: DateRange) {
  return useQuery({
    queryKey: feedbackKeys.summary(dateRange),
    queryFn: () => feedbackApi.getSummary(dateRange),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Hook for single feedback detail
export function useFeedbackDetail(id: string) {
  return useQuery({
    queryKey: feedbackKeys.detail(id),
    queryFn: () => feedbackApi.getById(id),
    enabled: !!id,
  });
}

// Hook for updating feedback
export function useUpdateFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<FeedbackItem> }) =>
      feedbackApi.update(id, updates),
    onSuccess: (data, variables) => {
      // Update the detail cache
      queryClient.setQueryData(feedbackKeys.detail(variables.id), data);
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: feedbackKeys.lists() });
      queryClient.invalidateQueries({ queryKey: feedbackKeys.all });
    },
  });
}

// Hook for refreshing feedback data
export function useRefreshFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dateRange?: DateRange) => feedbackApi.refresh(dateRange),
    onSuccess: () => {
      // Invalidate all feedback queries
      queryClient.invalidateQueries({ queryKey: feedbackKeys.all });
    },
  });
}
