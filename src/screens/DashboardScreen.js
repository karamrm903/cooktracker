import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
} from 'react-native';
import { StackActions } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, FONTS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { USER } from '../data/placeholder';
import { useMealLogs } from '../context/MealLogsContext';
import { useSavedMeals } from '../context/SavedMealsContext';
import { ExpandedNutrition } from '../components/NutritionExpansion';
import SaveModal from '../components/SaveModal';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Main screen ───────────────────────────────────────────────────────────────
function CalorieRing({ calories, goal }) {
  const size = 190;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  const progress = Math.min(calories / goal, 1);
  const strokeDashoffset = circumference * (1 - progress);

  const diff = calories - goal;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>

  <Defs>
    <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <Stop offset="0%" stopColor="#FF7A18" />
      <Stop offset="100%" stopColor="#FF3B30" />
    </LinearGradient>
  </Defs>
        <Circle
          stroke="#2A2A2A"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />

        <Circle
          stroke="url(#grad)"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View
        style={{
          position: 'absolute',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 32, fontWeight: '700', color: 'white' }}>
          {calories}
        </Text>

        <Text style={{ color: '#999', marginTop: 2 }}>
  {diff > 0
    ? `+${diff} over goal`
    : `${Math.abs(diff)} left`}
</Text>
      </View>
    </View>
  );
}
export default function DashboardScreen({ navigation }) {
  const { colors } = useTheme();
  const { isSaved, getSavedCategory, saveMeal, unsaveMeal } = useSavedMeals();
const mealLogsContext = useMealLogs() || {};
const allMeals = mealLogsContext.allMeals || mealLogsContext.meals || [];
const removeMeal = mealLogsContext.removeMeal || (() => {});

  const [expandedId,  setExpandedId]  = useState(null);
  const [importUrl,   setImportUrl]   = useState('');
  const [selectedMeal, setSelectedMeal] = useState(null);


  function handleImport() {
    const url = importUrl.trim();
    if (!url) return;
    setImportUrl(''); // clear immediately so returning to Dashboard is clean
    // Reset the stack to [MainTabs, Analyzing] — removes any stale
    // RecipeSummary / CookingMode screens left from a previous analysis
    navigation.dispatch(StackActions.push('Analyzing', { url }));
  }
  const [modalMeal,  setModalMeal]  = useState(null);
  const [toastText,  setToastText]  = useState(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

    const firstName = USER.name.split(' ')[0];
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const todayKey = new Date().toISOString().slice(0, 10);

  const todaysMeals = allMeals
    .filter(meal => meal.dateKey === todayKey)
    .sort((a, b) => new Date(a.loggedAt) - new Date(b.loggedAt));

  const totalCalories = todaysMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
  const totalProtein = todaysMeals.reduce((sum, meal) => sum + (meal.protein || 0), 0);
  const totalCarbs = todaysMeals.reduce((sum, meal) => sum + (meal.carbs || 0), 0);
  const totalFat = todaysMeals.reduce((sum, meal) => sum + (meal.fat || 0), 0);

  const calorieGoal = 2000;
  const proteinGoal = 120;
  const carbsGoal = 250;
  const fatGoal = 65;

  const caloriePct = Math.min(totalCalories / calorieGoal, 1);
  const caloriesLeft = Math.max(calorieGoal - totalCalories, 0);

  const mealSections = [
  { key: 'breakfast', label: 'Breakfast', emoji: '🍳' },
  { key: 'lunch', label: 'Lunch', emoji: '🥗' },
  { key: 'dinner', label: 'Dinner', emoji: '🍽️' },
  { key: 'snack', label: 'Snacks', emoji: '🍪' },
].map(section => {
  const meals = todaysMeals.filter(meal => meal.mealType === section.key);

  return {
    ...section,
    meals: meals.length > 0
      ? meals
      : [
          {
            id: `pending_${section.key}`,
            name: section.label,
            pending: true,
            mealType: section.key,
            emoji: section.emoji,
          },
        ],
  };
});

  function showToast(text) {
    setToastText(text);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1600),
      Animated.timing(toastAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(() => setToastText(null));
  }

 function handleSave(category) {
  if (!modalMeal) return;

  const idToSave = modalMeal.recipeId ?? modalMeal.id;

  saveMeal(idToSave, category);

  setModalMeal(null);
  showToast(`Saved to ${category}`);
}
  function handleRemove() {
  if (!modalMeal) return;

  const idToRemove = modalMeal.recipeId ?? modalMeal.id;

  unsaveMeal(idToRemove);

  setModalMeal(null);
  showToast('Removed from Saved');
}

  function handleToggle(id) {
    LayoutAnimation.configureNext({
      duration: 260,
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
    setExpandedId(prev => (prev === id ? null : id));
  }
function handleEditLoggedGrams(meal) {
  if (!meal || meal.source !== 'recipe') return;

  Alert.prompt(
    'Edit grams eaten',
    'Enter the new grams eaten',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Save',
        onPress: (value) => {
          const grams = Number(value);
          if (!grams || grams <= 0) return;

          const total = meal.fullRecipeNutrition ?? {
            calories: meal.calories ?? 0,
            protein: meal.protein ?? 0,
            carbs: meal.carbs ?? 0,
            fat: meal.fat ?? 0,
          };

          const estimatedRecipeGrams = meal.estimatedRecipeGrams ?? 600;
          const ratio = grams / estimatedRecipeGrams;

          const calories = Math.round((total.calories ?? 0) * ratio);
          const protein = Math.round((total.protein ?? 0) * ratio);
          const carbs = Math.round((total.carbs ?? 0) * ratio);
          const fat = Math.round((total.fat ?? 0) * ratio);

          Alert.alert(
            'New nutrition',
            `${grams} g\n${calories} kcal\nP ${protein}g · C ${carbs}g · F ${fat}g`
          );
        },
      },
    ],
    'plain-text',
    String(meal.gramsEaten ?? '')
  );
}
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.textMuted }]}>Welcome back,</Text>
          <Text style={[styles.name, { color: colors.text }]}>{firstName}</Text>
          <View style={styles.headerMeta}>
            <Text style={[styles.dateText, { color: colors.textMuted }]}>{today}</Text>
            <View style={[styles.streakChip, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.streakText, { color: colors.textSecondary }]}>
                🔥 {USER.currentStreak} days
              </Text>
            </View>
          </View>
        </View>

        {/* ── Import recipe card ────────────────────────────────────────── */}
        <View style={[styles.importCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={[styles.importIconBox, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons name="link-outline" size={20} color={colors.textSecondary} />
          </View>
          <TextInput
            style={[styles.importInput, { color: colors.text }]}
            placeholder="Paste YouTube, TikTok or Instagram link…"
            placeholderTextColor={colors.textMuted}
            value={importUrl}
            onChangeText={setImportUrl}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={handleImport}
          />
          {importUrl.length > 0 && (
            <TouchableOpacity
              style={[styles.importGoBtn, { backgroundColor: colors.text }]}
              onPress={handleImport}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-forward" size={16} color={colors.background} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── TODAY calories ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Today</Text>
          <View style={styles.caloriesTopRow}>
            <View>
            </View>
            <Text style={[styles.caloriesLeftText, { color: colors.textMuted }]}>
              {caloriesLeft.toLocaleString()} left
            </Text>
          </View>

        <View style={{ alignItems: 'center', marginVertical: 20 }}>
  <CalorieRing
    calories={totalCalories}
    goal={calorieGoal}
  />
</View>

          
        </View>
{/* ── TODAY'S MEALS ─────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Today's Meals</Text>
          <View style={[styles.mealsCard, { backgroundColor: colors.surface }]}>
            {mealSections.map((section, sectionIndex) => (
              <View key={section.key}>
                {sectionIndex > 0 && (
                  <View style={[styles.sectionSpacer, { backgroundColor: colors.background }]} />
                )}

                <View style={styles.mealGroupHeader}>
                  <Text style={styles.mealGroupEmoji}>{section.emoji}</Text>
                  <Text style={[styles.greetingSubtitle, { color: colors.textMuted }]}>
  {caloriesLeft} kcal remaining today
</Text>
                  <Text style={[styles.mealGroupTitle, { color: colors.text }]}>{section.label}</Text>
                </View>

                {section.meals.map((meal, index) => {
                  const isExpanded = expandedId === meal.id;

                  return (
                    <React.Fragment key={meal.id}>
                      {index > 0 && (
                        <View style={[styles.hairline, { backgroundColor: colors.border }]} />
                      )}

                      <TouchableOpacity
                        style={styles.mealRow}
                        activeOpacity={meal.pending ? 0.7 : 0.65}
                        onPress={
  meal.pending
    ? () => navigation.navigate('LogMeal', { defaultMealType: meal.mealType })
    : () => {
        handleToggle(meal.id);

if (meal.source === 'recipe' && meal.gramsEaten != null) {
  handleEditLoggedGrams(meal);
  setSelectedMeal(meal);
}
      }
}
                      >
                        <Text style={styles.mealEmoji}>{meal.emoji ?? section.emoji}</Text>

                        <View style={styles.mealInfo}>
                          {meal.pending ? (
                            <Text style={[styles.mealNameMuted, { color: colors.textMuted }]}>
                              Add {section.label}
                            </Text>
                          ) : (
                            <>
                              <Text style={[styles.mealName, { color: colors.text }]}>
                                {meal.name}
                              </Text>
                              <Text style={[styles.mealMeta, { color: colors.textMuted }]}>
                                {meal.meal} · {meal.time}
                              </Text>
                            </>
                          )}
                        </View>

                        {!meal.pending && (
  <View style={styles.mealActions}>
    <TouchableOpacity
      onPress={() => setModalMeal(meal)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={styles.bookmarkBtn}
    >
      <Ionicons
        name={isSaved(meal.id ?? meal.name) ? 'bookmark' : 'bookmark-outline'}
        size={17}
        color={isSaved(meal.id ?? meal.name) ? colors.text : colors.textMuted}
      />
    </TouchableOpacity>

    <TouchableOpacity
      onPress={() =>
        Alert.alert(
          'Remove meal',
          `Remove "${meal.name}" from today?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Remove',
              style: 'destructive',
              onPress: () => removeMeal(meal.id),
            },
          ]
        )
      }
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={styles.bookmarkBtn}
    >
      <Ionicons
        name="trash-outline"
        size={17}
        color={colors.error}
      />
    </TouchableOpacity>
  </View>
)}

                        {meal.pending ? (
                          <Ionicons name="add-circle-outline" size={22} color={colors.textMuted} />
                        ) : (
                          <View style={styles.mealRight}>
                            <Text style={[styles.mealCalories, { color: colors.textSecondary }]}>
                              {meal.calories} kcal
                            </Text>
                            <Ionicons
                              name={isExpanded ? 'chevron-up' : 'chevron-down'}
                              size={12}
                              color={colors.textMuted}
                              style={styles.chevron}
                            />
                          </View>
                        )}
                      </TouchableOpacity>

                      {isExpanded && (meal.macros || meal.protein != null) && (
  <>
    {meal.gramsEaten != null && (
  <View
    style={{
      paddingHorizontal: 16,
      paddingTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}
  >
    <Text style={{ color: colors.textMuted, fontSize: 13 }}>
      Portion eaten: {meal.gramsEaten} g
    </Text>

    <TouchableOpacity onPress={() => handleEditLoggedGrams(meal)}>
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>
        Edit grams
      </Text>
    </TouchableOpacity>
  </View>
)}

    <ExpandedNutrition
      item={{
        ...meal,
        macros: meal.macros ?? {
          protein: meal.protein ?? 0,
          carbs: meal.carbs ?? 0,
          fat: meal.fat ?? 0,
        },
      }}
      colors={colors}
    />
  </>
)}
                    </React.Fragment>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      {/* ── Save modal ──────────────────────────────────────────────── */}
      <SaveModal
        meal={modalMeal}
        visible={!!modalMeal}
        onClose={() => setModalMeal(null)}
        onSave={handleSave}
        onRemove={handleRemove}
        savedCategory={modalMeal ? getSavedCategory(modalMeal.recipeId ?? modalMeal.id) : null}
        colors={colors}
      />

      {/* ── Toast ───────────────────────────────────────────────────── */}
      {toastText && (
        <Animated.View
          style={[styles.toast, { backgroundColor: colors.text, opacity: toastAnim }]}
          pointerEvents="none"
        >
          <Text style={[styles.toastText, { color: colors.background }]}>{toastText}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:    { flex: 1 },
  scroll:  { flex: 1 },
  content: { paddingBottom: SPACING.xxl },

  // Header
  header: {
    paddingHorizontal: 24,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  greeting: { fontSize: 14, fontWeight: FONTS.regular, marginBottom: 2 },
  name:     { fontSize: 28, fontWeight: FONTS.bold, letterSpacing: -0.5, marginBottom: 12 },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  dateText:   { fontSize: 13, fontWeight: FONTS.regular },
  streakChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  streakText: { fontSize: 12, fontWeight: FONTS.medium },

  // Import card
  importCard: {
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 40,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    gap: 12,
  },
  // Macro progress bar
macroTrack: {
  width: '80%',
  height: 5,
  backgroundColor: '#2A2A2A',
  borderRadius: 999,
  overflow: 'hidden',
  marginTop: 6,
  marginBottom: 6,
},

macroFill: {
  height: '100%',
  borderRadius: 999,
},
  importIconBox: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: FONTS.regular,
    paddingVertical: 4,
  },
  importGoBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sections
  section: {
    paddingHorizontal: 24,
    marginBottom: 36,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: FONTS.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 16,
  },

  // Calories hero
  caloriesTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  caloriesBig:      { fontSize: 48, fontWeight: FONTS.bold, letterSpacing: -1, lineHeight: 52 },
  caloriesGoalText: { fontSize: 13, fontWeight: FONTS.regular, marginTop: 3 },
  caloriesLeftText: { fontSize: 13, fontWeight: FONTS.regular, paddingBottom: 4 },
  progressTrack:    { height: 3, borderRadius: RADIUS.full, overflow: 'hidden' },
  progressFill:     { height: '100%', borderRadius: RADIUS.full },

  // Macro summary
  macrosRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 16,
  },
  macroCell: {
  flex: 1,
  alignItems: 'center',
  paddingVertical: 12,
  paddingHorizontal: 10,
  maxWidth: '33%',
},
  macroDividerV: { width: 1, marginVertical: 2 },
    macroValue: {
  fontSize: 20,
  fontWeight: FONTS.bold,
  letterSpacing: -0.3,
},
  macroLabelRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  marginTop: 4,
},
  macroDot: {
  width: 8,
  height: 8,
  borderRadius: 4,
},
  macroLabel:    { fontSize: 11, fontWeight: FONTS.regular },
  macroLeft:     { fontSize: 11, fontWeight: FONTS.regular, marginTop: 2 },

  // Meals list
  mealsCard: { borderRadius: RADIUS.lg, overflow: 'hidden' },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
    gap: 12,
  },
  mealEmoji:    { fontSize: 24, width: 32, textAlign: 'center' },
  mealInfo:     { flex: 1 },
  mealName:     { fontSize: 15, fontWeight: FONTS.semibold, marginBottom: 2 },
  mealNameMuted:{ fontSize: 15, fontWeight: FONTS.medium },
  mealMeta:     { fontSize: 12, fontWeight: FONTS.regular },
  mealRight:    { alignItems: 'flex-end', gap: 3 },
  mealCalories: { fontSize: 13, fontWeight: FONTS.regular },
  chevron:      { marginTop: 1 },
  hairline:     { height: StyleSheet.hairlineWidth, marginLeft: 60 },
  bookmarkBtn:  { padding: 2 },
mealActions: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
},
  sectionSpacer: {
  height: 14,
},

mealGroupHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  paddingHorizontal: SPACING.md,
  paddingTop: 12,
  paddingBottom: 8,
},

mealGroupEmoji: {
  fontSize: 16,
},

mealGroupTitle: {
  fontSize: 13,
  fontWeight: FONTS.semibold,
},

  // Toast
  toast: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
  },
  toastText: {
    fontSize: 14,
    fontWeight: FONTS.medium,
  },
});
