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
  Globe,
  MapPin,
  KeyRound,
  Compass,
  ArrowUpRight,
  Plus,
} from 'lucide-react-native';
import { BrandUnderline } from '../../components/common/ThemeSystem';

export const DiscoverScreen = ({ navigation }: any) => {
  const [query, setQuery] = useState('');
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formatFilter, setFormatFilter] = useState<'all' | 'workshops' | 'multi' | 'one_to_one'>('all');

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
      const data = await api.getSessions('discover', query).catch(() => []);
      setSessions(data || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleJoinDirect = async (session: SessionDto) => {
    try {
      await api.joinSession(session.id);
      Alert.alert('Session Joined!', `You are registered for ${session.skillName || session.title}.`);
      fetchOpenSessions();
    } catch (err: any) {
      Alert.alert('Registration Notice', err.message || 'Successfully joined session.');
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
    if (s.isPrivate) return false;
    if (formatFilter === 'workshops' && s.sessionType !== SessionType.GROUP) return false;
    if (formatFilter === 'multi' && s.sessionType !== SessionType.MULTI_MENTOR) return false;
    if (formatFilter === 'one_to_one' && s.sessionType !== SessionType.ONE_TO_ONE) return false;

    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();
    const matchTitle = (s.title || '').toLowerCase().includes(q);
    const matchSkill = (s.skillName || '').toLowerCase().includes(q);
    const matchDesc = (s.description || '').toLowerCase().includes(q);
    const matchHost =
      (s.hostName || '').toLowerCase().includes(q) ||
      (s.hostUsername || '').toLowerCase().includes(q);
    const matchTags = (s.skillsTags || []).some((t) => t.toLowerCase().includes(q));

    return matchTitle || matchSkill || matchDesc || matchHost || matchTags;
  });

  const getInitials = (name?: string) => {
    if (!name) return 'CA';
    return name
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const formatSchedule = (dateStr: string | Date) => {
    const d = new Date(dateStr);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = days[d.getDay()];
    const date = d.getDate();
    const month = months[d.getMonth()];
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12 || 12;
    return `${day}, ${date} ${month} at ${hours}:${minutes} ${ampm}`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchOpenSessions();
          }}
          tintColor="#0E6245"
        />
      }
    >
      {/* Top Profile / Action Bar (Page 1 Artboard) */}
      <View style={styles.topBar}>
        <View style={styles.topProfileLeft}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{getInitials(user?.name || 'Campus Administrator')}</Text>
          </View>
          <Text style={styles.topProfileName}>{user?.name || 'Campus Administrator'}</Text>
        </View>

        <TouchableOpacity
          style={styles.enterCodeBtn}
          onPress={() => setCodeModalOpen(true)}
          activeOpacity={0.8}
        >
          <KeyRound size={14} color="#854D0E" style={{ marginRight: 6 }} />
          <Text style={styles.enterCodeText}>Enter code</Text>
        </TouchableOpacity>
      </View>

      {/* Campus Session Radar Title (Page 1 Artboard) */}
      <View style={styles.headerSection}>
        <View style={styles.radarTitleRow}>
          <Text style={styles.radarTitle}>Campus session </Text>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.radarTitle}>radar</Text>
            <BrandUnderline width={64} style={{ marginTop: 2 }} />
          </View>
        </View>
        <Text style={styles.radarSubtitle}>
          Upcoming peer sessions open to everyone
        </Text>
      </View>

      {/* Search Input (Page 1 Artboard) */}
      <View style={styles.searchContainer}>
        <Search size={18} color="#6B7280" style={{ marginRight: 10 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by topic, skill or mentor"
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {/* Filter Chips Row (Page 1 Artboard) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChipRow}
      >
        {[
          { id: 'all', label: 'All' },
          { id: 'workshops', label: 'Workshops' },
          { id: 'multi', label: 'Multi-host' },
          { id: 'one_to_one', label: '1-on-1' },
        ].map((f) => {
          const isActive = formatFilter === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterChip, isActive ? styles.filterChipActive : styles.filterChipInactive]}
              onPress={() => setFormatFilter(f.id as any)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isActive ? styles.filterChipTextActive : styles.filterChipTextInactive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Section Subheader */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          OPEN FOR REGISTRATION ({filteredSessions.length})
        </Text>
      </View>

      {/* Session Cards Feed */}
      {loading ? (
        <ActivityIndicator size="large" color="#0E6245" style={{ marginTop: 36 }} />
      ) : filteredSessions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Compass size={44} color="#0E6245" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyTitle}>No sessions found</Text>
          <Text style={styles.emptySub}>
            Be the first to host an exchange session and earn campus time-credits!
          </Text>
          <TouchableOpacity
            style={styles.hostNowBtn}
            onPress={() => navigation.navigate('CreateSession')}
            activeOpacity={0.88}
          >
            <Plus size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.hostNowText}>Host a session</Text>
          </TouchableOpacity>
        </View>
      ) : (
        filteredSessions.map((session) => {
          const isOneToOne = session.sessionType === SessionType.ONE_TO_ONE;
          const maxCap = session.maxParticipants || 10;
          const currentCount = session.participantsCount ?? (session.participants?.length || 0);
          const spotsLeft = Math.max(0, maxCap - currentCount);
          const isFull = !isOneToOne && spotsLeft === 0;

          const myParticipant = session.participants?.find((p: any) => p.userId === user?.id);
          const requiresChanges = (session as any).hasPendingInvite || (session as any).requiresAction || (myParticipant && !myParticipant.attendanceConfirmed && session.status === 'completed');

          // Green (#EBF7F0) as standard session color, Yellow (#FEF7DA) for sessions requiring changes/action
          const cardBgColor = requiresChanges ? '#FEF7DA' : '#EBF7F0';

          return (
            <TouchableOpacity
              key={session.id}
              style={[styles.sessionCard, { backgroundColor: cardBgColor }]}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('SessionDetail', { session })}
            >
              {/* Top Capsule Row */}
              <View style={styles.cardHeaderRow}>
                <View style={styles.capsuleBadge}>
                  {isOneToOne ? (
                    <Text style={styles.capsuleBadgeText}>1-ON-1</Text>
                  ) : session.sessionType === SessionType.MULTI_MENTOR ? (
                    <>
                      <Users size={12} color="#111827" style={{ marginRight: 4 }} />
                      <Text style={styles.capsuleBadgeText}>MULTI-HOST</Text>
                    </>
                  ) : (
                    <>
                      <Users size={12} color="#111827" style={{ marginRight: 4 }} />
                      <Text style={styles.capsuleBadgeText}>GROUP</Text>
                    </>
                  )}
                </View>

                <View style={styles.capsuleBadge}>
                  {session.locationMode === LocationMode.OFFLINE ? (
                    <>
                      <MapPin size={12} color="#111827" style={{ marginRight: 4 }} />
                      <Text style={styles.capsuleBadgeText}>Offline</Text>
                    </>
                  ) : (
                    <>
                      <Globe size={12} color="#111827" style={{ marginRight: 4 }} />
                      <Text style={styles.capsuleBadgeText}>Online</Text>
                    </>
                  )}
                </View>
              </View>

              {/* Title & Mentor */}
              <Text style={styles.cardTitle}>{session.skillName || session.title}</Text>
              <Text style={styles.mentorText}>
                Mentored by {session.hostName || session.hostUsername || 'Campus Administrator'}
              </Text>

              {/* Date Capsule Banner */}
              <View style={styles.whiteCapsuleRow}>
                <Calendar size={14} color="#111827" style={{ marginRight: 6 }} />
                <Text style={styles.whiteCapsuleText}>
                  {formatSchedule(session.scheduledAt)}
                </Text>
              </View>

              {/* Spots / Capacity (Group sessions) */}
              {!isOneToOne && (
                <View style={styles.whiteCapsuleRow}>
                  <Users size={14} color="#111827" style={{ marginRight: 6 }} />
                  <Text style={styles.whiteCapsuleText}>
                    {currentCount}/{maxCap} students joined · {spotsLeft} spots left
                  </Text>
                </View>
              )}

              {/* Bottom Meta & Action Row */}
              <View style={styles.cardFooter}>
                <View style={styles.metaLeft}>
                  <Clock size={13} color="#111827" style={{ marginRight: 5 }} />
                  <Text style={styles.metaTimeCreditText}>
                    {session.durationHours} hr{session.durationHours > 1 ? 's' : ''} · {session.durationHours} credit{session.durationHours > 1 ? 's' : ''}
                  </Text>
                </View>

                <View style={styles.joinActionRow}>
                  <Text style={styles.joinActionText}>
                    {isFull ? 'Full' : 'Join event'}
                  </Text>
                  {!isFull && <ArrowUpRight size={15} color="#111827" style={{ marginLeft: 2 }} />}
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {/* Private Code Entry Modal */}
      <Modal visible={codeModalOpen} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Enter Private Code</Text>
            <Text style={styles.modalSub}>
              Enter the unique private pass code (e.g. CAMP-XXXX) shared by the host:
            </Text>

            <TextInput
              style={styles.joinCodeInput}
              placeholder="CAMP-1234"
              placeholderTextColor="#9CA3AF"
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
    backgroundColor: '#F8FAF9',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  // Top bar (Page 1)
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  topProfileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0E6245',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  topProfileName: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  enterCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF7DA',
    borderRadius: 18,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#FEF08A',
  },
  enterCodeText: {
    color: '#854D0E',
    fontSize: 13,
    fontWeight: '600',
  },
  // Radar Header (Page 1)
  headerSection: {
    marginBottom: 16,
  },
  radarTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  radarTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  radarSubtitle: {
    fontSize: 14,
    color: '#5A6561',
    marginTop: 4,
    lineHeight: 20,
  },
  // Search bar (Page 1)
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#E2E8E5',
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: '#111827',
    fontSize: 14,
  },
  // Filter chips (Page 1)
  filterChipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 22,
  },
  filterChip: {
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: '#18201D',
  },
  filterChipInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  filterChipText: {
    fontSize: 13,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterChipTextInactive: {
    color: '#1F2937',
    fontWeight: '600',
  },
  // Section subheader
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#5A6561',
    letterSpacing: 0.8,
  },
  // Session Cards (Page 1)
  sessionCard: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  capsuleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  capsuleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111827',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  mentorText: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '500',
    marginBottom: 12,
  },
  whiteCapsuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  whiteCapsuleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 8,
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaTimeCreditText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  joinActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  joinActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  // Empty card
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8E5',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  hostNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E6245',
    borderRadius: 24,
    paddingVertical: 11,
    paddingHorizontal: 20,
  },
  hostNowText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  // Modal
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 13,
    color: '#5A6561',
    lineHeight: 18,
    marginBottom: 16,
  },
  joinCodeInput: {
    backgroundColor: '#F8FAF9',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8E5',
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 20,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#F0F4F2',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 14,
  },
  confirmCodeBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#0E6245',
    alignItems: 'center',
  },
  confirmCodeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
