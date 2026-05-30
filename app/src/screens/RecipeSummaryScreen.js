import { supabase } from '../lib/supabase';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, RADIUS } from '../constants/theme';
import RecipeAvatar from '../components/RecipeAvatar';
import { useTheme } from '../context/ThemeContext';
import { useSavedMeals } from '../context/SavedMealsContext';
import { useMealLogs } from '../context/MealLogsContext';
import SaveModal from '../components/SaveModal';
import { useSelector } from 'react-redux';
import { saveRecipe } from '../services/recipeService';
import { useSubscription } from '../hooks/useSubscription';
import PaywallModal from '../components/PaywallModal';

// ── Confidence colour map ─────────────────────────────────────────────────────
const CONFIDENCE_COLORS = {
  high:   { color: '#16A34A', bg: '#F0FDF4', icon: 'checkmark-circle-outline' },
  medium: { color: '#D97706', bg: '#FFFBEB', icon: 'alert-circle-outline' },
  low:    { color: '#DC2626', bg: '#FEF2F2', icon: 'close-circle-outline' },
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
  const ingestion  = recipe._ingestion ?? {};
  const level      = analysis.confidenceLevel ?? 'high';
  const confColors = CONFIDENCE_COLORS[level] ?? CONFIDENCE_COLORS.high;
  const conf = {
    ...confColors,
    label:   t(`recipeSummary.confidence.${level}.label`),
    message: t(`recipeSummary.confidence.${level}.message`),
  };
  const warnings   = analysis.warnings ?? [];
  const evidence   = analysis.evidenceSummary ?? {};
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
        console.log('RECIPE SAVED:', data);
        setSavedDbId(data.id);
      } catch (error) {
        console.log('SAVE RECIPE ERROR:', error);
      }
    };

    saveRecipeToSupabase();
  }, [recipe, savedDbId, session]);

  // Colors adapt so the banners look good in both light and dark mode
  const confBg     = isDark ? colors.surfaceAlt : conf.bg;

  console.log('[RecipeSummaryScreen] rendering → title:', recipe.title,
    '| id:', recipe.id, '| confidence:', level);

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

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={s.closeBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>{t('recipeSummary.headerTitle')}</Text>
        <TouchableOpacity
          style={s.closeBtn}
          onPress={() => savedDbId && setSaveModalVisible(true)}
disabled={!savedDbId}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={savedCategory ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={savedCategory ? colors.text : savedDbId ? colors.text : colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* ── Scrollable body ─────────────────────────────────────────────── */}
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={s.hero}>
          <RecipeAvatar name={recipe.title} size={72} />
          <Text style={[s.recipeTitle, { color: colors.text }]}>{recipe.title}</Text>
          <View style={s.pills}>
            <Pill icon="list-outline"  label={t('recipeSummary.steps', { count: recipe.steps.length })}     colors={colors} />
            <Pill icon="flame-outline" label={`${displayedNutrition?.total?.calories ?? 0} kcal`} colors={colors} />
            {timedSteps > 0 && (
              <Pill icon="timer-outline" label={t('recipeSummary.timers', { count: timedSteps })} colors={colors} />
            )}
          </View>
        </View>

        {/* ── Confidence banner ────────────────────────────────────────── */}
        <View style={[s.confBanner, { backgroundColor: confBg, borderColor: conf.color + '44' }]}>
          <Ionicons name={conf.icon} size={20} color={conf.color} style={{ marginTop: 1 }} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[s.confLabel, { color: conf.color }]}>{conf.label}</Text>
            <Text style={[s.confMessage, { color: colors.textSecondary }]}>{conf.message}</Text>
            {warnings.map((w, i) => (
              <Text key={i} style={[s.confWarning, { color: colors.textSecondary }]}>• {w}</Text>
            ))}
          </View>
          {/* Numeric score badge */}
          <Text style={[s.confScore, { color: conf.color }]}>
            {Math.round((analysis.confidence ?? 1) * 100)}%
          </Text>
        </View>

        {/* Nutrition */}
        <SectionCard title={t('recipeSummary.nutritionSection')} colors={colors}>
          <View style={s.macroRow}>
            {[
  { labelKey: 'calories', value: displayedNutrition?.total?.calories ?? 0, unit: 'kcal' },
  { labelKey: 'protein',  value: displayedNutrition?.total?.protein ?? 0,  unit: 'g' },
  { labelKey: 'carbs',    value: displayedNutrition?.total?.carbs ?? 0,    unit: 'g' },
  { labelKey: 'fat',      value: displayedNutrition?.total?.fat ?? 0,      unit: 'g' },
].map((m, i) => (
              <React.Fragment key={m.labelKey}>
                {i > 0 && <View style={[s.macroDivider, { backgroundColor: colors.border }]} />}
                <View style={s.macroCell}>
                  <Text style={[s.macroValue, { color: colors.text }]}>
                    {m.value}
                    <Text style={[s.macroUnit, { color: colors.textMuted }]}>{m.unit}</Text>
                  </Text>
                  <Text style={[s.macroLabel, { color: colors.textMuted }]}>{t(`macros.${m.labelKey}`)}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </SectionCard>

        {/* Ingredients — explicit */}
        <SectionCard
          title={t('recipeSummary.ingredientsSection')}
          colors={colors}
          badge={inferred.length > 0 ? t('recipeSummary.confirmed', { count: recipe.ingredients.length }) : null}
        >
          <Text
  style={{
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
  }}
>
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
    <View style={[s.ingDot, { backgroundColor: colors.text }]} />

    <Text style={[s.ingText, { color: colors.text }]}>
      {typeof ing === 'string' ? ing : ing.name}
    </Text>

    {typeof ing === 'object' && ing.calories != null && (
      <Text style={{ color: colors.textMuted, fontSize: 13 }}>
        {ing.calories} kcal
      </Text>
    )}

    <TouchableOpacity
      onPress={() => {
        setEditableIngredients(prev => prev.filter((_, idx) => idx !== i));
      }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name="close-circle-outline" size={18} color={colors.textMuted} />
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
                  size={14}
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
                  <Ionicons name="help-circle-outline" size={14} color={colors.textMuted} />
                  <View style={{ flex: 1, gap: 2 }}>
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
              <View style={[s.stepNum, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={[s.stepNumText, { color: colors.textSecondary }]}>{i + 1}</Text>
              </View>
              <Text style={[s.stepText, { color: colors.text }]} numberOfLines={2}>
                {step.text}
              </Text>
              {step.timerMinutes && (
                <View style={[s.timerBadge, { backgroundColor: colors.surfaceAlt }]}>
                  <Ionicons name="timer-outline" size={11} color={colors.textSecondary} />
                  <Text style={[s.timerBadgeText, { color: colors.textSecondary }]}>
                    {step.timerMinutes}m
                  </Text>
                </View>
              )}
            </View>
          ))}
        </SectionCard>

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* ── Fixed bottom: confirmation section ──────────────────────────── */}
      <View style={[s.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Text style={[s.confirmQuestion, { color: colors.textSecondary }]}>
          {t('recipeSummary.confirmQuestion')}
        </Text>
        <View style={s.confirmRow}>
          <TouchableOpacity
            style={[
  s.btnPrimary,
  {
    backgroundColor: colors.btnPrimary,
    opacity: level === 'low' || isLoggingMeal ? 0.6 : 1,
  },
]}
disabled={isLoggingMeal}
            onPress={() => {
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
}}
            activeOpacity={0.85}
          >
            <Text style={[s.btnPrimaryText, { color: colors.btnPrimaryText }]}>
  {isLoggingMeal ? t('recipeSummary.opening') : level === 'low' ? t('recipeSummary.cookAnyway') : t('recipeSummary.letsCook')}
</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.btnPrimaryText} />
          </TouchableOpacity>
        </View>
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
        <Text style={s.sectionLabel}>{title}</Text>
        {badge && <Text style={[s.sectionBadge, { color: colors.textMuted }]}>{badge}</Text>}
      </View>
      {children}
    </View>
  );
}

function Pill({ icon, label, colors }) {
  return (
    <View style={[s.pill, { backgroundColor: colors.surfaceAlt }]}>
      <Ionicons name={icon} size={12} color={colors.textSecondary} />
      <Text style={[s.pillText, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}


const s = StyleSheet.create({
  safe:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  closeBtn:    { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 15, fontWeight: FONTS.semibold },

  scroll:      { paddingHorizontal: 20, paddingTop: 24 },

  hero:        { alignItems: 'center', marginBottom: 24 },
  heroEmoji:   { fontSize: 56, marginBottom: 14 },
  recipeTitle: { fontSize: 24, fontWeight: FONTS.bold, letterSpacing: -0.5, textAlign: 'center', marginBottom: 14 },
  pills:       { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  pill:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.full },
  pillText:    { fontSize: 12, fontWeight: FONTS.medium },

  confBanner:  { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 16, padding: 14, borderRadius: RADIUS.lg, borderWidth: 1 },
  confLabel:   { fontSize: 13, fontWeight: FONTS.semibold },
  confMessage: { fontSize: 13, fontWeight: FONTS.regular, lineHeight: 18 },
  confWarning: { fontSize: 12, fontWeight: FONTS.regular, lineHeight: 17, marginTop: 2 },
  confScore:   { fontSize: 16, fontWeight: FONTS.bold, alignSelf: 'center' },

  card:         { borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: 16, padding: 16 },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: FONTS.semibold, letterSpacing: 0.8, textTransform: 'uppercase', color: '#999' },
  sectionBadge: { fontSize: 11, fontWeight: FONTS.regular },

  macroRow:    { flexDirection: 'row' },
  macroCell:   { flex: 1, alignItems: 'center' },
  macroDivider:{ width: 1, marginVertical: 2 },
  macroValue:  { fontSize: 18, fontWeight: FONTS.bold, letterSpacing: -0.3 },
  macroUnit:   { fontSize: 12, fontWeight: FONTS.regular },
  macroLabel:  { fontSize: 11, fontWeight: FONTS.regular, marginTop: 3 },

  ingRow:           { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  inferredRow:      { alignItems: 'flex-start', paddingVertical: 9 },
  ingDot:           { width: 5, height: 5, borderRadius: 2.5 },
  ingText:          { flex: 1, fontSize: 14, fontWeight: FONTS.regular, lineHeight: 20 },
  estimatedTag:     { fontSize: 11, fontWeight: FONTS.regular, fontStyle: 'italic' },
  inferredToggle:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 2 },
  inferredToggleText: { fontSize: 12, fontWeight: FONTS.medium },

  stepRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  stepNum:      { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  stepNumText:  { fontSize: 11, fontWeight: FONTS.bold },
  stepText:     { flex: 1, fontSize: 14, fontWeight: FONTS.regular, lineHeight: 20 },
  timerBadge:   { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: RADIUS.full, marginTop: 2 },
  timerBadgeText: { fontSize: 11, fontWeight: FONTS.medium },

bottomBar:       { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 10 },
  confirmQuestion: { fontSize: 13, fontWeight: FONTS.medium, textAlign: 'center' },
  confirmRow:      { flexDirection: 'row', gap: 8 },
  btnSecondary:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 13, borderRadius: RADIUS.full },
  btnSecondaryText:{ fontSize: 14, fontWeight: FONTS.semibold },
  btnPrimary:      { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: RADIUS.full },
  btnPrimaryText:  { fontSize: 14, fontWeight: FONTS.semibold },
});
