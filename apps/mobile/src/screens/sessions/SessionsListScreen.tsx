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
} from 'react-native';
import {
  SessionDto,
  SessionType,
  LocationMode,
  SessionStatus,
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
  AlertOctagon,
  ChevronRight,
  UserCheck,
  Inbox,
  Check,
  X,
} from 'lucide-react-native';
import { LapsedBanner } from '../../components/common/LapsedBanner';
import { AvatarWithBadgeFrame, useAppTheme } from '../../components/common/ThemeSystem';

type FilterTab = 'all' | 'requests' | 'hosting' | 'joined' | 'completed';

export const SessionsListScreen = ({ navigation }: any) => {
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const user = useAuthStore((s) => s.user);
  const theme = useAppTheme();

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

  const handleMentorResponse = async (sessionId: string, accept: boolean) => {
    try {
      setActionLoadingId(sessionId);
      const res = await api.respondToMentorRequest(sessionId, accept);
      Alert.alert(
        accept ? 'Co-Host Accepted! 🎉' : 'Invitation Declined',
        res.message || (accept ? 'You are now an official co-host for this workshop.' : 'Request declined.')
      );
      fetchMySessions();
    } catch (err: any) {
      Alert.alert('Notice', err.message || (accept ? 'Co-host accepted.' : 'Declined.'));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Pending Co-Host Requests count
  const pendingRequests = sessions.filter(
    (s) =>
      s.isMentorInvited ||
      s.mentorInviteStatus === 'pending' ||
      s.mentors?.some((m) => m.mentorId === user?.id && m.status === 'pending')
  );

  // Filter based on active tab
  const filteredSessions = sessions.filter((s) => {
    const isHost = s.hostId === user?.id || s.isHost;
    const isPendingReq =
      s.isMentorInvited ||
      s.mentorInviteStatus === 'pending' ||
      s.mentors?.some((m) => m.mentorId === user?.id && m.status === 'pending');
    const hasJoined = s.hasJoined || s.participants?.some((p) => p.userId === user?.id);

    if (activeTab === 'requests') return isPendingReq;
    if (activeTab === 'hosting') return isHost && s.status !== SessionStatus.COMPLETED;
    if (activeTab === 'joined') return hasJoined && !isHost && s.status !== SessionStatus.COMPLETED;
    if (activeTab === 'completed') return s.status === SessionStatus.COMPLETED;
    return true; // 'all'
  });

  const renderSessionItem = ({ item }: { item: SessionDto }) => {
    const isHost = item.hostId === user?.id || item.isHost;
    const isCancelled = item.status === SessionStatus.CANCELLED;
    const isCompleted = item.status === SessionStatus.COMPLETED;
    const isPendingReq =
      item.isMentorInvited ||
      item.mentorInviteStatus === 'pending' ||
      item.mentors?.some((m) => m.mentorId === user?.id && m.status === 'pending');

    const scheduledDateObj = new Date(item.scheduledAt);
    const maxCap = item.maxParticipants || 15;
    const currentCount = item.participantsCount ?? (item.participants?.length || 0);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          isPendingReq && styles.requestCardHighlight,
          isHost && !isPendingReq && styles.hostCardBorder,
        ]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('SessionDetail', { session: item })}
      >
        {/* Prominent Co-Host Request Banner */}
        {isPendingReq && (
          <View style={styles.requestAlertBanner}>
            <View style={styles.requestAlertLeft}>
              <Flame size={16} color="#A855F7" style={{ marginRight: 6 }} />
              <Text style={styles.requestAlertText}>CO-HOST INVITATION REQUEST</Text>
            </View>
            <View style={styles.pendingChip}>
              <Text style={styles.pendingChipText}>Pending Response</Text>
            </View>
          </View>
        )}

        <View style={styles.cardHeader}>
          {/* Format Badge */}
          <View style={styles.badgeRow}>
            <View style={styles.formatBadge}>
              {item.sessionType === SessionType.MULTI_MENTOR ? (
                <>
                  <Flame size={12} color="#C084FC" style={{ marginRight: 4 }} />
                  <Text style={styles.formatTextMulti}>MULTI-HOST</Text>
                </>
              ) : item.sessionType === SessionType.GROUP ? (
                <>
                  <Users size={12} color="#38BDF8" style={{ marginRight: 4 }} />
                  <Text style={styles.formatTextGroup}>GROUP</Text>
                </>
              ) : (
                <Text style={styles.formatText1on1}>1-ON-1</Text>
              )}
            </View>

            {item.isPrivate && (
              <View style={styles.privateBadge}>
                <Lock size={10} color="#FBBF24" style={{ marginRight: 3 }} />
                <Text style={styles.privateBadgeText}>PRIVATE</Text>
              </View>
            )}
          </View>

          {/* User Role Tag */}
          <View style={styles.roleTagContainer}>
            {isPendingReq ? (
              <View style={styles.invitedRoleBadge}>
                <UserCheck size={12} color="#FBBF24" style={{ marginRight: 4 }} />
                <Text style={styles.invitedRoleText}>INVITED</Text>
              </View>
            ) : isHost ? (
              <View style={styles.hostRoleBadge}>
                <ShieldCheck size={12} color="#38BDF8" style={{ marginRight: 4 }} />
                <Text style={styles.hostRoleText}>HOST ADMIN</Text>
              </View>
            ) : (
              <View style={styles.attendeeRoleBadge}>
                <CheckCircle2 size={12} color="#10B981" style={{ marginRight: 4 }} />
                <Text style={styles.attendeeRoleText}>JOINED</Text>
              </View>
            )}
          </View>
        </View>

        {/* Custom Title or Skill Name */}
        <Text style={styles.skillTitle}>
          {item.title || item.skillName}
        </Text>

        {/* Host Identification: Real Name + @username */}
        <View style={styles.hostIdentifierRow}>
          <AvatarWithBadgeFrame
            name={item.hostName || 'Campus Peer'}
            username={item.hostUsername}
            size={22}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.hostSubtitle}>
            Hosted by{' '}
            <Text style={{ color: '#F8FAFC', fontWeight: '700' }}>
              {item.hostName}
            </Text>
            {item.hostUsername ? (
              <Text style={{ color: '#38BDF8', fontWeight: '700' }}>
                {' '}(@{item.hostUsername})
              </Text>
            ) : null}
            {isHost && <Text style={{ color: '#38BDF8' }}> (You)</Text>}
          </Text>
        </View>

        {/* 1-on-1 Targeted Learner Callout */}
        {item.sessionType === SessionType.ONE_TO_ONE && item.targetLearnerName && (
          <View style={styles.learnerCallout}>
            <Text style={styles.learnerCalloutText}>
              Learner:{' '}
              <Text style={{ color: '#10B981', fontWeight: '700' }}>
                {item.targetLearnerName}
              </Text>
            </Text>
          </View>
        )}

        {/* Skills Tags */}
        {item.skillsTags && item.skillsTags.length > 0 && (
          <View style={styles.tagsContainer}>
            {item.skillsTags.map((tag, idx) => (
              <View key={idx} style={styles.tagChip}>
                <Text style={styles.tagChipText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Date & Time */}
        <View style={styles.dateTimeRow}>
          <Calendar size={14} color="#38BDF8" style={{ marginRight: 6 }} />
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

          <View style={styles.durationBadge}>
            <Clock size={11} color="#94A3B8" style={{ marginRight: 3 }} />
            <Text style={styles.durationText}>{item.durationHours} hr</Text>
          </View>
        </View>

        {/* Action Buttons for Co-Host Requests */}
        {isPendingReq && (
          <View style={styles.requestActionRow}>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => handleMentorResponse(item.id, true)}
              disabled={actionLoadingId === item.id}
            >
              <Check size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.acceptBtnText}>Accept Co-Host Role</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.declineBtn}
              onPress={() => handleMentorResponse(item.id, false)}
              disabled={actionLoadingId === item.id}
            >
              <X size={14} color="#EF4444" style={{ marginRight: 4 }} />
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Card Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.statusIndicator}>
            {isCancelled ? (
              <Text style={styles.statusCancelledText}>Cancelled</Text>
            ) : isCompleted ? (
              <Text style={styles.statusCompletedText}>Completed & Settled</Text>
            ) : (
              <Text style={styles.statusScheduledText}>
                {item.sessionType === SessionType.ONE_TO_ONE
                  ? '1-on-1 Ready'
                  : `${currentCount}/${maxCap} Students`}
              </Text>
            )}
          </View>

          <View style={styles.detailLink}>
            <Text style={styles.detailLinkText}>View Event</Text>
            <ChevronRight size={14} color="#38BDF8" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Sessions</Text>
          <Text style={styles.headerSubtitle}>
            Manage your teaching schedule, invitations, and joined events
          </Text>
        </View>

        <TouchableOpacity
          style={styles.hostButton}
          onPress={() => navigation.navigate('CreateSession')}
          activeOpacity={0.8}
        >
          <Plus size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.hostButtonText}>Host</Text>
        </TouchableOpacity>
      </View>

      <LapsedBanner onReverifyPress={() => navigation.navigate('Settings')} />

      {/* Prominent Pending Co-Host Banner if requests exist */}
      {pendingRequests.length > 0 && activeTab !== 'requests' && (
        <TouchableOpacity
          style={styles.floatingAlertBanner}
          onPress={() => setActiveTab('requests')}
          activeOpacity={0.85}
        >
          <View style={styles.floatingAlertIconBox}>
            <Inbox size={20} color="#FBBF24" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.floatingAlertTitle}>
              Co-Host Requests ({pendingRequests.length})
            </Text>
            <Text style={styles.floatingAlertSub}>
              You have been invited to co-host a workshop. Tap to review & accept.
            </Text>
          </View>
          <ChevronRight size={18} color="#FBBF24" />
        </TouchableOpacity>
      )}

      {/* Filter Tabs */}
      <View style={styles.tabBar}>
        {[
          { key: 'all', label: 'All' },
          {
            key: 'requests',
            label: `Requests${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}`,
            highlight: pendingRequests.length > 0,
          },
          { key: 'hosting', label: 'Hosting' },
          { key: 'joined', label: 'Joined' },
          { key: 'completed', label: 'History' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabItem,
              activeTab === tab.key && styles.tabItemActive,
              tab.highlight && activeTab !== tab.key && styles.tabItemHighlight,
            ]}
            onPress={() => setActiveTab(tab.key as FilterTab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
                tab.highlight && activeTab !== tab.key && styles.tabTextHighlight,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sessions FlatList */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#38BDF8" />
        </View>
      ) : (
        <FlatList
          data={filteredSessions}
          renderItem={renderSessionItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchMySessions();
              }}
              tintColor="#38BDF8"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Inbox size={42} color="#334155" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>
                {activeTab === 'requests'
                  ? 'No pending co-host requests right now.'
                  : activeTab === 'hosting'
                  ? 'You are not currently hosting any active sessions.'
                  : activeTab === 'joined'
                  ? "You haven't registered for any sessions yet."
                  : 'No campus sessions found in this category.'}
              </Text>
              {activeTab === 'hosting' && (
                <TouchableOpacity
                  style={styles.emptyHostBtn}
                  onPress={() => navigation.navigate('CreateSession')}
                >
                  <Text style={styles.emptyHostBtnText}>Host a Session Now</Text>
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
    backgroundColor: '#0B0F19',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  hostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  hostButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  floatingAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A180E',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  floatingAlertIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  floatingAlertTitle: {
    color: '#FBBF24',
    fontSize: 14,
    fontWeight: '800',
  },
  floatingAlertSub: {
    color: '#CBD5E1',
    fontSize: 11,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
  },
  tabItem: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  tabItemActive: {
    backgroundColor: '#38BDF8',
  },
  tabItemHighlight: {
    borderWidth: 1,
    borderColor: '#F59E0B',
    backgroundColor: '#241A0B',
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  tabTextHighlight: {
    color: '#FBBF24',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
    marginBottom: 14,
  },
  hostCardBorder: {
    borderColor: '#38BDF8',
  },
  requestCardHighlight: {
    borderColor: '#A855F7',
    borderWidth: 1.5,
    backgroundColor: '#120F24',
  },
  requestAlertBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1,
    borderColor: '#A855F7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  requestAlertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestAlertText: {
    color: '#C084FC',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pendingChip: {
    backgroundColor: '#3B0764',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pendingChipText: {
    color: '#E9D5FF',
    fontSize: 10,
    fontWeight: '700',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  formatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A1F0C',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  privateBadgeText: {
    color: '#FBBF24',
    fontSize: 10,
    fontWeight: '700',
  },
  roleTagContainer: {},
  hostRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  hostRoleText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
  },
  attendeeRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  attendeeRoleText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
  },
  invitedRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  invitedRoleText: {
    color: '#FBBF24',
    fontSize: 10,
    fontWeight: '800',
  },
  skillTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
    lineHeight: 20,
  },
  hostIdentifierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  hostSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
  },
  learnerCallout: {
    backgroundColor: '#0F261E',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  learnerCalloutText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  tagChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagChipText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateTimeText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  requestActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#2E1065',
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  declineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  declineBtnText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 10,
  },
  statusIndicator: {},
  statusScheduledText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  statusCompletedText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  statusCancelledText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  detailLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLinkText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyHostBtn: {
    marginTop: 14,
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  emptyHostBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
