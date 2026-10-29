import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  Award,
  Coins,
  Flame,
  Sparkles,
  Clock,
  Calendar,
  Megaphone,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  PlayCircle,
} from 'lucide-react-native';
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

  const getToastMeta = () => {
    const ref = (notification.referenceType || '').toLowerCase();

    if (ref === 'one_to_one_invitation' || ref.includes('invitation')) {
      return {
        badgeText: 'ACTION REQUIRED: 1-ON-1 INVITATION',
        accentColor: '#10B981',
        icon: <Calendar size={26} color="#10B981" />,
      };
    }

    if (ref === 'session_cohost_request') {
      return {
        badgeText: 'ACTION REQUIRED: CO-HOST INVITE',
        accentColor: '#F59E0B',
        icon: <Users size={26} color="#F59E0B" />,
      };
    }

    if (ref === 'session_started_early') {
      return {
        badgeText: 'SESSION STARTED EARLY',
        accentColor: '#38BDF8',
        icon: <PlayCircle size={26} color="#38BDF8" />,
      };
    }

    if (ref === 'session_stopped_early') {
      return {
        badgeText: 'SESSION CONCLUDED EARLY',
        accentColor: '#F97316',
        icon: <Clock size={26} color="#F97316" />,
      };
    }

    if (ref === 'one_to_one_accepted') {
      return {
        badgeText: 'INVITATION ACCEPTED',
        accentColor: '#10B981',
        icon: <CheckCircle2 size={26} color="#10B981" />,
      };
    }

    if (ref === 'one_to_one_declined') {
      return {
        badgeText: 'INVITATION DECLINED',
        accentColor: '#EF4444',
        icon: <XCircle size={26} color="#EF4444" />,
      };
    }

    if (ref === 'session_announcement') {
      return {
        badgeText: 'CAMPUS ANNOUNCEMENT',
        accentColor: '#818CF8',
        icon: <Megaphone size={26} color="#818CF8" />,
      };
    }

    if (ref.startsWith('session_')) {
      return {
        badgeText: 'SESSION UPDATE',
        accentColor: '#38BDF8',
        icon: <Clock size={26} color="#38BDF8" />,
      };
    }

    switch (notification.type) {
      case NotificationType.SIGNUP_BONUS:
        return {
          badgeText: 'CAMPUS WELCOME BONUS 🪙',
          accentColor: '#FBBF24',
          icon: <Coins size={26} color="#FBBF24" />,
        };
      case NotificationType.SESSION_MILESTONE:
        return {
          badgeText: 'TEACHING MILESTONE 🔥',
          accentColor: '#F97316',
          icon: <Flame size={26} color="#F97316" />,
        };
      case NotificationType.CUSTOMIZATION_UNLOCKED:
        return {
          badgeText: 'CUSTOMIZATION UNLOCKED ✨',
          accentColor: '#A855F7',
          icon: <Sparkles size={26} color="#A855F7" />,
        };
      case NotificationType.BADGE_UNLOCKED:
      default:
        return {
          badgeText: 'ACHIEVEMENT UNLOCKED 🏆',
          accentColor: '#60A5FA',
          icon: <Award size={26} color="#60A5FA" />,
        };
    }
  };

  const { badgeText, accentColor, icon } = getToastMeta();

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
        style={[styles.card, { borderColor: accentColor, shadowColor: accentColor }]}
      >
        <View style={styles.iconContainer}>{icon}</View>
        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <Text style={[styles.badgeText, { color: accentColor }]}>{badgeText}</Text>
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
