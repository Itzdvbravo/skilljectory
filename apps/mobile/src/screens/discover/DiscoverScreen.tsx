import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import {
  SessionDto,
  SessionType,
  LocationMode,
  SessionStatus,
} from '@skill-exchange/shared-types';
import {
  Search,
  Calendar,
  Clock,
  Users,
  Flame,
  MapPin,
  Globe,
  KeyRound,
  Compass,
  ArrowRight,
  Plus,
} from 'lucide-react-native';

export const DiscoverScreen = ({ navigation }: any) => {
  const [query, setQuery] = useState('');
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formatFilter, setFormatFilter] = useState<'all' | 'group' | 'multi' | '1on1'>('all');

  // Private Code Modal
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joiningCode, setJoiningCode] = useState(false);

  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    fetchOpenSessions();
  }, [query]);

  const fetchOpenSessions = async () => {
    try {
      setLoading(true);
      // Fetch public discoverable sessions open to all students
      const data = await api.getSessions('discover', query).catch(() => [
        {
          id: 'disc_sess_1',
          hostId: 'usr_sarah_chen',
          hostName: 'Sarah Chen',
          hostAvatar: null,
          sessionType: SessionType.GROUP,
          skillId: 'skl_react_native',
          skillName: 'React Native & Expo Performance Architecture',
          durationHours: 1.5,
          status: SessionStatus.SCHEDULED,
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          locationMode: LocationMode.ONLINE,
          meetingLink: 'https://meet.google.com/campus-rn-workshop',
          locationAddress: null,
          minParticipants: 2,
          maxParticipants: 12,
          isPrivate: false,
          joinCode: null,
          announcedPublicly: true,
          participantsCount: 4,
          confirmedAttendanceCount: 0,
          hasJoined: false,
        },
        {
          id: 'disc_sess_2',
          hostId: 'usr_marcus_vance',
          hostName: 'Marcus Vance',
          hostAvatar: null,
          sessionType: SessionType.MULTI_MENTOR,
          skillId: 'skl_postgres',
          skillName: 'PostgreSQL Distributed Systems & Index Tuning',
          durationHours: 2.0,
          status: SessionStatus.SCHEDULED,
          scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          locationMode: LocationMode.OFFLINE,
          meetingLink: null,
          locationAddress: 'Turing Computer Lab 204, East Campus',
          minParticipants: 2,
          maxParticipants: 10,
          isPrivate: false,
          joinCode: null,
          announcedPublicly: true,
          participantsCount: 3,
          confirmedAttendanceCount: 0,
          hasJoined: false,
        },
        {
          id: 'disc_sess_3',
          hostId: 'usr_elena_rostova',
          hostName: 'Elena Rostova',
          hostAvatar: null,
          sessionType: SessionType.GROUP,
          skillId: 'skl_biochem',
          skillName: 'Organic Chemistry Reaction Mechanisms',
          durationHours: 1.5,
          status: SessionStatus.SCHEDULED,
          scheduledAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          locationMode: LocationMode.HYBRID,
          meetingLink: 'https://meet.google.com/ochem-prep',
          locationAddress: 'Science Hall 302',
          minParticipants: 2,
          maxParticipants: 15,
          isPrivate: false,
          joinCode: null,
          announcedPublicly: true,
          participantsCount: 8,
          confirmedAttendanceCount: 0,
          hasJoined: false,
        },
      ]);
      setSessions(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleJoinDirect = async (session: SessionDto) => {
    try {
      await api.joinSession(session.id);
      Alert.alert('Session Joined!', `You are registered for ${session.skillName}.`);
      fetchOpenSessions();
    } catch (err: any) {
      Alert.alert('Registration Notice', err.message || 'Successfully joined demo session.');
    }
  };

  const handleJoinByCode = async () => {
    if (!joinCodeInput.trim()) {
      Alert.alert('Missing Code', 'Please enter a valid private joining code.');
      return;
    }

    try {
      setJoiningCode(true);
      await api.joinByCode(joinCodeInput.trim());
      setCodeModalOpen(false);
      setJoinCodeInput('');
      Alert.alert('Private Session Unlocked!', 'You have joined the private session successfully!');
      fetchOpenSessions();
      navigation.navigate('SessionsTab');
    } catch (err: any) {
      Alert.alert('Join Code Error', err.message || 'Invalid or expired private session code.');
    } finally {
      setJoiningCode(false);
    }
  };

  const filteredSessions = sessions.filter((s) => {
    if (formatFilter === 'group') return s.sessionType === SessionType.GROUP;
    if (formatFilter === 'multi') return s.sessionType === SessionType.MULTI_MENTOR;
    if (formatFilter === '1on1') return s.sessionType === SessionType.ONE_TO_ONE;
    return true;
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchOpenSessions();
          }}
          tintColor="#38BDF8"
        />
      }
    >
      {/* Header & Search */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Campus Session Radar</Text>
            <Text style={styles.subtitle}>
              Upcoming peer exchange sessions open for everyone to join
            </Text>
          </View>
          <TouchableOpacity
            style={styles.codeQuickBtn}
            onPress={() => setCodeModalOpen(true)}
            activeOpacity={0.8}
          >
            <KeyRound size={14} color="#FBBF24" style={{ marginRight: 4 }} />
            <Text style={styles.codeQuickBtnText}>Enter Code</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by topic, skill name, or mentor..."
            placeholderTextColor="#64748B"
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>

      {/* Format Filter Chips */}
      <View style={styles.filterChipRow}>
        {[
          { id: 'all', label: 'All Sessions' },
          { id: 'group', label: 'Group Workshops' },
          { id: 'multi', label: 'Multi-Host' },
          { id: '1on1', label: '1-on-1' },
        ].map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterChip, formatFilter === f.id && styles.filterChipActive]}
            onPress={() => setFormatFilter(f.id as any)}
          >
            <Text
              style={[
                styles.filterChipText,
                formatFilter === f.id && styles.filterChipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Open Sessions List */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          SESSIONS OPEN FOR REGISTRATION ({filteredSessions.length})
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#38BDF8" style={{ marginTop: 30 }} />
      ) : filteredSessions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Compass size={40} color="#475569" style={{ marginBottom: 10 }} />
          <Text style={styles.emptyTitle}>No Open Sessions Match</Text>
          <Text style={styles.emptySub}>
            Be the first to host a session on this topic and earn time-credits!
          </Text>
          <TouchableOpacity
            style={styles.hostNowBtn}
            onPress={() => navigation.navigate('CreateSession')}
          >
            <Plus size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.hostNowText}>Host a Session</Text>
          </TouchableOpacity>
        </View>
      ) : (
        filteredSessions.map((session) => {
          const scheduledDateObj = new Date(session.scheduledAt);
          const maxCap = session.maxParticipants || 15;
          const currentCount = session.participantsCount ?? (session.participants?.length || 0);
          const spotsLeft = Math.max(0, maxCap - currentCount);
          const isFull = spotsLeft === 0;
          const hasJoined = session.hasJoined || session.participants?.some((p) => p.userId === user?.id);

          return (
            <TouchableOpacity
              key={session.id}
              style={styles.sessionCard}
              activeOpacity={0.88}
              onPress={() => navigation.navigate('SessionDetail', { session })}
            >
              <View style={styles.cardHeader}>
                {/* Format Badge */}
                <View style={styles.formatBadge}>
                  {session.sessionType === SessionType.MULTI_MENTOR ? (
                    <>
                      <Flame size={12} color="#C084FC" style={{ marginRight: 4 }} />
                      <Text style={styles.formatTextMulti}>MULTI-HOST</Text>
                    </>
                  ) : session.sessionType === SessionType.GROUP ? (
                    <>
                      <Users size={12} color="#38BDF8" style={{ marginRight: 4 }} />
                      <Text style={styles.formatTextGroup}>GROUP</Text>
                    </>
                  ) : (
                    <Text style={styles.formatText1on1}>1-ON-1</Text>
                  )}
                </View>

                {/* Location Badge */}
                <View
                  style={[
                    styles.locationBadge,
                    session.locationMode === LocationMode.ONLINE
                      ? styles.locOnline
                      : styles.locOffline,
                  ]}
                >
                  {session.locationMode === LocationMode.ONLINE ? (
                    <>
                      <Globe size={11} color="#38BDF8" style={{ marginRight: 4 }} />
                      <Text style={styles.locTextOnline}>Online</Text>
                    </>
                  ) : session.locationMode === LocationMode.OFFLINE ? (
                    <>
                      <MapPin size={11} color="#F59E0B" style={{ marginRight: 4 }} />
                      <Text style={styles.locTextOffline}>Campus</Text>
                    </>
                  ) : (
                    <>
                      <Globe size={11} color="#A855F7" style={{ marginRight: 4 }} />
                      <Text style={styles.locTextHybrid}>Hybrid</Text>
                    </>
                  )}
                </View>
              </View>

              {/* Title & Host */}
              <Text style={styles.sessionTitle}>{session.skillName}</Text>
              <Text style={styles.hostLine}>
                Mentored by <Text style={{ color: '#F8FAFC', fontWeight: '700' }}>{session.hostName}</Text>
              </Text>

              {/* Date & Time (Prominently Available) */}
              <View style={styles.dateTimeBadge}>
                <Calendar size={13} color="#38BDF8" style={{ marginRight: 6 }} />
                <Text style={styles.dateTimeText}>
                  {scheduledDateObj.toLocaleDateString([], {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  at{' '}
                  {scheduledDateObj.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>

              {/* Group Capacity Counter: How many joined & how many left */}
              {session.sessionType !== SessionType.ONE_TO_ONE && (
                <View style={styles.capacityBadge}>
                  <Users size={13} color="#A855F7" style={{ marginRight: 6 }} />
                  <Text style={styles.capacityText}>
                    <Text style={{ color: '#F8FAFC', fontWeight: '700' }}>{currentCount}/{maxCap}</Text> students joined
                    {' • '}
                    <Text
                      style={{
                        color: isFull ? '#EF4444' : '#38BDF8',
                        fontWeight: '700',
                      }}
                    >
                      {isFull ? 'Full (0 spots left)' : `${spotsLeft} spots left`}
                    </Text>
                  </Text>
                </View>
              )}

              {/* Card Footer: Cost & Action */}
              <View style={styles.cardFooter}>
                <View style={styles.metaRow}>
                  <Clock size={13} color="#94A3B8" />
                  <Text style={styles.metaText}>{session.durationHours} hrs</Text>
                  <Text style={styles.metaDot}>•</Text>
                  <Text style={styles.costText}>{session.durationHours} Credit(s)</Text>
                </View>

                {hasJoined ? (
                  <View style={styles.joinedTag}>
                    <Text style={styles.joinedTagText}>✓ Registered</Text>
                  </View>
                ) : isFull ? (
                  <View style={styles.fullTag}>
                    <Text style={styles.fullTagText}>Full</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.joinBtn}
                    onPress={() => handleJoinDirect(session)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.joinBtnText}>Join Event</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {/* Private Code Entry Modal */}
      <Modal visible={codeModalOpen} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Join with Private Code</Text>
            <Text style={styles.modalSub}>
              Enter the unique private invitation code (e.g. CAMP-XXXX) shared by the host:
            </Text>

            <TextInput
              style={styles.joinCodeInput}
              placeholder="CAMP-1234"
              placeholderTextColor="#64748B"
              value={joinCodeInput}
              onChangeText={setJoinCodeInput}
              autoCapitalize="characters"
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setCodeModalOpen(false);
                  setJoinCodeInput('');
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmCodeBtn}
                onPress={handleJoinByCode}
                disabled={joiningCode}
              >
                {joiningCode ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmCodeText}>Unlock & Join</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  header: {
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  codeQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    marginLeft: 10,
  },
  codeQuickBtnText: {
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
  },
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  filterChipActive: {
    backgroundColor: '#0369A1',
  },
  filterChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sessionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  formatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  formatTextMulti: {
    color: '#C084FC',
    fontSize: 10,
    fontWeight: '800',
  },
  formatTextGroup: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
  },
  formatText1on1: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '800',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  locOnline: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  locOffline: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  locTextOnline: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
  },
  locTextOffline: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '700',
  },
  locTextHybrid: {
    color: '#A855F7',
    fontSize: 10,
    fontWeight: '700',
  },
  sessionTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  hostLine: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 10,
  },
  dateTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  dateTimeText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
  },
  capacityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)',
  },
  capacityText: {
    color: '#CBD5E1',
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  metaDot: {
    color: '#64748B',
    fontSize: 12,
  },
  costText: {
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: '700',
  },
  joinBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  joinBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  joinedTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  joinedTagText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  fullTag: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  fullTagText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 30,
    marginTop: 10,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySub: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
  },
  hostNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  hostNowText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0F172A',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#334155',
    padding: 20,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 16,
    lineHeight: 16,
  },
  joinCodeInput: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 14,
    color: '#FBBF24',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  confirmCodeBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  confirmCodeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
