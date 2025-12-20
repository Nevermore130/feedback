import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FeedbackItem, Category, Sentiment } from '../types';
import { Search, Filter, Sparkles, CheckCircle2, Clock, AlertCircle, RefreshCw, X, Check, UserPlus, Calendar, Loader2 } from 'lucide-react';
import { analyzeFeedbackWithGemini } from '../services/geminiService';
import { TEAM_MEMBERS } from '../constants';
import { useI18n } from '../i18n';
import { useInfiniteFeedback, useUpdateFeedback } from '../hooks/useFeedback';
import { FeedbackFilters } from '../services/api';

interface FeedbackListProps {
  onDateRangeChange?: (from: string, to: string) => void;
  currentDateRange?: { from: string; to: string };
}

type ContentTypeFilter = 'All' | 'community' | 'product';

// Get default date range (last 7 days)
const getDefaultDateRange = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 7);
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
};

export const FeedbackList: React.FC<FeedbackListProps> = ({ onDateRangeChange, currentDateRange }) => {
  const { t } = useI18n();
  const [filterCategory, setFilterCategory] = useState<Category | 'All'>('All');
  const [filterContentType, setFilterContentType] = useState<ContentTypeFilter>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkAnalyzing, setIsBulkAnalyzing] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState(currentDateRange?.from || getDefaultDateRange().from);
  const [dateTo, setDateTo] = useState(currentDateRange?.to || getDefaultDateRange().to);

  // Ref for infinite scroll trigger
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Build filters for API
  const filters: FeedbackFilters = {
    category: filterCategory !== 'All' ? filterCategory : undefined,
    contentType: filterContentType === 'community' ? '1' : filterContentType === 'product' ? '0' : undefined,
    search: debouncedSearch || undefined,
  };

  // Use infinite query for paginated data
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteFeedback(
    currentDateRange || { from: dateFrom, to: dateTo },
    20,
    filters
  );

  // Mutation for updating feedback
  const updateMutation = useUpdateFeedback();

  // Flatten pages into single array
  const allFeedback = data?.pages.flatMap(page => page.data) || [];
  const totalItems = data?.pages[0]?.pagination.totalItems || 0;

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleDateRangeApply = () => {
    if (onDateRangeChange && dateFrom && dateTo) {
      onDateRangeChange(dateFrom, dateTo);
    }
  };

  const handleAnalyze = async (item: FeedbackItem) => {
    setAnalyzingId(item.id);
    try {
      const result = await analyzeFeedbackWithGemini(item.content);
      updateMutation.mutate({
        id: item.id,
        updates: {
          category: result.category,
          sentiment: result.sentiment,
          tags: result.tags,
          aiSummary: result.summary
        }
      });
    } catch (error) {
      alert(`Failed to analyze. Please check your API key.:${error}`);
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleBulkAnalyze = async () => {
    if (selectedIds.size === 0) return;

    setIsBulkAnalyzing(true);
    const itemsToAnalyze = allFeedback.filter(f => selectedIds.has(f.id));

    for (const item of itemsToAnalyze) {
      try {
        const result = await analyzeFeedbackWithGemini(item.content);
        updateMutation.mutate({
          id: item.id,
          updates: {
            category: result.category,
            sentiment: result.sentiment,
            tags: result.tags,
            aiSummary: result.summary
          }
        });
      } catch (e) {
        console.error(`Failed to analyze ${item.id}`, e);
      }
    }

    setIsBulkAnalyzing(false);
    setSelectedIds(new Set());
  };

  const updateStatus = (id: string, newStatus: FeedbackItem['status']) => {
    updateMutation.mutate({ id, updates: { status: newStatus } });
  };

  const updateAssignee = (id: string, assigneeId: string) => {
    updateMutation.mutate({ id, updates: { assignedTo: assigneeId || undefined } });
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === allFeedback.length && allFeedback.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allFeedback.map(i => i.id)));
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const getSentimentColor = (sentiment: Sentiment) => {
    switch (sentiment) {
      case Sentiment.POSITIVE: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case Sentiment.NEGATIVE: return 'bg-rose-100 text-rose-700 border-rose-200';
      case Sentiment.NEUTRAL: return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  const getCategoryIcon = (category: Category) => {
    switch (category) {
      case Category.BUG: return <AlertCircle size={14} className="text-rose-500" />;
      case Category.FEATURE: return <Sparkles size={14} className="text-amber-500" />;
      case Category.PERFORMANCE: return <Clock size={14} className="text-blue-500" />;
      default: return <CheckCircle2 size={14} className="text-slate-500" />;
    }
  };

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'New': return 'bg-blue-50 text-blue-700 border-blue-200';
          case 'In Progress': return 'bg-amber-50 text-amber-700 border-amber-200';
          case 'Resolved': return 'bg-green-50 text-green-700 border-green-200';
          default: return 'bg-slate-50 text-slate-700 border-slate-200';
      }
  };

  const getContentTypeLabel = (contentType?: number) => {
    if (contentType === 1) {
      return { label: t.communityReview, color: 'bg-purple-100 text-purple-700 border-purple-200' };
    }
    if (contentType === 0) {
      return { label: t.productFeature, color: 'bg-cyan-100 text-cyan-700 border-cyan-200' };
    }
    return null;
  };

  const getTypeLabel = (type?: string) => {
    if (!type) return null;
    const typeMap: Record<string, string> = {
      'pretend_couple': t.pretendCouple,
      'user': t.userProfile,
      'moment': t.moment,
      'photo_wall': t.photoWall,
      'profile_intro': t.profileIntro,
    };
    return typeMap[type] || type;
  };

  const allSelected = allFeedback.length > 0 && selectedIds.size === allFeedback.length;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-2xl">
        <div className="text-center text-slate-400">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm">{t.loading}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-2xl border border-dashed border-red-300">
        <div className="text-center text-red-500">
          <p className="text-lg font-medium">{t.error}</p>
          <p className="text-sm">{error instanceof Error ? error.message : 'Failed to load data'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-enter-active">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{t.userFeedback}</h2>
            <p className="text-slate-500 mt-1">{t.manageFeedback} ({totalItems} {t.totalFeedback.toLowerCase()})</p>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-slate-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
            />
            <span className="text-slate-400">{t.to}</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
            />
            <button
              onClick={handleDateRangeApply}
              disabled={isLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? <RefreshCw size={14} className="animate-spin" /> : null}
              {t.query}
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center justify-end">
          
          {/* Bulk Action Button */}
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkAnalyze}
              disabled={isBulkAnalyzing}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed animate-in fade-in zoom-in duration-200"
            >
              {isBulkAnalyzing ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <Sparkles size={18} />
              )}
              <span className="font-medium">{t.analyze} ({selectedIds.size})</span>
            </button>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              className="pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full sm:w-64 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select
              className="pl-10 pr-8 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none bg-white w-full sm:w-48 cursor-pointer transition-all"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as Category | 'All')}
            >
              <option value="All">{t.allCategories}</option>
              {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="relative">
            <select
              className="pl-4 pr-8 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none bg-white w-full sm:w-36 cursor-pointer transition-all"
              value={filterContentType}
              onChange={(e) => setFilterContentType(e.target.value as ContentTypeFilter)}
            >
              <option value="All">{t.allSources}</option>
              <option value="community">{t.communityReview}</option>
              <option value="product">{t.productFeature}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Select All Bar */}
      <div className="flex items-center justify-between px-2">
         <div className="flex items-center gap-3">
            <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
            >
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${allSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                    {allSelected && <Check size={14} className="text-white" />}
                </div>
                {allSelected ? t.deselectAll : t.selectAll}
            </button>
            <span className="text-sm text-slate-400">
                {selectedIds.size} {t.selected}
            </span>
         </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {allFeedback.map((item) => {
            const isSelected = selectedIds.has(item.id);
            const isExpanded = expandedIds.has(item.id);
            const textLimit = 150;
            const shouldTruncate = item.content.length > textLimit;
            const displayContent = shouldTruncate && !isExpanded 
                ? item.content.slice(0, textLimit).trim() + '...' 
                : item.content;

            const assignedMember = TEAM_MEMBERS.find(m => m.id === item.assignedTo);

            return (
          <div key={item.id} className={`bg-white p-6 rounded-2xl shadow-sm border transition-all duration-300 ${isSelected ? 'border-indigo-500 ring-1 ring-indigo-500/30' : 'border-slate-100 hover:shadow-md'}`}>
            <div className="flex items-start gap-4">
              {/* Checkbox */}
              <button 
                onClick={() => toggleSelection(item.id)}
                className="mt-1 shrink-0 text-slate-300 hover:text-indigo-500 transition-colors"
              >
                 <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                    {isSelected && <Check size={14} className="text-white" />}
                 </div>
              </button>

              <img src={item.userAvatar} alt={item.userName} className="w-12 h-12 rounded-full object-cover border-2 border-slate-100" />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2 flex-wrap">
                      {item.userName}
                      {getContentTypeLabel(item.contentType) && (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getContentTypeLabel(item.contentType)!.color}`}>
                          {getContentTypeLabel(item.contentType)!.label}
                        </span>
                      )}
                      {item.type && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium border bg-slate-100 text-slate-600 border-slate-200">
                          {getTypeLabel(item.type)}
                        </span>
                      )}
                      <span className="text-xs font-normal text-slate-400">• {new Date(item.date).toLocaleDateString()}</span>
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getSentimentColor(item.sentiment)}`}>
                      {item.sentiment}
                    </span>
                    <button 
                      onClick={() => handleAnalyze(item)}
                      disabled={analyzingId === item.id || isBulkAnalyzing}
                      className="group p-2 rounded-lg hover:bg-indigo-50 text-indigo-600 transition-colors disabled:opacity-50"
                      title="Analyze with AI"
                    >
                      {analyzingId === item.id ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        <Sparkles size={18} className="group-hover:scale-110 transition-transform" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-3 text-slate-600 leading-relaxed text-sm">
                    {displayContent}
                    {shouldTruncate && (
                        <button
                            onClick={() => toggleExpand(item.id)}
                            className="ml-1 text-indigo-600 hover:text-indigo-700 font-medium text-xs focus:outline-none hover:underline"
                        >
                            {isExpanded ? t.readLess : t.readMore}
                        </button>
                    )}
                </div>

                {/* Image Preview */}
                {item.imageUrl && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.imageUrl.split(',').filter(url => url.trim()).map((url, index) => (
                      <a
                        key={index}
                        href={url.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={url.trim()}
                          alt={`Feedback image ${index + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border border-slate-200 hover:border-indigo-300 transition-all hover:shadow-md"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </a>
                    ))}
                  </div>
                )}

                {item.aiSummary && (
                  <div className="mt-4 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 flex gap-3">
                    <Sparkles size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-indigo-900 mb-1">{t.aiInsight}</p>
                      <p className="text-xs text-indigo-700">{item.aiSummary}</p>
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  
                  {/* Category & Tags */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                        {getCategoryIcon(item.category)}
                        {item.category}
                    </span>
                    {item.tags.map(tag => (
                        <span key={tag} className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-500 text-xs shadow-sm">
                        #{tag}
                        </span>
                    ))}
                  </div>

                  {/* Operational Controls */}
                  <div className="flex items-center gap-3">
                     
                     {/* Status Dropdown */}
                     <div className="relative group">
                        <select
                            value={item.status}
                            onChange={(e) => updateStatus(item.id, e.target.value as any)}
                            className={`appearance-none pl-3 pr-8 py-1.5 text-xs font-medium border rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500/20 transition-all ${getStatusColor(item.status)}`}
                        >
                            <option value="New">{t.new}</option>
                            <option value="In Progress">{t.inProgress}</option>
                            <option value="Resolved">{t.resolved}</option>
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-3 h-3 text-current opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                     </div>

                     {/* Assignee Dropdown */}
                     <div className="relative">
                        <div className={`flex items-center gap-2 pl-2 pr-2 py-1.5 rounded-full border transition-all ${item.assignedTo ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                            {item.assignedTo ? (
                                <img src={assignedMember?.avatar} alt="Assignee" className="w-5 h-5 rounded-full border border-indigo-200" />
                            ) : (
                                <UserPlus size={14} className="text-slate-400 ml-1" />
                            )}

                            <select
                                value={item.assignedTo || ''}
                                onChange={(e) => updateAssignee(item.id, e.target.value)}
                                className="appearance-none bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer pr-6 min-w-[90px]"
                            >
                                <option value="">{t.unassigned}</option>
                                {TEAM_MEMBERS.map(member => (
                                    <option key={member.id} value={member.id}>{member.name}</option>
                                ))}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                     </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        })}
        
        {allFeedback.length === 0 && (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <Search className="text-slate-400" size={24} />
                </div>
                <h3 className="text-slate-900 font-medium">{t.noFeedbackFound}</h3>
                <p className="text-slate-500 text-sm mt-1">{t.tryAdjustingFilters}</p>
            </div>
        )}

        {/* Infinite scroll trigger */}
        <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
          {isFetchingNextPage && (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">{t.loading}</span>
            </div>
          )}
          {!hasNextPage && allFeedback.length > 0 && (
            <p className="text-sm text-slate-400">
              {allFeedback.length} / {totalItems}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
