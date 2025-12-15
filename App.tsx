import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { FeedbackList } from './components/FeedbackList';
import { feedbackApi } from './services/api';
import { FeedbackItem } from './types';

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

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'feedback' | 'settings'>('dashboard');
  const [feedbackData, setFeedbackData] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [currentDateRange, setCurrentDateRange] = useState(getDefaultDateRange());

  // Fetch feedback data from API
  const fetchFeedback = async (from?: string, to?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const dateRange = from && to ? { from, to } : undefined;
      const data = await feedbackApi.getAll(dateRange);
      setFeedbackData(data);
      if (from && to) {
        setCurrentDateRange({ from, to });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feedback');
      console.error('Failed to fetch feedback:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const handleDateRangeChange = (from: string, to: string) => {
    fetchFeedback(from, to);
  };

  // Trigger initial fade in
  useEffect(() => {
    setIsVisible(true);
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-96 bg-white rounded-2xl">
          <div className="text-center text-slate-400">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm">Loading feedback data...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-96 bg-white rounded-2xl border border-dashed border-red-300">
          <div className="text-center text-red-500">
            <p className="text-lg font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard feedback={feedbackData} />;
      case 'feedback':
        return <FeedbackList feedback={feedbackData} setFeedback={setFeedbackData} onDateRangeChange={handleDateRangeChange} isLoading={isLoading} currentDateRange={currentDateRange} />;
      case 'settings':
        return (
          <div className="flex items-center justify-center h-96 bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="text-center text-slate-400">
              <p className="text-lg font-medium">Settings Panel</p>
              <p className="text-sm">Configuration options would go here.</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen bg-slate-50 flex font-sans text-slate-900 transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {activeTab === 'dashboard' ? 'Overview' : activeTab === 'feedback' ? 'Feedback Analysis' : 'Settings'}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Welcome back, Admin. Here's what's happening today.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">Admin User</p>
              <p className="text-xs text-slate-500">Product Manager</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border-2 border-white shadow-md"></div>
          </div>
        </header>

        {renderContent()}
      </main>
    </div>
  );
};

export default App;
