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

interface NavSection {
  title: string;
  items: {
    label: string;
    route: string;
    icon: any;
    badge?: string;
  }[];
}

export const SideNavRail: React.FC = () => {
  const { currentRoute, setCurrentRoute } = useUiStore();

  const sections: NavSection[] = [
    {
      title: 'Daily Flow',
      items: [
        { label: 'Today', route: '#/', icon: Home },
        { label: 'Timetable', route: '#/timetable', icon: Calendar },
        { label: 'Tasks & To-Dos', route: '#/tasks', icon: CheckSquare },
        { label: 'Focus Timer', route: '#/focus', icon: Clock },
      ],
    },
    {
      title: 'Academics',
      items: [
        { label: 'Courses & Syllabi', route: '#/courses', icon: BookOpen },
        { label: 'Exams & Deadlines', route: '#/exams', icon: ShieldAlert },
        { label: 'Grades & GPA', route: '#/grades', icon: GraduationCap },
        { label: 'Master Week', route: '#/week', icon: LayoutGrid },
        { label: 'Calendar', route: '#/calendar', icon: CalendarDays },
      ],
    },
    {
      title: 'Personal & Growth',
      items: [
        { label: 'Habit Tracker', route: '#/habits', icon: Activity },
        { label: 'Journal', route: '#/journal', icon: Feather },
        { label: 'Projects', route: '#/projects', icon: Layers },
        { label: 'Finance & Savings', route: '#/finance', icon: CreditCard },
        { label: 'Reading Library', route: '#/library', icon: Bookmark },
        { label: 'Creative Studio', route: '#/studio', icon: Music },
        { label: 'Weekly Rituals', route: '#/rituals', icon: RefreshCw },
      ],
    },
    {
      title: 'System & Tools',
      items: [
        { label: 'Themes', route: '#/themes', icon: Palette },
        { label: 'Analytics & Stats', route: '#/statistics', icon: Sparkles },
        { label: 'XP & Levels', route: '#/levels', icon: Award },
        { label: 'Settings & Storage', route: '#/settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 bg-[rgb(var(--c-surface))] border-r border-[rgb(var(--c-border))] py-6 px-4 overflow-y-auto select-none">
      <div className="px-3 pb-5 mb-3 border-b border-[rgb(var(--c-border))]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] flex items-center justify-center font-heading font-black text-sm shadow-xs">
            OS
          </div>
          <div>
            <div className="text-xs uppercase font-heading tracking-wider text-[rgb(var(--c-text))] font-bold">
              College Life OS
            </div>
            <div className="text-[11px] font-flourish text-[rgb(var(--c-muted))]">
              Personal Academic Suite
            </div>
          </div>
        </div>
      </div>

      <nav className="space-y-6">
        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="px-3 text-[10px] uppercase font-heading tracking-widest font-bold text-[rgb(var(--c-muted))] mb-1.5">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                currentRoute === item.route ||
                (item.route === '#/finance' && currentRoute === '#/wallet');
              return (
                <button
                  key={item.route}
                  onClick={() => setCurrentRoute(item.route)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-heading font-semibold transition text-left cursor-pointer active:scale-98 ${
                    isActive
                      ? 'bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-primary))] shadow-xs font-bold'
                      : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))/0.5]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0 stroke-[2]" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
};
