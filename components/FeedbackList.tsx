import React, { useState } from 'react';
import { FeedbackItem, Category, Sentiment } from '../types';
import { Search, Filter, Sparkles, CheckCircle2, Clock, AlertCircle, RefreshCw, X, Check, User, UserPlus } from 'lucide-react';
import { analyzeFeedbackWithGemini } from '../services/geminiService';
import { TEAM_MEMBERS } from '../constants';

interface FeedbackListProps {
  feedback: FeedbackItem[];
  setFeedback: React.Dispatch<React.SetStateAction<FeedbackItem[]>>;
}

export const FeedbackList: React.FC<FeedbackListProps> = ({ feedback, setFeedback }) => {
  const [filterCategory, setFilterCategory] = useState<Category | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkAnalyzing, setIsBulkAnalyzing] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const handleAnalyze = async (item: FeedbackItem) => {
    setAnalyzingId(item.id);
    try {
      const result = await analyzeFeedbackWithGemini(item.content);
      
      setFeedback(prev => prev.map(f => {
        if (f.id === item.id) {
          return {
            ...f,
            category: result.category,
            sentiment: result.sentiment,
            tags: result.tags,
            aiSummary: result.summary
          };
        }
        return f;
      }));
    } catch (error) {
      alert("Failed to analyze. Please check your API key.");
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleBulkAnalyze = async () => {
    if (selectedIds.size === 0) return;
    
    setIsBulkAnalyzing(true);
    // Find items that are selected
    const itemsToAnalyze = feedback.filter(f => selectedIds.has(f.id));
    
    const promises = itemsToAnalyze.map(async (item) => {
        try {
            const result = await analyzeFeedbackWithGemini(item.content);
            return { id: item.id, result };
        } catch (e) {
            console.error(`Failed to analyze ${item.id}`, e);
            return { id: item.id, error: e };
        }
    });

    const results = await Promise.all(promises);

    setFeedback(prev => prev.map(f => {
        const res = results.find(r => r.id === f.id);
        if (res && 'result' in res && res.result) {
             return {
                ...f,
                category: res.result.category,
                sentiment: res.result.sentiment,
                tags: res.result.tags,
                aiSummary: res.result.summary
             };
        }
        return f;
    }));
    
    setIsBulkAnalyzing(false);
    setSelectedIds(new Set()); 
  };

  const updateStatus = (id: string, newStatus: FeedbackItem['status']) => {
    setFeedback(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));
  };

  const updateAssignee = (id: string, assigneeId: string) => {
    setFeedback(prev => prev.map(f => f.id === id ? { ...f, assignedTo: assigneeId === '' ? undefined : assigneeId } : f));
  };

  const filteredData = feedback.filter(item => {
    const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
    
    const term = searchTerm.toLowerCase().trim();
    if (!term) return matchesCategory;

    const matchesSearch = item.content.toLowerCase().includes(term) || 
                          item.userName.toLowerCase().includes(term);
    return matchesCategory && matchesSearch;
  });

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
    if (selectedIds.size === filteredData.length && filteredData.length > 0) {
        setSelectedIds(new Set());
    } else {
        setSelectedIds(new Set(filteredData.map(i => i.id)));
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

  const allSelected = filteredData.length > 0 && selectedIds.size === filteredData.length;

  return (
    <div className="space-y-6 fade-enter-active">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">User Feedback</h2>
          <p className="text-slate-500 mt-1">Manage and analyze incoming user reviews.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          
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
              <span className="font-medium">Analyze ({selectedIds.size})</span>
            </button>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search feedback or user..." 
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
              <option value="All">All Categories</option>
              {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
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
                {allSelected ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-sm text-slate-400">
                {selectedIds.size} selected
            </span>
         </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {filteredData.map((item) => {
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
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                      {item.userName}
                      <span className="text-xs font-normal text-slate-400">• {new Date(item.date).toLocaleDateString()}</span>
                    </h3>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className={`w-4 h-4 ${i < item.rating ? 'text-amber-400' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
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
                            {isExpanded ? 'Read Less' : 'Read More'}
                        </button>
                    )}
                </div>

                {item.aiSummary && (
                  <div className="mt-4 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 flex gap-3">
                    <Sparkles size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-indigo-900 mb-1">AI Insight</p>
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
                            <option value="New">New</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
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
                                <option value="">Unassigned</option>
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
        
        {filteredData.length === 0 && (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <Search className="text-slate-400" size={24} />
                </div>
                <h3 className="text-slate-900 font-medium">No feedback found</h3>
                <p className="text-slate-500 text-sm mt-1">Try adjusting your filters or search terms</p>
            </div>
        )}
      </div>
    </div>
  );
};
