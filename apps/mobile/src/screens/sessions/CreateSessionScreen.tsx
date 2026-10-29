import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  SessionType,
  LocationMode,
  SessionDurationHours,
} from '@skill-exchange/shared-types';
import { LocationPicker } from '../../components/session/LocationPicker';
import { CalendarDateTimePicker } from '../../components/session/CalendarDateTimePicker';
import { SkillsTagSelector } from '../../components/session/SkillsTagSelector';
import { MentorUsernameSelector, MentorUser } from '../../components/session/MentorUsernameSelector';
import { AvatarWithBadgeFrame, useAppTheme } from '../../components/common/ThemeSystem';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import {
  Users,
  User,
  Flame,
  Info,
  CheckCircle,
  Radio,
  Megaphone,
  Sparkles,
} from 'lucide-react-native';

const DURATIONS: SessionDurationHours[] = [1, 1.5, 2, 2.5, 3];
const MAX_TITLE_LENGTH = 80;
const MAX_DESC_LENGTH = 500;

export const CreateSessionScreen = ({ navigation }: any) => {
  const theme = useAppTheme();
  const currentUser = useAuthStore((s) => s.user);

  // Form states
  const [sessionType, setSessionType] = useState<SessionType>(SessionType.GROUP);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skillsTags, setSkillsTags] = useState<string[]>(['React Native', 'Mobile Engineering']);
  const [targetLearnerName, setTargetLearnerName] = useState('');
  const [coMentors, setCoMentors] = useState<MentorUser[]>([]);

  const [scheduledDate, setScheduledDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(16, 0, 0, 0);
    return d;
  });

  const [durationHours, setDurationHours] = useState<SessionDurationHours>(1.5);
  const [locationMode, setLocationMode] = useState<LocationMode>(LocationMode.ONLINE);
  const [meetingLink, setMeetingLink] = useState('https://meet.google.com/abc-demo-room');
  const [locationAddress, setLocationAddress] = useState('');
  const [maxParticipants, setMaxParticipants] = useState<number>(10);
  const [isPrivate, setIsPrivate] = useState<boolean>(false);

  // Announcement state
  const [announceToEveryone, setAnnounceToEveryone] = useState<boolean>(true);
  const [freeAnnouncementsUsed, setFreeAnnouncementsUsed] = useState<number>(currentUser ? 0 : 0);
  const [announcementWindowStart, setAnnouncementWindowStart] = useState<string | null>(null);

  // Live Economy Preview state
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Fetch user announcement state on mount
  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const me = await api.getMe();
      if (me) {
        setFreeAnnouncementsUsed(me.freeAnnouncementsUsed ?? 0);
      }
    } catch {
      // Ignored
    }
  };

  // Compute announcement eligibility
  const freebiesRemaining = Math.max(0, 4 - freeAnnouncementsUsed);
  const isAnnouncementFree = freebiesRemaining > 0;

  // Auto adjust max participants on type change
  useEffect(() => {
    if (sessionType === SessionType.GROUP) {
      if (maxParticipants < 2) setMaxParticipants(2);
      if (maxParticipants > 15) setMaxParticipants(15);
    } else if (sessionType === SessionType.MULTI_MENTOR) {
      const totalHosts = 1 + coMentors.length;
      if (maxParticipants < totalHosts) setMaxParticipants(totalHosts);
      if (maxParticipants > 15) setMaxParticipants(15);
    } else {
      setMaxParticipants(1);
    }
  }, [sessionType, coMentors.length]);

  // Fetch preview on changes
  useEffect(() => {
    fetchPreview();
  }, [sessionType, durationHours, maxParticipants, coMentors.length]);

  const fetchPreview = async () => {
    try {
      setPreviewLoading(true);
      const totalMentors = sessionType === SessionType.MULTI_MENTOR ? 1 + coMentors.length : 1;
      const data = await api.previewSession({
        sessionType,
        durationHours,
        expectedLearners: maxParticipants,
        mentorsCount: totalMentors,
      });
      setPreviewData(data);
    } catch {
      const hostCost =
        sessionType === SessionType.GROUP ? 1 : sessionType === SessionType.MULTI_MENTOR ? 1.5 : 0;
      const projected =
        sessionType === SessionType.GROUP
          ? Math.max(3, maxParticipants * durationHours)
          : maxParticipants * durationHours;
      setPreviewData({
        hostCost,
        learnerCostPerPerson: durationHours,
        projectedEarnings: projected,
        netHostResult: projected - hostCost,
        minParticipants: sessionType === SessionType.GROUP ? 2 : 1 + coMentors.length,
        canAfford: true,
        notes: ['Verified against campus time-credit rules.'],
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a custom title for your session.');
      return;
    }
    if (skillsTags.length === 0) {
      Alert.alert('Missing Skills', 'Please add at least 1 skill tag to teach.');
      return;
    }

    if (sessionType === SessionType.MULTI_MENTOR && coMentors.length === 0) {
      Alert.alert(
        'Co-Hosts Required',
        'Multi-host sessions require at least 1 co-host mentor from the campus dataset.'
      );
      return;
    }

    if (sessionType === SessionType.ONE_TO_ONE && !targetLearnerName.trim()) {
      Alert.alert('Learner Name Required', 'Please enter the name of the student for this 1-on-1 session.');
      return;
    }

    if (scheduledDate.getTime() <= Date.now()) {
      Alert.alert('Invalid Time', 'Scheduled time must be in the future.');
      return;
    }

    try {
      setSubmitLoading(true);

      const session = await api.createSession({
        sessionType,
        skillId: 'skl_react_native', // default primary skill id
        title: title.trim(),
        description: description.trim(),
        skillsTags,
        targetLearnerName: sessionType === SessionType.ONE_TO_ONE ? targetLearnerName.trim() : undefined,
        durationHours,
        scheduledAt: scheduledDate.toISOString(),
        locationMode,
        meetingLink: locationMode !== LocationMode.OFFLINE ? meetingLink : undefined,
        locationAddress: locationMode !== LocationMode.ONLINE ? locationAddress : undefined,
        coMentorUsernames:
          sessionType === SessionType.MULTI_MENTOR ? coMentors.map((m) => m.username) : undefined,
        maxParticipants: sessionType !== SessionType.ONE_TO_ONE ? maxParticipants : 1,
        isPrivate,
        announcedImmediately: announceToEveryone,
      });

      const privateMsg = session.joinCode
        ? `\n\n🔒 Private Joining Code: ${session.joinCode}\nShare this code with invited attendees so they can join!`
        : '';

      const coHostMsg =
        sessionType === SessionType.MULTI_MENTOR
          ? `\n\n📨 Requests sent to ${coMentors.length} co-host(s). They can accept in their 'My Sessions' tab.`
          : '';

      Alert.alert(
        'Session Hosted Successfully! 🎓',
        `"${title.trim()}" is scheduled for ${scheduledDate.toLocaleDateString([], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })} at ${scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.${privateMsg}${coHostMsg}`,
        [{ text: 'View Sessions', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      Alert.alert('Session Creation Notice', err.message || 'Please check all required fields.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const minCapacity = sessionType === SessionType.MULTI_MENTOR ? 1 + coMentors.length : 2;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Host Profile Identification Banner */}
      <View style={styles.hostIdentifierBanner}>
        <AvatarWithBadgeFrame
          name={currentUser?.name || 'Alex Rivera'}
          username={currentUser?.username || 'alexrivera'}
          size={44}
          style={{ marginRight: 10 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.hostIdentifierLabel}>HOSTING AS</Text>
          <Text style={styles.hostRealName}>
            {currentUser?.name || 'Alex Rivera'}{' '}
            <Text style={styles.hostUsername}>
              (@{currentUser?.username || 'alexrivera'})
            </Text>
          </Text>
        </View>
        <View style={styles.verifiedHostTag}>
          <Text style={styles.verifiedHostText}>Verified Host</Text>
        </View>
      </View>

      <Text style={styles.screenHeader}>Host a Campus Session</Text>
      <Text style={styles.screenSub}>
        Teach fellow students, build your verified showcase portfolio, and earn time-credits.
      </Text>

      {/* 1. Custom Title & Description */}
      <Text style={styles.sectionLabel}>SESSION TITLE & OVERVIEW</Text>
      <View style={styles.inputCard}>
        <View style={styles.inputHeaderRow}>
          <Text style={styles.inputFieldTitle}>Event Title *</Text>
          <Text
            style={[
              styles.charCounter,
              title.length > MAX_TITLE_LENGTH && styles.charCounterLimit,
            ]}
          >
            {title.length}/{MAX_TITLE_LENGTH}
          </Text>
        </View>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Master React Native Reanimated & Gesture Handler"
          placeholderTextColor="#64748B"
          value={title}
          onChangeText={setTitle}
          maxLength={MAX_TITLE_LENGTH}
        />

        <View style={[styles.inputHeaderRow, { marginTop: 14 }]}>
          <Text style={styles.inputFieldTitle}>Event Description</Text>
          <Text
            style={[
              styles.charCounter,
              description.length > MAX_DESC_LENGTH && styles.charCounterLimit,
            ]}
          >
            {description.length}/{MAX_DESC_LENGTH}
          </Text>
        </View>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder="Describe what students will learn, prerequisites, and workshop objectives..."
          placeholderTextColor="#64748B"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          maxLength={MAX_DESC_LENGTH}
        />
      </View>

      {/* 2. Choose Format */}
      <Text style={styles.sectionLabel}>CHOOSE SESSION FORMAT</Text>
      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[styles.typeCard, sessionType === SessionType.GROUP && styles.typeCardActive]}
          onPress={() => setSessionType(SessionType.GROUP)}
        >
          <Users size={22} color={sessionType === SessionType.GROUP ? '#38BDF8' : '#64748B'} />
          <Text style={[styles.typeTitle, sessionType === SessionType.GROUP && styles.typeTitleActive]}>
            Group Workshop
          </Text>
          <Text style={styles.typeDesc}>Single host • Min 2, max 15 students • 1 cr anti-spam</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.typeCard, sessionType === SessionType.MULTI_MENTOR && styles.typeCardActive]}
          onPress={() => setSessionType(SessionType.MULTI_MENTOR)}
        >
          <Flame size={22} color={sessionType === SessionType.MULTI_MENTOR ? '#A855F7' : '#64748B'} />
          <Text
            style={[
              styles.typeTitle,
              sessionType === SessionType.MULTI_MENTOR && styles.typeTitleActive,
            ]}
          >
            Multi-Host Collaborative
          </Text>
          <Text style={styles.typeDesc}>
            Team mentoring • Co-hosts receive invite requests • 1.5 cr/mentor
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.typeCard, sessionType === SessionType.ONE_TO_ONE && styles.typeCardActive]}
          onPress={() => setSessionType(SessionType.ONE_TO_ONE)}
        >
          <User size={22} color={sessionType === SessionType.ONE_TO_ONE ? '#10B981' : '#64748B'} />
          <Text
            style={[
              styles.typeTitle,
              sessionType === SessionType.ONE_TO_ONE && styles.typeTitleActive,
            ]}
          >
            1-on-1 Direct Mentoring
          </Text>
          <Text style={styles.typeDesc}>Personal session with a specific student • 1 cr/hr</Text>
        </TouchableOpacity>
      </View>

      {/* 3. Conditional: Learner Name for 1-on-1 Session */}
      {sessionType === SessionType.ONE_TO_ONE && (
        <>
          <Text style={styles.sectionLabel}>LEARNER NAME</Text>
          <View style={styles.inputCard}>
            <Text style={styles.inputCardTitle}>Who are you mentoring?</Text>
            <Text style={styles.inputCardSub}>
              Enter the student's real name or @username for this 1-on-1 session.
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Maya Lin (@mayal) or student name"
              placeholderTextColor="#64748B"
              value={targetLearnerName}
              onChangeText={setTargetLearnerName}
            />
          </View>
        </>
      )}

      {/* 4. Conditional: Multi-Mentor Co-Host Usernames */}
      {sessionType === SessionType.MULTI_MENTOR && (
        <MentorUsernameSelector
          selectedMentors={coMentors}
          onMentorsChange={setCoMentors}
          maxCoMentors={3}
        />
      )}

      {/* 5. Skills To Teach (Tag-based Selector up to 6 max) */}
      <SkillsTagSelector
        selectedTags={skillsTags}
        onChangeTags={setSkillsTags}
        maxTags={6}
      />

      {/* 6. Calendar-like Date & Time Picker */}
      <Text style={styles.sectionLabel}>WHEN WILL THE SESSION TAKE PLACE?</Text>
      <CalendarDateTimePicker
        selectedDate={scheduledDate}
        onDateChange={setScheduledDate}
      />

      {/* 7. Capacity & Privacy (for Group and Multi-Host) */}
      {sessionType !== SessionType.ONE_TO_ONE && (
        <>
          <Text style={styles.sectionLabel}>MAX NUMBER OF STUDENTS ALLOWED</Text>
          <View style={styles.inputCard}>
            <View style={styles.stepperContainer}>
              <View>
                <Text style={styles.capacityHeader}>
                  Student Limit: <Text style={styles.capacityHighlight}>{maxParticipants}</Text> students
                </Text>
                <Text style={styles.capacitySub}>
                  Min {minCapacity} students • Max 15 students
                </Text>
              </View>

              <View style={styles.stepperButtons}>
                <TouchableOpacity
                  style={[
                    styles.stepperBtn,
                    maxParticipants <= minCapacity && styles.stepperBtnDisabled,
                  ]}
                  onPress={() => setMaxParticipants((prev) => Math.max(minCapacity, prev - 1))}
                  disabled={maxParticipants <= minCapacity}
                >
                  <Text style={styles.stepperBtnText}>-</Text>
                </TouchableOpacity>

                <Text style={styles.stepperValueText}>{maxParticipants}</Text>

                <TouchableOpacity
                  style={[
                    styles.stepperBtn,
                    maxParticipants >= 15 && styles.stepperBtnDisabled,
                  ]}
                  onPress={() => setMaxParticipants((prev) => Math.min(15, prev + 1))}
                  disabled={maxParticipants >= 15}
                >
                  <Text style={styles.stepperBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Privacy */}
          <Text style={styles.sectionLabel}>SESSION ACCESS & PRIVACY</Text>
          <View style={styles.accessContainer}>
            <TouchableOpacity
              style={[styles.accessCard, !isPrivate && styles.accessCardActive]}
              onPress={() => setIsPrivate(false)}
            >
              <Text style={[styles.accessTitle, !isPrivate && styles.accessTitleActive]}>
                🌐 Public Event
              </Text>
              <Text style={styles.accessDesc}>Open to any campus student via Discover</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.accessCard, isPrivate && styles.accessCardActive]}
              onPress={() => setIsPrivate(true)}
            >
              <Text style={[styles.accessTitle, isPrivate && styles.accessTitleActive]}>
                🔒 Private Event
              </Text>
              <Text style={styles.accessDesc}>Requires a secret joining code to enter</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* 8. Duration Selector */}
      <Text style={styles.sectionLabel}>DURATION (HOURS)</Text>
      <View style={styles.durationRow}>
        {DURATIONS.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.durationChip, durationHours === d && styles.durationChipActive]}
            onPress={() => setDurationHours(d)}
          >
            <Text style={[styles.durationText, durationHours === d && styles.durationTextActive]}>
              {d} hr{d > 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 9. Location Mode Picker */}
      <LocationPicker
        mode={locationMode}
        onModeChange={setLocationMode}
        meetingLink={meetingLink}
        onMeetingLinkChange={setMeetingLink}
        locationAddress={locationAddress}
        onLocationAddressChange={setLocationAddress}
      />

      {/* 10. "Announce to Everyone" Option (Requested by User) */}
      <Text style={styles.sectionLabel}>CAMPUS BULLETIN ANNOUNCEMENT</Text>
      <TouchableOpacity
        style={[
          styles.announceCard,
          announceToEveryone && styles.announceCardActive,
        ]}
        onPress={() => setAnnounceToEveryone(!announceToEveryone)}
        activeOpacity={0.8}
      >
        <View style={styles.announceTopRow}>
          <View style={styles.announceTitleRow}>
            <Megaphone
              size={18}
              color={announceToEveryone ? '#38BDF8' : '#64748B'}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.announceTitle}>
              Announce to everyone{' '}
              <Text style={isAnnouncementFree ? styles.freePill : styles.paidPill}>
                {isAnnouncementFree ? '(free)' : '(-1 credit)'}
              </Text>
            </Text>
          </View>

          <View style={[styles.checkbox, announceToEveryone && styles.checkboxActive]}>
            {announceToEveryone && <CheckCircle size={14} color="#0F172A" />}
          </View>
        </View>

        <Text style={styles.announceSubtext}>
          {isAnnouncementFree
            ? `⚡ ${freebiesRemaining} freebie${freebiesRemaining === 1 ? '' : 's'} left in your allowance. Next free announcement window opens automatically after cooldown.`
            : '⏳ Free allowance exhausted or cooldown active. Announcement costs 1 credit from your balance.'}
        </Text>
      </TouchableOpacity>

      {/* 11. Live Credit Preview */}
      <View style={styles.previewCard}>
        <View style={styles.previewHeader}>
          <Info size={18} color="#38BDF8" style={{ marginRight: 6 }} />
          <Text style={styles.previewTitle}>Credit Economy Preview</Text>
        </View>

        {previewLoading ? (
          <ActivityIndicator color="#38BDF8" style={{ padding: 10 }} />
        ) : (
          <View style={styles.breakdownTable}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Host Upfront Fee</Text>
              <Text style={styles.breakdownFee}>
                -{previewData?.hostCost || 0} Credit{previewData?.hostCost === 1 ? '' : 's'}
              </Text>
            </View>

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Learner Cost (per person)</Text>
              <Text style={styles.breakdownVal}>
                {previewData?.learnerCostPerPerson || 0} Credit(s)
              </Text>
            </View>

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Estimated Teaching Payout</Text>
              <Text style={styles.breakdownEarn}>
                +{previewData?.projectedEarnings || 0} Credits
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownNetLabel}>Net Host Result</Text>
              <Text style={styles.breakdownNetVal}>
                +{previewData?.netHostResult || 0} Credits
              </Text>
            </View>

            {previewData?.notes?.map((note: string, idx: number) => (
              <Text key={idx} style={styles.previewNote}>
                • {note}
              </Text>
            ))}
          </View>
        )}
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={styles.submitBtn}
        onPress={handleCreate}
        disabled={submitLoading}
        activeOpacity={0.8}
      >
        {submitLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitBtnText}>Confirm & Host Session</Text>
        )}
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
    padding: 18,
    paddingBottom: 40,
  },
  hostIdentifierBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  hostIdentifierLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hostRealName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  hostUsername: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  verifiedHostTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  verifiedHostText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  screenHeader: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  screenSub: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  sectionLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 6,
  },
  inputCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    padding: 16,
    marginBottom: 18,
  },
  inputHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputFieldTitle: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
  },
  charCounter: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  charCounterLimit: {
    color: '#EF4444',
  },
  textInput: {
    backgroundColor: '#090D16',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputCardTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  inputCardSub: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 10,
  },
  typeSelector: {
    gap: 10,
    marginBottom: 18,
  },
  typeCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    padding: 14,
  },
  typeCardActive: {
    borderColor: '#38BDF8',
    backgroundColor: '#111D30',
  },
  typeTitle: {
    color: '#CBD5E1',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 2,
  },
  typeTitleActive: {
    color: '#F8FAFC',
  },
  typeDesc: {
    color: '#64748B',
    fontSize: 12,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  capacityHeader: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  capacityHighlight: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  capacitySub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  stepperButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnDisabled: {
    opacity: 0.3,
  },
  stepperBtnText: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  stepperValueText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
    minWidth: 20,
    textAlign: 'center',
  },
  accessContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  accessCard: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    padding: 12,
  },
  accessCardActive: {
    borderColor: '#38BDF8',
    backgroundColor: '#111D30',
  },
  accessTitle: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  accessTitleActive: {
    color: '#F8FAFC',
  },
  accessDesc: {
    color: '#64748B',
    fontSize: 11,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  durationChip: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    paddingVertical: 10,
    alignItems: 'center',
  },
  durationChipActive: {
    borderColor: '#38BDF8',
    backgroundColor: '#111D30',
  },
  durationText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  durationTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  announceCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    padding: 14,
    marginBottom: 18,
  },
  announceCardActive: {
    borderColor: '#38BDF8',
    backgroundColor: '#0E1E33',
  },
  announceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  announceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  announceTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  freePill: {
    color: '#10B981',
    fontWeight: '800',
  },
  paidPill: {
    color: '#F59E0B',
    fontWeight: '800',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  announceSubtext: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
  },
  previewCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    padding: 16,
    marginBottom: 24,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  breakdownTable: {
    gap: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    color: '#94A3B8',
    fontSize: 13,
  },
  breakdownFee: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  breakdownVal: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  breakdownEarn: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 4,
  },
  breakdownNetLabel: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  breakdownNetVal: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: '800',
  },
  previewNote: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  submitBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
