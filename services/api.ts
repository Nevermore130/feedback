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

export const feedbackApi = {
  // Get all feedback with optional date range
  async getAll(dateRange?: DateRange): Promise<FeedbackItem[]> {
    let url = `${API_BASE}/feedback`;
    if (dateRange) {
      url += `?from=${dateRange.from}&to=${dateRange.to}`;
    }
    const response = await fetch(url);
    const result: ApiResponse<FeedbackItem[]> = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch feedback');
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
  }
};
