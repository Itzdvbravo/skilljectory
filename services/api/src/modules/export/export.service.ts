import sharp from 'sharp';

// Sharp rasterizes SVGs on the API host, where platform UI fonts such as
// system-ui may not exist (unlike on the Expo device). Prefer the standard
// Arial/Helvetica aliases so SVG text resolves through the host's sans-serif
// font fallback consistently.
const EXPORT_FONT_FAMILY = 'Arial, Helvetica, sans-serif';

export interface BannerExportParams {
  title: string;
  skillName: string;
  sessionType: string;
  hostName: string;
  hostUsername?: string;
  scheduledAt: string | Date;
  durationHours: number;
  locationMode: string;
  meetingLink?: string;
  locationAddress?: string;
  skillsTags?: string[];
  participantsCount?: number;
  maxParticipants?: number;
  mentors?: Array<{
    name?: string;
    username?: string;
    status?: string;
    mentor?: { name?: string; username?: string };
  }>;
  showCredit?: boolean;
  showLocation?: boolean;
  showDateTime?: boolean;
  showHostTag?: boolean;
  showSkills?: boolean;
}

export interface ResumeExportParams {
  name: string;
  username: string;
  studentId?: string;
  bio?: string;
  hours: number;
  sessions: number;
  rating: number;
  credits: number;
  skills: string[];
  badges?: string[];
  theme?: string;
  showBio?: boolean;
  showStats?: boolean;
  showRating?: boolean;
  showSkills?: boolean;
  showBadges?: boolean;
}

const RESUME_PALETTES: Record<string, {
  primary: string;
  secondary: string;
  accent: string;
  cardBg: string;
  border: string;
}> = {
  emerald: {
    primary: '#0E6245',
    secondary: '#084832',
    accent: '#10B981',
    cardBg: '#EBF7F0',
    border: '#A7F3D0',
  },
  cyan: {
    primary: '#0284C7',
    secondary: '#0369A1',
    accent: '#38BDF8',
    cardBg: '#E0F2FE',
    border: '#BAE6FD',
  },
  gold: {
    primary: '#D97706',
    secondary: '#B45309',
    accent: '#F59E0B',
    cardBg: '#FEF3C7',
    border: '#FDE68A',
  },
  indigo: {
    primary: '#4F46E5',
    secondary: '#4338CA',
    accent: '#6366F1',
    cardBg: '#EEF2FF',
    border: '#C7D2FE',
  },
};

