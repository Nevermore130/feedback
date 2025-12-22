import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { FeedbackList } from './components/FeedbackList';
import { useI18n, Language } from './i18n';
import { Globe } from 'lucide-react';

// Create a client with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

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

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'feedback' | 'settings'>('dashboard');
  const [isVisible, setIsVisible] = useState(false);
  const [currentDateRange, setCurrentDateRange] = useState(getDefaultDateRange());
  const [initialTag, setInitialTag] = useState<string | undefined>(undefined);
  const { language, setLanguage, t } = useI18n();

  // Handle tag click from Dashboard - navigate to feedback list with tag filter
  const handleTagClick = (tag: string) => {
    setInitialTag(tag);
    setActiveTab('feedback');
  };

  const handleDateRangeChange = (from: string, to: string) => {
    setCurrentDateRange({ from, to });
  };

  // Trigger initial fade in
  useEffect(() => {
    setIsVisible(true);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard dateRange={currentDateRange} onTagClick={handleTagClick} />;
      case 'feedback':
        return (
          <FeedbackList
            onDateRangeChange={handleDateRangeChange}
            currentDateRange={currentDateRange}
            initialTag={initialTag}
            onInitialTagConsumed={() => setInitialTag(undefined)}
          />
        );
      case 'settings':
        return (
          <div className="flex items-center justify-center h-96 bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="text-center text-slate-400">
              <p className="text-lg font-medium">{t.settingsPanel}</p>
              <p className="text-sm">{t.configurationOptions}</p>
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
              {activeTab === 'dashboard' ? t.overview : activeTab === 'feedback' ? t.feedbackAnalysis : t.settings}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {t.welcome}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm border border-slate-200">
              <Globe className="w-4 h-4 text-slate-500" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="bg-transparent text-sm text-slate-700 cursor-pointer focus:outline-none"
              >
                <option value="zh">中文</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">{t.adminUser}</p>
              <p className="text-xs text-slate-500">{t.productManager}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border-2 border-white shadow-md"></div>
          </div>
        </header>

        {renderContent()}
      </main>
    </div>
  );
};

// Wrapper component with QueryClientProvider
const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
};

export default App;
