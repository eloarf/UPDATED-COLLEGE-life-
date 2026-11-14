import React, { useState, useMemo } from 'react';
import { useUiStore } from '../../store/uiStore';
import {
  Home,
  Calendar,
  BookOpen,
  CheckSquare,
  ShieldAlert,
  Layers,
  Clock,
  Activity,
  Feather,
  LayoutGrid,
  CalendarDays,
  GraduationCap,
  CreditCard,
  Music,
  Bookmark,
  Award,
  RefreshCw,
  Palette,
  Settings,
  Sparkles,
  Search,
  X,
  Target,
  Bell,
  HeartPulse,
} from 'lucide-react';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface ChamberItem {
  name: string;
  subtitle: string;
  route: string;
  icon: any;
  category: 'Academics' | 'Life' | 'Creative' | 'Settings';
}

export const MoreSheet: React.FC = () => {
  const { isMoreSheetOpen, setMoreSheetOpen, setCurrentRoute, currentRoute } = useUiStore();
  const [search, setSearch] = useState('');
  const [recentRoutes, setRecentRoutes] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('college_os_recent_chambers');
      return raw ? JSON.parse(raw) : ['#/today', '#/courses', '#/tasks', '#/habits'];
    } catch {
      return ['#/today', '#/courses', '#/tasks', '#/habits'];
    }
  });

  const chambers: ChamberItem[] = [
    // Academics
    { name: 'Class Timetable', subtitle: 'Weekly lecture schedule & room numbers', route: '#/timetable', icon: Calendar, category: 'Academics' },
    { name: 'Tasks & To-Dos', subtitle: 'Assignments, coursework & deadlines', route: '#/tasks', icon: CheckSquare, category: 'Academics' },
    { name: 'Courses & Syllabi', subtitle: 'Instructors, modules & lecture materials', route: '#/courses', icon: BookOpen, category: 'Academics' },
    { name: 'Semester Goals', subtitle: 'Roadmap objectives & milestone tracking', route: '#/goals', icon: Target, category: 'Academics' },
    { name: 'Exams & Deadlines', subtitle: 'Countdown timers & revision topics', route: '#/exams', icon: ShieldAlert, category: 'Academics' },
    { name: 'Flashcards', subtitle: 'Spaced-repetition decks & exam topic cards', route: '#/flashcards', icon: Layers, category: 'Academics' },
    { name: 'Grades & GPA', subtitle: 'CGPA calculator & target projections', route: '#/grades', icon: GraduationCap, category: 'Academics' },
    { name: 'Master Week', subtitle: 'Dorm vs home timeblock templates', route: '#/week', icon: LayoutGrid, category: 'Academics' },
    { name: 'Calendar', subtitle: 'Monthly academic timeline & deadlines', route: '#/calendar', icon: CalendarDays, category: 'Academics' },

    // Life
    { name: 'Day Timeline', subtitle: 'Vertical 06:00-23:00 timeline, plan & shutdown', route: '#/today', icon: Clock, category: 'Life' },
    { name: 'Today Overview', subtitle: 'Daily cockpit, classes & top priorities', route: '#/', icon: Home, category: 'Life' },
    { name: 'Habit Tracker', subtitle: 'Routines, consistency & streak counters', route: '#/habits', icon: Activity, category: 'Life' },
    { name: 'Private Journal', subtitle: 'Reflections, prompt deck & daily notes', route: '#/journal', icon: Feather, category: 'Life' },
    { name: 'Wellbeing Insights', subtitle: 'Mood, energy, stress & habit analytics', route: '#/wellbeing', icon: HeartPulse, category: 'Life' },
    { name: 'Finance & Budget', subtitle: 'Expense tracking & savings vault', route: '#/finance', icon: CreditCard, category: 'Life' },
    { name: 'Weekly Rituals', subtitle: 'Sunday review & weekly planning', route: '#/rituals', icon: RefreshCw, category: 'Life' },

    // Creative
    { name: 'Focus Timer', subtitle: 'Pomodoro timer & flow session tracker', route: '#/focus', icon: Clock, category: 'Creative' },
    { name: 'Creative Studio', subtitle: 'Writing, audio & creative ideas', route: '#/studio', icon: Music, category: 'Creative' },
    { name: 'Projects', subtitle: 'Team & personal milestones with kanban', route: '#/projects', icon: Layers, category: 'Creative' },
    { name: 'Reading Library', subtitle: 'Book queue & study topics', route: '#/library', icon: Bookmark, category: 'Creative' },

    // Settings
    { name: 'Notification Center', subtitle: 'Due reminders, deadlines & overdue tasks', route: '#/notifications', icon: Bell, category: 'Settings' },
    { name: 'Reminder Settings', subtitle: 'Quiet hours, lead times & alert categories', route: '#/notification-settings', icon: Clock, category: 'Settings' },
    { name: 'Visual Themes', subtitle: '27 distinctive crafted color palettes', route: '#/themes', icon: Palette, category: 'Settings' },
    { name: 'Life Analytics', subtitle: 'Study hours & completion statistics', route: '#/statistics', icon: Sparkles, category: 'Settings' },
    { name: 'XP & Progression', subtitle: 'Gamified ranks & achievement ledger', route: '#/levels', icon: Award, category: 'Settings' },
    { name: 'Settings & Storage', subtitle: 'Data backup, offline health & setup', route: '#/settings', icon: Settings, category: 'Settings' },
  ];

  const handleNavigate = (route: string) => {
    const updated = [route, ...recentRoutes.filter((r) => r !== route)].slice(0, 4);
    setRecentRoutes(updated);
    try {
      localStorage.setItem('college_os_recent_chambers', JSON.stringify(updated));
    } catch {}
    setCurrentRoute(route);
    setMoreSheetOpen(false);
  };

  const filteredChambers = useMemo(() => {
    if (!search.trim()) return chambers;
    const q = search.toLowerCase();
    return chambers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.subtitle.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }, [search, chambers]);

  if (!isMoreSheetOpen) return null;

  const categories: { key: ChamberItem['category']; label: string }[] = [
    { key: 'Academics', label: 'Academics' },
    { key: 'Life', label: 'Life' },
    { key: 'Creative', label: 'Creative' },
    { key: 'Settings', label: 'Settings' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-xs transition-opacity animate-pop">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={() => setMoreSheetOpen(false)} />

      {/* Sheet Content */}
      <div className="relative w-full max-h-[90vh] bg-[rgb(var(--c-surface))] border-t-2 border-[rgb(var(--c-border))] rounded-t-3xl p-5 sm:p-7 shadow-2xl flex flex-col overflow-hidden max-w-[1040px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
          <div>
            <div className="text-[10px] font-heading tracking-widest text-[rgb(var(--c-primary))] font-bold uppercase">
              Application Directory
            </div>
            <h2 className="text-xl font-heading text-[rgb(var(--c-text))] font-bold">
              All Sections &amp; Tools
            </h2>
          </div>
          <button
            onClick={() => setMoreSheetOpen(false)}
            className="p-2 rounded-full hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] active:scale-95 transition"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Filter Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-[rgb(var(--c-muted))] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search all 20 tools &amp; pages..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary))]"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
            >
              Clear
            </button>
          )}
        </div>

        {/* Categorized List */}
        <div className="overflow-y-auto py-2 space-y-5 pr-1">
          {/* Recently Used Row (if not searching) */}
          {!search && recentRoutes.length > 0 && (
            <div className="space-y-2 pb-2 border-b border-[rgb(var(--c-border))]">
              <div className="text-[10px] font-heading uppercase font-bold tracking-widest text-[rgb(var(--c-primary))] flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                <span>Recently Used</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {recentRoutes.map((r) => {
                  const item = chambers.find((c) => c.route === r);
                  if (!item) return null;
                  const Icon = item.icon;
                  return (
                    <button
                      key={`recent-${item.route}`}
                      onClick={() => handleNavigate(item.route)}
                      className="flex items-center gap-2 p-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] hover:border-[rgb(var(--c-primary))] transition active:scale-95 text-left"
                    >
                      <div className="p-1 rounded-lg bg-[rgb(var(--c-surface))] text-[rgb(var(--c-primary))] shrink-0">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))] truncate">
                        {item.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {categories.map((cat) => {
            const items = filteredChambers.filter((c) => c.category === cat.key);
            if (items.length === 0) return null;
            return (
              <div key={cat.key} className="space-y-2">
                <div className="text-[10px] font-heading uppercase font-bold tracking-widest text-[rgb(var(--c-muted))]">
                  {cat.label} ({items.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isSelected =
                      currentRoute === item.route ||
                      (item.route === '#/finance' && currentRoute === '#/wallet');
                    return (
                      <button
                        key={item.route}
                        onClick={() => handleNavigate(item.route)}
                        className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all active:scale-98 cursor-pointer ${
                          isSelected
                            ? 'border-[rgb(var(--c-primary))] bg-[rgb(var(--c-surface2))] ring-1 ring-[rgb(var(--c-primary))] shadow-xs'
                            : 'border-[rgb(var(--c-border))] hover:border-[rgb(var(--c-primary))] bg-[rgb(var(--c-surface))]'
                        }`}
                      >
                        <div className="p-2 rounded-lg bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-primary))] shrink-0 mt-0.5">
                          <Icon className="w-4 h-4 stroke-[2]" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-heading text-xs font-bold text-[rgb(var(--c-text))] truncate">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-[rgb(var(--c-muted))] line-clamp-1 font-flourish mt-0.5">
                            {item.subtitle}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[rgb(var(--c-muted))] font-flourish border-t border-[rgb(var(--c-border))]">
          <div className="flex items-center gap-2">
            <span>Fast offline access • On-device IndexedDB</span>
            <span>•</span>
            <button
              onClick={() => {
                setCurrentRoute('#/settings');
                setMoreSheetOpen(false);
              }}
              className="font-heading font-semibold hover:text-[rgb(var(--c-primary))]"
            >
              Settings &amp; Backup
            </button>
          </div>
          <PWAInstallButton variant="subtle" />
        </div>
      </div>
    </div>
  );
};
