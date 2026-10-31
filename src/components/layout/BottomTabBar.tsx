import React from 'react';
import { useUiStore } from '../../store/uiStore';
import { Home, Calendar, CheckSquare, Feather, Menu } from 'lucide-react';

export const BottomTabBar: React.FC = () => {
  const { currentRoute, setCurrentRoute, isMoreSheetOpen, setMoreSheetOpen } = useUiStore();

  const navItems = [
    { label: 'Today', route: '#/', icon: Home },
    { label: 'Timetable', route: '#/timetable', icon: Calendar },
    { label: 'Tasks', route: '#/tasks', icon: CheckSquare },
    { label: 'Journal', route: '#/journal', icon: Feather },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-[rgb(var(--c-surface))] border-t border-[rgb(var(--c-border))] px-3 py-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] transition-colors shadow-lg">
      <div className="max-w-[520px] mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.route && !isMoreSheetOpen;
          return (
            <button
              key={item.route}
              onClick={() => {
                if (isMoreSheetOpen) setMoreSheetOpen(false);
                setCurrentRoute(item.route);
              }}
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2.5 rounded-xl transition-all active:scale-95 touch-manipulation ${
                isActive
                  ? 'text-[rgb(var(--c-primary))] font-bold'
                  : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-colors ${
                  isActive ? 'bg-[rgb(var(--c-surface2))] shadow-xs' : ''
                }`}
              >
                <Icon className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight font-heading">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* More / Menu Tab */}
        <button
          onClick={() => setMoreSheetOpen(!isMoreSheetOpen)}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2.5 rounded-xl transition-all active:scale-95 touch-manipulation ${
            isMoreSheetOpen
              ? 'text-[rgb(var(--c-primary))] font-bold'
              : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
          }`}
          title="All chambers and features"
        >
          <div
            className={`p-1.5 rounded-xl transition-colors ${
              isMoreSheetOpen ? 'bg-[rgb(var(--c-surface2))] shadow-xs' : ''
            }`}
          >
            <Menu className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight font-heading">
            Menu
          </span>
        </button>
      </div>
    </nav>
  );
};
