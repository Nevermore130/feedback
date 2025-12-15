export enum Sentiment {
  POSITIVE = 'Positive',
  NEUTRAL = 'Neutral',
  NEGATIVE = 'Negative',
  PENDING = 'Pending'
}

export enum Category {
  BUG = 'Bug Report',
  FEATURE = 'Feature Request',
  UX_UI = 'UX/UI',
  PERFORMANCE = 'Performance',
  OTHER = 'Other',
  UNCLASSIFIED = 'Unclassified'
}

export interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  role: string;
}

export interface FeedbackItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  date: string;
  content: string;
  rating: number; // 1-5
  category: Category;
  sentiment: Sentiment;
  tags: string[];
  aiSummary?: string;
  status: 'New' | 'In Progress' | 'Resolved';
  assignedTo?: string; // TeamMember ID
}

export interface AnalysisResult {
  sentiment: Sentiment;
  category: Category;
  tags: string[];
  summary: string;
}

export interface DashboardStats {
  totalFeedback: number;
  averageRating: number;
  npsScore: number;
  sentimentDistribution: { name: string; value: number; color: string }[];
  categoryDistribution: { name: string; value: number }[];
}