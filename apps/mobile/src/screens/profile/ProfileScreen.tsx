import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Share,
  Switch,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import {
  UserProfileDto,
  CustomizationOptionDto,
  CustomizationCategory,
  CustomizationTier,
  CustomizationUnlockType,
  BadgeCriteriaType,
  CreditLedgerDto,
  LedgerTransactionType,
  SessionDto,
  SessionStatus,
} from '@skill-exchange/shared-types';
import {
  ShieldCheck,
  Award,
  Clock,
  Coins,
  ExternalLink,
  TrendingUp,
  Zap,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  ChevronDown,
  ChevronUp,
  Calendar,
  Share2,
  Settings,
  User,
  Sparkles,
  Check,
  CheckCircle,
  FileText,
  Download,
  Palette,
  Tag,
  Star,
  MapPin,
  LogOut,
} from 'lucide-react-native';
import { AvatarWithBadgeFrame, BrandUnderline, useAppTheme } from '../../components/common/ThemeSystem';
import { SocialLinksEditor } from '../../components/profile/SocialLinksEditor';
import { saveOrSharePng } from '../../services/exportImage';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Rect, Circle, Path } from 'react-native-svg';

// Resume Style Palettes & Customization Types
export type ResumeThemeKey = 'cyan' | 'gold' | 'emerald' | 'indigo';

export interface ResumeThemeDefinition {
  id: ResumeThemeKey;
  label: string;
  badgeEmoji: string;
  primary: string;
  secondary: string;
  bgDark: string;
  cardBg: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  gradient: [string, string, string];
}

export const RESUME_THEMES: Record<ResumeThemeKey, ResumeThemeDefinition> = {
  cyan: {
    id: 'cyan',
    label: 'Cyber Cyan',
    badgeEmoji: '🔵',
    primary: '#0284C7',
    secondary: '#38BDF8',
    bgDark: '#0B132B',
    cardBg: '#1E293B',
    cardBorder: '#334155',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    accent: '#38BDF8',
    gradient: ['#080C14', '#0F172A', '#0B132B'],
  },
  gold: {
    id: 'gold',
    label: 'Prestige Gold',
    badgeEmoji: '🟡',
    primary: '#D97706',
    secondary: '#F59E0B',
    bgDark: '#17120A',
    cardBg: '#261E14',
    cardBorder: '#45321A',
    textPrimary: '#FFFBEB',
    textSecondary: '#D6D3D1',
    accent: '#FBBF24',
    gradient: ['#120F09', '#1C160C', '#17120A'],
  },
  emerald: {
    id: 'emerald',
    label: 'Emerald Scholar',
    badgeEmoji: '🟢',
    primary: '#059669',
    secondary: '#10B981',
    bgDark: '#061C15',
    cardBg: '#0E2E24',
    cardBorder: '#164E3D',
    textPrimary: '#ECFDF5',
    textSecondary: '#A7F3D0',
    accent: '#34D399',
    gradient: ['#04140F', '#09231B', '#061C15'],
  },
  indigo: {
    id: 'indigo',
    label: 'Royal Indigo',
    badgeEmoji: '🟣',
    primary: '#7C3AED',
    secondary: '#8B5CF6',
    bgDark: '#120E29',
    cardBg: '#201B42',
    cardBorder: '#3B326B',
    textPrimary: '#F5F3FF',
    textSecondary: '#C4B5FD',
    accent: '#A78BFA',
    gradient: ['#0C091A', '#191538', '#120E29'],
  },
};

export interface GenerateResumeOptions {
  name: string;
  username: string;
  studentId: string;
  department?: string;
  bio?: string;
  hours: number;
  sessions: number;
  rating: number;
  skills: string[];
  badges?: string[];
  theme?: ResumeThemeKey;
  showBio?: boolean;
  showStats?: boolean;
  showRating?: boolean;
  showSkills?: boolean;
  showBadges?: boolean;
}

// Helper to generate and download a genuine verified academic resume PNG
export async function generateResumePng(options: GenerateResumeOptions): Promise<string | null> {
  const theme = RESUME_THEMES[options.theme || 'cyan'];
  const showBio = options.showBio !== false;
  const showStats = options.showStats !== false;
  const showRating = options.showRating !== false;
  const showSkills = options.showSkills !== false;
  const showBadges = options.showBadges !== false;

  // 1. Primary: High-fidelity vector SVG-to-PNG backend rasterizer (Sharp)
  try {
    const res = await api.exportResumePng({
      name: options.name,
      username: options.username,
      studentId: options.studentId,
      bio: options.bio,
      hours: options.hours,
      sessions: options.sessions,
      rating: options.rating,
      credits: (options as any).credits || 12,
      skills: options.skills,
      badges: options.badges,
      theme: options.theme || 'cyan',
      showBio,
      showStats,
      showRating,
      showSkills,
      showBadges,
    });

    if (res?.success && res?.pngBase64) {
      const fileName = res.fileName || `SkillJectory_Resume_${options.username || 'scholar'}.png`;
      await saveOrSharePng(res.pngBase64, fileName, 'Save Academic Resume (.png)');
      return res.pngBase64;
    }
  } catch (apiErr: any) {
    console.warn('[ExportResume] Server rasterizer error:', apiErr?.message);
  }

  // 2. Client-side canvas fallback if running in a browser environment
  if (typeof document === 'undefined') {
    Alert.alert(
      'Export Notice',
      'Could not generate resume PNG. Please check your network connection to the server.'
    );
    return null;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Background gradient using selected theme
    const gradient = ctx.createLinearGradient(0, 0, 800, 1080);
    gradient.addColorStop(0, theme.gradient[0]);
    gradient.addColorStop(0.5, theme.gradient[1]);
    gradient.addColorStop(1, theme.gradient[2]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 1080);

    // Frame Border
    ctx.strokeStyle = theme.secondary;
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, 760, 1040);

    // Top Header Banner
    ctx.fillStyle = theme.primary;
    ctx.fillRect(20, 20, 760, 14);

    // Institution Branding
    ctx.fillStyle = theme.secondary;
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('ASSAM DOWN TOWN UNIVERSITY • CAMPUS PEER MENTORSHIP EXCHANGE', 50, 68);

    // Document Title
    ctx.fillStyle = theme.textPrimary;
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('VERIFIED ACADEMIC & MENTOR RESUME', 50, 106);

    ctx.fillStyle = theme.textSecondary;
    ctx.font = '13px sans-serif';
    ctx.fillText('Official SkillJectory Peer-to-Peer Teaching Credential & Portfolio', 50, 130);

    // Divider Line
    ctx.strokeStyle = theme.cardBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, 150);
    ctx.lineTo(750, 150);
    ctx.stroke();

    // Scholar Identity
    ctx.fillStyle = theme.textPrimary;
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(options.name, 50, 190);

    ctx.fillStyle = theme.secondary;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`@${options.username}`, 50, 218);

    ctx.fillStyle = theme.textSecondary;
    ctx.font = '13px sans-serif';
    ctx.fillText(
      `Student ID: ${options.studentId}  |  Dept: ${options.department || 'Computer Science & Engineering'}`,
      50,
      244
    );

    // Verified Badge Stamp (Institutional peer mentor stamp - NO crypto ledger wording)
    ctx.fillStyle = theme.cardBg;
    ctx.fillRect(530, 168, 220, 80);
    ctx.strokeStyle = theme.secondary;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(530, 168, 220, 80);

    ctx.fillStyle = theme.secondary;
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('✓ VERIFIED MENTOR', 555, 200);

    ctx.fillStyle = theme.textSecondary;
    ctx.font = '12px sans-serif';
    ctx.fillText('Assam Down Town University', 555, 226);

    let curY = 275;

    // Optional: Teaching Statement / Bio
    if (showBio && options.bio) {
      ctx.fillStyle = theme.cardBg;
      ctx.fillRect(50, curY, 700, 80);
      ctx.strokeStyle = theme.cardBorder;
      ctx.lineWidth = 1;
      ctx.strokeRect(50, curY, 700, 80);

      ctx.fillStyle = theme.secondary;
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('TEACHING STATEMENT & PROFILE', 70, curY + 22);

      ctx.fillStyle = theme.textPrimary;
      ctx.font = '12px sans-serif';
      const bioWords = options.bio.split(' ');
      let line = '';
      let lineY = curY + 45;
      for (let n = 0; n < bioWords.length; n++) {
        const testLine = line + bioWords[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > 650 && n > 0) {
          ctx.fillText(line, 70, lineY);
          line = bioWords[n] + ' ';
          lineY += 18;
          if (lineY > curY + 70) break;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 70, lineY);

      curY += 100;
    }

    // Optional: Stats Boxes
    if (showStats) {
      const drawStatBox = (x: number, y: number, w: number, h: number, title: string, value: string, sub: string) => {
        ctx.fillStyle = theme.cardBg;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = theme.cardBorder;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = theme.textSecondary;
        ctx.font = '11px sans-serif';
        ctx.fillText(title, x + 16, y + 25);

        ctx.fillStyle = theme.textPrimary;
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText(value, x + 16, y + 55);

        ctx.fillStyle = theme.secondary;
        ctx.font = '11px sans-serif';
        ctx.fillText(sub, x + 16, y + 76);
      };

      if (showRating) {
        drawStatBox(50, curY, 215, 90, 'TEACHING RECORD', `${options.hours} Hours`, 'Verified Peer Hours');
        drawStatBox(285, curY, 215, 90, 'SESSIONS COMPLETED', `${options.sessions} Sessions`, 'Workshops & 1-on-1s');
        drawStatBox(520, curY, 215, 90, 'STUDENT RATING', `${options.rating} / 5.0 ★`, 'Peer Satisfaction');
      } else {
        drawStatBox(50, curY, 335, 90, 'TEACHING RECORD', `${options.hours} Hours`, 'Verified Peer Hours');
        drawStatBox(415, curY, 335, 90, 'SESSIONS COMPLETED', `${options.sessions} Sessions`, 'Workshops & 1-on-1s');
      }
      curY += 110;
    }

    // Optional: Skills Section
    if (showSkills && options.skills && options.skills.length > 0) {
      ctx.fillStyle = theme.textPrimary;
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('CORE COMPETENCIES & TEACHING TOPICS', 50, curY + 15);
      curY += 30;

      let sx = 50;
      let sy = curY;
      options.skills.forEach((skill) => {
        ctx.font = 'bold 12px sans-serif';
        const textWidth = ctx.measureText(skill).width + 28;
        if (sx + textWidth > 750) {
          sx = 50;
          sy += 38;
        }
        ctx.fillStyle = theme.cardBg;
        ctx.fillRect(sx, sy, textWidth, 30);
        ctx.strokeStyle = theme.secondary;
        ctx.lineWidth = 1;
        ctx.strokeRect(sx, sy, textWidth, 30);
        ctx.fillStyle = theme.secondary;
        ctx.fillText(skill, sx + 14, sy + 20);
        sx += textWidth + 12;
      });
      curY = sy + 45;
    }

    // Optional: Academic Honors & Badges
    if (showBadges && options.badges && options.badges.length > 0) {
      ctx.fillStyle = theme.textPrimary;
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('ACADEMIC HONORS & VERIFIED MILESTONES', 50, curY + 15);
      curY += 30;

      let bx = 50;
      let by = curY;
      options.badges.forEach((bName) => {
        ctx.font = '12px sans-serif';
        const textWidth = ctx.measureText(`🏅 ${bName}`).width + 28;
        if (bx + textWidth > 750) {
          bx = 50;
          by += 38;
        }
        ctx.fillStyle = theme.cardBg;
        ctx.fillRect(bx, by, textWidth, 30);
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, textWidth, 30);
        ctx.fillStyle = theme.textPrimary;
        ctx.fillText(`🏅 ${bName}`, bx + 14, by + 20);
        bx += textWidth + 12;
      });
      curY = by + 45;
    }

    // Official Institutional Attestation Footer (Clean, elegant, NO cryptographic ledger hash!)
    const footerY = Math.max(curY + 20, 890);
    ctx.fillStyle = theme.cardBg;
    ctx.fillRect(50, footerY, 700, 115);
    ctx.strokeStyle = theme.cardBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(50, footerY, 700, 115);

    ctx.fillStyle = theme.secondary;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('ACADEMIC PEER MENTORSHIP ATTESTATION', 70, footerY + 30);

    ctx.fillStyle = theme.textSecondary;
    ctx.font = '12px sans-serif';
    ctx.fillText(
      'Issued by Assam Down Town University Peer Mentorship Program to certify active curriculum contribution',
      70,
      footerY + 54
    );
    ctx.fillText(
      'and academic mentoring excellence across peer study groups and collaborative workshops.',
      70,
      footerY + 74
    );

    ctx.fillStyle = theme.accent;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(
      `Official Verification Link: https://skilljectory.adtu.in/@${options.username}  •  Issued: ${new Date().toLocaleDateString()}`,
      70,
      footerY + 98
    );

    // Generate genuine PNG and trigger download/share
    const dataUrl = canvas.toDataURL('image/png');
    await saveOrSharePng(
      dataUrl,
      `SkillJectory_Resume_${options.username || 'scholar'}.png`,
      'Save Academic Resume (.png)'
    );
    return dataUrl;
  } catch (err: any) {
    Alert.alert('Export Error', err.message || 'Could not export resume image');
    return null;
  }
}

