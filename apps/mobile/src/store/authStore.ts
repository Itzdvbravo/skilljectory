import { create } from 'zustand';
import { UserStatus, VerificationStatus } from '@skill-exchange/shared-types';

export interface UserAuthData {
  id: string;
  email: string;
  name: string;
  username?: string | null;
  studentId?: string | null;
  verificationStatus: VerificationStatus;
  status: UserStatus;
  creditBalance: number;
  verificationExpiresAt?: string | null;
  activeCustomizations?: Record<string, string | null>;
}

interface AuthState {
  token: string | null;
  user: UserAuthData | null;
  isAuthenticated: boolean;
  activeThemeKey: string;
  activeBadgeFrameKey: string;
  setAuth: (token: string, user: UserAuthData) => void;
  updateUser: (partial: Partial<UserAuthData>) => void;
  setActiveCustomizations: (themeKey: string, badgeKey: string) => void;
  logout: () => void;
}
export const useAuthStore = create<AuthState>((set) => ({
  token:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfZGVmYXVsdF9kZW1vX3NjaG9sYXIiLCJlbWFpbCI6InNjaG9sYXJAY2FtcHVzLmVkdSIsImlhdCI6MTc5MzA5MTgwMiwiZXhwIjoxODI0NjI3ODAyfQ.KayjVdM1LPOqPJksCzfvwgatN3JuqTg3r6hzEbV82qI',
  user: {
    id: 'usr_default_demo_scholar',
    email: 'scholar@campus.edu',
    username: 'alexrivera',
    name: 'Alex Rivera',
    studentId: 'CS-2024-889',
    verificationStatus: VerificationStatus.VERIFIED,
    status: UserStatus.ACTIVE,
    creditBalance: 12.0,
    verificationExpiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    activeCustomizations: {
      theme: 'profile_theme_sunrise',
      banner: 'banner_style_minimal',
      badge_frame: 'badge_frame_bronze',
      layout: null,
      font: null,
    },
  },
  isAuthenticated: true,
  activeThemeKey: 'profile_theme_sunrise',
  activeBadgeFrameKey: 'badge_frame_bronze',
  setAuth: (token, user) =>
    set({
      token,
      user,
      isAuthenticated: true,
      activeThemeKey: user.activeCustomizations?.theme || 'profile_theme_sunrise',
      activeBadgeFrameKey: user.activeCustomizations?.badge_frame || 'badge_frame_bronze',
    }),
  updateUser: (partial) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...partial } : null,
      activeThemeKey: partial.activeCustomizations?.theme ?? state.activeThemeKey,
      activeBadgeFrameKey: partial.activeCustomizations?.badge_frame ?? state.activeBadgeFrameKey,
    })),
  setActiveCustomizations: (themeKey, badgeKey) =>
    set((state) => ({
      activeThemeKey: themeKey || state.activeThemeKey,
      activeBadgeFrameKey: badgeKey || state.activeBadgeFrameKey,
      user: state.user
        ? {
            ...state.user,
            activeCustomizations: {
              ...(state.user.activeCustomizations || {}),
              theme: themeKey || state.user.activeCustomizations?.theme || null,
              badge_frame: badgeKey || state.user.activeCustomizations?.badge_frame || null,
            },
          }
        : null,
    })),
  logout: () => set({ token: null, user: null, isAuthenticated: false }),
}));
