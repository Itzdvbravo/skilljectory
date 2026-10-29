import { Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';
import {
  SessionType,
  LocationMode,
  SocialPlatform,
  CustomizationCategory,
  CustomizationTier,
  CustomizationUnlockType,
  BadgeCriteriaType,
  MaterialType,
  BlogPostStatus,
  NotificationType,
} from '@skill-exchange/shared-types';
import Constants from 'expo-constants';

// Determine primary API host from Expo debugger URL (e.g. 192.168.0.108) or fallback
const expoHost =
  Constants.expoConfig?.hostUri?.split(':')[0] ||
  (Constants as any).manifest2?.extra?.expoClient?.hostUri?.split(':')[0] ||
  (Constants as any).manifest?.debuggerHost?.split(':')[0] ||
  '192.168.0.108';

// Build candidate base URLs:
// 1. localhost:4000 (works instantly via 'adb reverse tcp:4000 tcp:4000' over USB)
// 2. expoHost:4000 (works over Wi-Fi / LAN)
const candidateHosts = Platform.OS === 'android'
  ? Array.from(new Set(['localhost', '192.168.0.108', expoHost, '10.0.2.2'])).filter(Boolean)
  : Array.from(new Set(['localhost', '192.168.0.108', expoHost])).filter(Boolean);

let cachedWorkingHost: string | null = null;

async function request(endpoint: string, options: RequestInit = {}) {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If we already found a host that works, prioritize it
  const hostsToTry = cachedWorkingHost
    ? [cachedWorkingHost, ...candidateHosts.filter((h) => h !== cachedWorkingHost)]
    : candidateHosts;

  let lastError: any = null;

  for (const host of hostsToTry) {
    const url = `http://${host}:4000/api${endpoint}`;
    try {
      const res = await fetch(url, {
        ...options,
        headers,
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || `HTTP error ${res.status}`);
      }

      cachedWorkingHost = host;
      return await res.json();
    } catch (err: any) {
      lastError = err;
      // If it's an HTTP 4xx error (e.g. 400 Bad Request, 401 Unauthorized), the server answered! Don't retry another host.
      if (err.message && !err.message.includes('Network request failed') && !err.message.includes('Failed to fetch')) {
        throw err;
      }
    }
  }

  console.warn(`[API] ${endpoint} request failed across hosts [${hostsToTry.join(', ')}]: ${lastError?.message}`);
  throw lastError || new Error('Network request failed');
}

export const api = {
  // Auth
  signup: (data: any) => request('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  adminLogin: () => request('/auth/admin-login', { method: 'POST' }),
  verifyEmail: () => request('/auth/verify-email', { method: 'POST' }),
  verifyId: (documentUrl: string) => request('/auth/verify-id', { method: 'POST', body: JSON.stringify({ documentUrl }) }),
  reverify: () => request('/auth/reverify', { method: 'POST' }),

  // User
  getMe: () => request('/users/me'),
  searchMentors: (q?: string) => request(`/users/mentors${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  updateProfile: (data: any) => request('/users/me/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  addSocialLink: (data: any) => request('/users/me/social-links', { method: 'POST', body: JSON.stringify(data) }),
  deleteSocialLink: (id: string) => request(`/users/me/social-links/${id}`, { method: 'DELETE' }),
  getShowcase: (id: string) => request(`/users/${id}/showcase`),

  // Skills
  searchSkills: (q?: string) => request(`/skills/search${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  tagSkill: (data: any) => request('/skills/tag', { method: 'POST', body: JSON.stringify(data) }),

  // Sessions
  getSessions: (scope: 'discover' | 'my' = 'discover', search?: string) =>
    request(`/sessions?scope=${scope}${search ? `&search=${encodeURIComponent(search)}` : ''}`),
  getSession: (id: string) => request(`/sessions/${id}`),
  previewSession: (data: any) => request('/sessions/preview', { method: 'POST', body: JSON.stringify(data) }),
  createSession: (data: any) => request('/sessions', { method: 'POST', body: JSON.stringify(data) }),
  joinSession: (id: string, joinCode?: string) =>
    request(`/sessions/${id}/join`, { method: 'POST', body: JSON.stringify({ joinCode }) }),
  joinByCode: (joinCode: string) =>
    request('/sessions/join-by-code', { method: 'POST', body: JSON.stringify({ joinCode }) }),
  removeParticipant: (id: string, participantUserId: string) =>
    request(`/sessions/${id}/remove-participant`, { method: 'POST', body: JSON.stringify({ participantUserId }) }),
  cancelSession: (id: string) =>
    request(`/sessions/${id}/cancel`, { method: 'POST' }),
  startSessionEarly: (id: string) =>
    request(`/sessions/${id}/start-early`, { method: 'POST' }),
  respondToMentorRequest: (id: string, accept: boolean) =>
    request(`/sessions/${id}/mentor-response`, { method: 'POST', body: JSON.stringify({ accept }) }),
  announceSession: (id: string) => request(`/sessions/${id}/announce`, { method: 'POST' }),
  confirmAttendance: (id: string, targetUserId?: string, confirmedBy?: string) =>
    request(`/sessions/${id}/confirm-attendance`, { method: 'POST', body: JSON.stringify({ targetUserId, confirmedBy }) }),
  completeSession: (id: string) => request(`/sessions/${id}/complete`, { method: 'POST' }),
  rateSession: (id: string, rating: number, feedback?: string, isAnonymous: boolean = true) =>
    request(`/sessions/${id}/rate`, { method: 'POST', body: JSON.stringify({ rating, feedback, isAnonymous }) }),

  // Credits
  getBalance: () => request('/credits/balance'),
  getLedger: (limit = 20, offset = 0) => request(`/credits/ledger?limit=${limit}&offset=${offset}`),

  // Marketplace
  getMaterials: () => request('/marketplace/materials'),
  createMaterial: (data: any) => request('/marketplace/materials', { method: 'POST', body: JSON.stringify(data) }),
  purchaseMaterial: (id: string) => request(`/marketplace/materials/${id}/purchase`, { method: 'POST' }),

  // Blog
  getBlogPosts: () => request('/blog/posts'),
  unlockBlog: () => request('/blog/unlock', { method: 'POST' }),
  createBlogPost: (data: any) => request('/blog/posts', { method: 'POST', body: JSON.stringify(data) }),
  upvotePost: (id: string) => request(`/blog/posts/${id}/upvote`, { method: 'POST' }),
  commentPost: (id: string, text: string) => request(`/blog/posts/${id}/comment`, { method: 'POST', body: JSON.stringify({ commentText: text }) }),

  // Customizations
  getCatalog: () => request('/customizations/catalog'),
  unlockCustomization: (id: string) => request(`/customizations/${id}/unlock`, { method: 'POST' }),
  activateCustomization: (id: string) => request(`/customizations/${id}/activate`, { method: 'PATCH' }),

  // Notifications
  getNotifications: () => request('/notifications'),
  ackNotification: (id: string) => request(`/notifications/${id}/ack`, { method: 'POST' }),

  // Banners & Analytics
  getBadges: () => request('/badges/me'),
  getAnalytics: () => request('/analytics/skill-demand'),
  generateBanner: (sourceType: string, sourceId?: string) => request('/banners/generate', { method: 'POST', body: JSON.stringify({ sourceType, sourceId }) }),
};