export const ProfileScreen = ({ navigation }: any) => {
  const user = useAuthStore((s) => s.user);
  const activeThemeKey = useAuthStore((s) => s.activeThemeKey);
  const activeBadgeFrameKey = useAuthStore((s) => s.activeBadgeFrameKey);
  const setActiveCustomizations = useAuthStore((s) => s.setActiveCustomizations);
  const logout = useAuthStore((s) => s.logout);
  const theme = useAppTheme();

  // Main navigation toggle: 'public_view' vs 'settings'
  const [activeMainTab, setActiveMainTab] = useState<'public_view' | 'settings'>('public_view');

  // Settings sub-tab: 'wallet' | 'customization' | 'history' | 'resume'
  const [settingsSubTab, setSettingsSubTab] = useState<'wallet' | 'customization' | 'history' | 'resume'>('wallet');

  // Resume Export Customization Options & Styles
  const [resumeTheme, setResumeTheme] = useState<ResumeThemeKey>('cyan');
  const [resumeShowBio, setResumeShowBio] = useState<boolean>(true);
  const [resumeShowStats, setResumeShowStats] = useState<boolean>(true);
  const [resumeShowRating, setResumeShowRating] = useState<boolean>(true);
  const [resumeShowSkills, setResumeShowSkills] = useState<boolean>(true);
  const [resumeShowBadges, setResumeShowBadges] = useState<boolean>(true);

  const [profileData, setProfileData] = useState<UserProfileDto | null>(null);
  const [customizations, setCustomizations] = useState<CustomizationOptionDto[]>([]);
  const [ledger, setLedger] = useState<CreditLedgerDto[]>([]);
  const [mySessions, setMySessions] = useState<SessionDto[]>([]);
  const [showAllLedger, setShowAllLedger] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const [userRes, catalogRes, ledgerRes, sessionsRes] = await Promise.all([
        api.getMe().catch(() => ({
          id: user?.id || 'usr_student',
          email: user?.email || 'student@adtu.in',
          name: user?.name || 'ADTU Scholar',
          username: user?.username || 'scholar',
          studentId: user?.studentId || null,
          course: user?.course || 'B.Tech CSE',
          department: user?.department || 'Faculty of Engineering & Technology',
          enrollmentYear: user?.enrollmentYear || 2024,
          yearsOfStudy: user?.yearsOfStudy || 4,
          currentYear: user?.currentYear || 1,
          teachSkills: user?.teachSkills || [],
          learnSkills: user?.learnSkills || [],
          verificationMethod: 'email',
          verificationStatus: 'verified',
          status: 'active',
          bio: 'Assam Down Town University student & peer learner.',
          creditBalance: user?.creditBalance ?? 3.0,
          totalSessionHours: 0.0,
          sessionsTaughtCount: 0,
          socialLinks: [],
          activeCustomizations: {
            theme: activeThemeKey || 'profile_theme_sunrise',
            banner: 'banner_style_minimal',
            badge_frame: activeBadgeFrameKey || null,
            layout: null,
            font: null,
          },
          badges: [],
        })),
        api.getCatalog().catch(() => [
          {
            id: 'c1',
            key: 'profile_theme_sunrise',
            label: 'Sunrise Horizon Theme',
            category: CustomizationCategory.THEME,
            tier: CustomizationTier.BASIC,
            unlockType: CustomizationUnlockType.CREDITS,
            unlockValue: 0,
            isUnlocked: true,
            isActive: activeThemeKey === 'profile_theme_sunrise',
            progressValue: 0,
          },
          {
            id: 'c2',
            key: 'profile_theme_midnight',
            label: 'Midnight OLED Dark Theme',
            category: CustomizationCategory.THEME,
            tier: CustomizationTier.BASIC,
            unlockType: CustomizationUnlockType.CREDITS,
            unlockValue: 2,
            isUnlocked: false,
            isActive: activeThemeKey === 'profile_theme_midnight',
            progressValue: 0,
          },
          {
            id: 'c3',
            key: 'profile_theme_aurora',
            label: 'Aurora Emerald Theme',
            category: CustomizationCategory.THEME,
            tier: CustomizationTier.ADVANCED,
            unlockType: CustomizationUnlockType.SESSIONS,
            unlockValue: 4,
            isUnlocked: false,
            isActive: activeThemeKey === 'profile_theme_aurora',
            progressValue: 0,
          },
          {
            id: 'c4',
            key: 'badge_frame_standard',
            label: 'Standard Scholar Frame',
            category: CustomizationCategory.BADGE_FRAME,
            tier: CustomizationTier.BASIC,
            unlockType: CustomizationUnlockType.CREDITS,
            unlockValue: 0,
            isUnlocked: true,
            isActive: activeBadgeFrameKey === 'badge_frame_standard' || !activeBadgeFrameKey,
            progressValue: 0,
          },
          {
            id: 'c5',
            key: 'badge_frame_bronze',
            label: 'Bronze Mentor Frame',
            category: CustomizationCategory.BADGE_FRAME,
            tier: CustomizationTier.BASIC,
            unlockType: CustomizationUnlockType.CREDITS,
            unlockValue: 3,
            isUnlocked: false,
            isActive: activeBadgeFrameKey === 'badge_frame_bronze',
            progressValue: 0,
          },
          {
            id: 'c6',
            key: 'badge_frame_gold',
            label: 'Gold Prestige Crown Frame',
            category: CustomizationCategory.BADGE_FRAME,
            tier: CustomizationTier.ADVANCED,
            unlockType: CustomizationUnlockType.SESSIONS,
            unlockValue: 6,
            isUnlocked: false,
            isActive: activeBadgeFrameKey === 'badge_frame_gold',
            progressValue: 0,
          },
        ]),
        api.getLedger(20, 0).catch(() => ({ items: [] })),
        api.getSessions('my').catch(() => []),
      ]);

      setProfileData(userRes as any);
      setCustomizations(catalogRes);
      setLedger(Array.isArray(ledgerRes?.items) ? ledgerRes.items : (Array.isArray(ledgerRes) ? ledgerRes : []));
      setMySessions(sessionsRes || []);

      if ((userRes as any)?.activeCustomizations?.theme) {
        setActiveCustomizations(
          (userRes as any).activeCustomizations.theme,
          (userRes as any).activeCustomizations.badge_frame || activeBadgeFrameKey
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleShareProfile = async () => {
    const username = profileData?.username || user?.username || 'scholar';
    const profileUrl = `https://skilljectory.adtu.in/@${username}`;
    const shareMessage = `🎓 Check out ${profileData?.name || 'Alex Rivera'}'s verified academic mentor profile on SkillJectory: ${profileUrl}`;

    try {
      await Share.share({
        title: `${profileData?.name} (@${username}) - SkillJectory`,
        message: shareMessage,
        url: profileUrl,
      });
    } catch {
      Alert.alert('Profile Link', `Your profile link:\n${profileUrl}`);
    }
  };

  const handleActivateTheme = async (themeKey: string) => {
    setActiveCustomizations(themeKey, activeBadgeFrameKey);
    const opt = customizations.find((c) => c.key === themeKey);
    const targetId = opt?.id || themeKey;
    try {
      await api.activateCustomization(targetId);
    } catch (err: any) {
      console.warn('Backend theme activate notice:', err?.message);
    }
    const themeName =
      themeKey === 'profile_theme_midnight'
        ? 'Midnight OLED'
        : themeKey === 'profile_theme_aurora'
        ? 'Aurora Emerald'
        : 'Sunrise Horizon';
    Alert.alert('Theme Activated! ✨', `Switched active theme to ${themeName}.`);
  };

  const handleActivateBadge = async (badgeKey: string) => {
    setActiveCustomizations(activeThemeKey, badgeKey);
    const opt = customizations.find((c) => c.key === badgeKey);
    const targetId = opt?.id || badgeKey;
    try {
      await api.activateCustomization(targetId);
    } catch (err: any) {
      console.warn('Backend badge activate notice:', err?.message);
    }
    Alert.alert('Badge Frame Updated', `Active avatar frame changed.`);
  };

  const handleUnlockCustomization = async (item: CustomizationOptionDto) => {
    try {
      setActionLoading(true);
      await api.unlockCustomization(item.id);
      Alert.alert('Unlocked!', `You unlocked ${item.label}.`);
      fetchProfileData();
    } catch (err: any) {
      Alert.alert('Unlock Notice', err.message || 'Could not complete unlock.');
    } finally {
      setActionLoading(false);
    }
  };

  const isAdmin = user?.username === 'admin' || user?.email === 'admin@adtu.in';
  const currentBalance = profileData?.creditBalance ?? user?.creditBalance ?? (isAdmin ? 999.0 : 3.0);
  const sessionsCount = profileData?.sessionsTaughtCount ?? 0;
  const teachingHours = (profileData?.totalSessionHours ?? 0).toFixed(1);
  const peerRating = sessionsCount > 0 ? ((profileData as any)?.rating || '4.9') : '—';
  const username = profileData?.username || user?.username || 'scholar';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchProfileData();
          }}
          tintColor="#38BDF8"
        />
      }
    >
      {/* Top Header Navigation: Public View vs Settings Tabs (Artboard Page 9 & 11) */}
      <View style={styles.topTabBar}>
        <TouchableOpacity
          style={[styles.topTabBtn, activeMainTab === 'public_view' ? styles.topTabBtnActive : styles.topTabBtnInactive]}
          onPress={() => setActiveMainTab('public_view')}
          activeOpacity={0.8}
        >
          <User size={15} color={activeMainTab === 'public_view' ? '#FFFFFF' : '#111827'} style={{ marginRight: 6 }} />
          <Text style={[styles.topTabText, activeMainTab === 'public_view' ? styles.topTabTextActive : styles.topTabTextInactive]}>
            Public
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topTabBtn, activeMainTab === 'settings' ? styles.topTabBtnActive : styles.topTabBtnInactive]}
          onPress={() => setActiveMainTab('settings')}
          activeOpacity={0.8}
        >
          <Settings size={15} color={activeMainTab === 'settings' ? '#FFFFFF' : '#111827'} style={{ marginRight: 6 }} />
          <Text style={[styles.topTabText, activeMainTab === 'settings' ? styles.topTabTextActive : styles.topTabTextInactive]}>
            Settings
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutPill}
          onPress={() => {
            Alert.alert('Sign Out', 'Do you want to log out of your account?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Log Out', style: 'destructive', onPress: logout },
            ]);
          }}
          activeOpacity={0.8}
        >
          <LogOut size={13} color="#DC2626" style={{ marginRight: 4 }} />
          <Text style={styles.logoutPillText}>Exit</Text>
        </TouchableOpacity>
      </View>

      {/* =========================================================================
          VIEW 1: PUBLIC PROFILE VIEW (Viewed like any other profile)
      ========================================================================= */}
      {activeMainTab === 'public_view' && (
        <View style={styles.publicViewContainer}>
          {/* Cover & Identity Card */}
          <View style={[styles.profileHeroCard, { backgroundColor: theme.heroCardBg, borderColor: theme.heroBorder }]}>
            {/* Top Cover Banner (Increased Height & Active Theme Palette) */}
            <View style={[styles.coverBanner, { backgroundColor: theme.bannerBg }]}>
              {/* Decorative Theme Graphics Layer */}
              <View style={styles.bannerDecorLayer} pointerEvents="none">
                <Svg width="100%" height={165} viewBox="0 0 400 165">
                  <Defs>
                    <SvgGradient id="profileBannerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor={theme.bannerGradient[0] || theme.bannerBg} stopOpacity="0.95" />
                      <Stop offset="50%" stopColor={theme.bannerGradient[1] || theme.primary} stopOpacity="0.85" />
                      <Stop offset="100%" stopColor={theme.bannerGradient[2] || theme.secondary} stopOpacity="0.95" />
                    </SvgGradient>
                  </Defs>
                  <Rect width="100%" height="165" fill="url(#profileBannerGrad)" />
                  <Circle cx="350" cy="25" r="75" fill={theme.bannerAccent} opacity={0.14} />
                  <Circle cx="385" cy="75" r="115" fill={theme.bannerAccent} opacity={0.08} />
                  <Path d="M -20 125 Q 90 75, 190 105 T 390 85 T 440 120" stroke={theme.bannerAccent} strokeWidth={1.5} opacity={0.25} fill="none" />
                </Svg>
              </View>

              <View style={styles.bannerContentWrap}>
                <View style={styles.bannerTopLine}>
                  <View style={[styles.universityBadge, { backgroundColor: 'rgba(0, 0, 0, 0.32)', borderColor: theme.bannerAccent + '40', borderWidth: 1 }]}>
                    <Text style={[styles.universityBadgeText, { color: theme.bannerAccent }]}>ASSAM DOWN TOWN UNIVERSITY</Text>
                  </View>
                  <View style={[styles.themeIndicatorPill, { backgroundColor: 'rgba(0, 0, 0, 0.28)', borderColor: theme.bannerAccent + '50' }]}>
                    <Sparkles size={11} color={theme.bannerAccent} style={{ marginRight: 4 }} />
                    <Text style={[styles.themeIndicatorText, { color: theme.bannerAccent }]}>{theme.name.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={[styles.departmentBadgeText, { color: theme.bannerSubText }]}>
                  Faculty of Engineering & CS • Peer Academic Network
                </Text>
              </View>
            </View>

            {/* Profile Avatar & Top Action Row */}
            <View style={styles.avatarActionRow}>
              <View style={styles.avatarWrapper}>
                <AvatarWithBadgeFrame
                  name={profileData?.name || 'Alex Rivera'}
                  size={76}
                  badgeFrameKey={activeBadgeFrameKey}
                />
              </View>

              <View style={styles.actionBtnRow}>
                {/* Share Tab / Button */}
                <TouchableOpacity
                  style={[styles.heroShareBtn, { borderColor: theme.primary, backgroundColor: theme.surface }]}
                  onPress={handleShareProfile}
                >
                  <Share2 size={15} color={theme.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.heroShareBtnText, { color: theme.primary }]}>Share Profile</Text>
                </TouchableOpacity>

                {/* Settings Tab / Button */}
                <TouchableOpacity
                  style={[styles.heroSettingsBtn, { backgroundColor: theme.surfaceLight, borderColor: theme.border }]}
                  onPress={() => setActiveMainTab('settings')}
                >
                  <Settings size={15} color={theme.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Real Name & Unique Username */}
            <View style={styles.namesBlock}>
              <View style={styles.realNameRow}>
                <Text style={[styles.heroRealName, { color: theme.text }]}>{profileData?.name || 'Alex Rivera'}</Text>
                <View style={[styles.verifiedPill, { backgroundColor: theme.badgeBg }]}>
                  <ShieldCheck size={12} color={theme.badgeText} />
                  <Text style={[styles.verifiedText, { color: theme.badgeText }]}>Verified</Text>
                </View>
              </View>

              <Text style={[styles.heroUsername, { color: theme.primary }]}>@{username}</Text>
              <Text style={[styles.heroStudentId, { color: theme.textSecondary }]}>
                Student ID: {profileData?.studentId || user?.studentId || 'Assigned on Verification'} • {profileData?.course || user?.course || 'B.Tech CSE'}
              </Text>
            </View>

            {/* Bio */}
            <Text style={[styles.heroBio, { color: theme.textSecondary }]}>
              {profileData?.bio ||
                `Student of ${profileData?.course || user?.course || 'B.Tech'} at Assam Down Town University. Eager to collaborate, teach, and learn.`}
            </Text>

            {/* 4-Stat Strip */}
            <View style={[styles.statsStrip, { backgroundColor: theme.surfaceLight, borderColor: theme.border }]}>
              <View style={styles.statBox}>
                <Clock size={16} color={theme.primary} />
                <Text style={[styles.statNumber, { color: theme.text }]}>{teachingHours}h</Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Teaching Hours</Text>
              </View>

              <View style={styles.statBox}>
                <Award size={16} color={theme.secondary} />
                <Text style={[styles.statNumber, { color: theme.text }]}>{sessionsCount}</Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Sessions Hosted</Text>
              </View>

              <View style={styles.statBox}>
                <Star size={16} color="#FBBF24" />
                <Text style={[styles.statNumber, { color: theme.text }]}>{peerRating}</Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Peer Rating</Text>
              </View>

              <View style={styles.statBox}>
                <Coins size={16} color={theme.primary} />
                <Text style={[styles.statNumber, { color: theme.text }]}>{currentBalance.toFixed(1)}</Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Time-Credits</Text>
              </View>
            </View>
          </View>

          {/* Core Competencies & Skills Tags */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Tag size={16} color="#38BDF8" style={{ marginRight: 6 }} />
              <Text style={styles.sectionCardTitle}>TEACHING SKILLS & SPECIALTIES</Text>
            </View>
            <View style={styles.skillsTagWrap}>
              {(profileData?.teachSkills && profileData.teachSkills.length > 0
                ? profileData.teachSkills
                : user?.teachSkills && user.teachSkills.length > 0
                ? user.teachSkills
                : ['React Native', 'Data Structures', 'Peer Mentoring']
              ).map((skill, i) => (
                <View key={i} style={styles.skillPill}>
                  <Text style={styles.skillPillText}>#{skill}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Verified Badges Showcase */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Award size={16} color="#FBBF24" style={{ marginRight: 6 }} />
              <Text style={styles.sectionCardTitle}>VERIFIED ACADEMIC BADGES</Text>
            </View>
            {(profileData?.badges || []).length > 0 ? (
              <View style={styles.badgesList}>
                {(profileData?.badges || []).map((badge) => (
                  <View key={badge.id} style={styles.badgeItem}>
                    <View style={styles.badgeIconCircle}>
                      <Text style={styles.badgeIconText}>🎖️</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.badgeName}>{badge.name}</Text>
                      <Text style={styles.badgeSub}>
                        Earned: {new Date(badge.earnedAt).toLocaleDateString([], { month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ color: '#64748B', fontSize: 12, textAlign: 'center' }}>
                  No badges earned yet. Complete peer sessions and mentor students to earn verified campus badges!
                </Text>
              </View>
            )}
          </View>

          {/* Social Links */}
          <SocialLinksEditor
            links={profileData?.socialLinks || []}
            onLinksUpdated={fetchProfileData}
          />

          {/* Fast Link to Settings */}
          <TouchableOpacity
            style={styles.openSettingsBannerBtn}
            onPress={() => setActiveMainTab('settings')}
          >
            <Settings size={16} color="#38BDF8" style={{ marginRight: 8 }} />
            <Text style={styles.openSettingsBannerText}>
              Manage Wallet, Customize Profile, Export Resume (.png)
            </Text>
            <ArrowRight size={16} color="#38BDF8" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      )}

      {/* =========================================================================
          VIEW 2: PROFILE SETTINGS & WALLET
      ========================================================================= */}
      {activeMainTab === 'settings' && (
        <View style={styles.settingsViewContainer}>
          {/* Header Title with Signature Curved BrandUnderline (Artboard Pages 11 - 15) */}
          <View style={styles.settingsTitleRow}>
            {settingsSubTab === 'wallet' && (
              <View style={styles.titleWithUnderline}>
                <Text style={styles.settingsHeaderTitle}>Wallet & </Text>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.settingsHeaderTitle}>credits</Text>
                  <BrandUnderline width={68} style={{ marginTop: 2 }} />
                </View>
              </View>
            )}
            {settingsSubTab === 'customization' && (
              <View style={styles.titleWithUnderline}>
                <Text style={styles.settingsHeaderTitle}>Customize </Text>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.settingsHeaderTitle}>profile</Text>
                  <BrandUnderline width={68} style={{ marginTop: 2 }} />
                </View>
              </View>
            )}
            {settingsSubTab === 'history' && (
              <View style={styles.titleWithUnderline}>
                <Text style={styles.settingsHeaderTitle}>Session </Text>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.settingsHeaderTitle}>history</Text>
                  <BrandUnderline width={68} style={{ marginTop: 2 }} />
                </View>
              </View>
            )}
            {settingsSubTab === 'resume' && (
              <View style={styles.titleWithUnderline}>
                <Text style={styles.settingsHeaderTitle}>Export </Text>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.settingsHeaderTitle}>resume</Text>
                  <BrandUnderline width={68} style={{ marginTop: 2 }} />
                </View>
              </View>
            )}
          </View>

          {/* Sub-Tabs: Wallet, Customize, History, Resume (Artboard Pages 11 - 15) */}
          <View style={styles.subTabBarRow}>
            <TouchableOpacity
              style={[styles.subTabPill, settingsSubTab === 'wallet' ? styles.subTabPillActive : styles.subTabPillInactive]}
              onPress={() => setSettingsSubTab('wallet')}
              activeOpacity={0.8}
            >
              <Text style={[styles.subTabPillText, settingsSubTab === 'wallet' ? styles.subTabPillTextActive : styles.subTabPillTextInactive]}>
                Wallet
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.subTabPill, settingsSubTab === 'customization' ? styles.subTabPillActive : styles.subTabPillInactive]}
              onPress={() => setSettingsSubTab('customization')}
              activeOpacity={0.8}
            >
              <Text style={[styles.subTabPillText, settingsSubTab === 'customization' ? styles.subTabPillTextActive : styles.subTabPillTextInactive]}>
                Customize
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.subTabPill, settingsSubTab === 'history' ? styles.subTabPillActive : styles.subTabPillInactive]}
              onPress={() => setSettingsSubTab('history')}
              activeOpacity={0.8}
            >
              <Text style={[styles.subTabPillText, settingsSubTab === 'history' ? styles.subTabPillTextActive : styles.subTabPillTextInactive]}>
                History
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.subTabPill, settingsSubTab === 'resume' ? styles.subTabPillActive : styles.subTabPillInactive]}
              onPress={() => setSettingsSubTab('resume')}
              activeOpacity={0.8}
            >
              <Text style={[styles.subTabPillText, settingsSubTab === 'resume' ? styles.subTabPillTextActive : styles.subTabPillTextInactive]}>
                Resume
              </Text>
            </TouchableOpacity>
          </View>

          {/* SUB-TAB 1: WALLET & CREDITS (Artboard Page 11) */}
          {settingsSubTab === 'wallet' && (
            <View style={styles.walletSection}>
              {/* Lavender Balance Hero Card */}
              <View style={styles.balanceCardLavender}>
                <Text style={styles.balanceSubMuted}>Available time-credits</Text>
                <View style={styles.balanceMainRow}>
                  <Text style={styles.balanceDigits}>{currentBalance.toFixed(1)}</Text>
                  <Text style={styles.balanceUnits}> CREDITS</Text>
                </View>

                <View style={styles.balanceWhitePillRow}>
                  <View style={styles.monthlyRefillPill}>
                    <Calendar size={13} color="#111827" style={{ marginRight: 5 }} />
                    <Text style={styles.refillPillText}>Monthly refill: +2.0 cr</Text>
                  </View>
                  <Text style={styles.rateHintText}>1 credit = 1 hour</Text>
                </View>
              </View>

              {/* Transaction History Section */}
              <View style={styles.ledgerHeaderRow}>
                <Text style={styles.ledgerTitle}>TRANSACTION HISTORY</Text>
                {ledger.length > 3 && (
                  <TouchableOpacity
                    onPress={() => setShowAllLedger(!showAllLedger)}
                    style={styles.toggleLedgerBtn}
                  >
                    <Text style={styles.toggleLedgerText}>
                      {showAllLedger ? 'Show Less' : `View all (${ledger.length}) >`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {(showAllLedger ? ledger : ledger.slice(0, 4)).map((item) => {
                const isEarn = item.amount > 0;
                const dateStr = new Date(item.createdAt).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <View key={item.id} style={styles.transactionCardMint}>
                    <View style={[styles.txIconCircle, isEarn ? styles.txEarnCircle : styles.txSpendCircle]}>
                      {isEarn ? <ArrowDownLeft size={16} color="#0E6245" /> : <ArrowUpRight size={16} color="#DC2626" />}
                    </View>

                    <View style={styles.txInfo}>
                      <Text style={styles.txReason}>
                        {item.humanReadableReason || item.type.replace(/_/g, ' ')}
                      </Text>
                      <Text style={styles.txDate}>{dateStr}</Text>
                    </View>

                    <View style={styles.txAmountCol}>
                      <Text style={[styles.txAmount, isEarn ? styles.txEarnText : styles.txSpendText]}>
                        {isEarn ? `+${item.amount}` : item.amount} cr
                      </Text>
                      <Text style={styles.txBalanceAfter}>{item.balanceAfter} bal</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* SUB-TAB 2: CUSTOMIZE PROFILE (Based on credits & sessions) */}
          {settingsSubTab === 'customization' && (
            <View style={styles.customizationSection}>
              <View style={styles.customizationIntroBox}>
                <Sparkles size={18} color="#FBBF24" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.customizationIntroTitle}>CREDIT & SESSION CUSTOMIZATIONS</Text>
                  <Text style={styles.customizationIntroSub}>
                    Unlock themes and prestige badge frames using your earned credits and verified session history.
                  </Text>
                </View>
              </View>

              {/* Section 1: Themes */}
              <Text style={styles.customCategoryHeading}>PROFILE THEMES</Text>
              <View style={styles.customCardsList}>
                {/* 1. Sunrise Horizon */}
                <View style={styles.customCard}>
                  <View style={styles.customCardLeft}>
                    <View style={[styles.colorPreviewDot, { backgroundColor: '#F59E0B' }]} />
                    <View>
                      <Text style={styles.customCardName}>Sunrise Horizon</Text>
                      <Text style={styles.customCardReq}>Free • Default Theme</Text>
                    </View>
                  </View>
                  {activeThemeKey === 'profile_theme_sunrise' ? (
                    <View style={styles.activePill}>
                      <Check size={12} color="#10B981" style={{ marginRight: 3 }} />
                      <Text style={styles.activePillText}>Active</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.activateBtn}
                      onPress={() => handleActivateTheme('profile_theme_sunrise')}
                    >
                      <Text style={styles.activateBtnText}>Activate</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* 2. Midnight OLED */}
                {(() => {
                  const opt = customizations.find((c) => c.key === 'profile_theme_midnight');
                  const isUnlocked = isAdmin || Boolean(opt?.isUnlocked);
                  const canUnlock = currentBalance >= 2;

                  return (
                    <View style={styles.customCard}>
                      <View style={styles.customCardLeft}>
                        <View style={[styles.colorPreviewDot, { backgroundColor: '#00F0FF' }]} />
                        <View>
                          <Text style={styles.customCardName}>Midnight OLED</Text>
                          <Text style={styles.customCardReq}>2 Credits • Basic Tier</Text>
                        </View>
                      </View>
                      {activeThemeKey === 'profile_theme_midnight' ? (
                        <View style={styles.activePill}>
                          <Check size={12} color="#10B981" style={{ marginRight: 3 }} />
                          <Text style={styles.activePillText}>Active</Text>
                        </View>
                      ) : isUnlocked ? (
                        <TouchableOpacity
                          style={styles.activateBtn}
                          onPress={() => handleActivateTheme('profile_theme_midnight')}
                        >
                          <Text style={styles.activateBtnText}>Activate</Text>
                        </TouchableOpacity>
                      ) : canUnlock ? (
                        <TouchableOpacity
                          style={[styles.activateBtn, { backgroundColor: '#0284C7' }]}
                          onPress={() =>
                            handleUnlockCustomization(
                              opt || {
                                id: 'c2',
                                key: 'profile_theme_midnight',
                                label: 'Midnight OLED',
                                category: CustomizationCategory.THEME,
                                tier: CustomizationTier.BASIC,
                                unlockType: CustomizationUnlockType.CREDITS,
                                unlockValue: 2,
                                isUnlocked: false,
                                isActive: false,
                                progressValue: 0,
                              }
                            )
                          }
                        >
                          <Text style={styles.activateBtnText}>Unlock (2 cr)</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.lockedPill}>
                          <Lock size={12} color="#94A3B8" style={{ marginRight: 4 }} />
                          <Text style={styles.lockedPillText}>Need 2 Credits</Text>
                        </View>
                      )}
                    </View>
                  );
                })()}

                {/* 3. Aurora Emerald */}
                {(() => {
                  const opt = customizations.find((c) => c.key === 'profile_theme_aurora');
                  const isUnlocked = isAdmin || Boolean(opt?.isUnlocked);
                  const canUnlock = sessionsCount >= 4;

                  return (
                    <View style={styles.customCard}>
                      <View style={styles.customCardLeft}>
                        <View style={[styles.colorPreviewDot, { backgroundColor: '#10B981' }]} />
                        <View>
                          <Text style={styles.customCardName}>Aurora Emerald</Text>
                          <Text style={styles.customCardReq}>4 Sessions • Advanced Tier</Text>
                        </View>
                      </View>
                      {activeThemeKey === 'profile_theme_aurora' ? (
                        <View style={styles.activePill}>
                          <Check size={12} color="#10B981" style={{ marginRight: 3 }} />
                          <Text style={styles.activePillText}>Active</Text>
                        </View>
                      ) : isUnlocked ? (
                        <TouchableOpacity
                          style={styles.activateBtn}
                          onPress={() => handleActivateTheme('profile_theme_aurora')}
                        >
                          <Text style={styles.activateBtnText}>Activate</Text>
                        </TouchableOpacity>
                      ) : canUnlock ? (
                        <TouchableOpacity
                          style={[styles.activateBtn, { backgroundColor: '#059669' }]}
                          onPress={() =>
                            handleUnlockCustomization(
                              opt || {
                                id: 'c3',
                                key: 'profile_theme_aurora',
                                label: 'Aurora Emerald',
                                category: CustomizationCategory.THEME,
                                tier: CustomizationTier.ADVANCED,
                                unlockType: CustomizationUnlockType.SESSIONS,
                                unlockValue: 4,
                                isUnlocked: false,
                                isActive: false,
                                progressValue: 0,
                              }
                            )
                          }
                        >
                          <Text style={styles.activateBtnText}>Unlock (4 Sessions)</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.lockedPill}>
                          <Lock size={12} color="#94A3B8" style={{ marginRight: 4 }} />
                          <Text style={styles.lockedPillText}>Host 4+ Sessions ({sessionsCount}/4)</Text>
                        </View>
                      )}
                    </View>
                  );
                })()}
              </View>

              {/* Section 2: Avatar Badge Frames */}
              <Text style={styles.customCategoryHeading}>AVATAR BADGE FRAMES</Text>
              <View style={styles.customCardsList}>
                {/* Standard Frame */}
                <View style={styles.customCard}>
                  <View style={styles.customCardLeft}>
                    <View style={[styles.framePreviewCircle, { borderColor: '#38BDF8' }]} />
                    <View>
                      <Text style={styles.customCardName}>Standard Scholar Frame</Text>
                      <Text style={styles.customCardReq}>Free • Verified Scholar Base</Text>
                    </View>
                  </View>
                  {activeBadgeFrameKey === 'badge_frame_standard' || !activeBadgeFrameKey ? (
                    <View style={styles.activePill}>
                      <Check size={12} color="#10B981" style={{ marginRight: 3 }} />
                      <Text style={styles.activePillText}>Active</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.activateBtn}
                      onPress={() => handleActivateBadge('badge_frame_standard')}
                    >
                      <Text style={styles.activateBtnText}>Activate</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Bronze Mentor Frame */}
                {(() => {
                  const opt = customizations.find((c) => c.key === 'badge_frame_bronze');
                  const isUnlocked = isAdmin || Boolean(opt?.isUnlocked);
                  const canUnlock = currentBalance >= 3;

                  return (
                    <View style={styles.customCard}>
                      <View style={styles.customCardLeft}>
                        <View style={[styles.framePreviewCircle, { borderColor: '#CD7F32' }]} />
                        <View>
                          <Text style={styles.customCardName}>Bronze Mentor Frame</Text>
                          <Text style={styles.customCardReq}>3 Credits • Basic Tier</Text>
                        </View>
                      </View>
                      {activeBadgeFrameKey === 'badge_frame_bronze' ? (
                        <View style={styles.activePill}>
                          <Check size={12} color="#10B981" style={{ marginRight: 3 }} />
                          <Text style={styles.activePillText}>Active</Text>
                        </View>
                      ) : isUnlocked ? (
                        <TouchableOpacity
                          style={styles.activateBtn}
                          onPress={() => handleActivateBadge('badge_frame_bronze')}
                        >
                          <Text style={styles.activateBtnText}>Activate</Text>
                        </TouchableOpacity>
                      ) : canUnlock ? (
                        <TouchableOpacity
                          style={[styles.activateBtn, { backgroundColor: '#CD7F32' }]}
                          onPress={() =>
                            handleUnlockCustomization(
                              opt || {
                                id: 'c5',
                                key: 'badge_frame_bronze',
                                label: 'Bronze Mentor Frame',
                                category: CustomizationCategory.BADGE_FRAME,
                                tier: CustomizationTier.BASIC,
                                unlockType: CustomizationUnlockType.CREDITS,
                                unlockValue: 3,
                                isUnlocked: false,
                                isActive: false,
                                progressValue: 0,
                              }
                            )
                          }
                        >
                          <Text style={styles.activateBtnText}>Unlock (3 cr)</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.lockedPill}>
                          <Lock size={12} color="#94A3B8" style={{ marginRight: 4 }} />
                          <Text style={styles.lockedPillText}>Need 3 Credits</Text>
                        </View>
                      )}
                    </View>
                  );
                })()}

                {/* Gold Prestige Crown Frame */}
                {(() => {
                  const opt = customizations.find((c) => c.key === 'badge_frame_gold');
                  const isUnlocked = isAdmin || Boolean(opt?.isUnlocked);
                  const canUnlock = sessionsCount >= 6;

                  return (
                    <View style={styles.customCard}>
                      <View style={styles.customCardLeft}>
                        <View style={[styles.framePreviewCircle, { borderColor: '#F59E0B' }]} />
                        <View>
                          <Text style={styles.customCardName}>Gold Prestige Crown 👑</Text>
                          <Text style={styles.customCardReq}>6 Sessions Hosted • Master Tier</Text>
                        </View>
                      </View>
                      {activeBadgeFrameKey === 'badge_frame_gold' ? (
                        <View style={styles.activePill}>
                          <Check size={12} color="#10B981" style={{ marginRight: 3 }} />
                          <Text style={styles.activePillText}>Active</Text>
                        </View>
                      ) : isUnlocked ? (
                        <TouchableOpacity
                          style={[styles.activateBtn, { backgroundColor: '#F59E0B' }]}
                          onPress={() => handleActivateBadge('badge_frame_gold')}
                        >
                          <Text style={[styles.activateBtnText, { color: '#000000' }]}>Activate</Text>
                        </TouchableOpacity>
                      ) : canUnlock ? (
                        <TouchableOpacity
                          style={[styles.activateBtn, { backgroundColor: '#F59E0B' }]}
                          onPress={() =>
                            handleUnlockCustomization(
                              opt || {
                                id: 'c6',
                                key: 'badge_frame_gold',
                                label: 'Gold Prestige Crown Frame',
                                category: CustomizationCategory.BADGE_FRAME,
                                tier: CustomizationTier.ADVANCED,
                                unlockType: CustomizationUnlockType.SESSIONS,
                                unlockValue: 6,
                                isUnlocked: false,
                                isActive: false,
                                progressValue: 0,
                              }
                            )
                          }
                        >
                          <Text style={[styles.activateBtnText, { color: '#000000' }]}>Unlock (6 Sessions)</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.lockedPill}>
                          <Lock size={12} color="#94A3B8" style={{ marginRight: 4 }} />
                          <Text style={styles.lockedPillText}>Host 6+ Sessions ({sessionsCount}/6)</Text>
                        </View>
                      )}
                    </View>
                  );
                })()}
              </View>
            </View>
          )}

          {/* SUB-TAB 3: SESSION HISTORY (Concluded & Cancelled Sessions) */}
          {settingsSubTab === 'history' && (() => {
            const historySessions = mySessions.filter(
              (s) =>
                s.status === 'completed' ||
                s.status === 'cancelled' ||
                (s.status as any) === SessionStatus.COMPLETED ||
                (s.status as any) === SessionStatus.CANCELLED
            );

            return (
              <View style={styles.historySection}>
                <Text style={styles.customCategoryHeading}>
                  SESSION RECORD ({historySessions.length} SESSIONS)
                </Text>

                {historySessions.length === 0 ? (
                  <View style={styles.emptySessionsCard}>
                    <Text style={styles.emptySessionsText}>
                      No concluded or cancelled sessions recorded yet. Completed and cancelled sessions appear here.
                    </Text>
                  </View>
                ) : (
                  historySessions.map((s) => (
                    <View key={s.id} style={styles.historySessionCard}>
                      <View style={styles.historyCardTop}>
                        <Text style={styles.historySessionTitle}>{s.title || s.skillName}</Text>
                        <View style={[styles.sessionStatusPill, s.status === 'completed' ? styles.statusDone : styles.statusSched]}>
                          <Text style={styles.sessionStatusPillText}>{s.status.toUpperCase()}</Text>
                        </View>
                      </View>

                      <Text style={styles.historyHostText}>
                        Host: {s.hostName} (@{s.hostUsername || 'host'})
                      </Text>

                      <View style={styles.historyMetaRow}>
                        <Calendar size={12} color="#38BDF8" style={{ marginRight: 4 }} />
                        <Text style={styles.historyMetaText}>
                          {new Date(s.scheduledAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          • {s.durationHours} Hours • {s.sessionType}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            );
          })()}

          {/* SUB-TAB 4: EXPORT RESUME (.png) */}
          {settingsSubTab === 'resume' && (
            <View style={styles.resumeSection}>
              {/* Config Header */}
              <View style={styles.resumeConfigHeader}>
                <Sparkles size={20} color={RESUME_THEMES[resumeTheme].secondary} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.resumeConfigTitle}>Academic Resume Customizer</Text>
                  <Text style={styles.resumeConfigSub}>
                    Select a visual theme and choose which verified sections to include on your official resume PNG
                  </Text>
                </View>
              </View>

              {/* 1. Theme Palette Selector */}
              <Text style={styles.resumePickerLabel}>SELECT RESUME PALETTE</Text>
              <View style={styles.resumeThemeGrid}>
                {(Object.keys(RESUME_THEMES) as ResumeThemeKey[]).map((tKey) => {
                  const t = RESUME_THEMES[tKey];
                  const isSelected = resumeTheme === tKey;
                  return (
                    <TouchableOpacity
                      key={tKey}
                      style={[
                        styles.resumeThemeCard,
                        { borderColor: isSelected ? t.secondary : '#1E293B' },
                        isSelected && { backgroundColor: `${t.primary}22` },
                      ]}
                      onPress={() => setResumeTheme(tKey)}
                    >
                      <View style={[styles.resumeThemeColorCircle, { backgroundColor: t.secondary }]}>
                        {isSelected && <Check size={12} color="#FFFFFF" />}
                      </View>
                      <Text style={[styles.resumeThemeName, isSelected && { color: t.secondary }]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 2. Customization Toggles */}
              <Text style={styles.resumePickerLabel}>CUSTOMIZE RESUME SECTIONS</Text>
              <View style={styles.resumeTogglesCard}>
                <View style={styles.resumeToggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resumeToggleLabel}>Include Teaching Statement & Bio</Text>
                    <Text style={styles.resumeToggleSub}>Display your philosophy and peer teaching intro</Text>
                  </View>
                  <Switch
                    value={resumeShowBio}
                    onValueChange={setResumeShowBio}
                    trackColor={{ false: '#334155', true: RESUME_THEMES[resumeTheme].primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.resumeToggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resumeToggleLabel}>Include Verified Session Stats</Text>
                    <Text style={styles.resumeToggleSub}>Show teaching hours and workshop totals</Text>
                  </View>
                  <Switch
                    value={resumeShowStats}
                    onValueChange={setResumeShowStats}
                    trackColor={{ false: '#334155', true: RESUME_THEMES[resumeTheme].primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.resumeToggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resumeToggleLabel}>Include Student Review Rating</Text>
                    <Text style={styles.resumeToggleSub}>Show 4.9 ★ and peer satisfaction score</Text>
                  </View>
                  <Switch
                    value={resumeShowRating}
                    onValueChange={setResumeShowRating}
                    trackColor={{ false: '#334155', true: RESUME_THEMES[resumeTheme].primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.resumeToggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resumeToggleLabel}>Include Core Competency Skills</Text>
                    <Text style={styles.resumeToggleSub}>Display verified topic chips</Text>
                  </View>
                  <Switch
                    value={resumeShowSkills}
                    onValueChange={setResumeShowSkills}
                    trackColor={{ false: '#334155', true: RESUME_THEMES[resumeTheme].primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={[styles.resumeToggleRow, { borderBottomWidth: 0 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resumeToggleLabel}>Include Academic Honors & Badges</Text>
                    <Text style={styles.resumeToggleSub}>Display earned scholar milestone badges</Text>
                  </View>
                  <Switch
                    value={resumeShowBadges}
                    onValueChange={setResumeShowBadges}
                    trackColor={{ false: '#334155', true: RESUME_THEMES[resumeTheme].primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* 3. Live Preview Card */}
              <Text style={styles.resumePickerLabel}>LIVE RESUME PREVIEW</Text>
              <View
                style={[
                  styles.resumePreviewCard,
                  {
                    borderColor: RESUME_THEMES[resumeTheme].secondary,
                    backgroundColor: RESUME_THEMES[resumeTheme].bgDark,
                  },
                ]}
              >
                <View style={styles.resumeHeaderRow}>
                  <View style={[styles.resumeHeaderBadge, { backgroundColor: RESUME_THEMES[resumeTheme].primary }]}>
                    <Text style={styles.resumeHeaderBadgeText}>OFFICIAL ACADEMIC CREDENTIAL</Text>
                  </View>
                  <Text style={styles.resumeDateText}>{new Date().toLocaleDateString()}</Text>
                </View>

                <Text style={styles.resumeTitleText}>ACADEMIC PEER MENTOR RESUME</Text>
                <Text style={[styles.resumeScholarName, { color: RESUME_THEMES[resumeTheme].textPrimary }]}>
                  {profileData?.name || user?.name || 'Alex Rivera'}
                </Text>
                <Text style={[styles.resumeUsernameText, { color: RESUME_THEMES[resumeTheme].secondary }]}>
                  @{username}
                </Text>
                <Text style={styles.resumeStudentIdText}>
                  Assam Down Town University • ID: {profileData?.studentId || user?.studentId || 'CS-2024-889'}
                </Text>

                {/* Optional: Bio statement in preview */}
                {resumeShowBio && (
                  <View style={[styles.resumePreviewBioBox, { borderColor: RESUME_THEMES[resumeTheme].cardBorder }]}>
                    <Text style={[styles.resumePreviewBioTitle, { color: RESUME_THEMES[resumeTheme].secondary }]}>
                      TEACHING STATEMENT
                    </Text>
                    <Text style={styles.resumePreviewBioText}>
                      {profileData?.bio ||
                        'Campus peer mentor specializing in React Native, mobile performance, and distributed systems.'}
                    </Text>
                  </View>
                )}

                {/* Optional: Resume Stats */}
                {resumeShowStats && (
                  <View style={styles.resumeStatsRow}>
                    <View style={styles.resumeStatItem}>
                      <Text style={styles.resumeStatVal}>{profileData?.totalSessionHours || 18.5} hrs</Text>
                      <Text style={styles.resumeStatLbl}>Teaching Hours</Text>
                    </View>
                    <View style={styles.resumeStatItem}>
                      <Text style={styles.resumeStatVal}>{sessionsCount}</Text>
                      <Text style={styles.resumeStatLbl}>Workshops</Text>
                    </View>
                    {resumeShowRating && (
                      <View style={styles.resumeStatItem}>
                        <Text style={styles.resumeStatVal}>4.9 ★</Text>
                        <Text style={styles.resumeStatLbl}>Student Rating</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Optional: Skills Chips */}
                {resumeShowSkills && (
                  <View style={styles.resumePreviewSectionRow}>
                    <Text style={[styles.resumePreviewSecHeading, { color: RESUME_THEMES[resumeTheme].secondary }]}>
                      TOPICS:
                    </Text>
                    <View style={styles.resumeSkillsChipRow}>
                      {['React Native', 'Data Structures', 'PostgreSQL', 'UI/UX Design', 'System Architecture'].map((sk, idx) => (
                        <View key={idx} style={[styles.resumeSkillChip, { borderColor: RESUME_THEMES[resumeTheme].secondary }]}>
                          <Text style={[styles.resumeSkillChipText, { color: RESUME_THEMES[resumeTheme].secondary }]}>
                            {sk}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Optional: Badges Chips */}
                {resumeShowBadges && (
                  <View style={styles.resumePreviewSectionRow}>
                    <Text style={[styles.resumePreviewSecHeading, { color: RESUME_THEMES[resumeTheme].secondary }]}>
                      HONORS:
                    </Text>
                    <View style={styles.resumeSkillsChipRow}>
                      {(profileData?.badges?.map((b) => b.name) || ['Mentor Level 2 — Dedicated Scholar', 'Fast Learner']).map((b, idx) => (
                        <View key={idx} style={[styles.resumeBadgeChip, { borderColor: RESUME_THEMES[resumeTheme].accent }]}>
                          <Text style={styles.resumeBadgeChipText}>🏅 {b}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Clean Institutional Attestation Footer - NO CRYPTOGRAPHIC AUDITED THING */}
                <View style={styles.resumeAttestationFooter}>
                  <CheckCircle size={14} color={RESUME_THEMES[resumeTheme].secondary} style={{ marginRight: 6 }} />
                  <Text style={styles.resumeAttestationText}>
                    Officially attested by Assam Down Town University Peer Mentorship Program
                  </Text>
                </View>
              </View>

              {/* 4. Action Button: Generates and downloads genuine PNG file with active options */}
              <TouchableOpacity
                style={[
                  styles.exportPngBtn,
                  { backgroundColor: RESUME_THEMES[resumeTheme].primary, opacity: actionLoading ? 0.7 : 1 },
                ]}
                disabled={actionLoading}
                onPress={async () => {
                  try {
                    setActionLoading(true);
                    await generateResumePng({
                      name: profileData?.name || user?.name || 'Alex Rivera',
                      username: username,
                      studentId: profileData?.studentId || user?.studentId || 'CS-2024-889',
                      department: 'Computer Science & Engineering',
                      bio:
                        profileData?.bio ||
                        'Campus peer mentor specializing in React Native, mobile performance, and distributed systems. 20+ hours peer teaching.',
                      hours: profileData?.totalSessionHours || 18.5,
                      sessions: sessionsCount,
                      rating: 4.9,
                      skills: ['React Native', 'Data Structures', 'PostgreSQL', 'UI/UX Design', 'System Architecture'],
                      badges: profileData?.badges?.map((b) => b.name) || ['Mentor Level 2 — Dedicated Scholar', 'Fast Learner'],
                      theme: resumeTheme,
                      showBio: resumeShowBio,
                      showStats: resumeShowStats,
                      showRating: resumeShowRating,
                      showSkills: resumeShowSkills,
                      showBadges: resumeShowBadges,
                    });
                  } catch (err: any) {
                    Alert.alert('Notice', err.message || 'Could not export resume PNG');
                  } finally {
                    setActionLoading(false);
                  }
                }}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                ) : (
                  <Download size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                )}
                <Text style={styles.exportPngBtnText}>
                  {actionLoading ? 'Generating High-Res PNG...' : 'Download Styled Resume as PNG Image'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  // Top Tabs (Artboard Page 9)
  topTabBar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  topTabBtn: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTabBtnActive: {
    backgroundColor: '#18201D',
  },
  topTabBtnInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  topTabText: {
    fontSize: 13,
  },
  topTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  topTabTextInactive: {
    color: '#111827',
    fontWeight: '600',
  },
  logoutPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  logoutPillText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
  // Public Profile View (Page 9)
  publicViewContainer: {
    gap: 16,
  },
  profileHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  coverBanner: {
    height: 165,
    padding: 16,
    paddingBottom: 48,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  bannerDecorLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bannerContentWrap: {
    flex: 1,
    justifyContent: 'space-between',
    zIndex: 2,
  },
  bannerTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  themeIndicatorText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  universityBadge: {
    alignSelf: 'flex-start',
    marginBottom: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  universityBadgeText: {
    color: '#FEF3C7',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  departmentBadgeText: {
    color: '#D1FAE5',
    fontSize: 12,
    fontWeight: '600',
  },
  avatarActionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: -44,
    marginBottom: 12,
    zIndex: 10,
  },
  avatarWrapper: {},
  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#0E6245',
  },
  heroShareBtnText: {
    color: '#0E6245',
    fontSize: 12,
    fontWeight: '700',
  },
  heroSettingsBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  namesBlock: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  realNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroRealName: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '800',
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EBF7F0',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  verifiedText: {
    color: '#0E6245',
    fontSize: 11,
    fontWeight: '700',
  },
  heroUsername: {
    color: '#0E6245',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  heroStudentId: {
    color: '#5A6561',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  heroBio: {
    color: '#374151',
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statsStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAF9',
    borderRadius: 18,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  statLabel: {
    color: '#5A6561',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  // Generic Section Card (Page 9 & 10)
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionCardTitle: {
    color: '#5A6561',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  skillsTagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillPill: {
    backgroundColor: '#F8FAF9',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  skillPillText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '700',
  },
  badgesList: {
    gap: 10,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF7F0',
    borderRadius: 16,
    padding: 12,
  },
  badgeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF7DA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeIconText: {
    fontSize: 16,
  },
  badgeName: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
  },
  badgeSub: {
    color: '#5A6561',
    fontSize: 11,
    marginTop: 2,
  },
  openSettingsBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EBF7F0',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#0E6245',
  },
  openSettingsBannerText: {
    color: '#0E6245',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  // Settings View
  settingsViewContainer: {
    gap: 16,
  },
  settingsTitleRow: {
    marginBottom: 4,
  },
  titleWithUnderline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsHeaderTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  subTabBarRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  subTabPill: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subTabPillActive: {
    backgroundColor: '#18201D',
  },
  subTabPillInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  subTabPillText: {
    fontSize: 13,
  },
  subTabPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  subTabPillTextInactive: {
    color: '#111827',
    fontWeight: '600',
  },
  // Wallet
  walletSection: {
    gap: 12,
  },
  balanceCardLavender: {
    backgroundColor: '#F2EEFD',
    borderRadius: 22,
    padding: 18,
    marginBottom: 8,
  },
  balanceSubMuted: {
    color: '#5A6561',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  balanceMainRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  balanceDigits: {
    color: '#111827',
    fontSize: 34,
    fontWeight: '900',
  },
  balanceUnits: {
    color: '#7C3AED',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  balanceWhitePillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthlyRefillPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  refillPillText: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '700',
  },
  rateHintText: {
    color: '#5A6561',
    fontSize: 11,
    fontWeight: '600',
  },
  ledgerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 6,
  },
  ledgerTitle: {
    color: '#5A6561',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  toggleLedgerBtn: {},
  toggleLedgerText: {
    color: '#0E6245',
    fontSize: 12,
    fontWeight: '700',
  },
  transactionCardMint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF7F0',
    borderRadius: 18,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  txIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  txEarnCircle: {},
  txSpendCircle: {},
  txInfo: {
    flex: 1,
  },
  txReason: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
  },
  txDate: {
    color: '#5A6561',
    fontSize: 11,
    marginTop: 2,
  },
  txAmountCol: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  txEarnText: {
    color: '#0E6245',
  },
  txSpendText: {
    color: '#DC2626',
  },
  txBalanceAfter: {
    color: '#5A6561',
    fontSize: 11,
    marginTop: 1,
  },
  // Customization Section
  customizationSection: {
    gap: 12,
  },
  customizationIntroBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2EEFD',
    borderRadius: 20,
    padding: 16,
    marginBottom: 8,
  },
  customizationIntroTitle: {
    color: '#7C3AED',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  customizationIntroSub: {
    color: '#111827',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  customCategoryHeading: {
    color: '#5A6561',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 6,
  },
  customCardsList: {
    gap: 8,
  },
  customCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EBF7F0',
    borderRadius: 18,
    padding: 14,
    marginBottom: 6,
  },
  customCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorPreviewDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  framePreviewCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    backgroundColor: '#FFFFFF',
  },
  customCardName: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  customCardReq: {
    color: '#5A6561',
    fontSize: 11,
    marginTop: 2,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  activePillText: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '800',
  },
  activateBtn: {
    backgroundColor: '#18201D',
    borderRadius: 14,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  activateBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  lockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  lockedPillText: {
    color: '#5A6561',
    fontSize: 11,
    fontWeight: '600',
  },
  // Session History
  historySection: {
    gap: 10,
  },
  emptySessionsCard: {
    backgroundColor: '#EBF7F0',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
  },
  emptySessionsText: {
    color: '#5A6561',
    fontSize: 13,
    textAlign: 'center',
  },
  historySessionCard: {
    backgroundColor: '#EBF7F0',
    borderRadius: 20,
    padding: 16,
    marginBottom: 8,
  },
  historyCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historySessionTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  },
  sessionStatusPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statusDone: {},
  statusSched: {},
  sessionStatusPillText: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '800',
  },
  historyHostText: {
    color: '#5A6561',
    fontSize: 12,
    marginBottom: 8,
  },
  historyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  historyMetaText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '600',
  },
  // Resume Export Customizer & Styles
  resumeSection: {
    gap: 14,
  },
  resumeConfigHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2EEFD',
    borderRadius: 20,
    padding: 16,
    marginBottom: 8,
  },
  resumeConfigTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },
  resumeConfigSub: {
    color: '#5A6561',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  resumePickerLabel: {
    color: '#5A6561',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 6,
    marginBottom: 6,
  },
  resumeThemeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  resumeThemeCard: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8E5',
    gap: 8,
  },
  resumeThemeColorCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resumeThemeName: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
  },
  resumeTogglesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  resumeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  resumeToggleLabel: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
  },
  resumeToggleSub: {
    color: '#5A6561',
    fontSize: 11,
    marginTop: 2,
  },
  resumePreviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#0E6245',
  },
  resumeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resumeHeaderBadge: {
    backgroundColor: '#0284C7',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  resumeHeaderBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  resumeDateText: {
    color: '#5A6561',
    fontSize: 12,
    fontWeight: '600',
  },
  resumeTitleText: {
    color: '#5A6561',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 8,
  },
  resumeScholarName: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  resumeUsernameText: {
    color: '#0E6245',
    fontSize: 13,
    fontWeight: '700',
  },
  resumeStudentIdText: {
    color: '#5A6561',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  resumePreviewBioBox: {
    backgroundColor: '#EBF7F0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  resumePreviewBioTitle: {
    color: '#0E6245',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  resumePreviewBioText: {
    color: '#111827',
    fontSize: 12,
    lineHeight: 16,
  },
  resumeStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    backgroundColor: '#EBF7F0',
    borderRadius: 14,
    padding: 12,
  },
  resumeStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  resumeStatVal: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  resumeStatLbl: {
    color: '#5A6561',
    fontSize: 10,
    marginTop: 2,
  },
  resumePreviewSectionRow: {
    marginBottom: 10,
  },
  resumePreviewSecHeading: {
    color: '#5A6561',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  resumeSkillsChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  resumeSkillChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  resumeSkillChipText: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '700',
  },
  resumeBadgeChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8E5',
    marginBottom: 4,
  },
  resumeBadgeChipText: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '700',
  },
  resumeAttestationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF7F0',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    gap: 8,
  },
  resumeAttestationText: {
    color: '#0E6245',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  exportPngBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0E6245',
    borderRadius: 22,
    height: 48,
    marginTop: 16,
  },
  exportPngBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
