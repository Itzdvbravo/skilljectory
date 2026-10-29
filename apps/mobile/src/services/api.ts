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

// Determine the host for API requests:
// 1. If running in Expo Go on a physical device, get the debugger host IP (e.g. 192.168.0.108)
// 2. If running on Android emulator, use 10.0.2.2 or localhost with adb reverse tcp:4000 tcp:4000
const expoHost = Constants.expoConfig?.hostUri
  ? Constants.expoConfig.hostUri.split(':')[0]
  : null;

const API_HOST = expoHost || (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');
const API_BASE_URL = `http://${API_HOST}:4000/api`;

async function request(endpoint: string, options: RequestInit = {}) {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      throw new Error(errorJson.error || `HTTP error ${res.status}`);
    }

    return await res.json();
  } catch (err: any) {
    console.warn(`[API] ${endpoint} request failed: ${err.message}. Using client fallback data.`);
    throw err;
  }
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
