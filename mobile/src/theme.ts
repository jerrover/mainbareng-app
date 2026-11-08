export const THEME = {
  colors: {
    // Brand Core
    primary: '#D5FF40',             // Volt Neon (CTA, active)
    primaryLight: '#E4FF75',
    primaryMuted: 'rgba(213, 255, 64, 0.12)',

    // Secondary Neutral
    secondary: '#C0C2B8',           // Ash Sage (Text secondary, border)
    secondaryMuted: 'rgba(192, 194, 184, 0.15)',

    // Surfaces & Backgrounds
    background: '#0A0B0E',          // Deep Onyx (Canvas)
    card: '#12141A',                // Bento Surface
    cardElevated: '#1A1D24',        // Input, modal, sheet
    cardGlass: 'rgba(18, 20, 26, 0.85)',

    // Typography
    text: '#FFFFFF',
    textSecondary: '#C0C2B8',
    textMuted: '#6B7280',
    textOnPrimary: '#0A0B0E',       // Hitam pekat di atas #D5FF40

    // Borders
    cardBorder: 'rgba(192, 194, 184, 0.18)',
    border: 'rgba(255, 255, 255, 0.08)',
    borderGlass: 'rgba(192, 194, 184, 0.18)',
    borderActive: '#D5FF40',

    // Status Colors
    success: '#00F59B',             // Mint Emerald
    warning: '#FF9F0A',             // Amber
    danger: '#FF3B30',              // Crimson
    accent: '#5E5CE6'               // Electric Indigo
  },
  typography: {
    fontFamily: 'Sora-Regular',
    fonts: {
      regular: 'Sora-Regular',
      medium: 'Sora-Medium',
      semiBold: 'Sora-SemiBold',
      bold: 'Sora-Bold',
      extraBold: 'Sora-ExtraBold'
    },
    headerSize: 22,
    subHeaderSize: 16,
    bodySize: 14,
    captionSize: 12,
    weights: {
      regular: '400',
      medium: '500',
      semiBold: '600',
      bold: '700',
      extraBold: '800'
    },
    // Typography Scale (Font: Sora)
    h1: {
      fontFamily: 'Sora-ExtraBold',
      fontSize: 24,
      letterSpacing: -0.5,
      includeFontPadding: false
    },
    h2: {
      fontFamily: 'Sora-Bold',
      fontSize: 18,
      letterSpacing: -0.3,
      includeFontPadding: false
    },
    h3: {
      fontFamily: 'Sora-Bold',
      fontSize: 15,
      letterSpacing: 0,
      includeFontPadding: false
    },
    subtitle: {
      fontFamily: 'Sora-SemiBold',
      fontSize: 13,
      letterSpacing: 0.2,
      includeFontPadding: false
    },
    body: {
      fontFamily: 'Sora-Regular',
      fontSize: 13,
      letterSpacing: 0,
      includeFontPadding: false
    },
    button: {
      fontFamily: 'Sora-Bold',
      fontSize: 14,
      letterSpacing: 0.5,
      includeFontPadding: false
    },
    caption: {
      fontFamily: 'Sora-SemiBold',
      fontSize: 11,
      letterSpacing: 0.4,
      includeFontPadding: false
    },
    micro: {
      fontFamily: 'Sora-Bold',
      fontSize: 10,
      letterSpacing: 0.8,
      includeFontPadding: false
    }
  },
  radius: {
    sm: 8,                       // Badge, pips
    md: 12,                      // Chip, input, secondary button
    lg: 16,                      // Card bento, match pass
    xl: 24,                      // Bottom sheet
    full: 9999                   // FAB, pill, avatar
  },
  spatial: {
    statusBarHeight: 44,
    bottomDockHeight: 78,
    screenPaddingHorizontal: 16,
    gridUnit: 8                  // 4, 8, 12, 16, 24
  },
  components: {
    buttonPrimary: {
      height: 48,
      backgroundColor: '#D5FF40',
      textColor: '#0A0B0E',
      borderRadius: 12
    },
    fabButton: {
      width: 44,
      height: 44,
      backgroundColor: '#D5FF40',
      iconColor: '#0A0B0E',
      borderRadius: 9999
    },
    futsalPips: {
      count: 10,
      height: 5,
      gap: 4,
      borderRadius: 2.5,
      activeBg: '#D5FF40',
      emptyBg: 'rgba(255, 255, 255, 0.1)'
    },
    badmintonPips: {
      count: 4,
      height: 6,
      gap: 6,
      borderRadius: 3,
      activeBg: '#00F59B',
      emptyBg: 'rgba(255, 255, 255, 0.1)'
    }
  }
} as const;
