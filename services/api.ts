import { FeedbackItem, TeamMember } from '../types';

const API_BASE = '/api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  dateRange?: { from: string; to: string };
}

export interface DateRange {
  from: string;
  to: string;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationInfo;
  dateRange: { from: string; to: string };
  error?: string;
}

export interface FeedbackFilters {
  category?: string;
  sentiment?: string;
  contentType?: string;
  search?: string;
  tags?: string[];
}

export interface FeishuUser {
  user_id: string;
  open_id: string;
  name: string;
  avatar_url?: string;
  department?: string;
}

export interface TagInfo {
  tag: string;
  count: number;
}

export interface DashboardSummary {
  totalFeedback: number;
  avgRating: number;
  npsScore: number;
  sentimentCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  dailyTrendData: Array<{ date: string; count: number; isPeak: boolean }>;
  issueTypeWeekData: Array<{ period: string; ad: number; review: number; chat: number; crash: number; other: number }>;
  issueTypeMonthData: Array<{ period: string; ad: number; review: number; chat: number; crash: number; other: number }>;
  adTrendData: Array<{ date: string; count: number }>;
  recentFeedback: FeedbackItem[];
  tagCloud: Array<{ tag: string; count: number }>;
}

export const feedbackApi = {
  // Get all feedback with optional date range (legacy - returns all data)
  async getAll(dateRange?: DateRange): Promise<FeedbackItem[]> {
    let url = `${API_BASE}/feedback?pageSize=10000`; // Large page size to get all
    if (dateRange) {
      url += `&from=${dateRange.from}&to=${dateRange.to}`;
    }
    const response = await fetch(url);
    const result: PaginatedResponse<FeedbackItem> = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch feedback');
    }
    return result.data;
  },

  // Get paginated feedback with filters
  async getPaginated(
    dateRange?: DateRange,
    page: number = 1,
    pageSize: number = 20,
    filters?: FeedbackFilters
  ): Promise<{ data: FeedbackItem[]; pagination: PaginationInfo }> {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('pageSize', pageSize.toString());

    if (dateRange) {
      params.set('from', dateRange.from);
      params.set('to', dateRange.to);
    }
    if (filters?.category) params.set('category', filters.category);
    if (filters?.sentiment) params.set('sentiment', filters.sentiment);
    if (filters?.contentType) params.set('contentType', filters.contentType);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.tags && filters.tags.length > 0) params.set('tags', filters.tags.join(','));

    const response = await fetch(`${API_BASE}/feedback?${params.toString()}`);
    const result: PaginatedResponse<FeedbackItem> = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch feedback');
    }
    return { data: result.data, pagination: result.pagination };
  },

  // Get dashboard summary (aggregated statistics)
  async getSummary(dateRange?: DateRange): Promise<DashboardSummary> {
    let url = `${API_BASE}/feedback/summary`;
    if (dateRange) {
      url += `?from=${dateRange.from}&to=${dateRange.to}`;
    }
    const response = await fetch(url);
    const result: ApiResponse<DashboardSummary> = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch summary');
    }
    return result.data;
  },

  // Refresh feedback data from source API
  async refresh(dateRange?: DateRange): Promise<FeedbackItem[]> {
    const response = await fetch(`${API_BASE}/feedback/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dateRange || {})
    });
    const result: ApiResponse<FeedbackItem[]> = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to refresh feedback');
    }
    return result.data;
  },

  // Get single feedback by ID
  async getById(id: string): Promise<FeedbackItem> {
    const response = await fetch(`${API_BASE}/feedback/${id}`);
    const result: ApiResponse<FeedbackItem> = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch feedback');
    }
    return result.data;
  },

  // Create new feedback
  async create(feedback: Omit<FeedbackItem, 'id' | 'date' | 'status'>): Promise<FeedbackItem> {
    const response = await fetch(`${API_BASE}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedback)
    });
    const result: ApiResponse<FeedbackItem> = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to create feedback');
    }
    return result.data;
  },

  // Update feedback
  async update(id: string, updates: Partial<FeedbackItem>): Promise<FeedbackItem> {
    const response = await fetch(`${API_BASE}/feedback/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const result: ApiResponse<FeedbackItem> = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to update feedback');
    }
    return result.data;
  },

  // Delete feedback
  async delete(id: string): Promise<FeedbackItem> {
    const response = await fetch(`${API_BASE}/feedback/${id}`, {
      method: 'DELETE'
    });
    const result: ApiResponse<FeedbackItem> = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete feedback');
    }
    return result.data;
  },

  // Get team members
  async getTeamMembers(): Promise<TeamMember[]> {
    const response = await fetch(`${API_BASE}/feedback/team/members`);
    const result: ApiResponse<TeamMember[]> = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch team members');
    }
    return result.data;
  },

  // Get all tags with counts
  async getAllTags(dateRange?: DateRange): Promise<TagInfo[]> {
    let url = `${API_BASE}/feedback/tags/all`;
    if (dateRange) {
      url += `?from=${dateRange.from}&to=${dateRange.to}`;
    }
    const response = await fetch(url);
    const result: ApiResponse<TagInfo[]> = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch tags');
    }
    return result.data;
  },

  // Check Feishu configuration status
  async getFeishuStatus(): Promise<{ configured: boolean }> {
    const response = await fetch(`${API_BASE}/feedback/feishu/status`);
    const result: ApiResponse<{ configured: boolean }> = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get Feishu status');
    }
    return result.data;
  },

  // Search Feishu users
  async searchFeishuUsers(keyword: string): Promise<FeishuUser[]> {
    const response = await fetch(`${API_BASE}/feedback/feishu/users/search?keyword=${encodeURIComponent(keyword)}`);
    const result: ApiResponse<FeishuUser[]> = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to search users');
    }
    return result.data;
  },

  // Get recent Feishu contacts
  async getRecentFeishuContacts(): Promise<FeishuUser[]> {
    const response = await fetch(`${API_BASE}/feedback/feishu/users/recent`);
    const result: ApiResponse<FeishuUser[]> = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get recent contacts');
    }
    return result.data;
  },

  // Share feedback to Feishu users
  async shareFeedback(
    feedbackId: string,
    receiverIds: string[],
    shareMessage?: string,
    dateRange?: DateRange
  ): Promise<{ sent: number; failed: number }> {
    const response = await fetch(`${API_BASE}/feedback/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feedbackId,
        receiverIds,
        receiverIdType: 'open_id',
        shareMessage,
        from: dateRange?.from,
        to: dateRange?.to,
      }),
    });
    const result: ApiResponse<{ sent: number; failed: number }> = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to share feedback');
    }
    return result.data;
  }
};
