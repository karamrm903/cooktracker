import React, { useState, useEffect } from 'react';
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
import { mealService } from '../services/meal.service';
import { profileService } from '../services/profile.service';
import CommonAlertModal from '../components/CommonModal';

const MEAL_SLOTS = [
  { id: 'breakfast', labelKey: 'breakfast', icon: '🌅', split: 0.25 },
  { id: 'lunch',     labelKey: 'lunch',     icon: '☀️', split: 0.35 },
  { id: 'dinner',    labelKey: 'dinner',    icon: '🌙', split: 0.30 },
  { id: 'snack',     labelKey: 'snack',     icon: '🍎', split: 0.10 },
];

const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };
const MEAL_ICONS = { breakfast: 'sunny-outline', lunch: 'restaurant-outline', dinner: 'moon-outline', snack: 'cafe-outline' };

function buildSlots(dbRecipes, targets) {
  // Deduplicate by title — keep first occurrence (DB returns newest first)
  const seen = new Set();
  const unique = dbRecipes.filter(r => {
    if (r.calories == null || seen.has(r.title)) return false;
    seen.add(r.title);
    return true;
  });
  const pool = unique.map(r => ({ ...r }));

  return MEAL_SLOTS.map(slot => {
    const targetCal = targets.calories != null ? Math.round(targets.calories * slot.split) : null;

    if (targetCal != null) {
      pool.sort((a, b) =>
        Math.abs(a.calories - targetCal) - Math.abs(b.calories - targetCal)
      );
    }

    const picked = [];
    for (let i = 0; i < pool.length && picked.length < 3; i++) {
      picked.push(pool[i]);
      pool.splice(i, 1);
      i--;
    }

    const options = picked.map(r => ({
      name:     r.title,
      calories: r.calories,
      protein:  r.protein  ?? 0,
      carbs:    r.carbs    ?? 0,
      fat:      r.fat      ?? 0,
    }));

    while (options.length < 3) options.push(null);

    return { ...slot, options, targetCal };
  });
}

// ── Option row ────────────────────────────────────────────────────────────────
function OptionRow({ option, isSelected, onSelect, colors }) {
  if (!option) {
    return (
      <View style={[styles.optionRow, { borderBottomColor: colors.border }]}>
        <Ionicons name="add-circle-outline" size={18} color={colors.textMuted} />
        <Text style={[styles.optionName, { color: colors.textMuted, fontStyle: 'italic' }]}>
          No recipe available
        </Text>
      </View>
    );
  }

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
      <View style={[styles.radio, { borderColor: isSelected ? colors.primary : colors.border }]}>
        {isSelected && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
      </View>

      <View style={styles.optionInfo}>
        <View style={styles.optionNameRow}>
          <Text
            style={[styles.optionName, { color: isSelected ? colors.text : colors.textSecondary }]}
            numberOfLines={1}
          >
            {option.name}
          </Text>
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

      <Text style={[styles.optionCal, { color: isSelected ? colors.primary : colors.textMuted }]}>
        {option.calories}{'\n'}
        <Text style={styles.optionCalLabel}>kcal</Text>
      </Text>
    </TouchableOpacity>
  );
}

