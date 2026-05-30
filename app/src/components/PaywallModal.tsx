import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, FONTS } from '../constants/theme';

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
  const { colors } = useTheme();
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

        <View style={[s.sheet, { backgroundColor: colors.background }]}>
          {/* Handle */}
          <View style={[s.handle, { backgroundColor: colors.border }]} />

          {/* Close */}
          <TouchableOpacity style={s.closeBtn} onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Feature header */}
          <Text style={s.emoji}>{meta.emoji}</Text>
          <Text style={[s.title, { color: colors.text }]}>{meta.title}</Text>
          <Text style={[s.description, { color: colors.textSecondary }]}>
            {meta.description}
            {limit && used !== undefined && feature !== 'cooking_mode' && feature !== 'saved_recipes'
              ? ` (${used}/${limit} used)`
              : null}
          </Text>

          {/* Benefits */}
          <View style={[s.benefitsCard, { backgroundColor: colors.surface }]}>
            <Text style={[s.benefitsLabel, { color: colors.textMuted }]}>PREMIUM INCLUDES</Text>
            {BENEFITS.map((b) => (
              <View key={b.icon} style={s.benefitRow}>
                <Ionicons name={b.icon as any} size={18} color={colors.primary} />
                <Text style={[s.benefitText, { color: colors.text }]}>{b.text}</Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[s.ctaBtn, { backgroundColor: colors.btnPrimary }]}
            onPress={onUpgrade}
            activeOpacity={0.85}
          >
            <Text style={[s.ctaBtnText, { color: colors.btnPrimaryText }]}>
              Get Premium
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Text style={[s.dismissText, { color: colors.textMuted }]}>Maybe Later</Text>
          </TouchableOpacity>

          {/* iOS safe area padding */}
          {Platform.OS === 'ios' && <View style={{ height: 20 }} />}
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
  },
  closeBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
  },

  emoji: { fontSize: 52, marginBottom: 14 },
  title: { fontSize: 20, fontWeight: FONTS.bold, textAlign: 'center', marginBottom: 8 },
  description: {
    fontSize: 14,
    fontWeight: FONTS.regular,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },

  benefitsCard: {
    width: '100%',
    borderRadius: RADIUS.lg,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  benefitsLabel: {
    fontSize: 10,
    fontWeight: FONTS.semibold,
    letterSpacing: 1,
    marginBottom: 4,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    fontSize: 14,
    fontWeight: FONTS.medium,
  },

  ctaBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  ctaBtnText: {
    fontSize: 16,
    fontWeight: FONTS.bold,
    letterSpacing: 0.2,
  },
  dismissText: {
    fontSize: 14,
    fontWeight: FONTS.regular,
    paddingVertical: 8,
  },
});
