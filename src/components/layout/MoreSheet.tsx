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
  X,
} from 'lucide-react';

interface DirectoryItem {
  name: string;
  subtitle: string;
  route: string;
  icon: any;
  accent: string;
}

export const MoreSheet: React.FC = () => {
  const { isMoreSheetOpen, setMoreSheetOpen, setCurrentRoute, currentRoute } = useUiStore();

  if (!isMoreSheetOpen) return null;

  const directory: DirectoryItem[] = [
    { name: 'Lobby', subtitle: 'The Grand Concierge Desk', route: '#/', icon: Home, accent: '#F6A8BE' },
    { name: 'Timetable', subtitle: 'Weekly Lecture Grid & Rooms', route: '#/timetable', icon: Calendar, accent: '#B6E63E' },
    { name: 'Courses', subtitle: 'Syllabi, Lecturers & Materials', route: '#/courses', icon: BookOpen, accent: '#8B5A3C' },
    { name: 'Quests', subtitle: 'Assignments & Task Stubs', route: '#/tasks', icon: CheckSquare, accent: '#7A2E4A' },
    { name: 'Exams', subtitle: 'Boss Battles & HP syllabus', route: '#/exams', icon: ShieldAlert, accent: '#5A3426' },
    { name: 'Projects', subtitle: 'Dungeon Milestones & Team', route: '#/projects', icon: Layers, accent: '#4FA3A5' },
    { name: 'Focus Timer', subtitle: 'Timestamped Flow Dial', route: '#/focus', icon: Clock, accent: '#B6E63E' },
    { name: 'Habits', subtitle: 'Passport Stamps & Streaks', route: '#/habits', icon: Activity, accent: '#8EC5E8' },
    { name: 'Journal', subtitle: 'Reflections & Daily Ink', route: '#/journal', icon: Feather, accent: '#F6A8BE' },
    { name: 'Master Week', subtitle: 'Dorm vs Home Timeblocks', route: '#/week', icon: LayoutGrid, accent: '#E8C9A0' },
    { name: 'Calendar', subtitle: '30-Day Grid & Ethiopic Dates', route: '#/calendar', icon: CalendarDays, accent: '#BBA6E0' },
    { name: 'Grades & GPA', subtitle: 'Target 3.85 & What-If Sandbox', route: '#/grades', icon: GraduationCap, accent: '#9B2D4F' },
    { name: 'Wallet', subtitle: 'ETB Cash & Envelope Budgets', route: '#/wallet', icon: CreditCard, accent: '#E5C04B' },
    { name: 'Studio', subtitle: 'Song/Beat & Writing Pipelines', route: '#/studio', icon: Music, accent: '#BBA6E0' },
    { name: 'Library', subtitle: 'Morning Brief & Reading Queue', route: '#/library', icon: Bookmark, accent: '#8FD3B6' },
    { name: 'Hero Sheet', subtitle: 'RPG Level, Stats & Badges', route: '#/hero', icon: Award, accent: '#B6E63E' },
    { name: 'Rituals', subtitle: 'Sunday Review & Reset Day', route: '#/rituals', icon: RefreshCw, accent: '#F5B58A' },
    { name: 'Themes', subtitle: 'Six Storybook Color Palettes', route: '#/themes', icon: Palette, accent: '#F6A8BE' },
    { name: 'Settings', subtitle: 'Sync, JSON Backup & Storage', route: '#/settings', icon: Settings, accent: '#7A5A66' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-pop">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={() => setMoreSheetOpen(false)} />

      {/* Sheet Content */}
      <div className="relative w-full max-h-[85vh] bg-[rgb(var(--c-surface))] border-t-2 border-[rgb(var(--c-border))] rounded-t-3xl p-4 sm:p-6 shadow-2xl flex flex-col overflow-hidden max-w-[960px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
          <div>
            <div className="text-[11px] font-heading tracking-widest text-[rgb(var(--c-primary))]">
              The Grand Budapest Directory
            </div>
            <h2 className="text-base sm:text-lg font-heading text-[rgb(var(--c-text))] font-bold">
              All Chambers & Suites
            </h2>
          </div>
          <button
            onClick={() => setMoreSheetOpen(false)}
            className="p-1.5 rounded-full hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] active:scale-95 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Directory Grid */}
        <div className="overflow-y-auto py-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {directory.map((item) => {
            const Icon = item.icon;
            const isSelected = currentRoute === item.route;
            return (
              <button
                key={item.route}
                onClick={() => {
                  setCurrentRoute(item.route);
                  setMoreSheetOpen(false);
                }}
                className={`flex items-start gap-2.5 p-3 rounded-2xl border text-left transition-all active:scale-98 ${
                  isSelected
                    ? 'border-[rgb(var(--c-primary))] bg-[rgb(var(--c-surface2))] shadow-xs'
                    : 'border-[rgb(var(--c-border))] hover:border-[rgb(var(--c-primary))] bg-[rgb(var(--c-surface))]'
                }`}
              >
                <div
                  className="p-2 rounded-xl text-white shadow-xs shrink-0"
                  style={{ backgroundColor: item.accent }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-heading text-xs font-bold text-[rgb(var(--c-text))] truncate">
                    {item.name}
                  </div>
                  <div className="text-[10px] text-[rgb(var(--c-muted))] truncate font-flourish">
                    {item.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="pt-2 text-center text-[10px] text-[rgb(var(--c-muted))] font-flourish border-t border-[rgb(var(--c-border))]">
          “Courtesy and formality will get you through any university term.”
        </div>
      </div>
    </div>
  );
};
