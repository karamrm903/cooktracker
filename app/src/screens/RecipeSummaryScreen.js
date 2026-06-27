import { supabase } from '../lib/supabase';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, FONT_SIZES, RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { moderateScale as ms } from '../utils/responsive';
import RecipeAvatar from '../components/RecipeAvatar';
import { useTheme } from '../context/ThemeContext';
import { useSavedMeals } from '../context/SavedMealsContext';
import { useMealLogs } from '../context/MealLogsContext';
import SaveModal from '../components/SaveModal';
import { useSelector } from 'react-redux';
import { saveRecipe } from '../services/recipeService';
import { useSubscription } from '../hooks/useSubscription';
import PaywallModal from '../components/PaywallModal';

// ── Assets ────────────────────────────────────────────────────────────────────
const streakFireImg = require('../../assets/webp/StreakFire.webp');
const muscleImg = require('../../assets/pngs/muscleVector.png');
const leafVectorImg = require('../../assets/pngs/leafVector.png');
const dropImg = require('../../assets/pngs/dropVector.png');
const kcalImg = require('../../assets/pngs/kcalVector.png');
const stepsImg = require('../../assets/pngs/stepsVector.png');
const timerImg = require('../../assets/pngs/timerVector.png');
const reanalyseImg = require('../../assets/pngs/reanalyseVector.png');
const leafStarsImg = require('../../assets/webp/SignUpLeaf.webp');

// ── Figma palette ─────────────────────────────────────────────────────────────
const SCREEN_BG = '#FCF7F3';
const PILL_BG = '#FCEFE2';
const CTA_BG = '#FF8A45';
const STEP_NUM_BG = '#E1EADA';
const ING_DOT = '#94AE7F';
const HEADING = '#493026';

// ── Confidence colour map ─────────────────────────────────────────────────────
const CONFIDENCE_COLORS = {
  high:   { color: '#16A34A', bg: '#F0FDF4' },
  medium: { color: '#D97706', bg: '#FFFBEB' },
  low:    { color: '#DC2626', bg: '#FEF2F2' },
};

// Per-macro icon for the nutrition card.
const NUTRI_ICONS = {
  calories: streakFireImg,
  protein: muscleImg,
  carbs: leafVectorImg,
  fat: dropImg,
};

function estimateRecipeGrams(recipe) {
  if (!Array.isArray(recipe.ingredients)) return 600;

  let grams = 0;

  recipe.ingredients.forEach(ing => {
    const text = typeof ing === 'string' ? ing : ing.name ?? '';
    const lower = text.toLowerCase();

    if (lower.includes('cup')) grams += 240;
    else if (lower.includes('tbsp') || lower.includes('tablespoon')) grams += 15;
    else if (lower.includes('tsp') || lower.includes('teaspoon')) grams += 5;
    else if (lower.includes('egg')) grams += 50;
    else if (lower.includes('g')) {
      const match = lower.match(/(\d+)\s?g/);
      if (match) grams += Number(match[1]);
    }
  });

  if (grams === 0) grams = 600;

  return grams;
}

