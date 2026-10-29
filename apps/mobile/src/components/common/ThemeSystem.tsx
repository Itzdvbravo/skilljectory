import React from 'react';
import { View, Text, StyleSheet, Image, StyleProp, ViewStyle } from 'react-native';
import { useAuthStore } from '../../store/authStore';

import Svg, { Path } from 'react-native-svg';

export interface ThemeColors {
  name: string;
  background: string;
  surface: string;
  surfaceLight: string;
  surfaceMint: string;
  surfaceRose: string;
  surfacePurple: string;
  surfaceYellow: string;
  surfaceMuted: string;
  primary: string;
  primaryGlow: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  pillDark: string;
  // Banner and theme specific tokens
  bannerBg: string;
  bannerGradient: string[];
  bannerAccent: string;
  bannerSubText: string;
  heroCardBg: string;
  heroBorder: string;
  badgeBg: string;
  badgeText: string;
}

export const SUNRISE_THEME: ThemeColors = {
  name: 'Sunrise Horizon',
  background: '#FFFBEB',
  surface: '#FFFFFF',
  surfaceLight: '#FFF7ED',
  surfaceMint: '#FEF3C7',
  surfaceRose: '#FEE2E2',
  surfacePurple: '#FFEDD5',
  surfaceYellow: '#FEF3C7',
  surfaceMuted: '#FDF4E7',
  primary: '#D97706',
  primaryGlow: 'rgba(217, 119, 6, 0.2)',
  primaryDark: '#B45309',
  secondary: '#F59E0B',
  accent: '#EA580C',
  text: '#1E1B4B',
  textSecondary: '#451A03',
  textMuted: '#78350F',
  border: '#FDE68A',
  pillDark: '#78350F',
  bannerBg: '#C2410C',
  bannerGradient: ['#9A3412', '#EA580C', '#F59E0B'],
  bannerAccent: '#FEF3C7',
  bannerSubText: '#FDE68A',
  heroCardBg: '#FFFFFF',
  heroBorder: '#FCD34D',
  badgeBg: '#FEF3C7',
  badgeText: '#92400E',
};

export const MIDNIGHT_THEME: ThemeColors = {
  name: 'Midnight OLED',
  background: '#030712',
  surface: '#0B1120',
  surfaceLight: '#111827',
  surfaceMint: '#0C2340',
  surfaceRose: '#2A1215',
  surfacePurple: '#1C1536',
  surfaceYellow: '#2A2008',
  surfaceMuted: '#0F172A',
  primary: '#00F0FF',
  primaryGlow: 'rgba(0, 240, 255, 0.28)',
  primaryDark: '#0284C7',
  secondary: '#38BDF8',
  accent: '#00F0FF',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#1E293B',
  pillDark: '#0284C7',
  bannerBg: '#050814',
  bannerGradient: ['#030712', '#0B1120', '#0284C7'],
  bannerAccent: '#00F0FF',
  bannerSubText: '#7DD3FC',
  heroCardBg: '#0B1120',
  heroBorder: '#1E293B',
  badgeBg: 'rgba(0, 240, 255, 0.14)',
  badgeText: '#00F0FF',
};

export const AURORA_THEME: ThemeColors = {
  name: 'Aurora Emerald',
  background: '#F8FAF9',
  surface: '#FFFFFF',
  surfaceLight: '#F3F6F4',
  surfaceMint: '#EBF7F0',
  surfaceRose: '#FDE8EE',
  surfacePurple: '#F2EEFD',
  surfaceYellow: '#FEF7DA',
  surfaceMuted: '#EFF3F1',
  primary: '#0E6245',
  primaryGlow: 'rgba(14, 98, 69, 0.15)',
  primaryDark: '#084832',
  secondary: '#10B981',
  accent: '#059669',
  text: '#111827',
  textSecondary: '#374151',
  textMuted: '#6B7280',
  border: '#E2E8E5',
  pillDark: '#18201D',
  bannerBg: '#064E3B',
  bannerGradient: ['#064E3B', '#047857', '#10B981'],
  bannerAccent: '#A7F3D0',
  bannerSubText: '#D1FAE5',
  heroCardBg: '#FFFFFF',
  heroBorder: '#A7F3D0',
  badgeBg: '#EBF7F0',
  badgeText: '#065F46',
};

