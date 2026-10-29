import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  Switch,
  Share,
} from 'react-native';
import {
  SessionDto,
  LocationMode,
  SessionStatus,
  SessionType,
  ParticipantRole,
  ConfirmedBy,
} from '@skill-exchange/shared-types';
import {
  Clock,
  MapPin,
  Globe,
  Coins,
  CheckCircle,
  Megaphone,
  Star,
  Users,
  ShieldCheck,
  Calendar,
  Lock,
  UserX,
  AlertOctagon,
  KeyRound,
  Check,
  Share2,
  Flame,
  Sparkles,
  Tag,
  UserCheck,
  Download,
  Play,
  Square,
  Zap,
  ClipboardCheck,
  ChevronLeft,
} from 'lucide-react-native';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { AvatarWithBadgeFrame, BrandUnderline } from '../../components/common/ThemeSystem';
import { SafeAreaView } from 'react-native-safe-area-context';
import { saveOrSharePng } from '../../services/exportImage';

export const SessionDetailScreen = ({ route, navigation }: any) => {
  const initialSession: SessionDto = route.params?.session;
  const user = useAuthStore((s) => s.user);

  const [session, setSession] = useState<SessionDto>(initialSession);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals & form state
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);

  // Private joining code modal for student
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');

  // Attendance verification modal (Present / Absent)
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [attendanceState, setAttendanceState] = useState<{ [userId: string]: boolean }>({});

  // Post-session completion banner sharing modal with toggleable options
  const [shareBannerModalOpen, setShareBannerModalOpen] = useState(false);
  const [showCredit, setShowCredit] = useState(true);
  const [showLocation, setShowLocation] = useState(true);
  const [showDateTime, setShowDateTime] = useState(true);
  const [showHostTag, setShowHostTag] = useState(true);
  const [showSkills, setShowSkills] = useState(true);

  useEffect(() => {
    fetchSessionDetails();
  }, []);

  const fetchSessionDetails = async () => {
    if (!initialSession?.id) return;
    try {
      setLoading(true);
      const updated = await api.getSession(initialSession.id);
      setSession(updated);
    } catch {
      // Fallback: keep existing route params
    } finally {
      setLoading(false);
    }
  };

  const isHost = session?.hostId === user?.id || session?.isHost;
  const isCoMentor = Boolean(session?.mentors?.some((m) => m.mentorId === user?.id));
  const hasJoined = session?.hasJoined || session?.participants?.some((p) => p.userId === user?.id);
  const myParticipant = session?.participants?.find((p) => p.userId === user?.id);
  const myAttendanceConfirmed = session?.myAttendanceConfirmed || myParticipant?.attendanceConfirmed;
  const hasRated = session?.hasRated || (myParticipant?.rating !== null && myParticipant?.rating !== undefined);
  const sessionCompleted = session?.status === SessionStatus.COMPLETED || (session?.status as any) === 'completed';
  const sessionCancelled = session?.status === SessionStatus.CANCELLED || (session?.status as any) === 'cancelled';
  const sessionNoShow = session?.status === SessionStatus.NO_SHOW || (session?.status as any) === 'no_show';

  // Timing logic
  const scheduledTime = new Date(session.scheduledAt).getTime();
  const durationMs = (session.durationHours || 1) * 60 * 60 * 1000;
  const endTime = scheduledTime + durationMs;
  const now = Date.now();
  const hasStarted = now >= scheduledTime;
  const hasEnded = now >= endTime;

  // 1-on-1 Pending and Attendance logic
  const isOneToOne = session?.sessionType === SessionType.ONE_TO_ONE;
  const hasAcceptedOneToOne =
    myParticipant?.confirmedBy === ConfirmedBy.SELF ||
    (myParticipant as any)?.confirmed_by === 'self' ||
    myParticipant?.attendanceConfirmed;

  const isOneToOnePending = Boolean(
    isOneToOne &&
      !isHost &&
      (session?.status === SessionStatus.SCHEDULED || (session?.status as any) === 'scheduled') &&
      !hasAcceptedOneToOne &&
      (hasJoined || Boolean(myParticipant))
  );

  const myMentorInvite = session?.mentors?.find((m) => m.mentorId === user?.id || (m as any).userId === user?.id);
  const isMentorInvitedPending =
    session?.mentorInviteStatus === 'pending' ||
    myMentorInvite?.status === 'pending';

  const isAttendanceReviewNeeded = Boolean(
    (isHost || isCoMentor) &&
      !sessionCompleted &&
      !sessionCancelled &&
      !sessionNoShow &&
      (hasEnded || (session?.status as any) === 'in_progress')
  );

  // Capacity calculations
  const maxCap = session.maxParticipants || 15;
  const currentCount = session.participantsCount ?? (session.participants?.length || 0);
  const spotsLeft = Math.max(0, maxCap - currentCount);
  const isFull = spotsLeft === 0;

  // Student: Join Session
  const handleJoin = async (codeToUse?: string) => {
    try {
      setActionLoading(true);
      await api.joinSession(session.id, codeToUse || joinCodeInput);
      setJoinModalOpen(false);
      setJoinCodeInput('');
      Alert.alert('Registered!', 'You are officially registered for this session.');
      fetchSessionDetails();
    } catch (err: any) {
      Alert.alert('Registration Notice', err.message || 'Could not join session.');
    } finally {
      setActionLoading(false);
    }
  };

  // Student / Host: Confirm Attendance
  const handleConfirmAttendance = async (targetUserId?: string) => {
    try {
      setActionLoading(true);
      await api.confirmAttendance(session.id, targetUserId);
      Alert.alert(
        'Attendance Verified',
        targetUserId
          ? 'Student attendance confirmed successfully.'
          : `Attendance confirmed! Learner fee of ${session.durationHours} credit(s) applied to your ledger.`
      );
      fetchSessionDetails();
    } catch (err: any) {
      Alert.alert('Attendance Notice', err.message || 'Attendance confirmation processed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Host Admin: Remove Participant
  const handleRemoveParticipant = (participantUserId: string, participantName: string) => {
    Alert.alert(
      'Remove Participant',
      `Are you sure you want to remove ${participantName} from this session?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await api.removeParticipant(session.id, participantUserId);
              Alert.alert('Participant Removed', `${participantName} was removed from the roster.`);
              fetchSessionDetails();
            } catch (err: any) {
              Alert.alert('Removal Failed', err.message || 'Could not remove participant.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Host Admin: Cancel Event (Only if not started)
  const handleCancelSession = () => {
    if (hasStarted) {
      Alert.alert('Cannot Cancel', 'Sessions that have already started or concluded cannot be cancelled.');
      return;
    }

    Alert.alert(
      'Cancel Event',
      'Are you sure you want to cancel this scheduled session? All registered participants will be notified and the event will be closed.',
      [
        { text: 'No, Keep Session', style: 'cancel' },
        {
          text: 'Yes, Cancel Event',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await api.cancelSession(session.id);
              Alert.alert('Event Cancelled', 'The session was cancelled.');
              fetchSessionDetails();
            } catch (err: any) {
              Alert.alert('Cancellation Notice', err.message || 'Could not cancel session.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Host Admin: Start Early
  const handleStartEarly = () => {
    Alert.alert(
      'Start Session Early? 🚀',
      'This will start the session immediately and notify registered participants.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Now',
          onPress: async () => {
            try {
              setActionLoading(true);
              const res = await api.startSessionEarly(session.id);
              Alert.alert('Session Started! 🚀', res.message || 'The session has started early.');
              fetchSessionDetails();
            } catch (err: any) {
              Alert.alert('Start Early Notice', err.message || 'Could not start session early.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Open Attendance Review Modal
  const openAttendanceModal = () => {
    const initialAttendance: { [userId: string]: boolean } = {};
    const learners = session?.participants?.filter((p) => p.role === ParticipantRole.LEARNER) || [];
    learners.forEach((p) => {
      initialAttendance[p.userId] = p.attendanceConfirmed !== undefined ? p.attendanceConfirmed : true;
    });
    setAttendanceState(initialAttendance);
    setAttendanceModalOpen(true);
  };

  // Finalize attendance and settle session
  const handleFinalizeAttendance = async () => {
    try {
      setActionLoading(true);
      const attendanceList = Object.entries(attendanceState).map(([userId, attended]) => ({
        userId,
        attended,
      }));
      const res = await api.concludeSession(session.id, attendanceList);
      setAttendanceModalOpen(false);
      await fetchSessionDetails();
      Alert.alert(
        'Session Concluded & Settled! 🎉',
        (res.message || 'Learner attendance verified and credits settled.') +
          '\n\nWould you like to generate and share your event completion pass?',
        [
          { text: 'Share Event Banner', onPress: () => setShareBannerModalOpen(true) },
          { text: 'Done', style: 'cancel' },
        ]
      );
    } catch (err: any) {
      Alert.alert('Notice', err.message || 'Could not conclude session with attendance.');
    } finally {
      setActionLoading(false);
    }
  };

  // Host / Mentor: Stop Session Early (Opens Attendance Review)
  const handleStopEarly = () => {
    Alert.alert(
      'End Session Early? 🛑',
      'Ending early will conclude the meeting. You will now review learner attendance (Present / Absent) before final credit settlement.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Review Attendance',
          onPress: () => openAttendanceModal(),
        },
      ]
    );
  };

  // Host: Complete & Settle (Opens Attendance Review)
  const handleCompleteSession = () => {
    openAttendanceModal();
  };

  // 1-on-1 Student Response (Accept / Decline)
  const handleOneToOneResponse = async (accept: boolean) => {
    try {
      setActionLoading(true);
      const res = await api.respondToMentorRequest(session.id, accept);
      Alert.alert(
        accept ? 'Mentorship Session Confirmed! 🎓' : 'Invitation Declined',
        accept
          ? 'You accepted this 1-on-1 session. It is now officially scheduled on your calendar!'
          : 'You declined the 1-on-1 mentorship session.'
      );
      fetchSessionDetails();
    } catch (err: any) {
      Alert.alert('Notice', err.message || 'Could not update response.');
    } finally {
      setActionLoading(false);
    }
  };

  // Host: Public Announcement
  const handleAnnounce = async () => {
    try {
      setActionLoading(true);
      const res = await api.announceSession(session.id);
      Alert.alert(
        'Campus Announcement Sent!',
        res.isFree
          ? 'Free announcement used (within allowance cooldown).'
          : 'Announcement posted to campus bulletin (1 credit charged).'
      );
      fetchSessionDetails();
    } catch (err: any) {
      Alert.alert('Announcement Notice', err.message || 'Announcement broadcasted to campus.');
    } finally {
      setActionLoading(false);
    }
  };

  // Student: Rate Session (only students who attended and confirmed)
  const handleRate = async () => {
    try {
      setActionLoading(true);
      await api.rateSession(session.id, selectedRating, feedbackText, isAnonymous);
      setRatingModalOpen(false);
      Alert.alert('Thank You!', 'Your review was recorded for the mentor portfolio.');
      fetchSessionDetails();
    } catch (err: any) {
      setRatingModalOpen(false);
      Alert.alert('Review Notice', err.message || 'Thank you for rating this session!');
    } finally {
      setActionLoading(false);
    }
  };

  // Co-host response
  const handleMentorResponse = async (accept: boolean) => {
    try {
      setActionLoading(true);
      await api.respondToMentorRequest(session.id, accept);
      Alert.alert(
        accept ? 'Co-Host Invitation Accepted!' : 'Invitation Declined',
        accept
          ? 'You are now officially listed as a co-host for this session.'
          : 'You declined the co-host invitation.'
      );
      fetchSessionDetails();
    } catch (err: any) {
      Alert.alert('Notice', err.message || 'Could not update response');
    } finally {
      setActionLoading(false);
    }
  };

  // Generate and download a genuine real .png image of the event banner pass
  const handleDownloadBannerPng = async () => {
    try {
      setActionLoading(true);
      const res = await api.exportBannerPng({
        sessionId: session.id,
        title: session.title || session.skillName,
        skillName: session.skillName,
        sessionType: session.sessionType,
        hostName: session.hostName,
        hostUsername: session.hostUsername,
        scheduledAt: session.scheduledAt,
        durationHours: session.durationHours,
        locationMode: session.locationMode,
        meetingLink: session.meetingLink,
        locationAddress: session.locationAddress,
        skillsTags: session.skillsTags,
        showCredit,
        showLocation,
        showDateTime,
        showHostTag,
        showSkills,
      });

      if (res?.pngBase64) {
        await saveOrSharePng(
          res.pngBase64,
          res.fileName || `SkillJectory_Pass_${session.skillName}.png`,
          'Save SkillJectory Event Banner (.png)'
        );
      } else {
        throw new Error('Could not generate PNG data from server');
      }
    } catch (err: any) {
      // Fallback: client-side canvas generation if on web
      if (typeof document !== 'undefined') {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 1200;
          canvas.height = 750;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, 1200, 750);
            ctx.strokeStyle = '#0E6245';
            ctx.lineWidth = 4;
            ctx.strokeRect(20, 20, 1160, 710);
            ctx.fillStyle = '#0E6245';
            ctx.fillRect(20, 20, 1160, 24);
            ctx.fillStyle = '#111827';
            ctx.font = 'bold 36px sans-serif';
            ctx.fillText(session.title || session.skillName, 50, 140);
            const fallbackDataUrl = canvas.toDataURL('image/png');
            await saveOrSharePng(fallbackDataUrl, `SkillJectory_Pass_${session.skillName}.png`, 'Save Event Banner');
            return;
          }
        } catch {}
      }
      Alert.alert('Notice', err.message || 'Could not export banner PNG');
    } finally {
      setActionLoading(false);
    }
  };

  const handleShareBanner = async () => {
    try {
      setActionLoading(true);
      const res = await api.exportBannerPng({
        sessionId: session.id,
        title: session.title || session.skillName,
        skillName: session.skillName,
        sessionType: session.sessionType,
        hostName: session.hostName,
        hostUsername: session.hostUsername,
        scheduledAt: session.scheduledAt,
        durationHours: session.durationHours,
        locationMode: session.locationMode,
        meetingLink: session.meetingLink,
        locationAddress: session.locationAddress,
        skillsTags: session.skillsTags,
        showCredit,
        showLocation,
        showDateTime,
        showHostTag,
        showSkills,
      });

      if (res?.pngBase64) {
        await saveOrSharePng(
          res.pngBase64,
          res.fileName || `SkillJectory_Pass_${session.skillName}.png`,
          `Share ${session.title || session.skillName} Pass (.png)`
        );
      } else {
        // Fallback to text share
        const scheduledDate = new Date(session.scheduledAt);
        await Share.share({
          title: session.title || session.skillName,
          message: `🎓 ${session.title || session.skillName}\nHosted by: ${session.hostName} (@${session.hostUsername || 'host'})\nJoin on SkillJectory Campus Exchange!`,
        });
      }
    } catch (err: any) {
      Alert.alert('Share', err.message || 'Share cancelled');
    } finally {
      setActionLoading(false);
    }
  };

  const scheduledDateObj = new Date(session.scheduledAt);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAF9' }} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top Header Bar (Artboard Pages 17 & 18) */}
        <View style={styles.topHeaderBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color="#111827" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Session </Text>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.headerTitle}>details</Text>
              <BrandUnderline width={68} style={{ marginTop: 2 }} />
            </View>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* Session Cancelled Banner */}
        {sessionCancelled && (
          <View style={styles.cancelledBanner}>
            <AlertOctagon size={18} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.cancelledText}>This event has been cancelled by the host.</Text>
          </View>
        )}

        {/* ACTION REQUIRED: Co-Host Invitation Request (for invited mentor) */}
        {isMentorInvitedPending && (
          <View style={styles.actionRequiredCard}>
            <View style={styles.actionRequiredHeader}>
              <View style={styles.actionRequiredBadge}>
                <Zap size={13} color="#854D0E" style={{ marginRight: 4 }} />
                <Text style={styles.actionRequiredBadgeText}>ACTION REQUIRED</Text>
              </View>
              <Text style={styles.actionRequiredTitle}>Co-Host Invitation Request</Text>
            </View>
            <Text style={styles.actionRequiredDesc}>
              {session.hostName} (@{session.hostUsername || 'host'}) invited you to co-host this workshop. Upfront fee of 1.5 credits will be reserved upon acceptance.
            </Text>
            <View style={styles.actionRequiredBtnRow}>
              <TouchableOpacity
                style={styles.actionPrimaryBtn}
                onPress={() => handleMentorResponse(true)}
                disabled={actionLoading}
              >
                <Check size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>Accept Co-Host Role</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionSecondaryBtn}
                onPress={() => handleMentorResponse(false)}
                disabled={actionLoading}
              >
                <UserX size={16} color="#DC2626" style={{ marginRight: 4 }} />
                <Text style={styles.actionSecondaryText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ACTION REQUIRED: 1-on-1 Mentorship Request (for invited learner) */}
        {isOneToOnePending && (
          <View style={styles.actionRequiredCard}>
            <View style={styles.actionRequiredHeader}>
              <View style={styles.actionRequiredBadge}>
                <Zap size={13} color="#854D0E" style={{ marginRight: 4 }} />
                <Text style={styles.actionRequiredBadgeText}>ACTION REQUIRED</Text>
              </View>
              <Text style={styles.actionRequiredTitle}>1-on-1 Mentorship Invitation</Text>
            </View>
            <Text style={styles.actionRequiredDesc}>
              {session.hostName} (@{session.hostUsername || 'mentor'}) requested a 1-on-1 mentorship session with you for "{session.title || session.skillName}".
            </Text>
            <View style={styles.actionRequiredBtnRow}>
              <TouchableOpacity
                style={styles.actionPrimaryBtn}
                onPress={() => handleOneToOneResponse(true)}
                disabled={actionLoading}
              >
                <Check size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>Accept Session 🎓</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionSecondaryBtn}
                onPress={() => handleOneToOneResponse(false)}
                disabled={actionLoading}
              >
                <UserX size={16} color="#DC2626" style={{ marginRight: 4 }} />
                <Text style={styles.actionSecondaryText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ACTION REQUIRED: Host Attendance Review (when session ended or in progress) */}
        {isAttendanceReviewNeeded && (
          <View style={styles.actionRequiredCard}>
            <View style={styles.actionRequiredHeader}>
              <View style={styles.actionRequiredBadge}>
                <Zap size={13} color="#854D0E" style={{ marginRight: 4 }} />
                <Text style={styles.actionRequiredBadgeText}>ACTION REQUIRED</Text>
              </View>
              <Text style={styles.actionRequiredTitle}>Review Learner Attendance</Text>
            </View>
            <Text style={styles.actionRequiredDesc}>
              The meeting has concluded. Please select whether each learner was Present or Absent before final credit settlement and host earnings payout.
            </Text>
            <TouchableOpacity
              style={[styles.actionPrimaryBtn, { marginTop: 10 }]}
              onPress={openAttendanceModal}
              disabled={actionLoading}
            >
              <ClipboardCheck size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnText}>Review Attendance (Present / Absent) 📋</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SESSION STATE DISPLAY (When no action is required from the user) */}
        {!isMentorInvitedPending && !isOneToOnePending && !isAttendanceReviewNeeded && !sessionCancelled && (
          <View style={styles.sessionStateCard}>
            <View style={styles.sessionStateRow}>
              {sessionCompleted ? (
                <>
                  <CheckCircle size={20} color="#0E6245" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sessionStateTitle, { color: '#0E6245' }]}>Concluded & Settled ✓</Text>
                    <Text style={styles.sessionStateSubtext}>
                      Attendance was verified and credit settlement has been completed.
                    </Text>
                  </View>
                </>
              ) : sessionNoShow ? (
                <>
                  <AlertOctagon size={20} color="#DC2626" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sessionStateTitle, { color: '#DC2626' }]}>Concluded (No-Show)</Text>
                    <Text style={styles.sessionStateSubtext}>Minimum confirmed attendance was not reached.</Text>
                  </View>
                </>
              ) : (session.status === SessionStatus.IN_PROGRESS || (session.status as any) === 'in_progress') ? (
                <>
                  <Play size={20} color="#0E6245" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sessionStateTitle, { color: '#0E6245' }]}>Live Session In Progress 🟢</Text>
                    <Text style={styles.sessionStateSubtext}>Session is currently active. Connect with attendees.</Text>
                  </View>
                </>
              ) : (
                <>
                  <Calendar size={20} color="#0E6245" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sessionStateTitle}>
                      {isHost
                        ? (isOneToOne && !session.learnerAccepted
                            ? `Awaiting Student Acceptance (@${session.targetLearnerName?.split('@')[1]?.replace(')', '') || 'student'})`
                            : 'Scheduled Event')
                        : (hasJoined ? 'Confirmed Attendee • Scheduled' : 'Open Registration')}
                    </Text>
                    <Text style={styles.sessionStateSubtext}>
                      {hasStarted
                        ? 'Scheduled start time reached'
                        : `Starts on ${new Date(session.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${new Date(session.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

      {/* Top Badges Row (Artboard Pages 17 & 18) */}
      <View style={styles.topBadgeRow}>
        <View style={styles.formatTag}>
          <Text style={styles.formatTagText}>
            {session.sessionType === SessionType.ONE_TO_ONE
              ? '1-ON-1'
              : session.sessionType === SessionType.MULTI_MENTOR
              ? 'MULTI-HOST'
              : 'GROUP'}
          </Text>
        </View>

        {session.isPrivate && (
          <View style={styles.privateBadge}>
            <Lock size={12} color="#854D0E" style={{ marginRight: 4 }} />
            <Text style={styles.privateBadgeText}>PRIVATE</Text>
          </View>
        )}

        {/* Skill Tag Pills */}
        <View style={styles.formatTag}>
          <Text style={styles.formatTagText}>#{session.skillName}</Text>
        </View>

        {session.skillsTags && session.skillsTags.slice(0, 2).map((tag, idx) => (
          <View key={idx} style={styles.formatTag}>
            <Text style={styles.formatTagText}>#{tag}</Text>
          </View>
        ))}
      </View>

      {/* Event Title & Subtitle */}
      <Text style={styles.eventCustomTitle}>
        {session.title || session.skillName}
      </Text>
      {session.description ? (
        <Text style={styles.eventDescSubtitle}>{session.description}</Text>
      ) : null}

      {/* 1-on-1 Target Learner Banner (Artboard Page 17) */}
      {session.sessionType === SessionType.ONE_TO_ONE && (
        <View style={styles.learnerBannerMint}>
          <UserCheck size={16} color="#0E6245" style={{ marginRight: 8 }} />
          <Text style={styles.learnerBannerText}>
            1-on-1 Session with:{' '}
            <Text style={{ fontWeight: '800' }}>
              {session.targetLearnerName || (session.participants?.find((p) => p.userId !== session.hostId)?.name || 'Chiranjib Das (@chira)')}
            </Text>
          </Text>
        </View>
      )}

      {/* Host Identifier Card (Artboard Pages 17 & 18) */}
      <View style={styles.hostCardWhite}>
        <View style={styles.hostAvatarCA}>
          <Text style={styles.hostAvatarText}>CA</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.hostCardName}>
            {session.hostName} {isHost ? '(You)' : ''}
          </Text>
          <Text style={styles.hostCardUsername}>
            @{session.hostUsername || 'admin'}
          </Text>
        </View>
        <View style={styles.primaryHostPill}>
          <Text style={styles.primaryHostText}>Primary Host</Text>
        </View>
      </View>

      {/* Co-Hosts (Multi-Mentor Sessions, Artboard Page 18) */}
      {session.mentors && session.mentors.length > 0 && (
        <View style={styles.coMentorsWrap}>
          {session.mentors.map((m: any, idx: number) => {
            const isAccepted = m.status === 'accepted';
            return (
              <View key={idx} style={styles.coMentorCardWhite}>
                <View style={[styles.hostAvatarCA, { backgroundColor: isAccepted ? '#0E6245' : '#D97706' }]}>
                  <Text style={styles.hostAvatarText}>
                    {m.name ? m.name.substring(0, 2).toUpperCase() : 'CO'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.hostCardName}>{m.name || m.username}</Text>
                  {m.username && <Text style={styles.hostCardUsername}>@{m.username}</Text>}
                </View>
                <View style={[styles.primaryHostPill, { backgroundColor: isAccepted ? '#EBF7F0' : '#FEF7DA' }]}>
                  <Text style={[styles.primaryHostText, { color: isAccepted ? '#0E6245' : '#854D0E' }]}>
                    {isAccepted ? 'Co-Host' : 'Invite Pending'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Date & Time Card (Artboard Lavender Card, Pages 17 & 18) */}
      <View style={styles.dateTimeCardLavender}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Calendar size={18} color="#0E6245" style={{ marginRight: 10 }} />
            <View>
              <Text style={styles.cardSectionLabelMuted}>Date & Time</Text>
              <Text style={styles.cardBoldText}>
                {scheduledDateObj.toLocaleDateString([], {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}{' '}
                at{' '}
                {scheduledDateObj.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
          <View style={[styles.statusPillCapsule, !hasEnded && styles.statusPillCapsuleDark]}>
            <Text style={[styles.statusPillText, !hasEnded && styles.statusPillTextDark]}>
              {hasEnded ? 'Ended' : hasStarted ? 'Live' : 'Upcoming'}
            </Text>
          </View>
        </View>

        {/* Group Capacity Counter on Page 18 */}
        {session.sessionType !== SessionType.ONE_TO_ONE && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Users size={18} color="#7C3AED" style={{ marginRight: 10 }} />
              <View>
                <Text style={styles.cardSectionLabelMuted}>Student Capacity</Text>
                <Text style={styles.cardBoldText}>
                  {currentCount} of {maxCap} students joined
                </Text>
              </View>
            </View>
            <View style={styles.statusPillCapsule}>
              <Text style={styles.statusPillText}>
                {spotsLeft} spots left
              </Text>
            </View>
          </View>
        )}

        {/* Private Code on Page 18 */}
        {session.isPrivate && session.joinCode && (
          <View style={styles.privateCodeBoxYellow}>
            <KeyRound size={16} color="#854D0E" style={{ marginRight: 8 }} />
            <Text style={styles.privateCodeText}>Private Code: {session.joinCode}</Text>
          </View>
        )}
      </View>

      {/* Online Location Details Card (Artboard Yellow Card, Pages 17 & 18) */}
      <View style={styles.locationCardYellow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Globe size={18} color="#854D0E" style={{ marginRight: 8 }} />
          <Text style={styles.locationHeaderYellow}>
            {session.locationMode.toUpperCase()} LOCATION DETAILS
          </Text>
        </View>

        {session.locationMode !== LocationMode.OFFLINE && session.meetingLink ? (
          <View>
            <Text style={styles.meetingLinkPrompt}>Meeting Link:</Text>
            <Text style={styles.meetingLinkClickable} selectable>
              {session.meetingLink}
            </Text>
          </View>
        ) : (
          <View>
            <Text style={styles.meetingLinkPrompt}>Campus Location:</Text>
            <Text style={[styles.meetingLinkPrompt, { color: '#111827', fontWeight: '700' }]}>
              {session.locationAddress || 'ADTU Main Campus'}
            </Text>
          </View>
        )}
      </View>

      {/* Duration & Fee Summary Card (Artboard Mint Card, Pages 17 & 18) */}
      <View style={styles.statsCardMint}>
        <View style={styles.statLine}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Clock size={16} color="#0E6245" style={{ marginRight: 8 }} />
            <Text style={styles.statLineLabel}>Duration:</Text>
          </View>
          <Text style={styles.statLineVal}>{session.durationHours} Hours</Text>
        </View>

        <View style={styles.statLine}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Coins size={16} color="#0E6245" style={{ marginRight: 8 }} />
            <Text style={styles.statLineLabel}>Learner Fee:</Text>
          </View>
          <Text style={styles.statLineVal}>{session.durationHours} Credit(s)</Text>
        </View>

        <View style={styles.statLine}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Users size={16} color="#0E6245" style={{ marginRight: 8 }} />
            <Text style={styles.statLineLabel}>Minimum Gate:</Text>
          </View>
          <Text style={styles.statLineVal}>
            Min {session.minParticipants || 1} confirmed student(s)
          </Text>
        </View>
      </View>

      {/* =========================================================================
          HOST MANAGEMENT PANEL (Artboard Pages 17 & 18)
      ========================================================================= */}
      {isHost && (
        <View style={styles.hostManagementCard}>
          <View style={styles.managementHeaderRow}>
            <ShieldCheck size={20} color="#0E6245" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.managementTitle}>HOST MANAGEMENT PANEL</Text>
              <Text style={styles.managementSub}>Roster controls, verification, and event management</Text>
            </View>
          </View>

          {/* Cancel Event (Only if not started, Artboard Page 18) */}
          {!sessionCancelled && !sessionCompleted && !hasStarted && (
            <View style={{ marginTop: 12 }}>
              <TouchableOpacity
                style={styles.cancelEventBtn}
                onPress={handleCancelSession}
                disabled={actionLoading}
              >
                <AlertOctagon size={16} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={styles.cancelEventBtnText}>Cancel event (not started)</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Registered Participants Roster */}
          <Text style={styles.rosterSectionTitle}>
            REGISTERED PARTICIPANTS ({session.participants?.length || 0} / {maxCap})
          </Text>

          {(!session.participants || session.participants.length === 0) ? (
            <Text style={styles.noParticipantsText}>No students have joined this session yet.</Text>
          ) : (
            session.participants.map((p) => (
              <View key={p.id} style={styles.participantMintCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.participantName}>{p.name}</Text>
                  {p.email && <Text style={styles.participantEmail}>{p.email}</Text>}
                  {p.attendanceConfirmed ? (
                    <Text style={styles.attendanceConfirmedText}>
                      ✓ Attendance Confirmed ({p.confirmedBy || 'host'})
                    </Text>
                  ) : (
                    <Text style={{ color: '#D97706', fontSize: 11, marginTop: 4, fontWeight: '700' }}>
                      • Attendance Pending
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}

          {/* Start Session Early (Artboard Page 18) */}
          {!hasStarted && !sessionCancelled && session.status === SessionStatus.SCHEDULED && (
            <View style={{ marginTop: 12 }}>
              <TouchableOpacity
                style={styles.startEarlyPineBtn}
                onPress={handleStartEarly}
                disabled={actionLoading}
              >
                <Play size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.startEarlyBtnText}>Start session early</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Stop Session Early & Review Attendance (Artboard Page 18) */}
          {(isHost || isCoMentor) &&
            !sessionCompleted &&
            !sessionCancelled &&
            !sessionNoShow &&
            !hasEnded &&
            (session.status === SessionStatus.IN_PROGRESS || (session.status as any) === 'in_progress' || hasStarted || session.status === SessionStatus.SCHEDULED) && (
              <View style={{ marginTop: 10 }}>
                <TouchableOpacity
                  style={styles.stopEarlyRedBtn}
                  onPress={handleStopEarly}
                  disabled={actionLoading}
                >
                  <Square size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.stopEarlyBtnText}>Stop session early & review attendance</Text>
                </TouchableOpacity>
              </View>
            )}

          {/* Share Event Banner (.png) Button (Artboard Page 17) */}
          <TouchableOpacity
            style={styles.shareBannerOutlineBtn}
            onPress={() => setShareBannerModalOpen(true)}
          >
            <Share2 size={16} color="#0E6245" style={{ marginRight: 8 }} />
            <Text style={styles.shareBannerOutlineText}>Share event banner (.png)</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* =========================================================================
          STUDENT CONTROLS
      ========================================================================= */}
      {!isHost && !sessionCancelled && (
        <View style={styles.studentControlsCard}>
          {/* 1. Before session starts: Allow student to join */}
          {!hasStarted && !hasJoined && (
            <>
              {isFull ? (
                <View style={styles.fullBanner}>
                  <Text style={styles.fullBannerText}>
                    This session is currently at full capacity ({maxCap}/{maxCap} students).
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.joinActionBtn}
                  onPress={() => {
                    if (session.isPrivate) {
                      setJoinModalOpen(true);
                    } else {
                      handleJoin();
                    }
                  }}
                  disabled={actionLoading}
                >
                  <Users size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.joinActionText}>
                    {session.isPrivate ? 'Enter Private Code & Join' : 'Join Event'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* 2. When student is already joined but session hasn't started */}
          {!hasStarted && hasJoined && (
            <View style={styles.registeredNoticeBox}>
              <CheckCircle size={18} color="#10B981" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.registeredNoticeTitle}>You are registered for this event!</Text>
                <Text style={styles.registeredNoticeSub}>
                  Attendance confirmation and fee settlement will unlock once the session concludes.
                </Text>
              </View>
            </View>
          )}

          {/* 3. In Progress notification */}
          {hasStarted && !hasEnded && hasJoined && (
            <View style={styles.inProgressNoticeBox}>
              <Text style={styles.inProgressNoticeText}>
                🟢 Session is currently live! Attendance confirmation opens once finished.
              </Text>
            </View>
          )}

          {/* 4. When event has ended: Only then allow student to confirm attendance */}
          {hasEnded && hasJoined && !myAttendanceConfirmed && !sessionCompleted && (
            <TouchableOpacity
              style={styles.confirmAttendanceBtn}
              onPress={() => handleConfirmAttendance()}
              disabled={actionLoading}
            >
              <ShieldCheck size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.btnText}>
                Confirm My Attendance (Debit {session.durationHours} cr)
              </Text>
            </TouchableOpacity>
          )}

          {/* 5. Attendance confirmed banner */}
          {myAttendanceConfirmed && (
            <View style={styles.confirmedAttendanceBanner}>
              <CheckCircle size={18} color="#10B981" style={{ marginRight: 8 }} />
              <Text style={styles.confirmedAttendanceText}>
                Your attendance is confirmed and verified.
              </Text>
            </View>
          )}

          {/* 6. Leave Feedback (ONLY allowed for students who attended AND confirmed attendance) */}
          {hasJoined && myAttendanceConfirmed && !hasRated && (
            <TouchableOpacity
              style={styles.rateBtn}
              onPress={() => setRatingModalOpen(true)}
            >
              <Star size={18} color="#FBBF24" style={{ marginRight: 6 }} />
              <Text style={styles.rateBtnText}>Leave Feedback & Rating</Text>
            </TouchableOpacity>
          )}

          {hasRated && (
            <View style={styles.ratedDoneBox}>
              <Star size={16} color="#FBBF24" style={{ marginRight: 6 }} />
              <Text style={styles.ratedDoneText}>You submitted feedback for this session. Thank you!</Text>
            </View>
          )}
        </View>
      )}

      {/* Private Code Entry Modal for Students */}
      <Modal visible={joinModalOpen} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Join Private Session</Text>
            <Text style={styles.modalSub}>
              Enter the secret invitation code given by the host (e.g. CAMP-XXXX):
            </Text>

            <TextInput
              style={styles.joinCodeInput}
              placeholder="e.g. CAMP-1234"
              placeholderTextColor="#64748B"
              value={joinCodeInput}
              onChangeText={setJoinCodeInput}
              autoCapitalize="characters"
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setJoinModalOpen(false);
                  setJoinCodeInput('');
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveReviewBtn}
                onPress={() => handleJoin(joinCodeInput)}
                disabled={actionLoading}
              >
                <Text style={styles.saveReviewText}>Confirm Code & Join</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rating & Feedback Modal with Anonymous Toggle */}
      <Modal visible={ratingModalOpen} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rate Mentor Teaching</Text>
            <Text style={styles.modalSub}>
              Share honest feedback to help peers improve and build their portfolio.
            </Text>

            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setSelectedRating(star)}>
                  <Star
                    size={32}
                    color={star <= selectedRating ? '#FBBF24' : '#475569'}
                    fill={star <= selectedRating ? '#FBBF24' : 'transparent'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.feedbackInput}
              placeholder="Write supportive feedback or takeaways..."
              placeholderTextColor="#64748B"
              value={feedbackText}
              onChangeText={setFeedbackText}
              multiline
              numberOfLines={3}
            />

            {/* Anonymous Toggle Option */}
            <View style={styles.anonymousToggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.anonymousToggleLabel}>Post Anonymously</Text>
                <Text style={styles.anonymousToggleSub}>
                  Keep your identity hidden from the mentor and peers
                </Text>
              </View>
              <Switch
                value={isAnonymous}
                onValueChange={setIsAnonymous}
                trackColor={{ false: '#D1D5DB', true: '#0E6245' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setRatingModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveReviewBtn}
                onPress={handleRate}
                disabled={actionLoading}
              >
                <Text style={styles.saveReviewText}>Submit Review</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Share Event Banner Modal (Artboard Page 19) */}
      <Modal visible={shareBannerModalOpen} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.shareModalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.shareModalHeader}>
                <Sparkles size={20} color="#0E6245" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <Text style={styles.modalTitle}>Share event </Text>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={styles.modalTitle}>banner</Text>
                      <BrandUnderline width={54} style={{ marginTop: 2 }} />
                    </View>
                  </View>
                  <Text style={styles.modalSub}>
                    Customize what details to include on your showcase flyer
                  </Text>
                </View>
              </View>

              {/* Toggles */}
              <View style={styles.togglesSection}>
                <View style={styles.toggleRow}>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleLabel}>Show Credit Earnings / Fee</Text>
                    <Text style={styles.toggleSub}>Include {session.durationHours} credit(s)</Text>
                  </View>
                  <Switch
                    value={showCredit}
                    onValueChange={setShowCredit}
                    trackColor={{ false: '#D1D5DB', true: '#0E6245' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.toggleRow}>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleLabel}>Show Location / Link</Text>
                    <Text style={styles.toggleSub}>
                      {session.locationMode === LocationMode.ONLINE ? 'Online Link' : 'Campus Hall'}
                    </Text>
                  </View>
                  <Switch
                    value={showLocation}
                    onValueChange={setShowLocation}
                    trackColor={{ false: '#D1D5DB', true: '#0E6245' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.toggleRow}>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleLabel}>Show Date & Duration</Text>
                    <Text style={styles.toggleSub}>Scheduled time and {session.durationHours} hrs</Text>
                  </View>
                  <Switch
                    value={showDateTime}
                    onValueChange={setShowDateTime}
                    trackColor={{ false: '#D1D5DB', true: '#0E6245' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.toggleRow}>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleLabel}>Show Host Real Name & @Username</Text>
                    <Text style={styles.toggleSub}>
                      {session.hostName} (@{session.hostUsername || 'host'})
                    </Text>
                  </View>
                  <Switch
                    value={showHostTag}
                    onValueChange={setShowHostTag}
                    trackColor={{ false: '#D1D5DB', true: '#0E6245' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.toggleRow}>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleLabel}>Show Skills & Tags</Text>
                    <Text style={styles.toggleSub}>Primary topic and tags</Text>
                  </View>
                  <Switch
                    value={showSkills}
                    onValueChange={setShowSkills}
                    trackColor={{ false: '#D1D5DB', true: '#0E6245' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Live Banner Card Preview (Artboard Page 19) */}
              <Text style={styles.previewSectionTitle}>LIVE BANNER PREVIEW</Text>
              <View style={styles.bannerPreviewCard}>
                <View style={styles.bannerPreviewHeader}>
                  <View style={styles.bannerPreviewBadge}>
                    <Text style={styles.bannerPreviewBadgeText}>CAMPUS SKILL EXCHANGE PASS</Text>
                  </View>
                  <View style={styles.bannerTypePill}>
                    <Text style={styles.bannerPreviewType}>
                      {session.sessionType === SessionType.MULTI_MENTOR
                        ? 'MULTI-HOST'
                        : session.sessionType === SessionType.GROUP
                        ? 'GROUP'
                        : '1-ON-1'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.bannerPreviewTitle}>
                  {session.title || session.skillName}
                </Text>

                {showHostTag && (
                  <View style={styles.bannerHostRow}>
                    <View style={styles.bannerAvatarCircle}>
                      <Text style={styles.bannerAvatarText}>CA</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bannerHostRealName}>{session.hostName}</Text>
                      <Text style={styles.bannerHostUsername}>@{session.hostUsername || 'host'}</Text>
                    </View>
                    <View style={styles.primaryHostPill}>
                      <Text style={styles.primaryHostText}>Host</Text>
                    </View>
                  </View>
                )}

                {showSkills && (
                  <View style={styles.bannerSkillsRow}>
                    <View style={styles.bannerSkillTag}>
                      <Text style={styles.bannerSkillTagText}>#{session.skillName}</Text>
                    </View>
                    {session.skillsTags?.map((st, i) => (
                      <View key={i} style={styles.bannerSubTag}>
                        <Text style={styles.bannerSubTagText}>#{st}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.bannerMetaDivider} />

                {showDateTime && (
                  <View style={styles.bannerMetaItem}>
                    <Calendar size={14} color="#0E6245" style={{ marginRight: 8 }} />
                    <Text style={styles.bannerMetaText}>
                      {scheduledDateObj.toLocaleDateString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      • {session.durationHours} Hours
                    </Text>
                  </View>
                )}

                {showLocation && (
                  <View style={styles.bannerMetaItem}>
                    <MapPin size={14} color="#854D0E" style={{ marginRight: 8 }} />
                    <Text style={styles.bannerMetaText}>
                      {session.locationMode === LocationMode.ONLINE
                        ? `Online: ${session.meetingLink || 'Meeting Link'}`
                        : (session.locationAddress || 'Campus Center')}
                    </Text>
                  </View>
                )}

                {showCredit && (
                  <View style={styles.bannerMetaItem}>
                    <Coins size={14} color="#0E6245" style={{ marginRight: 8 }} />
                    <Text style={styles.bannerMetaTextCredit}>
                      Time-Credit Fee / Earn: {session.durationHours} Credit(s)
                    </Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.shareActionRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShareBannerModalOpen(false)}
                >
                  <Text style={styles.cancelBtnText}>Dismiss</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmShareBtn, actionLoading && { opacity: 0.7 }]}
                  onPress={handleShareBanner}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 5 }} />
                  ) : (
                    <Share2 size={15} color="#FFFFFF" style={{ marginRight: 5 }} />
                  )}
                  <Text style={styles.confirmShareBtnText}>Share</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.downloadBannerPngBtn, actionLoading && { opacity: 0.7 }]}
                  onPress={handleDownloadBannerPng}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                  ) : (
                    <Download size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                  )}
                  <Text style={styles.downloadBannerPngBtnText}>Download PNG</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Attendance Review Modal (Present / Absent) */}
      <Modal visible={attendanceModalOpen} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <View style={styles.attendanceModalHeader}>
              <View style={styles.attendanceTitleRow}>
                <ClipboardCheck size={22} color="#38BDF8" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Attendance Verification</Text>
              </View>
              <Text style={styles.modalSub}>
                Mark each learner as Present or Absent. Present learners are debited {session.durationHours} cr and their attendance is confirmed for mentor payouts.
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 300, marginVertical: 8 }}>
              {(!session.participants || session.participants.filter((p) => p.role === ParticipantRole.LEARNER).length === 0) ? (
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <Text style={{ color: '#94A3B8', fontSize: 13 }}>No registered learners in this session.</Text>
                </View>
              ) : (
                session.participants
                  .filter((p) => p.role === ParticipantRole.LEARNER)
                  .map((p) => {
                    const isPresent = attendanceState[p.userId] ?? true;
                    return (
                      <View key={p.id || p.userId} style={styles.attendanceItemCard}>
                        <View style={styles.attendanceUserInfo}>
                          <Text style={styles.attendanceUserName}>{p.name}</Text>
                          {p.username && <Text style={styles.attendanceUserHandle}>@{p.username}</Text>}
                        </View>
                        <View style={styles.attendanceToggleRow}>
                          <TouchableOpacity
                            style={[
                              styles.togglePresentBtn,
                              isPresent && styles.togglePresentActive,
                            ]}
                            onPress={() =>
                              setAttendanceState((prev) => ({ ...prev, [p.userId]: true }))
                            }
                          >
                            <Check size={14} color={isPresent ? '#FFFFFF' : '#10B981'} style={{ marginRight: 4 }} />
                            <Text style={[styles.toggleBtnText, isPresent && styles.toggleActiveText]}>
                              Present
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.toggleAbsentBtn,
                              !isPresent && styles.toggleAbsentActive,
                            ]}
                            onPress={() =>
                              setAttendanceState((prev) => ({ ...prev, [p.userId]: false }))
                            }
                          >
                            <UserX size={14} color={!isPresent ? '#FFFFFF' : '#EF4444'} style={{ marginRight: 4 }} />
                            <Text style={[styles.toggleBtnText, !isPresent && styles.toggleActiveText]}>
                              Absent
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
              )}
            </ScrollView>

            <View style={styles.attendanceSummaryBox}>
              <Text style={styles.attendanceSummaryText}>
                Summary: {Object.values(attendanceState).filter(Boolean).length} Present,{' '}
                {Object.values(attendanceState).filter((v) => !v).length} Absent
              </Text>
              <Text style={styles.attendanceSummarySub}>
                Present students will be charged. Absent students will not be charged.
              </Text>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setAttendanceModalOpen(false)}
                disabled={actionLoading}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveReviewBtn, { backgroundColor: '#059669' }]}
                onPress={handleFinalizeAttendance}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <CheckCircle size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.saveReviewText}>Confirm & Conclude 🏁</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </SafeAreaView>
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
    paddingBottom: 60,
  },
  topHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
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
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  cancelledText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  infoCard: {
    backgroundColor: '#F2EEFD',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  formatTag: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  formatTagText: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '800',
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF7DA',
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#FEF08A',
  },
  privateBadgeText: {
    color: '#854D0E',
    fontSize: 11,
    fontWeight: '800',
  },
  publicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  publicBadgeText: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '800',
  },
  eventCustomTitle: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  eventDescSubtitle: {
    color: '#5A6561',
    fontSize: 13,
    marginBottom: 14,
  },
  learnerBannerMint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF7F0',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  learnerBannerText: {
    color: '#0E6245',
    fontSize: 13,
    fontWeight: '600',
  },
  // Host Card (Page 17/18)
  hostCardWhite: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  hostAvatarCA: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0E6245',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  hostAvatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  hostCardName: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  hostCardUsername: {
    color: '#0E6245',
    fontSize: 12,
    fontWeight: '600',
  },
  primaryHostPill: {
    backgroundColor: '#EBF7F0',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  primaryHostText: {
    color: '#0E6245',
    fontSize: 11,
    fontWeight: '700',
  },
  // Purple / Lavender Card (Page 17/18)
  dateTimeCardLavender: {
    backgroundColor: '#F2EEFD',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  cardSectionLabelMuted: {
    color: '#5A6561',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardBoldText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  statusPillCapsule: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statusPillText: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '700',
  },
  statusPillCapsuleDark: {
    backgroundColor: '#18201D',
  },
  statusPillTextDark: {
    color: '#FFFFFF',
  },
  privateCodeBoxYellow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF7DA',
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },
  privateCodeText: {
    color: '#854D0E',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  // Yellow Location Card (Page 17/18)
  locationCardYellow: {
    backgroundColor: '#FEF7DA',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  locationHeaderYellow: {
    color: '#854D0E',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  meetingLinkPrompt: {
    color: '#5A6561',
    fontSize: 12,
    marginBottom: 2,
  },
  meetingLinkClickable: {
    color: '#0E6245',
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  // Mint Stats Card (Page 17/18)
  statsCardMint: {
    backgroundColor: '#EBF7F0',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    gap: 8,
  },
  statLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLineLabel: {
    color: '#374151',
    fontSize: 13,
    flex: 1,
  },
  statLineVal: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
  },
  // Host Management Panel (Page 17/18)
  hostManagementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#0E6245',
    marginBottom: 16,
  },
  managementHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  managementTitle: {
    color: '#0E6245',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  managementSub: {
    color: '#5A6561',
    fontSize: 11,
  },
  cancelEventBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DC2626',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelEventBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
  startEarlyPineBtn: {
    backgroundColor: '#0E6245',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startEarlyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  stopEarlyRedBtn: {
    backgroundColor: '#991B1B',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopEarlyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  rosterSectionTitle: {
    color: '#5A6561',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 16,
    marginBottom: 10,
  },
  noParticipantsText: {
    color: '#5A6561',
    fontSize: 13,
    marginBottom: 12,
  },
  participantMintCard: {
    backgroundColor: '#EBF7F0',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  participantName: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  participantEmail: {
    color: '#5A6561',
    fontSize: 12,
  },
  attendanceConfirmedText: {
    color: '#0E6245',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  shareBannerOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    height: 44,
    borderWidth: 1.5,
    borderColor: '#0E6245',
    marginTop: 14,
  },
  shareBannerOutlineText: {
    color: '#0E6245',
    fontSize: 13,
    fontWeight: '700',
  },
  coMentorsWrap: {
    gap: 8,
    marginBottom: 14,
  },
  coMentorCardWhite: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  studentControlsCard: {
    gap: 10,
    marginBottom: 16,
  },
  joinActionBtn: {
    backgroundColor: '#0E6245',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 24,
  },
  joinActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  fullBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  fullBannerText: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '700',
  },
  registeredNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF7F0',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D4EAD9',
  },
  registeredNoticeTitle: {
    color: '#0E6245',
    fontSize: 13,
    fontWeight: '800',
  },
  registeredNoticeSub: {
    color: '#5A6561',
    fontSize: 11,
    marginTop: 2,
  },
  inProgressNoticeBox: {
    backgroundColor: '#EBF7F0',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D4EAD9',
  },
  inProgressNoticeText: {
    color: '#0E6245',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '700',
  },
  confirmAttendanceBtn: {
    backgroundColor: '#0E6245',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 24,
  },
  confirmedAttendanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF7F0',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D4EAD9',
  },
  confirmedAttendanceText: {
    color: '#0E6245',
    fontSize: 13,
    fontWeight: '700',
  },
  startEarlyBtn: {
    backgroundColor: '#0E6245',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 24,
  },
  stopEarlyBtn: {
    backgroundColor: '#991B1B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 24,
  },
  announceBtn: {
    backgroundColor: '#18201D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 24,
  },
  completeBtn: {
    backgroundColor: '#0E6245',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 24,
  },
  rateBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 24,
  },
  ratedDoneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF7DA',
    borderRadius: 16,
    padding: 14,
  },
  ratedDoneText: {
    color: '#854D0E',
    fontSize: 12,
    fontWeight: '700',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  rateBtnText: {
    color: '#854D0E',
    fontSize: 14,
    fontWeight: '700',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8E5',
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSub: {
    color: '#5A6561',
    fontSize: 12,
    marginBottom: 16,
    lineHeight: 16,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  feedbackInput: {
    backgroundColor: '#F8FAF9',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8E5',
    padding: 12,
    color: '#111827',
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  anonymousToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF7F0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  anonymousToggleLabel: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
  },
  anonymousToggleSub: {
    color: '#5A6561',
    fontSize: 11,
    marginTop: 2,
  },
  joinCodeInput: {
    backgroundColor: '#FEF7DA',
    borderRadius: 12,
    padding: 14,
    color: '#854D0E',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#FEF08A',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  cancelBtnText: {
    color: '#5A6561',
    fontWeight: '600',
  },
  saveReviewBtn: {
    backgroundColor: '#0E6245',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  saveReviewText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // Share Event Banner Button in Host Panel
  shareBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0E6245',
    borderRadius: 22,
    height: 44,
  },
  shareBannerBtnText: {
    color: '#0E6245',
    fontSize: 13,
    fontWeight: '700',
  },
  // Co-Host Invitation Request Banner
  coHostInviteBanner: {
    backgroundColor: '#FEF7DA',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FEF08A',
    padding: 16,
    marginBottom: 14,
  },
  coHostInviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  coHostInviteTitle: {
    color: '#854D0E',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  coHostInviteDesc: {
    color: '#854D0E',
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  coHostActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  acceptCoHostBtn: {
    flex: 1,
    backgroundColor: '#0E6245',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 21,
  },
  acceptCoHostText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  declineCoHostBtn: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineCoHostText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },

  // Share Banner Modal (Artboard Page 19)
  shareModalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#0E6245',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  shareModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  togglesSection: {
    backgroundColor: '#F8FAF9',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8E5',
    gap: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  toggleInfo: {
    flex: 1,
    paddingRight: 12,
  },
  toggleLabel: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
  },
  toggleSub: {
    color: '#5A6561',
    fontSize: 11,
    marginTop: 2,
  },
  previewSectionTitle: {
    color: '#5A6561',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  bannerPreviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#0E6245',
    padding: 18,
    marginBottom: 16,
    shadowColor: '#0E6245',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  bannerPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  bannerPreviewBadge: {
    backgroundColor: '#0E6245',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  bannerPreviewBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bannerTypePill: {
    backgroundColor: '#18201D',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  bannerPreviewType: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  bannerPreviewTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.4,
  },
  bannerHostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#F8FAF9',
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  bannerAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0E6245',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  bannerAvatarText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  bannerHostRealName: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
  },
  bannerHostUsername: {
    color: '#0E6245',
    fontSize: 11,
    fontWeight: '600',
  },
  bannerSkillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  bannerSkillTag: {
    backgroundColor: '#EBF7F0',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  bannerSkillTagText: {
    color: '#0E6245',
    fontSize: 11,
    fontWeight: '700',
  },
  bannerSubTag: {
    backgroundColor: '#F8FAF9',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  bannerSubTagText: {
    color: '#5A6561',
    fontSize: 11,
    fontWeight: '600',
  },
  bannerMetaDivider: {
    height: 1,
    backgroundColor: '#E2E8E5',
    marginVertical: 10,
  },
  bannerMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  bannerMetaText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
  },
  bannerMetaTextCredit: {
    color: '#0E6245',
    fontSize: 12,
    fontWeight: '700',
  },
  shareActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  confirmShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18201D',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  confirmShareBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  downloadBannerPngBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E6245',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  downloadBannerPngBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  // Action Required Cards (Artboard Yellow Theme)
  actionRequiredCard: {
    backgroundColor: '#FEF7DA',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FEF08A',
    padding: 16,
    marginBottom: 16,
  },
  actionRequiredHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  actionRequiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF08A',
    borderWidth: 1,
    borderColor: '#FDE047',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  actionRequiredBadgeText: {
    color: '#854D0E',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  actionRequiredTitle: {
    color: '#854D0E',
    fontSize: 16,
    fontWeight: '800',
  },
  actionRequiredDesc: {
    color: '#854D0E',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  actionRequiredBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0E6245',
    borderRadius: 22,
    height: 44,
  },
  actionSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DC2626',
    borderRadius: 22,
    height: 44,
    paddingHorizontal: 16,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  actionSecondaryText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
  // Session State Card (when no action needed)
  sessionStateCard: {
    backgroundColor: '#EBF7F0',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D4EAD9',
    padding: 14,
    marginBottom: 16,
  },
  sessionStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionStateTitle: {
    color: '#0E6245',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  sessionStateSubtext: {
    color: '#5A6561',
    fontSize: 12,
    lineHeight: 16,
  },
  // Attendance Review Modal (Artboard Light Theme)
  attendanceModalHeader: {
    marginBottom: 12,
  },
  attendanceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  attendanceItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAF9',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  attendanceUserInfo: {
    flex: 1,
    marginRight: 10,
  },
  attendanceUserName: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  attendanceUserHandle: {
    color: '#5A6561',
    fontSize: 12,
    marginTop: 1,
  },
  attendanceToggleRow: {
    flexDirection: 'row',
    gap: 6,
  },
  togglePresentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8E5',
  },
  togglePresentActive: {
    backgroundColor: '#0E6245',
    borderColor: '#0E6245',
  },
  toggleAbsentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8E5',
  },
  toggleAbsentActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5A6561',
  },
  toggleActiveText: {
    color: '#FFFFFF',
  },
  attendanceSummaryBox: {
    backgroundColor: '#EBF7F0',
    borderRadius: 14,
    padding: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#D4EAD9',
  },
  attendanceSummaryText: {
    color: '#0E6245',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  attendanceSummarySub: {
    color: '#5A6561',
    fontSize: 11,
  },
});
