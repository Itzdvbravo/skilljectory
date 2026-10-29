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
import { VerificationMethod } from '@skill-exchange/shared-types';
import {
  Coins,
  ArrowLeft,
  GraduationCap,
  BookOpen,
  Calendar,
  Sparkles,
  Check,
  Plus,
  X,
  Compass,
} from 'lucide-react-native';

const POPULAR_COURSES = [
  'B.Tech CSE',
  'BCA',
  'B.Tech ECE',
  'B.Tech Civil',
  'B.Pharm',
  'MBA',
  'MCA',
  'B.Sc Nursing',
  'Biotechnology',
];

const ENROLLMENT_YEARS = [2024, 2023, 2022, 2021, 2020];
const STUDY_DURATIONS = [2, 3, 4, 5];
const CURRENT_YEARS = [1, 2, 3, 4, 5];

const SUGGESTED_TEACH_SKILLS = [
  'React Native',
  'Python & DSA',
  'UI/UX Design',
  'Database / SQL',
  'Web Development',
  'Public Speaking',
  'Organic Chemistry',
  'Calculus & Maths',
  'Cybersecurity Basics',
];

const SUGGESTED_LEARN_SKILLS = [
  'Machine Learning & AI',
  'Cloud / AWS',
  'System Architecture',
  'Mobile App Dev',
  'Financial Modeling',
  'Guitar & Music',
  'Competitive Coding',
  'English Communication',
];

