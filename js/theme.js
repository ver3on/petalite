const PETAL_THEME = {
  bg: '#fdf8f5',
  accent: '#f4c0d1',
  accentText: '#993556',
  text: '#2d2d2d',
  textMuted: '#7a7a7a',
  border: '#f0d9e3',
  white: '#ffffff',
  shadow: '0 2px 12px rgba(153,53,86,0.07)',
  radius: '12px',
  radiusSm: '8px',
};

document.documentElement.style.setProperty('--bg', PETAL_THEME.bg);
document.documentElement.style.setProperty('--accent', PETAL_THEME.accent);
document.documentElement.style.setProperty('--accent-text', PETAL_THEME.accentText);
document.documentElement.style.setProperty('--text', PETAL_THEME.text);
document.documentElement.style.setProperty('--text-muted', PETAL_THEME.textMuted);
document.documentElement.style.setProperty('--border', PETAL_THEME.border);
document.documentElement.style.setProperty('--white', PETAL_THEME.white);
document.documentElement.style.setProperty('--shadow', PETAL_THEME.shadow);
document.documentElement.style.setProperty('--radius', PETAL_THEME.radius);
document.documentElement.style.setProperty('--radius-sm', PETAL_THEME.radiusSm);