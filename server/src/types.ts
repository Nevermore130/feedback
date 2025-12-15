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
  rating: number;
  category: Category;
  sentiment: Sentiment;
  tags: string[];
  aiSummary?: string;
  status: 'New' | 'In Progress' | 'Resolved';
  assignedTo?: string;
  // Extended fields from feishu API
  type?: string;
  imageUrl?: string;
  momentsText?: string;
  userType?: string;
  contentType?: number; // 1: 社区审核, 0: 产品功能
}

// Feishu API response types
export interface FeishuFeedbackItem {
  id: number;
  user_id: number;
  relaId: string;
  reporteder: number;
  nickName: string;
  remark: string;
  contact: string | null;
  app_version: string | null;
  contentType: number;
  userType: string;
  content: string;
  type: string;
  userImg: string;
  cid: string;
  timeId: string;
  thumbnailUrl: string;
  momentsText: string;
  imageUrl: string;
  status: number;
  updateTime: string;
  createTime: string;
  extend1: string | null;
}

export interface FeishuApiResponse {
  code: number;
  data: FeishuFeedbackItem[];
}
