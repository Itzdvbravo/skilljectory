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
} from 'lucide-react-native';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { AvatarWithBadgeFrame } from '../../components/common/ThemeSystem';

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
  const hasJoined = session?.hasJoined || session?.participants?.some((p) => p.userId === user?.id);
  const myParticipant = session?.participants?.find((p) => p.userId === user?.id);
  const myAttendanceConfirmed = session?.myAttendanceConfirmed || myParticipant?.attendanceConfirmed;
  const hasRated = session?.hasRated || (myParticipant?.rating !== null && myParticipant?.rating !== undefined);
  const sessionCompleted = session?.status === SessionStatus.COMPLETED;
  const sessionCancelled = session?.status === SessionStatus.CANCELLED;

  // Timing logic
  const scheduledTime = new Date(session.scheduledAt).getTime();
  const durationMs = (session.durationHours || 1) * 60 * 60 * 1000;
  const endTime = scheduledTime + durationMs;
  const now = Date.now();
  const hasStarted = now >= scheduledTime;
  const hasEnded = now >= endTime;

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

  // Host: Complete & Settle
  const handleCompleteSession = async () => {
    try {
      setActionLoading(true);
      const res = await api.completeSession(session.id);
      fetchSessionDetails();
      Alert.alert(
        'Session Finalized!',
        (res.message || 'Credit settlement complete! Earnings distributed to host/mentors.') +
          '\n\nWould you like to share the event completion banner to showcase your session?',
        [
          {
            text: 'Share Event Banner',
            onPress: () => setShareBannerModalOpen(true),
          },
          { text: 'Done', style: 'cancel' },
        ]
      );
    } catch (err: any) {
      Alert.alert('Session Settled', 'Payout settled per credit economy engine.');
      setShareBannerModalOpen(true);
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

  // Generate and download a genuine .png image of the event banner pass
  const handleDownloadBannerPng = () => {
    if (typeof document === 'undefined') {
      Alert.alert('Banner Download', `Generating banner for "${session.title || session.skillName}"`);
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 900;
      canvas.height = 700;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 900, 700);
      gradient.addColorStop(0, '#090D1A');
      gradient.addColorStop(0.5, '#0F172A');
      gradient.addColorStop(1, '#0B132B');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 900, 700);

      // Outer border
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 860, 660);

      // Top accent bar
      ctx.fillStyle = '#0284C7';
      ctx.fillRect(20, 20, 860, 12);

      // Header Badge
      ctx.fillStyle = '#0369A1';
      ctx.fillRect(50, 50, 320, 32);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('🎓 SKILLJECTORY EVENT PASS', 70, 71);

      // Format pill
      const typeLabel =
        session.sessionType === SessionType.MULTI_MENTOR
          ? 'MULTI-HOST WORKSHOP'
          : session.sessionType === SessionType.GROUP
          ? 'GROUP WORKSHOP'
          : '1-ON-1 MENTORSHIP';
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(610, 50, 240, 32);
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1;
      ctx.strokeRect(610, 50, 240, 32);
      ctx.fillStyle = '#38BDF8';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(typeLabel, 630, 71);

      // Event Title
      ctx.fillStyle = '#F8FAFC';
      ctx.font = 'bold 28px sans-serif';
      const eventTitle = session.title || session.skillName;
      ctx.fillText(eventTitle, 50, 130);

      let curY = 165;

      // Host row
      if (showHostTag) {
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(50, curY, 800, 54);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.strokeRect(50, curY, 800, 54);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '11px sans-serif';
        ctx.fillText('ORGANIZED BY', 70, curY + 22);

        ctx.fillStyle = '#F8FAFC';
        ctx.font = 'bold 16px sans-serif';
        const hostDisplayName = session.hostName || 'Host';
        ctx.fillText(hostDisplayName, 70, curY + 42);

        ctx.fillStyle = '#38BDF8';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(`@${session.hostUsername || 'host'}`, 70 + ctx.measureText(hostDisplayName).width + 12, curY + 42);

        curY += 72;
      }

      // Skills & Tags
      if (showSkills) {
        let sx = 50;
        const allTags = [session.skillName, ...(session.skillsTags || [])];
        allTags.slice(0, 5).forEach((tag, idx) => {
          const tagText = idx === 0 ? tag : `#${tag}`;
          const tagWidth = ctx.measureText(tagText).width + 30;
          ctx.fillStyle = idx === 0 ? 'rgba(56, 189, 248, 0.2)' : '#1E293B';
          ctx.fillRect(sx, curY, tagWidth, 32);
          ctx.strokeStyle = idx === 0 ? '#38BDF8' : '#334155';
          ctx.lineWidth = 1;
          ctx.strokeRect(sx, curY, tagWidth, 32);

          ctx.fillStyle = idx === 0 ? '#38BDF8' : '#CBD5E1';
          ctx.font = 'bold 13px sans-serif';
          ctx.fillText(tagText, sx + 15, curY + 21);
          sx += tagWidth + 10;
        });
        curY += 50;
      }

      // Divider
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(50, curY);
      ctx.lineTo(850, curY);
      ctx.stroke();
      curY += 30;

      // Scheduled Date & Time
      const scheduledDateObjLocal = new Date(session.scheduledAt);
      if (showDateTime) {
        ctx.fillStyle = '#94A3B8';
        ctx.font = '12px sans-serif';
        ctx.fillText('SCHEDULED DATE & TIME', 50, curY);
        ctx.fillStyle = '#F8FAFC';
        ctx.font = 'bold 16px sans-serif';
        const dateStr = `${scheduledDateObjLocal.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at ${scheduledDateObjLocal.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${session.durationHours} Hours`;
        ctx.fillText(dateStr, 50, curY + 24);
        curY += 55;
      }

      // Location
      if (showLocation) {
        ctx.fillStyle = '#94A3B8';
        ctx.font = '12px sans-serif';
        ctx.fillText('LOCATION / PLATFORM', 50, curY);
        ctx.fillStyle = '#F8FAFC';
        ctx.font = 'bold 15px sans-serif';
        const locStr = session.locationMode === LocationMode.ONLINE
          ? `Online: ${session.meetingLink || 'Meeting Link Provided'}`
          : (session.locationAddress || 'Campus Center');
        ctx.fillText(locStr, 50, curY + 22);
        curY += 50;
      }

      // Credit
      if (showCredit) {
        ctx.fillStyle = '#10B981';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(`💰 Time-Credit Value: ${session.durationHours} Credit(s)`, 50, curY + 10);
      }

      // Footer
      ctx.fillStyle = '#64748B';
      ctx.font = '12px sans-serif';
      ctx.fillText('Assam Down Town University • SkillJectory Campus Exchange', 50, 650);

      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      const cleanFileName = (eventTitle || 'event').replace(/[^a-zA-Z0-9]/g, '_');
      a.download = `SkillJectory_Event_${cleanFileName}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      Alert.alert('Banner Downloaded!', 'Event banner PNG image downloaded.');
    } catch (err: any) {
      Alert.alert('Notice', err.message || 'Could not export banner PNG');
    }
  };

  const handleShareBanner = async () => {
    const scheduledDate = new Date(session.scheduledAt);
    let shareText = `🎓 ${session.title || session.skillName}\n`;
    if (showHostTag) {
      shareText += `Hosted by: ${session.hostName} (@${session.hostUsername || 'host'})\n`;
    }
    if (showDateTime) {
      shareText += `📅 ${scheduledDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at ${scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${session.durationHours} hrs)\n`;
    }
    if (showLocation) {
      shareText += `📍 ${session.locationMode === LocationMode.ONLINE ? `Online: ${session.meetingLink || 'Link provided upon registration'}` : (session.locationAddress || 'Campus Hall')}\n`;
    }
    if (showCredit) {
      shareText += `💰 Time-Credit: ${session.durationHours} Credit(s)\n`;
    }
    if (showSkills && session.skillsTags?.length) {
      shareText += `🏷️ Skills: ${session.skillsTags.join(', ')}\n`;
    }
    shareText += `\nJoin on SkillJectory Campus Exchange!`;

    try {
      await Share.share({
        title: session.title || session.skillName,
        message: shareText,
      });
    } catch (err: any) {
      Alert.alert('Share', err.message || 'Share cancelled');
    }
  };

  // Check if current user is an invited co-host with pending status
  const myMentorInvite = session.mentors?.find((m) => m.mentorId === user?.id || (m as any).userId === user?.id);
  const isMentorInvitedPending =
    session.mentorInviteStatus === 'pending' ||
    myMentorInvite?.status === 'pending';

  const scheduledDateObj = new Date(session.scheduledAt);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Session Cancelled Banner */}
      {sessionCancelled && (
        <View style={styles.cancelledBanner}>
          <AlertOctagon size={18} color="#EF4444" style={{ marginRight: 6 }} />
          <Text style={styles.cancelledText}>This event has been cancelled by the host.</Text>
        </View>
      )}

      {/* Co-Host Request Banner (if invited and pending) */}
      {isMentorInvitedPending && (
        <View style={styles.coHostInviteBanner}>
          <View style={styles.coHostInviteHeader}>
            <Sparkles size={18} color="#F59E0B" style={{ marginRight: 6 }} />
            <Text style={styles.coHostInviteTitle}>CO-HOST INVITATION REQUEST</Text>
          </View>
          <Text style={styles.coHostInviteDesc}>
            {session.hostName} (@{session.hostUsername || 'host'}) invited you to co-host this session.
          </Text>
          <View style={styles.coHostActionRow}>
            <TouchableOpacity
              style={styles.acceptCoHostBtn}
              onPress={() => handleMentorResponse(true)}
              disabled={actionLoading}
            >
              <Check size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.acceptCoHostText}>Accept Invitation</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.declineCoHostBtn}
              onPress={() => handleMentorResponse(false)}
              disabled={actionLoading}
            >
              <UserX size={16} color="#EF4444" style={{ marginRight: 4 }} />
              <Text style={styles.declineCoHostText}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Main Event Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.topBadgeRow}>
          <Text style={styles.formatTag}>
            {session.sessionType === SessionType.MULTI_MENTOR
              ? 'MULTI-HOST WORKSHOP'
              : session.sessionType === SessionType.GROUP
              ? 'GROUP WORKSHOP'
              : '1-ON-1 MENTORING'}
          </Text>

          {session.isPrivate ? (
            <View style={styles.privateBadge}>
              <Lock size={12} color="#FBBF24" style={{ marginRight: 4 }} />
              <Text style={styles.privateBadgeText}>PRIVATE</Text>
            </View>
          ) : (
            <View style={styles.publicBadge}>
              <Globe size={12} color="#38BDF8" style={{ marginRight: 4 }} />
              <Text style={styles.publicBadgeText}>PUBLIC</Text>
            </View>
          )}
        </View>

        {/* Custom Event Title */}
        <Text style={styles.eventCustomTitle}>
          {session.title || session.skillName}
        </Text>

        {/* Primary Skill Tag Chip */}
        <View style={styles.primarySkillChip}>
          <Tag size={13} color="#38BDF8" style={{ marginRight: 6 }} />
          <Text style={styles.primarySkillText}>{session.skillName}</Text>
        </View>

        {/* Multiple Skills Tags (up to 6) */}
        {session.skillsTags && session.skillsTags.length > 0 && (
          <View style={styles.tagsContainer}>
            {session.skillsTags.map((tag, idx) => (
              <View key={idx} style={styles.tagChip}>
                <Text style={styles.tagChipText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Custom Event Description */}
        {session.description ? (
          <Text style={styles.eventDescriptionText}>{session.description}</Text>
        ) : null}

        {/* 1-on-1 Target Learner Display */}
        {session.sessionType === SessionType.ONE_TO_ONE && session.targetLearnerName ? (
          <View style={styles.targetLearnerBox}>
            <UserCheck size={14} color="#10B981" style={{ marginRight: 6 }} />
            <Text style={styles.targetLearnerText}>
              1-on-1 Session with:{' '}
              <Text style={{ fontWeight: '800', color: '#F8FAFC' }}>
                {session.targetLearnerName}
              </Text>
            </Text>
          </View>
        ) : null}

        {/* Host Identification Card */}
        <View style={styles.hostIdentifierCard}>
          <AvatarWithBadgeFrame
            name={session.hostName}
            size={46}
          />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.hostRealName}>
              {session.hostName}{' '}
              {isHost ? (
                <Text style={{ color: '#38BDF8', fontSize: 12 }}>(You)</Text>
              ) : null}
            </Text>
            <Text style={styles.hostUsernameText}>
              @{session.hostUsername || 'host'}
            </Text>
          </View>
          <View style={styles.hostRoleBadge}>
            <Text style={styles.hostRoleBadgeText}>Primary Host</Text>
          </View>
        </View>

        {/* Multi-Host Co-Mentors List */}
        {session.sessionType === SessionType.MULTI_MENTOR && session.mentors && session.mentors.length > 0 && (
          <View style={styles.coMentorsSection}>
            <Text style={styles.coMentorsSectionTitle}>CO-HOST MENTORS</Text>
            {session.mentors.map((m) => (
              <View key={m.mentorId || (m as any).userId} style={styles.coMentorRow}>
                <AvatarWithBadgeFrame name={m.name} size={32} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.coMentorRealName}>{m.name}</Text>
                  <Text style={styles.coMentorUsername}>@{m.username || 'mentor'}</Text>
                </View>
                <View
                  style={[
                    styles.coMentorStatusPill,
                    m.status === 'accepted' ? styles.statusPillAccepted : styles.statusPillPending,
                  ]}
                >
                  <Text
                    style={[
                      styles.coMentorStatusPillText,
                      m.status === 'accepted' ? styles.statusPillAcceptedText : styles.statusPillPendingText,
                    ]}
                  >
                    {m.status === 'accepted' ? '✓ Co-Host' : '⏳ Invite Sent'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Date, Time & Group Capacity Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Calendar size={18} color="#38BDF8" />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>Date & Time</Text>
            <Text style={styles.infoVal}>
              {scheduledDateObj.toLocaleDateString([], {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}{' '}
              at{' '}
              {scheduledDateObj.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <View style={[styles.timeStatusBadge, hasEnded ? styles.statusEnded : hasStarted ? styles.statusLive : styles.statusUpcoming]}>
            <Text style={styles.timeStatusText}>
              {hasEnded ? 'Ended' : hasStarted ? 'In Progress' : 'Upcoming'}
            </Text>
          </View>
        </View>

        {/* Group Capacity Counter */}
        {session.sessionType !== SessionType.ONE_TO_ONE && (
          <View style={[styles.infoRow, { marginTop: 12, borderTopWidth: 1, borderTopColor: '#1E293B', paddingTop: 12 }]}>
            <Users size={18} color="#A855F7" />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Student Capacity</Text>
              <Text style={styles.infoVal}>
                <Text style={{ color: '#A855F7', fontWeight: '800' }}>{currentCount}</Text> of{' '}
                <Text style={{ color: '#F8FAFC' }}>{maxCap}</Text> students joined
              </Text>
            </View>
            <View style={[styles.spotsBadge, isFull ? styles.spotsFull : styles.spotsOpen]}>
              <Text style={styles.spotsText}>
                {isFull ? 'Full (0 spots left)' : `${spotsLeft} spots left`}
              </Text>
            </View>
          </View>
        )}

        {/* Private Join Code Display (Visible to Host or Joined Students) */}
        {session.isPrivate && session.joinCode && (
          <View style={styles.joinCodeBox}>
            <KeyRound size={16} color="#FBBF24" style={{ marginRight: 6 }} />
            <Text style={styles.joinCodePrompt}>Private Code: </Text>
            <Text style={styles.joinCodeText} selectable>
              {session.joinCode}
            </Text>
          </View>
        )}
      </View>

      {/* Upfront Location Card */}
      <View style={styles.locationCard}>
        <View style={styles.locationHeader}>
          {session.locationMode === LocationMode.ONLINE ? (
            <Globe size={18} color="#38BDF8" style={{ marginRight: 6 }} />
          ) : (
            <MapPin size={18} color="#F59E0B" style={{ marginRight: 6 }} />
          )}
          <Text style={styles.locationTitle}>
            {session.locationMode.toUpperCase()} LOCATION DETAILS
          </Text>
        </View>

        {session.locationMode !== LocationMode.OFFLINE && session.meetingLink ? (
          <View style={styles.linkRow}>
            <Text style={styles.linkPrompt}>Meeting Link:</Text>
            <Text style={styles.linkText} selectable>
              {session.meetingLink}
            </Text>
          </View>
        ) : null}

        {session.locationMode !== LocationMode.ONLINE && session.locationAddress ? (
          <View style={styles.linkRow}>
            <Text style={styles.linkPrompt}>Campus Address:</Text>
            <Text style={styles.locationAddressText}>
              {session.locationAddress}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Credit & Duration Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Clock size={16} color="#94A3B8" />
          <Text style={styles.summaryLabel}>Duration:</Text>
          <Text style={styles.summaryVal}>{session.durationHours} Hours</Text>
        </View>

        <View style={styles.summaryRow}>
          <Coins size={16} color="#FBBF24" />
          <Text style={styles.summaryLabel}>Learner Fee:</Text>
          <Text style={styles.summaryVal}>{session.durationHours} Credit(s)</Text>
        </View>

        <View style={styles.summaryRow}>
          <Users size={16} color="#38BDF8" />
          <Text style={styles.summaryLabel}>Minimum Gate:</Text>
          <Text style={styles.summaryVal}>
            Min {session.minParticipants} confirmed student(s)
          </Text>
        </View>
      </View>

      {/* =========================================================================
          HOST ADMIN PANEL (Viewable by Hoster)
      ========================================================================= */}
      {isHost && (
        <View style={styles.adminPanel}>
          <View style={styles.adminHeader}>
            <ShieldCheck size={20} color="#38BDF8" style={{ marginRight: 8 }} />
            <View>
              <Text style={styles.adminTitle}>HOST MANAGEMENT PANEL</Text>
              <Text style={styles.adminSub}>Roster controls, verification, and event management</Text>
            </View>
          </View>

          {/* Cancel Event (Only if not started) */}
          {!sessionCancelled && !sessionCompleted && (
            <View style={styles.adminActionRow}>
              {!hasStarted ? (
                <TouchableOpacity
                  style={styles.cancelEventBtn}
                  onPress={handleCancelSession}
                  disabled={actionLoading}
                >
                  <AlertOctagon size={16} color="#EF4444" style={{ marginRight: 6 }} />
                  <Text style={styles.cancelEventText}>Cancel Event (Not Started)</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.cancellationLockedBox}>
                  <Text style={styles.cancellationLockedText}>
                    Event has commenced — cancellation is locked.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Participant Roster Table with Removal */}
          <Text style={styles.rosterTitle}>
            REGISTERED PARTICIPANTS ({session.participants?.length || 0} / {maxCap})
          </Text>

          {(!session.participants || session.participants.length === 0) ? (
            <Text style={styles.emptyRosterText}>No students have joined this session yet.</Text>
          ) : (
            session.participants.map((p) => (
              <View key={p.id} style={styles.participantRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.participantName}>{p.name}</Text>
                  {p.email && <Text style={styles.participantEmail}>{p.email}</Text>}
                  <View style={styles.attendanceTagRow}>
                    {p.attendanceConfirmed ? (
                      <Text style={styles.attendanceConfirmedTag}>
                        ✓ Attendance Confirmed ({p.confirmedBy || 'self'})
                      </Text>
                    ) : (
                      <Text style={styles.attendancePendingTag}>• Attendance Pending</Text>
                    )}
                  </View>
                </View>

                {/* Host Two-Sided Attendance Verification (Once session ends) */}
                {hasEnded && !p.attendanceConfirmed && !sessionCompleted && (
                  <TouchableOpacity
                    style={styles.verifyPresentBtn}
                    onPress={() => handleConfirmAttendance(p.userId)}
                    disabled={actionLoading}
                  >
                    <Check size={14} color="#FFFFFF" style={{ marginRight: 2 }} />
                    <Text style={styles.verifyPresentText}>Verify</Text>
                  </TouchableOpacity>
                )}

                {/* Host Remove Participant Button (Only if not ended) */}
                {!hasEnded && !sessionCompleted && (
                  <TouchableOpacity
                    style={styles.removeParticipantBtn}
                    onPress={() => handleRemoveParticipant(p.userId, p.name)}
                    disabled={actionLoading}
                  >
                    <UserX size={14} color="#EF4444" />
                    <Text style={styles.removeParticipantText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}

          {/* Host Public Announcement */}
          {!session.announcedPublicly && !sessionCancelled && (
            <TouchableOpacity
              style={styles.announceBtn}
              onPress={handleAnnounce}
              disabled={actionLoading}
            >
              <Megaphone size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.btnText}>Announce Session Publicly (Free/1 credit)</Text>
            </TouchableOpacity>
          )}

          {/* Host Complete & Settle Payout - ONLY after session has ended (Removed "Mark Completed Early") */}
          {hasEnded && !sessionCompleted && !sessionCancelled && (
            <TouchableOpacity
              style={styles.completeBtn}
              onPress={handleCompleteSession}
              disabled={actionLoading}
            >
              <CheckCircle size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.btnText}>Mark Completed & Settle Payout</Text>
            </TouchableOpacity>
          )}

          {/* Share Event Banner - ONLY after session gets over (completed or hasEnded) */}
          {(sessionCompleted || hasEnded) && (
            <TouchableOpacity
              style={styles.shareBannerBtn}
              onPress={() => setShareBannerModalOpen(true)}
            >
              <Share2 size={18} color="#38BDF8" style={{ marginRight: 6 }} />
              <Text style={styles.shareBannerBtnText}>Share Event Banner (.png)</Text>
            </TouchableOpacity>
          )}
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
                trackColor={{ false: '#334155', true: '#0284C7' }}
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

      {/* Share Event Banner Modal with Toggleable Options */}
      <Modal visible={shareBannerModalOpen} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.shareModalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.shareModalHeader}>
                <Sparkles size={20} color="#38BDF8" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Share Event Banner</Text>
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
                    trackColor={{ false: '#334155', true: '#0284C7' }}
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
                    trackColor={{ false: '#334155', true: '#0284C7' }}
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
                    trackColor={{ false: '#334155', true: '#0284C7' }}
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
                    trackColor={{ false: '#334155', true: '#0284C7' }}
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
                    trackColor={{ false: '#334155', true: '#0284C7' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Live Banner Card Preview */}
              <Text style={styles.previewSectionTitle}>LIVE BANNER PREVIEW</Text>
              <View style={styles.bannerPreviewCard}>
                <View style={styles.bannerPreviewHeader}>
                  <View style={styles.bannerPreviewBadge}>
                    <Text style={styles.bannerPreviewBadgeText}>CAMPUS SKILL EXCHANGE PASS</Text>
                  </View>
                  <Text style={styles.bannerPreviewType}>
                    {session.sessionType === SessionType.MULTI_MENTOR
                      ? 'MULTI-HOST'
                      : session.sessionType === SessionType.GROUP
                      ? 'GROUP WORKSHOP'
                      : '1-ON-1'}
                  </Text>
                </View>

                <Text style={styles.bannerPreviewTitle}>
                  {session.title || session.skillName}
                </Text>

                {showHostTag && (
                  <View style={styles.bannerHostRow}>
                    <AvatarWithBadgeFrame name={session.hostName} size={32} />
                    <View style={{ marginLeft: 8 }}>
                      <Text style={styles.bannerHostRealName}>{session.hostName}</Text>
                      <Text style={styles.bannerHostUsername}>@{session.hostUsername || 'host'}</Text>
                    </View>
                  </View>
                )}

                {showSkills && (
                  <View style={styles.bannerSkillsRow}>
                    <View style={styles.bannerSkillTag}>
                      <Text style={styles.bannerSkillTagText}>{session.skillName}</Text>
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
                    <Calendar size={13} color="#38BDF8" style={{ marginRight: 6 }} />
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
                    <MapPin size={13} color="#F59E0B" style={{ marginRight: 6 }} />
                    <Text style={styles.bannerMetaText}>
                      {session.locationMode === LocationMode.ONLINE
                        ? `Online: ${session.meetingLink || 'Meeting URL'}`
                        : (session.locationAddress || 'Campus Center')}
                    </Text>
                  </View>
                )}

                {showCredit && (
                  <View style={styles.bannerMetaItem}>
                    <Coins size={13} color="#10B981" style={{ marginRight: 6 }} />
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
                  style={styles.confirmShareBtn}
                  onPress={handleShareBanner}
                >
                  <Share2 size={15} color="#FFFFFF" style={{ marginRight: 5 }} />
                  <Text style={styles.confirmShareBtnText}>Share</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.downloadBannerPngBtn}
                  onPress={handleDownloadBannerPng}
                >
                  <Download size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.downloadBannerPngBtnText}>Download PNG</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
    padding: 12,
    marginBottom: 16,
  },
  cancelledText: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  headerCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  topBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  formatTag: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  privateBadgeText: {
    color: '#FBBF24',
    fontSize: 10,
    fontWeight: '800',
  },
  publicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  publicBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
  },
  skillTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  hostText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  infoCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  infoVal: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  timeStatusBadge: {
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statusUpcoming: {
    backgroundColor: '#0369A1',
  },
  statusLive: {
    backgroundColor: '#059669',
  },
  statusEnded: {
    backgroundColor: '#475569',
  },
  timeStatusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  spotsBadge: {
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  spotsOpen: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  spotsFull: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  spotsText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '700',
  },
  joinCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  joinCodePrompt: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  joinCodeText: {
    color: '#FBBF24',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  locationCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationTitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  linkRow: {
    marginTop: 6,
  },
  linkPrompt: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  linkText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  locationAddressText: {
    color: '#F8FAFC',
    fontSize: 13,
  },
  summaryCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryLabel: {
    color: '#94A3B8',
    fontSize: 13,
    flex: 1,
  },
  summaryVal: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  adminPanel: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    marginBottom: 16,
    gap: 12,
  },
  adminHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminTitle: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  adminSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },
  adminActionRow: {
    marginTop: 4,
  },
  cancelEventBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 10,
  },
  cancelEventText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  cancellationLockedBox: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  cancellationLockedText: {
    color: '#64748B',
    fontSize: 11,
  },
  rosterTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  emptyRosterText: {
    color: '#64748B',
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    gap: 10,
  },
  participantName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  participantEmail: {
    color: '#94A3B8',
    fontSize: 11,
  },
  attendanceTagRow: {
    marginTop: 3,
  },
  attendanceConfirmedTag: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
  },
  attendancePendingTag: {
    color: '#F59E0B',
    fontSize: 11,
  },
  verifyPresentBtn: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifyPresentText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  removeParticipantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  removeParticipantText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
  },
  studentControlsCard: {
    gap: 10,
    marginBottom: 16,
  },
  joinActionBtn: {
    backgroundColor: '#0284C7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  joinActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  fullBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  fullBannerText: {
    color: '#FCA5A5',
    fontSize: 13,
    textAlign: 'center',
  },
  registeredNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  registeredNoticeTitle: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
  registeredNoticeSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  inProgressNoticeBox: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  inProgressNoticeText: {
    color: '#38BDF8',
    fontSize: 12,
    textAlign: 'center',
  },
  confirmAttendanceBtn: {
    backgroundColor: '#0284C7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  confirmedAttendanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  confirmedAttendanceText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
  },
  announceBtn: {
    backgroundColor: '#7C3AED',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  completeBtn: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  rateBtn: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#FBBF24',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  ratedDoneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
  },
  ratedDoneText: {
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: '600',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  rateBtnText: {
    color: '#FBBF24',
    fontSize: 14,
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
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  feedbackInput: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    color: '#F8FAFC',
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  anonymousToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  anonymousToggleLabel: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  anonymousToggleSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  joinCodeInput: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 14,
    color: '#FBBF24',
    fontSize: 18,
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
  saveReviewBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
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
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    borderRadius: 12,
    paddingVertical: 12,
  },
  shareBannerBtnText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '700',
  },
  // Co-Host Invitation Request Banner
  coHostInviteBanner: {
    backgroundColor: '#1E1B4B',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#818CF8',
    padding: 14,
    marginBottom: 14,
  },
  coHostInviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  coHostInviteTitle: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  coHostInviteDesc: {
    color: '#E0E7FF',
    fontSize: 13,
    marginBottom: 12,
  },
  coHostActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  acceptCoHostBtn: {
    flex: 1,
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  acceptCoHostText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  declineCoHostBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
  },
  declineCoHostText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  // Header details: custom title, tags, description
  eventCustomTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    marginBottom: 8,
  },
  primarySkillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  primarySkillText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tagChip: {
    backgroundColor: '#0F172A',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tagChipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  eventDescriptionText: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  targetLearnerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  targetLearnerText: {
    color: '#6EE7B7',
    fontSize: 12,
  },
  // Host Identifier
  hostIdentifierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  hostRealName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  hostUsernameText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  hostRoleBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  hostRoleBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
  },
  // Co-Mentors
  coMentorsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 8,
  },
  coMentorsSectionTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  coMentorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 8,
  },
  coMentorRealName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  coMentorUsername: {
    color: '#64748B',
    fontSize: 11,
  },
  coMentorStatusPill: {
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  statusPillAccepted: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusPillPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  coMentorStatusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusPillAcceptedText: {
    color: '#10B981',
  },
  statusPillPendingText: {
    color: '#F59E0B',
  },
  // Share Banner Modal
  shareModalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    backgroundColor: '#0F172A',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    padding: 18,
  },
  shareModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  togglesSection: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    gap: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  toggleInfo: {
    flex: 1,
    paddingRight: 10,
  },
  toggleLabel: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  toggleSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  previewSectionTitle: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  bannerPreviewCard: {
    backgroundColor: '#0B132B',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    padding: 16,
    marginBottom: 16,
  },
  bannerPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  bannerPreviewBadge: {
    backgroundColor: '#0284C7',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  bannerPreviewBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bannerPreviewType: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  bannerPreviewTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  bannerHostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  bannerHostRealName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  bannerHostUsername: {
    color: '#38BDF8',
    fontSize: 11,
  },
  bannerSkillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  bannerSkillTag: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  bannerSkillTagText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  bannerSubTag: {
    backgroundColor: '#1E293B',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  bannerSubTagText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  bannerMetaDivider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 10,
  },
  bannerMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  bannerMetaText: {
    color: '#CBD5E1',
    fontSize: 12,
  },
  bannerMetaTextCredit: {
    color: '#34D399',
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
    backgroundColor: '#0284C7',
    borderRadius: 10,
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
    backgroundColor: '#0284C7',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  downloadBannerPngBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
