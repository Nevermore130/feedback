import React, { useState } from 'react';
import { Sentiment } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Users, MessageCircle, Star } from 'lucide-react';
import { useI18n } from '../i18n';
import { useDashboardSummary } from '../hooks/useFeedback';
import { DateRange } from '../services/api';
import { TagCloud } from './TagCloud';

interface DashboardProps {
  dateRange?: DateRange;
  onTagClick?: (tag: string) => void;
}

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#64748b'];
const SENTIMENT_COLORS = {
  [Sentiment.POSITIVE]: '#10b981',
  [Sentiment.NEUTRAL]: '#94a3b8',
  [Sentiment.NEGATIVE]: '#f43f5e',
  [Sentiment.PENDING]: '#cbd5e1'
};

type TimeRange = 'week' | 'month';

export const Dashboard: React.FC<DashboardProps> = ({ dateRange, onTagClick }) => {
  const { t } = useI18n();
  const [issueTypeTimeRange, setIssueTypeTimeRange] = useState<TimeRange>('week');

  // Use React Query to fetch dashboard summary
  const { data: summary, isLoading, error } = useDashboardSummary(dateRange);

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
  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-2xl border border-dashed border-red-300">
        <div className="text-center text-red-500">
          <p className="text-lg font-medium">{t.error}</p>
          <p className="text-sm">{error instanceof Error ? error.message : 'Failed to load data'}</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  // Prepare data for charts
  const sentimentData = [
    { name: t.positive, value: summary.sentimentCounts[Sentiment.POSITIVE] || 0, color: SENTIMENT_COLORS[Sentiment.POSITIVE] },
    { name: t.neutral, value: summary.sentimentCounts[Sentiment.NEUTRAL] || 0, color: SENTIMENT_COLORS[Sentiment.NEUTRAL] },
    { name: t.negative, value: summary.sentimentCounts[Sentiment.NEGATIVE] || 0, color: SENTIMENT_COLORS[Sentiment.NEGATIVE] },
  ].filter(d => d.value > 0);

  const categoryData = Object.entries(summary.categoryCounts).map(([name, value]) => ({
    name,
    value
  }));

  // Format daily trend data
  const dailyTrendData = summary.dailyTrendData.map(d => ({
    date: d.date.slice(5), // MM-DD format
    fullDate: d.date,
    count: d.count,
    isPeak: d.isPeak
  }));

  const peakDay = dailyTrendData.find(d => d.isPeak) || null;

  // Format ad trend data
  const adTrendData = summary.adTrendData.map(d => ({
    date: d.date.slice(5), // MM-DD format
    fullDate: d.date,
    count: d.count
  }));

  // Format issue type trend data - sum all types into total count
  const issueTypeWeekData = summary.issueTypeWeekData.map(d => ({
    period: d.period.slice(5), // Remove year prefix
    fullPeriod: d.period,
    count: d.ad + d.review + d.chat + d.crash + d.other,
  }));

  const issueTypeMonthData = summary.issueTypeMonthData.map(d => ({
    period: d.period.slice(5), // Remove year prefix
    fullPeriod: d.period,
    count: d.ad + d.review + d.chat + d.crash + d.other,
  }));

  return (
    <div className="space-y-6 fade-enter-active">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric Cards */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">{t.totalFeedback}</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-1">{summary.totalFeedback}</h3>
          </div>
          <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
            <MessageCircle size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">{t.avgRating}</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-1">{summary.avgRating}</h3>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
            <Star size={24} fill="currentColor" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">{t.npsScore}</p>
            <h3 className={`text-3xl font-bold mt-1 ${summary.npsScore >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {summary.npsScore > 0 ? '+' : ''}{summary.npsScore}
            </h3>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${summary.npsScore >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            <Users size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">{t.recentFeedback}</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-1">{summary.recentFeedback.length}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
            <TrendingUp size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Charts */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6">{t.categoryBreakdown}</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6">{t.sentimentOverview}</h3>
          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-[-20px]">
            {sentimentData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-slate-600 font-medium">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ad Tag Feedback Trend Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-900 mb-6">{t.adTagTrend}</h3>
        <div className="h-72 w-full">
          {adTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={adTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    backgroundColor: '#fff'
                  }}
                  formatter={(value: number) => [value, t.feedbackCount]}
                  labelFormatter={(label) => label}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              <p>{t.noFeedbackFound}</p>
            </div>
          )}
        </div>
      </div>

      {/* Daily Feedback Trend Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900">{t.dailyFeedbackTrend}</h3>
          {peakDay && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 rounded-lg border border-rose-100">
              <div className="w-2 h-2 rounded-full bg-rose-500"></div>
              <span className="text-sm text-rose-700 font-medium">
                {t.peakDay}: {peakDay.date} ({peakDay.count})
              </span>
            </div>
          )}
        </div>
        <div className="h-72 w-full">
          {dailyTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyTrendData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    backgroundColor: '#fff'
                  }}
                  formatter={(value: number) => [value, t.feedbackCount]}
                  labelFormatter={(label) => label}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: '#64748b', fontSize: 12 }}>
                  {dailyTrendData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isPeak ? '#f43f5e' : '#6366f1'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              <p>{t.noFeedbackFound}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tag Cloud */}
      {summary.tagCloud && summary.tagCloud.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6">{t.tagCloud}</h3>
          <TagCloud
            tags={summary.tagCloud}
            onTagClick={onTagClick}
            maxTags={30}
          />
        </div>
      )}

      {/* Issue Type Feedback Trend Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900">{t.issueTypeTrend}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIssueTypeTimeRange('week')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                issueTypeTimeRange === 'week'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.byWeek}
            </button>
            <button
              onClick={() => setIssueTypeTimeRange('month')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                issueTypeTimeRange === 'month'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.byMonth}
            </button>
          </div>
        </div>
        <div className="h-72 w-full">
          {(issueTypeTimeRange === 'week' ? issueTypeWeekData : issueTypeMonthData).length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={issueTypeTimeRange === 'week' ? issueTypeWeekData : issueTypeMonthData}
                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="period"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    backgroundColor: '#fff'
                  }}
                  formatter={(value: number) => [value, t.feedbackCount]}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              <p>{t.noFeedbackFound}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
