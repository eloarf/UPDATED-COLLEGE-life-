export interface ThemeDefinition {
  id: string;
  name: string;
  isDark: boolean;
  bgHex: string;
  surfaceHex: string;
  primaryHex: string;
  accentHex: string;
  description: string;
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'pink-lobby',
    name: 'Pink Lobby',
    isDark: false,
    bgHex: '#FBF1E4',
    surfaceHex: '#FFF8F0',
    primaryHex: '#7A2E4A',
    accentHex: '#F6A8BE',
    description: 'Storybook concierge palace with soft cashew cream and bubblegum blush.',
  },
  {
    id: 'matcha-cream',
    name: 'Matcha Cream',
    isDark: false,
    bgHex: '#F3F7E3',
    surfaceHex: '#FAFCEF',
    primaryHex: '#4F7A0A',
    accentHex: '#B6E63E',
    description: 'Refreshing botanical tea garden with lively lime notes and pistachios.',
  },
  {
    id: 'blush-cocoa',
    name: 'Blush & Cocoa',
    isDark: false,
    bgHex: '#FDEFF2',
    surfaceHex: '#FFF9FA',
    primaryHex: '#5A3426',
    accentHex: '#F08FA9',
    description: 'Patisserie sweets, decadent Swiss chocolate, and glazed strawberry pink.',
  },
  {
    id: 'chocolate-lime',
    name: 'Chocolate Lime',
    isDark: true,
    bgHex: '#2A1810',
    surfaceHex: '#3A241A',
    primaryHex: '#B6E63E',
    accentHex: '#F5B5C8',
    description: 'Deep espresso woodgrain illuminated by electric chartreuse highlights.',
  },
  {
    id: 'midnight-plum',
    name: 'Midnight Plum',
    isDark: true,
    bgHex: '#1E1020',
    surfaceHex: '#2B1A2E',
    primaryHex: '#F7A8C0',
    accentHex: '#B6E63E',
    description: 'Nocturnal velvet library steeped in deep royal amethyst and rose gold.',
  },
  {
    id: 'burgundy-velvet',
    name: 'Burgundy Velvet',
    isDark: true,
    bgHex: '#260B15',
    surfaceHex: '#36131F',
    primaryHex: '#C9F26B',
    accentHex: '#FFB3C7',
    description: 'Grand theatre draping in antique wine, cabernet, and lime champagne.',
  },
];

export function applyTheme(themeId: string) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', themeId);
  try {
    localStorage.setItem('college_os_theme', themeId);
    const theme = THEMES.find((t) => t.id === themeId);
    if (theme) {
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', theme.primaryHex);
    }
  } catch {
    // Ignore
  }
}

export interface CourseNeonColor {
  hex: string;
  name: string;
}

// Exactly 12 predefined bright vivid neon colors curated to complement
// the Grand Budapest Hotel palette (pink, cream, lime, muted reds, navy, dark charcoal)
export const PRESET_COURSE_NEON_COLORS: CourseNeonColor[] = [
  { hex: '#CCFF00', name: 'Electric Lime' },
  { hex: '#FF2D78', name: 'Neon Pink' },
  { hex: '#00F0FF', name: 'Electric Cyan' },
  { hex: '#FF7700', name: 'Neon Tangerine' },
  { hex: '#B026FF', name: 'Electric Violet' },
  { hex: '#00FFA3', name: 'Neon Mint' },
  { hex: '#FFEA00', name: 'Highlighter Yellow' },
  { hex: '#FF3355', name: 'Coral Flame' },
  { hex: '#2979FF', name: 'Electric Azure' },
  { hex: '#05FFE2', name: 'Ice Teal' },
  { hex: '#FF8A65', name: 'Neon Peach' },
  { hex: '#76FF03', name: 'Neon Chartreuse' },
];

export function getContrastTextColor(hex: string): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) || 0;
  const g = parseInt(c.substring(2, 4), 16) || 0;
  const b = parseInt(c.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? '#0e0d0c' : '#ffffff';
}
