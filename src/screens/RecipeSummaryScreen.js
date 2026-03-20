import { supabase } from '../lib/supabase';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackActions } from '@react-navigation/native';
import { FONTS, RADIUS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useSavedMeals } from '../context/SavedMealsContext';
import { useMealLogs } from '../context/MealLogsContext';
import SaveModal from '../components/SaveModal';

// ── Confidence colour map ─────────────────────────────────────────────────────
const CONFIDENCE_CONFIG = {
  high:   { color: '#16A34A', bg: '#F0FDF4', label: 'High confidence',   icon: 'checkmark-circle-outline', message: 'AI is highly confident about this recipe.' },
  medium: { color: '#D97706', bg: '#FFFBEB', label: 'Medium confidence', icon: 'alert-circle-outline',     message: 'Some details may be imprecise — please review before cooking.' },
  low:    { color: '#DC2626', bg: '#FEF2F2', label: 'Low confidence',    icon: 'close-circle-outline',     message: "We couldn't confidently extract this recipe. Please verify or try another video." },
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
  const { recipe, dbId } = route.params;
  const { colors, isDark } = useTheme();
  const { addMealLog } = useMealLogs();
  const { savedMeals, saveMeal, unsaveMeal } = useSavedMeals();

  const [showInferred,    setShowInferred]    = useState(false);
  const [debugOpen,       setDebugOpen]       = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [isLoggingMeal, setIsLoggingMeal] = useState(false);
  const [editableIngredients, setEditableIngredients] = useState(
  Array.isArray(recipe.ingredients) ? recipe.ingredients : []
);

  const [savedDbId, setSavedDbId] = useState(dbId ?? null);

  const savedEntry    = dbId ? savedMeals.find((m) => m.id === dbId) : null;
  const savedCategory = savedEntry?.category ?? null;

  const analysis   = recipe._analysis ?? {};
  const ingestion  = recipe._ingestion ?? {};
  const level      = analysis.confidenceLevel ?? 'high';
  const conf       = CONFIDENCE_CONFIG[level];
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

    const { data, error } = await supabase
      .from('recipes')
      .insert([
        {
          title: recipe.title,
          calories: recipe.nutrition?.total?.calories ?? 0,
protein: recipe.nutrition?.total?.protein ?? 0,
carbs: recipe.nutrition?.total?.carbs ?? 0,
fat: recipe.nutrition?.total?.fat ?? 0,
          ingredients: Array.isArray(recipe.ingredients)
            ? recipe.ingredients.join('\n')
            : '',
          instructions: Array.isArray(recipe.steps)
            ? recipe.steps.map((s, i) => `${i + 1}. ${s.text}`).join('\n')
            : '',
        },
      ])
      .select()
      .single();

    if (error) {
      console.log('SAVE RECIPE ERROR:', error);
      return;
    }

    console.log('RECIPE SAVED:', data);
    setSavedDbId(data.id);
  };

  saveRecipeToSupabase();
}, [recipe, savedDbId]);

  // Colors adapt so the banners look good in both light and dark mode
  const confBg     = isDark ? colors.surfaceAlt : conf.bg;

  console.log('[RecipeSummaryScreen] rendering → title:', recipe.title,
    '| id:', recipe.id, '| confidence:', level);

  function handleReanalyze() {
    if (!recipe.sourceUrl) {
      navigation.navigate('MainTabs');
      return;
    }
    navigation.dispatch(StackActions.replace('Analyzing', { url: recipe.sourceUrl }));
  }

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

  function handleEditManually() {
    Alert.alert(
      'Edit manually',
      'Manual recipe editing is coming soon. For now, you can continue and adjust quantities while cooking.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue anyway', onPress: () => navigation.navigate('CookingMode', { recipe }) },
      ]
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={s.closeBtn}
          onPress={() => navigation.navigate('MainTabs')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Recipe</Text>
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
          <Text style={s.heroEmoji}>{recipe.emoji}</Text>
          <Text style={[s.recipeTitle, { color: colors.text }]}>{recipe.title}</Text>
          <View style={s.pills}>
            <Pill icon="list-outline"  label={`${recipe.steps.length} steps`}     colors={colors} />
            <Pill icon="flame-outline" label={`${displayedNutrition?.total?.calories ?? 0} kcal`} colors={colors} />
            {timedSteps > 0 && (
              <Pill icon="timer-outline" label={`${timedSteps} timer${timedSteps > 1 ? 's' : ''}`} colors={colors} />
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
        <SectionCard title="Nutrition" colors={colors}>
          <View style={s.macroRow}>
            {[
  { label: 'Calories', value: displayedNutrition?.total?.calories ?? 0, unit: 'kcal' },
  { label: 'Protein', value: displayedNutrition?.total?.protein ?? 0, unit: 'g' },
  { label: 'Carbs', value: displayedNutrition?.total?.carbs ?? 0, unit: 'g' },
  { label: 'Fat', value: displayedNutrition?.total?.fat ?? 0, unit: 'g' },
].map((m, i) => (
              <React.Fragment key={m.label}>
                {i > 0 && <View style={[s.macroDivider, { backgroundColor: colors.border }]} />}
                <View style={s.macroCell}>
                  <Text style={[s.macroValue, { color: colors.text }]}>
                    {m.value}
                    <Text style={[s.macroUnit, { color: colors.textMuted }]}>{m.unit}</Text>
                  </Text>
                  <Text style={[s.macroLabel, { color: colors.textMuted }]}>{m.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </SectionCard>

        {/* Ingredients — explicit */}
        <SectionCard
          title="Ingredients"
          colors={colors}
          badge={inferred.length > 0 ? `${recipe.ingredients.length} confirmed` : null}
        >
          <Text
  style={{
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
  }}
>
  Remove ingredients you didn’t use. Nutrition updates automatically.
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
                  {showInferred ? 'Hide' : 'Show'} {inferred.length} estimated ingredient{inferred.length > 1 ? 's' : ''}
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
                    <Text style={[s.estimatedTag, { color: colors.textMuted }]}>Estimated — not explicitly confirmed</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </SectionCard>

        {/* Steps */}
        <SectionCard title="Steps" colors={colors}>
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

        {/* ── Debug panel ──────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[s.debugHeader, { backgroundColor: colors.surfaceAlt }]}
          onPress={() => setDebugOpen(v => !v)}
          activeOpacity={0.7}
        >
          <Ionicons name="code-slash-outline" size={13} color={colors.textMuted} />
          <Text style={[s.debugHeaderText, { color: colors.textMuted }]}>Debug info</Text>
          <Ionicons name={debugOpen ? 'chevron-up' : 'chevron-down'} size={13} color={colors.textMuted} />
        </TouchableOpacity>

        {debugOpen && (
          <View style={[s.debugBody, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <DebugRow label="URL"          value={recipe.sourceUrl ?? '—'} colors={colors} />
            <DebugRow label="Platform"     value={ingestion.platform ? `${ingestion.platform}${ingestion.videoId ? ` · ${ingestion.videoId}` : ''}` : '—'} colors={colors} />
            {ingestion.normalizedUrl && ingestion.normalizedUrl !== recipe.sourceUrl && (
              <DebugRow label="Normalized" value={ingestion.normalizedUrl} colors={colors} />
            )}
            <DebugRow label="Language"     value={ingestion.detectedLanguage ?? '—'} colors={colors} />
            <DebugRow label="Title"        value={recipe.title}            colors={colors} />
            <DebugRow label="Recipe ID"    value={recipe.id}               colors={colors} />
            <DebugRow label="Confidence"   value={`${Math.round((analysis.confidence ?? 1) * 100)}% (${level})`} colors={colors} />
            <DebugRow
              label="Transcript"
              value={
                ingestion.transcriptFallback
                  ? `⚠ fallback: ${ingestion.transcriptFallback}`
                  : `${ingestion.transcriptWords ?? '?'} words via ${ingestion.transcriptSource ?? '?'}`
              }
              colors={colors}
            />
            <DebugRow label="OCR text"     value={ingestion.ocrTextLength ? `${ingestion.ocrTextLength} chars` : '(none)'} colors={colors} />
            <DebugRow label="Frames"       value={`${evidence.frameCount ?? '—'} analyzed`} colors={colors} />
            {ingestion.sourcesAvailable && (
              <DebugRow
                label="Sources"
                value={Object.entries(ingestion.sourcesAvailable).map(([k, v]) => `${k}:${v ? '✔' : '✖'}`).join('  ')}
                colors={colors}
              />
            )}
            {evidence.transcriptSnippet && (
              <DebugRow label="Transcript preview" value={evidence.transcriptSnippet} colors={colors} />
            )}
            {evidence.ocrSnippet && (
              <DebugRow label="OCR preview" value={evidence.ocrSnippet} colors={colors} />
            )}
            {warnings.length > 0 && (
              <DebugRow label="Warnings" value={warnings.join('\n')} colors={colors} />
            )}
          </View>
        )}

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* ── Fixed bottom: confirmation section ──────────────────────────── */}
      <View style={[s.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Text style={[s.confirmQuestion, { color: colors.textSecondary }]}>
          Does this recipe match your video?
        </Text>
        <View style={s.confirmRow}>
          <TouchableOpacity
            style={[s.btnSecondary, { backgroundColor: colors.surfaceAlt }]}
            onPress={handleReanalyze}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={16} color={colors.text} />
            <Text style={[s.btnSecondaryText, { color: colors.text }]}>Reanalyze</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.btnSecondary, { backgroundColor: colors.surfaceAlt }]}
            onPress={handleEditManually}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={16} color={colors.text} />
            <Text style={[s.btnSecondaryText, { color: colors.text }]}>Edit</Text>
          </TouchableOpacity>

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

  setIsLoggingMeal(true);

  const now = new Date();

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
  {isLoggingMeal ? 'Opening...' : level === 'low' ? 'Cook anyway' : "Yes, let's cook"}
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

function DebugRow({ label, value, colors }) {
  return (
    <View style={s.debugRowItem}>
      <Text style={[s.debugLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[s.debugValue, { color: colors.textSecondary }]} numberOfLines={3}>{value}</Text>
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

  debugHeader:     { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 10, paddingHorizontal: 12, borderRadius: RADIUS.lg, marginBottom: 4 },
  debugHeaderText: { flex: 1, fontSize: 12, fontWeight: FONTS.medium },
  debugBody:       { borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth, padding: 12, gap: 8, marginBottom: 8 },
  debugRowItem:    { gap: 2 },
  debugLabel:      { fontSize: 10, fontWeight: FONTS.semibold, letterSpacing: 0.6, textTransform: 'uppercase' },
  debugValue:      { fontSize: 12, fontWeight: FONTS.regular, lineHeight: 17 },

  bottomBar:       { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 10 },
  confirmQuestion: { fontSize: 13, fontWeight: FONTS.medium, textAlign: 'center' },
  confirmRow:      { flexDirection: 'row', gap: 8 },
  btnSecondary:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 13, borderRadius: RADIUS.full },
  btnSecondaryText:{ fontSize: 14, fontWeight: FONTS.semibold },
  btnPrimary:      { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: RADIUS.full },
  btnPrimaryText:  { fontSize: 14, fontWeight: FONTS.semibold },
});
