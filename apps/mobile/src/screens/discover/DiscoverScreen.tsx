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
  Image,
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
  X,
  UserCheck,
} from 'lucide-react-native';
import { BrandUnderline } from '../../components/common/ThemeSystem';

export const DiscoverScreen = ({ navigation }: any) => {
  const [query, setQuery] = useState('');
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formatFilter, setFormatFilter] = useState<'all' | 'workshops' | 'multi' | 'one_to_one'>('all');
  const [matchingUsers, setMatchingUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Private Code Modal
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joiningCode, setJoiningCode] = useState(false);

  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    fetchOpenSessions();
    if (query.trim().length > 0) {
      fetchUsers();
    } else {
      setMatchingUsers([]);
    }
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

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const data = await api.searchMentors(query).catch(() => []);
      setMatchingUsers(data || []);
    } catch {
      setMatchingUsers([]);
    } finally {
      setLoadingUsers(false);
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
    const cleanQ = q.replace(/^@+/, '').trim();

    const matchTitle =
      (s.title || '').toLowerCase().includes(q) ||
      (cleanQ ? (s.title || '').toLowerCase().includes(cleanQ) : false);

    const matchSkill =
      (s.skillName || '').toLowerCase().includes(q) ||
      (cleanQ ? (s.skillName || '').toLowerCase().includes(cleanQ) : false);

    const matchDesc =
      (s.description || '').toLowerCase().includes(q) ||
      (cleanQ ? (s.description || '').toLowerCase().includes(cleanQ) : false);

    // Host matching by name or username (support with or without leading @)
    const hostName = (s.hostName || '').toLowerCase();
    const hostUser = (s.hostUsername || '').toLowerCase();
    const matchHost =
      hostName.includes(q) ||
      hostUser.includes(q) ||
      (cleanQ ? hostName.includes(cleanQ) || hostUser.includes(cleanQ) : false);

    // Co-mentors matching (multi-host/multi-mentor)
    const matchMentors = (s.mentors || []).some((m) => {
      const mName = (m.name || '').toLowerCase();
      const mUser = (m.username || '').toLowerCase();
      return (
        mName.includes(q) ||
        mUser.includes(q) ||
        (cleanQ ? mName.includes(cleanQ) || mUser.includes(cleanQ) : false)
      );
    });

    // Target learner matching
    const targetLearner = (s.targetLearnerName || '').toLowerCase();
    const matchTargetLearner =
      targetLearner.includes(q) ||
      (cleanQ ? targetLearner.includes(cleanQ) : false);

    // Participants / learners matching
    const matchParticipants = (s.participants || []).some((p) => {
      const pName = (p.name || '').toLowerCase();
      const pUser = (p.username || '').toLowerCase();
      return (
        pName.includes(q) ||
        pUser.includes(q) ||
        (cleanQ ? pName.includes(cleanQ) || pUser.includes(cleanQ) : false)
      );
    });

    const matchTags = (s.skillsTags || []).some(
      (t) => t.toLowerCase().includes(q) || (cleanQ ? t.toLowerCase().includes(cleanQ) : false)
    );

    return (
      matchTitle ||
      matchSkill ||
      matchDesc ||
      matchHost ||
      matchMentors ||
      matchTargetLearner ||
      matchParticipants ||
      matchTags
    );
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
          placeholder="Search by topic, skill, mentor or @username"
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => setQuery('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ padding: 2 }}
          >
            <X size={16} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Campus Mentors & Peers Section (matches user names / usernames) */}
      {query.trim().length > 0 && (
        <View style={styles.usersSection}>
          <View style={styles.usersSectionHeader}>
            <Text style={styles.sectionTitle}>
              CAMPUS MENTORS & PEERS ({matchingUsers.length})
            </Text>
          </View>
          {loadingUsers ? (
            <ActivityIndicator size="small" color="#0E6245" style={{ marginVertical: 12 }} />
          ) : matchingUsers.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.usersScrollContainer}
            >
              {matchingUsers.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={styles.userCard}
                  activeOpacity={0.88}
                  onPress={() => navigation.navigate('Showcase', { userId: u.id })}
                >
                  <View style={styles.userCardTop}>
                    {u.avatarUrl ? (
                      <Image source={{ uri: u.avatarUrl }} style={styles.userAvatarImage} />
                    ) : (
                      <View style={styles.userAvatarCircle}>
                        <Text style={styles.userAvatarText}>{getInitials(u.name)}</Text>
                      </View>
                    )}
                    <View style={styles.userInfo}>
                      <Text style={styles.userNameText} numberOfLines={1}>
                        {u.name}
                      </Text>
                      <Text style={styles.userHandleText} numberOfLines={1}>
                        @{u.username}
                      </Text>
                    </View>
                  </View>
                  {u.bio ? (
                    <Text style={styles.userBioText} numberOfLines={2}>
                      {u.bio}
                    </Text>
                  ) : (
                    <Text style={styles.userBioText} numberOfLines={1}>
                      Campus Peer · Verified Mentor
                    </Text>
                  )}
                  <View style={styles.userActionRow}>
                    <Text style={styles.userActionText}>View portfolio</Text>
                    <ArrowUpRight size={13} color="#0E6245" style={{ marginLeft: 3 }} />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.noUsersBox}>
              <Text style={styles.noUsersText}>
                No direct mentor matches for "{query.trim()}". Searching active sessions below:
              </Text>
            </View>
          )}
        </View>
      )}

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
                Mentored by <Text style={styles.mentorNameHighlight}>{session.hostName || 'Campus Administrator'}</Text>
                {session.hostUsername ? <Text style={styles.mentorHandle}> (@{session.hostUsername})</Text> : null}
              </Text>

              {/* Co-mentors (Multi-host) */}
              {session.mentors && session.mentors.length > 0 && (
                <View style={styles.mentorMetaCapsule}>
                  <Users size={12} color="#0E6245" style={{ marginRight: 5 }} />
                  <Text style={styles.mentorMetaText} numberOfLines={1}>
                    Co-hosts: {session.mentors.map((m) => `${m.name}${m.username ? ` (@${m.username})` : ''}`).join(', ')}
                  </Text>
                </View>
              )}

              {/* 1-on-1 Target Learner */}
              {session.sessionType === SessionType.ONE_TO_ONE && session.targetLearnerName && (
                <View style={styles.mentorMetaCapsule}>
                  <UserCheck size={12} color="#0E6245" style={{ marginRight: 5 }} />
                  <Text style={styles.mentorMetaText} numberOfLines={1}>
                    Learner: {session.targetLearnerName}
                  </Text>
                </View>
              )}

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
  // Campus Mentors & Peers Section
  usersSection: {
    marginBottom: 20,
  },
  usersSectionHeader: {
    marginBottom: 10,
  },
  usersScrollContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 10,
  },
  userCard: {
    width: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8E5',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  userCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userAvatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
  },
  userAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#D8F3E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  userAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0E6245',
  },
  userInfo: {
    flex: 1,
  },
  userNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  userHandleText: {
    fontSize: 12,
    color: '#0E6245',
    fontWeight: '600',
    marginTop: 1,
  },
  userBioText: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 15,
    marginBottom: 10,
  },
  userActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
  },
  userActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0E6245',
  },
  noUsersBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  noUsersText: {
    fontSize: 12,
    color: '#6B7280',
  },
  mentorNameHighlight: {
    color: '#111827',
    fontWeight: '700',
  },
  mentorHandle: {
    color: '#0E6245',
    fontWeight: '600',
  },
  mentorMetaCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  mentorMetaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
});
