import { prisma } from '../../common/prisma.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../common/errors/app-error.js';
import {
  SessionType,
  SessionStatus,
  LocationMode,
  ParticipantRole,
  ConfirmedBy,
  LedgerTransactionType,
  NotificationType,
} from '@prisma/client';
import { CreditEngine, ECONOMY_CONFIG, VALID_SESSION_DURATIONS } from '../credits/credits.engine.js';
import { CreditsService } from '../credits/credits.service.js';
import { validateMeetingUrl } from '../../common/validation/url-validator.js';

export class SessionsService {
  /**
   * Section 8.1: Preview costs and earnings before user confirms session creation
   */
  static async preview(params: {
    userId: string;
    sessionType: SessionType;
    durationHours: number;
    mentorsCount?: number;
    expectedLearners?: number;
  }) {
    const { userId, sessionType, durationHours, mentorsCount = 2, expectedLearners = 3 } = params;

    if (!VALID_SESSION_DURATIONS.includes(durationHours as any)) {
      throw new BadRequestError(`Invalid duration. Must be one of: ${VALID_SESSION_DURATIONS.join(', ')} hours`);
    }

    const currentBalance = await CreditsService.getBalance(userId);
    const learnerCostPerPerson = 1.0 * durationHours;

    let hostCost = 0;
    let projectedEarnings = 0;
    let minParticipants = 1;
    const notes: string[] = [];

    if (sessionType === SessionType.one_to_one) {
      hostCost = 0;
      projectedEarnings = 1.0 * durationHours;
      minParticipants = 1;
      notes.push('1:1 mentoring: learner pays 1 credit/hour upon attendance confirmation.');
    } else if (sessionType === SessionType.group) {
      hostCost = ECONOMY_CONFIG.GROUP_SESSION_HOST_COST; // 1 credit
      minParticipants = 2;
      const calc = CreditEngine.calculateGroupSessionEarnings(expectedLearners, durationHours);
      projectedEarnings = calc.hostEarning;
      notes.push(
        'Host pays 1 non-refundable anti-spam credit upfront.',
        'Earnings floor is max(3, attendees × duration).'
      );
    } else if (sessionType === SessionType.multi_mentor) {
      hostCost = ECONOMY_CONFIG.MULTI_MENTOR_HOST_COST_PER_MENTOR; // 1.5 credits
      minParticipants = mentorsCount;
      const calc = CreditEngine.calculateMultiMentorEarnings(expectedLearners, mentorsCount, durationHours);
      projectedEarnings = calc.earningPerMentor;
      notes.push(
        'Each mentor pays 1.5 non-refundable credits upfront.',
        'Total pool = learners × duration (strictly no floor), split evenly among mentors.',
        'Hard constraint: confirmed learners must be ≥ mentors.'
      );
    }

    const netHostResult = projectedEarnings - hostCost;
    const canAfford = currentBalance >= hostCost;

    return {
      sessionType,
      durationHours,
      hostCost,
      learnerCostPerPerson,
      projectedEarnings,
      netHostResult,
      minParticipants,
      canAfford,
      notes,
    };
  }

