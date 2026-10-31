import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Check, Share, X } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'primary' | 'subtle';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'primary',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed, show clean badge or suppress
  if (isInstalled) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-heading font-semibold">
        <Check className="w-3.5 h-3.5" />
        <span>Installed as App</span>
      </div>
    );
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`min-h-[44px] flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-heading font-bold shadow-xs transition active:scale-95 cursor-pointer ${
          variant === 'primary'
            ? 'bg-[#7A2E4A] text-white hover:opacity-90'
            : 'border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))] hover:border-[#7A2E4A]'
        } ${className}`}
      >
        <Download className="w-4 h-4" />
        <span>Install to Home Screen</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`min-h-[44px] flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-heading font-bold border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))] hover:border-[#7A2E4A] transition active:scale-95 cursor-pointer ${className}`}
        >
          <Share className="w-3.5 h-3.5 text-[#7A2E4A]" />
          <span>Add to Home Screen (iOS)</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] p-5 shadow-2xl text-[rgb(var(--c-text))] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
                <h3 className="text-sm font-heading font-bold">Install on iPhone / iPad</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="text-xs space-y-2 text-[rgb(var(--c-muted))] list-decimal list-inside">
                <li>Tap the <strong className="text-[rgb(var(--c-text))]">Share</strong> button in Safari's toolbar.</li>
                <li>Scroll down and tap <strong className="text-[rgb(var(--c-text))]">Add to Home Screen</strong>.</li>
                <li>Tap <strong className="text-[rgb(var(--c-text))]">Add</strong> in the top right corner.</li>
              </ol>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full min-h-[40px] rounded-xl bg-[#7A2E4A] text-white font-heading font-bold text-xs"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