export const SignupScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const setAuth = useAuthStore((s) => s.setAuth);

  // Basic Account Credentials
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');

  // Academic Details
  const [course, setCourse] = useState('B.Tech CSE');
  const [customCourse, setCustomCourse] = useState('');
  const [enrollmentYear, setEnrollmentYear] = useState<number>(2024);
  const [yearsOfStudy, setYearsOfStudy] = useState<number>(4);
  const [currentYear, setCurrentYear] = useState<number>(1);

  // Skill Inventory
  const [teachSkills, setTeachSkills] = useState<string[]>(['React Native', 'UI/UX Design']);
  const [newTeachInput, setNewTeachInput] = useState('');
  const [learnSkills, setLearnSkills] = useState<string[]>(['Machine Learning & AI']);
  const [newLearnInput, setNewLearnInput] = useState('');

  const [loading, setLoading] = useState(false);

  const toggleTeachSkill = (skill: string) => {
    if (teachSkills.includes(skill)) {
      setTeachSkills(teachSkills.filter((s) => s !== skill));
    } else {
      if (teachSkills.length >= 8) {
        Alert.alert('Limit Reached', 'You can select up to 8 teaching skills.');
        return;
      }
      setTeachSkills([...teachSkills, skill]);
    }
  };

  const handleAddCustomTeachSkill = () => {
    const trimmed = newTeachInput.trim();
    if (!trimmed) return;
    if (teachSkills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setNewTeachInput('');
      return;
    }
    if (teachSkills.length >= 8) {
      Alert.alert('Limit Reached', 'You can select up to 8 teaching skills.');
      return;
    }
    setTeachSkills([...teachSkills, trimmed]);
    setNewTeachInput('');
  };

  const toggleLearnSkill = (skill: string) => {
    if (learnSkills.includes(skill)) {
      setLearnSkills(learnSkills.filter((s) => s !== skill));
    } else {
      if (learnSkills.length >= 8) {
        Alert.alert('Limit Reached', 'You can select up to 8 learning goals.');
        return;
      }
      setLearnSkills([...learnSkills, skill]);
    }
  };

  const handleAddCustomLearnSkill = () => {
    const trimmed = newLearnInput.trim();
    if (!trimmed) return;
    if (learnSkills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setNewLearnInput('');
      return;
    }
    if (learnSkills.length >= 8) {
      Alert.alert('Limit Reached', 'You can select up to 8 learning goals.');
      return;
    }
    setLearnSkills([...learnSkills, trimmed]);
    setNewLearnInput('');
  };

  const handleSignup = async () => {
    if (!name.trim() || !username.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Incomplete Form', 'Please fill in your full name, username, @adtu.in email, and password.');
      return;
    }

    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
    if (cleanUsername.length < 3) {
      Alert.alert('Invalid Username', 'Username must be at least 3 characters.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@adtu.in')) {
      Alert.alert(
        'Campus Domain Restricted',
        'Registration is strictly restricted to Assam Down Town University (@adtu.in) student emails.'
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
      return;
    }

    const effectiveCourse = (course === 'Other' ? customCourse : course).trim() || 'B.Tech CSE';

    try {
      setLoading(true);
      const res = await api.signup({
        name: name.trim(),
        username: cleanUsername,
        email: cleanEmail,
        studentId: studentId.trim() || null,
        password,
        course: effectiveCourse,
        department: `Faculty of ${effectiveCourse.includes('Tech') || effectiveCourse.includes('BCA') ? 'Engineering & Technology' : 'Academic Studies'}`,
        enrollmentYear,
        yearsOfStudy,
        currentYear,
        teachSkills,
        learnSkills,
        verificationMethod: VerificationMethod.EMAIL,
      });

      const authToken = res.token || res.accessToken;
      setAuth(authToken, {
        ...res.user,
        username: cleanUsername,
        creditBalance: res.user.creditBalance ?? 3.0,
        course: effectiveCourse,
        enrollmentYear,
        yearsOfStudy,
        currentYear,
        teachSkills,
        learnSkills,
      });

      Alert.alert(
        'Registration Successful! 🎉',
        `Welcome to SkillJectory, ${name}!\n\nYour @adtu.in student account has been auto-verified (no OTP required) with 3 Free Welcome Credits.`
      );
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Could not complete registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: '#0B0F19' }}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top + 16, 24), paddingBottom: Math.max(insets.bottom + 24, 40) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <ArrowLeft size={18} color="#94A3B8" style={{ marginRight: 6 }} />
          <Text style={styles.backBtnText}>Back to Sign In</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create Student Account</Text>
        <Text style={styles.subtitle}>
          Join Assam Down Town University's verified peer-to-peer skill exchange platform.
        </Text>

        {/* Campus Email & Welcome Bonus Banner */}
        <View style={styles.bonusCallout}>
          <Coins size={20} color="#FBBF24" style={{ marginRight: 10, marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bonusTitle}>Automatic @adtu.in Verification</Text>
            <Text style={styles.bonusText}>
              All <Text style={{ fontWeight: '800', color: '#FBBF24' }}>@adtu.in</Text> student emails are auto-verified with <Text style={{ fontWeight: '800', color: '#FBBF24' }}>3 Free Welcome Credits</Text> (no OTP required).
            </Text>
          </View>
        </View>

        {/* SECTION 1: ACCOUNT CREDENTIALS */}
        <View style={styles.formCard}>
          <View style={styles.cardSectionHeader}>
            <Compass size={16} color="#38BDF8" style={{ marginRight: 6 }} />
            <Text style={styles.cardSectionTitle}>1. CAMPUS CREDENTIALS</Text>
          </View>

          {/* Real Name */}
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Rahul Sharma"
            placeholderTextColor="#64748B"
            value={name}
            onChangeText={setName}
          />

          {/* Unique Username */}
          <Text style={styles.label}>Choose Username (@handle) *</Text>
          <View style={styles.usernameRow}>
            <Text style={styles.atSymbol}>@</Text>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0, paddingLeft: 8, borderWidth: 0 }]}
              placeholder="rahul_s"
              placeholderTextColor="#64748B"
              value={username}
              onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <Text style={styles.helperText}>
            Visible on your session passes and profile (e.g. @{username || 'username'})
          </Text>

          {/* Campus Email */}
          <Text style={styles.label}>Campus Email (@adtu.in only) *</Text>
          <TextInput
            style={styles.input}
            placeholder="student@adtu.in"
            placeholderTextColor="#64748B"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          {/* Student ID */}
          <Text style={styles.label}>Student ID / Enrollment Number (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. ADTU-CS-2024-889"
            placeholderTextColor="#64748B"
            value={studentId}
            onChangeText={setStudentId}
          />

          {/* Password */}
          <Text style={styles.label}>Password (minimum 6 characters) *</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#64748B"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {/* SECTION 2: ACADEMIC ENROLLMENT DETAILS */}
        <View style={styles.formCard}>
          <View style={styles.cardSectionHeader}>
            <GraduationCap size={16} color="#A855F7" style={{ marginRight: 6 }} />
            <Text style={styles.cardSectionTitle}>2. ACADEMIC ENROLLMENT</Text>
          </View>

          {/* Course Selection */}
          <Text style={styles.label}>Which Course / Degree are you pursuing? *</Text>
          <View style={styles.chipGrid}>
            {POPULAR_COURSES.map((c) => {
              const isSelected = course === c;
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setCourse(c)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.chip, course === 'Other' && styles.chipActive]}
              onPress={() => setCourse('Other')}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, course === 'Other' && styles.chipTextActive]}>
                + Other Degree
              </Text>
            </TouchableOpacity>
          </View>

          {course === 'Other' && (
            <TextInput
              style={[styles.input, { marginTop: 6 }]}
              placeholder="Enter your exact degree/program name..."
              placeholderTextColor="#64748B"
              value={customCourse}
              onChangeText={setCustomCourse}
            />
          )}

          {/* Enrollment Year */}
          <Text style={styles.label}>When did you enroll on campus? *</Text>
          <View style={styles.pillRow}>
            {ENROLLMENT_YEARS.map((yr) => {
              const isSelected = enrollmentYear === yr;
              return (
                <TouchableOpacity
                  key={yr}
                  style={[styles.pill, isSelected && styles.pillActive]}
                  onPress={() => setEnrollmentYear(yr)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                    {yr}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Total Duration and Current Year */}
          <View style={styles.rowTwoCols}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Study Duration</Text>
              <View style={styles.pillRow}>
                {STUDY_DURATIONS.map((dur) => (
                  <TouchableOpacity
                    key={dur}
                    style={[styles.pillSmall, yearsOfStudy === dur && styles.pillActive]}
                    onPress={() => setYearsOfStudy(dur)}
                  >
                    <Text style={[styles.pillTextSmall, yearsOfStudy === dur && styles.pillTextActive]}>
                      {dur}y
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.label}>Current Year</Text>
              <View style={styles.pillRow}>
                {CURRENT_YEARS.slice(0, yearsOfStudy).map((yr) => (
                  <TouchableOpacity
                    key={yr}
                    style={[styles.pillSmall, currentYear === yr && styles.pillActive]}
                    onPress={() => setCurrentYear(yr)}
                  >
                    <Text style={[styles.pillTextSmall, currentYear === yr && styles.pillTextActive]}>
                      Yr {yr}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* SECTION 3: SKILLS INVENTORY (TEACH & LEARN) */}
        <View style={styles.formCard}>
          <View style={styles.cardSectionHeader}>
            <BookOpen size={16} color="#10B981" style={{ marginRight: 6 }} />
            <Text style={styles.cardSectionTitle}>3. SKILLS TO TEACH & LEARN</Text>
          </View>

          {/* Skills Willing to Teach */}
          <Text style={styles.label}>Skills you are willing to TEACH 🎓</Text>
          <Text style={styles.subtext}>
            Tap skills you can mentor other students in:
          </Text>
          <View style={styles.chipGrid}>
            {SUGGESTED_TEACH_SKILLS.map((sk) => {
              const active = teachSkills.includes(sk);
              return (
                <TouchableOpacity
                  key={sk}
                  style={[styles.skillChip, active && styles.skillChipTeachActive]}
                  onPress={() => toggleTeachSkill(sk)}
                  activeOpacity={0.7}
                >
                  {active && <Check size={12} color="#FFFFFF" style={{ marginRight: 4 }} />}
                  <Text style={[styles.skillChipText, active && styles.skillChipTextActive]}>
                    {sk}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom Teach Skill Add Input */}
          <View style={styles.tagInputRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Add another skill to teach (e.g. Flutter)..."
              placeholderTextColor="#64748B"
              value={newTeachInput}
              onChangeText={setNewTeachInput}
              onSubmitEditing={handleAddCustomTeachSkill}
            />
            <TouchableOpacity style={styles.addTagBtn} onPress={handleAddCustomTeachSkill}>
              <Plus size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Skills Want to Learn */}
          <Text style={[styles.label, { marginTop: 16 }]}>Skills you want to LEARN 🚀</Text>
          <Text style={styles.subtext}>
            Tap topics you'd love to learn from fellow students:
          </Text>
          <View style={styles.chipGrid}>
            {SUGGESTED_LEARN_SKILLS.map((sk) => {
              const active = learnSkills.includes(sk);
              return (
                <TouchableOpacity
                  key={sk}
                  style={[styles.skillChip, active && styles.skillChipLearnActive]}
                  onPress={() => toggleLearnSkill(sk)}
                  activeOpacity={0.7}
                >
                  {active && <Check size={12} color="#FFFFFF" style={{ marginRight: 4 }} />}
                  <Text style={[styles.skillChipText, active && styles.skillChipTextActive]}>
                    {sk}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom Learn Skill Add Input */}
          <View style={styles.tagInputRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Add another topic to learn (e.g. Rust)..."
              placeholderTextColor="#64748B"
              value={newLearnInput}
              onChangeText={setNewLearnInput}
              onSubmitEditing={handleAddCustomLearnSkill}
            />
            <TouchableOpacity
              style={[styles.addTagBtn, { backgroundColor: '#8B5CF6' }]}
              onPress={handleAddCustomLearnSkill}
            >
              <Plus size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.signupBtn}
          onPress={handleSignup}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Sparkles size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.signupBtnText}>Complete Registration & Claim 3 Credits</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.loginLinkText}>
            Already have an account? <Text style={styles.linkHighlight}>Sign In</Text>
          </Text>
        </TouchableOpacity>
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
    paddingBottom: 40,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  backBtnText: {
    color: '#0E6245',
    fontSize: 13,
    fontWeight: '700',
  },
  title: {
    color: '#111827',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    color: '#5A6561',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  bonusCallout: {
    flexDirection: 'row',
    backgroundColor: '#FEF7DA',
    borderWidth: 1,
    borderColor: '#FEF08A',
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
  },
  bonusTitle: {
    color: '#854D0E',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  bonusText: {
    color: '#A16207',
    fontSize: 12,
    lineHeight: 17,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8E5',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  cardSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  cardSectionTitle: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  label: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 8,
  },
  subtext: {
    color: '#64748B',
    fontSize: 11,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0B0F19',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 14,
    marginBottom: 8,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B0F19',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    marginBottom: 4,
    overflow: 'hidden',
  },
  atSymbol: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: '800',
    paddingLeft: 12,
  },
  helperText: {
    color: '#64748B',
    fontSize: 11,
    marginBottom: 8,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  chip: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  chipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  pill: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillSmall: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#C084FC',
  },
  pillText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
  },
  pillTextSmall: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  rowTwoCols: {
    flexDirection: 'row',
    marginTop: 4,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  skillChipTeachActive: {
    backgroundColor: '#059669',
    borderColor: '#34D399',
  },
  skillChipLearnActive: {
    backgroundColor: '#6D28D9',
    borderColor: '#A78BFA',
  },
  skillChipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  skillChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  addTagBtn: {
    backgroundColor: '#059669',
    borderRadius: 10,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupBtn: {
    backgroundColor: '#0E6245',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  signupBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 20,
  },
  loginLinkText: {
    color: '#5A6561',
    fontSize: 13,
  },
  linkHighlight: {
    color: '#0E6245',
    fontWeight: '700',
  },
});
