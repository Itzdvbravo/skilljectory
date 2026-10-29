import React from 'react';
import { View, Text, StyleSheet, Image, StyleProp, ViewStyle } from 'react-native';
import { useAuthStore } from '../../store/authStore';

export interface ThemeColors {
  name: string;
  background: string;
  surface: string;
  surfaceLight: string;
  primary: string;
  primaryGlow: string;
  secondary: string;
  accent: string;
  text: string;
  textMuted: string;
  border: string;
}

export const THEMES: Record<string, ThemeColors> = {
  profile_theme_sunrise: {
    name: 'Sunrise Horizon',
    background: '#0B0A14',
    surface: '#151324',
    surfaceLight: '#211D38',
    primary: '#F59E0B',
    primaryGlow: 'rgba(245, 158, 11, 0.25)',
    secondary: '#EC4899',
    accent: '#FB923C',
    text: '#FFF1F2',
    textMuted: '#A78BFA',
    border: '#3B2D54',
  },
  profile_theme_midnight: {
    name: 'Midnight OLED',
    background: '#030508',
    surface: '#0A0F1D',
    surfaceLight: '#111A30',
    primary: '#00F0FF',
    primaryGlow: 'rgba(0, 240, 255, 0.25)',
    secondary: '#38BDF8',
    accent: '#6366F1',
    text: '#F8FAFC',
    textMuted: '#64748B',
    border: '#1E293B',
  },
  profile_theme_aurora: {
    name: 'Aurora Borealis',
    background: '#04130F',
    surface: '#0B241E',
    surfaceLight: '#12382F',
    primary: '#10B981',
    primaryGlow: 'rgba(16, 185, 129, 0.25)',
    secondary: '#8B5CF6',
    accent: '#34D399',
    text: '#F0FDF4',
    textMuted: '#6EE7B7',
    border: '#174E40',
  },
};

export function useAppTheme(): ThemeColors {
  const activeThemeKey = useAuthStore((s) => s.activeThemeKey) || 'profile_theme_sunrise';
  return THEMES[activeThemeKey] || THEMES.profile_theme_sunrise;
}

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
              backgroundColor: isGold ? '#2D2006' : isBronze ? '#2A180E' : '#0F1E36',
            },
          ]}
        >
          <Text
            style={[
              styles.avatarInitials,
              {
                fontSize: size * 0.38,
                color: isGold ? '#FCD34D' : isBronze ? '#FDBA74' : '#38BDF8',
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
