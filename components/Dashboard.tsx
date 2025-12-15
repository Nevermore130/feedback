import React, { useMemo } from 'react';
import { FeedbackItem, Sentiment, Category } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, MessageCircle, Star } from 'lucide-react';

interface DashboardProps {
  feedback: FeedbackItem[];
}

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#64748b'];
const SENTIMENT_COLORS = {
  [Sentiment.POSITIVE]: '#10b981',
  [Sentiment.NEUTRAL]: '#94a3b8',
  [Sentiment.NEGATIVE]: '#f43f5e',
  [Sentiment.PENDING]: '#cbd5e1'
};

export const Dashboard: React.FC<DashboardProps> = ({ feedback }) => {
  
  const stats = useMemo(() => {
    const total = feedback.length;
    const avgRating = total > 0 ? (feedback.reduce((acc, curr) => acc + curr.rating, 0) / total).toFixed(1) : '0.0';
    
    // Calculate Sentiment Distribution
    const sentimentCounts = feedback.reduce((acc, curr) => {
      acc[curr.sentiment] = (acc[curr.sentiment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sentimentData = [
      { name: 'Positive', value: sentimentCounts[Sentiment.POSITIVE] || 0, color: SENTIMENT_COLORS[Sentiment.POSITIVE] },
      { name: 'Neutral', value: sentimentCounts[Sentiment.NEUTRAL] || 0, color: SENTIMENT_COLORS[Sentiment.NEUTRAL] },
      { name: 'Negative', value: sentimentCounts[Sentiment.NEGATIVE] || 0, color: SENTIMENT_COLORS[Sentiment.NEGATIVE] },
    ].filter(d => d.value > 0);

    // Calculate Category Distribution
    const categoryCounts = feedback.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryData = Object.keys(categoryCounts).map(key => ({
      name: key,
      value: categoryCounts[key]
    }));

    // Calculate NPS (Simplified: %Promoters(5) - %Detractors(1-3)) * 100
    const promoters = feedback.filter(f => f.rating === 5).length;
    const detractors = feedback.filter(f => f.rating <= 3).length;
    const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

    return { total, avgRating, nps, sentimentData, categoryData };
  }, [feedback]);

  return (
    <div className="space-y-6 fade-enter-active">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric Cards */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">Total Feedback</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.total}</h3>
          </div>
          <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
            <MessageCircle size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">Avg. Rating</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.avgRating}</h3>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
            <Star size={24} fill="currentColor" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">NPS Score</p>
            <h3 className={`text-3xl font-bold mt-1 ${stats.nps >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {stats.nps > 0 ? '+' : ''}{stats.nps}
            </h3>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stats.nps >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            <Users size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">Response Rate</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-1">94%</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
            <TrendingUp size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Charts */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Feedback by Category</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {stats.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Sentiment Analysis</h3>
          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.sentimentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-[-20px]">
            {stats.sentimentData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-slate-600 font-medium">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
