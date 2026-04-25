import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { SPACING, RADIUS, FONTS } from '../constants/theme';
import { C_PROTEIN, C_CARBS, C_FAT } from '../components/NutritionExpansion';
import { useTheme } from '../context/ThemeContext';
import { fetchAllRecipes } from '../services/recipeService';

// ── Slot definitions with calorie splits and static fallback options ───────────
// Fallbacks are used when the DB has fewer than 3 matching recipes for a slot.
const MEAL_SLOTS = [
  {
    id: 'breakfast',
    labelKey: 'breakfast',
    icon: '🌅',
    split: 0.25,
    fallbacks: [
      { name: 'Greek Yogurt Parfait',      calories: 480, protein: 28, carbs: 62, fat: 10, fallback: true },
      { name: 'Avocado Toast with Eggs',   calories: 520, protein: 22, carbs: 44, fat: 26, fallback: true },
      { name: 'Protein Oatmeal Bowl',      calories: 495, protein: 26, carbs: 70, fat:  9, fallback: true },
    ],
  },
  {
    id: 'lunch',
    labelKey: 'lunch',
    icon: '☀️',
    split: 0.35,
    fallbacks: [
      { name: 'Grilled Chicken Salad',     calories: 680, protein: 52, carbs: 32, fat: 22, fallback: true },
      { name: 'Turkey Wrap with Veggies',  calories: 710, protein: 44, carbs: 74, fat: 18, fallback: true },
      { name: 'Salmon & Rice Bowl',        calories: 695, protein: 46, carbs: 76, fat: 16, fallback: true },
    ],
  },
  {
    id: 'dinner',
    labelKey: 'dinner',
    icon: '🌙',
    split: 0.30,
    fallbacks: [
      { name: 'Lemon Herb Baked Chicken',  calories: 590, protein: 48, carbs: 30, fat: 20, fallback: true },
      { name: 'Beef & Veggie Stir Fry',    calories: 610, protein: 40, carbs: 64, fat: 18, fallback: true },
      { name: 'Shrimp Tacos with Slaw',    calories: 580, protein: 38, carbs: 56, fat: 16, fallback: true },
    ],
  },
  {
    id: 'snack',
    labelKey: 'snack',
    icon: '🍎',
    split: 0.10,
    fallbacks: [
      { name: 'Apple with Almond Butter',  calories: 210, protein:  5, carbs: 28, fat: 10, fallback: true },
      { name: 'Cottage Cheese & Berries',  calories: 185, protein: 18, carbs: 22, fat:  4, fallback: true },
      { name: 'Rice Cakes with Hummus',    calories: 195, protein:  6, carbs: 30, fat:  6, fallback: true },
    ],
  },
];

/**
 * Assign DB recipes to each meal slot based on calorie proximity.
 * Each recipe is only assigned to one slot (greedy by slot order).
 * Remaining spots in a slot are filled with static fallbacks.
 */
function buildSlots(dbRecipes, targets) {
  const pool = dbRecipes.filter((r) => r.calories != null).map((r) => ({ ...r }));

  return MEAL_SLOTS.map((slot) => {
    const targetCal = Math.round(targets.calories * slot.split);

    // Sort pool by closeness to this slot's calorie target
    pool.sort((a, b) =>
      Math.abs(a.calories - targetCal) - Math.abs(b.calories - targetCal)
    );

    // Pick up to 3 from pool, removing chosen ones so they don't repeat
    const picked = [];
    for (let i = 0; i < pool.length && picked.length < 3; i++) {
      picked.push(pool[i]);
      pool.splice(i, 1);
      i--;
    }

    // Map DB row shape to option shape
    const dbOptions = picked.map((r) => ({
      name:     r.title,
      calories: r.calories,
      protein:  r.protein  ?? 0,
      carbs:    r.carbs    ?? 0,
      fat:      r.fat      ?? 0,
      saved:    r.saved_category != null,
      fromDB:   true,
    }));

    // Pad with fallbacks if needed
    const needed  = 3 - dbOptions.length;
    const options = [...dbOptions, ...slot.fallbacks.slice(0, needed)];

    return { ...slot, options, targetCal };
  });
}

