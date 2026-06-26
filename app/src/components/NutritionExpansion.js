/**
 * Shared accordion nutrition panel used by both DashboardScreen and ExploreScreen.
 * Exports: C_PROTEIN, C_CARBS, C_FAT, MacroBar, NutrientRow, ExpandedNutrition
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { RADIUS, FONTS, FONT_SIZES, SPACING } from '../constants/theme';
import { moderateScale as ms } from '../utils/responsive';

// ── Macro color palette ───────────────────────────────────────────────────────
export const C_PROTEIN = '#EF4444';
export const C_CARBS   = '#22C55E';
export const C_FAT     = '#F59E0B';

// ── Animated macro bar ────────────────────────────────────────────────────────
export function MacroBar({ protein, carbs, fat }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 520,
      delay: 60,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, []);

  const animatedWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={bar.track}>
      <Animated.View style={[bar.fill, { width: animatedWidth }]}>
        <View style={{ flex: protein, backgroundColor: C_PROTEIN }} />
        <View style={{ flex: carbs,   backgroundColor: C_CARBS   }} />
        <View style={{ flex: fat,     backgroundColor: C_FAT     }} />
      </Animated.View>
    </View>
  );
}

// ── Single nutrient row ───────────────────────────────────────────────────────
export function NutrientRow({ label, value, color, colors }) {
  return (
    <View style={exp.nutrientRow}>
      <View style={[exp.dot, { backgroundColor: color }]} />
      <Text style={[exp.nutrientLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[exp.nutrientValue, { color: colors.text }]}>{value}g</Text>
    </View>
  );
}

// ── Expanded nutrition panel ──────────────────────────────────────────────────
export function ExpandedNutrition({ item, colors, buttonLabel = 'Start Cooking', onPress }) {
  const { protein, carbs, fat } = item.macros;

  return (
    <View style={[exp.container, { borderTopColor: colors.border }]}>
      <Text style={[exp.calories, { color: colors.text }]}>
        {item.calories} kcal
      </Text>

      <MacroBar protein={protein} carbs={carbs} fat={fat} />

      <View style={exp.nutrientList}>
        <NutrientRow label="Protein" value={protein} color={C_PROTEIN} colors={colors} />
        <NutrientRow label="Carbs"   value={carbs}   color={C_CARBS}   colors={colors} />
        <NutrientRow label="Fat"     value={fat}     color={C_FAT}     colors={colors} />
      </View>

      {onPress && (
        <TouchableOpacity
          style={[exp.button, { backgroundColor: colors.btnPrimary }]}
          activeOpacity={0.85}
          onPress={onPress}
        >
          <Text style={[exp.buttonText, { color: colors.btnPrimaryText }]}>
            {buttonLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const bar = StyleSheet.create({
  track: {
    height: ms(6),
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    marginBottom: SPACING.md,
  },
  fill: {
    flexDirection: 'row',
    height: '100%',
    overflow: 'hidden',
    borderRadius: RADIUS.full,
  },
});

const exp = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingTop: ms(14),
    paddingBottom: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  calories: {
    fontSize: ms(22),
    fontWeight: FONTS.bold,
    letterSpacing: -0.5,
    marginBottom: ms(12),
  },
  nutrientList: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  nutrientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(10),
  },
  dot: {
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
  },
  nutrientLabel: {
    flex: 1,
    fontSize: FONT_SIZES.label,
    fontWeight: FONTS.medium,
  },
  nutrientValue: {
    fontSize: FONT_SIZES.label,
    fontWeight: FONTS.semibold,
  },
  button: {
    borderRadius: RADIUS.full,
    paddingVertical: ms(13),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: FONT_SIZES.body,
    fontWeight: FONTS.semibold,
    letterSpacing: 0.1,
  },
});