// ── Macro bar ─────────────────────────────────────────────────────────────────
function MacroRow({ label, value, goal, color, colors }) {
  const pct = goal != null && goal > 0 ? Math.min(value / goal, 1) : 0;
  return (
    <View style={styles.macroItem}>
      <View style={styles.macroLabelRow}>
        <Text style={[styles.macroLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.macroValue, { color }]}>
          {value}<Text style={[styles.macroGoal, { color: colors.textMuted }]}>/{goal != null ? `${goal}g` : 'N/A'}</Text>
        </Text>
      </View>
      <View style={[styles.macroTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.macroFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ── Target pill ───────────────────────────────────────────────────────────────
function TargetPill({ label, value, color, colors }) {
  return (
    <View style={styles.targetPill}>
      <Text style={[styles.targetPillValue, { color }]}>{value}</Text>
      <Text style={[styles.targetPillLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function PlanScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const session = useSelector(state => state.auth.session);

  const [profile,       setProfile]      = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) { setProfileLoading(false); return; }
    profileService.getProfile(session)
      .then(p => setProfile(p))
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, [session]);

  const TARGETS = {
    calories: profile?.calories ?? null,
    protein:  profile?.protein  ?? null,
    carbs:    profile?.carbs    ?? null,
    fat:      profile?.fat      ?? null,
  };

  const [plan,            setPlan]     = useState(null);
  const [selectedIndices, setSelected] = useState({});
  const [loading,         setLoading]  = useState(false);
  const [saving,          setSaving]   = useState(false);
  const [dbCount,         setDbCount]  = useState(0);
  const [planDate,        setPlanDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [alertModal,      setAlertModal] = useState({
    visible: false, title: '', message: '', variant: 'info', onConfirm: null,
  });

  function closeAlert() {
    setAlertModal(a => ({ ...a, visible: false, onConfirm: null }));
  }

  async function handleCreatePlan() {
    setLoading(true);
    try {
      const recipes = await fetchAllRecipes(session);
      const withCalories = recipes.filter(r => r.calories != null);
      setDbCount(withCalories.length);
      const slots = buildSlots(recipes, TARGETS);
      setPlan(slots);
      const initial = {};
      slots.forEach(s => {
        const firstValid = s.options.findIndex(o => o !== null);
        initial[s.id] = firstValid >= 0 ? firstValid : 0;
      });
      setSelected(initial);
    } catch (err) {
      console.warn('[PlanScreen] fetchAllRecipes failed:', err?.message);
      const slots = buildSlots([], TARGETS);
      setPlan(slots);
      setSelected(Object.fromEntries(slots.map(s => [s.id, 0])));
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setPlan(null);
    setSelected({});
    setDbCount(0);
  }

  function selectOption(slotId, idx) {
    setSelected(prev => ({ ...prev, [slotId]: idx }));
  }

  async function handleSavePlan() {
    setSaving(true);
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    try {
      const mealsToSave = [];
      for (const slot of plan) {
        const idx = selectedIndices[slot.id] ?? 0;
        const opt = slot.options[idx];
        if (!opt) continue;
        mealsToSave.push({
          name:     opt.name,
          calories: opt.calories,
          protein:  opt.protein,
          carbs:    opt.carbs,
          fat:      opt.fat,
          macros:   { protein: opt.protein, carbs: opt.carbs, fat: opt.fat },
          mealType: slot.id,
          meal:     MEAL_LABELS[slot.id],
          emoji:    null,
          time,
          source:   'plan',
        });
      }

      if (mealsToSave.length > 0) {
        await mealService.savePlan(session, planDate, mealsToSave);
      }
      setAlertModal({
        visible: true, variant: 'success',
        title: t('plan.savedSuccess'),
        message: t('plan.savedSuccessMsg'),
        onConfirm: () => navigation.navigate('MainTabs'),
      });
    } catch (err) {
      setAlertModal({
        visible: true, variant: 'error',
        title: t('plan.savedError'),
        message: err.message,
        onConfirm: null,
      });
    } finally {
      setSaving(false);
    }
  }

  async function confirmSavePlan() {
    try {
      const existing = await mealService.getMeals(session, planDate);
      if (existing?.length > 0) {
        setAlertModal({
          visible: true, variant: 'warning',
          title: t('plan.conflictTitle'),
          message: t('plan.conflictMsg', { date: planDate }),
          onConfirm: handleSavePlan,
        });
        return;
      }
    } catch { /* proceed anyway */ }
    handleSavePlan();
  }

  const totals = plan
    ? plan.reduce((acc, slot) => {
        const opt = slot.options[selectedIndices[slot.id] ?? 0];
        if (!opt) return acc;
        return {
          calories: acc.calories + opt.calories,
          protein:  acc.protein  + opt.protein,
          carbs:    acc.carbs    + opt.carbs,
          fat:      acc.fat      + opt.fat,
        };
      }, { calories: 0, protein: 0, carbs: 0, fat: 0 })
    : null;

  const hasAnyOption = plan ? plan.some(s => s.options.some(o => o !== null)) : false;

  const today    = new Date().toISOString().slice(0, 10);
  const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();

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

      {/* ── Date pills (shown once plan created) ────────────────────── */}
      {plan && (
        <View style={[styles.datePillsBar, { borderBottomColor: colors.border }]}>
          {[{ key: 'today', val: today }, { key: 'tomorrow', val: tomorrow }].map(({ key, val }) => {
            const isActive = planDate === val;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.datePill, { backgroundColor: isActive ? colors.text : colors.surfaceAlt }]}
                onPress={() => setPlanDate(val)}
                activeOpacity={0.7}
              >
                <Text style={[styles.datePillText, { color: isActive ? colors.background : colors.textSecondary }]}>
                  {key === 'today' ? t('common.today') : t('common.tomorrow')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

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
                <TargetPill label={t('macros.calories')} value={TARGETS.calories != null ? `${TARGETS.calories}` : 'N/A'} color={colors.primary} colors={colors} />
                <TargetPill label={t('macros.protein')}  value={TARGETS.protein  != null ? `${TARGETS.protein}g`  : 'N/A'} color={C_PROTEIN} colors={colors} />
                <TargetPill label={t('macros.carbs')}    value={TARGETS.carbs    != null ? `${TARGETS.carbs}g`    : 'N/A'} color={C_CARBS} colors={colors} />
                <TargetPill label={t('macros.fat')}      value={TARGETS.fat      != null ? `${TARGETS.fat}g`      : 'N/A'} color={C_FAT} colors={colors} />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: colors.text, opacity: (loading || profileLoading) ? 0.6 : 1 }]}
              onPress={handleCreatePlan}
              disabled={loading || profileLoading}
              activeOpacity={0.75}
            >
              {(loading || profileLoading) ? (
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
            {dbCount > 0 && (
              <View style={[styles.sourceBanner, { backgroundColor: colors.primary + '12' }]}>
                <Ionicons name="library-outline" size={13} color={colors.primary} />
                <Text style={[styles.sourceText, { color: colors.primary }]}>
                  {t('plan.recipesMatched', { count: dbCount })}
                </Text>
              </View>
            )}

            {dbCount === 0 && (
              <View style={[styles.sourceBanner, { backgroundColor: colors.error + '15' }]}>
                <Ionicons name="warning-outline" size={13} color={colors.error} />
                <Text style={[styles.sourceText, { color: colors.error }]}>
                  {t('plan.noRecipesHint')}
                </Text>
              </View>
            )}

            {/* Daily summary */}
            <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
              <View style={styles.summaryHeader}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{t('plan.dailySummary')}</Text>
                <View style={styles.caloriesBadge}>
                  <Text style={[styles.caloriesValue, { color: colors.primary }]}>{totals.calories}</Text>
                  <Text style={[styles.caloriesTarget, { color: colors.textMuted }]}>/{TARGETS.calories != null ? `${TARGETS.calories}` : 'N/A'} kcal</Text>
                </View>
              </View>
              <View style={styles.macrosGrid}>
                <MacroRow label={t('macros.protein')} value={totals.protein} goal={TARGETS.protein} color={C_PROTEIN} colors={colors} />
                <MacroRow label={t('macros.carbs')}   value={totals.carbs}   goal={TARGETS.carbs}   color={C_CARBS}   colors={colors} />
                <MacroRow label={t('macros.fat')}     value={totals.fat}     goal={TARGETS.fat}     color={C_FAT}     colors={colors} />
              </View>
            </View>

            {/* Meal slots */}
            {plan.map(slot => (
              <View key={slot.id} style={styles.slotSection}>
                <View style={styles.slotHeader}>
                  <Text style={styles.slotIcon}>{slot.icon}</Text>
                  <Text style={[styles.slotLabel, { color: colors.text }]}>{t(`mealType.${slot.labelKey}`)}</Text>
                  <Text style={[styles.slotTarget, { color: colors.textMuted }]}>
                    {slot.targetCal != null ? t('plan.kcalTarget', { amount: slot.targetCal }) : ''}
                  </Text>
                </View>
                <View style={[styles.optionsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {slot.options.map((opt, idx) => (
                    <OptionRow
                      key={idx}
                      option={opt}
                      isSelected={(selectedIndices[slot.id] ?? 0) === idx}
                      onSelect={() => opt && selectOption(slot.id, idx)}
                      colors={colors}
                    />
                  ))}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* ── Save Plan bottom bar ─────────────────────────────────────── */}
      {plan !== null && (
        <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: colors.btnPrimary, opacity: (saving || !hasAnyOption) ? 0.5 : 1 },
            ]}
            onPress={confirmSavePlan}
            disabled={saving || !hasAnyOption}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.btnPrimaryText} />
            ) : (
              <Text style={[styles.saveBtnText, { color: colors.btnPrimaryText }]}>
                {t('plan.savePlan')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <CommonAlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
        primaryText={alertModal.onConfirm ? t('common.yes') : t('common.ok')}
        onPrimary={() => {
          const fn = alertModal.onConfirm;
          closeAlert();
          if (fn) fn();
        }}
        secondaryText={alertModal.onConfirm ? t('common.no') : undefined}
        onSecondary={closeAlert}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn:   { width: 36, alignItems: 'flex-start' },
  resetBtn:  { width: 36, alignItems: 'flex-end' },
  resetText: { fontSize: 13, fontWeight: FONTS.medium },
  topTitle:  { fontSize: 17, fontWeight: FONTS.bold, letterSpacing: -0.3 },

  datePillsBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  datePill:     { paddingHorizontal: 16, paddingVertical: 7, borderRadius: RADIUS.full },
  datePillText: { fontSize: 13, fontWeight: FONTS.medium },

  content: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: 100 },

  emptyState:    { alignItems: 'center', gap: 16, paddingTop: 32 },
  iconWrap:      { width: 80, height: 80, borderRadius: RADIUS.xl, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle:    { fontSize: 22, fontWeight: FONTS.bold, letterSpacing: -0.3 },
  emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, maxWidth: 280 },

  targetsCard:      { width: '100%', borderRadius: RADIUS.lg, padding: SPACING.md, gap: 12 },
  targetsTitle:     { fontSize: 11, fontWeight: FONTS.semibold, letterSpacing: 0.6, textTransform: 'uppercase' },
  targetsRow:       { flexDirection: 'row', justifyContent: 'space-between' },
  targetPill:       { alignItems: 'center', gap: 2 },
  targetPillValue:  { fontSize: 16, fontWeight: FONTS.bold },
  targetPillLabel:  { fontSize: 11 },

  createBtn:     { marginTop: 8, paddingHorizontal: SPACING.xl, paddingVertical: 14, borderRadius: RADIUS.full, minWidth: 160, alignItems: 'center' },
  createBtnText: { fontSize: 15, fontWeight: FONTS.semibold },

  sourceBanner: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 9, borderRadius: RADIUS.md, marginBottom: 16 },
  sourceText:   { flex: 1, fontSize: 12, fontWeight: FONTS.medium, lineHeight: 17 },

  summaryCard:    { borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: 24, gap: 14 },
  summaryHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLabel:   { fontSize: 11, fontWeight: FONTS.semibold, letterSpacing: 0.6, textTransform: 'uppercase' },
  caloriesBadge:  { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  caloriesValue:  { fontSize: 22, fontWeight: FONTS.bold },
  caloriesTarget: { fontSize: 13 },
  macrosGrid:     { gap: 10 },

  macroItem:    { gap: 5 },
  macroLabelRow:{ flexDirection: 'row', justifyContent: 'space-between' },
  macroLabel:   { fontSize: 12, fontWeight: FONTS.medium },
  macroValue:   { fontSize: 12, fontWeight: FONTS.bold },
  macroGoal:    { fontWeight: FONTS.regular, fontSize: 11 },
  macroTrack:   { height: 4, borderRadius: 2, overflow: 'hidden' },
  macroFill:    { height: '100%', borderRadius: 2 },

  slotSection: { marginBottom: 22 },
  slotHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, paddingHorizontal: 2 },
  slotIcon:    { fontSize: 16 },
  slotLabel:   { flex: 1, fontSize: 15, fontWeight: FONTS.bold, letterSpacing: -0.2 },
  slotTarget:  { fontSize: 12 },

  optionsCard: { borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },

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
  optionMacros:{ fontSize: 11 },
  optionCal:   { fontSize: 15, fontWeight: FONTS.bold, textAlign: 'right', lineHeight: 18 },
  optionCalLabel: { fontSize: 9, fontWeight: FONTS.regular },

  bottomBar:   { paddingHorizontal: SPACING.lg, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  saveBtn:     { paddingVertical: 14, borderRadius: RADIUS.full, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: FONTS.semibold },
});
