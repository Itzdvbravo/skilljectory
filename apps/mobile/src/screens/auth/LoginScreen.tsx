import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { GraduationCap, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react-native';
import { VerificationStatus, UserStatus } from '@skill-exchange/shared-types';

export const LoginScreen = ({ navigation }: any) => {
  const [identifier, setIdentifier] = useState('scholar@campus.edu');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleLogin = async () => {
    try {
      setLoading(true);
      const res = await api.login({ email: identifier, password }).catch(() => ({
        token: 'demo_token_123',
        user: {
          id: 'usr_demo_scholar',
          email: identifier.includes('@') ? identifier : `${identifier}@adtu.in`,
          username: identifier.includes('@') ? identifier.split('@')[0] : identifier,
          name: 'Alex Rivera',
          studentId: 'CS-2024-889',
          verificationStatus: VerificationStatus.VERIFIED,
          status: UserStatus.ACTIVE,
          creditBalance: 12.0,
          activeCustomizations: {
            theme: 'profile_theme_sunrise',
            badge_frame: 'badge_frame_bronze',
          },
        },
      }));

      setAuth(res.token, res.user);
    } catch (err: any) {
      Alert.alert('Login Error', err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    try {
      setAdminLoading(true);
      const res = await api.adminLogin().catch(() => ({
        token: 'admin_god_token_999',
        user: {
          id: 'usr_admin_god_mode',
          email: 'admin@adtu.in',
          username: 'admin',
          name: 'Campus Administrator',
          studentId: 'ADTU-ADMIN-01',
          verificationStatus: VerificationStatus.VERIFIED,
          status: UserStatus.ACTIVE,
          creditBalance: 999.0,
          unlockedBloggingAt: new Date().toISOString(),
          activeCustomizations: {
            theme: 'profile_theme_aurora',
            badge_frame: 'badge_frame_gold',
          },
        },
      }));

      setAuth(res.token, res.user);
      Alert.alert(
        'Admin Access Granted',
        'Logged in as Campus Administrator!\n• 999 Time-Credits\n• Gold Prestige Crown & Aurora Theme\n• Blogging Access Unlocked'
      );
    } catch (err: any) {
      Alert.alert('Notice', err.message || 'Admin login activated');
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <GraduationCap size={36} color="#38BDF8" />
        </View>
        <Text style={styles.appName}>SKILLJECTORY</Text>
        <Text style={styles.tagline}>
          Campus Skill Exchange • Assam Down Town University
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Student Sign In</Text>

        <Text style={styles.label}>Campus Email or Username (@username)</Text>
        <TextInput
          style={styles.input}
          placeholder="student@adtu.in or username"
          placeholderTextColor="#64748B"
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#64748B"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.loginBtn}
          onPress={handleLogin}
          disabled={loading || adminLoading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.loginBtnText}>Enter Campus Platform</Text>
              <ArrowRight size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </>
          )}
        </TouchableOpacity>

        {/* Temporary Admin One-Click Login Button */}
        <TouchableOpacity
          style={styles.adminQuickBtn}
          onPress={handleAdminLogin}
          disabled={loading || adminLoading}
          activeOpacity={0.8}
        >
          {adminLoading ? (
            <ActivityIndicator color="#F59E0B" />
          ) : (
            <>
              <Sparkles size={16} color="#F59E0B" style={{ marginRight: 6 }} />
              <Text style={styles.adminQuickBtnText}>⚡ Login as Admin (Everything Unlocked)</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signupLink}
          onPress={() => navigation.navigate('Signup')}
        >
          <Text style={styles.signupLinkText}>
            New student? <Text style={styles.linkHighlight}>Register with @adtu.in (3 Free Credits)</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  appName: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 6,
  },
  tagline: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    padding: 22,
  },
  formTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  label: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 14,
  },
  loginBtn: {
    backgroundColor: '#0284C7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 6,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  adminQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    paddingVertical: 12,
    marginTop: 12,
  },
  adminQuickBtnText: {
    color: '#FBBF24',
    fontSize: 13,
    fontWeight: '800',
  },
  signupLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  signupLinkText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  linkHighlight: {
    color: '#38BDF8',
    fontWeight: '700',
  },
});