export default function RecipeSummaryScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { recipe, dbId } = route.params;
  const { colors, isDark } = useTheme();
  const { addMealLog } = useMealLogs();
  const { savedMeals, saveMeal, unsaveMeal } = useSavedMeals();
  const session = useSelector(state => state.auth.session);

  const { isSubscribed } = useSubscription();
  const [showInferred,    setShowInferred]    = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [isLoggingMeal, setIsLoggingMeal] = useState(false);
  const [cookingPaywallVisible, setCookingPaywallVisible] = useState(false);
  const [editableIngredients, setEditableIngredients] = useState(
    Array.isArray(recipe.ingredients) ? recipe.ingredients : []
  );

  const [savedDbId, setSavedDbId] = useState(dbId ?? null);

  const savedEntry    = dbId ? savedMeals.find((m) => m.id === dbId) : null;
  const savedCategory = savedEntry?.category ?? null;

  const analysis   = recipe._analysis ?? {};
  const level      = analysis.confidenceLevel ?? 'high';
  const confColors = CONFIDENCE_COLORS[level] ?? CONFIDENCE_COLORS.high;
  const conf = {
    ...confColors,
    label:   t(`recipeSummary.confidence.${level}.label`),
    message: t(`recipeSummary.confidence.${level}.message`),
  };
  const warnings   = analysis.warnings ?? [];
  const timedSteps = recipe.steps.filter(s => s.timerMinutes).length;
  const inferred   = recipe.inferredIngredients ?? [];
  const ingredientNutritionTotals = editableIngredients.reduce(
    (sum, ing) => {
      if (typeof ing === 'object') {
        return {
          calories: sum.calories + (ing.calories ?? 0),
          protein: sum.protein + (ing.protein ?? 0),
          carbs: sum.carbs + (ing.carbs ?? 0),
          fat: sum.fat + (ing.fat ?? 0),
        };
      }
      return sum;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const hasIngredientNutrition = editableIngredients.some(
    ing =>
      typeof ing === 'object' &&
      (
        ing.calories != null ||
        ing.protein != null ||
        ing.carbs != null ||
        ing.fat != null
      )
  );

  const displayedNutrition = hasIngredientNutrition
    ? {
        ...recipe.nutrition,
        total: {
          ...recipe.nutrition?.total,
          calories: ingredientNutritionTotals.calories,
          protein: ingredientNutritionTotals.protein,
          carbs: ingredientNutritionTotals.carbs,
          fat: ingredientNutritionTotals.fat,
        },
      }
    : recipe.nutrition;

  useEffect(() => {
    const saveRecipeToSupabase = async () => {
      if (savedDbId) return;

      try {
        const data = await saveRecipe(session, recipe, recipe.sourceUrl || null);
        setSavedDbId(data.id);
      } catch (error) {
        console.log('SAVE RECIPE ERROR:', error);
      }
    };

    saveRecipeToSupabase();
  }, [recipe, savedDbId, session]);

  // Colors adapt so the banners look good in both light and dark mode
  const confBg = isDark ? colors.surfaceAlt : conf.bg;

  const total = displayedNutrition?.total ?? {};
  const nutri = [
    { key: 'calories', value: total.calories ?? 0, unit: 'kcal' },
    { key: 'protein',  value: total.protein ?? 0,  unit: 'g' },
    { key: 'carbs',    value: total.carbs ?? 0,    unit: 'g' },
    { key: 'fat',      value: total.fat ?? 0,      unit: 'g' },
  ];

  async function handleSave(category) {
    if (!dbId) return;
    await saveMeal(dbId, category);
    setSaveModalVisible(false);
  }

  async function handleUnsave() {
    if (!dbId) return;
    await unsaveMeal(dbId);
    setSaveModalVisible(false);
  }

  function handleReanalyze() {
    const url = recipe.sourceUrl;
    if (url) navigation.navigate('Analyzing', { url });
    else navigation.goBack();
  }

  function handleCook() {
    if (isLoggingMeal) return;

    // Cooking Mode is a premium feature
    if (!isSubscribed) {
      setCookingPaywallVisible(true);
      return;
    }

    setIsLoggingMeal(true);
    const estimatedGrams = estimateRecipeGrams(recipe);
    navigation.navigate('CookingMode', {
      recipe: {
        ...recipe,
        ingredients: editableIngredients,
        nutrition: displayedNutrition,
        estimatedGrams,
      },
    });
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: SCREEN_BG }]} edges={['top', 'bottom']}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: colors.surface }, SHADOWS.sm]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={ms(20)} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: HEADING }]}>{t('recipeSummary.headerTitle')}</Text>
        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: colors.surface }, SHADOWS.sm]}
          onPress={() => savedDbId && setSaveModalVisible(true)}
          disabled={!savedDbId}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={savedCategory ? 'bookmark' : 'bookmark-outline'}
            size={ms(20)}
            color={savedCategory ? colors.primary : savedDbId ? colors.text : colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* ── Scrollable body ─────────────────────────────────────────────── */}
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={s.hero}>
          <Image
            source={leafStarsImg}
            style={s.heroLeaf}
            resizeMode="contain"
            pointerEvents="none"
          />
          <RecipeAvatar name={recipe.title} size={ms(72)} />
          <Text style={[s.recipeTitle, { color: HEADING }]}>{recipe.title}</Text>
          <View style={s.pills}>
            <Pill img={stepsImg} label={t('recipeSummary.steps', { count: recipe.steps.length })} colors={colors} />
            <Pill img={kcalImg} label={`${total.calories ?? 0} kcal`} colors={colors} />
            {timedSteps > 0 && (
              <Pill img={timerImg} label={t('recipeSummary.timers', { count: timedSteps })} colors={colors} />
            )}
          </View>
        </View>

        {/* ── Confidence banner ────────────────────────────────────────── */}
        <View style={[s.confBanner, { backgroundColor: confBg, borderColor: conf.color + '33' }]}>
          <View style={s.confTopRow}>
            <Ionicons name="warning" size={ms(18)} color={conf.color} />
            <Text style={[s.confLabel, { color: conf.color }]}>{conf.label}</Text>
            <Text style={[s.confScore, { color: conf.color }]}>
              {Math.round((analysis.confidence ?? 1) * 100)}%
            </Text>
          </View>
          <Text style={[s.confMessage, { color: colors.textSecondary }]}>{conf.message}</Text>
          {warnings.map((w, i) => (
            <View key={i} style={s.confBullet}>
              <View style={[s.confDot, { backgroundColor: conf.color }]} />
              <Text style={[s.confWarning, { color: colors.textSecondary }]}>{w}</Text>
            </View>
          ))}
        </View>

        {/* Nutrition */}
        <SectionCard title={t('recipeSummary.nutritionSection')} colors={colors}>
          <View style={s.nutriRow}>
            {nutri.map((m) => (
              <View key={m.key} style={s.nutriCell}>
                <Image source={NUTRI_ICONS[m.key]} style={s.nutriIcon} resizeMode="contain" />
                <Text style={[s.nutriValue, { color: colors.text }]}>
                  {m.value}
                  <Text style={[s.nutriUnit, { color: colors.textMuted }]}> {m.unit}</Text>
                </Text>
                <Text style={[s.nutriLabel, { color: colors.textMuted }]}>{t(`macros.${m.key}`)}</Text>
              </View>
            ))}
          </View>
        </SectionCard>

        {/* Ingredients — explicit */}
        <SectionCard
          title={t('recipeSummary.ingredientsSection')}
          colors={colors}
          badge={inferred.length > 0 ? t('recipeSummary.confirmed', { count: recipe.ingredients.length }) : null}
        >
          <Text style={[s.ingHint, { color: colors.textMuted }]}>
            {t('recipeSummary.ingredientsHint')}
          </Text>
          {editableIngredients.map((ing, i) => (
            <View
              key={i}
              style={[
                s.ingRow,
                i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
              ]}
            >
              <View style={[s.ingDot, { backgroundColor: ING_DOT }]} />

              <Text style={[s.ingText, { color: HEADING }]}>
                {typeof ing === 'string' ? ing : ing.name}
              </Text>

              {typeof ing === 'object' && ing.calories != null && (
                <Text style={[s.ingKcal, { color: colors.textMuted }]}>
                  {ing.calories} kcal
                </Text>
              )}

              <TouchableOpacity
                onPress={() => {
                  setEditableIngredients(prev => prev.filter((_, idx) => idx !== i));
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle-outline" size={ms(18)} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}

          {/* Inferred ingredients — toggleable */}
          {inferred.length > 0 && (
            <>
              <TouchableOpacity
                style={[s.inferredToggle, { borderTopColor: colors.border }]}
                onPress={() => setShowInferred(v => !v)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showInferred ? 'chevron-up' : 'chevron-down'}
                  size={ms(14)}
                  color={colors.textMuted}
                />
                <Text style={[s.inferredToggleText, { color: colors.textMuted }]}>
                  {showInferred
                    ? t('recipeSummary.hideInferred', { count: inferred.length })
                    : t('recipeSummary.showInferred', { count: inferred.length })}
                </Text>
              </TouchableOpacity>

              {showInferred && inferred.map((ing, i) => (
                <View
                  key={`inf_${i}`}
                  style={[
                    s.ingRow, s.inferredRow,
                    { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
                  ]}
                >
                  <Ionicons name="help-circle-outline" size={ms(14)} color={colors.textMuted} />
                  <View style={{ flex: 1, gap: ms(2) }}>
                    <Text style={[s.ingText, { color: colors.textSecondary }]}>{ing}</Text>
                    <Text style={[s.estimatedTag, { color: colors.textMuted }]}>{t('recipeSummary.estimated')}</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </SectionCard>

        {/* Steps */}
        <SectionCard title={t('recipeSummary.stepsSection')} colors={colors}>
          {recipe.steps.map((step, i) => (
            <View
              key={i}
              style={[
                s.stepRow,
                i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
              ]}
            >
              <View style={[s.stepNum, { backgroundColor: STEP_NUM_BG }]}>
                <Text style={[s.stepNumText, { color: HEADING }]}>{i + 1}</Text>
              </View>
              <Text style={[s.stepText, { color: HEADING }]}>
                {step.text}
              </Text>
              {step.timerMinutes && (
                <View style={[s.timerBadge, { backgroundColor: colors.surfaceAlt }]}>
                  <Ionicons name="timer-outline" size={ms(11)} color={colors.textSecondary} />
                  <Text style={[s.timerBadgeText, { color: colors.textSecondary }]}>
                    {step.timerMinutes}m
                  </Text>
                </View>
              )}
            </View>
          ))}
        </SectionCard>

        <View style={{ height: ms(180) }} />
      </ScrollView>

      {/* ── Fixed bottom: confirmation section ──────────────────────────── */}
      <View style={[s.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Text style={[s.confirmQuestion, { color: colors.textSecondary }]}>
          {t('recipeSummary.confirmQuestion')}
        </Text>

        <TouchableOpacity
          style={[s.btnSecondary, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleReanalyze}
          activeOpacity={0.8}
        >
          <Image source={reanalyseImg} style={s.btnSecondaryIcon} resizeMode="contain" />
          <Text style={[s.btnSecondaryText, { color: colors.text }]}>
            {t('recipeSummary.reAnalyze', { defaultValue: 'Re-Analyze' })}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            s.btnPrimary,
            { backgroundColor: CTA_BG, opacity: level === 'low' || isLoggingMeal ? 0.6 : 1 },
          ]}
          disabled={isLoggingMeal}
          onPress={handleCook}
          activeOpacity={0.85}
        >
          <Text style={[s.btnPrimaryText, { color: colors.btnPrimaryText }]}>
            {isLoggingMeal ? t('recipeSummary.opening') : level === 'low' ? t('recipeSummary.cookAnyway') : t('recipeSummary.letsCook')}
          </Text>
          <Ionicons name="arrow-forward" size={ms(16)} color={colors.btnPrimaryText} />
        </TouchableOpacity>
      </View>

      <SaveModal
        meal={{ name: recipe.title }}
        visible={saveModalVisible}
        onClose={() => setSaveModalVisible(false)}
        onSave={handleSave}
        onRemove={handleUnsave}
        savedCategory={savedCategory}
        colors={colors}
      />

      <PaywallModal
        visible={cookingPaywallVisible}
        feature="cooking_mode"
        onClose={() => setCookingPaywallVisible(false)}
        onUpgrade={() => {
          setCookingPaywallVisible(false);
          navigation.navigate('Subscription');
        }}
      />
    </SafeAreaView>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────────
function SectionCard({ title, children, colors, badge }) {
  return (
    <View style={[s.card, { backgroundColor: colors.surface }]}>
      <View style={s.sectionHeader}>
        <Text style={[s.sectionLabel, { color: HEADING }]}>{title}</Text>
        {badge && <Text style={[s.sectionBadge, { color: colors.textMuted }]}>{badge}</Text>}
      </View>
      {children}
    </View>
  );
}

function Pill({ img, label }) {
  return (
    <View style={s.pill}>
      <Image source={img} style={s.pillIcon} resizeMode="contain" />
      <Text style={s.pillText}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: ms(12),
  },
  iconBtn: {
    width: ms(40),
    height: ms(40),
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: ms(16), fontWeight: FONTS.semibold },

  scroll: { paddingHorizontal: SPACING.lg, paddingTop: ms(20) },

  hero: { alignItems: 'center', marginBottom: ms(24), position: 'relative' },
  heroLeaf: {
    position: 'absolute',
    top: -ms(6),
    right: ms(36),
    width: ms(120),
    height: ms(120),
    opacity: 0.9,
    zIndex: 0,
  },
  recipeTitle: {
    fontSize: ms(24),
    fontWeight: FONTS.bold,
    letterSpacing: -0.5,
    textAlign: 'center',
    lineHeight: ms(30),
    marginTop: ms(14),
    marginBottom: ms(14),
  },
  pills: { flexDirection: 'row', gap: ms(8), flexWrap: 'wrap', justifyContent: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(5),
    paddingHorizontal: ms(12),
    paddingVertical: ms(6),
    borderRadius: RADIUS.full,
    backgroundColor: PILL_BG,
  },
  pillIcon: { width: ms(13), height: ms(13) },
  pillText: { fontSize: FONT_SIZES.small, fontWeight: FONTS.medium, color: HEADING },

  confBanner: {
    marginBottom: ms(16),
    padding: ms(14),
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: ms(6),
  },
  confTopRow: { flexDirection: 'row', alignItems: 'center', gap: ms(8) },
  confLabel: { flex: 1, fontSize: FONT_SIZES.body, fontWeight: FONTS.semibold },
  confScore: { fontSize: ms(15), fontWeight: FONTS.bold },
  confMessage: { fontSize: FONT_SIZES.small, fontWeight: FONTS.regular, lineHeight: ms(18) },
  confBullet: { flexDirection: 'row', alignItems: 'flex-start', gap: ms(8) },
  confDot: { width: ms(5), height: ms(5), borderRadius: ms(2.5), marginTop: ms(7) },
  confWarning: { flex: 1, fontSize: FONT_SIZES.small, fontWeight: FONTS.regular, lineHeight: ms(18) },

  card: { borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: ms(16), padding: ms(16) },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: ms(14) },
  sectionLabel: { fontSize: FONT_SIZES.caption, fontWeight: FONTS.semibold, letterSpacing: 0.8, textTransform: 'uppercase' },
  sectionBadge: { fontSize: FONT_SIZES.caption, fontWeight: FONTS.regular },

  nutriRow: { flexDirection: 'row' },
  nutriCell: { flex: 1, alignItems: 'center', gap: ms(6) },
  nutriIcon: { width: ms(26), height: ms(26) },
  nutriValue: { fontSize: ms(18), fontWeight: FONTS.bold, letterSpacing: -0.3 },
  nutriUnit: { fontSize: ms(12), fontWeight: FONTS.regular },
  nutriLabel: { fontSize: FONT_SIZES.caption, fontWeight: FONTS.regular },

  ingHint: { fontSize: FONT_SIZES.small, lineHeight: ms(18), marginBottom: ms(10) },
  ingRow: { flexDirection: 'row', alignItems: 'center', gap: ms(12), paddingVertical: ms(11) },
  inferredRow: { alignItems: 'flex-start', paddingVertical: ms(9) },
  ingDot: { width: ms(6), height: ms(6), borderRadius: ms(3) },
  ingText: { flex: 1, fontSize: FONT_SIZES.label, fontWeight: FONTS.regular, lineHeight: ms(20) },
  ingKcal: { fontSize: FONT_SIZES.small },
  estimatedTag: { fontSize: FONT_SIZES.caption, fontWeight: FONTS.regular, fontStyle: 'italic' },
  inferredToggle: { flexDirection: 'row', alignItems: 'center', gap: ms(6), paddingVertical: ms(10), borderTopWidth: StyleSheet.hairlineWidth, marginTop: ms(2) },
  inferredToggleText: { fontSize: FONT_SIZES.small, fontWeight: FONTS.medium },

  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: ms(12), paddingVertical: ms(12) },
  stepNum: { width: ms(26), height: ms(26), borderRadius: ms(13), alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  stepNumText: { fontSize: FONT_SIZES.caption, fontWeight: FONTS.bold },
  stepText: { flex: 1, fontSize: FONT_SIZES.label, fontWeight: FONTS.regular, lineHeight: ms(20) },
  timerBadge: { flexDirection: 'row', alignItems: 'center', gap: ms(3), paddingHorizontal: ms(7), paddingVertical: ms(3), borderRadius: RADIUS.full, marginTop: ms(2) },
  timerBadgeText: { fontSize: FONT_SIZES.caption, fontWeight: FONTS.medium },

  bottomBar: { paddingHorizontal: SPACING.lg, paddingTop: ms(12), paddingBottom: ms(12), borderTopWidth: StyleSheet.hairlineWidth, gap: ms(10) },
  confirmQuestion: { fontSize: FONT_SIZES.small, fontWeight: FONTS.medium, textAlign: 'center' },
  btnSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: ms(8), paddingVertical: ms(14), borderRadius: RADIUS.full, borderWidth: 1 },
  btnSecondaryIcon: { width: ms(16), height: ms(16) },
  btnSecondaryText: { fontSize: FONT_SIZES.body, fontWeight: FONTS.semibold },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: ms(8), paddingVertical: ms(16), borderRadius: RADIUS.full },
  btnPrimaryText: { fontSize: FONT_SIZES.body, fontWeight: FONTS.bold, letterSpacing: 0.2 },
});