  /**
   * Section 4 & 5: Create Session with location mode verification, capacity limits, privacy, and anti-spam debits
   */
  static async createSession(
    hostId: string,
    data: {
      sessionType: SessionType;
      skillId: string;
      title?: string;
      description?: string;
      skillsTags?: string[];
      targetLearnerName?: string;
      durationHours: number;
      scheduledAt: Date;
      locationMode: LocationMode;
      meetingLink?: string;
      locationAddress?: string;
      coMentorIds?: string[];
      coMentorUsernames?: string[];
      minParticipants?: number;
      maxParticipants?: number;
      isPrivate?: boolean;
      announcedImmediately?: boolean;
    }
  ) {
    // 1. Validate duration
    if (!VALID_SESSION_DURATIONS.includes(data.durationHours as any)) {
      throw new BadRequestError(`Duration must be one of: ${VALID_SESSION_DURATIONS.join(', ')} hours`);
    }

    // 2. Validate scheduled time (always ask when will take place w/ time, must be future)
    if (!data.scheduledAt || isNaN(data.scheduledAt.getTime())) {
      throw new BadRequestError('Session scheduled date and time is required');
    }
    const nowTime = Date.now();
    if (data.scheduledAt.getTime() <= nowTime) {
      throw new BadRequestError('Session cannot be scheduled in the past. Please choose a future date and time.');
    }

    // 2b. Prevent scheduling collisions with any active/scheduled session for the host
    const newSessionStart = data.scheduledAt.getTime();
    const newSessionEnd = newSessionStart + data.durationHours * 60 * 60 * 1000;

    const existingHostSessions = await prisma.session.findMany({
      where: {
        status: { in: [SessionStatus.scheduled, SessionStatus.in_progress] },
        OR: [
          { host_id: hostId },
          { mentors: { some: { mentor_id: hostId, status: { in: ['accepted', 'pending'] } } } },
        ],
      },
      select: {
        id: true,
        title: true,
        scheduled_at: true,
        duration_hours: true,
        status: true,
      },
    });

    for (const s of existingHostSessions) {
      const sStart = s.scheduled_at.getTime();
      const sEnd = sStart + s.duration_hours * 60 * 60 * 1000;
      // Overlap condition: newSessionStart < sEnd && newSessionEnd > sStart
      if (newSessionStart < sEnd && newSessionEnd > sStart) {
        throw new BadRequestError(
          `Schedule conflict: You already have a session ("${s.title || 'Existing Session'}") ${s.status === SessionStatus.in_progress ? 'in progress' : 'scheduled'} from ${new Date(sStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to ${new Date(sEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
        );
      }
    }

    // Validate title and description length
    if (data.title && data.title.trim().length > 80) {
      throw new BadRequestError('Title must not exceed 80 characters');
    }
    if (data.description && data.description.trim().length > 500) {
      throw new BadRequestError('Description must not exceed 500 characters');
    }

    // Validate skills tags (up to 6 max)
    const skillsTags = (data.skillsTags || []).map((t) => t.trim()).filter(Boolean).slice(0, 6);

    // 3. Validate location mode (Section 4 & 8.3)
    if (data.locationMode === LocationMode.online) {
      if (!data.meetingLink || !validateMeetingUrl(data.meetingLink)) {
        throw new BadRequestError('Online session requires a well-formed meeting link URL (http:// or https://)');
      }
    } else if (data.locationMode === LocationMode.offline) {
      if (!data.locationAddress || data.locationAddress.trim().length === 0) {
        throw new BadRequestError('Offline session requires a physical campus location/address');
      }
    } else if (data.locationMode === LocationMode.hybrid) {
      if (!data.meetingLink || !validateMeetingUrl(data.meetingLink)) {
        throw new BadRequestError('Hybrid session requires a valid meeting link URL');
      }
      if (!data.locationAddress || data.locationAddress.trim().length === 0) {
        throw new BadRequestError('Hybrid session requires a physical campus location/address');
      }
    }

    // Resolve skill: by id, or by name / first skill tag, or fallback to first available skill
    let skill = data.skillId ? await prisma.skill.findUnique({ where: { id: data.skillId } }) : null;
    if (!skill) {
      const targetSkillName =
        (data as any).skillName ||
        (data.skillsTags && data.skillsTags[0]) ||
        'General Mentorship';

      skill = await prisma.skill.findFirst({
        where: { display_name: { equals: targetSkillName, mode: 'insensitive' } },
      });

      if (!skill) {
        skill = await prisma.skill.create({
          data: {
            display_name: targetSkillName,
            name_normalized: targetSkillName.toLowerCase().trim().replace(/\s+/g, '_'),
            category: 'Computer Science',
          },
        });
      }
    }
    data.skillId = skill.id;

    const isPrivate = data.sessionType === SessionType.one_to_one ? true : Boolean(data.isPrivate);
    const joinCode = (isPrivate && data.sessionType !== SessionType.one_to_one)
      ? `CAMP-${Math.floor(1000 + Math.random() * 9000)}`
      : null;

    return await prisma.$transaction(async (tx) => {
      let createdSession: any;

      // Handle Multi-Mentor logic (Section 5.5)
      if (data.sessionType === SessionType.multi_mentor) {
        let coMentorUserIds: string[] = [];

        if (data.coMentorUsernames && data.coMentorUsernames.length > 0) {
          const cleanUsernames = data.coMentorUsernames
            .map((u) => u.trim().toLowerCase().replace(/^@/, ''))
            .filter(Boolean);

          const foundMentors = await tx.user.findMany({
            where: {
              OR: [
                { username: { in: cleanUsernames } },
                { id: { in: cleanUsernames } },
              ],
            },
            select: { id: true, username: true, name: true },
          });

          if (foundMentors.length === 0) {
            throw new BadRequestError(
              `Mentors with usernames [${cleanUsernames.join(', ')}] were not found in the dataset.`
            );
          }

          coMentorUserIds = foundMentors.map((m) => m.id).filter((id) => id !== hostId);
        } else if (data.coMentorIds && data.coMentorIds.length > 0) {
          coMentorUserIds = data.coMentorIds.filter((id) => id !== hostId);
        }

        const allMentorIds = Array.from(new Set([hostId, ...coMentorUserIds]));
        if (allMentorIds.length < 2) {
          throw new BadRequestError(
            'Multi-host sessions require at least 2 mentors from the dataset. Please provide valid co-mentor usernames.'
          );
        }

        // Multi-host: min students allowed is same as number of hosts, max is 15
        const minAllowed = allMentorIds.length;
        let maxParticipants = data.maxParticipants ?? 15;
        if (maxParticipants < minAllowed || maxParticipants > 15) {
          throw new BadRequestError(
            `For multi-host sessions, max students allowed must be between ${minAllowed} (number of hosts) and 15`
          );
        }

        createdSession = await tx.session.create({
          data: {
            host_id: hostId,
            session_type: SessionType.multi_mentor,
            skill_id: data.skillId,
            title: data.title?.trim() || null,
            description: data.description?.trim() || null,
            skills_tags: skillsTags.length > 0 ? skillsTags : [skill.display_name],
            target_learner_name: null,
            duration_hours: data.durationHours,
            scheduled_at: data.scheduledAt,
            location_mode: data.locationMode,
            meeting_link: data.meetingLink?.trim() || null,
            location_address: data.locationAddress?.trim() || null,
            min_participants: minAllowed,
            max_participants: maxParticipants,
            is_private: isPrivate,
            join_code: joinCode,
            status: SessionStatus.scheduled,
          },
        });

        // Debit host mentor 1.5 credits upfront
        await CreditsService.applyTransaction(tx, {
          userId: hostId,
          amount: -ECONOMY_CONFIG.MULTI_MENTOR_HOST_COST_PER_MENTOR,
          type: LedgerTransactionType.mentor_host_cost,
          referenceType: 'session',
          referenceId: createdSession.id,
        });

        await tx.sessionMentor.create({
          data: {
            session_id: createdSession.id,
            mentor_id: hostId,
            credit_cost: ECONOMY_CONFIG.MULTI_MENTOR_HOST_COST_PER_MENTOR,
            status: 'accepted',
          },
        });

        const hostUser = await tx.user.findUnique({
          where: { id: hostId },
          select: { name: true, username: true },
        });

        // Add co-mentors as pending requests and notify them
        for (const coId of coMentorUserIds) {
          await tx.sessionMentor.create({
            data: {
              session_id: createdSession.id,
              mentor_id: coId,
              credit_cost: ECONOMY_CONFIG.MULTI_MENTOR_HOST_COST_PER_MENTOR,
              status: 'pending',
            },
          });

          await tx.notification.create({
            data: {
              user_id: coId,
              type: NotificationType.session_milestone,
              reference_type: 'session_cohost_request',
              reference_id: createdSession.id,
              title: 'Co-Host Invitation Request',
              body: `${hostUser?.name || 'A mentor'} (@${hostUser?.username || 'host'}) invited you to co-host '${data.title || skill.display_name}'.`,
            },
          });
        }
      } else if (data.sessionType === SessionType.group) {
        // Group Session (Section 5.3)
        let maxParticipants = data.maxParticipants ?? 15;
        if (maxParticipants < 2 || maxParticipants > 15) {
          throw new BadRequestError('For group sessions, max students allowed must be between 2 and 15');
        }

        createdSession = await tx.session.create({
          data: {
            host_id: hostId,
            session_type: SessionType.group,
            skill_id: data.skillId,
            title: data.title?.trim() || null,
            description: data.description?.trim() || null,
            skills_tags: skillsTags.length > 0 ? skillsTags : [skill.display_name],
            target_learner_name: null,
            duration_hours: data.durationHours,
            scheduled_at: data.scheduledAt,
            location_mode: data.locationMode,
            meeting_link: data.meetingLink?.trim() || null,
            location_address: data.locationAddress?.trim() || null,
            min_participants: 2,
            max_participants: maxParticipants,
            is_private: isPrivate,
            join_code: joinCode,
            status: SessionStatus.scheduled,
          },
        });

        // Debit host 1 credit anti-spam cost (Section 5.3)
        await CreditsService.applyTransaction(tx, {
          userId: hostId,
          amount: -ECONOMY_CONFIG.GROUP_SESSION_HOST_COST,
          type: LedgerTransactionType.session_host_cost,
          referenceType: 'session',
          referenceId: createdSession.id,
        });
      } else {
        // 1:1 Session - Verify target student exists in DB
        const rawTarget = (data.targetLearnerName || '').trim();
        if (!rawTarget) {
          throw new BadRequestError('1-on-1 session requires specifying a student (@username, email, or full name).');
        }

        const cleanTarget = rawTarget.toLowerCase().replace(/^@/, '');
        const targetUser = await tx.user.findFirst({
          where: {
            OR: [
              { username: { equals: cleanTarget, mode: 'insensitive' } },
              { email: { equals: cleanTarget, mode: 'insensitive' } },
              { id: cleanTarget },
              { name: { equals: rawTarget, mode: 'insensitive' } },
            ],
          },
          select: { id: true, name: true, username: true, email: true },
        });

        if (!targetUser) {
          throw new BadRequestError(
            `Student "${rawTarget}" does not exist in the campus database. Please verify their username or email.`
          );
        }

        if (targetUser.id === hostId) {
          throw new BadRequestError('You cannot host a 1-on-1 session with yourself as the student.');
        }

        const formattedLearnerName = `${targetUser.name}${targetUser.username ? ` (@${targetUser.username})` : ''}`;

        createdSession = await tx.session.create({
          data: {
            host_id: hostId,
            session_type: SessionType.one_to_one,
            skill_id: data.skillId,
            title: data.title?.trim() || null,
            description: data.description?.trim() || null,
            skills_tags: skillsTags.length > 0 ? skillsTags : [skill.display_name],
            target_learner_name: formattedLearnerName,
            duration_hours: data.durationHours,
            scheduled_at: data.scheduledAt,
            location_mode: data.locationMode,
            meeting_link: data.meetingLink?.trim() || null,
            location_address: data.locationAddress?.trim() || null,
            min_participants: 1,
            max_participants: 1,
            is_private: true,
            join_code: null,
            status: SessionStatus.scheduled,
          },
        });

        // Add the target student as a registered session participant
        await tx.sessionParticipant.create({
          data: {
            session_id: createdSession.id,
            user_id: targetUser.id,
            role: ParticipantRole.learner,
            attendance_confirmed: false,
          },
        });

        const hostUser = await tx.user.findUnique({
          where: { id: hostId },
          select: { name: true, username: true },
        });

        // Send mentorship request notification to the student
        await tx.notification.create({
          data: {
            user_id: targetUser.id,
            type: NotificationType.session_milestone,
            reference_type: 'one_to_one_invitation',
            reference_id: createdSession.id,
            title: '1-on-1 Mentorship Request 🎓',
            body: `${hostUser?.name || 'A mentor'} (@${hostUser?.username || 'mentor'}) scheduled a 1-on-1 session "${data.title || skill.display_name}" with you!`,
          },
        });
      }

      // Handle Immediate Public Announcement if selected by host (disabled for 1-on-1 and private sessions)
      if (data.announcedImmediately && data.sessionType !== SessionType.one_to_one && !isPrivate) {
        const user = await tx.user.findUnique({
          where: { id: hostId },
          select: {
            free_announcements_used: true,
            free_announcement_window_start: true,
            credit_balance: true,
          },
        });

        if (user) {
          const eligibility = CreditEngine.evaluateAnnouncementEligibility(
            user.free_announcements_used,
            user.free_announcement_window_start
          );

          if (!eligibility.isFree) {
            await CreditsService.applyTransaction(tx, {
              userId: hostId,
              amount: -ECONOMY_CONFIG.ANNOUNCEMENT_PAID_COST,
              type: LedgerTransactionType.announcement_cost,
              referenceType: 'session_announcement',
              referenceId: createdSession.id,
            });
          } else {
            await tx.user.update({
              where: { id: hostId },
              data: {
                free_announcements_used: user.free_announcements_used + 1,
                free_announcement_window_start: new Date(),
              },
            });
          }

          createdSession = await tx.session.update({
            where: { id: createdSession.id },
            data: {
              announced_publicly: true,
              announcement_was_free: eligibility.isFree,
            },
          });
        }
      }

      return createdSession;
    });
  }

  /**
   * Join a session as a learner
   * Allowed for scheduled or in-progress sessions before conclusion, with valid capacity and join code if private
   */
  static async joinSession(userId: string, sessionId: string, joinCode?: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { participants: true },
    });

    if (!session) throw new NotFoundError('Session not found');
    if (session.status !== SessionStatus.scheduled && session.status !== SessionStatus.in_progress) {
      throw new BadRequestError('Can only join scheduled or in-progress sessions');
    }
    if (session.host_id === userId) {
      throw new BadRequestError('Host cannot join their own session as learner');
    }

    // Only allow joining before the session concludes
    const scheduledEndTime = session.scheduled_at.getTime() + (session.duration_hours || 1) * 3600 * 1000;
    if (Date.now() >= scheduledEndTime) {
      throw new BadRequestError('Cannot join: this event has already concluded.');
    }

    // Check maximum capacity
    const maxCapacity = session.max_participants || 15;
    if (session.participants.length >= maxCapacity) {
      throw new BadRequestError(`This session has reached its maximum capacity of ${maxCapacity} students.`);
    }

    // Check private session join code
    if (session.is_private) {
      const inputCode = joinCode?.trim().toUpperCase();
      const sessionCode = session.join_code?.trim().toUpperCase();
      const inputDigits = inputCode?.replace(/^CAMP-?/i, '');
      const sessionDigits = sessionCode?.replace(/^CAMP-?/i, '');

      if (!inputCode || (inputCode !== sessionCode && (!inputDigits || inputDigits !== sessionDigits))) {
        throw new BadRequestError('This is a private session. A valid joining code is required.');
      }
    }

    const alreadyJoined = session.participants.some((p) => p.user_id === userId);
    if (alreadyJoined) {
      throw new BadRequestError('Already registered for this session');
    }

    return await prisma.sessionParticipant.create({
      data: {
        session_id: sessionId,
        user_id: userId,
        role: ParticipantRole.learner,
        attendance_confirmed: false,
      },
    });
  }

  /**
   * Join a private session directly using join code
   */
  static async joinByCode(userId: string, joinCode: string) {
    if (!joinCode || !joinCode.trim()) {
      throw new BadRequestError('Join code is required');
    }

    const raw = joinCode.trim().toUpperCase();
    const cleanNum = raw.replace(/^CAMP-?/i, '');
    const codeCandidates = [raw, `CAMP-${cleanNum}`, cleanNum];

    const session = await prisma.session.findFirst({
      where: {
        join_code: { in: codeCandidates, mode: 'insensitive' },
        status: { in: [SessionStatus.scheduled, SessionStatus.in_progress] },
      },
    });

    if (!session) {
      throw new NotFoundError('No active scheduled session found with this code');
    }

    return await this.joinSession(userId, session.id, joinCode);
  }

  /**
   * Host Admin: Remove participant from session
   */
  static async removeParticipant(hostId: string, sessionId: string, participantUserId: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { participants: true },
    });

    if (!session) throw new NotFoundError('Session not found');
    if (session.host_id !== hostId) {
      throw new ForbiddenError('Only the host can remove participants from this session');
    }

    const participant = session.participants.find((p) => p.user_id === participantUserId);
    if (!participant) {
      throw new NotFoundError('Participant not found in this session');
    }

    await prisma.sessionParticipant.delete({
      where: { id: participant.id },
    });

    return { success: true, message: 'Participant removed successfully from session' };
  }

  /**
   * Host Admin: Cancel event (only if it hasn't started)
   */
  static async cancelSession(hostId: string, sessionId: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) throw new NotFoundError('Session not found');
    if (session.host_id !== hostId) {
      throw new ForbiddenError('Only the host can cancel this event');
    }

    if (Date.now() >= session.scheduled_at.getTime()) {
      throw new BadRequestError('Cannot cancel: event has already started or concluded');
    }

    if (session.status !== SessionStatus.scheduled) {
      throw new BadRequestError('Only scheduled sessions can be cancelled');
    }

    const cancelled = await prisma.session.update({
      where: { id: sessionId },
      data: { status: SessionStatus.cancelled },
    });

    return {
      success: true,
      session: cancelled,
      message: 'Session has been cancelled.',
    };
  }

  /**
   * Host Admin: Start session early (switches status to in_progress and updates scheduled_at to now)
   */
  static async startSessionEarly(hostId: string, sessionId: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        host: { select: { id: true, name: true, username: true } },
        participants: { select: { user_id: true } },
        mentors: { select: { mentor_id: true } },
      },
    });

    if (!session) throw new NotFoundError('Session not found');
    if (session.host_id !== hostId) {
      throw new ForbiddenError('Only the host can start this session early');
    }

    if (session.status !== SessionStatus.scheduled) {
      throw new BadRequestError(`Cannot start early: session status is already ${session.status}`);
    }

    const updated = await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.in_progress,
        scheduled_at: new Date(),
      },
    });

    // Notify registered participants and co-mentors
    const recipientIds = new Set<string>();
    session.participants.forEach((p) => {
      if (p.user_id !== hostId) recipientIds.add(p.user_id);
    });
    session.mentors.forEach((m) => {
      if (m.mentor_id !== hostId) recipientIds.add(m.mentor_id);
    });

    for (const rId of recipientIds) {
      await prisma.notification.create({
        data: {
          user_id: rId,
          type: NotificationType.session_milestone,
          reference_type: 'session_started_early',
          reference_id: session.id,
          title: 'Session Started Early! 🚀',
          body: `Host ${session.host?.name || 'Mentor'} has started "${session.title || 'your session'}" early. You can join now!`,
        },
      }).catch(() => {});
    }

    return {
      success: true,
      session: updated,
      message: 'Session has started early! Status changed to in-progress.',
    };
  }
  /**
   * Conclude session with explicit attendance review (Present vs Absent)
   * Deducts learner fee for present attendees, marks confirmed attendance,
   * skips absent learners without debit, and completes/settles payouts.
   */
  static async concludeSessionWithAttendance(
    hostId: string,
    sessionId: string,
    attendanceList?: { userId: string; attended: boolean }[]
  ) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        host: { select: { id: true, name: true, username: true } },
        participants: { include: { user: { select: { id: true, name: true, username: true } } } },
        mentors: { select: { mentor_id: true } },
      },
    });

    if (!session) throw new NotFoundError('Session not found');

    const isHost = session.host_id === hostId;
    const isCoMentor = session.mentors.some((m) => m.mentor_id === hostId);
    if (!isHost && !isCoMentor) {
      throw new ForbiddenError('Only the host or a mentor can conclude this session.');
    }

    if (session.status === SessionStatus.completed) {
      throw new BadRequestError('Session is already completed.');
    }
    if (session.status === SessionStatus.cancelled) {
      throw new BadRequestError('Session has already been cancelled.');
    }

    const learners = session.participants.filter((p) => p.role === ParticipantRole.learner);

    // Build attendance mapping
    const attendanceMap = new Map<string, boolean>();
    if (attendanceList && Array.isArray(attendanceList) && attendanceList.length > 0) {
      attendanceList.forEach((a) => attendanceMap.set(a.userId, Boolean(a.attended)));
    } else {
      // Default to their current attendance_confirmed, or true if not yet marked
      learners.forEach((p) => {
        attendanceMap.set(p.user_id, p.attendance_confirmed !== undefined ? p.attendance_confirmed : true);
      });
    }

    return await prisma.$transaction(async (tx) => {
      // Process each learner
      for (const learner of learners) {
        const isPresent = attendanceMap.get(learner.user_id) ?? false;

        if (isPresent) {
          if (!learner.attendance_confirmed) {
            // Apply attendance debit to learner (1 credit * duration_hours)
            const debitAmount = -(1.0 * session.duration_hours);
            await CreditsService.applyTransaction(tx, {
              userId: learner.user_id,
              amount: debitAmount,
              type: LedgerTransactionType.session_earning,
              referenceType: 'session_attendance',
              referenceId: sessionId,
            });

            await tx.sessionParticipant.update({
              where: { id: learner.id },
              data: { attendance_confirmed: true, confirmed_by: ConfirmedBy.host },
            });
          }
        } else {
          // Absent student: ensure not confirmed
          if (learner.attendance_confirmed) {
            // Refund previously charged attendance debit
            const refundAmount = 1.0 * session.duration_hours;
            await CreditsService.applyTransaction(tx, {
              userId: learner.user_id,
              amount: refundAmount,
              type: LedgerTransactionType.session_earning,
              referenceType: 'session_attendance_refund',
              referenceId: sessionId,
            });
          }
          await tx.sessionParticipant.update({
            where: { id: learner.id },
            data: { attendance_confirmed: false, confirmed_by: null },
          });
        }
      }

      // Count confirmed attendees
      const confirmedCount = Array.from(attendanceMap.values()).filter(Boolean).length;

      // 1. Group Session Payout
      if (session.session_type === SessionType.group) {
        if (confirmedCount < 2) {
          await tx.session.update({
            where: { id: sessionId },
            data: { status: SessionStatus.no_show },
          });

          return {
            status: SessionStatus.no_show,
            message: 'Session concluded as no-show: verified attendance fell below required minimum of 2.',
          };
        }

        const calc = CreditEngine.calculateGroupSessionEarnings(confirmedCount, session.duration_hours);
        if (session.host_id) {
          await CreditsService.applyTransaction(tx, {
            userId: session.host_id,
            amount: calc.hostEarning,
            type: LedgerTransactionType.session_earning,
            referenceType: 'session',
            referenceId: session.id,
          });

          await SessionsService.checkAndGrantMilestones(tx, session.host_id, session.duration_hours);
        }

        await tx.session.update({
          where: { id: sessionId },
          data: { status: SessionStatus.completed },
        });

        return {
          status: SessionStatus.completed,
          payout: calc.hostEarning,
          confirmedCount,
          message: `Session concluded! Host credited ${calc.hostEarning} credits for ${confirmedCount} attendee(s).`,
        };
      }

      // 2. Multi-Mentor Payout
      if (session.session_type === SessionType.multi_mentor) {
        const mentorsCount = session.mentors.length;
        if (confirmedCount < mentorsCount) {
          await tx.session.update({
            where: { id: sessionId },
            data: { status: SessionStatus.no_show },
          });

          return {
            status: SessionStatus.no_show,
            message: 'Multi-mentor session marked no-show: verified attendance fell below mentor count.',
          };
        }

        const calc = CreditEngine.calculateMultiMentorEarnings(confirmedCount, mentorsCount, session.duration_hours);
        for (const mentor of session.mentors) {
          await CreditsService.applyTransaction(tx, {
            userId: mentor.mentor_id,
            amount: calc.earningPerMentor,
            type: LedgerTransactionType.session_earning,
            referenceType: 'session',
            referenceId: session.id,
          });

          await tx.sessionMentor.update({
            where: {
              session_id_mentor_id: { session_id: sessionId, mentor_id: mentor.mentor_id },
            },
            data: { credit_earned: calc.earningPerMentor },
          });

          await SessionsService.checkAndGrantMilestones(tx, mentor.mentor_id, session.duration_hours);
        }

        await tx.session.update({
          where: { id: sessionId },
          data: { status: SessionStatus.completed },
        });

        return {
          status: SessionStatus.completed,
          totalPool: calc.totalPool,
          earningPerMentor: calc.earningPerMentor,
          confirmedCount,
          message: `Multi-mentor session concluded! Each mentor credited ${calc.earningPerMentor} credits.`,
        };
      }

      // 3. 1-on-1 Session Payout
      if (confirmedCount >= 1 && session.host_id) {
        const earning = 1.0 * session.duration_hours;
        await CreditsService.applyTransaction(tx, {
          userId: session.host_id,
          amount: earning,
          type: LedgerTransactionType.session_earning,
          referenceType: 'session',
          referenceId: session.id,
        });

        await SessionsService.checkAndGrantMilestones(tx, session.host_id, session.duration_hours);
      }

      await tx.session.update({
        where: { id: sessionId },
        data: { status: SessionStatus.completed },
      });

      // Send notifications to participants
      for (const learner of learners) {
        const isPresent = attendanceMap.get(learner.user_id) ?? false;
        await tx.notification.create({
          data: {
            user_id: learner.user_id,
            type: NotificationType.session_milestone,
            reference_type: isPresent ? 'session_concluded' : 'session_absent',
            reference_id: session.id,
            title: isPresent ? 'Session Concluded 🏁' : 'Session Concluded (Marked Absent)',
            body: isPresent
              ? `Mentor ${session.host?.name || 'Host'} concluded "${session.title || 'your session'}". Your attendance was confirmed!`
              : `You were marked absent for "${session.title || 'your session'}". No credits were deducted.`,
          },
        }).catch(() => {});
      }

      return {
        status: SessionStatus.completed,
        confirmedCount,
        payout: confirmedCount >= 1 ? 1.0 * session.duration_hours : 0,
        message: confirmedCount >= 1
          ? `1-on-1 session concluded and settled! Host credited ${1.0 * session.duration_hours} credits.`
          : '1-on-1 session concluded. Student was marked absent.',
      };
    });
  }

  /**
   * Host / Mentor: Stop session early
   * Ends an active or scheduled session early and triggers payout / settlement with attendance
   */
  static async stopSessionEarly(
    hostId: string,
    sessionId: string,
    attendanceList?: { userId: string; attended: boolean }[]
  ) {
    return await this.concludeSessionWithAttendance(hostId, sessionId, attendanceList);
  }

  /**
   * Co-Mentor invitation response & 1-on-1 Mentorship Request response (Accept / Decline)
   */
  static async respondToMentorRequest(userId: string, sessionId: string, accept: boolean) {
    // Check if it's a co-host request
    const mentorRecord = await prisma.sessionMentor.findUnique({
      where: {
        session_id_mentor_id: {
          session_id: sessionId,
          mentor_id: userId,
        },
      },
    });

    if (mentorRecord) {
      if (mentorRecord.status !== 'pending') {
        return {
          success: true,
          status: mentorRecord.status,
          message: `Request already ${mentorRecord.status}`,
        };
      }

      return await prisma.$transaction(async (tx) => {
        if (accept) {
          // Debit co-mentor 1.5 credits upfront upon accepting
          await CreditsService.applyTransaction(tx, {
            userId,
            amount: -ECONOMY_CONFIG.MULTI_MENTOR_HOST_COST_PER_MENTOR,
            type: LedgerTransactionType.mentor_host_cost,
            referenceType: 'session',
            referenceId: sessionId,
          });

          const updated = await tx.sessionMentor.update({
            where: {
              session_id_mentor_id: {
                session_id: sessionId,
                mentor_id: userId,
              },
            },
            data: { status: 'accepted' },
          });

          return { success: true, status: 'accepted', message: 'You accepted the co-host invitation!' };
        } else {
          const updated = await tx.sessionMentor.update({
            where: {
              session_id_mentor_id: {
                session_id: sessionId,
                mentor_id: userId,
              },
            },
            data: { status: 'declined' },
          });

          return { success: true, status: 'declined', message: 'You declined the co-host invitation.' };
        }
      });
    }

    // Check if it's a 1-on-1 mentorship request where current user is the invited participant/student
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { participants: true, host: { select: { id: true, name: true } } },
    });

    if (!session) {
      throw new NotFoundError('Session request not found');
    }

    const participant = session.participants.find((p) => p.user_id === userId);
    if (!participant && session.host_id !== userId) {
      throw new NotFoundError('You are not invited to this session request');
    }

    if (accept) {
      if (!participant) {
        throw new BadRequestError('Participant record not found for this session');
      }

      await prisma.$transaction(async (tx) => {
        // Mark participant accepted by recording confirmed_by: ConfirmedBy.self
        await tx.sessionParticipant.update({
          where: { id: participant.id },
          data: {
            confirmed_by: ConfirmedBy.self,
          },
        });

        // Notify host that student accepted
        if (session.host_id) {
          const student = await tx.user.findUnique({
            where: { id: userId },
            select: { name: true, username: true },
          });

          await tx.notification.create({
            data: {
              user_id: session.host_id,
              type: NotificationType.session_milestone,
              reference_type: 'one_to_one_accepted',
              reference_id: session.id,
              title: '1-on-1 Request Accepted! 🎉',
              body: `${student?.name || 'Your student'} (@${student?.username || 'learner'}) accepted your 1-on-1 mentorship session "${session.title || 'Mentorship'}"!`,
            },
          }).catch(() => {});
        }
      });

      return { success: true, status: 'accepted', message: '1-on-1 mentorship request accepted!' };
    } else {
      // If student rejects 1-on-1 request, remove participant and cancel the session
      await prisma.$transaction(async (tx) => {
        if (participant) {
          await tx.sessionParticipant.delete({ where: { id: participant.id } });
        }
        await tx.session.update({
          where: { id: sessionId },
          data: { status: SessionStatus.cancelled },
        });

        if (session.host_id) {
          await tx.notification.create({
            data: {
              user_id: session.host_id,
              type: NotificationType.session_milestone,
              reference_type: 'one_to_one_declined',
              reference_id: session.id,
              title: '1-on-1 Request Declined',
              body: `The requested student declined the 1-on-1 session "${session.title || 'Mentorship'}". The session was cancelled.`,
            },
          }).catch(() => {});
        }
      });

      return { success: true, status: 'declined', message: '1-on-1 session request declined and cancelled.' };
    }
  }

  /**
   * Query sessions formatted as SessionDto
   * scope 'discover': public sessions open for everyone
   * scope 'my': sessions where current user is host, mentor, or joined participant
   */
  static async listSessions(params: {
    userId?: string;
    scope?: 'discover' | 'my';
    search?: string;
  }) {
    const { userId, scope = 'discover', search } = params;

    const where: any = {};

    if (scope === 'my' && userId) {
      where.OR = [
        { host_id: userId },
        { mentors: { some: { mentor_id: userId } } },
        { participants: { some: { user_id: userId } } },
      ];
    } else {
      // Discover scope: public sessions open for everyone (excluding 1-on-1 private mentoring)
      where.is_private = false;
      where.session_type = { not: SessionType.one_to_one };
      where.status = { in: [SessionStatus.scheduled, SessionStatus.in_progress] };
    }

    if (search && search.trim()) {
      const q = search.trim();
      const cleanUserQuery = q.replace(/^@+/, '').trim();

      const searchConditions: any[] = [
        { skill: { display_name: { contains: q, mode: 'insensitive' } } },
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { host: { name: { contains: q, mode: 'insensitive' } } },
        { host: { username: { contains: q, mode: 'insensitive' } } },
        { skills_tags: { has: q } },
      ];

      if (cleanUserQuery && cleanUserQuery !== q) {
        searchConditions.push(
          { host: { name: { contains: cleanUserQuery, mode: 'insensitive' } } },
          { host: { username: { contains: cleanUserQuery, mode: 'insensitive' } } },
          { skill: { display_name: { contains: cleanUserQuery, mode: 'insensitive' } } },
          { title: { contains: cleanUserQuery, mode: 'insensitive' } },
          { skills_tags: { has: cleanUserQuery } },
        );
      }

      const targetUserQuery = cleanUserQuery || q;
      if (targetUserQuery) {
        // Co-mentors by name or username
        searchConditions.push({
          mentors: {
            some: {
              mentor: {
                OR: [
                  { name: { contains: targetUserQuery, mode: 'insensitive' } },
                  { username: { contains: targetUserQuery, mode: 'insensitive' } },
                ],
              },
            },
          },
        });

        // Participants by name or username
        searchConditions.push({
          participants: {
            some: {
              user: {
                OR: [
                  { name: { contains: targetUserQuery, mode: 'insensitive' } },
                  { username: { contains: targetUserQuery, mode: 'insensitive' } },
                ],
              },
            },
          },
        });

        // Target learner name
        searchConditions.push({
          target_learner_name: { contains: targetUserQuery, mode: 'insensitive' },
        });
      }

      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions },
        ];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const sessions = await prisma.session.findMany({
      where,
      orderBy: { scheduled_at: 'asc' },
      include: {
        host: {
          select: { id: true, name: true, username: true, profile: { select: { avatar_url: true } } },
        },
        skill: true,
        mentors: {
          include: {
            mentor: {
              select: { id: true, name: true, username: true, profile: { select: { avatar_url: true } } },
            },
          },
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, username: true, email: true, profile: { select: { avatar_url: true } } },
            },
          },
        },
      },
    });

    return sessions.map((s) => {
      const isHost = userId ? s.host_id === userId : false;
      const myParticipant = userId ? s.participants.find((p) => p.user_id === userId) : null;
      const hasJoined = Boolean(myParticipant);
      const myAttendanceConfirmed = Boolean(myParticipant?.attendance_confirmed);
      const hasRated = myParticipant?.rating !== null && myParticipant?.rating !== undefined;

      const myMentorRecord = userId ? s.mentors.find((m) => m.mentor_id === userId) : null;
      const isMentorInvited = myMentorRecord?.status === 'pending';
      const mentorInviteStatus = myMentorRecord?.status || null;

      const isOneToOne = s.session_type === SessionType.one_to_one;
      const oneToOneLearner = isOneToOne ? s.participants.find((p) => p.role === ParticipantRole.learner) : null;
      const isOneToOneStudent = isOneToOne && myParticipant && myParticipant.role === ParticipantRole.learner && !isHost;
      const studentAcceptedOneToOne = Boolean(
        oneToOneLearner && (oneToOneLearner.confirmed_by === ConfirmedBy.self || oneToOneLearner.attendance_confirmed)
      );

      const isOneToOnePending = Boolean(
        isOneToOneStudent && !studentAcceptedOneToOne && s.status === SessionStatus.scheduled
      );
      const learnerAccepted = isOneToOne ? studentAcceptedOneToOne : true;
      const confirmedAttendanceCount = s.participants.filter((p) => p.attendance_confirmed).length;

      return {
        id: s.id,
        hostId: s.host_id,
        hostName: s.host?.name || 'Campus Peer',
        hostUsername: s.host?.username || null,
        hostAvatar: s.host?.profile?.avatar_url || null,
        title: s.title || null,
        description: s.description || null,
        skillsTags: s.skills_tags || [s.skill.display_name],
        targetLearnerName: s.target_learner_name || null,
        sessionType: s.session_type,
        skillId: s.skill_id,
        skillName: s.skill.display_name,
        durationHours: s.duration_hours,
        status: s.status,
        scheduledAt: s.scheduled_at.toISOString(),
        locationMode: s.location_mode,
        meetingLink: s.meeting_link,
        locationAddress: s.location_address,
        minParticipants: s.min_participants,
        maxParticipants: s.max_participants || 15,
        isPrivate: s.is_private,
        joinCode: isHost || hasJoined ? s.join_code : null,
        announcedPublicly: s.announced_publicly,
        participantsCount: s.participants.length,
        confirmedAttendanceCount,
        mentors: s.mentors.map((m) => ({
          mentorId: m.mentor_id,
          name: m.mentor.name,
          username: m.mentor.username || null,
          avatarUrl: m.mentor.profile?.avatar_url || null,
          status: m.status,
        })),
        participants: s.participants.map((p) => ({
          id: p.id,
          userId: p.user_id,
          name: p.user.name,
          username: p.user.username || null,
          email: isHost ? p.user.email : undefined,
          avatarUrl: p.user.profile?.avatar_url || null,
          role: p.role,
          attendanceConfirmed: p.attendance_confirmed,
          confirmedBy: p.confirmed_by,
          rating: p.rating,
          feedbackText: p.feedback_text,
          isAnonymous: p.is_anonymous,
        })),
        isHost,
        hasJoined,
        myAttendanceConfirmed,
        hasRated,
        isMentorInvited,
        mentorInviteStatus,
        isOneToOnePending,
        learnerAccepted,
      };
    });
  }

  /**
   * Get single session detail with full participant roster
   */
  static async getSessionDetail(sessionId: string, userId?: string) {
    const s = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        host: {
          select: { id: true, name: true, username: true, profile: { select: { avatar_url: true } } },
        },
        skill: true,
        mentors: {
          include: {
            mentor: {
              select: { id: true, name: true, username: true, profile: { select: { avatar_url: true } } },
            },
          },
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, username: true, email: true, profile: { select: { avatar_url: true } } },
            },
          },
        },
      },
    });

    if (!s) throw new NotFoundError('Session not found');

    const isHost = userId ? s.host_id === userId : false;
    const myParticipant = userId ? s.participants.find((p) => p.user_id === userId) : null;
    const hasJoined = Boolean(myParticipant);
    const myAttendanceConfirmed = Boolean(myParticipant?.attendance_confirmed);
    const hasRated = myParticipant?.rating !== null && myParticipant?.rating !== undefined;
    const confirmedAttendanceCount = s.participants.filter((p) => p.attendance_confirmed).length;

    const myMentorRecord = userId ? s.mentors.find((m) => m.mentor_id === userId) : null;
    const isMentorInvited = myMentorRecord?.status === 'pending';
    const mentorInviteStatus = myMentorRecord?.status || null;

    const isOneToOne = s.session_type === SessionType.one_to_one;
    const oneToOneLearner = isOneToOne ? s.participants.find((p) => p.role === ParticipantRole.learner) : null;
    const isOneToOneStudent = isOneToOne && myParticipant && myParticipant.role === ParticipantRole.learner && !isHost;
    const studentAcceptedOneToOne = Boolean(
      oneToOneLearner && (oneToOneLearner.confirmed_by === ConfirmedBy.self || oneToOneLearner.attendance_confirmed)
    );

    const isOneToOnePending = Boolean(
      isOneToOneStudent && !studentAcceptedOneToOne && s.status === SessionStatus.scheduled
    );
    const learnerAccepted = isOneToOne ? studentAcceptedOneToOne : true;

    return {
      id: s.id,
      hostId: s.host_id,
      hostName: s.host?.name || 'Campus Peer',
      hostUsername: s.host?.username || null,
      hostAvatar: s.host?.profile?.avatar_url || null,
      title: s.title || null,
      description: s.description || null,
      skillsTags: s.skills_tags || [s.skill.display_name],
      targetLearnerName: s.target_learner_name || null,
      sessionType: s.session_type,
      skillId: s.skill_id,
      skillName: s.skill.display_name,
      durationHours: s.duration_hours,
      status: s.status,
      scheduledAt: s.scheduled_at.toISOString(),
      locationMode: s.location_mode,
      meetingLink: s.meeting_link,
      locationAddress: s.location_address,
      minParticipants: s.min_participants,
      maxParticipants: s.max_participants || 15,
      isPrivate: s.is_private,
      joinCode: isHost || hasJoined ? s.join_code : null,
      announcedPublicly: s.announced_publicly,
      participantsCount: s.participants.length,
      confirmedAttendanceCount,
      mentors: s.mentors.map((m) => ({
        mentorId: m.mentor_id,
        name: m.mentor.name,
        username: m.mentor.username || null,
        avatarUrl: m.mentor.profile?.avatar_url || null,
        status: m.status,
      })),
      participants: s.participants.map((p) => ({
        id: p.id,
        userId: p.user_id,
        name: p.user.name,
        username: p.user.username || null,
        email: isHost ? p.user.email : undefined,
        avatarUrl: p.user.profile?.avatar_url || null,
        role: p.role,
        attendanceConfirmed: p.attendance_confirmed,
        confirmedBy: p.confirmed_by,
        rating: p.rating,
        feedbackText: p.feedback_text,
        isAnonymous: p.is_anonymous,
      })),
      isHost,
      hasJoined,
      myAttendanceConfirmed,
      hasRated,
      isMentorInvited,
      mentorInviteStatus,
      isOneToOnePending,
      learnerAccepted,
    };
  }

  /**
   * Section 5.4: Public Announcement of a session
   */
  static async announceSession(userId: string, sessionId: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) throw new NotFoundError('Session not found');
    if (session.host_id !== userId) {
      throw new ForbiddenError('Only the host can announce this session publicly');
    }
    if (session.announced_publicly) {
      throw new BadRequestError('Session has already been announced publicly');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        free_announcements_used: true,
        free_announcement_window_start: true,
        credit_balance: true,
      },
    });

    if (!user) throw new NotFoundError('User not found');

    const eligibility = CreditEngine.evaluateAnnouncementEligibility(
      user.free_announcements_used,
      user.free_announcement_window_start
    );

    return await prisma.$transaction(async (tx) => {
      if (!eligibility.isFree) {
        // Paid announcement: 1 credit
        await CreditsService.applyTransaction(tx, {
          userId,
          amount: -ECONOMY_CONFIG.ANNOUNCEMENT_PAID_COST,
          type: LedgerTransactionType.announcement_cost,
          referenceType: 'session_announcement',
          referenceId: sessionId,
        });
      } else {
        // Free announcement used: increment used and update window start
        await tx.user.update({
          where: { id: userId },
          data: {
            free_announcements_used: user.free_announcements_used + 1,
            free_announcement_window_start: new Date(),
          },
        });
      }

      const updated = await tx.session.update({
        where: { id: sessionId },
        data: {
          announced_publicly: true,
          announcement_was_free: eligibility.isFree,
        },
      });

      return {
        session: updated,
        isFree: eligibility.isFree,
        cost: eligibility.chargeAmount,
        reason: eligibility.reason,
      };
    });
  }

  /**
   * Section 5.6: Confirm attendance
   * Two-sided: Attendees can confirm themselves, or host can confirm a student.
   * Can ONLY be confirmed once the session has ended!
   * Attendees are debited 1 * duration_hours upon confirmation.
   */
  static async confirmAttendance(
    userId: string,
    sessionId: string,
    targetUserId?: string,
    confirmedBy: ConfirmedBy = ConfirmedBy.self
  ) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        participants: true,
      },
    });

    if (!session) throw new NotFoundError('Session not found');

    // Rule: "when the event has ended only then allow the student to confirm their attendance"
    const sessionEndTime = new Date(session.scheduled_at.getTime() + session.duration_hours * 60 * 60 * 1000);
    if (Date.now() < sessionEndTime.getTime()) {
      throw new BadRequestError('Attendance confirmation is only open after the session has ended.');
    }

    // Determine which participant attendance is being confirmed
    let attendeeUserId = userId;
    let actualConfirmedBy: ConfirmedBy = ConfirmedBy.self;

    if (session.host_id === userId && targetUserId) {
      // Host confirming student attendance
      attendeeUserId = targetUserId;
      actualConfirmedBy = ConfirmedBy.host;
    } else {
      actualConfirmedBy = confirmedBy;
    }

    const participant = session.participants.find((p) => p.user_id === attendeeUserId);
    if (!participant) {
      throw new NotFoundError('Participant not found for this session');
    }

    if (participant.attendance_confirmed) {
      return { success: true, message: 'Attendance already confirmed' };
    }

    return await prisma.$transaction(async (tx) => {
      // Debit learner 1 * duration_hours upon confirmation (Section 5.3 & 5.6)
      const debitAmount = -(1.0 * session.duration_hours);

      await CreditsService.applyTransaction(tx, {
        userId: attendeeUserId,
        amount: debitAmount,
        type: LedgerTransactionType.session_earning, // mapped to session attendance debit
        referenceType: 'session_attendance',
        referenceId: sessionId,
      });

      await tx.sessionParticipant.update({
        where: { id: participant.id },
        data: {
          attendance_confirmed: true,
          confirmed_by: actualConfirmedBy,
        },
      });

      return {
        success: true,
        message: 'Attendance confirmed and session fee applied.',
      };
    });
  }

  /**
   * Section 5.3, 5.5, 5.6: Complete session & finalize credit payouts
   */
  static async completeSession(sessionId: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        participants: {
          where: { attendance_confirmed: true, role: ParticipantRole.learner },
        },
        mentors: true,
      },
    });

    if (!session) throw new NotFoundError('Session not found');
    if (session.status === SessionStatus.completed) {
      throw new BadRequestError('Session has already been completed');
    }

    const confirmedLearnersCount = session.participants.length;

    return await prisma.$transaction(async (tx) => {
      // 1. Group Session Payout (Section 5.3 & 5.6)
      if (session.session_type === SessionType.group) {
        if (confirmedLearnersCount < 2) {
          // Attendance fell below min -> mark no_show, host fee NOT refunded, NO earnings written
          await tx.session.update({
            where: { id: sessionId },
            data: { status: SessionStatus.no_show },
          });

          return {
            status: SessionStatus.no_show,
            message: 'Session marked no_show: confirmed attendance fell below required minimum of 2. Host fee non-refundable.',
          };
        }

        // Calculation with floor max(3, confirmed * duration)
        const calc = CreditEngine.calculateGroupSessionEarnings(
          confirmedLearnersCount,
          session.duration_hours
        );

        if (session.host_id) {
          await CreditsService.applyTransaction(tx, {
            userId: session.host_id,
            amount: calc.hostEarning,
            type: LedgerTransactionType.session_earning,
            referenceType: 'session',
            referenceId: session.id,
          });

          // Check teaching milestones
          await SessionsService.checkAndGrantMilestones(tx, session.host_id, session.duration_hours);
        }

        const completed = await tx.session.update({
          where: { id: sessionId },
          data: { status: SessionStatus.completed },
        });

        return {
          status: SessionStatus.completed,
          payout: calc.hostEarning,
          message: `Group session successfully completed! Host credited ${calc.hostEarning} credits.`,
        };
      }

      // 2. Multi-Mentor Payout (Section 5.5 & 5.6)
      if (session.session_type === SessionType.multi_mentor) {
        const mentorsCount = session.mentors.length;

        if (confirmedLearnersCount < mentorsCount) {
          // Attendance fell below mentors count -> mark no_show, no payout, mentor fees not refunded
          await tx.session.update({
            where: { id: sessionId },
            data: { status: SessionStatus.no_show },
          });

          return {
            status: SessionStatus.no_show,
            message: 'Multi-mentor session marked no_show: confirmed learners < mentors. Mentor fees non-refundable.',
          };
        }

        const calc = CreditEngine.calculateMultiMentorEarnings(
          confirmedLearnersCount,
          mentorsCount,
          session.duration_hours
        );

        for (const mentor of session.mentors) {
          await CreditsService.applyTransaction(tx, {
            userId: mentor.mentor_id,
            amount: calc.earningPerMentor,
            type: LedgerTransactionType.session_earning,
            referenceType: 'session',
            referenceId: session.id,
          });

          await tx.sessionMentor.update({
            where: {
              session_id_mentor_id: {
                session_id: sessionId,
                mentor_id: mentor.mentor_id,
              },
            },
            data: {
              credit_earned: calc.earningPerMentor,
            },
          });

          await SessionsService.checkAndGrantMilestones(tx, mentor.mentor_id, session.duration_hours);
        }

        await tx.session.update({
          where: { id: sessionId },
          data: { status: SessionStatus.completed },
        });

        return {
          status: SessionStatus.completed,
          totalPool: calc.totalPool,
          earningPerMentor: calc.earningPerMentor,
          message: `Multi-mentor session completed! Total pool: ${calc.totalPool} credits, ${calc.earningPerMentor} credits per mentor.`,
        };
      }

      // 3. 1:1 Session Payout
      if (confirmedLearnersCount >= 1 && session.host_id) {
        const earning = 1.0 * session.duration_hours;
        await CreditsService.applyTransaction(tx, {
          userId: session.host_id,
          amount: earning,
          type: LedgerTransactionType.session_earning,
          referenceType: 'session',
          referenceId: session.id,
        });

        await SessionsService.checkAndGrantMilestones(tx, session.host_id, session.duration_hours);
      }

      await tx.session.update({
        where: { id: sessionId },
        data: { status: SessionStatus.completed },
      });

      return {
        status: SessionStatus.completed,
        message: '1:1 session successfully completed and settled.',
      };
    });
  }

  /**
   * Rate session: allow only students who have attended and confirmed attendance
   * Includes option for anonymous feedback
   */
  static async rateSession(
    userId: string,
    sessionId: string,
    rating: number,
    feedback?: string,
    isAnonymous: boolean = true
  ) {
    if (rating < 1 || rating > 5) {
      throw new BadRequestError('Rating must be an integer between 1 and 5');
    }

    const participant = await prisma.sessionParticipant.findFirst({
      where: {
        session_id: sessionId,
        user_id: userId,
      },
    });

    if (!participant) {
      throw new NotFoundError('You are not registered as a participant in this session');
    }

    // Rule: "allow only students who have attended the session and confirmed for feedback"
    if (!participant.attendance_confirmed) {
      throw new BadRequestError('You must attend the session and confirm your attendance before leaving feedback.');
    }

    return await prisma.sessionParticipant.update({
      where: { id: participant.id },
      data: {
        rating,
        feedback_text: feedback?.trim() || null,
        is_anonymous: Boolean(isAnonymous),
      },
    });
  }

  /**
   * Internal helper to record session teaching milestones and trigger badge achievements
   */
  private static async checkAndGrantMilestones(tx: any, hostId: string, hours: number) {
    // Count total completed hosted sessions
    const completedHosted = await tx.session.count({
      where: {
        host_id: hostId,
        status: SessionStatus.completed,
      },
    });

    if (completedHosted === 1 || completedHosted === 3 || completedHosted === 5 || completedHosted === 10) {
      await tx.notification.create({
        data: {
          user_id: hostId,
          type: NotificationType.session_milestone,
          reference_type: 'session_count',
          title: 'Teaching Milestone!',
          body: `You have successfully taught ${completedHosted} session${completedHosted > 1 ? 's' : ''} on campus!`,
          seen: false,
        },
      });
    }
  }
}
