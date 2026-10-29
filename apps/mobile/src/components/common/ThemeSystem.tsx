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
}

export const ARTBOARD_THEME: ThemeColors = {
  name: 'Campus Academic Light',
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
  secondary: '#38BDF8',
  accent: '#0E6245',
  text: '#111827',
  textSecondary: '#374151',
  textMuted: '#6B7280',
  border: '#E2E8E5',
  pillDark: '#18201D',
};

export const THEMES: Record<string, ThemeColors> = {
  profile_theme_sunrise: ARTBOARD_THEME,
  profile_theme_midnight: ARTBOARD_THEME,
  profile_theme_aurora: ARTBOARD_THEME,
};

export function useAppTheme(): ThemeColors {
  return ARTBOARD_THEME;
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
