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
  course?: string | null;
  department?: string | null;
  enrollmentYear?: number | null;
  yearsOfStudy?: number | null;
  currentYear?: number | null;
  teachSkills?: string[];
  learnSkills?: string[];
  unlockedBloggingAt?: string | null;
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
  token: null,
  user: null,
  isAuthenticated: false,
  activeThemeKey: 'profile_theme_sunrise',
  activeBadgeFrameKey: '',
  setAuth: (token, user) => {
    const resolvedToken = token || (user as any)?.token || (user as any)?.accessToken || null;
    return set({
      token: resolvedToken,
      user,
      isAuthenticated: Boolean(resolvedToken),
      activeThemeKey: user.activeCustomizations?.theme || 'profile_theme_sunrise',
      activeBadgeFrameKey: user.activeCustomizations?.badge_frame || '',
    });
  },
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
