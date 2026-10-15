import React, { useEffect, useState } from 'react';
import { useUiStore } from '../../store/uiStore';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { calculateLevelFromTotalXp } from '../../services/rpgService';
import { getEthiopicDateString, getTimeGreeting } from '../../utils/dateUtils';
import { Plus, Search, Palette, Bell, Sparkles } from 'lucide-react';

export const TopBar: React.FC = () => {
  const { setCurrentRoute, setQuickAddOpen, setSearchOpen, setThemeSwitcherOpen, showToast } = useUiStore();
  const settings = useLiveQuery(() => db.settings.get('current_user'));
  const xpEvents = useLiveQuery(() => db.xpEvents.toArray());

  const totalXp = (xpEvents || []).reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const heroInfo = calculateLevelFromTotalXp(totalXp);
  const userName = settings?.userName || 'Scholar';

  const [greeting, setGreeting] = useState('');
  const [ethiopicDate, setEthiopicDate] = useState('');

  useEffect(() => {
    setGreeting(getTimeGreeting(userName));
    setEthiopicDate(getEthiopicDateString());
  }, [userName]);

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
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick Add Button */}
          <button
            onClick={() => setQuickAddOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition"
            title="Quick Add Anything"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Quick Add</span>
          </button>

          {/* Search Button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-full text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))] active:scale-95 transition"
            title="Global Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Theme Quick Switcher */}
          <button
            onClick={() => setThemeSwitcherOpen(true)}
            className="p-2 rounded-full text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))] active:scale-95 transition"
            title="Change Theme Palette"
          >
            <Palette className="w-4 h-4" />
          </button>

          {/* Notifications / Backup status */}
          <button
            onClick={() => {
              showToast('Backup status: all data safely held in local IndexedDB.', 'info');
            }}
            className="p-2 rounded-full text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))] active:scale-95 transition relative"
            title="App Storage & Alerts"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[rgb(var(--c-accent2))]" />
          </button>
        </div>
      </div>
    </header>
  );
};
