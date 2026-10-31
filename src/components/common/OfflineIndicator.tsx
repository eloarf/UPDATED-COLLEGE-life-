import React, { useState } from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { WifiOff, Wifi, X } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [dismissedOffline, setDismissedOffline] = useState(false);

  // If back online after being offline
  if (isOnline && wasOffline) {
    return (
      <aside
        aria-live="polite"
        className="fixed bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-heading font-bold shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200"
      >
        <Wifi className="w-3.5 h-3.5" />
        <span>Back Online · Changes synced locally</span>
      </aside>
    );
  }

  // If currently offline
  if (!isOnline && !dismissedOffline) {
    return (
      <aside
        aria-live="polite"
        className="fixed bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)] flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-stone-900/95 dark:bg-stone-950/95 text-stone-100 border border-amber-500/40 text-xs shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <WifiOff className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-heading font-bold text-amber-400 text-xs flex items-center gap-1.5">
              <span>Offline Mode Active</span>
            </div>
            <p className="text-[11px] text-stone-300 truncate">
              Full access. Adding &amp; editing saves locally to your device.
            </p>
          </div>
        </div>

        <button
          onClick={() => setDismissedOffline(true)}
          className="min-h-[36px] min-w-[36px] flex items-center justify-center text-stone-400 hover:text-stone-100 shrink-0"
          title="Dismiss notification"
          aria-label="Dismiss offline notification"
        >
          <X className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  return null;
};