export const ARTBOARD_THEME: ThemeColors = AURORA_THEME;

export const THEMES: Record<string, ThemeColors> = {
  profile_theme_sunrise: SUNRISE_THEME,
  profile_theme_midnight: MIDNIGHT_THEME,
  profile_theme_aurora: AURORA_THEME,
};

export function useAppTheme(): ThemeColors {
  const activeThemeKey = useAuthStore((s) => s.activeThemeKey);
  return THEMES[activeThemeKey] || THEMES.profile_theme_sunrise || SUNRISE_THEME;
}

export const BrandUnderline: React.FC<{ width?: number | string; style?: StyleProp<ViewStyle> }> = ({
  width = 75,
  style,
}) => (
  <View style={[{ height: 6, width: typeof width === 'number' ? width : 75, marginTop: 2 }, style]}>
    <Svg width="100%" height="6" viewBox="0 0 100 6">
      <Path
        d="M 2 2 Q 50 6 98 2"
        stroke="#0E6245"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  </View>
);

interface AvatarWithBadgeFrameProps {
  name?: string;
  username?: string | null;
  avatarUrl?: string | null;
  size?: number;
  badgeFrameKey?: string | null;
  style?: StyleProp<ViewStyle>;
}

export const AvatarWithBadgeFrame: React.FC<AvatarWithBadgeFrameProps> = ({
  name = 'User',
  username,
  avatarUrl,
  size = 50,
  badgeFrameKey,
  style,
}) => {
  const frame = badgeFrameKey || null;

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const isGold = frame === 'badge_frame_gold';
  const isBronze = frame === 'badge_frame_bronze';

  const frameBorderWidth = isGold ? 3 : isBronze ? 2.5 : 1.5;
  const frameBorderColor = isGold
    ? '#F59E0B'
    : isBronze
    ? '#CD7F32'
    : '#38BDF8';

  const frameOuterGlow = isGold
    ? {
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
        elevation: 8,
      }
    : isBronze
    ? {
        shadowColor: '#CD7F32',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 5,
        elevation: 5,
      }
    : {};

  return (
    <View
      style={[
        styles.avatarContainer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: frameBorderWidth,
          borderColor: frameBorderColor,
        },
        frameOuterGlow,
        style,
      ]}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size - frameBorderWidth * 2, height: size - frameBorderWidth * 2, borderRadius: size / 2 }}
        />
      ) : (
        <View
          style={[
            styles.fallbackAvatar,
            {
              width: size - frameBorderWidth * 2,
              height: size - frameBorderWidth * 2,
              borderRadius: size / 2,
              backgroundColor: isGold ? '#B45309' : isBronze ? '#9A3412' : '#0E6245',
            },
          ]}
        >
          <Text
            style={[
              styles.avatarInitials,
              {
                fontSize: size * 0.38,
                color: isGold ? '#FEF3C7' : isBronze ? '#FFEDD5' : '#FFFFFF',
              },
            ]}
          >
            {initials || 'U'}
          </Text>
        </View>
      )}

      {/* Frame Crown / Badge accent */}
      {isGold && (
        <View style={styles.goldBadgeCrown}>
          <Text style={styles.crownText}>👑</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  fallbackAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontWeight: '800',
  },
  goldBadgeCrown: {
    position: 'absolute',
    top: -8,
    right: -6,
    backgroundColor: '#1E1B4B',
    borderRadius: 8,
    paddingHorizontal: 2,
  },
  crownText: {
    fontSize: 10,
  },
});
