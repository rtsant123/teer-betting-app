import React from 'react';
import toast from 'react-hot-toast';

// Custom hook for using translated messages
export const useMessages = () => {
  // Simple stub for translations
  const t = (key) => key.split('.').pop() || key;

  const showMessage = {
    success: (key, options = {}) => {
      const message = t(`messages.${key}`, options);
      toast.success(message, {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#10B981',
          color: '#fff',
          fontSize: '14px',
          borderRadius: '12px',
          padding: '12px 16px',
          maxWidth: '90vw',
        },
        iconTheme: {
          primary: '#fff',
          secondary: '#10B981',
        },
      });
    },

    error: (key, options = {}) => {
      const message = t(`messages.${key}`, options);
      toast.error(message, {
        duration: 4000,
        position: 'top-center',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontSize: '14px',
          borderRadius: '12px',
          padding: '12px 16px',
          maxWidth: '90vw',
        },
        iconTheme: {
          primary: '#fff',
          secondary: '#EF4444',
        },
      });
    },

    info: (key, options = {}) => {
      const message = t(`messages.${key}`, options);
      toast(message, {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#3B82F6',
          color: '#fff',
          fontSize: '14px',
          borderRadius: '12px',
          padding: '12px 16px',
          maxWidth: '90vw',
        },
        iconTheme: {
          primary: '#fff',
          secondary: '#3B82F6',
        },
      });
    },

    warning: (key, options = {}) => {
      const message = t(`messages.${key}`, options);
      toast(message, {
        duration: 3500,
        position: 'top-center',
        style: {
          background: '#F59E0B',
          color: '#fff',
          fontSize: '14px',
          borderRadius: '12px',
          padding: '12px 16px',
          maxWidth: '90vw',
        },
        iconTheme: {
          primary: '#fff',
          secondary: '#F59E0B',
        },
      });
    },

    loading: (key, options = {}) => {
      const message = t(`messages.${key}`, options);
      return toast.loading(message, {
        position: 'top-center',
        style: {
          background: '#6B7280',
          color: '#fff',
          fontSize: '14px',
          borderRadius: '12px',
          padding: '12px 16px',
          maxWidth: '90vw',
        },
      });
    },
  };

  const confirmDialog = async (key, options = {}) => {
    const message = t(`messages.${key}`, options);
    return new Promise((resolve) => {
      const confirmToast = toast(
        (toastProps) => (
          <div className="flex flex-col gap-3 p-2">
            <p className="text-sm text-gray-800 text-center">{message}</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => {
                  toast.dismiss(confirmToast);
                  resolve(true);
                }}
                className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
              >
                {t('common.confirm')}
              </button>
              <button
                onClick={() => {
                  toast.dismiss(confirmToast);
                  resolve(false);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-400 transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ),
        {
          duration: 10000,
          position: 'top-center',
          style: {
            background: '#fff',
            color: '#333',
            fontSize: '14px',
            borderRadius: '12px',
            padding: '16px',
            maxWidth: '90vw',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          },
        }
      );
    });
  };

  return {
    showMessage,
    confirmDialog,
    t, // Export t function for direct access
  };
};

// Responsive feedback component for forms
export const FeedbackMessage = ({ type = 'info', messageKey, className = '', options = {} }) => {
  // Simple stub for translations
  const t = (key) => key.split('.').pop() || key;

  if (!messageKey) return null;

  const baseClasses = 'p-4 rounded-lg text-sm font-medium flex items-start gap-3 transition-all duration-300';
  const typeClasses = {
    success: 'bg-green-50 text-green-800 border border-green-200',
    error: 'bg-red-50 text-red-800 border border-red-200',
    warning: 'bg-yellow-50 text-yellow-800 border border-yellow-200',
    info: 'bg-blue-50 text-blue-800 border border-blue-200',
  };

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type]} ${className}`}>
      <span className="text-lg flex-shrink-0">{icons[type]}</span>
      <p className="flex-1 leading-relaxed">
        {t(`messages.${messageKey}`, options)}
      </p>
    </div>
  );
};

// Loading component with translation
export const LoadingMessage = ({ messageKey = 'loading', className = '' }) => {
  // Simple stub for translations
  const t = (key) => key.split('.').pop() || key;

  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
      <p className="text-gray-600 text-center">{t(`common.${messageKey}`)}</p>
    </div>
  );
};

export default useMessages;
