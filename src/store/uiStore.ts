import { create } from 'zustand';

export interface ToastItem {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'danger';
  duration?: number;
}

interface UiState {
  currentRoute: string;
  isMoreSheetOpen: boolean;
  isQuickAddOpen: boolean;
  isSearchOpen: boolean;
  isThemeSwitcherOpen: boolean;
  toasts: ToastItem[];
  activeFocusTask: { taskId?: string; taskTitle?: string; courseId?: string } | null;
  setCurrentRoute: (route: string) => void;
  setActiveFocusTask: (task: { taskId?: string; taskTitle?: string; courseId?: string } | null) => void;
  setMoreSheetOpen: (open: boolean) => void;
  setQuickAddOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setThemeSwitcherOpen: (open: boolean) => void;
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'danger', duration?: number) => void;
  dismissToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  currentRoute: window.location.hash || '#/',
  isMoreSheetOpen: false,
  isQuickAddOpen: false,
  isSearchOpen: false,
  isThemeSwitcherOpen: false,
  toasts: [],
  activeFocusTask: null,
  setCurrentRoute: (route) => {
    window.location.hash = route;
    set({ currentRoute: route, isMoreSheetOpen: false });
  },
  setActiveFocusTask: (task) => set({ activeFocusTask: task }),
  setMoreSheetOpen: (open) => set({ isMoreSheetOpen: open }),
  setQuickAddOpen: (open) => set({ isQuickAddOpen: open }),
  setSearchOpen: (open) => set({ isSearchOpen: open }),
  setThemeSwitcherOpen: (open) => set({ isThemeSwitcherOpen: open }),
  showToast: (message, type = 'info', duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
