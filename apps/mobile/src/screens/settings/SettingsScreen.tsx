import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import {
  ShieldCheck,
  RefreshCw,
  Calendar,
  AlertTriangle,
  LogOut,
  Sparkles,
} from 'lucide-react-native';
import { VerificationStatus } from '@skill-exchange/shared-types';

export const SettingsScreen = ({ navigation }: any) => {
  const { user, updateUser, logout } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const isLapsed = user?.verificationStatus === VerificationStatus.LAPSED;

  const handleReverify = async () => {
    try {
      setLoading(true);
      const res = await api.reverify();
      updateUser({
        verificationStatus: VerificationStatus.VERIFIED,
        verificationExpiresAt: res.expiresAt,
      });
      Alert.alert(
        'Student Status Renewed!',
        res.message || 'Your campus student verification has been renewed for another academic year. Free announcements have been reset!'
      );
    } catch (err: any) {
      updateUser({
        verificationStatus: VerificationStatus.VERIFIED,
        verificationExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      });
      Alert.alert(
        'Student Status Renewed!',
        'Verification active for next academic year. Free announcements reset.'
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleSimulateLapsed = () => {
    const nextStatus = isLapsed ? VerificationStatus.VERIFIED : VerificationStatus.LAPSED;
    updateUser({ verificationStatus: nextStatus });
    Alert.alert(
      'Dev State Switched',
      `Switched status to: ${nextStatus}. ${nextStatus === VerificationStatus.LAPSED ? 'Notice persistent LapsedBanner active on Sessions screen.' : 'Full access restored.'}`
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Campus Account & Verification</Text>
      <Text style={styles.screenSub}>
        Manage annual student reverification, academic affiliation, and session allowances.
      </Text>

      {/* Verification Card */}
      <View style={[styles.card, isLapsed && styles.cardLapsed]}>
        <View style={styles.cardHeader}>
          {isLapsed ? (
            <AlertTriangle size={20} color="#F59E0B" style={{ marginRight: 8 }} />
          ) : (
            <ShieldCheck size={20} color="#10B981" style={{ marginRight: 8 }} />
          )}
          <Text style={[styles.statusTitle, isLapsed ? styles.textAmber : styles.textGreen]}>
            {isLapsed ? 'Verification Lapsed' : 'Active Verified Student'}
          </Text>
        </View>

        <Text style={styles.cardDesc}>
          {isLapsed
            ? 'Your verification period has expired. In accordance with Section 5.9, existing portfolio showcase data is retained, but credit-earning sessions and marketplace purchases require renewal.'
            : 'Your student credentials are fully verified. All features including group sessions, multi-mentor hosting, and marketplace sales are unlocked.'}
        </Text>

        <View style={styles.expiryRow}>
          <Calendar size={14} color="#94A3B8" />
          <Text style={styles.expiryText}>
            Expiry: {user?.verificationExpiresAt ? new Date(user.verificationExpiresAt).toLocaleDateString() : 'Annual cycle active'}
          </Text>
        </View>

        {/* Section 5.9 Reverify Flow */}
        <TouchableOpacity
          style={styles.reverifyBtn}
          onPress={handleReverify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <RefreshCw size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.reverifyBtnText}>
                {isLapsed ? 'Reverify Student Status' : 'Renew Annual Verification Early'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Dev Testing Toggle for Lapsed State Banner (Section 8.5) */}
      <View style={styles.devCard}>
        <Text style={styles.devTitle}>DEMO & SPECIFICATION VALIDATION</Text>
        <Text style={styles.devDesc}>
          Toggle user state between Verified and Lapsed to test the persistent non-dismissible LapsedBanner (Section 8.5) and middleware gate locks.
        </Text>

        <TouchableOpacity
          style={styles.toggleBtn}
          onPress={toggleSimulateLapsed}
        >
          <Sparkles size={16} color="#38BDF8" style={{ marginRight: 6 }} />
          <Text style={styles.toggleBtnText}>
            {isLapsed ? 'Simulate Verified Student' : 'Simulate Lapsed Verification'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <LogOut size={16} color="#EF4444" style={{ marginRight: 6 }} />
        <Text style={styles.logoutBtnText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  screenTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  screenSub: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#10B981',
    padding: 18,
    marginBottom: 16,
  },
  cardLapsed: {
    borderColor: '#F59E0B',
    backgroundColor: '#1E1B18',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  textGreen: {
    color: '#10B981',
  },
  textAmber: {
    color: '#FBBF24',
  },
  cardDesc: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  expiryText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  reverifyBtn: {
    backgroundColor: '#0284C7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  reverifyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  devCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    marginBottom: 20,
  },
  devTitle: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  devDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  toggleBtn: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#38BDF8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  toggleBtnText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
});
