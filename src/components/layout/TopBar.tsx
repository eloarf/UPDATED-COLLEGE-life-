import React, { useEffect, useState } from 'react';
import { useUiStore } from '../../store/uiStore';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { getTotalXp } from '../../db/queries';
import { calculateLevelFromTotalXp } from '../../services/rpgService';
import { isNotificationVisibleInCenter } from '../../services/reminderEngine';
import { getEthiopicDateString, getTimeGreeting } from '../../utils/dateUtils';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { Plus, Search, Palette, Bell, Sparkles, WifiOff } from 'lucide-react';

export const TopBar: React.FC = () => {
  const { setCurrentRoute, setQuickAddOpen, setSearchOpen, setThemeSwitcherOpen, setNotificationsOpen } = useUiStore();
  const settings = useLiveQuery(() => db.settings.get('current_user'));
  const totalXp = useLiveQuery(() => getTotalXp()) ?? 0;
  const appNotifications = useLiveQuery(() => db.appNotifications.toArray(), []) || [];
  const heroInfo = calculateLevelFromTotalXp(totalXp);
  const userName = settings?.userName || 'Scholar';

  const unreadCount = appNotifications.filter(
    (n) => isNotificationVisibleInCenter(n) && !n.isRead
  ).length;

  const [greeting, setGreeting] = useState('');
  const [ethiopicDate, setEthiopicDate] = useState('');

  useEffect(() => {
    setGreeting(getTimeGreeting(userName));
    setEthiopicDate(getEthiopicDateString());
  }, [userName]);

  const { isOnline } = useOnlineStatus();

  return (
    <header className="sticky top-0 z-30 px-4 py-3 sm:px-8 bg-[rgb(var(--c-surface))] border-b border-[rgb(var(--c-border))] shadow-xs transition-colors">
      <div className="max-w-[1040px] mx-auto flex items-center justify-between gap-3">
        {/* Left: Brand & Hero Badge */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => setCurrentRoute('#/levels')}
            className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] hover:opacity-90 transition active:scale-95 group text-left cursor-pointer"
            title="Open XP & Levels Progression"
          >
            <div className="w-7 h-7 rounded-full bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] flex items-center justify-center font-heading text-xs font-bold shadow-xs">
              {heroInfo.level}
            </div>
            <div className="hidden xs:block leading-tight pr-1">
              <div className="text-[10px] uppercase font-bold tracking-wider text-[rgb(var(--c-primary))] flex items-center gap-1">
                <span>Lv.{heroInfo.level}</span>
                <span className="font-normal text-[rgb(var(--c-muted))] truncate max-w-[80px]">
                  {heroInfo.title}
                </span>
              </div>
              <div className="w-16 h-1 bg-[rgb(var(--c-border))] rounded-full overflow-hidden mt-0.5">
                <div
                  className="h-full bg-[rgb(var(--c-xp))] transition-all duration-300"
                  style={{ width: `${heroInfo.progressPercent}%` }}
                />
              </div>
            </div>
          </button>

          <div className="min-w-0 hidden sm:block">
            <h1 className="text-xs font-heading tracking-wide text-[rgb(var(--c-text))] truncate">
              {greeting}
            </h1>
            <div className="text-[10px] text-[rgb(var(--c-muted))] font-flourish truncate">
              {ethiopicDate}
            </div>
          </div>

          {!isOnline && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] font-heading font-bold"
              title="You are currently offline. Changes are saved locally on your device."
            >
              <WifiOff className="w-3 h-3 text-amber-500" />
              <span>Offline</span>
            </span>
          )}
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick Add Button */}
          <button
            onClick={() => setQuickAddOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition cursor-pointer"
            title="Quick Add Anything"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Quick Add</span>
          </button>

          {/* Search Button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-full text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))] active:scale-95 transition cursor-pointer"
            title="Global Search"
            aria-label="Global Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Theme Quick Switcher */}
          <button
            onClick={() => setThemeSwitcherOpen(true)}
            className="p-2 rounded-full text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))] active:scale-95 transition cursor-pointer"
            title="Change Theme Palette"
            aria-label="Change Theme Palette"
          >
            <Palette className="w-4 h-4" />
          </button>

          {/* Statistics & Wrapped Shortcut */}
          <button
            onClick={() => setCurrentRoute('#/statistics')}
            className="p-2 rounded-full text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))] active:scale-95 transition cursor-pointer"
            title="Open Personal Statistics & Analytics"
            aria-label="Open Personal Statistics"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
          </button>

          {/* Notification Center Bell */}
          <button
            type="button"
            onClick={() => setNotificationsOpen(true)}
            className="p-2 rounded-full text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))] active:scale-95 transition relative cursor-pointer"
            title={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
            aria-label={unreadCount > 0 ? `Open Notifications (${unreadCount} unread)` : 'Open Notifications'}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] text-[9px] font-mono font-bold tabular-nums flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
