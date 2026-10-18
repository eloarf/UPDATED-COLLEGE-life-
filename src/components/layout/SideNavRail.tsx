import React from 'react';
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
} from 'lucide-react';

export const SideNavRail: React.FC = () => {
  const { currentRoute, setCurrentRoute } = useUiStore();

  const links = [
    { label: 'Lobby', route: '#/', icon: Home },
    { label: 'Timetable', route: '#/timetable', icon: Calendar },
    { label: 'Courses', route: '#/courses', icon: BookOpen },
    { label: 'Quests', route: '#/tasks', icon: CheckSquare },
    { label: 'Exams', route: '#/exams', icon: ShieldAlert },
    { label: 'Projects', route: '#/projects', icon: Layers },
    { label: 'Focus', route: '#/focus', icon: Clock },
    { label: 'Habits', route: '#/habits', icon: Activity },
    { label: 'Journal', route: '#/journal', icon: Feather },
    { label: 'Master Week', route: '#/week', icon: LayoutGrid },
    { label: 'Calendar', route: '#/calendar', icon: CalendarDays },
    { label: 'Grades & GPA', route: '#/grades', icon: GraduationCap },
    { label: 'Finance & Savings', route: '#/finance', icon: CreditCard },
    { label: 'Studio', route: '#/studio', icon: Music },
    { label: 'Library', route: '#/library', icon: Bookmark },
    { label: 'XP & Levels', route: '#/levels', icon: Award },
    { label: 'Statistics & Wrapped', route: '#/statistics', icon: Sparkles },
    { label: 'Rituals', route: '#/rituals', icon: RefreshCw },
    { label: 'Themes', route: '#/themes', icon: Palette },
    { label: 'Settings', route: '#/settings', icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 bg-[rgb(var(--c-surface))] border-r border-[rgb(var(--c-border))] py-6 px-4 overflow-y-auto">
      <div className="px-3 pb-5 mb-4 border-b border-[rgb(var(--c-border))]">
        <div className="text-[11px] uppercase font-heading tracking-widest text-[rgb(var(--c-primary))] font-bold">
          College Life OS
        </div>
        <div className="text-xs font-flourish text-[rgb(var(--c-muted))] mt-1">
          University Concierge
        </div>
      </div>

      <nav className="space-y-1.5">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = currentRoute === link.route || (link.route === '#/finance' && currentRoute === '#/wallet');
          return (
            <button
              key={link.route}
              onClick={() => setCurrentRoute(link.route)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-heading font-semibold transition text-left ${
                isActive
                  ? 'bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-primary))] shadow-xs font-bold'
                  : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))/0.4]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{link.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
