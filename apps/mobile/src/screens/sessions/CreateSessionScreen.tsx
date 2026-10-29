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
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import {
  Users,
  User,
  Flame,
  Info,
  Clock,
  Calendar,
  Globe,
  MapPin,
  Lock,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Megaphone,
  Check,
  ShieldCheck,
  Minus,
} from 'lucide-react-native';
import { BrandUnderline } from '../../components/common/ThemeSystem';

const DURATIONS: SessionDurationHours[] = [1, 1.5, 2, 2.5, 3];
const SUGGESTED_SKILLS = [
  'Architecture',
  'Cloud / AWS',
  'Data Structures',
  'Guitar & Music Theory',
  'Machine Learning',
  'Macroeconomics',
];
const POPULAR_SLOTS = ['09:00 AM', '11:00 AM', '02:00 PM', '04:30 PM'];

export const CreateSessionScreen = ({ navigation }: any) => {
  const currentUser = useAuthStore((s) => s.user);

  // Wizard Step: 1, 2, 3, 4
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form states
  const [sessionType, setSessionType] = useState<SessionType>(SessionType.GROUP);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skillsTags, setSkillsTags] = useState<string[]>(['React Native', 'Mobile Engineering']);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [targetLearnerName, setTargetLearnerName] = useState('Chiranjib Das');
  const [coHostUsername, setCoHostUsername] = useState('');

  // Date and Time selection
  const [calendarDate, setCalendarDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  });
  const [selectedHour, setSelectedHour] = useState<number>(4);
  const [selectedMinute, setSelectedMinute] = useState<string>(':00');
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('PM');

  // Step 3 settings
  const [maxParticipants, setMaxParticipants] = useState<number>(10);
  const [isPrivate, setIsPrivate] = useState<boolean>(false);

  // Step 4 settings
  const [durationHours, setDurationHours] = useState<SessionDurationHours>(1.5);
  const [locationMode, setLocationMode] = useState<LocationMode>(LocationMode.ONLINE);
  const [meetingLink, setMeetingLink] = useState('https://meet.google.com/abc-demo-room');
  const [announceToEveryone, setAnnounceToEveryone] = useState<boolean>(true);

  // Submit / Preview state
  const [submitLoading, setSubmitLoading] = useState(false);

  // Compute final scheduled date
  const computeFinalDate = () => {
    const d = new Date(calendarDate);
    let h = selectedHour;
    if (selectedPeriod === 'PM' && h < 12) h += 12;
    if (selectedPeriod === 'AM' && h === 12) h = 0;
    const m = parseInt(selectedMinute.replace(':', ''), 10) || 0;
    d.setHours(h, m, 0, 0);
    return d;
  };

  const handleAddSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (!trimmed || skillsTags.includes(trimmed)) return;
    if (skillsTags.length >= 6) {
      Alert.alert('Tag Limit', 'You can select up to 6 skills to teach.');
      return;
    }
    setSkillsTags([...skillsTags, trimmed]);
    setNewSkillInput('');
  };

  const handleRemoveSkill = (skill: string) => {
    setSkillsTags(skillsTags.filter((s) => s !== skill));
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!title.trim()) {
        Alert.alert('Event Title Required', 'Please enter a title for your session.');
        return;
      }
      if (sessionType === SessionType.ONE_TO_ONE && !targetLearnerName.trim()) {
        Alert.alert('Target Student Required', 'Please specify the student you want to mentor.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (skillsTags.length === 0) {
        Alert.alert('Skills Required', 'Please select or add at least 1 skill to teach.');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  const handleConfirmAndHost = async () => {
    const finalDate = computeFinalDate();
    if (finalDate.getTime() <= Date.now()) {
      Alert.alert('Invalid Time', 'Scheduled time must be in the future.');
      return;
    }

    try {
      setSubmitLoading(true);

      const session = await api.createSession({
        sessionType,
        skillId: 'skl_react_native',
        title: title.trim(),
        description: description.trim(),
        skillsTags,
        targetLearnerName: sessionType === SessionType.ONE_TO_ONE ? targetLearnerName.trim() : undefined,
        durationHours,
        scheduledAt: finalDate.toISOString(),
        locationMode,
        meetingLink: locationMode !== LocationMode.OFFLINE ? meetingLink : undefined,
        coMentorUsernames:
          sessionType === SessionType.MULTI_MENTOR && coHostUsername.trim()
            ? [coHostUsername.trim()]
            : undefined,
        maxParticipants: sessionType === SessionType.ONE_TO_ONE ? 1 : maxParticipants,
        isPrivate: sessionType === SessionType.ONE_TO_ONE ? true : isPrivate,
        announcedImmediately: sessionType !== SessionType.ONE_TO_ONE && !isPrivate ? announceToEveryone : false,
      });

      const privateMsg = session.joinCode
        ? `\n\n🔒 Private Code: ${session.joinCode}\nShare this with invited learners.`
        : '';

      Alert.alert(
        'Session Hosted! 🎓',
        `"${title.trim()}" is scheduled for ${finalDate.toLocaleDateString([], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })} at ${finalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.${privateMsg}`,
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create session. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Helper calendar calculations
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const monthName = calendarDate.toLocaleString('default', { month: 'long' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0

  const calendarDays = [];
  // Days of previous month placeholder
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push({ day: 0, isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push({ day: d, isCurrentMonth: true });
  }

  const handleSelectPopularSlot = (slotStr: string) => {
    // "04:30 PM"
    const parts = slotStr.split(' ');
    const timeParts = parts[0].split(':');
    const h = parseInt(timeParts[0], 10);
    const m = `:${timeParts[1]}`;
    const p = parts[1] as 'AM' | 'PM';
    setSelectedHour(h);
    setSelectedMinute(m);
    setSelectedPeriod(p);
  };

  return (
    <View style={styles.container}>
      {/* Top Header Row (Artboard Pages 3-6) */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => (currentStep > 1 ? setCurrentStep(currentStep - 1) : navigation.goBack())}
          style={styles.backBtn}
        >
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Host </Text>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.headerTitle}>session</Text>
            <BrandUnderline width={68} style={{ marginTop: 2 }} />
          </View>
        </View>

        <Text style={styles.stepIndicatorText}>Step {currentStep} of 4</Text>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= STEP 1: TITLE, FORMAT & OVERVIEW (Page 3) ================= */}
        {currentStep === 1 && (
          <View>
            {/* Mentor Banner */}
            <View style={styles.mentorBanner}>
              <View style={styles.mentorAvatarCircle}>
                <Text style={styles.mentorAvatarInitials}>CA</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mentorBannerLabel}>HOSTING AS</Text>
                <Text style={styles.mentorBannerName}>
                  {currentUser?.name || 'Campus Administrator'}
                </Text>
                <Text style={styles.mentorBannerUsername}>
                  @{currentUser?.username || 'admin'}
                </Text>
              </View>
              <View style={styles.verifiedBadge}>
                <ShieldCheck size={14} color="#0E6245" style={{ marginRight: 4 }} />
                <Text style={styles.verifiedBadgeText}>Verified host</Text>
              </View>
            </View>

            {/* Main Title & Subtitle */}
            <View style={styles.pageTitleBlock}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={styles.pageTitle}>Host a campus </Text>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.pageTitle}>session</Text>
                  <BrandUnderline width={76} style={{ marginTop: 2 }} />
                </View>
              </View>
              <Text style={styles.pageSubtitle}>
                Teach fellow students, build your portfolio and earn time-credits.
              </Text>
            </View>

            {/* Title & Overview Section */}
            <Text style={styles.sectionLabel}>TITLE & OVERVIEW</Text>

            <View style={styles.inputCard}>
              <View style={styles.inputHeaderRow}>
                <Text style={styles.inputLabel}>Event title *</Text>
                <Text style={styles.charCount}>{title.length}/80</Text>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Master React Native animations"
                placeholderTextColor="#9CA3AF"
                maxLength={80}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={[styles.inputCard, { marginTop: 14 }]}>
              <View style={styles.inputHeaderRow}>
                <Text style={styles.inputLabel}>Description</Text>
                <Text style={styles.charCount}>{description.length}/500</Text>
              </View>
              <TextInput
                style={[styles.textInput, { height: 75, textAlignVertical: 'top' }]}
                placeholder="What will students learn?"
                placeholderTextColor="#9CA3AF"
                multiline
                maxLength={500}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Session Format Section */}
            <Text style={[styles.sectionLabel, { marginTop: 22 }]}>SESSION FORMAT</Text>

            {/* Group Workshop Card */}
            <TouchableOpacity
              style={[
                styles.formatCard,
                sessionType === SessionType.GROUP ? styles.formatCardSelected : styles.formatCardUnselected,
              ]}
              onPress={() => setSessionType(SessionType.GROUP)}
              activeOpacity={0.88}
            >
              <Users size={20} color="#111827" style={{ marginRight: 14 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.formatCardTitle}>Group workshop</Text>
                <Text style={styles.formatCardDesc}>
                  Single host · 2–15 students · 1 cr anti-spam
                </Text>
              </View>
            </TouchableOpacity>

            {/* Multi-host Collaborative Card */}
            <TouchableOpacity
              style={[
                styles.formatCard,
                sessionType === SessionType.MULTI_MENTOR ? styles.formatCardSelected : styles.formatCardUnselected,
                { marginTop: 12 },
              ]}
              onPress={() => setSessionType(SessionType.MULTI_MENTOR)}
              activeOpacity={0.88}
            >
              <Flame size={20} color="#111827" style={{ marginRight: 14 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.formatCardTitle}>Multi-host collaborative</Text>
                <Text style={styles.formatCardDesc}>
                  Co-hosts get invites · 1.5 cr/mentor
                </Text>
              </View>
            </TouchableOpacity>

            {/* 1-on-1 Direct Mentoring Card */}
            <TouchableOpacity
              style={[
                styles.formatCard,
                sessionType === SessionType.ONE_TO_ONE ? styles.formatCardSelected : styles.formatCardUnselected,
                { marginTop: 12 },
              ]}
              onPress={() => setSessionType(SessionType.ONE_TO_ONE)}
              activeOpacity={0.88}
            >
              <User size={20} color="#111827" style={{ marginRight: 14 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.formatCardTitle}>1-on-1 direct mentoring</Text>
                <Text style={styles.formatCardDesc}>
                  One specific student · 1 cr/hr
                </Text>
              </View>
            </TouchableOpacity>

            {/* Conditional input for 1-on-1 */}
            {sessionType === SessionType.ONE_TO_ONE && (
              <View style={[styles.inputCard, { marginTop: 14 }]}>
                <Text style={styles.inputLabel}>Student to Mentor (Name or @username)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Chiranjib Das (@chira)"
                  placeholderTextColor="#9CA3AF"
                  value={targetLearnerName}
                  onChangeText={setTargetLearnerName}
                />
              </View>
            )}

            {/* Conditional input for Multi-host */}
            {sessionType === SessionType.MULTI_MENTOR && (
              <View style={[styles.inputCard, { marginTop: 14 }]}>
                <Text style={styles.inputLabel}>Co-Host Username</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. priya_sharma"
                  placeholderTextColor="#9CA3AF"
                  value={coHostUsername}
                  onChangeText={setCoHostUsername}
                  autoCapitalize="none"
                />
              </View>
            )}
          </View>
        )}

        {/* ================= STEP 2: SKILLS & CALENDAR (Page 4) ================= */}
        {currentStep === 2 && (
          <View>
            {/* Skills to teach header */}
            <View style={styles.skillsHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.subheadingText}>Skills to teach</Text>
              </View>
              <Text style={styles.tagsCountText}>{skillsTags.length} / 6 tags</Text>
            </View>

            {/* Selected Tags Pills */}
            <View style={styles.selectedTagsRow}>
              {skillsTags.map((tag) => (
                <View key={tag} style={styles.darkTagChip}>
                  <Text style={styles.darkTagChipText}>{tag}</Text>
                  <TouchableOpacity onPress={() => handleRemoveSkill(tag)} style={{ marginLeft: 6 }}>
                    <X size={13} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Add Custom Skill input */}
            <View style={styles.addSkillInputRow}>
              <TextInput
                style={styles.addSkillInput}
                placeholder="Add a custom skill"
                placeholderTextColor="#9CA3AF"
                value={newSkillInput}
                onChangeText={setNewSkillInput}
                onSubmitEditing={() => handleAddSkill(newSkillInput)}
              />
              <TouchableOpacity
                style={styles.addSkillBtn}
                onPress={() => handleAddSkill(newSkillInput)}
              >
                <Plus size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Suggested Topics Section */}
            <Text style={styles.suggestedTopicsHeader}>SUGGESTED TOPICS</Text>
            <View style={styles.suggestedGrid}>
              {SUGGESTED_SKILLS.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.suggestedPill}
                  onPress={() => handleAddSkill(item)}
                >
                  <Text style={styles.suggestedPillText}>+ {item}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* When Will it Happen (Calendar) */}
            <Text style={[styles.sectionLabel, { marginTop: 26 }]}>WHEN WILL IT HAPPEN?</Text>

            {/* Month Header */}
            <View style={styles.monthHeaderRow}>
              <Text style={styles.monthTitle}>
                {monthName} {year}
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => {
                    const prev = new Date(calendarDate);
                    prev.setMonth(prev.getMonth() - 1);
                    setCalendarDate(prev);
                  }}
                >
                  <ChevronLeft size={20} color="#111827" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const next = new Date(calendarDate);
                    next.setMonth(next.getMonth() + 1);
                    setCalendarDate(next);
                  }}
                >
                  <ChevronRight size={20} color="#111827" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Days of Week Header */}
            <View style={styles.daysOfWeekRow}>
              {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((d) => (
                <Text key={d} style={styles.dayOfWeekText}>
                  {d}
                </Text>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {calendarDays.map((item, index) => {
                if (!item.isCurrentMonth) {
                  return (
                    <View key={index} style={styles.calendarDayCell}>
                      <View style={styles.dayDashedCircle}>
                        <Text style={styles.dayMutedText}>{item.day || ''}</Text>
                      </View>
                    </View>
                  );
                }

                const isSelected = calendarDate.getDate() === item.day;
                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.calendarDayCell}
                    onPress={() => {
                      const newD = new Date(calendarDate);
                      newD.setDate(item.day);
                      setCalendarDate(newD);
                    }}
                  >
                    <View
                      style={[
                        styles.dayCircle,
                        isSelected && styles.dayCircleSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isSelected && styles.dayTextSelected,
                        ]}
                      >
                        {item.day}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ================= STEP 3: TIME, CAPACITY & PRIVACY (Page 5) ================= */}
        {currentStep === 3 && (
          <View>
            {/* Header: Select Session Time */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Clock size={16} color="#111827" style={{ marginRight: 6 }} />
              <Text style={styles.subheadingText}>Select session time</Text>
            </View>

            {/* Popular Slots */}
            <Text style={styles.smallSectionLabel}>POPULAR SLOTS</Text>
            <View style={styles.slotsRow}>
              {POPULAR_SLOTS.map((slot) => (
                <TouchableOpacity
                  key={slot}
                  style={styles.slotPill}
                  onPress={() => handleSelectPopularSlot(slot)}
                >
                  <Text style={styles.slotPillText}>{slot}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Hour Selector (1 - 12) */}
            <Text style={[styles.smallSectionLabel, { marginTop: 14 }]}>HOUR</Text>
            <View style={styles.numGrid}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => {
                const isSelected = selectedHour === h;
                return (
                  <TouchableOpacity
                    key={h}
                    style={[styles.numCell, isSelected && styles.numCellSelected]}
                    onPress={() => setSelectedHour(h)}
                  >
                    <Text style={[styles.numText, isSelected && styles.numTextSelected]}>
                      {h}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Minute & Period Selectors */}
            <View style={styles.minutePeriodRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.smallSectionLabel}>MINUTE</Text>
                <View style={styles.minuteGrid}>
                  {[':00', ':15', ':30', ':45'].map((m) => {
                    const isSelected = selectedMinute === m;
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[styles.minuteCell, isSelected && styles.numCellSelected]}
                        onPress={() => setSelectedMinute(m)}
                      >
                        <Text style={[styles.numText, isSelected && styles.numTextSelected]}>
                          {m}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={{ width: 110 }}>
                <Text style={styles.smallSectionLabel}>PERIOD</Text>
                <View style={styles.periodRow}>
                  {(['AM', 'PM'] as const).map((p) => {
                    const isSelected = selectedPeriod === p;
                    return (
                      <TouchableOpacity
                        key={p}
                        style={[styles.periodCell, isSelected && styles.numCellSelected]}
                        onPress={() => setSelectedPeriod(p)}
                      >
                        <Text style={[styles.numText, isSelected && styles.numTextSelected]}>
                          {p}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Time Summary Banner */}
            <View style={styles.timeSummaryBanner}>
              <Calendar size={15} color="#0E6245" style={{ marginRight: 8 }} />
              <Text style={styles.timeSummaryText}>
                {computeFinalDate().toLocaleDateString('default', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}{' '}
                at {selectedHour}{selectedMinute} {selectedPeriod}
              </Text>
            </View>

            {/* Max Students (Capacity Stepper) */}
            <Text style={[styles.sectionLabel, { marginTop: 22 }]}>MAX STUDENTS</Text>
            <View style={styles.capacityCard}>
              <View>
                <Text style={styles.capacityTitle}>Limit: {maxParticipants} students</Text>
                <Text style={styles.capacitySub}>Min 2 · Max 15</Text>
              </View>

              <View style={styles.stepperWrap}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setMaxParticipants(Math.max(2, maxParticipants - 1))}
                >
                  <Minus size={16} color="#111827" />
                </TouchableOpacity>

                <Text style={styles.stepperCount}>{maxParticipants}</Text>

                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setMaxParticipants(Math.min(15, maxParticipants + 1))}
                >
                  <Plus size={16} color="#111827" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Access & Privacy */}
            <Text style={[styles.sectionLabel, { marginTop: 22 }]}>ACCESS & PRIVACY</Text>
            <View style={styles.privacyRow}>
              {/* Public Card */}
              <TouchableOpacity
                style={[
                  styles.privacyCard,
                  !isPrivate ? styles.privacyCardSelected : styles.privacyCardUnselected,
                ]}
                onPress={() => setIsPrivate(false)}
                activeOpacity={0.88}
              >
                <Globe size={18} color="#111827" style={{ marginBottom: 6 }} />
                <Text style={styles.privacyTitle}>Public</Text>
                <Text style={styles.privacySub}>Open to any campus student</Text>
              </TouchableOpacity>

              {/* Private Card */}
              <TouchableOpacity
                style={[
                  styles.privacyCard,
                  isPrivate ? styles.privacyCardSelected : styles.privacyCardUnselected,
                ]}
                onPress={() => setIsPrivate(true)}
                activeOpacity={0.88}
              >
                <Lock size={18} color="#111827" style={{ marginBottom: 6 }} />
                <Text style={styles.privacyTitle}>Private</Text>
                <Text style={styles.privacySub}>Needs a secret joining code</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ================= STEP 4: DURATION, LOCATION & CONFIRM (Page 6) ================= */}
        {currentStep === 4 && (
          <View>
            {/* Duration Section */}
            <Text style={styles.sectionLabel}>DURATION</Text>
            <View style={styles.durationRow}>
              {DURATIONS.map((dur) => {
                const isSelected = durationHours === dur;
                return (
                  <TouchableOpacity
                    key={dur}
                    style={[
                      styles.durationPill,
                      isSelected ? styles.durationPillSelected : styles.durationPillUnselected,
                    ]}
                    onPress={() => setDurationHours(dur)}
                  >
                    <Text
                      style={[
                        styles.durationPillText,
                        isSelected ? styles.durationPillTextSelected : styles.durationPillTextUnselected,
                      ]}
                    >
                      {dur} hr{dur > 1 ? 's' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Location Section */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>LOCATION</Text>
            <View style={styles.locationRow}>
              {[
                { mode: LocationMode.ONLINE, label: 'Online', icon: Globe },
                { mode: LocationMode.OFFLINE, label: 'Offline', icon: MapPin },
                { mode: LocationMode.HYBRID, label: 'Hybrid', icon: Globe },
              ].map((loc) => {
                const isSelected = locationMode === loc.mode;
                const IconCmp = loc.icon;
                return (
                  <TouchableOpacity
                    key={loc.mode}
                    style={[
                      styles.locationPill,
                      isSelected ? styles.locationPillSelected : styles.locationPillUnselected,
                    ]}
                    onPress={() => setLocationMode(loc.mode)}
                  >
                    <IconCmp size={14} color={isSelected ? '#FFFFFF' : '#111827'} style={{ marginRight: 6 }} />
                    <Text
                      style={[
                        styles.locationPillText,
                        isSelected ? styles.durationPillTextSelected : styles.durationPillTextUnselected,
                      ]}
                    >
                      {loc.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Meeting link input */}
            <View style={[styles.inputCard, { marginTop: 14 }]}>
              <Text style={styles.inputLabel}>Meeting link</Text>
              <TextInput
                style={styles.textInput}
                placeholder="https://meet.google.com/..."
                placeholderTextColor="#9CA3AF"
                value={meetingLink}
                onChangeText={setMeetingLink}
              />
            </View>

            {/* Announcement Toggle Card */}
            <View style={styles.announceCard}>
              <Megaphone size={20} color="#111827" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.announceTitle}>
                  Announce to everyone <Text style={{ color: '#0E6245' }}>(free)</Text>
                </Text>
                <Text style={styles.announceSub}>
                  3 free announcements left in your allowance.
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.checkCircleToggle,
                  announceToEveryone ? styles.checkCircleActive : styles.checkCircleInactive,
                ]}
                onPress={() => setAnnounceToEveryone(!announceToEveryone)}
              >
                {announceToEveryone && <Check size={14} color="#FFFFFF" />}
              </TouchableOpacity>
            </View>

            {/* Credit Economy Preview Card (Artboard Page 6) */}
            <View style={styles.economyPreviewCard}>
              <View style={styles.economyHeaderRow}>
                <Info size={16} color="#0E6245" style={{ marginRight: 6 }} />
                <Text style={styles.economyHeaderTitle}>Credit economy preview</Text>
              </View>

              <View style={styles.economyLineRow}>
                <Text style={styles.economyLineLabel}>Host upfront fee</Text>
                <Text style={styles.economyLineNegative}>-1 credit</Text>
              </View>

              <View style={styles.economyLineRow}>
                <Text style={styles.economyLineLabel}>Learner cost (per person)</Text>
                <Text style={styles.economyLineNeutral}>{durationHours} credits</Text>
              </View>

              <View style={styles.economyLineRow}>
                <Text style={styles.economyLineLabel}>Estimated teaching payout</Text>
                <Text style={styles.economyLinePositive}>
                  +{Math.round(maxParticipants * durationHours)} credits
                </Text>
              </View>

              <View style={styles.economyDivider} />

              <View style={styles.economyLineRow}>
                <Text style={styles.economyNetLabel}>Net host result</Text>
                <Text style={styles.economyNetPositive}>
                  +{Math.round(maxParticipants * durationHours) - 1} credits
                </Text>
              </View>

              <Text style={styles.economyDisclaimer}>
                The 1 credit anti-spam fee is non-refundable. Earnings floor is max(3, attendees × duration).
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Floating Navigation CTA */}
      <View style={styles.bottomBar}>
        {currentStep < 4 ? (
          <TouchableOpacity style={styles.primaryNextBtn} onPress={handleNext}>
            <Text style={styles.primaryBtnText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.primaryNextBtn}
            onPress={handleConfirmAndHost}
            disabled={submitLoading}
          >
            {submitLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>Confirm & host session</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  // Top Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: '#F8FAF9',
  },
  backBtn: {
    padding: 4,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  stepIndicatorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5A6561',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 100,
  },
  // Mentor banner (Step 1)
  mentorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF7F0',
    borderRadius: 20,
    padding: 14,
    marginBottom: 20,
  },
  mentorAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0E6245',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  mentorAvatarInitials: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  mentorBannerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0E6245',
    letterSpacing: 0.5,
  },
  mentorBannerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  mentorBannerUsername: {
    fontSize: 12,
    color: '#0E6245',
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
  },
  // Page Title Block
  pageTitleBlock: {
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#5A6561',
    marginTop: 4,
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#5A6561',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  inputHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  textInput: {
    fontSize: 14,
    color: '#111827',
    padding: 0,
  },
  // Format Cards (Step 1)
  formatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 16,
  },
  formatCardSelected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#111827',
  },
  formatCardUnselected: {
    backgroundColor: '#EBF7F0',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  formatCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  formatCardDesc: {
    fontSize: 12,
    color: '#5A6561',
  },
  // Step 2 Styles (Skills & Calendar)
  skillsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  subheadingText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  tagsCountText: {
    fontSize: 12,
    color: '#5A6561',
    fontWeight: '600',
  },
  selectedTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  darkTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18201D',
    borderRadius: 16,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  darkTagChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addSkillInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8E5',
    paddingLeft: 14,
    paddingRight: 6,
    height: 48,
    marginBottom: 18,
  },
  addSkillInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  addSkillBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#18201D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestedTopicsHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  suggestedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  suggestedPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  suggestedPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  // Calendar (Step 2)
  monthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  daysOfWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dayOfWeekText: {
    width: 40,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayCell: {
    width: '14.28%',
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleSelected: {
    backgroundColor: '#18201D',
  },
  dayDashedCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dayMutedText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  // Step 3 Styles (Time Slots)
  smallSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#5A6561',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  slotsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  slotPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  slotPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  numGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  numCell: {
    width: '15.3%',
    height: 42,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  numCellSelected: {
    backgroundColor: '#18201D',
    borderColor: '#18201D',
  },
  numText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  numTextSelected: {
    color: '#FFFFFF',
  },
  minutePeriodRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  minuteGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  minuteCell: {
    flex: 1,
    height: 42,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  periodRow: {
    flexDirection: 'row',
    gap: 6,
  },
  periodCell: {
    flex: 1,
    height: 42,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  timeSummaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF7F0',
    borderRadius: 14,
    padding: 12,
    marginTop: 16,
  },
  timeSummaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0E6245',
  },
  capacityCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EBF7F0',
    borderRadius: 18,
    padding: 16,
  },
  capacityTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0E6245',
  },
  capacitySub: {
    fontSize: 12,
    color: '#5A6561',
    marginTop: 2,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperCount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    minWidth: 20,
    textAlign: 'center',
  },
  privacyRow: {
    flexDirection: 'row',
    gap: 12,
  },
  privacyCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
  },
  privacyCardSelected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#111827',
  },
  privacyCardUnselected: {
    backgroundColor: '#EBF7F0',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  privacySub: {
    fontSize: 11,
    color: '#5A6561',
    marginTop: 2,
    lineHeight: 14,
  },
  // Step 4 Styles (Duration, Location, Preview)
  durationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durationPill: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationPillSelected: {
    backgroundColor: '#18201D',
  },
  durationPillUnselected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  durationPillText: {
    fontSize: 13,
  },
  durationPillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  durationPillTextUnselected: {
    color: '#111827',
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  locationPill: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationPillSelected: {
    backgroundColor: '#18201D',
  },
  locationPillUnselected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  locationPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  announceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8E5',
    marginTop: 14,
  },
  announceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  announceSub: {
    fontSize: 12,
    color: '#5A6561',
    marginTop: 2,
  },
  checkCircleToggle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleActive: {
    backgroundColor: '#0E6245',
  },
  checkCircleInactive: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  economyPreviewCard: {
    backgroundColor: '#EBF7F0',
    borderRadius: 20,
    padding: 18,
    marginTop: 18,
  },
  economyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  economyHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  economyLineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  economyLineLabel: {
    fontSize: 13,
    color: '#374151',
  },
  economyLineNegative: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B91C1C',
  },
  economyLineNeutral: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  economyLinePositive: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0E6245',
  },
  economyDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    marginVertical: 8,
  },
  economyNetLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  economyNetPositive: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0E6245',
  },
  economyDisclaimer: {
    fontSize: 11,
    color: '#5A6561',
    lineHeight: 16,
    marginTop: 8,
  },
  // Bottom Floating Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#F8FAF9',
    borderTopWidth: 1,
    borderTopColor: '#EEF2F0',
  },
  primaryNextBtn: {
    backgroundColor: '#0E6245',
    borderRadius: 28,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
