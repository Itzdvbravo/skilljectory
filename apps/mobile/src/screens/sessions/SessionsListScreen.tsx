import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import {
  SessionDto,
  SessionType,
  LocationMode,
  SessionStatus,
  ConfirmedBy,
} from '@skill-exchange/shared-types';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import {
  Calendar,
  Clock,
  MapPin,
  Globe,
  Plus,
  Users,
  Flame,
  CheckCircle2,
  Lock,
  ShieldCheck,
  ArrowUpRight,
  UserCheck,
  Check,
  X,
} from 'lucide-react-native';
import { BrandUnderline } from '../../components/common/ThemeSystem';

type FilterTab = 'all' | 'requests' | 'hosting' | 'joined' | 'completed';

export const SessionsListScreen = ({ navigation }: any) => {
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    fetchMySessions();
  }, []);

  const fetchMySessions = async () => {
    try {
      setLoading(true);
      const data = await api.getSessions('my').catch(() => []);
      setSessions(data || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleMentorResponse = async (session: SessionDto, accept: boolean) => {
    try {
      setActionLoadingId(session.id);
      const isOneToOne = session.sessionType === SessionType.ONE_TO_ONE;
      const res = await api.respondToMentorRequest(session.id, accept);
      Alert.alert(
        accept
          ? (isOneToOne ? 'Mentorship Session Confirmed! 🎓' : 'Co-Host Accepted! 🎉')
          : 'Invitation Declined',
        res.message ||
          (accept
            ? (isOneToOne
                ? 'You accepted this 1-on-1 mentorship session. It has been added to your schedule.'
                : 'You are now an official co-host for this workshop.')
            : 'Request declined.')
      );
      fetchMySessions();
    } catch (err: any) {
      Alert.alert('Notice', err.message || (accept ? 'Accepted.' : 'Declined.'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const isSessionPendingForUser = (s: SessionDto) => {
    const isMentorReq =
      s.isMentorInvited ||
      s.mentorInviteStatus === 'pending' ||
      s.mentors?.some((m) => m.mentorId === user?.id && m.status === 'pending');

    const myParticipant = s.participants?.find((p) => p.userId === user?.id);
    const hasAcceptedOneToOne =
      myParticipant?.confirmedBy === ConfirmedBy.SELF ||
      (myParticipant as any)?.confirmed_by === 'self' ||
      myParticipant?.attendanceConfirmed;

    const isOneToOneInvited =
      s.sessionType === SessionType.ONE_TO_ONE &&
      s.hostId !== user?.id &&
      !s.isHost &&
      (s.status === SessionStatus.SCHEDULED || (s.status as any) === 'scheduled') &&
      !hasAcceptedOneToOne &&
      (s.hasJoined || Boolean(myParticipant));

    return Boolean(isMentorReq || isOneToOneInvited);
  };

  const pendingRequests = sessions.filter(isSessionPendingForUser);

  const filteredSessions = sessions.filter((s) => {
    const isHost = s.hostId === user?.id || s.isHost;
    const isPendingReq = isSessionPendingForUser(s);
    const hasJoined = s.hasJoined || s.participants?.some((p) => p.userId === user?.id);

    const isCancelled = s.status === SessionStatus.CANCELLED || (s.status as any) === 'cancelled';
    const isCompleted = s.status === SessionStatus.COMPLETED || (s.status as any) === 'completed';
    const isConcludedOrCancelled = isCancelled || isCompleted;

    // Session History tab holds concluded & cancelled sessions exclusively
    if (activeTab === 'completed') return isConcludedOrCancelled;

    // All active tabs (All, Requests, Hosting, Joined) must NOT show concluded or cancelled sessions
    if (isConcludedOrCancelled) return false;

    if (activeTab === 'requests') return isPendingReq;
    if (activeTab === 'hosting') return isHost;
    if (activeTab === 'joined') return hasJoined && !isHost;
    return true; // 'all' tab shows all active non-concluded, non-cancelled sessions
  });

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

  const renderSessionItem = ({ item }: { item: SessionDto }) => {
    const isHost = item.hostId === user?.id || item.isHost;
    const isCancelled = item.status === SessionStatus.CANCELLED || (item.status as any) === 'cancelled';
    const isCompleted = item.status === SessionStatus.COMPLETED || (item.status as any) === 'completed';
    const isPendingReq = isSessionPendingForUser(item);
    const isOneToOne = item.sessionType === SessionType.ONE_TO_ONE;

    const myParticipant = item.participants?.find((p) => p.userId === user?.id);
    const hasAcceptedOneToOne =
      myParticipant?.confirmedBy === ConfirmedBy.SELF ||
      (myParticipant as any)?.confirmed_by === 'self' ||
      myParticipant?.attendanceConfirmed;

    const isOneToOneInvited =
      isOneToOne &&
      !isHost &&
      (item.status === SessionStatus.SCHEDULED || (item.status as any) === 'scheduled') &&
      !hasAcceptedOneToOne &&
      (item.hasJoined || Boolean(myParticipant));

    const maxCap = item.maxParticipants || 10;
    const currentCount = item.participantsCount ?? (item.participants?.length || 0);

    // Target learner name for 1-on-1
    const learnerParticipant = item.participants?.find((p) => p.userId !== item.hostId);
    const learnerDisplayName = item.targetLearnerName || learnerParticipant?.name || learnerParticipant?.username;

    // Sessions requiring changes/action get yellow (#FEF7DA), all others stay green (#EBF7F0)
    const requiresChanges =
      isPendingReq ||
      Boolean((item as any).requiresAction) ||
      (isHost && item.status === SessionStatus.COMPLETED && item.participants?.some((p) => !p.attendanceConfirmed)) ||
      (!isHost && item.status === SessionStatus.COMPLETED && myParticipant && !myParticipant.attendanceConfirmed);

    const cardBgColor = requiresChanges ? '#FEF7DA' : '#EBF7F0';

    return (
      <TouchableOpacity
        style={[styles.sessionCard, { backgroundColor: cardBgColor }]}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('SessionDetail', { session: item })}
      >
        {/* Prominent Action Required Request Banner (if pending invitation) */}
        {isPendingReq && (
          <View style={styles.actionRequiredBanner}>
            <View style={styles.actionBannerLeft}>
              <Text style={styles.actionBannerTitle}>
                {isOneToOneInvited ? '⚡ ACTION REQUIRED: 1-ON-1 REQUEST' : '⚡ ACTION REQUIRED: CO-HOST INVITE'}
              </Text>
              <Text style={styles.actionBannerSub}>
                {isOneToOneInvited
                  ? `You were invited to a 1-on-1 mentorship session with ${item.hostName || item.hostUsername || 'a mentor'}`
                  : `You were invited to co-host this session`}
              </Text>
            </View>

            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.actionDeclineBtn}
                onPress={() => handleMentorResponse(item, false)}
                disabled={actionLoadingId === item.id}
              >
                <X size={14} color="#991B1B" />
                <Text style={styles.actionDeclineText}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionAcceptBtn}
                onPress={() => handleMentorResponse(item, true)}
                disabled={actionLoadingId === item.id}
              >
                {actionLoadingId === item.id ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={14} color="#FFFFFF" />
                    <Text style={styles.actionAcceptText}>Accept</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Top Badges Row (Page 2 / 16) */}
        <View style={styles.cardBadgesRow}>
          <View style={styles.leftBadges}>
            {/* Format Pill */}
            <View style={styles.whiteBadge}>
              {isOneToOne ? (
                <Text style={styles.badgeText}>1-ON-1</Text>
              ) : item.sessionType === SessionType.MULTI_MENTOR ? (
                <>
                  <Users size={11} color="#111827" style={{ marginRight: 3 }} />
                  <Text style={styles.badgeText}>MULTI-HOST</Text>
                </>
              ) : (
                <>
                  <Users size={11} color="#111827" style={{ marginRight: 3 }} />
                  <Text style={styles.badgeText}>GROUP</Text>
                </>
              )}
            </View>

            {/* Private Code Pill */}
            {item.isPrivate && (
              <View style={styles.yellowBadge}>
                <Lock size={10} color="#854D0E" style={{ marginRight: 3 }} />
                <Text style={styles.yellowBadgeText}>PRIVATE</Text>
              </View>
            )}
          </View>

          {/* Right Role Badge */}
          <View style={styles.whiteBadge}>
            {isHost ? (
              <>
                <ShieldCheck size={11} color="#0E6245" style={{ marginRight: 4 }} />
                <Text style={styles.badgeText}>HOST ADMIN</Text>
              </>
            ) : (
              <>
                <CheckCircle2 size={11} color="#0E6245" style={{ marginRight: 4 }} />
                <Text style={styles.badgeText}>JOINED</Text>
              </>
            )}
          </View>
        </View>

        {/* Session Title */}
        <Text style={styles.cardTitle}>{item.title || item.skillName}</Text>

        {/* Host Line */}
        <View style={styles.hostLineRow}>
          <View style={styles.caAvatarMini}>
            <Text style={styles.caAvatarText}>CA</Text>
          </View>
          <Text style={styles.hostLineText}>
            Hosted by <Text style={{ fontWeight: '700' }}>{item.hostName || 'Campus Administrator'}</Text>
            {isHost ? ' (You)' : ''}
          </Text>
        </View>

        {/* 1-on-1 Learner Line (Artboard Page 2) */}
        {isOneToOne && learnerDisplayName ? (
          <Text style={styles.learnerCallout}>
            Learner: <Text style={{ fontWeight: '800' }}>{learnerDisplayName}</Text>
            {(item as any).targetLearnerUsername ? ` (@${(item as any).targetLearnerUsername})` : ''}
          </Text>
        ) : null}

        {/* Topic Skill Tags (Artboard Page 2) */}
        <View style={styles.tagPillRow}>
          <View style={styles.tagPill}>
            <Text style={styles.tagPillText}>{item.skillName || 'Skill'}</Text>
          </View>
          {item.skillsTags?.map((tag, idx) => (
            <View key={idx} style={styles.tagPill}>
              <Text style={styles.tagPillText}>{tag}</Text>
            </View>
          ))}
        </View>

        {/* Date & Duration Line */}
        <View style={styles.dateDurationRow}>
          <View style={styles.dateLeft}>
            <Calendar size={13} color="#111827" style={{ marginRight: 6 }} />
            <Text style={styles.dateText}>{formatSchedule(item.scheduledAt)}</Text>
          </View>
          <Text style={styles.durationRightText}>{item.durationHours} hr{item.durationHours > 1 ? 's' : ''}</Text>
        </View>

        {/* Footer State & Action */}
        <View style={styles.cardFooter}>
          {isCancelled ? (
            <Text style={styles.cancelledStatusText}>Cancelled</Text>
          ) : isCompleted ? (
            <Text style={styles.concludedStatusText}>✓ Concluded & Settled</Text>
          ) : isOneToOne ? (
            <Text style={styles.confirmedStatusText}>
              {item.learnerAccepted ? '✓ Student Confirmed' : '✓ 1-on-1 Scheduled'}
            </Text>
          ) : (
            <Text style={styles.studentCountStatusText}>
              {currentCount}/{maxCap} Students
            </Text>
          )}

          <View style={styles.viewEventRow}>
            <Text style={styles.viewEventText}>View event</Text>
            <ArrowUpRight size={15} color="#111827" style={{ marginLeft: 2 }} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Section (Artboard Page 2) */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.title}>My </Text>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.title}>sessions</Text>
                <BrandUnderline width={76} style={{ marginTop: 2 }} />
              </View>
            </View>
            <Text style={styles.subtitle}>
              Manage your teaching schedule, invitations, and joined events
            </Text>
          </View>

          <TouchableOpacity
            style={styles.hostBtn}
            onPress={() => navigation.navigate('CreateSession')}
            activeOpacity={0.88}
          >
            <Plus size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.hostBtnText}>Host</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Tabs Row (Artboard Page 2) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
        >
          {[
            { id: 'all', label: 'All' },
            { id: 'requests', label: `Requests${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}` },
            { id: 'hosting', label: 'Hosting' },
            { id: 'joined', label: 'Joined' },
            { id: 'completed', label: 'History' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabChip, isActive ? styles.tabChipActive : styles.tabChipInactive]}
                onPress={() => setActiveTab(tab.id as FilterTab)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    isActive ? styles.tabChipTextActive : styles.tabChipTextInactive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color="#0E6245" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredSessions}
          keyExtractor={(item) => item.id}
          renderItem={renderSessionItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchMySessions();
              }}
              tintColor="#0E6245"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Calendar size={40} color="#0E6245" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>
                {activeTab === 'completed' ? 'No session history yet' : 'No sessions in this tab'}
              </Text>
              <Text style={styles.emptySub}>
                {activeTab === 'requests'
                  ? 'No pending mentorship or co-host invitations at the moment.'
                  : activeTab === 'completed'
                  ? 'Concluded and cancelled sessions will appear here in your session history.'
                  : 'Start teaching by hosting a campus session!'}
              </Text>
              {activeTab !== 'requests' && activeTab !== 'completed' && (
                <TouchableOpacity
                  style={styles.emptyHostBtn}
                  onPress={() => navigation.navigate('CreateSession')}
                >
                  <Text style={styles.emptyHostBtnText}>Host a Session</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#F8FAF9',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#5A6561',
    marginTop: 4,
    maxWidth: 240,
    lineHeight: 18,
  },
  hostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18201D',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  hostBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  // Filter Tabs (Artboard Page 2)
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  tabChip: {
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabChipActive: {
    backgroundColor: '#18201D',
  },
  tabChipInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  tabChipText: {
    fontSize: 13,
  },
  tabChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tabChipTextInactive: {
    color: '#1F2937',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  // Session Card (Artboard Page 2 & 16)
  sessionCard: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  cardBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  leftBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  whiteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111827',
  },
  yellowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF7DA',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#FEF08A',
  },
  yellowBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#854D0E',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  hostLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  caAvatarMini: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0E6245',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  caAvatarText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  hostLineText: {
    fontSize: 13,
    color: '#1F2937',
  },
  learnerCallout: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0E6245',
    marginBottom: 10,
  },
  tagPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tagPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  tagPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  dateDurationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  durationRightText: {
    fontSize: 13,
    color: '#5A6561',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    paddingTop: 10,
    marginTop: 2,
  },
  concludedStatusText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0E6245',
  },
  confirmedStatusText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0E6245',
  },
  cancelledStatusText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
  studentCountStatusText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  viewEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewEventText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  // Action Required Request Banner
  actionRequiredBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  actionBannerLeft: {
    marginBottom: 8,
  },
  actionBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 2,
  },
  actionBannerSub: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 16,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionDeclineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 7,
    gap: 4,
  },
  actionDeclineText: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '700',
  },
  actionAcceptBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0E6245',
    borderRadius: 12,
    paddingVertical: 7,
    gap: 4,
  },
  actionAcceptText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  // Empty State
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8E5',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: '#5A6561',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyHostBtn: {
    backgroundColor: '#0E6245',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  emptyHostBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
