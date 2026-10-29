import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { GraduationCap, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react-native';

import { BrandUnderline } from '../../components/common/ThemeSystem';

export const LoginScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter your campus email (@adtu.in) or username and password.');
      return;
    }

    const cleanId = identifier.trim().toLowerCase();
    if (cleanId.includes('@') && !cleanId.endsWith('@adtu.in')) {
      Alert.alert(
        'Campus Restriction',
        'Only official Assam Down Town University student emails (@adtu.in) are allowed.'
      );
      return;
    }

    try {
      setLoading(true);
      const res = await api.login({ email: cleanId, password });
      setAuth(res.token || res.accessToken, res.user);
    } catch (err: any) {
      Alert.alert(
        'Sign In Failed',
        err.message || 'Invalid credentials. If you are a new student, please register your @adtu.in account.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    try {
      setAdminLoading(true);
      const res = await api.adminLogin();
      setAuth(res.token || res.accessToken, res.user);
      Alert.alert(
        'Unlocked Account Activated ⚡',
        'Logged in as Campus Administrator!\n\n• 999.0 Time-Credits Balance\n• Aurora Theme & Gold Prestige Frame\n• Full Verification Status'
      );
    } catch (err: any) {
      Alert.alert('Admin Login Error', err.message || 'Could not connect to backend server.');
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: '#F8FAF9' }}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top + 20, 40), paddingBottom: Math.max(insets.bottom + 20, 30) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <GraduationCap size={36} color="#0E6245" />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={styles.appName}>SKILL</Text>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.appName}>JECTORY</Text>
              <BrandUnderline width={60} style={{ marginTop: 2 }} />
            </View>
          </View>
          <Text style={styles.tagline}>
            Campus Skill Exchange • Assam Down Town University
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Student Sign In</Text>

          <Text style={styles.label}>Campus Email or Username (@adtu.in)</Text>
          <TextInput
            style={styles.input}
            placeholder="student@adtu.in or username"
            placeholderTextColor="#9CA3AF"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={handleLogin}
            disabled={loading || adminLoading}
            activeOpacity={0.88}
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

          {/* Quick Admin Login */}
          <TouchableOpacity
            style={styles.adminQuickBtn}
            onPress={handleAdminLogin}
            disabled={loading || adminLoading}
            activeOpacity={0.88}
          >
            {adminLoading ? (
              <ActivityIndicator color="#0E6245" />
            ) : (
              <View style={{ alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Sparkles size={15} color="#0E6245" style={{ marginRight: 6 }} />
                  <Text style={styles.adminQuickBtnText}>⚡ Login as Campus Administrator</Text>
                </View>
                <Text style={styles.adminQuickBtnSub}>
                  999 Credits • All Themes & Badges Unlocked
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signupLink}
            onPress={() => navigation.navigate('Signup')}
            activeOpacity={0.8}
          >
            <Text style={styles.signupLinkText}>
              New student? <Text style={styles.linkHighlight}>Register with @adtu.in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  content: {
    paddingHorizontal: 20,
    justifyContent: 'center',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EBF7F0',
    borderWidth: 1.5,
    borderColor: '#0E6245',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appName: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  tagline: {
    color: '#5A6561',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8E5',
    padding: 24,
  },
  formTitle: {
    color: '#111827',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 16,
  },
  label: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAF9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8E5',
    color: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 14,
  },
  loginBtn: {
    backgroundColor: '#0E6245',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 6,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  adminQuickBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF7F0',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#0E6245',
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginTop: 14,
  },
  adminQuickBtnText: {
    color: '#0E6245',
    fontSize: 13,
    fontWeight: '800',
  },
  adminQuickBtnSub: {
    color: '#084832',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  signupLink: {
    alignItems: 'center',
    marginTop: 18,
  },
  signupLinkText: {
    color: '#5A6561',
    fontSize: 13,
  },
  linkHighlight: {
    color: '#0E6245',
    fontWeight: '700',
  },
});
