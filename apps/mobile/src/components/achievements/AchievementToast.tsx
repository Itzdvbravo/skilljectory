import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Award, Coins, Flame, Sparkles } from 'lucide-react-native';
import { NotificationDto, NotificationType } from '@skill-exchange/shared-types';

interface AchievementToastProps {
  notification: NotificationDto;
  onDismiss: () => void;
}

const { width } = Dimensions.get('window');

export const AchievementToast: React.FC<AchievementToastProps> = ({
  notification,
  onDismiss,
}) => {
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide down in Xbox/Minecraft style
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 20,
        useNativeDriver: true,
        friction: 6,
        tension: 40,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss after 4 seconds
    const timer = setTimeout(() => {
      dismiss();
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const getIcon = () => {
    switch (notification.type) {
      case NotificationType.SIGNUP_BONUS:
        return <Coins size={28} color="#FBBF24" />;
      case NotificationType.SESSION_MILESTONE:
        return <Flame size={28} color="#F97316" />;
      case NotificationType.CUSTOMIZATION_UNLOCKED:
        return <Sparkles size={28} color="#A855F7" />;
      case NotificationType.BADGE_UNLOCKED:
      default:
        return <Award size={28} color="#60A5FA" />;
    }
  };

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={dismiss}
        style={styles.card}
      >
        <View style={styles.iconContainer}>{getIcon()}</View>
        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.badgeText}>ACHIEVEMENT UNLOCKED</Text>
          </View>
          <Text style={styles.titleText} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.bodyText} numberOfLines={2}>
            {notification.body}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 30,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  card: {
    width: Math.min(width - 32, 420),
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  textContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  badgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  titleText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  bodyText: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
  },
});
