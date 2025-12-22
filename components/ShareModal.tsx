import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Loader2, AlertCircle, Check } from 'lucide-react';
import { FeedbackItem } from '../types';
import { feedbackApi, DateRange, FeishuStatus } from '../services/api';
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
  const [shareMessage, setShareMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [feishuStatus, setFeishuStatus] = useState<FeishuStatus | null>(null);

  // Check Feishu webhook configuration
  useEffect(() => {
    if (isOpen) {
      feedbackApi.getFeishuStatus()
        .then(status => setFeishuStatus(status))
        .catch(() => setFeishuStatus({ configured: false, webhookUrl: null }));
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShareMessage('');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  const handleSend = async () => {
    setIsSending(true);
    setError(null);

    try {
      const result = await feedbackApi.shareFeedback(
        feedback.id,
        shareMessage || undefined,
        dateRange
      );

      if (result.sent) {
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

  const isConfigured = feishuStatus?.configured ?? false;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
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
          {!isConfigured && (
            <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertCircle className="text-amber-500 flex-shrink-0" size={20} />
              <div>
                <p className="text-sm text-amber-700 font-medium">{t.feishuNotConfigured}</p>
                <p className="text-xs text-amber-600 mt-1">
                  {t.feishuWebhookHint || '请在服务端配置 FEISHU_WEBHOOK_URL 环境变量'}
                </p>
              </div>
            </div>
          )}

          {/* Feedback Preview */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <img
                src={feedback.userAvatar}
                alt={feedback.userName}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <p className="font-medium text-slate-800">{feedback.userName}</p>
                <p className="text-xs text-slate-500">{new Date(feedback.date).toLocaleDateString()}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 line-clamp-3">{feedback.content}</p>
            {feedback.tags && feedback.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {feedback.tags.slice(0, 5).map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

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
              disabled={!isConfigured}
            />
          </div>

          {/* Info about webhook destination */}
          {isConfigured && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <Send className="text-blue-500 flex-shrink-0 mt-0.5" size={16} />
              <p className="text-xs text-blue-700">
                {t.webhookDestinationHint || '消息将发送到配置的飞书群或用户'}
              </p>
            </div>
          )}

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
            disabled={isSending || !isConfigured || success}
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

  // Use portal to render modal at document body level
  return createPortal(modalContent, document.body);
};
