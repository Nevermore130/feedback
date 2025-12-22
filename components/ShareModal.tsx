import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, Send, User, Check, Loader2, AlertCircle } from 'lucide-react';
import { FeedbackItem } from '../types';
import { feedbackApi, FeishuUser, DateRange } from '../services/api';
import { useI18n } from '../i18n';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedback: FeedbackItem;
  dateRange?: DateRange;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  feedback,
  dateRange,
}) => {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<FeishuUser[]>([]);
  const [recentContacts, setRecentContacts] = useState<FeishuUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<FeishuUser[]>([]);
  const [shareMessage, setShareMessage] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [feishuConfigured, setFeishuConfigured] = useState<boolean | null>(null);

  // Check Feishu configuration status
  useEffect(() => {
    if (isOpen) {
      feedbackApi.getFeishuStatus()
        .then(status => setFeishuConfigured(status.configured))
        .catch(() => setFeishuConfigured(false));
    }
  }, [isOpen]);

  // Load recent contacts when modal opens
  useEffect(() => {
    if (isOpen && feishuConfigured) {
      setIsLoadingContacts(true);
      feedbackApi.getRecentFeishuContacts()
        .then(users => setRecentContacts(users))
        .catch(err => console.error('Failed to load contacts:', err))
        .finally(() => setIsLoadingContacts(false));
    }
  }, [isOpen, feishuConfigured]);

  // Search users with debounce
  useEffect(() => {
    if (!searchTerm.trim() || !feishuConfigured) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const users = await feedbackApi.searchFeishuUsers(searchTerm);
        setSearchResults(users);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, feishuConfigured]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSearchResults([]);
      setSelectedUsers([]);
      setShareMessage('');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  const toggleUser = useCallback((user: FeishuUser) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.open_id === user.open_id);
      if (isSelected) {
        return prev.filter(u => u.open_id !== user.open_id);
      } else {
        return [...prev, user];
      }
    });
  }, []);

  const handleSend = async () => {
    if (selectedUsers.length === 0) {
      setError(t.noUsersSelected);
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const result = await feedbackApi.shareFeedback(
        feedback.id,
        selectedUsers.map(u => u.open_id),
        shareMessage || undefined,
        dateRange
      );

      if (result.sent > 0) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(t.shareFailed);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.shareFailed);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  const displayUsers = searchTerm.trim() ? searchResults : recentContacts;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">{t.shareToFeishu}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Feishu not configured warning */}
          {feishuConfigured === false && (
            <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertCircle className="text-amber-500 flex-shrink-0" size={20} />
              <p className="text-sm text-amber-700">{t.feishuNotConfigured}</p>
            </div>
          )}

          {/* Feedback Preview */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <img
                src={feedback.userAvatar}
                alt={feedback.userName}
                className="w-8 h-8 rounded-full object-cover"
              />
              <div>
                <p className="font-medium text-slate-800 text-sm">{feedback.userName}</p>
                <p className="text-xs text-slate-500">{new Date(feedback.date).toLocaleDateString()}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 line-clamp-2">{feedback.content}</p>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={t.searchUserPlaceholder}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={!feishuConfigured}
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" size={18} />
            )}
          </div>

          {/* User List */}
          <div>
            <h3 className="text-sm font-medium text-slate-500 mb-2">
              {searchTerm.trim() ? t.searchUser : t.recentContacts}
            </h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {isLoadingContacts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-slate-400" size={24} />
                </div>
              ) : displayUsers.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">
                  {searchTerm.trim() ? 'No users found' : 'No recent contacts'}
                </p>
              ) : (
                displayUsers.map((user) => {
                  const isSelected = selectedUsers.some(u => u.open_id === user.open_id);
                  return (
                    <button
                      key={user.open_id}
                      onClick={() => toggleUser(user)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                        isSelected
                          ? 'bg-indigo-50 border border-indigo-200'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.name}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center">
                          <User size={18} className="text-slate-500" />
                        </div>
                      )}
                      <div className="flex-1 text-left">
                        <p className="font-medium text-slate-800 text-sm">{user.name}</p>
                        {user.department && (
                          <p className="text-xs text-slate-500">{user.department}</p>
                        )}
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-2">
                {t.selectedUsers} ({selectedUsers.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <span
                    key={user.open_id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                  >
                    {user.name}
                    <button
                      onClick={() => toggleUser(user)}
                      className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Share Message */}
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-2">
              {t.shareMessage}
            </label>
            <textarea
              placeholder={t.shareMessagePlaceholder}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
              rows={3}
              value={shareMessage}
              onChange={(e) => setShareMessage(e.target.value)}
              disabled={!feishuConfigured}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertCircle className="text-rose-500 flex-shrink-0" size={18} />
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <Check className="text-emerald-500 flex-shrink-0" size={18} />
              <p className="text-sm text-emerald-700">{t.shareSuccess}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors font-medium"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || selectedUsers.length === 0 || !feishuConfigured || success}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {t.sending}
              </>
            ) : (
              <>
                <Send size={18} />
                {t.send}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
