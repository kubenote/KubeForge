/**
 * Generate friendly two-word slugs for version names
 * Examples: "mighty-eagle", "clever-fox", "peaceful-river"
 */

const adjectives = [
  'mighty', 'clever', 'peaceful', 'swift', 'gentle', 'brave', 'wise', 'bright',
  'calm', 'fierce', 'noble', 'quiet', 'wild', 'free', 'strong', 'agile',
  'bold', 'keen', 'pure', 'proud', 'loyal', 'quick', 'sharp', 'smooth',
  'steady', 'warm', 'cool', 'fresh', 'vivid', 'clear', 'deep', 'light',
  'golden', 'silver', 'azure', 'crimson', 'emerald', 'violet', 'amber', 'coral'
];

const nouns = [
  'eagle', 'fox', 'wolf', 'bear', 'lion', 'tiger', 'hawk', 'owl',
  'deer', 'rabbit', 'whale', 'dolphin', 'shark', 'falcon', 'raven', 'swan',
  'mountain', 'river', 'ocean', 'forest', 'meadow', 'valley', 'hill', 'lake',
  'storm', 'thunder', 'lightning', 'wind', 'fire', 'ice', 'snow', 'rain',
  'star', 'moon', 'sun', 'comet', 'nebula', 'galaxy', 'cosmos', 'planet'
];

export function generateFriendlySlug(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective}-${noun}`;
}

export function isValidFriendlySlug(slug: string): boolean {
  return /^[a-z]+-[a-z]+$/.test(slug);
}