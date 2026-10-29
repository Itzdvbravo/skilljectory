import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { VerificationStatus } from '@skill-exchange/shared-types';

interface LapsedBannerProps {
  onReverifyPress: () => void;
}

export const LapsedBanner: React.FC<LapsedBannerProps> = ({ onReverifyPress }) => {
  const user = useAuthStore((state) => state.user);

  if (!user || user.verificationStatus !== VerificationStatus.LAPSED) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <View style={styles.topRow}>
        <AlertTriangle size={20} color="#F59E0B" style={styles.icon} />
        <Text style={styles.title}>Student Verification Lapsed</Text>
      </View>
      <Text style={styles.description}>
        Your annual student verification has expired. Your earned portfolio, badges, and showcase remain permanently intact, but creating/joining sessions and marketplace purchases are locked until renewal.
      </Text>
      <TouchableOpacity
        style={styles.reverifyButton}
        onPress={onReverifyPress}
        activeOpacity={0.8}
      >
        <RefreshCw size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
        <Text style={styles.buttonText}>Reverify Student Status Now</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#1E1B18',
    borderColor: '#B45309',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 10,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  icon: {
    marginRight: 8,
  },
  title: {
    color: '#FBBF24',
    fontSize: 15,
    fontWeight: '700',
  },
  description: {
    color: '#D1D5DB',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  reverifyButton: {
    backgroundColor: '#D97706',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
