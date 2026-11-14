import React, { useEffect } from 'react';
import { useUiStore } from './store/uiStore';
import { initializeDatabase, db, saveEmergencyBackup } from './db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { applyTheme, applyAppearanceStyles, applyAppearanceMode, applyDesignStyle, applyReduceAnimations } from './theme/themeUtils';
import { initializeNotificationFoundation } from './services/notificationService';
import {
  reconcileAllReminders,
  registerReminderActionHandlers,
  syncNotificationCenter,
} from './services/reminderEngine';

// Layout
import { TopBar } from './components/layout/TopBar';
import { BottomTabBar } from './components/layout/BottomTabBar';
import { SideNavRail } from './components/layout/SideNavRail';
import { MoreSheet } from './components/layout/MoreSheet';
import { NotificationCenterDrawer } from './components/notifications/NotificationCenterDrawer';

// Modals
import { QuickAddModal } from './components/common/QuickAddModal';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { ThemeSwitcherModal } from './components/common/ThemeSwitcherModal';
import { OnboardingModal } from './components/common/OnboardingModal';
import { ToastContainer } from './components/common/ToastContainer';
import { OfflineIndicator } from './components/common/OfflineIndicator';

// Pages
import { LobbyPage } from './pages/LobbyPage';

// Lazy-loaded pages for mobile performance and fast initial load
const TimetablePage = React.lazy(() => import('./pages/TimetablePage').then((m) => ({ default: m.TimetablePage })));
const CoursesPage = React.lazy(() => import('./pages/CoursesPage').then((m) => ({ default: m.CoursesPage })));
const CourseHubPage = React.lazy(() => import('./pages/CourseHubPage').then((m) => ({ default: m.CourseHubPage })));
const QuestsPage = React.lazy(() => import('./pages/QuestsPage').then((m) => ({ default: m.QuestsPage })));
const ExamsPage = React.lazy(() => import('./pages/ExamsPage').then((m) => ({ default: m.ExamsPage })));
const ProjectsPage = React.lazy(() => import('./pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })));
const FocusPage = React.lazy(() => import('./pages/FocusPage').then((m) => ({ default: m.FocusPage })));
const HabitsPage = React.lazy(() => import('./pages/HabitsPage').then((m) => ({ default: m.HabitsPage })));
const JournalPage = React.lazy(() => import('./pages/JournalPage').then((m) => ({ default: m.JournalPage })));
const MasterWeekPage = React.lazy(() => import('./pages/MasterWeekPage').then((m) => ({ default: m.MasterWeekPage })));
const CalendarPage = React.lazy(() => import('./pages/CalendarPage').then((m) => ({ default: m.CalendarPage })));
const GradesPage = React.lazy(() => import('./pages/GradesPage').then((m) => ({ default: m.GradesPage })));
const FinancePage = React.lazy(() => import('./pages/FinancePage').then((m) => ({ default: m.FinancePage })));
const StudioPage = React.lazy(() => import('./pages/StudioPage').then((m) => ({ default: m.StudioPage })));
const LibraryPage = React.lazy(() => import('./pages/LibraryPage').then((m) => ({ default: m.LibraryPage })));
const LevelsPage = React.lazy(() => import('./pages/LevelsPage').then((m) => ({ default: m.LevelsPage })));
const RitualsPage = React.lazy(() => import('./pages/RitualsPage').then((m) => ({ default: m.RitualsPage })));
const ThemesPage = React.lazy(() => import('./pages/ThemesPage').then((m) => ({ default: m.ThemesPage })));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const StatisticsPage = React.lazy(() => import('./pages/StatisticsPage').then((m) => ({ default: m.StatisticsPage })));
const TodayPage = React.lazy(() => import('./pages/TodayPage').then((m) => ({ default: m.TodayPage })));
const FlashcardsPage = React.lazy(() => import('./pages/FlashcardsPage').then((m) => ({ default: m.FlashcardsPage })));
const WellbeingPage = React.lazy(() => import('./pages/WellbeingPage').then((m) => ({ default: m.WellbeingPage })));
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const NotificationSettingsPage = React.lazy(() => import('./pages/NotificationSettingsPage').then((m) => ({ default: m.NotificationSettingsPage })));

const PageLoadingFallback = () => (
  <div className="flex flex-col items-center justify-center py-24 space-y-3">
    <div className="w-7 h-7 rounded-full border-2 border-[rgb(var(--c-primary))] border-t-transparent animate-spin" />
    <span className="text-xs font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-widest">
      Opening...
    </span>
  </div>
);

export default function App() {
  const { currentRoute, setCurrentRoute, showToast } = useUiStore();
  const settings = useLiveQuery(() => db.settings.get('current_user'));

  useEffect(() => {
    registerReminderActionHandlers((route) => setCurrentRoute(route));

    initializeDatabase()
      .then((res) => {
        if (res?.recovered) {
          showToast(`🛡️ Restored ${res.recoveredCount} items from emergency local mirror!`, 'success');
        }
        // Initialize notification foundation, reconcile alarms, and sync Notification Center
        initializeNotificationFoundation()
          .then(() => reconcileAllReminders())
          .then(() => syncNotificationCenter())
          .catch((e) => console.warn('[CollegeLifeOS] Notification init warning:', e));
      })
      .catch((err) => {
        console.error('[CollegeLifeOS] Database init notice:', err);
      });

    // Flush emergency backup on page hide / app switch, and sync notifications on foreground
    const handleFlushEmergencyBackup = () => {
      saveEmergencyBackup(true);
    };

    window.addEventListener('pagehide', handleFlushEmergencyBackup);
    window.addEventListener('beforeunload', handleFlushEmergencyBackup);
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        saveEmergencyBackup(true);
      } else if (document.visibilityState === 'visible') {
        syncNotificationCenter().catch(console.warn);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // 60-second foreground sync for Web/PWA & live Notification Center badge
    const syncInterval = setInterval(() => {
      syncNotificationCenter().catch(console.warn);
    }, 60 * 1000);

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
      clearInterval(syncInterval);
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('pagehide', handleFlushEmergencyBackup);
      window.removeEventListener('beforeunload', handleFlushEmergencyBackup);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [setCurrentRoute, showToast]);

  useEffect(() => {
    if (settings) {
      if (settings.theme) {
        applyTheme(settings.theme);
      }
      applyAppearanceMode(settings.appearanceMode || 'light');
      applyDesignStyle(settings.designStyle || 'editorial-retro');
      applyAppearanceStyles({
        fontStyle: settings.fontStyle,
        layoutDensity: settings.layoutDensity,
        cardBorderGlow: settings.cardBorderGlow,
      });
      applyReduceAnimations(!!settings.reduceAnimations);
    }
  }, [
    settings?.theme,
    settings?.appearanceMode,
    settings?.designStyle,
    settings?.fontStyle,
    settings?.layoutDensity,
    settings?.cardBorderGlow,
    settings?.reduceAnimations,
  ]);

  // Render active page
  const renderPage = () => {
    const baseRoute = currentRoute.split('?')[0] || '#/';

    if (baseRoute.startsWith('#/courses/')) {
      const courseId = baseRoute.slice('#/courses/'.length);
      return <CourseHubPage courseId={courseId} />;
    }

    if (baseRoute.startsWith('#/today') || baseRoute.startsWith('#/day')) {
      return <TodayPage />;
    }

    switch (baseRoute) {
      case '#/timetable':
        return <TimetablePage />;
      case '#/courses':
        return <CoursesPage />;
      case '#/tasks':
      case '#/goals':
        return <QuestsPage />;
      case '#/exams':
        return <ExamsPage />;
      case '#/flashcards':
        return <FlashcardsPage />;
      case '#/projects':
        return <ProjectsPage />;
      case '#/focus':
        return <FocusPage />;
      case '#/habits':
        return <HabitsPage />;
      case '#/journal':
        return <JournalPage />;
      case '#/wellbeing':
      case '#/insights':
        return <WellbeingPage />;
      case '#/notifications':
        return <NotificationsPage />;
      case '#/notification-settings':
        return <NotificationSettingsPage />;
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
          <React.Suspense fallback={<PageLoadingFallback />}>
            {renderPage()}
          </React.Suspense>
        </main>

        <BottomTabBar />
      </div>

      {/* Global Concierge Modals & Toasts */}
      <MoreSheet />
      <NotificationCenterDrawer />
      <QuickAddModal />
      <GlobalSearchModal />
      <ThemeSwitcherModal />
      <OnboardingModal />
      <ToastContainer />
      <OfflineIndicator />
    </div>
  );
}
