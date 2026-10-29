import sharp from 'sharp';

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

    const formatLabel =
      params.sessionType === 'one_to_one'
        ? '1-ON-1 MENTORSHIP'
        : params.sessionType === 'multi_mentor'
        ? 'MULTI-HOST COLLABORATIVE'
        : 'GROUP WORKSHOP';

    const showCredit = params.showCredit !== false;
    const showLocation = params.showLocation !== false;
    const showDateTime = params.showDateTime !== false;
    const showHostTag = params.showHostTag !== false;
    const showSkills = params.showSkills !== false;

    const tags = (params.skillsTags || [skillName]).slice(0, 4);

    const tagsSvg = showSkills
      ? tags
          .map(
            (tag, i) => `
        <g transform="translate(${60 + i * 180}, 385)">
          <rect width="165" height="36" rx="18" fill="#EBF7F0" stroke="#0E6245" stroke-width="1.5"/>
          <text x="82.5" y="23" fill="#0E6245" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14" text-anchor="middle">#${this.escapeXml(tag)}</text>
        </g>`
          )
          .join('')
      : '';

    const hostRowSvg = showHostTag
      ? `
      <g transform="translate(60, 290)">
        <rect width="700" height="70" rx="16" fill="#F8FAF9" stroke="#E2E8E5" stroke-width="1.5"/>
        <circle cx="45" cy="35" r="22" fill="#0E6245"/>
        <text x="45" y="42" fill="#FFFFFF" font-family="system-ui, sans-serif" font-weight="800" font-size="15" text-anchor="middle">CA</text>
        <text x="80" y="32" fill="#111827" font-family="system-ui, sans-serif" font-weight="800" font-size="17">${hostName}</text>
        <text x="80" y="52" fill="#0E6245" font-family="system-ui, sans-serif" font-weight="600" font-size="13">@${hostUsername}</text>
        <rect x="580" y="20" width="105" height="30" rx="15" fill="#EBF7F0"/>
        <text x="632" y="40" fill="#0E6245" font-family="system-ui, sans-serif" font-weight="700" font-size="12" text-anchor="middle">Primary Host</text>
      </g>`
      : '';

    let metaY = 450;
    const metaItems: string[] = [];

    if (showDateTime) {
      metaItems.push(`
        <g transform="translate(60, ${metaY})">
          <circle cx="16" cy="16" r="16" fill="#EBF7F0"/>
          <text x="16" y="22" fill="#0E6245" font-family="system-ui, sans-serif" font-size="16" text-anchor="middle">📅</text>
          <text x="44" y="22" fill="#111827" font-family="system-ui, sans-serif" font-weight="700" font-size="16">${dateStr} at ${timeStr} • ${params.durationHours} Hours</text>
        </g>`);
      metaY += 50;
    }

    if (showLocation) {
      metaItems.push(`
        <g transform="translate(60, ${metaY})">
          <circle cx="16" cy="16" r="16" fill="#FEF7DA"/>
          <text x="16" y="22" fill="#854D0E" font-family="system-ui, sans-serif" font-size="16" text-anchor="middle">📍</text>
          <text x="44" y="22" fill="#374151" font-family="system-ui, sans-serif" font-weight="600" font-size="15">${locationText}</text>
        </g>`);
      metaY += 50;
    }

    if (showCredit) {
      metaItems.push(`
        <g transform="translate(60, ${metaY})">
          <circle cx="16" cy="16" r="16" fill="#EBF7F0"/>
          <text x="16" y="22" fill="#0E6245" font-family="system-ui, sans-serif" font-size="16" text-anchor="middle">🪙</text>
          <text x="44" y="22" fill="#0E6245" font-family="system-ui, sans-serif" font-weight="800" font-size="16">Time-Credit Fee / Earn: ${params.durationHours} Credit(s)</text>
        </g>`);
      metaY += 50;
    }

    const svg = `
    <svg width="1200" height="750" viewBox="0 0 1200 750" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Background & Outer Border -->
      <rect width="1200" height="750" rx="32" fill="#F8FAF9"/>
      <rect x="24" y="24" width="1152" height="702" rx="26" fill="#FFFFFF" stroke="#0E6245" stroke-width="4"/>
      
      <!-- Top Campus Header Accent -->
      <path d="M26 48C26 35.8497 35.8497 26 48 26H1152C1164.15 26 1174 35.8497 1174 48V60H26V48Z" fill="#0E6245"/>
      <text x="60" y="48" fill="#FFFFFF" font-family="system-ui, sans-serif" font-weight="800" font-size="12" letter-spacing="1.5">ASSAM DOWN TOWN UNIVERSITY • CAMPUS SKILL EXCHANGE</text>

      <!-- Badge row -->
      <rect x="60" y="90" width="240" height="34" rx="17" fill="#0E6245"/>
      <text x="180" y="112" fill="#FFFFFF" font-family="system-ui, sans-serif" font-weight="800" font-size="12" text-anchor="middle" letter-spacing="0.8">CAMPUS SKILL EXCHANGE PASS</text>
      
      <rect x="315" y="90" width="180" height="34" rx="17" fill="#18201D"/>
      <text x="405" y="112" fill="#FFFFFF" font-family="system-ui, sans-serif" font-weight="800" font-size="12" text-anchor="middle">${formatLabel}</text>

      <!-- Event Title -->
      <text x="60" y="180" fill="#111827" font-family="system-ui, sans-serif" font-weight="900" font-size="36" letter-spacing="-0.5">${title}</text>
      <text x="60" y="220" fill="#5A6561" font-family="system-ui, sans-serif" font-weight="500" font-size="17">Peer-to-peer knowledge session conducted on campus time-credit network</text>

      <line x1="60" y1="250" x2="1140" y2="250" stroke="#E2E8E5" stroke-width="1.5"/>

      <!-- Host Row -->
      ${hostRowSvg}

      <!-- Skills Tags -->
      ${tagsSvg}

      <!-- Meta Info Rows -->
      ${metaItems.join('')}

      <!-- Watermark / Footer -->
      <line x1="60" y1="670" x2="1140" y2="670" stroke="#E2E8E5" stroke-width="1.5"/>
      <text x="60" y="698" fill="#9CA3AF" font-family="system-ui, sans-serif" font-weight="600" font-size="12">VERIFIED EVENT PASS • GENERATED VIA SKILLJECTORY PLATFORM</text>
      <text x="1140" y="698" fill="#0E6245" font-family="system-ui, sans-serif" font-weight="800" font-size="13" text-anchor="end">ADTU CAMPUS NETWORK ✓</text>
    </svg>`.trim();

    const buffer = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
    const cleanSlug = (params.title || params.skillName || 'event')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .substring(0, 30);
    const fileName = `SkillJectory_Pass_${cleanSlug}.png`;

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
        <text x="65" y="66" fill="#FFFFFF" font-family="system-ui, sans-serif" font-weight="900" font-size="24" text-anchor="middle">${name.substring(0, 2).toUpperCase()}</text>
        
        <text x="120" y="48" fill="#111827" font-family="system-ui, sans-serif" font-weight="800" font-size="26">${name}</text>
        <text x="120" y="76" fill="${palette.primary}" font-family="system-ui, sans-serif" font-weight="700" font-size="16">@${username} • Student ID: ${studentId}</text>

        <rect x="910" y="38" width="140" height="34" rx="17" fill="${palette.primary}"/>
        <text x="980" y="60" fill="#FFFFFF" font-family="system-ui, sans-serif" font-weight="800" font-size="12" text-anchor="middle">VERIFIED SCHOLAR ✓</text>
      </g>`;
    currentY += 135;

    // Bio block
    let bioBlock = '';
    if (showBio) {
      bioBlock = `
        <g transform="translate(60, ${currentY})">
          <rect width="1080" height="85" rx="16" fill="#F8FAF9" stroke="#E2E8E5" stroke-width="1.5"/>
          <text x="30" y="32" fill="#5A6561" font-family="system-ui, sans-serif" font-weight="800" font-size="12" letter-spacing="1">ACADEMIC STATEMENT &amp; TEACHING PHILOSOPHY</text>
          <text x="30" y="62" fill="#111827" font-family="system-ui, sans-serif" font-weight="500" font-size="16">"${bio}"</text>
        </g>`;
      currentY += 110;
    }

    // Key Stats Grid
    let statsBlock = '';
    if (showStats) {
      statsBlock = `
        <g transform="translate(60, ${currentY})">
          <text x="0" y="0" fill="#5A6561" font-family="system-ui, sans-serif" font-weight="800" font-size="13" letter-spacing="1">OFFICIAL VERIFIED TEACHING &amp; PARTICIPATION METRICS</text>
          
          <!-- Tile 1 -->
          <g transform="translate(0, 15)">
            <rect width="250" height="110" rx="16" fill="#FFFFFF" stroke="${palette.primary}" stroke-width="2"/>
            <text x="24" y="42" fill="#5A6561" font-family="system-ui, sans-serif" font-weight="700" font-size="13">TEACHING HOURS</text>
            <text x="24" y="86" fill="${palette.primary}" font-family="system-ui, sans-serif" font-weight="900" font-size="36">${hours}<tspan font-size="18" font-weight="700"> hrs</tspan></text>
          </g>

          <!-- Tile 2 -->
          <g transform="translate(275, 15)">
            <rect width="250" height="110" rx="16" fill="#FFFFFF" stroke="${palette.primary}" stroke-width="2"/>
            <text x="24" y="42" fill="#5A6561" font-family="system-ui, sans-serif" font-weight="700" font-size="13">SESSIONS HELD</text>
            <text x="24" y="86" fill="#111827" font-family="system-ui, sans-serif" font-weight="900" font-size="36">${sessions}</text>
          </g>

          <!-- Tile 3 -->
          <g transform="translate(550, 15)">
            <rect width="250" height="110" rx="16" fill="#FFFFFF" stroke="${palette.primary}" stroke-width="2"/>
            <text x="24" y="42" fill="#5A6561" font-family="system-ui, sans-serif" font-weight="700" font-size="13">STUDENT RATING</text>
            <text x="24" y="86" fill="#D97706" font-family="system-ui, sans-serif" font-weight="900" font-size="36">${showRating ? `${rating} ★` : 'Verified'}</text>
          </g>

          <!-- Tile 4 -->
          <g transform="translate(825, 15)">
            <rect width="255" height="110" rx="16" fill="#FFFFFF" stroke="${palette.primary}" stroke-width="2"/>
            <text x="24" y="42" fill="#5A6561" font-family="system-ui, sans-serif" font-weight="700" font-size="13">CREDITS EARNED</text>
            <text x="24" y="86" fill="${palette.primary}" font-family="system-ui, sans-serif" font-weight="900" font-size="36">${credits}<tspan font-size="18" font-weight="700"> cr</tspan></text>
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
              <text x="20" y="25" fill="${palette.primary}" font-family="system-ui, sans-serif" font-weight="800" font-size="14">✓  ${this.escapeXml(s)}</text>
            </g>`;
        })
        .join('');

      skillsBlock = `
        <g transform="translate(60, ${currentY})">
          <text x="0" y="0" fill="#5A6561" font-family="system-ui, sans-serif" font-weight="800" font-size="13" letter-spacing="1">VERIFIED SUBJECT COMPETENCIES &amp; SKILLS</text>
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
              <text x="28" y="32" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="13" text-anchor="middle">★</text>
              <text x="50" y="32" fill="#111827" font-family="system-ui, sans-serif" font-weight="700" font-size="13">${this.escapeXml(b)}</text>
            </g>`;
        })
        .join('');

      badgesBlock = `
        <g transform="translate(60, ${currentY})">
          <text x="0" y="0" fill="#5A6561" font-family="system-ui, sans-serif" font-weight="800" font-size="13" letter-spacing="1">CAMPUS HONORS &amp; RECOGNITION</text>
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
      <text x="60" y="112" fill="${palette.primary}" font-family="system-ui, sans-serif" font-weight="800" font-size="13" letter-spacing="1.5">ASSAM DOWN TOWN UNIVERSITY • CAMPUS PEER MENTORSHIP EXCHANGE</text>
      <text x="60" y="152" fill="#111827" font-family="system-ui, sans-serif" font-weight="900" font-size="34" letter-spacing="-0.5">VERIFIED ACADEMIC &amp; MENTOR RESUME</text>
      <text x="60" y="180" fill="#5A6561" font-family="system-ui, sans-serif" font-weight="500" font-size="16">Official SkillJectory Peer-to-Peer Teaching Credential &amp; Portfolio</text>

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
      <text x="60" y="1275" fill="#9CA3AF" font-family="system-ui, sans-serif" font-weight="700" font-size="13">ACADEMIC VERIFICATION SEAL: ADTU-REG-VERIFIED-PASSED</text>
      <text x="60" y="1296" fill="#9CA3AF" font-family="system-ui, sans-serif" font-weight="500" font-size="12">Immutable record generated via SkillJectory Time-Credit Peer Exchange • ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</text>

      <rect x="940" y="1255" width="200" height="42" rx="21" fill="${palette.primary}"/>
      <text x="1040" y="1282" fill="#FFFFFF" font-family="system-ui, sans-serif" font-weight="800" font-size="13" text-anchor="middle">OFFICIAL CREDENTIAL ✓</text>
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
