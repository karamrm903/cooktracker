import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, FONTS, FONT_SIZES, SPACING } from '../constants/theme';
import { moderateScale as ms } from '../utils/responsive';
import {
  BRAND_COLOR,
  DEFAULT_BG,
  TEXT_DARK,
  TEXT_MUTED,
  DIVIDER,
} from '../styles/colors';

export type PaywallFeature = 'recipe_import' | 'search' | 'cooking_mode' | 'saved_recipes';

interface PaywallModalProps {
  visible: boolean;
  feature: PaywallFeature;
  /** How many free uses remain (0 = limit reached) */
  used?: number;
  limit?: number;
  onClose: () => void;
  onUpgrade: () => void;
}

const FEATURE_META: Record<PaywallFeature, {
  emoji: string;
  title: string;
  description: string;
}> = {
  recipe_import: {
    emoji: '🎬',
    title: 'Monthly Import Limit Reached',
    description: "You've used all your free recipe imports for this month.",
  },
  search: {
    emoji: '🔍',
    title: "Daily Search Limit Reached",
    description: "You've used all your free searches for today.",
  },
  cooking_mode: {
    emoji: '👨‍🍳',
    title: 'Cooking Mode is Premium',
    description: 'Step-by-step guided cooking with built-in timers is a premium feature.',
  },
  saved_recipes: {
    emoji: '📁',
    title: 'Recipe Library is Full',
    description: "You've reached the free limit for saved recipes.",
  },
};

const BENEFITS = [
  { icon: 'infinite-outline', text: 'Unlimited recipe imports' },
  { icon: 'search-outline', text: 'Unlimited AI food search' },
  { icon: 'timer-outline', text: 'Guided cooking with timers' },
  { icon: 'bookmark-outline', text: 'Unlimited saved recipes' },
];

export default function PaywallModal({
  visible,
  feature,
  used,
  limit,
  onClose,
  onUpgrade,
}: PaywallModalProps) {
  const insets = useSafeAreaInsets();
  const meta = FEATURE_META[feature];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[s.sheet, { backgroundColor: DEFAULT_BG, paddingBottom: SPACING.md + insets.bottom }]}>
          {/* Handle */}
          <View style={[s.handle, { backgroundColor: DIVIDER }]} />

          {/* Close */}
          <TouchableOpacity style={s.closeBtn} onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={ms(20)} color={TEXT_MUTED} />
          </TouchableOpacity>

          {/* Feature header */}
          <Text style={s.emoji}>{meta.emoji}</Text>
          <Text style={[s.title, { color: TEXT_DARK }]}>{meta.title}</Text>
          <Text style={[s.description, { color: TEXT_MUTED }]}>
            {meta.description}
            {limit && used !== undefined && feature !== 'cooking_mode' && feature !== 'saved_recipes'
              ? ` (${used}/${limit} used)`
              : null}
          </Text>

          {/* Benefits */}
          <View style={s.benefitsCard}>
            <Text style={[s.benefitsLabel, { color: TEXT_MUTED }]}>PREMIUM INCLUDES</Text>
            {BENEFITS.map((b) => (
              <View key={b.icon} style={s.benefitRow}>
                <Ionicons name={b.icon as any} size={ms(18)} color={BRAND_COLOR} />
                <Text style={[s.benefitText, { color: TEXT_DARK }]}>{b.text}</Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={s.ctaBtn}
            onPress={onUpgrade}
            activeOpacity={0.85}
          >
            <Text style={s.ctaBtnText}>
              Get Premium
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Text style={[s.dismissText, { color: TEXT_MUTED }]}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: ms(28),
    borderTopRightRadius: ms(28),
    paddingHorizontal: SPACING.lg,
    paddingTop: ms(12),
    paddingBottom: SPACING.md,
    alignItems: 'center',
  },
  handle: {
    width: ms(40),
    height: ms(4),
    borderRadius: ms(2),
    marginBottom: ms(20),
  },
  closeBtn: {
    position: 'absolute',
    top: ms(20),
    right: ms(20),
  },

  emoji: { fontSize: ms(52), marginBottom: ms(14) },
  title: { fontSize: FONT_SIZES.h3, fontWeight: FONTS.bold, textAlign: 'center', marginBottom: SPACING.sm },
  description: {
    fontSize: FONT_SIZES.label,
    fontWeight: FONTS.regular,
    textAlign: 'center',
    lineHeight: ms(20),
    marginBottom: ms(24),
  },

  benefitsCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: ms(12),
    marginBottom: ms(24),
  },
  benefitsLabel: {
    fontSize: ms(10),
    fontWeight: FONTS.semibold,
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(12),
  },
  benefitText: {
    fontSize: FONT_SIZES.label,
    fontWeight: FONTS.medium,
  },

  ctaBtn: {
    width: '100%',
    backgroundColor: BRAND_COLOR,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    marginBottom: ms(12),
    shadowColor: BRAND_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  ctaBtnText: {
    fontSize: ms(16),
    fontWeight: FONTS.bold,
    letterSpacing: 0.2,
    color: '#FFFFFF',
  },
  dismissText: {
    fontSize: FONT_SIZES.label,
    fontWeight: FONTS.regular,
    paddingVertical: SPACING.sm,
  },
});
