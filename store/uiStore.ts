import { create } from 'zustand';

interface UIState {
  mobileSidebarOpen:   boolean;
  openMobileSidebar:   () => void;
  closeMobileSidebar:  () => void;
  toggleMobileSidebar: () => void;
}

/**
 * Tracks whether the mobile sidebar drawer is open.
 * Navbar renders the hamburger button that toggles this;
 * Sidebar reads it to decide its transform/visibility.
 */
export const useUIStore = create<UIState>((set) => ({
  mobileSidebarOpen: false,
  openMobileSidebar:   () => set({ mobileSidebarOpen: true }),
  closeMobileSidebar:  () => set({ mobileSidebarOpen: false }),
  toggleMobileSidebar: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
}));
