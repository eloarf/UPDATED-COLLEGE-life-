import React, { useEffect } from 'react';
import { useUiStore } from './store/uiStore';
import { initializeDatabase, db, saveEmergencyBackup } from './db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { applyTheme } from './theme/themeUtils';

// Layout
import { TopBar } from './components/layout/TopBar';
import { BottomTabBar } from './components/layout/BottomTabBar';
import { SideNavRail } from './components/layout/SideNavRail';
import { MoreSheet } from './components/layout/MoreSheet';

// Modals
import { QuickAddModal } from './components/common/QuickAddModal';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { ThemeSwitcherModal } from './components/common/ThemeSwitcherModal';
import { OnboardingModal } from './components/common/OnboardingModal';
import { ToastContainer } from './components/common/ToastContainer';
import { OfflineIndicator } from './components/common/OfflineIndicator';

// Pages
import { LobbyPage } from './pages/LobbyPage';
import { TimetablePage } from './pages/TimetablePage';
import { CoursesPage } from './pages/CoursesPage';
import { QuestsPage } from './pages/QuestsPage';
import { ExamsPage } from './pages/ExamsPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { FocusPage } from './pages/FocusPage';
import { HabitsPage } from './pages/HabitsPage';
import { JournalPage } from './pages/JournalPage';
import { MasterWeekPage } from './pages/MasterWeekPage';
import { CalendarPage } from './pages/CalendarPage';
import { GradesPage } from './pages/GradesPage';
import { FinancePage } from './pages/FinancePage';
import { StudioPage } from './pages/StudioPage';
import { LibraryPage } from './pages/LibraryPage';
import { LevelsPage } from './pages/LevelsPage';
import { RitualsPage } from './pages/RitualsPage';
import { ThemesPage } from './pages/ThemesPage';
import { SettingsPage } from './pages/SettingsPage';
import { StatisticsPage } from './pages/StatisticsPage';

export default function App() {
  const { currentRoute, setCurrentRoute, showToast } = useUiStore();
  const settings = useLiveQuery(() => db.settings.get('current_user'));

  useEffect(() => {
    initializeDatabase()
      .then((res) => {
        if (res?.recovered) {
          showToast(`🛡️ Restored ${res.recoveredCount} items from emergency local mirror!`, 'success');
        }
      })
      .catch((err) => {
        console.error('[CollegeLifeOS] Database init notice:', err);
      });

    // Flush emergency backup on page hide / app switch
    const handleFlushEmergencyBackup = () => {
      saveEmergencyBackup(true);
    };

    window.addEventListener('pagehide', handleFlushEmergencyBackup);
    window.addEventListener('beforeunload', handleFlushEmergencyBackup);
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        saveEmergencyBackup(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Hash sync
    const handleHashChange = () => {
      const hash = window.location.hash || '#/';
      setCurrentRoute(hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    if (!window.location.hash) {
      window.location.hash = '#/';
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('pagehide', handleFlushEmergencyBackup);
      window.removeEventListener('beforeunload', handleFlushEmergencyBackup);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [setCurrentRoute, showToast]);

  useEffect(() => {
    if (settings?.theme) {
      applyTheme(settings.theme);
    }
  }, [settings?.theme]);

  // Render active page
  const renderPage = () => {
    switch (currentRoute) {
      case '#/timetable':
        return <TimetablePage />;
      case '#/courses':
        return <CoursesPage />;
      case '#/tasks':
        return <QuestsPage />;
      case '#/exams':
        return <ExamsPage />;
      case '#/projects':
        return <ProjectsPage />;
      case '#/focus':
        return <FocusPage />;
      case '#/habits':
        return <HabitsPage />;
      case '#/journal':
        return <JournalPage />;
      case '#/week':
        return <MasterWeekPage />;
      case '#/calendar':
        return <CalendarPage />;
      case '#/grades':
        return <GradesPage />;
      case '#/wallet':
      case '#/finance':
        return <FinancePage />;
      case '#/studio':
        return <StudioPage />;
      case '#/library':
        return <LibraryPage />;
      case '#/levels':
      case '#/hero':
        return <LevelsPage />;
      case '#/rituals':
        return <RitualsPage />;
      case '#/themes':
        return <ThemesPage />;
      case '#/statistics':
      case '#/stats':
      case '#/wrapped':
        return <StatisticsPage />;
      case '#/settings':
        return <SettingsPage />;
      case '#/':
      default:
        return <LobbyPage />;
    }
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] flex transition-colors selection:bg-[rgb(var(--c-accent))] selection:text-stone-900">
      {/* Side Navigation Rail (Desktop) */}
      <SideNavRail />

      {/* Main Viewport Container with Spacious Layout */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />

        <main className="flex-1 w-full max-w-[1040px] mx-auto p-4 sm:p-8 space-y-6 sm:space-y-8 transition-all">
          {renderPage()}
        </main>

        <BottomTabBar />
      </div>

      {/* Global Concierge Modals & Toasts */}
      <MoreSheet />
      <QuickAddModal />
      <GlobalSearchModal />
      <ThemeSwitcherModal />
      <OnboardingModal />
      <ToastContainer />
      <OfflineIndicator />
    </div>
  );
}
