export const theme = {
  colors: {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgTertiary: '#1a1a25',
    textPrimary: '#e8e6e3',
    textSecondary: '#9d9d9d',
    textMuted: '#5a5a6e',
    accentCyan: '#00d9ff',
    accentMagenta: '#ff006e',
    accentYellow: '#ffd60a',
    accentGreen: '#39ff14',
    accentRed: '#ff6b6b',
    borderColor: '#2a2a3a',
    codeBg: '#0d0d14',
  },
  fonts: {
    mono: "'JetBrains Mono', monospace",
    heading: "'Space Grotesk', sans-serif",
    body: "'Crimson Pro', Georgia, serif",
  },
  fontSizes: {
    xs: '10px',
    sm: '12px',
    md: '14px',
    base: '18px',
    lg: '22px',
    xl: '28px',
    '2xl': '48px',
    '3xl': '72px',
  },
  spacing: {
    xs: '6px',
    sm: '12px',
    md: '20px',
    lg: '30px',
    xl: '60px',
    '2xl': '80px',
  },
  borderRadius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
  },
} as const

export type Theme = typeof theme
