'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type AlertType = 'success' | 'error' | 'warning' | 'info';

type Alert = {
  id: number;
  type: AlertType;
  title: string;
  message?: string;
};

type ConfirmDialog = {
  title: string;
  message: string;
  confirmText?: string;
  confirmColor?: 'red' | 'blue' | 'green' | 'orange';
  onConfirm: () => void;
  onCancel: () => void;
};

type AlertContextType = {
  showAlert: (type: AlertType, title: string, message?: string) => void;
  showConfirm: (title: string, message: string) => Promise<boolean>;
};

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);

  const showAlert = (type: AlertType, title: string, message?: string) => {
    const id = Date.now();
    setAlerts((prev) => [...prev, { id, type, title, message }]);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setAlerts((prev) => prev.filter((alert) => alert.id !== id));
    }, 5000);
  };

  const showConfirm = (
    title: string, 
    message: string, 
    confirmText: string = 'Confirm',
    confirmColor: 'red' | 'blue' | 'green' | 'orange' = 'blue'
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmDialog({
        title,
        message,
        confirmText,
        confirmColor,
        onConfirm: () => {
          setConfirmDialog(null);
          resolve(true);
        },
        onCancel: () => {
          setConfirmDialog(null);
          resolve(false);
        },
      });
    });
  };

  const removeAlert = (id: number) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  const getAlertStyles = (type: AlertType) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-500',
          icon: 'text-green-600',
          title: 'text-green-900',
          message: 'text-green-700',
          Icon: CheckCircle,
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-500',
          icon: 'text-red-600',
          title: 'text-red-900',
          message: 'text-red-700',
          Icon: XCircle,
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-500',
          icon: 'text-yellow-600',
          title: 'text-yellow-900',
          message: 'text-yellow-700',
          Icon: AlertTriangle,
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-500',
          icon: 'text-blue-600',
          title: 'text-blue-900',
          message: 'text-blue-700',
          Icon: Info,
        };
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      
      {/* Alert Container */}
      <div className="fixed top-4 right-4 z-[9999] space-y-3 pointer-events-none">
        {alerts.map((alert) => {
          const styles = getAlertStyles(alert.type);
          const Icon = styles.Icon;
          
          return (
            <div
              key={alert.id}
              className={`${styles.bg} ${styles.border} border-l-4 rounded-lg shadow-2xl p-4 min-w-[320px] max-w-md pointer-events-auto animate-slide-in-right`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`h-6 w-6 ${styles.icon} flex-shrink-0 mt-0.5`} />
                <div className="flex-1">
                  <h4 className={`font-semibold ${styles.title} text-sm`}>
                    {alert.title}
                  </h4>
                  {alert.message && (
                    <p className={`text-sm ${styles.message} mt-1`}>
                      {alert.message}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeAlert(alert.id)}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={confirmDialog.onCancel}
          />
          
          {/* Dialog */}
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full animate-scale-in">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 p-3 rounded-full bg-yellow-100">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {confirmDialog.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {confirmDialog.message}
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={confirmDialog.onCancel}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className={`flex-1 px-4 py-2.5 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all ${
                  confirmDialog.confirmColor === 'red' ? 'bg-gradient-to-r from-red-600 to-red-700' :
                  confirmDialog.confirmColor === 'green' ? 'bg-gradient-to-r from-green-600 to-green-700' :
                  confirmDialog.confirmColor === 'orange' ? 'bg-gradient-to-r from-orange-600 to-orange-700' :
                  'bg-gradient-to-r from-blue-600 to-blue-700'
                }`}
              >
                {confirmDialog.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
}
