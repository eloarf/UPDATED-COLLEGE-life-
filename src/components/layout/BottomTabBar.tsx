import React from 'react';
import { useUiStore } from '../../store/uiStore';
import { Home, Calendar, CheckSquare, Layers, Menu } from 'lucide-react';

export const BottomTabBar: React.FC = () => {
  const { currentRoute, setCurrentRoute, isMoreSheetOpen, setMoreSheetOpen } = useUiStore();

  const navItems = [
    { label: 'Lobby', route: '#/', icon: Home },
    { label: 'Timetable', route: '#/timetable', icon: Calendar },
    { label: 'Quests', route: '#/tasks', icon: CheckSquare },
    { label: 'Projects', route: '#/projects', icon: Layers },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-[rgb(var(--c-surface))] border-t border-[rgb(var(--c-border))] px-2 py-1.5 pb-safe transition-colors">
      <div className="max-w-[480px] mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.route && !isMoreSheetOpen;
          return (
            <button
              key={item.route}
              onClick={() => setCurrentRoute(item.route)}
              className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl transition-all active:scale-90 ${
                isActive
                  ? 'text-[rgb(var(--c-primary))] font-bold scale-105'
                  : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
              }`}
            >
              <div
                className={`p-1 rounded-lg ${
                  isActive ? 'bg-[rgb(var(--c-surface2))] shadow-xs' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-heading">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* More Tab */}
        <button
          onClick={() => setMoreSheetOpen(!isMoreSheetOpen)}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl transition-all active:scale-90 ${
            isMoreSheetOpen
              ? 'text-[rgb(var(--c-primary))] font-bold scale-105'
              : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
          }`}
        >
          <div
            className={`p-1 rounded-lg ${
              isMoreSheetOpen ? 'bg-[rgb(var(--c-surface2))] shadow-xs' : ''
            }`}
          >
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-heading">
            More
          </span>
        </button>
      </div>
    </nav>
  );
};
