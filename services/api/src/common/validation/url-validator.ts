import { SocialPlatform } from '@skill-exchange/shared-types';

export const PLATFORM_URL_PATTERNS: Record<SocialPlatform, RegExp> = {
  [SocialPlatform.INSTAGRAM]: /^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?$/,
  [SocialPlatform.X]: /^https?:\/\/(www\.)?(twitter|x)\.com\/[a-zA-Z0-9_]+\/?$/,
  [SocialPlatform.LINKEDIN]: /^https?:\/\/(www\.)?linkedin\.com\/(in|company)\/[a-zA-Z0-9_-]+\/?$/,
  [SocialPlatform.GITHUB]: /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_-]+\/?$/,
  [SocialPlatform.YOUTUBE]: /^https?:\/\/(www\.)?youtube\.com\/(@[a-zA-Z0-9_.-]+|channel\/[a-zA-Z0-9_-]+|c\/[a-zA-Z0-9_-]+)\/?$/,
  [SocialPlatform.PERSONAL_SITE]: /^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/,
  [SocialPlatform.OTHER]: /^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/,
};

export function validatePlatformUrl(platform: SocialPlatform, url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  const pattern = PLATFORM_URL_PATTERNS[platform];
  if (!pattern) return false;
  return pattern.test(trimmed);
}

export function validateMeetingUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