// ── Option row (selectable) ───────────────────────────────────────────────────
function OptionRow({ option, isSelected, onSelect, colors }) {
  return (
    <TouchableOpacity
      style={[
        styles.optionRow,
        { borderBottomColor: colors.border },
        isSelected && { backgroundColor: colors.primary + '10', borderLeftColor: colors.primary },
      ]}
      onPress={onSelect}
      activeOpacity={0.65}
    >
      {/* Radio */}
      <View style={[styles.radio, { borderColor: isSelected ? colors.primary : colors.border }]}>
        {isSelected && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
      </View>

      {/* Name + macros */}
      <View style={styles.optionInfo}>
        <View style={styles.optionNameRow}>
          <Text
            style={[styles.optionName, { color: isSelected ? colors.text : colors.textSecondary }]}
            numberOfLines={1}
          >
            {option.name}
          </Text>
          {option.fromDB && (
            <View style={[styles.libBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.libBadgeText, { color: colors.primary }]}>
                {option.saved ? '★' : '↑'}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.optionMacros, { color: colors.textMuted }]}>
          <Text style={{ color: C_PROTEIN }}>{option.protein}g</Text>
          {' pro · '}
          <Text style={{ color: C_CARBS }}>{option.carbs}g</Text>
          {' carb · '}
          <Text style={{ color: C_FAT }}>{option.fat}g</Text>
          {' fat'}
        </Text>
      </View>

      {/* Calories */}
      <Text style={[styles.optionCal, { color: isSelected ? colors.primary : colors.textMuted }]}>
        {option.calories}{'\n'}
        <Text style={styles.optionCalLabel}>kcal</Text>
      </Text>
    </TouchableOpacity>
  );
}

// ── Macro summary row ─────────────────────────────────────────────────────────
function MacroRow({ label, value, goal, color, colors }) {
  const pct = Math.min(value / goal, 1);
  return (
    <View style={styles.macroItem}>
      <View style={styles.macroLabelRow}>
        <Text style={[styles.macroLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.macroValue, { color }]}>
          {value}<Text style={[styles.macroGoal, { color: colors.textMuted }]}>/{goal}g</Text>
        </Text>
      </View>
      <View style={[styles.macroTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.macroFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function PlanScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const onboardingPayload = useSelector((state) => state.auth.onboardingPayload);

  const TARGETS = {
    calories: onboardingPayload?.calories,
    protein:  onboardingPayload?.protein,
    carbs:    onboardingPayload?.carbs,
    fat:      onboardingPayload?.fat,
  };

  const [plan,            setPlan]     = useState(null);
  const [selectedIndices, setSelected] = useState({});
  const [loading,         setLoading]  = useState(false);
  const [dbCount,         setDbCount]  = useState(0);
  const [error,           setError]    = useState(null);

  async function handleCreatePlan() {
    setLoading(true);
    setError(null);
    try {
      const recipes = await fetchAllRecipes();
      setDbCount(recipes.length);
      const slots = buildSlots(recipes, TARGETS);
      setPlan(slots);
      setSelected(Object.fromEntries(slots.map((s) => [s.id, 0])));
    } catch (err) {
      console.warn('[PlanScreen] fetchAllRecipes failed:', err?.message ?? err);
      setError(t('plan.errorLoadRecipes'));
      // Fall back to all-static plan
      const slots = buildSlots([], TARGETS);
      setPlan(slots);
      setSelected(Object.fromEntries(slots.map((s) => [s.id, 0])));
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setPlan(null);
    setSelected({});
    setDbCount(0);
    setError(null);
  }

  function selectOption(slotId, idx) {
    setSelected((prev) => ({ ...prev, [slotId]: idx }));
  }

  // Live totals based on current selections
  const totals = plan
    ? plan.reduce(
        (acc, slot) => {
          const opt = slot.options[selectedIndices[slot.id] ?? 0];
          if (!opt) return acc;
          return {
            calories: acc.calories + opt.calories,
            protein:  acc.protein  + opt.protein,
            carbs:    acc.carbs    + opt.carbs,
            fat:      acc.fat      + opt.fat,
          };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      )
    : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: colors.text }]}>{t('plan.title')}</Text>
        {plan ? (
          <TouchableOpacity onPress={handleReset} style={styles.resetBtn} activeOpacity={0.7}>
            <Text style={[styles.resetText, { color: colors.textMuted }]}>{t('plan.reset')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {plan === null ? (
          /* ── Empty state ──────────────────────────────────────────── */
          <View style={styles.emptyState}>
            <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
              <Ionicons name="calendar-outline" size={40} color={colors.text} />
            </View>

            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('plan.emptyTitle')}</Text>

            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              {t('plan.emptySubtitle')}
            </Text>

            <View style={[styles.targetsCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.targetsTitle, { color: colors.textMuted }]}>{t('plan.yourTargets')}</Text>
              <View style={styles.targetsRow}>
                <TargetPill label={t('macros.calories')} value={`${TARGETS.calories}`} color={colors.primary} colors={colors} />
                <TargetPill label={t('macros.protein')}  value={`${TARGETS.protein}g`}  color={C_PROTEIN} colors={colors} />
                <TargetPill label={t('macros.carbs')}    value={`${TARGETS.carbs}g`}    color={C_CARBS} colors={colors} />
                <TargetPill label={t('macros.fat')}      value={`${TARGETS.fat}g`}      color={C_FAT} colors={colors} />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: colors.text, opacity: loading ? 0.6 : 1 }]}
              onPress={handleCreatePlan}
              disabled={loading}
              activeOpacity={0.75}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text style={[styles.createBtnText, { color: colors.background }]}>
                  {t('plan.createPlan')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* ── Plan view ────────────────────────────────────────────── */
          <>
            {/* Source info banner */}
            {(dbCount > 0 || error) && (
              <View style={[styles.sourceBanner, { backgroundColor: error ? colors.error + '15' : colors.primary + '12' }]}>
                <Ionicons
                  name={error ? 'warning-outline' : 'library-outline'}
                  size={13}
                  color={error ? colors.error : colors.primary}
                />
                <Text style={[styles.sourceText, { color: error ? colors.error : colors.primary }]}>
                  {error ?? t('plan.recipesMatched', { count: dbCount })}
                </Text>
              </View>
            )}

            {/* Daily summary */}
            <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
              <View style={styles.summaryHeader}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{t('plan.dailySummary')}</Text>
                <View style={styles.caloriesBadge}>
                  <Text style={[styles.caloriesValue, { color: colors.primary }]}>{totals.calories}</Text>
                  <Text style={[styles.caloriesTarget, { color: colors.textMuted }]}>
                    /{TARGETS.calories} kcal
                  </Text>
                </View>
              </View>
              <View style={styles.macrosGrid}>
                <MacroRow label={t('macros.protein')} value={totals.protein} goal={TARGETS.protein} color={C_PROTEIN} colors={colors} />
                <MacroRow label={t('macros.carbs')}   value={totals.carbs}   goal={TARGETS.carbs}   color={C_CARBS}   colors={colors} />
                <MacroRow label={t('macros.fat')}     value={totals.fat}     goal={TARGETS.fat}     color={C_FAT}     colors={colors} />
              </View>
            </View>

            {/* Meal slots */}
            {plan.map((slot) => (
              <View key={slot.id} style={styles.slotSection}>
                {/* Slot header */}
                <View style={styles.slotHeader}>
                  <Text style={styles.slotIcon}>{slot.icon}</Text>
                  <Text style={[styles.slotLabel, { color: colors.text }]}>{t(`mealType.${slot.labelKey}`)}</Text>
                  <Text style={[styles.slotTarget, { color: colors.textMuted }]}>
                    {t('plan.kcalTarget', { amount: slot.targetCal })}
                  </Text>
                </View>

                {/* Options */}
                <View style={[styles.optionsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {slot.options.map((opt, idx) => (
                    <OptionRow
                      key={idx}
                      option={opt}
                      isSelected={(selectedIndices[slot.id] ?? 0) === idx}
                      onSelect={() => selectOption(slot.id, idx)}
                      colors={colors}
                    />
                  ))}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Target pill (empty state) ─────────────────────────────────────────────────
function TargetPill({ label, value, color, colors }) {
  return (
    <View style={styles.targetPill}>
      <Text style={[styles.targetPillValue, { color }]}>{value}</Text>
      <Text style={[styles.targetPillLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn:  { width: 36, alignItems: 'flex-start' },
  resetBtn: { width: 36, alignItems: 'flex-end' },
  resetText: { fontSize: 13, fontWeight: FONTS.medium },
  topTitle: { fontSize: 17, fontWeight: FONTS.bold, letterSpacing: -0.3 },

  // Scroll content
  content: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.xxl },

  // ── Empty state
  emptyState:   { alignItems: 'center', gap: 16, paddingTop: 32 },
  iconWrap:     { width: 80, height: 80, borderRadius: RADIUS.xl, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle:   { fontSize: 22, fontWeight: FONTS.bold, letterSpacing: -0.3 },
  emptySubtitle:{ fontSize: 15, textAlign: 'center', lineHeight: 22, maxWidth: 280 },

  targetsCard:  { width: '100%', borderRadius: RADIUS.lg, padding: SPACING.md, gap: 12 },
  targetsTitle: { fontSize: 11, fontWeight: FONTS.semibold, letterSpacing: 0.6, textTransform: 'uppercase' },
  targetsRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  targetPill:   { alignItems: 'center', gap: 2 },
  targetPillValue: { fontSize: 16, fontWeight: FONTS.bold },
  targetPillLabel: { fontSize: 11 },

  createBtn:     { marginTop: 8, paddingHorizontal: SPACING.xl, paddingVertical: 14, borderRadius: RADIUS.full, minWidth: 160, alignItems: 'center' },
  createBtnText: { fontSize: 15, fontWeight: FONTS.semibold },

  // ── Source info banner
  sourceBanner: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 9, borderRadius: RADIUS.md, marginBottom: 16 },
  sourceText:   { flex: 1, fontSize: 12, fontWeight: FONTS.medium, lineHeight: 17 },

  // ── Plan view: summary card
  summaryCard: { borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: 24, gap: 14 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLabel:  { fontSize: 11, fontWeight: FONTS.semibold, letterSpacing: 0.6, textTransform: 'uppercase' },
  caloriesBadge: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  caloriesValue: { fontSize: 22, fontWeight: FONTS.bold },
  caloriesTarget:{ fontSize: 13 },
  macrosGrid:    { gap: 10 },

  macroItem:    { gap: 5 },
  macroLabelRow:{ flexDirection: 'row', justifyContent: 'space-between' },
  macroLabel:   { fontSize: 12, fontWeight: FONTS.medium },
  macroValue:   { fontSize: 12, fontWeight: FONTS.bold },
  macroGoal:    { fontWeight: FONTS.regular, fontSize: 11 },
  macroTrack:   { height: 4, borderRadius: 2, overflow: 'hidden' },
  macroFill:    { height: '100%', borderRadius: 2 },

  // ── Plan view: meal slots
  slotSection:  { marginBottom: 22 },
  slotHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, paddingHorizontal: 2 },
  slotIcon:     { fontSize: 16 },
  slotLabel:    { flex: 1, fontSize: 15, fontWeight: FONTS.bold, letterSpacing: -0.2 },
  slotTarget:   { fontSize: 12 },

  optionsCard:  { borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },

  // ── Option row
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  radio:       { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioDot:    { width: 9, height: 9, borderRadius: 5 },
  optionInfo:  { flex: 1 },
  optionNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  optionName:  { flex: 1, fontSize: 14, fontWeight: FONTS.semibold },
  libBadge:    { paddingHorizontal: 5, paddingVertical: 1, borderRadius: RADIUS.sm },
  libBadgeText:{ fontSize: 10, fontWeight: FONTS.bold },
  optionMacros:{ fontSize: 11 },
  optionCal:   { fontSize: 15, fontWeight: FONTS.bold, textAlign: 'right', lineHeight: 18 },
  optionCalLabel: { fontSize: 9, fontWeight: FONTS.regular },
});
