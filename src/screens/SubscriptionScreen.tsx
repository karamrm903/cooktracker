import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { resolveLocalePricing, formatCurrency } from '../utils/locale';
import { useTheme } from '../context/ThemeContext';
import type { Colors } from '../context/ThemeContext';

type RootStackParamList = {
  Subscription: undefined;
  AccountCreation: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Subscription'>;
};

export default function SubscriptionScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [trialEnabled, setTrialEnabled] = useState(true);

  // ── Locale-aware pricing ────────────────────────────────────────────────
  const { pricing, locale, currency } = resolveLocalePricing();
  const fmtOriginal = formatCurrency(pricing.originalMonthlyDisplay, currency, locale);
  const fmtYearly   = formatCurrency(pricing.yearly, currency, locale);
  const fmtMonthly  = formatCurrency(pricing.monthlyEquivalent, currency, locale);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

      {/* Back */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>LIMITED OFFER</Text>
          <Text style={styles.title}>Your one-time{'\n'}launch offer</Text>
        </View>

        {/* Main offer card — always dark (cardInverted) for visual impact */}
        <View style={styles.offerCard}>
          {/* Discount badge */}
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>80% OFF</Text>
          </View>

          {/* Price */}
          <View style={styles.priceSection}>
            <Text style={styles.originalPrice}>{fmtOriginal} / month</Text>
            <View style={styles.newPriceRow}>
              <Text style={styles.newPrice}>{fmtMonthly}</Text>
              <Text style={styles.period}>/ month</Text>
            </View>
            <Text style={styles.billedAs}>Billed as {fmtYearly} / year</Text>
          </View>

          {/* Divider */}
          <View style={styles.cardDivider} />

          {/* Plan row */}
          <View style={styles.planRow}>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>Yearly Plan</Text>
              <Text style={styles.planSub}>{fmtYearly} yearly</Text>
            </View>
            <View style={styles.selectedDot} />
          </View>

          {/* Free trial toggle */}
          <TouchableOpacity
            style={styles.trialRow}
            onPress={() => setTrialEnabled(!trialEnabled)}
            activeOpacity={0.8}
          >
            <View style={styles.trialInfo}>
              <Text style={styles.trialLabel}>3-day free trial</Text>
              <Text style={styles.trialSub}>Cancel anytime before trial ends</Text>
            </View>
            <View style={[styles.toggle, trialEnabled && styles.toggleOn]}>
              <View style={[styles.toggleThumb, trialEnabled && styles.toggleThumbOn]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Features list */}
        <View style={styles.features}>
          {[
            ['🎬', 'Paste any cooking video link'],
            ['🤖', 'AI-powered recipe extraction'],
            ['📊', 'Instant nutrition breakdown'],
            ['⏱️', 'Guided cooking with timers'],
            ['📁', 'Unlimited saved recipes'],
          ].map(([emoji, text], i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureEmoji}>{emoji}</Text>
              <Text style={styles.featureText}>{text}</Text>
              <Text style={styles.featureCheck}>✓</Text>
            </View>
          ))}
        </View>

      </ScrollView>

      {/* CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => navigation.navigate('AccountCreation')}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaBtnText}>
            {trialEnabled ? 'Start Free Trial' : 'Get Started'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.footerText}>No commitment. Cancel anytime.</Text>
      </View>

    </SafeAreaView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },

    topBar: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 999,
      backgroundColor: colors.backBtnBg,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.07,
      shadowRadius: 4,
      elevation: 2,
    },
    backArrow: { fontSize: 17, color: colors.text, lineHeight: 21 },

    scroll: { paddingHorizontal: 24, paddingBottom: 16, gap: 20 },

    header: { paddingTop: 16, gap: 6 },
    eyebrow: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: 1.5,
    },
    title: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
      lineHeight: 40,
    },

    // Offer card stays dark in both modes for visual impact
    offerCard: {
      backgroundColor: colors.cardInverted,
      borderRadius: 24,
      padding: 24,
      gap: 20,
      borderWidth: 1,
      borderColor: colors.cardInvertedDivider,
    },
    discountBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 999,
    },
    discountText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    priceSection: { gap: 4 },
    originalPrice: {
      fontSize: 14,
      color: colors.cardInvertedSub,
      textDecorationLine: 'line-through',
      fontWeight: '500',
    },
    newPriceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    newPrice: {
      fontSize: 42,
      fontWeight: '800',
      color: colors.cardInvertedText,
      letterSpacing: -1,
      lineHeight: 50,
    },
    period: {
      fontSize: 14,
      color: colors.cardInvertedSub,
      fontWeight: '400',
    },
    billedAs: {
      fontSize: 13,
      color: colors.cardInvertedSub,
      fontWeight: '400',
    },
    cardDivider: { height: 1, backgroundColor: colors.cardInvertedDivider },
    planRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    planInfo: { gap: 2 },
    planName: { fontSize: 16, fontWeight: '700', color: colors.cardInvertedText },
    planSub: { fontSize: 13, color: colors.cardInvertedSub },
    selectedDot: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.primary,
      borderWidth: 3,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    trialRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderRadius: 14,
      padding: 14,
    },
    trialInfo: { gap: 2 },
    trialLabel: { fontSize: 15, fontWeight: '600', color: colors.cardInvertedText },
    trialSub: { fontSize: 12, color: colors.cardInvertedSub },
    toggle: {
      width: 46,
      height: 26,
      borderRadius: 13,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    toggleOn: { backgroundColor: colors.primary },
    toggleThumb: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.6)',
    },
    toggleThumbOn: { backgroundColor: '#FFFFFF', alignSelf: 'flex-end' },

    features: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      gap: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    featureEmoji: { fontSize: 20, width: 28 },
    featureText: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.text },
    featureCheck: { fontSize: 15, color: colors.secondary, fontWeight: '700' },

    bottomBar: {
      paddingHorizontal: 24,
      paddingBottom: 16,
      paddingTop: 8,
      gap: 10,
      alignItems: 'center',
    },
    ctaBtn: {
      width: '100%',
      backgroundColor: colors.btnPrimary,
      paddingVertical: 17,
      borderRadius: 999,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 6,
    },
    ctaBtnText: { fontSize: 17, fontWeight: '700', color: colors.btnPrimaryText, letterSpacing: 0.2 },
    footerText: { fontSize: 13, color: colors.textDisabled, fontWeight: '400' },
  });
}
