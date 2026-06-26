import { moderateScale } from '../utils/responsive';

export const COLORS = {
  primary: '#FF6B35',
  primaryLight: '#FF8C5A',
  primaryDark: '#E05520',
  secondary: '#4CAF50',
  secondaryLight: '#81C784',
  accent: '#FFB300',
  background: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F2F5',
  text: '#1A1F2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  carbs: '#F59E0B',
  protein: '#3B82F6',
  fat: '#EC4899',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const FONT_SIZES = {
  caption: moderateScale(11),
  small: moderateScale(13),
  label: moderateScale(14),
  body: moderateScale(15),
  button: moderateScale(17),
  h3: moderateScale(20),
  h2: moderateScale(28),
  h1: moderateScale(34),
  display: moderateScale(56),
} as const;

export const SPACING = {
  xs: moderateScale(4),
  sm: moderateScale(8),
  md: moderateScale(16),
  lg: moderateScale(24),
  xl: moderateScale(32),
  xxl: moderateScale(48),
} as const;

export const RADIUS = {
  sm: moderateScale(8),
  md: moderateScale(12),
  lg: moderateScale(16),
  xl: moderateScale(24),
  full: 9999, // pill — never scale
} as const;

export const FONTS = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const satisfies Record<string, import('react-native').TextStyle['fontWeight']>;

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;
