import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { FeedbackList } from './components/FeedbackList';
import { MOCK_FEEDBACK } from './constants';
import { FeedbackItem } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'feedback' | 'settings'>('dashboard');
  const [feedbackData, setFeedbackData] = useState<FeedbackItem[]>(MOCK_FEEDBACK);
  const [isVisible, setIsVisible] = useState(false);

  // Trigger initial fade in
  useEffect(() => {
    setIsVisible(true);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard feedback={feedbackData} />;
      case 'feedback':
        return <FeedbackList feedback={feedbackData} setFeedback={setFeedbackData} />;
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
