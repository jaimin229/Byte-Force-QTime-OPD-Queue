import {StyleSheet} from 'react-native';

export const THEME = {
  colors: {
    // Brand & Identity (Clinical Teal & Navy)
    primary: '#0F172A',       // Slate 900
    primaryLight: '#1E293B',  // Slate 800
    teal: '#0D9488',          // Medical Teal 600
    tealLight: '#14B8A6',     // Teal 500
    tealBg: '#F0FDFA',        // Teal 50

    // Priority & Urgent (High contrast)
    urgent: '#DC2626',        // Red 600
    urgentBg: '#FEF2F2',      // Red 50
    urgentBorder: '#FCA5A5',  // Red 300

    // Alerts & Paused State
    warning: '#D97706',       // Amber 600
    warningBg: '#FFFBEB',     // Amber 50
    warningBorder: '#FCD34D', // Amber 300

    // Success & Active Consultation
    success: '#16A34A',       // Green 600
    successBg: '#F0FDF4',     // Green 50
    successBorder: '#86EFAC', // Green 300

    // Neutrals & Surfaces
    background: '#F8FAFC',    // Slate 50
    surface: '#FFFFFF',       // Pure white card
    surfaceSecondary: '#F1F5F9', // Slate 100
    border: '#E2E8F0',        // Slate 200
    borderStrong: '#CBD5E1',  // Slate 300

    // Text (WCAG 2.2 AA compliant contrast)
    textPrimary: '#0F172A',   // 13.5:1 on white
    textSecondary: '#475569', // 5.8:1 on white
    textMuted: '#64748B',     // 4.6:1 on white
    textInverse: '#FFFFFF',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    hero: 32,
  },

  radii: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
    full: 9999,
  },

  typography: {
    tokenHero: {
      fontSize: 54,
      fontWeight: '800' as const,
      letterSpacing: -1,
      lineHeight: 60,
    },
    h1: {
      fontSize: 24,
      fontWeight: '700' as const,
      lineHeight: 30,
    },
    h2: {
      fontSize: 20,
      fontWeight: '700' as const,
      lineHeight: 26,
    },
    h3: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 22,
    },
    body: {
      fontSize: 15,
      fontWeight: '400' as const,
      lineHeight: 22,
    },
    bodyBold: {
      fontSize: 15,
      fontWeight: '600' as const,
      lineHeight: 22,
    },
    caption: {
      fontSize: 13,
      fontWeight: '500' as const,
      lineHeight: 18,
    },
    badge: {
      fontSize: 12,
      fontWeight: '700' as const,
      letterSpacing: 0.5,
    },
  },

  touchTarget: {
    minHeight: 48,
    minWidth: 48,
  },
};

export const commonStyles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radii.lg,
    padding: THEME.spacing.lg,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  primaryButton: {
    backgroundColor: THEME.colors.teal,
    minHeight: 48,
    borderRadius: THEME.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: THEME.spacing.xl,
  },
  primaryButtonText: {
    color: THEME.colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: THEME.colors.surfaceSecondary,
    minHeight: 48,
    borderRadius: THEME.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.borderStrong,
  },
  secondaryButtonText: {
    color: THEME.colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radii.full,
    alignSelf: 'flex-start',
  },
});
