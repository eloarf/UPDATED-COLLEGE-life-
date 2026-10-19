export interface ThemeDefinition {
  id: string;
  name: string;
  category?: 'classic' | 'cyberpunk' | 'dark-wood' | 'daring-brights' | 'premier';
  isDark: boolean;
  bgHex: string;
  surfaceHex: string;
  primaryHex: string;
  accentHex: string;
  swatches: string[];
  description: string;
}

export const THEMES: ThemeDefinition[] = [
  // --- Original 6 Storybook Themes ---
  {
    id: 'pink-lobby',
    name: 'Pink Lobby',
    category: 'classic',
    isDark: false,
    bgHex: '#FBF1E4',
    surfaceHex: '#FFF8F0',
    primaryHex: '#7A2E4A',
    accentHex: '#F6A8BE',
    swatches: ['#FBF1E4', '#7A2E4A', '#F6A8BE', '#B6E63E'],
    description: 'Storybook concierge palace with soft cashew cream and bubblegum blush.',
  },
  {
    id: 'matcha-cream',
    name: 'Matcha Cream',
    category: 'classic',
    isDark: false,
    bgHex: '#F3F7E3',
    surfaceHex: '#FAFCEF',
    primaryHex: '#4F7A0A',
    accentHex: '#B6E63E',
    swatches: ['#F3F7E3', '#4F7A0A', '#B6E63E', '#F7C6D3'],
    description: 'Refreshing botanical tea garden with lively lime notes and pistachios.',
  },
  {
    id: 'blush-cocoa',
    name: 'Blush & Cocoa',
    category: 'classic',
    isDark: false,
    bgHex: '#FDEFF2',
    surfaceHex: '#FFF9FA',
    primaryHex: '#5A3426',
    accentHex: '#F08FA9',
    swatches: ['#FDEFF2', '#5A3426', '#F08FA9', '#C6EA6A'],
    description: 'Patisserie sweets, decadent Swiss chocolate, and glazed strawberry pink.',
  },
  {
    id: 'chocolate-lime',
    name: 'Chocolate Lime',
    category: 'classic',
    isDark: true,
    bgHex: '#2A1810',
    surfaceHex: '#3A241A',
    primaryHex: '#B6E63E',
    accentHex: '#F5B5C8',
    swatches: ['#2A1810', '#3A241A', '#B6E63E', '#F5B5C8'],
    description: 'Deep espresso woodgrain illuminated by electric chartreuse highlights.',
  },
  {
    id: 'midnight-plum',
    name: 'Midnight Plum',
    category: 'classic',
    isDark: true,
    bgHex: '#1E1020',
    surfaceHex: '#2B1A2E',
    primaryHex: '#F7A8C0',
    accentHex: '#B6E63E',
    swatches: ['#1E1020', '#2B1A2E', '#F7A8C0', '#B6E63E'],
    description: 'Nocturnal velvet library steeped in deep royal amethyst and rose gold.',
  },
  {
    id: 'burgundy-velvet',
    name: 'Burgundy Velvet',
    category: 'classic',
    isDark: true,
    bgHex: '#260B15',
    surfaceHex: '#36131F',
    primaryHex: '#C9F26B',
    accentHex: '#FFB3C7',
    swatches: ['#260B15', '#36131F', '#C9F26B', '#FFB3C7'],
    description: 'Grand theatre draping in antique wine, cabernet, and lime champagne.',
  },

  // --- 9 New Daring 3 & 4 Color Themes (Neon Blue Cyberpunk, Dark Wood, Daring Brights - Zero Purple) ---
  {
    id: 'cyber-neon-blue',
    name: 'Cyber Neon Blue',
    category: 'cyberpunk',
    isDark: true,
    bgHex: '#0A0F18',
    surfaceHex: '#121A27',
    primaryHex: '#00F0FF',
    accentHex: '#39FF14',
    swatches: ['#0A0F18', '#00F0FF', '#39FF14', '#FF4500'],
    description: 'Daring cyberpunk deck: pitch obsidian slate, electric neon cyan, radioactive lime, and laser blaze.',
  },
  {
    id: 'cyber-grid-amber',
    name: 'Cyber Grid & Amber',
    category: 'cyberpunk',
    isDark: true,
    bgHex: '#0B0F14',
    surfaceHex: '#141C24',
    primaryHex: '#FFB800',
    accentHex: '#05D9E8',
    swatches: ['#0B0F14', '#FFB800', '#05D9E8', '#FF2A6D'],
    description: 'Futuristic street racer with carbon graphite, safety neon amber, electric cyan, and shock coral.',
  },
  {
    id: 'cyber-azure-overdrive',
    name: 'Azure Overdrive',
    category: 'cyberpunk',
    isDark: true,
    bgHex: '#09111E',
    surfaceHex: '#111F35',
    primaryHex: '#00B4D8',
    accentHex: '#FFE600',
    swatches: ['#09111E', '#00B4D8', '#FFE600', '#00FF87'],
    description: 'Overclocked neon runner featuring laser azure glow, fluorescent solar yellow, and arctic mint.',
  },
  {
    id: 'dark-walnut-emerald',
    name: 'Walnut & Emerald',
    category: 'dark-wood',
    isDark: true,
    bgHex: '#1C120B',
    surfaceHex: '#2A1B10',
    primaryHex: '#10E775',
    accentHex: '#F5A623',
    swatches: ['#1C120B', '#3B281B', '#10E775', '#F5A623'],
    description: 'Aged charred walnut woodwork electrified by high-voltage neon emerald and warm honey gold.',
  },
  {
    id: 'teak-sunset-ember',
    name: 'Teakwood & Ember',
    category: 'dark-wood',
    isDark: true,
    bgHex: '#21130B',
    surfaceHex: '#301D12',
    primaryHex: '#FF6B00',
    accentHex: '#FFD13B',
    swatches: ['#21130B', '#452A1A', '#FF6B00', '#FFD13B'],
    description: 'Deep roasted teak cabin glowing with vivid neon sunset tangerine and bright buttercup amber.',
  },
  {
    id: 'ebony-neon-drift',
    name: 'Ebony & Neon Azure',
    category: 'dark-wood',
    isDark: true,
    bgHex: '#14100D',
    surfaceHex: '#211B16',
    primaryHex: '#00E5FF',
    accentHex: '#E5A93C',
    swatches: ['#14100D', '#332A23', '#00E5FF', '#E5A93C'],
    description: 'Blackened ebony timber and dark vintage oak sliced with brilliant neon electric azure and brass.',
  },
  {
    id: 'solar-coral-turquoise',
    name: 'Solar Coral & Cyan',
    category: 'daring-brights',
    isDark: false,
    bgHex: '#FFF8F2',
    surfaceHex: '#FFFFFF',
    primaryHex: '#FF3366',
    accentHex: '#00D2C4',
    swatches: ['#FFF8F2', '#FF3366', '#00D2C4', '#FFB800'],
    description: 'High-contrast daring daylight palette in warm cream, hot neon coral, electric turquoise, and sunburst gold.',
  },
  {
    id: 'atomic-cobalt-lime',
    name: 'Atomic Cobalt & Lime',
    category: 'daring-brights',
    isDark: true,
    bgHex: '#0A1324',
    surfaceHex: '#12203A',
    primaryHex: '#CCFF00',
    accentHex: '#38BDF8',
    swatches: ['#0A1324', '#CCFF00', '#38BDF8', '#FF6B00'],
    description: 'Bold 4-color racing aesthetic: deep atomic cobalt, charged acid lime, electric sky blue, and flame orange.',
  },
  {
    id: 'mahogany-mint-parlor',
    name: 'Mahogany & Mint',
    category: 'dark-wood',
    isDark: true,
    bgHex: '#24110A',
    surfaceHex: '#33190E',
    primaryHex: '#00F5A0',
    accentHex: '#FFA351',
    swatches: ['#24110A', '#472415', '#00F5A0', '#FFA351'],
    description: 'Grand parlor in dark vintage mahogany accented with vivid neon spearmint and glazed candied apricot.',
  },
  // --- 12 Distinct New Themes ---
  {
    id: 'gothic-romance',
    name: 'Gothic Romance',
    category: 'premier',
    isDark: true,
    bgHex: '#12070B',
    surfaceHex: '#220D16',
    primaryHex: '#E8A2B8',
    accentHex: '#C5CAD6',
    swatches: ['#12070B', '#220D16', '#E8A2B8', '#C5CAD6', '#591629'],
    description: 'Black cherry, ink black, dusty rose, antique silver, and deep burgundy with ornate gothic elegance.',
  },
  {
    id: 'pink-neon-dream',
    name: 'Pink Neon Dream',
    category: 'premier',
    isDark: true,
    bgHex: '#0B0410',
    surfaceHex: '#190924',
    primaryHex: '#FF1493',
    accentHex: '#8B00FF',
    swatches: ['#0B0410', '#FF1493', '#8B00FF', '#FF69B4', '#FFD1EA'],
    description: 'Electric pink, hot magenta, ultraviolet, and luminous blush with futuristic bloom edge lighting.',
  },
  {
    id: 'halloween-after-dark',
    name: 'Halloween After Dark',
    category: 'premier',
    isDark: true,
    bgHex: '#0B0B0F',
    surfaceHex: '#171520',
    primaryHex: '#FF5E00',
    accentHex: '#39FF14',
    swatches: ['#0B0B0F', '#FF5E00', '#9D00FF', '#39FF14', '#F4F0E8'],
    description: 'Midnight black, burnt orange, toxic purple, ghostly ivory, and eerie acid green haunted-library aesthetics.',
  },
  {
    id: 'cyberpunk-grid',
    name: 'Cyberpunk Grid',
    category: 'premier',
    isDark: true,
    bgHex: '#070C1A',
    surfaceHex: '#0E172E',
    primaryHex: '#00F0FF',
    accentHex: '#FFE600',
    swatches: ['#070C1A', '#00F0FF', '#FFE600', '#00FF66', '#FF007F'],
    description: 'Deep navy, electric cyan, acid yellow, laser green, and hot pink with geometric grid line accents.',
  },
  {
    id: 'emerald-arcana',
    name: 'Emerald Arcana',
    category: 'premier',
    isDark: true,
    bgHex: '#07120C',
    surfaceHex: '#0E2319',
    primaryHex: '#10B981',
    accentHex: '#D4AF37',
    swatches: ['#07120C', '#0E2319', '#10B981', '#D4AF37', '#F7F4EA'],
    description: 'Forest green, emerald, aged gold, occult obsidian, and warm ivory with mysterious scholarly elegance.',
  },
  {
    id: 'oceanic-abyss',
    name: 'Oceanic Abyss',
    category: 'premier',
    isDark: true,
    bgHex: '#050F1E',
    surfaceHex: '#0B1E38',
    primaryHex: '#00E5FF',
    accentHex: '#2DD4BF',
    swatches: ['#050F1E', '#0B1E38', '#00E5FF', '#2DD4BF', '#F0F9FF'],
    description: 'Midnight blue trench, deep teal, bioluminescent cyan, sea-glass green, and pearl white aquatic gradients.',
  },
  {
    id: 'solar-flare',
    name: 'Solar Flare',
    category: 'premier',
    isDark: true,
    bgHex: '#181412',
    surfaceHex: '#271C17',
    primaryHex: '#FFB800',
    accentHex: '#FF5722',
    swatches: ['#181412', '#FFB800', '#FF5722', '#DC2626', '#FFF8E7'],
    description: 'Vivid yellow, molten orange, crimson flare, warm cream, and volcanic charcoal with radiant sunburst energy.',
  },
  {
    id: 'celestial-starlight',
    name: 'Celestial Starlight',
    category: 'premier',
    isDark: true,
    bgHex: '#060A18',
    surfaceHex: '#0F1733',
    primaryHex: '#38BDF8',
    accentHex: '#FDE047',
    swatches: ['#060A18', '#0F1733', '#38BDF8', '#FDE047', '#CBD5E1'],
    description: 'Deep celestial navy, astral indigo, starlight silver, pale champagne, and astral cyan constellation elegance.',
  },
  {
    id: 'dark-academia',
    name: 'Dark Academia',
    category: 'premier',
    isDark: true,
    bgHex: '#16100B',
    surfaceHex: '#241810',
    primaryHex: '#D4A359',
    accentHex: '#8B263E',
    swatches: ['#16100B', '#241810', '#D4A359', '#8B263E', '#F5ECE1'],
    description: 'Antique ink noir, rich vintage mahogany, antique brass gold, oxblood, and aged parchment collegiate poise.',
  },
  {
    id: 'tokyo-vaporwave',
    name: 'Tokyo Sunset Vaporwave',
    category: 'premier',
    isDark: true,
    bgHex: '#150A24',
    surfaceHex: '#231238',
    primaryHex: '#FF2A85',
    accentHex: '#00FFF0',
    swatches: ['#150A24', '#FF2A85', '#00FFF0', '#FFAA00', '#C084FC'],
    description: 'Twilight dusk purple, sunset magenta, electric turquoise, sunset amber, and lavender haze nostalgic synthwave.',
  },
  {
    id: 'arctic-frost',
    name: 'Arctic Frost',
    category: 'premier',
    isDark: true,
    bgHex: '#08101C',
    surfaceHex: '#101F35',
    primaryHex: '#38BDF8',
    accentHex: '#2DD4BF',
    swatches: ['#08101C', '#101F35', '#38BDF8', '#2DD4BF', '#F0F9FF'],
    description: 'Deep fjord navy, glacial ice shelf, frosted titanium, crystalline cyan, and arctic white tranquility.',
  },
  {
    id: 'forest-moss',
    name: 'Forest Moss Sanctuary',
    category: 'premier',
    isDark: true,
    bgHex: '#09160E',
    surfaceHex: '#13261B',
    primaryHex: '#22C55E',
    accentHex: '#EAB308',
    swatches: ['#09160E', '#13261B', '#22C55E', '#EAB308', '#86EFAC'],
    description: 'Deep ancient pine, velvety moss green, eucalyptus sage, lichen gold, and warm birch timber calm.',
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
