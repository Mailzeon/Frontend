'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

const toastListeners: Set<(toasts: ToastItem[]) => void> = new Set();
let toastItems: ToastItem[] = [];

const notify = (listeners: Set<(t: ToastItem[]) => void>, items: ToastItem[]) => {
  listeners.forEach(fn => fn([...items]));
};

export const toast = {
  success: (message: string) => {
    const id = Math.random().toString(36).slice(2);
    toastItems = [...toastItems, { id, message, type: 'success' }];
    notify(toastListeners, toastItems);
    setTimeout(() => { toastItems = toastItems.filter(t => t.id !== id); notify(toastListeners, toastItems); }, 4000);
  },
  error: (message: string) => {
    const id = Math.random().toString(36).slice(2);
    toastItems = [...toastItems, { id, message, type: 'error' }];
    notify(toastListeners, toastItems);
    setTimeout(() => { toastItems = toastItems.filter(t => t.id !== id); notify(toastListeners, toastItems); }, 5000);
  },
  info: (message: string) => {
    const id = Math.random().toString(36).slice(2);
    toastItems = [...toastItems, { id, message, type: 'info' }];
    notify(toastListeners, toastItems);
    setTimeout(() => { toastItems = toastItems.filter(t => t.id !== id); notify(toastListeners, toastItems); }, 4000);
  },
};

export function Toaster() {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  React.useEffect(() => {
    toastListeners.add(setToasts);
    return () => { toastListeners.delete(setToasts); };
  }, []);

  const icons = { success: <CheckCircle className="w-4 h-4 text-green-400 shrink-0"/>, error: <AlertCircle className="w-4 h-4 text-red-400 shrink-0"/>, info: <Info className="w-4 h-4 text-blue-400 shrink-0"/> };
  const colors = { success: 'border-green-500/20', error: 'border-red-500/20', info: 'border-blue-500/20' };

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map(t => (
        <div key={t.id} className={cn('flex items-start gap-3 p-4 rounded-xl bg-[#1F2937] border shadow-card-lg animate-slide-in', colors[t.type])}>
          {icons[t.type]}
          <p className="text-sm text-gray-200 flex-1">{t.message}</p>
          <button onClick={() => setToasts(p => p.filter(x => x.id !== t.id))} className="text-gray-500 hover:text-white">
            <X className="w-4 h-4"/>
          </button>
        </div>
      ))}
    </div>
  );
}
