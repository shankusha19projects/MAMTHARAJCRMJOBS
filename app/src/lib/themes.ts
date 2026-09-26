// Themes: the JobPilot default (from the skill spec) plus the 10 theme-factory palettes.
export interface Theme {
  id: string; name: string; dark?: boolean; head: string; body: string;
  sidebar: string; sidebar2: string; bg: string; surface: string; surface2: string;
  text: string; muted: string; border: string; accent: string; accent2: string; onAccent: string;
  swatch: string[];
}

const SANS = "'IBM Plex Sans', system-ui, sans-serif";
const SORA = "'Sora', 'IBM Plex Sans', sans-serif";
const SERIF = "'Fraunces', Georgia, serif";
const GROTESK = "'Space Grotesk', 'IBM Plex Sans', sans-serif";

export const THEMES: Theme[] = [
  { id: 'jobpilot', name: 'JobPilot Navy', head: SORA, body: SANS, sidebar: '#0b1830', sidebar2: '#12233f', bg: '#f0f4f8', surface: '#ffffff', surface2: '#f6f8fb', text: '#0f1b2d', muted: '#5b6b82', border: '#e2e8f0', accent: '#2b6cf6', accent2: '#06b6d4', onAccent: '#fff', swatch: ['#0b1830', '#2b6cf6', '#06b6d4', '#f0f4f8'] },
  { id: 'ocean', name: 'Ocean Depths', head: SORA, body: SANS, sidebar: '#1a2332', sidebar2: '#22324a', bg: '#eef5f3', surface: '#ffffff', surface2: '#f4faf8', text: '#152029', muted: '#557078', border: '#d6e6e3', accent: '#2d8b8b', accent2: '#a8dadc', onAccent: '#fff', swatch: ['#1a2332', '#2d8b8b', '#a8dadc', '#f1faee'] },
  { id: 'sunset', name: 'Sunset Boulevard', head: SERIF, body: SANS, sidebar: '#264653', sidebar2: '#2f5866', bg: '#fbf3ea', surface: '#fffdf9', surface2: '#fcf6ef', text: '#1f2d33', muted: '#6b6b63', border: '#efdfcc', accent: '#e76f51', accent2: '#f4a261', onAccent: '#fff', swatch: ['#264653', '#e76f51', '#f4a261', '#e9c46a'] },
  { id: 'forest', name: 'Forest Canopy', head: SERIF, body: SANS, sidebar: '#1f331e', sidebar2: '#2d4a2b', bg: '#f4f3ee', surface: '#faf9f6', surface2: '#f1f0e9', text: '#1f2a1e', muted: '#6a7160', border: '#dfe0d3', accent: '#4f7a3a', accent2: '#a4ac86', onAccent: '#fff', swatch: ['#2d4a2b', '#7d8471', '#a4ac86', '#faf9f6'] },
  { id: 'minimal', name: 'Modern Minimalist', head: SORA, body: SANS, sidebar: '#36454f', sidebar2: '#43535e', bg: '#f3f4f5', surface: '#ffffff', surface2: '#f7f8f9', text: '#1f2a30', muted: '#708090', border: '#dcdfe2', accent: '#36454f', accent2: '#708090', onAccent: '#fff', swatch: ['#36454f', '#708090', '#d3d3d3', '#ffffff'] },
  { id: 'golden', name: 'Golden Hour', head: SORA, body: SANS, sidebar: '#4a403a', sidebar2: '#5a4e46', bg: '#f8f2e9', surface: '#fffcf7', surface2: '#fbf5ec', text: '#2e2723', muted: '#7a6c60', border: '#eadcc8', accent: '#c98b00', accent2: '#c1666b', onAccent: '#fff', swatch: ['#4a403a', '#f4a900', '#c1666b', '#d4b896'] },
  { id: 'arctic', name: 'Arctic Frost', head: SORA, body: SANS, sidebar: '#24364f', sidebar2: '#2e4463', bg: '#eef3f9', surface: '#fafafa', surface2: '#f2f6fb', text: '#18253a', muted: '#5f708a', border: '#d4e0ee', accent: '#4a6fa5', accent2: '#8fb3e0', onAccent: '#fff', swatch: ['#4a6fa5', '#d4e4f7', '#c0c0c0', '#fafafa'] },
  { id: 'desert', name: 'Desert Rose', head: SORA, body: SANS, sidebar: '#5d2e46', sidebar2: '#6d3a54', bg: '#f7efe9', surface: '#fffaf6', surface2: '#faf2ec', text: '#34202a', muted: '#86666f', border: '#ead8cc', accent: '#b0665a', accent2: '#d4a5a5', onAccent: '#fff', swatch: ['#5d2e46', '#b87d6d', '#d4a5a5', '#e8d5c4'] },
  { id: 'tech', name: 'Tech Innovation', dark: true, head: GROTESK, body: SANS, sidebar: '#0d0d0f', sidebar2: '#141418', bg: '#16161a', surface: '#1e1e22', surface2: '#25252b', text: '#f2f5f9', muted: '#9aa3b2', border: '#2e2f36', accent: '#1f6fff', accent2: '#00e5ff', onAccent: '#fff', swatch: ['#1e1e1e', '#0066ff', '#00ffff', '#ffffff'] },
  { id: 'botanical', name: 'Botanical Garden', head: SERIF, body: SANS, sidebar: '#2b4633', sidebar2: '#355640', bg: '#f5f3ed', surface: '#fffdf8', surface2: '#f8f5ee', text: '#1f2b22', muted: '#6c7465', border: '#e3dfd2', accent: '#4a7c59', accent2: '#f9a620', onAccent: '#fff', swatch: ['#4a7c59', '#f9a620', '#b7472a', '#f5f3ed'] },
  { id: 'galaxy', name: 'Midnight Galaxy', dark: true, head: GROTESK, body: SANS, sidebar: '#150e22', sidebar2: '#1f1533', bg: '#1d1530', surface: '#271d3d', surface2: '#2f2449', text: '#ecebfa', muted: '#a79fc4', border: '#3a2f55', accent: '#8f7ae0', accent2: '#e6a8ff', onAccent: '#fff', swatch: ['#2b1e3e', '#4a4e8f', '#a490c2', '#e6e6fa'] },
];

export function applyTheme(t: Theme) {
  const r = document.documentElement.style;
  const set = (k: string, v: string) => r.setProperty(k, v);
  set('--font-head', t.head); set('--font-body', t.body);
  set('--sidebar', t.sidebar); set('--sidebar-2', t.sidebar2); set('--bg', t.bg); set('--surface', t.surface); set('--surface-2', t.surface2);
  set('--text', t.text); set('--muted', t.muted); set('--border', t.border); set('--accent', t.accent); set('--accent-2', t.accent2); set('--on-accent', t.onAccent);
  document.documentElement.dataset.dark = t.dark ? '1' : '0';
}
