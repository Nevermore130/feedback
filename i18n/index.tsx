import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'zh' | 'en';

interface Translations {
  // Common
  search: string;
  query: string;
  all: string;
  loading: string;
  error: string;

  // Header
  overview: string;
  feedbackAnalysis: string;
  settings: string;
  welcome: string;
  adminUser: string;
  productManager: string;

  // Sidebar
  dashboard: string;
  feedback: string;

  // FeedbackList
  userFeedback: string;
  manageFeedback: string;
  searchPlaceholder: string;
  allCategories: string;
  allSources: string;
  communityReview: string;
  productFeature: string;
  selectAll: string;
  deselectAll: string;
  selected: string;
  analyze: string;
  noFeedbackFound: string;
  tryAdjustingFilters: string;
  readMore: string;
  readLess: string;
  aiInsight: string;
  unassigned: string;
  new: string;
  inProgress: string;
  resolved: string;
  to: string;

  // Content Types
  pretendCouple: string;
  userProfile: string;
  moment: string;
  photoWall: string;
  profileIntro: string;

  // Categories
  bugReport: string;
  featureRequest: string;
  uxUi: string;
  performance: string;
  other: string;
  unclassified: string;

  // Sentiments
  positive: string;
  neutral: string;
  negative: string;
  pending: string;

  // Settings
  settingsPanel: string;
  configurationOptions: string;

  // Dashboard
  totalFeedback: string;
  avgRating: string;
  npsScore: string;
  sentimentOverview: string;
  categoryBreakdown: string;
  recentFeedback: string;
  adTagTrend: string;
  feedbackCount: string;
  dailyFeedbackTrend: string;
  peakDay: string;
  issueTypeTrend: string;
  byWeek: string;
  byMonth: string;
  adIssue: string;
  reviewIssue: string;
  chatIssue: string;
  crashIssue: string;
  otherIssue: string;
}

const translations: Record<Language, Translations> = {
  zh: {
    // Common
    search: '搜索',
    query: '查询',
    all: '全部',
    loading: '加载中...',
    error: '错误',

    // Header
    overview: '概览',
    feedbackAnalysis: '反馈分析',
    settings: '设置',
    welcome: '欢迎回来，管理员。这是今天的情况。',
    adminUser: '管理员',
    productManager: '产品经理',

    // Sidebar
    dashboard: '仪表盘',
    feedback: '反馈',

    // FeedbackList
    userFeedback: '用户反馈',
    manageFeedback: '管理和分析用户反馈。',
    searchPlaceholder: '搜索反馈或用户...',
    allCategories: '全部分类',
    allSources: '全部来源',
    communityReview: '社区审核',
    productFeature: '产品功能',
    selectAll: '全选',
    deselectAll: '取消全选',
    selected: '已选择',
    analyze: '分析',
    noFeedbackFound: '未找到反馈',
    tryAdjustingFilters: '请尝试调整筛选条件或搜索词',
    readMore: '展开',
    readLess: '收起',
    aiInsight: 'AI 洞察',
    unassigned: '未分配',
    new: '新建',
    inProgress: '进行中',
    resolved: '已解决',
    to: '至',

    // Content Types
    pretendCouple: '假装情侣',
    userProfile: '用户主页',
    moment: '日志',
    photoWall: '照片墙',
    profileIntro: '个人简介',

    // Categories
    bugReport: '问题报告',
    featureRequest: '功能建议',
    uxUi: '用户体验',
    performance: '性能',
    other: '其他',
    unclassified: '未分类',

    // Sentiments
    positive: '正面',
    neutral: '中性',
    negative: '负面',
    pending: '待定',

    // Settings
    settingsPanel: '设置面板',
    configurationOptions: '配置选项将显示在这里。',

    // Dashboard
    totalFeedback: '总反馈数',
    avgRating: '平均评分',
    npsScore: 'NPS 分数',
    sentimentOverview: '情感分布',
    categoryBreakdown: '分类统计',
    recentFeedback: '最近反馈',
    adTagTrend: '广告标签反馈趋势',
    feedbackCount: '反馈数量',
    dailyFeedbackTrend: '每日反馈趋势',
    peakDay: '峰值',
    issueTypeTrend: '问题类型反馈趋势',
    byWeek: '按周',
    byMonth: '按月',
    adIssue: '广告',
    reviewIssue: '审核',
    chatIssue: '聊天',
    crashIssue: '闪退',
    otherIssue: '其他',
  },
  en: {
    // Common
    search: 'Search',
    query: 'Query',
    all: 'All',
    loading: 'Loading...',
    error: 'Error',

    // Header
    overview: 'Overview',
    feedbackAnalysis: 'Feedback Analysis',
    settings: 'Settings',
    welcome: "Welcome back, Admin. Here's what's happening today.",
    adminUser: 'Admin User',
    productManager: 'Product Manager',

    // Sidebar
    dashboard: 'Dashboard',
    feedback: 'Feedback',

    // FeedbackList
    userFeedback: 'User Feedback',
    manageFeedback: 'Manage and analyze incoming user reviews.',
    searchPlaceholder: 'Search feedback or user...',
    allCategories: 'All Categories',
    allSources: 'All Sources',
    communityReview: 'Community Review',
    productFeature: 'Product Feature',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    selected: 'selected',
    analyze: 'Analyze',
    noFeedbackFound: 'No feedback found',
    tryAdjustingFilters: 'Try adjusting your filters or search terms',
    readMore: 'Read More',
    readLess: 'Read Less',
    aiInsight: 'AI Insight',
    unassigned: 'Unassigned',
    new: 'New',
    inProgress: 'In Progress',
    resolved: 'Resolved',
    to: 'to',

    // Content Types
    pretendCouple: 'Pretend Couple',
    userProfile: 'User Profile',
    moment: 'Moment',
    photoWall: 'Photo Wall',
    profileIntro: 'Profile Intro',

    // Categories
    bugReport: 'Bug Report',
    featureRequest: 'Feature Request',
    uxUi: 'UX/UI',
    performance: 'Performance',
    other: 'Other',
    unclassified: 'Unclassified',

    // Sentiments
    positive: 'Positive',
    neutral: 'Neutral',
    negative: 'Negative',
    pending: 'Pending',

    // Settings
    settingsPanel: 'Settings Panel',
    configurationOptions: 'Configuration options would go here.',

    // Dashboard
    totalFeedback: 'Total Feedback',
    avgRating: 'Avg Rating',
    npsScore: 'NPS Score',
    sentimentOverview: 'Sentiment Overview',
    categoryBreakdown: 'Category Breakdown',
    recentFeedback: 'Recent Feedback',
    adTagTrend: 'Ad Tag Feedback Trend',
    feedbackCount: 'Feedback Count',
    dailyFeedbackTrend: 'Daily Feedback Trend',
    peakDay: 'Peak',
    issueTypeTrend: 'Issue Type Feedback Trend',
    byWeek: 'By Week',
    byMonth: 'By Month',
    adIssue: 'Ads',
    reviewIssue: 'Review',
    chatIssue: 'Chat',
    crashIssue: 'Crash',
    otherIssue: 'Other',
  },
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('zh');

  const value = {
    language,
    setLanguage,
    t: translations[language],
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