export class ExportService {
  /**
   * Escape XML/SVG special characters safely
   */
  private static escapeXml(unsafe: string): string {
    return (unsafe || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Generates a genuine high-resolution PNG for Session Event Banner (Artboard Page 19)
   */
  /**
   * Generates a genuine high-resolution PNG for Session Event Banner (Strava-Inspired Artboard)
   */
  static async generateBannerPng(params: BannerExportParams): Promise<{ buffer: Buffer; base64: string; fileName: string }> {
    const title = this.escapeXml(params.title || params.skillName || 'Campus Skill Exchange Session');
    const skillName = this.escapeXml(params.skillName || 'Skill');
    const hostName = this.escapeXml(params.hostName || 'Campus Host');
    const hostUsername = this.escapeXml(params.hostUsername || 'scholar');
    const locationMode = (params.locationMode || 'online').toUpperCase();
    const locationText = this.escapeXml(
      params.locationMode === 'online'
        ? (params.meetingLink ? `Online: ${params.meetingLink}` : 'Online: Video Meeting')
        : (params.locationAddress || 'Campus Hall / ADTU')
    );

    const dateObj = new Date(params.scheduledAt || Date.now());
    const dateStr = dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeStr = dateObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const isGroup = params.sessionType === 'group' || params.sessionType === 'GROUP';
    const isMultiMentor = params.sessionType === 'multi_mentor' || params.sessionType === 'MULTI_MENTOR';
    const isGroupOrMulti = isGroup || isMultiMentor;

    const formatLabel =
      params.sessionType === 'one_to_one' || params.sessionType === 'ONE_TO_ONE'
        ? '1-ON-1 MENTORSHIP'
        : isMultiMentor
        ? 'MULTI-HOST COLLABORATION'
        : 'GROUP WORKSHOP';

    const showCredit = params.showCredit !== false;
    const showLocation = params.showLocation !== false;
    const showDateTime = params.showDateTime !== false;
    const showHostTag = params.showHostTag !== false;
    const showSkills = params.showSkills !== false;

    const currentStudents = params.participantsCount ?? 0;
    const maxStudents = params.maxParticipants || 15;

    // Collect all unique mentors (Host + Co-Mentors)
    const mentorsList: Array<{ name: string; username: string; isHost: boolean; status?: string }> = [
      { name: hostName, username: hostUsername, isHost: true },
    ];

    if (Array.isArray(params.mentors)) {
      params.mentors.forEach((m: any) => {
        const mName = m.name || m.mentor?.name || m.username || m.mentor?.username;
        const mUser = m.username || m.mentor?.username || '';
        if (mName && mName.toLowerCase() !== hostName.toLowerCase()) {
          mentorsList.push({
            name: this.escapeXml(mName),
            username: this.escapeXml(mUser),
            isHost: false,
            status: m.status,
          });
        }
      });
    }

    const tags = (params.skillsTags || [skillName]).slice(0, 4);

    // Dynamic Strava-style Stat Grid
    // Column 1: Students count (or 1-on-1 format)
    // Column 2: Duration
    // Column 3: Credits/Value
    // Column 4: Elevation/Quality
    const stat1Value = isGroupOrMulti ? `${currentStudents}` : '1-ON-1';
    const stat1Sub = isGroupOrMulti ? `/${maxStudents} STUDENTS` : 'FORMAT';
    const stat1Label = isGroupOrMulti ? 'LEARNERS ATTENDED' : 'MENTORSHIP TYPE';

    const stat2Value = `${params.durationHours || 1}`;
    const stat2Sub = 'HRS';
    const stat2Label = 'SESSION DURATION';

    const stat3Value = `+${params.durationHours || 1}`;
    const stat3Sub = 'CR';
    const stat3Label = 'ACADEMIC TIME-CREDIT';

    // Mentors Cards SVG
    const mentorCardWidth = Math.min(320, Math.floor(1080 / Math.max(1, mentorsList.length)));
    const mentorsSvg = showHostTag
      ? `
      <g transform="translate(60, 400)">
        <text x="0" y="0" fill="#94A3B8" font-family="${EXPORT_FONT_FAMILY}" font-weight="800" font-size="12" letter-spacing="1.5">
          ${isGroupOrMulti ? `SESSION MENTORS (${mentorsList.length})` : 'HOST MENTOR'}
        </text>
        <g transform="translate(0, 15)">
          ${mentorsList
            .slice(0, 4)
            .map((mentor, i) => {
              const xPos = i * (mentorCardWidth + 16);
              const initials = mentor.name
                .split(' ')
                .map((w) => w[0])
                .join('')
                .substring(0, 2)
                .toUpperCase();
              const badgeFill = mentor.isHost ? '#FC5200' : '#0284C7';
              const badgeLabel = mentor.isHost ? 'Host' : 'Co-Mentor';

              return `
              <g transform="translate(${xPos}, 0)">
                <rect width="${mentorCardWidth}" height="68" rx="16" fill="#161B22" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>
                <circle cx="34" cy="34" r="20" fill="${badgeFill}"/>
                <text x="34" y="40" fill="#FFFFFF" font-family="${EXPORT_FONT_FAMILY}" font-weight="900" font-size="13" text-anchor="middle">${initials}</text>
                <text x="64" y="30" fill="#FFFFFF" font-family="${EXPORT_FONT_FAMILY}" font-weight="800" font-size="15">${mentor.name}</text>
                <text x="64" y="48" fill="#94A3B8" font-family="${EXPORT_FONT_FAMILY}" font-weight="600" font-size="12">@${mentor.username || 'mentor'}</text>
                <rect x="${mentorCardWidth - 85}" y="20" width="75" height="26" rx="13" fill="${badgeFill}20" stroke="${badgeFill}60" stroke-width="1"/>
                <text x="${mentorCardWidth - 47.5}" y="37" fill="${mentor.isHost ? '#FF7A00' : '#38BDF8'}" font-family="${EXPORT_FONT_FAMILY}" font-weight="800" font-size="11" text-anchor="middle">${badgeLabel}</text>
              </g>`;
            })
            .join('')}
        </g>
      </g>`
      : '';

    // Tags & Location Row (Y=525)
    const tagsRowSvg = showSkills
      ? tags
          .map(
            (tag, i) => `
        <g transform="translate(${i * 155}, 0)">
          <rect width="145" height="34" rx="17" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
          <text x="72.5" y="22" fill="#F8FAFC" font-family="${EXPORT_FONT_FAMILY}" font-weight="700" font-size="13" text-anchor="middle">#${this.escapeXml(tag)}</text>
        </g>`
          )
          .join('')
      : '';

    const svg = `
    <svg width="1200" height="750" viewBox="0 0 1200 750" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Strava Sunset Gradient -->
        <linearGradient id="stravaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#FC5200" />
          <stop offset="100%" stop-color="#FF7A00" />
        </linearGradient>

        <!-- Elevation Profile Gradient Area -->
        <linearGradient id="elevationAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#FC5200" stop-opacity="0.32"/>
          <stop offset="100%" stop-color="#FC5200" stop-opacity="0.0"/>
        </linearGradient>

        <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#161B22"/>
          <stop offset="100%" stop-color="#0E131A"/>
        </linearGradient>
      </defs>

      <!-- Deep Obsidian Athletic Background -->
      <rect width="1200" height="750" rx="36" fill="#0D1117"/>
      <rect x="20" y="20" width="1160" height="710" rx="30" fill="url(#cardGrad)" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>

      <!-- Strava Top Accent Bar -->
      <path d="M22 46C22 32.7452 32.7452 22 46 22H1154C1167.25 22 1178 32.7452 1178 46V54H22V46Z" fill="url(#stravaGrad)"/>

      <!-- Header Pills Row -->
      <g transform="translate(60, 75)">
        <!-- Activity Type Pill -->
        <rect width="180" height="34" rx="17" fill="#FC5200"/>
        <text x="90" y="22" fill="#FFFFFF" font-family="${EXPORT_FONT_FAMILY}" font-weight="900" font-size="12" text-anchor="middle" letter-spacing="0.8">⚡ ${formatLabel}</text>

        <!-- Campus Verified Pill with Pulsing Live Dot -->
        <rect x="195" y="0" width="205" height="34" rx="17" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
        <circle cx="215" cy="17" r="5" fill="#10B981"/>
        <text x="230" y="22" fill="#F8FAFC" font-family="${EXPORT_FONT_FAMILY}" font-weight="800" font-size="12" letter-spacing="0.5">ADTU VERIFIED EVENT</text>

        <!-- Date & Time Right Aligned -->
        <text x="1080" y="23" fill="#94A3B8" font-family="${EXPORT_FONT_FAMILY}" font-weight="700" font-size="14" text-anchor="end">${dateStr} • ${timeStr}</text>
      </g>

      <!-- Event Title -->
      <text x="60" y="160" fill="#FFFFFF" font-family="${EXPORT_FONT_FAMILY}" font-weight="900" font-size="38" letter-spacing="-0.8">${title}</text>
      <text x="60" y="194" fill="#94A3B8" font-family="${EXPORT_FONT_FAMILY}" font-weight="500" font-size="16">Assam Down Town University • Peer-to-Peer Academic Knowledge Network</text>

      <!-- Strava Dynamic Elevation / Trajectory Polyline -->
      <g transform="translate(60, 210)">
        <!-- Area fill under route -->
        <path d="M 0 45 Q 160 10, 320 35 T 600 15 T 860 38 L 1080 8 L 1080 65 L 0 65 Z" fill="url(#elevationAreaGrad)"/>
        <!-- Polyline curve -->
        <path d="M 0 45 Q 160 10, 320 35 T 600 15 T 860 38 L 1080 8" stroke="#FC5200" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <!-- Elevation waypoint nodes -->
        <circle cx="320" cy="35" r="4.5" fill="#FC5200"/>
        <circle cx="600" cy="15" r="4.5" fill="#FC5200"/>
        <circle cx="860" cy="38" r="4.5" fill="#FC5200"/>
        <circle cx="1080" cy="8" r="6" fill="#FFFFFF" stroke="#FC5200" stroke-width="3"/>
      </g>

      <!-- =========================================================================
           STRAVA BIG METRICS GRID (The Signature Feature)
      ========================================================================= -->
      <g transform="translate(60, 275)">
        <rect width="1080" height="100" rx="18" fill="#161B22" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>

        <!-- Stat 1: Student Attendees / Format -->
        <g transform="translate(35, 20)">
          <text x="0" y="40" fill="#FFFFFF" font-family="${EXPORT_FONT_FAMILY}" font-weight="900" font-size="${isGroupOrMulti ? '42' : '30'}">${stat1Value}</text>
          <text x="${isGroupOrMulti ? '65' : '150'}" y="38" fill="#FC5200" font-family="${EXPORT_FONT_FAMILY}" font-weight="800" font-size="18">${stat1Sub}</text>
          <text x="0" y="66" fill="#94A3B8" font-family="${EXPORT_FONT_FAMILY}" font-weight="800" font-size="11" letter-spacing="1.2">${stat1Label}</text>
        </g>

        <!-- Divider 1 -->
        <line x1="300" y1="20" x2="300" y2="80" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>

        <!-- Stat 2: Duration Hours -->
        <g transform="translate(335, 20)">
          <text x="0" y="40" fill="#FFFFFF" font-family="${EXPORT_FONT_FAMILY}" font-weight="900" font-size="42">${stat2Value}</text>
          <text x="50" y="38" fill="#94A3B8" font-family="${EXPORT_FONT_FAMILY}" font-weight="800" font-size="18">${stat2Sub}</text>
          <text x="0" y="66" fill="#94A3B8" font-family="${EXPORT_FONT_FAMILY}" font-weight="800" font-size="11" letter-spacing="1.2">${stat2Label}</text>
        </g>

        <!-- Divider 2 -->
        <line x1="570" y1="20" x2="570" y2="80" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>

        <!-- Stat 3: Credits Generated -->
        <g transform="translate(605, 20)">
          <text x="0" y="40" fill="#FFFFFF" font-family="${EXPORT_FONT_FAMILY}" font-weight="900" font-size="42">${stat3Value}</text>
          <text x="65" y="38" fill="#94A3B8" font-family="${EXPORT_FONT_FAMILY}" font-weight="800" font-size="18">${stat3Sub}</text>
          <text x="0" y="66" fill="#94A3B8" font-family="${EXPORT_FONT_FAMILY}" font-weight="800" font-size="11" letter-spacing="1.2">${stat3Label}</text>
        </g>

        <!-- Divider 3 -->
        <line x1="840" y1="20" x2="840" y2="80" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>

        <!-- Stat 4: Rating / Quality Level -->
        <g transform="translate(875, 20)">
          <text x="0" y="40" fill="#10B981" font-family="${EXPORT_FONT_FAMILY}" font-weight="900" font-size="34">VERIFIED</text>
          <text x="0" y="66" fill="#94A3B8" font-family="${EXPORT_FONT_FAMILY}" font-weight="800" font-size="11" letter-spacing="1.2">CAMPUS PEER NETWORK</text>
        </g>
      </g>

      <!-- =========================================================================
           MENTORS SECTION (Shows ALL Mentors)
      ========================================================================= -->
      ${mentorsSvg}

      <!-- Topic Skills & Location Bar (Y=520) -->
      <g transform="translate(60, 520)">
        <!-- Skill tags -->
        <g transform="translate(0, 0)">
          ${tagsRowSvg}
        </g>

        <!-- Location Badge -->
        ${
          showLocation
            ? `
        <g transform="translate(640, 0)">
          <rect width="440" height="34" rx="17" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
          <text x="20" y="22" fill="#FC5200" font-family="${EXPORT_FONT_FAMILY}" font-size="14">📍</text>
          <text x="44" y="22" fill="#E2E8F0" font-family="${EXPORT_FONT_FAMILY}" font-weight="700" font-size="13">${locationText}</text>
        </g>`
            : ''
        }
      </g>

      <!-- Strava-style Divider Line -->
      <line x1="60" y1="655" x2="1140" y2="655" stroke="rgba(255,255,255,0.1)" stroke-width="1.5"/>

      <!-- Footer Brand Watermark -->
      <g transform="translate(60, 680)">
        <rect width="18" height="18" rx="4" fill="#FC5200"/>
        <text x="9" y="14" fill="#FFFFFF" font-family="${EXPORT_FONT_FAMILY}" font-weight="900" font-size="11" text-anchor="middle">S</text>
        <text x="28" y="15" fill="#FFFFFF" font-family="${EXPORT_FONT_FAMILY}" font-weight="900" font-size="15" letter-spacing="1.5">SKILLJECTORY</text>
        <text x="165" y="15" fill="#64748B" font-family="${EXPORT_FONT_FAMILY}" font-weight="700" font-size="12">• CAMPUS ATHLETICS OF THE MIND</text>
      </g>

      <!-- Right Footer Verification Seal -->
      <g transform="translate(1140, 680)">
        <text x="0" y="15" fill="#10B981" font-family="${EXPORT_FONT_FAMILY}" font-weight="800" font-size="13" text-anchor="end">ADTU DIGITAL CERTIFIED PASS ✓</text>
      </g>
    </svg>`.trim();

    const buffer = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
    const cleanSlug = (params.title || params.skillName || 'event')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .substring(0, 30);
    const fileName = `SkillJectory_StravaPass_${cleanSlug}.png`;

    return {
      buffer,
      base64: `data:image/png;base64,${buffer.toString('base64')}`,
      fileName,
    };
  }

  /**
   * Generates a genuine high-resolution PNG for Verified Academic Resume (Artboard Page 15)
   */
  static async generateResumePng(params: ResumeExportParams): Promise<{ buffer: Buffer; base64: string; fileName: string }> {
    const palette = RESUME_PALETTES[params.theme || 'emerald'] || RESUME_PALETTES.emerald;

    const name = this.escapeXml(params.name || 'Campus Scholar');
    const username = this.escapeXml(params.username || 'student');
    const studentId = this.escapeXml(params.studentId || 'ADTU-STU-VERIFIED');
    const bio = this.escapeXml(params.bio || 'Active peer mentor helping fellow students master technical skills.');

    const hours = Number(params.hours || 0).toFixed(1);
    const sessions = Number(params.sessions || 0);
    const rating = Number(params.rating || 5.0).toFixed(1);
    const credits = Number(params.credits || 0).toFixed(1);

    const showBio = params.showBio !== false;
    const showStats = params.showStats !== false;
    const showRating = params.showRating !== false;
    const showSkills = params.showSkills !== false;
    const showBadges = params.showBadges !== false;

    const skills = (params.skills?.length ? params.skills : ['Software Engineering', 'TypeScript', 'Data Structures', 'UI/UX Design']).slice(0, 8);
    const badges = (params.badges?.length ? params.badges : ['Verified Host', 'Peer Mentor', 'Excellence In Teaching', 'Campus Top Contributor']).slice(0, 4);

    let currentY = 240;

    // Scholar Identity Block
    const scholarBlock = `
      <g transform="translate(60, ${currentY})">
        <rect width="1080" height="110" rx="20" fill="${palette.cardBg}" stroke="${palette.border}" stroke-width="1.5"/>
        <circle cx="65" cy="55" r="34" fill="${palette.primary}"/>
        <text x="65" y="66" fill="#FFFFFF" font-family="${EXPORT_FONT_FAMILY}" font-weight="900" font-size="24" text-anchor="middle">${name.substring(0, 2).toUpperCase()}</text>
        
        <text x="120" y="48" fill="#111827" font-family="${EXPORT_FONT_FAMILY}" font-weight="800" font-size="26">${name}</text>
        <text x="120" y="76" fill="${palette.primary}" font-family="${EXPORT_FONT_FAMILY}" font-weight="700" font-size="16">@${username} • Student ID: ${studentId}</text>

        <rect x="910" y="38" width="140" height="34" rx="17" fill="${palette.primary}"/>
        <text x="980" y="60" fill="#FFFFFF" font-family="${EXPORT_FONT_FAMILY}" font-weight="800" font-size="12" text-anchor="middle">VERIFIED SCHOLAR ✓</text>
      </g>`;
    currentY += 135;

    // Bio block
    let bioBlock = '';
    if (showBio) {
      bioBlock = `
        <g transform="translate(60, ${currentY})">
          <rect width="1080" height="85" rx="16" fill="#F8FAF9" stroke="#E2E8E5" stroke-width="1.5"/>
          <text x="30" y="32" fill="#5A6561" font-family="${EXPORT_FONT_FAMILY}" font-weight="800" font-size="12" letter-spacing="1">ACADEMIC STATEMENT &amp; TEACHING PHILOSOPHY</text>
          <text x="30" y="62" fill="#111827" font-family="${EXPORT_FONT_FAMILY}" font-weight="500" font-size="16">"${bio}"</text>
        </g>`;
      currentY += 110;
    }

    // Key Stats Grid
    let statsBlock = '';
    if (showStats) {
      statsBlock = `
        <g transform="translate(60, ${currentY})">
          <text x="0" y="0" fill="#5A6561" font-family="${EXPORT_FONT_FAMILY}" font-weight="800" font-size="13" letter-spacing="1">OFFICIAL VERIFIED TEACHING &amp; PARTICIPATION METRICS</text>
          
          <!-- Tile 1 -->
          <g transform="translate(0, 15)">
            <rect width="250" height="110" rx="16" fill="#FFFFFF" stroke="${palette.primary}" stroke-width="2"/>
            <text x="24" y="42" fill="#5A6561" font-family="${EXPORT_FONT_FAMILY}" font-weight="700" font-size="13">TEACHING HOURS</text>
            <text x="24" y="86" fill="${palette.primary}" font-family="${EXPORT_FONT_FAMILY}" font-weight="900" font-size="36">${hours}<tspan font-size="18" font-weight="700"> hrs</tspan></text>
          </g>

          <!-- Tile 2 -->
          <g transform="translate(275, 15)">
            <rect width="250" height="110" rx="16" fill="#FFFFFF" stroke="${palette.primary}" stroke-width="2"/>
            <text x="24" y="42" fill="#5A6561" font-family="${EXPORT_FONT_FAMILY}" font-weight="700" font-size="13">SESSIONS HELD</text>
            <text x="24" y="86" fill="#111827" font-family="${EXPORT_FONT_FAMILY}" font-weight="900" font-size="36">${sessions}</text>
          </g>

          <!-- Tile 3 -->
          <g transform="translate(550, 15)">
            <rect width="250" height="110" rx="16" fill="#FFFFFF" stroke="${palette.primary}" stroke-width="2"/>
            <text x="24" y="42" fill="#5A6561" font-family="${EXPORT_FONT_FAMILY}" font-weight="700" font-size="13">STUDENT RATING</text>
            <text x="24" y="86" fill="#D97706" font-family="${EXPORT_FONT_FAMILY}" font-weight="900" font-size="36">${showRating ? `${rating} ★` : 'Verified'}</text>
          </g>

          <!-- Tile 4 -->
          <g transform="translate(825, 15)">
            <rect width="255" height="110" rx="16" fill="#FFFFFF" stroke="${palette.primary}" stroke-width="2"/>
            <text x="24" y="42" fill="#5A6561" font-family="${EXPORT_FONT_FAMILY}" font-weight="700" font-size="13">CREDITS EARNED</text>
            <text x="24" y="86" fill="${palette.primary}" font-family="${EXPORT_FONT_FAMILY}" font-weight="900" font-size="36">${credits}<tspan font-size="18" font-weight="700"> cr</tspan></text>
          </g>
        </g>`;
      currentY += 165;
    }

    // Skills Block
    let skillsBlock = '';
    if (showSkills) {
      const skillPills = skills
        .map((s, idx) => {
          const col = idx % 3;
          const row = Math.floor(idx / 3);
          return `
            <g transform="translate(${col * 365}, ${row * 50 + 20})">
              <rect width="345" height="40" rx="20" fill="${palette.cardBg}" stroke="${palette.border}" stroke-width="1.5"/>
              <text x="20" y="25" fill="${palette.primary}" font-family="${EXPORT_FONT_FAMILY}" font-weight="800" font-size="14">✓  ${this.escapeXml(s)}</text>
            </g>`;
        })
        .join('');

      skillsBlock = `
        <g transform="translate(60, ${currentY})">
          <text x="0" y="0" fill="#5A6561" font-family="${EXPORT_FONT_FAMILY}" font-weight="800" font-size="13" letter-spacing="1">VERIFIED SUBJECT COMPETENCIES &amp; SKILLS</text>
          ${skillPills}
        </g>`;
      currentY += Math.ceil(skills.length / 3) * 55 + 30;
    }

    // Badges Block
    let badgesBlock = '';
    if (showBadges) {
      const badgePills = badges
        .map((b, idx) => {
          return `
            <g transform="translate(${idx * 275}, 20)">
              <rect width="260" height="54" rx="14" fill="#FFFFFF" stroke="#E2E8E5" stroke-width="1.5"/>
              <circle cx="28" cy="27" r="14" fill="${palette.primary}"/>
              <text x="28" y="32" fill="#FFFFFF" font-family="${EXPORT_FONT_FAMILY}" font-size="13" text-anchor="middle">★</text>
              <text x="50" y="32" fill="#111827" font-family="${EXPORT_FONT_FAMILY}" font-weight="700" font-size="13">${this.escapeXml(b)}</text>
            </g>`;
        })
        .join('');

      badgesBlock = `
        <g transform="translate(60, ${currentY})">
          <text x="0" y="0" fill="#5A6561" font-family="${EXPORT_FONT_FAMILY}" font-weight="800" font-size="13" letter-spacing="1">CAMPUS HONORS &amp; RECOGNITION</text>
          ${badgePills}
        </g>`;
      currentY += 105;
    }

    const svg = `
    <svg width="1200" height="1350" viewBox="0 0 1200 1350" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Background & Outer Border -->
      <rect width="1200" height="1350" fill="#F8FAF9"/>
      <rect x="24" y="24" width="1152" height="1302" rx="28" fill="#FFFFFF" stroke="${palette.primary}" stroke-width="4"/>
      
      <!-- Top Primary Accent Bar -->
      <path d="M26 50C26 36.7452 36.7452 26 50 26H1150C1163.25 26 1174 36.7452 1174 50V68H26V50Z" fill="${palette.primary}"/>

      <!-- Header Typography -->
      <text x="60" y="112" fill="${palette.primary}" font-family="${EXPORT_FONT_FAMILY}" font-weight="800" font-size="13" letter-spacing="1.5">ASSAM DOWN TOWN UNIVERSITY • CAMPUS PEER MENTORSHIP EXCHANGE</text>
      <text x="60" y="152" fill="#111827" font-family="${EXPORT_FONT_FAMILY}" font-weight="900" font-size="34" letter-spacing="-0.5">VERIFIED ACADEMIC &amp; MENTOR RESUME</text>
      <text x="60" y="180" fill="#5A6561" font-family="${EXPORT_FONT_FAMILY}" font-weight="500" font-size="16">Official SkillJectory Peer-to-Peer Teaching Credential &amp; Portfolio</text>

      <line x1="60" y1="205" x2="1140" y2="205" stroke="${palette.border}" stroke-width="2"/>

      <!-- Scholar Info -->
      ${scholarBlock}

      <!-- Bio -->
      ${bioBlock}

      <!-- Stats -->
      ${statsBlock}

      <!-- Skills -->
      ${skillsBlock}

      <!-- Badges -->
      ${badgesBlock}

      <!-- Official Academic Seal & Footer -->
      <line x1="60" y1="1240" x2="1140" y2="1240" stroke="#E2E8E5" stroke-width="1.5"/>
      <text x="60" y="1275" fill="#9CA3AF" font-family="${EXPORT_FONT_FAMILY}" font-weight="700" font-size="13">ACADEMIC VERIFICATION SEAL: ADTU-REG-VERIFIED-PASSED</text>
      <text x="60" y="1296" fill="#9CA3AF" font-family="${EXPORT_FONT_FAMILY}" font-weight="500" font-size="12">Immutable record generated via SkillJectory Time-Credit Peer Exchange • ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</text>

      <rect x="940" y="1255" width="200" height="42" rx="21" fill="${palette.primary}"/>
      <text x="1040" y="1282" fill="#FFFFFF" font-family="${EXPORT_FONT_FAMILY}" font-weight="800" font-size="13" text-anchor="middle">OFFICIAL CREDENTIAL ✓</text>
    </svg>`.trim();

    const buffer = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
    const cleanUsername = (params.username || 'scholar').replace(/[^a-z0-9]/gi, '_');
    const fileName = `SkillJectory_Resume_${cleanUsername}.png`;

    return {
      buffer,
      base64: `data:image/png;base64,${buffer.toString('base64')}`,
      fileName,
    };
  }
}
